import { ValidationResult, ValidationScope } from './ValidationResult';
import { TypeInfo } from './TypeValidator';

/**
 * Valid System comparator methods
 */
const VALID_SYSTEM_COMPARATOR_METHODS = new Set([
  'equals',
  'hashCode',
  'toString',
]);

/**
 * Valid System comparison methods
 */
const VALID_SYSTEM_COMPARISON_METHODS = new Set(['equals']);

/**
 * Invalid types for System methods
 */
const INVALID_SYSTEM_METHOD_TYPES = new Set(['void', 'Void']);

/**
 * Validates System comparison operations according to Apex semantic rules
 */
export class SystemComparatorValidator {
  /**
   * Validate a System comparison operation
   */
  static validateSystemComparison(
    methodName: string,
    leftType: TypeInfo,
    rightType: TypeInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Method name must be valid
    if (!methodName || !VALID_SYSTEM_COMPARISON_METHODS.has(methodName)) {
      errors.push('invalid.system.comparison.method');
      return { isValid: false, errors, warnings };
    }

    // Check 2: Both types must be provided
    if (!leftType || !rightType) {
      errors.push('invalid.system.comparison.types');
      return { isValid: false, errors, warnings };
    }

    // Check 3: Types must be compatible for comparison
    if (!this.areTypesCompatibleForComparison(leftType, rightType)) {
      errors.push('invalid.system.comparison.types');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate System.hashCode operation
   */
  static validateSystemHashCode(
    targetType: TypeInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Target type must be provided
    if (!targetType) {
      errors.push('invalid.system.hashCode.type');
      return { isValid: false, errors, warnings };
    }

    // Check 2: Target type must not be void
    if (INVALID_SYSTEM_METHOD_TYPES.has(targetType.name)) {
      errors.push('invalid.system.hashCode.type');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate System.toString operation
   */
  static validateSystemToString(
    targetType: TypeInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Target type must be provided
    if (!targetType) {
      errors.push('invalid.system.toString.type');
      return { isValid: false, errors, warnings };
    }

    // Check 2: Target type must not be void
    if (INVALID_SYSTEM_METHOD_TYPES.has(targetType.name)) {
      errors.push('invalid.system.toString.type');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate a System comparator method name
   */
  static validateSystemComparatorMethod(
    methodName: string,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if method name is valid
    if (!methodName || !VALID_SYSTEM_COMPARATOR_METHODS.has(methodName)) {
      errors.push('invalid.system.comparator.method');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Check if types are compatible for System comparison
   */
  private static areTypesCompatibleForComparison(
    leftType: TypeInfo,
    rightType: TypeInfo,
  ): boolean {
    // Same type is always compatible
    if (leftType.name === rightType.name) {
      return true;
    }

    // Both types are SObjects (can be compared for equality)
    if (leftType.isSObject && rightType.isSObject) {
      return true;
    }

    // Both types are primitives of the same category
    if (leftType.isPrimitive && rightType.isPrimitive) {
      return this.arePrimitiveTypesCompatible(leftType.name, rightType.name);
    }

    // One type is null and the other is an SObject (null can be compared with SObjects)
    if (
      (leftType.name === 'null' || rightType.name === 'null') &&
      (leftType.isSObject || rightType.isSObject)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if primitive types are compatible for comparison
   */
  private static arePrimitiveTypesCompatible(
    leftTypeName: string,
    rightTypeName: string,
  ): boolean {
    // Numeric types are compatible with each other
    const numericTypes = new Set(['Integer', 'Long', 'Double', 'Decimal']);
    if (numericTypes.has(leftTypeName) && numericTypes.has(rightTypeName)) {
      return true;
    }

    // String types are compatible with each other
    const stringTypes = new Set(['String', 'Text']);
    if (stringTypes.has(leftTypeName) && stringTypes.has(rightTypeName)) {
      return true;
    }

    // Boolean types are compatible with each other
    if (leftTypeName === 'Boolean' && rightTypeName === 'Boolean') {
      return true;
    }

    // Date/Time types are compatible with each other
    const dateTimeTypes = new Set(['Date', 'DateTime', 'Time']);
    if (dateTimeTypes.has(leftTypeName) && dateTimeTypes.has(rightTypeName)) {
      return true;
    }

    // ID types are compatible with each other
    if (leftTypeName === 'Id' && rightTypeName === 'Id') {
      return true;
    }

    return false;
  }
}
