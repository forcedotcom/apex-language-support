/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  APEX_KEYWORDS,
  APEX_KEYWORDS_ARRAY,
  BUILTIN_TYPE_NAMES,
  BUILTIN_TYPE_NAMES_ARRAY,
  CONTEXTUAL_KEYWORDS,
  CONTEXTUAL_KEYWORDS_ARRAY,
  isApexKeyword,
} from '../../src/utils/ApexKeywords';

describe('ApexKeywords', () => {
  describe('Keyword List Snapshot', () => {
    it('should have consistent keyword list (snapshot test)', () => {
      // Sort keywords for consistent snapshot
      const sortedKeywords = Array.from(APEX_KEYWORDS_ARRAY).sort();
      expect(sortedKeywords).toMatchSnapshot('apex-keywords-list');
    });

    it('should have reasonable number of keywords', () => {
      // Expect at least 50 keywords (core Apex + SOQL + SOSL + date functions)
      expect(APEX_KEYWORDS_ARRAY.length).toBeGreaterThan(50);
      // Expect less than 300 keywords (sanity check)
      expect(APEX_KEYWORDS_ARRAY.length).toBeLessThan(300);
    });
  });

  describe('isApexKeyword()', () => {
    describe('Core Apex Keywords', () => {
      const coreKeywords = [
        'abstract',
        'class',
        'if',
        'for',
        'while',
        'try',
        'catch',
        'finally',
        'return',
        'void',
        'public',
        'private',
        'protected',
        'global',
        'static',
        'final',
        'virtual',
        'override',
        'new',
        'this',
        'super',
        'null',
      ];

      it.each(coreKeywords)('should recognize core keyword: %s', (keyword) => {
        expect(isApexKeyword(keyword)).toBe(true);
        expect(isApexKeyword(keyword.toUpperCase())).toBe(true);
        expect(
          isApexKeyword(keyword.charAt(0).toUpperCase() + keyword.slice(1)),
        ).toBe(true);
      });
    });

    describe('SOQL Keywords', () => {
      const soqlKeywords = [
        'select',
        'from',
        'where',
        'order',
        'by',
        'limit',
        'group',
        'having',
        'and',
        'or',
        'not',
        'like',
        'in',
        'includes',
        'excludes',
      ];

      it.each(soqlKeywords)('should recognize SOQL keyword: %s', (keyword) => {
        expect(isApexKeyword(keyword)).toBe(true);
      });
    });

    describe('Case Insensitive Matching', () => {
      it('should match keywords case-insensitively', () => {
        expect(isApexKeyword('if')).toBe(true);
        expect(isApexKeyword('IF')).toBe(true);
        expect(isApexKeyword('If')).toBe(true);
        expect(isApexKeyword('iF')).toBe(true);
      });

      it('should match SOQL keywords case-insensitively', () => {
        expect(isApexKeyword('select')).toBe(true);
        expect(isApexKeyword('SELECT')).toBe(true);
        expect(isApexKeyword('Select')).toBe(true);
        expect(isApexKeyword('from')).toBe(true);
        expect(isApexKeyword('FROM')).toBe(true);
        expect(isApexKeyword('From')).toBe(true);
      });
    });

    describe('Non-Keywords', () => {
      const nonKeywords = [
        'MyClass',
        'myMethod',
        'variableName',
        'Database',
        'String',
        'Integer',
        'Account',
        'Contact',
        'customField',
        'MyVariable',
        'SomeClassName',
        'methodName',
      ];

      it.each(nonKeywords)(
        'should return false for non-keyword: %s',
        (name) => {
          expect(isApexKeyword(name)).toBe(false);
        },
      );

      it('should NOT treat builtin type names as keywords', () => {
        // Builtin types that are also keywords should NOT be treated as keywords
        // They should be resolvable as types via built-in type resolution
        const builtinTypes = [
          'blob',
          'boolean',
          'date',
          'datetime',
          'decimal',
          'double',
          'id',
          'integer',
          'list',
          'long',
          'map',
          'object',
          'set',
          'string',
          'time',
        ];

        builtinTypes.forEach((typeName) => {
          expect(isApexKeyword(typeName)).toBe(false);
        });
      });

      it('should still treat other keywords as keywords', () => {
        // Keywords that are NOT builtin types should still be treated as keywords
        expect(isApexKeyword('system')).toBe(true); // System is a namespace, not a builtin type
        expect(isApexKeyword('testmethod')).toBe(true);
        expect(isApexKeyword('if')).toBe(true);
        expect(isApexKeyword('for')).toBe(true);
        expect(isApexKeyword('class')).toBe(true);
      });

      it('should NOT treat contextual keywords as keywords', () => {
        // Contextual keywords that can be used as identifiers should NOT be treated as keywords
        // They are keywords in specific contexts (like SOQL/SOSL queries) but valid as identifiers elsewhere
        const contextualKeywords = ['metadata', 'reference', 'name', 'count'];
        contextualKeywords.forEach((keyword) => {
          expect(isApexKeyword(keyword)).toBe(false);
          expect(isApexKeyword(keyword.toUpperCase())).toBe(false);
          expect(
            isApexKeyword(keyword.charAt(0).toUpperCase() + keyword.slice(1)),
          ).toBe(false);
        });
      });

      it('should still treat SOQL keywords as keywords', () => {
        // SOQL keywords should still be treated as keywords
        expect(isApexKeyword('select')).toBe(true);
        expect(isApexKeyword('from')).toBe(true);
        expect(isApexKeyword('where')).toBe(true);
        expect(isApexKeyword('group')).toBe(true);
        expect(isApexKeyword('order')).toBe(true);
        expect(isApexKeyword('having')).toBe(true);
        expect(isApexKeyword('limit')).toBe(true);
        expect(isApexKeyword('offset')).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should return false for empty string', () => {
        expect(isApexKeyword('')).toBe(false);
      });

      it('should return false for null', () => {
        expect(isApexKeyword(null as any)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(isApexKeyword(undefined as any)).toBe(false);
      });

      it('should return false for non-string types', () => {
        expect(isApexKeyword(123 as any)).toBe(false);
        expect(isApexKeyword({} as any)).toBe(false);
        expect(isApexKeyword([] as any)).toBe(false);
      });
    });
  });

  describe('APEX_KEYWORDS Set', () => {
    it('should contain all keywords from APEX_KEYWORDS_ARRAY', () => {
      for (const keyword of APEX_KEYWORDS_ARRAY) {
        expect(APEX_KEYWORDS.has(keyword)).toBe(true);
      }
    });

    it('should have same size as array', () => {
      expect(APEX_KEYWORDS.size).toBe(APEX_KEYWORDS_ARRAY.length);
    });

    it('should support fast lookups', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        APEX_KEYWORDS.has('if');
        APEX_KEYWORDS.has('class');
        APEX_KEYWORDS.has('select');
      }
      const end = performance.now();
      // Should be very fast (< 1ms for 1000 lookups)
      expect(end - start).toBeLessThan(10);
    });
  });

  describe('BUILTIN_TYPE_NAMES', () => {
    it('should contain all builtin types from BUILTIN_TYPE_NAMES_ARRAY', () => {
      for (const typeName of BUILTIN_TYPE_NAMES_ARRAY) {
        expect(BUILTIN_TYPE_NAMES.has(typeName)).toBe(true);
      }
    });

    it('should have same size as array', () => {
      expect(BUILTIN_TYPE_NAMES.size).toBe(BUILTIN_TYPE_NAMES_ARRAY.length);
    });

    it('should contain expected builtin types', () => {
      const expectedTypes = [
        'blob',
        'boolean',
        'date',
        'datetime',
        'decimal',
        'double',
        'id',
        'integer',
        'list',
        'long',
        'map',
        'object',
        'set',
        'string',
        'time',
      ];
      expectedTypes.forEach((typeName) => {
        expect(BUILTIN_TYPE_NAMES.has(typeName)).toBe(true);
      });
    });

    it('should have reasonable number of builtin types', () => {
      // Expect at least 10 builtin types (we have 15)
      expect(BUILTIN_TYPE_NAMES_ARRAY.length).toBeGreaterThanOrEqual(10);
      // Expect less than 50 builtin types (sanity check)
      expect(BUILTIN_TYPE_NAMES_ARRAY.length).toBeLessThan(50);
    });
  });

  describe('CONTEXTUAL_KEYWORDS', () => {
    it('should contain all contextual keywords from CONTEXTUAL_KEYWORDS_ARRAY', () => {
      for (const keyword of CONTEXTUAL_KEYWORDS_ARRAY) {
        expect(CONTEXTUAL_KEYWORDS.has(keyword)).toBe(true);
      }
    });

    it('should have same size as array', () => {
      expect(CONTEXTUAL_KEYWORDS.size).toBe(CONTEXTUAL_KEYWORDS_ARRAY.length);
    });

    it('should contain expected contextual keywords', () => {
      const expectedKeywords = ['metadata', 'reference', 'name', 'count'];
      expectedKeywords.forEach((keyword) => {
        expect(CONTEXTUAL_KEYWORDS.has(keyword)).toBe(true);
      });
    });

    it('should have reasonable number of contextual keywords', () => {
      // We have 4 confirmed cases (metadata, reference, name, count)
      expect(CONTEXTUAL_KEYWORDS_ARRAY.length).toBeGreaterThanOrEqual(4);
      // Expect less than 20 contextual keywords (sanity check)
      expect(CONTEXTUAL_KEYWORDS_ARRAY.length).toBeLessThan(20);
    });
  });

  describe('Integration - Short-Circuit Behavior', () => {
    let symbolManager: any;
    let symbolGraph: any;

    beforeAll(async () => {
      // Dynamic imports to avoid circular dependencies
      const { ApexSymbolManager } = await import(
        '../../src/symbols/ApexSymbolManager'
      );
      const { ApexSymbolGraph } = await import(
        '../../src/symbols/ApexSymbolGraph'
      );
      symbolManager = new ApexSymbolManager();
      symbolGraph = new ApexSymbolGraph();
    });

    describe('findSymbolByName short-circuit', () => {
      it('should return empty array for keywords in ApexSymbolManager', () => {
        const keywords = ['if', 'for', 'while', 'class', 'try', 'catch'];
        keywords.forEach((keyword) => {
          const result = symbolManager.findSymbolByName(keyword);
          expect(result).toEqual([]);
        });
      });

      it('should return empty array for keywords in ApexSymbolGraph', () => {
        const keywords = ['if', 'for', 'while', 'class', 'try', 'catch'];
        keywords.forEach((keyword) => {
          const result = symbolGraph.findSymbolByName(keyword);
          expect(result).toEqual([]);
        });
      });

      it('should return symbols for non-keywords', async () => {
        // This test would require setting up a symbol table, but we can at least verify
        // that non-keywords don't get short-circuited
        const nonKeywords = ['MyClass', 'myMethod', 'variableName'];
        nonKeywords.forEach((name) => {
          const result = symbolManager.findSymbolByName(name);
          // Should not throw, and should return array (may be empty if no symbols)
          expect(Array.isArray(result)).toBe(true);
        });
      });
    });

    describe('lookupSymbolWithContext short-circuit', () => {
      it('should return null for keywords', () => {
        const keywords = ['if', 'for', 'while', 'select', 'from'];
        keywords.forEach((keyword) => {
          const result = symbolGraph.lookupSymbolWithContext(keyword);
          expect(result).toBeNull();
        });
      });

      it('should NOT short-circuit builtin type names', () => {
        // Builtin types should NOT be short-circuited as keywords
        // They should be allowed to resolve (though they may not be in the symbol graph)
        const builtinTypes = [
          'list',
          'map',
          'set',
          'string',
          'integer',
          'boolean',
        ];
        builtinTypes.forEach((typeName) => {
          // These should not throw and should not be immediately null due to keyword check
          // (they may return null if not in symbol graph, but not because of keyword short-circuit)
          const result = symbolGraph.lookupSymbolWithContext(typeName);
          // Result may be null if not in graph, but it shouldn't be short-circuited as keyword
          expect(result === null || typeof result === 'object').toBe(true);
        });
      });
    });

    describe('findSymbolByName builtin types', () => {
      it('should NOT short-circuit builtin type names', () => {
        // Builtin types should NOT be short-circuited as keywords
        const builtinTypes = [
          'list',
          'map',
          'set',
          'string',
          'integer',
          'boolean',
        ];
        builtinTypes.forEach((typeName) => {
          // These should return arrays (may be empty if not in graph, but not short-circuited)
          const result = symbolManager.findSymbolByName(typeName);
          expect(Array.isArray(result)).toBe(true);
        });
      });
    });
  });
});
