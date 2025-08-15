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
import type { ExpressionType } from '../../../src/semantics/validation/TypePromotionSystem';
import type { VariableSymbol } from '../../../src/types/symbol';

describe('ExpressionValidator', () => {
  const createMockScope = (version = 58): ValidationScope => ({
    version,
    namespace: 'default',
    currentClass: 'TestClass',
    currentMethod: 'testMethod',
    isStatic: false,
  });

  const createMockType = (name: string): ExpressionType => {
    // Use static constants for common types
    switch (name) {
      case 'Integer':
        return TypePromotionSystem.INTEGER;
      case 'Long':
        return TypePromotionSystem.LONG;
      case 'Double':
        return TypePromotionSystem.DOUBLE;
      case 'Decimal':
        return TypePromotionSystem.DECIMAL;
      case 'String':
        return TypePromotionSystem.STRING;
      case 'Boolean':
        return TypePromotionSystem.BOOLEAN;
      case 'Date':
        return TypePromotionSystem.DATE;
      case 'DateTime':
        return TypePromotionSystem.DATETIME;
      case 'Time':
        return TypePromotionSystem.TIME;
      case 'null':
        return { name: 'null', isPrimitive: true, isVoid: false };
      default:
        return { name, isPrimitive: true, isVoid: false };
    }
  };

  const createMockSymbolTable = (): Map<string, VariableSymbol> => {
    const symbolTable = new Map<string, VariableSymbol>();
    symbolTable.set('testVar', {
      name: 'testVar',
      type: createMockType('String'),
      visibility: 'public',
      modifiers: { isStatic: false },
    } as VariableSymbol);
    return symbolTable;
  };

  let validator: ExpressionValidator;
  let scope: ValidationScope;
  let symbolTable: Map<string, VariableSymbol>;

  beforeEach(() => {
    scope = createMockScope();
    symbolTable = createMockSymbolTable();
    validator = new ExpressionValidator(scope, symbolTable);
  });

  describe('validateBinaryExpression', () => {
    it('should validate arithmetic operations', () => {
      const result = validator.validateBinaryExpression(
        createMockType('Integer'),
        createMockType('Integer'),
        '+',
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate shift operations', () => {
      const result = validator.validateBinaryExpression(
        createMockType('Integer'),
        createMockType('Integer'),
        '<<',
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate bitwise operations', () => {
      const result = validator.validateBinaryExpression(
        createMockType('Integer'),
        createMockType('Integer'),
        '&',
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid arithmetic operations', () => {
      const result = validator.validateBinaryExpression(
        createMockType('String'),
        createMockType('Integer'),
        '*',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateBooleanExpression', () => {
    it('should validate comparison operations', () => {
      const result = validator.validateBooleanExpression(
        createMockType('Integer'),
        createMockType('Integer'),
        '==',
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate logical operations', () => {
      const result = validator.validateBooleanExpression(
        createMockType('Boolean'),
        createMockType('Boolean'),
        '&&',
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid comparison operations', () => {
      const result = validator.validateBooleanExpression(
        createMockType('String'),
        createMockType('Integer'),
        '==',
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateVariableExpression', () => {
    it('should validate existing variables', () => {
      const result = validator.validateVariableExpression('testVar');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-existent variables', () => {
      const result = validator.validateVariableExpression('nonExistentVar');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle case-insensitive variable names', () => {
      const result = validator.validateVariableExpression('TESTVAR');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateNotExpression', () => {
    it('should validate boolean operands', () => {
      const result = validator.validateNotExpression(createMockType('Boolean'));

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject non-boolean operands', () => {
      const result = validator.validateNotExpression(createMockType('Integer'));

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateConstructorExpression', () => {
    it('should validate valid constructor with no field initializers', () => {
      const result = validator.validateConstructorExpression(
        createMockType('Account'),
        new Map<string, ExpressionType>(),
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid constructor with field initializers', () => {
      const fieldInitializers = new Map<string, ExpressionType>([
        ['Name', createMockType('String')],
        ['Phone', createMockType('String')],
      ]);

      const result = validator.validateConstructorExpression(
        createMockType('Account'),
        fieldInitializers,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject constructor with duplicate field initialization', () => {
      const fieldInitializers = new Map<string, ExpressionType>([
        ['Name', createMockType('String')],
        ['name', createMockType('String')], // Duplicate (case-insensitive)
      ]);

      const result = validator.validateConstructorExpression(
        createMockType('Account'),
        fieldInitializers,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('duplicate.field.init');
    });

    it('should reject constructor with non-existent field', () => {
      const fieldInitializers = new Map<string, ExpressionType>([
        ['NonExistentField', createMockType('String')],
      ]);

      const result = validator.validateConstructorExpression(
        createMockType('Account'),
        fieldInitializers,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('field.does.not.exist');
    });

    it('should reject constructor with incompatible field type', () => {
      const fieldInitializers = new Map<string, ExpressionType>([
        ['Name', createMockType('Integer')], // String field with Integer value
      ]);

      const result = validator.validateConstructorExpression(
        createMockType('Account'),
        fieldInitializers,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('illegal.assignment');
    });

    it('should reject constructor that does not support name-value pair syntax', () => {
      const fieldInitializers = new Map<string, ExpressionType>([
        ['Name', createMockType('String')],
      ]);

      const result = validator.validateConstructorExpression(
        createMockType('String'), // String doesn't support name-value pairs
        fieldInitializers,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.name.value.pair.constructor');
    });
  });

  describe('validateExpression', () => {
    it('should validate binary expressions', () => {
      const expression = {
        kind: 'binary' as const,
        left: createMockType('Integer'),
        right: createMockType('Integer'),
        operation: '+',
      };

      const result = validator.validateExpression(expression);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate comparison expressions', () => {
      const expression = {
        kind: 'comparison' as const,
        left: createMockType('Integer'),
        right: createMockType('Integer'),
        operation: '==',
      };

      const result = validator.validateExpression(expression);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate variable expressions', () => {
      const expression = {
        kind: 'variable' as const,
        name: 'testVar',
      };

      const result = validator.validateExpression(expression);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate NOT expressions', () => {
      const expression = {
        kind: 'not' as const,
        operand: createMockType('Boolean'),
      };

      const result = validator.validateExpression(expression);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate constructor expressions', () => {
      const expression = {
        kind: 'constructor' as const,
        targetType: createMockType('Account'),
        fieldInitializers: new Map<string, ExpressionType>([
          ['Name', createMockType('String')],
        ]),
      };

      const result = validator.validateExpression(expression);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unknown expression kinds', () => {
      const expression = {
        kind: 'unknown' as any,
        someProperty: 'value',
      };

      const result = validator.validateExpression(expression);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unknown expression kind: unknown');
    });
  });
});
