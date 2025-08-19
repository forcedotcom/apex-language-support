/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Minimal Node.js util polyfill for web worker environments
 * This provides basic utility functions commonly used in Node.js
 */

// Type checking functions
export function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

export function isBoolean(value: any): value is boolean {
  return typeof value === 'boolean';
}

export function isBuffer(value: any): boolean {
  return value?.constructor?.name === 'Buffer' || false;
}

export function isDate(value: any): value is Date {
  return value instanceof Date;
}

export function isError(value: any): value is Error {
  return value instanceof Error;
}

export function isFunction(value: any): value is Function {
  return typeof value === 'function';
}

export function isNull(value: any): value is null {
  return value === null;
}

export function isNullOrUndefined(value: any): value is null | undefined {
  return value === null || value === undefined;
}

export function isNumber(value: any): value is number {
  return typeof value === 'number';
}

export function isObject(value: any): value is object {
  return value !== null && typeof value === 'object';
}

export function isString(value: any): value is string {
  return typeof value === 'string';
}

export function isSymbol(value: any): value is symbol {
  return typeof value === 'symbol';
}

export function isUndefined(value: any): value is undefined {
  return value === undefined;
}

// Text encoding/decoding
export function TextEncoder(): globalThis.TextEncoder {
  return new globalThis.TextEncoder();
}

export function TextDecoder(): globalThis.TextDecoder {
  return new globalThis.TextDecoder();
}

// Promise utilities
export function promisify<T extends (...args: any[]) => any>(
  fn: T,
): (...args: Parameters<T>) => Promise<any> {
  return function (this: unknown, ...args: Parameters<T>): Promise<any> {
    return new Promise((resolve, reject) => {
      fn.call(this, ...args, (err: any, ...results: any[]) => {
        if (err) {
          reject(err);
        } else {
          resolve(results.length === 1 ? results[0] : results);
        }
      });
    });
  };
}

// Object inspection
export function inspect(
  obj: any,
  options?: { depth?: number; colors?: boolean },
): string {
  if (obj === undefined) return 'undefined';
  if (obj === null) return 'null';

  const depth = options?.depth ?? 2;
  const seen = new WeakSet();

  function _inspect(value: any, currentDepth: number): string {
    if (currentDepth > depth) return '[Object]';

    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'number' || typeof value === 'boolean')
      return String(value);
    if (typeof value === 'function') return '[Function]';
    if (value instanceof Date) return value.toISOString();
    if (value instanceof RegExp) return value.toString();
    if (Array.isArray(value)) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);

      const items = value.map((item) => _inspect(item, currentDepth + 1));
      return `[${items.join(', ')}]`;
    }
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);

      const props = Object.entries(value).map(
        ([key, val]) => `${key}: ${_inspect(val, currentDepth + 1)}`,
      );
      return `{${props.join(', ')}}`;
    }
    return String(value);
  }

  return _inspect(obj, 0);
}

// Format strings
export function format(format: string, ...args: any[]): string {
  let i = 0;
  return format.replace(/%[sdjifoO%]/g, (match) => {
    if (match === '%%') return '%';
    if (i >= args.length) return match;
    const value = args[i++];
    switch (match) {
      case '%s':
        return String(value);
      case '%d':
        return Number(value).toString();
      case '%i':
        return Math.floor(Number(value)).toString();
      case '%f':
        return Number(value).toString();
      case '%j':
        return JSON.stringify(value);
      case '%o':
      case '%O':
        return inspect(value);
      default:
        return match;
    }
  });
}

// Default export for compatibility
const util = {
  isArray,
  isBoolean,
  isBuffer,
  isDate,
  isError,
  isFunction,
  isNull,
  isNullOrUndefined,
  isNumber,
  isObject,
  isString,
  isSymbol,
  isUndefined,
  TextEncoder,
  TextDecoder,
  promisify,
  inspect,
  format,
};

export default util;

// Make util available globally for browser environments
if (typeof globalThis !== 'undefined' && !(globalThis as any).util) {
  // Only set if not already defined to avoid recursion
  (globalThis as any).util = util;
}
