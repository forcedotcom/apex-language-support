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
  VariableSymbol,
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
 * Helper to check if a method has @AuraEnabled annotation
 */
function hasAuraEnabledAnnotation(method: MethodSymbol): boolean {
  return (
    method.annotations?.some(
      (ann) => ann.name.toLowerCase() === 'auraenabled',
    ) || false
  );
}

/**
 * Validates @AuraEnabled method and property restrictions.
 *
 * Rules:
 * - Non-static @AuraEnabled methods cannot have parameters
 * - Non-static @AuraEnabled methods must begin with "get" prefix
 * - @AuraEnabled methods cannot be overloaded (same name, different parameters)
 * - @AuraEnabled methods and fields/properties cannot have the same name
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Phase 1.5
 */
export const AuraEnabledValidator: Validator = {
  id: 'aura-enabled',
  name: 'Aura Enabled Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 7, // Run after TestMethodValidator
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

      // Get all @AuraEnabled methods
      const auraMethods: MethodSymbol[] = [];
      for (const symbol of allSymbols) {
        if (
          symbol.kind === SymbolKind.Method &&
          'parameters' in symbol &&
          'returnType' in symbol
        ) {
          const method = symbol as MethodSymbol;
          if (hasAuraEnabledAnnotation(method)) {
            auraMethods.push(method);
          }
        }
      }

      // Get all @AuraEnabled fields/properties
      // Note: @AuraEnabled is valid on Properties, but fields can also have annotations
      const auraFields: VariableSymbol[] = [];
      for (const symbol of allSymbols) {
        if (
          (symbol.kind === SymbolKind.Field ||
            symbol.kind === SymbolKind.Property) &&
          'type' in symbol
        ) {
          const field = symbol as VariableSymbol;
          // Check annotations directly from ApexSymbol
          const hasAuraEnabled =
            field.annotations?.some(
              (ann) => ann.name.toLowerCase() === 'auraenabled',
            ) || false;
          if (hasAuraEnabled) {
            auraFields.push(field);
          }
        }
      }

      // Group methods by parent class
      const methodsByParent = new Map<string, MethodSymbol[]>();
      for (const method of auraMethods) {
        if (!method.parentId) {
          continue;
        }
        if (!methodsByParent.has(method.parentId)) {
          methodsByParent.set(method.parentId, []);
        }
        methodsByParent.get(method.parentId)!.push(method);
      }

      // Validate each parent class
      for (const [parentId, parentMethods] of methodsByParent) {
        const parent = allSymbols.find((s) => s.id === parentId);
        if (!parent) {
          continue;
        }

        // Get fields/properties in the same parent
        const parentFields = auraFields.filter(
          (field) => field.parentId === parentId,
        );

        // Check for duplicate method/field names
        // For methods starting with "get", compare the name after removing "get" prefix
        for (const method of parentMethods) {
          const methodName = method.name.toLowerCase();
          // If method starts with "get", strip it for comparison
          const methodNameForComparison = methodName.startsWith('get')
            ? methodName.substring(3) // Remove "get" prefix
            : methodName;

          const conflictingField = parentFields.find((field) => {
            const fieldName = field.name.toLowerCase();
            // Check if field name matches method name (with or without "get" prefix)
            return (
              fieldName === methodNameForComparison || fieldName === methodName
            );
          });

          if (conflictingField) {
            const code = ErrorCodes.AURA_DUPLICATE_METHOD_FIELD;
            errors.push({
              message: localizeTyped(code, method.name),
              location: method.location,
              code,
            });
          }
        }

        // Check for method overloading (same name, different parameters)
        const methodsByName = new Map<string, MethodSymbol[]>();
        for (const method of parentMethods) {
          const nameKey = method.name.toLowerCase();
          if (!methodsByName.has(nameKey)) {
            methodsByName.set(nameKey, []);
          }
          methodsByName.get(nameKey)!.push(method);
        }

        for (const methodsWithSameName of methodsByName.values()) {
          if (methodsWithSameName.length > 1) {
            // Multiple methods with same name = overloaded
            // Report error for all but the first one
            for (let i = 1; i < methodsWithSameName.length; i++) {
              const method = methodsWithSameName[i];
              const code = ErrorCodes.AURA_OVERLOADED_METHOD;
              errors.push({
                message: localizeTyped(code, method.name),
                location: method.location,
                code,
              });
            }
          }
        }

        // Validate non-static method restrictions
        for (const method of parentMethods) {
          const isStatic = method.modifiers?.isStatic || false;

          if (!isStatic) {
            // Check parameters
            const paramCount = method.parameters?.length || 0;
            if (paramCount > 0) {
              const code = ErrorCodes.NON_STATIC_AURA_METHOD_CANNOT_HAVE_PARAMS;
              errors.push({
                message: localizeTyped(code),
                location: method.location,
                code,
              });
            }

            // Check naming convention (must begin with "get")
            const methodName = method.name;
            if (!methodName.toLowerCase().startsWith('get')) {
              const code =
                ErrorCodes.NON_STATIC_AURA_METHOD_MUST_BEGIN_WITH_GET;
              errors.push({
                message: localizeTyped(code),
                location: method.location,
                code,
              });
            }
          }
        }
      }

      yield* Effect.logDebug(
        `AuraEnabledValidator: checked ${auraMethods.length} methods and ${auraFields.length} fields, ` +
          `found ${errors.length} AuraEnabled violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
