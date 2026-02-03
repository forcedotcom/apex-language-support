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
import { localizeTyped } from '../../../i18n/messageInstance';
import { ErrorCodes } from '../../../generated/ErrorCodes';

/**
 * Validates that no duplicate fields or variables exist within the same scope.
 *
 * **Key Distinction: Duplicate vs Shadowing**
 * - **Duplicate (same scope)**: A symbol declared with the same name as another
 *   symbol in the SAME scope. This is an ERROR.
 *   - Fields: Two fields with the same name in the same class
 *   - Variables: A local variable with the same name as a parameter in the same method
 * - **Shadowing (different scopes)**: Handled by VariableShadowingValidator as WARNINGS
 *
 * In Apex, fields must have unique names within a class (case-insensitive).
 * However, Apex allows static and non-static fields to share the same name
 * with specific ordering rules:
 * - Non-static fields can be declared before static fields with the same name
 * - Static fields cannot be declared before non-static fields with the same name
 * - Duplicate static fields are not allowed
 * - Duplicate non-static fields are not allowed
 *
 * For variables:
 * - Local variables cannot have the same name as parameters in the same method
 * - Multiple variables with the same name in the same block scope are not allowed
 *
 * This validator checks for:
 * 1. Duplicate field names within same class (case-insensitive)
 * 2. Duplicate variable names within same scope (method/block)
 * 3. Handles static/non-static distinction per jorje rules
 *
 * Prerequisites:
 * - Requires 'full' detail level if variables exist (for variable duplicate detection)
 * - Requires 'public-api' detail level if only fields exist (for field duplicate detection)
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error Messages:
 * - "Duplicate field: {name}" (for duplicate fields)
 * - "Duplicate variable: {name}" (for duplicate variables)
 *
 * @see MultipleFieldTable.java and StandardFieldTable.java in jorje
 * @see SEMANTIC_SYMBOL_RULES.md (field and variable naming rules)
 */
export const DuplicateSymbolValidator: Validator = {
  id: 'duplicate-symbol',
  name: 'Duplicate Symbol Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 1,
  prerequisites: {
    requiredDetailLevel: 'full', // Required for variable duplicate detection
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

      // Check for duplicate fields (existing logic)
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
              const code = ErrorCodes.DUPLICATE_FIELD;
              errors.push({
                message: localizeTyped(code, field.name),
                location: field.location,
                code,
              });
            } else {
              staticFields.set(fieldName, field);
            }
          } else {
            // Check for duplicate non-static field
            if (nonStaticFields.has(fieldName)) {
              const code = ErrorCodes.DUPLICATE_FIELD;
              errors.push({
                message: localizeTyped(code, field.name),
                location: field.location,
                code,
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
              const code = ErrorCodes.DUPLICATE_FIELD;
              errors.push({
                message: localizeTyped(code, staticField.name),
                location: staticField.location,
                code,
              });
            }
            // If non-static comes first, that's allowed (no error)
          }
        }
      }

      // Check for duplicate variables in the same scope
      // Filter to variable symbols (parameter and variable kinds)
      const variables = allSymbols.filter(
        (symbol) =>
          symbol.kind === SymbolKind.Parameter ||
          symbol.kind === SymbolKind.Variable,
      );

      // Check each variable for duplicates in the same scope
      for (const variable of variables) {
        // Skip method parameters - they are at the top of method scope
        // and cannot duplicate variables from outer (class) scopes
        if (variable.kind === SymbolKind.Parameter) {
          continue;
        }

        // Get the parent symbol (method, block, or other scope)
        const parent = variable.parentId
          ? allSymbols.find((s) => s.id === variable.parentId)
          : null;

        if (!parent) {
          continue; // Skip orphaned variables
        }

        // Check for duplicates in the same scope (ERROR)
        const duplicateVariable = findDuplicateInSameScope(
          variable,
          parent,
          allSymbols,
        );

        if (duplicateVariable) {
          yield* Effect.logDebug(
            `DuplicateSymbolValidator: Reporting ERROR (duplicate) for variable '${variable.name}' ` +
              `(id=${variable.id}, kind=${variable.kind}) duplicating '${duplicateVariable.name}' ` +
              `(id=${duplicateVariable.id}, kind=${duplicateVariable.kind}) in same scope.`,
          );

          const code = ErrorCodes.DUPLICATE_VARIABLE;
          errors.push({
            message: localizeTyped(code, variable.name),
            location: variable.location,
            code,
          });
        }
      }

      yield* Effect.logDebug(
        `DuplicateSymbolValidator: checked ${fields.length} fields and ${variables.length} variables, ` +
          `found ${errors.length} violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};

/**
 * Find the method that contains a symbol by walking up the parent chain
 */
function findContainingMethod(
  symbol: ApexSymbol,
  allSymbols: ApexSymbol[],
): ApexSymbol | null {
  let current: ApexSymbol | null = symbol;

  while (current) {
    // Check if current is a method/constructor
    if (
      current.kind === SymbolKind.Method ||
      current.kind === SymbolKind.Constructor
    ) {
      return current;
    }

    // Check if current's parent is a method/constructor
    if (current.parentId) {
      const parent = allSymbols.find((s) => s.id === current!.parentId);
      if (
        parent &&
        (parent.kind === SymbolKind.Method ||
          parent.kind === SymbolKind.Constructor)
      ) {
        return parent;
      }
      current = parent ?? null;
    } else {
      break;
    }
  }

  return null;
}

/**
 * Find a duplicate variable in the same scope (ERROR case)
 * This checks if a variable has the same name as a parameter or variable
 * in the same method scope.
 */
function findDuplicateInSameScope(
  variable: ApexSymbol,
  currentParent: ApexSymbol,
  allSymbols: ApexSymbol[],
): ApexSymbol | null {
  const variableName = variable.name.toLowerCase();

  // Find the method that contains this variable
  const containingMethod = findContainingMethod(variable, allSymbols);
  if (!containingMethod) {
    // Not in a method, check same parent scope
    const varsInSameScope = allSymbols.filter(
      (s) =>
        s.id !== variable.id && // Don't match self
        s.parentId === currentParent.id && // Same parent scope
        (s.kind === SymbolKind.Parameter || s.kind === SymbolKind.Variable) &&
        s.name.toLowerCase() === variableName,
    );
    return varsInSameScope.length > 0 ? varsInSameScope[0] : null;
  }

  // Check for variables/parameters in the same method scope
  const methodId = containingMethod.id;

  // Check all parameters and variables in the same method scope
  const duplicatesInMethod = allSymbols.filter((s) => {
    if (
      s.id === variable.id ||
      (s.kind !== SymbolKind.Parameter && s.kind !== SymbolKind.Variable) ||
      s.name.toLowerCase() !== variableName
    ) {
      return false;
    }

    // Check if this symbol is in the same method scope
    const symbolMethod = findContainingMethod(s, allSymbols);
    return symbolMethod?.id === methodId;
  });

  return duplicatesInMethod.length > 0 ? duplicatesInMethod[0] : null;
}
