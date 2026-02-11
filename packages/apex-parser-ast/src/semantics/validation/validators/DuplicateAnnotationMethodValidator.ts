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
 * Helper to check if a method has @RemoteAction annotation
 */
function hasRemoteAction(method: MethodSymbol): boolean {
  return (
    method.annotations?.some(
      (ann) => ann.name.toLowerCase() === 'remoteaction',
    ) || false
  );
}

/**
 * Helper to check if a method has @WebService annotation or webservice modifier
 * Note: @WebService can be either an annotation OR the webservice modifier keyword
 */
function hasWebService(method: MethodSymbol): boolean {
  // Check modifier first (webservice keyword)
  if (method.modifiers?.isWebService) {
    return true;
  }
  // Check annotation (@WebService)
  return (
    method.annotations?.some(
      (ann) => ann.name.toLowerCase() === 'webservice',
    ) || false
  );
}

/**
 * Validates that no duplicate @RemoteAction or @WebService methods exist.
 *
 * In Apex:
 * - @RemoteAction: Cannot have two methods with the same name and same number of parameters
 * - @WebService: Cannot have two methods with the same name
 *
 * This validator:
 * - Groups methods by their parent class
 * - Filters to methods with @RemoteAction or @WebService annotations
 * - Checks for duplicates based on annotation-specific rules
 * - Reports duplicate annotation methods
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Errors:
 * - "Remote Action does not support two remote action methods with the same name and same number of parameters"
 * - "Web Service does not support two web service methods with the same name: {name}"
 *
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Phase 1.2
 */
export const DuplicateAnnotationMethodValidator: Validator = {
  id: 'duplicate-annotation-method',
  name: 'Duplicate Annotation Method Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 4, // Run after ControlFlowValidator
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

      // Filter to method symbols only
      const methods = allSymbols.filter(
        (symbol): symbol is MethodSymbol =>
          symbol.kind === 'method' && 'parameters' in symbol,
      );

      // Group methods by parent
      const methodsByParent = new Map<string, MethodSymbol[]>();
      for (const method of methods) {
        if (!method.parentId) {
          continue;
        }

        if (!methodsByParent.has(method.parentId)) {
          methodsByParent.set(method.parentId, []);
        }
        methodsByParent.get(method.parentId)!.push(method);
      }

      // Check each parent for duplicate annotation methods
      for (const [parentId, parentMethods] of methodsByParent) {
        const parent = allSymbols.find((s) => s.id === parentId);
        if (!parent) {
          continue;
        }

        // Filter to RemoteAction methods
        const remoteActionMethods = parentMethods.filter((m) =>
          hasRemoteAction(m),
        );

        // Check for INVALID_PUBLIC_REMOTE_ACTION: RemoteAction methods in global classes must be global
        if (remoteActionMethods.length > 0) {
          // Check if parent is a global class
          const isGlobalClass =
            parent.kind === SymbolKind.Class &&
            (parent as TypeSymbol).modifiers?.visibility ===
              SymbolVisibility.Global;

          if (isGlobalClass) {
            for (const method of remoteActionMethods) {
              // Check if method is public (not global)
              if (
                method.modifiers?.visibility === SymbolVisibility.Public ||
                method.modifiers?.visibility === SymbolVisibility.Default
              ) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INVALID_PUBLIC_REMOTE_ACTION,
                  ),
                  location: method.location,
                  code: ErrorCodes.INVALID_PUBLIC_REMOTE_ACTION,
                });
              }
            }
          }
        }

        // Check for duplicate RemoteAction methods
        // Rule: Cannot have two methods with same name and same number of parameters
        if (remoteActionMethods.length > 1) {
          const methodsByName = new Map<string, MethodSymbol[]>();
          for (const method of remoteActionMethods) {
            const nameKey = method.name.toLowerCase();
            if (!methodsByName.has(nameKey)) {
              methodsByName.set(nameKey, []);
            }
            methodsByName.get(nameKey)!.push(method);
          }

          // Check each name group for same parameter count
          for (const methodsWithSameName of methodsByName.values()) {
            if (methodsWithSameName.length <= 1) {
              continue;
            }

            // Group by parameter count
            const methodsByParamCount = new Map<number, MethodSymbol[]>();
            for (const method of methodsWithSameName) {
              const paramCount = method.parameters?.length || 0;
              if (!methodsByParamCount.has(paramCount)) {
                methodsByParamCount.set(paramCount, []);
              }
              methodsByParamCount.get(paramCount)!.push(method);
            }

            // Report duplicates (same name + same param count)
            for (const methodsWithSameParams of methodsByParamCount.values()) {
              if (methodsWithSameParams.length > 1) {
                // Report error for all but the first one
                for (let i = 1; i < methodsWithSameParams.length; i++) {
                  const method = methodsWithSameParams[i];
                  const code = ErrorCodes.DUPLICATE_REMOTE_ACTION_METHODS;
                  errors.push({
                    message: localizeTyped(code),
                    location: method.location,
                    code,
                  });
                }
              }
            }
          }
        }

        // Filter to WebService methods
        const webServiceMethods = parentMethods.filter((m) => hasWebService(m));

        // Check for duplicate WebService methods
        // Rule: Cannot have two methods with the same name (regardless of parameters)
        if (webServiceMethods.length > 1) {
          const methodsByName = new Map<string, MethodSymbol[]>();
          for (const method of webServiceMethods) {
            const nameKey = method.name.toLowerCase();
            if (!methodsByName.has(nameKey)) {
              methodsByName.set(nameKey, []);
            }
            methodsByName.get(nameKey)!.push(method);
          }

          // Report duplicates (same name)
          for (const methodsWithSameName of methodsByName.values()) {
            if (methodsWithSameName.length > 1) {
              // Report error for all but the first one
              for (let i = 1; i < methodsWithSameName.length; i++) {
                const method = methodsWithSameName[i];
                const code = ErrorCodes.DUPLICATE_WEB_SERVICE_METHODS;
                errors.push({
                  message: localizeTyped(code, method.name),
                  location: method.location,
                  code,
                });
              }
            }
          }
        }
      }

      yield* Effect.logDebug(
        `DuplicateAnnotationMethodValidator: checked ${methods.length} methods, ` +
          `found ${errors.length} duplicate annotation method violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
