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
  MethodSymbol,
  TypeSymbol,
  ApexSymbol,
  VariableSymbol,
  ScopeSymbol,
} from '../../../types/symbol';
import { SymbolKind, SymbolVisibility } from '../../../types/symbol';
import {
  isMethodSymbol,
  isBlockSymbol,
  isClassOrInterfaceSymbol,
} from '../../../utils/symbolNarrowing';
import {
  ReferenceContext,
  type SymbolReference,
  type SemanticTypeShape,
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
import { isAssignable } from '../utils/typeAssignability';
import {
  resolveTypeName,
  ReferenceTypeEnum,
  IdentifierContext,
  type CompilationContext,
  type SymbolProvider,
  Namespaces,
} from '../../../namespace/NamespaceUtils';
import { DEFAULT_SALESFORCE_API_VERSION } from '../../../constants/constants';
import { extractBaseTypeForResolution } from '../utils/typeUtils';
import { getEnclosingClass, isInTestContext } from '../utils/visibilityUtils';
import {
  createGenericTypeSubstitutionMap,
  substituteTypeName,
} from '../../../utils/genericTypeSubstitution';
import { AnnotationUtils } from '../../../utils/AnnotationUtils';
import { isPrimaryImplicitNamespace } from '../../../namespace/NamespaceResolutionPolicy';
import { resolveArgumentSemantics } from '../../../utils/argumentTypeResolution';
import { indexedAccessResultType } from '../../../utils/indexedAccess';
import type { TypeInfo } from '../../../types/typeInfo';

/**
 * Validates method calls for:
 * - Method existence (INVALID_METHOD_NOT_FOUND)
 * - Method visibility (METHOD_NOT_VISIBLE)
 * - Parameter type compatibility (METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE)
 * - Ambiguous method signatures (AMBIGUOUS_METHOD_SIGNATURE)
 *
 * This is a TIER 2 (THOROUGH) validation that requires cross-file type resolution.
 * It examines method call references in the symbol table and validates them against
 * available method symbols, including methods from superclasses.
 *
 * @see SEMANTIC_SYMBOL_RULES.md - Method resolution and visibility rules
 */
export const MethodResolutionValidator: Validator = {
  id: 'method-resolution',
  name: 'Method Resolution Validator',
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

      // Get all method call references from the symbol table
      const allReferences = symbolTable.getAllReferences();
      const methodCalls = normalizeMethodCallReferences(allReferences);

      // Get all symbols from the table
      const allSymbols = symbolTable.getAllSymbols();

      // Find the containing class for context
      const containingClass = allSymbols.find((s): s is TypeSymbol =>
        isClassOrInterfaceSymbol(s),
      );

      if (!containingClass) {
        // No class context - skip validation
        return {
          isValid: true,
          errors,
          warnings,
        };
      }

      // Deduplicate: same logical call can produce multiple refs (e.g. chain nodes)
      const processedCalls = new Set<string>();

      // Validate each method call
      for (const methodCall of methodCalls) {
        // Extract the actual method name from chained calls
        // For chained calls like "obj.methodName", extract just "methodName"
        let methodName = methodCall.name;
        if (methodCall.chainNodes && methodCall.chainNodes.length > 0) {
          // For chained calls, the method name is the last node in chainNodes
          const lastNode =
            methodCall.chainNodes[methodCall.chainNodes.length - 1];
          if (lastNode && lastNode.name) {
            methodName = lastNode.name;
          } else if (methodName.includes('.')) {
            // Fallback: extract part after last dot
            methodName = methodName.substring(methodName.lastIndexOf('.') + 1);
          }
        } else if (methodName.includes('.')) {
          // Not chained but has dot (shouldn't happen, but handle it)
          methodName = methodName.substring(methodName.lastIndexOf('.') + 1);
        }

        const callLocation = methodCall.location;
        const callLine =
          callLocation.identifierRange?.startLine ??
          callLocation.symbolRange?.startLine ??
          0;
        // Dedupe: same logical call can produce multiple refs (e.g. chain nodes)
        const callColumn =
          callLocation.identifierRange?.startColumn ??
          callLocation.symbolRange?.startColumn ??
          0;
        const callKey = `${callLine}:${callColumn}:${methodName}`;
        if (processedCalls.has(callKey)) continue;
        processedCalls.add(callKey);

        // Determine if this call is in a static context
        // Prefer isStatic from enrichment (set when qualifier resolves to a type)
        let isStaticCall = methodCall.isStatic ?? false;
        if (!isStaticCall && callLocation) {
          // Find the containing method by checking which method contains this call location
          const callLine =
            callLocation.identifierRange?.startLine ??
            callLocation.symbolRange.startLine;

          // Find the class block (methods have parentId pointing to class block, not class symbol)
          const classBlock = allSymbols.find(
            (s) =>
              isBlockSymbol(s) &&
              s.scopeType === 'class' &&
              s.parentId === containingClass.id,
          );

          // Find methods in the containing class
          // Methods can have parentId pointing to either the class block or the class symbol
          const allMethodsInClass = allSymbols.filter(
            (s): s is MethodSymbol =>
              isMethodSymbol(s) &&
              (s.parentId === classBlock?.id ||
                s.parentId === containingClass.id),
          );

          const containingMethods = allMethodsInClass.filter((s) => {
            if (!s.location) return false;
            const methodStartLine =
              s.location.identifierRange?.startLine ??
              s.location.symbolRange.startLine;
            const methodEndLine =
              s.location.identifierRange?.endLine ??
              s.location.symbolRange.endLine;

            // If endLine equals startLine or is undefined, the method location only covers the declaration
            // In this case, check if callLine is >= startLine and there's no other method
            // between startLine and callLine
            if (!methodEndLine || methodEndLine === methodStartLine) {
              // Check if call is on or after method declaration
              if (callLine < methodStartLine) return false;

              // Check if there's another method that starts between this method and the call
              // If so, that method is more likely to contain the call
              const hasMethodBetween = allMethodsInClass.some((otherMethod) => {
                if (otherMethod.id === s.id) return false;
                const otherStartLine =
                  otherMethod.location?.identifierRange?.startLine ??
                  otherMethod.location?.symbolRange.startLine;
                return (
                  otherStartLine > methodStartLine && otherStartLine <= callLine
                );
              });

              // If no method between, assume this method contains the call
              return !hasMethodBetween;
            }

            // Method contains call if callLine is between start and end (inclusive)
            return callLine >= methodStartLine && callLine <= methodEndLine;
          });

          // Find the most specific method (smallest range that contains the call)
          if (containingMethods.length > 0) {
            // Sort by start line (most specific first)
            containingMethods.sort((a, b) => {
              const aStart =
                a.location.identifierRange?.startLine ??
                a.location.symbolRange.startLine;
              const bStart =
                b.location.identifierRange?.startLine ??
                b.location.symbolRange.startLine;
              return bStart - aStart; // Later start = more specific
            });

            const containingMethod = containingMethods[0];
            isStaticCall = containingMethod.modifiers?.isStatic ?? false;
          }
        }

        // Determine the target class for this method call
        let targetClass: TypeSymbol = containingClass;
        let receiverType: string | null = null;
        let receiverAsVariable: VariableSymbol | undefined = undefined;

        // Check if this is a qualified call (obj.method()) and resolve the receiver's type
        // If isStatic was set during enrichment, use it; otherwise fall back to detection
        if (methodCall.location) {
          receiverType = yield* resolveMethodCallReceiverType(
            methodCall,
            symbolTable,
            symbolManager,
            options.tier,
          );

          // Qualified call with unresolvable receiver - skip rather than validating against containing class
          // Detected by: chainNodes present, or dotted name (obj.method), or source fallback found receiver
          const isQualified =
            (methodCall.chainNodes?.length ?? 0) > 0 ||
            (methodCall.name?.includes('.') ?? false);
          if (isQualified && !receiverType) {
            continue;
          }

          if (receiverType) {
            const qualifierNode = methodCall.chainNodes?.[0];
            let receiverName =
              qualifierNode?.name ??
              (methodCall.name?.includes('.')
                ? methodCall.name.split('.')[0]
                : null);
            // Prefer variable over type: if receiver name matches a variable in scope, treat as instance call.
            // Enrichment may resolve "map" to Map type (e.g. for System.Map), but a local variable "map"
            // should take precedence for map.put().
            if (receiverName) {
              const rcvName = receiverName;
              const callLocation = methodCall.location;
              const startScope = getContainingScopeForLocation(
                symbolTable,
                callLocation,
              );
              let found = symbolTable.lookup(rcvName, startScope ?? null);
              const isVarFieldParam =
                found &&
                (found.kind === SymbolKind.Variable ||
                  found.kind === SymbolKind.Field ||
                  found.kind === SymbolKind.Parameter);
              if (isVarFieldParam) {
                receiverAsVariable = found as VariableSymbol;
              } else {
                const allSymbols = symbolTable.getAllSymbols();
                const currentFileUri = symbolTable.getFileUri();
                receiverAsVariable = (allSymbols.find(
                  (s) =>
                    (s.kind === SymbolKind.Variable ||
                      s.kind === SymbolKind.Field ||
                      s.kind === SymbolKind.Parameter) &&
                    s.name.toLowerCase() === rcvName.toLowerCase() &&
                    (!currentFileUri || s.fileUri === currentFileUri),
                ) ??
                  allSymbols.find(
                    (s) =>
                      (s.kind === SymbolKind.Variable ||
                        s.kind === SymbolKind.Field ||
                        s.kind === SymbolKind.Parameter) &&
                      s.name.toLowerCase() === rcvName.toLowerCase(),
                  )) as VariableSymbol | undefined;
              }
            }

            if (receiverAsVariable) {
              // Receiver is a variable = instance call
              if (!qualifierNode?.semanticContext?.indexedAccess) {
                receiverType =
                  receiverAsVariable.type?.originalTypeString ||
                  receiverAsVariable.type?.name ||
                  receiverType;
              }
              const baseType = extractBaseTypeForResolution(receiverType);
              const compilationContext: CompilationContext = {
                namespace: options.namespace
                  ? Namespaces.create(options.namespace)
                  : null,
                version: options.apiVersion ?? DEFAULT_SALESFORCE_API_VERSION,
                isTrusted: true,
                sourceType: 'FILE',
                referencingType: containingClass,
                enclosingTypes: [],
                parentTypes: [],
                isStaticContext: isStaticCall,
                currentSymbolTable: symbolTable,
              };
              const resolutionResult = yield* Effect.promise(() =>
                resolveTypeName(
                  [baseType],
                  compilationContext,
                  ReferenceTypeEnum.METHOD,
                  IdentifierContext.NONE,
                  symbolManager,
                ),
              );
              if (
                resolutionResult.isResolved &&
                isClassOrInterfaceSymbol(resolutionResult.symbol)
              ) {
                targetClass = resolutionResult.symbol;
                isStaticCall = false;
              }
            } else {
              // No variable found - use pre-resolved symbol from enrichment (e.g. System.debug)
              const preResolvedSymbol = qualifierNode?.resolvedSymbolId
                ? yield* Effect.promise(() =>
                    symbolManager.getSymbol(qualifierNode.resolvedSymbolId!),
                  )
                : null;
              if (
                preResolvedSymbol &&
                isClassOrInterfaceSymbol(preResolvedSymbol)
              ) {
                targetClass = preResolvedSymbol;
                if (!receiverType.includes('.') && options.namespace) {
                  const preResolvedNamespace =
                    typeof preResolvedSymbol.namespace === 'string'
                      ? preResolvedSymbol.namespace
                      : (preResolvedSymbol.namespace?.toString?.() ?? '');
                  if (isPrimaryImplicitNamespace(preResolvedNamespace)) {
                    const compilationContext: CompilationContext = {
                      namespace: Namespaces.create(options.namespace),
                      version:
                        options.apiVersion ?? DEFAULT_SALESFORCE_API_VERSION,
                      isTrusted: true,
                      sourceType: 'FILE',
                      referencingType: containingClass,
                      enclosingTypes: [],
                      parentTypes: [],
                      isStaticContext: true,
                      currentSymbolTable: symbolTable,
                    };
                    const baseType = extractBaseTypeForResolution(receiverType);
                    const namespacedResult = yield* Effect.promise(() =>
                      resolveTypeName(
                        [baseType],
                        compilationContext,
                        ReferenceTypeEnum.METHOD,
                        IdentifierContext.NONE,
                        symbolManager as unknown as SymbolProvider,
                      ),
                    );
                    if (
                      namespacedResult.isResolved &&
                      isClassOrInterfaceSymbol(namespacedResult.symbol)
                    ) {
                      targetClass = namespacedResult.symbol;
                    }
                  }
                }
                if (methodCall.isStatic === undefined) {
                  isStaticCall = true;
                }
              } else {
                // Receiver is not a variable - resolve as type (static call candidate).
                // Do this even when enrichment set isStatic=false, because that flag
                // can be stale for qualified static calls like Test.foo().
                const compilationContext: CompilationContext = {
                  namespace: options.namespace
                    ? Namespaces.create(options.namespace)
                    : null,
                  version: options.apiVersion ?? DEFAULT_SALESFORCE_API_VERSION,
                  isTrusted: true,
                  sourceType: 'FILE',
                  referencingType: containingClass,
                  enclosingTypes: [],
                  parentTypes: [],
                  isStaticContext: isStaticCall,
                  currentSymbolTable: symbolTable,
                };
                const baseType = extractBaseTypeForResolution(receiverType);
                const resolutionResult = yield* Effect.promise(() =>
                  resolveTypeName(
                    [baseType],
                    compilationContext,
                    ReferenceTypeEnum.METHOD,
                    IdentifierContext.NONE,
                    symbolManager,
                  ),
                );
                if (
                  resolutionResult.isResolved &&
                  isClassOrInterfaceSymbol(resolutionResult.symbol)
                ) {
                  targetClass = resolutionResult.symbol;
                  isStaticCall = true;
                } else {
                  continue;
                }
              }
            }
          }
        }

        // Find all methods with this name in the target class hierarchy
        const candidateMethods = yield* findMethodsInHierarchy(
          symbolManager,
          targetClass,
          methodName,
          allSymbols,
        );

        if (candidateMethods.length === 0) {
          // Multi-hop chain calls (e.g. result.records.size()) have intermediate field
          // accesses that we can't resolve without full chain traversal. Only the first
          // chain node's type is resolved; intermediate fields are skipped. Give benefit
          // of the doubt — skip the error rather than report a false positive.
          if ((methodCall.chainNodes?.length ?? 0) > 1) {
            continue;
          }
          // Method not found
          errors.push({
            message: localizeTyped(
              ErrorCodes.INVALID_METHOD_NOT_FOUND,
              methodName,
              targetClass.name,
            ),
            location: callLocation,
            code: ErrorCodes.INVALID_METHOD_NOT_FOUND,
          });
          continue;
        }

        // Filter methods by visibility and static/instance context
        const visibilityResults = yield* Effect.promise(() =>
          Promise.all(
            candidateMethods.map((method) =>
              isMethodVisible(
                method,
                containingClass,
                isStaticCall,
                symbolManager,
                allSymbols,
              ),
            ),
          ),
        );
        const visibleMethods = candidateMethods.filter(
          (_, i) => visibilityResults[i],
        );

        if (visibleMethods.length === 0) {
          // No visible methods found
          errors.push({
            message: localizeTyped(ErrorCodes.METHOD_NOT_VISIBLE, methodName),
            location: callLocation,
            code: ErrorCodes.METHOD_NOT_VISIBLE,
          });
          continue;
        }

        // Check for ambiguous method calls
        // If multiple methods match by name and parameter count, it's ambiguous
        // For now, we check if there are multiple methods with the same parameter count
        // TODO: Enhance with actual parameter type matching when we have parameter info
        const methodsByParamCount = new Map<number, MethodSymbol[]>();
        for (const method of visibleMethods) {
          const paramCount = method.parameters?.length ?? 0;
          if (!methodsByParamCount.has(paramCount)) {
            methodsByParamCount.set(paramCount, []);
          }
          methodsByParamCount.get(paramCount)!.push(method);
        }

        // Check for ambiguous calls (multiple methods with same parameter count)
        for (const methods of methodsByParamCount.values()) {
          if (methods.length > 1) {
            // Multiple methods with same parameter count - potential ambiguity
            // TODO: This is a simplified check. Full ambiguity detection requires
            // parameter type matching which needs source parsing or parameter references
            // For now, we'll only report if all methods have identical signatures
            const signatures = new Set<string>();
            for (const method of methods) {
              const sig = getMethodSignatureString(method);
              signatures.add(sig);
            }
            if (signatures.size === 1) {
              // All methods have identical signatures - this is actually not ambiguous
              // (likely overridden methods)
              continue;
            }
            // Multiple distinct signatures with same parameter count - ambiguous
            errors.push({
              message: localizeTyped(
                ErrorCodes.AMBIGUOUS_METHOD_SIGNATURE,
                methodName,
              ),
              location: callLocation,
              code: ErrorCodes.AMBIGUOUS_METHOD_SIGNATURE,
            });
            break;
          }
        }

        // TIER 2: Match parameter types (enhanced validation)
        if (visibleMethods.length > 0) {
          const argTypes = resolveMethodCallArgumentTypes(
            methodCall,
            symbolTable,
          );

          if (argTypes !== undefined && argTypes.length > 0) {
            // Extract generic type arguments from receiver type if this is an instance call
            // e.g., List<Coordinates> -> Coordinates
            // Map<String, Integer> -> K=String, V=Integer
            // Get generic type arguments from TypeInfo.typeParameters if available
            let genericTypeArguments: Map<string, string> | null = null;
            if (!isStaticCall && receiverAsVariable?.type) {
              genericTypeArguments = createGenericTypeSubstitutionMap(
                receiverAsVariable.type,
              );
            }

            // Find methods that match both parameter count and types
            const matchingMethods = visibleMethods.filter((method) => {
              if (
                !method.parameters ||
                method.parameters.length !== argTypes.length
              ) {
                return false;
              }

              // Compare each parameter type with argument type (with assignability)
              for (let i = 0; i < method.parameters.length; i++) {
                let paramType = method.parameters[i]?.type?.name?.toLowerCase();
                const argType = argTypes[i]?.toLowerCase();

                // If parameter type is a generic type parameter (single uppercase letter like T, K, V)
                // and we have generic type arguments from the receiver, resolve them
                if (
                  genericTypeArguments &&
                  paramType &&
                  genericTypeArguments.size > 0
                ) {
                  const originalParamType = method.parameters[i]?.type?.name;
                  const resolvedType = substituteTypeName(
                    originalParamType,
                    genericTypeArguments,
                  );
                  if (resolvedType) {
                    paramType = resolvedType.toLowerCase();
                  }
                }

                const assignable = isAssignable(
                  argType ?? '',
                  paramType ?? '',
                  'method-parameter',
                  { allSymbols },
                );

                if (!assignable) {
                  return false;
                }
              }
              return true;
            });

            // If no methods match types but we have some type information, report error
            if (
              matchingMethods.length === 0 &&
              argTypes.some((t) => t !== 'Object')
            ) {
              // Use the overload with matching param count for the error message
              const methodWithSameParamCount = visibleMethods.find(
                (m) => (m.parameters?.length ?? 0) === argTypes.length,
              );
              const paramTypes =
                (methodWithSameParamCount ?? visibleMethods[0])?.parameters
                  ?.map((p) => p.type?.name || 'Object')
                  .join(', ') || '';
              errors.push({
                message: localizeTyped(
                  ErrorCodes.METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE,
                  methodName,
                  paramTypes,
                ),
                location: callLocation,
                code: ErrorCodes.METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE,
              });
            }
          }
        }

        validateMethodReturnType(
          methodCall,
          visibleMethods,
          symbolTable,
          allSymbols,
          errors,
        );
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};

/**
 * Find the innermost scope (block) that contains the given location.
 * Used for scope-aware variable lookup (method-local variables).
 */
function getContainingScopeForLocation(
  symbolTable: SymbolTable,
  location: {
    symbolRange?: { startLine?: number };
    identifierRange?: { startLine?: number; startColumn?: number };
  },
): ScopeSymbol | null {
  if (!location) return null;
  const line =
    location.identifierRange?.startLine ?? location.symbolRange?.startLine ?? 0;
  const allSymbols = symbolTable.getAllSymbols();
  const blocks = allSymbols.filter(
    (s): s is ScopeSymbol => isBlockSymbol(s) && !!s.location,
  );
  let best: ScopeSymbol | null = null;
  for (const block of blocks) {
    const r = block.location?.identifierRange;
    if (!r?.startLine || !r?.endLine) continue;
    if (line >= r.startLine && line <= r.endLine) {
      const extent = r.endLine - r.startLine;
      const bestExtent = best
        ? (best.location?.identifierRange?.endLine ?? 0) -
          (best.location?.identifierRange?.startLine ?? 0)
        : Infinity;
      if (!best || extent < bestExtent) best = block;
    }
  }
  return best;
}

const referenceRangeKey = (reference: SymbolReference): string => {
  const range = reference.location.identifierRange;
  return `${range.startLine}:${range.startColumn}:${range.endLine}:${range.endColumn}`;
};

/**
 * Re-associate flattened method-call references with the parser-owned chain
 * node that has the same identifier range. Layered collection exposes chain
 * nodes through getAllReferences(), so a nested call such as `f.getB().x`
 * otherwise also appears as a bare `getB()` call and loses its receiver.
 */
function normalizeMethodCallReferences(
  allReferences: SymbolReference[],
): SymbolReference[] {
  const chainCalls = new Map<string, SymbolReference>();

  for (const owner of allReferences) {
    const nodes = owner.chainNodes;
    if (!nodes || nodes.length === 0) continue;

    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index];
      if (node.context !== ReferenceContext.METHOD_CALL) continue;
      const prefix = nodes.slice(0, index + 1);
      chainCalls.set(referenceRangeKey(node), {
        ...node,
        name: prefix.map((part) => part.name).join('.'),
        chainNodes: prefix,
        resolvedSymbolId: node.resolvedSymbolId ?? owner.resolvedSymbolId,
      });
    }
  }

  const normalized = new Map<string, SymbolReference>();
  for (const reference of allReferences) {
    if (reference.context !== ReferenceContext.METHOD_CALL) continue;
    const chainReference =
      reference.chainNodes && reference.chainNodes.length > 0
        ? reference
        : chainCalls.get(referenceRangeKey(reference));
    const candidate = chainReference ?? reference;
    const key = `${referenceRangeKey(candidate)}:${candidate.name.toLowerCase()}`;
    const existing = normalized.get(key);
    if (!existing || (candidate.chainNodes?.length ?? 0) > 0) {
      normalized.set(key, candidate);
    }
  }
  return [...normalized.values()];
}

