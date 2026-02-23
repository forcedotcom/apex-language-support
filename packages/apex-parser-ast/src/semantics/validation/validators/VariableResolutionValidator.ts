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
} from '../../../utils/symbolNarrowing';
import { ReferenceContext } from '../../../types/symbolReference';
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
import {
  extractElementTypeFromCollection,
  extractReceiverExpressionBeforeDot,
} from '../utils/typeUtils';
import { getEnclosingClass, isInTestContext } from '../utils/visibilityUtils';
import { AnnotationUtils } from '../../../utils/AnnotationUtils';

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
      const extractedFieldAccesses: any[] = [];
      const extractedWriteFieldAccesses: any[] = []; // Track write accesses separately

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

        // Skip if it's inside a string literal (heuristic check)
        // This handles cases where the parser incorrectly creates VARIABLE_USAGE for string literals
        if (options.sourceContent && ref.location) {
          const refLine =
            ref.location?.symbolRange?.startLine ??
            ref.location?.identifierRange?.startLine;
          const refCol =
            ref.location?.symbolRange?.startColumn ??
            ref.location?.identifierRange?.startColumn;
          if (refLine && refCol) {
            const lines = options.sourceContent.split('\n');
            const line = lines[refLine - 1];
            if (line && refCol > 0 && refCol <= line.length + 1) {
              // Check if the character at the reference start position is a quote
              // refCol is 1-based, so refCol - 1 is 0-based index
              const startIdx = refCol - 1;
              if (startIdx >= 0 && startIdx < line.length) {
                const startChar = line[startIdx];
                if (startChar === '"') {
                  return false; // Skip - reference starts with quote, it's a string literal (parser bug)
                }
              }

              // Also check if we're inside quotes by counting quotes before the reference start
              const beforeRef = line.substring(
                0,
                Math.min(refCol - 1, line.length),
              );
              // Count unescaped quotes before the reference
              let quoteCount = 0;
              let escaped = false;
              for (let i = 0; i < beforeRef.length; i++) {
                if (beforeRef[i] === '\\' && !escaped) {
                  escaped = true;
                  continue;
                }
                if (beforeRef[i] === '"' && !escaped) {
                  quoteCount++;
                }
                escaped = false;
              }
              // If odd number of quotes before, we're inside a string literal
              if (quoteCount % 2 === 1) {
                return false; // Skip - it's inside a string literal (parser bug)
              }
            }
          }
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
      const fieldAccesses = [
        ...allReferences.filter(
          (ref) => ref.context === ReferenceContext.FIELD_ACCESS,
        ),
        ...extractedFieldAccesses,
      ];

      // Get all symbols from the table
      const allSymbols = symbolTable.getAllSymbols();

      // Find the containing class for context
      const containingClass = allSymbols.find(
        (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
      ) as TypeSymbol | undefined;

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
          // Variable not found - check if it might be a string literal (parser bug workaround)
          if (options.sourceContent && refLocation) {
            const refLine =
              refLocation?.symbolRange?.startLine ??
              refLocation?.identifierRange?.startLine;
            const refCol =
              refLocation?.symbolRange?.startColumn ??
              refLocation?.identifierRange?.startColumn;
            if (refLine && refCol) {
              const lines = options.sourceContent.split('\n');
              const line = lines[refLine - 1];
              if (line && refCol > 0) {
                // Check if the reference starts with a quote (parser created VARIABLE_USAGE for string literal)
                // refCol is 1-based, so refCol - 1 is 0-based index of the start character
                const startChar =
                  refCol - 1 < line.length ? line[refCol - 1] : null;
                if (startChar === '"') {
                  continue; // Skip - reference starts with quote, it's a string literal (parser bug)
                }

                // Also check if we're inside quotes by counting quotes before the reference start
                const beforeRef = line.substring(
                  0,
                  Math.min(refCol - 1, line.length),
                );
                // Count unescaped quotes before the reference
                let quoteCount = 0;
                let escaped = false;
                for (let i = 0; i < beforeRef.length; i++) {
                  if (beforeRef[i] === '\\' && !escaped) {
                    escaped = true;
                    continue;
                  }
                  if (beforeRef[i] === '"' && !escaped) {
                    quoteCount++;
                  }
                  escaped = false;
                }
                // If odd number of quotes before, we're inside a string literal
                if (quoteCount % 2 === 1) {
                  continue; // Skip - it's inside a string literal (parser bug)
                }
              }
            }
          }

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

          // #region agent log
          fetch('http://127.0.0.1:7249/ingest/0f486e81-d99b-4936-befb-74177d662c21', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '371dcb' },
            body: JSON.stringify({
              sessionId: '371dcb', runId: 'run5', hypothesisId: 'F-var-ref',
              location: 'VariableResolutionValidator.ts:366',
              message: 'variable.does.not.exist about to fire',
              data: {
                variableName,
                refLine: refLocation?.symbolRange?.startLine ?? refLocation?.identifierRange?.startLine,
                refCol: refLocation?.symbolRange?.startColumn ?? refLocation?.identifierRange?.startColumn,
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
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
        if (variable.kind === SymbolKind.Field && containingClass) {
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
        // Extract just the field name (handle cases where name might be "obj.field" instead of "field")
        let fieldName = fieldRef.name;
        // If field name contains a dot, extract the part after the last dot
        if (fieldName.includes('.')) {
          const parts = fieldName.split('.');
          fieldName = parts[parts.length - 1];
        }
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
              const rLine =
                r.location?.symbolRange?.startLine ??
                r.location?.identifierRange?.startLine;
              const rCol =
                r.location?.symbolRange?.startColumn ??
                r.location?.identifierRange?.startColumn ??
                0;
              return rLine === fieldLine && Math.abs(rCol - fieldCol) < 25;
            }) ||
            chainedTypeRefs.some((c) => {
              const last = c.chainNodes?.[(c.chainNodes?.length ?? 0) - 1];
              if (
                last?.context !== ReferenceContext.METHOD_CALL ||
                last?.name?.toLowerCase() !== fieldName.toLowerCase()
              )
                return false;
              const rLine =
                last.location?.symbolRange?.startLine ??
                last.location?.identifierRange?.startLine;
              const rCol =
                last.location?.symbolRange?.startColumn ??
                last.location?.identifierRange?.startColumn ??
                0;
              return rLine === fieldLine && Math.abs(rCol - fieldCol) < 25;
            });
          if (isMethodCall) continue;
        }

        if (!containingClass) {
          continue;
        }

        // TIER 2 Enhancement: For qualified field access (obj.field), resolve object type
        let targetType: TypeSymbol | null = null;

        // Try to resolve target type from chain context first (for f.getB().x, resolve through method return types)
        let chainBaseVar: VariableSymbol | null = null;
        for (const chainedRef of chainedTypeRefs) {
          if (chainedRef.chainNodes && chainedRef.chainNodes.length > 0) {
            const finalNode =
              chainedRef.chainNodes[chainedRef.chainNodes.length - 1];
            if (
              finalNode.name === fieldName &&
              finalNode.context === ReferenceContext.FIELD_ACCESS
            ) {
              const baseNode = chainedRef.chainNodes[0];
              chainBaseVar = baseNode?.name
                ? findVariableInScope(
                    baseNode.name,
                    fieldRef.parentContext,
                    allSymbols,
                    symbolTable,
                  )
                : null;
              const resolvedType = yield* resolveChainTargetType(
                chainedRef,
                symbolManager,
                allSymbols,
                symbolTable,
              );
              if (resolvedType) {
                const typeForElement =
                  chainBaseVar?.type?.originalTypeString ||
                  chainBaseVar?.type?.name;
                targetType = yield* resolveTargetTypeWithArrayAccess(
                  resolvedType,
                  typeForElement,
                  fieldRef,
                  options.sourceContent,
                  symbolManager,
                );
                break;
              }
            }
          }
        }

        // Fallback: extract object name and resolve from first node only
        let suppressDueToUnresolvedDeclaredType = false;
        let objectName: string | null = null;
        if (!targetType) {
          for (const chainedRef of chainedTypeRefs) {
            if (chainedRef.chainNodes && chainedRef.chainNodes.length > 0) {
              const finalNode =
                chainedRef.chainNodes[chainedRef.chainNodes.length - 1];
              if (
                finalNode.name === fieldName &&
                finalNode.context === ReferenceContext.FIELD_ACCESS
              ) {
                const baseNode = chainedRef.chainNodes[0];
                if (
                  baseNode.name?.toLowerCase() === 'this' ||
                  baseNode.context === ReferenceContext.VARIABLE_USAGE ||
                  baseNode.context === ReferenceContext.CLASS_REFERENCE ||
                  baseNode.context === ReferenceContext.CHAIN_STEP
                ) {
                  objectName = baseNode.name ?? null;
                  break;
                }
              }
            }
          }

          if (!objectName && options.sourceContent) {
            objectName = extractObjectNameFromFieldAccess(
              fieldRef,
              options.sourceContent,
            );
          }

          if (objectName) {
            let objectVariable = findVariableInScope(
              objectName,
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
                objectName?.toLowerCase() === 'this' ||
                objectName === containingClass?.name;
              if (!isThisOrClassName) {
                let typeSymbols = symbolManager.findSymbolByName(objectName);
                if (
                  typeSymbols.length === 0 &&
                  objectName.includes('.') &&
                  symbolManager.findSymbolByFQN
                ) {
                  const fqn = symbolManager.findSymbolByFQN(objectName);
                  if (fqn) typeSymbols = [fqn];
                }
                if (typeSymbols.length === 0 && objectName.includes('.')) {
                  const lastPart = objectName.split('.').pop();
                  if (lastPart) {
                    typeSymbols = symbolManager.findSymbolByName(lastPart);
                  }
                }
                const resolvedType =
                  (typeSymbols.find(
                    (s: ApexSymbol) =>
                      s.kind === SymbolKind.Class ||
                      s.kind === SymbolKind.Interface,
                  ) as TypeSymbol | undefined) ?? null;
                if (resolvedType) {
                  targetType = yield* resolveTargetTypeWithArrayAccess(
                    resolvedType,
                    objectName,
                    fieldRef,
                    options.sourceContent,
                    symbolManager,
                  );
                } else {
                  suppressDueToUnresolvedDeclaredType = true;
                }
              }
            }

            if (!objectVariable) {
              for (const chainedRef of chainedTypeRefs) {
                if (chainedRef.chainNodes && chainedRef.chainNodes.length > 0) {
                  const firstNode = chainedRef.chainNodes[0];
                  if (
                    firstNode.name === objectName &&
                    (firstNode.context === ReferenceContext.VARIABLE_USAGE ||
                      firstNode.context === ReferenceContext.CHAIN_STEP)
                  ) {
                    objectVariable = findVariableInScope(
                      objectName,
                      fieldRef.parentContext,
                      allSymbols,
                      symbolTable,
                    );
                    if (objectVariable) break;
                  }
                }
              }
            }

            if (objectVariable?.type?.name) {
              const varTypeName = objectVariable.type.name;
              const fullTypeStr =
                objectVariable.type.originalTypeString || varTypeName;
              let typeSymbols = symbolManager.findSymbolByName(varTypeName);
              if (
                typeSymbols.length === 0 &&
                varTypeName.includes('.') &&
                symbolManager.findSymbolByFQN
              ) {
                const fqn = symbolManager.findSymbolByFQN(varTypeName);
                if (fqn) typeSymbols = [fqn];
              }
              if (typeSymbols.length === 0 && varTypeName.includes('.')) {
                const lastPart = varTypeName.split('.').pop();
                if (lastPart) {
                  typeSymbols = symbolManager.findSymbolByName(lastPart);
                }
              }
              let resolvedTargetType =
                (typeSymbols.find(
                  (s: ApexSymbol) =>
                    s.kind === SymbolKind.Class ||
                    s.kind === SymbolKind.Interface,
                ) as TypeSymbol | undefined) ?? null;
              resolvedTargetType = yield* resolveTargetTypeWithArrayAccess(
                resolvedTargetType,
                fullTypeStr,
                fieldRef,
                options.sourceContent,
                symbolManager,
              );
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
          // Fallback: try source extraction when objectName not from chain (e.g. "this")
          const effectiveObjectName =
            objectName ??
            (options.sourceContent
              ? extractObjectNameFromFieldAccess(
                  fieldRef,
                  options.sourceContent,
                )
              : null);
          const isThisOrClass =
            effectiveObjectName?.toLowerCase() === 'this' ||
            effectiveObjectName === containingClass?.name;
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
        const fieldName = fieldRef.name;
        const refLocation = fieldRef.location;

        if (!containingClass) {
          continue;
        }

        // Resolve object type for qualified field access
        let targetType: TypeSymbol | null = null;

        for (const chainedRef of chainedTypeRefs) {
          if (
            chainedRef.chainNodes &&
            chainedRef.chainNodes.length > 0 &&
            chainedRef.chainNodes[chainedRef.chainNodes.length - 1].name ===
              fieldName
          ) {
            const resolvedType = yield* resolveChainTargetType(
              chainedRef,
              symbolManager,
              allSymbols,
              symbolTable,
            );
            if (resolvedType) {
              targetType = resolvedType;
              break;
            }
          }
        }

        // Fallback: resolve from first node (variable) when chain resolution failed
        let suppressDueToUnresolvedDeclaredType = false;
        let objectName: string | null = null;
        if (!targetType) {
          for (const chainedRef of chainedTypeRefs) {
            if (
              chainedRef.chainNodes &&
              chainedRef.chainNodes.length >= 2 &&
              chainedRef.chainNodes[chainedRef.chainNodes.length - 1].name ===
                fieldName
            ) {
              const baseNode = chainedRef.chainNodes[0];
              objectName = baseNode.name ?? null;
              const objectVariable = findVariableInScope(
                baseNode.name,
                fieldRef.parentContext,
                allSymbols,
                symbolTable,
              );
              if (objectVariable?.type?.name) {
                const varTypeName = objectVariable.type.name;
                let typeSymbols = symbolManager.findSymbolByName(varTypeName);
                if (
                  typeSymbols.length === 0 &&
                  varTypeName.includes('.') &&
                  symbolManager.findSymbolByFQN
                ) {
                  const fqn = symbolManager.findSymbolByFQN(varTypeName);
                  if (fqn) typeSymbols = [fqn];
                }
                if (typeSymbols.length === 0 && varTypeName.includes('.')) {
                  const lastPart = varTypeName.split('.').pop();
                  if (lastPart)
                    typeSymbols = symbolManager.findSymbolByName(lastPart);
                }
                const resolvedTargetType =
                  (typeSymbols.find(
                    (s: ApexSymbol) =>
                      s.kind === SymbolKind.Class ||
                      s.kind === SymbolKind.Interface,
                  ) as TypeSymbol | undefined) ?? null;
                if (resolvedTargetType) {
                  targetType = resolvedTargetType;
                } else {
                  // Type not in symbol manager (e.g. ContentVersion) - suppress false positive
                  suppressDueToUnresolvedDeclaredType = true;
                }
                break;
              }
            }
          }
        }

        if (!objectName && options.sourceContent) {
          objectName = extractObjectNameFromFieldAccess(
            fieldRef,
            options.sourceContent,
          );
        }

        // Use containingClass only when receiver is deterministic: "this" or class-name static access
        if (!targetType) {
          if (suppressDueToUnresolvedDeclaredType) {
            continue;
          }
          // Fallback: try source extraction when objectName not from chain (e.g. "this")
          const effectiveObjectName =
            objectName ??
            (options.sourceContent
              ? extractObjectNameFromFieldAccess(
                  fieldRef,
                  options.sourceContent,
                )
              : null);
          const isThisOrClass =
            effectiveObjectName?.toLowerCase() === 'this' ||
            effectiveObjectName === containingClass?.name;
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

/**
 * Resolve the target type for a chained reference by walking through the chain.
 * For f.getB().x: resolves f -> Foo, getB() -> FooB, returns FooB for field x.
 */
function resolveChainTargetType(
  chainedRef: {
    chainNodes?: Array<{ name: string; context: ReferenceContext }>;
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
      const typeName = firstVar.type.name;
      let typeSymbols = symbolManager.findSymbolByName(typeName);
      if (
        typeSymbols.length === 0 &&
        typeName.includes('.') &&
        symbolManager.findSymbolByFQN
      ) {
        const fqn = symbolManager.findSymbolByFQN(typeName);
        if (fqn) typeSymbols = [fqn];
      }
      if (typeSymbols.length === 0 && typeName.includes('.')) {
        const lastPart = typeName.split('.').pop();
        if (lastPart) typeSymbols = symbolManager.findSymbolByName(lastPart);
      }
      currentType =
        (typeSymbols.find(
          (s: ApexSymbol) =>
            s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
        ) as TypeSymbol | undefined) ?? null;
    }
    // When first node is a class name (e.g. EncodingUtil), resolve via symbol manager
    if (!currentType && !firstVar) {
      let typeSymbols = symbolManager.findSymbolByName(firstNode.name);
      if (typeSymbols.length === 0 && symbolManager.findSymbolByFQN) {
        const fqn = firstNode.name.includes('.')
          ? firstNode.name
          : `System.${firstNode.name}`;
        const fqnSymbol = symbolManager.findSymbolByFQN(fqn);
        if (fqnSymbol) typeSymbols = [fqnSymbol];
      }
      if (typeSymbols.length === 0 && firstNode.name.includes('.')) {
        const lastPart = firstNode.name.split('.').pop();
        if (lastPart) typeSymbols = symbolManager.findSymbolByName(lastPart);
      }
      currentType =
        (typeSymbols.find(
          (s: ApexSymbol) =>
            s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
        ) as TypeSymbol | undefined) ?? null;
    }
    if (!currentType) return null;

    // Walk intermediate nodes (method calls) to resolve return types
    for (let i = 1; i < chainNodes.length - 1; i++) {
      const node = chainNodes[i];
      if (node.context !== ReferenceContext.METHOD_CALL) continue;
      const method = yield* findMethodInClassHierarchy(
        symbolManager,
        currentType,
        node.name,
        allSymbols,
      );
      if (!method?.returnType?.name) return null;
      const returnTypeName = method.returnType.name;
      const typeSymbols = symbolManager.findSymbolByName(returnTypeName);
      const nextType = typeSymbols.find(
        (s: ApexSymbol) =>
          s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
      ) as TypeSymbol | undefined;
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
    const allSymbolsForCompletion =
      symbolManager.getAllSymbolsForCompletion?.() ?? [];
    const combined = [
      ...allSymbols,
      ...allSymbolsForCompletion.filter(
        (s) => !allSymbols.some((e) => e.id === s.id),
      ),
    ];

    const isMethodInClass = (method: ApexSymbol): boolean => {
      if (
        method.kind !== SymbolKind.Method ||
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
      const superSymbols = symbolManager.findSymbolByName(
        classSymbol.superClass,
      );
      const superClass = superSymbols.find(
        (s: ApexSymbol) =>
          s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
      ) as TypeSymbol | undefined;
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
 * When targetType is List/Set and the expression has array access (arr[0].field),
 * resolve to the element type. Otherwise return targetType unchanged.
 */
function resolveTargetTypeWithArrayAccess(
  targetType: TypeSymbol | null,
  variableTypeName: string | undefined,
  fieldRef: any,
  sourceContent: string | undefined,
  symbolManager: ISymbolManagerInterface,
): Effect.Effect<TypeSymbol | null, never, never> {
  return Effect.gen(function* () {
    if (!targetType || !variableTypeName) return targetType;
    const receiverExpr = extractReceiverExpressionBeforeDot(
      fieldRef,
      sourceContent,
    );
    const hasArrayAccess = receiverExpr != null && receiverExpr.includes('[');
    const isListOrSet =
      targetType.name?.toLowerCase() === 'list' ||
      targetType.name?.toLowerCase() === 'set';
    if (!hasArrayAccess || !isListOrSet) return targetType;
    const elementType = extractElementTypeFromCollection(variableTypeName);
    if (!elementType) return targetType;
    const elementSymbols = symbolManager.findSymbolByName(elementType);
    const elementTypeSymbol = elementSymbols.find(
      (s: ApexSymbol) =>
        s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
    ) as TypeSymbol | undefined;
    return elementTypeSymbol ?? targetType;
  });
}

/**
 * Extract object name from field access reference by parsing source content
 * For qualified field access like "obj.field", extracts "obj"
 */
function extractObjectNameFromFieldAccess(
  fieldRef: any, // SymbolReference with FIELD_ACCESS context
  sourceContent: string,
): string | null {
  if (!sourceContent || !fieldRef.location) {
    return null;
  }

  const location = fieldRef.location;
  const startLine =
    location.identifierRange?.startLine ?? location.symbolRange.startLine;
  const startColumn =
    location.identifierRange?.startColumn ?? location.symbolRange.startColumn;

  const lines = sourceContent.split('\n');
  if (startLine < 1 || startLine > lines.length) {
    return null;
  }

  const fieldAccessLine = lines[startLine - 1];
  if (!fieldAccessLine) {
    return null;
  }

  // Find the dot before the field name
  const fieldName = fieldRef.name?.includes('.')
    ? (fieldRef.name.split('.').pop() ?? fieldRef.name)
    : fieldRef.name;

  // Try location-based extraction first
  const fieldNameIndex = fieldAccessLine
    .substring(startColumn - 1)
    .toLowerCase()
    .indexOf(fieldName.toLowerCase());
  let dotIndex = -1;
  if (fieldNameIndex >= 0) {
    dotIndex = startColumn - 1 + fieldNameIndex - 1;
  }

  // Fallback: search whole line for ".fieldName" when location-based fails
  if (dotIndex < 0 || fieldAccessLine[dotIndex] !== '.') {
    const dotFieldMatch = fieldAccessLine.match(
      new RegExp(
        `([a-zA-Z_][a-zA-Z0-9_]*)\\.${fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
      ),
    );
    if (dotFieldMatch) {
      return dotFieldMatch[1];
    }
    return null;
  }

  // Extract object name (everything before the dot, trimmed)
  // Handle cases like "obj.field", "obj.field.field2", etc.
  const beforeDot = fieldAccessLine.substring(0, dotIndex).trim();

  // Extract the last identifier before the dot
  // This handles cases like "myObj.field" or "this.field"
  const identifierMatch = beforeDot.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\.?\s*$/);
  if (identifierMatch) {
    return identifierMatch[1];
  }

  // Fallback: try to extract any identifier-like string
  const parts = beforeDot.split(/[^a-zA-Z0-9_]+/);
  if (parts.length > 0) {
    const lastPart = parts[parts.length - 1];
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(lastPart)) {
      return lastPart;
    }
  }

  return null;
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
      (s) =>
        s.kind === SymbolKind.Method &&
        'parameters' in s &&
        s.name === parentContext,
    ) as MethodSymbol | undefined;
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
      if (
        s.kind === SymbolKind.Method &&
        'parameters' in s &&
        (s as MethodSymbol).parameters
      ) {
        const param = (s as MethodSymbol).parameters.find(
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
      ? symbolManager.getAllSymbolsForCompletion()
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
      (symbol.kind === SymbolKind.Field ||
        symbol.kind === SymbolKind.Property) &&
      (symbol.parentId === classBlock?.id || symbol.parentId === classSymbol.id)
    ) {
      fields.push(symbol as VariableSymbol);
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
    const superClassSymbols = symbolManager.findSymbolByName(superClassName);
    const superClassSymbol = superClassSymbols.find(
      (s: ApexSymbol) =>
        s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
    ) as TypeSymbol | undefined;

    if (!superClassSymbol) {
      // Superclass not found - might need artifact loading
      return null;
    }

    // Get all symbols for completion to find fields
    const allSymbols = symbolManager.getAllSymbolsForCompletion();

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
    const declaringClass = findDeclaringClassForVariable(
      variable,
      allSymbols,
      symbolManager,
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
        isInTestContext(callingClass, allSymbols, symbolManager)
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
        isSubclassOf(callingClass, declaringClass, symbolManager, allSymbols)
      ) {
        return true;
      }

      // Check if calling class is an inner class whose enclosing class is the declaring class
      const enclosingClass = getEnclosingClass(
        callingClass,
        allSymbols,
        symbolManager,
      );
      if (enclosingClass && enclosingClass.id === declaringClass.id) {
        return true;
      }

      // @TestVisible allows test classes to access private/protected members
      if (
        AnnotationUtils.hasAnnotation(variable, 'TestVisible') &&
        isInTestContext(callingClass, allSymbols, symbolManager)
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
function findDeclaringClassForVariable(
  variable: VariableSymbol,
  allSymbols: ApexSymbol[],
  symbolManager: ISymbolManagerInterface,
): TypeSymbol | null {
  const resolveParent = (id: string): ApexSymbol | null =>
    allSymbols.find((s) => s.id === id) ?? symbolManager.getSymbol(id) ?? null;

  let current: ApexSymbol | null = variable;
  while (current) {
    if (
      current.kind === SymbolKind.Class ||
      current.kind === SymbolKind.Interface
    ) {
      return current as TypeSymbol;
    }
    if (current.parentId) {
      const parent = resolveParent(current.parentId);
      if (
        parent &&
        (parent.kind === SymbolKind.Class ||
          parent.kind === SymbolKind.Interface)
      ) {
        return parent as TypeSymbol;
      }
      // If parent is a block, check its parent
      if (parent && isBlockSymbol(parent) && parent.parentId) {
        const grandParent = resolveParent(parent.parentId);
        if (
          grandParent &&
          (grandParent.kind === SymbolKind.Class ||
            grandParent.kind === SymbolKind.Interface)
        ) {
          return grandParent as TypeSymbol;
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
function isSubclassOf(
  childClass: TypeSymbol,
  parentClass: TypeSymbol,
  symbolManager: ISymbolManagerInterface,
  allSymbols: ApexSymbol[],
): boolean {
  // Check direct superclass
  if (childClass.superClass === parentClass.name) {
    return true;
  }

  // Check if child's superclass extends parent (recursive)
  if (childClass.superClass) {
    const superClassSymbols = symbolManager.findSymbolByName(
      childClass.superClass,
    );
    const superClassSymbol = superClassSymbols.find(
      (s: ApexSymbol) =>
        s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
    ) as TypeSymbol | undefined;

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
