/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Minimal Node.js assert polyfill for web worker environments
 */

function isPromise(value: any): boolean {
  return (
    value !== null &&
    typeof value === 'object' &&
    typeof value.then === 'function'
  );
}

function assert(value: any, message?: string | Error): asserts value {
  if (!value) {
    throw new Error(message?.toString() || 'Assertion failed');
  }
}

assert.ok = assert;

assert.fail = function fail(message?: string | Error): never {
  throw new Error(message?.toString() || 'Failed');
};

assert.equal = function equal(
  actual: any,
  expected: any,
  message?: string | Error,
): void {
  if (actual != expected) {
    throw new Error(message?.toString() || `${actual} != ${expected}`);
  }
};

assert.notEqual = function notEqual(
  actual: any,
  expected: any,
  message?: string | Error,
): void {
  if (actual == expected) {
    throw new Error(message?.toString() || `${actual} == ${expected}`);
  }
};

assert.strictEqual = function strictEqual(
  actual: any,
  expected: any,
  message?: string | Error,
): void {
  if (actual !== expected) {
    throw new Error(message?.toString() || `${actual} !== ${expected}`);
  }
};

assert.notStrictEqual = function notStrictEqual(
  actual: any,
  expected: any,
  message?: string | Error,
): void {
  if (actual === expected) {
    throw new Error(message?.toString() || `${actual} === ${expected}`);
  }
};

assert.deepEqual = function deepEqual(
  actual: any,
  expected: any,
  message?: string | Error,
): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(message?.toString() || `${actualStr} !== ${expectedStr}`);
  }
};

assert.notDeepEqual = function notDeepEqual(
  actual: any,
  expected: any,
  message?: string | Error,
): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    throw new Error(message?.toString() || `${actualStr} === ${expectedStr}`);
  }
};

assert.throws = function throws(
  fn: () => any,
  error?: RegExp | Function | Error | string,
  message?: string,
): void {
  try {
    fn();
  } catch (err) {
    const e = err as Error;
    if (error instanceof RegExp) {
      if (error.test(e.message)) return;
    } else if (error instanceof Function) {
      if (e instanceof error) return;
    } else if (error instanceof Error) {
      if (e.message === error.message) return;
    } else if (typeof error === 'string') {
      if (e.message === error) return;
    } else {
      return;
    }
    throw new Error(message || `Expected ${error} but got ${e.message}`);
  }
  throw new Error(message || 'Expected function to throw');
};

assert.doesNotThrow = function doesNotThrow(
  fn: () => any,
  message?: string,
): void {
  try {
    fn();
  } catch (err) {
    const e = err as Error;
    throw new Error(
      message || `Expected function not to throw but it threw ${e.message}`,
    );
  }
};

assert.rejects = async function rejects(
  fn: () => Promise<any>,
  error?: RegExp | Function | Error | string,
  message?: string,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    const e = err as Error;
    if (error instanceof RegExp) {
      if (error.test(e.message)) return;
    } else if (error instanceof Function) {
      if (e instanceof error) return;
    } else if (error instanceof Error) {
      if (e.message === error.message) return;
    } else if (typeof error === 'string') {
      if (e.message === error) return;
    } else {
      return;
    }
    throw new Error(message || `Expected ${error} but got ${e.message}`);
  }
  throw new Error(message || 'Expected function to reject');
};

assert.doesNotReject = async function doesNotReject(
  fn: () => Promise<any>,
  message?: string,
): Promise<void> {
  try {
    await fn();
  } catch (err) {
    const e = err as Error;
    throw new Error(
      message ||
        `Expected function not to reject but it rejected with ${e.message}`,
    );
  }
};

assert.match = function match(
  value: string,
  regexp: RegExp,
  message?: string,
): void {
  if (!regexp.test(value)) {
    throw new Error(message || `${value} does not match ${regexp}`);
  }
};

assert.doesNotMatch = function doesNotMatch(
  value: string,
  regexp: RegExp,
  message?: string,
): void {
  if (regexp.test(value)) {
    throw new Error(message || `${value} matches ${regexp}`);
  }
};

assert.ifError = function ifError(value: any): void {
  if (value) throw value;
};

// Add isPromise to the assert namespace
Object.defineProperty(assert, 'isPromise', {
  enumerable: true,
  configurable: true,
  writable: true,
  value: isPromise,
});

export default assert;
