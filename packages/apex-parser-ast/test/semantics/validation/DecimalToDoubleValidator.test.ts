/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DecimalToDoubleValidator } from '../../../src/semantics/validation/DecimalToDoubleValidator';
import type { ValidationScope } from '../../../src/semantics/validation/ValidationResult';
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

describe('DecimalToDoubleValidator', () => {
  let validator: DecimalToDoubleValidator;
  let mockScope: ValidationScope;

  beforeEach(() => {
    validator = new DecimalToDoubleValidator();
    mockScope = createMockScope();
  });

  describe('valid cases', () => {
    it('should allow Decimal to Double conversion in List operations', () => {
      const sourceType: TypeInfo = { name: 'Decimal', isPrimitive: true };
      const targetType: TypeInfo = { name: 'Double', isPrimitive: true };
      const context = { operation: 'List.add', containerType: 'List<Double>' };

      const result = validator.validateDecimalToDoubleConversion(
        sourceType,
        targetType,
        context,
        mockScope,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow Decimal to Double conversion in Map operations', () => {
      const sourceType: TypeInfo = { name: 'Decimal', isPrimitive: true };
      const targetType: TypeInfo = { name: 'Double', isPrimitive: true };
      const context = {
        operation: 'Map.put',
        containerType: 'Map<String, Double>',
      };

      const result = validator.validateDecimalToDoubleConversion(
        sourceType,
        targetType,
        context,
        mockScope,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow Decimal to Double conversion in Set operations', () => {
      const sourceType: TypeInfo = { name: 'Decimal', isPrimitive: true };
      const targetType: TypeInfo = { name: 'Double', isPrimitive: true };
      const context = { operation: 'Set.add', containerType: 'Set<Double>' };

      const result = validator.validateDecimalToDoubleConversion(
        sourceType,
        targetType,
        context,
        mockScope,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow Decimal to Double conversion in List constructor', () => {
      const sourceType: TypeInfo = { name: 'Decimal', isPrimitive: true };
      const targetType: TypeInfo = { name: 'Double', isPrimitive: true };
      const context = {
        operation: 'List.constructor',
        containerType: 'List<Double>',
      };

      const result = validator.validateDecimalToDoubleConversion(
        sourceType,
        targetType,
        context,
        mockScope,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow Decimal to Double conversion in Map constructor', () => {
      const sourceType: TypeInfo = { name: 'Decimal', isPrimitive: true };
      const targetType: TypeInfo = { name: 'Double', isPrimitive: true };
      const context = {
        operation: 'Map.constructor',
        containerType: 'Map<String, Double>',
      };

      const result = validator.validateDecimalToDoubleConversion(
        sourceType,
        targetType,
        context,
        mockScope,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('invalid cases', () => {
    it('should reject Decimal to Double conversion in direct assignment', () => {
      const sourceType: TypeInfo = { name: 'Decimal', isPrimitive: true };
      const targetType: TypeInfo = { name: 'Double', isPrimitive: true };
      const context = { operation: 'assignment', containerType: null };

      const result = validator.validateDecimalToDoubleConversion(
        sourceType,
        targetType,
        context,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.decimal.to.double.conversion');
    });

    it('should reject Decimal to Double conversion in method parameter', () => {
      const sourceType: TypeInfo = { name: 'Decimal', isPrimitive: true };
      const targetType: TypeInfo = { name: 'Double', isPrimitive: true };
      const context = { operation: 'method.parameter', containerType: null };

      const result = validator.validateDecimalToDoubleConversion(
        sourceType,
        targetType,
        context,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.decimal.to.double.conversion');
    });

    it('should reject Decimal to Double conversion in return statement', () => {
      const sourceType: TypeInfo = { name: 'Decimal', isPrimitive: true };
      const targetType: TypeInfo = { name: 'Double', isPrimitive: true };
      const context = { operation: 'return', containerType: null };

      const result = validator.validateDecimalToDoubleConversion(
        sourceType,
        targetType,
        context,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.decimal.to.double.conversion');
    });

    it('should reject non-Decimal to Double conversion', () => {
      const sourceType: TypeInfo = { name: 'String', isPrimitive: true };
      const targetType: TypeInfo = { name: 'Double', isPrimitive: true };
      const context = { operation: 'List.add', containerType: 'List<Double>' };

      const result = validator.validateDecimalToDoubleConversion(
        sourceType,
        targetType,
        context,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.decimal.to.double.conversion');
    });

    it('should reject Decimal to non-Double conversion', () => {
      const sourceType: TypeInfo = { name: 'Decimal', isPrimitive: true };
      const targetType: TypeInfo = { name: 'Integer', isPrimitive: true };
      const context = { operation: 'List.add', containerType: 'List<Integer>' };

      const result = validator.validateDecimalToDoubleConversion(
        sourceType,
        targetType,
        context,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.decimal.to.double.conversion');
    });
  });

  describe('type compatibility', () => {
    it('should validate Decimal type correctly', () => {
      const sourceType: TypeInfo = { name: 'Decimal', isPrimitive: true };
      const targetType: TypeInfo = { name: 'Double', isPrimitive: true };
      const context = { operation: 'List.add', containerType: 'List<Double>' };

      const result = validator.validateDecimalToDoubleConversion(
        sourceType,
        targetType,
        context,
        mockScope,
      );

      expect(result.isValid).toBe(true);
    });

    it('should validate Double type correctly', () => {
      const sourceType: TypeInfo = { name: 'Decimal', isPrimitive: true };
      const targetType: TypeInfo = { name: 'Double', isPrimitive: true };
      const context = { operation: 'List.add', containerType: 'List<Double>' };

      const result = validator.validateDecimalToDoubleConversion(
        sourceType,
        targetType,
        context,
        mockScope,
      );

      expect(result.isValid).toBe(true);
    });

    it('should handle case-insensitive type names', () => {
      const sourceType: TypeInfo = { name: 'decimal', isPrimitive: true };
      const targetType: TypeInfo = { name: 'double', isPrimitive: true };
      const context = { operation: 'List.add', containerType: 'List<Double>' };

      const result = validator.validateDecimalToDoubleConversion(
        sourceType,
        targetType,
        context,
        mockScope,
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle null source type', () => {
      const targetType: TypeInfo = { name: 'Double', isPrimitive: true };
      const context = { operation: 'List.add', containerType: 'List<Double>' };

      const result = validator.validateDecimalToDoubleConversion(
        null as any,
        targetType,
        context,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.decimal.to.double.conversion');
    });

    it('should handle null target type', () => {
      const sourceType: TypeInfo = { name: 'Decimal', isPrimitive: true };
      const context = { operation: 'List.add', containerType: 'List<Double>' };

      const result = validator.validateDecimalToDoubleConversion(
        sourceType,
        null as any,
        context,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.decimal.to.double.conversion');
    });

    it('should handle null context', () => {
      const sourceType: TypeInfo = { name: 'Decimal', isPrimitive: true };
      const targetType: TypeInfo = { name: 'Double', isPrimitive: true };

      const result = validator.validateDecimalToDoubleConversion(
        sourceType,
        targetType,
        null as any,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.decimal.to.double.conversion');
    });

    it('should handle undefined types', () => {
      const context = { operation: 'List.add', containerType: 'List<Double>' };

      const result = validator.validateDecimalToDoubleConversion(
        undefined as any,
        undefined as any,
        context,
        mockScope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.decimal.to.double.conversion');
    });
  });

  describe('performance', () => {
    it('should validate quickly for valid cases', () => {
      const sourceType: TypeInfo = { name: 'Decimal', isPrimitive: true };
      const targetType: TypeInfo = { name: 'Double', isPrimitive: true };
      const context = { operation: 'List.add', containerType: 'List<Double>' };

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        validator.validateDecimalToDoubleConversion(
          sourceType,
          targetType,
          context,
          mockScope,
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(100); // Should complete 1000 validations in under 100ms
    });

    it('should validate quickly for invalid cases', () => {
      const sourceType: TypeInfo = { name: 'String', isPrimitive: true };
      const targetType: TypeInfo = { name: 'Double', isPrimitive: true };
      const context = { operation: 'List.add', containerType: 'List<Double>' };

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        validator.validateDecimalToDoubleConversion(
          sourceType,
          targetType,
          context,
          mockScope,
        );
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(100); // Should complete 1000 validations in under 100ms
    });
  });
});
