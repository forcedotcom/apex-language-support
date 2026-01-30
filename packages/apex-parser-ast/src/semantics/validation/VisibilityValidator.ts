/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ValidationResult, ValidationScope } from './ValidationResult';

/**
 * Extended validation scope for visibility validation
 */
interface VisibilityValidationScope extends ValidationScope {
  currentType?: {
    name: string;
    parentType?: string;
    isInterface?: boolean;
  };
  isStaticContext?: boolean;
}

/**
 * Type information for visibility validation
 */
interface TypeInfo {
  name: string;
  visibility: string;
  isStatic?: boolean;
}

/**
 * Method information for visibility validation
 */
interface MethodInfo {
  name: string;
  visibility: string;
  isStatic?: boolean;
  declaringType?: string;
}

/**
 * Variable information for visibility validation
 */
interface VariableInfo {
  name: string;
  visibility: string;
  isStatic?: boolean;
  isFinal?: boolean;
  isConstant?: boolean;
  declaringType?: string;
}

/**
 * Class information for complete visibility validation
 */
interface ClassInfo {
  name: string;
  visibility: string;
  parentType?: string;
  isInterface?: boolean;
  methods?: MethodInfo[];
  variables?: VariableInfo[];
  implements?: string[];
}

/**
 * Validates visibility and access rules in Apex
 */