/**
 * Resolve the type of the receiver for a qualified method call (e.g., obj.method())
 * Returns the type name if found, null otherwise
 */
function resolveMethodCallReceiverType(
  methodCall: SymbolReference,
  symbolTable: SymbolTable,
  symbolManager?: ISymbolManagerInterface,
  tier?: ValidationTier,
): Effect.Effect<string | null, never, never> {
  return Effect.gen(function* () {
    const indexedReceiver =
      methodCall.chainNodes?.[0]?.semanticContext?.indexedAccess;
    const receiverTypeName = (variable: VariableSymbol): string | null => {
      const type = indexedReceiver
        ? indexedAccessResultType(variable.type)
        : variable.type;
      return type?.name ?? null;
    };
    // For chained calls, extract receiver from base (name part before first dot)
    // e.g. "System.debug" -> receiver "System", "f.getB" -> receiver "f"
    if (methodCall.chainNodes && methodCall.chainNodes.length > 0) {
      const receiverName = methodCall.name?.includes('.')
        ? methodCall.name.split('.')[0]
        : methodCall.chainNodes[0]?.name;
      if (receiverName) {
        // Resolve the receiver's type
        // Try scope-aware lookup first (method-local variables), then same-file flat search
        const callLocation = methodCall.location;
        const startScope = getContainingScopeForLocation(
          symbolTable,
          callLocation,
        );
        let receiverSymbol = symbolTable.lookup(
          receiverName,
          startScope ?? null,
        );
        if (!receiverSymbol) {
          const allSymbols = symbolTable.getAllSymbols();
          const currentFileUri = symbolTable.getFileUri();
          receiverSymbol =
            allSymbols.find(
              (s) =>
                (s.kind === SymbolKind.Variable ||
                  s.kind === SymbolKind.Parameter ||
                  s.kind === SymbolKind.Field) &&
                s.name.toLowerCase() === receiverName.toLowerCase() &&
                s.fileUri === currentFileUri,
            ) ??
            allSymbols.find(
              (s) =>
                (s.kind === SymbolKind.Variable ||
                  s.kind === SymbolKind.Parameter ||
                  s.kind === SymbolKind.Field) &&
                s.name.toLowerCase() === receiverName.toLowerCase(),
            );
        }

        if (
          receiverSymbol &&
          (receiverSymbol.kind === SymbolKind.Variable ||
            receiverSymbol.kind === SymbolKind.Parameter ||
            receiverSymbol.kind === SymbolKind.Field)
        ) {
          const varSymbol = receiverSymbol as VariableSymbol;
          const typeName = receiverTypeName(varSymbol);
          if (typeName) return typeName;
        }

        // TIER 2: Cross-file resolution
        if (tier === ValidationTier.THOROUGH && symbolManager) {
          const symbolsByName = yield* Effect.promise(() =>
            symbolManager.findSymbolByName(receiverName),
          );
          const currentFileUri = symbolTable.getFileUri();
          // First try same-file match
          let foundVariable = symbolsByName.find(
            (s) =>
              (s.kind === SymbolKind.Variable ||
                s.kind === SymbolKind.Parameter ||
                s.kind === SymbolKind.Field) &&
              s.fileUri === currentFileUri,
          );
          // If not found in same file, try cross-file
          if (!foundVariable) {
            foundVariable = symbolsByName.find(
              (s) =>
                s.kind === SymbolKind.Variable ||
                s.kind === SymbolKind.Parameter ||
                s.kind === SymbolKind.Field,
            );
          }
          if (foundVariable) {
            const varSymbol = foundVariable as VariableSymbol;
            const typeName = receiverTypeName(varSymbol);
            if (typeName) return typeName;
          }

          // Defer to symbol manager for built-in/standard type check
          if (receiverName) {
            const isStdLib = yield* Effect.promise(() =>
              symbolManager.isStandardLibraryType(receiverName),
            );
            if (isStdLib) {
              return receiverName;
            }
          }

          // Try class/interface lookup (e.g. for System from stdlib)
          const foundClass = symbolsByName.find(
            (s) =>
              isClassOrInterfaceSymbol(s) &&
              s.name?.toLowerCase() === receiverName.toLowerCase(),
          );
          if (foundClass) {
            return foundClass.name ?? receiverName;
          }
        }

        return null;
      }
    }

    return null;
  });
}

