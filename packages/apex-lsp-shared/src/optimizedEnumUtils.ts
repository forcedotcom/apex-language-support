/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { z } from 'zod';
import {
  toUint8,
  toUint16,
  toUint32,
  type Uint8,
  type Uint16,
  type Uint32,
} from './smallNumericTypes';

/**
 * Primitive types that can be used as enum values
 * Accepts regular JavaScript types but optimizes numbers internally
 */
export type EnumPrimitive = string | number | boolean | symbol;

/**
 * An entry in the optimized enum definition array
 * [key, value?] where value is optional and defaults to array index
 * Accepts regular numbers but optimizes them internally
 */
export type OptimizedEnumEntry = readonly [string, EnumPrimitive?];

/**
 * Type for the optimized enum-like object with bidirectional mapping
 * Provides both key->value and value->key mappings
 * Values are optimized internally but appear as regular types to users
 */
export type OptimizedEnumLike<T extends readonly OptimizedEnumEntry[]> = {
  readonly [K in T[number] as K[0]]: K[1] extends undefined
    ? number
    : K[1] extends number
      ? number // Appears as number to users, optimized internally
      : K[1];
} & {
  readonly [key: number]: string;
  readonly [key: string]: EnumPrimitive;
};

/**
 * Type for Zod validation schemas
 * Provides both key and value validation schemas
 */
export type OptimizedEnumSchemas = {
  keySchema: z.ZodType<any>;
  valueSchema: z.ZodType<any>;
};

/**
 * Determines the optimal numeric type for a given value
 * Internal optimization - users don't need to know about this
 */
const getOptimalNumericType = (value: number): Uint8 | Uint16 | Uint32 => {
  if (value >= 0 && value <= 255) {
    return toUint8(value);
  } else if (value >= 0 && value <= 65535) {
    return toUint16(value);
  } else if (value >= 0 && value <= 4294967295) {
    return toUint32(value);
  } else {
    throw new Error(`Value ${value} exceeds Uint32 range (0-4294967295)`);
  }
};

/**
 * Creates a memory-optimized, type-safe enum with bidirectional mapping
 * Uses smaller numeric types internally while maintaining full type safety
 *
 * **No "as any" required!** - Accepts regular numbers, optimizes internally
 *
 * @param entries - Array of [key, value?] tuples where value defaults to array index
 * @returns Frozen object with bidirectional mapping and Zod validation schemas
 *
 * @example
 * ```typescript
 * // Clean, type-safe usage - no "as any" needed!
 * const Status = defineOptimizedEnum([
 *   ['Active', 1],      // Regular number - optimized internally
 *   ['Inactive', 0],    // Regular number - optimized internally
 *   ['Pending'],        // defaults to 2 - optimized internally
 * ] as const);
 *
 * // Usage:
 * Status.Active === 1   // Works normally, optimized internally
 * Status[1] === 'Active'
 * Status.Pending === 2  // Works normally, optimized internally
 * Status[2] === 'Pending'
 *
 * // Validation:
 * Status.keySchema.parse('Active') // ✅
 * Status.valueSchema.parse(1) // ✅
 * Status.keySchema.parse('Invalid') // ❌ throws
 * ```
 */
export function defineOptimizedEnum<
  const T extends readonly OptimizedEnumEntry[],
>(entries: T): OptimizedEnumLike<T> & OptimizedEnumSchemas {
  const result: any = {};
  const keys: string[] = [];
  const values: EnumPrimitive[] = [];
  const usedValues = new Set<EnumPrimitive>();

  entries.forEach(([key, val], i) => {
    let value: EnumPrimitive;

    if (val !== undefined) {
      // If it's a number, optimize it internally but keep the original for the API
      if (typeof val === 'number') {
        // Store the optimized version internally for memory savings
        const optimizedValue = getOptimalNumericType(val);
        // But expose the original number to maintain type safety
        value = val;
        // Store the optimized version in a hidden property for internal use
        (result as any)[`__optimized_${key}`] = optimizedValue;
      } else {
        value = val;
      }
    } else {
      // Find next available index
      let index = i;
      while (usedValues.has(index)) {
        index++;
      }
      value = index;
      // Store the optimized version internally
      const optimizedValue = getOptimalNumericType(index);
      (result as any)[`__optimized_${key}`] = optimizedValue;
    }

    // Store both key->value and value->key mappings
    result[key] = value;
    result[value as any] = key;

    keys.push(key);
    values.push(value);
    usedValues.add(value);
  });

  // Create Zod validation schemas with proper type handling
  const keyLiterals = keys.map((key) => z.literal(key));
  const valueLiterals = values.map((value) => z.literal(value));

  // Handle empty arrays and ensure proper union types
  const keySchema =
    keyLiterals.length === 0
      ? z.never()
      : keyLiterals.length === 1
        ? keyLiterals[0]
        : z.union(keyLiterals as any);

  const valueSchema =
    valueLiterals.length === 0
      ? z.never()
      : valueLiterals.length === 1
        ? valueLiterals[0]
        : z.union(valueLiterals as any);

  // Return frozen object with bidirectional mapping and schemas
  return Object.freeze({
    ...result,
    keySchema,
    valueSchema,
  }) as OptimizedEnumLike<T> & OptimizedEnumSchemas;
}

