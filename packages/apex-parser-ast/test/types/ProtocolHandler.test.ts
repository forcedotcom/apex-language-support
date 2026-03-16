/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  getProtocolType,
  hasProtocol,
  createFileUri,
} from '../../src/types/ProtocolHandler';

describe('ProtocolHandler', () => {
  describe('getProtocolType', () => {
    it('should recognize file:// URIs', () => {
      expect(getProtocolType('file:///path/to/File.cls')).toBe('file');
    });

    it('should recognize apexlib:// URIs', () => {
      expect(
        getProtocolType(
          'apexlib://resources/StandardApexLibrary/System/String.cls',
        ),
      ).toBe('apexlib');
    });

    it('should recognize built-in:// URIs', () => {
      expect(getProtocolType('built-in://Object')).toBe('builtin');
    });

    it('should recognize double-slash other protocols', () => {
      expect(getProtocolType('vscode-test-web://mount/path/File.cls')).toBe(
        'other',
      );
    });

    it('should recognize single-slash memfs: URIs', () => {
      expect(getProtocolType('memfs:/MyProject/path/File.cls')).toBe('other');
    });

    it('should recognize single-slash vscode-vfs: URIs', () => {
      expect(getProtocolType('vscode-vfs:/path/File.cls')).toBe('other');
    });

    it('should return null for plain relative paths', () => {
      expect(getProtocolType('src/classes/File.cls')).toBeNull();
    });

    it('should return null for plain absolute paths', () => {
      expect(getProtocolType('/Users/me/src/File.cls')).toBeNull();
    });

    it('should return null for Windows drive letters (backslash)', () => {
      expect(getProtocolType('C:\\Users\\me\\File.cls')).toBeNull();
    });

    it('should return null for Windows drive letters (forward slash)', () => {
      expect(getProtocolType('C:/Users/me/File.cls')).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(getProtocolType('')).toBeNull();
    });
  });

  describe('hasProtocol', () => {
    it('should detect file protocol', () => {
      expect(hasProtocol('file:///path/to/File.cls', 'file')).toBe(true);
      expect(hasProtocol('memfs:/path/File.cls', 'file')).toBe(false);
    });

    it('should detect other protocol for double-slash URIs', () => {
      expect(
        hasProtocol('vscode-test-web://mount/path/File.cls', 'other'),
      ).toBe(true);
    });

    it('should detect other protocol for single-slash URIs', () => {
      expect(hasProtocol('memfs:/MyProject/path/File.cls', 'other')).toBe(true);
    });

    it('should not detect other for known protocols', () => {
      expect(hasProtocol('file:///path/File.cls', 'other')).toBe(false);
    });

    it('should not detect other for Windows forward-slash paths', () => {
      expect(hasProtocol('C:/Users/me/File.cls', 'other')).toBe(false);
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
});