/**
 * Find all methods with a given name in a class hierarchy (including superclasses)
 */
function findMethodsInHierarchy(
  symbolManager: ISymbolManagerInterface,
  classSymbol: TypeSymbol,
  methodName: string,
  allSymbols: ApexSymbol[],
): Effect.Effect<MethodSymbol[], never, never> {
  return Effect.gen(function* () {
    const methods: MethodSymbol[] = [];

    // Use symbols from the class's file for cross-file resolution
    // allSymbols may only contain current file; class may be in a different file
    const symbolsForClass =
      classSymbol.fileUri &&
      !allSymbols.some((s) => s.fileUri === classSymbol.fileUri)
        ? yield* Effect.promise(() =>
            symbolManager.findSymbolsInFile(classSymbol.fileUri),
          )
        : allSymbols;

    // Find methods in the current class
    const classMethods = yield* Effect.promise(() =>
      findMethodsInClass(classSymbol, symbolsForClass, symbolManager),
    );
    const matchingMethods = classMethods.filter((m) => m.name === methodName);
    methods.push(...matchingMethods);

    // If there's a superclass, find methods there too
    if (classSymbol.superClass) {
      const superClassMethods = yield* findMethodsInSuperclass(
        symbolManager,
        classSymbol.superClass,
        methodName,
      );
      methods.push(...superClassMethods);
    }

    return methods;
  });
}

