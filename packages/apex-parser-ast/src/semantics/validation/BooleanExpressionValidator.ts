/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TypePromotionSystem } from './TypePromotionSystem';
import type { ValidationResult, ValidationScope } from './ValidationResult';
import type { ExpressionType } from './TypePromotionSystem';

/**
 * Validates boolean expressions according to Apex semantic rules
 */
export class BooleanExpressionValidator {
  /**
   * Validate comparison operations
   */
  static validateComparison(
    left: ExpressionType,
    right: ExpressionType,
    operation: string,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if types are compatible for comparison
    if (!this.isCompatibleForComparison(left, right)) {
      if (operation === '==' || operation === '!=') {
        if (operation === '==') {
          errors.push('invalid.comparison.types');
        } else {
          errors.push('invalid.inequality.type');
        }
        return { isValid: false, errors, warnings };
      } else {
        errors.push('invalid.comparison.types');
        return { isValid: false, errors, warnings };
      }
    }

    return { isValid: true, errors, warnings, type: TypePromotionSystem.BOOLEAN };
  }

  /**
   * Validate logical operations
   */
  static validateLogical(
    left: ExpressionType,
    right: ExpressionType,
    operation: string,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Both operands must be boolean
    if (left !== TypePromotionSystem.BOOLEAN || right !== TypePromotionSystem.BOOLEAN) {
      errors.push('invalid.logical.type');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings, type: TypePromotionSystem.BOOLEAN };
  }

  /**
   * Validate NOT operation
   */
  static validateNot(
    operand: ExpressionType,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Operand must be boolean
    if (operand !== TypePromotionSystem.BOOLEAN) {
      errors.push('invalid.logical.type');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings, type: TypePromotionSystem.BOOLEAN };
  }

  /**
   * Check if types are compatible for comparison
   */
  private static isCompatibleForComparison(left: ExpressionType, right: ExpressionType): boolean {
    // Same type is always compatible
    if (left === right) {
      return true;
    }

    // Numeric types are compatible with each other
    if (TypePromotionSystem.isNumeric(left) && TypePromotionSystem.isNumeric(right)) {
      return true;
    }

    // Boolean types are compatible with each other
    if (left === TypePromotionSystem.BOOLEAN && right === TypePromotionSystem.BOOLEAN) {
      return true;
    }

    // String types are compatible with each other
    if (left === TypePromotionSystem.STRING && right === TypePromotionSystem.STRING) {
      return true;
    }

    // Date/Time types are compatible with each other
    if (TypePromotionSystem.isDateTime(left) && TypePromotionSystem.isDateTime(right)) {
      return true;
    }

    // Same date/time type is compatible
    if (left.name === right.name && TypePromotionSystem.isDateTime(left)) {
      return true;
    }

    return false;
  }
} 