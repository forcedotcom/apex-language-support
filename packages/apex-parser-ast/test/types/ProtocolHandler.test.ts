/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  hasUriScheme,
  createFileUri,
  createApexLibUri,
  getFilePathFromUri,
} from '../../src/types/ProtocolHandler';

describe('ProtocolHandler', () => {
  describe('hasUriScheme', () => {
    it('should return true for file:// URIs', () => {
      expect(hasUriScheme('file:///path/to/File.cls')).toBe(true);
    });

    it('should return true for apexlib:// URIs', () => {
      expect(
        hasUriScheme(
          'apexlib://resources/StandardApexLibrary/System/String.cls',
        ),
      ).toBe(true);
    });

    it('should return true for built-in:// URIs', () => {
      expect(hasUriScheme('built-in://Object')).toBe(true);
    });

    it('should return true for double-slash other protocols', () => {
      expect(hasUriScheme('vscode-test-web://mount/path/File.cls')).toBe(true);
    });

    it('should return true for single-slash memfs: URIs', () => {
      expect(hasUriScheme('memfs:/MyProject/path/File.cls')).toBe(true);
    });

    it('should return true for single-slash vscode-vfs: URIs', () => {
      expect(hasUriScheme('vscode-vfs:/path/File.cls')).toBe(true);
    });

    it('should return false for plain relative paths', () => {
      expect(hasUriScheme('src/classes/File.cls')).toBe(false);
    });

    it('should return false for plain absolute paths', () => {
      expect(hasUriScheme('/Users/me/src/File.cls')).toBe(false);
    });

    it('should return false for Windows drive letters (backslash)', () => {
      expect(hasUriScheme('C:\\Users\\me\\File.cls')).toBe(false);
    });

    it('should return false for Windows drive letters (forward slash)', () => {
      expect(hasUriScheme('C:/Users/me/File.cls')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(hasUriScheme('')).toBe(false);
    });
  });

  describe('createFileUri', () => {
    it('should wrap plain paths with file://', () => {
      expect(createFileUri('/path/to/File.cls')).toBe(
        'file:///path/to/File.cls',
      );
    });

    it('should preserve file:// URIs as-is', () => {
      expect(createFileUri('file:///path/File.cls')).toBe(
        'file:///path/File.cls',
      );
    });

    it('should preserve memfs: URIs as-is (not double-wrap)', () => {
      expect(createFileUri('memfs:/MyProject/path/File.cls')).toBe(
        'memfs:/MyProject/path/File.cls',
      );
    });

    it('should preserve vscode-test-web:// URIs as-is', () => {
      expect(createFileUri('vscode-test-web://mount/File.cls')).toBe(
        'vscode-test-web://mount/File.cls',
      );
    });
  });

  describe('getFilePathFromUri', () => {
    it('should map apexlib URIs to StandardApexLibrary-relative paths', () => {
      const uri = createApexLibUri('System/System.cls');
      expect(getFilePathFromUri(uri)).toBe('System/System.cls');
    });

    it('should pass through file:// and other URIs unchanged', () => {
      expect(getFilePathFromUri('file:///path/File.cls')).toBe(
        'file:///path/File.cls',
      );
      expect(getFilePathFromUri('memfs:/p/File.cls')).toBe('memfs:/p/File.cls');
    });
  });
});
