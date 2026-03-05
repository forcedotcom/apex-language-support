/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { SymbolTable, TypeSymbol } from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
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
 * Validates that no duplicate type names exist within the same scope.
 *
 * In Apex, types (classes, interfaces, enums) must have unique names within
 * their containing scope. This includes:
 * - Top-level types in the same file (only one top-level type per file anyway)
 * - Inner types within the same parent class/interface
 *
 * Types are case-insensitive in Apex, so "MyClass" and "myclass" would be
 * considered duplicates.
 *
 * This validator checks for:
 * 1. Duplicate type names within the same parent scope (same parentId)
 * 2. Handles both top-level types (parentId === null) and inner types
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error Message:
 * - "Type name already in use: {name}"
 *
 * @see SEMANTIC_SYMBOL_RULES.md (type naming rules)
 */
export const DuplicateTypeNameValidator: Validator = {
  id: 'duplicate-type-name',
  name: 'Duplicate Type Name Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 2, // Run early, after SourceSizeValidator
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

      // Filter to types (classes, interfaces, enums)
      // Constructors have SymbolKind.Constructor, so they're automatically excluded
      const types = allSymbols.filter(
        (symbol): symbol is TypeSymbol =>
          (symbol.kind === SymbolKind.Class ||
            symbol.kind === SymbolKind.Interface ||
            symbol.kind === SymbolKind.Enum) &&
          'annotations' in symbol,
      );

      // Deduplicate by object reference - prevents same symbol object appearing multiple times
      // but allows legitimate duplicates (different objects with same ID) to both be checked
      // Legitimate duplicates (e.g., two inner classes with same name) share the same ID
      // but are different objects, so we deduplicate by object reference, not ID
      const seenObjects = new WeakSet<TypeSymbol>();
      const uniqueTypes: TypeSymbol[] = [];
      for (const type of types) {
        if (!seenObjects.has(type)) {
          seenObjects.add(type);
          uniqueTypes.push(type);
        }
      }

      // Group types by parent scope (parentId)
      // Types with the same parentId are in the same scope
      const typesByParent = new Map<string | null, TypeSymbol[]>();
      for (const type of uniqueTypes) {
        const parentId = type.parentId ?? null; // Normalize undefined to null

        if (!typesByParent.has(parentId)) {
          typesByParent.set(parentId, []);
        }
        typesByParent.get(parentId)!.push(type);
      }

      // Check each parent scope for duplicate type names
      for (const [, parentTypes] of typesByParent) {
        // Use case-insensitive name comparison (Apex is case-insensitive)
        const typeNames = new Map<string, TypeSymbol[]>();

        for (const type of parentTypes) {
          const typeNameLower = type.name.toLowerCase();
          if (!typeNames.has(typeNameLower)) {
            typeNames.set(typeNameLower, []);
          }
          typeNames.get(typeNameLower)!.push(type);
        }

        // Report duplicates (more than one type with the same name in same scope)
        for (const [, duplicateTypes] of typeNames) {
          if (duplicateTypes.length > 1) {
            // Report error on all duplicates (not just the first one)
            // This helps developers identify all problematic declarations
            for (const duplicateType of duplicateTypes) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.DUPLICATE_TYPE_NAME,
                  duplicateType.name,
                ),
                location: duplicateType.location,
                code: ErrorCodes.DUPLICATE_TYPE_NAME,
              });
            }
          }
        }
      }

      yield* Effect.logDebug(
        `DuplicateTypeNameValidator: checked ${types.length} types, ` +
          `found ${errors.length} duplicate type name violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
