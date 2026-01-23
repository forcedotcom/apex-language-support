/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { SymbolTable, ApexSymbol } from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
import type {
  ValidationResult,
  ValidationErrorInfo,
  ValidationWarningInfo,
} from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';
import { IdentifierValidator } from '../IdentifierValidator';

/**
 * Validates that enum constants follow proper naming conventions.
 *
 * Enum constants must follow the same naming rules as variable identifiers:
 * - Valid characters (letters, digits, underscores)
 * - Not reserved names (unless in specific contexts)
 * - Length constraints
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error: "Invalid character in identifier: {name}" or
 *        "Identifier name is reserved: {name}" or
 *        "Identifier '{name}' exceeds maximum length of {max}"
 *
 * @see SEMANTIC_SYMBOL_RULES.md:445-449
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Gap #3
 */
export const EnumConstantNamingValidator: Validator = {
  id: 'enum-constant-naming',
  name: 'Enum Constant Naming Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 1,

  validate: (
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError> =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      // Get all symbols from the table
      const allSymbols = symbolTable.getAllSymbols();

      // Filter to enum constants (enumValue kind)
      const enumConstants = allSymbols.filter(
        (symbol) => symbol.kind === 'enumValue',
      );

      // Validate each enum constant name
      for (const constant of enumConstants) {
        // Use IdentifierValidator to check naming rules
        // Enum constants follow variable identifier rules but are allowed to use keywords
        // since they exist in the enum's namespace
        const validationResult = IdentifierValidator.validateIdentifier(
          constant.name,
          SymbolKind.Method, // Use Method kind to allow reserved words/keywords
          false, // Not top-level
          {
            supportsLongIdentifiers: false,
            version: 1,
            isFileBased: true,
          },
        );

        if (!validationResult.isValid) {
          // Add parent enum name to the error for better context
          const parentEnum = findParentEnum(constant, allSymbols);
          const enumName = parentEnum ? parentEnum.name : 'unknown';

          for (const error of validationResult.errors) {
            const errorMessage =
              typeof error === 'string' ? error : error.message;
            errors.push({
              message: `Enum '${enumName}' constant '${constant.name}': ${errorMessage}`,
              location: constant.location,
              code: 'INVALID_ENUM_CONSTANT_NAME',
            });
          }
        }

        // Add warnings if any
        for (const warning of validationResult.warnings) {
          const parentEnum = findParentEnum(constant, allSymbols);
          const enumName = parentEnum ? parentEnum.name : 'unknown';
          const warningMessage =
            typeof warning === 'string' ? warning : warning.message;
          warnings.push({
            message: `Enum '${enumName}' constant '${constant.name}': ${warningMessage}`,
            location: constant.location,
            code: 'ENUM_CONSTANT_NAMING_WARNING',
          });
        }
      }

      yield* Effect.logDebug(
        `EnumConstantNamingValidator: checked ${enumConstants.length} enum constants, ` +
          `found ${errors.length} violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};

/**
 * Find the parent enum for an enum constant symbol.
 */
function findParentEnum(
  constantSymbol: ApexSymbol,
  allSymbols: ApexSymbol[],
): ApexSymbol | null {
  if (!constantSymbol.parentId) {
    return null;
  }

  const parentEnum = allSymbols.find(
    (symbol) => symbol.id === constantSymbol.parentId && symbol.kind === 'enum',
  );

  return parentEnum || null;
}