/**
 * Check if a method is visible from the calling context
 */
async function isMethodVisible(
  method: MethodSymbol,
  callingClass: TypeSymbol,
  isStaticContext: boolean,
  symbolManager: ISymbolManagerInterface,
  allSymbols: ApexSymbol[],
): Promise<boolean> {
  const visibility = method.modifiers?.visibility ?? SymbolVisibility.Default;
  const isStaticMethod = method.modifiers?.isStatic ?? false;

  // Check static context restrictions
  if (isStaticMethod && !isStaticContext) {
    return false; // Static method called in instance context
  }

  // Public, Global methods are always visible
  if (
    visibility === SymbolVisibility.Public ||
    visibility === SymbolVisibility.Global
  ) {
    return true;
  }

  // Find the declaring class for this method
  const declaringClass = await findDeclaringClass(
    method,
    allSymbols,
    symbolManager,
  );
  if (!declaringClass) {
    // Can't determine declaring class - assume visible (conservative)
    return true;
  }

  // Private/Default methods are only visible within the same class.
  // Per Apex doc: if no modifier specified, it is private.
  if (
    visibility === SymbolVisibility.Private ||
    visibility === SymbolVisibility.Default
  ) {
    if (declaringClass.id === callingClass.id) return true;
    // @TestVisible allows test classes to access private/protected members
    if (
      AnnotationUtils.hasAnnotation(method, 'TestVisible') &&
      (await isInTestContext(callingClass, allSymbols, symbolManager))
    ) {
      return true;
    }
    return false;
  }

  // Protected methods are visible to subclasses and inner classes (per Apex doc)
  if (visibility === SymbolVisibility.Protected) {
    // Check if calling class is the same or a subclass of declaring class
    if (declaringClass.id === callingClass.id) {
      return true;
    }

    // Check if calling class extends declaring class
    if (
      await isSubclassOf(
        callingClass,
        declaringClass,
        symbolManager,
        allSymbols,
      )
    ) {
      return true;
    }

    // Check if calling class is an inner class whose enclosing class is the declaring class
    const enclosingClass = await getEnclosingClass(
      callingClass,
      allSymbols,
      symbolManager,
    );
    if (enclosingClass && enclosingClass.id === declaringClass.id) {
      return true;
    }

    // @TestVisible allows test classes to access private/protected members
    if (
      AnnotationUtils.hasAnnotation(method, 'TestVisible') &&
      (await isInTestContext(callingClass, allSymbols, symbolManager))
    ) {
      return true;
    }

    return false;
  }

  // Unknown visibility - assume visible (conservative)
  return true;
}

