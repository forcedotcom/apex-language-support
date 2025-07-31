/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ExpressionValidator } from '../../../src/semantics/validation/ExpressionValidator';
import { TypePromotionSystem } from '../../../src/semantics/validation/TypePromotionSystem';
import type { ValidationScope } from '../../../src/semantics/validation/ValidationResult';
import type { VariableSymbol } from '../../../src/types/symbol';

// Mock validation scope for testing
const createMockScope = (version = 58): ValidationScope => ({
  supportsLongIdentifiers: true,
  version,
  isFileBased: true,
});

// Mock variable symbol for testing
const createMockVariable = (
  name: string,
  type: any = TypePromotionSystem.INTEGER,
): VariableSymbol => ({
  name,
  type,
  visibility: 'Public',
  isStatic: false,
  kind: 'Variable' as any,
  modifiers: { visibility: 'Public', isStatic: false },
  namespace: null,
  location: { line: 1, column: 1 },
});

describe('ExpressionValidator', () => {
  let validator: ExpressionValidator;
  let scope: ValidationScope;
  let symbolTable: Map<string, VariableSymbol>;

  beforeEach(() => {
    scope = createMockScope();
    symbolTable = new Map();
    validator = new ExpressionValidator(scope, symbolTable);
  });

  describe('validateBinaryExpression', () => {
    describe('arithmetic operations', () => {
      it('should validate integer + integer', () => {
        const result = validator.validateBinaryExpression(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.INTEGER,
          '+',
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.INTEGER);
      });

      it('should validate string + integer', () => {
        const result = validator.validateBinaryExpression(
          TypePromotionSystem.STRING,
          TypePromotionSystem.INTEGER,
          '+',
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.STRING);
      });

      it('should reject string - integer', () => {
        const result = validator.validateBinaryExpression(
          TypePromotionSystem.STRING,
          TypePromotionSystem.INTEGER,
          '-',
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.numeric.arguments.expression');
      });

      it('should validate integer + long', () => {
        const result = validator.validateBinaryExpression(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.LONG,
          '+',
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.LONG);
      });

      it('should validate integer + double', () => {
        const result = validator.validateBinaryExpression(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.DOUBLE,
          '+',
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.DOUBLE);
      });

      it('should validate integer + decimal', () => {
        const result = validator.validateBinaryExpression(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.DECIMAL,
          '+',
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.DECIMAL);
      });
    });

    describe('shift operations', () => {
      it('should validate integer << integer', () => {
        const result = validator.validateBinaryExpression(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.INTEGER,
          '<<',
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.INTEGER);
      });

      it('should validate long >> long', () => {
        const result = validator.validateBinaryExpression(
          TypePromotionSystem.LONG,
          TypePromotionSystem.LONG,
          '>>',
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.LONG);
      });

      it('should reject double << integer', () => {
        const result = validator.validateBinaryExpression(
          TypePromotionSystem.DOUBLE,
          TypePromotionSystem.INTEGER,
          '<<',
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.shift.operator.arguments');
      });
    });

    describe('bitwise operations', () => {
      it('should validate integer & integer', () => {
        const result = validator.validateBinaryExpression(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.INTEGER,
          '&',
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.INTEGER);
      });

      it('should validate integer | long', () => {
        const result = validator.validateBinaryExpression(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.LONG,
          '|',
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.LONG);
      });

      it('should reject double & integer', () => {
        const result = validator.validateBinaryExpression(
          TypePromotionSystem.DOUBLE,
          TypePromotionSystem.INTEGER,
          '&',
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.bitwise.operator.arguments');
      });
    });
  });

  describe('validateBooleanExpression', () => {
    describe('comparison operations', () => {
      it('should validate integer == integer', () => {
        const result = validator.validateBooleanExpression(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.INTEGER,
          '==',
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
      });

      it('should validate integer < integer', () => {
        const result = validator.validateBooleanExpression(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.INTEGER,
          '<',
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
      });

      it('should reject integer == string', () => {
        const result = validator.validateBooleanExpression(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.STRING,
          '==',
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.comparison.types');
      });

      it('should reject integer != string', () => {
        const result = validator.validateBooleanExpression(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.STRING,
          '!=',
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.inequality.type');
      });
    });

    describe('logical operations', () => {
      it('should validate boolean && boolean', () => {
        const result = validator.validateBooleanExpression(
          TypePromotionSystem.BOOLEAN,
          TypePromotionSystem.BOOLEAN,
          '&&',
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
      });

      it('should validate boolean || boolean', () => {
        const result = validator.validateBooleanExpression(
          TypePromotionSystem.BOOLEAN,
          TypePromotionSystem.BOOLEAN,
          '||',
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
      });

      it('should reject integer && boolean', () => {
        const result = validator.validateBooleanExpression(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.BOOLEAN,
          '&&',
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.logical.type');
      });
    });
  });

  describe('validateVariableExpression', () => {
    it('should validate existing variable', () => {
      const variable = createMockVariable('testVar', TypePromotionSystem.INTEGER);
      symbolTable.set('testVar', variable);

      const result = validator.validateVariableExpression('testVar');

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.INTEGER);
    });

    it('should reject non-existent variable', () => {
      const result = validator.validateVariableExpression('nonExistentVar');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('variable.does.not.exist');
    });

    it('should validate variable with string type', () => {
      const variable = createMockVariable('name', TypePromotionSystem.STRING);
      symbolTable.set('name', variable);

      const result = validator.validateVariableExpression('name');

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.STRING);
    });
  });

  describe('validateNotExpression', () => {
    it('should validate !boolean', () => {
      const result = validator.validateNotExpression(TypePromotionSystem.BOOLEAN);

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
    });

    it('should reject !integer', () => {
      const result = validator.validateNotExpression(TypePromotionSystem.INTEGER);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.logical.type');
    });

    it('should reject !string', () => {
      const result = validator.validateNotExpression(TypePromotionSystem.STRING);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.logical.type');
    });
  });

  describe('validateExpression', () => {
    it('should validate arithmetic expression', () => {
      const result = validator.validateExpression({
        kind: 'binary',
        left: TypePromotionSystem.INTEGER,
        right: TypePromotionSystem.INTEGER,
        operation: '+',
      });

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.INTEGER);
    });

    it('should validate comparison expression', () => {
      const result = validator.validateExpression({
        kind: 'comparison',
        left: TypePromotionSystem.INTEGER,
        right: TypePromotionSystem.INTEGER,
        operation: '==',
      });

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
    });

    it('should validate variable expression', () => {
      const variable = createMockVariable('testVar', TypePromotionSystem.INTEGER);
      symbolTable.set('testVar', variable);

      const result = validator.validateExpression({
        kind: 'variable',
        name: 'testVar',
      });

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.INTEGER);
    });

    it('should validate not expression', () => {
      const result = validator.validateExpression({
        kind: 'not',
        operand: TypePromotionSystem.BOOLEAN,
      });

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
    });
  });
}); 