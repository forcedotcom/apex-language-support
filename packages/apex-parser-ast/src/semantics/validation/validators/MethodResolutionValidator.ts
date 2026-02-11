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
      // For chained calls, only the chained reference is in the symbol table (not individual references)
      // For standalone calls, the individual reference is in the symbol table
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

        // Determine if this call is in a static context by finding the containing method
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

        // Check if this is a qualified call (obj.method()) and resolve the receiver's type
        if (options.sourceContent && methodCall.location) {
          const receiverType = yield* resolveMethodCallReceiverType(
            methodCall,
            options.sourceContent,
            symbolTable,
            symbolManager,
            options.tier,
          );

          if (receiverType) {
            // Find the class symbol for the receiver type
            const receiverClassSymbols =
              symbolManager.findSymbolByName(receiverType);
            const receiverClassSymbolsTyped = receiverClassSymbols.filter(
              (s: ApexSymbol) =>
                s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
            ) as TypeSymbol[];

            if (receiverClassSymbolsTyped.length > 0) {
              // Prefer class from a file that has methods (check via getAllSymbolsForCompletion)
              const allSymbolsForCompletion =
                symbolManager.getAllSymbolsForCompletion();
              const methodsForReceiverType = allSymbolsForCompletion.filter(
                (s) =>
                  s.kind === SymbolKind.Method &&
                  s.name &&
                  receiverClassSymbolsTyped.some(
                    (cls) => cls.fileUri === s.fileUri,
                  ),
              );

              // If we found methods, prefer the class from the file with the most methods
              if (methodsForReceiverType.length > 0) {
                const fileUriWithMethods = methodsForReceiverType[0].fileUri;
                const preferredClass = receiverClassSymbolsTyped.find(
                  (cls) => cls.fileUri === fileUriWithMethods,
                );
                if (preferredClass) {
                  targetClass = preferredClass;
                } else {
                  targetClass = receiverClassSymbolsTyped[0];
                }
              } else {
                targetClass = receiverClassSymbolsTyped[0];
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
            // Find methods that match both parameter count and types
            const matchingMethods = visibleMethods.filter((method) => {
              if (
                !method.parameters ||
                method.parameters.length !== argTypes.length
              ) {
                return false;
              }

              // Compare each parameter type with argument type
              for (let i = 0; i < method.parameters.length; i++) {
                const paramType =
                  method.parameters[i]?.type?.name?.toLowerCase();
                const argType = argTypes[i]?.toLowerCase();

                // null is compatible with any object type
                if (argType === 'null') {
                  continue;
                }

                // If we couldn't determine argument type (Object fallback), skip type checking
                if (!argType || argType === 'object') {
                  continue;
                }

                // Exact type match
                if (paramType === argType) {
                  continue;
                }

                // Type mismatch
                return false;
              }
              return true;
            });

            // If no methods match types but we have some type information, report error
            if (
              matchingMethods.length === 0 &&
              argTypes.some((t) => t !== 'Object')
            ) {
              // We have some type information, so we can report a type mismatch
              const paramTypes =
                visibleMethods[0]?.parameters
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
    // For chained calls, use chainNodes to get the receiver directly
    if (methodCall.chainNodes && methodCall.chainNodes.length > 0) {
      const firstNode = methodCall.chainNodes[0];
      if (firstNode && firstNode.name) {
        const receiverName = firstNode.name;

        // Resolve the receiver's type
        // First try same-file lookup
        let receiverSymbol = symbolTable.lookup(receiverName, null);
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

    // Extract the receiver name (everything before the dot, trimmed)
    const receiverText = beforeMethod
      .substring(Math.max(0, lastDotIndex - 50), lastDotIndex)
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
    let receiverSymbol = symbolTable.lookup(receiverName, null);
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

    // Get all symbols across all files for cross-file resolution
    const allSymbolsForCompletion = symbolManager.getAllSymbolsForCompletion();
    // Combine with current file symbols (current file takes precedence)
    const combinedSymbols = [
      ...allSymbols,
      ...allSymbolsForCompletion.filter(
        (s) => !allSymbols.some((existing) => existing.id === s.id),
      ),
    ];

    // Find methods in the current class
    const classMethods = findMethodsInClass(
      classSymbol,
      combinedSymbols,
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

  // Private methods are only visible within the same class
  if (visibility === SymbolVisibility.Private) {
    return declaringClass.id === callingClass.id;
  }

  // Protected/Default methods are visible to subclasses
  if (
    visibility === SymbolVisibility.Protected ||
    visibility === SymbolVisibility.Default
  ) {
    // Check if calling class is the same or a subclass of declaring class
    if (declaringClass.id === callingClass.id) {
      return true;
    }

    // Check if calling class extends declaring class
    return isSubclassOf(
      callingClass,
      declaringClass,
      symbolManager,
      allSymbols,
    );
  }

  // Unknown visibility - assume visible (conservative)
  return true;
}

/**
 * Find the declaring class for a method
 */
function findDeclaringClass(
  method: MethodSymbol,
  allSymbols: ApexSymbol[],
  symbolManager: ISymbolManagerInterface,
): TypeSymbol | null {
  // Try to find the class in the same file first
  let current: ApexSymbol | null = method;
  while (current) {
    if (
      current.kind === SymbolKind.Class ||
      current.kind === SymbolKind.Interface
    ) {
      return current as TypeSymbol;
    }
    if (current.parentId) {
      const parent = allSymbols.find((s) => s.id === current!.parentId);
      if (
        parent &&
        (parent.kind === SymbolKind.Class ||
          parent.kind === SymbolKind.Interface)
      ) {
        return parent as TypeSymbol;
      }
      // If parent is a block, check its parent
      if (parent && parent.kind === SymbolKind.Block && parent.parentId) {
        const grandParent = allSymbols.find((s) => s.id === parent!.parentId);
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

  // If not found in same file, might be from superclass
  // For now, return null - we'd need to track declaring class in method symbol
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
  const methodsById = new Set<string>();

  // Find all methods in the same file as the class
  // If classSymbol.fileUri is not set, try to find it from the class symbol itself
  const targetFileUri = classSymbol.fileUri;
  if (!targetFileUri) {
    // If fileUri is not set, we can't reliably match methods
    return methods;
  }

  const methodsInFile = allSymbols.filter(
    (s) =>
      isMethodSymbol(s) &&
      s.kind === SymbolKind.Method &&
      s.fileUri === targetFileUri,
  ) as MethodSymbol[];

  // For each method, find its declaring class by traversing parentId relationships
  for (const method of methodsInFile) {
    if (methodsById.has(method.id)) {
      continue; // Already added
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
        current = allSymbols.find((s) => s.id === current!.parentId) || null;
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
      methodsById.add(method.id);
    } else if (method.parentId === classSymbol.id) {
      // Direct parentId match (same-file case)
      methods.push(method);
      methodsById.add(method.id);
    } else {
      // Check if parentId points to a class block that belongs to this class
      const parentBlock = allSymbols.find((s) => s.id === method.parentId);
      if (parentBlock && isBlockSymbol(parentBlock)) {
        // Check if the block's parent is a class with matching name and fileUri
        const blockParent = allSymbols.find(
          (s) => s.id === parentBlock.parentId,
        );
        if (
          blockParent &&
          (blockParent.kind === SymbolKind.Class ||
            blockParent.kind === SymbolKind.Interface) &&
          blockParent.name === classSymbol.name &&
          blockParent.fileUri === classSymbol.fileUri
        ) {
          methods.push(method);
          methodsById.add(method.id);
        } else if (parentBlock.parentId === classSymbol.id) {
          // Direct parentId match
          methods.push(method);
          methodsById.add(method.id);
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
      return;
    }

    const returnType = selectedMethod.returnType.name.toLowerCase();
    const expectedType = variableType?.toLowerCase();

    if (!expectedType) {
      // Couldn't determine variable type - skip
      return;
    }

    // Check type compatibility
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
  const typedAssignmentPattern = /(\w+)\s+(\w+)\s*=\s*.*?(\w+)\s*\(/;
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
  // Same type
  if (returnType === expectedType) {
    return true;
  }

  // null is compatible with any object type
  if (returnType === 'null' || expectedType === 'null') {
    return true;
  }

  // Numeric types are compatible with each other (with some restrictions)
  const numericTypes = ['integer', 'long', 'double', 'decimal'];
  if (
    numericTypes.includes(returnType) &&
    numericTypes.includes(expectedType)
  ) {
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
 * Handles nested parentheses and commas (same as constructor arguments)
 */
function splitMethodCallArguments(args: string): string[] {
  if (!args || args.trim() === '') {
    return [];
  }

  const argList: string[] = [];
  let depth = 0;
  let currentArg = '';

  for (let i = 0; i < args.length; i++) {
    const char = args[i];
    if (char === '(') {
      depth++;
      currentArg += char;
    } else if (char === ')') {
      depth--;
      currentArg += char;
    } else if (char === ',' && depth === 0) {
      // Top-level comma - argument separator
      if (currentArg.trim()) {
        argList.push(currentArg.trim());
      }
      currentArg = '';
    } else {
      currentArg += char;
    }
  }

  // Add the last argument
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

    // Get all symbols for completion to find methods
    const allSymbols = symbolManager.getAllSymbolsForCompletion();

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
