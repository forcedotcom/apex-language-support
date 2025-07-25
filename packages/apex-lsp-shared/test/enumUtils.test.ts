/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  defineEnum,
  isValidEnumKey,
  isValidEnumValue,
  getEnumKeys,
  getEnumValues,
  getEnumEntries,
  type EnumKey,
  type EnumValue,
} from '../src/enumUtils';

describe('defineEnum', () => {
  describe('basic functionality', () => {
    it('should create enum with custom values', () => {
      const Status = defineEnum([
        ['Active', 1],
        ['Inactive', 0],
        ['Pending', 2],
      ] as const);

      expect(Status.Active).toBe(1);
      expect(Status.Inactive).toBe(0);
      expect(Status.Pending).toBe(2);
    });

    it('should create enum with default values (array index)', () => {
      const Colors = defineEnum([['Red'], ['Green'], ['Blue']] as const);

      expect(Colors.Red).toBe(0);
      expect(Colors.Green).toBe(1);
      expect(Colors.Blue).toBe(2);
    });

    it('should create enum with mixed custom and default values', () => {
      const Priority = defineEnum([
        ['Low', 1],
        ['Medium'], // defaults to 2 since 1 is taken by Low
        ['High', 10],
        ['Critical'], // defaults to 3
      ] as const);

      expect(Priority.Low).toBe(1);
      expect(Priority.Medium).toBe(2); // Should be 2 since 1 is taken
      expect(Priority.High).toBe(10);
      expect(Priority.Critical).toBe(3);
    });
  });

  describe('bidirectional mapping', () => {
    it('should provide bidirectional key-value mapping', () => {
      const Status = defineEnum([
        ['Active', 1],
        ['Inactive', 0],
        ['Pending', 2],
      ] as const);

      // Key to value
      expect(Status.Active).toBe(1);
      expect(Status.Inactive).toBe(0);
      expect(Status.Pending).toBe(2);

      // Value to key
      expect(Status[1]).toBe('Active');
      expect(Status[0]).toBe('Inactive');
      expect(Status[2]).toBe('Pending');
    });

    it('should work with string values', () => {
      const Types = defineEnum([
        ['String', 'string'],
        ['Number', 'number'],
        ['Boolean', 'boolean'],
      ] as const);

      expect(Types.String).toBe('string');
      expect(Types.Number).toBe('number');
      expect(Types.Boolean).toBe('boolean');

      expect(Types['string']).toBe('String');
      expect(Types['number']).toBe('Number');
      expect(Types['boolean']).toBe('Boolean');
    });

    it('should work with boolean values', () => {
      const Flags = defineEnum([
        ['Enabled', true],
        ['Disabled', false],
      ] as const);

      expect(Flags.Enabled).toBe(true);
      expect(Flags.Disabled).toBe(false);

      // Use bracket notation for boolean keys
      expect(Flags[true as any]).toBe('Enabled');
      expect(Flags[false as any]).toBe('Disabled');
    });
  });

  describe('Zod validation schemas', () => {
    it('should provide key validation schema', () => {
      const Status = defineEnum([
        ['Active', 1],
        ['Inactive', 0],
        ['Pending', 2],
      ] as const);

      // Valid keys
      expect(() => Status.keySchema.parse('Active')).not.toThrow();
      expect(() => Status.keySchema.parse('Inactive')).not.toThrow();
      expect(() => Status.keySchema.parse('Pending')).not.toThrow();

      // Invalid keys
      expect(() => Status.keySchema.parse('Invalid')).toThrow();
      expect(() => Status.keySchema.parse('')).toThrow();
      expect(() => Status.keySchema.parse(123)).toThrow();
    });

    it('should provide value validation schema', () => {
      const Status = defineEnum([
        ['Active', 1],
        ['Inactive', 0],
        ['Pending', 2],
      ] as const);

      // Valid values
      expect(() => Status.valueSchema.parse(1)).not.toThrow();
      expect(() => Status.valueSchema.parse(0)).not.toThrow();
      expect(() => Status.valueSchema.parse(2)).not.toThrow();

      // Invalid values
      expect(() => Status.valueSchema.parse(3)).toThrow();
      expect(() => Status.valueSchema.parse('Active')).toThrow();
      expect(() => Status.valueSchema.parse(null)).toThrow();
    });

    it('should handle safe parsing', () => {
      const Status = defineEnum([
        ['Active', 1],
        ['Inactive', 0],
      ] as const);

      // Valid
      expect(Status.keySchema.safeParse('Active').success).toBe(true);
      expect(Status.valueSchema.safeParse(1).success).toBe(true);

      // Invalid
      expect(Status.keySchema.safeParse('Invalid').success).toBe(false);
      expect(Status.valueSchema.safeParse(999).success).toBe(false);
    });
  });

  describe('object immutability', () => {
    it('should return frozen object', () => {
      const Status = defineEnum([
        ['Active', 1],
        ['Inactive', 0],
      ] as const);

      expect(Object.isFrozen(Status)).toBe(true);
    });

    it('should prevent modifications', () => {
      const Status = defineEnum([
        ['Active', 1],
        ['Inactive', 0],
      ] as const);

      expect(() => {
        (Status as any).NewStatus = 3;
      }).toThrow();
    });
  });

  describe('utility functions', () => {
    const Status = defineEnum([
      ['Active', 1],
      ['Inactive', 0],
      ['Pending', 2],
    ] as const);

    describe('isValidEnumKey', () => {
      it('should validate enum keys correctly', () => {
        expect(isValidEnumKey(Status, 'Active')).toBe(true);
        expect(isValidEnumKey(Status, 'Inactive')).toBe(true);
        expect(isValidEnumKey(Status, 'Pending')).toBe(true);
        expect(isValidEnumKey(Status, 'Invalid')).toBe(false);
        expect(isValidEnumKey(Status, '')).toBe(false);
        expect(isValidEnumKey(Status, 123)).toBe(false);
      });

      it('should provide type narrowing', () => {
        const key: unknown = 'Active';
        if (isValidEnumKey(Status, key)) {
          // TypeScript should know key is 'Active' | 'Inactive' | 'Pending'
          expect(typeof key).toBe('string');
        }
      });
    });

    describe('isValidEnumValue', () => {
      it('should validate enum values correctly', () => {
        expect(isValidEnumValue(Status, 1)).toBe(true);
        expect(isValidEnumValue(Status, 0)).toBe(true);
        expect(isValidEnumValue(Status, 2)).toBe(true);
        expect(isValidEnumValue(Status, 3)).toBe(false);
        expect(isValidEnumValue(Status, 'Active')).toBe(false);
        expect(isValidEnumValue(Status, null)).toBe(false);
      });

      it('should provide type narrowing', () => {
        const value: unknown = 1;
        if (isValidEnumValue(Status, value)) {
          // TypeScript should know value is 1 | 0 | 2
          expect(typeof value).toBe('number');
        }
      });
    });

    describe('getEnumKeys', () => {
      it('should return all enum keys', () => {
        const keys = getEnumKeys(Status);
        expect(keys).toEqual(['Active', 'Inactive', 'Pending']);
        expect(keys).toHaveLength(3);
      });

      it('should exclude schema properties', () => {
        const keys = getEnumKeys(Status);
        expect(keys).not.toContain('keySchema');
        expect(keys).not.toContain('valueSchema');
      });
    });

    describe('getEnumValues', () => {
      it('should return all enum values', () => {
        const values = getEnumValues(Status);
        expect(values).toEqual([1, 0, 2]);
        expect(values).toHaveLength(3);
      });

      it('should handle duplicate values', () => {
        const DuplicateEnum = defineEnum([
          ['A', 1],
          ['B', 1], // duplicate value
          ['C', 2],
        ] as const);

        const values = getEnumValues(DuplicateEnum);
        expect(values).toEqual([1, 2]); // duplicates removed
        expect(values).toHaveLength(2);
      });
    });

    describe('getEnumEntries', () => {
      it('should return all enum entries as key-value pairs', () => {
        const entries = getEnumEntries(Status);
        expect(entries).toEqual([
          ['Active', 1],
          ['Inactive', 0],
          ['Pending', 2],
        ]);
        expect(entries).toHaveLength(3);
      });

      it('should maintain order', () => {
        const entries = getEnumEntries(Status);
        expect(entries[0][0]).toBe('Active');
        expect(entries[1][0]).toBe('Inactive');
        expect(entries[2][0]).toBe('Pending');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty enum', () => {
      const EmptyEnum = defineEnum([] as const);

      expect(getEnumKeys(EmptyEnum)).toEqual([]);
      expect(getEnumValues(EmptyEnum)).toEqual([]);
      expect(getEnumEntries(EmptyEnum)).toEqual([]);
    });

    it('should handle single entry enum', () => {
      const SingleEnum = defineEnum([['Only', 42]] as const);

      expect(SingleEnum.Only).toBe(42);
      expect(SingleEnum[42]).toBe('Only');
      expect(getEnumKeys(SingleEnum)).toEqual(['Only']);
      expect(getEnumValues(SingleEnum)).toEqual([42]);
    });

    it('should handle zero as a value', () => {
      const ZeroEnum = defineEnum([
        ['Zero', 0],
        ['One', 1],
      ] as const);

      expect(ZeroEnum.Zero).toBe(0);
      expect(ZeroEnum[0]).toBe('Zero');
      expect(isValidEnumValue(ZeroEnum, 0)).toBe(true);
    });

    it('should handle negative values', () => {
      const NegativeEnum = defineEnum([
        ['MinusOne', -1],
        ['Zero', 0],
        ['PlusOne', 1],
      ] as const);

      expect(NegativeEnum.MinusOne).toBe(-1);
      expect(NegativeEnum[-1]).toBe('MinusOne');
      expect(isValidEnumValue(NegativeEnum, -1)).toBe(true);
    });
  });

  describe('TypeScript types', () => {
    it('should provide correct key types', () => {
      const _Status = defineEnum([
        ['Active', 1],
        ['Inactive', 0],
      ] as const);

      type StatusKey = EnumKey<typeof _Status>;
      const key: StatusKey = 'Active'; // Should compile
      expect(key).toBe('Active');
    });

    it('should provide correct value types', () => {
      const _Status = defineEnum([
        ['Active', 1],
        ['Inactive', 0],
      ] as const);

      type StatusValue = EnumValue<typeof _Status>;
      const value: StatusValue = 1; // Should compile
      expect(value).toBe(1);
    });

    it('should work with const assertions', () => {
      const Status = defineEnum([
        ['Active', 1],
        ['Inactive', 0],
      ] as const);

      // TypeScript should infer the most specific types
      expect(Status.Active).toBe(1);
      expect(Status[1]).toBe('Active');
    });
  });

  describe('performance characteristics', () => {
    it('should handle large enums efficiently', () => {
      const largeEntries = Array.from(
        { length: 1000 },
        (_, i) => [`Key${i}`, i] as const,
      );
      const LargeEnum = defineEnum(largeEntries);

      expect(LargeEnum.Key0).toBe(0);
      expect(LargeEnum.Key999).toBe(999);
      expect(LargeEnum[0]).toBe('Key0');
      expect(LargeEnum[999]).toBe('Key999');

      const keys = getEnumKeys(LargeEnum);
      expect(keys).toHaveLength(1000);
      expect(keys[0]).toBe('Key0');
      expect(keys[999]).toBe('Key999');
    });

    it('should provide fast key validation', () => {
      const Status = defineEnum([
        ['Active', 1],
        ['Inactive', 0],
        ['Pending', 2],
      ] as const);

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        isValidEnumKey(Status, 'Active');
        isValidEnumKey(Status, 'Invalid');
      }
      const end = performance.now();

      // Should complete in reasonable time (less than 500ms)
      expect(end - start).toBeLessThan(500);
    });
  });
});
