/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ValidationResult, ValidationScope } from './ValidationResult';
import type { ExpressionType } from './TypePromotionSystem';
import { TypePromotionSystem } from './TypePromotionSystem';

/**
 * Extended ExpressionType interface for statement validation
 */
interface StatementExpressionType extends ExpressionType {
  isPrimitive?: boolean;
  isEnum?: boolean;
  isCollection?: boolean;
  elementType?: ExpressionType | null;
}

/**
 * Helper function to check if a type is primitive
 */
function isPrimitiveType(type: StatementExpressionType): boolean {
  // In Apex, only these types are truly primitive (cannot be null)
  const primitiveTypes = ['Integer', 'Long', 'Double', 'Decimal', 'Boolean'];

  if (type.isPrimitive === true || type.kind === 'primitive') {
    return primitiveTypes.includes(type.name);
  }

  return primitiveTypes.includes(type.name);
}

/**
 * Helper function to check if a type is null
 */
function isNullType(type: StatementExpressionType): boolean {
  return type.name === 'null';
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
   * @param targetType - The target type
   * @param sourceType - The source type
   * @returns True if types are compatible
   */
  private static isCompatibleType(
    targetType: StatementExpressionType,
    sourceType: StatementExpressionType,
  ): boolean {
    // Same type is always compatible
    if (targetType.name === sourceType.name) {
      return true;
    }

    // Null is compatible with all object types
    if (isNullType(sourceType)) {
      return !isPrimitiveType(targetType);
    }

    // Use type promotion system for primitive conversions
    if (isPrimitiveType(targetType) && isPrimitiveType(sourceType)) {
      return this.canPromotePrimitive(sourceType, targetType);
    }

    // Object type compatibility (widening)
    if (!isPrimitiveType(targetType) && !isPrimitiveType(sourceType)) {
      // Object can accept any object type (widening)
      if (targetType.name === 'Object') {
        return true;
      }

      // Check inheritance relationships (simplified)
      // In a real implementation, this would check the actual inheritance hierarchy
      return false;
    }

    // Primitive to Object widening (boxing)
    if (!isPrimitiveType(targetType) && isPrimitiveType(sourceType)) {
      if (targetType.name === 'Object') {
        return true;
      }
      return false;
    }

    return false;
  }

  /**
   * Check if assignment is compatible (allows widening conversions)
   * @param targetType - The target type
   * @param valueType - The value type
   * @returns True if assignment is compatible
   */
  private static isCompatibleAssignment(
    targetType: StatementExpressionType,
    valueType: StatementExpressionType,
  ): boolean {
    // Same type is always compatible
    if (targetType.name === valueType.name) {
      return true;
    }

    // Null is compatible with all object types
    if (isNullType(valueType)) {
      return !isPrimitiveType(targetType);
    }

    // Use type promotion system for primitive conversions
    if (isPrimitiveType(targetType) && isPrimitiveType(valueType)) {
      return this.canPromotePrimitive(valueType, targetType);
    }

    // Object type compatibility (widening only)
    if (!isPrimitiveType(targetType) && !isPrimitiveType(valueType)) {
      // Object can accept any object type (widening)
      if (targetType.name === 'Object') {
        return true;
      }

      // Check inheritance relationships (simplified)
      // In a real implementation, this would check the actual inheritance hierarchy
      return false;
    }

    // Primitive to Object widening (boxing)
    if (!isPrimitiveType(targetType) && isPrimitiveType(valueType)) {
      if (targetType.name === 'Object') {
        return true;
      }
      return false;
    }

    return false;
  }

  /**
   * Check if primitive type can be promoted to target type
   * @param sourceType - The source primitive type
   * @param targetType - The target primitive type
   * @returns True if promotion is allowed
   */
  private static canPromotePrimitive(
    sourceType: StatementExpressionType,
    targetType: StatementExpressionType,
  ): boolean {
    // Same type is always promotable
    if (sourceType.name === targetType.name) {
      return true;
    }

    // Widening conversions (allowed)
    if (sourceType.name === 'Integer' && targetType.name === 'Long') {
      return true;
    }
    if (sourceType.name === 'Integer' && targetType.name === 'Double') {
      return true;
    }
    if (sourceType.name === 'Integer' && targetType.name === 'Decimal') {
      return true;
    }
    if (sourceType.name === 'Long' && targetType.name === 'Double') {
      return true;
    }
    if (sourceType.name === 'Long' && targetType.name === 'Decimal') {
      return true;
    }
    if (sourceType.name === 'Double' && targetType.name === 'Decimal') {
      return true;
    }

    // String can only accept String (no automatic conversion)
    if (targetType.name === 'String') {
      return sourceType.name === 'String';
    }

    // Object can accept any primitive type (boxing)
    if (targetType.name === 'Object') {
      return true;
    }

    // No other conversions are allowed
    return false;
  }
}
