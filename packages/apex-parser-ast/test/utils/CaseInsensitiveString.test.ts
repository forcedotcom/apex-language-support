/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CaseInsensitiveString,
  createCaseInsensitiveString,
} from '../../src/utils/CaseInsensitiveString';

describe('CaseInsensitiveString', () => {
  describe('basic functionality', () => {
    it('should store original value', () => {
      const str = new CaseInsensitiveString('Hello World');
      expect(str.value).toBe('Hello World');
      expect(str.toString()).toBe('Hello World');
      expect(str.valueOf()).toBe('Hello World');
    });

    it('should provide length', () => {
      const str = new CaseInsensitiveString('Hello');
      expect(str.length).toBe(5);
    });

    it('should support bracket notation with proxy', () => {
      const str = createCaseInsensitiveString('Hello');
      expect(str[0]).toBe('H');
      expect(str[1]).toBe('e');
      expect(str[4]).toBe('o');
    });
  });

  describe('case-insensitive equality', () => {
    it('should compare case-insensitively with strings', () => {
      const str = new CaseInsensitiveString('Hello');
      expect(str.equals('hello')).toBe(true);
      expect(str.equals('HELLO')).toBe(true);
      expect(str.equals('HeLlO')).toBe(true);
      expect(str.equals('world')).toBe(false);
    });

    it('should compare case-insensitively with other CaseInsensitiveString', () => {
      const str1 = new CaseInsensitiveString('Hello');
      const str2 = new CaseInsensitiveString('HELLO');
      const str3 = new CaseInsensitiveString('world');

      expect(str1.equals(str2)).toBe(true);
      expect(str1.equals(str3)).toBe(false);
    });

    it('should support static equality comparison', () => {
      expect(CaseInsensitiveString.equals('Hello', 'hello')).toBe(true);
      expect(CaseInsensitiveString.equals('Hello', 'HELLO')).toBe(true);
      expect(CaseInsensitiveString.equals('Hello', 'world')).toBe(false);
    });
  });

  describe('case-insensitive string methods', () => {
    it('should support startsWith', () => {
      const str = new CaseInsensitiveString('Hello World');
      expect(str.startsWith('hello')).toBe(true);
      expect(str.startsWith('HELLO')).toBe(true);
      expect(str.startsWith('world')).toBe(false);
    });

    it('should support endsWith', () => {
      const str = new CaseInsensitiveString('Hello World');
      expect(str.endsWith('world')).toBe(true);
      expect(str.endsWith('WORLD')).toBe(true);
      expect(str.endsWith('hello')).toBe(false);
    });

    it('should support includes', () => {
      const str = new CaseInsensitiveString('Hello World');
      expect(str.includes('hello')).toBe(true);
      expect(str.includes('WORLD')).toBe(true);
      expect(str.includes('lo wo')).toBe(true);
      expect(str.includes('xyz')).toBe(false);
    });

    it('should support indexOf', () => {
      const str = new CaseInsensitiveString('Hello World');
      expect(str.indexOf('world')).toBe(6);
      expect(str.indexOf('WORLD')).toBe(6);
      expect(str.indexOf('xyz')).toBe(-1);
    });

    it('should support lastIndexOf', () => {
      const str = new CaseInsensitiveString('Hello World Hello');
      expect(str.lastIndexOf('hello')).toBe(12);
      expect(str.lastIndexOf('HELLO')).toBe(12);
    });
  });

  describe('comparison and sorting', () => {
    it('should support case-insensitive comparison', () => {
      const str1 = new CaseInsensitiveString('apple');
      const str2 = new CaseInsensitiveString('BANANA');

      expect(str1.compareTo(str2)).toBeLessThan(0);
      expect(str2.compareTo(str1)).toBeGreaterThan(0);
      expect(str1.compareTo('APPLE')).toBe(0);
    });

    it('should support static comparison', () => {
      expect(CaseInsensitiveString.compare('apple', 'BANANA')).toBeLessThan(0);
      expect(CaseInsensitiveString.compare('BANANA', 'apple')).toBeGreaterThan(
        0,
      );
      expect(CaseInsensitiveString.compare('apple', 'APPLE')).toBe(0);
    });

    it('should sort arrays case-insensitively', () => {
      const strings = ['Charlie', 'alice', 'Bob', 'david'];
      const sorted = strings.sort((a, b) =>
        CaseInsensitiveString.compare(a, b),
      );
      expect(sorted).toEqual(['alice', 'Bob', 'Charlie', 'david']);
    });
  });

  describe('string manipulation', () => {
    it('should support all string methods', () => {
      const str = new CaseInsensitiveString('  Hello World  ');

      expect(str.trim()).toBe('Hello World');
      expect(str.toUpperCase()).toBe('  HELLO WORLD  ');
      expect(str.toLowerCase()).toBe('  hello world  ');
      expect(str.slice(2, 7)).toBe('Hello');
      expect(str.substring(2, 7)).toBe('Hello');
      expect(str.charAt(2)).toBe('H');
      expect(str.charCodeAt(2)).toBe(72);
      expect(str.split(' ')).toEqual(['', '', 'Hello', 'World', '', '']);
      expect(str.replace('World', 'Universe')).toBe('  Hello Universe  ');
      expect(str.padStart(20, 'x')).toBe('xxxxx  Hello World  ');
      expect(str.repeat(2)).toBe('  Hello World    Hello World  ');
    });

    it('should support concatenation', () => {
      const str1 = new CaseInsensitiveString('Hello');
      const str2 = new CaseInsensitiveString('World');

      expect(str1.concat(' ', str2)).toBe('Hello World');
      expect(str1.concat(' ', 'Universe')).toBe('Hello Universe');
    });

    it('should support iteration', () => {
      const str = new CaseInsensitiveString('Hello');
      const chars = Array.from(str);
      expect(chars).toEqual(['H', 'e', 'l', 'l', 'o']);
    });
  });

  describe('factory methods', () => {
    it('should create from string using static method', () => {
      const str = CaseInsensitiveString.from('Hello');
      expect(str.value).toBe('Hello');
      expect(str.equals('hello')).toBe(true);
    });
  });

  describe('integration with maps and sets', () => {
    it('should work as map keys with case-insensitive behavior', () => {
      const map = new Map<string, number>();
      const key1 = new CaseInsensitiveString('Hello');
      const key2 = new CaseInsensitiveString('HELLO');

      map.set(key1.value, 1);
      map.set(key2.value, 2);

      // Both keys are different in the map because they're different strings
      expect(map.size).toBe(2);
      expect(map.get('Hello')).toBe(1);
      expect(map.get('HELLO')).toBe(2);
    });

    it('should work with custom case-insensitive map', () => {
      // This would work with your CaseInsensitiveMap
      const map = new Map<string, number>();
      const key1 = new CaseInsensitiveString('Hello');
      const key2 = new CaseInsensitiveString('HELLO');

      // Use the lowerValue for consistent key storage
      map.set(key1.lowerValue, 1);
      map.set(key2.lowerValue, 2);

      // Now they're the same key
      expect(map.size).toBe(1);
      expect(map.get('hello')).toBe(2); // Last value wins
    });
  });
});