export class VisibilityValidator {
  /**
   * Validate type visibility
   * @param typeInfo - The type information
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateTypeVisibility(
    typeInfo: TypeInfo,
    scope: VisibilityValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Public, global, and webservice types are always visible
    if (['public', 'global', 'webservice'].includes(typeInfo.visibility)) {
      return { isValid: true, errors, warnings };
    }

    // Private types are only visible within the same class
    if (typeInfo.visibility === 'private') {
      if (!scope.currentType || scope.currentType.name !== typeInfo.name) {
        errors.push('type.not.visible');
        return { isValid: false, errors, warnings };
      }
    }

    // Protected types are visible to subclasses
    if (typeInfo.visibility === 'protected') {
      if (
        !scope.currentType ||
        (scope.currentType.name !== typeInfo.name &&
          scope.currentType.parentType !== typeInfo.name)
      ) {
        errors.push('type.not.visible');
        return { isValid: false, errors, warnings };
      }
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate method visibility
   * @param methodInfo - The method information
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateMethodVisibility(
    methodInfo: MethodInfo,
    scope: VisibilityValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Public, global, and webservice methods are always visible
    if (['public', 'global', 'webservice'].includes(methodInfo.visibility)) {
      // Check static context restrictions
      if (methodInfo.isStatic && scope.isStaticContext === false) {
        errors.push('static.method.in.instance.context');
        return { isValid: false, errors, warnings };
      }
      return { isValid: true, errors, warnings };
    }

    // Private methods are only visible within the same class
    if (methodInfo.visibility === 'private') {
      if (
        !scope.currentType ||
        (methodInfo.declaringType &&
          scope.currentType.name !== methodInfo.declaringType)
      ) {
        errors.push('method.not.visible');
        return { isValid: false, errors, warnings };
      }
    }

    // Protected methods are visible to subclasses
    if (methodInfo.visibility === 'protected') {
      if (!scope.currentType) {
        errors.push('method.not.visible');
        return { isValid: false, errors, warnings };
      }
      if (
        methodInfo.declaringType &&
        scope.currentType.name !== methodInfo.declaringType &&
        scope.currentType.parentType !== methodInfo.declaringType
      ) {
        errors.push('method.not.visible');
        return { isValid: false, errors, warnings };
      }
    }

    // Check static context restrictions
    if (methodInfo.isStatic && scope.isStaticContext === false) {
      errors.push('static.method.in.instance.context');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate variable visibility
   * @param variableInfo - The variable information
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateVariableVisibility(
    variableInfo: VariableInfo,
    scope: VisibilityValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Public and global variables are always visible
    if (['public', 'global'].includes(variableInfo.visibility)) {
      // Check static context restrictions
      if (variableInfo.isStatic && scope.isStaticContext === false) {
        errors.push('static.variable.in.instance.context');
        return { isValid: false, errors, warnings };
      }
      return { isValid: true, errors, warnings };
    }

    // Private variables are only visible within the same class
    if (variableInfo.visibility === 'private') {
      if (
        !scope.currentType ||
        (variableInfo.declaringType &&
          scope.currentType.name !== variableInfo.declaringType)
      ) {
        errors.push('variable.not.visible');
        return { isValid: false, errors, warnings };
      }
    }

    // Protected variables are visible to subclasses
    if (variableInfo.visibility === 'protected') {
      if (!scope.currentType) {
        errors.push('variable.not.visible');
        return { isValid: false, errors, warnings };
      }
      if (
        variableInfo.declaringType &&
        scope.currentType.name !== variableInfo.declaringType &&
        scope.currentType.parentType !== variableInfo.declaringType
      ) {
        errors.push('variable.not.visible');
        return { isValid: false, errors, warnings };
      }
    }

    // Check static context restrictions
    if (variableInfo.isStatic && scope.isStaticContext === false) {
      errors.push('static.variable.in.instance.context');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate complete visibility for a class
   * @param classInfo - The class information
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateVisibility(
    classInfo: ClassInfo,
    scope: VisibilityValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate class type visibility
    const typeResult = this.validateTypeVisibility(
      { name: classInfo.name, visibility: classInfo.visibility },
      scope,
    );
    if (!typeResult.isValid) {
      for (const error of typeResult.errors) {
        errors.push(typeof error === 'string' ? error : error.message);
      }
    }

    // Validate method visibility
    if (classInfo.methods) {
      for (const method of classInfo.methods) {
        const methodResult = this.validateMethodVisibility(method, scope);
        if (!methodResult.isValid) {
          for (const error of methodResult.errors) {
            errors.push(typeof error === 'string' ? error : error.message);
          }
        }
      }
    }

    // Validate variable visibility
    if (classInfo.variables) {
      for (const variable of classInfo.variables) {
        const variableResult = this.validateVariableVisibility(variable, scope);
        if (!variableResult.isValid) {
          for (const error of variableResult.errors) {
            errors.push(typeof error === 'string' ? error : error.message);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if a type is accessible from the current context
   * @param typeName - The type name
   * @param visibility - The visibility modifier
   * @param scope - Validation scope
   * @returns True if the type is accessible
   */
  private static isTypeAccessible(
    typeName: string,
    visibility: string,
    scope: VisibilityValidationScope,
  ): boolean {
    // Public, global, and webservice types are always accessible
    if (['public', 'global', 'webservice'].includes(visibility)) {
      return true;
    }

    // Private types are only accessible within the same class
    if (visibility === 'private') {
      return scope.currentType?.name === typeName;
    }

    // Protected types are accessible to subclasses
    if (visibility === 'protected') {
      return (
        scope.currentType?.name === typeName ||
        scope.currentType?.parentType === typeName
      );
    }

    return false;
  }

  /**
   * Check if a member is accessible from the current context
   * @param memberName - The member name
   * @param visibility - The visibility modifier
   * @param scope - Validation scope
   * @returns True if the member is accessible
   */
  private static isMemberAccessible(
    memberName: string,
    visibility: string,
    scope: VisibilityValidationScope,
  ): boolean {
    // Public, global, and webservice members are always accessible
    if (['public', 'global', 'webservice'].includes(visibility)) {
      return true;
    }

    // Private members are only accessible within the same class
    if (visibility === 'private') {
      return scope.currentType?.name === memberName.split('.')[0];
    }

    // Protected members are accessible to subclasses
    if (visibility === 'protected') {
      return (
        scope.currentType?.name === memberName.split('.')[0] ||
        scope.currentType?.parentType === memberName.split('.')[0]
      );
    }

    return false;
  }
}
