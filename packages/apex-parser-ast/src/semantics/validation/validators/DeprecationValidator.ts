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
  TypeSymbol,
  MethodSymbol,
  VariableSymbol,
  SymbolLocation,
} from '../../../types/symbol';
import { SymbolKind, SymbolVisibility } from '../../../types/symbol';
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
 * Helper to check if a symbol has @Deprecated annotation
 */
function hasDeprecatedAnnotation(symbol: {
  annotations?: Array<{ name: string }>;
}): boolean {
  if (!symbol.annotations || symbol.annotations.length === 0) {
    return false;
  }
  // Check if any annotation name (case-insensitive) starts with "deprecated"
  // Annotation names might include parameters like "Deprecated" or "Deprecated(someParam)"
  // Also handle cases where annotation name might have whitespace or other characters
  return symbol.annotations.some((ann) => {
    const annName = ann.name.toLowerCase().trim();
    // Check for exact match or if it starts with "deprecated" (handles "Deprecated(...)")
    // Remove any parentheses and parameters for comparison
    const baseName = annName.split('(')[0].trim();
    return baseName === 'deprecated';
  });
}

/**
 * Load deprecated types from other files (TIER 2)
 * Attempts to find types referenced in the current file and check if they're deprecated
 */
function loadCrossFileDeprecatedTypes(
  symbolTable: SymbolTable,
  symbolManager: ISymbolManagerInterface,
  deprecatedTypes: Set<string>,
): void {
  // Get all type references from the symbol table
  const allSymbols = symbolTable.getAllSymbols();
  const typeNames = new Set<string>();

  // Collect type names from method return types and parameters
  for (const symbol of allSymbols) {
    if (symbol.kind === SymbolKind.Method) {
      const method = symbol as MethodSymbol;
      if (method.returnType?.name) {
        const returnTypeName = method.returnType.name.toLowerCase();
        typeNames.add(returnTypeName);
        // Also try original case in case findSymbolByName needs it
        if (method.returnType.name !== returnTypeName) {
          typeNames.add(method.returnType.name);
        }
      }
      if (method.parameters) {
        for (const param of method.parameters) {
          if (param.type?.name) {
            const paramTypeName = param.type.name.toLowerCase();
            typeNames.add(paramTypeName);
            // Also try original case
            if (param.type.name !== paramTypeName) {
              typeNames.add(param.type.name);
            }
          }
        }
      }
    } else if (
      symbol.kind === SymbolKind.Field ||
      symbol.kind === SymbolKind.Property
    ) {
      const field = symbol as VariableSymbol;
      if (field.type?.name) {
        const fieldTypeName = field.type.name.toLowerCase();
        typeNames.add(fieldTypeName);
        // Also try original case
        if (field.type.name !== fieldTypeName) {
          typeNames.add(field.type.name);
        }
      }
    }
  }

  // Check each type to see if it's deprecated in another file
  for (const typeName of typeNames) {
    // Normalize type name to lowercase for consistent comparison
    const normalizedTypeName = typeName.toLowerCase();

    // Skip if we already know it's deprecated (same file) - check normalized version
    if (deprecatedTypes.has(normalizedTypeName)) {
      continue;
    }

    // Skip primitive types and system types
    const primitiveTypes = [
      'integer',
      'long',
      'double',
      'decimal',
      'string',
      'boolean',
      'date',
      'datetime',
      'id',
      'blob',
      'object',
    ];
    if (primitiveTypes.includes(normalizedTypeName)) {
      continue;
    }

    // Try to find the type in other files
    // findSymbolByName is case-insensitive, so either case should work
    const foundSymbols = symbolManager.findSymbolByName(typeName);
    const foundSymbol = foundSymbols.find(
      (s) =>
        s.kind === SymbolKind.Class ||
        s.kind === SymbolKind.Interface ||
        s.kind === SymbolKind.Enum,
    ) as TypeSymbol | undefined;

    if (foundSymbol && hasDeprecatedAnnotation(foundSymbol)) {
      deprecatedTypes.add(normalizedTypeName);
    }
  }
}

/**
 * Check if a type is deprecated (TIER 2)
 * Checks both same-file and cross-file types
 */
