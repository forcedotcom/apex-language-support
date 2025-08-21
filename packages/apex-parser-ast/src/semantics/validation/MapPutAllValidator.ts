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
 * Map type information extracted from type name
 */
interface MapTypeInfo {
  keyType: string;
  valueType: string;
  isMap: boolean;
}

/**
 * Validates Map putAll operations
 *
 * Rules:
 * - Map types must be compatible for putAll operation
 * - Key types must match exactly
 * - Value types must be compatible
 */
export class MapPutAllValidator {
  /**
   * Validates a Map putAll operation
   *
   * @param targetMap - The target map type
   * @param sourceMap - The source map type
   * @param scope - Validation scope
   * @returns Validation result indicating if the putAll operation is valid
   */
  validateMapPutAll(
    targetMap: TypeInfo | null | undefined,
    sourceMap: TypeInfo | null | undefined,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Both maps must exist
    if (!targetMap || !sourceMap) {
      errors.push('invalid.map.putAll');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 2: Both must be Map types
    const targetMapInfo = this.parseMapType(targetMap.name);
    const sourceMapInfo = this.parseMapType(sourceMap.name);

    if (!targetMapInfo.isMap || !sourceMapInfo.isMap) {
      errors.push('invalid.map.putAll');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 3: Key types must be compatible
    if (
      !this.areTypesCompatible(targetMapInfo.keyType, sourceMapInfo.keyType)
    ) {
      errors.push('invalid.map.putAll');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Check 4: Value types must be compatible
    if (
      !this.areTypesCompatible(targetMapInfo.valueType, sourceMapInfo.valueType)
    ) {
      errors.push('invalid.map.putAll');
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // All checks passed - putAll operation is valid
    return {
      isValid: true,
      errors,
      warnings,
    };
  }

  /**
   * Parses a map type name to extract key and value types
   *
   * @param typeName - The map type name (e.g., 'Map<String, Integer>')
   * @returns Map type information
   */
  private parseMapType(typeName: string): MapTypeInfo {
    // Check if it's a Map type
    if (!typeName.toLowerCase().startsWith('map<')) {
      return {
        keyType: '',
        valueType: '',
        isMap: false,
      };
    }

    // Extract the content between Map< and >
    const content = typeName.substring(4, typeName.length - 1);

    // Find the comma that separates key and value types
    // Handle nested generics like Map<String, List<Account>>
    let commaIndex = -1;
    let bracketCount = 0;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (char === '<') {
        bracketCount++;
      } else if (char === '>') {
        bracketCount--;
      } else if (char === ',' && bracketCount === 0) {
        commaIndex = i;
        break;
      }
    }

    if (commaIndex === -1) {
      return {
        keyType: '',
        valueType: '',
        isMap: false,
      };
    }

    const keyType = content.substring(0, commaIndex).trim();
    const valueType = content.substring(commaIndex + 1).trim();

    return {
      keyType,
      valueType,
      isMap: true,
    };
  }

  /**
   * Determines if two types are compatible for putAll operation
   *
   * @param targetType - The target type
   * @param sourceType - The source type
   * @returns True if the types are compatible
   */
  private areTypesCompatible(targetType: string, sourceType: string): boolean {
    // Exact match
    if (targetType === sourceType) {
      return true;
    }

    // Case-insensitive match
    if (targetType.toLowerCase() === sourceType.toLowerCase()) {
      return true;
    }

    // Handle numeric type compatibility
    if (this.areNumericTypesCompatible(targetType, sourceType)) {
      return true;
    }

    // Handle Object type compatibility (Object can accept any type)
    if (targetType.toLowerCase() === 'object') {
      return true;
    }

    // Handle primitive type compatibility
    if (this.arePrimitiveTypesCompatible(targetType, sourceType)) {
      return true;
    }

    // For complex types (SObjects, custom classes), require exact match
    return false;
  }

  /**
   * Determines if two numeric types are compatible
   *
   * @param targetType - The target numeric type
   * @param sourceType - The source numeric type
   * @returns True if the numeric types are compatible
   */
  private areNumericTypesCompatible(
    targetType: string,
    sourceType: string,
  ): boolean {
    const numericTypes = ['integer', 'long', 'double', 'decimal'];
    const targetLower = targetType.toLowerCase();
    const sourceLower = sourceType.toLowerCase();

    // Both must be numeric types
    if (
      !numericTypes.includes(targetLower) ||
      !numericTypes.includes(sourceLower)
    ) {
      return false;
    }

    // Specific compatibility rules
    if (targetLower === 'double' && sourceLower === 'decimal') {
      return true; // Decimal can be converted to Double in collections
    }

    if (targetLower === 'double' && sourceLower === 'integer') {
      return true; // Integer can be converted to Double
    }

    if (targetLower === 'double' && sourceLower === 'long') {
      return true; // Long can be converted to Double
    }

    if (targetLower === 'decimal' && sourceLower === 'integer') {
      return true; // Integer can be converted to Decimal
    }

    if (targetLower === 'decimal' && sourceLower === 'long') {
      return true; // Long can be converted to Decimal
    }

    if (targetLower === 'long' && sourceLower === 'integer') {
      return true; // Integer can be converted to Long
    }

    return false;
  }

  /**
   * Determines if two primitive types are compatible
   *
   * @param targetType - The target primitive type
   * @param sourceType - The source primitive type
   * @returns True if the primitive types are compatible
   */
  private arePrimitiveTypesCompatible(
    targetType: string,
    sourceType: string,
  ): boolean {
    const targetLower = targetType.toLowerCase();
    const sourceLower = sourceType.toLowerCase();

    // Boolean types must match exactly
    if (targetLower === 'boolean' || sourceLower === 'boolean') {
      return targetLower === sourceLower;
    }

    // String types are compatible
    if (targetLower === 'string' && sourceLower === 'string') {
      return true;
    }

    // Date types are compatible
    if (targetLower === 'date' && sourceLower === 'date') {
      return true;
    }

    // DateTime types are compatible
    if (targetLower === 'datetime' && sourceLower === 'datetime') {
      return true;
    }

    // Time types are compatible
    if (targetLower === 'time' && sourceLower === 'time') {
      return true;
    }

    return false;
  }

  /**
   * Validates Map putAll operation in a specific expression context
   *
   * @param expression - Expression to validate
   * @param scope - Validation scope
   * @returns Validation result
   */
  validateMapPutAllExpression(
    expression: any,
    scope: ValidationScope,
  ): ValidationResult {
    // Extract map type information from the expression
    const targetMap = this.extractTargetMapFromExpression(expression);
    const sourceMap = this.extractSourceMapFromExpression(expression);

    // Validate the putAll operation
    return this.validateMapPutAll(targetMap, sourceMap, scope);
  }

  /**
   * Extracts target map type information from an expression
   *
   * @param expression - Expression to analyze
   * @returns Target map type information or null if not available
   */
  private extractTargetMapFromExpression(expression: any): TypeInfo | null {
    // This is a placeholder implementation
    // In a real implementation, this would parse the expression to extract target map type
    return null;
  }

  /**
   * Extracts source map type information from an expression
   *
   * @param expression - Expression to analyze
   * @returns Source map type information or null if not available
   */
  private extractSourceMapFromExpression(expression: any): TypeInfo | null {
    // This is a placeholder implementation
    // In a real implementation, this would parse the expression to extract source map type
    return null;
  }
}
