/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CaseInsensitivePathMap } from '../../src/utils/CaseInsensitiveMap';

describe('CaseInsensitivePathMap', () => {
  let map: CaseInsensitivePathMap<string>;

  beforeEach(() => {
    map = new CaseInsensitivePathMap<string>();
  });

  describe('path normalization', () => {
    it('should normalize paths with different separators', () => {
      map.set('Test/Path.cls', 'value1');
      expect(map.get('Test\\Path.cls')).toBe('value1');
      expect(map.get('Test.Path.cls')).toBe('value1');
    });

    it('should normalize paths without extension', () => {
      map.set('Test/Path', 'value1');
      expect(map.get('Test\\Path')).toBe('value1');
      expect(map.get('Test.Path')).toBe('value1');
      expect(map.get('Test/Path.cls')).toBe('value1');
    });

    it('should handle mixed case paths', () => {
      map.set('Test/Path.cls', 'value1');
      expect(map.get('test/path.cls')).toBe('value1');
      expect(map.get('TEST\\PATH')).toBe('value1');
      expect(map.get('Test.Path')).toBe('value1');
    });
  });

  describe('set and get', () => {
    it('should store and retrieve values with normalized paths', () => {
      map.set('Test/Path.cls', 'value1');
      expect(map.get('Test\\Path.cls')).toBe('value1');
      expect(map.get('Test.Path.cls')).toBe('value1');
      expect(map.get('test/path')).toBe('value1');
    });

    it('should overwrite existing values with same normalized path', () => {
      map.set('Test/Path.cls', 'value1');
      map.set('Test\\Path.cls', 'value2');
      expect(map.get('Test.Path.cls')).toBe('value2');
    });
  });

  describe('has', () => {
    it('should check for existence of normalized paths', () => {
      map.set('Test/Path.cls', 'value1');
      expect(map.has('Test\\Path.cls')).toBe(true);
      expect(map.has('Test.Path.cls')).toBe(true);
      expect(map.has('test/path')).toBe(true);
      expect(map.has('nonexistent.cls')).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete entries with normalized paths', () => {
      map.set('Test/Path.cls', 'value1');
      expect(map.delete('Test\\Path.cls')).toBe(true);
      expect(map.has('Test.Path.cls')).toBe(false);
      expect(map.get('Test/Path.cls')).toBeUndefined();
    });

    it('should return false when deleting non-existent path', () => {
      expect(map.delete('nonexistent.cls')).toBe(false);
    });
  });

  describe('multiple operations', () => {
    it('should handle multiple operations with different path formats', () => {
      map.set('First/Path.cls', 'value1');
      map.set('Second\\Path.cls', 'value2');
      map.set('Third.Path.cls', 'value3');

      expect(map.get('first/path')).toBe('value1');
      expect(map.get('second\\path.cls')).toBe('value2');
      expect(map.get('third.path')).toBe('value3');

      expect(map.has('FIRST/PATH.CLS')).toBe(true);
      expect(map.has('Second\\Path')).toBe(true);
      expect(map.has('THIRD.PATH.CLS')).toBe(true);

      map.delete('First/Path');
      expect(map.has('first/path.cls')).toBe(false);
      expect(map.get('first\\path')).toBeUndefined();

      expect(map.has('second/path')).toBe(true);
      expect(map.has('third/path')).toBe(true);
    });
  });
});
