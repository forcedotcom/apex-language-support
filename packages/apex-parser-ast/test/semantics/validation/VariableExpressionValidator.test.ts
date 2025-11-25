/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { VariableExpressionValidator } from '../../../src/semantics/validation/VariableExpressionValidator';
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
  visibility: any = 'Public',
  isStatic = false,
): VariableSymbol => ({
  name,
  type,
  visibility,
  isStatic,
  kind: 'Variable' as any,
  modifiers: { visibility, isStatic },
  namespace: null,
  location: { line: 1, column: 1 },
});

describe('VariableExpressionValidator', () => {
  describe('validateVariableExpression', () => {
    it('should validate existing variable', () => {
      const scope = createMockScope();
      const variable = createMockVariable(
        'testVar',
        TypePromotionSystem.INTEGER,
      );
      const symbolTable = new Map([['testVar', variable]]);

      const result = VariableExpressionValidator.validateVariableExpression(
        'testVar',
        symbolTable,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.INTEGER);
    });

    it('should validate existing variable with string type', () => {
      const scope = createMockScope();
      const variable = createMockVariable('name', TypePromotionSystem.STRING);
      const symbolTable = new Map([['name', variable]]);

      const result = VariableExpressionValidator.validateVariableExpression(
        'name',
        symbolTable,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.STRING);
    });

    it('should validate existing variable with boolean type', () => {
      const scope = createMockScope();
      const variable = createMockVariable('flag', TypePromotionSystem.BOOLEAN);
      const symbolTable = new Map([['flag', variable]]);

      const result = VariableExpressionValidator.validateVariableExpression(
        'flag',
        symbolTable,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
    });

    it('should reject non-existent variable', () => {
      const scope = createMockScope();
      const symbolTable = new Map();

      const result = VariableExpressionValidator.validateVariableExpression(
        'nonExistentVar',
        symbolTable,
        scope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('variable.does.not.exist');
    });

    it('should reject variable with empty symbol table', () => {
      const scope = createMockScope();
      const symbolTable = new Map();

      const result = VariableExpressionValidator.validateVariableExpression(
        'anyVar',
        symbolTable,
        scope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('variable.does.not.exist');
    });

    it('should validate variable with different case (case-insensitive)', () => {
      const scope = createMockScope();
      const variable = createMockVariable(
        'TestVar',
        TypePromotionSystem.INTEGER,
      );
      const symbolTable = new Map([['TestVar', variable]]);

      const result = VariableExpressionValidator.validateVariableExpression(
        'testvar',
        symbolTable,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.INTEGER);
    });

    it('should validate variable with exact case match', () => {
      const scope = createMockScope();
      const variable = createMockVariable(
        'TestVar',
        TypePromotionSystem.INTEGER,
      );
      const symbolTable = new Map([['TestVar', variable]]);

      const result = VariableExpressionValidator.validateVariableExpression(
        'TestVar',
        symbolTable,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.INTEGER);
    });
  });

  describe('validateVariableVisibility', () => {
    it('should validate public variable', () => {
      const scope = createMockScope();
      const variable = createMockVariable(
        'publicVar',
        TypePromotionSystem.INTEGER,
        'Public',
      );
      const symbolTable = new Map([['publicVar', variable]]);

      const result = VariableExpressionValidator.validateVariableVisibility(
        'publicVar',
        symbolTable,
        scope,
      );

      expect(result.isValid).toBe(true);
    });

    it('should validate private variable in same class', () => {
      const scope = createMockScope();
      const variable = createMockVariable(
        'privateVar',
        TypePromotionSystem.INTEGER,
        'Private',
      );
      const symbolTable = new Map([['privateVar', variable]]);

      const result = VariableExpressionValidator.validateVariableVisibility(
        'privateVar',
        symbolTable,
        scope,
      );

      expect(result.isValid).toBe(true);
    });

    it('should validate protected variable in same class', () => {
      const scope = createMockScope();
      const variable = createMockVariable(
        'protectedVar',
        TypePromotionSystem.INTEGER,
        'Protected',
      );
      const symbolTable = new Map([['protectedVar', variable]]);

      const result = VariableExpressionValidator.validateVariableVisibility(
        'protectedVar',
        symbolTable,
        scope,
      );

      expect(result.isValid).toBe(true);
    });

    it('should validate global variable', () => {
      const scope = createMockScope();
      const variable = createMockVariable(
        'globalVar',
        TypePromotionSystem.INTEGER,
        'Global',
      );
      const symbolTable = new Map([['globalVar', variable]]);

      const result = VariableExpressionValidator.validateVariableVisibility(
        'globalVar',
        symbolTable,
        scope,
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateVariableContext', () => {
    it('should validate static variable in static context', () => {
      const scope = createMockScope();
      const variable = createMockVariable(
        'staticVar',
        TypePromotionSystem.INTEGER,
        'Public',
        true,
      );
      const symbolTable = new Map([['staticVar', variable]]);

      const result = VariableExpressionValidator.validateVariableContext(
        'staticVar',
        symbolTable,
        true, // static context
        scope,
      );

      expect(result.isValid).toBe(true);
    });

    it('should validate instance variable in instance context', () => {
      const scope = createMockScope();
      const variable = createMockVariable(
        'instanceVar',
        TypePromotionSystem.INTEGER,
        'Public',
        false,
      );
      const symbolTable = new Map([['instanceVar', variable]]);

      const result = VariableExpressionValidator.validateVariableContext(
        'instanceVar',
        symbolTable,
        false, // instance context
        scope,
      );

      expect(result.isValid).toBe(true);
    });

    it('should reject static variable in instance context', () => {
      const scope = createMockScope();
      const variable = createMockVariable(
        'staticVar',
        TypePromotionSystem.INTEGER,
        'Public',
        true,
      );
      const symbolTable = new Map([['staticVar', variable]]);

      const result = VariableExpressionValidator.validateVariableContext(
        'staticVar',
        symbolTable,
        false, // instance context
        scope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('variable.not.accessible.in.context');
    });

    it('should allow instance variable in static context (if accessible)', () => {
      const scope = createMockScope();
      const variable = createMockVariable(
        'instanceVar',
        TypePromotionSystem.INTEGER,
        'Public',
        false,
      );
      const symbolTable = new Map([['instanceVar', variable]]);

      const result = VariableExpressionValidator.validateVariableContext(
        'instanceVar',
        symbolTable,
        true, // static context
        scope,
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateVariableType', () => {
    it('should return correct type for integer variable', () => {
      const scope = createMockScope();
      const variable = createMockVariable(
        'intVar',
        TypePromotionSystem.INTEGER,
      );
      const symbolTable = new Map([['intVar', variable]]);

      const result = VariableExpressionValidator.validateVariableExpression(
        'intVar',
        symbolTable,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.INTEGER);
    });

    it('should return correct type for string variable', () => {
      const scope = createMockScope();
      const variable = createMockVariable('strVar', TypePromotionSystem.STRING);
      const symbolTable = new Map([['strVar', variable]]);

      const result = VariableExpressionValidator.validateVariableExpression(
        'strVar',
        symbolTable,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.STRING);
    });

    it('should return correct type for boolean variable', () => {
      const scope = createMockScope();
      const variable = createMockVariable(
        'boolVar',
        TypePromotionSystem.BOOLEAN,
      );
      const symbolTable = new Map([['boolVar', variable]]);

      const result = VariableExpressionValidator.validateVariableExpression(
        'boolVar',
        symbolTable,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
    });

    it('should return correct type for date variable', () => {
      const scope = createMockScope();
      const variable = createMockVariable('dateVar', TypePromotionSystem.DATE);
      const symbolTable = new Map([['dateVar', variable]]);

      const result = VariableExpressionValidator.validateVariableExpression(
        'dateVar',
        symbolTable,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.DATE);
    });

    it('should return correct type for decimal variable', () => {
      const scope = createMockScope();
      const variable = createMockVariable(
        'decVar',
        TypePromotionSystem.DECIMAL,
      );
      const symbolTable = new Map([['decVar', variable]]);

      const result = VariableExpressionValidator.validateVariableExpression(
        'decVar',
        symbolTable,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.DECIMAL);
    });
  });
});
