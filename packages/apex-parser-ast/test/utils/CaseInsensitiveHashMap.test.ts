/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CaseInsensitiveHashMap } from '../../src/utils/CaseInsensitiveMap';

describe('CaseInsensitiveHashMap', () => {
  let map: CaseInsensitiveHashMap<string>;

  beforeEach(() => {
    map = new CaseInsensitiveHashMap<string>();
  });

  describe('case-insensitive operations', () => {
    it('should store and retrieve values case-insensitively', () => {
      map.set('Hello', 'value1');
      expect(map.get('hello')).toBe('value1');
      expect(map.get('HELLO')).toBe('value1');
      expect(map.get('HeLlO')).toBe('value1');
    });

    it('should check existence case-insensitively', () => {
      map.set('Test', 'value1');
      expect(map.has('test')).toBe(true);
      expect(map.has('TEST')).toBe(true);
      expect(map.has('TeSt')).toBe(true);
      expect(map.has('nonexistent')).toBe(false);
    });

    it('should delete entries case-insensitively', () => {
      map.set('DeleteMe', 'value1');
      expect(map.delete('deleteme')).toBe(true);
      expect(map.has('DELETEME')).toBe(false);
      expect(map.get('DeleteMe')).toBeUndefined();
    });
  });

  describe('first touch principle', () => {
    it('should preserve the first key case that was set', () => {
      map.set('FileUtilities', 'value1');
      const keys = Array.from(map.keys());
      expect(keys).toContain('FileUtilities');
      expect(keys).not.toContain('fileutilities');
    });

    it('should not overwrite original case when setting with different case', () => {
      map.set('FileUtilities', 'value1');
      map.set('fileutilities', 'value2'); // lowercase version
      const keys = Array.from(map.keys());
      expect(keys).toContain('FileUtilities');
      expect(keys).not.toContain('fileutilities');
      // Value should be updated
      expect(map.get('FileUtilities')).toBe('value2');
      expect(map.get('fileutilities')).toBe('value2');
    });

    it('should preserve first touch even if later sets use uppercase', () => {
      map.set('fileutilities', 'value1'); // lowercase first
      map.set('FileUtilities', 'value2'); // mixed case later
      const keys = Array.from(map.keys());
      expect(keys).toContain('fileutilities');
      expect(keys).not.toContain('FileUtilities');
      // Value should be updated
      expect(map.get('fileutilities')).toBe('value2');
      expect(map.get('FileUtilities')).toBe('value2');
    });

    it('should preserve first touch with mixed case variations', () => {
      map.set('CreateFile', 'value1');
      map.set('createfile', 'value2');
      map.set('CREATEFILE', 'value3');
      map.set('CrEaTeFiLe', 'value4');
      const keys = Array.from(map.keys());
      expect(keys).toContain('CreateFile');
      expect(keys.length).toBe(1); // Only one key
      expect(map.get('createfile')).toBe('value4'); // Last value wins
    });
  });

  describe('keys() method', () => {
    it('should return original case keys', () => {
      map.set('FileUtilities', 'value1');
      map.set('CreateFile', 'value2');
      map.set('base64Data', 'value3');
      const keys = Array.from(map.keys());
      expect(keys).toContain('FileUtilities');
      expect(keys).toContain('CreateFile');
      expect(keys).toContain('base64Data');
    });

    it('should return first touch case in keys()', () => {
      map.set('FileUtilities', 'value1');
      map.set('fileutilities', 'value2');
      const keys = Array.from(map.keys());
      expect(keys).toEqual(['FileUtilities']);
    });
  });

  describe('clear() method', () => {
    it('should clear both the map and originalKeys', () => {
      map.set('Test1', 'value1');
      map.set('Test2', 'value2');
      expect(map.size).toBeGreaterThan(0);
      expect(Array.from(map.keys()).length).toBeGreaterThan(0);

      map.clear();
      expect(map.size).toBe(0);
      expect(Array.from(map.keys()).length).toBe(0);
      expect(map.get('Test1')).toBeUndefined();
      expect(map.get('test2')).toBeUndefined();
    });
  });

  describe('multiple operations', () => {
    it('should handle multiple operations with different cases', () => {
      map.set('First', 'value1');
      map.set('SECOND', 'value2');
      map.set('third', 'value3');
      map.set('FoUrTh', 'value4');

      expect(map.get('first')).toBe('value1');
      expect(map.get('second')).toBe('value2');
      expect(map.get('THIRD')).toBe('value3');
      expect(map.get('FOURTH')).toBe('value4');

      const keys = Array.from(map.keys());
      expect(keys).toContain('First');
      expect(keys).toContain('SECOND');
      expect(keys).toContain('third');
      expect(keys).toContain('FoUrTh');
    });

    it('should handle overwriting values while preserving key case', () => {
      map.set('FileUtilities', 'value1');
      expect(map.get('fileutilities')).toBe('value1');

      map.set('fileutilities', 'value2');
      expect(map.get('FileUtilities')).toBe('value2');
      const keys = Array.from(map.keys());
      expect(keys).toContain('FileUtilities');
      expect(keys).not.toContain('fileutilities');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string keys', () => {
      map.set('', 'value1');
      expect(map.get('')).toBe('value1');
      expect(map.has('')).toBe(true);
    });

    it('should handle keys with only special characters', () => {
      map.set('Test123', 'value1');
      expect(map.get('test123')).toBe('value1');
      expect(map.get('TEST123')).toBe('value1');
    });

    it('should handle unicode characters', () => {
      map.set('Café', 'value1');
      expect(map.get('CAFÉ')).toBe('value1');
      expect(map.get('café')).toBe('value1');
    });
  });

  describe('constructor with initial entries', () => {
    it('should preserve first touch from constructor entries', () => {
      const entries: [string, string][] = [
        ['FileUtilities', 'value1'],
        ['CreateFile', 'value2'],
      ];
      const mapWithEntries = new CaseInsensitiveHashMap<
        string,
        [string, string]
      >(entries);
      const keys = Array.from(mapWithEntries.keys());
      expect(keys).toContain('FileUtilities');
      expect(keys).toContain('CreateFile');
    });

    it('should handle duplicate normalized keys in constructor', () => {
      const entries: [string, string][] = [
        ['FileUtilities', 'value1'],
        ['fileutilities', 'value2'], // duplicate normalized key
      ];
      const mapWithEntries = new CaseInsensitiveHashMap<
        string,
        [string, string]
      >(entries);
      const keys = Array.from(mapWithEntries.keys());
      // First touch should be preserved
      expect(keys).toContain('FileUtilities');
      expect(keys).not.toContain('fileutilities');
      // Last value should win
      expect(mapWithEntries.get('fileutilities')).toBe('value2');
    });
  });
});
