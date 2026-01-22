/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { SymbolTable, MethodSymbol } from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
import type { ValidationResult } from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';

/**
 * Validates that no two methods have equivalent signatures.
 *
 * In Apex, method signatures are determined by:
 * - Method name (case-insensitive)
 * - Parameter count
 * - Parameter types (after case-folding and type resolution)
 * - Return type is ignored for signature equivalence
 *
 * This validator checks for methods that would be ambiguous:
 * - `process(String s)` and `process(string s)` → Error (same signature)
 * - `process(String s)` and `process(Integer i)` → Valid (different types)
 *
 * This is a TIER 2 (THOROUGH) validation that requires type resolution.
 * In the current implementation, we perform lexical type comparison
 * (case-insensitive matching). Future enhancements will add:
 * - FQN resolution (CustomType vs myns.CustomType)
 * - Generic type erasure
 * - Collection type special handling
 *
 * Error Messages:
 * - "Method '{name}' has equivalent signature to method at line {line}"
 *
 * @see SEMANTIC_SYMBOL_RULES.md:265-286
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Gap #5
 */
export const MethodSignatureEquivalenceValidator: Validator = {
  id: 'method-signature-equivalence',
  name: 'Method Signature Equivalence Validator',
  tier: ValidationTier.THOROUGH,
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

      // Filter to method symbols only (not constructors)
      const methods = allSymbols.filter(
        (symbol) => symbol.kind === SymbolKind.Method,
      ) as MethodSymbol[];

      // Group methods by parent (class or interface)
      const methodsByParent = new Map<string, MethodSymbol[]>();
      for (const method of methods) {
        if (!method.parentId) {
          continue; // Skip methods without a parent
        }

        if (!methodsByParent.has(method.parentId)) {
          methodsByParent.set(method.parentId, []);
        }
        methodsByParent.get(method.parentId)!.push(method);
      }

      // Check each parent for methods with equivalent signatures
      for (const [parentId, parentMethods] of methodsByParent) {
        const parent = allSymbols.find((s) => s.id === parentId);
        if (!parent) {
          continue;
        }

        // Compare each method with every other method
        for (let i = 0; i < parentMethods.length; i++) {
          for (let j = i + 1; j < parentMethods.length; j++) {
            const method1 = parentMethods[i];
            const method2 = parentMethods[j];

            if (areSignaturesEquivalent(method1, method2)) {
              const parentType =
                parent.kind === SymbolKind.Class ? 'class' : 'interface';
              const line1 = method1.location.symbolRange.startLine;

              errors.push(
                `Method '${method2.name}' in ${parentType} '${parent.name}' ` +
                  `has equivalent signature to method '${method1.name}' ` +
                  `at line ${line1}`,
              );
            }
          }
        }
      }

      yield* Effect.logDebug(
        `MethodSignatureEquivalenceValidator: checked ${methods.length} ` +
          `methods across ${methodsByParent.size} types, ` +
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
 * Check if two methods have equivalent signatures.
 *
 * Signatures are equivalent if:
 * 1. Method names are equal (case-insensitive)
 * 2. Parameter counts are equal
 * 3. Parameter types are equal (case-insensitive for now)
 *
 * Note: This is a simplified check using lexical type comparison.
 * Future enhancements will add full type resolution.
 */
function areSignaturesEquivalent(
  method1: MethodSymbol,
  method2: MethodSymbol,
): boolean {
  // 1. Compare names (case-insensitive)
  if (method1.name.toLowerCase() !== method2.name.toLowerCase()) {
    return false;
  }

  // 2. Compare parameter counts
  if (method1.parameters.length !== method2.parameters.length) {
    return false;
  }

  // 3. Compare parameter types (case-insensitive)
  for (let i = 0; i < method1.parameters.length; i++) {
    const param1Type = method1.parameters[i].type.name.toLowerCase();
    const param2Type = method2.parameters[i].type.name.toLowerCase();

    if (param1Type !== param2Type) {
      return false;
    }
  }

  return true;
}
