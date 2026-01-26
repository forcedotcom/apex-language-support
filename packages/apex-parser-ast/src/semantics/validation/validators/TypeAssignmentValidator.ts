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
} from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
import type { TypeInfo } from '../../../types/typeInfo';
import type { SymbolReference } from '../../../types/symbolReference';
import { ReferenceContext } from '../../../types/symbolReference';
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
        // but name is Object (extractInitializerType couldn't determine type)
        // Infer type from literal value if possible
        if (
          variable.initializerType.originalTypeString &&
          variable.initializerType.name === 'Object' &&
          variable.initializerType.needsNamespaceResolution
        ) {
          const literalValue =
            variable.initializerType.originalTypeString.trim();
          // Check if it's a string literal
          if (
            (literalValue.startsWith("'") && literalValue.endsWith("'")) ||
            (literalValue.startsWith('"') && literalValue.endsWith('"'))
          ) {
            // Infer String type for string literals
            initializerType = {
              kind: 'primitive',
              name: 'string',
              isNullable: false,
              isArray: false,
              isPrimitive: true,
            };
          }
          // Check if it's a numeric literal
          else if (/^-?\d+$/.test(literalValue)) {
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
            message: `Type mismatch: cannot assign '${initializerTypeName}' to '${declaredTypeName}'`,
            location: variable.location,
            code: 'TYPE_MISMATCH',
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
    yield* Effect.logInfo(
      `[RESOLVE-TYPE] Resolving type: name=${typeInfo.name}, ` +
        `originalTypeString=${typeInfo.originalTypeString}, ` +
        `typeReferenceId=${typeInfo.typeReferenceId ? 'set' : 'NOT SET'}`,
    );

    const typeRef = typeInfo.typeReferenceId
      ? findSymbolReferenceById(typeInfo.typeReferenceId, symbolTable)
      : undefined;

    if (!typeRef) {
      yield* Effect.logInfo(
        `[RESOLVE-TYPE] No typeRef found for ${typeInfo.name} ` +
          `(typeReferenceId: ${typeInfo.typeReferenceId ? 'set but not found' : 'not set'})`,
      );
    }

    if (typeRef) {
      yield* Effect.logInfo(
        `[RESOLVE-TYPE] Found typeRef: name=${typeRef.name}, ` +
          `context=${ReferenceContext[typeRef.context]}, ` +
          `resolvedSymbolId=${typeRef.resolvedSymbolId ? 'set' : 'NOT SET'}`,
      );

      // Step 2: Check if the reference is already resolved
      if (typeRef.resolvedSymbolId) {
        const resolvedSymbol = symbolManager.getSymbol(
          typeRef.resolvedSymbolId,
        );
        yield* Effect.logInfo(
          `[RESOLVE-TYPE] Resolved symbol: ${resolvedSymbol ? `kind=${resolvedSymbol.kind}, name=${resolvedSymbol.name}` : 'NOT FOUND'}`,
        );
        if (resolvedSymbol) {
          // Handle METHOD_CALL context - extract return type from MethodSymbol
          if (typeRef.context === ReferenceContext.METHOD_CALL) {
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
          else if (typeRef.context === ReferenceContext.FIELD_ACCESS) {
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
