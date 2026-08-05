/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type {
  SymbolTable,
  VariableSymbol,
  TypeSymbol,
  ApexSymbol,
  ScopeSymbol,
  MethodSymbol,
} from '../../../types/symbol';
import { SymbolKind, SymbolVisibility } from '../../../types/symbol';
import {
  isBlockSymbol,
  isChainedSymbolReference,
  isClassOrInterfaceSymbol,
  isFieldSymbol,
  isMethodSymbol,
  isPropertySymbol,
} from '../../../utils/symbolNarrowing';
import {
  ReferenceContext,
  type SymbolReference,
} from '../../../types/symbolReference';
import type {
  ValidationResult,
  ValidationErrorInfo,
  ValidationWarningInfo,
} from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';
import { localizeTyped } from '../../../i18n/messageInstance';
import { ErrorCodes } from '../../../generated/ErrorCodes';
import { ISymbolManager } from '../ArtifactLoadingHelper';
import type { ISymbolManager as ISymbolManagerInterface } from '../../../types/ISymbolManager';
import { getEnclosingClass, isInTestContext } from '../utils/visibilityUtils';
import { AnnotationUtils } from '../../../utils/AnnotationUtils';
import { getImplicitQualifiedCandidates } from '../../../namespace/NamespaceResolutionPolicy';
import { indexedAccessResultType } from '../../../utils/indexedAccess';

/**
 * Validates variable and field references for:
 * - Variable/field existence (VARIABLE_DOES_NOT_EXIST, FIELD_DOES_NOT_EXIST)
 * - Variable/field visibility (VARIABLE_NOT_VISIBLE)
 *
 * This is a TIER 2 (THOROUGH) validation that requires cross-file type resolution.
 * It examines variable usage and field access references in the symbol table and
 * validates them against available variable and field symbols, including fields
 * from superclasses.
 *
 * @see SEMANTIC_SYMBOL_RULES.md - Variable and field resolution rules
 */
