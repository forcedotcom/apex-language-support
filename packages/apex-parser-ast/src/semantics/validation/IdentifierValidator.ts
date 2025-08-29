/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SymbolKind } from '../../types/symbol';
import { ValidationResult, ValidationScope } from './ValidationResult';

/**
 * Validates Apex identifiers according to semantic rules
 */
export class IdentifierValidator {
  // Reserved names from apex-jorje-semantic (all lowercase for case-insensitive comparison)
  private static readonly RESERVED_NAMES = new Set([
    'array',
    'activate',
    'any',
    'autonomous',
    'begin',
    'bigdecimal',
    'bulk',
    'byte',
    'case',
    'cast',
    'char',
    'collect',
    'commit',
    'const',
    'default',
    'desc',
    'end',
    'export',
    'exception',
    'exit',
    'float',
    'goto',
    'group',
    'having',
    'hint',
    'int',
    'into',
    'inner',
    'import',
    'join',
    'loop',
    'number',
    'object',
    'outer',
    'of',
    'package',
    'parallel',
    'pragma',
    'retrieve',
    'rollback',
    'sort',
    'short',
    'super',
    'switch',
    'system',
    'synchronized',
    'transaction',
    'this',
    'then',
    'when',
  ]);

  // Reserved type names (all lowercase for case-insensitive comparison)
  private static readonly RESERVED_TYPE_NAMES = new Set(['apexpages', 'page']);

  // Keywords (all lowercase for case-insensitive comparison)
  private static readonly KEYWORDS = new Set([
    'trigger',
    'insert',
    'update',
    'upsert',
    'delete',
    'undelete',
    'merge',
    'new',
    'for',
    'select',
  ]);

  /**
   * Validate an identifier according to Apex semantic rules
   */
  static validateIdentifier(
    name: string,
    type: SymbolKind,
    isTopLevel: boolean,
    scope: ValidationScope,
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check 1: Valid characters
    if (!this.hasValidCharacters(name)) {
      errors.push(`Invalid character in identifier: ${name}`);
      return { isValid: false, errors, warnings };
    }

    // Check 2: Reserved names (methods can use reserved names)
    if (
      type !== SymbolKind.Method &&
      this.RESERVED_NAMES.has(name.toLowerCase())
    ) {
      errors.push(`Identifier name is reserved: ${name}`);
      return { isValid: false, errors, warnings };
    }

    // Check 3: Keywords (methods can use keywords)
    if (type !== SymbolKind.Method && this.KEYWORDS.has(name.toLowerCase())) {
      errors.push(`Identifier cannot be a keyword: ${name}`);
      return { isValid: false, errors, warnings };
    }

    // Check 4: Reserved type names (only for class/interface)
    if (
      (type === SymbolKind.Class || type === SymbolKind.Interface) &&
      this.RESERVED_TYPE_NAMES.has(name.toLowerCase())
    ) {
      errors.push(`Identifier type is reserved: ${name}`);
      return { isValid: false, errors, warnings };
    }

    // Check 5: Length validation
    const maxLength = this.getMaxLength(type, isTopLevel, scope);
    if (name.length > maxLength) {
      errors.push(`Identifier name is too long: ${name} (max: ${maxLength})`);
      return { isValid: false, errors, warnings };
    }

    return { isValid: true, errors, warnings };
  }

  /**
   * Check if identifier has valid characters
   */
  private static hasValidCharacters(name: string): boolean {
    if (!name || name.length === 0) {
      return false;
    }

    // Must start with a letter
    if (!this.isLetter(name.charAt(0))) {
      return false;
    }

    let lastChar = 'x';
    for (let i = 0; i < name.length; i++) {
      const char = name.charAt(i);

      // Only letters, digits, and underscores allowed
      if (!this.isLetter(char) && !this.isDigit(char) && char !== '_') {
        return false;
      }

      // No consecutive underscores
      if (lastChar === '_' && char === '_') {
        return false;
      }
      lastChar = char;
    }

    // Cannot end with underscore
    return lastChar !== '_';
  }

  /**
   * Check if character is a letter
   */
  private static isLetter(char: string): boolean {
    return /[a-zA-Z]/.test(char);
  }

  /**
   * Check if character is a digit
   */
  private static isDigit(char: string): boolean {
    return /[0-9]/.test(char);
  }

  /**
   * Get maximum length for identifier type
   */
  private static getMaxLength(
    type: SymbolKind,
    isTopLevel: boolean,
    scope: ValidationScope,
  ): number {
    const MAX_LENGTH = 255;
    const MAX_CLASS_LENGTH = 40;

    switch (type) {
      case SymbolKind.Enum:
      case SymbolKind.Class:
      case SymbolKind.Interface:
        // Check if long identifiers are supported
        if (!isTopLevel || scope.supportsLongIdentifiers) {
          return MAX_LENGTH;
        }
        return MAX_CLASS_LENGTH;
      case SymbolKind.Method:
      case SymbolKind.Variable:
      case SymbolKind.Constructor:
      case SymbolKind.Trigger:
      case SymbolKind.Property:
      case SymbolKind.Field:
      case SymbolKind.Parameter:
      case SymbolKind.EnumValue:
        return MAX_LENGTH;
      default:
        return MAX_LENGTH;
    }
  }
}
