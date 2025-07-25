/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  toUint8,
  toUint16,
  toUint24,
  toUint32,
  toCompactTimestamp,
  fromCompactTimestamp,
  toCompactLocation,
  fromCompactLocation,
  packEnums,
  unpackEnums,
  calculateNumericTypeSavings,
  toUltraCompactSymbol,
  fromUltraCompactSymbol,
  CompactLocationSchema,
  UltraCompactSymbolSchema,
} from '../src/smallNumericTypes';

describe('Small Numeric Types - Phase 5 Memory Optimization', () => {
  describe('Type Validation Functions', () => {
    describe('Uint8 (0-255)', () => {
      it('should accept valid Uint8 values', () => {
        expect(toUint8(0)).toBe(0);
        expect(toUint8(255)).toBe(255);
        expect(toUint8(128)).toBe(128);
      });

      it('should reject values outside Uint8 range', () => {
        expect(() => toUint8(-1)).toThrow('Value -1 is not a valid Uint8');
        expect(() => toUint8(256)).toThrow('Value 256 is not a valid Uint8');
        expect(() => toUint8(3.14)).toThrow('Value 3.14 is not a valid Uint8');
      });
    });

    describe('Uint16 (0-65535)', () => {
      it('should accept valid Uint16 values', () => {
        expect(toUint16(0)).toBe(0);
        expect(toUint16(65535)).toBe(65535);
        expect(toUint16(32768)).toBe(32768);
      });

      it('should reject values outside Uint16 range', () => {
        expect(() => toUint16(-1)).toThrow('Value -1 is not a valid Uint16');
        expect(() => toUint16(65536)).toThrow(
          'Value 65536 is not a valid Uint16',
        );
        expect(() => toUint16(3.14)).toThrow(
          'Value 3.14 is not a valid Uint16',
        );
      });
    });

    describe('Uint24 (0-16777215)', () => {
      it('should accept valid Uint24 values', () => {
        expect(toUint24(0)).toBe(0);
        expect(toUint24(16777215)).toBe(16777215);
        expect(toUint24(8388608)).toBe(8388608);
      });

      it('should reject values outside Uint24 range', () => {
        expect(() => toUint24(-1)).toThrow('Value -1 is not a valid Uint24');
        expect(() => toUint24(16777216)).toThrow(
          'Value 16777216 is not a valid Uint24',
        );
        expect(() => toUint24(3.14)).toThrow(
          'Value 3.14 is not a valid Uint24',
        );
      });
    });

    describe('Uint32 (0-4294967295)', () => {
      it('should accept valid Uint32 values', () => {
        expect(toUint32(0)).toBe(0);
        expect(toUint32(4294967295)).toBe(4294967295);
        expect(toUint32(2147483648)).toBe(2147483648);
      });

      it('should reject values outside Uint32 range', () => {
        expect(() => toUint32(-1)).toThrow('Value -1 is not a valid Uint32');
        expect(() => toUint32(4294967296)).toThrow(
          'Value 4294967296 is not a valid Uint32',
        );
        expect(() => toUint32(3.14)).toThrow(
          'Value 3.14 is not a valid Uint32',
        );
      });
    });
  });

  describe('Compact Timestamp Functions', () => {
    it('should convert timestamp to compact format', () => {
      const timestamp = 1704067200000; // 2024-01-01 00:00:00 UTC
      const compact = toCompactTimestamp(timestamp);
      expect(compact).toBe(1704067200); // seconds since epoch
    });

    it('should convert compact timestamp back to milliseconds', () => {
      const compact = 1704067200; // seconds since epoch
      const timestamp = fromCompactTimestamp(compact);
      expect(timestamp).toBe(1704067200000); // milliseconds
    });

    it('should handle edge cases', () => {
      expect(toCompactTimestamp(0)).toBe(0);
      expect(fromCompactTimestamp(0)).toBe(0);
    });

    it('should reject invalid timestamps', () => {
      expect(() => toCompactTimestamp(-1)).toThrow(
        'Timestamp -1 cannot be converted',
      );
      expect(() => toCompactTimestamp(4294967296000)).toThrow(
        'Timestamp 4294967296000 cannot be converted',
      );
    });
  });

  describe('Compact Location Functions', () => {
    it('should convert location to compact format', () => {
      const location = {
        startLine: 10,
        startColumn: 5,
        endLine: 15,
        endColumn: 20,
      };

      const compact = toCompactLocation(location);
      expect(compact.start).toBe((10 << 16) | 5); // 655365
      expect(compact.end).toBe((15 << 16) | 20); // 983060
    });

    it('should convert compact location back to standard format', () => {
      const compact = {
        start: (10 << 16) | 5, // 655365
        end: (15 << 16) | 20, // 983060
      };

      const location = fromCompactLocation(compact);
      expect(location).toEqual({
        startLine: 10,
        startColumn: 5,
        endLine: 15,
        endColumn: 20,
      });
    });

    it('should handle large line numbers', () => {
      const location = {
        startLine: 65535,
        startColumn: 65535,
        endLine: 65535,
        endColumn: 65535,
      };

      const compact = toCompactLocation(location);
      const restored = fromCompactLocation(compact);
      expect(restored).toEqual(location);
    });

    it('should handle maximum safe line numbers', () => {
      const location = {
        startLine: 65535,
        startColumn: 65535,
        endLine: 65535,
        endColumn: 65535,
      };

      const compact = toCompactLocation(location);
      const restored = fromCompactLocation(compact);
      expect(restored).toEqual(location);
    });

    it('should reject line numbers exceeding Uint16 range', () => {
      const location = {
        startLine: 65536,
        startColumn: 5,
        endLine: 15,
        endColumn: 20,
      };

      expect(() => toCompactLocation(location)).toThrow(
        'Line numbers exceed Uint16 range',
      );
    });

    it('should reject column numbers exceeding Uint16 range', () => {
      const location = {
        startLine: 10,
        startColumn: 65536,
        endLine: 15,
        endColumn: 20,
      };

      expect(() => toCompactLocation(location)).toThrow(
        'Column numbers exceed Uint16 range',
      );
    });
  });

  describe('Enum Packing Functions', () => {
    it('should pack enum values correctly', () => {
      const values = {
        kind: 3, // Method (4 bits)
        visibility: 1, // Public (2 bits)
        isStatic: 1, // Yes (1 bit)
        isFinal: 0, // No (1 bit)
      };

      const packed = packEnums(values);
      // Expected: (3 << 4) | (1 << 2) | (1 << 1) | 0 = 48 | 4 | 2 | 0 = 54
      expect(packed).toBe(54);
    });

    it('should unpack enum values correctly', () => {
      const packed = 54; // (3 << 4) | (1 << 2) | (1 << 1) | 0
      const unpacked = unpackEnums(packed);

      expect(unpacked).toEqual({
        kind: 3, // Method
        visibility: 1, // Public
        isStatic: 1, // Yes
        isFinal: 0, // No
      });
    });

    it('should handle all enum combinations', () => {
      const testCases = [
        { kind: 0, visibility: 0, isStatic: 0, isFinal: 0 },
        { kind: 10, visibility: 3, isStatic: 1, isFinal: 1 },
        { kind: 5, visibility: 2, isStatic: 0, isFinal: 1 },
      ];

      testCases.forEach((testCase) => {
        const packed = packEnums(testCase);
        const unpacked = unpackEnums(packed);
        expect(unpacked).toEqual(testCase);
      });
    });

    it('should reject enum values exceeding bit limits', () => {
      expect(() =>
        packEnums({ kind: 16, visibility: 0, isStatic: 0, isFinal: 0 }),
      ).toThrow('Kind value 16 exceeds 4-bit range (0-15)');
      expect(() =>
        packEnums({ kind: 0, visibility: 4, isStatic: 0, isFinal: 0 }),
      ).toThrow('Visibility value 4 exceeds 2-bit range (0-3)');
    });
  });

  describe('Memory Savings Calculator', () => {
    it('should calculate correct memory savings', () => {
      const savings = calculateNumericTypeSavings();

      expect(savings.location.before).toBe(32);
      expect(savings.location.after).toBe(8);
      expect(savings.location.reduction).toBe(75);

      expect(savings.referenceCount.before).toBe(8);
      expect(savings.referenceCount.after).toBe(2);
      expect(savings.referenceCount.reduction).toBe(75);

      expect(savings.nodeId.before).toBe(8);
      expect(savings.nodeId.after).toBe(4);
      expect(savings.nodeId.reduction).toBe(50);

      expect(savings.timestamp.before).toBe(8);
      expect(savings.timestamp.after).toBe(4);
      expect(savings.timestamp.reduction).toBe(50);

      expect(savings.enumData.before).toBe(24);
      expect(savings.enumData.after).toBe(1);
      expect(savings.enumData.reduction).toBe(96);

      expect(savings.total.before).toBe(80);
      expect(savings.total.after).toBe(19);
      expect(savings.total.reduction).toBe(76.25);
    });
  });

  describe('UltraCompactSymbol Conversion', () => {
    it('should convert LightweightSymbol to UltraCompactSymbol', () => {
      const lightweight = {
        id: 'test-symbol',
        name: 'TestMethod',
        kind: 3, // Method
        location: {
          startLine: 10,
          startColumn: 5,
          endLine: 15,
          endColumn: 20,
        },
        modifiers: 0x0101, // Public + Static
        parentId: 'parent-symbol',
        filePath: 'TestClass.cls',
        fqn: 'TestClass.TestMethod',
        namespace: 'test',
        _lazy: {},
      };

      const ultra = toUltraCompactSymbol(lightweight);

      expect(ultra.id).toBe('test-symbol');
      expect(ultra.name).toBe('TestMethod');
      expect(ultra.filePath).toBe('TestClass.cls');
      expect(ultra.parentId).toBe('parent-symbol');
      expect(ultra.fqn).toBe('TestClass.TestMethod');
      expect(ultra.namespace).toBe('test');
      expect(ultra.location.start).toBe((10 << 16) | 5);
      expect(ultra.location.end).toBe((15 << 16) | 20);
      expect(ultra.referenceCount).toBe(0);
      expect(ultra.nodeId).toBe(1);
      expect(ultra.lastUpdated).toBeGreaterThan(0);
      expect(ultra._lazy).toEqual({});
    });

    it('should convert UltraCompactSymbol back to LightweightSymbol', () => {
      const ultra = {
        id: 'test-symbol',
        name: 'TestMethod',
        filePath: 'TestClass.cls',
        parentId: 'parent-symbol',
        fqn: 'TestClass.TestMethod',
        namespace: 'test',
        location: {
          start: (10 << 16) | 5,
          end: (15 << 16) | 20,
        },
        enumData: 54, // (3 << 4) | (1 << 2) | (1 << 1) | 0
        referenceCount: 0,
        nodeId: 1,
        lastUpdated: 1704067200,
        _lazy: {},
      };

      const lightweight = fromUltraCompactSymbol(ultra);

      expect(lightweight.id).toBe('test-symbol');
      expect(lightweight.name).toBe('TestMethod');
      expect(lightweight.kind).toBe(3); // Method
      expect(lightweight.location).toEqual({
        startLine: 10,
        startColumn: 5,
        endLine: 15,
        endColumn: 20,
      });
      expect(lightweight.modifiers).toBe(0x0101); // Public + Static
      expect(lightweight.parentId).toBe('parent-symbol');
      expect(lightweight.filePath).toBe('TestClass.cls');
      expect(lightweight.fqn).toBe('TestClass.TestMethod');
      expect(lightweight.namespace).toBe('test');
      expect(lightweight._lazy).toEqual({});
    });

    it('should maintain data integrity through conversion cycle', () => {
      const original = {
        id: 'test-symbol',
        name: 'TestMethod',
        kind: 3,
        location: {
          startLine: 10,
          startColumn: 5,
          endLine: 15,
          endColumn: 20,
        },
        modifiers: 0x0101,
        parentId: 'parent-symbol',
        filePath: 'TestClass.cls',
        fqn: 'TestClass.TestMethod',
        namespace: 'test',
        _lazy: {},
      };

      const ultra = toUltraCompactSymbol(original);
      const restored = fromUltraCompactSymbol(ultra);

      expect(restored).toEqual(original);
    });
  });

  describe('Schema Validation', () => {
    it('should validate CompactLocation schema', () => {
      const validLocation = {
        start: (10 << 16) | 5,
        end: (15 << 16) | 20,
      };

      const result = CompactLocationSchema.safeParse(validLocation);
      expect(result.success).toBe(true);
    });

    it('should validate UltraCompactSymbol schema', () => {
      const validSymbol = {
        id: 'test-symbol',
        name: 'TestMethod',
        filePath: 'TestClass.cls',
        parentId: null,
        fqn: 'TestClass.TestMethod',
        namespace: 'test',
        location: {
          start: (10 << 16) | 5,
          end: (15 << 16) | 20,
        },
        enumData: 54,
        referenceCount: 0,
        nodeId: 1,
        lastUpdated: 1704067200,
        _lazy: {},
      };

      const result = UltraCompactSymbolSchema.safeParse(validSymbol);
      expect(result.success).toBe(true);
    });

    it('should reject invalid schemas', () => {
      const invalidLocation = {
        start: -1, // Invalid: negative
        end: 4294967296, // Invalid: too large
      };

      const result = CompactLocationSchema.safeParse(invalidLocation);
      expect(result.success).toBe(false);
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should handle typical Apex symbol data', () => {
      const typicalSymbol = {
        id: 'AccountController.getAccounts',
        name: 'getAccounts',
        kind: 3, // Method
        location: {
          startLine: 25,
          startColumn: 10,
          endLine: 35,
          endColumn: 15,
        },
        modifiers: 0x0101, // Public + Static
        parentId: 'AccountController',
        filePath: 'force-app/main/default/classes/AccountController.cls',
        fqn: 'AccountController.getAccounts',
        namespace: 'default',
        _lazy: {},
      };

      const ultra = toUltraCompactSymbol(typicalSymbol);
      const restored = fromUltraCompactSymbol(ultra);

      expect(restored).toEqual(typicalSymbol);
    });

    it('should demonstrate memory savings for large datasets', () => {
      const savings = calculateNumericTypeSavings();
      const symbolsCount = 100000; // 100K symbols

      const originalMemory = symbolsCount * savings.total.before;
      const optimizedMemory = symbolsCount * savings.total.after;
      const memorySaved = originalMemory - optimizedMemory;

      console.log(`Memory usage for ${symbolsCount.toLocaleString()} symbols:`);
      console.log(`Original: ${(originalMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(
        `Optimized: ${(optimizedMemory / 1024 / 1024).toFixed(2)} MB`,
      );
      console.log(
        `Saved: ${(memorySaved / 1024 / 1024).toFixed(2)} MB (${savings.total.reduction.toFixed(1)}%)`,
      );

      expect(optimizedMemory).toBeLessThan(originalMemory);
      expect(memorySaved).toBeGreaterThan(0);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle large numbers of conversions efficiently', () => {
      const iterations = 10000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        const location = {
          startLine: i % 65535,
          startColumn: i % 1000,
          endLine: (i + 1) % 65535,
          endColumn: (i % 1000) + 1,
        };

        const compact = toCompactLocation(location);
        const restored = fromCompactLocation(compact);

        expect(restored).toEqual(location);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete 10K conversions in under 300ms (more realistic for validation-heavy operations)
      expect(duration).toBeLessThan(300);
    });
  });
});