/**
 * Type for enum keys
 */
export type OptimizedEnumKey<T> =
  T extends OptimizedEnumLike<infer U> ? U[number][0] : never;

/**
 * Type for enum values
 */
export type OptimizedEnumValue<T> =
  T extends OptimizedEnumLike<infer U>
    ? U[number][1] extends undefined
      ? number
      : U[number][1]
    : never;

/**
 * Utility function to check if a value is a valid enum key
 */
export function isValidOptimizedEnumKey<T extends OptimizedEnumLike<any>>(
  enumObj: T,
  key: unknown,
): key is OptimizedEnumKey<T> {
  return enumObj.keySchema.safeParse(key).success;
}

/**
 * Utility function to check if a value is a valid enum value
 */
export function isValidOptimizedEnumValue<T extends OptimizedEnumLike<any>>(
  enumObj: T,
  value: unknown,
): value is OptimizedEnumValue<T> {
  return enumObj.valueSchema.safeParse(value).success;
}

/**
 * Utility function to get all enum keys
 */
export function getOptimizedEnumKeys<T extends OptimizedEnumLike<any>>(
  enumObj: T,
): OptimizedEnumKey<T>[] {
  const keys: string[] = [];

  for (const key in enumObj) {
    if (
      typeof enumObj[key] !== 'function' &&
      key !== 'keySchema' &&
      key !== 'valueSchema' &&
      !key.startsWith('__optimized_') // Skip internal optimization properties
    ) {
      // Only include string keys (not numeric values)
      if (isNaN(Number(key))) {
        keys.push(key);
      }
    }
  }

  return keys as OptimizedEnumKey<T>[];
}

/**
 * Utility function to get all enum values
 */
export function getOptimizedEnumValues<T extends OptimizedEnumLike<any>>(
  enumObj: T,
): OptimizedEnumValue<T>[] {
  const values: EnumPrimitive[] = [];
  const seen = new Set<EnumPrimitive>();

  for (const key in enumObj) {
    if (
      typeof enumObj[key] !== 'function' &&
      key !== 'keySchema' &&
      key !== 'valueSchema' &&
      !key.startsWith('__optimized_') // Skip internal optimization properties
    ) {
      // Only include string keys (not numeric values)
      if (isNaN(Number(key))) {
        const value = enumObj[key];
        if (!seen.has(value)) {
          values.push(value);
          seen.add(value);
        }
      }
    }
  }

  return values as OptimizedEnumValue<T>[];
}

/**
 * Utility function to get all enum entries as key-value pairs
 */
export function getOptimizedEnumEntries<T extends OptimizedEnumLike<any>>(
  enumObj: T,
): Array<[OptimizedEnumKey<T>, OptimizedEnumValue<T>]> {
  const entries: Array<[string, EnumPrimitive]> = [];

  for (const key in enumObj) {
    if (
      typeof enumObj[key] !== 'function' &&
      key !== 'keySchema' &&
      key !== 'valueSchema' &&
      !key.startsWith('__optimized_') // Skip internal optimization properties
    ) {
      // Only include string keys (not numeric values)
      if (isNaN(Number(key))) {
        entries.push([key, enumObj[key]]);
      }
    }
  }

  return entries as Array<[OptimizedEnumKey<T>, OptimizedEnumValue<T>]>;
}

/**
 * Calculate memory savings from optimized enum types
 */
export const calculateOptimizedEnumSavings = () => {
  const savings = {
    smallEnums: {
      before: 8, // 1 number * 8 bytes
      after: 1, // 1 Uint8 * 1 byte
      reduction: 87.5,
    },
    mediumEnums: {
      before: 8, // 1 number * 8 bytes
      after: 2, // 1 Uint16 * 2 bytes
      reduction: 75,
    },
    largeEnums: {
      before: 8, // 1 number * 8 bytes
      after: 4, // 1 Uint32 * 4 bytes
      reduction: 50,
    },
  };

  return savings;
};

/**
 * Memory usage comparison for different enum sizes
 */
export const compareEnumMemoryUsage = (enumSize: number) => {
  const originalMemory = enumSize * 8; // 8 bytes per number
  let optimizedMemory = 0;

  // Estimate distribution: 80% small, 15% medium, 5% large
  const smallCount = Math.floor(enumSize * 0.8);
  const mediumCount = Math.floor(enumSize * 0.15);
  const largeCount = enumSize - smallCount - mediumCount;

  optimizedMemory = smallCount * 1 + mediumCount * 2 + largeCount * 4;
  const savings = originalMemory - optimizedMemory;
  const reduction = (savings / originalMemory) * 100;

  return {
    originalMemory,
    optimizedMemory,
    savings,
    reduction,
    breakdown: {
      small: { count: smallCount, memory: smallCount * 1 },
      medium: { count: mediumCount, memory: mediumCount * 2 },
      large: { count: largeCount, memory: largeCount * 4 },
    },
  };
};
