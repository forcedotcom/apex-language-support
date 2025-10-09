/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { normalizeError, formattedError } from '../../src/utils/ErrorUtils';

describe('normalizeError', () => {
  describe('when error is already an Error instance', () => {
    it('should return the error as-is', () => {
      const originalError = new Error('Original error message');
      const result = normalizeError(originalError);

      expect(result).toBe(originalError);
      expect(result.message).toBe('Original error message');
      expect(result).toBeInstanceOf(Error);
    });

    it('should preserve custom properties on Error instances', () => {
      const originalError = new Error('Custom error');
      (originalError as any).code = 500;
      (originalError as any).status = 'Internal Server Error';

      const result = normalizeError(originalError);

      expect(result).toBe(originalError);
      expect((result as any).code).toBe(500);
      expect((result as any).status).toBe('Internal Server Error');
    });
  });

  describe('when error is a string', () => {
    it('should create new Error with string message', () => {
      const errorString = 'Something went wrong';
      const result = normalizeError(errorString);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe(errorString);
    });

    it('should handle empty string', () => {
      const result = normalizeError('');

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('');
    });
  });

  describe('when error is an object with message property', () => {
    it('should extract message and create new Error', () => {
      const errorObj = { message: 'API failed', code: 404 };
      const result = normalizeError(errorObj);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('API failed');
    });

    it('should preserve stack trace if available', () => {
      const stackTrace =
        'Error: Test\n    at test.js:1:1\n    at Object.<anonymous> (test.js:2:1)';
      const errorObj = {
        message: 'Test error',
        stack: stackTrace,
        code: 500,
      };
      const result = normalizeError(errorObj);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Test error');
      expect(result.stack).toBe(stackTrace);
    });

    it('should preserve other properties', () => {
      const errorObj = {
        message: 'Validation failed',
        code: 400,
        field: 'email',
        timestamp: Date.now(),
      };
      const result = normalizeError(errorObj);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Validation failed');
      expect((result as any).code).toBe(400);
      expect((result as any).field).toBe('email');
      expect((result as any).timestamp).toBe(errorObj.timestamp);
    });

    it('should handle non-string message values', () => {
      const errorObj = { message: 123, code: 500 };
      const result = normalizeError(errorObj);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('123');
    });

    it('should handle null/undefined message', () => {
      const errorObj = { message: null, code: 500 };
      const result = normalizeError(errorObj);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('null');
    });
  });

  describe('when error is an object with toString method', () => {
    it('should use toString result as message', () => {
      const errorObj = {
        toString: () => 'Custom error string',
        code: 500,
      };
      const result = normalizeError(errorObj);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Custom error string');
    });

    it('should handle toString returning non-string', () => {
      const errorObj = {
        toString: () => 123,
        code: 500,
      };
      const result = normalizeError(errorObj);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('123');
    });
  });

  describe('when error is other types', () => {
    it('should handle numbers', () => {
      const result = normalizeError(42);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('42');
    });

    it('should handle booleans', () => {
      const result = normalizeError(true);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('true');
    });

    it('should handle null', () => {
      const result = normalizeError(null);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('null');
    });

    it('should handle undefined', () => {
      const result = normalizeError(undefined);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('undefined');
    });

    it('should handle arrays', () => {
      const result = normalizeError([1, 2, 3]);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('1,2,3');
    });

    it('should handle plain objects without message', () => {
      const result = normalizeError({ code: 500, status: 'error' });

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('[object Object]');
    });

    it('should handle functions', () => {
      const testFunction = () => 'test';
      const result = normalizeError(testFunction);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe(testFunction.toString());
    });
  });

  describe('edge cases', () => {
    it('should handle circular references in objects', () => {
      const circularObj: any = { message: 'Circular error' };
      circularObj.self = circularObj;

      const result = normalizeError(circularObj);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Circular error');
    });

    it('should handle objects with non-enumerable properties', () => {
      const errorObj = { message: 'Test error' };
      Object.defineProperty(errorObj, 'hidden', {
        value: 'secret',
        enumerable: false,
      });

      const result = normalizeError(errorObj);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Test error');
      expect((result as any).hidden).toBeUndefined();
    });

    it('should handle objects with symbol keys', () => {
      const symbolKey = Symbol('test');
      const errorObj = {
        message: 'Symbol error',
        [symbolKey]: 'symbol value',
      };

      const result = normalizeError(errorObj);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Symbol error');
      expect((result as any)[symbolKey]).toBe('symbol value');
    });
  });

  describe('type safety', () => {
    it('should always return Error instance regardless of input type', () => {
      const testCases: unknown[] = [
        new Error('test'),
        'string error',
        { message: 'object error' },
        { toString: () => 'toString error' },
        42,
        true,
        null,
        undefined,
        [1, 2, 3],
        () => 'function error',
      ];

      testCases.forEach((testCase) => {
        const result = normalizeError(testCase);
        expect(result).toBeInstanceOf(Error);
        expect(typeof result.message).toBe('string');
      });
    });
  });
});

