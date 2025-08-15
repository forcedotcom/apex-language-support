/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { MapPutAllValidator } from '../../../src/semantics/validation/MapPutAllValidator';
import type {
  ValidationResult,
  ValidationScope,
} from '../../../src/semantics/validation/ValidationResult';
import type { TypeInfo } from '../../../src/semantics/validation/TypeValidator';

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

describe('MapPutAllValidator', () => {
  let validator: MapPutAllValidator;
  let mockScope: ValidationScope;

  beforeEach(() => {
    validator = new MapPutAllValidator();
    mockScope = createMockScope();
  });

  describe('valid cases', () => {
    it('should allow putAll with compatible map types', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, Integer>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<String, Integer>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow putAll with compatible key and value types', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, Double>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<String, Decimal>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow putAll with compatible SObject types', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, Account>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<String, Account>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow putAll with compatible custom types', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, CustomClass>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<String, CustomClass>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow putAll with compatible primitive types', () => {
      const targetMap: TypeInfo = {
        name: 'Map<Integer, Boolean>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<Integer, Boolean>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('invalid cases', () => {
    it('should reject putAll with incompatible key types', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, Integer>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<Integer, Integer>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.map.putAll');
    });

    it('should reject putAll with incompatible value types', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, Integer>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<String, String>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.map.putAll');
    });

    it('should reject putAll with incompatible SObject types', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, Account>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<String, Contact>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.map.putAll');
    });

    it('should reject putAll with incompatible custom types', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, CustomClass1>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<String, CustomClass2>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.map.putAll');
    });

    it('should reject putAll with non-map target type', () => {
      const targetMap: TypeInfo = { name: 'List<String>', isPrimitive: false };
      const sourceMap: TypeInfo = {
        name: 'Map<String, Integer>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.map.putAll');
    });

    it('should reject putAll with non-map source type', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, Integer>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = { name: 'List<String>', isPrimitive: false };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.map.putAll');
    });
  });

  describe('type compatibility', () => {
    it('should validate compatible numeric types', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, Double>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<String, Integer>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(true);
    });

    it('should validate compatible primitive types', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, Object>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<String, String>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(true);
    });

    it('should validate compatible collection types', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, List<String>>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<String, List<String>>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(true);
    });

    it('should validate compatible nested map types', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, Map<String, Integer>>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<String, Map<String, Integer>>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle null target map', () => {
      const sourceMap: TypeInfo = {
        name: 'Map<String, Integer>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        null as any,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.map.putAll');
    });

    it('should handle null source map', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, Integer>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        null as any,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.map.putAll');
    });

    it('should handle undefined maps', () => {
      const result = validator.validateMapPutAll(
        undefined as any,
        undefined as any,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.map.putAll');
    });

    it('should handle maps with missing type information', () => {
      const targetMap = { name: 'Map', isPrimitive: false } as TypeInfo;
      const sourceMap = { name: 'Map', isPrimitive: false } as TypeInfo;

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.map.putAll');
    });

    it('should handle maps with malformed type names', () => {
      const targetMap: TypeInfo = { name: 'Map<String,', isPrimitive: false };
      const sourceMap: TypeInfo = {
        name: 'Map<String, Integer>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.map.putAll');
    });
  });

  describe('complex type scenarios', () => {
    it('should validate maps with generic types', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, List<Account>>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<String, List<Account>>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(true);
    });

    it('should validate maps with multiple generic parameters', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, Map<String, Integer>>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<String, Map<String, Integer>>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject maps with incompatible generic types', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, List<Account>>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<String, List<Contact>>',
        isPrimitive: false,
      };

      const result = validator.validateMapPutAll(
        targetMap,
        sourceMap,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.map.putAll');
    });
  });

  describe('performance', () => {
    it('should validate quickly for valid cases', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, Integer>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<String, Integer>',
        isPrimitive: false,
      };

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        validator.validateMapPutAll(targetMap, sourceMap, mockScope);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(100); // Should complete 1000 validations in under 100ms
    });

    it('should validate quickly for invalid cases', () => {
      const targetMap: TypeInfo = {
        name: 'Map<String, Integer>',
        isPrimitive: false,
      };
      const sourceMap: TypeInfo = {
        name: 'Map<Integer, Integer>',
        isPrimitive: false,
      };

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        validator.validateMapPutAll(targetMap, sourceMap, mockScope);
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(100); // Should complete 1000 validations in under 100ms
    });
  });
});
