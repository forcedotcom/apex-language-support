/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { SymbolTable } from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
import { ReferenceContext } from '../../../types/symbolReference';
import type {
  ValidationResult,
  ValidationErrorInfo,
  ValidationWarningInfo,
} from '../ValidationResult';
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
  prerequisites: {
    requiredDetailLevel: 'full',
    requiresReferences: true,
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

      // Get all references from the symbol table
      const allReferences = symbolTable.getAllReferences();

      // Check each reference to ensure it comes after the declaration
      for (const reference of allReferences) {
        // Skip VARIABLE_DECLARATION context - these are declarations, not usages
        if (reference.context === ReferenceContext.VARIABLE_DECLARATION) {
          continue;
        }

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

        // Get the declaration line for this variable (use identifierRange for precise location)
        const declarationLine = refSymbol.location.identifierRange.startLine;

        // Get the reference line (use identifierRange for precise location)
        const referenceLine = reference.location.identifierRange.startLine;

        // Check if reference comes before declaration
        // Note: If they're on the same line, we need to check columns too
        if (referenceLine < declarationLine) {
          errors.push({
            message: `Variable '${reference.name}' is referenced before it is declared`,
            location: reference.location,
            code: 'FORWARD_REFERENCE',
          });
        } else if (referenceLine === declarationLine) {
          // Same line - check columns to ensure reference doesn't come before declaration
          const declarationColumn =
            refSymbol.location.identifierRange.startColumn;
          const referenceColumn =
            reference.location.identifierRange.startColumn;

          // Only flag as error if reference column is before declaration column
          // (i.e., the reference appears to the left of the declaration on the same line)
          if (referenceColumn < declarationColumn) {
            errors.push({
              message: `Variable '${reference.name}' is referenced before it is declared`,
              location: reference.location,
              code: 'FORWARD_REFERENCE',
            });
          }
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
