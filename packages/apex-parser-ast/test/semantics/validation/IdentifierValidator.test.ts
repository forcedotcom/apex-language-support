/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SymbolKind } from '../../../src/types/symbol';
import { ValidationScope } from '../../../src/semantics/validation/ValidationResult';
import { IdentifierValidator } from '../../../src/semantics/validation/IdentifierValidator';

/**
 * Create a mock validation scope for testing
 */
function createMockScope(
  overrides: Partial<ValidationScope> = {},
): ValidationScope {
  return {
    supportsLongIdentifiers: false,
    version: 58,
    isFileBased: true,
    ...overrides,
  };
}

describe('IdentifierValidator', () => {
  describe('Reserved Names', () => {
    const reservedNames = [
      'array',
      'activate',
      'any',
      'autonomous',
      'begin',
      'bigDecimal',
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
    ];

    it.each(reservedNames)('should reject reserved name: %s', (name) => {
      const result = IdentifierValidator.validateIdentifier(
        name,
        SymbolKind.Variable,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(`Identifier name is reserved: ${name}`);
    });

    it('should allow reserved names for methods', () => {
      const result = IdentifierValidator.validateIdentifier(
        'array',
        SymbolKind.Method,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(true);
    });

    it('should be case-insensitive for reserved names', () => {
      const result = IdentifierValidator.validateIdentifier(
        'ARRAY',
        SymbolKind.Variable,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Identifier name is reserved: ARRAY');
    });
  });

  describe('Reserved Type Names', () => {
    const reservedTypeNames = ['apexPages', 'page'];

    it.each(reservedTypeNames)(
      'should reject reserved type name: %s for classes',
      (name) => {
        const result = IdentifierValidator.validateIdentifier(
          name,
          SymbolKind.Class,
          true,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(`Identifier type is reserved: ${name}`);
      },
    );

    it.each(reservedTypeNames)(
      'should reject reserved type name: %s for interfaces',
      (name) => {
        const result = IdentifierValidator.validateIdentifier(
          name,
          SymbolKind.Interface,
          true,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(`Identifier type is reserved: ${name}`);
      },
    );

    it('should allow reserved type names for variables', () => {
      const result = IdentifierValidator.validateIdentifier(
        'apexPages',
        SymbolKind.Variable,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe('Keywords', () => {
    // Test a sample of keywords (now using centralized keyword set)
    const keywords = [
      'insert',
      'update',
      'upsert',
      'delete',
      'undelete',
      'merge',
      'new',
      'for',
      'if',
      'class',
      'while',
      'try',
      'catch',
    ];

    it.each(keywords)('should reject keyword: %s', (keyword) => {
      const result = IdentifierValidator.validateIdentifier(
        keyword,
        SymbolKind.Variable,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Identifier cannot be a keyword: ${keyword}`,
      );
    });

    it('should allow keywords for methods', () => {
      const result = IdentifierValidator.validateIdentifier(
        'insert',
        SymbolKind.Method,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe('Contextual Keywords', () => {
    // Contextual keywords that can be used as identifiers (class names, etc.)
    // These are keywords in specific contexts (like SOQL/SOSL queries) but valid as identifiers elsewhere
    const contextualKeywords = [
      'metadata',
      'reference',
      'name',
      'count',
      'offset',
      'limit',
    ];

    it.each(contextualKeywords)(
      'should allow contextual keyword as class name: %s',
      (keyword) => {
        const result = IdentifierValidator.validateIdentifier(
          keyword,
          SymbolKind.Class,
          true,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
      },
    );

    it.each(contextualKeywords)(
      'should allow contextual keyword as variable name: %s',
      (keyword) => {
        const result = IdentifierValidator.validateIdentifier(
          keyword,
          SymbolKind.Variable,
          false,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
      },
    );

    it('should allow metadata as interface name', () => {
      const result = IdentifierValidator.validateIdentifier(
        'metadata',
        SymbolKind.Interface,
        true,
        createMockScope(),
      );

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should allow Metadata as inner class name', () => {
      const result = IdentifierValidator.validateIdentifier(
        'Metadata',
        SymbolKind.Class,
        false, // isTopLevel = false for inner class
        createMockScope(),
      );

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should allow reference as field name', () => {
      const result = IdentifierValidator.validateIdentifier(
        'reference',
        SymbolKind.Field,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should allow name as field name', () => {
      const result = IdentifierValidator.validateIdentifier(
        'name',
        SymbolKind.Field,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should allow count as variable name', () => {
      const result = IdentifierValidator.validateIdentifier(
        'count',
        SymbolKind.Variable,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should allow select as class name', () => {
      // 'select' is contextual (Grammar id rule) - valid as identifier in Apex code
      const result = IdentifierValidator.validateIdentifier(
        'select',
        SymbolKind.Class,
        true,
        createMockScope(),
      );

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should allow SelectOption as class name', () => {
      // Test that 'select' part doesn't cause issues in compound names
      // Compound names are validated as whole identifiers, not word-by-word
      const result = IdentifierValidator.validateIdentifier(
        'SelectOption',
        SymbolKind.Class,
        true,
        createMockScope(),
      );

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('Character Validation', () => {
    it('should reject identifiers starting with non-letter', () => {
      const invalidStarters = ['123abc', '_test', '@name', '#var'];

      invalidStarters.forEach((name) => {
        const result = IdentifierValidator.validateIdentifier(
          name,
          SymbolKind.Variable,
          false,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          `Invalid character in identifier: ${name}`,
        );
      });
    });

    it('should reject identifiers with invalid characters', () => {
      const invalidChars = ['test@name', 'var#123', 'func$tion', 'class%type'];

      invalidChars.forEach((name) => {
        const result = IdentifierValidator.validateIdentifier(
          name,
          SymbolKind.Variable,
          false,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain(
          `Invalid character in identifier: ${name}`,
        );
      });
    });

    it('should reject consecutive underscores', () => {
      const result = IdentifierValidator.validateIdentifier(
        'test__name',
        SymbolKind.Variable,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Invalid character in identifier: test__name',
      );
    });

    it('should reject identifiers ending with underscore', () => {
      const result = IdentifierValidator.validateIdentifier(
        'testName_',
        SymbolKind.Variable,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Invalid character in identifier: testName_',
      );
    });

    it('should accept valid identifiers', () => {
      const validIdentifiers = [
        'testName',
        'TestClass',
        'myVariable123',
        'user_name',
        'camelCase',
        'PascalCase',
        'snake_case',
      ];

      validIdentifiers.forEach((name) => {
        const result = IdentifierValidator.validateIdentifier(
          name,
          SymbolKind.Variable,
          false,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Length Validation', () => {
    it('should reject identifiers longer than 255 characters', () => {
      const longName = 'a'.repeat(256);
      const result = IdentifierValidator.validateIdentifier(
        longName,
        SymbolKind.Variable,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Identifier name is too long: ${longName}`,
      );
    });

    it('should allow identifiers exactly 255 characters', () => {
      const maxLengthName = 'a'.repeat(255);
      const result = IdentifierValidator.validateIdentifier(
        maxLengthName,
        SymbolKind.Variable,
        false,
        createMockScope(),
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject top-level classes longer than 40 characters when long identifiers not supported', () => {
      const longClassName = 'a'.repeat(41);
      const result = IdentifierValidator.validateIdentifier(
        longClassName,
        SymbolKind.Class,
        true,
        createMockScope({ supportsLongIdentifiers: false }),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Identifier name is too long: ${longClassName}`,
      );
    });

    it('should allow top-level classes longer than 40 characters when long identifiers supported', () => {
      const longClassName = 'a'.repeat(41);
      const result = IdentifierValidator.validateIdentifier(
        longClassName,
        SymbolKind.Class,
        true,
        createMockScope({ supportsLongIdentifiers: true }),
      );

      expect(result.isValid).toBe(true);
    });

    it('should allow non-top-level classes longer than 40 characters', () => {
      const longClassName = 'a'.repeat(41);
      const result = IdentifierValidator.validateIdentifier(
        longClassName,
        SymbolKind.Class,
        false,
        createMockScope({ supportsLongIdentifiers: false }),
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject top-level interfaces longer than 40 characters when long identifiers not supported', () => {
      const longInterfaceName = 'a'.repeat(41);
      const result = IdentifierValidator.validateIdentifier(
        longInterfaceName,
        SymbolKind.Interface,
        true,
        createMockScope({ supportsLongIdentifiers: false }),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Identifier name is too long: ${longInterfaceName}`,
      );
    });

    it('should reject top-level enums longer than 40 characters when long identifiers not supported', () => {
      const longEnumName = 'a'.repeat(41);
      const result = IdentifierValidator.validateIdentifier(
        longEnumName,
        SymbolKind.Enum,
        true,
        createMockScope({ supportsLongIdentifiers: false }),
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        `Identifier name is too long: ${longEnumName}`,
      );
    });

    it('should allow methods longer than 40 characters', () => {
      const longMethodName = 'a'.repeat(41);
      const result = IdentifierValidator.validateIdentifier(
        longMethodName,
        SymbolKind.Method,
        false,
        createMockScope({ supportsLongIdentifiers: false }),
      );

      expect(result.isValid).toBe(true);
    });

    it('should allow variables longer than 40 characters', () => {
      const longVariableName = 'a'.repeat(41);
      const result = IdentifierValidator.validateIdentifier(
        longVariableName,
        SymbolKind.Variable,
        false,
        createMockScope({ supportsLongIdentifiers: false }),
      );

      expect(result.isValid).toBe(true);
    });
  });
});
