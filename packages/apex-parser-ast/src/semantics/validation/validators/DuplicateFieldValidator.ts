/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { SymbolTable, ApexSymbol } from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
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
 * Validates that no duplicate fields exist within the same class/type.
 *
 * In Apex, fields must have unique names within a class (case-insensitive).
 * However, Apex allows static and non-static fields to share the same name
 * with specific ordering rules:
 * - Non-static fields can be declared before static fields with the same name
 * - Static fields cannot be declared before non-static fields with the same name
 * - Duplicate static fields are not allowed
 * - Duplicate non-static fields are not allowed
 *
 * This validator checks for:
 * 1. Duplicate field names within same class (case-insensitive)
 * 2. Handles static/non-static distinction per jorje rules
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error: "Duplicate field: {name}"
 *
 * @see MultipleFieldTable.java and StandardFieldTable.java in jorje
 * @see SEMANTIC_SYMBOL_RULES.md (field naming rules)
 */
export const DuplicateFieldValidator: Validator = {
  id: 'duplicate-field',
  name: 'Duplicate Field Validator',
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

      // Filter to field symbols
      const fields = allSymbols.filter(
        (symbol) => symbol.kind === SymbolKind.Field,
      );

      // Group fields by parent (class/type)
      const fieldsByParent = new Map<string, ApexSymbol[]>();
      for (const field of fields) {
        if (!field.parentId) {
          continue; // Skip orphaned fields
        }

        if (!fieldsByParent.has(field.parentId)) {
          fieldsByParent.set(field.parentId, []);
        }
        fieldsByParent.get(field.parentId)!.push(field);
      }

      // Check each parent for duplicate fields
      for (const [parentId, parentFields] of fieldsByParent) {
        const parent = allSymbols.find((s) => s.id === parentId);
        if (!parent) {
          continue;
        }

        // Separate static and non-static fields
        const staticFields = new Map<string, ApexSymbol>();
        const nonStaticFields = new Map<string, ApexSymbol>();

        for (const field of parentFields) {
          const fieldName = field.name.toLowerCase();
          const isStatic = field.modifiers.isStatic;

          if (isStatic) {
            // Check for duplicate static field
            if (staticFields.has(fieldName)) {
              errors.push({
                message: I18nSupport.getLabel(
                  ErrorCodes.DUPLICATE_FIELD,
                  field.name,
                ),
                location: field.location,
                code: ErrorCodes.DUPLICATE_FIELD,
              });
            } else {
              staticFields.set(fieldName, field);
            }
          } else {
            // Check for duplicate non-static field
            if (nonStaticFields.has(fieldName)) {
              errors.push({
                message: I18nSupport.getLabel(
                  ErrorCodes.DUPLICATE_FIELD,
                  field.name,
                ),
                location: field.location,
                code: ErrorCodes.DUPLICATE_FIELD,
              });
            } else {
              nonStaticFields.set(fieldName, field);
            }

            // Check if non-static field conflicts with existing static field
            // (static fields declared before non-static are not allowed)
            if (staticFields.has(fieldName)) {
              // This is allowed - non-static can come after static
              // But we should check ordering - if static was declared first, that's OK
              // The error would be if static comes after non-static (handled above)
            }
          }
        }

        // Check for static fields that conflict with non-static fields
        // (static fields cannot be declared before non-static fields with same name)
        for (const [fieldName, staticField] of staticFields) {
          if (nonStaticFields.has(fieldName)) {
            // Check declaration order - if static comes before non-static, that's an error
            // We'll check line numbers to determine order
            const nonStaticField = nonStaticFields.get(fieldName)!;
            const staticLine = staticField.location.identifierRange.startLine;
            const nonStaticLine =
              nonStaticField.location.identifierRange.startLine;

            if (staticLine < nonStaticLine) {
              // Static field declared before non-static - this is an error
              errors.push({
                message: I18nSupport.getLabel(
                  ErrorCodes.DUPLICATE_FIELD,
                  staticField.name,
                ),
                location: staticField.location,
                code: ErrorCodes.DUPLICATE_FIELD,
              });
            }
            // If non-static comes first, that's allowed (no error)
          }
        }
      }

      yield* Effect.logDebug(
        `DuplicateFieldValidator: checked ${fields.length} fields, ` +
          `found ${errors.length} violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
