/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ValidationResult } from './ValidationResult';
import type { TypeInfo } from './TypeValidator';
import { SymbolVisibility } from '../../types/symbol';
import { STANDARD_SOBJECT_TYPES } from '../../constants/constants';

/**
 * Context for collection type validation
 */
export interface CollectionValidationContext {
  currentType: any | null;
  currentMethod: any | null;
  currentNamespace: string | null;
  isStaticContext: boolean;
  compilationContext: CompilationContext;
}

/**
 * Compilation context information
 */
export interface CompilationContext {
  namespace: { name: string } | null;
  version: number;
  isTrusted: boolean;
  sourceType: 'FILE' | 'ANONYMOUS';
  referencingType: any | null;
  enclosingTypes: any[];
  parentTypes: any[];
  isStaticContext: boolean;
}

/**
 * Validation scope for collection validation
 */
export interface ValidationScope {
  errors: {
    addError: (message: string, context?: any) => void;
    addWarning: (message: string, context?: any) => void;
  };
  settings: {
    collectMultipleErrors: boolean;
    breakOnFirstError: boolean;
    enableWarnings: boolean;
    maxErrors: number;
    version: number;
  };
  symbolTable: any;
  currentContext: CollectionValidationContext;
  compilationContext: CompilationContext;
}

/**
 * Validates collection types according to Apex semantic rules
 */
export class CollectionTypeValidator {
  // Collection type names
  private static readonly COLLECTION_TYPES = new Set(['List', 'Set', 'Map']);

  // Invalid element types for collections
  private static readonly INVALID_ELEMENT_TYPES = new Set(['void']);

  /**
   * Validate a collection type
   */
  static validateCollectionType(
    typeInfo: TypeInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if it's a collection type
    if (!this.isCollectionType(typeInfo)) {
      return { isValid: true, errors, warnings };
    }

    // Validate based on collection type
    switch (typeInfo.name) {
      case 'List':
        return this.validateListType(typeInfo, scope);
      case 'Set':
        return this.validateSetType(typeInfo, scope);
      case 'Map':
        return this.validateMapType(typeInfo, scope);
      default:
        return { isValid: true, errors, warnings };
    }
  }

