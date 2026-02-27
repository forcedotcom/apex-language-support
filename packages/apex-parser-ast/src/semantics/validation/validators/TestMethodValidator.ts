/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type {
  SymbolTable,
  MethodSymbol,
  TypeSymbol,
} from '../../../types/symbol';
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
import { SymbolKind } from '../../../types/symbol';

/**
 * Helper to check if a method has @isTest annotation
 */
function hasIsTestAnnotation(method: MethodSymbol): boolean {
  // Check modifier first (parser converts @isTest to isTestMethod modifier)
  if (method.modifiers?.isTestMethod === true) {
    return true;
  }
  // Also check annotations directly
  return (
    method.annotations?.some((ann) => ann.name.toLowerCase() === 'istest') ||
    false
  );
}

/**
 * Helper to check if a method has @TestSetup annotation
 */
function hasTestSetupAnnotation(method: MethodSymbol): boolean {
  return (
    method.annotations?.some((ann) => ann.name.toLowerCase() === 'testsetup') ||
    false
  );
}

/**
 * Helper to check if a type extends Exception
 */
function extendsException(typeSymbol: TypeSymbol): boolean {
  // Check if the type extends Exception via superClass
  if (typeSymbol.superClass) {
    const superClassName = typeSymbol.superClass.toLowerCase();
    if (superClassName === 'exception') {
      return true;
    }
  }
  // Also check interfaces (though Exception is typically a superclass, not interface)
  if (typeSymbol.interfaces && typeSymbol.interfaces.length > 0) {
    return typeSymbol.interfaces.some(
      (ifaceName) => ifaceName.toLowerCase() === 'exception',
    );
  }
  return false;
}

/**
 * Helper to check if a return type is void
 */
function isVoidReturnType(method: MethodSymbol): boolean {
  const returnTypeName =
    method.returnType?.name?.toLowerCase() ||
    method.returnType?.originalTypeString?.toLowerCase() ||
    '';
  return returnTypeName === 'void';
}

/**
 * Validates test method and test class annotations.
 *
 * Rules:
 * - @isTest methods cannot have parameters
 * - @TestSetup methods cannot have parameters
 * - @TestSetup methods must return void
 * - Exception classes cannot be marked as test classes (@isTest)
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Phase 1.4
 */
export const TestMethodValidator: Validator = {
  id: 'test-method',
  name: 'Test Method Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 6, // Run after AnnotationPropertyValidator
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

      // Validate test methods
      const methods = allSymbols.filter(
        (symbol): symbol is MethodSymbol =>
          symbol.kind === SymbolKind.Method && 'parameters' in symbol,
      );

      for (const method of methods) {
        // Check @isTest methods
        if (hasIsTestAnnotation(method)) {
          const paramCount = method.parameters?.length || 0;
          if (paramCount > 0) {
            const code = ErrorCodes.TEST_METHOD_CANNOT_HAVE_PARAMS;
            errors.push({
              message: localizeTyped(code),
              location: method.location,
              code,
            });
          }
        }

        // Check @TestSetup methods
        if (hasTestSetupAnnotation(method)) {
          // Check parameters
          const paramCount = method.parameters?.length || 0;
          if (paramCount > 0) {
            const code = ErrorCodes.TEST_SETUP_CANNOT_HAVE_PARAMS;
            errors.push({
              message: localizeTyped(code),
              location: method.location,
              code,
            });
          }

          // Check return type
          if (!isVoidReturnType(method)) {
            const code = ErrorCodes.TEST_SETUP_MUST_RETURN_VOID;
            errors.push({
              message: localizeTyped(code),
              location: method.location,
              code,
            });
          }
        }
      }

      // Validate test classes (cannot be exception classes)
      const classes = allSymbols.filter(
        (symbol): symbol is TypeSymbol =>
          (symbol.kind === SymbolKind.Class ||
            symbol.kind === SymbolKind.Interface) &&
          'annotations' in symbol,
      );

      for (const classSymbol of classes) {
        // Check if class has @isTest annotation
        const hasIsTest =
          classSymbol.modifiers?.isTestMethod === true ||
          classSymbol.annotations?.some(
            (ann) => ann.name.toLowerCase() === 'istest',
          ) ||
          false;

        if (hasIsTest && extendsException(classSymbol)) {
          const code = ErrorCodes.TEST_CLASS_MUST_NOT_BE_EXCEPTION;
          errors.push({
            message: localizeTyped(code),
            location: classSymbol.location,
            code,
          });
        }
      }

      yield* Effect.logDebug(
        `TestMethodValidator: checked ${methods.length} methods and ${classes.length} classes, ` +
          `found ${errors.length} test method violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
