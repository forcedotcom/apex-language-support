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
        const declaredType = convertTypeInfoToExpressionType(variable.type);
        const initializerType = convertTypeInfoToExpressionType(
          variable.initializerType,
        );

        // For TIER 2, try to resolve types that need namespace resolution
        if (options.tier === ValidationTier.THOROUGH && options.symbolManager) {
          // If types need resolution, try to resolve them using symbolManager
          if (variable.type.needsNamespaceResolution) {
            // Try to resolve the declared type using typeReferenceId/resolvedSymbolId
            const resolvedDeclaredType = yield* resolveTypeIfNeeded(
              variable.type,
              options.symbolManager,
              symbolTable,
            );
            if (resolvedDeclaredType) {
              Object.assign(
                declaredType,
                convertTypeInfoToExpressionType(resolvedDeclaredType),
              );
            }
          }

          if (variable.initializerType.needsNamespaceResolution) {
            // Try to resolve the initializer type using typeReferenceId/resolvedSymbolId
            const resolvedInitializerType = yield* resolveTypeIfNeeded(
              variable.initializerType,
              options.symbolManager,
              symbolTable,
            );
            if (resolvedInitializerType) {
              Object.assign(
                initializerType,
                convertTypeInfoToExpressionType(resolvedInitializerType),
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
    if (typeInfo.typeReferenceId) {
      const typeRef = findSymbolReferenceById(
        typeInfo.typeReferenceId,
        symbolTable,
      );
      if (typeRef) {
        // Step 2: Check if the reference is already resolved
        if (typeRef.resolvedSymbolId) {
          const resolvedSymbol = symbolManager.getSymbol(
            typeRef.resolvedSymbolId,
          );
          if (resolvedSymbol && isTypeSymbol(resolvedSymbol)) {
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
