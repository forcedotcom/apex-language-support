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
  ApexSymbol,
  TypeSymbol,
  MethodSymbol,
} from '../../../types/symbol';
import { SymbolKind, SymbolVisibility } from '../../../types/symbol';
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
 * Check if a method has @TestSetup annotation
 */
function hasTestSetupAnnotation(method: MethodSymbol): boolean {
  return (
    method.annotations?.some((ann) => ann.name.toLowerCase() === 'testsetup') ||
    false
  );
}

/**
 * Find the containing class for a method
 */
function findContainingClass(
  method: MethodSymbol,
  allSymbols: ApexSymbol[],
): TypeSymbol | null {
  // Methods can have parentId pointing to class block or class symbol
  let current: ApexSymbol | null = method;

  while (current) {
    if (current.kind === SymbolKind.Class) {
      return current as TypeSymbol;
    }

    if (current.parentId) {
      const parent = allSymbols.find((s) => s.id === current!.parentId);
      if (parent && parent.kind === SymbolKind.Class) {
        return parent as TypeSymbol;
      }
      // If parent is a block, check its parent
      if (parent && parent.kind === SymbolKind.Block && parent.parentId) {
        const grandParent = allSymbols.find((s) => s.id === parent!.parentId);
        if (grandParent && grandParent.kind === SymbolKind.Class) {
          return grandParent as TypeSymbol;
        }
      }
      current = parent ?? null;
    } else {
      break;
    }
  }

  return null;
}

/**
 * Validates method modifier restrictions.
 *
 * Rules:
 * - Protected methods cannot be defined in non-virtual classes
 * - Some methods (like @TestSetup) can only appear once per class
 * - Some methods cannot have parameters (handled by other validators, but included for completeness)
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 */
export const MethodModifierRestrictionValidator: Validator = {
  id: 'method-modifier-restriction',
  name: 'Method Modifier Restriction Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 12, // Run after AbstractMethodImplementationValidator
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

      const allSymbols = symbolTable.getAllSymbols();

      // Get all methods
      const methods = allSymbols.filter(
        (symbol): symbol is MethodSymbol =>
          symbol.kind === SymbolKind.Method && 'parameters' in symbol,
      );

      // Group methods by containing class
      const methodsByClass = new Map<TypeSymbol, MethodSymbol[]>();
      for (const method of methods) {
        const containingClass = findContainingClass(method, allSymbols);
        if (containingClass) {
          if (!methodsByClass.has(containingClass)) {
            methodsByClass.set(containingClass, []);
          }
          methodsByClass.get(containingClass)!.push(method);
        }
      }

      // Check each class
      for (const [classSymbol, classMethods] of methodsByClass) {
        // Check 1: INVALID_NEW_PROTECTED_METHOD - Protected methods cannot be defined in non-virtual classes
        for (const method of classMethods) {
          const isProtected =
            method.modifiers?.visibility === SymbolVisibility.Protected;
          const isVirtual = classSymbol.modifiers?.isVirtual || false;
          const isAbstract = classSymbol.modifiers?.isAbstract || false;

          if (isProtected && !isVirtual && !isAbstract) {
            errors.push({
              message: localizeTyped(ErrorCodes.INVALID_NEW_PROTECTED_METHOD),
              location: method.location,
              code: ErrorCodes.INVALID_NEW_PROTECTED_METHOD,
            });
          }
        }

        // Check 2: INVALID_MULTIPLE_METHODS_WITH_MODIFIER - Only one @TestSetup method per class
        const testSetupMethods = classMethods.filter((m) =>
          hasTestSetupAnnotation(m),
        );
        if (testSetupMethods.length > 1) {
          // Report error for all but the first one
          for (let i = 1; i < testSetupMethods.length; i++) {
            const method = testSetupMethods[i];
            errors.push({
              message: localizeTyped(
                ErrorCodes.INVALID_MULTIPLE_METHODS_WITH_MODIFIER,
                '@TestSetup',
              ),
              location: method.location,
              code: ErrorCodes.INVALID_MULTIPLE_METHODS_WITH_MODIFIER,
            });
          }
        }

        // Check 3: INVALID_METHOD_WITH_PARAMETERS - Some methods cannot have parameters
        // Note: Test methods and TestSetup methods are already handled by TestMethodValidator
        // This check is for other method types that might have parameter restrictions
        // For now, we'll focus on the ones we know about
        // Additional method types with parameter restrictions can be added here
      }

      yield* Effect.logDebug(
        `MethodModifierRestrictionValidator: checked ${methods.length} methods, ` +
          `found ${errors.length} modifier restriction violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
