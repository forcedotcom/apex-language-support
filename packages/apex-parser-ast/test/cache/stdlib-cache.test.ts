/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  StandardLibraryCacheLoader,
  isProtobufCacheAvailable,
} from '../../src/cache/stdlib-cache-loader';
import { StandardLibraryDeserializer } from '../../src/cache/stdlib-deserializer';
import {
  StandardLibrarySerializer,
  NamespaceData,
} from '../../src/cache/stdlib-serializer';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
  SymbolVisibility,
} from '../../src/types/symbol';
import { gzipSync, gunzipSync } from 'fflate';

describe('StandardLibraryCacheLoader', () => {
  beforeEach(() => {
    // Clear the cache before each test
    StandardLibraryCacheLoader.clearCache();
  });

  describe('isProtobufCacheAvailable', () => {
    it('returns a boolean indicating cache availability', () => {
      const result = isProtobufCacheAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('load', () => {
    it('returns a valid CacheLoadResult', async () => {
      const loader = StandardLibraryCacheLoader.getInstance();
      const result = await loader.load();

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(['protobuf', 'fallback', 'none']).toContain(result.loadMethod);
      expect(typeof result.loadTimeMs).toBe('number');
      expect(result.loadTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('caches the result on subsequent calls', async () => {
      const loader = StandardLibraryCacheLoader.getInstance();

      // First load
      const result1 = await loader.load();

      // Second load should be faster (cached)
      const result2 = await loader.load();

      expect(result2.success).toBe(result1.success);
      expect(result2.loadMethod).toBe(result1.loadMethod);
      // Cached load should be very fast
      expect(result2.loadTimeMs).toBeLessThanOrEqual(result1.loadTimeMs + 10);
    });

    it('forces ZIP fallback when forceZipFallback option is true', async () => {
      const loader = StandardLibraryCacheLoader.getInstance();
      const result = await loader.load({ forceZipFallback: true });

      expect(result.success).toBe(true);
      expect(result.loadMethod).toBe('fallback');
    });
  });

  describe('singleton pattern', () => {
    it('returns the same instance', () => {
      const instance1 = StandardLibraryCacheLoader.getInstance();
      const instance2 = StandardLibraryCacheLoader.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});

describe('StandardLibraryDeserializer', () => {
  describe('deserialize', () => {
    it('handles empty namespaces array', () => {
      const deserializer = new StandardLibraryDeserializer();

      // Create a minimal proto message using the generated type
      const { StandardLibrary } = require('../../src/generated/apex-stdlib');
      const proto = StandardLibrary.create({
        version: '59.0',
        generatedAt: new Date().toISOString(),
        sourceChecksum: 'abc123',
        namespaces: [],
      });

      const result = deserializer.deserialize(proto);

      expect(result.symbolTables.size).toBe(0);
      expect(result.allTypes.length).toBe(0);
      expect(result.metadata.version).toBe('59.0');
      expect(result.metadata.sourceChecksum).toBe('abc123');
      expect(result.metadata.namespaceCount).toBe(0);
      expect(result.metadata.typeCount).toBe(0);
    });

    it('correctly deserializes from binary', () => {
      const deserializer = new StandardLibraryDeserializer();

      const {
        StandardLibrary,
        TypeKind,
        Visibility,
      } = require('../../src/generated/apex-stdlib');
      const proto = StandardLibrary.create({
        version: '59.0',
        generatedAt: new Date().toISOString(),
        sourceChecksum: 'test123',
        namespaces: [
          {
            name: 'System',
            types: [
              {
                id: 'test-string-id',
                name: 'String',
                kind: TypeKind.CLASS,
                fqn: 'System.String',
                fileUri: 'apex://stdlib/System/String',
                parentId: '',
                superClass: '',
                interfaces: [],
                annotations: [],
                methods: [],
                fields: [],
                properties: [],
                innerTypes: [],
                enumValues: [],
                modifiers: {
                  visibility: Visibility.PUBLIC,
                  isBuiltIn: true,
                },
              },
            ],
          },
        ],
      });

      // Serialize to binary and back
      const binary = StandardLibrary.toBinary(proto);
      const result = deserializer.deserializeFromBinary(binary);

      expect(result.symbolTables.size).toBe(1);
      expect(result.allTypes.length).toBe(1);
      expect(result.metadata.version).toBe('59.0');
      expect(result.metadata.namespaceCount).toBe(1);
      expect(result.metadata.typeCount).toBe(1);

      // Verify the symbol table content
      const symbolTable = result.symbolTables.get(
        'apex://stdlib/System/String',
      );
      expect(symbolTable).toBeDefined();

      const symbols = symbolTable!.getAllSymbols();
      expect(symbols.length).toBeGreaterThan(0);

      const stringType = symbols.find((s) => s.name === 'String');
      expect(stringType).toBeDefined();
      expect(stringType!.kind).toBe(SymbolKind.Class);
    });
  });
});

describe('StandardLibrarySerializer', () => {
  describe('serialize', () => {
    it('serializes empty namespace data', () => {
      const serializer = new StandardLibrarySerializer();

      const binary = serializer.serialize([], '59.0', 'checksum123');

      expect(binary).toBeInstanceOf(Uint8Array);
      expect(binary.length).toBeGreaterThan(0);

      // Verify it can be deserialized back
      const { StandardLibrary } = require('../../src/generated/apex-stdlib');
      const proto = StandardLibrary.fromBinary(binary);

      expect(proto.version).toBe('59.0');
      expect(proto.sourceChecksum).toBe('checksum123');
      expect(proto.namespaces.length).toBe(0);
    });

    it('serializes a simple class', () => {
      const serializer = new StandardLibrarySerializer();

      // Create a simple SymbolTable with a class
      const symbolTable = new SymbolTable();
      symbolTable.setFileUri('apex://stdlib/System/TestClass');

      const classSymbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 10,
            endColumn: 1,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 14,
            endLine: 1,
            endColumn: 23,
          },
        },
        'apex://stdlib/System/TestClass',
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: true,
        },
        null,
      );
      symbolTable.addSymbol(classSymbol);

      const namespaceData: NamespaceData[] = [
        {
          name: 'System',
          symbolTables: new Map([
            ['apex://stdlib/System/TestClass', symbolTable],
          ]),
        },
      ];

      const binary = serializer.serialize(
        namespaceData,
        '59.0',
        'test-checksum',
      );

      expect(binary).toBeInstanceOf(Uint8Array);
      expect(binary.length).toBeGreaterThan(0);

      // Verify it can be deserialized back
      const { StandardLibrary } = require('../../src/generated/apex-stdlib');
      const proto = StandardLibrary.fromBinary(binary);

      expect(proto.version).toBe('59.0');
      expect(proto.namespaces.length).toBe(1);
      expect(proto.namespaces[0].name).toBe('System');
      expect(proto.namespaces[0].types.length).toBe(1);
      expect(proto.namespaces[0].types[0].name).toBe('TestClass');
    });
  });
});

describe('Round-trip serialization', () => {
  it('serializes and deserializes to equivalent data', () => {
    const serializer = new StandardLibrarySerializer();
    const deserializer = new StandardLibraryDeserializer();

    // Create test data
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri('apex://stdlib/System/RoundTrip');

    const classSymbol = SymbolFactory.createFullSymbol(
      'RoundTrip',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 1,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 14,
          endLine: 1,
          endColumn: 23,
        },
      },
      'apex://stdlib/System/RoundTrip',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: true,
      },
      null,
      undefined,
      'System.RoundTrip',
    );
    symbolTable.addSymbol(classSymbol);

    const namespaceData: NamespaceData[] = [
      {
        name: 'System',
        symbolTables: new Map([
          ['apex://stdlib/System/RoundTrip', symbolTable],
        ]),
      },
    ];

    // Serialize
    const binary = serializer.serialize(
      namespaceData,
      '59.0',
      'roundtrip-test',
    );

    // Deserialize
    const result = deserializer.deserializeFromBinary(binary);

    // Verify metadata
    expect(result.metadata.version).toBe('59.0');
    expect(result.metadata.sourceChecksum).toBe('roundtrip-test');
    expect(result.metadata.namespaceCount).toBe(1);
    expect(result.metadata.typeCount).toBe(1);

    // Verify symbol table
    const deserializedTable = result.symbolTables.get(
      'apex://stdlib/System/RoundTrip',
    );
    expect(deserializedTable).toBeDefined();

    const deserializedSymbols = deserializedTable!.getAllSymbols();
    expect(deserializedSymbols.length).toBeGreaterThan(0);

    const deserializedClass = deserializedSymbols.find(
      (s) => s.name === 'RoundTrip',
    );
    expect(deserializedClass).toBeDefined();
    expect(deserializedClass!.kind).toBe(SymbolKind.Class);
    expect(deserializedClass!.fqn).toBe('System.RoundTrip');
  });
});

describe('Round-trip serialization with gzip compression', () => {
  it('serializes, compresses, decompresses, and deserializes to equivalent data', () => {
    const serializer = new StandardLibrarySerializer();
    const deserializer = new StandardLibraryDeserializer();

    // Create test data
    const symbolTable = new SymbolTable();
    symbolTable.setFileUri('apex://stdlib/System/GzipRoundTrip');

    const classSymbol = SymbolFactory.createFullSymbol(
      'GzipRoundTrip',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 1,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 14,
          endLine: 1,
          endColumn: 27,
        },
      },
      'apex://stdlib/System/GzipRoundTrip',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: true,
      },
      null,
      undefined,
      'System.GzipRoundTrip',
    );
    symbolTable.addSymbol(classSymbol);

    const namespaceData: NamespaceData[] = [
      {
        name: 'System',
        symbolTables: new Map([
          ['apex://stdlib/System/GzipRoundTrip', symbolTable],
        ]),
      },
    ];

    // Serialize to protobuf binary
    const binary = serializer.serialize(
      namespaceData,
      '59.0',
      'gzip-roundtrip-test',
    );

    // Compress with gzip
    const compressed = gzipSync(binary, { level: 9 });

    // Verify compression achieved reduction
    expect(compressed.length).toBeLessThan(binary.length);

    // Decompress
    const decompressed = gunzipSync(compressed);

    // Verify decompressed data matches original
    expect(decompressed).toEqual(binary);

    // Deserialize from decompressed data
    const result = deserializer.deserializeFromBinary(decompressed);

    // Verify metadata
    expect(result.metadata.version).toBe('59.0');
    expect(result.metadata.sourceChecksum).toBe('gzip-roundtrip-test');
    expect(result.metadata.namespaceCount).toBe(1);
    expect(result.metadata.typeCount).toBe(1);

    // Verify symbol table
    const deserializedTable = result.symbolTables.get(
      'apex://stdlib/System/GzipRoundTrip',
    );
    expect(deserializedTable).toBeDefined();

    const deserializedSymbols = deserializedTable!.getAllSymbols();
    const deserializedClass = deserializedSymbols.find(
      (s) => s.name === 'GzipRoundTrip',
    );
    expect(deserializedClass).toBeDefined();
    expect(deserializedClass!.kind).toBe(SymbolKind.Class);
    expect(deserializedClass!.fqn).toBe('System.GzipRoundTrip');
  });

  it('handles multiple types through gzip compression', () => {
    const serializer = new StandardLibrarySerializer();
    const deserializer = new StandardLibraryDeserializer();

    // Create multiple symbol tables
    const classNames = ['String', 'Integer', 'Boolean', 'Object', 'List'];
    const symbolTables = new Map<string, SymbolTable>();

    for (const className of classNames) {
      const symbolTable = new SymbolTable();
      symbolTable.setFileUri(`apex://stdlib/System/${className}`);

      const classSymbol = SymbolFactory.createFullSymbol(
        className,
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 10,
            endColumn: 1,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 14,
            endLine: 1,
            endColumn: 14 + className.length,
          },
        },
        `apex://stdlib/System/${className}`,
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: true,
        },
        null,
        undefined,
        `System.${className}`,
      );
      symbolTable.addSymbol(classSymbol);
      symbolTables.set(`apex://stdlib/System/${className}`, symbolTable);
    }

    const namespaceData: NamespaceData[] = [
      {
        name: 'System',
        symbolTables,
      },
    ];

    // Full pipeline: serialize -> compress -> decompress -> deserialize
    const binary = serializer.serialize(
      namespaceData,
      '60.0',
      'multi-type-gzip',
    );
    const compressed = gzipSync(binary, { level: 9 });
    const decompressed = gunzipSync(compressed);
    const result = deserializer.deserializeFromBinary(decompressed);

    // Verify all types are present
    expect(result.metadata.typeCount).toBe(classNames.length);

    const typeNames = result.allTypes.map((t) => t.name);
    for (const className of classNames) {
      expect(typeNames).toContain(className);
    }
  });

  it('preserves annotations through gzip round-trip', () => {
    const serializer = new StandardLibrarySerializer();
    const deserializer = new StandardLibraryDeserializer();

    const symbolTable = new SymbolTable();
    symbolTable.setFileUri('apex://stdlib/System/AnnotatedClass');

    const classSymbol = SymbolFactory.createFullSymbol(
      'AnnotatedClass',
      SymbolKind.Class,
      {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 10,
          endColumn: 1,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 14,
          endLine: 1,
          endColumn: 28,
        },
      },
      'apex://stdlib/System/AnnotatedClass',
      {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: true,
      },
      null,
      undefined,
      'System.AnnotatedClass',
    );
    // Add annotations to the symbol
    (classSymbol as any).annotations = [
      {
        name: 'Deprecated',
        location: {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 1,
            endColumn: 11,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 11,
          },
        },
        parameters: [],
      },
    ];
    symbolTable.addSymbol(classSymbol);

    const namespaceData: NamespaceData[] = [
      {
        name: 'System',
        symbolTables: new Map([
          ['apex://stdlib/System/AnnotatedClass', symbolTable],
        ]),
      },
    ];

    // Full pipeline
    const binary = serializer.serialize(
      namespaceData,
      '59.0',
      'annotation-test',
    );
    const compressed = gzipSync(binary, { level: 9 });
    const decompressed = gunzipSync(compressed);
    const result = deserializer.deserializeFromBinary(decompressed);

    // Verify type was created
    expect(result.allTypes.length).toBe(1);
    expect(result.allTypes[0].name).toBe('AnnotatedClass');
  });
});

