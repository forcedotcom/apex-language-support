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
