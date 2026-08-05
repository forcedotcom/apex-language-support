/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ValidationResult, ValidationScope } from './ValidationResult';
import {
  SymbolKind,
  SymbolTable,
  type ApexSymbol,
  type Position,
  type VariableSymbol,
} from '../../types/symbol';

export type VariableReferencePosition = Position;

export type VariableEnvironment = Map<string, VariableSymbol> | SymbolTable;

type VariableResolution =
  | { status: 'resolved'; variable: VariableSymbol }
  | { status: 'not-visible' }
  | { status: 'missing' }
  | { status: 'unknown' };

/**
 * Validates variable expressions according to Apex semantic rules
 */
export class VariableExpressionValidator {
  /**
   * Validate variable expression
   */
  static validateVariableExpression(
    variableName: string,
    symbolTable: VariableEnvironment,
    scope: ValidationScope,
    referencePosition?: VariableReferencePosition,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const resolution = this.resolveVariable(
      variableName,
      symbolTable,
      referencePosition,
    );
    if (resolution.status === 'missing') {
      errors.push('variable.does.not.exist');
      return { isValid: false, errors, warnings };
    }
    if (resolution.status === 'not-visible') {
      errors.push('variable.not.visible');
      return { isValid: false, errors, warnings };
    }
    if (resolution.status === 'unknown') {
      warnings.push('variable.visibility.cannot.be.determined');
      return { isValid: true, errors, warnings };
    }

    // Return the variable's type
    return {
      isValid: true,
      errors,
      warnings,
      type: resolution.variable.type,
    };
  }

  /**
   * Validate variable visibility
   */
  static validateVariableVisibility(
    variableName: string,
    symbolTable: VariableEnvironment,
    scope: ValidationScope,
    referencePosition?: VariableReferencePosition,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const resolution = this.resolveVariable(
      variableName,
      symbolTable,
      referencePosition,
    );
    if (resolution.status === 'missing') {
      errors.push('variable.does.not.exist');
      return { isValid: false, errors, warnings };
    }
    if (resolution.status === 'not-visible') {
      errors.push('variable.not.visible');
      return { isValid: false, errors, warnings };
    }
    if (resolution.status === 'unknown') {
      warnings.push('variable.visibility.cannot.be.determined');
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate variable context (static vs instance)
   */
  static validateVariableContext(
    variableName: string,
    symbolTable: VariableEnvironment,
    isStaticContext: boolean,
    scope: ValidationScope,
    referencePosition?: VariableReferencePosition,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const resolution = this.resolveVariable(
      variableName,
      symbolTable,
      referencePosition,
    );
    if (resolution.status === 'missing') {
      errors.push('variable.does.not.exist');
      return { isValid: false, errors, warnings };
    }
    if (resolution.status === 'not-visible') {
      errors.push('variable.not.visible');
      return { isValid: false, errors, warnings };
    }
    if (resolution.status === 'unknown') {
      warnings.push('variable.visibility.cannot.be.determined');
      return { isValid: true, errors, warnings };
    }

    // Check if static variable is being accessed in instance context
    if (resolution.variable.modifiers.isStatic && !isStaticContext) {
      errors.push('variable.not.accessible.in.context');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Find variable in symbol table (case-insensitive)
   */
  private static findVariable(
    variableName: string,
    symbolTable: Map<string, VariableSymbol>,
  ): VariableSymbol | undefined {
    // First try exact match
    if (symbolTable.has(variableName)) {
      return symbolTable.get(variableName);
    }

    // Then try case-insensitive match
    for (const [name, variable] of symbolTable.entries()) {
      if (name.toLowerCase() === variableName.toLowerCase()) {
        return variable;
      }
    }

    return undefined;
  }

  /**
   * Resolve a variable from parser-owned lexical scope data. A legacy Map is
   * treated as an already-scoped environment supplied by its caller; a full
   * SymbolTable must also supply the reference position so sibling and child
   * declarations cannot leak into visibility decisions.
   */
  private static resolveVariable(
    variableName: string,
    environment: VariableEnvironment,
    referencePosition?: VariableReferencePosition,
  ): VariableResolution {
    if (!(environment instanceof SymbolTable)) {
      const variable = this.findVariable(variableName, environment);
      return variable
        ? { status: 'resolved', variable }
        : { status: 'missing' };
    }

    if (!referencePosition) {
      return { status: 'unknown' };
    }

    const resolved = environment.resolveVariableAtPosition(
      variableName,
      referencePosition.line,
      referencePosition.character,
    );
    if (resolved && this.isVariableSymbol(resolved)) {
      return { status: 'resolved', variable: resolved };
    }

    const declarationExists = environment
      .getAllSymbols()
      .some(
        (symbol) =>
          this.isVariableSymbol(symbol) &&
          symbol.name.toLowerCase() === variableName.toLowerCase(),
      );
    return declarationExists
      ? { status: 'not-visible' }
      : { status: 'missing' };
  }

  private static isVariableSymbol(
    symbol: ApexSymbol,
  ): symbol is VariableSymbol {
    return (
      symbol.kind === SymbolKind.Variable ||
      symbol.kind === SymbolKind.Parameter ||
      symbol.kind === SymbolKind.Field ||
      symbol.kind === SymbolKind.Property
    );
  }
}
