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
import { localizeTyped } from '../../../i18n/messageInstance';
import { ErrorCodes } from '../../../generated/ErrorCodes';

/**
 * Validates that final variables are assigned exactly once.
 *
 * In Apex, the `final` modifier ensures that variables cannot be reassigned
 * after their initial assignment:
 * - Final fields: Must be assigned in declaration or constructor, cannot be reassigned
 * - Final local variables: Can only be assigned once
 * - Final parameters: Cannot be reassigned (they're assigned at call site)
 *
 * This validator checks that:
 * 1. Final variables are not assigned more than once
 * 2. Final parameters are never reassigned
 * 3. Assignments are tracked using SymbolReference with 'write' or 'readwrite' access
 *
 * Note: This is a simplified check based on symbol references. Full final
 * assignment tracking would require control flow analysis to ensure ALL
 * execution paths initialize final fields exactly once.
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error Messages:
 * - "Final variable '{name}' cannot be assigned more than once"
 * - "Final parameter '{name}' cannot be reassigned"
 *
 * @see SEMANTIC_SYMBOL_RULES.md:314-318
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Gap #8
 */

export const FinalAssignmentValidator: Validator = {
  id: 'final-assignment',
  name: 'Final Assignment Validator',
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

      // Filter to final variables/parameters/fields
      const finalSymbols = allSymbols.filter(
        (symbol) =>
          symbol.modifiers.isFinal &&
          (symbol.kind === SymbolKind.Variable ||
            symbol.kind === SymbolKind.Parameter ||
            symbol.kind === SymbolKind.Field),
      );

      // Track assignments to each final symbol
      const assignmentCounts = new Map<string, number>();

      // Get VARIABLE_DECLARATION references to identify declaration locations
      const declarationRefs = allReferences.filter(
        (ref) => ref.context === ReferenceContext.VARIABLE_DECLARATION,
      );

      // Count write/readwrite references to final symbols
      for (const reference of allReferences) {
        // Only count write or readwrite references
        if (reference.access !== 'write' && reference.access !== 'readwrite') {
          continue;
        }

        // Check if this reference is to a final symbol
        const referencedSymbol = reference.resolvedSymbolId
          ? finalSymbols.find((s) => s.id === reference.resolvedSymbolId)
          : null;

        if (referencedSymbol) {
          // Skip if this write reference is at the same location as a VARIABLE_DECLARATION
          // (this is the initialization in the declaration, not a reassignment)
          const isDeclarationInitialization = declarationRefs.some(
            (declRef) => {
              if (declRef.name !== reference.name) {
                return false;
              }
              const declLine = declRef.location.identifierRange.startLine;
              const declCol = declRef.location.identifierRange.startColumn;
              const refLine = reference.location.identifierRange.startLine;
              const refCol = reference.location.identifierRange.startColumn;
              // Same line and column means it's the declaration initialization
              return declLine === refLine && declCol === refCol;
            },
          );

          if (!isDeclarationInitialization) {
            const currentCount = assignmentCounts.get(referencedSymbol.id) || 0;
            assignmentCounts.set(referencedSymbol.id, currentCount + 1);
          }
        }
      }

      // Check each final symbol for violations
      for (const finalSymbol of finalSymbols) {
        const assignmentCount = assignmentCounts.get(finalSymbol.id) || 0;

        // Rule 1: Final parameters cannot be reassigned (0 assignments is OK, >0 is error)
        if (finalSymbol.kind === SymbolKind.Parameter && assignmentCount > 0) {
          const code = ErrorCodes.INVALID_FINAL_FIELD_ASSIGNMENT;
          errors.push({
            message: localizeTyped(code, finalSymbol.name),
            location: finalSymbol.location,
            code,
          });
        }

        // Rule 2: Final variables/fields cannot be assigned more than once
        // Note: We allow 0 assignments (might be assigned in declaration)
        // and 1 assignment (normal case), but >1 is an error
        if (
          (finalSymbol.kind === SymbolKind.Variable ||
            finalSymbol.kind === SymbolKind.Field) &&
          assignmentCount > 1
        ) {
          const code = ErrorCodes.INVALID_FINAL_FIELD_ASSIGNMENT;
          errors.push({
            message: localizeTyped(code, finalSymbol.name),
            location: finalSymbol.location,
            code,
          });
        }
      }

      yield* Effect.logDebug(
        `FinalAssignmentValidator: checked ${finalSymbols.length} final symbols, ` +
          `found ${errors.length} violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
