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
 * Validates binary expressions according to Apex semantic rules
 */
export class BinaryExpressionValidator {
  /**
   * Validate arithmetic operations
   */
  static validateArithmetic(
    left: ExpressionType,
    right: ExpressionType,
    operation: string,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Void expressions cannot be used in arithmetic (pre-V174)
    if (
      (left === TypePromotionSystem.VOID ||
        right === TypePromotionSystem.VOID) &&
      scope.version < 174
    ) {
      errors.push('invalid.void.arithmetic.expression');
      return { isValid: false, errors, warnings };
    }

    // For V174+, void expressions are allowed but we need to handle them specially
    if (
      left === TypePromotionSystem.VOID ||
      right === TypePromotionSystem.VOID
    ) {
      // In V174+, void expressions are allowed but we need to determine the result type
      // For now, return the non-void type or void if both are void
      const resultType = left === TypePromotionSystem.VOID ? right : left;
      return { isValid: true, errors, warnings, type: resultType };
    }

    // Check 2: Date/Time operations (check before string concatenation)
    if (TypePromotionSystem.isDateTime(left)) {
      if (operation !== '+' && operation !== '-') {
        errors.push('invalid.numeric.arguments.expression');
        return { isValid: false, errors, warnings };
      }

      // Validate operand types for date/time operations
      switch (left.name) {
        case 'time':
          if (!TypePromotionSystem.isIntegerOrLong(right)) {
            errors.push('invalid.time.operand.expression');
            return { isValid: false, errors, warnings };
          }
          break;
        case 'date':
          if (!TypePromotionSystem.isIntegerOrLong(right)) {
            errors.push('invalid.date.operand.expression');
            return { isValid: false, errors, warnings };
          }
          break;
        case 'datetime':
          if (!TypePromotionSystem.isNumeric(right)) {
            errors.push('invalid.datetime.operand.expression');
            return { isValid: false, errors, warnings };
          }
          break;
      }
      return { isValid: true, errors, warnings, type: left };
    }

    // Check 3: String concatenation (only addition allowed)
    if (
      left === TypePromotionSystem.STRING ||
      right === TypePromotionSystem.STRING
    ) {
      if (operation === '+') {
        return {
          isValid: true,
          errors,
          warnings,
          type: TypePromotionSystem.STRING,
        };
      } else {
        errors.push('invalid.numeric.arguments.expression');
        return { isValid: false, errors, warnings };
      }
    }

    // Check 4: Numeric operations
    if (
      !TypePromotionSystem.isNumeric(left) ||
      !TypePromotionSystem.isNumeric(right)
    ) {
      errors.push('invalid.numeric.arguments.expression');
      return { isValid: false, errors, warnings };
    }

    const resultType = TypePromotionSystem.promoteTypes(left, right);
    return { isValid: true, errors, warnings, type: resultType };
  }

  /**
   * Validate shift operations
   */
  static validateShift(
    left: ExpressionType,
    right: ExpressionType,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Both operands must be integer or long
    if (
      !TypePromotionSystem.isIntegerOrLong(left) ||
      !TypePromotionSystem.isIntegerOrLong(right)
    ) {
      errors.push('invalid.shift.operator.arguments');
      return { isValid: false, errors, warnings };
    }

    // Version-specific behavior (pre-V160)
    if (scope.version < 160) {
      if (
        left === TypePromotionSystem.INTEGER &&
        right === TypePromotionSystem.LONG
      ) {
        return {
          isValid: true,
          errors,
          warnings,
          type: TypePromotionSystem.LONG,
        };
      }
    }

    // For V160+, return the left operand type (no promotion)
    return { isValid: true, errors, warnings, type: left };
  }

  /**
   * Validate bitwise operations
   */
  static validateBitwise(
    left: ExpressionType,
    right: ExpressionType,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Both operands must be integer or long
    if (
      !TypePromotionSystem.isIntegerOrLong(left) ||
      !TypePromotionSystem.isIntegerOrLong(right)
    ) {
      errors.push('invalid.bitwise.operator.arguments');
      return { isValid: false, errors, warnings };
    }

    // Type promotion rules
    if (
      left === TypePromotionSystem.LONG ||
      right === TypePromotionSystem.LONG
    ) {
      return {
        isValid: true,
        errors,
        warnings,
        type: TypePromotionSystem.LONG,
      };
    }

    return {
      isValid: true,
      errors,
      warnings,
      type: TypePromotionSystem.INTEGER,
    };
  }
}