/**
 * Find the declaring class for a method
 */
async function findDeclaringClass(
  method: MethodSymbol,
  allSymbols: ApexSymbol[],
  symbolManager: ISymbolManagerInterface,
): Promise<TypeSymbol | null> {
  const resolveParent = async (id: string): Promise<ApexSymbol | null> =>
    allSymbols.find((s) => s.id === id) ??
    (await symbolManager.getSymbol(id)) ??
    null;

  let current: ApexSymbol | null = method;
  while (current) {
    if (isClassOrInterfaceSymbol(current)) {
      return current;
    }
    if (current.parentId) {
      const parent = await resolveParent(current.parentId);
      if (isClassOrInterfaceSymbol(parent)) {
        return parent;
      }
      // If parent is a block, check its parent
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
    const superClassSymbol = superClassSymbols.find(
      (s: ApexSymbol): s is TypeSymbol => isClassOrInterfaceSymbol(s),
    );

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

/**
 * Get a string representation of a method signature for comparison
 */
function getMethodSignatureString(method: MethodSymbol): string {
  const params = method.parameters || [];
  const paramTypes = params.map((p) => {
    const typeName = p.type?.name || p.type?.originalTypeString || 'Object';
    return typeName.toLowerCase();
  });
  return `${method.name.toLowerCase()}(${paramTypes.join(',')})`;
}

/**
 * Find all methods in a class (supports cross-file resolution)
 */
async function findMethodsInClass(
  classSymbol: TypeSymbol,
  allSymbols: ApexSymbol[],
  symbolManager: ISymbolManagerInterface,
): Promise<MethodSymbol[]> {
  const methods: MethodSymbol[] = [];
  const methodsAdded = new Set<MethodSymbol>(); // By reference to allow overloads (same id, different params)

  // Find all methods in the same file as the class
  // If classSymbol.fileUri is not set, try to find it from the class symbol itself
  const targetFileUri = classSymbol.fileUri;
  if (!targetFileUri) {
    // If fileUri is not set, we can't reliably match methods
    return methods;
  }

  // First, try to get methods from allSymbols (same-file or already loaded)
  let methodsInFile = allSymbols.filter(
    (s) => isMethodSymbol(s) && s.fileUri === targetFileUri,
  ) as MethodSymbol[];

  // If no methods found and this is a standard library class, try to get methods from symbol manager
  if (
    methodsInFile.length === 0 &&
    symbolManager &&
    targetFileUri?.startsWith('apexlib://')
  ) {
    // For standard library classes, get all symbols from the file using findSymbolsInFile
    const fileSymbols = await symbolManager.findSymbolsInFile(targetFileUri);

    methodsInFile = fileSymbols.filter((s: ApexSymbol) =>
      isMethodSymbol(s),
    ) as MethodSymbol[];
  }

  // For each method, find its declaring class by traversing parentId relationships
  for (const method of methodsInFile) {
    if (methodsAdded.has(method)) {
      continue; // Already added (same symbol instance)
    }

    let declaringClass: TypeSymbol | null = null;
    let current: ApexSymbol | null = method;
    const visited = new Set<string>();

    // Traverse up the parentId chain to find the declaring class
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      if (isClassOrInterfaceSymbol(current)) {
        declaringClass = current;
        break;
      }
      if (current.parentId) {
        const parentId: string = current.parentId;
        // First try to find parent in allSymbols
        current = allSymbols.find((s) => s.id === parentId) || null;
        // If not found and we have symbolManager, try to get it from symbol manager
        if (!current && symbolManager) {
          const parentSymbol = await symbolManager.getSymbol(parentId);
          if (parentSymbol) {
            current = parentSymbol;
          } else {
            break;
          }
        } else if (!current) {
          break;
        }
      } else {
        break;
      }
    }

    // Match by class name and fileUri (don't require id match for cross-file)
    if (
      declaringClass &&
      declaringClass.name === classSymbol.name &&
      declaringClass.fileUri === classSymbol.fileUri
    ) {
      methods.push(method);
      methodsAdded.add(method);
    } else if (method.parentId === classSymbol.id) {
      // Direct parentId match (same-file case)
      methods.push(method);
      methodsAdded.add(method);
    } else {
      // Check if parentId points to a class block that belongs to this class
      let parentBlock = allSymbols.find((s) => s.id === method.parentId);
      // If not found in allSymbols and we have symbolManager, try to get it from symbol manager
      if (!parentBlock && symbolManager && method.parentId) {
        const parentSymbol = await symbolManager.getSymbol(method.parentId);
        if (parentSymbol && isBlockSymbol(parentSymbol)) {
          parentBlock = parentSymbol;
        }
      }

      if (parentBlock && isBlockSymbol(parentBlock)) {
        // Check if the block's parent is a class with matching name and fileUri
        let blockParent = allSymbols.find(
          (s) => s.id === parentBlock!.parentId,
        );
        // If not found in allSymbols and we have symbolManager, try to get it from symbol manager
        if (!blockParent && symbolManager && parentBlock.parentId) {
          const parentSymbol = await symbolManager.getSymbol(
            parentBlock.parentId,
          );
          if (isClassOrInterfaceSymbol(parentSymbol)) {
            blockParent = parentSymbol;
          }
        }

        if (
          isClassOrInterfaceSymbol(blockParent) &&
          blockParent.name === classSymbol.name &&
          blockParent.fileUri === classSymbol.fileUri
        ) {
          methods.push(method);
          methodsAdded.add(method);
        } else if (parentBlock.parentId === classSymbol.id) {
          // Direct parentId match
          methods.push(method);
          methodsAdded.add(method);
        }
      }
    }
  }

  return methods;
}

/** Resolve call arguments exclusively from parser-classified facts and lexical symbols. */
function resolveMethodCallArgumentTypes(
  methodCall: SymbolReference,
  symbolTable: SymbolTable,
): string[] | undefined {
  if (methodCall.argumentTypes) {
    return methodCall.argumentTypes;
  }
  if (!methodCall.argumentSemantics) {
    return undefined;
  }

  const position = {
    line: methodCall.location.identifierRange.startLine,
    character: methodCall.location.identifierRange.startColumn,
  };
  const scopeHierarchy = symbolTable.getScopeHierarchy(position);
  const innermostScope =
    scopeHierarchy.length > 0
      ? scopeHierarchy[scopeHierarchy.length - 1]
      : null;

  return resolveArgumentSemantics(
    methodCall.argumentSemantics,
    (identifier): string | undefined => {
      const symbol = symbolTable.lookupInScopeChain(identifier, innermostScope);
      if (
        symbol &&
        (symbol.kind === SymbolKind.Variable ||
          symbol.kind === SymbolKind.Parameter ||
          symbol.kind === SymbolKind.Field)
      ) {
        const variable = symbol as VariableSymbol;
        return variable.type?.originalTypeString ?? variable.type?.name;
      }
      return undefined;
    },
  );
}

/** Validate a call result only when its parser-owned target type is available. */
function validateMethodReturnType(
  methodCall: SymbolReference,
  visibleMethods: MethodSymbol[],
  symbolTable: SymbolTable,
  allSymbols: ApexSymbol[],
  errors: ValidationErrorInfo[],
): void {
  const resultTarget = methodCall.semanticContext?.invocation?.resultTarget;
  if (!resultTarget) return;

  let expectedType = resultTarget.expectedType;
  let expectedTypeShape = resultTarget.expectedTypeShape;
  if (!expectedType && resultTarget.targetIdentifier) {
    const position = {
      line: resultTarget.targetRange.startLine,
      character: resultTarget.targetRange.startColumn,
    };
    const scopes = symbolTable.getScopeHierarchy(position);
    const scope = scopes.length > 0 ? scopes[scopes.length - 1] : null;
    const target = symbolTable.lookupInScopeChain(
      resultTarget.targetIdentifier,
      scope,
    );
    if (
      target &&
      (target.kind === SymbolKind.Variable ||
        target.kind === SymbolKind.Parameter ||
        target.kind === SymbolKind.Field)
    ) {
      const variable = target as VariableSymbol;
      expectedTypeShape = variable.type;
      expectedType =
        variable.type?.originalTypeString ?? variable.type?.name ?? undefined;
    }
  }
  if (!expectedType) return;

  const methodName =
    methodCall.chainNodes?.[methodCall.chainNodes.length - 1]?.name ??
    methodCall.name;
  const selectedMethod =
    visibleMethods.find(
      (method) =>
        method.id === methodCall.resolvedSymbolId ||
        method.name.toLowerCase() === methodName.toLowerCase(),
    ) ?? visibleMethods[0];
  const returnType =
    selectedMethod?.returnType?.originalTypeString ??
    selectedMethod?.returnType?.name;
  if (!selectedMethod || !returnType) return;

  const assignable = expectedTypeShape
    ? areTypeInfosAssignable(
        selectedMethod.returnType,
        expectedTypeShape,
        allSymbols,
      )
    : isAssignable(returnType, expectedType, 'assignment', { allSymbols });
  if (!assignable) {
    errors.push({
      message: localizeTyped(
        ErrorCodes.METHOD_DOES_NOT_SUPPORT_RETURN_TYPE,
        selectedMethod.name,
        expectedType,
      ),
      location: methodCall.location,
      code: ErrorCodes.METHOD_DOES_NOT_SUPPORT_RETURN_TYPE,
    });
  }
}

/** Compare parser-built type structure before falling back to scalar rules. */
function areTypeInfosAssignable(
  source: TypeInfo | SemanticTypeShape,
  target: TypeInfo | SemanticTypeShape,
  allSymbols: ApexSymbol[],
): boolean {
  if (source.isArray || target.isArray) {
    if (!source.isArray || !target.isArray) return false;
    const sourceElement = source.typeParameters?.[0];
    const targetElement = target.typeParameters?.[0];
    return !!sourceElement && !!targetElement
      ? areTypeInfosAssignable(sourceElement, targetElement, allSymbols)
      : false;
  }

  if (source.isCollection || target.isCollection) {
    if (!source.isCollection || !target.isCollection) return false;
    if (source.name.toLowerCase() !== target.name.toLowerCase()) return false;

    if (source.name.toLowerCase() === 'map') {
      if (!source.keyType || !target.keyType) return false;
      if (!areTypeInfosAssignable(source.keyType, target.keyType, allSymbols)) {
        return false;
      }
    }

    const sourceParameters = source.typeParameters ?? [];
    const targetParameters = target.typeParameters ?? [];
    if (sourceParameters.length !== targetParameters.length) return false;
    return sourceParameters.every((parameter, index) => {
      const targetParameter = targetParameters[index];
      return (
        !!targetParameter &&
        areTypeInfosAssignable(parameter, targetParameter, allSymbols)
      );
    });
  }

  return isAssignable(source.name, target.name, 'assignment', { allSymbols });
}

/**
 * Find methods in a superclass (cross-file resolution)
 */
function findMethodsInSuperclass(
  symbolManager: ISymbolManagerInterface,
  superClassName: string,
  methodName: string,
): Effect.Effect<MethodSymbol[], never, never> {
  return Effect.gen(function* () {
    const methods: MethodSymbol[] = [];

    // Find the superclass type symbol
    const superClassSymbols = yield* Effect.promise(() =>
      symbolManager.findSymbolByName(superClassName),
    );
    const superClassSymbol = superClassSymbols.find(
      (s: ApexSymbol): s is TypeSymbol => isClassOrInterfaceSymbol(s),
    );

    if (!superClassSymbol) {
      // Superclass not found - might need artifact loading
      return methods;
    }

    // Get symbols from the superclass's file if available
    const allSymbols = superClassSymbol.fileUri
      ? yield* Effect.promise(() =>
          symbolManager.findSymbolsInFile(superClassSymbol.fileUri),
        )
      : [];

    // Find methods in the superclass
    const superClassMethods = yield* Effect.promise(() =>
      findMethodsInClass(superClassSymbol, allSymbols, symbolManager),
    );
    const matchingMethods = superClassMethods.filter(
      (m) => m.name === methodName,
    );
    methods.push(...matchingMethods);

    // Recursively check superclass's superclass
    if (superClassSymbol.superClass) {
      const ancestorMethods = yield* findMethodsInSuperclass(
        symbolManager,
        superClassSymbol.superClass,
        methodName,
      );
      methods.push(...ancestorMethods);
    }

    return methods;
  });
}
