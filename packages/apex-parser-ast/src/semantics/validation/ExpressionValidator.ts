/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { BinaryExpressionValidator } from './BinaryExpressionValidator';
import { BooleanExpressionValidator } from './BooleanExpressionValidator';
import { VariableExpressionValidator } from './VariableExpressionValidator';
import { TypePromotionSystem } from './TypePromotionSystem';
import type { ValidationResult, ValidationScope } from './ValidationResult';
import type { ExpressionType } from './TypePromotionSystem';
import type { VariableSymbol } from '../../types/symbol';

/**
 * Expression types for validation
 */
export interface BinaryExpression {
  kind: 'binary';
  left: ExpressionType;
  right: ExpressionType;
  operation: string;
}

export interface ComparisonExpression {
  kind: 'comparison';
  left: ExpressionType;
  right: ExpressionType;
  operation: string;
}

export interface VariableExpression {
  kind: 'variable';
  name: string;
}

export interface NotExpression {
  kind: 'not';
  operand: ExpressionType;
}

export type Expression =
  | BinaryExpression
  | ComparisonExpression
  | VariableExpression
  | NotExpression;

/**
 * Main expression validator that integrates all individual validators
 */
export class ExpressionValidator {
  private scope: ValidationScope;
  private symbolTable: Map<string, VariableSymbol>;

  constructor(
    scope: ValidationScope,
    symbolTable: Map<string, VariableSymbol>,
  ) {
    this.scope = scope;
    this.symbolTable = symbolTable;
  }

  /**
   * Validate binary expressions (arithmetic, shift, bitwise)
   */
  validateBinaryExpression(
    left: ExpressionType,
    right: ExpressionType,
    operation: string,
  ): ValidationResult {
    // Determine operation type and delegate to appropriate validator
    if (this.isArithmeticOperation(operation)) {
      return BinaryExpressionValidator.validateArithmetic(
        left,
        right,
        operation,
        this.scope,
      );
    } else if (this.isShiftOperation(operation)) {
      return BinaryExpressionValidator.validateShift(left, right, this.scope);
    } else if (this.isBitwiseOperation(operation)) {
      return BinaryExpressionValidator.validateBitwise(left, right, this.scope);
    }

    // Unknown operation
    return {
      isValid: false,
      errors: [`Unknown binary operation: ${operation}`],
      warnings: [],
    };
  }

  /**
   * Validate boolean expressions (comparison, logical)
   */
  validateBooleanExpression(
    left: ExpressionType,
    right: ExpressionType,
    operation: string,
  ): ValidationResult {
    // Determine operation type and delegate to appropriate validator
    if (this.isComparisonOperation(operation)) {
      return BooleanExpressionValidator.validateComparison(
        left,
        right,
        operation,
        this.scope,
      );
    } else if (this.isLogicalOperation(operation)) {
      return BooleanExpressionValidator.validateLogical(
        left,
        right,
        operation,
        this.scope,
      );
    }

    // Unknown operation
    return {
      isValid: false,
      errors: [`Unknown boolean operation: ${operation}`],
      warnings: [],
    };
  }

  /**
   * Validate variable expressions
   */
  validateVariableExpression(variableName: string): ValidationResult {
    return VariableExpressionValidator.validateVariableExpression(
      variableName,
      this.symbolTable,
      this.scope,
    );
  }

  /**
   * Validate NOT expressions
   */
  validateNotExpression(operand: ExpressionType): ValidationResult {
    return BooleanExpressionValidator.validateNot(operand, this.scope);
  }

  /**
   * Main validation method that handles all expression types
   */
  validateExpression(expression: Expression): ValidationResult {
    switch (expression.kind) {
      case 'binary':
        return this.validateBinaryExpression(
          expression.left,
          expression.right,
          expression.operation,
        );
      case 'comparison':
        return this.validateBooleanExpression(
          expression.left,
          expression.right,
          expression.operation,
        );
      case 'variable':
        return this.validateVariableExpression(expression.name);
      case 'not':
        return this.validateNotExpression(expression.operand);
      default:
        return {
          isValid: false,
          errors: [`Unknown expression kind: ${(expression as any).kind}`],
          warnings: [],
        };
    }
  }

  /**
   * Check if operation is arithmetic
   */
  private isArithmeticOperation(operation: string): boolean {
    return ['+', '-', '*', '/', '%'].includes(operation);
  }

  /**
   * Check if operation is shift
   */
  private isShiftOperation(operation: string): boolean {
    return ['<<', '>>', '>>>'].includes(operation);
  }

  /**
   * Check if operation is bitwise
   */
  private isBitwiseOperation(operation: string): boolean {
    return ['&', '|', '^'].includes(operation);
  }

  /**
   * Check if operation is comparison
   */
  private isComparisonOperation(operation: string): boolean {
    return ['==', '!=', '<', '>', '<=', '>='].includes(operation);
  }

  /**
   * Check if operation is logical
   */
  private isLogicalOperation(operation: string): boolean {
    return ['&&', '||'].includes(operation);
  }
}
