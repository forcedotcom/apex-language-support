/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { SymbolTable, ApexSymbol } from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
import type { ValidationResult } from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';

/**
 * Validates that variables do not shadow variables in outer scopes.
 *
 * In Apex, variable shadowing occurs when a variable in an inner scope
 * has the same name as a variable in an outer scope. This can lead to
 * confusion and bugs.
 *
 * Examples of shadowing:
 * - Local variable shadows method parameter
 * - For-loop variable shadows local variable
 * - Inner block variable shadows outer block variable
 * - Catch block exception variable shadows existing variable
 *
 * This validator checks that:
 * 1. Variables don't shadow parameters in the same method
 * 2. Variables in inner blocks don't shadow outer block variables
 * 3. For-loop variables don't shadow existing variables in scope
 * 4. Catch block exception variables don't shadow existing variables
 *
 * Note: Class fields and method names are not considered for shadowing
 * as they are in a different namespace and accessed via 'this'.
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Error Messages:
 * - "Variable '{name}' in {scope} shadows variable in outer {parentScope}"
 *
 * @see SEMANTIC_SYMBOL_RULES.md:149-155
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Gap #6
 */
export class VariableShadowingValidator implements Validator {
  readonly id = 'variable-shadowing';
  readonly name = 'Variable Shadowing Validator';
  readonly tier = ValidationTier.IMMEDIATE;
  readonly priority = 1;

  validate(
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError> {
    return Effect.gen(function* () {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Get all symbols from the table
      const allSymbols = symbolTable.getAllSymbols();

      // Filter to variable symbols (parameter and variable kinds)
      const variables = allSymbols.filter(
        (symbol) =>
          symbol.kind === SymbolKind.Parameter ||
          symbol.kind === SymbolKind.Variable,
      );

      // Check each variable for shadowing
      for (const variable of variables) {
        // Get the parent symbol (method, block, or other scope)
        const parent = variable.parentId
          ? allSymbols.find((s) => s.id === variable.parentId)
          : null;

        if (!parent) {
          continue; // Skip orphaned variables
        }

        // Look for shadowed variables in outer scopes
        const shadowedVariable = findShadowedVariable(
          variable,
          parent,
          allSymbols,
        );

        if (shadowedVariable) {
          const scopeDescription = getScopeDescription(variable, parent);
          const outerScopeDescription = getScopeDescription(
            shadowedVariable,
            allSymbols.find((s) => s.id === shadowedVariable.parentId) ?? null,
          );

          errors.push(
            `Variable '${variable.name}' in ${scopeDescription} shadows variable in outer ${outerScopeDescription}`,
          );
        }
      }

      yield* Effect.logDebug(
        `VariableShadowingValidator: checked ${variables.length} variables, ` +
          `found ${errors.length} violations`,
      );

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    });
  }
}

/**
 * Find a variable with the same name in outer scopes
 */
function findShadowedVariable(
  variable: ApexSymbol,
  currentParent: ApexSymbol,
  allSymbols: ApexSymbol[],
): ApexSymbol | null {
  const variableName = variable.name.toLowerCase();

  // Walk up the parent chain looking for variables with the same name
  let current: ApexSymbol | null = currentParent;

  while (current) {
    // Check for variables that are children of the current scope
    // (these would be shadowed by our variable)
    const varsInThisScope = allSymbols.filter(
      (s) =>
        s.id !== variable.id && // Don't match self
        s.parentId === current!.id && // Variables in this scope
        (s.kind === SymbolKind.Parameter || s.kind === SymbolKind.Variable) &&
        s.name.toLowerCase() === variableName,
    );

    if (varsInThisScope.length > 0) {
      return varsInThisScope[0];
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
 * Get a human-readable description of the scope
 */
function getScopeDescription(
  variable: ApexSymbol,
  parent: ApexSymbol | null,
): string {
  if (!parent) {
    return variable.kind;
  }

  switch (variable.kind) {
    case SymbolKind.Parameter:
      return `method '${parent.name}'`;
    case SymbolKind.Variable:
      if (parent.kind === SymbolKind.Block) {
        return 'block';
      } else if (parent.kind === SymbolKind.Method) {
        return `method '${parent.name}'`;
      }
      return parent.kind;
    default:
      return variable.kind;
  }
}
