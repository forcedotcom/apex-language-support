/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { TypeCastingValidator } from '../../../src/semantics/validation/TypeCastingValidator';
import type { ValidationScope } from '../../../src/semantics/validation/TypeValidator';

describe('TypeCastingValidator', () => {
  const createMockScope = (): ValidationScope => ({
    errors: {
      addError: jest.fn(),
      addWarning: jest.fn(),
    },
    settings: {
      collectMultipleErrors: true,
      breakOnFirstError: false,
      enableWarnings: true,
      maxErrors: 100,
      version: 58,
    },
    symbolTable: {} as any,
    currentContext: {
      currentType: null,
      currentMethod: null,
      isStaticContext: false,
      blockDepth: 0,
      currentNamespace: null,
    },
    compilationContext: {
      namespace: null,
      version: 58,
      isTrusted: true,
      sourceType: 'FILE',
      referencingType: null,
      enclosingTypes: [],
      parentTypes: [],
      isStaticContext: false,
    },
  });

  const createMockTypeInfo = (
    name: string,
    isPrimitive = false,
    isSObject = false,
  ) => ({
    name,
    namespace: null,
    visibility: 'Public' as any,
    isPrimitive,
    isSObject,
    isCollection: false,
  });

  describe('validateCast', () => {
    describe('Valid Casts', () => {
      it('should allow casting between compatible numeric types', () => {
        const sourceType = createMockTypeInfo('Integer', true);
        const targetType = createMockTypeInfo('Long', true);

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
      });

      it('should allow casting from Integer to Double', () => {
        const sourceType = createMockTypeInfo('Integer', true);
        const targetType = createMockTypeInfo('Double', true);

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
      });

      it('should allow casting from Long to Double', () => {
        const sourceType = createMockTypeInfo('Long', true);
        const targetType = createMockTypeInfo('Double', true);

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
      });

      it('should allow casting from Object to specific type', () => {
        const sourceType = createMockTypeInfo('Object');
        const targetType = createMockTypeInfo('String');

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
      });

      it('should allow casting from parent to child class', () => {
        const sourceType = createMockTypeInfo('ParentClass');
        const targetType = createMockTypeInfo('ChildClass');

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
      });

      it('should allow casting to same type', () => {
        const sourceType = createMockTypeInfo('String');
        const targetType = createMockTypeInfo('String');

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
      });

      it('should allow casting from String to Object', () => {
        const sourceType = createMockTypeInfo('String');
        const targetType = createMockTypeInfo('Object');

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
      });
    });

    describe('Invalid Casts', () => {
      it('should reject casting between incompatible primitive types', () => {
        const sourceType = createMockTypeInfo('String');
        const targetType = createMockTypeInfo('Integer', true);

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('incompatible.cast.types');
      });

      it('should reject casting from Boolean to Integer', () => {
        const sourceType = createMockTypeInfo('Boolean', true);
        const targetType = createMockTypeInfo('Integer', true);

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('incompatible.cast.types');
      });

      it('should reject casting from Integer to Boolean', () => {
        const sourceType = createMockTypeInfo('Integer', true);
        const targetType = createMockTypeInfo('Boolean', true);

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('incompatible.cast.types');
      });

      it('should reject casting from child to parent class', () => {
        const sourceType = createMockTypeInfo('ChildClass');
        const targetType = createMockTypeInfo('ParentClass');

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('incompatible.cast.types');
      });

      it('should reject casting to void type', () => {
        const sourceType = createMockTypeInfo('String');
        const targetType = createMockTypeInfo('void');

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.cast.type');
      });

      it('should reject casting from void type', () => {
        const sourceType = createMockTypeInfo('void');
        const targetType = createMockTypeInfo('String');

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.cast.type');
      });

      it('should reject casting between unrelated classes', () => {
        const sourceType = createMockTypeInfo('ClassA');
        const targetType = createMockTypeInfo('ClassB');

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('incompatible.cast.types');
      });
    });

    describe('SObject Casts', () => {
      it('should allow casting between SObject types', () => {
        const sourceType = createMockTypeInfo('Account', false, true);
        const targetType = createMockTypeInfo('Contact', false, true);

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
      });

      it('should allow casting from SObject to Object', () => {
        const sourceType = createMockTypeInfo('Account', false, true);
        const targetType = createMockTypeInfo('Object');

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
      });

      it('should reject casting from Object to SObject', () => {
        const sourceType = createMockTypeInfo('Object');
        const targetType = createMockTypeInfo('Account', false, true);

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('incompatible.cast.types');
      });
    });

    describe('Collection Casts', () => {
      it('should allow casting between compatible collection types', () => {
        const sourceType = {
          ...createMockTypeInfo('List'),
          isCollection: true,
          elementType: createMockTypeInfo('String'),
        };
        const targetType = {
          ...createMockTypeInfo('List'),
          isCollection: true,
          elementType: createMockTypeInfo('Object'),
        };

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(true);
      });

      it('should reject casting between incompatible collection types', () => {
        const sourceType = {
          ...createMockTypeInfo('List'),
          isCollection: true,
          elementType: createMockTypeInfo('String'),
        };
        const targetType = {
          ...createMockTypeInfo('List'),
          isCollection: true,
          elementType: createMockTypeInfo('Integer', true),
        };

        const result = TypeCastingValidator.validateCast(
          sourceType,
          targetType,
          createMockScope(),
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('incompatible.cast.types');
      });
    });
  });
});
