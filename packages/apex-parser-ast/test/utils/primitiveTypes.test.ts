/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  APEX_PRIMITIVE_TYPES,
  APEX_PRIMITIVE_TYPES_ARRAY,
  INSTANCEOF_PRIMITIVE_TYPES,
  NON_NULLABLE_PRIMITIVES,
  NON_NULLABLE_PRIMITIVES_ARRAY,
  NUMERIC_TYPES,
  isNonNullablePrimitiveType,
  isNumericType,
  isPrimitiveType,
} from '../../src/utils/primitiveTypes';

describe('primitiveTypes', () => {
  describe('APEX_PRIMITIVE_TYPES', () => {
    it('should contain all primitives from array', () => {
      for (const typeName of APEX_PRIMITIVE_TYPES_ARRAY) {
        expect(APEX_PRIMITIVE_TYPES.has(typeName)).toBe(true);
      }
    });

    it('should have same size as array', () => {
      expect(APEX_PRIMITIVE_TYPES.size).toBe(APEX_PRIMITIVE_TYPES_ARRAY.length);
    });

    it('should include scalar primitives and special types', () => {
      const expected = [
        'blob',
        'boolean',
        'date',
        'datetime',
        'decimal',
        'double',
        'id',
        'integer',
        'long',
        'null',
        'object',
        'string',
        'time',
        'void',
      ];
      expected.forEach((t) => expect(APEX_PRIMITIVE_TYPES.has(t)).toBe(true));
    });

    it('should exclude collections (List, Map, Set)', () => {
      expect(APEX_PRIMITIVE_TYPES.has('list')).toBe(false);
      expect(APEX_PRIMITIVE_TYPES.has('map')).toBe(false);
      expect(APEX_PRIMITIVE_TYPES.has('set')).toBe(false);
    });
  });

  describe('INSTANCEOF_PRIMITIVE_TYPES', () => {
    it('should exclude Object (x instanceof Object is valid)', () => {
      expect(INSTANCEOF_PRIMITIVE_TYPES.has('object')).toBe(false);
    });

    it('should include other primitives', () => {
      expect(INSTANCEOF_PRIMITIVE_TYPES.has('string')).toBe(true);
      expect(INSTANCEOF_PRIMITIVE_TYPES.has('integer')).toBe(true);
    });
  });

  describe('isPrimitiveType', () => {
    it('should be case-insensitive', () => {
      expect(isPrimitiveType('String')).toBe(true);
      expect(isPrimitiveType('string')).toBe(true);
      expect(isPrimitiveType('INTEGER')).toBe(true);
      expect(isPrimitiveType('Integer')).toBe(true);
      expect(isPrimitiveType('Id')).toBe(true);
      expect(isPrimitiveType('ID')).toBe(true);
    });

    it('should trim whitespace', () => {
      expect(isPrimitiveType('  String  ')).toBe(true);
      expect(isPrimitiveType('\tInteger\n')).toBe(true);
    });

    it('should return true for all scalar primitives', () => {
      for (const t of APEX_PRIMITIVE_TYPES_ARRAY) {
        expect(isPrimitiveType(t)).toBe(true);
      }
    });

    it('should return false for collections', () => {
      expect(isPrimitiveType('List')).toBe(false);
      expect(isPrimitiveType('Map')).toBe(false);
      expect(isPrimitiveType('Set')).toBe(false);
    });

    it('should return false for non-primitives', () => {
      expect(isPrimitiveType('Account')).toBe(false);
      expect(isPrimitiveType('MyClass')).toBe(false);
      expect(isPrimitiveType('')).toBe(false);
    });
  });

  describe('isNonNullablePrimitiveType', () => {
    it('should be case-insensitive', () => {
      expect(isNonNullablePrimitiveType('Integer')).toBe(true);
      expect(isNonNullablePrimitiveType('integer')).toBe(true);
      expect(isNonNullablePrimitiveType('Boolean')).toBe(true);
    });

    it('should return true for non-nullable primitives', () => {
      for (const t of NON_NULLABLE_PRIMITIVES_ARRAY) {
        expect(isNonNullablePrimitiveType(t)).toBe(true);
      }
    });

    it('should return false for nullable primitives', () => {
      expect(isNonNullablePrimitiveType('String')).toBe(false);
      expect(isNonNullablePrimitiveType('null')).toBe(false);
      expect(isNonNullablePrimitiveType('void')).toBe(false);
    });
  });

  describe('isNumericType', () => {
    it('should be case-insensitive', () => {
      expect(isNumericType('Integer')).toBe(true);
      expect(isNumericType('LONG')).toBe(true);
    });

    it('should return true for numeric types', () => {
      for (const t of NUMERIC_TYPES) {
        expect(isNumericType(t)).toBe(true);
      }
    });

    it('should return false for non-numeric primitives', () => {
      expect(isNumericType('String')).toBe(false);
      expect(isNumericType('Boolean')).toBe(false);
      expect(isNumericType('Decimal')).toBe(true); // Decimal is numeric
    });
  });

  describe('NON_NULLABLE_PRIMITIVES', () => {
    it('should be subset of APEX_PRIMITIVE_TYPES', () => {
      for (const t of NON_NULLABLE_PRIMITIVES_ARRAY) {
        expect(APEX_PRIMITIVE_TYPES.has(t)).toBe(true);
      }
    });
  });

  describe('NUMERIC_TYPES', () => {
    it('should be subset of NON_NULLABLE_PRIMITIVES', () => {
      for (const t of NUMERIC_TYPES) {
        expect(NON_NULLABLE_PRIMITIVES.has(t)).toBe(true);
      }
    });
  });
});
