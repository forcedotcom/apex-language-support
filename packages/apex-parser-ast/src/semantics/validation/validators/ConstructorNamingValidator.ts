/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { SymbolTable } from '../../../types/symbol';
import type { ValidationResult } from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';

/**
 * Validates that constructor names match their containing class name.
 *
 * In Apex, a constructor must have the same name as the class that contains it.
 * The comparison is case-insensitive since Apex is case-insensitive.
 *
 * This validator:
 * - Finds all constructor symbols
 * - Looks up each constructor's parent class
 * - Compares constructor name to class name (case-insensitive)
 * - Reports errors when names don't match
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error: "Constructor name '{constructorName}' must match class name '{className}' (case-insensitive)"
 *
 * @see SEMANTIC_SYMBOL_RULES.md:161-163
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Gap #11
 */
export class ConstructorNamingValidator implements Validator {
  readonly id = 'constructor-naming';
  readonly name = 'Constructor Naming Validator';
  readonly tier = ValidationTier.IMMEDIATE;
  readonly priority = 1;

  validate(
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError> {
    return Effect.gen(function* () {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Get all symbols from the table
      const allSymbols = symbolTable.getAllSymbols();

      // Filter to constructor symbols only
      const constructors = allSymbols.filter(
        (symbol) => symbol.kind === 'constructor',
      );

      // Validate each constructor
      for (const constructor of constructors) {
        if (!constructor.parentId) {
          // Constructor without parent shouldn't happen in valid code, skip
          continue;
        }

        // Find parent class
        const parentClass = allSymbols.find(
          (s) => s.id === constructor.parentId && s.kind === 'class',
        );

        if (!parentClass) {
          // No parent class found - could be in an interface or other invalid context
          warnings.push(
            `Constructor '${constructor.name}' found without a parent class`,
          );
          continue;
        }

        // Compare names (case-insensitive)
        const constructorNameLower = constructor.name.toLowerCase();
        const classNameLower = parentClass.name.toLowerCase();

        if (constructorNameLower !== classNameLower) {
          errors.push(
            `Constructor name '${constructor.name}' must match class name '${parentClass.name}' (case-insensitive)`,
          );
        }
      }

      yield* Effect.logDebug(
        `ConstructorNamingValidator: checked ${constructors.length} constructors, ` +
          `found ${errors.length} violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    });
  }
}
