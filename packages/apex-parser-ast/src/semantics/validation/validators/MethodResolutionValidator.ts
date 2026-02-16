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
import { isMethodSymbol, isBlockSymbol } from '../../../utils/symbolNarrowing';
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
  isAssignable,
  isPrimitiveType,
  isNumericType,
} from '../utils/typeAssignability';
import {
  resolveTypeName,
  ReferenceTypeEnum,
  IdentifierContext,
  type CompilationContext,
  type SymbolProvider,
  Namespaces,
} from '../../../namespace/NamespaceUtils';
import { DEFAULT_SALESFORCE_API_VERSION } from '../../../constants/constants';
import {
  extractBaseTypeForResolution,
  extractBaseTypeName,
} from '../utils/typeUtils';

/**
 * Validates method calls for:
 * - Method existence (INVALID_METHOD_NOT_FOUND)
 * - Method visibility (METHOD_NOT_VISIBLE)
 * - Parameter type compatibility (METHOD_DOES_NOT_SUPPORT_PARAMETER_TYPE)
 * - Return type compatibility (METHOD_DOES_NOT_SUPPORT_RETURN_TYPE)
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
      const methodCalls = allReferences.filter(
        (ref) => ref.context === ReferenceContext.METHOD_CALL,
      );

      // Get all symbols from the table
      const allSymbols = symbolTable.getAllSymbols();

      // Find the containing class for context
      const containingClass = allSymbols.find(
        (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
      ) as TypeSymbol | undefined;

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
        const callKey = `${callLine}:${methodName}`;
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
              s.kind === SymbolKind.Block &&
              (s as any).scopeType === 'class' &&
              s.parentId === containingClass.id,
          );

          // Find methods in the containing class
          // Methods can have parentId pointing to either the class block or the class symbol
          const allMethodsInClass = allSymbols.filter(
            (s): s is MethodSymbol =>
              s.kind === SymbolKind.Method &&
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
        if (options.sourceContent && methodCall.location) {
          receiverType = yield* resolveMethodCallReceiverType(
            methodCall,
            options.sourceContent,
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
            // When chainNodes is empty, extract receiver from source (e.g. map.put -> "map")
            if (!receiverName && options.sourceContent) {
              receiverName = extractReceiverNameFromSource(
                methodCall,
                options.sourceContent,
              );
            }

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
              receiverType =
                receiverAsVariable.type?.originalTypeString ||
                receiverAsVariable.type?.name ||
                receiverType;
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
              const resolutionResult = resolveTypeName(
                [baseType],
                compilationContext,
                ReferenceTypeEnum.METHOD,
                IdentifierContext.NONE,
                symbolManager as unknown as SymbolProvider,
              );
              if (
                resolutionResult.isResolved &&
                resolutionResult.symbol &&
                (resolutionResult.symbol.kind === SymbolKind.Class ||
                  resolutionResult.symbol.kind === SymbolKind.Interface)
              ) {
                targetClass = resolutionResult.symbol as TypeSymbol;
                isStaticCall = false;
              }
            } else {
              // No variable found - use pre-resolved symbol from enrichment (e.g. System.debug)
              const preResolvedSymbol =
                qualifierNode?.resolvedSymbolId &&
                symbolManager.getSymbol(qualifierNode.resolvedSymbolId);
              if (
                preResolvedSymbol &&
                (preResolvedSymbol.kind === SymbolKind.Class ||
                  preResolvedSymbol.kind === SymbolKind.Interface)
              ) {
                targetClass = preResolvedSymbol as TypeSymbol;
                if (methodCall.isStatic === undefined) {
                  isStaticCall = true;
                }
              } else if (methodCall.isStatic === undefined) {
                // Receiver is not a variable - try to resolve as type (static call)
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
                const resolutionResult = resolveTypeName(
                  [baseType],
                  compilationContext,
                  ReferenceTypeEnum.METHOD,
                  IdentifierContext.NONE,
                  symbolManager as unknown as SymbolProvider,
                );
                if (
                  resolutionResult.isResolved &&
                  resolutionResult.symbol &&
                  (resolutionResult.symbol.kind === SymbolKind.Class ||
                    resolutionResult.symbol.kind === SymbolKind.Interface)
                ) {
                  targetClass = resolutionResult.symbol as TypeSymbol;
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
        const visibleMethods = candidateMethods.filter((method) =>
          isMethodVisible(
            method,
            containingClass,
            isStaticCall,
            symbolManager,
            allSymbols,
          ),
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
        if (options.sourceContent && visibleMethods.length > 0) {
          const argTypes = yield* extractMethodCallArgumentTypes(
            methodCall,
            options.sourceContent,
            symbolTable,
            symbolManager,
            options.tier,
          );

          if (argTypes.length > 0) {
            // Extract generic type arguments from receiver type if this is an instance call
            // e.g., List<Coordinates> -> Coordinates
            // Map<String, Integer> -> K=String, V=Integer
            // Get generic type arguments from TypeInfo.typeParameters if available
            let genericTypeArguments: Map<string, string> | null = null; // Maps generics (K, V, T) to concrete type
            if (!isStaticCall && receiverAsVariable?.type) {
              const fullReceiverType =
                receiverAsVariable.type.originalTypeString ||
                receiverAsVariable.type.name ||
                receiverType;
              const baseTypeName = fullReceiverType
                ? extractBaseTypeName(fullReceiverType)
                : null;

              // Check if type has typeParameters (for List<T>, Set<T>, Map<K,V>)
              if (
                receiverAsVariable.type.typeParameters &&
                receiverAsVariable.type.typeParameters.length > 0 &&
                baseTypeName
              ) {
                genericTypeArguments = new Map();

                if (baseTypeName === 'map') {
                  // Map<K, V>: keyType = K, typeParameters[0] = V (value type)
                  // Note: TypeInfo stores Map as keyType + typeParameters[0] (value)
                  // Both must be present for Map generic resolution to work
                  const keyTypeName = receiverAsVariable.type.keyType?.name;
                  const valueTypeName =
                    receiverAsVariable.type.typeParameters[0]?.name;
                  if (keyTypeName && valueTypeName) {
                    genericTypeArguments.set('K', keyTypeName);
                    genericTypeArguments.set('V', valueTypeName);
                  }
                } else {
                  // List<T> or Set<T>: typeParameters[0] = T (element type)
                  const firstTypeParam =
                    receiverAsVariable.type.typeParameters[0];
                  if (firstTypeParam?.name) {
                    genericTypeArguments.set('T', firstTypeParam.name);
                  }
                }
              }
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
                  const originalParamType =
                    method.parameters[i]?.type?.name ?? '';
                  if (
                    originalParamType.length === 1 &&
                    originalParamType >= 'A' &&
                    originalParamType <= 'Z'
                  ) {
                    // For Map.put(K key, V value):
                    // - Parameter 0 (K) -> keyType (key type)
                    // - Parameter 1 (V) -> typeParameters[0] (value type)
                    // For List.add(T item) or Set.add(T item):
                    // - Parameter 0 (T) -> typeParameters[0] (element type)
                    const resolvedType =
                      genericTypeArguments.get(originalParamType);
                    if (resolvedType) {
                      paramType = resolvedType.toLowerCase();
                    }
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

        // TIER 2: Check return type compatibility (requires assignment context)
        if (
          options.tier === ValidationTier.THOROUGH &&
          options.sourceContent &&
          visibleMethods.length > 0
        ) {
          yield* validateMethodReturnType(
            methodCall,
            visibleMethods,
            symbolTable,
            options.sourceContent,
            errors,
            symbolManager,
            options.tier,
          );
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

/**
 * Extract receiver name from source when chainNodes is empty (e.g. map.put -> "map").
 * Used when reference structure lacks chainNodes but source has receiver.methodName pattern.
 */
