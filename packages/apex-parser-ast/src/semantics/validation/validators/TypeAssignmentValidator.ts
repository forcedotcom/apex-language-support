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
  MethodSymbol,
  ApexSymbol,
} from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
import type { TypeInfo } from '../../../types/typeInfo';
import type { SymbolReference } from '../../../types/symbolReference';
import { ReferenceContext } from '../../../types/symbolReference';
import { isChainedSymbolReference } from '../../../utils/symbolNarrowing';
import type { ISymbolManager } from '../../../types/ISymbolManager';
import type {
  ValidationResult,
  ValidationErrorInfo,
  ValidationWarningInfo,
} from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';
import { StatementValidator } from '../StatementValidator';
import { localizeTyped } from '../../../i18n/messageInstance';
import { ErrorCodes } from '../../../generated/ErrorCodes';

/**
 * Validates type assignments in variable declarations.
 *
 * This validator checks that variable initializers are type-compatible with
 * the declared variable type. It catches errors like:
 * - `String s = 123;` (incompatible primitive types)
 * - `ContentDocumentLink link = new List<String>();` (incompatible object types)
 * - `Integer i = null;` (null assigned to primitive)
 *
 * This is a TIER 2 (THOROUGH) validation that requires type resolution across files.
 * It examines the symbol table to find variable declarations with initializers
 * and validates that the initializer type matches the declared type.
 *
 * Note: Array initializer validation (e.g., `Integer[] arr = {1, 2, 3}`) currently
 * validates the overall initializer type but does not validate individual expression
 * types within the initializer against the array element type. Full validation would
 * require parsing source code to extract individual expressions from array initializers
 * and using ExpressionValidator.resolveExpressionTypeRecursive() for each expression.
 * This enhancement is planned for future implementation.
 *
 * Error Messages:
 * - "Type mismatch: cannot assign '{sourceType}' to '{targetType}' at line {line}"
 *
 * @see SEMANTIC_SYMBOL_RULES.md - Type compatibility rules
 */
