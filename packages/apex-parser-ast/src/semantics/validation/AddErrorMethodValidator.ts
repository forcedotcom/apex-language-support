/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ValidationResult, ValidationScope } from './ValidationResult';
import type {
  SObjectFieldInfo,
  SObjectValidationContext,
} from './SObjectTypeValidator';

/**
 * Validates addError method calls on SObject fields
 *
 * Rules:
 * - Can only be called on direct SObject field references to scalar fields
 * - Cannot be called on SOQL expressions
 * - Cannot be called on non-regular SObject fields
 * - Cannot be called after safe navigation operator
 */
export class AddErrorMethodValidator {
  /**
   * Validates an addError method call on an SObject field
   *
   * @param fieldInfo - Information about the field being validated
   * @param context - SObject validation context
   * @param scope - Validation scope for error reporting
   * @returns Validation result indicating if the addError call is valid
   */
  validateAddErrorCall(
    fieldInfo: SObjectFieldInfo | null | undefined,
    context: SObjectValidationContext,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Field info must exist
    if (!fieldInfo) {
      errors.push('method.invalid.add.error.not.sobject.field');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 2: Must be an SObject field (not a variable or other type)
    if (fieldInfo.category === 'VARIABLE' || !this.isSObjectField(fieldInfo)) {
      errors.push('method.invalid.add.error.not.sobject.field');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 3: Cannot be called on SOQL expressions
    if (fieldInfo.isSoqlExpression) {
      errors.push('method.invalid.add.error.not.sobject.scalar.field');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 4: Must be a regular SObject field (not relationship, formula, etc.)
    if (!this.isRegularSObjectField(fieldInfo)) {
      errors.push('method.invalid.add.error.not.sobject.scalar.field');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 5: Must be a column (not a calculated field)
    if (!fieldInfo.isColumn) {
      errors.push('method.invalid.add.error.not.sobject.scalar.field');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 6: Cannot be called after safe navigation operator
    if (fieldInfo.hasSafeNavigation) {
      errors.push(
        'safe.navigation.invalid.between.sobject.field.and.add.error',
      );
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // All checks passed - addError call is valid
    return {
      isValid: true,
      errors,
      warnings,
    };
  }

  /**
   * Determines if the field is an SObject field
   *
   * @param fieldInfo - Field information to check
   * @returns True if the field is an SObject field
   */
  private isSObjectField(fieldInfo: SObjectFieldInfo): boolean {
    // Check if it's a regular SObject field or has SObject characteristics
    return (
      fieldInfo.isRegular ||
      fieldInfo.category === 'REGULAR' ||
      fieldInfo.category === 'RELATIONSHIP' ||
      fieldInfo.category === 'FORMULA' ||
      fieldInfo.category === 'ROLLUP_SUMMARY'
    );
  }

  /**
   * Determines if the field is a regular SObject field suitable for addError
   *
   * @param fieldInfo - Field information to check
   * @returns True if the field is a regular SObject field
   */
  private isRegularSObjectField(fieldInfo: SObjectFieldInfo): boolean {
    // Must be a regular field (not relationship, formula, rollup summary, etc.)
    return (
      fieldInfo.category === 'REGULAR' ||
      (fieldInfo.isRegular &&
        !fieldInfo.isRelationship &&
        !fieldInfo.isFormula &&
        !fieldInfo.isCalculated)
    );
  }

  /**
   * Validates addError method call with expression context
   *
   * @param expression - Method call expression to validate
   * @param context - SObject validation context
   * @param scope - Validation scope for error reporting
   * @returns Validation result
   */
  validateAddErrorExpression(
    expression: any,
    context: SObjectValidationContext,
    scope: ValidationScope,
  ): ValidationResult {
    // Extract field information from the expression
    const fieldInfo = this.extractFieldInfoFromExpression(expression, context);

    // Validate the addError call
    return this.validateAddErrorCall(fieldInfo, context, scope);
  }

  /**
   * Extracts field information from a method call expression
   *
   * @param expression - Method call expression
   * @param context - SObject validation context
   * @returns Field information or null if not an SObject field
   */
  private extractFieldInfoFromExpression(
    expression: any,
    context: SObjectValidationContext,
  ): SObjectFieldInfo | null {
    // This is a placeholder implementation
    // In a real implementation, this would parse the expression to extract field information
    // For now, return null to indicate no field info available
    return null;
  }
}