function checkIfTypeIsDeprecated(
  typeName: string,
  symbolManager: ISymbolManagerInterface,
  deprecatedTypes: Set<string>,
): boolean {
  const normalizedName = typeName.toLowerCase();

  // Check if already in deprecated types set (same file)
  if (deprecatedTypes.has(normalizedName)) {
    return true;
  }

  // Skip primitive types
  const primitiveTypes = [
    'integer',
    'long',
    'double',
    'decimal',
    'string',
    'boolean',
    'date',
    'datetime',
    'id',
    'blob',
    'object',
  ];
  if (primitiveTypes.includes(normalizedName)) {
    return false;
  }

  // Try to find the type in other files
  // findSymbolByName is case-insensitive, so either case should work
  const foundSymbols = symbolManager.findSymbolByName(typeName);
  const foundSymbol = foundSymbols.find(
    (s) =>
      s.kind === SymbolKind.Class ||
      s.kind === SymbolKind.Interface ||
      s.kind === SymbolKind.Enum,
  ) as TypeSymbol | undefined;

  if (foundSymbol && hasDeprecatedAnnotation(foundSymbol)) {
    deprecatedTypes.add(normalizedName);
    return true;
  }

  return false;
}

/**
 * Validates deprecation propagation rules for global methods and WebService fields.
 *
 * Rules:
 * - Global methods must be deprecated when return type is deprecated
 * - Global methods must be deprecated when parameter type is deprecated
 * - Global fields must be deprecated when type is deprecated
 * - WebService fields must be deprecated when type is deprecated
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 * Note: Full validation requires TIER 2 (cross-file type resolution).
 *
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Phase 6.2
 */
