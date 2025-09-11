/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  normalizeApexPath,
  normalizeSeparators,
  normalizeFileSystemPath,
} from '../../src/utils/PathUtils';

describe('PathUtils', () => {
  describe('normalizeApexPath', () => {
    it('should convert backslashes to forward slashes', () => {
      expect(normalizeApexPath('Test\\Path.cls')).toBe('Test/Path.cls');
      expect(normalizeApexPath('Test\\Path\\File.cls')).toBe(
        'Test/Path/File.cls',
      );
    });

    it('should handle dot notation conversion', () => {
      expect(normalizeApexPath('System.System.cls')).toBe('System/System.cls');
      expect(normalizeApexPath('Test.Path')).toBe('Test/Path.cls');
      expect(normalizeApexPath('A.B.C.cls')).toBe('A/B/C.cls');
    });

    it('should ensure .cls extension', () => {
      expect(normalizeApexPath('Test/Path')).toBe('Test/Path.cls');
      expect(normalizeApexPath('Test\\Path')).toBe('Test/Path.cls');
      expect(normalizeApexPath('Test.Path')).toBe('Test/Path.cls');
    });

    it('should handle mixed separators and dot notation', () => {
      // Mixed separators should only normalize separators, not convert dots to slashes
      expect(normalizeApexPath('Test\\Path.File.cls')).toBe(
        'Test/Path.File.cls',
      );
      expect(normalizeApexPath('A.B\\C.cls')).toBe('A.B/C.cls');
    });

    it('should preserve existing .cls extension', () => {
      expect(normalizeApexPath('Test/Path.cls')).toBe('Test/Path.cls');
      expect(normalizeApexPath('Test\\Path.CLS')).toBe('Test/Path.CLS');
    });

    it('should handle case-insensitive .cls detection', () => {
      expect(normalizeApexPath('Test.Path.CLS')).toBe('Test/Path.CLS');
      expect(normalizeApexPath('Test.Path.Cls')).toBe('Test/Path.Cls');
    });
  });

  describe('normalizeSeparators', () => {
    it('should convert backslashes to forward slashes', () => {
      expect(normalizeSeparators('Test\\Path')).toBe('Test/Path');
      expect(normalizeSeparators('Test\\Path\\File')).toBe('Test/Path/File');
    });

    it('should not modify forward slashes', () => {
      expect(normalizeSeparators('Test/Path')).toBe('Test/Path');
    });

    it('should not handle dot notation or extensions', () => {
      expect(normalizeSeparators('Test.Path.cls')).toBe('Test.Path.cls');
      expect(normalizeSeparators('Test\\Path.cls')).toBe('Test/Path.cls');
    });
  });

  describe('normalizeFileSystemPath', () => {
    it('should normalize separators without root path', () => {
      expect(normalizeFileSystemPath('Test\\Path')).toBe('/Test/Path');
      expect(normalizeFileSystemPath('/Test/Path')).toBe('/Test/Path');
    });

    it('should handle root path prefix', () => {
      expect(normalizeFileSystemPath('Test\\Path', '/root')).toBe(
        '/root/Test/Path',
      );
      expect(normalizeFileSystemPath('/Test/Path', '/root')).toBe(
        '/root/Test/Path',
      );
    });

    it('should handle empty root path', () => {
      expect(normalizeFileSystemPath('Test\\Path', '')).toBe('/Test/Path');
    });
  });
});