export const TypeAssignmentValidator: Validator = {
  id: 'type-assignment',
  name: 'Type Assignment Validator',
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
  ): Effect.Effect<ValidationResult, ValidationError> =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      // Get all symbols from the table
      const allSymbols = symbolTable.getAllSymbols();

      // Filter to local variables and fields
      const variables = allSymbols.filter(
        (symbol) =>
          symbol.kind === SymbolKind.Variable ||
          symbol.kind === SymbolKind.Field,
      ) as VariableSymbol[];

      // Check each variable for type mismatches
      for (const variable of variables) {
        // Skip if no type information
        if (!variable.type) {
          continue;
        }

        // Skip if no initializer - we only check assignments at declaration
        if (!variable.initializerType) {
          continue;
        }

        // Convert TypeInfo to StatementExpressionType for compatibility checking
        let declaredType = convertTypeInfoToExpressionType(variable.type);
        let initializerType = convertTypeInfoToExpressionType(
          variable.initializerType,
        );

        // Handle case where initializerType has literal value in originalTypeString
        // Infer type from literal value if possible (regardless of current name)
        // This handles cases where extractInitializerType couldn't determine type correctly
        if (variable.initializerType.originalTypeString) {
          const literalValue =
            variable.initializerType.originalTypeString.trim();

          // Check if it's a string literal (starts and ends with quotes)
          // Handle both single and double quotes, and multi-line strings
          const isStringLiteral =
            ((literalValue.startsWith("'") && literalValue.endsWith("'")) ||
              (literalValue.startsWith('"') && literalValue.endsWith('"'))) &&
            literalValue.length >= 2; // At least 2 chars for empty string ''

          if (isStringLiteral) {
            // Infer String type for string literals
            initializerType = {
              kind: 'primitive',
              name: 'string',
              isNullable: false,
              isArray: false,
              isPrimitive: true,
            };
          }
          // Check if it's a numeric literal (only if not already recognized)
          else if (
            /^-?\d+$/.test(literalValue) &&
            initializerType.name !== 'integer' &&
            initializerType.name !== 'long' &&
            initializerType.name !== 'decimal'
          ) {
            // Infer Integer type for integer literals
            initializerType = {
              kind: 'primitive',
              name: 'integer',
              isNullable: false,
              isArray: false,
              isPrimitive: true,
            };
          }
          // Check if it's a boolean literal
          else if (literalValue === 'true' || literalValue === 'false') {
            // Infer Boolean type for boolean literals
            initializerType = {
              kind: 'primitive',
              name: 'boolean',
              isNullable: false,
              isArray: false,
              isPrimitive: true,
            };
          }
          // Check if it's null
          else if (literalValue === 'null') {
            initializerType = {
              kind: 'primitive',
              name: 'null',
              isNullable: true,
              isArray: false,
              isPrimitive: true,
            };
          }
        }

        // For TIER 2, try to resolve types that need namespace resolution
        if (options.tier === ValidationTier.THOROUGH && options.symbolManager) {
          const variableName = variable.name;
          const variableLocation = variable.location
            ? `${variable.location.identifierRange?.startLine ?? '?'}:${
                variable.location.identifierRange?.startColumn ?? '?'
              }`
            : 'unknown';

          // If types need resolution, try to resolve them using symbolManager
          if (variable.type.needsNamespaceResolution) {
            yield* Effect.logDebug(
              `[TYPE-VALIDATOR] Resolving declared type for variable '${variableName}' ` +
                `at ${variableLocation}: type=${variable.type.name}, ` +
                `originalTypeString=${variable.type.originalTypeString}, ` +
                `needsResolution=${true}`,
            );
            // Try to resolve the declared type using typeReferenceId/resolvedSymbolId
            const resolvedDeclaredType = yield* resolveTypeIfNeeded(
              variable.type,
              options.symbolManager,
              symbolTable,
            );
            if (resolvedDeclaredType) {
              const beforeType = declaredType.name;
              Object.assign(
                declaredType,
                convertTypeInfoToExpressionType(resolvedDeclaredType),
              );
              yield* Effect.logDebug(
                `[TYPE-VALIDATOR] Resolved declared type for '${variableName}': ` +
                  `${beforeType} -> ${resolvedDeclaredType.name}`,
              );
            } else {
              yield* Effect.logDebug(
                `[TYPE-VALIDATOR] Failed to resolve declared type for '${variableName}': ` +
                  `type=${variable.type.name} remains unresolved`,
              );
            }
          }

          if (variable.initializerType.needsNamespaceResolution) {
            yield* Effect.logDebug(
              `[TYPE-VALIDATOR] Resolving initializer type for variable '${variableName}' ` +
                `at ${variableLocation}: type=${variable.initializerType.name}, ` +
                `originalTypeString=${variable.initializerType.originalTypeString}, ` +
                `needsResolution=${true}`,
            );
            // Try to resolve the initializer type using typeReferenceId/resolvedSymbolId
            const resolvedInitializerType = yield* resolveTypeIfNeeded(
              variable.initializerType,
              options.symbolManager,
              symbolTable,
            );
            if (resolvedInitializerType) {
              const beforeType = initializerType.name;
              Object.assign(
                initializerType,
                convertTypeInfoToExpressionType(resolvedInitializerType),
              );
              yield* Effect.logDebug(
                `[TYPE-VALIDATOR] Resolved initializer type for '${variableName}': ` +
                  `${beforeType} -> ${resolvedInitializerType.name}`,
              );
            } else {
              yield* Effect.logDebug(
                `[TYPE-VALIDATOR] Failed to resolve initializer type for '${variableName}': ` +
                  `type=${variable.initializerType.name} remains unresolved`,
              );
            }
          }
        }

        // Check if we detected a string literal - if so, it's always assignable to String
        const isStringLiteralDetected =
          variable.initializerType.originalTypeString &&
          ((variable.initializerType.originalTypeString
            .trim()
            .startsWith("'") &&
            variable.initializerType.originalTypeString.trim().endsWith("'")) ||
            (variable.initializerType.originalTypeString
              .trim()
              .startsWith('"') &&
              variable.initializerType.originalTypeString
                .trim()
                .endsWith('"'))) &&
          variable.initializerType.originalTypeString.trim().length >= 2;

        // Skip validation if types couldn't be resolved and we can't determine compatibility
        // Exception: If we detected a string literal and declared type is String, allow it
        const declaredTypeIsString =
          declaredType.name === 'string' ||
          variable.type.name.toLowerCase() === 'string';

        // If we have a string literal and declared type is String, skip validation (always valid)
        if (isStringLiteralDetected && declaredTypeIsString) {
          yield* Effect.logDebug(
            `[TYPE-VALIDATOR] Skipping validation for variable '${variable.name}': ` +
              'string literal assigned to String (always valid)',
          );
          continue; // Skip to next variable
        }

        // Skip validation if initializer type couldn't be resolved (except for literals we detected)
        if (
          variable.initializerType.needsNamespaceResolution &&
          initializerType.name === 'object' &&
          !isStringLiteralDetected
        ) {
          yield* Effect.logDebug(
            `[TYPE-VALIDATOR] Skipping validation for variable '${variable.name}': ` +
              `initializer type unresolved (${variable.initializerType.name}), ` +
              `originalTypeString=${variable.initializerType.originalTypeString}`,
          );
          continue; // Skip to next variable
        }

        // Validate type compatibility
        const validationResult = StatementValidator.validateVariableDeclaration(
          declaredType,
          initializerType,
          {
            supportsLongIdentifiers: false,
            version: 60,
            isFileBased: true,
          },
        );

        if (!validationResult.isValid) {
          const declaredTypeName =
            variable.type.originalTypeString || variable.type.name;
          const initializerTypeName =
            variable.initializerType.originalTypeString ||
            variable.initializerType.name;
          const variableLocation = variable.location
            ? `${variable.location.identifierRange?.startLine ?? '?'}:${
                variable.location.identifierRange?.startColumn ?? '?'
              }`
            : 'unknown';
          const tierName =
            options.tier === ValidationTier.THOROUGH ? 'TIER 2' : 'TIER 1';

          yield* Effect.logDebug(
            `[TYPE-VALIDATOR] Type mismatch detected for variable '${variable.name}' ` +
              `at ${variableLocation}: ` +
              `cannot assign '${initializerTypeName}' (resolved: ${initializerType.name}, ` +
              `needsResolution: ${variable.initializerType.needsNamespaceResolution}) ` +
              `to '${declaredTypeName}' (resolved: ${declaredType.name}, ` +
              `needsResolution: ${variable.type.needsNamespaceResolution}), ` +
              `tier=${tierName}`,
          );

          errors.push({
            message: localizeTyped(
              ErrorCodes.ILLEGAL_ASSIGNMENT,
              initializerTypeName,
              declaredTypeName,
            ),
            location: variable.location,
            code: ErrorCodes.ILLEGAL_ASSIGNMENT,
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
 * Convert TypeInfo to StatementExpressionType for compatibility checking
 */
function convertTypeInfoToExpressionType(typeInfo: TypeInfo): {
  kind: 'primitive' | 'object' | 'collection' | 'void' | 'unresolved';
  name: string;
  isNullable: boolean;
  isArray: boolean;
  isPrimitive?: boolean;
  isCollection?: boolean;
  elementType?: any;
} {
  const name = typeInfo.name.toLowerCase();
  const isNull = name === 'null';

  return {
    kind: typeInfo.isCollection
      ? 'collection'
      : typeInfo.isPrimitive
        ? 'primitive'
        : isNull
          ? 'primitive'
          : 'object',
    name: name,
    isNullable: !typeInfo.isPrimitive || isNull,
    isArray: typeInfo.isArray,
    isPrimitive: typeInfo.isPrimitive || isNull,
    isCollection: typeInfo.isCollection,
    elementType: typeInfo.typeParameters?.[0]
      ? convertTypeInfoToExpressionType(typeInfo.typeParameters[0])
      : undefined,
  };
}

/**
 * Resolve a type if it needs namespace resolution
 * Uses typeReferenceId/resolvedSymbolId if available, otherwise falls back to findSymbolByName
 */
function resolveTypeIfNeeded(
  typeInfo: TypeInfo,
  symbolManager: ISymbolManager,
  symbolTable: SymbolTable,
): Effect.Effect<TypeInfo | null, never> {
  return Effect.gen(function* () {
    if (!typeInfo.needsNamespaceResolution) {
      return typeInfo;
    }

    // Step 1: Try to use typeReferenceId to find the SymbolReference
    yield* Effect.logDebug(
      `[RESOLVE-TYPE] Resolving type: name=${typeInfo.name}, ` +
        `originalTypeString=${typeInfo.originalTypeString}, ` +
        `typeReferenceId=${typeInfo.typeReferenceId ? 'set' : 'NOT SET'}`,
    );

    const typeRef = typeInfo.typeReferenceId
      ? findSymbolReferenceById(typeInfo.typeReferenceId, symbolTable)
      : undefined;

    // If typeRef is a chained reference, extract the target METHOD_CALL or FIELD_ACCESS node
    let targetRef: SymbolReference | undefined = typeRef;

    if (!typeRef) {
      yield* Effect.logDebug(
        `[RESOLVE-TYPE] No typeRef found for ${typeInfo.name} ` +
          `(typeReferenceId: ${typeInfo.typeReferenceId ? 'set but not found' : 'not set'})`,
      );
      // If typeReferenceId is not set but we have originalTypeString, try to find chained reference by name
      if (
        !typeInfo.typeReferenceId &&
        typeInfo.originalTypeString &&
        typeInfo.originalTypeString.includes('.')
      ) {
        // Look for chained reference with matching name
        // For method calls, remove parameters: "FileUtilities.createFile(...)" -> "FileUtilities.createFile"
        let nameToMatch = typeInfo.originalTypeString;
        const parenIndex = nameToMatch.indexOf('(');
        if (parenIndex !== -1) {
          nameToMatch = nameToMatch.substring(0, parenIndex);
        }
        const allRefs = symbolTable.getAllReferences();
        const chainedRef = allRefs.find(
          (ref) => isChainedSymbolReference(ref) && ref.name === nameToMatch,
        );
        if (chainedRef && chainedRef.chainNodes) {
          const targetNode = chainedRef.chainNodes.find(
            (node: SymbolReference) =>
              node.context === ReferenceContext.METHOD_CALL ||
              node.context === ReferenceContext.FIELD_ACCESS,
          );
          if (targetNode) {
            yield* Effect.logDebug(
              `[RESOLVE-TYPE] Found chained reference "${chainedRef.name}" by name ` +
                `(matched "${nameToMatch}"), using target node: ` +
                `${targetNode.name}:${ReferenceContext[targetNode.context]}`,
            );
            // Use the target node as the reference
            targetRef = targetNode;
          }
        }
      }
    }
    if (typeRef && isChainedSymbolReference(typeRef) && typeRef.chainNodes) {
      // Parse the typeReferenceId to find which node in the chain it refers to
      const refIdParts = typeInfo.typeReferenceId?.split(':');
      if (refIdParts && refIdParts.length >= 5) {
        const targetName = refIdParts[3];
        const targetContextStr = refIdParts.slice(4).join(':');
        // Find the matching node in the chain
        targetRef = typeRef.chainNodes.find(
          (node: SymbolReference) =>
            node.name === targetName &&
            ReferenceContext[node.context] === targetContextStr,
        );
        if (!targetRef) {
          // Fallback: find any METHOD_CALL or FIELD_ACCESS node
          targetRef = typeRef.chainNodes.find(
            (node: SymbolReference) =>
              node.context === ReferenceContext.METHOD_CALL ||
              node.context === ReferenceContext.FIELD_ACCESS,
          );
        }
      }
    }

    if (targetRef) {
      yield* Effect.logDebug(
        `[RESOLVE-TYPE] Found typeRef: name=${targetRef.name}, ` +
          `context=${ReferenceContext[targetRef.context]}, ` +
          `resolvedSymbolId=${targetRef.resolvedSymbolId ? 'set' : 'NOT SET'}`,
      );

      // Step 2: Try to resolve the reference if not already resolved
      let resolvedSymbol: ApexSymbol | null = null;
      if (targetRef.resolvedSymbolId) {
        resolvedSymbol = symbolManager.getSymbol(targetRef.resolvedSymbolId);
      } else {
        // Reference not resolved yet - try to resolve it using symbolManager
        // For METHOD_CALL and FIELD_ACCESS, we need to find the symbol
        if (
          targetRef.context === ReferenceContext.METHOD_CALL ||
          targetRef.context === ReferenceContext.FIELD_ACCESS
        ) {
          // For chained references, check chainNodes
          const chainedRef = targetRef as any;
          if (chainedRef.chainNodes && Array.isArray(chainedRef.chainNodes)) {
            // Find the METHOD_CALL or FIELD_ACCESS node in the chain
            const targetNode = chainedRef.chainNodes.find(
              (node: SymbolReference) =>
                node.context === ReferenceContext.METHOD_CALL ||
                node.context === ReferenceContext.FIELD_ACCESS,
            );
            if (targetNode && targetNode.resolvedSymbolId) {
              resolvedSymbol = symbolManager.getSymbol(
                targetNode.resolvedSymbolId,
              );
            } else if (targetNode && chainedRef.chainNodes.length >= 2) {
              // Chained reference: resolve qualifier first, then find member
              const firstNode = chainedRef.chainNodes[0];
              let qualifierSymbol: ApexSymbol | null = null;

              // Resolve the qualifier (first node)
              if (firstNode.resolvedSymbolId) {
                qualifierSymbol = symbolManager.getSymbol(
                  firstNode.resolvedSymbolId,
                );
              } else {
                const qualifierSymbols = symbolManager.findSymbolByName(
                  firstNode.name,
                );
                qualifierSymbol =
                  qualifierSymbols.find((s) => isTypeSymbol(s)) || null;
                if (!qualifierSymbol) {
                  // Try as variable (for cases like "property.Id")
                  qualifierSymbol =
                    qualifierSymbols.find((s) => isVariableSymbol(s)) || null;
                }
              }

              if (qualifierSymbol) {
                // Find the member (targetNode) in the qualifier's class
                if (isTypeSymbol(qualifierSymbol)) {
                  // Qualifier is a class - find method/field in that class
                  // Use findSymbolByName to search for the member
                  if (targetNode.context === ReferenceContext.METHOD_CALL) {
                    const methodSymbols = symbolManager.findSymbolByName(
                      targetNode.name,
                    );
                    resolvedSymbol =
                      methodSymbols.find(
                        (s: ApexSymbol) =>
                          s.kind === SymbolKind.Method &&
                          s.name === targetNode.name &&
                          s.parentId === qualifierSymbol.id,
                      ) || null;
                  } else if (
                    targetNode.context === ReferenceContext.FIELD_ACCESS
                  ) {
                    const fieldSymbols = symbolManager.findSymbolByName(
                      targetNode.name,
                    );
                    resolvedSymbol =
                      fieldSymbols.find(
                        (s: ApexSymbol) =>
                          (s.kind === SymbolKind.Field ||
                            s.kind === SymbolKind.Property) &&
                          s.name === targetNode.name &&
                          s.parentId === qualifierSymbol.id,
                      ) || null;
                  }
                } else if (isVariableSymbol(qualifierSymbol)) {
                  // Qualifier is a variable - get its type and find member in that type
                  const variableSymbol = qualifierSymbol as VariableSymbol;
                  const qualifierType = variableSymbol.type;
                  if (qualifierType.resolvedSymbol) {
                    const typeSymbol = qualifierType.resolvedSymbol;
                    if (targetNode.context === ReferenceContext.METHOD_CALL) {
                      const methodSymbols = symbolManager.findSymbolByName(
                        targetNode.name,
                      );
                      resolvedSymbol =
                        methodSymbols.find(
                          (s: ApexSymbol) =>
                            s.kind === SymbolKind.Method &&
                            s.name === targetNode.name &&
                            s.parentId === typeSymbol.id,
                        ) || null;
                    } else if (
                      targetNode.context === ReferenceContext.FIELD_ACCESS
                    ) {
                      const fieldSymbols = symbolManager.findSymbolByName(
                        targetNode.name,
                      );
                      resolvedSymbol =
                        fieldSymbols.find(
                          (s: ApexSymbol) =>
                            (s.kind === SymbolKind.Field ||
                              s.kind === SymbolKind.Property) &&
                            s.name === targetNode.name &&
                            s.parentId === typeSymbol.id,
                        ) || null;
                    }
                  }
                }
              }
            } else if (targetNode) {
              // Single node or no qualifier - try to resolve by name
              const symbols = symbolManager.findSymbolByName(targetNode.name);
              if (targetRef.context === ReferenceContext.METHOD_CALL) {
                resolvedSymbol =
                  symbols.find((s: ApexSymbol) => isMethodSymbol(s)) || null;
              } else if (targetRef.context === ReferenceContext.FIELD_ACCESS) {
                resolvedSymbol =
                  symbols.find(
                    (s: ApexSymbol) =>
                      isVariableSymbol(s) &&
                      (s.kind === SymbolKind.Field ||
                        s.kind === SymbolKind.Property),
                  ) || null;
              }
            }
          } else {
            // Not a chained reference - try to resolve by name
            const symbols = symbolManager.findSymbolByName(targetRef.name);
            if (targetRef.context === ReferenceContext.METHOD_CALL) {
              resolvedSymbol =
                symbols.find((s: ApexSymbol) => isMethodSymbol(s)) || null;
            } else if (targetRef.context === ReferenceContext.FIELD_ACCESS) {
              resolvedSymbol =
                symbols.find(
                  (s: ApexSymbol) =>
                    isVariableSymbol(s) &&
                    (s.kind === SymbolKind.Field ||
                      s.kind === SymbolKind.Property),
                ) || null;
            }
          }
        }
      }

      yield* Effect.logDebug(
        `[RESOLVE-TYPE] Resolved symbol: ${
          resolvedSymbol
            ? `kind=${resolvedSymbol.kind}, name=${resolvedSymbol.name}`
            : 'NOT FOUND'
        }`,
      );

      if (resolvedSymbol) {
        // Handle METHOD_CALL context - extract return type from MethodSymbol
        if (targetRef.context === ReferenceContext.METHOD_CALL) {
          if (isMethodSymbol(resolvedSymbol)) {
            const methodSymbol = resolvedSymbol as MethodSymbol;
            // Get the returnType, preserving original type info
            const returnTypeInfo = convertMethodReturnTypeToTypeInfo(
              methodSymbol.returnType,
              typeInfo,
            );
            // If the return type still needs resolution, recursively resolve it
            if (returnTypeInfo.needsNamespaceResolution) {
              const recursivelyResolved = yield* resolveTypeIfNeeded(
                returnTypeInfo,
                symbolManager,
                symbolTable,
              );
              return recursivelyResolved || returnTypeInfo;
            }
            return returnTypeInfo;
          }
        }
        // Handle FIELD_ACCESS context - extract type from VariableSymbol
        else if (targetRef.context === ReferenceContext.FIELD_ACCESS) {
          if (isVariableSymbol(resolvedSymbol)) {
            const variableSymbol = resolvedSymbol as VariableSymbol;
            // Get the type, preserving original type info
            const variableTypeInfo = convertVariableTypeToTypeInfo(
              variableSymbol.type,
              typeInfo,
            );
            // If the variable type still needs resolution, recursively resolve it
            if (variableTypeInfo.needsNamespaceResolution) {
              const recursivelyResolved = yield* resolveTypeIfNeeded(
                variableTypeInfo,
                symbolManager,
                symbolTable,
              );
              return recursivelyResolved || variableTypeInfo;
            }
            return variableTypeInfo;
          }
        }
        // Handle TYPE references - use existing TypeSymbol logic
        else if (isTypeSymbol(resolvedSymbol)) {
          // Convert TypeSymbol to TypeInfo
          return convertTypeSymbolToTypeInfo(
            resolvedSymbol as TypeSymbol,
            typeInfo,
          );
        }
      }
    }

    // Step 3: Fallback to findSymbolByName if typeReferenceId not available or not resolved
    const symbols = symbolManager.findSymbolByName(typeInfo.name);
    const typeSymbol = symbols.find((s) => isTypeSymbol(s)) as
      | TypeSymbol
      | undefined;
    if (typeSymbol) {
      return convertTypeSymbolToTypeInfo(typeSymbol, typeInfo);
    }

    // Type not found - return null to indicate unresolved
    return null;
  });
}

/**
 * Find a SymbolReference by its ID
 * typeReferenceId format: `${filePath}:${line}:${column}:${name}:${ReferenceContext[context]}`
 */
function findSymbolReferenceById(
  typeReferenceId: string,
  symbolTable: SymbolTable,
): SymbolReference | undefined {
  try {
    // Parse the typeReferenceId: filePath:line:column:name:context
    const parts = typeReferenceId.split(':');
    if (parts.length < 5) {
      return undefined;
    }

    const line = parseInt(parts[1], 10);
    const column = parseInt(parts[2], 10);
    const name = parts[3];
    const contextStr = parts.slice(4).join(':'); // Handle context names with colons

    // Get references at the position
    const refs = symbolTable.getReferencesAtPosition({
      line,
      character: column,
    });

    // Find matching reference by name and context
    return refs.find(
      (ref) =>
        ref.name === name && ReferenceContext[ref.context] === contextStr,
    );
  } catch {
    return undefined;
  }
}

/**
 * Check if a symbol is a type symbol (Class, Interface, or Enum)
 */
function isTypeSymbol(symbol: any): boolean {
  return (
    symbol.kind === SymbolKind.Class ||
    symbol.kind === SymbolKind.Interface ||
    symbol.kind === SymbolKind.Enum
  );
}

/**
 * Check if a symbol is a method symbol (Method or Constructor)
 */
function isMethodSymbol(symbol: any): boolean {
  return (
    symbol.kind === SymbolKind.Method || symbol.kind === SymbolKind.Constructor
  );
}

/**
 * Check if a symbol is a variable symbol (Property, Field, Variable, Parameter, or EnumValue)
 */
function isVariableSymbol(symbol: any): boolean {
  return (
    symbol.kind === SymbolKind.Property ||
    symbol.kind === SymbolKind.Field ||
    symbol.kind === SymbolKind.Variable ||
    symbol.kind === SymbolKind.Parameter ||
    symbol.kind === SymbolKind.EnumValue
  );
}

/**
 * Convert a TypeSymbol to TypeInfo, preserving original type information
 */
function convertTypeSymbolToTypeInfo(
  typeSymbol: TypeSymbol,
  originalTypeInfo: TypeInfo,
): TypeInfo {
  return {
    ...originalTypeInfo,
    name: typeSymbol.name,
    needsNamespaceResolution: false,
    resolvedSymbol: typeSymbol,
    resolutionConfidence: 1.0,
  };
}

/**
 * Convert a method's return type to TypeInfo, preserving original type information
 * If the return type needs resolution, it will be resolved recursively
 */
function convertMethodReturnTypeToTypeInfo(
  returnType: TypeInfo,
  originalTypeInfo: TypeInfo,
): TypeInfo {
  return {
    ...originalTypeInfo,
    name: returnType.name,
    needsNamespaceResolution: returnType.needsNamespaceResolution,
    originalTypeString: returnType.originalTypeString || returnType.name,
    typeReferenceId: returnType.typeReferenceId,
    resolvedSymbol: returnType.resolvedSymbol,
    resolutionConfidence: returnType.resolutionConfidence || 1.0,
    isPrimitive: returnType.isPrimitive,
    isArray: returnType.isArray,
    isCollection: returnType.isCollection,
    typeParameters: returnType.typeParameters,
  };
}

/**
 * Convert a variable's type to TypeInfo, preserving original type information
 * If the type needs resolution, it will be resolved recursively
 */
function convertVariableTypeToTypeInfo(
  variableType: TypeInfo,
  originalTypeInfo: TypeInfo,
): TypeInfo {
  return {
    ...originalTypeInfo,
    name: variableType.name,
    needsNamespaceResolution: variableType.needsNamespaceResolution,
    originalTypeString: variableType.originalTypeString || variableType.name,
    typeReferenceId: variableType.typeReferenceId,
    resolvedSymbol: variableType.resolvedSymbol,
    resolutionConfidence: variableType.resolutionConfidence || 1.0,
    isPrimitive: variableType.isPrimitive,
    isArray: variableType.isArray,
    isCollection: variableType.isCollection,
    typeParameters: variableType.typeParameters,
  };
}
