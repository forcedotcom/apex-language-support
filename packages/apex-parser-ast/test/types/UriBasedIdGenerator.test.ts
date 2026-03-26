/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  generateSymbolId,
  parseSymbolId,
  isStandardApexId,
  isUserCodeId,
  getFilePathFromId,
  extractFilePathFromUri,
} from '../../src/types/UriBasedIdGenerator';
import {
  createFileUri,
  createApexLibUri,
} from '../../src/types/ProtocolHandler';
import {
  initializeResourceLoaderForTests,
  resetResourceLoader,
} from '../helpers/testHelpers';

describe('UriBasedIdGenerator', () => {
  beforeAll(async () => {
    // Initialize ResourceLoader with StandardApexLibrary.zip for standard library resolution
    await initializeResourceLoaderForTests();
  });

  afterAll(() => {
    resetResourceLoader();
  });
  describe('generateSymbolId', () => {
    it('should generate file:// URIs for user code', () => {
      const id = generateSymbolId('MyClass', '/path/to/MyClass.cls');
      expect(id).toBe(`${createFileUri('/path/to/MyClass.cls')}:MyClass`);
    });

    it('should generate apexlib:// URIs for standard Apex classes', () => {
      const id = generateSymbolId('System', 'System/System.cls');
      expect(id).toBe(`${createApexLibUri('System/System.cls')}:System`);
    });

    it('should include scope path when provided (using colons)', () => {
      const id = generateSymbolId('myMethod', '/path/to/MyClass.cls', [
        'MyClass',
        'myMethod',
      ]);
      // Scope path should use colons, not dots
      expect(id).toBe(
        `${createFileUri('/path/to/MyClass.cls')}:MyClass:myMethod:myMethod`,
      );
    });

    it('should include root prefix in scope path for nested symbols', () => {
      // Test the new format where root prefix is included: class:MyClass:block1:method:myMethod
      const id = generateSymbolId(
        'myMethod',
        '/path/to/MyClass.cls',
        ['class', 'MyClass', 'block1'],
        undefined,
        'method',
      );
      expect(id).toBe(
        `${createFileUri('/path/to/MyClass.cls')}:class:MyClass:block1:method:myMethod`,
      );
    });

    it('should include line number when provided', () => {
      const id = generateSymbolId(
        'myVariable',
        '/path/to/MyClass.cls',
        ['MyClass', 'myMethod'],
        42,
      );
      // Scope path should use colons
      expect(id).toBe(
        `${createFileUri('/path/to/MyClass.cls')}:MyClass:myMethod:myVariable:42`,
      );
    });

    it('should handle complex scope paths (using colons)', () => {
      const id = generateSymbolId('innerMethod', '/path/to/MyClass.cls', [
        'MyClass',
        'InnerClass',
        'innerMethod',
      ]);
      // Scope path should use colons
      expect(id).toBe(
        `${createFileUri('/path/to/MyClass.cls')}:MyClass:InnerClass:innerMethod:innerMethod`,
      );
    });
  });

  describe('parseSymbolId', () => {
    it('should parse file:// URIs correctly', () => {
      const id = `${createFileUri('/path/to/MyClass.cls')}:MyClass:42`;
      const parsed = parseSymbolId(id);

      expect(parsed.uri).toBe(createFileUri('/path/to/MyClass.cls'));
      expect(parsed.name).toBe('MyClass');
      expect(parsed.lineNumber).toBe(42);
      expect(parsed.scopePath).toBeUndefined();
    });

    it('should parse apexlib:// URIs correctly', () => {
      const id = `${createApexLibUri('System/System.cls')}:System`;
      const parsed = parseSymbolId(id);

      expect(parsed.uri).toBe(createApexLibUri('System/System.cls'));
      expect(parsed.name).toBe('System');
      expect(parsed.lineNumber).toBeUndefined();
      expect(parsed.scopePath).toBeUndefined();
    });

    it('should parse scope paths correctly', () => {
      const id = `${createFileUri('/path/to/MyClass.cls')}:MyClass.myMethod:myVariable:15`;
      const parsed = parseSymbolId(id);

      expect(parsed.uri).toBe(createFileUri('/path/to/MyClass.cls'));
      expect(parsed.scopePath).toEqual(['MyClass', 'myMethod']);
      expect(parsed.name).toBe('myVariable');
      expect(parsed.lineNumber).toBe(15);
    });
  });

  describe('utility methods', () => {
    it('should identify standard Apex IDs correctly', () => {
      const standardId = `${createApexLibUri('System/System.cls')}:System`;
      const userId = `${createFileUri('/path/to/MyClass.cls')}:MyClass`;

      expect(isStandardApexId(standardId)).toBe(true);
      expect(isStandardApexId(userId)).toBe(false);
    });

    it('should identify user code IDs correctly', () => {
      const standardId = `${createApexLibUri('System/System.cls')}:System`;
      const userId = `${createFileUri('/path/to/MyClass.cls')}:MyClass`;

      expect(isUserCodeId(standardId)).toBe(false);
      expect(isUserCodeId(userId)).toBe(true);
    });

    it('should extract file paths correctly', () => {
      const standardId = `${createApexLibUri('System/System.cls')}:System`;
      const userId = `${createFileUri('/path/to/MyClass.cls')}:MyClass`;

      expect(getFilePathFromId(standardId)).toBe('System/System.cls');
      expect(getFilePathFromId(userId)).toBe('/path/to/MyClass.cls');
    });
  });

  describe('edge cases', () => {
    it('should handle empty scope paths', () => {
      const id = generateSymbolId('MyClass', '/path/to/MyClass.cls', []);
      expect(id).toBe(`${createFileUri('/path/to/MyClass.cls')}:MyClass`);
    });

    it('should handle undefined scope paths', () => {
      const id = generateSymbolId('MyClass', '/path/to/MyClass.cls', undefined);
      expect(id).toBe(`${createFileUri('/path/to/MyClass.cls')}:MyClass`);
    });

    it('should handle zero line numbers', () => {
      const id = generateSymbolId(
        'MyClass',
        '/path/to/MyClass.cls',
        undefined,
        0,
      );
      expect(id).toBe(`${createFileUri('/path/to/MyClass.cls')}:MyClass:0`);
    });
  });

  describe('extractFilePathFromUri', () => {
    it('should extract file path from file URI with symbol part', () => {
      expect(extractFilePathFromUri('file:///path/File.cls:ClassName')).toBe(
        'file:///path/File.cls',
      );
    });

    it('should return memfs URI as-is when no symbol part', () => {
      expect(extractFilePathFromUri('memfs:/MyProject/path/File.cls')).toBe(
        'memfs:/MyProject/path/File.cls',
      );
    });

    it('should extract memfs URI path when symbol part present', () => {
      expect(
        extractFilePathFromUri('memfs:/MyProject/path/File.cls:ClassName'),
      ).toBe('memfs:/MyProject/path/File.cls');
    });

    it('should handle vscode-test-web URI without symbol part', () => {
      expect(
        extractFilePathFromUri('vscode-test-web://mount/path/File.cls'),
      ).toBe('vscode-test-web://mount/path/File.cls');
    });

    it('should return built-in URI as-is when no symbol part', () => {
      expect(extractFilePathFromUri('built-in://Object')).toBe(
        'built-in://Object',
      );
    });

    it('should extract built-in URI when symbol part present', () => {
      expect(extractFilePathFromUri('built-in://apex:SomeName')).toBe(
        'built-in://apex',
      );
    });

    it('should extract vscode-test-web URI when symbol part present', () => {
      expect(
        extractFilePathFromUri(
          'vscode-test-web://mount/path/File.cls:ClassName',
        ),
      ).toBe('vscode-test-web://mount/path/File.cls');
    });

    it('should extract plain path when symbol part present', () => {
      expect(extractFilePathFromUri('/Users/me/File.cls:ClassName')).toBe(
        '/Users/me/File.cls',
      );
    });

    it('should not produce file://memfs collision (regression guard)', () => {
      // After Fix 1, memfs: URIs should never be wrapped in file://
      // This test guards against the old behavior where all memfs: URIs
      // would collapse to "file://memfs"
      const uri1 = 'memfs:/MyProject/path/BuzzoBonk.cls';
      const uri2 = 'memfs:/MyProject/path/Bar.cls';
      expect(extractFilePathFromUri(uri1)).not.toBe(
        extractFilePathFromUri(uri2),
      );
    });
  });
});
