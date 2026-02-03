/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ValidationResult, ValidationScope } from './ValidationResult';
import type { VariableSymbol } from '../../types/symbol';

/**
 * Validates variable expressions according to Apex semantic rules
 */
export class VariableExpressionValidator {
  /**
   * Validate variable expression
   */
  static validateVariableExpression(
    variableName: string,
    symbolTable: Map<string, VariableSymbol>,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if variable exists
    const variable = this.findVariable(variableName, symbolTable);
    if (!variable) {
      errors.push('variable.does.not.exist');
      return { isValid: false, errors, warnings };
    }

    // Validate visibility
    const visibilityResult = this.validateVariableVisibility(
      variableName,
      symbolTable,
      scope,
    );
    if (!visibilityResult.isValid) {
      for (const error of visibilityResult.errors) {
        errors.push(typeof error === 'string' ? error : error.message);
      }
      return { isValid: false, errors, warnings };
    }

    // Return the variable's type
    return { isValid: true, errors, warnings, type: variable.type };
  }

  /**
   * Validate variable visibility
   */
  static validateVariableVisibility(
    variableName: string,
    symbolTable: Map<string, VariableSymbol>,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const variable = this.findVariable(variableName, symbolTable);
    if (!variable) {
      errors.push('variable.does.not.exist');
      return { isValid: false, errors, warnings };
    }

    // For now, assume all variables are visible in the same scope
    // In a real implementation, this would check visibility rules based on context
    return { isValid: true, errors, warnings };
  }

  /**
   * Validate variable context (static vs instance)
   */
  static validateVariableContext(
    variableName: string,
    symbolTable: Map<string, VariableSymbol>,
    isStaticContext: boolean,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const variable = this.findVariable(variableName, symbolTable);
    if (!variable) {
      errors.push('variable.does.not.exist');
      return { isValid: false, errors, warnings };
    }

    // Check if static variable is being accessed in instance context
    if (variable.modifiers.isStatic && !isStaticContext) {
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
}
