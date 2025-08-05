/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import type { ValidationResult, ValidationScope } from './ValidationResult';
import type { TypeInfo, TypeValidationContext } from './TypeValidator';
import { SymbolVisibility } from '../../types/symbol';

/**
 * Validates type visibility and accessibility
 */
export class TypeVisibilityValidator {
  /**
   * Validate that a type is visible from the current context
   */
  static validateTypeVisibility(
    targetType: TypeInfo,
    currentContext: TypeValidationContext,
    scope: ValidationScope,
  ): ValidationResult {
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
