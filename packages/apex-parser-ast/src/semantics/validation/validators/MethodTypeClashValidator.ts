/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { SymbolTable, MethodSymbol } from '../../../types/symbol';
import type {
  ValidationResult,
  ValidationErrorInfo,
  ValidationWarningInfo,
} from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';
import { areMethodSignaturesIdentical } from '../utils/methodSignatureUtils';
import { localizeTyped } from '../../../i18n/messageInstance';
import { ErrorCodes } from '../../../generated/ErrorCodes';

/**
 * Validates that no two methods have identical signatures but different return types.
 *
 * In Apex, method overloading is allowed (same name, different parameters).
 * However, having two methods with identical signatures (name + parameter types)
 * but different return types is invalid - this creates ambiguity.
 *
 * This validator:
 * - Groups methods by their parent class/interface
 * - Checks for methods with identical signatures (name + parameter types)
 * - If found, checks if return types differ
 * - Reports METHOD_TYPES_CLASH if return types clash
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error: "Method return types clash: {returnType1} vs {returnType2} from the type {typeName}"
 */
export const MethodTypeClashValidator: Validator = {
  id: 'method-type-clash',
  name: 'Method Type Clash Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 2,
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

      // Filter to method symbols only (cast to MethodSymbol to access parameters and return type)
      const methods = allSymbols.filter(
        (symbol) => symbol.kind === 'method',
      ) as MethodSymbol[];

      // Group methods by parent and check for type clashes within each parent
      // This ensures we only compare methods within the same class/interface
      const methodsByParent = new Map<string, MethodSymbol[]>();
      for (const method of methods) {
        if (!method.parentId) {
          continue; // Skip methods without a parent (shouldn't happen in valid code)
        }

        if (!methodsByParent.has(method.parentId)) {
          methodsByParent.set(method.parentId, []);
        }
        methodsByParent.get(method.parentId)!.push(method);
      }

      // Check each parent for method type clashes
      for (const [parentId, parentMethods] of methodsByParent) {
        const parent = allSymbols.find((s) => s.id === parentId);
        if (!parent) {
          continue;
        }

        // Group methods by name (case-insensitive) to find potential clashes
        const methodsByName = new Map<string, MethodSymbol[]>();
        for (const method of parentMethods) {
          const nameKey = method.name.toLowerCase();
          if (!methodsByName.has(nameKey)) {
            methodsByName.set(nameKey, []);
          }
          methodsByName.get(nameKey)!.push(method);
        }

        // Check each method name group for type clashes
        for (const methodsWithSameName of methodsByName.values()) {
          if (methodsWithSameName.length <= 1) {
            continue; // No potential clashes for this name
          }

          // Compare each method with every other method for identical signatures
          for (let i = 0; i < methodsWithSameName.length; i++) {
            for (let j = i + 1; j < methodsWithSameName.length; j++) {
              const method1 = methodsWithSameName[i];
              const method2 = methodsWithSameName[j];

              // Don't skip when ids match: duplicate declarations get the same id from the collector,
              // but we still need to compare them (different array indices = different declarations).
              // Only skip when comparing the exact same object reference.
              if (method1 === method2) {
                continue;
              }

              // Check if signatures are identical (name + parameter types)
              if (
                areMethodSignaturesIdentical(method1, method2, options.tier)
              ) {
                // Signatures are identical - check return types
                const returnType1 = method1.returnType?.name || 'void';
                const returnType2 = method2.returnType?.name || 'void';

                // If return types differ, we have a clash
                if (returnType1.toLowerCase() !== returnType2.toLowerCase()) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.METHOD_TYPES_CLASH,
                      returnType1,
                      returnType2,
                      parent.name,
                    ),
                    location: method2.location,
                    code: ErrorCodes.METHOD_TYPES_CLASH,
                  });
                }
              }
            }
          }
        }
      }

      yield* Effect.logDebug(
        `MethodTypeClashValidator: checked ${methods.length} methods, ` +
          `found ${errors.length} type clash violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