export const VariableResolutionValidator: Validator = {
  id: 'variable-resolution',
  name: 'Variable Resolution Validator',
  tier: ValidationTier.THOROUGH,
  priority: 10,
  prerequisites: {
    requiredDetailLevel: 'full',
    requiresReferences: true,
    requiresCrossFileResolution: true,
  },

  validate: (
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError, ISymbolManager> =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      // Get symbol manager from context
      const symbolManager = yield* ISymbolManager;

      // Get all references from the symbol table
      const allReferences = symbolTable.getAllReferences();

      // Extract field accesses from chained references FIRST
      // Chained references represent dotted expressions like obj.field
      const chainedTypeRefs = allReferences.filter((ref) =>
        isChainedSymbolReference(ref),
      );
      const extractedFieldAccesses: SymbolReference[] = [];
      const extractedWriteFieldAccesses: SymbolReference[] = [];

      for (const chainedRef of chainedTypeRefs) {
        if (chainedRef.chainNodes && Array.isArray(chainedRef.chainNodes)) {
          // Process intermediate nodes (read access)
          for (let i = 1; i < chainedRef.chainNodes.length - 1; i++) {
            const node = chainedRef.chainNodes[i];
            if (node.context === ReferenceContext.FIELD_ACCESS) {
              extractedFieldAccesses.push({
                ...node,
                parentContext: chainedRef.parentContext || node.parentContext,
                access: 'read', // Intermediate nodes are always read
              });
            }
          }

          // Process final node (may have write access)
          const finalNode =
            chainedRef.chainNodes[chainedRef.chainNodes.length - 1];
          if (finalNode.context === ReferenceContext.FIELD_ACCESS) {
            const isWriteAccess =
              finalNode.access === 'write' ||
              finalNode.access === 'readwrite' ||
              chainedRef.access === 'write' ||
              chainedRef.access === 'readwrite';

            if (isWriteAccess) {
              // Track write accesses separately for write visibility validation
              extractedWriteFieldAccesses.push({
                ...finalNode,
                parentContext:
                  chainedRef.parentContext || finalNode.parentContext,
                access: finalNode.access || chainedRef.access,
              });
            } else {
              // Read access - add to regular field accesses
              extractedFieldAccesses.push({
                ...finalNode,
                parentContext:
                  chainedRef.parentContext || finalNode.parentContext,
                access: 'read',
              });
            }
          }
        }
      }

      // Build a set of variable usage locations that are part of chains
      // These should be excluded from standalone variable validation
      // Include ALL chain nodes (not just first) - getB, x, etc. in f.getB().x are method/field refs
      const variableUsagesInChains = new Set<string>();
      for (const chainedRef of chainedTypeRefs) {
        if (chainedRef.chainNodes && Array.isArray(chainedRef.chainNodes)) {
          for (const node of chainedRef.chainNodes) {
            if (node?.name) {
              const nodeLine =
                node.location?.symbolRange?.startLine ??
                node.location?.identifierRange?.startLine;
              const symbolCol =
                node.location?.symbolRange?.startColumn ??
                node.location?.identifierRange?.startColumn;
              const idCol =
                node.location?.identifierRange?.startColumn ??
                node.location?.symbolRange?.startColumn;
              if (nodeLine != null) {
                if (symbolCol != null)
                  variableUsagesInChains.add(
                    `${node.name}:${nodeLine}:${symbolCol}`,
                  );
                if (idCol != null && idCol !== symbolCol)
                  variableUsagesInChains.add(
                    `${node.name}:${nodeLine}:${idCol}`,
                  );
              }
            }
          }
        }
      }

      // Filter variable usages to exclude those that are part of chained references
      const variableUsages = allReferences.filter((ref) => {
        if (ref.context !== ReferenceContext.VARIABLE_USAGE) {
          return false;
        }

        const refLine =
          ref.location?.symbolRange?.startLine ??
          ref.location?.identifierRange?.startLine;
        const refCol =
          ref.location?.symbolRange?.startColumn ??
          ref.location?.identifierRange?.startColumn;
        if (refLine && refCol) {
          const key = `${ref.name}:${refLine}:${refCol}`;
          if (variableUsagesInChains.has(key)) {
            return false; // Skip - it's part of a chain
          }
        }
        return true;
      });

      // Combine regular field accesses with extracted ones from chains
      const fieldAccesses = uniqueReferencesByLocation([
        ...allReferences
          .filter((ref) => ref.context === ReferenceContext.FIELD_ACCESS)
          .filter(
            (ref) =>
              !extractedWriteFieldAccesses.some(
                (writeRef) =>
                  writeRef.name.toLowerCase() === ref.name.toLowerCase() &&
                  referencesStartAtSameLocation(writeRef, ref),
              ),
          ),
        ...extractedFieldAccesses,
      ]);

      // Get all symbols from the table
      const allSymbols = symbolTable.getAllSymbols();

      // Find the containing class for context
      const containingClass = allSymbols.find(isClassOrInterfaceSymbol);

      // Validate variable usages
      for (const variableRef of variableUsages) {
        const variableName = variableRef.name;
        const refLocation = variableRef.location;

        // Find variable in scope hierarchy
        const variable = findVariableInScope(
          variableName,
          variableRef.parentContext,
          allSymbols,
          symbolTable,
        );

        if (!variable) {
          // Defensive: skip if another ref at same location has type/method/field context
          // (VARIABLE_USAGE may be misclassified for constructor types, method names, etc.)
          const refLine =
            refLocation?.symbolRange?.startLine ??
            refLocation?.identifierRange?.startLine;
          const refCol =
            refLocation?.symbolRange?.startColumn ??
            refLocation?.identifierRange?.startColumn;
          if (refLine != null && refCol != null) {
            const sameLocationRef = allReferences.find(
              (r) =>
                r !== variableRef &&
                r.name === variableName &&
                (r.context === ReferenceContext.CONSTRUCTOR_CALL ||
                  r.context === ReferenceContext.CLASS_REFERENCE ||
                  r.context === ReferenceContext.FIELD_ACCESS ||
                  r.context === ReferenceContext.METHOD_CALL) &&
                (r.location?.symbolRange?.startLine ??
                  r.location?.identifierRange?.startLine) === refLine &&
                (r.location?.symbolRange?.startColumn ??
                  r.location?.identifierRange?.startColumn) === refCol,
            );
            if (sameLocationRef) {
              continue; // Skip - likely misclassified, correct ref exists
            }
          }

          // Defensive: skip if this ref is a chain node (method/field in f.getB().x)
          // Chain nodes may appear as VARIABLE_USAGE due to listener overlap
          if (refLine != null) {
            const key = `${variableName}:${refLine}:${refCol ?? 0}`;
            if (variableUsagesInChains.has(key)) continue;
            const idCol =
              refLocation?.identifierRange?.startColumn ??
              refLocation?.symbolRange?.startColumn;
            if (
              idCol != null &&
              variableUsagesInChains.has(`${variableName}:${refLine}:${idCol}`)
            )
              continue;
            // Fallback: same name and line in any chain node (handles location mismatches)
            const isChainNode = Array.from(variableUsagesInChains).some(
              (k) =>
                k.startsWith(`${variableName}:${refLine}:`) &&
                k.length > `${variableName}:${refLine}:`.length,
            );
            if (isChainNode) continue;
          }

          // "this" is a valid Apex keyword (current instance) - not in symbol table
          if (variableName?.toLowerCase() === 'this') {
            continue;
          }

          // Variable not found
          errors.push({
            message: localizeTyped(
              ErrorCodes.VARIABLE_DOES_NOT_EXIST,
              variableName,
            ),
            location: refLocation,
            code: ErrorCodes.VARIABLE_DOES_NOT_EXIST,
          });
          continue;
        }

        // Check visibility if it's a field (not a local variable or parameter)
        if (isFieldSymbol(variable) && containingClass) {
          const isVisible = yield* isVariableVisible(
            variable as VariableSymbol,
            containingClass,
            symbolManager,
            allSymbols,
          );

          if (!isVisible) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.VARIABLE_NOT_VISIBLE,
                variableName,
              ),
              location: refLocation,
              code: ErrorCodes.VARIABLE_NOT_VISIBLE,
            });
          }
        }
      }

      // Validate field accesses
      for (const fieldRef of fieldAccesses) {
        const matchingChain = findFieldAccessChain(fieldRef, chainedTypeRefs);
        const finalChainNode = matchingChain?.chainNodes?.at(-1);
        const fieldName = finalChainNode?.name ?? fieldRef.name;
        // A qualified name without a structured chain cannot be interpreted
        // reliably. Preserve that uncertainty rather than parsing the name.
        if (!matchingChain && fieldName.includes('.')) continue;
        const refLocation = fieldRef.location;

        // Skip if this is a method call (e.g. System.debug) - METHOD_CALL ref or chain node at same location
        const fieldLine =
          refLocation?.symbolRange?.startLine ??
          refLocation?.identifierRange?.startLine;
        const fieldCol =
          refLocation?.symbolRange?.startColumn ??
          refLocation?.identifierRange?.startColumn;
        if (fieldLine != null && fieldCol != null) {
          const isMethodCall =
            allReferences.some((r) => {
              if (r.context !== ReferenceContext.METHOD_CALL) return false;
              const lastName =
                (r.chainNodes?.length ?? 0) > 0
                  ? r.chainNodes?.[r.chainNodes.length - 1]?.name
                  : r.name;
              if (lastName?.toLowerCase() !== fieldName.toLowerCase())
                return false;
              return referencesStartAtSameLocation(r, fieldRef);
            }) ||
            chainedTypeRefs.some((c) => {
              const last = c.chainNodes?.[(c.chainNodes?.length ?? 0) - 1];
              if (
                last?.context !== ReferenceContext.METHOD_CALL ||
                last?.name?.toLowerCase() !== fieldName.toLowerCase()
              )
                return false;
              return referencesStartAtSameLocation(last, fieldRef);
            });
          if (isMethodCall) continue;
        }

        if (!containingClass) {
          continue;
        }

        // TIER 2 Enhancement: For qualified field access (obj.field), resolve object type
        let targetType: TypeSymbol | null = null;

        // Try to resolve target type from chain context first (for f.getB().x, resolve through method return types)
        if (matchingChain) {
          targetType = yield* resolveChainTargetType(
            matchingChain,
            symbolManager,
            allSymbols,
            symbolTable,
          );
        }

        // Fallback: extract object name and resolve from first node only
        let suppressDueToUnresolvedDeclaredType = false;
        let objectName: string | null = null;
        if (!targetType) {
          const baseNode = matchingChain?.chainNodes?.[0];
          if (
            baseNode &&
            (baseNode.name?.toLowerCase() === 'this' ||
              baseNode.context === ReferenceContext.VARIABLE_USAGE ||
              baseNode.context === ReferenceContext.CLASS_REFERENCE ||
              baseNode.context === ReferenceContext.CHAIN_STEP)
          ) {
            objectName = baseNode.name ?? null;
          }

          if (objectName) {
            const objName = objectName;
            let objectVariable = findVariableInScope(
              objName,
              fieldRef.parentContext,
              allSymbols,
              symbolTable,
            );

            // When objectVariable is null, the base may be a class (e.g. EncodingUtil) or an
            // unresolved variable (e.g. contentVersion when ContentVersion type not loaded).
            // Resolve as type from symbol manager; if found use it; if not, suppress to avoid
            // false positive "field on FileUtilities" when falling back to containingClass.
            if (!objectVariable) {
              // "this" and containing class name are deterministic - don't suppress
              const isThisOrClassName =
                objName?.toLowerCase() === 'this' ||
                objName === containingClass?.name;
              if (!isThisOrClassName) {
                let typeSymbols = yield* Effect.promise(() =>
                  symbolManager.findSymbolByName(objName),
                );
                if (
                  typeSymbols.length === 0 &&
                  objName.includes('.') &&
                  symbolManager.findSymbolByFQN
                ) {
                  const fqn = yield* Effect.promise(() =>
                    symbolManager.findSymbolByFQN(objName),
                  );
                  if (fqn) typeSymbols = [fqn];
                }
                if (typeSymbols.length === 0 && objName.includes('.')) {
                  const lastPart = objName.split('.').pop();
                  if (lastPart) {
                    typeSymbols = yield* Effect.promise(() =>
                      symbolManager.findSymbolByName(lastPart),
                    );
                  }
                }
                const resolvedType =
                  typeSymbols.find(isClassOrInterfaceSymbol) ?? null;
                if (resolvedType) {
                  targetType = resolvedType;
                } else {
                  suppressDueToUnresolvedDeclaredType = true;
                }
              }
            }

            if (objectVariable?.type?.name) {
              const varTypeName = objectVariable.type.name;
              let typeSymbols = yield* Effect.promise(() =>
                symbolManager.findSymbolByName(varTypeName),
              );
              if (
                typeSymbols.length === 0 &&
                varTypeName.includes('.') &&
                symbolManager.findSymbolByFQN
              ) {
                const fqn = yield* Effect.promise(() =>
                  symbolManager.findSymbolByFQN(varTypeName),
                );
                if (fqn) typeSymbols = [fqn];
              }
              if (typeSymbols.length === 0 && varTypeName.includes('.')) {
                const lastPart = varTypeName.split('.').pop();
                if (lastPart) {
                  typeSymbols = yield* Effect.promise(() =>
                    symbolManager.findSymbolByName(lastPart),
                  );
                }
              }
              const resolvedTargetType =
                typeSymbols.find(isClassOrInterfaceSymbol) ?? null;
              if (resolvedTargetType) {
                targetType = resolvedTargetType;
              } else {
                // Type not in symbol manager - suppress false positive (don't fall back to containingClass)
                // Covers: ContentDocumentLink, ContentVersion, cross-project types, etc.
                suppressDueToUnresolvedDeclaredType = true;
              }
            }
          }
        }

        // Use containingClass only when receiver is deterministic: "this" or class-name static access
        if (!targetType) {
          if (suppressDueToUnresolvedDeclaredType) {
            continue;
          }
          const isThisOrClass =
            objectName?.toLowerCase() === 'this' ||
            objectName === containingClass?.name;
          if (isThisOrClass) {
            targetType = containingClass;
          } else {
            // Receiver cannot be resolved - report warning
            warnings.push({
              message: localizeTyped(
                ErrorCodes.FIELD_ACCESS_RECEIVER_UNRESOLVED,
                fieldName,
              ),
              location: refLocation,
              code: ErrorCodes.FIELD_ACCESS_RECEIVER_UNRESOLVED,
            });
            continue;
          }
        }

        // Suppress when target is List/Set - these have no instance fields in Apex;
        // we only get List/Set here when element type (e.g. Coordinates) is unresolved
        const isListOrSet =
          targetType?.name?.toLowerCase() === 'list' ||
          targetType?.name?.toLowerCase() === 'set';
        if (isListOrSet) {
          continue;
        }

        // Find field in the target type's hierarchy
        const field = yield* findFieldInHierarchy(
          symbolManager,
          targetType,
          fieldName,
          allSymbols,
        );

        if (!field) {
          // May be a method (e.g. EncodingUtil.base64Decode) - skip, MethodResolutionValidator handles it
          const method = yield* findMethodInClassHierarchy(
            symbolManager,
            targetType,
            fieldName,
            allSymbols,
          );
          if (method) continue;

          // Field not found
          const typeName =
            targetType?.name || containingClass?.name || 'unknown';
          errors.push({
            message: localizeTyped(
              ErrorCodes.FIELD_DOES_NOT_EXIST,
              fieldName,
              typeName,
            ),
            location: refLocation,
            code: ErrorCodes.FIELD_DOES_NOT_EXIST,
          });
          continue;
        }

        // Check visibility
        const isVisible = yield* isVariableVisible(
          field,
          containingClass,
          symbolManager,
          allSymbols,
        );

        if (!isVisible) {
          errors.push({
            message: localizeTyped(ErrorCodes.VARIABLE_NOT_VISIBLE, fieldName),
            location: refLocation,
            code: ErrorCodes.VARIABLE_NOT_VISIBLE,
          });
        }

        // INVALID_FIELD_TYPE_LOAD/STORE: Void type fields cannot be read/written
        if (field.type?.name?.toLowerCase() === 'void') {
          const isWrite =
            (fieldRef as { access?: string }).access === 'write' ||
            (fieldRef as { access?: string }).access === 'readwrite';
          errors.push({
            message: localizeTyped(
              isWrite
                ? ErrorCodes.INVALID_FIELD_TYPE_STORE
                : ErrorCodes.INVALID_FIELD_TYPE_LOAD,
              fieldName,
              targetType?.name || 'unknown',
            ),
            location: refLocation,
            code: isWrite
              ? ErrorCodes.INVALID_FIELD_TYPE_STORE
              : ErrorCodes.INVALID_FIELD_TYPE_LOAD,
          });
        }
      }

      // Validate write field accesses (from chains with write/readwrite access)
      // These need additional validation for write visibility
      for (const fieldRef of extractedWriteFieldAccesses) {
        const matchingChain = findFieldAccessChain(fieldRef, chainedTypeRefs);
        const fieldName =
          matchingChain?.chainNodes?.at(-1)?.name ?? fieldRef.name;
        if (!matchingChain && fieldName.includes('.')) continue;
        const refLocation = fieldRef.location;

        if (!containingClass) {
          continue;
        }

        // Resolve object type for qualified field access
        let targetType: TypeSymbol | null = null;

        if (matchingChain) {
          targetType = yield* resolveChainTargetType(
            matchingChain,
            symbolManager,
            allSymbols,
            symbolTable,
          );
        }

        // Fallback: resolve from first node (variable) when chain resolution failed
        let suppressDueToUnresolvedDeclaredType = false;
        let objectName: string | null = null;
        if (!targetType) {
          const baseNode = matchingChain?.chainNodes?.[0];
          if (baseNode) {
            objectName = baseNode.name ?? null;
            const objectVariable = findVariableInScope(
              baseNode.name,
              fieldRef.parentContext,
              allSymbols,
              symbolTable,
            );
            if (objectVariable?.type?.name) {
              const varTypeName = objectVariable.type.name;
              let typeSymbols = yield* Effect.promise(() =>
                symbolManager.findSymbolByName(varTypeName),
              );
              if (
                typeSymbols.length === 0 &&
                varTypeName.includes('.') &&
                symbolManager.findSymbolByFQN
              ) {
                const fqn = yield* Effect.promise(() =>
                  symbolManager.findSymbolByFQN(varTypeName),
                );
                if (fqn) typeSymbols = [fqn];
              }
              if (typeSymbols.length === 0 && varTypeName.includes('.')) {
                const lastPart = varTypeName.split('.').pop();
                if (lastPart)
                  typeSymbols = yield* Effect.promise(() =>
                    symbolManager.findSymbolByName(lastPart),
                  );
              }
              const resolvedTargetType =
                typeSymbols.find(isClassOrInterfaceSymbol) ?? null;
              if (resolvedTargetType) {
                targetType = resolvedTargetType;
              } else {
                suppressDueToUnresolvedDeclaredType = true;
              }
            }
          }
        }

        // Use containingClass only when receiver is deterministic: "this" or class-name static access
        if (!targetType) {
          if (suppressDueToUnresolvedDeclaredType) {
            continue;
          }
          const isThisOrClass =
            objectName?.toLowerCase() === 'this' ||
            objectName === containingClass?.name;
          if (isThisOrClass) {
            targetType = containingClass;
          } else {
            // Receiver cannot be resolved - report warning
            warnings.push({
              message: localizeTyped(
                ErrorCodes.FIELD_ACCESS_RECEIVER_UNRESOLVED,
                fieldName,
              ),
              location: refLocation,
              code: ErrorCodes.FIELD_ACCESS_RECEIVER_UNRESOLVED,
            });
            continue;
          }
        }

        // Find field in the target type's hierarchy
        const field = yield* findFieldInHierarchy(
          symbolManager,
          targetType,
          fieldName,
          allSymbols,
        );

        if (!field) {
          // May be a method (e.g. EncodingUtil.base64Decode) - skip, MethodResolutionValidator handles it
          const method = yield* findMethodInClassHierarchy(
            symbolManager,
            targetType,
            fieldName,
            allSymbols,
          );
          if (method) continue;

          // Field not found (write access path)
          const typeName =
            targetType?.name || containingClass?.name || 'unknown';
          errors.push({
            message: localizeTyped(
              ErrorCodes.FIELD_DOES_NOT_EXIST,
              fieldName,
              typeName,
            ),
            location: refLocation,
            code: ErrorCodes.FIELD_DOES_NOT_EXIST,
          });
          continue;
        }

        // Check write visibility (same as read visibility for now)
        // TODO: Add specific write visibility checks if needed (e.g., readonly fields)
        const isVisible = yield* isVariableVisible(
          field,
          containingClass,
          symbolManager,
          allSymbols,
        );

        if (!isVisible) {
          errors.push({
            message: localizeTyped(ErrorCodes.VARIABLE_NOT_VISIBLE, fieldName),
            location: refLocation,
            code: ErrorCodes.VARIABLE_NOT_VISIBLE,
          });
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};

function getReferenceStart(
  reference: SymbolReference,
): { line: number; column: number } | null {
  const range =
    reference.location?.identifierRange ?? reference.location?.symbolRange;
  if (!range) return null;
  return { line: range.startLine, column: range.startColumn };
}

function referencesStartAtSameLocation(
  left: SymbolReference,
  right: SymbolReference,
): boolean {
  const leftStart = getReferenceStart(left);
  const rightStart = getReferenceStart(right);
  return (
    leftStart !== null &&
    rightStart !== null &&
    leftStart.line === rightStart.line &&
    leftStart.column === rightStart.column
  );
}

function findFieldAccessChain(
  fieldRef: SymbolReference,
  chainedRefs: SymbolReference[],
): SymbolReference | undefined {
  return chainedRefs.find((chain) => {
    const finalNode = chain.chainNodes?.at(-1);
    return (
      finalNode?.context === ReferenceContext.FIELD_ACCESS &&
      finalNode.name.toLowerCase() === fieldRef.name.toLowerCase() &&
      referencesStartAtSameLocation(finalNode, fieldRef)
    );
  });
}

function uniqueReferencesByLocation(
  references: SymbolReference[],
): SymbolReference[] {
  return references.filter(
    (reference, index) =>
      references.findIndex(
        (candidate) =>
          candidate === reference ||
          (candidate.name.toLowerCase() === reference.name.toLowerCase() &&
            candidate.context === reference.context &&
            referencesStartAtSameLocation(candidate, reference)),
      ) === index,
  );
}

/**
 * Resolve the target type for a chained reference by walking through the chain.
 * For f.getB().x: resolves f -> Foo, getB() -> FooB, returns FooB for field x.
 */
function resolveChainTargetType(
  chainedRef: {
    chainNodes?: SymbolReference[];
  },
  symbolManager: ISymbolManagerInterface,
  allSymbols: ApexSymbol[],
  symbolTable: SymbolTable,
): Effect.Effect<TypeSymbol | null, never, never> {
  return Effect.gen(function* () {
    const chainNodes = chainedRef.chainNodes;
    if (!chainNodes || chainNodes.length < 2) return null;

    let currentType: TypeSymbol | null = null;

    // Resolve first node (variable, class, or chain step)
    const firstNode = chainNodes[0];
    const firstVar = findVariableInScope(
      firstNode.name,
      undefined,
      allSymbols,
      symbolTable,
    );
    if (firstVar?.type?.name) {
      const effectiveType = firstNode.semanticContext?.indexedAccess
        ? indexedAccessResultType(firstVar.type)
        : firstVar.type;
      if (!effectiveType) return null;
      const typeName = effectiveType.name;
      let typeSymbols = yield* Effect.promise(() =>
        symbolManager.findSymbolByName(typeName),
      );
      if (
        typeSymbols.length === 0 &&
        typeName.includes('.') &&
        symbolManager.findSymbolByFQN
      ) {
        const fqn = yield* Effect.promise(() =>
          symbolManager.findSymbolByFQN(typeName),
        );
        if (fqn) typeSymbols = [fqn];
      }
      if (typeSymbols.length === 0 && typeName.includes('.')) {
        const lastPart = typeName.split('.').pop();
        if (lastPart)
          typeSymbols = yield* Effect.promise(() =>
            symbolManager.findSymbolByName(lastPart),
          );
      }
      currentType = typeSymbols.find(isClassOrInterfaceSymbol) ?? null;
    }
    // When first node is a class name (e.g. EncodingUtil), resolve via symbol manager
    if (!currentType && !firstVar) {
      let typeSymbols = yield* Effect.promise(() =>
        symbolManager.findSymbolByName(firstNode.name),
      );
      if (typeSymbols.length === 0 && symbolManager.findSymbolByFQN) {
        const candidates = firstNode.name.includes('.')
          ? [firstNode.name]
          : getImplicitQualifiedCandidates(firstNode.name);
        for (const candidate of candidates) {
          const fqnSymbol = yield* Effect.promise(() =>
            symbolManager.findSymbolByFQN(candidate),
          );
          if (fqnSymbol) {
            typeSymbols = [fqnSymbol];
            break;
          }
        }
      }
      if (typeSymbols.length === 0 && firstNode.name.includes('.')) {
        const lastPart = firstNode.name.split('.').pop();
        if (lastPart)
          typeSymbols = yield* Effect.promise(() =>
            symbolManager.findSymbolByName(lastPart),
          );
      }
      currentType = typeSymbols.find(isClassOrInterfaceSymbol) ?? null;
    }
    if (!currentType) return null;

    // Walk intermediate nodes (method calls) to resolve return types
    for (let i = 1; i < chainNodes.length - 1; i++) {
      const node = chainNodes[i];
      if (node.context !== ReferenceContext.METHOD_CALL) continue;
      const method: MethodSymbol | null = yield* findMethodInClassHierarchy(
        symbolManager,
        currentType!,
        node.name,
        allSymbols,
      );
      if (!method?.returnType?.name) return null;
      const returnTypeName: string = method.returnType.name;
      const typeSymbols: ApexSymbol[] = yield* Effect.promise(() =>
        symbolManager.findSymbolByName(returnTypeName),
      );
      const nextType = typeSymbols.find(isClassOrInterfaceSymbol);
      if (!nextType) return null;
      currentType = nextType;
    }

    return currentType;
  });
}

/**
 * Find a method in a class hierarchy (same file + cross-file)
 */
function findMethodInClassHierarchy(
  symbolManager: ISymbolManagerInterface,
  classSymbol: TypeSymbol,
  methodName: string,
  allSymbols: ApexSymbol[],
): Effect.Effect<MethodSymbol | null, never, never> {
  return Effect.gen(function* () {
    const allSymbolsForCompletion = symbolManager.getAllSymbolsForCompletion
      ? yield* Effect.promise(() => symbolManager.getAllSymbolsForCompletion())
      : [];
    const combined = [
      ...allSymbols,
      ...allSymbolsForCompletion.filter(
        (s) => !allSymbols.some((e) => e.id === s.id),
      ),
    ];

    const isMethodInClass = (method: ApexSymbol): boolean => {
      if (
        !isMethodSymbol(method) ||
        method.name?.toLowerCase() !== methodName.toLowerCase()
      )
        return false;
      let current: ApexSymbol | undefined = method;
      while (current) {
        if (current.id === classSymbol.id) return true;
        if (!current.parentId) break;
        current = combined.find((s) => s.id === current!.parentId);
      }
      return false;
    };

    const method = combined.find(isMethodInClass) as MethodSymbol | undefined;
    if (method) return method;

    if (classSymbol.superClass) {
      const superSymbols = yield* Effect.promise(() =>
        symbolManager.findSymbolByName(classSymbol.superClass!),
      );
      const superClass = superSymbols.find(isClassOrInterfaceSymbol);
      if (superClass)
        return yield* findMethodInClassHierarchy(
          symbolManager,
          superClass,
          methodName,
          allSymbols,
        );
    }
    return null;
  });
}

/**
 * Find a variable in the scope hierarchy
 */
function findVariableInScope(
  variableName: string,
  parentContext: string | undefined,
  allSymbols: ApexSymbol[],
  symbolTable: SymbolTable,
): VariableSymbol | null {
  // Use symbol table's lookup method which searches through scopes
  const symbol = symbolTable.lookup(variableName, null);

  if (
    symbol &&
    (symbol.kind === SymbolKind.Variable ||
      symbol.kind === SymbolKind.Parameter ||
      symbol.kind === SymbolKind.Field)
  ) {
    return symbol as VariableSymbol;
  }

  // When parentContext is a method name, check method parameters (lookup with null
  // misses parameters since they live in method block scope, not file scope)
  if (parentContext) {
    const methodSymbol = allSymbols.find(
      (s): s is MethodSymbol =>
        isMethodSymbol(s) && 'parameters' in s && s.name === parentContext,
    );
    if (methodSymbol?.parameters) {
      const param = methodSymbol.parameters.find(
        (p) => p.name?.toLowerCase() === variableName.toLowerCase(),
      );
      if (param) return param;
    }
  }

  // When parentContext is missing, parameters may still be in method.parameters
  // (not in symbolArray). Search all methods in the file.
  if (!parentContext) {
    for (const s of allSymbols) {
      if (isMethodSymbol(s) && 'parameters' in s && s.parameters) {
        const param = s.parameters.find(
          (p) => p.name?.toLowerCase() === variableName.toLowerCase(),
        );
        if (param) return param;
      }
    }
  }

  // Fallback: search allSymbols directly if lookup failed
  // This handles cases where variables might not be in the symbol table's scope tree
  const matchingSymbols = allSymbols.filter(
    (s) =>
      (s.kind === SymbolKind.Variable ||
        s.kind === SymbolKind.Parameter ||
        s.kind === SymbolKind.Field) &&
      s.name?.toLowerCase() === variableName.toLowerCase(),
  );

  if (matchingSymbols.length > 0) {
    return matchingSymbols[0] as VariableSymbol;
  }

  return null;
}

/**
 * Find a field in the class hierarchy (including superclasses)
 */
function findFieldInHierarchy(
  symbolManager: ISymbolManagerInterface,
  classSymbol: TypeSymbol,
  fieldName: string,
  allSymbols: ApexSymbol[],
): Effect.Effect<VariableSymbol | null, never, never> {
  return Effect.gen(function* () {
    // Get all symbols across all files for cross-file resolution
    const allSymbolsForCompletion = symbolManager.getAllSymbolsForCompletion
      ? yield* Effect.promise(() => symbolManager.getAllSymbolsForCompletion())
      : [];
    // Combine with current file symbols (current file takes precedence)
    const combinedSymbols = [
      ...allSymbols,
      ...allSymbolsForCompletion.filter(
        (s) => !allSymbols.some((existing) => existing.id === s.id),
      ),
    ];

    // Find fields in the current class (including cross-file)
    const classFields = findFieldsInClass(classSymbol, combinedSymbols);
    const matchingField = classFields.find(
      (f) => f.name.toLowerCase() === fieldName.toLowerCase(),
    );

    if (matchingField) {
      return matchingField;
    }

    // If there's a superclass, find fields there too
    if (classSymbol.superClass) {
      const superClassField = yield* findFieldInSuperclass(
        symbolManager,
        classSymbol.superClass,
        fieldName,
      );
      if (superClassField) {
        return superClassField;
      }
    }

    return null;
  });
}

/**
 * Find all fields in a class (same file only)
 */
function findFieldsInClass(
  classSymbol: TypeSymbol,
  allSymbols: ApexSymbol[],
): VariableSymbol[] {
  const fields: VariableSymbol[] = [];

  // Find the class block (fields might have parentId pointing to class block)
  const classBlock = allSymbols.find(
    (s) =>
      isBlockSymbol(s) &&
      s.scopeType === 'class' &&
      s.parentId === classSymbol.id,
  ) as ScopeSymbol | undefined;

  // Get fields and properties directly in this class (properties use get; set;)
  for (const symbol of allSymbols) {
    if (
      (isFieldSymbol(symbol) || isPropertySymbol(symbol)) &&
      (symbol.parentId === classBlock?.id || symbol.parentId === classSymbol.id)
    ) {
      fields.push(symbol);
    }
  }

  return fields;
}

/**
 * Find a field in a superclass (cross-file resolution)
 */
function findFieldInSuperclass(
  symbolManager: ISymbolManagerInterface,
  superClassName: string,
  fieldName: string,
): Effect.Effect<VariableSymbol | null, never, never> {
  return Effect.gen(function* () {
    // Find the superclass type symbol
    const superClassSymbols = yield* Effect.promise(() =>
      symbolManager.findSymbolByName(superClassName),
    );
    const superClassSymbol = superClassSymbols.find(isClassOrInterfaceSymbol);

    if (!superClassSymbol) {
      return null;
    }

    // Get all symbols for completion to find fields
    const allSymbols = yield* Effect.promise(() =>
      symbolManager.getAllSymbolsForCompletion(),
    );

    // Find fields in the superclass
    const superClassFields = findFieldsInClass(superClassSymbol, allSymbols);
    const matchingField = superClassFields.find(
      (f) => f.name.toLowerCase() === fieldName.toLowerCase(),
    );

    if (matchingField) {
      return matchingField;
    }

    // Recursively check superclass's superclass
    if (superClassSymbol.superClass) {
      const ancestorField = yield* findFieldInSuperclass(
        symbolManager,
        superClassSymbol.superClass,
        fieldName,
      );
      if (ancestorField) {
        return ancestorField;
      }
    }

    return null;
  });
}

/**
 * Check if a variable/field is visible from the calling context
 */
function isVariableVisible(
  variable: VariableSymbol,
  callingClass: TypeSymbol,
  symbolManager: ISymbolManagerInterface,
  allSymbols: ApexSymbol[],
): Effect.Effect<boolean, never, never> {
  return Effect.gen(function* () {
    const visibility =
      variable.modifiers?.visibility ?? SymbolVisibility.Default;

    // Public, Global fields are always visible
    if (
      visibility === SymbolVisibility.Public ||
      visibility === SymbolVisibility.Global
    ) {
      return true;
    }

    // Find the declaring class for this field
    const declaringClass = yield* Effect.promise(() =>
      findDeclaringClassForVariable(variable, allSymbols, symbolManager),
    );
    if (!declaringClass) {
      // Can't determine declaring class - assume visible (conservative)
      return true;
    }

    // Private/Default fields are only visible within the same class.
    // Per Apex doc: if no modifier specified, it is private.
    if (
      visibility === SymbolVisibility.Private ||
      visibility === SymbolVisibility.Default
    ) {
      if (declaringClass.id === callingClass.id) return true;
      // @TestVisible allows test classes to access private/protected members
      if (
        AnnotationUtils.hasAnnotation(variable, 'TestVisible') &&
        (yield* Effect.promise(() =>
          isInTestContext(callingClass, allSymbols, symbolManager),
        ))
      ) {
        return true;
      }
      return false;
    }

    // Protected fields are visible to subclasses and inner classes (per Apex doc)
    if (visibility === SymbolVisibility.Protected) {
      // Check if calling class is the same or a subclass of declaring class
      if (declaringClass.id === callingClass.id) {
        return true;
      }

      // Check if calling class extends declaring class
      if (
        yield* Effect.promise(() =>
          isSubclassOf(callingClass, declaringClass, symbolManager, allSymbols),
        )
      ) {
        return true;
      }

      // Check if calling class is an inner class whose enclosing class is the declaring class
      const enclosingClass = yield* Effect.promise(() =>
        getEnclosingClass(callingClass, allSymbols, symbolManager),
      );
      if (enclosingClass && enclosingClass.id === declaringClass.id) {
        return true;
      }

      // @TestVisible allows test classes to access private/protected members
      if (
        AnnotationUtils.hasAnnotation(variable, 'TestVisible') &&
        (yield* Effect.promise(() =>
          isInTestContext(callingClass, allSymbols, symbolManager),
        ))
      ) {
        return true;
      }

      return false;
    }

    // Unknown visibility - assume visible (conservative)
    return true;
  });
}

/**
 * Find the declaring class for a variable/field
 */
async function findDeclaringClassForVariable(
  variable: VariableSymbol,
  allSymbols: ApexSymbol[],
  symbolManager: ISymbolManagerInterface,
): Promise<TypeSymbol | null> {
  const resolveParent = async (id: string): Promise<ApexSymbol | null> =>
    allSymbols.find((s) => s.id === id) ??
    (await symbolManager.getSymbol(id)) ??
    null;

  let current: ApexSymbol | null = variable;
  while (current) {
    if (isClassOrInterfaceSymbol(current)) {
      return current;
    }
    if (current.parentId) {
      const parent = await resolveParent(current.parentId);
      if (isClassOrInterfaceSymbol(parent)) {
        return parent;
      }
      if (parent && isBlockSymbol(parent) && parent.parentId) {
        const grandParent = await resolveParent(parent.parentId);
        if (isClassOrInterfaceSymbol(grandParent)) {
          return grandParent;
        }
      }
      current = parent ?? null;
    } else {
      break;
    }
  }

  return null;
}

/**
 * Check if a class is a subclass of another class
 */
async function isSubclassOf(
  childClass: TypeSymbol,
  parentClass: TypeSymbol,
  symbolManager: ISymbolManagerInterface,
  allSymbols: ApexSymbol[],
): Promise<boolean> {
  // Check direct superclass
  if (childClass.superClass === parentClass.name) {
    return true;
  }

  // Check if child's superclass extends parent (recursive)
  if (childClass.superClass) {
    const superClassSymbols = await symbolManager.findSymbolByName(
      childClass.superClass,
    );
    const superClassSymbol = superClassSymbols.find(isClassOrInterfaceSymbol);

    if (superClassSymbol) {
      return isSubclassOf(
        superClassSymbol,
        parentClass,
        symbolManager,
        allSymbols,
      );
    }
  }

  return false;
}