function extractReceiverNameFromSource(
  methodCall: {
    name?: string;
    location?: {
      identifierRange?: { startLine?: number; startColumn?: number };
      symbolRange?: { startLine?: number; startColumn?: number };
    };
  },
  sourceContent: string,
): string | null {
  if (!sourceContent || !methodCall.location || !methodCall.name) return null;
  const startLine =
    methodCall.location.identifierRange?.startLine ??
    methodCall.location.symbolRange?.startLine ??
    0;
  const startColumn =
    methodCall.location.identifierRange?.startColumn ??
    methodCall.location.symbolRange?.startColumn ??
    0;
  const lines = sourceContent.split('\n');
  if (startLine < 1 || startLine > lines.length) return null;
  const line = lines[startLine - 1];
  if (!line) return null;
  const methodNameIndex = line
    .substring(startColumn - 1)
    .toLowerCase()
    .indexOf(methodCall.name.toLowerCase());
  if (methodNameIndex < 0) return null;
  const searchStart = startColumn - 1 + methodNameIndex;
  const beforeMethod = line.substring(0, searchStart);
  const lastDotIndex = beforeMethod.lastIndexOf('.');
  if (lastDotIndex < 0) return null;
  const receiverText = beforeMethod
    .substring(Math.max(0, lastDotIndex - 50), lastDotIndex + 1)
    .trim();
  const receiverMatch = receiverText.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*$/);
  return receiverMatch ? receiverMatch[1] : null;
}

