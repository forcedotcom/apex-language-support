import { ValidationResult, ValidationScope } from './ValidationResult';
import { TypeInfo } from './TypeValidator';

/**
 * Valid SObject collection operations
 */
const VALID_SOBJECT_COLLECTION_OPERATIONS = new Set([
  'add',
  'addAll',
  'clear',
  'clone',
  'contains',
  'containsAll',
  'equals',
  'get',
  'hashCode',
  'isEmpty',
  'iterator',
  'put',
  'putAll',
  'remove',
  'removeAll',
  'retainAll',
  'size',
  'toString',
]);

/**
 * Valid SObject Map key types
 */
const VALID_SOBJECT_MAP_KEY_TYPES = new Set(['Id', 'String']);

/**
 * Validates SObject collection operations according to Apex semantic rules
 */
export class SObjectCollectionValidator {
  /**
   * Validate an SObject collection operation
   */
  static validateSObjectCollectionOperation(
    collectionType: TypeInfo,
    operation: string,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Must be a collection
    if (!collectionType?.isCollection) {
      errors.push('invalid.sobject.collection');
      return { isValid: false, errors, warnings };
    }

    // Check 2: For Map collections, validate key/value types first
    if (collectionType.name === 'Map') {
      const mapValidation = this.validateSObjectMapTypes(collectionType);
      if (!mapValidation.isValid) {
        errors.push(...mapValidation.errors);
        return { isValid: false, errors, warnings };
      }
    }

    // Check 3: Must contain SObject types (for List/Set)
    if (
      (collectionType.name === 'List' || collectionType.name === 'Set') &&
      !this.containsSObjectTypes(collectionType)
    ) {
      errors.push('invalid.sobject.collection');
      return { isValid: false, errors, warnings };
    }

    // Check 4: Operation must be valid
    if (!operation || !VALID_SOBJECT_COLLECTION_OPERATIONS.has(operation)) {
      errors.push('invalid.collection.operation');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate an SObject collection type
   */
  static validateSObjectCollectionType(
    collectionType: TypeInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Must be a collection
    if (!collectionType?.isCollection) {
      errors.push('invalid.sobject.collection');
      return { isValid: false, errors, warnings };
    }

    // Check 2: For Map collections, validate key/value types first
    if (collectionType.name === 'Map') {
      const mapValidation = this.validateSObjectMapTypes(collectionType);
      if (!mapValidation.isValid) {
        errors.push(...mapValidation.errors);
        return { isValid: false, errors, warnings };
      }
    }

    // Check 3: Must contain SObject types (for List/Set)
    if (
      (collectionType.name === 'List' || collectionType.name === 'Set') &&
      !this.containsSObjectTypes(collectionType)
    ) {
      errors.push('invalid.sobject.collection');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Check if collection contains SObject types
   */
  private static containsSObjectTypes(type: TypeInfo): boolean {
    if (!type) {
      return false;
    }

    // For List/Set collections
    if (type.name === 'List' || type.name === 'Set') {
      return type.elementType?.isSObject === true;
    }

    // For Map collections
    if (type.name === 'Map') {
      return type.valueType?.isSObject === true;
    }

    return false;
  }

  /**
   * Validate SObject Map key and value types
   */
  private static validateSObjectMapTypes(mapType: TypeInfo): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check key type
    if (!mapType.keyType) {
      errors.push('invalid.sobject.map');
      return { isValid: false, errors, warnings };
    }

    if (!VALID_SOBJECT_MAP_KEY_TYPES.has(mapType.keyType.name)) {
      errors.push('invalid.sobject.map.key');
      return { isValid: false, errors, warnings };
    }

    // Check value type
    if (!mapType.valueType) {
      errors.push('invalid.sobject.map');
      return { isValid: false, errors, warnings };
    }

    if (!mapType.valueType.isSObject) {
      errors.push('invalid.sobject.map');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }
}
