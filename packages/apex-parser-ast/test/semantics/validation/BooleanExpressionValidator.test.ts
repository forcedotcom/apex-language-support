/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { BooleanExpressionValidator } from '../../../src/semantics/validation/BooleanExpressionValidator';
import { TypePromotionSystem } from '../../../src/semantics/validation/TypePromotionSystem';
import type { ValidationScope } from '../../../src/semantics/validation/ValidationResult';

// Mock validation scope for testing
const createMockScope = (version = 58): ValidationScope => ({
  supportsLongIdentifiers: true,
  version,
  isFileBased: true,
});

describe('BooleanExpressionValidator', () => {
  describe('validateComparison', () => {
    describe('equality operations', () => {
      it('should allow integer == integer', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.INTEGER,
          '==',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
      });

      it('should allow string == string', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.STRING,
          TypePromotionSystem.STRING,
          '==',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
      });

      it('should allow boolean == boolean', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.BOOLEAN,
          TypePromotionSystem.BOOLEAN,
          '==',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
      });

      it('should reject integer == string', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.STRING,
          '==',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.comparison.types');
      });

      it('should reject boolean == integer', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.BOOLEAN,
          TypePromotionSystem.INTEGER,
          '==',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.comparison.types');
      });

      it('should reject date == string', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.DATE,
          TypePromotionSystem.STRING,
          '==',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.comparison.types');
      });
    });

    describe('inequality operations', () => {
      it('should allow integer != integer', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.INTEGER,
          '!=',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
      });

      it('should allow string != string', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.STRING,
          TypePromotionSystem.STRING,
          '!=',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
      });

      it('should reject integer != string', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.STRING,
          '!=',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.inequality.type');
      });

      it('should reject boolean != integer', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.BOOLEAN,
          TypePromotionSystem.INTEGER,
          '!=',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.inequality.type');
      });
    });

    describe('relational operations', () => {
      it('should allow integer < integer', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.INTEGER,
          '<',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
      });

      it('should allow integer <= integer', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.INTEGER,
          '<=',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
      });

      it('should allow integer > integer', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.INTEGER,
          '>',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
      });

      it('should allow integer >= integer', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.INTEGER,
          '>=',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
      });

      it('should allow long < integer', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.LONG,
          TypePromotionSystem.INTEGER,
          '<',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
      });

      it('should allow double < decimal', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.DOUBLE,
          TypePromotionSystem.DECIMAL,
          '<',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
      });

      it('should reject string < integer', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.STRING,
          TypePromotionSystem.INTEGER,
          '<',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.comparison.types');
      });

      it('should reject boolean < integer', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.BOOLEAN,
          TypePromotionSystem.INTEGER,
          '<',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.comparison.types');
      });

      it('should reject date < string', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateComparison(
          TypePromotionSystem.DATE,
          TypePromotionSystem.STRING,
          '<',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.comparison.types');
      });
    });
  });

  describe('validateLogical', () => {
    describe('AND operations', () => {
      it('should allow boolean && boolean', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateLogical(
          TypePromotionSystem.BOOLEAN,
          TypePromotionSystem.BOOLEAN,
          '&&',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
      });

      it('should reject integer && boolean', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateLogical(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.BOOLEAN,
          '&&',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.logical.type');
      });

      it('should reject boolean && integer', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateLogical(
          TypePromotionSystem.BOOLEAN,
          TypePromotionSystem.INTEGER,
          '&&',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.logical.type');
      });

      it('should reject string && boolean', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateLogical(
          TypePromotionSystem.STRING,
          TypePromotionSystem.BOOLEAN,
          '&&',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.logical.type');
      });
    });

    describe('OR operations', () => {
      it('should allow boolean || boolean', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateLogical(
          TypePromotionSystem.BOOLEAN,
          TypePromotionSystem.BOOLEAN,
          '||',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
      });

      it('should reject integer || boolean', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateLogical(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.BOOLEAN,
          '||',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.logical.type');
      });

      it('should reject boolean || string', () => {
        const scope = createMockScope();
        const result = BooleanExpressionValidator.validateLogical(
          TypePromotionSystem.BOOLEAN,
          TypePromotionSystem.STRING,
          '||',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.logical.type');
      });
    });
  });

  describe('validateNot', () => {
    it('should allow !boolean', () => {
      const scope = createMockScope();
      const result = BooleanExpressionValidator.validateNot(
        TypePromotionSystem.BOOLEAN,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.BOOLEAN);
    });

    it('should reject !integer', () => {
      const scope = createMockScope();
      const result = BooleanExpressionValidator.validateNot(
        TypePromotionSystem.INTEGER,
        scope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.logical.type');
    });

    it('should reject !string', () => {
      const scope = createMockScope();
      const result = BooleanExpressionValidator.validateNot(
        TypePromotionSystem.STRING,
        scope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.logical.type');
    });

    it('should reject !date', () => {
      const scope = createMockScope();
      const result = BooleanExpressionValidator.validateNot(
        TypePromotionSystem.DATE,
        scope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.logical.type');
    });
  });
}); 