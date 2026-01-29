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
import { ErrorCodes } from '../ErrorCodes';
import { I18nSupport } from '../../../i18n/I18nSupport';

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
      const methods = allSymbols.filter((symbol) => symbol.kind === 'method');

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

        const isInInterface = parent.kind === 'interface';
        const isInConcreteClass =
          parent.kind === 'class' && !parent.modifiers.isAbstract;

        // Check for child block scopes (indicates method has body)
        // Method blocks are created for scope tracking even for abstract methods
        // We need to check if there are content blocks (statement blocks, etc.) inside the method
        // OR if the method block itself has children (indicating body content)
        const childBlocks = allSymbols.filter(
          (s) => s.parentId === method.id && s.kind === 'block',
        );

        // Find the method's own scope block
        const methodBlock = childBlocks.find(
          (block) => (block as any).scopeType === 'method',
        );

        // Check if method block has children (indicating body content)
        let hasBodyContent = false;
        if (methodBlock) {
          // Check if method block has any child blocks (statements, etc.)
          const methodBlockChildren = allSymbols.filter(
            (s) => s.parentId === methodBlock.id && s.kind === 'block',
          );
          hasBodyContent = methodBlockChildren.length > 0;
        }

        // Also check for content blocks directly under the method (not under method block)
        const contentBlocks = childBlocks.filter(
          (block) => (block as any).scopeType !== 'method',
        );

        // For abstract methods: any content blocks OR body content in method block indicates a body (invalid)
        // For non-abstract methods: content blocks are expected (method has body)
        const hasChildBlocks = contentBlocks.length > 0 || hasBodyContent;

        // Rule 1: Abstract methods must not have a body
        if (isAbstract && hasChildBlocks) {
          errors.push({
            message: I18nSupport.getLabel(
              ErrorCodes.ABSTRACT_METHOD_HAS_BODY,
              method.name,
            ),
            location: method.location,
            code: ErrorCodes.ABSTRACT_METHOD_HAS_BODY,
          });
        }

        // Rule 2: Non-abstract methods in concrete classes must have a body
        // NOTE: Disabled because symbol-table-based detection produces too many false positives.
        // Simple methods (with just a return statement) may not create detectable child blocks.
        // Full AST analysis would be required for reliable detection.
        // TODO: Implement AST-based body detection using cached parse tree from ValidationOptions
        // The parse tree is now available via enrichment, allowing reliable detection via:
        // - Check if MethodDeclarationContext has block() child node
        // - Interface methods (InterfaceMethodDeclarationContext) never have bodies
        // if (
        //   isInConcreteClass &&
        //   !isAbstract &&
        //   !hasChildBlocks &&
        //   !method.modifiers.isBuiltIn
        // ) {
        //   warnings.push({
        //     message:
        //       `Non-abstract method '${method.name}' in class '${parent.name}' ` +
        //       'appears to lack a body (this may be a symbol table limitation)',
        //     location: method.location,
        //     code: 'MISSING_METHOD_BODY',
        //   });
        // }

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
