import { SystemComparatorValidator } from '../../../src/semantics/validation/SystemComparatorValidator';
import { ValidationScope } from '../../../src/semantics/validation/ValidationResult';
import { TypeInfo } from '../../../src/semantics/validation/TypeValidator';

describe('SystemComparatorValidator', () => {
  const createMockScope = (): ValidationScope => ({
    supportsLongIdentifiers: false,
    version: 58,
    isFileBased: true,
  });

  const createMockTypeInfo = (
    name: string,
    isPrimitive = false,
    isSObject = false,
  ): TypeInfo => ({
    name,
    namespace: null,
    visibility: 'PUBLIC',
    isPrimitive,
    isSObject,
    isCollection: false,
    elementType: undefined,
    keyType: undefined,
    valueType: undefined,
  });

  describe('validateSystemComparison', () => {
    describe('Valid System Comparison Operations', () => {
      it('should validate System.equals with compatible types', () => {
        const leftType = createMockTypeInfo('String', true);
        const rightType = createMockTypeInfo('String', true);

        const result = SystemComparatorValidator.validateSystemComparison(
          'equals',
          leftType,
          rightType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate System.equals with null types', () => {
        const leftType = createMockTypeInfo('Account', false, true);
        const rightType = createMockTypeInfo('Account', false, true);

        const result = SystemComparatorValidator.validateSystemComparison(
          'equals',
          leftType,
          rightType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate System.hashCode with valid type', () => {
        const targetType = createMockTypeInfo('String', true);

        const result = SystemComparatorValidator.validateSystemHashCode(
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate System.hashCode with SObject type', () => {
        const targetType = createMockTypeInfo('Account', false, true);

        const result = SystemComparatorValidator.validateSystemHashCode(
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate System.toString with valid type', () => {
        const targetType = createMockTypeInfo('Integer', true);

        const result = SystemComparatorValidator.validateSystemToString(
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate System.toString with SObject type', () => {
        const targetType = createMockTypeInfo('Contact', false, true);

        const result = SystemComparatorValidator.validateSystemToString(
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid System Comparison Operations', () => {
      it('should reject System.equals with incompatible types', () => {
        const leftType = createMockTypeInfo('String', true);
        const rightType = createMockTypeInfo('Integer', true);

        const result = SystemComparatorValidator.validateSystemComparison(
          'equals',
          leftType,
          rightType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.system.comparison.types');
      });

      it('should reject invalid System comparison method', () => {
        const leftType = createMockTypeInfo('String', true);
        const rightType = createMockTypeInfo('String', true);

        const result = SystemComparatorValidator.validateSystemComparison(
          'invalidMethod',
          leftType,
          rightType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.system.comparison.method');
      });

      it('should reject System.hashCode with void type', () => {
        const targetType = createMockTypeInfo('void', true);

        const result = SystemComparatorValidator.validateSystemHashCode(
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.system.hashCode.type');
      });

      it('should reject System.toString with void type', () => {
        const targetType = createMockTypeInfo('void', true);

        const result = SystemComparatorValidator.validateSystemToString(
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.system.toString.type');
      });
    });

    describe('Edge Cases', () => {
      it('should handle null left type', () => {
        const result = SystemComparatorValidator.validateSystemComparison(
          'equals',
          null as any,
          createMockTypeInfo('String', true),
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.system.comparison.types');
      });

      it('should handle null right type', () => {
        const result = SystemComparatorValidator.validateSystemComparison(
          'equals',
          createMockTypeInfo('String', true),
          null as any,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.system.comparison.types');
      });

      it('should handle undefined method name', () => {
        const result = SystemComparatorValidator.validateSystemComparison(
          undefined as any,
          createMockTypeInfo('String', true),
          createMockTypeInfo('String', true),
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.system.comparison.method');
      });

      it('should handle empty method name', () => {
        const result = SystemComparatorValidator.validateSystemComparison(
          '',
          createMockTypeInfo('String', true),
          createMockTypeInfo('String', true),
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.system.comparison.method');
      });

      it('should handle null target type for hashCode', () => {
        const result = SystemComparatorValidator.validateSystemHashCode(
          null as any,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.system.hashCode.type');
      });

      it('should handle null target type for toString', () => {
        const result = SystemComparatorValidator.validateSystemToString(
          null as any,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.system.toString.type');
      });
    });

    describe('Error Messages', () => {
      it('should return correct error message for incompatible types', () => {
        const result = SystemComparatorValidator.validateSystemComparison(
          'equals',
          createMockTypeInfo('String', true),
          createMockTypeInfo('Integer', true),
          createMockScope(),
        );

        expect(result.errors).toContain('invalid.system.comparison.types');
      });

      it('should return correct error message for invalid method', () => {
        const result = SystemComparatorValidator.validateSystemComparison(
          'invalidMethod',
          createMockTypeInfo('String', true),
          createMockTypeInfo('String', true),
          createMockScope(),
        );

        expect(result.errors).toContain('invalid.system.comparison.method');
      });

      it('should return correct error message for invalid hashCode type', () => {
        const result = SystemComparatorValidator.validateSystemHashCode(
          createMockTypeInfo('void', true),
          createMockScope(),
        );

        expect(result.errors).toContain('invalid.system.hashCode.type');
      });

      it('should return correct error message for invalid toString type', () => {
        const result = SystemComparatorValidator.validateSystemToString(
          createMockTypeInfo('void', true),
          createMockScope(),
        );

        expect(result.errors).toContain('invalid.system.toString.type');
      });
    });
  });

  describe('validateSystemComparatorMethod', () => {
    describe('Valid System Comparator Methods', () => {
      it('should validate equals method', () => {
        const result = SystemComparatorValidator.validateSystemComparatorMethod(
          'equals',
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate hashCode method', () => {
        const result = SystemComparatorValidator.validateSystemComparatorMethod(
          'hashCode',
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate toString method', () => {
        const result = SystemComparatorValidator.validateSystemComparatorMethod(
          'toString',
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Invalid System Comparator Methods', () => {
      it('should reject invalid method name', () => {
        const result = SystemComparatorValidator.validateSystemComparatorMethod(
          'invalidMethod',
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.system.comparator.method');
      });

      it('should reject empty method name', () => {
        const result = SystemComparatorValidator.validateSystemComparatorMethod(
          '',
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.system.comparator.method');
      });

      it('should reject null method name', () => {
        const result = SystemComparatorValidator.validateSystemComparatorMethod(
          null as any,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.system.comparator.method');
      });

      it('should reject undefined method name', () => {
        const result = SystemComparatorValidator.validateSystemComparatorMethod(
          undefined as any,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.system.comparator.method');
      });
    });
  });
});
