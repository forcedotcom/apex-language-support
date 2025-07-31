import { ValidationScope, ValidationResult } from './ValidationResult';

/**
 * Information about a custom entity type
 */
export interface CustomEntityTypeInfo {
  /** The name of the custom entity type */
  name: string;
  /** The namespace of the custom entity type */
  namespace?: string;
  /** Whether the custom entity type is visible */
  isVisible: boolean;
  /** Whether the custom entity type is custom (not standard) */
  isCustom: boolean;
}

/**
 * Information about a custom entity field
 */
export interface CustomEntityFieldInfo {
  /** The name of the custom field */
  name: string;
  /** The data type of the custom field */
  type: string;
  /** Whether the custom field is visible */
  isVisible: boolean;
  /** Whether the custom field is custom (not standard) */
  isCustom: boolean;
  /** The namespace of the custom field */
  namespace?: string;
}

/**
 * Information about a custom entity operation
 */
export interface CustomEntityOperationInfo {
  /** The operation being performed */
  operation: string;
  /** The type of entity being operated on */
  entityType: string;
  /** Whether the entity is visible */
  isVisible: boolean;
  /** Whether the entity is custom (not standard) */
  isCustom: boolean;
}

/**
 * Information about custom entity visibility
 */
export interface CustomEntityVisibilityInfo {
  /** The type of custom entity */
  entityType: string;
  /** The current namespace */
  currentNamespace: string;
  /** The target namespace */
  targetNamespace: string;
  /** Whether the entity is visible */
  isVisible: boolean;
}

/**
 * Validates custom entity operations according to Apex semantic rules
 */
export class CustomEntityValidator {
  /**
   * Valid custom entity type suffixes
   */
  private static readonly VALID_CUSTOM_ENTITY_SUFFIXES = new Set([
    '__c', // Custom SObject
    '__kav', // Knowledge Article Version
    '__ka', // Knowledge Article
    '__x', // External Object
  ]);

  /**
   * Valid DML operations
   */
  private static readonly VALID_DML_OPERATIONS = new Set([
    'insert',
    'update',
    'upsert',
    'delete',
    'undelete',
  ]);

  /**
   * Valid SOQL operations
   */
  private static readonly VALID_SOQL_OPERATIONS = new Set([
    'select',
    'insert',
    'update',
    'delete',
    'upsert',
    'undelete',
  ]);

  /**
   * Validate a custom entity type
   */
  static validateCustomEntityType(
    typeInfo: CustomEntityTypeInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];

    // Check if the type is custom first
    if (!typeInfo.isCustom) {
      errors.push('custom.entity.not.custom.type');
      return {
        isValid: false,
        errors,
        warnings: [],
      };
    }

    // Check if the type is visible
    if (!typeInfo.isVisible) {
      errors.push('custom.entity.not.visible');
      return {
        isValid: false,
        errors,
        warnings: [],
      };
    }

    // Check naming convention
    if (!this.isValidCustomEntityTypeName(typeInfo.name)) {
      errors.push('custom.entity.invalid.naming.convention');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Validate a custom entity field
   */
  static validateCustomEntityField(
    fieldInfo: CustomEntityFieldInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];

    // Check if the field is custom first
    if (!fieldInfo.isCustom) {
      errors.push('custom.entity.field.not.custom');
      return {
        isValid: false,
        errors,
        warnings: [],
      };
    }

    // Check if the field is visible
    if (!fieldInfo.isVisible) {
      errors.push('custom.entity.field.not.visible');
      return {
        isValid: false,
        errors,
        warnings: [],
      };
    }

    // Check naming convention
    if (!this.isValidCustomFieldName(fieldInfo.name)) {
      errors.push('custom.entity.field.invalid.naming.convention');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Validate a custom entity operation
   */
  static validateCustomEntityOperation(
    operationInfo: CustomEntityOperationInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];

    // Check if the entity is custom
    if (!operationInfo.isCustom) {
      errors.push('custom.entity.operation.not.custom');
    }

    // Check if the entity is visible
    if (!operationInfo.isVisible) {
      errors.push('custom.entity.operation.not.visible');
    }

    // Check if the operation is valid
    if (!this.isValidOperation(operationInfo.operation)) {
      errors.push('custom.entity.operation.invalid');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Validate custom entity visibility
   */
  static validateCustomEntityVisibility(
    visibilityInfo: CustomEntityVisibilityInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];

    // Check if the entity is visible
    if (!visibilityInfo.isVisible) {
      errors.push('custom.entity.visibility.not.accessible');
      return {
        isValid: false,
        errors,
        warnings: [],
      };
    }

    // Check namespace access (simplified implementation)
    // In a real implementation, this would check for proper namespace access
    if (
      visibilityInfo.currentNamespace !== visibilityInfo.targetNamespace &&
      !visibilityInfo.isVisible
    ) {
      errors.push('custom.entity.visibility.not.accessible');
      return {
        isValid: false,
        errors,
        warnings: [],
      };
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: [],
    };
  }

  /**
   * Check if a custom entity type name is valid
   */
  private static isValidCustomEntityTypeName(name: string): boolean {
    // Empty names are invalid
    if (!name || name.trim().length === 0) {
      return false;
    }

    // Must have a valid suffix
    const hasValidSuffix = Array.from(this.VALID_CUSTOM_ENTITY_SUFFIXES).some(
      (suffix) => name.endsWith(suffix),
    );

    if (!hasValidSuffix) {
      return false;
    }

    // Must have content before the suffix
    const suffix = Array.from(this.VALID_CUSTOM_ENTITY_SUFFIXES).find((s) =>
      name.endsWith(s),
    );
    if (suffix && name.length <= suffix.length) {
      return false;
    }

    // Must start with a letter
    const nameWithoutSuffix = suffix ? name.slice(0, -suffix.length) : name;
    if (!/^[A-Za-z]/.test(nameWithoutSuffix)) {
      return false;
    }

    // Must only contain letters, numbers, and underscores
    if (!/^[A-Za-z0-9_]+$/.test(nameWithoutSuffix)) {
      return false;
    }

    return true;
  }

  /**
   * Check if a custom field name is valid
   */
  private static isValidCustomFieldName(name: string): boolean {
    // Empty names are invalid
    if (!name || name.trim().length === 0) {
      return false;
    }

    // Custom fields must end with __c
    if (!name.endsWith('__c')) {
      return false;
    }

    // Must have content before the suffix
    if (name.length <= 3) {
      return false;
    }

    // Must start with a letter
    const nameWithoutSuffix = name.slice(0, -3);
    if (!/^[A-Za-z]/.test(nameWithoutSuffix)) {
      return false;
    }

    // Must only contain letters, numbers, and underscores
    if (!/^[A-Za-z0-9_]+$/.test(nameWithoutSuffix)) {
      return false;
    }

    return true;
  }

  /**
   * Check if an operation is valid
   */
  private static isValidOperation(operation: string): boolean {
    return (
      this.VALID_DML_OPERATIONS.has(operation) ||
      this.VALID_SOQL_OPERATIONS.has(operation)
    );
  }
}
