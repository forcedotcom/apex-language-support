/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { SymbolTable, TypeSymbol } from '../../../types/symbol';
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
 * Validates that types (classes and interfaces) do not reference themselves.
 *
 * In Apex, a class cannot extend itself, and an interface cannot extend itself.
 * This validator checks for direct self-reference only (not transitive circular dependencies).
 *
 * Examples of invalid code:
 * - `class Foo extends Foo { }` - class extending itself
 * - `interface Bar extends Bar { }` - interface extending itself
 * - `class Baz implements Baz { }` - class implementing itself as an interface
 *
 * This validator performs simple string comparisons (case-insensitive) and does
 * not require external type resolution. Transitive circular dependencies are
 * detected by InterfaceHierarchyValidator (Gap #9, TIER 2).
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error Messages:
 * - "Class '{name}' cannot extend itself"
 * - "Interface '{name}' cannot extend itself"
 * - "Class '{name}' cannot implement itself"
 *
 * @see SEMANTIC_SYMBOL_RULES.md:137-140
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Gap #10
 */
export const TypeSelfReferenceValidator: Validator = {
  id: 'type-self-reference',
  name: 'Type Self-Reference Validator',
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

      // Filter to classes and interfaces
      const types = allSymbols.filter(
        (symbol) => symbol.kind === 'class' || symbol.kind === 'interface',
      );

      // Check each type for self-reference
      for (const type of types) {
        // Cast to TypeSymbol to access superClass and interfaces
        const typeSymbol = type as TypeSymbol;
        const typeName = typeSymbol.name.toLowerCase();

        // Check if class extends itself
        if (typeSymbol.kind === 'class' && typeSymbol.superClass) {
          const superClassName = typeSymbol.superClass.toLowerCase();
          if (superClassName === typeName) {
            const code = ErrorCodes.CIRCULAR_DEFINITION;
            errors.push({
              message: localizeTyped(code, typeSymbol.name),
              location: typeSymbol.location,
              code,
            });
          }
        }

        // Check if interface extends itself
        if (
          typeSymbol.kind === 'interface' &&
          typeSymbol.interfaces &&
          typeSymbol.interfaces.length > 0
        ) {
          for (const extendedInterface of typeSymbol.interfaces) {
            const extendedName = extendedInterface.toLowerCase();
            if (extendedName === typeName) {
              const code = ErrorCodes.CIRCULAR_DEFINITION;
              errors.push({
                message: localizeTyped(code, typeSymbol.name),
                location: typeSymbol.location,
                code,
              });
              break; // Only report once per interface
            }
          }
        }

        // Check if class implements itself
        if (
          typeSymbol.kind === 'class' &&
          typeSymbol.interfaces &&
          typeSymbol.interfaces.length > 0
        ) {
          for (const implementedInterface of typeSymbol.interfaces) {
            const implementedName = implementedInterface.toLowerCase();
            if (implementedName === typeName) {
              const code = ErrorCodes.CIRCULAR_DEFINITION;
              errors.push({
                message: localizeTyped(code, typeSymbol.name),
                location: typeSymbol.location,
                code,
              });
              break; // Only report once per class
            }
          }
        }
      }

      yield* Effect.logDebug(
        `TypeSelfReferenceValidator: checked ${types.length} types, ` +
          `found ${errors.length} violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