  /**
   * Validate List type
   */
  private static validateListType(
    typeInfo: TypeInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if element type exists
    if (!typeInfo.elementType) {
      errors.push('invalid.collection.element.type');
      return { isValid: false, errors, warnings };
    }

    // Check if element type is valid
    if (this.isInvalidElementType(typeInfo.elementType)) {
      errors.push('invalid.collection.element.type');
      return { isValid: false, errors, warnings };
    }

    // Check if element type is visible
    if (!this.isTypeVisible(typeInfo.elementType, scope)) {
      errors.push('type.not.visible');
      return { isValid: false, errors, warnings };
    }

    // Special validation for SObject collections
    if (typeInfo.elementType.isSObject) {
      const sobjectResult = this.validateSObjectCollection(typeInfo, scope);
      if (!sobjectResult.isValid) {
        // Normalize errors to strings
        for (const error of sobjectResult.errors) {
          errors.push(typeof error === 'string' ? error : error.message);
        }
        return { isValid: false, errors, warnings };
      }
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate Set type
   */
  private static validateSetType(
    typeInfo: TypeInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if element type exists
    if (!typeInfo.elementType) {
      errors.push('invalid.collection.element.type');
      return { isValid: false, errors, warnings };
    }

    // Check if element type is valid
    if (this.isInvalidElementType(typeInfo.elementType)) {
      errors.push('invalid.collection.element.type');
      return { isValid: false, errors, warnings };
    }

    // Check if element type is visible
    if (!this.isTypeVisible(typeInfo.elementType, scope)) {
      errors.push('type.not.visible');
      return { isValid: false, errors, warnings };
    }

    // Special validation for SObject collections
    if (typeInfo.elementType.isSObject) {
      const sobjectResult = this.validateSObjectCollection(typeInfo, scope);
      if (!sobjectResult.isValid) {
        // Normalize errors to strings
        for (const error of sobjectResult.errors) {
          errors.push(typeof error === 'string' ? error : error.message);
        }
        return { isValid: false, errors, warnings };
      }
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate Map type
   */
  private static validateMapType(
    typeInfo: TypeInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if key type exists
    if (!typeInfo.keyType) {
      errors.push('invalid.map.key.type');
      return { isValid: false, errors, warnings };
    }

    // Check if value type exists
    if (!typeInfo.valueType) {
      errors.push('invalid.map.value.type');
      return { isValid: false, errors, warnings };
    }

    // Check if key type is valid
    if (this.isInvalidElementType(typeInfo.keyType)) {
      errors.push('invalid.map.key.type');
      return { isValid: false, errors, warnings };
    }

    // Check if value type is valid
    if (this.isInvalidElementType(typeInfo.valueType)) {
      errors.push('invalid.map.value.type');
      return { isValid: false, errors, warnings };
    }

    // Check if key type is visible
    if (!this.isTypeVisible(typeInfo.keyType, scope)) {
      errors.push('type.not.visible');
      return { isValid: false, errors, warnings };
    }

    // Check if value type is visible
    if (!this.isTypeVisible(typeInfo.valueType, scope)) {
      errors.push('type.not.visible');
      return { isValid: false, errors, warnings };
    }

    // Special validation for SObject collections
    if (typeInfo.keyType.isSObject || typeInfo.valueType.isSObject) {
      const sobjectResult = this.validateSObjectMap(typeInfo, scope);
      if (!sobjectResult.isValid) {
        // Normalize errors to strings
        for (const error of sobjectResult.errors) {
          errors.push(typeof error === 'string' ? error : error.message);
        }
        return { isValid: false, errors, warnings };
      }
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate SObject collection (List<SObject> or Set<SObject>)
   */
  private static validateSObjectCollection(
    typeInfo: TypeInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!typeInfo.elementType?.isSObject) {
      errors.push('invalid.sobject.list');
      return { isValid: false, errors, warnings };
    }

    // Validate SObject type name
    if (!this.isValidSObjectTypeName(typeInfo.elementType.name)) {
      errors.push('invalid.sobject.type');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate SObject Map (Map<Id, SObject> or Map<SObject, T>)
   */
  private static validateSObjectMap(
    typeInfo: TypeInfo,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if key type is valid for SObject maps
    if (typeInfo.keyType?.isSObject) {
      // Map<SObject, T> - key must be valid SObject type
      if (!this.isValidSObjectTypeName(typeInfo.keyType.name)) {
        errors.push('invalid.sobject.type');
        return { isValid: false, errors, warnings };
      }
    } else if (
      typeInfo.keyType?.name !== 'Id' &&
      typeInfo.keyType?.name !== 'String'
    ) {
      // Map<Id, SObject> or Map<String, SObject> - key must be Id or String
      errors.push('invalid.sobject.map');
      return { isValid: false, errors, warnings };
    }

    // Check if value type is valid for SObject maps
    if (typeInfo.valueType?.isSObject) {
      if (!this.isValidSObjectTypeName(typeInfo.valueType.name)) {
        errors.push('invalid.sobject.type');
        return { isValid: false, errors, warnings };
      }
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Check if a type is a collection type
   */
  private static isCollectionType(typeInfo: TypeInfo): boolean {
    return typeInfo.isCollection || this.COLLECTION_TYPES.has(typeInfo.name);
  }

  /**
   * Check if an element type is invalid for collections
   */
  private static isInvalidElementType(typeInfo: TypeInfo): boolean {
    return this.INVALID_ELEMENT_TYPES.has(typeInfo.name.toLowerCase());
  }

  /**
   * Check if a type is visible from the current context
   */
  private static isTypeVisible(
    typeInfo: TypeInfo,
    scope: ValidationScope,
  ): boolean {
    // Check if type is in the same namespace
    if (typeInfo.namespace && scope.currentContext.currentNamespace) {
      if (typeInfo.namespace.name !== scope.currentContext.currentNamespace) {
        // Check if type is public/global
        if (
          typeInfo.visibility !== SymbolVisibility.Public &&
          typeInfo.visibility !== SymbolVisibility.Global
        ) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if an SObject type name is valid
   */
  private static isValidSObjectTypeName(typeName: string): boolean {
    // Standard SObject types
    const standardSObjects = STANDARD_SOBJECT_TYPES;

    // Check if it's a standard SObject
    if (standardSObjects.has(typeName)) {
      return true;
    }

    // Check if it's a custom SObject (ends with __c)
    if (typeName.endsWith('__c')) {
      return true;
    }

    // Check if it's a custom SObject (ends with __kav for Knowledge Article Versions)
    if (typeName.endsWith('__kav')) {
      return true;
    }

    // Check if it's a custom SObject (ends with __ka for Knowledge Articles)
    if (typeName.endsWith('__ka')) {
      return true;
    }

    // Check if it's a custom SObject (ends with __x for External Objects)
    if (typeName.endsWith('__x')) {
      return true;
    }

    return false;
  }
}
