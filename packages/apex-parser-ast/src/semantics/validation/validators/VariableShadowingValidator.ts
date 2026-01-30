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
 * Validates that variables do not shadow variables/fields in outer scopes.
 *
 * **Key Distinction: Duplicate vs Shadowing**
 * - **Duplicate (same scope)**: Handled by DuplicateSymbolValidator as ERRORS
 * - **Shadowing (different scopes)**: A variable in an inner scope has the same
 *   name as a variable/field in an outer scope. Example: `String myField = 'x';`
 *   inside a method when class field `myField` exists. This is typically a WARNING
 *   in other languages to alert developers of potential confusion.
 *
 * **Difference from DuplicateSymbolValidator:**
 * - This validator checks CROSS-SCOPE shadowing (warnings)
 * - DuplicateSymbolValidator checks SAME-SCOPE duplicates (errors)
 * - Variable shadowing is about cross-scope conflicts (inner vs outer scope)
 * - Duplicate detection is about same-scope conflicts (within same method/block)
 *
 * This validator checks for cross-scope shadowing (WARNINGS):
 * 1. Variables shadowing class fields → WARNING
 * 2. Inner block variables shadowing outer block variables → WARNING
 * 3. For-loop variables shadowing existing variables → WARNING
 * 4. Catch block exception variables shadowing existing variables → WARNING
 *
 * **Historical Note:** The old Jorje semantics library treated both duplicates
 * and shadowing as "duplicate variable" errors. This validator now only handles
 * cross-scope shadowing as warnings, while same-scope duplicates are handled
 * by DuplicateSymbolValidator as errors.
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Warning Messages:
 * - "Duplicate variable: {name}" (uses duplicate.variable code for compatibility)
 *
 * @see SEMANTIC_SYMBOL_RULES.md:149-155
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Gap #6
 */

export const VariableShadowingValidator: Validator = {
  id: 'variable-shadowing',
  name: 'Variable Shadowing Validator',
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

      // Filter to variable symbols (parameter and variable kinds)
      const variables = allSymbols.filter(
        (symbol) =>
          symbol.kind === SymbolKind.Parameter ||
          symbol.kind === SymbolKind.Variable,
      );

      // Get all fields for shadowing checks
      const fields = allSymbols.filter(
        (symbol) => symbol.kind === SymbolKind.Field,
      );

      // Check each variable for cross-scope shadowing (WARNINGS only)
      for (const variable of variables) {
        // Skip method parameters - they are at the top of method scope
        // and cannot shadow variables from outer (class) scopes
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

        // Check for shadowing in outer scopes (WARNING)
        const shadowedSymbol = findShadowedSymbol(
          variable,
          parent,
          allSymbols,
          fields,
        );

        if (shadowedSymbol) {
          yield* Effect.logDebug(
            `VariableShadowingValidator: Reporting WARNING (shadowing) for variable '${variable.name}' ` +
              `(id=${variable.id}, kind=${variable.kind}) shadowing '${shadowedSymbol.name}' ` +
              `(id=${shadowedSymbol.id}, kind=${shadowedSymbol.kind}) in outer scope.`,
          );

          // Shadowing across scopes is a warning (not an error)
          const code = ErrorCodes.DUPLICATE_VARIABLE;
          warnings.push({
            message: localizeTyped(code, variable.name),
            location: variable.location,
            code,
          });
        }
      }

      yield* Effect.logDebug(
        `VariableShadowingValidator: checked ${variables.length} variables, ` +
          `found ${warnings.length} shadowing warnings`,
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
 * Find the class that contains a symbol by walking up the parent chain
 */
function findContainingClass(
  symbol: ApexSymbol,
  allSymbols: ApexSymbol[],
): ApexSymbol | null {
  let current: ApexSymbol | null = symbol;

  while (current) {
    // Check if current is a class/interface
    if (
      current.kind === SymbolKind.Class ||
      current.kind === SymbolKind.Interface
    ) {
      return current;
    }

    // Check if current's parent is a class/interface
    if (current.parentId) {
      const parent = allSymbols.find((s) => s.id === current!.parentId);
      if (
        parent &&
        (parent.kind === SymbolKind.Class ||
          parent.kind === SymbolKind.Interface)
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
 * Find a symbol (variable or field) with the same name in outer scopes (WARNING case)
 * This checks for shadowing across different scopes (inner scope shadowing outer scope).
 * Same-scope duplicates are handled by DuplicateSymbolValidator and should be skipped here.
 */
function findShadowedSymbol(
  variable: ApexSymbol,
  currentParent: ApexSymbol,
  allSymbols: ApexSymbol[],
  fields: ApexSymbol[],
): ApexSymbol | null {
  const variableName = variable.name.toLowerCase();

  // Find the method that contains this variable
  const containingMethod = findContainingMethod(variable, allSymbols);
  // Find the class that contains this variable
  const containingClass = findContainingClass(variable, allSymbols);

  // First check for class fields (local variable shadowing class field)
  if (containingClass) {
    // Fields might be direct children of class or children of class block
    // Find all blocks that are children of the class
    const classBlocks = allSymbols.filter(
      (s) => s.kind === SymbolKind.Block && s.parentId === containingClass.id,
    );

    // Check fields that are children of the class or class blocks
    const shadowedField = fields.find((f) => {
      if (f.name.toLowerCase() !== variableName) {
        return false;
      }
      // Field is a child of the class or a class block
      return (
        f.parentId === containingClass.id ||
        classBlocks.some((block) => f.parentId === block.id)
      );
    });

    if (shadowedField) {
      return shadowedField;
    }
  }

  // Walk up the parent chain looking for variables in outer scopes
  // Start from the parent and walk up, but skip same-scope symbols
  let current: ApexSymbol | null = currentParent;

  while (current) {
    // Check for variables/parameters in outer scopes (different method or outer block)
    const varsInOuterScope = allSymbols.filter((s) => {
      if (
        s.id === variable.id || // Don't match self
        (s.kind !== SymbolKind.Parameter && s.kind !== SymbolKind.Variable) ||
        s.name.toLowerCase() !== variableName
      ) {
        return false;
      }

      // Skip if symbol is in the same method scope (handled by DuplicateSymbolValidator)
      const symbolMethod = findContainingMethod(s, allSymbols);
      if (
        symbolMethod &&
        containingMethod &&
        symbolMethod.id === containingMethod.id
      ) {
        return false; // Same method scope - handled by DuplicateSymbolValidator
      }

      // Check if symbol is in current scope or a descendant of current
      return (
        s.parentId === current!.id || isDescendantOf(s, current!, allSymbols)
      );
    });

    if (varsInOuterScope.length > 0) {
      return varsInOuterScope[0];
    }

    // Move up to parent scope
    if (current.parentId) {
      current = allSymbols.find((s) => s.id === current!.parentId) ?? null;
    } else {
      break;
    }
  }

  return null;
}

/**
 * Check if a symbol is a descendant of another symbol
 */
function isDescendantOf(
  symbol: ApexSymbol,
  ancestor: ApexSymbol,
  allSymbols: ApexSymbol[],
): boolean {
  let current: ApexSymbol | null = symbol;

  while (current) {
    if (current.parentId === ancestor.id) {
      return true;
    }
    if (current.parentId) {
      current = allSymbols.find((s) => s.id === current!.parentId) ?? null;
    } else {
      break;
    }
  }

  return false;
}
