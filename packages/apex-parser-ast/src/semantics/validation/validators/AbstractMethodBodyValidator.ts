/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { SymbolTable, MethodSymbol } from '../../../types/symbol';
import { isMethodSymbol } from '../../../utils/symbolNarrowing';
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
 * Validates abstract method body consistency.
 *
 * In Apex:
 * - Abstract methods MUST NOT have a body (only signature)
 * - Non-abstract methods in classes MUST have a body (implementation)
 * - Interface methods are implicitly abstract and don't need the abstract modifier
 *
 * This validator checks that:
 * 1. Methods marked as abstract don't have a body
 * 2. Non-abstract methods in concrete classes have a body
 * 3. Abstract methods are only in abstract classes or interfaces
 *
 * Body detection uses the hasBody property set during parsing, which checks
 * if MethodDeclarationContext has a block() child node.
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
  prerequisites: {
    requiredDetailLevel: 'full',
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

      // Filter to method symbols only (not constructors)
      const methods = allSymbols.filter(
        (symbol): symbol is MethodSymbol =>
          symbol.kind === 'method' && isMethodSymbol(symbol),
      );

      // Check each method
      for (const method of methods) {
        const isAbstract = method.modifiers.isAbstract;

        // Find parent class/interface
        // Methods may have parentId pointing to class block or class itself
        // Find class block first (if it exists)
        const classBlock = allSymbols.find(
          (s) =>
            s.kind === 'block' &&
            s.parentId === method.parentId &&
            (s as any).scopeType === 'class',
        );
        const classBlockId = classBlock?.id;

        // Find parent by checking both method.parentId and class block parentId
        let parent = method.parentId
          ? allSymbols.find((s) => s.id === method.parentId)
          : null;

        // If parent is a block, find the actual class/interface
        if (parent && parent.kind === 'block' && parent.parentId) {
          parent = allSymbols.find((s) => s.id === parent!.parentId) || null;
        }

        // Also check if method.parentId points to a class block directly
        if (!parent && classBlockId) {
          parent = allSymbols.find((s) => s.id === classBlockId) || null;
          if (parent && parent.kind === 'block' && parent.parentId) {
            parent = allSymbols.find((s) => s.id === parent!.parentId) || null;
          }
        }

        if (!parent) {
          continue; // Skip orphaned methods
        }

        const isInConcreteClass =
          parent.kind === 'class' && !parent.modifiers.isAbstract;

        // Use hasBody property set during parsing (checks MethodDeclarationContext.block())
        // If hasBody is undefined, fall back to checking child blocks for backward compatibility
        const hasBody =
          method.hasBody !== undefined
            ? method.hasBody
            : // Fallback: check for child blocks (for symbols created before hasBody was added)
              (() => {
                const childBlocks = allSymbols.filter(
                  (s) => s.parentId === method.id && s.kind === 'block',
                );
                const methodBlock = childBlocks.find(
                  (block) => (block as any).scopeType === 'method',
                );
                if (methodBlock) {
                  const methodBlockChildren = allSymbols.filter(
                    (s) => s.parentId === methodBlock.id && s.kind === 'block',
                  );
                  return methodBlockChildren.length > 0;
                }
                return false;
              })();

        // Rule 1: Abstract methods must not have a body
        if (isAbstract && hasBody) {
          const code = ErrorCodes.ABSTRACT_METHODS_CANNOT_HAVE_BODY;
          errors.push({
            message: localizeTyped(code),
            location: method.location,
            code,
          });
        }

        // Rule 2: Non-abstract methods in concrete classes must have a body
        if (isInConcreteClass && !isAbstract && !hasBody) {
          const code = ErrorCodes.METHOD_MUST_HAVE_BODY;
          errors.push({
            message: localizeTyped(code),
            location: method.location,
            code,
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
        // NOTE: This check is removed because interface methods are always implicitly abstract
        // and the abstract keyword is not allowed on interface methods anyway (validated by
        // MethodModifierValidator.validateInterfaceMethodModifiers). Checking isAbstract
        // here would always be true for interface methods, causing false positives.
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
