/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import type { ValidationResult, ValidationScope } from './ValidationResult';
import type { TypeInfo } from './TypeValidator';
import { isNumericType, isPrimitiveType } from '../../utils/primitiveTypes';

/**
 * Validates type casting operations
 */
export class TypeCastingValidator {
  /**
   * Validate a cast operation
   */
  static validateCast(
    sourceType: TypeInfo,
    targetType: TypeInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if target type is valid for casting
    if (!this.isValidCastTarget(targetType)) {
      errors.push('invalid.cast.type');
      return { isValid: false, errors, warnings };
    }

    // Check if source type is valid for casting
    if (!this.isValidCastSource(sourceType)) {
      errors.push('invalid.cast.type');
      return { isValid: false, errors, warnings };
    }

    // Check if types are compatible for casting
    if (!this.isCompatibleForCast(sourceType, targetType)) {
      errors.push('incompatible.cast.types');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Check if a type is a valid cast target
   */
  private static isValidCastTarget(type: TypeInfo): boolean {
    // Cannot cast to void
    if (type.name === 'void') {
      return false;
    }

    return true;
  }

  /**
   * Check if a type is a valid cast source
   */
  private static isValidCastSource(type: TypeInfo): boolean {
    // Cannot cast from void
    if (type.name === 'void') {
      return false;
    }

    return true;
  }

  /**
   * Check if types are compatible for casting
   */
  private static isCompatibleForCast(
    source: TypeInfo,
    target: TypeInfo,
  ): boolean {
    // Handle collection types first (even if same collection type, need to check elements)
    if (source.isCollection || target.isCollection) {
      return this.areCollectionTypesCompatible(source, target);
    }

    // Same type is always compatible (for non-collections)
    if (source.name === target.name) {
      return true;
    }

    // Handle SObject types before Object check
    // SObject has specific rules (e.g., Object cannot be cast to SObject)
    if (source.isSObject || target.isSObject) {
      return this.areSObjectTypesCompatible(source, target);
    }

    // Handle Object type (can be cast to/from any type except SObject)
    // This must come before primitive check since Object is now considered a primitive
    if (source.name === 'Object' || target.name === 'Object') {
      return this.isObjectTypeCompatible(source, target);
    }

    // Handle primitive types
    if (
      (isPrimitiveType(source.name) || source.isPrimitive) &&
      (isPrimitiveType(target.name) || target.isPrimitive)
    ) {
      return this.arePrimitiveTypesCompatible(source.name, target.name);
    }

    // Handle class hierarchy (simplified - would need actual inheritance info)
    return this.areClassTypesCompatible(source, target);
  }

  /**
   * Check if primitive types are compatible for casting
   */
  private static arePrimitiveTypesCompatible(
    sourceName: string,
    targetName: string,
  ): boolean {
    // Numeric types can be cast between each other
    if (isNumericType(sourceName) && isNumericType(targetName)) {
      return true;
    }

    // Boolean cannot be cast to/from other primitives
    if (sourceName === 'Boolean' || targetName === 'Boolean') {
      return false;
    }

    // Date/Time types are not compatible with other primitives
    if (
      ['Date', 'DateTime', 'Time'].includes(sourceName) ||
      ['Date', 'DateTime', 'Time'].includes(targetName)
    ) {
      return false;
    }

    // Blob and Id are not compatible with other primitives
    if (
      sourceName === 'Blob' ||
      targetName === 'Blob' ||
      sourceName === 'Id' ||
      targetName === 'Id' ||
      sourceName === 'ID' ||
      targetName === 'ID'
    ) {
      return false;
    }

    return false;
  }

  /**
   * Check if SObject types are compatible for casting
   */
  private static areSObjectTypesCompatible(
    source: TypeInfo,
    target: TypeInfo,
  ): boolean {
    // SObject can be cast to Object
    if (source.isSObject && target.name === 'Object') {
      return true;
    }

    // Object cannot be cast to SObject (would need runtime check)
    if (source.name === 'Object' && target.isSObject) {
      return false;
    }

    // SObject to SObject casting (simplified - would need actual SObject hierarchy)
    if (source.isSObject && target.isSObject) {
      return true; // Simplified - in reality would check SObject compatibility
    }

    return false;
  }

  /**
   * Check if collection types are compatible for casting
   */
  private static areCollectionTypesCompatible(
    source: TypeInfo,
    target: TypeInfo,
  ): boolean {
    // Both must be collections
    if (!source.isCollection || !target.isCollection) {
      return false;
    }

    // Same collection type
    if (source.name === target.name) {
      // Check element type compatibility
      if (source.elementType && target.elementType) {
        return this.isCompatibleForCast(source.elementType, target.elementType);
      }
      return true;
    }

    return false;
  }

  /**
   * Check if Object type is compatible for casting
   */
  private static isObjectTypeCompatible(
    source: TypeInfo,
    target: TypeInfo,
  ): boolean {
    // Object can be cast to any type
    if (source.name === 'Object') {
      return true;
    }

    // Any type can be cast to Object (including primitives like String)
    if (target.name === 'Object') {
      return true;
    }

    return false;
  }

  /**
   * Check if class types are compatible for casting (simplified)
   */
  private static areClassTypesCompatible(
    source: TypeInfo,
    target: TypeInfo,
  ): boolean {
    // This is a simplified implementation
    // In a real implementation, this would check inheritance hierarchy

    // For now, allow parent to child casting (simplified)
    // This would need to be enhanced with actual class hierarchy information
    if (source.name === 'ParentClass' && target.name === 'ChildClass') {
      return true;
    }

    // Assume unrelated classes are not compatible
    return false;
  }
}
