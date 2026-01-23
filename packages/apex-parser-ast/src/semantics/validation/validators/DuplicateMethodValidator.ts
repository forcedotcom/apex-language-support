/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { SymbolTable, ApexSymbol, MethodSymbol } from '../../../types/symbol';
import type {
  ValidationResult,
  ValidationErrorInfo,
  ValidationWarningInfo,
} from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';
import { areMethodSignaturesIdentical } from '../utils/methodSignatureUtils';

/**
 * Validates that no two methods have identical signatures within a class/interface.
 *
 * In Apex, method overloading is allowed (same name, different parameters).
 * However, having two methods with identical signatures (same name AND same parameters)
 * is invalid, even if the names differ only by case.
 *
 * This validator:
 * - Groups methods by their parent class/interface
 * - Checks for methods with identical signatures (name + parameter types)
 * - Reports duplicate method signatures
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error: "Duplicate method '{name}' in {parentType} '{parentName}' (identical signature)"
 *
 * @see SEMANTIC_SYMBOL_RULES.md:475-479
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Gap #4
 */
export const DuplicateMethodValidator: Validator = {
  id: 'duplicate-method',
  name: 'Duplicate Method Validator',
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

      // Filter to method symbols only (cast to MethodSymbol to access parameters)
      const methods = allSymbols.filter(
        (symbol) => symbol.kind === 'method',
      ) as MethodSymbol[];

      // Group methods by parent (class or interface)
      const methodsByParent = new Map<string, MethodSymbol[]>();
      for (const method of methods) {
        if (!method.parentId) {
          continue; // Skip methods without a parent (shouldn't happen in valid code)
        }

        if (!methodsByParent.has(method.parentId)) {
          methodsByParent.set(method.parentId, []);
        }
        methodsByParent.get(method.parentId)!.push(method);
      }

      // Check each parent for duplicate method signatures
      for (const [parentId, parentMethods] of methodsByParent) {
        const parent = allSymbols.find((s) => s.id === parentId);
        if (!parent) {
          continue;
        }

        // Compare each method with every other method for identical signatures
        for (let i = 0; i < parentMethods.length; i++) {
          for (let j = i + 1; j < parentMethods.length; j++) {
            const method1 = parentMethods[i];
            const method2 = parentMethods[j];

            if (
              areMethodSignaturesIdentical(method1, method2, options.tier)
            ) {
              const parentType = parent.kind === 'class' ? 'class' : 'interface';
              errors.push({
                message:
                  `Duplicate method '${method2.name}' in ${parentType} '${parent.name}' ` +
                  `(identical signature to '${method1.name}')`,
                location: method2.location,
                code: 'DUPLICATE_METHOD',
              });
            }
          }
        }
      }

      yield* Effect.logDebug(
        `DuplicateMethodValidator: checked ${methods.length} methods across ` +
          `${methodsByParent.size} types, found ${errors.length} violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
