/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { SymbolTable } from '../../../types/symbol';
import type {
  ValidationResult,
  ValidationErrorInfo,
  ValidationWarningInfo,
} from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';

/**
 * Validates abstract method body consistency.
 *
 * In Apex:
 * - Abstract methods MUST NOT have a body (only signature)
 * - Non-abstract methods in classes MUST have a body (implementation)
 * - Interface methods are implicitly abstract and don't need the abstract modifier
 *
 * This validator checks that:
 * 1. Methods marked as abstract don't have child block scopes (indicating no body)
 * 2. Methods in abstract classes follow proper abstract rules
 * 3. Interface methods are correctly defined
 *
 * Note: Full body presence detection requires AST-level analysis. This validator
 * performs symbol-table level checks by examining child scope relationships.
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error Messages:
 * - "Abstract method '{name}' must not have a body"
 * - "Non-abstract method '{name}' in class '{className}' must have a body"
 *
 * @see SEMANTIC_SYMBOL_RULES.md:176-182
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Gap #12
 */
export const AbstractMethodBodyValidator: Validator = {
  id: 'abstract-method-body',
  name: 'Abstract Method Body Validator',
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

      // Filter to method symbols only (not constructors)
      const methods = allSymbols.filter((symbol) => symbol.kind === 'method');

      // Check each method
      for (const method of methods) {
        const isAbstract = method.modifiers.isAbstract;

        // Find parent class/interface
        const parent = method.parentId
          ? allSymbols.find((s) => s.id === method.parentId)
          : null;

        if (!parent) {
          continue; // Skip orphaned methods
        }

        const isInInterface = parent.kind === 'interface';
        const isInConcreteClass =
          parent.kind === 'class' && !parent.modifiers.isAbstract;

        // Check for child block scopes (indicates method has body)
        const hasChildBlocks = allSymbols.some(
          (s) => s.parentId === method.id && s.kind === 'block',
        );

        // Rule 1: Abstract methods must not have a body
        if (isAbstract && hasChildBlocks) {
          errors.push({
            message:
              `Abstract method '${method.name}' in ${parent.kind} ` +
              `'${parent.name}' must not have a body`,
            location: method.location,
            code: 'ABSTRACT_METHOD_HAS_BODY',
          });
        }

        // Rule 2: Non-abstract methods in concrete classes must have a body
        // (We can only detect missing bodies if we have block scope information)
        if (
          isInConcreteClass &&
          !isAbstract &&
          !hasChildBlocks &&
          !method.modifiers.isBuiltIn
        ) {
          // Only warn for now, as symbol table may not capture block scopes
          warnings.push({
            message:
              `Non-abstract method '${method.name}' in class '${parent.name}' ` +
              'appears to lack a body (this may be a symbol table limitation)',
            location: method.location,
            code: 'MISSING_METHOD_BODY',
          });
        }

        // Rule 3: Abstract methods only in abstract classes or interfaces
        if (isAbstract && isInConcreteClass) {
          errors.push({
            message:
              `Abstract method '${method.name}' cannot be declared in ` +
              `non-abstract class '${parent.name}'`,
            location: method.location,
            code: 'ABSTRACT_IN_CONCRETE_CLASS',
          });
        }

        // Rule 4: Interface methods don't need abstract modifier (implicit)
        if (isInInterface && isAbstract) {
          warnings.push({
            message:
              `Method '${method.name}' in interface '${parent.name}' ` +
              "does not need 'abstract' modifier (it is implicit)",
            location: method.location,
            code: 'REDUNDANT_ABSTRACT_MODIFIER',
          });
        }
      }

      yield* Effect.logDebug(
        `AbstractMethodBodyValidator: checked ${methods.length} methods, ` +
          `found ${errors.length} violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