export const DeprecationValidator: Validator = {
  id: 'deprecation',
  name: 'Deprecation Validator',
  tier: ValidationTier.IMMEDIATE, // Supports both IMMEDIATE (TIER 1) and THOROUGH (TIER 2)
  priority: 9,
  prerequisites: {
    requiredDetailLevel: 'public-api',
    requiresReferences: false,
    requiresCrossFileResolution: false, // TIER 2 validation may require cross-file resolution
  },

  validate: (
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError, ISymbolManager> =>
    Effect.gen(function* () {
      const symbolManager = yield* ISymbolManager;
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      // Get all symbols from the table
      const allSymbols = symbolTable.getAllSymbols();

      // Find all deprecated types in the same file
      const deprecatedTypes = new Set<string>();
      for (const symbol of allSymbols) {
        if (
          (symbol.kind === SymbolKind.Class ||
            symbol.kind === SymbolKind.Interface ||
            symbol.kind === SymbolKind.Enum) &&
          'annotations' in symbol
        ) {
          const typeSymbol = symbol as TypeSymbol;
          if (hasDeprecatedAnnotation(typeSymbol)) {
            deprecatedTypes.add(typeSymbol.name.toLowerCase());
          }
        }
      }

      // TIER 2: Load deprecated types from other files
      if (
        options.tier === ValidationTier.THOROUGH &&
        options.allowArtifactLoading
      ) {
        loadCrossFileDeprecatedTypes(
          symbolTable,
          symbolManager,
          deprecatedTypes,
        );
      }

      // Validate global methods
      const globalMethods = allSymbols.filter(
        (s): s is MethodSymbol =>
          s.kind === SymbolKind.Method &&
          'parameters' in s &&
          'returnType' in s &&
          s.modifiers?.visibility === SymbolVisibility.Global,
      );

      for (const method of globalMethods) {
        const methodLocation: SymbolLocation = method.location || {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 0,
          },
        };
        const isDeprecated = hasDeprecatedAnnotation(method);

        // Check return type
        if (method.returnType?.name) {
          const returnTypeName = method.returnType.name.toLowerCase();
          let isReturnTypeDeprecated = deprecatedTypes.has(returnTypeName);

          // If not found in deprecatedTypes set, check cross-file (TIER 2)
          if (
            !isReturnTypeDeprecated &&
            options.tier === ValidationTier.THOROUGH &&
            options.allowArtifactLoading
          ) {
            // Try checking with the original case first, then lowercase
            isReturnTypeDeprecated = checkIfTypeIsDeprecated(
              method.returnType.name,
              symbolManager,
              deprecatedTypes,
            );
            if (!isReturnTypeDeprecated) {
              isReturnTypeDeprecated = checkIfTypeIsDeprecated(
                returnTypeName,
                symbolManager,
                deprecatedTypes,
              );
            }
          }

          if (isReturnTypeDeprecated && !isDeprecated) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.GLOBAL_DEPRECATE_IF_RETURN_DEPRECATED,
                method.name,
              ),
              location: methodLocation,
              code: ErrorCodes.GLOBAL_DEPRECATE_IF_RETURN_DEPRECATED,
            });
          }
        }

        // Check parameter types
        if (method.parameters) {
          for (const param of method.parameters) {
            if (param.type?.name) {
              const paramTypeName = param.type.name.toLowerCase();
              let isParamTypeDeprecated = deprecatedTypes.has(paramTypeName);
              if (
                !isParamTypeDeprecated &&
                options.tier === ValidationTier.THOROUGH &&
                options.allowArtifactLoading
              ) {
                isParamTypeDeprecated = checkIfTypeIsDeprecated(
                  paramTypeName,
                  symbolManager,
                  deprecatedTypes,
                );
              }

              if (isParamTypeDeprecated && !isDeprecated) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.GLOBAL_DEPRECATE_IF_PARAMETER_DEPRECATED,
                    method.name,
                  ),
                  location: methodLocation,
                  code: ErrorCodes.GLOBAL_DEPRECATE_IF_PARAMETER_DEPRECATED,
                });
                break; // Only report once per method
              }
            }
          }
        }
      }

      // Validate global fields
      const globalFields = allSymbols.filter(
        (s): s is VariableSymbol =>
          (s.kind === SymbolKind.Field || s.kind === SymbolKind.Property) &&
          'type' in s &&
          s.modifiers?.visibility === SymbolVisibility.Global,
      );

      for (const field of globalFields) {
        const fieldLocation: SymbolLocation = field.location || {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 0,
          },
        };
        const isDeprecated = hasDeprecatedAnnotation(field);

        if (field.type?.name) {
          const fieldTypeName = field.type.name.toLowerCase();
          let isFieldTypeDeprecated = deprecatedTypes.has(fieldTypeName);
          if (
            !isFieldTypeDeprecated &&
            options.tier === ValidationTier.THOROUGH &&
            options.allowArtifactLoading
          ) {
            isFieldTypeDeprecated = checkIfTypeIsDeprecated(
              fieldTypeName,
              symbolManager,
              deprecatedTypes,
            );
          }

          if (isFieldTypeDeprecated && !isDeprecated) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.GLOBAL_DEPRECATE_IF_TYPE_DEPRECATED,
                field.name,
              ),
              location: fieldLocation,
              code: ErrorCodes.GLOBAL_DEPRECATE_IF_TYPE_DEPRECATED,
            });
          }
        }
      }

      // Validate WebService fields
      const webserviceFields = allSymbols.filter(
        (s): s is VariableSymbol =>
          (s.kind === SymbolKind.Field || s.kind === SymbolKind.Property) &&
          'type' in s &&
          s.modifiers?.isWebService === true,
      );

      for (const field of webserviceFields) {
        const fieldLocation: SymbolLocation = field.location || {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 0,
          },
        };
        const isDeprecated = hasDeprecatedAnnotation(field);

        if (field.type?.name) {
          const fieldTypeName = field.type.name.toLowerCase();
          let isFieldTypeDeprecated = deprecatedTypes.has(fieldTypeName);
          if (
            !isFieldTypeDeprecated &&
            options.tier === ValidationTier.THOROUGH &&
            options.allowArtifactLoading
          ) {
            isFieldTypeDeprecated = checkIfTypeIsDeprecated(
              fieldTypeName,
              symbolManager,
              deprecatedTypes,
            );
          }

          if (isFieldTypeDeprecated && !isDeprecated) {
            errors.push({
              message: localizeTyped(
                ErrorCodes.WEBSERVICE_DEPRECATE_IF_TYPE_DEPRECATED,
                field.name,
              ),
              location: fieldLocation,
              code: ErrorCodes.WEBSERVICE_DEPRECATE_IF_TYPE_DEPRECATED,
            });
          }
        }
      }

      yield* Effect.logDebug(
        `DeprecationValidator: checked ${globalMethods.length} global methods, ` +
          `${globalFields.length} global fields, ` +
          `${webserviceFields.length} webservice fields, ` +
          `found ${errors.length} violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
