/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { StatementValidator } from '../../../src/semantics/validation/StatementValidator';
import type {
  ValidationResult,
  ValidationScope,
} from '../../../src/semantics/validation/ValidationResult';
import type { ExpressionType } from '../../../src/semantics/validation/TypePromotionSystem';

/**
 * Mock validation scope for testing
 */
const mockValidationScope = (
  overrides: Partial<ValidationScope> = {},
): ValidationScope => ({
  supportsLongIdentifiers: true,
  version: 58,
  isFileBased: true,
  ...overrides,
});

/**
 * Mock expression type for testing
 */
const mockExpressionType = (
  name: string,
  isPrimitive = true,
): ExpressionType => ({
  name,
  isPrimitive,
  isEnum: false,
  isCollection: false,
  elementType: null,
});

describe('StatementValidator', () => {
  describe('Variable Declaration Validation', () => {
    describe('validateVariableDeclaration', () => {
      it('should validate simple variable declaration', () => {
        // Test: String name = 'test';
        const result = StatementValidator.validateVariableDeclaration(
          mockExpressionType('String'),
          mockExpressionType('String'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate variable declaration with compatible initializer', () => {
        // Test: Object obj = new MyClass();
        const result = StatementValidator.validateVariableDeclaration(
          mockExpressionType('Object', false),
          mockExpressionType('MyClass', false),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate variable declaration with widening conversion', () => {
        // Test: Object obj = 'test'; (String to Object)
        const result = StatementValidator.validateVariableDeclaration(
          mockExpressionType('Object', false),
          mockExpressionType('String'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject variable declaration with incompatible initializer', () => {
        // Test: String name = 123;
        const result = StatementValidator.validateVariableDeclaration(
          mockExpressionType('String'),
          mockExpressionType('Integer'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('incompatible.types');
      });

      it('should reject variable declaration with narrowing conversion', () => {
        // Test: String name = obj; (Object to String)
        const result = StatementValidator.validateVariableDeclaration(
          mockExpressionType('String'),
          mockExpressionType('Object', false),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('incompatible.types');
      });

      it('should validate variable declaration without initializer', () => {
        // Test: String name;
        const result = StatementValidator.validateVariableDeclaration(
          mockExpressionType('String'),
          null,
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate collection type declaration', () => {
        // Test: List<String> names = new List<String>();
        const listType: ExpressionType = {
          name: 'List',
          isPrimitive: false,
          isEnum: false,
          isCollection: true,
          elementType: mockExpressionType('String'),
        };
        const result = StatementValidator.validateVariableDeclaration(
          listType,
          listType,
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate enum type declaration', () => {
        // Test: MyEnum value = MyEnum.VALUE1;
        const enumType: ExpressionType = {
          name: 'MyEnum',
          isPrimitive: false,
          isEnum: true,
          isCollection: false,
          elementType: null,
        };
        const result = StatementValidator.validateVariableDeclaration(
          enumType,
          enumType,
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('validateFinalFieldDeclaration', () => {
      it('should validate final field with initializer', () => {
        // Test: final String name = 'test';
        const result = StatementValidator.validateFinalFieldDeclaration(
          mockExpressionType('String'),
          mockExpressionType('String'),
          true, // isFinal
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject final field without initializer', () => {
        // Test: final String name;
        const result = StatementValidator.validateFinalFieldDeclaration(
          mockExpressionType('String'),
          null, // no initializer
          true, // isFinal
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('final.field.requires.initializer');
      });

      it('should validate non-final field without initializer', () => {
        // Test: String name;
        const result = StatementValidator.validateFinalFieldDeclaration(
          mockExpressionType('String'),
          null, // no initializer
          false, // not final
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject final field with incompatible initializer', () => {
        // Test: final String name = 123;
        const result = StatementValidator.validateFinalFieldDeclaration(
          mockExpressionType('String'),
          mockExpressionType('Integer'),
          true, // isFinal
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('incompatible.types');
      });
    });
  });

  describe('Switch Statement Validation', () => {
    describe('validateSwitchStatement', () => {
      it('should validate switch with compatible when values', () => {
        // Test: switch on String with String when values
        const result = StatementValidator.validateSwitchStatement(
          mockExpressionType('String'),
          [mockExpressionType('String'), mockExpressionType('String')],
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject switch with incompatible when values', () => {
        // Test: switch on String with Integer when values
        const result = StatementValidator.validateSwitchStatement(
          mockExpressionType('String'),
          [mockExpressionType('Integer'), mockExpressionType('String')],
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('incompatible.switch.types');
      });

      it('should validate enum switch statement', () => {
        // Test: switch on enum with enum values
        const enumType: ExpressionType = {
          name: 'MyEnum',
          isPrimitive: false,
          isEnum: true,
          isCollection: false,
          elementType: null,
        };
        const result = StatementValidator.validateSwitchStatement(
          enumType,
          [enumType, enumType],
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate switch with empty when values', () => {
        // Test: switch on String with no when values
        const result = StatementValidator.validateSwitchStatement(
          mockExpressionType('String'),
          [],
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate switch with mixed compatible types', () => {
        // Test: switch on Object with String and Integer values
        const result = StatementValidator.validateSwitchStatement(
          mockExpressionType('Object', false),
          [mockExpressionType('String'), mockExpressionType('Integer')],
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject switch with collection type', () => {
        // Test: switch on List<String> (not allowed)
        const listType: ExpressionType = {
          name: 'List',
          isPrimitive: false,
          isEnum: false,
          isCollection: true,
          elementType: mockExpressionType('String'),
        };
        const result = StatementValidator.validateSwitchStatement(
          listType,
          [mockExpressionType('String')],
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('incompatible.switch.types');
      });
    });
  });

  describe('Assignment Statement Validation', () => {
    describe('validateAssignmentStatement', () => {
      it('should validate compatible assignment', () => {
        // Test: String name = 'test';
        const result = StatementValidator.validateAssignmentStatement(
          mockExpressionType('String'),
          mockExpressionType('String'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate widening conversion', () => {
        // Test: Object obj = 'test'; (String to Object)
        const result = StatementValidator.validateAssignmentStatement(
          mockExpressionType('Object', false),
          mockExpressionType('String'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject narrowing conversion', () => {
        // Test: String name = obj; (Object to String)
        const result = StatementValidator.validateAssignmentStatement(
          mockExpressionType('String'),
          mockExpressionType('Object', false),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('incompatible.assignment');
      });

      it('should validate primitive widening conversions', () => {
        // Test: Double d = 123; (Integer to Double)
        const result = StatementValidator.validateAssignmentStatement(
          mockExpressionType('Double'),
          mockExpressionType('Integer'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject primitive narrowing conversions', () => {
        // Test: Integer i = 123.45; (Double to Integer)
        const result = StatementValidator.validateAssignmentStatement(
          mockExpressionType('Integer'),
          mockExpressionType('Double'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('incompatible.assignment');
      });

      it('should validate null assignment to object type', () => {
        // Test: String name = null;
        const result = StatementValidator.validateAssignmentStatement(
          mockExpressionType('String'),
          {
            name: 'null',
            isPrimitive: false,
            isEnum: false,
            isCollection: false,
            elementType: null,
          },
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject null assignment to primitive type', () => {
        // Test: Integer i = null;
        const result = StatementValidator.validateAssignmentStatement(
          mockExpressionType('Integer'),
          {
            name: 'null',
            isPrimitive: false,
            isEnum: false,
            isCollection: false,
            elementType: null,
          },
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('incompatible.assignment');
      });
    });
  });

  describe('Return Statement Validation', () => {
    describe('validateReturnStatement', () => {
      it('should validate return with compatible type', () => {
        // Test: return 'test'; in String method
        const result = StatementValidator.validateReturnStatement(
          mockExpressionType('String'),
          mockExpressionType('String'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should validate return with widening conversion', () => {
        // Test: return 'test'; in Object method
        const result = StatementValidator.validateReturnStatement(
          mockExpressionType('Object', false),
          mockExpressionType('String'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject return with incompatible type', () => {
        // Test: return 123; in String method
        const result = StatementValidator.validateReturnStatement(
          mockExpressionType('String'),
          mockExpressionType('Integer'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('incompatible.return.type');
      });

      it('should validate void return with no value', () => {
        // Test: return; in void method
        const result = StatementValidator.validateReturnStatement(
          {
            name: 'void',
            isPrimitive: true,
            isEnum: false,
            isCollection: false,
            elementType: null,
          },
          null,
          mockValidationScope(),
        );
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should reject void return with value', () => {
        // Test: return 'test'; in void method
        const result = StatementValidator.validateReturnStatement(
          {
            name: 'void',
            isPrimitive: true,
            isEnum: false,
            isCollection: false,
            elementType: null,
          },
          mockExpressionType('String'),
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('void.method.cannot.return.value');
      });

      it('should reject non-void return with no value', () => {
        // Test: return; in String method
        const result = StatementValidator.validateReturnStatement(
          mockExpressionType('String'),
          null,
          mockValidationScope(),
        );
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('method.must.return.value');
      });
    });
  });
});
