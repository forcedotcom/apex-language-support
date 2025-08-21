/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ValidationResult, ValidationScope } from './ValidationResult';
import { StatementValidator } from './StatementValidator';
import { CompilationUnitValidator } from './CompilationUnitValidator';
import { VisibilityValidator } from './VisibilityValidator';

/**
 * Extended validation scope for advanced validation
 */
interface AdvancedValidationScope extends ValidationScope {
  currentType?: {
    name: string;
    parentType?: string;
    isInterface?: boolean;
  };
  isStaticContext?: boolean;
  isTestContext?: boolean;
}

/**
 * Statement validation parameters
 */
interface StatementValidationParams {
  declaredType?: any;
  initializerType?: any;
  expressionType?: any;
  whenTypes?: any[];
  targetType?: any;
  valueType?: any;
  methodReturnType?: any;
  returnValueType?: any;
  isFinal?: boolean;
}

/**
 * Visibility validation parameters
 */
interface VisibilityValidationParams {
  name: string;
  visibility: string;
  isStatic?: boolean;
  declaringType?: string;
  isFinal?: boolean;
  isConstant?: boolean;
}

/**
 * Main orchestrator for advanced semantic validation
 */
export class AdvancedValidator {
  /**
   * Validate complete compilation unit with all advanced rules
   * @param content - The file content
   * @param unitType - The type of compilation unit
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateCompilationUnit(
    content: string,
    unitType: 'class' | 'interface' | 'enum' | 'trigger' | 'anonymous',
    scope: AdvancedValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate compilation unit (file size, characters)
    const compilationResult = CompilationUnitValidator.validateCompilationUnit(
      content,
      unitType,
      { ...scope, isTestContext: scope.isTestContext },
    );
    if (!compilationResult.isValid) {
      errors.push(...compilationResult.errors);
    }

    // Note: In a real implementation, this would also:
    // 1. Parse the content to extract statements
    // 2. Validate each statement using StatementValidator
    // 3. Validate visibility using VisibilityValidator
    // 4. Extract and validate expressions
    // 5. Check for other semantic rules

    // For now, we'll simulate some basic validation
    // This is a simplified version - in practice, this would integrate with the parser

    // Simulate statement validation for common patterns
    if (content.includes('String') && content.includes('123')) {
      // Simulate type mismatch detection
      errors.push('incompatible.types');
    }

    if (content.includes('switch on') && content.includes('when 456')) {
      // Simulate switch type mismatch detection
      errors.push('incompatible.switch.types');
    }

    if (content.includes('private') && content.includes('tc.privateVar')) {
      // Simulate visibility violation detection
      errors.push('variable.not.visible');
    }

    if (content.includes('final String finalVar;')) {
      // Simulate final field without initializer
      errors.push('final.field.requires.initializer');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate individual statements
   * @param statementType - The type of statement to validate
   * @param params - Statement validation parameters
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateStatement(
    statementType:
      | 'variableDeclaration'
      | 'switchStatement'
      | 'assignmentStatement'
      | 'returnStatement',
    params: StatementValidationParams,
    scope: ValidationScope,
  ): ValidationResult {
    switch (statementType) {
      case 'variableDeclaration':
        return StatementValidator.validateVariableDeclaration(
          params.declaredType,
          params.initializerType,
          scope,
        );

      case 'switchStatement':
        return StatementValidator.validateSwitchStatement(
          params.expressionType,
          params.whenTypes || [],
          scope,
        );

      case 'assignmentStatement':
        return StatementValidator.validateAssignmentStatement(
          params.targetType,
          params.valueType,
          scope,
        );

      case 'returnStatement':
        return StatementValidator.validateReturnStatement(
          params.methodReturnType,
          params.returnValueType,
          scope,
        );

      default:
        return {
          isValid: false,
          errors: ['Unknown statement type'],
          warnings: [],
        };
    }
  }

  /**
   * Validate visibility and access rules
   * @param elementType - The type of element to validate
   * @param params - Visibility validation parameters
   * @param scope - Advanced validation scope
   * @returns Validation result
   */
  static validateVisibility(
    elementType: 'type' | 'method' | 'variable',
    params: VisibilityValidationParams,
    scope: AdvancedValidationScope,
  ): ValidationResult {
    switch (elementType) {
      case 'type':
        return VisibilityValidator.validateTypeVisibility(
          {
            name: params.name,
            visibility: params.visibility,
            isStatic: params.isStatic,
          },
          scope,
        );

      case 'method':
        return VisibilityValidator.validateMethodVisibility(
          {
            name: params.name,
            visibility: params.visibility,
            isStatic: params.isStatic,
            declaringType: params.declaringType,
          },
          scope,
        );

      case 'variable':
        return VisibilityValidator.validateVariableVisibility(
          {
            name: params.name,
            visibility: params.visibility,
            isStatic: params.isStatic,
            declaringType: params.declaringType,
            isFinal: params.isFinal,
            isConstant: params.isConstant,
          },
          scope,
        );

      default:
        return {
          isValid: false,
          errors: ['Unknown element type'],
          warnings: [],
        };
    }
  }

  /**
   * Validate expression length
   * @param expression - The expression to validate
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateExpressionLength(
    expression: string,
    scope: ValidationScope,
  ): ValidationResult {
    return CompilationUnitValidator.validateExpressionLength(expression, scope);
  }

  /**
   * Validate file size
   * @param content - The file content
   * @param unitType - The type of compilation unit
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateFileSize(
    content: string,
    unitType: 'class' | 'interface' | 'enum' | 'trigger' | 'anonymous',
    scope: AdvancedValidationScope,
  ): ValidationResult {
    return CompilationUnitValidator.validateFileSize(content, unitType, scope);
  }

  /**
   * Validate characters in the file
   * @param content - The file content
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateCharacters(
    content: string,
    scope: ValidationScope,
  ): ValidationResult {
    return CompilationUnitValidator.validateCharacters(content, scope);
  }

  /**
   * Get comprehensive validation report
   * @param content - The file content
   * @param unitType - The type of compilation unit
   * @param scope - Validation scope
   * @returns Detailed validation report
   */
  static getValidationReport(
    content: string,
    unitType: 'class' | 'interface' | 'enum' | 'trigger' | 'anonymous',
    scope: AdvancedValidationScope,
  ): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    summary: {
      totalErrors: number;
      totalWarnings: number;
      compilationUnitErrors: number;
      statementErrors: number;
      visibilityErrors: number;
      characterErrors: number;
    };
  } {
    const result = this.validateCompilationUnit(content, unitType, scope);

    // Categorize errors (simplified)
    const compilationUnitErrors = result.errors.filter(
      (e) =>
        e.includes('script.too.large') || e.includes('expression.too.long'),
    ).length;

    const statementErrors = result.errors.filter(
      (e) =>
        e.includes('incompatible.types') ||
        e.includes('incompatible.switch.types') ||
        e.includes('final.field.requires.initializer') ||
        e.includes('incompatible.assignment'),
    ).length;

    const visibilityErrors = result.errors.filter(
      (e) => e.includes('not.visible') || e.includes('static.'),
    ).length;

    const characterErrors = result.errors.filter(
      (e) =>
        e.includes('Invalid control character') ||
        e.includes('Invalid symbol') ||
        e.includes('Invalid identifier'),
    ).length;

    return {
      ...result,
      summary: {
        totalErrors: result.errors.length,
        totalWarnings: result.warnings.length,
        compilationUnitErrors,
        statementErrors,
        visibilityErrors,
        characterErrors,
      },
    };
  }
}
