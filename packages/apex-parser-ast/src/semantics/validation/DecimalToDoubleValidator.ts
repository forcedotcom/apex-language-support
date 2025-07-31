/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ValidationResult, ValidationScope } from './ValidationResult';
import type { TypeInfo } from './TypeValidator';

/**
 * Context for Decimal to Double conversion validation
 */
export interface DecimalToDoubleContext {
  /** The operation being performed (e.g., 'List.add', 'Map.put') */
  operation: string;
  /** The container type if applicable (e.g., 'List<Double>', 'Map<String, Double>') */
  containerType: string | null;
}

/**
 * Validates Decimal to Double conversions in List/Map operations
 *
 * Rules:
 * - Allows Decimal to Double conversion in List/Map operations
 * - Validates parameter type compatibility
 */
export class DecimalToDoubleValidator {
  /**
   * Validates a Decimal to Double conversion
   *
   * @param sourceType - The source type (should be Decimal)
   * @param targetType - The target type (should be Double)
   * @param context - Conversion context information
   * @param scope - Validation scope
   * @returns Validation result indicating if the conversion is valid
   */
  validateDecimalToDoubleConversion(
    sourceType: TypeInfo | null | undefined,
    targetType: TypeInfo | null | undefined,
    context: DecimalToDoubleContext | null | undefined,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Source and target types must exist
    if (!sourceType || !targetType) {
      errors.push('invalid.decimal.to.double.conversion');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 2: Source type must be Decimal
    if (!this.isDecimalType(sourceType)) {
      errors.push('invalid.decimal.to.double.conversion');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 3: Target type must be Double
    if (!this.isDoubleType(targetType)) {
      errors.push('invalid.decimal.to.double.conversion');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 4: Context must exist and be valid
    if (!context || !this.isValidConversionContext(context)) {
      errors.push('invalid.decimal.to.double.conversion');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // All checks passed - conversion is valid
    return {
      isValid: true,
      errors,
      warnings,
    };
  }

  /**
   * Determines if the type is a Decimal type
   *
   * @param type - Type information to check
   * @returns True if the type is Decimal
   */
  private isDecimalType(type: TypeInfo): boolean {
    return type.name.toLowerCase() === 'decimal';
  }

  /**
   * Determines if the type is a Double type
   *
   * @param type - Type information to check
   * @returns True if the type is Double
   */
  private isDoubleType(type: TypeInfo): boolean {
    return type.name.toLowerCase() === 'double';
  }

  /**
   * Determines if the conversion context is valid for Decimal to Double conversion
   *
   * @param context - Conversion context to check
   * @returns True if the context allows Decimal to Double conversion
   */
  private isValidConversionContext(context: DecimalToDoubleContext): boolean {
    // Valid operations for Decimal to Double conversion
    const validOperations = [
      'List.add',
      'List.constructor',
      'Map.put',
      'Map.constructor',
      'Set.add',
      'Set.constructor',
    ];

    // Check if the operation is valid
    if (!validOperations.includes(context.operation)) {
      return false;
    }

    // Check if container type is specified (required for collection operations)
    if (!context.containerType) {
      return false;
    }

    // Check if container type contains Double
    return context.containerType.toLowerCase().includes('double');
  }

  /**
   * Validates Decimal to Double conversion in a specific expression context
   *
   * @param expression - Expression to validate
   * @param scope - Validation scope
   * @returns Validation result
   */
  validateDecimalToDoubleExpression(
    expression: any,
    scope: ValidationScope,
  ): ValidationResult {
    // Extract type information from the expression
    const sourceType = this.extractSourceTypeFromExpression(expression);
    const targetType = this.extractTargetTypeFromExpression(expression);
    const context = this.extractContextFromExpression(expression);

    // Validate the conversion
    return this.validateDecimalToDoubleConversion(
      sourceType,
      targetType,
      context,
      scope,
    );
  }

  /**
   * Extracts source type information from an expression
   *
   * @param expression - Expression to analyze
   * @returns Source type information or null if not available
   */
  private extractSourceTypeFromExpression(expression: any): TypeInfo | null {
    // This is a placeholder implementation
    // In a real implementation, this would parse the expression to extract source type
    return null;
  }

  /**
   * Extracts target type information from an expression
   *
   * @param expression - Expression to analyze
   * @returns Target type information or null if not available
   */
  private extractTargetTypeFromExpression(expression: any): TypeInfo | null {
    // This is a placeholder implementation
    // In a real implementation, this would parse the expression to extract target type
    return null;
  }

  /**
   * Extracts conversion context from an expression
   *
   * @param expression - Expression to analyze
   * @returns Conversion context or null if not available
   */
  private extractContextFromExpression(
    expression: any,
  ): DecimalToDoubleContext | null {
    // This is a placeholder implementation
    // In a real implementation, this would parse the expression to extract context
    return null;
  }
}