/**
 * Resolve the type of the receiver for a qualified method call (e.g., obj.method())
 * Returns the type name if found, null otherwise
 */
function resolveMethodCallReceiverType(
  methodCall: any,
  sourceContent: string,
  symbolTable: SymbolTable,
  symbolManager?: ISymbolManagerInterface,
  tier?: ValidationTier,
): Effect.Effect<string | null, never, never> {
  return Effect.gen(function* () {
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
          if (varSymbol.type?.name) {
            return varSymbol.type.name;
          }
        }

        // TIER 2: Cross-file resolution
        if (tier === ValidationTier.THOROUGH && symbolManager) {
          const symbolsByName = symbolManager.findSymbolByName(receiverName);
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
            if (varSymbol.type?.name) {
              return varSymbol.type.name;
            }
          }

          // Defer to symbol manager for built-in/standard type check
          if (
            receiverName &&
            symbolManager.isStandardLibraryType(receiverName)
          ) {
            return receiverName;
          }

          // Try class/interface lookup (e.g. for System from stdlib)
          const foundClass = symbolsByName.find(
            (s) =>
              (s.kind === SymbolKind.Class ||
                s.kind === SymbolKind.Interface) &&
              s.name?.toLowerCase() === receiverName.toLowerCase(),
          );
          if (foundClass) {
            return foundClass.name ?? receiverName;
          }
        }

        return null;
      }
    }

    // Fallback: parse from source code for non-chained calls
    if (!sourceContent || !methodCall.location) {
      return null;
    }

    const location = methodCall.location;
    const startLine =
      location.identifierRange?.startLine ?? location.symbolRange.startLine;
    const startColumn =
      location.identifierRange?.startColumn ?? location.symbolRange.startColumn;

    const lines = sourceContent.split('\n');
    if (startLine < 1 || startLine > lines.length) {
      return null;
    }

    const methodCallLine = lines[startLine - 1];
    if (!methodCallLine) {
      return null;
    }

    const methodName = methodCall.name;

    // Find the method name in the line
    const methodNameIndex = methodCallLine
      .substring(startColumn - 1)
      .toLowerCase()
      .indexOf(methodName.toLowerCase());

    if (methodNameIndex < 0) {
      return null;
    }

    // Look backwards from the method name to find the receiver
    // Pattern: receiver.methodName(...)
    const searchStart = startColumn - 1 + methodNameIndex;
    const beforeMethod = methodCallLine.substring(0, searchStart);

    // Find the last dot before the method name
    const lastDotIndex = beforeMethod.lastIndexOf('.');
    if (lastDotIndex < 0) {
      // No dot found - this is an unqualified call (method() or this.method())
      return null;
    }

    // Extract the receiver name (include dot so regex can match "identifier.")
    const receiverText = beforeMethod
      .substring(Math.max(0, lastDotIndex - 50), lastDotIndex + 1)
      .trim();
    // Extract identifier before the dot (handle whitespace)
    const receiverMatch = receiverText.match(
      /([a-zA-Z_][a-zA-Z0-9_]*)\s*\.\s*$/,
    );
    if (!receiverMatch) {
      return null;
    }

    const receiverName = receiverMatch[1];

    // Resolve the receiver's type
    // First try same-file lookup
    const callLocation = methodCall.location;
    const startScope = getContainingScopeForLocation(symbolTable, callLocation);
    let receiverSymbol = symbolTable.lookup(receiverName, startScope ?? null);
    if (!receiverSymbol) {
      const allSymbols = symbolTable.getAllSymbols();
      receiverSymbol = allSymbols.find(
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
      if (varSymbol.type?.name) {
        return varSymbol.type.name;
      }
    }

    // TIER 2: Cross-file resolution
    if (tier === ValidationTier.THOROUGH && symbolManager) {
      const symbolsByName = symbolManager.findSymbolByName(receiverName);
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
        if (varSymbol.type?.name) {
          return varSymbol.type.name;
        }
      }

      // Defer to symbol manager for built-in/standard type check
      if (receiverName && symbolManager?.isStandardLibraryType(receiverName)) {
        return receiverName;
      }

      // Try class/interface lookup
      const foundClass = symbolsByName.find(
        (s) =>
          (s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface) &&
          s.name?.toLowerCase() === receiverName.toLowerCase(),
      );
      if (foundClass) {
        return foundClass.name ?? receiverName;
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
        ? symbolManager.findSymbolsInFile(classSymbol.fileUri)
        : allSymbols;

    // Find methods in the current class
    const classMethods = findMethodsInClass(
      classSymbol,
      symbolsForClass,
      symbolManager,
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
function isMethodVisible(
  method: MethodSymbol,
  callingClass: TypeSymbol,
  isStaticContext: boolean,
  symbolManager: ISymbolManagerInterface,
  allSymbols: ApexSymbol[],
): boolean {
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
  const declaringClass = findDeclaringClass(method, allSymbols, symbolManager);
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
    return declaringClass.id === callingClass.id;
  }

  // Protected methods are visible to subclasses and inner classes (per Apex doc)
  if (visibility === SymbolVisibility.Protected) {
    // Check if calling class is the same or a subclass of declaring class
    if (declaringClass.id === callingClass.id) {
      return true;
    }

    // Check if calling class extends declaring class
    if (isSubclassOf(callingClass, declaringClass, symbolManager, allSymbols)) {
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

    return false;
  }

  // Unknown visibility - assume visible (conservative)
  return true;
}

/**
 * Get the enclosing (outer) class for an inner class, or null if top-level.
 */
function getEnclosingClass(
  typeSymbol: TypeSymbol,
  allSymbols: ApexSymbol[],
  symbolManager: ISymbolManagerInterface,
): TypeSymbol | null {
  if (!typeSymbol.parentId) return null;

  const resolve = (id: string): ApexSymbol | null =>
    allSymbols.find((s) => s.id === id) ?? symbolManager.getSymbol(id) ?? null;

  const parent = resolve(typeSymbol.parentId);
  if (!parent) return null;

  if (
    parent.kind === SymbolKind.Class ||
    parent.kind === SymbolKind.Interface
  ) {
    return parent as TypeSymbol;
  }

  if (
    isBlockSymbol(parent) &&
    (parent as ScopeSymbol).scopeType === 'class' &&
    parent.parentId
  ) {
    const grandParent = resolve(parent.parentId);
    if (
      grandParent &&
      (grandParent.kind === SymbolKind.Class ||
        grandParent.kind === SymbolKind.Interface)
    ) {
      return grandParent as TypeSymbol;
    }
  }

  return null;
}

/**
 * Find the declaring class for a method
 */
function findDeclaringClass(
  method: MethodSymbol,
  allSymbols: ApexSymbol[],
  symbolManager: ISymbolManagerInterface,
): TypeSymbol | null {
  const resolveParent = (id: string): ApexSymbol | null =>
    allSymbols.find((s) => s.id === id) ?? symbolManager.getSymbol(id) ?? null;

  let current: ApexSymbol | null = method;
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
      if (parent && parent.kind === SymbolKind.Block && parent.parentId) {
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
function findMethodsInClass(
  classSymbol: TypeSymbol,
  allSymbols: ApexSymbol[],
  symbolManager: ISymbolManagerInterface,
): MethodSymbol[] {
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
    (s) =>
      isMethodSymbol(s) &&
      s.kind === SymbolKind.Method &&
      s.fileUri === targetFileUri,
  ) as MethodSymbol[];

  // If no methods found and this is a standard library class, try to get methods from symbol manager
  if (
    methodsInFile.length === 0 &&
    symbolManager &&
    targetFileUri?.startsWith('apexlib://')
  ) {
    // For standard library classes, get all symbols from the file using findSymbolsInFile
    const fileSymbols = symbolManager.findSymbolsInFile(targetFileUri);

    methodsInFile = fileSymbols.filter(
      (s: ApexSymbol) => isMethodSymbol(s) && s.kind === SymbolKind.Method,
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
      if (
        current.kind === SymbolKind.Class ||
        current.kind === SymbolKind.Interface
      ) {
        declaringClass = current as TypeSymbol;
        break;
      }
      if (current.parentId) {
        const parentId: string = current.parentId;
        // First try to find parent in allSymbols
        current = allSymbols.find((s) => s.id === parentId) || null;
        // If not found and we have symbolManager, try to get it from symbol manager
        if (!current && symbolManager) {
          const parentSymbol = symbolManager.getSymbol(parentId);
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
        const parentSymbol = symbolManager.getSymbol(method.parentId);
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
          const parentSymbol = symbolManager.getSymbol(parentBlock.parentId);
          if (
            parentSymbol &&
            (parentSymbol.kind === SymbolKind.Class ||
              parentSymbol.kind === SymbolKind.Interface)
          ) {
            blockParent = parentSymbol;
          }
        }

        if (
          blockParent &&
          (blockParent.kind === SymbolKind.Class ||
            blockParent.kind === SymbolKind.Interface) &&
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

/**
 * Validate method return type compatibility with assignment context (TIER 2)
 * Checks if the method call's return type matches the variable it's assigned to
 */
function validateMethodReturnType(
  methodCall: any,
  visibleMethods: MethodSymbol[],
  symbolTable: SymbolTable,
  sourceContent: string,
  errors: ValidationErrorInfo[],
  symbolManager?: ISymbolManagerInterface,
  tier?: ValidationTier,
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    // Extract assignment context from source code
    const assignmentInfo = extractAssignmentContext(
      methodCall,
      sourceContent,
      symbolTable,
      symbolManager,
      tier,
    );

    if (!assignmentInfo) {
      // Not in an assignment context - skip return type checking
      return;
    }

    const variableType = assignmentInfo.variableType;

    // Find the method that matches the call (use first matching method for now)
    // In practice, we'd use the method selected by parameter type matching
    const selectedMethod = visibleMethods[0];
    if (!selectedMethod || !selectedMethod.returnType?.name) {
      return; // Skip when method unresolved or has no return type
    }

    // Verify we have the right method (name match)
    const actualMethodName =
      methodCall.chainNodes?.length > 0
        ? methodCall.chainNodes[methodCall.chainNodes.length - 1]?.name
        : methodCall.name?.split('.').pop();
    if (
      actualMethodName &&
      selectedMethod.name?.toLowerCase() !== actualMethodName.toLowerCase()
    ) {
      return; // Method name mismatch - likely wrong method from cross-file resolution
    }

    const returnType = selectedMethod.returnType.name.toLowerCase();
    const expectedType = variableType?.toLowerCase();

    if (!expectedType) {
      // Couldn't determine variable type - skip
      return;
    }

    // Skip when method is cross-file and expected type has qualified generic param
    // (e.g. List<GeocodingService.Coordinates>) - resolution may use short form (List<Coordinates>)
    const symbolTableFileUri = symbolTable.getFileUri();
    const isCrossFile =
      symbolTableFileUri &&
      selectedMethod.fileUri &&
      selectedMethod.fileUri !== symbolTableFileUri;
    const hasQualifiedGeneric = /<\w+\.\w+/.test(expectedType);
    if (isCrossFile && hasQualifiedGeneric) {
      return;
    }

    // Check type compatibility (handles List<X> vs list<x> case/generics)
    if (!areReturnTypesCompatible(returnType, expectedType)) {
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
  });
}

/**
 * Extract assignment context for a method call
 * Returns the variable name and type if the method call is on the RHS of an assignment
 */
function extractAssignmentContext(
  methodCall: any,
  sourceContent: string,
  symbolTable: SymbolTable,
  symbolManager?: ISymbolManagerInterface,
  tier?: ValidationTier,
): { variableName: string; variableType: string | null } | null {
  const callLocation = methodCall.location;
  if (!callLocation?.symbolRange) {
    return null;
  }

  const callLine = callLocation.symbolRange.startLine;

  // Parse the source line to find assignment statements
  const lines = sourceContent.split('\n');
  if (callLine < 1 || callLine > lines.length) {
    return null;
  }

  const line = lines[callLine - 1];
  const callText = methodCall.name || '';

  // Extract the actual method name from chained calls (e.g., "obj.getString" -> "getString")
  // For chained calls, the method name is the last node in chainNodes, or the part after the last dot
  let actualMethodName = callText;
  if (methodCall.chainNodes && methodCall.chainNodes.length > 0) {
    const lastNode = methodCall.chainNodes[methodCall.chainNodes.length - 1];
    if (lastNode && lastNode.name) {
      actualMethodName = lastNode.name;
    } else if (callText.includes('.')) {
      actualMethodName = callText.substring(callText.lastIndexOf('.') + 1);
    }
  } else if (callText.includes('.')) {
    actualMethodName = callText.substring(callText.lastIndexOf('.') + 1);
  }

  // Look for assignment pattern: Type variable = receiver.methodCall(...)
  // Handle both qualified (obj.method()) and unqualified (method()) calls
  // Pattern 1: Type variable = receiver.method() or Type variable = method()
  // Match: Type var = ...methodName(...) where methodName is the last identifier before (
  // Also handle generic types like List<Coordinates>
  const typedAssignmentPattern =
    /(\w+(?:<\w+(?:\.\w+)*>)?)\s+(\w+)\s*=\s*.*?(\w+)\s*\(/;
  let match = line.match(typedAssignmentPattern);

  let variableName: string;
  let methodName: string;
  let declaredType: string | null = null;

  if (match && match.length >= 4) {
    // Pattern with type: Type variable = receiver.method()
    declaredType = match[1]; // First capture group is type name
    variableName = match[2]; // Second capture group is variable name
    methodName = match[3]; // Third capture group is method name (last word before opening paren)
  } else {
    // Pattern 2: variable = receiver.method() (no type declaration)
    const simplePattern = /(\w+)\s*=\s*.*?(\w+)\s*\(/;
    match = line.match(simplePattern);
    if (!match) {
      // Not in an assignment context
      return null;
    }
    variableName = match[1]; // First capture group is variable name
    methodName = match[2]; // Second capture group is method name (last word before opening paren)
  }

  // Verify this is the method call we're checking
  // Compare against the actual method name (not the full chained name)
  if (methodName.toLowerCase() !== actualMethodName.toLowerCase()) {
    return null;
  }

  // If we extracted a type from the declaration, use it
  if (declaredType) {
    return {
      variableName,
      variableType: declaredType,
    };
  }

  // Otherwise, find the variable type from symbol table
  let variable = symbolTable.lookup(variableName, null);
  if (!variable) {
    const allSymbols = symbolTable.getAllSymbols();
    variable = allSymbols.find(
      (s) =>
        (s.kind === SymbolKind.Variable ||
          s.kind === SymbolKind.Parameter ||
          s.kind === SymbolKind.Field) &&
        s.name.toLowerCase() === variableName.toLowerCase(),
    );
  }

  if (
    variable &&
    (variable.kind === SymbolKind.Variable ||
      variable.kind === SymbolKind.Parameter ||
      variable.kind === SymbolKind.Field)
  ) {
    const varSymbol = variable as VariableSymbol;
    if (varSymbol.type?.name) {
      return {
        variableName,
        variableType: varSymbol.type.name,
      };
    }
  }

  // TIER 2: Cross-file resolution for variable type
  if (tier === ValidationTier.THOROUGH && symbolManager) {
    const symbolsByName = symbolManager.findSymbolByName(variableName);
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
      if (varSymbol.type?.name) {
        return {
          variableName,
          variableType: varSymbol.type.name,
        };
      }
    }
  }

  return {
    variableName,
    variableType: null,
  };
}

/**
 * Check if return type is compatible with expected type
 */
function areReturnTypesCompatible(
  returnType: string,
  expectedType: string,
): boolean {
  // Normalize for comparison (trim, lowercase)
  const normReturn = returnType.trim().toLowerCase();
  const normExpected = expectedType.trim().toLowerCase();

  // Same type
  if (normReturn === normExpected) {
    return true;
  }

  // Generic types: List<X> vs list<x> - compare base and type param case-insensitively
  const genericMatch = /^(\w+)<([^>]+)>$/;
  const returnMatch = normReturn.match(genericMatch);
  const expectedMatch = normExpected.match(genericMatch);
  if (returnMatch && expectedMatch && returnMatch[1] === expectedMatch[1]) {
    const returnParam = returnMatch[2].replace(/\s/g, '').toLowerCase();
    const expectedParam = expectedMatch[2].replace(/\s/g, '').toLowerCase();
    if (returnParam === expectedParam) {
      return true;
    }
    // Handle qualified vs unqualified: Coordinates vs GeocodingService.Coordinates
    const returnLastPart = returnParam.split('.').pop() ?? returnParam;
    const expectedLastPart = expectedParam.split('.').pop() ?? expectedParam;
    if (returnLastPart === expectedLastPart) {
      return true;
    }
  }

  // null is compatible with any object type
  if (normReturn === 'null' || normExpected === 'null') {
    return true;
  }

  // Object return type is compatible with any type (except primitives)
  // This handles cases like JSON.deserialize which returns Object but can be cast to any type
  if (normReturn === 'object' || normReturn === 'system.object') {
    // Object can be assigned to any object type; only reject if expected is primitive
    if (!isPrimitiveType(normExpected)) {
      return true;
    }
  }

  // Numeric types are compatible with each other (with some restrictions)
  if (isNumericType(normReturn) && isNumericType(normExpected)) {
    return true;
  }

  // Object types - would need subtype checking for full compatibility
  // For now, we only check exact matches
  return false;
}

/**
 * Extract method call argument types from source content
 * Similar to constructor argument extraction but for method calls
 */
function extractMethodCallArgumentTypes(
  methodCall: any, // SymbolReference with METHOD_CALL context
  sourceContent: string,
  symbolTable: SymbolTable,
  symbolManager?: ISymbolManagerInterface,
  tier?: ValidationTier,
): Effect.Effect<string[], never, never> {
  return Effect.gen(function* () {
    if (!sourceContent || !methodCall.location) {
      return [];
    }

    const location = methodCall.location;
    const startLine =
      location.identifierRange?.startLine ?? location.symbolRange.startLine;
    const startColumn =
      location.identifierRange?.startColumn ?? location.symbolRange.startColumn;

    const lines = sourceContent.split('\n');
    if (startLine < 1 || startLine > lines.length) {
      return [];
    }

    const methodCallLine = lines[startLine - 1];
    if (!methodCallLine) {
      return [];
    }

    // Find the method call expression: methodName(...) or obj.methodName(...)
    // Look for the opening parenthesis after the method name
    const methodName = methodCall.name;
    let parenIndex = -1;

    // Try to find the method name and then the opening parenthesis
    // Handle both unqualified (methodName) and qualified (obj.methodName) calls
    // Search from the start column position (where the method call reference points)
    let searchStartCol = startColumn - 1;

    // First, try to find the method name starting from the reference location
    let methodNameIndex = methodCallLine
      .substring(searchStartCol)
      .toLowerCase()
      .indexOf(methodName.toLowerCase());

    // If not found from start column, try searching the whole line
    if (methodNameIndex < 0) {
      methodNameIndex = methodCallLine
        .toLowerCase()
        .indexOf(methodName.toLowerCase());
      if (methodNameIndex >= 0) {
        searchStartCol = methodNameIndex;
      }
    } else {
      methodNameIndex += searchStartCol;
    }

    if (methodNameIndex >= 0) {
      const methodEndIndex = methodNameIndex + methodName.length;
      // Look for opening parenthesis after the method name
      parenIndex = methodCallLine.indexOf('(', methodEndIndex);
    }

    if (parenIndex < 0) {
      // Couldn't find opening parenthesis - might be a different line or complex expression
      return [];
    }

    // Extract arguments between parentheses
    let depth = 0;
    let argStart = parenIndex + 1;
    let argEnd = -1;

    for (let i = parenIndex; i < methodCallLine.length; i++) {
      if (methodCallLine[i] === '(') {
        depth++;
      } else if (methodCallLine[i] === ')') {
        depth--;
        if (depth === 0) {
          argEnd = i;
          break;
        }
      }
    }

    if (argEnd < 0) {
      // Couldn't find closing parenthesis - might span multiple lines
      // For now, return empty (could enhance to handle multi-line)
      return [];
    }

    const argsString = methodCallLine.substring(argStart, argEnd);
    return yield* getMethodCallArgumentTypes(
      argsString,
      symbolTable,
      symbolManager,
      tier,
    );
  });
}

/**
 * Split method call arguments into individual argument strings
 * Handles nested parentheses and commas (same as constructor arguments).
 * Does not split on commas inside string literals (e.g. setBody('a,b') is 1 arg).
 */
function splitMethodCallArguments(args: string): string[] {
  if (!args || args.trim() === '') {
    return [];
  }

  const argList: string[] = [];
  let depth = 0;
  let currentArg = '';
  let inString: "'" | '"' | null = null;

  for (let i = 0; i < args.length; i++) {
    const char = args[i];

    if (inString) {
      if (char === '\\') {
        currentArg += char;
        if (i + 1 < args.length) {
          currentArg += args[++i];
        }
      } else if (char === inString) {
        inString = null;
        currentArg += char;
      } else {
        currentArg += char;
      }
      continue;
    }

    if (char === "'" || char === '"') {
      inString = char;
      currentArg += char;
    } else if (char === '(') {
      depth++;
      currentArg += char;
    } else if (char === ')') {
      depth--;
      currentArg += char;
    } else if (char === ',' && depth === 0) {
      if (currentArg.trim()) {
        argList.push(currentArg.trim());
      }
      currentArg = '';
    } else {
      currentArg += char;
    }
  }

  if (currentArg.trim()) {
    argList.push(currentArg.trim());
  }

  return argList;
}

/**
 * Determine the type of a single argument expression
 * Returns the type name or null if unable to determine
 * (Same logic as constructor argument type determination)
 */
function getMethodCallArgumentType(
  argExpr: string,
  symbolTable: SymbolTable,
  symbolManager?: ISymbolManagerInterface,
  tier?: ValidationTier,
): Effect.Effect<string | null, never, never> {
  return Effect.gen(function* () {
    const trimmed = argExpr.trim();

    // String literals (single or double quoted)
    if (
      (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
      return 'String';
    }

    // Boolean literals
    if (trimmed === 'true' || trimmed === 'false') {
      return 'Boolean';
    }

    // null literal
    if (trimmed === 'null') {
      return 'null'; // Special marker for null literal (compatible with any object type)
    }

    // Integer literals (check if it's a number)
    if (/^-?\d+$/.test(trimmed)) {
      return 'Integer';
    }

    // Decimal literals
    if (/^-?\d+\.\d+$/.test(trimmed)) {
      return 'Decimal';
    }

    // Constructor calls: new TypeName(...)
    const newMatch = trimmed.match(/^new\s+([a-zA-Z_][a-zA-Z0-9_.]*)\s*\(/i);
    if (newMatch) {
      return newMatch[1];
    }

    // Type.class expressions (e.g. AuraHandledException.class) - returns System.Type
    if (/\.class\s*$/.test(trimmed)) {
      return 'Type';
    }

    // Variable identifiers - try to lookup in symbol table
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      // Try case-sensitive lookup first
      let variableSymbol = symbolTable.lookup(trimmed, null);

      // If not found, try case-insensitive lookup
      if (!variableSymbol) {
        const allSymbols = symbolTable.getAllSymbols();
        variableSymbol = allSymbols.find(
          (s) =>
            (s.kind === SymbolKind.Variable ||
              s.kind === SymbolKind.Parameter ||
              s.kind === SymbolKind.Field) &&
            s.name.toLowerCase() === trimmed.toLowerCase(),
        );
      }

      if (
        variableSymbol &&
        (variableSymbol.kind === SymbolKind.Variable ||
          variableSymbol.kind === SymbolKind.Parameter ||
          variableSymbol.kind === SymbolKind.Field)
      ) {
        const varSymbol = variableSymbol as VariableSymbol;
        if (varSymbol.type?.name) {
          return varSymbol.type.name;
        }
      }

      // TIER 2: Cross-file resolution
      if (tier === ValidationTier.THOROUGH && symbolManager) {
        const symbolsByName = symbolManager.findSymbolByName(trimmed);
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
          if (varSymbol.type?.name) {
            return varSymbol.type.name;
          }
        }
      }
    }

    // Method calls and complex expressions - unable to determine type without full resolution
    // Return null to indicate unknown type (will be treated as compatible)
    return null;
  });
}

/**
 * Extract parameter type names from method call arguments
 * Enhanced TIER 2 version that attempts to determine actual argument types
 */
function getMethodCallArgumentTypes(
  callArgs: string,
  symbolTable: SymbolTable,
  symbolManager?: ISymbolManagerInterface,
  tier?: ValidationTier,
): Effect.Effect<string[], never, never> {
  return Effect.gen(function* () {
    if (!callArgs || callArgs.trim() === '') {
      return [];
    }

    const argList = splitMethodCallArguments(callArgs);
    const types: string[] = [];
    for (const arg of argList) {
      const type = yield* getMethodCallArgumentType(
        arg,
        symbolTable,
        symbolManager,
        tier,
      );
      types.push(type || 'Object'); // Fallback to 'Object' if type cannot be determined
    }
    return types;
  });
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
    const superClassSymbols = symbolManager.findSymbolByName(superClassName);
    const superClassSymbol = superClassSymbols.find(
      (s: ApexSymbol) =>
        s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
    ) as TypeSymbol | undefined;

    if (!superClassSymbol) {
      // Superclass not found - might need artifact loading
      return methods;
    }

    // Get symbols from the superclass's file if available
    const allSymbols = superClassSymbol.fileUri
      ? symbolManager.findSymbolsInFile(superClassSymbol.fileUri)
      : [];

    // Find methods in the superclass
    const superClassMethods = findMethodsInClass(
      superClassSymbol,
      allSymbols,
      symbolManager,
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
