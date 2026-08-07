/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ValidationResult, ValidationScope } from './ValidationResult';
import type { ExpressionType } from './TypePromotionSystem';
import { isPrimitiveType } from '../../utils/primitiveTypes';
import type {
  ApexSymbol,
  TypeSymbol,
  VariableSymbol,
} from '../../types/symbol';
import { SymbolKind } from '../../types/symbol';
import { isAssignable } from './utils/typeAssignability';

/**
 * Parser/resolver-owned facts available while validating an SObject-style
 * constructor. An omitted member list means that member resolution has not
 * completed; an empty member list means it completed and found no members.
 */
export interface ConstructorExpressionSemanticContext {
  targetSymbol?: TypeSymbol;
  memberSymbols?: readonly VariableSymbol[];
  allSymbols?: readonly ApexSymbol[];
}

/**
 * Validator for constructor expressions (new expressions with field initializers)
 * Based on apex-jorje-semantic rules for NewKeyValueObjectExpression
 */
export class ConstructorExpressionValidator {
  /**
   * Validate a constructor expression with field initializers
   * @param targetType - The type being constructed
   * @param fieldInitializers - Map of field names to their expression types
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateConstructorExpression(
    targetType: ExpressionType,
    fieldInitializers: Map<string, ExpressionType>,
    scope: ValidationScope,
    semanticContext?: ConstructorExpressionSemanticContext,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // If no field initializers, constructor is valid for all types
    if (fieldInitializers.size === 0) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
      };
    }

    // Check for duplicate field initialization
    const fieldNames = Array.from(fieldInitializers.keys());
    const seenFields = new Set<string>();
    for (const fieldName of fieldNames) {
      const normalizedFieldName = fieldName.toLowerCase();
      if (seenFields.has(normalizedFieldName)) {
        errors.push('duplicate.field.init');
        break;
      }
      seenFields.add(normalizedFieldName);
    }

    // Check if target type supports name-value pair syntax
    const nameValuePairResult = this.validateNameValuePairSupport(targetType);
    if (!nameValuePairResult.isValid) {
      for (const error of nameValuePairResult.errors) {
        errors.push(typeof error === 'string' ? error : error.message);
      }
      for (const warning of nameValuePairResult.warnings) {
        warnings.push(typeof warning === 'string' ? warning : warning.message);
      }
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }

    // Validate each field (only if name-value pairs are supported)
    if (nameValuePairResult.isValid) {
      for (const [fieldName, expressionType] of fieldInitializers) {
        // Check field existence
        const fieldExistenceResult = this.validateFieldExistence(
          targetType,
          fieldName,
          semanticContext,
        );
        if (!fieldExistenceResult.isValid) {
          for (const error of fieldExistenceResult.errors) {
            errors.push(typeof error === 'string' ? error : error.message);
          }
          continue; // Skip type validation if field doesn't exist
        }

        // Check field type compatibility
        const fieldSymbol = this.getFieldSymbol(
          targetType,
          fieldName,
          semanticContext,
        );
        if (fieldSymbol) {
          const typeCompatibilityResult = this.validateFieldTypeCompatibility(
            fieldName,
            this.toExpressionType(fieldSymbol),
            expressionType,
            semanticContext?.allSymbols,
          );
          if (!typeCompatibilityResult.isValid) {
            for (const error of typeCompatibilityResult.errors) {
              errors.push(typeof error === 'string' ? error : error.message);
            }
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
   * Validate that a field exists in the target type
   * @param targetType - The type being constructed
   * @param fieldName - The field name to validate
   * @returns Validation result
   */
  static validateFieldExistence(
    targetType: ExpressionType,
    fieldName: string,
    semanticContext?: ConstructorExpressionSemanticContext,
  ): ValidationResult {
    // No resolved member set means existence is unknown, not invalid.
    if (
      !semanticContext?.memberSymbols ||
      (semanticContext.targetSymbol &&
        semanticContext.targetSymbol.name.toLowerCase() !==
          targetType.name.toLowerCase())
    ) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
      };
    }

    const fieldExists = !!this.getFieldSymbol(
      targetType,
      fieldName,
      semanticContext,
    );

    if (!fieldExists) {
      return {
        isValid: false,
        errors: ['field.does.not.exist'],
        warnings: [],
      };
    }

    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Validate field type compatibility with expression type
   * @param fieldName - The field name
   * @param fieldType - The expected field type
   * @param expressionType - The expression type being assigned
   * @returns Validation result
   */
  static validateFieldTypeCompatibility(
    fieldName: string,
    fieldType: ExpressionType,
    expressionType: ExpressionType,
    allSymbols?: readonly ApexSymbol[],
  ): ValidationResult {
    void fieldName;
    if (
      isAssignable(expressionType.name, fieldType.name, 'assignment', {
        allSymbols: allSymbols ? [...allSymbols] : undefined,
      })
    ) {
      return {
        isValid: true,
        errors: [],
        warnings: [],
      };
    }

    return {
      isValid: false,
      errors: ['illegal.assignment'],
      warnings: [],
    };
  }

  /**
   * Validate that the target type supports name-value pair constructor syntax
   * @param targetType - The type being constructed
   * @returns Validation result
   */
  static validateNameValuePairSupport(
    targetType: ExpressionType,
  ): ValidationResult {
    if (isPrimitiveType(targetType.name)) {
      return {
        isValid: false,
        errors: ['invalid.name.value.pair.constructor'],
        warnings: [],
      };
    }

    // A resolved non-primitive type may support name-value pairs. This legacy
    // API has no SObject-kind fact, so it cannot reject an unresolved object.
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  private static getFieldSymbol(
    targetType: ExpressionType,
    fieldName: string,
    semanticContext?: ConstructorExpressionSemanticContext,
  ): VariableSymbol | undefined {
    const members = semanticContext?.memberSymbols;
    if (!members) {
      return undefined;
    }
    if (
      semanticContext.targetSymbol &&
      semanticContext.targetSymbol.name.toLowerCase() !==
        targetType.name.toLowerCase()
    ) {
      return undefined;
    }

    const normalizedFieldName = fieldName.toLowerCase();
    return members.find(
      (member) =>
        (member.kind === SymbolKind.Field ||
          member.kind === SymbolKind.Property) &&
        (!semanticContext.targetSymbol ||
          member.parentId === semanticContext.targetSymbol.id) &&
        member.name.toLowerCase() === normalizedFieldName,
    );
  }

  private static toExpressionType(field: VariableSymbol): ExpressionType {
    return {
      kind: field.type.isCollection
        ? 'collection'
        : field.type.isPrimitive
          ? 'primitive'
          : 'object',
      name: field.type.name,
      isNullable: true,
      isArray: field.type.isArray,
    };
  }
}
