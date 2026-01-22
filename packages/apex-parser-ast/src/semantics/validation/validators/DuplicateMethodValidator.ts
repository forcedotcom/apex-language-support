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
 * Validates that no two methods have the same name (case-insensitive) within a class/interface.
 *
 * In Apex, method names are case-insensitive. Having two methods with the same name
 * after case-folding (e.g., `doWork()` and `DoWork()`) is invalid.
 *
 * This validator:
 * - Groups methods by their parent class/interface
 * - Checks for duplicate names (case-insensitive) within each parent
 * - Reports all duplicate method occurrences
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error: "Duplicate method '{name}' in {parentType} '{parentName}' (case-insensitive)"
 *
 * @see SEMANTIC_SYMBOL_RULES.md:475-479
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Gap #4
 */
export class DuplicateMethodValidator implements Validator {
  readonly id = 'duplicate-method';
  readonly name = 'Duplicate Method Validator';
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

      // Filter to method symbols only
      const methods = allSymbols.filter((symbol) => symbol.kind === 'method');

      // Group methods by parent (class or interface)
      const methodsByParent = new Map<string, ApexSymbol[]>();
      for (const method of methods) {
        if (!method.parentId) {
          continue; // Skip methods without a parent (shouldn't happen in valid code)
        }

        if (!methodsByParent.has(method.parentId)) {
          methodsByParent.set(method.parentId, []);
        }
        methodsByParent.get(method.parentId)!.push(method);
      }

      // Check each parent for duplicate method names
      for (const [parentId, parentMethods] of methodsByParent) {
        const parent = allSymbols.find((s) => s.id === parentId);
        if (!parent) {
          continue;
        }

        // Group methods by case-insensitive name
        const methodNameMap = new Map<string, ApexSymbol[]>();
        for (const method of parentMethods) {
          const lowerName = method.name.toLowerCase();
          if (!methodNameMap.has(lowerName)) {
            methodNameMap.set(lowerName, []);
          }
          methodNameMap.get(lowerName)!.push(method);
        }

        // Report duplicates
        for (const [_lowerName, methodList] of methodNameMap) {
          if (methodList.length > 1) {
            // Report all occurrences (not just the duplicates)
            const parentType = parent.kind === 'class' ? 'class' : 'interface';
            for (let i = 1; i < methodList.length; i++) {
              const duplicateMethod = methodList[i];
              const firstMethod = methodList[0];
              const firstLine = firstMethod.location.symbolRange.startLine;
              errors.push(
                `Duplicate method '${duplicateMethod.name}' in ` +
                  `${parentType} '${parent.name}' (case-insensitive ` +
                  `match with '${firstMethod.name}' at line ${firstLine})`,
              );
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
    });
  }
}
