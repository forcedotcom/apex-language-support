/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TypePromotionSystem } from '../../../src/semantics/validation/TypePromotionSystem';

describe('TypePromotionSystem', () => {
  describe('isNumeric', () => {
    it('should return true for integer type', () => {
      expect(TypePromotionSystem.isNumeric(TypePromotionSystem.INTEGER)).toBe(
        true,
      );
    });

    it('should return true for long type', () => {
      expect(TypePromotionSystem.isNumeric(TypePromotionSystem.LONG)).toBe(
        true,
      );
    });

    it('should return true for double type', () => {
      expect(TypePromotionSystem.isNumeric(TypePromotionSystem.DOUBLE)).toBe(
        true,
      );
    });

    it('should return true for decimal type', () => {
      expect(TypePromotionSystem.isNumeric(TypePromotionSystem.DECIMAL)).toBe(
        true,
      );
    });

    it('should return false for string type', () => {
      expect(TypePromotionSystem.isNumeric(TypePromotionSystem.STRING)).toBe(
        false,
      );
    });

    it('should return false for boolean type', () => {
      expect(TypePromotionSystem.isNumeric(TypePromotionSystem.BOOLEAN)).toBe(
        false,
      );
    });
  });

  describe('isIntegerOrLong', () => {
    it('should return true for integer type', () => {
      expect(
        TypePromotionSystem.isIntegerOrLong(TypePromotionSystem.INTEGER),
      ).toBe(true);
    });

    it('should return true for long type', () => {
      expect(
        TypePromotionSystem.isIntegerOrLong(TypePromotionSystem.LONG),
      ).toBe(true);
    });

    it('should return false for double type', () => {
      expect(
        TypePromotionSystem.isIntegerOrLong(TypePromotionSystem.DOUBLE),
      ).toBe(false);
    });

    it('should return false for string type', () => {
      expect(
        TypePromotionSystem.isIntegerOrLong(TypePromotionSystem.STRING),
      ).toBe(false);
    });
  });

  describe('isDateTime', () => {
    it('should return true for date type', () => {
      expect(TypePromotionSystem.isDateTime(TypePromotionSystem.DATE)).toBe(
        true,
      );
    });

    it('should return true for datetime type', () => {
      expect(TypePromotionSystem.isDateTime(TypePromotionSystem.DATETIME)).toBe(
        true,
      );
    });

    it('should return true for time type', () => {
      expect(TypePromotionSystem.isDateTime(TypePromotionSystem.TIME)).toBe(
        true,
      );
    });

    it('should return false for integer type', () => {
      expect(TypePromotionSystem.isDateTime(TypePromotionSystem.INTEGER)).toBe(
        false,
      );
    });
  });

  describe('promoteTypes', () => {
    describe('string concatenation', () => {
      it('should promote to string when left operand is string', () => {
        const left = TypePromotionSystem.STRING;
        const right = TypePromotionSystem.INTEGER;
        const result = TypePromotionSystem.promoteTypes(left, right);
        expect(result).toBe(TypePromotionSystem.STRING);
      });

      it('should promote to string when right operand is string', () => {
        const left = TypePromotionSystem.INTEGER;
        const right = TypePromotionSystem.STRING;
        const result = TypePromotionSystem.promoteTypes(left, right);
        expect(result).toBe(TypePromotionSystem.STRING);
      });

      it('should promote to string when both operands are string', () => {
        const left = TypePromotionSystem.STRING;
        const right = TypePromotionSystem.STRING;
        const result = TypePromotionSystem.promoteTypes(left, right);
        expect(result).toBe(TypePromotionSystem.STRING);
      });
    });

    describe('date/time operations', () => {
      it('should return date type when left operand is date', () => {
        const left = TypePromotionSystem.DATE;
        const right = TypePromotionSystem.INTEGER;
        const result = TypePromotionSystem.promoteTypes(left, right);
        expect(result).toBe(TypePromotionSystem.DATE);
      });

      it('should return datetime type when left operand is datetime', () => {
        const left = TypePromotionSystem.DATETIME;
        const right = TypePromotionSystem.INTEGER;
        const result = TypePromotionSystem.promoteTypes(left, right);
        expect(result).toBe(TypePromotionSystem.DATETIME);
      });

      it('should return time type when left operand is time', () => {
        const left = TypePromotionSystem.TIME;
        const right = TypePromotionSystem.INTEGER;
        const result = TypePromotionSystem.promoteTypes(left, right);
        expect(result).toBe(TypePromotionSystem.TIME);
      });
    });

    describe('numeric promotion', () => {
      it('should promote to decimal when either operand is decimal', () => {
        const left = TypePromotionSystem.INTEGER;
        const right = TypePromotionSystem.DECIMAL;
        const result = TypePromotionSystem.promoteTypes(left, right);
        expect(result).toBe(TypePromotionSystem.DECIMAL);
      });

      it('should promote to double when either operand is double (and no decimal)', () => {
        const left = TypePromotionSystem.INTEGER;
        const right = TypePromotionSystem.DOUBLE;
        const result = TypePromotionSystem.promoteTypes(left, right);
        expect(result).toBe(TypePromotionSystem.DOUBLE);
      });

      it('should promote to long when either operand is long (and no decimal/double)', () => {
        const left = TypePromotionSystem.INTEGER;
        const right = TypePromotionSystem.LONG;
        const result = TypePromotionSystem.promoteTypes(left, right);
        expect(result).toBe(TypePromotionSystem.LONG);
      });

      it('should return integer when both operands are integer', () => {
        const left = TypePromotionSystem.INTEGER;
        const right = TypePromotionSystem.INTEGER;
        const result = TypePromotionSystem.promoteTypes(left, right);
        expect(result).toBe(TypePromotionSystem.INTEGER);
      });

      it('should promote to decimal when both operands are decimal', () => {
        const left = TypePromotionSystem.DECIMAL;
        const right = TypePromotionSystem.DECIMAL;
        const result = TypePromotionSystem.promoteTypes(left, right);
        expect(result).toBe(TypePromotionSystem.DECIMAL);
      });

      it('should promote to double when both operands are double', () => {
        const left = TypePromotionSystem.DOUBLE;
        const right = TypePromotionSystem.DOUBLE;
        const result = TypePromotionSystem.promoteTypes(left, right);
        expect(result).toBe(TypePromotionSystem.DOUBLE);
      });

      it('should promote to long when both operands are long', () => {
        const left = TypePromotionSystem.LONG;
        const right = TypePromotionSystem.LONG;
        const result = TypePromotionSystem.promoteTypes(left, right);
        expect(result).toBe(TypePromotionSystem.LONG);
      });
    });
  });
});
