/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { SymbolTable, ApexSymbol } from '../../../types/symbol';
import type { ValidationResult } from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';

/**
 * Maximum number of parameters allowed for methods and constructors
 * Per Apex Jorje semantic rules: SEMANTIC_SYMBOL_RULES.md:167
 */
const MAX_PARAMETERS = 32;

/**
 * Validates that methods and constructors do not exceed the parameter limit.
 *
 * Apex enforces a maximum of 32 parameters for methods and constructors.
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error: "Method '{name}' has {count} parameters, but the maximum is 32"
 *
 * @see SEMANTIC_SYMBOL_RULES.md:167
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Gap #1
 */
export const ParameterLimitValidator: Validator = {
  id: 'parameter-limit',
  name: 'Method Parameter Limit Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 1,

  validate: (
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError> =>
    Effect.gen(function* () {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Get all symbols from the table
      const allSymbols = symbolTable.getAllSymbols();

      // Filter to methods and constructors
      const methodsAndConstructors = allSymbols.filter(
        (symbol) => symbol.kind === 'method' || symbol.kind === 'constructor',
      );

      // Check parameter count for each
      for (const symbol of methodsAndConstructors) {
        const parameterCount = countParameters(symbol, allSymbols);

        if (parameterCount > MAX_PARAMETERS) {
          const kindLabel =
            symbol.kind === 'constructor' ? 'Constructor' : 'Method';
          errors.push(
            `${kindLabel} '${symbol.name}' has ${parameterCount} parameters, ` +
              `but the maximum is ${MAX_PARAMETERS}`,
          );
        }
      }

      yield* Effect.logDebug(
        `ParameterLimitValidator: checked ${methodsAndConstructors.length} methods/constructors, ` +
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
 * Count the number of parameters for a method or constructor symbol.
 * Parameters are child symbols with kind 'parameter'.
 */
function countParameters(
  methodSymbol: ApexSymbol,
  allSymbols: ApexSymbol[],
): number {
  // Find children with kind 'parameter'
  const parameters = allSymbols.filter(
    (symbol) =>
      symbol.parentId === methodSymbol.id && symbol.kind === 'parameter',
  );
  return parameters.length;
}
