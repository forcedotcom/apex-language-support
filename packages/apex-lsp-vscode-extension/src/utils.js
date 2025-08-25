/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Minimal util functions needed for the extension

// Type checking functions
export function isArray(value) {
  return Array.isArray(value);
}

export function isBoolean(value) {
  return typeof value === 'boolean';
}

export function isBuffer(value) {
  return value?.constructor?.name === 'Buffer' || false;
}

export function isDate(value) {
  return value instanceof Date;
}

export function isError(value) {
  return value instanceof Error;
}

export function isFunction(value) {
  return typeof value === 'function';
}

export function isNull(value) {
  return value === null;
}

export function isNullOrUndefined(value) {
  return value === null || value === undefined;
}

export function isNumber(value) {
  return typeof value === 'number';
}

export function isObject(value) {
  return value !== null && typeof value === 'object';
}

export function isString(value) {
  return typeof value === 'string';
}

export function isSymbol(value) {
  return typeof value === 'symbol';
}

export function isUndefined(value) {
  return value === undefined;
}

// Text encoding/decoding
export function TextEncoder() {
  return new globalThis.TextEncoder();
}

export function TextDecoder() {
  return new globalThis.TextDecoder();
}

// Promise utilities
export function promisify(fn) {
  return function (...args) {
    return new Promise((resolve, reject) => {
      fn.call(this, ...args, (err, ...results) => {
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
export function inspect(obj, options = {}) {
  if (obj === undefined) return 'undefined';
  if (obj === null) return 'null';

  const depth = options.depth ?? 2;
  const seen = new WeakSet();

  function _inspect(value, currentDepth) {
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
export function format(format, ...args) {
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
