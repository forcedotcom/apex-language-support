/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { BinaryExpressionValidator } from '../../../src/semantics/validation/BinaryExpressionValidator';
import { TypePromotionSystem } from '../../../src/semantics/validation/TypePromotionSystem';
import type { ValidationScope } from '../../../src/semantics/validation/ValidationResult';

// Mock validation scope for testing
const createMockScope = (version = 58): ValidationScope => ({
  supportsLongIdentifiers: true,
  version,
  isFileBased: true,
});

describe('BinaryExpressionValidator', () => {
  describe('validateArithmetic', () => {
    describe('void expression restrictions', () => {
      it('should reject void expressions in arithmetic (pre-V174)', () => {
        const scope = createMockScope(173);
        const result = BinaryExpressionValidator.validateArithmetic(
          TypePromotionSystem.VOID,
          TypePromotionSystem.INTEGER,
          '+',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.void.arithmetic.expression');
      });

      it('should allow void expressions in arithmetic (V174+)', () => {
        const scope = createMockScope(174);
        const result = BinaryExpressionValidator.validateArithmetic(
          TypePromotionSystem.VOID,
          TypePromotionSystem.INTEGER,
          '+',
          scope,
        );

        expect(result.isValid).toBe(true);
      });
    });

    describe('string concatenation', () => {
      it('should allow string concatenation with addition', () => {
        const scope = createMockScope();
        const result = BinaryExpressionValidator.validateArithmetic(
          TypePromotionSystem.STRING,
          TypePromotionSystem.INTEGER,
          '+',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.STRING);
      });

      it('should reject string with non-addition operators', () => {
        const scope = createMockScope();
        const result = BinaryExpressionValidator.validateArithmetic(
          TypePromotionSystem.STRING,
          TypePromotionSystem.INTEGER,
          '-',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.numeric.arguments.expression');
      });

      it('should reject string with multiplication', () => {
        const scope = createMockScope();
        const result = BinaryExpressionValidator.validateArithmetic(
          TypePromotionSystem.STRING,
          TypePromotionSystem.INTEGER,
          '*',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.numeric.arguments.expression');
      });

      it('should reject string with division', () => {
        const scope = createMockScope();
        const result = BinaryExpressionValidator.validateArithmetic(
          TypePromotionSystem.STRING,
          TypePromotionSystem.INTEGER,
          '/',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.numeric.arguments.expression');
      });

      it('should reject string with modulo', () => {
        const scope = createMockScope();
        const result = BinaryExpressionValidator.validateArithmetic(
          TypePromotionSystem.STRING,
          TypePromotionSystem.INTEGER,
          '%',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.numeric.arguments.expression');
      });
    });

    describe('date/time operations', () => {
      describe('time operations', () => {
        it('should allow time + integer', () => {
          const scope = createMockScope();
          const result = BinaryExpressionValidator.validateArithmetic(
            TypePromotionSystem.TIME,
            TypePromotionSystem.INTEGER,
            '+',
            scope,
          );

          expect(result.isValid).toBe(true);
          expect(result.type).toBe(TypePromotionSystem.TIME);
        });

        it('should allow time + long', () => {
          const scope = createMockScope();
          const result = BinaryExpressionValidator.validateArithmetic(
            TypePromotionSystem.TIME,
            TypePromotionSystem.LONG,
            '+',
            scope,
          );

          expect(result.isValid).toBe(true);
          expect(result.type).toBe(TypePromotionSystem.TIME);
        });

        it('should reject time + double', () => {
          const scope = createMockScope();
          const result = BinaryExpressionValidator.validateArithmetic(
            TypePromotionSystem.TIME,
            TypePromotionSystem.DOUBLE,
            '+',
            scope,
          );

          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('invalid.time.operand.expression');
        });

        it('should reject time + decimal', () => {
          const scope = createMockScope();
          const result = BinaryExpressionValidator.validateArithmetic(
            TypePromotionSystem.TIME,
            TypePromotionSystem.DECIMAL,
            '+',
            scope,
          );

          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('invalid.time.operand.expression');
        });

        it('should reject time with non-addition/subtraction', () => {
          const scope = createMockScope();
          const result = BinaryExpressionValidator.validateArithmetic(
            TypePromotionSystem.TIME,
            TypePromotionSystem.INTEGER,
            '*',
            scope,
          );

          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('invalid.numeric.arguments.expression');
        });
      });

      describe('date operations', () => {
        it('should allow date + integer', () => {
          const scope = createMockScope();
          const result = BinaryExpressionValidator.validateArithmetic(
            TypePromotionSystem.DATE,
            TypePromotionSystem.INTEGER,
            '+',
            scope,
          );

          expect(result.isValid).toBe(true);
          expect(result.type).toBe(TypePromotionSystem.DATE);
        });

        it('should allow date + long', () => {
          const scope = createMockScope();
          const result = BinaryExpressionValidator.validateArithmetic(
            TypePromotionSystem.DATE,
            TypePromotionSystem.LONG,
            '+',
            scope,
          );

          expect(result.isValid).toBe(true);
          expect(result.type).toBe(TypePromotionSystem.DATE);
        });

        it('should reject date + double', () => {
          const scope = createMockScope();
          const result = BinaryExpressionValidator.validateArithmetic(
            TypePromotionSystem.DATE,
            TypePromotionSystem.DOUBLE,
            '+',
            scope,
          );

          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('invalid.date.operand.expression');
        });

        it('should reject date + decimal', () => {
          const scope = createMockScope();
          const result = BinaryExpressionValidator.validateArithmetic(
            TypePromotionSystem.DATE,
            TypePromotionSystem.DECIMAL,
            '+',
            scope,
          );

          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('invalid.date.operand.expression');
        });
      });

      describe('datetime operations', () => {
        it('should allow datetime + integer', () => {
          const scope = createMockScope();
          const result = BinaryExpressionValidator.validateArithmetic(
            TypePromotionSystem.DATETIME,
            TypePromotionSystem.INTEGER,
            '+',
            scope,
          );

          expect(result.isValid).toBe(true);
          expect(result.type).toBe(TypePromotionSystem.DATETIME);
        });

        it('should allow datetime + double', () => {
          const scope = createMockScope();
          const result = BinaryExpressionValidator.validateArithmetic(
            TypePromotionSystem.DATETIME,
            TypePromotionSystem.DOUBLE,
            '+',
            scope,
          );

          expect(result.isValid).toBe(true);
          expect(result.type).toBe(TypePromotionSystem.DATETIME);
        });

        it('should allow datetime + decimal', () => {
          const scope = createMockScope();
          const result = BinaryExpressionValidator.validateArithmetic(
            TypePromotionSystem.DATETIME,
            TypePromotionSystem.DECIMAL,
            '+',
            scope,
          );

          expect(result.isValid).toBe(true);
          expect(result.type).toBe(TypePromotionSystem.DATETIME);
        });

        it('should reject datetime + string', () => {
          const scope = createMockScope();
          const result = BinaryExpressionValidator.validateArithmetic(
            TypePromotionSystem.DATETIME,
            TypePromotionSystem.STRING,
            '+',
            scope,
          );

          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('invalid.datetime.operand.expression');
        });
      });
    });

    describe('numeric operations', () => {
      it('should allow integer + integer', () => {
        const scope = createMockScope();
        const result = BinaryExpressionValidator.validateArithmetic(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.INTEGER,
          '+',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.INTEGER);
      });

      it('should allow integer + long', () => {
        const scope = createMockScope();
        const result = BinaryExpressionValidator.validateArithmetic(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.LONG,
          '+',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.LONG);
      });

      it('should allow integer + double', () => {
        const scope = createMockScope();
        const result = BinaryExpressionValidator.validateArithmetic(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.DOUBLE,
          '+',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.DOUBLE);
      });

      it('should allow integer + decimal', () => {
        const scope = createMockScope();
        const result = BinaryExpressionValidator.validateArithmetic(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.DECIMAL,
          '+',
          scope,
        );

        expect(result.isValid).toBe(true);
        expect(result.type).toBe(TypePromotionSystem.DECIMAL);
      });

      it('should reject integer + string', () => {
        const scope = createMockScope();
        const result = BinaryExpressionValidator.validateArithmetic(
          TypePromotionSystem.INTEGER,
          TypePromotionSystem.STRING,
          '-',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.numeric.arguments.expression');
      });

      it('should reject boolean + integer', () => {
        const scope = createMockScope();
        const result = BinaryExpressionValidator.validateArithmetic(
          TypePromotionSystem.BOOLEAN,
          TypePromotionSystem.INTEGER,
          '+',
          scope,
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('invalid.numeric.arguments.expression');
      });
    });
  });

  describe('validateShift', () => {
    it('should allow integer << integer', () => {
      const scope = createMockScope();
      const result = BinaryExpressionValidator.validateShift(
        TypePromotionSystem.INTEGER,
        TypePromotionSystem.INTEGER,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.INTEGER);
    });

    it('should allow long << long', () => {
      const scope = createMockScope();
      const result = BinaryExpressionValidator.validateShift(
        TypePromotionSystem.LONG,
        TypePromotionSystem.LONG,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.LONG);
    });

    it('should allow integer << long', () => {
      const scope = createMockScope(160); // Use V160+ to avoid version-specific behavior
      const result = BinaryExpressionValidator.validateShift(
        TypePromotionSystem.INTEGER,
        TypePromotionSystem.LONG,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.INTEGER);
    });

    it('should reject double << integer', () => {
      const scope = createMockScope();
      const result = BinaryExpressionValidator.validateShift(
        TypePromotionSystem.DOUBLE,
        TypePromotionSystem.INTEGER,
        scope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.shift.operator.arguments');
    });

    it('should reject integer << string', () => {
      const scope = createMockScope();
      const result = BinaryExpressionValidator.validateShift(
        TypePromotionSystem.INTEGER,
        TypePromotionSystem.STRING,
        scope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.shift.operator.arguments');
    });

    it('should reject string << integer', () => {
      const scope = createMockScope();
      const result = BinaryExpressionValidator.validateShift(
        TypePromotionSystem.STRING,
        TypePromotionSystem.INTEGER,
        scope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.shift.operator.arguments');
    });
  });

  describe('validateBitwise', () => {
    it('should allow integer & integer', () => {
      const scope = createMockScope();
      const result = BinaryExpressionValidator.validateBitwise(
        TypePromotionSystem.INTEGER,
        TypePromotionSystem.INTEGER,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.INTEGER);
    });

    it('should allow long & long', () => {
      const scope = createMockScope();
      const result = BinaryExpressionValidator.validateBitwise(
        TypePromotionSystem.LONG,
        TypePromotionSystem.LONG,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.LONG);
    });

    it('should promote to long when integer & long', () => {
      const scope = createMockScope();
      const result = BinaryExpressionValidator.validateBitwise(
        TypePromotionSystem.INTEGER,
        TypePromotionSystem.LONG,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.LONG);
    });

    it('should promote to long when long & integer', () => {
      const scope = createMockScope();
      const result = BinaryExpressionValidator.validateBitwise(
        TypePromotionSystem.LONG,
        TypePromotionSystem.INTEGER,
        scope,
      );

      expect(result.isValid).toBe(true);
      expect(result.type).toBe(TypePromotionSystem.LONG);
    });

    it('should reject double & integer', () => {
      const scope = createMockScope();
      const result = BinaryExpressionValidator.validateBitwise(
        TypePromotionSystem.DOUBLE,
        TypePromotionSystem.INTEGER,
        scope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.bitwise.operator.arguments');
    });

    it('should reject integer & string', () => {
      const scope = createMockScope();
      const result = BinaryExpressionValidator.validateBitwise(
        TypePromotionSystem.INTEGER,
        TypePromotionSystem.STRING,
        scope,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('invalid.bitwise.operator.arguments');
    });
  });
}); 