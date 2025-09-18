/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  caseInsensitiveEquals,
  caseInsensitiveCompare,
  caseInsensitiveStartsWith,
  caseInsensitiveEndsWith,
  caseInsensitiveIncludes,
  caseInsensitiveIndexOf,
  caseInsensitiveLastIndexOf,
  caseInsensitiveReplace,
  caseInsensitiveReplaceAll,
  createCaseInsensitiveMatcher,
  createCaseInsensitiveSorter,
  createCaseInsensitiveFilter,
  caseInsensitiveHash,
  createCaseInsensitiveKey,
  caseInsensitiveArrayUtils,
  caseInsensitiveObjectUtils,
} from '../../src/utils/caseInsensitiveStringUtils';

describe('caseInsensitiveStringUtils', () => {
  describe('basic string operations', () => {
    it('should compare strings case-insensitively', () => {
      expect(caseInsensitiveEquals('Hello', 'hello')).toBe(true);
      expect(caseInsensitiveEquals('Hello', 'HELLO')).toBe(true);
      expect(caseInsensitiveEquals('Hello', 'world')).toBe(false);
    });

    it('should compare strings for sorting', () => {
      expect(caseInsensitiveCompare('apple', 'BANANA')).toBeLessThan(0);
      expect(caseInsensitiveCompare('BANANA', 'apple')).toBeGreaterThan(0);
      expect(caseInsensitiveCompare('apple', 'APPLE')).toBe(0);
    });

    it('should check startsWith case-insensitively', () => {
      expect(caseInsensitiveStartsWith('Hello World', 'hello')).toBe(true);
      expect(caseInsensitiveStartsWith('Hello World', 'HELLO')).toBe(true);
      expect(caseInsensitiveStartsWith('Hello World', 'world')).toBe(false);
    });

    it('should check endsWith case-insensitively', () => {
      expect(caseInsensitiveEndsWith('Hello World', 'world')).toBe(true);
      expect(caseInsensitiveEndsWith('Hello World', 'WORLD')).toBe(true);
      expect(caseInsensitiveEndsWith('Hello World', 'hello')).toBe(false);
    });

    it('should check includes case-insensitively', () => {
      expect(caseInsensitiveIncludes('Hello World', 'hello')).toBe(true);
      expect(caseInsensitiveIncludes('Hello World', 'WORLD')).toBe(true);
      expect(caseInsensitiveIncludes('Hello World', 'lo wo')).toBe(true);
      expect(caseInsensitiveIncludes('Hello World', 'xyz')).toBe(false);
    });

    it('should find indexOf case-insensitively', () => {
      expect(caseInsensitiveIndexOf('Hello World', 'world')).toBe(6);
      expect(caseInsensitiveIndexOf('Hello World', 'WORLD')).toBe(6);
      expect(caseInsensitiveIndexOf('Hello World', 'xyz')).toBe(-1);
    });

    it('should find lastIndexOf case-insensitively', () => {
      expect(caseInsensitiveLastIndexOf('Hello World Hello', 'hello')).toBe(12);
      expect(caseInsensitiveLastIndexOf('Hello World Hello', 'HELLO')).toBe(12);
    });

    it('should replace case-insensitively', () => {
      expect(caseInsensitiveReplace('Hello World', 'world', 'Universe')).toBe(
        'Hello Universe',
      );
      expect(caseInsensitiveReplace('Hello World', 'WORLD', 'Universe')).toBe(
        'Hello Universe',
      );
    });

    it('should replace all case-insensitively', () => {
      expect(
        caseInsensitiveReplaceAll('Hello World Hello', 'hello', 'Hi'),
      ).toBe('Hi World Hi');
      expect(
        caseInsensitiveReplaceAll('Hello World Hello', 'HELLO', 'Hi'),
      ).toBe('Hi World Hi');
    });
  });

  describe('factory functions', () => {
    it('should create case-insensitive matcher', () => {
      const matcher = createCaseInsensitiveMatcher('Hello');
      expect(matcher('hello')).toBe(true);
      expect(matcher('HELLO')).toBe(true);
      expect(matcher('world')).toBe(false);
    });

    it('should create case-insensitive sorter', () => {
      const sorter = createCaseInsensitiveSorter();
      const array = ['Charlie', 'alice', 'Bob', 'david'];
      const sorted = array.sort(sorter);
      expect(sorted).toEqual(['alice', 'Bob', 'Charlie', 'david']);
    });

    it('should create case-insensitive filter', () => {
      const filter = createCaseInsensitiveFilter('hello');
      const array = ['Hello World', 'Goodbye', 'HELLO Universe', 'Hi There'];
      const filtered = array.filter(filter);
      expect(filtered).toEqual(['Hello World', 'HELLO Universe']);
    });
  });

  describe('hash and key functions', () => {
    it('should create case-insensitive hash', () => {
      expect(caseInsensitiveHash('Hello')).toBe('hello');
      expect(caseInsensitiveHash('HELLO')).toBe('hello');
      expect(caseInsensitiveHash('HeLlO')).toBe('hello');
    });

    it('should create case-insensitive key', () => {
      expect(createCaseInsensitiveKey('Hello')).toBe('hello');
      expect(createCaseInsensitiveKey('HELLO')).toBe('hello');
    });
  });

  describe('array utilities', () => {
    const testArray = [
      { name: 'Alice', age: 30 },
      { name: 'bob', age: 25 },
      { name: 'CHARLIE', age: 35 },
      { name: 'david', age: 28 },
    ];

    it('should find with case-insensitive matching', () => {
      const result = caseInsensitiveArrayUtils.find(
        testArray,
        (item) => item.name,
        'alice',
      );
      expect(result).toEqual({ name: 'Alice', age: 30 });
    });

    it('should filter with case-insensitive matching', () => {
      const results = caseInsensitiveArrayUtils.filter(
        testArray,
        (item) => item.name,
        'a',
      );
      expect(results).toEqual([
        { name: 'Alice', age: 30 },
        { name: 'CHARLIE', age: 35 },
        { name: 'david', age: 28 },
      ]);
    });

    it('should sort with case-insensitive comparison', () => {
      const sorted = caseInsensitiveArrayUtils.sort(
        testArray,
        (item) => item.name,
      );
      expect(sorted).toEqual([
        { name: 'Alice', age: 30 },
        { name: 'bob', age: 25 },
        { name: 'CHARLIE', age: 35 },
        { name: 'david', age: 28 },
      ]);
    });

    it('should group by case-insensitive key', () => {
      const groups = caseInsensitiveArrayUtils.groupBy(
        testArray,
        (item) => item.name,
      );
      expect(groups.size).toBe(4);
      expect(groups.get('alice')).toEqual([{ name: 'Alice', age: 30 }]);
      expect(groups.get('bob')).toEqual([{ name: 'bob', age: 25 }]);
    });
  });

  describe('object utilities', () => {
    const testObject = {
      Hello: 'world',
      FOO: 'bar',
      baz: 'qux',
    };

    it('should get property with case-insensitive key', () => {
      expect(caseInsensitiveObjectUtils.getProperty(testObject, 'hello')).toBe(
        'world',
      );
      expect(caseInsensitiveObjectUtils.getProperty(testObject, 'HELLO')).toBe(
        'world',
      );
      expect(caseInsensitiveObjectUtils.getProperty(testObject, 'foo')).toBe(
        'bar',
      );
      expect(caseInsensitiveObjectUtils.getProperty(testObject, 'FOO')).toBe(
        'bar',
      );
      expect(
        caseInsensitiveObjectUtils.getProperty(testObject, 'nonexistent'),
      ).toBeUndefined();
    });

    it('should set property with case-insensitive key', () => {
      const obj = { ...testObject };
      caseInsensitiveObjectUtils.setProperty(obj, 'hello', 'universe');
      expect(obj['Hello']).toBe('universe');

      caseInsensitiveObjectUtils.setProperty(obj, 'NEW', 'value');
      expect(obj['NEW']).toBe('value');
    });

    it('should check if property exists with case-insensitive key', () => {
      expect(caseInsensitiveObjectUtils.hasProperty(testObject, 'hello')).toBe(
        true,
      );
      expect(caseInsensitiveObjectUtils.hasProperty(testObject, 'HELLO')).toBe(
        true,
      );
      expect(caseInsensitiveObjectUtils.hasProperty(testObject, 'foo')).toBe(
        true,
      );
      expect(
        caseInsensitiveObjectUtils.hasProperty(testObject, 'nonexistent'),
      ).toBe(false);
    });

    it('should delete property with case-insensitive key', () => {
      const obj = { ...testObject };
      expect(caseInsensitiveObjectUtils.deleteProperty(obj, 'hello')).toBe(
        true,
      );
      expect(obj['Hello']).toBeUndefined();

      expect(
        caseInsensitiveObjectUtils.deleteProperty(obj, 'nonexistent'),
      ).toBe(false);
    });
  });
});
