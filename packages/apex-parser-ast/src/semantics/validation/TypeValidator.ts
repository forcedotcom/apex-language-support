/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import type { ValidationResult, ValidationScope } from './ValidationResult';
import { SymbolVisibility } from '../../types/symbol';

/**
 * Type information for validation
 */
export interface TypeInfo {
  name: string;
  namespace?: { name: string } | null;
  visibility: SymbolVisibility;
  isPrimitive: boolean;
  isSObject: boolean;
  isCollection: boolean;
  elementType?: TypeInfo; // For collections
  keyType?: TypeInfo; // For maps
  valueType?: TypeInfo; // For maps
}

/**
 * Result of type validation
 */
export interface TypeValidationResult extends ValidationResult {
  type?: TypeInfo;
}

/**
 * Context for type validation
 */
export interface TypeValidationContext {
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
 * Main type validator class
 */
export class TypeValidator {
  /**
   * Validate a type according to Apex semantic rules
   */
  static validateType(
    typeInfo: TypeInfo,
    context: TypeValidationContext,
    scope: ValidationScope,
  ): TypeValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check type visibility
    const visibilityResult = TypeVisibilityValidator.validateTypeVisibility(
      typeInfo,
      context,
      scope,
    );
    if (!visibilityResult.isValid) {
      errors.push(...visibilityResult.errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      type: typeInfo,
    };
  }
}

/**
 * Type visibility validator
 */
export class TypeVisibilityValidator {
  /**
   * Validate that a type is visible from the current context
   */
  static validateTypeVisibility(
    targetType: TypeInfo,
    currentContext: TypeValidationContext,
    scope: ValidationScope,
  ): TypeValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if type is in the same namespace
    if (targetType.namespace && currentContext.currentNamespace) {
      if (targetType.namespace.name !== currentContext.currentNamespace) {
        // Check if type is public/global
        if (
          targetType.visibility !== SymbolVisibility.Public &&
          targetType.visibility !== SymbolVisibility.Global
        ) {
          errors.push('type.not.visible');
          return { isValid: false, errors, warnings };
        }
      }
    }

    return { isValid: true, errors, warnings };
  }
}

// Re-export ValidationScope for convenience
export type { ValidationScope } from './ValidationResult';
