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
  getFilePathFromId,
  extractFilePathFromUri,
  extractSimpleName,
  extractScopePath,
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
      expect(id).toBe(`${createFileUri('/path/to/MyClass.cls')}#MyClass`);
    });

    it('should generate apexlib:// URIs for standard Apex classes', () => {
      const id = generateSymbolId('System', 'System/System.cls');
      expect(id).toBe(`${createApexLibUri('System/System.cls')}#System`);
    });

    it('should include scope path when provided (dot-separated)', () => {
      const id = generateSymbolId('myMethod', '/path/to/MyClass.cls', [
        'MyClass',
        'myMethod',
      ]);
      // Scope path should use dots in the new stable format
      expect(id).toBe(
        `${createFileUri('/path/to/MyClass.cls')}#MyClass.myMethod.myMethod`,
      );
    });

    it('should accept scope path with prefix for disambiguation', () => {
      // generateSymbolId uses whatever scope path it receives
      // Cleaning is done by the listeners before calling generateSymbolId
      const id = generateSymbolId(
        'myMethod',
        '/path/to/MyClass.cls',
        ['class', 'MyClass', 'block1'],
        undefined,
        'method',
      );
      expect(id).toBe(
        `${createFileUri('/path/to/MyClass.cls')}#class.MyClass.block1.myMethod$method`,
      );
    });

    it('should not include line number in stable IDs', () => {
      const id = generateSymbolId(
        'myVariable',
        '/path/to/MyClass.cls',
        ['MyClass', 'myMethod'],
        42,
      );
      // Line numbers are deprecated and not included in stable IDs
      expect(id).toBe(
        `${createFileUri('/path/to/MyClass.cls')}#MyClass.myMethod.myVariable`,
      );
    });

    it('should handle complex scope paths (dot-separated)', () => {
      const id = generateSymbolId('innerMethod', '/path/to/MyClass.cls', [
        'MyClass',
        'InnerClass',
        'innerMethod',
      ]);
      // Scope path should use dots
      expect(id).toBe(
        `${createFileUri('/path/to/MyClass.cls')}#MyClass.InnerClass.innerMethod.innerMethod`,
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

    it('should extract file paths correctly', () => {
      const standardId = `${createApexLibUri('System/System.cls')}:System`;
      const userId = `${createFileUri('/path/to/MyClass.cls')}:MyClass`;

      expect(getFilePathFromId(standardId)).toBe('System/System.cls');
      expect(getFilePathFromId(userId)).toBe(
        createFileUri('/path/to/MyClass.cls'),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty scope paths', () => {
      const id = generateSymbolId('MyClass', '/path/to/MyClass.cls', []);
      expect(id).toBe(`${createFileUri('/path/to/MyClass.cls')}#MyClass`);
    });

    it('should handle undefined scope paths', () => {
      const id = generateSymbolId('MyClass', '/path/to/MyClass.cls', undefined);
      expect(id).toBe(`${createFileUri('/path/to/MyClass.cls')}#MyClass`);
    });

    it('should not include zero line numbers in stable IDs', () => {
      const id = generateSymbolId(
        'MyClass',
        '/path/to/MyClass.cls',
        undefined,
        0,
      );
      // Line numbers are not included in stable IDs
      expect(id).toBe(`${createFileUri('/path/to/MyClass.cls')}#MyClass`);
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

    it('should handle new stable format with # separator', () => {
      expect(
        extractFilePathFromUri('file:///workspace/MyClass.cls#MyClass'),
      ).toBe('file:///workspace/MyClass.cls');
    });

    it('should handle new format with signature', () => {
      expect(
        extractFilePathFromUri(
          'file:///workspace/MyClass.cls#MyClass.myMethod#(String,Integer)',
        ),
      ).toBe('file:///workspace/MyClass.cls');
    });
  });

  describe('stable ID format (new)', () => {
    describe('generateSymbolId with stable format', () => {
      it('should generate stable ID for top-level class', () => {
        const stableId = generateSymbolId(
          'MyClass',
          'file:///workspace/MyClass.cls',
        );

        expect(stableId).toBe('file:///workspace/MyClass.cls#MyClass');
      });

      it('should generate stable ID for top-level class with namespace', () => {
        const stableId = generateSymbolId(
          'MyClass',
          'file:///workspace/MyClass.cls',
          undefined, // scopePath
          undefined, // lineNumber
          undefined, // prefix
          undefined, // parameters
          'MyNamespace', // namespace
        );

        expect(stableId).toBe(
          'file:///workspace/MyClass.cls#MyNamespace.MyClass',
        );
      });

      it('should generate stable ID for nested inner class', () => {
        const stableId = generateSymbolId(
          'InnerClass',
          'file:///workspace/Outer.cls',
          ['Outer'],
        );

        expect(stableId).toBe('file:///workspace/Outer.cls#Outer.InnerClass');
      });

      it('should generate stable ID for method without parameters', () => {
        const stableId = generateSymbolId(
          'myMethod',
          'file:///workspace/MyClass.cls',
          ['MyClass'],
        );

        expect(stableId).toBe('file:///workspace/MyClass.cls#MyClass.myMethod');
      });

      it('should generate stable ID for method with parameters', () => {
        const stableId = generateSymbolId(
          'myMethod',
          'file:///workspace/MyClass.cls',
          ['MyClass'],
          undefined, // lineNumber
          undefined, // prefix
          [
            { type: 'String', name: 'param1' },
            { type: 'Integer', name: 'param2' },
          ],
        );

        expect(stableId).toBe(
          'file:///workspace/MyClass.cls#MyClass.myMethod#(String,Integer)',
        );
      });

      it('should normalize parameter types by removing namespaces', () => {
        const stableId = generateSymbolId(
          'myMethod',
          'file:///workspace/MyClass.cls',
          ['MyClass'],
          undefined, // lineNumber
          undefined, // prefix
          [
            { type: 'System.String', name: 'param1' },
            { type: 'System.Integer', name: 'param2' },
          ],
        );

        expect(stableId).toBe(
          'file:///workspace/MyClass.cls#MyClass.myMethod#(String,Integer)',
        );
      });

      it('should preserve generic types in signatures', () => {
        const stableId = generateSymbolId(
          'myMethod',
          'file:///workspace/MyClass.cls',
          ['MyClass'],
          undefined, // lineNumber
          undefined, // prefix
          [
            { type: 'List<String>', name: 'param1' },
            { type: 'Map<String, Integer>', name: 'param2' },
          ],
        );

        expect(stableId).toBe(
          'file:///workspace/MyClass.cls#MyClass.myMethod#(List<String>,Map<String,Integer>)',
        );
      });

      it('should generate different IDs for overloaded methods', () => {
        const id1 = generateSymbolId(
          'process',
          'file:///workspace/MyClass.cls',
          ['MyClass'],
          undefined,
          undefined,
          [{ type: 'String', name: 'input' }],
        );

        const id2 = generateSymbolId(
          'process',
          'file:///workspace/MyClass.cls',
          ['MyClass'],
          undefined,
          undefined,
          [{ type: 'Integer', name: 'input' }],
        );

        expect(id1).toBe(
          'file:///workspace/MyClass.cls#MyClass.process#(String)',
        );
        expect(id2).toBe(
          'file:///workspace/MyClass.cls#MyClass.process#(Integer)',
        );
        expect(id1).not.toBe(id2);
      });

      it('should generate stable ID regardless of line numbers', () => {
        // Line numbers are no longer included in stable IDs
        const id1 = generateSymbolId(
          'myMethod',
          'file:///workspace/MyClass.cls',
          ['MyClass'],
          42, // lineNumber (ignored)
          undefined,
          [{ type: 'String', name: 'param' }],
        );

        const id2 = generateSymbolId(
          'myMethod',
          'file:///workspace/MyClass.cls',
          ['MyClass'],
          142, // different lineNumber (still ignored)
          undefined,
          [{ type: 'String', name: 'param' }],
        );

        expect(id1).toBe(id2);
        expect(id1).toBe(
          'file:///workspace/MyClass.cls#MyClass.myMethod#(String)',
        );
      });
    });

    describe('parseSymbolId with stable format', () => {
      it('should parse simple class ID (new format)', () => {
        const parsed = parseSymbolId('file:///workspace/MyClass.cls#MyClass');

        expect(parsed.uri).toBe('file:///workspace/MyClass.cls');
        expect(parsed.qualifiedName).toBe('MyClass');
        expect(parsed.name).toBe('MyClass');
        expect(parsed.signature).toBeUndefined();
      });

      it('should parse method ID with signature (new format)', () => {
        const parsed = parseSymbolId(
          'file:///workspace/MyClass.cls#MyClass.myMethod#(String,Integer)',
        );

        expect(parsed.uri).toBe('file:///workspace/MyClass.cls');
        expect(parsed.qualifiedName).toBe('MyClass.myMethod');
        expect(parsed.name).toBe('myMethod');
        expect(parsed.scopePath).toEqual(['MyClass']);
        expect(parsed.signature).toBe('(String,Integer)');
      });

      it('should parse nested class ID (new format)', () => {
        const parsed = parseSymbolId(
          'file:///workspace/Outer.cls#Outer.Inner.method',
        );

        expect(parsed.uri).toBe('file:///workspace/Outer.cls');
        expect(parsed.qualifiedName).toBe('Outer.Inner.method');
        expect(parsed.name).toBe('method');
        expect(parsed.scopePath).toEqual(['Outer', 'Inner']);
        expect(parsed.signature).toBeUndefined();
      });

      it('should parse old format for backward compatibility', () => {
        const parsed = parseSymbolId(
          'file:///workspace/MyClass.cls:MyClass:method:myMethod',
        );

        expect(parsed.uri).toBe('file:///workspace/MyClass.cls');
        expect(parsed.name).toBe('myMethod');
        // Old format: 'method' is treated as a prefix, so scope is just ['MyClass']
        expect(parsed.scopePath).toEqual(['MyClass']);
      });
    });

    describe('helper functions', () => {
      it('should extract simple name from qualified name', () => {
        expect(extractSimpleName('Outer.Inner.method')).toBe('method');
        expect(extractSimpleName('MyClass.myMethod')).toBe('myMethod');
        expect(extractSimpleName('MyClass')).toBe('MyClass');
      });

      it('should extract scope path from qualified name', () => {
        expect(extractScopePath('Outer.Inner.method')).toEqual([
          'Outer',
          'Inner',
        ]);
        expect(extractScopePath('MyClass.method')).toEqual(['MyClass']);
        expect(extractScopePath('MyClass')).toEqual([]);
      });
    });
  });
});
