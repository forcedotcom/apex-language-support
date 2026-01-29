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
  ApexSymbol,
  EnumSymbol,
} from '../../../types/symbol';
import type {
  ValidationResult,
  ValidationErrorInfo,
  ValidationWarningInfo,
} from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';
import { ErrorCodes } from '../ErrorCodes';
import { I18nSupport } from '../../../i18n/I18nSupport';

/**
 * Maximum number of constants allowed in an enum
 * Per Apex Jorje semantic rules: SEMANTIC_SYMBOL_RULES.md:378
 */
const MAX_ENUM_CONSTANTS = 100;

/**
 * Validates that enums do not exceed the constant limit.
 *
 * Apex enforces a maximum of 100 constants per enum.
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error: "Enum '{name}' has {count} constants, but the maximum is 100"
 *
 * @see SEMANTIC_SYMBOL_RULES.md:378
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Gap #2
 */
export const EnumLimitValidator: Validator = {
  id: 'enum-limit',
  name: 'Enum Constant Limit Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 1,
  prerequisites: {
    requiredDetailLevel: 'public-api',
    requiresReferences: false,
    requiresCrossFileResolution: false,
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

      // Filter to enums
      const enums = allSymbols.filter((symbol) => symbol.kind === 'enum');

      // Check constant count for each enum
      for (const enumSymbol of enums) {
        // EnumSymbol has a values property - use that if available
        let constantCount = 0;
        if (
          'values' in enumSymbol &&
          Array.isArray((enumSymbol as EnumSymbol).values)
        ) {
          constantCount = (enumSymbol as EnumSymbol).values.length;
        }

        // Fallback: count child enumValue symbols if values property not available
        if (constantCount === 0) {
          constantCount = countEnumConstants(enumSymbol, allSymbols);
        }

        if (constantCount > MAX_ENUM_CONSTANTS) {
          errors.push({
            message: I18nSupport.getLabel(
              ErrorCodes.ENUM_LIMIT_EXCEEDED,
              MAX_ENUM_CONSTANTS,
            ),
            location: enumSymbol.location,
            code: ErrorCodes.ENUM_LIMIT_EXCEEDED,
          });
        }
      }

      yield* Effect.logDebug(
        `EnumLimitValidator: checked ${enums.length} enums, ` +
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
 * Count the number of enum constants for an enum symbol.
 * Enum constants are child symbols with kind 'enumValue'.
 */
function countEnumConstants(
  enumSymbol: ApexSymbol,
  allSymbols: ApexSymbol[],
): number {
  // Find children with kind 'enumValue'
  const constants = allSymbols.filter(
    (symbol) =>
      symbol.parentId === enumSymbol.id && symbol.kind === 'enumValue',
  );
  return constants.length;
}
