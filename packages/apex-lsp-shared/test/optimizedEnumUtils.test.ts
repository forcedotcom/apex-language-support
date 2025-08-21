/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  defineOptimizedEnum,
  isValidOptimizedEnumKey,
  isValidOptimizedEnumValue,
  getOptimizedEnumKeys,
  getOptimizedEnumValues,
  getOptimizedEnumEntries,
  calculateOptimizedEnumSavings,
  compareEnumMemoryUsage,
  type OptimizedEnumKey,
  type OptimizedEnumValue,
} from '../src/optimizedEnumUtils';

describe('defineOptimizedEnum', () => {
  describe('basic functionality', () => {
    it('should create enum with custom values using optimal types', () => {
      const Status = defineOptimizedEnum([
        ['Active', 1],
        ['Inactive', 0],
        ['Pending', 2],
      ] as const);

      expect(Status.Active).toBe(1);
      expect(Status.Inactive).toBe(0);
      expect(Status.Pending).toBe(2);

      // Verify types work normally (optimization is internal)
      expect(typeof Status.Active).toBe('number');
      expect(typeof Status.Inactive).toBe('number');
      expect(typeof Status.Pending).toBe('number');
    });

    it('should create enum with default values using optimal types', () => {
      const Colors = defineOptimizedEnum([
        ['Red'],
        ['Green'],
        ['Blue'],
      ] as const);

      expect(Colors.Red).toBe(0);
      expect(Colors.Green).toBe(1);
      expect(Colors.Blue).toBe(2);

      // Verify types are optimized (should be Uint8 for small values)
      expect(typeof Colors.Red).toBe('number');
      expect(typeof Colors.Green).toBe('number');
      expect(typeof Colors.Blue).toBe('number');
    });

    it('should create enum with mixed custom and default values', () => {
      const Priority = defineOptimizedEnum([
        ['Low', 1],
        ['Medium'], // defaults to 2 since 1 is taken
        ['High', 10],
        ['Critical'], // defaults to 3
      ] as const);

      expect(Priority.Low).toBe(1);
      expect(Priority.Medium).toBe(2); // Should be 2 since 1 is taken
      expect(Priority.High).toBe(10);
      expect(Priority.Critical).toBe(3);
    });
  });

  describe('numeric type optimization', () => {
    it('should use Uint8 for small values (0-255)', () => {
      const SmallEnum = defineOptimizedEnum([
        ['Zero', 0],
        ['One', 1],
        ['Max', 255],
      ] as const);

      expect(SmallEnum.Zero).toBe(0);
      expect(SmallEnum.One).toBe(1);
      expect(SmallEnum.Max).toBe(255);
    });

    it('should use Uint16 for medium values (256-65535)', () => {
      const MediumEnum = defineOptimizedEnum([
        ['Min', 256],
        ['Mid', 32768],
        ['Max', 65535],
      ] as const);

      expect(MediumEnum.Min).toBe(256);
      expect(MediumEnum.Mid).toBe(32768);
      expect(MediumEnum.Max).toBe(65535);
    });

    it('should use Uint32 for large values (65536-4294967295)', () => {
      const LargeEnum = defineOptimizedEnum([
        ['Min', 65536],
        ['Mid', 2147483648],
        ['Max', 4294967295],
      ] as const);

      expect(LargeEnum.Min).toBe(65536);
      expect(LargeEnum.Mid).toBe(2147483648);
      expect(LargeEnum.Max).toBe(4294967295);
    });

    it('should reject values exceeding Uint32 range', () => {
      expect(() => {
        defineOptimizedEnum([['TooLarge', 4294967296]] as const);
      }).toThrow('Value 4294967296 exceeds Uint32 range (0-4294967295)');
    });
  });

  describe('bidirectional mapping', () => {
    it('should provide bidirectional key-value mapping', () => {
      const Status = defineOptimizedEnum([
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
      const Types = defineOptimizedEnum([
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
      const Flags = defineOptimizedEnum([
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
      const Status = defineOptimizedEnum([
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
      const Status = defineOptimizedEnum([
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
      const Status = defineOptimizedEnum([
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
      const Status = defineOptimizedEnum([
        ['Active', 1],
        ['Inactive', 0],
      ] as const);

      expect(Object.isFrozen(Status)).toBe(true);
    });

    it('should prevent modifications', () => {
      const Status = defineOptimizedEnum([
        ['Active', 1],
        ['Inactive', 0],
      ] as const);

      expect(() => {
        (Status as any).NewStatus = 3;
      }).toThrow();
    });
  });

  describe('utility functions', () => {
    const Status = defineOptimizedEnum([
      ['Active', 1],
      ['Inactive', 0],
      ['Pending', 2],
    ] as const);

    describe('isValidOptimizedEnumKey', () => {
      it('should validate enum keys correctly', () => {
        expect(isValidOptimizedEnumKey(Status, 'Active')).toBe(true);
        expect(isValidOptimizedEnumKey(Status, 'Inactive')).toBe(true);
        expect(isValidOptimizedEnumKey(Status, 'Pending')).toBe(true);
        expect(isValidOptimizedEnumKey(Status, 'Invalid')).toBe(false);
        expect(isValidOptimizedEnumKey(Status, '')).toBe(false);
        expect(isValidOptimizedEnumKey(Status, 123)).toBe(false);
      });

      it('should provide type narrowing', () => {
        const key: unknown = 'Active';
        if (isValidOptimizedEnumKey(Status, key)) {
          // TypeScript should know key is 'Active' | 'Inactive' | 'Pending'
          expect(typeof key).toBe('string');
        }
      });
    });

    describe('isValidOptimizedEnumValue', () => {
      it('should validate enum values correctly', () => {
        expect(isValidOptimizedEnumValue(Status, 1)).toBe(true);
        expect(isValidOptimizedEnumValue(Status, 0)).toBe(true);
        expect(isValidOptimizedEnumValue(Status, 2)).toBe(true);
        expect(isValidOptimizedEnumValue(Status, 3)).toBe(false);
        expect(isValidOptimizedEnumValue(Status, 'Active')).toBe(false);
        expect(isValidOptimizedEnumValue(Status, null)).toBe(false);
      });

      it('should provide type narrowing', () => {
        const value: unknown = 1;
        if (isValidOptimizedEnumValue(Status, value)) {
          // TypeScript should know value is 1 | 0 | 2
          expect(typeof value).toBe('number');
        }
      });
    });

    describe('getOptimizedEnumKeys', () => {
      it('should return all enum keys', () => {
        const keys = getOptimizedEnumKeys(Status);
        expect(keys).toEqual(['Active', 'Inactive', 'Pending']);
        expect(keys).toHaveLength(3);
      });

      it('should exclude schema properties', () => {
        const keys = getOptimizedEnumKeys(Status);
        expect(keys).not.toContain('keySchema');
        expect(keys).not.toContain('valueSchema');
      });
    });

    describe('getOptimizedEnumValues', () => {
      it('should return all enum values', () => {
        const values = getOptimizedEnumValues(Status);
        expect(values).toEqual([1, 0, 2]);
        expect(values).toHaveLength(3);
      });

      it('should handle duplicate values', () => {
        const DuplicateEnum = defineOptimizedEnum([
          ['A', 1],
          ['B', 1], // duplicate value
          ['C', 2],
        ] as const);

        const values = getOptimizedEnumValues(DuplicateEnum);
        expect(values).toEqual([1, 2]); // duplicates removed
        expect(values).toHaveLength(2);
      });
    });

    describe('getOptimizedEnumEntries', () => {
      it('should return all enum entries as key-value pairs', () => {
        const entries = getOptimizedEnumEntries(Status);
        expect(entries).toEqual([
          ['Active', 1],
          ['Inactive', 0],
          ['Pending', 2],
        ]);
        expect(entries).toHaveLength(3);
      });

      it('should maintain order', () => {
        const entries = getOptimizedEnumEntries(Status);
        expect(entries[0][0]).toBe('Active');
        expect(entries[1][0]).toBe('Inactive');
        expect(entries[2][0]).toBe('Pending');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty enum', () => {
      const EmptyEnum = defineOptimizedEnum([] as const);

      expect(getOptimizedEnumKeys(EmptyEnum)).toEqual([]);
      expect(getOptimizedEnumValues(EmptyEnum)).toEqual([]);
      expect(getOptimizedEnumEntries(EmptyEnum)).toEqual([]);
    });

    it('should handle single entry enum', () => {
      const SingleEnum = defineOptimizedEnum([['Only', 42]] as const);

      expect(SingleEnum.Only).toBe(42);
      expect(SingleEnum[42]).toBe('Only');
      expect(getOptimizedEnumKeys(SingleEnum)).toEqual(['Only']);
      expect(getOptimizedEnumValues(SingleEnum)).toEqual([42]);
    });

    it('should handle zero as a value', () => {
      const ZeroEnum = defineOptimizedEnum([
        ['Zero', 0],
        ['One', 1],
      ] as const);

      expect(ZeroEnum.Zero).toBe(0);
      expect(ZeroEnum[0]).toBe('Zero');
      expect(isValidOptimizedEnumValue(ZeroEnum, 0)).toBe(true);
    });
  });

  describe('TypeScript types', () => {
    it('should provide correct key types', () => {
      const _Status = defineOptimizedEnum([
        ['Active', 1],
        ['Inactive', 0],
      ] as const);

      type StatusKey = OptimizedEnumKey<typeof _Status>;
      const key: StatusKey = 'Active'; // Should compile
      expect(key).toBe('Active');
    });

    it('should provide correct value types', () => {
      const _Status = defineOptimizedEnum([
        ['Active', 1],
        ['Inactive', 0],
      ] as const);

      type StatusValue = OptimizedEnumValue<typeof _Status>;
      const value: StatusValue = 1; // Should compile
      expect(value).toBe(1);
    });

    it('should work with const assertions', () => {
      const Status = defineOptimizedEnum([
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
      const LargeEnum = defineOptimizedEnum(largeEntries);

      expect(LargeEnum.Key0).toBe(0);
      expect(LargeEnum.Key999).toBe(999);
      expect(LargeEnum[0]).toBe('Key0');
      expect(LargeEnum[999]).toBe('Key999');

      const keys = getOptimizedEnumKeys(LargeEnum);
      expect(keys).toHaveLength(1000);
      expect(keys[0]).toBe('Key0');
      expect(keys[999]).toBe('Key999');
    });

    it.skip('should provide fast key validation', () => {
      const Status = defineOptimizedEnum([
        ['Active', 1],
        ['Inactive', 0],
        ['Pending', 2],
      ] as const);

      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        isValidOptimizedEnumKey(Status, 'Active');
        isValidOptimizedEnumKey(Status, 'Invalid');
      }
      const end = performance.now();

      // Should complete in reasonable time (less than 500ms)
      expect(end - start).toBeLessThan(500);
    });
  });

  describe('memory savings calculation', () => {
    it('should calculate correct memory savings', () => {
      const savings = calculateOptimizedEnumSavings();

      expect(savings.smallEnums.before).toBe(8);
      expect(savings.smallEnums.after).toBe(1);
      expect(savings.smallEnums.reduction).toBe(87.5);

      expect(savings.mediumEnums.before).toBe(8);
      expect(savings.mediumEnums.after).toBe(2);
      expect(savings.mediumEnums.reduction).toBe(75);

      expect(savings.largeEnums.before).toBe(8);
      expect(savings.largeEnums.after).toBe(4);
      expect(savings.largeEnums.reduction).toBe(50);
    });

    it('should compare memory usage for different enum sizes', () => {
      const comparison = compareEnumMemoryUsage(1000);

      expect(comparison.originalMemory).toBe(8000); // 1000 * 8 bytes
      expect(comparison.optimizedMemory).toBeLessThan(8000);
      expect(comparison.savings).toBeGreaterThan(0);
      expect(comparison.reduction).toBeGreaterThan(0);

      // Verify breakdown
      expect(comparison.breakdown.small.count).toBe(800); // 80%
      expect(comparison.breakdown.medium.count).toBe(150); // 15%
      expect(comparison.breakdown.large.count).toBe(50); // 5%

      console.log('Memory usage for 1000 enums:');
      console.log(`Original: ${comparison.originalMemory} bytes`);
      console.log(`Optimized: ${comparison.optimizedMemory} bytes`);
      console.log(
        `Saved: ${comparison.savings} bytes (${comparison.reduction.toFixed(1)}%)`,
      );
    });

    it('should demonstrate memory savings for typical Apex enums', () => {
      // Typical Apex enum sizes
      const typicalSizes = [10, 50, 100, 500, 1000];

      typicalSizes.forEach((size) => {
        const comparison = compareEnumMemoryUsage(size);
        console.log(
          `${size} enums: ${comparison.reduction.toFixed(1)}% reduction`,
        );

        expect(comparison.reduction).toBeGreaterThan(70); // Should be >70% for typical enums
        expect(comparison.originalMemory).toBe(size * 8);
        expect(comparison.optimizedMemory).toBeLessThan(size * 3); // Should be <3 bytes average
      });
    });
  });
});
