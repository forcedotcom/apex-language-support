/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ValidationResult, ValidationScope } from './ValidationResult';
import type { ExpressionType } from './TypePromotionSystem';
import { isAssignable } from './utils/typeAssignability';

/**
 * Extended ExpressionType interface for statement validation
 */
interface StatementExpressionType extends ExpressionType {
  isPrimitive?: boolean;
  isEnum?: boolean;
  isCollection?: boolean;
  elementType?: ExpressionType;
}

/**
 * Validates Apex statements
 */
export class StatementValidator {
  /**
   * Validate variable declaration statements
   * @param declaredType - The declared type of the variable
   * @param initializerType - The type of the initializer expression (null if no initializer)
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateVariableDeclaration(
    declaredType: StatementExpressionType,
    initializerType: StatementExpressionType | null,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // If no initializer, declaration is always valid
    if (!initializerType) {
      return { isValid: true, errors, warnings };
    }

    // Check if initializer is compatible with declared type
    if (!this.isCompatibleType(declaredType, initializerType)) {
      errors.push('incompatible.types');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate final field declaration statements
   * @param declaredType - The declared type of the field
   * @param initializerType - The type of the initializer expression (null if no initializer)
   * @param isFinal - Whether the field is final
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateFinalFieldDeclaration(
    declaredType: StatementExpressionType,
    initializerType: StatementExpressionType | null,
    isFinal: boolean,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Final fields must have an initializer
    if (isFinal && !initializerType) {
      errors.push('final.field.requires.initializer');
      return { isValid: false, errors, warnings };
    }

    // If there's an initializer, validate type compatibility
    if (
      initializerType &&
      !this.isCompatibleType(declaredType, initializerType)
    ) {
      errors.push('incompatible.types');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate switch statements
   * @param expressionType - The type of the switch expression
   * @param whenTypes - Array of types for the when values
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateSwitchStatement(
    expressionType: StatementExpressionType,
    whenTypes: StatementExpressionType[],
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Collection types are not allowed in switch statements
    if (expressionType.isCollection || expressionType.kind === 'collection') {
      errors.push('incompatible.switch.types');
      return { isValid: false, errors, warnings };
    }

    // Check if all when values are compatible with switch expression type
    for (const whenType of whenTypes) {
      if (!this.isCompatibleType(expressionType, whenType)) {
        errors.push('incompatible.switch.types');
        return { isValid: false, errors, warnings };
      }
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate assignment statements
   * @param targetType - The type of the target variable
   * @param valueType - The type of the value being assigned
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateAssignmentStatement(
    targetType: StatementExpressionType,
    valueType: StatementExpressionType,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if assignment is compatible
    if (!this.isCompatibleAssignment(targetType, valueType)) {
      errors.push('incompatible.assignment');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate return statements
   * @param methodReturnType - The return type of the method
   * @param returnValueType - The type of the return value (null if no value)
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateReturnStatement(
    methodReturnType: StatementExpressionType,
    returnValueType: StatementExpressionType | null,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Handle void methods
    if (methodReturnType.name === 'void') {
      if (returnValueType) {
        errors.push('void.method.cannot.return.value');
        return { isValid: false, errors, warnings };
      }
      return { isValid: true, errors, warnings };
    }

    // Non-void methods must return a value
    if (!returnValueType) {
      errors.push('method.must.return.value');
      return { isValid: false, errors, warnings };
    }

    // Check if return value is compatible with method return type
    if (!this.isCompatibleType(methodReturnType, returnValueType)) {
      errors.push('incompatible.return.type');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Check if two types are compatible for assignment/initialization
   * Delegates to shared typeAssignability module.
   */
  private static isCompatibleType(
    targetType: StatementExpressionType,
    sourceType: StatementExpressionType,
  ): boolean {
    return isAssignable(
      sourceType.name ?? '',
      targetType.name ?? '',
      'assignment',
      { allSymbols: [] },
    );
  }

  /**
   * Check if assignment is compatible (allows widening conversions)
   * Delegates to shared typeAssignability module.
   */
  private static isCompatibleAssignment(
    targetType: StatementExpressionType,
    valueType: StatementExpressionType,
  ): boolean {
    return isAssignable(
      valueType.name ?? '',
      targetType.name ?? '',
      'assignment',
      { allSymbols: [] },
    );
  }
}
