/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { z } from 'zod';

/**
 * Primitive types that can be used as enum values
 */
export type EnumPrimitive = string | number | boolean | symbol;

/**
 * An entry in the enum definition array
 * [key, value?] where value is optional and defaults to array index
 */
export type EnumEntry = readonly [string, EnumPrimitive?];

/**
 * Type for the enum-like object with bidirectional mapping
 * Provides both key->value and value->key mappings
 */
export type EnumLike<T extends readonly EnumEntry[]> = {
  readonly [K in T[number] as K[0]]: K[1] extends undefined ? number : K[1];
} & {
  readonly [key: number]: string;
  readonly [key: string]: number | string;
};

/**
 * Type for Zod validation schemas
 * Provides both key and value validation schemas
 */
export type EnumSchemas = {
  keySchema: z.ZodType<any>;
  valueSchema: z.ZodType<any>;
};

/**
 * Creates a memory-efficient, type-safe enum with bidirectional mapping
 *
 * @param entries - Array of [key, value?] tuples where value defaults to array index
 * @returns Frozen object with bidirectional mapping and Zod validation schemas
 *
 * @example
 * ```typescript
 * const Status = defineEnum([
 *   ['Active', 1],
 *   ['Inactive', 0],
 *   ['Pending'], // defaults to 2
 * ] as const);
 *
 * // Usage:
 * Status.Active === 1
 * Status[1] === 'Active'
 * Status.Pending === 2
 * Status[2] === 'Pending'
 *
 * // Validation:
 * Status.keySchema.parse('Active') // ✅
 * Status.valueSchema.parse(1) // ✅
 * Status.keySchema.parse('Invalid') // ❌ throws
 * ```
 */
export function defineEnum<const T extends readonly EnumEntry[]>(
  entries: T,
): EnumLike<T> & EnumSchemas {
  const result: any = {};
  const keys: string[] = [];
  const values: EnumPrimitive[] = [];
  const usedValues = new Set<EnumPrimitive>();

  entries.forEach(([key, val], i) => {
    let value: EnumPrimitive;

    if (val !== undefined) {
      value = val;
    } else {
      // Find next available index
      let index = i;
      while (usedValues.has(index)) {
        index++;
      }
      value = index;
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
  }) as EnumLike<T> & EnumSchemas;
}

/**
 * Utility type to extract the key type from an enum
 */
export type EnumKey<T> = T extends EnumLike<infer U> ? U[number][0] : never;

/**
 * Utility type to extract the value type from an enum
 */
export type EnumValue<T> =
  T extends EnumLike<infer U>
    ? U[number][1] extends undefined
      ? number
      : U[number][1]
    : never;

/**
 * Utility function to check if a value is a valid enum key
 */
export function isValidEnumKey<T extends EnumLike<any>>(
  enumObj: T,
  key: unknown,
): key is EnumKey<T> {
  return enumObj.keySchema.safeParse(key).success;
}

/**
 * Utility function to check if a value is a valid enum value
 */
export function isValidEnumValue<T extends EnumLike<any>>(
  enumObj: T,
  value: unknown,
): value is EnumValue<T> {
  return enumObj.valueSchema.safeParse(value).success;
}

/**
 * Utility function to get all enum keys
 */
export function getEnumKeys<T extends EnumLike<any>>(enumObj: T): EnumKey<T>[] {
  const keys: string[] = [];
  for (const key in enumObj) {
    if (
      typeof enumObj[key] !== 'function' &&
      key !== 'keySchema' &&
      key !== 'valueSchema'
    ) {
      // Only include string keys (not numeric values)
      if (isNaN(Number(key))) {
        keys.push(key);
      }
    }
  }
  return keys as EnumKey<T>[];
}

/**
 * Utility function to get all enum values
 */
export function getEnumValues<T extends EnumLike<any>>(
  enumObj: T,
): EnumValue<T>[] {
  const values: EnumPrimitive[] = [];
  const seen = new Set<EnumPrimitive>();

  for (const key in enumObj) {
    if (
      typeof enumObj[key] !== 'function' &&
      key !== 'keySchema' &&
      key !== 'valueSchema'
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
  return values as EnumValue<T>[];
}

/**
 * Utility function to get enum entries as [key, value] pairs
 */
export function getEnumEntries<T extends EnumLike<any>>(
  enumObj: T,
): Array<[EnumKey<T>, EnumValue<T>]> {
  return getEnumKeys(enumObj).map((key) => [key, enumObj[key] as EnumValue<T>]);
}