describe('formattedError', () => {
  describe('with Error instances', () => {
    let testError: Error;

    beforeEach(() => {
      testError = new Error('Test error message');
      (testError as any).code = 500;
      (testError as any).status = 'Internal Server Error';
      (testError as any).userId = 'user123';
    });

    it('should format error with default options', () => {
      const result = formattedError(testError);

      expect(result).toContain('Error: Test error message');
      expect(result).toContain('Properties: {');
      expect(result).toContain('code: 500');
      expect(result).toContain('status: "Internal Server Error"');
      expect(result).toContain('userId: "user123"');
      expect(result).toContain('Stack:');
    });

    it('should format error with context', () => {
      const result = formattedError(testError, {
        context: 'API_CALL',
      });

      expect(result).toContain('[API_CALL]');
      expect(result).toContain('Error: Test error message');
    });

    it('should format error without properties', () => {
      const result = formattedError(testError, {
        includeProperties: false,
      });

      expect(result).toContain('Error: Test error message');
      expect(result).not.toContain('Properties:');
    });

    it('should format error without stack', () => {
      const result = formattedError(testError, {
        includeStack: false,
      });

      expect(result).toContain('Error: Test error message');
      expect(result).not.toContain('Stack:');
    });

    it('should include custom error name', () => {
      const customError = new Error('Custom error');
      customError.name = 'ValidationError';

      const result = formattedError(customError);

      expect(result).toContain('Type: ValidationError');
    });

    it('should not include default Error name', () => {
      const result = formattedError(testError);

      expect(result).not.toContain('Type: Error');
    });

    it('should limit stack trace lines', () => {
      const result = formattedError(testError, {
        maxStackLines: 2,
      });

      const stackSection = result.split('Stack:\n')[1];
      const stackLines = stackSection.split('\n');

      expect(stackLines.length).toBeLessThanOrEqual(3); // 2 lines + error message line
    });
  });

  describe('with non-Error inputs (auto-normalization)', () => {
    it('should format string errors', () => {
      const result = formattedError('Something went wrong');

      expect(result).toContain('Error: Something went wrong');
      expect(result).toContain('Stack:');
    });

    it('should format object errors with message', () => {
      const result = formattedError({
        message: 'API failed',
        code: 404,
      });

      expect(result).toContain('Error: API failed');
      expect(result).toContain('Properties: {');
      expect(result).toContain('code: 404');
    });

    it('should format object errors with toString', () => {
      const result = formattedError({
        toString: () => 'Custom error',
        code: 500,
      });

      expect(result).toContain('Error: Custom error');
      expect(result).toContain('Stack:');
      // Note: Objects with toString don't preserve other properties when normalized
    });

    it('should format primitive errors', () => {
      const result = formattedError(42);

      expect(result).toContain('Error: 42');
      expect(result).toContain('Stack:');
    });

    it('should format null/undefined errors', () => {
      const nullResult = formattedError(null);
      const undefinedResult = formattedError(undefined);

      expect(nullResult).toContain('Error: null');
      expect(undefinedResult).toContain('Error: undefined');
    });

    it('should handle circular references in properties', () => {
      const circularError = new Error('Circular error');
      const circularObj: any = { self: null };
      circularObj.self = circularObj;
      (circularError as any).circular = circularObj;

      const result = formattedError(circularError);

      expect(result).toContain('Error: Circular error');
      expect(result).toContain('Properties:');
      expect(result).toContain('circular: [Circular Object]');
    });

    it('should handle undefined and null properties', () => {
      const errorWithNulls = new Error('Null properties');
      (errorWithNulls as any).nullProp = null;
      (errorWithNulls as any).undefinedProp = undefined;

      const result = formattedError(errorWithNulls);

      expect(result).toContain('nullProp: null');
      expect(result).toContain('undefinedProp: undefined');
    });
  });
});