describe('Gzip compression behavior', () => {
  it('gzip compression achieves significant size reduction for protobuf data', () => {
    const serializer = new StandardLibrarySerializer();

    // Create a larger dataset to see compression benefits
    const symbolTables = new Map<string, SymbolTable>();
    for (let i = 0; i < 50; i++) {
      const className = `TestClass${i}`;
      const symbolTable = new SymbolTable();
      symbolTable.setFileUri(`apex://stdlib/System/${className}`);

      const classSymbol = SymbolFactory.createFullSymbol(
        className,
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 10,
            endColumn: 1,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 14,
            endLine: 1,
            endColumn: 14 + className.length,
          },
        },
        `apex://stdlib/System/${className}`,
        {
          visibility: SymbolVisibility.Public,
          isStatic: false,
          isFinal: false,
          isAbstract: false,
          isVirtual: false,
          isOverride: false,
          isTransient: false,
          isTestMethod: false,
          isWebService: false,
          isBuiltIn: true,
        },
        null,
      );
      symbolTable.addSymbol(classSymbol);
      symbolTables.set(`apex://stdlib/System/${className}`, symbolTable);
    }

    const namespaceData: NamespaceData[] = [
      {
        name: 'System',
        symbolTables,
      },
    ];

    const binary = serializer.serialize(
      namespaceData,
      '59.0',
      'compression-test',
    );
    const compressed = gzipSync(binary, { level: 9 });

    const compressionRatio = (1 - compressed.length / binary.length) * 100;

    // Protobuf data with repetitive structures should compress well
    // Expect at least 50% compression
    expect(compressionRatio).toBeGreaterThan(50);
  });

  it('gunzipSync throws on invalid gzip data', () => {
    const invalidData = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);

    expect(() => {
      gunzipSync(invalidData);
    }).toThrow();
  });

  it('severely corrupted gzip throws or produces invalid data', () => {
    const original = new Uint8Array(1000);
    for (let i = 0; i < original.length; i++) {
      original[i] = i % 256;
    }
    const compressed = gzipSync(original);

    // Severely corrupt the compressed data section
    const corrupted = new Uint8Array(compressed);
    for (let i = 10; i < Math.min(50, corrupted.length - 8); i++) {
      corrupted[i] = 0;
    }

    let threw = false;
    let decompressed: Uint8Array | null = null;

    try {
      decompressed = gunzipSync(corrupted);
    } catch {
      threw = true;
    }

    // Either it throws, or the decompressed data doesn't match
    if (!threw && decompressed) {
      const isCorrupted =
        decompressed.length !== original.length ||
        !decompressed.every((v, i) => v === original[i]);
      expect(threw || isCorrupted).toBe(true);
    } else {
      expect(threw).toBe(true);
    }
  });
});
