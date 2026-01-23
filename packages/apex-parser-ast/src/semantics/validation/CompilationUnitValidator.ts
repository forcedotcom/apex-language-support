/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ValidationResult, ValidationScope } from './ValidationResult';

/**
 * Extended validation scope for compilation unit validation
 */
interface CompilationUnitValidationScope extends ValidationScope {
  isTestContext?: boolean;
}

/**
 * File size limits for different compilation unit types
 */
const FILE_SIZE_LIMITS = {
  class: 1000000, // 1M characters for classes
  interface: 1000000, // 1M characters for interfaces
  enum: 1000000, // 1M characters for enums
  trigger: 1000000, // 1M characters for triggers
  anonymous: 32000, // 32K characters for anonymous blocks
  testAnonymous: 3200000, // 3.2M characters for test anonymous blocks
} as const;

/**
 * Expression length limit
 */
const EXPRESSION_LENGTH_LIMIT = 5000;

/**
 * Valid control characters (ASCII control characters that are allowed)
 */
const VALID_CONTROL_CHARS = new Set([
  0x09, // TAB
  0x0a, // LF (newline)
  0x0d, // CR (carriage return)
]);

/**
 * Invalid symbols that are not allowed in Apex
 */
const INVALID_SYMBOLS = new Set(['`', '#', '%']);

/**
 * Validates Apex compilation units (files)
 */
export class CompilationUnitValidator {
  /**
   * Validate file size for different compilation unit types
   * @param content - The file content
   * @param unitType - The type of compilation unit
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateFileSize(
    content: string,
    unitType: keyof typeof FILE_SIZE_LIMITS,
    scope: CompilationUnitValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get the appropriate size limit
    let sizeLimit = FILE_SIZE_LIMITS[unitType];

    // Use test limit for anonymous blocks in test context
    if (unitType === 'anonymous' && scope.isTestContext) {
      sizeLimit = FILE_SIZE_LIMITS.testAnonymous;
    }

    // Check if content exceeds the size limit
    if (content.length > sizeLimit) {
      errors.push('script.too.large');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
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
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if expression exceeds the length limit
    if (expression.length > EXPRESSION_LENGTH_LIMIT) {
      errors.push('expression.too.long');
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Validate characters in the compilation unit
   * @param content - The file content
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateCharacters(
    content: string,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < content.length; i++) {
      const charCode = content.charCodeAt(i);
      const char = content[i];

      // Check for invalid control characters
      if (charCode < 0x20 && !VALID_CONTROL_CHARS.has(charCode)) {
        errors.push(`Invalid control character: ${char}`);
        continue;
      }

      // Check for invalid symbols
      if (INVALID_SYMBOLS.has(char)) {
        errors.push(`Invalid symbol: ${char}`);
        continue;
      }

      // Check for invalid identifiers (non-ASCII characters above \u007F)
      if (charCode > 0x7f) {
        // Check if this is part of an identifier
        if (this.isPartOfIdentifier(content, i)) {
          errors.push(`Invalid identifier: ${char}`);
          continue;
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
   * Validate complete compilation unit with all rules
   * @param content - The file content
   * @param unitType - The type of compilation unit
   * @param scope - Validation scope
   * @returns Validation result
   */
  static validateCompilationUnit(
    content: string,
    unitType: keyof typeof FILE_SIZE_LIMITS,
    scope: CompilationUnitValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate file size
    const sizeResult = this.validateFileSize(content, unitType, scope);
    if (!sizeResult.isValid) {
      for (const error of sizeResult.errors) {
        errors.push(typeof error === 'string' ? error : error.message);
      }
    }

    // Validate characters
    const charResult = this.validateCharacters(content, scope);
    if (!charResult.isValid) {
      for (const error of charResult.errors) {
        errors.push(typeof error === 'string' ? error : error.message);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check if a character is part of an identifier
   * @param content - The file content
   * @param index - The character index
   * @returns True if the character is part of an identifier
   */
  private static isPartOfIdentifier(content: string, index: number): boolean {
    // Simple heuristic: check if the character is surrounded by identifier characters
    const before = index > 0 ? content[index - 1] : '';
    const after = index < content.length - 1 ? content[index + 1] : '';

    // Check if surrounded by letters, digits, or underscores
    const isIdentifierChar = (char: string) => /[a-zA-Z0-9_]/.test(char);

    return isIdentifierChar(before) || isIdentifierChar(after);
  }
}
