/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ValidationResult, ValidationScope } from './ValidationResult';
import { STANDARD_SOBJECT_TYPES } from '../../constants/constants';

/**
 * Information about a method call parameter
 */
export interface MethodParameterInfo {
  /** The type of the parameter */
  type: string;
  /** Whether the parameter is a list of SObjects */
  isSObjectList: boolean;
  /** Whether the parameter is null */
  isNull: boolean;
  /** Whether the parameter is an empty list (optional) */
  isEmpty?: boolean;
}

/**
 * Information about a method call
 */
export interface MethodCallInfo {
  /** The name of the method being called */
  methodName: string;
  /** The class name where the method is defined */
  className: string;
  /** The parameters passed to the method */
  parameters: MethodParameterInfo[];
  /** Whether the method is static */
  isStatic: boolean;
  /** Whether the method is global */
  isGlobal: boolean;
}

/**
 * Information about a return type
 */
export interface ReturnTypeInfo {
  /** The type of the return value */
  type: string;
  /** Whether the return type is FormulaRecalcResult */
  isFormulaRecalcResult: boolean;
  /** Whether the return value is null */
  isNull: boolean;
}

/**
 * Information about an error type
 */
export interface ErrorTypeInfo {
  /** The type of the error */
  type: string;
  /** Whether the error type is FormulaRecalcFieldError */
  isFormulaRecalcFieldError: boolean;
  /** Whether the error is null */
  isNull: boolean;
}

/**
 * Validates SObject formula recalculation operations according to Apex semantic rules
 *
 * Rules:
 * - recalculateFormulas method must be called on System.Formula class
 * - recalculateFormulas method must be static
 * - recalculateFormulas method must take exactly one parameter of type List<SObject>
 * - Parameter cannot be null
 * - Return type must be List<System.FormulaRecalcResult>
 * - FormulaRecalcFieldError must be of type System.FormulaRecalcFieldError
 */
export class SObjectRecalculateFormulasValidator {
  /**
   * Expected method name for formula recalculation
   */
  private static readonly EXPECTED_METHOD_NAME = 'recalculateFormulas';

  /**
   * Expected class name for formula recalculation
   */
  private static readonly EXPECTED_CLASS_NAME = 'System.Formula';

  /**
   * Expected parameter count for recalculateFormulas method
   */
  private static readonly EXPECTED_PARAMETER_COUNT = 1;

  /**
   * Validates a recalculateFormulas method call
   *
   * @param callInfo - Information about the method call
   * @param scope - Validation scope for error reporting
   * @returns Validation result indicating if the method call is valid
   */
  static validateRecalculateFormulasCall(
    callInfo: MethodCallInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Method name must be correct
    if (callInfo.methodName !== this.EXPECTED_METHOD_NAME) {
      errors.push('method.invalid.recalculate.formulas.wrong.method');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 2: Class name must be correct
    if (callInfo.className !== this.EXPECTED_CLASS_NAME) {
      errors.push('method.invalid.recalculate.formulas.wrong.class');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 3: Method must be static
    if (!callInfo.isStatic) {
      errors.push('method.invalid.recalculate.formulas.not.static');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 4: Parameter count must be correct
    if (callInfo.parameters.length !== this.EXPECTED_PARAMETER_COUNT) {
      errors.push('method.invalid.recalculate.formulas.wrong.parameter.count');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 5: Parameter type must be List<SObject> or List<SpecificSObject>
    const parameter = callInfo.parameters[0];
    if (!this.isValidSObjectListParameter(parameter)) {
      errors.push('method.invalid.recalculate.formulas.wrong.parameter.type');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 6: Parameter cannot be null
    if (parameter.isNull) {
      errors.push('method.invalid.recalculate.formulas.null.parameter');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates a FormulaRecalcResult return type
   *
   * @param resultInfo - Information about the return type
   * @param scope - Validation scope for error reporting
   * @returns Validation result indicating if the return type is valid
   */
  static validateFormulaRecalcResult(
    resultInfo: ReturnTypeInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Return type must be FormulaRecalcResult
    if (!resultInfo.isFormulaRecalcResult) {
      errors.push('method.invalid.recalculate.formulas.wrong.return.type');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 2: Return value cannot be null
    if (resultInfo.isNull) {
      errors.push('method.invalid.recalculate.formulas.null.result');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates a FormulaRecalcFieldError type
   *
   * @param errorInfo - Information about the error type
   * @param scope - Validation scope for error reporting
   * @returns Validation result indicating if the error type is valid
   */
  static validateFormulaRecalcFieldError(
    errorInfo: ErrorTypeInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Error type must be FormulaRecalcFieldError
    if (!errorInfo.isFormulaRecalcFieldError) {
      errors.push('method.invalid.recalculate.formulas.wrong.error.type');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 2: Error cannot be null
    if (errorInfo.isNull) {
      errors.push('method.invalid.recalculate.formulas.null.error');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validates a complete formula recalculation operation
   *
   * @param callInfo - Information about the method call
   * @param resultInfo - Information about the return type
   * @param scope - Validation scope for error reporting
   * @returns Validation result indicating if the operation is valid
   */
  static validateFormulaRecalculationOperation(
    callInfo: MethodCallInfo,
    resultInfo: ReturnTypeInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate the method call
    const callResult = this.validateRecalculateFormulasCall(callInfo, scope);
    if (!callResult.isValid) {
      for (const error of callResult.errors) {
        errors.push(typeof error === 'string' ? error : error.message);
      }
    }

    // Validate the return type
    const resultValidation = this.validateFormulaRecalcResult(
      resultInfo,
      scope,
    );
    if (!resultValidation.isValid) {
      for (const error of resultValidation.errors) {
        errors.push(typeof error === 'string' ? error : error.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if a parameter is a valid SObject list parameter
   *
   * @param parameter - The parameter to check
   * @returns True if the parameter is a valid SObject list
   */
  private static isValidSObjectListParameter(
    parameter: MethodParameterInfo,
  ): boolean {
    // Must be a list
    if (!parameter.isSObjectList) {
      return false;
    }

    // Must be a list type
    if (!parameter.type.startsWith('List<')) {
      return false;
    }

    // Must end with '>'
    if (!parameter.type.endsWith('>')) {
      return false;
    }

    // Extract the inner type
    const innerType = parameter.type.slice(5, -1); // Remove 'List<' and '>'

    // Must be SObject or a specific SObject type
    return this.isSObjectType(innerType);
  }

  /**
   * Check if a type is an SObject type
   *
   * @param type - The type to check
   * @returns True if the type is an SObject
   */
  private static isSObjectType(type: string): boolean {
    // Direct SObject type
    if (type === 'SObject') {
      return true;
    }

    // Standard SObject types
    const standardSObjectTypes = Array.from(STANDARD_SOBJECT_TYPES);

    if (standardSObjectTypes.includes(type)) {
      return true;
    }

    // Custom SObject types (end with __c, __kav, __ka, __x)
    if (
      type.endsWith('__c') ||
      type.endsWith('__kav') ||
      type.endsWith('__ka') ||
      type.endsWith('__x')
    ) {
      return true;
    }

    return false;
  }
}
