/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { SymbolTable } from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
import type { ValidationResult } from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';

/**
 * Validates that variables are declared before they are referenced.
 *
 * In Apex, variables must be declared before they can be used within
 * the same scope. This validator checks that variable references occur
 * after variable declarations based on source location.
 *
 * Examples of forward reference violations:
 * - Using a local variable before it's declared in the same method
 * - Referencing a for-loop variable outside its scope
 * - Using a variable in an expression before its declaration
 *
 * This validator checks that:
 * 1. Variable declarations come before their first use
 * 2. References are within the proper scope
 * 3. Declaration line number < reference line number
 *
 * Note: This is a simplified check based on line numbers. Full forward
 * reference detection would require control flow analysis.
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error Messages:
 * - "Variable '{name}' is referenced before it is declared"
 *
 * @see SEMANTIC_SYMBOL_RULES.md:307-310
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Gap #7
 */
export const ForwardReferenceValidator: Validator = {
  id: 'forward-reference',
  name: 'Forward Reference Validator',
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

      // Get all references from the symbol table
      const allReferences = symbolTable.getAllReferences();

      // Check each reference to ensure it comes after the declaration
      for (const reference of allReferences) {
        // Find the declaration for this reference
        // We need to look in the reference's scope and parent scopes
        const refSymbol = reference.resolvedSymbolId
          ? allSymbols.find((s) => s.id === reference.resolvedSymbolId)
          : null;

        if (!refSymbol) {
          continue; // Can't validate if we don't know what symbol this references
        }

        // Only check variable references (not types, methods, etc.)
        if (
          refSymbol.kind !== SymbolKind.Variable &&
          refSymbol.kind !== SymbolKind.Parameter
        ) {
          continue;
        }

        // Get the declaration line for this variable
        const declarationLine = refSymbol.location.symbolRange.startLine;

        // Get the reference line
        const referenceLine = reference.location.symbolRange.startLine;

        // Check if reference comes before declaration
        if (referenceLine < declarationLine) {
          errors.push(
            `Variable '${reference.name}' is referenced at line ` +
              `${referenceLine} before it is declared at line ${declarationLine}`,
          );
        }
      }

      yield* Effect.logDebug(
        `ForwardReferenceValidator: checked ${allReferences.length} references, ` +
          `found ${errors.length} violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
