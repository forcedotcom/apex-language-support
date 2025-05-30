/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CaseInsensitiveMap } from '../../src/utils/CaseInsensitiveMap';

describe('CaseInsensitiveMap', () => {
  let map: CaseInsensitiveMap<string>;

  beforeEach(() => {
    map = new CaseInsensitiveMap<string>();
  });

  describe('set and get', () => {
    it('should store and retrieve values with case-insensitive keys', () => {
      map.set('Test', 'value1');
      expect(map.get('test')).toBe('value1');
      expect(map.get('TEST')).toBe('value1');
      expect(map.get('TeSt')).toBe('value1');
    });

    it('should overwrite existing values with same key regardless of case', () => {
      map.set('Test', 'value1');
      map.set('TEST', 'value2');
      expect(map.get('test')).toBe('value2');
    });
  });

  describe('has', () => {
    it('should check for existence of keys case-insensitively', () => {
      map.set('Test', 'value1');
      expect(map.has('test')).toBe(true);
      expect(map.has('TEST')).toBe(true);
      expect(map.has('TeSt')).toBe(true);
      expect(map.has('nonexistent')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete entries case-insensitively', () => {
      map.set('Test', 'value1');
      expect(map.delete('TEST')).toBe(true);
      expect(map.has('test')).toBe(false);
      expect(map.get('test')).toBeUndefined();
    });

    it('should return false when deleting non-existent key', () => {
      expect(map.delete('nonexistent')).toBe(false);
    });
  });

  describe('multiple operations', () => {
    it('should handle multiple operations with mixed case keys', () => {
      map.set('First', 'value1');
      map.set('SECOND', 'value2');
      map.set('ThIrD', 'value3');

      expect(map.get('first')).toBe('value1');
      expect(map.get('second')).toBe('value2');
      expect(map.get('third')).toBe('value3');

      expect(map.has('FIRST')).toBe(true);
      expect(map.has('Second')).toBe(true);
      expect(map.has('THIRD')).toBe(true);

      map.delete('First');
      expect(map.has('first')).toBe(false);
      expect(map.get('first')).toBeUndefined();

      expect(map.has('second')).toBe(true);
      expect(map.has('third')).toBe(true);
    });
  });
});
