/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Tests for binary cache serialization and deserialization.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { gzipSync, gunzipSync } from 'fflate';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
  SymbolVisibility,
  SymbolModifiers,
  SymbolLocation,
  TypeSymbol,
  MethodSymbol,
  VariableSymbol,
} from '../../src/types/symbol';
import { BinarySerializer } from '../../src/cache/binary-serializer';
import { BinaryDeserializer } from '../../src/cache/binary-deserializer';
import {
  StringTableBuilder,
  StringTableReader,
} from '../../src/cache/string-table';
import {
  BINARY_FORMAT_MAGIC,
  BINARY_FORMAT_VERSION,
  HEADER_SIZE,
  readHeader,
  validateHeader,
} from '../../src/cache/binary-format';
import { TypeRegistryEntry } from '../../src/services/GlobalTypeRegistryService';

/**
 * Create default symbol modifiers for testing
 */
function createDefaultModifiers(
  overrides: Partial<SymbolModifiers> = {},
): SymbolModifiers {
  return {
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
    ...overrides,
  };
}

/**
 * Create a default symbol location for testing
 */
function createDefaultLocation(): SymbolLocation {
  return {
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
  };
}

/**
 * Create a test symbol table with a class
 */
function createTestSymbolTable(
  className: string = 'TestClass',
  namespace: string = 'System',
): SymbolTable {
  const fileUri = `apexlib://resources/StandardApexLibrary/${namespace}/${className}.cls`;
  const symbolTable = new SymbolTable();
  symbolTable.setFileUri(fileUri);

  const classSymbol = SymbolFactory.createFullSymbol(
    className,
    SymbolKind.Class,
    createDefaultLocation(),
    fileUri,
    createDefaultModifiers(),
    null,
    undefined,
    `${namespace}.${className}`,
    namespace,
  ) as TypeSymbol;
  classSymbol.interfaces = [];
  symbolTable.addSymbol(classSymbol);

  return symbolTable;
}

/**
 * Create a symbol table with method and field
 */
function createSymbolTableWithMembers(
  className: string = 'TestClass',
  namespace: string = 'System',
): SymbolTable {
  const fileUri = `apexlib://resources/StandardApexLibrary/${namespace}/${className}.cls`;
  const symbolTable = new SymbolTable();
  symbolTable.setFileUri(fileUri);

  // Add class
  const classSymbol = SymbolFactory.createFullSymbol(
    className,
    SymbolKind.Class,
    createDefaultLocation(),
    fileUri,
    createDefaultModifiers(),
    null,
    undefined,
    `${namespace}.${className}`,
    namespace,
  ) as TypeSymbol;
  classSymbol.interfaces = [];
  symbolTable.addSymbol(classSymbol);

  // Add method
  const methodSymbol = SymbolFactory.createFullSymbol(
    'testMethod',
    SymbolKind.Method,
    {
      symbolRange: { startLine: 3, startColumn: 4, endLine: 5, endColumn: 5 },
      identifierRange: {
        startLine: 3,
        startColumn: 18,
        endLine: 3,
        endColumn: 28,
      },
    },
    fileUri,
    createDefaultModifiers(),
    classSymbol.id,
    undefined,
    `${namespace}.${className}.testMethod`,
    namespace,
  ) as MethodSymbol;
  methodSymbol.returnType = {
    name: 'void',
    originalTypeString: 'void',
    isArray: false,
    isCollection: false,
    isPrimitive: true,
    isBuiltIn: true,
    getNamespace: () => null,
  };
  methodSymbol.parameters = [];
  methodSymbol.isConstructor = false;
  methodSymbol.hasBody = true;
  symbolTable.addSymbol(methodSymbol);

  // Add field
  const fieldSymbol = SymbolFactory.createFullSymbol(
    'testField',
    SymbolKind.Field,
    {
      symbolRange: { startLine: 2, startColumn: 4, endLine: 2, endColumn: 30 },
      identifierRange: {
        startLine: 2,
        startColumn: 18,
        endLine: 2,
        endColumn: 27,
      },
    },
    fileUri,
    createDefaultModifiers({ visibility: SymbolVisibility.Private }),
    classSymbol.id,
    undefined,
    `${namespace}.${className}.testField`,
    namespace,
  ) as VariableSymbol;
  fieldSymbol.type = {
    name: 'String',
    originalTypeString: 'String',
    isArray: false,
    isCollection: false,
    isPrimitive: false,
    isBuiltIn: true,
    getNamespace: () => null,
  };
  symbolTable.addSymbol(fieldSymbol);

  return symbolTable;
}

/**
 * Create test type registry entries
 */
function createTestTypeRegistryEntries(): TypeRegistryEntry[] {
  return [
    {
      fqn: 'system.testclass',
      name: 'TestClass',
      namespace: 'System',
      kind: SymbolKind.Class,
      symbolId: 'test-class-id',
      fileUri: 'apexlib://resources/StandardApexLibrary/System/TestClass.cls',
      isStdlib: true,
    },
    {
      fqn: 'system.string',
      name: 'String',
      namespace: 'System',
      kind: SymbolKind.Class,
      symbolId: 'string-id',
      fileUri: 'apexlib://resources/StandardApexLibrary/System/String.cls',
      isStdlib: true,
    },
  ];
}

describe('StringTable', () => {
  describe('StringTableBuilder', () => {
    it('should intern empty string at index 0', () => {
      const builder = new StringTableBuilder();
      expect(builder.intern('')).toBe(0);
      expect(builder.get(0)).toBe('');
    });

    it('should intern strings and return consistent indices', () => {
      const builder = new StringTableBuilder();
      const index1 = builder.intern('hello');
      const index2 = builder.intern('world');
      const index3 = builder.intern('hello'); // duplicate

      expect(index1).toBeGreaterThan(0);
      expect(index2).toBeGreaterThan(index1);
      expect(index3).toBe(index1); // same index for duplicate
    });

    it('should handle null/undefined as empty string', () => {
      const builder = new StringTableBuilder();
      expect(builder.intern(null as any)).toBe(0);
      expect(builder.intern(undefined as any)).toBe(0);
    });

    it('should serialize to binary and deserialize correctly', () => {
      const builder = new StringTableBuilder();
      builder.intern('System');
      builder.intern('TestClass');
      builder.intern('method1');

      const serialized = builder.serialize();
      const reader = new StringTableReader(serialized);

      expect(reader.get(0)).toBe('');
      expect(reader.get(1)).toBe('System');
      expect(reader.get(2)).toBe('TestClass');
      expect(reader.get(3)).toBe('method1');
    });

    it('should handle unicode strings', () => {
      const builder = new StringTableBuilder();
      const unicodeStr = '你好世界'; // Hello World in Chinese
      const index = builder.intern(unicodeStr);

      const serialized = builder.serialize();
      const reader = new StringTableReader(serialized);

      expect(reader.get(index)).toBe(unicodeStr);
    });
  });

  describe('StringTableReader', () => {
    it('should throw for out of bounds index', () => {
      const builder = new StringTableBuilder();
      builder.intern('test');
      const serialized = builder.serialize();
      const reader = new StringTableReader(serialized);

      expect(() => reader.get(100)).toThrow('String index out of bounds');
      expect(() => reader.get(-1)).toThrow('String index out of bounds');
    });

    it('should cache decoded strings', () => {
      const builder = new StringTableBuilder();
      builder.intern('cached');
      const serialized = builder.serialize();
      const reader = new StringTableReader(serialized);

      // First access
      const str1 = reader.get(1);
      // Second access (should use cache)
      const str2 = reader.get(1);

      expect(str1).toBe('cached');
      expect(str2).toBe('cached');
    });
  });
});

describe('BinaryFormat', () => {
  describe('Header', () => {
    it('should have correct magic number constant', () => {
      expect(BINARY_FORMAT_MAGIC).toBe(0x58455041); // "APEX"
    });

    it('should have correct header size', () => {
      expect(HEADER_SIZE).toBe(64);
    });

    it('should validate correct header', () => {
      const buffer = new ArrayBuffer(64);
      const view = new DataView(buffer);
      view.setUint32(0, BINARY_FORMAT_MAGIC, true);
      view.setUint32(4, BINARY_FORMAT_VERSION, true);

      const header = readHeader(view);
      expect(() => validateHeader(header)).not.toThrow();
    });

    it('should reject invalid magic number', () => {
      const buffer = new ArrayBuffer(64);
      const view = new DataView(buffer);
      view.setUint32(0, 0x12345678, true); // wrong magic
      view.setUint32(4, BINARY_FORMAT_VERSION, true);

      const header = readHeader(view);
      expect(() => validateHeader(header)).toThrow(
        'Invalid binary format: wrong magic number',
      );
    });

    it('should reject unsupported version', () => {
      const buffer = new ArrayBuffer(64);
      const view = new DataView(buffer);
      view.setUint32(0, BINARY_FORMAT_MAGIC, true);
      view.setUint32(4, 999, true); // unsupported version

      const header = readHeader(view);
      expect(() => validateHeader(header)).toThrow(
        'Unsupported binary format version',
      );
    });
  });
});

describe('BinarySerializer', () => {
  let serializer: BinarySerializer;

  beforeEach(() => {
    serializer = new BinarySerializer();
  });

  it('should serialize empty symbol tables', () => {
    const result = serializer.serialize({
      symbolTables: new Map(),
      typeRegistryEntries: [],
      sourceChecksum: 'test-checksum',
    });

    expect(result.buffer).toBeInstanceOf(Uint8Array);
    expect(result.stats.symbolCount).toBe(0);
    expect(result.stats.typeEntryCount).toBe(0);
  });

  it('should serialize a simple symbol table', () => {
    const symbolTable = createTestSymbolTable('TestClass');
    const symbolTables = new Map([
      [
        'apexlib://resources/StandardApexLibrary/System/TestClass.cls',
        symbolTable,
      ],
    ]);

    const result = serializer.serialize({
      symbolTables,
      typeRegistryEntries: createTestTypeRegistryEntries(),
      sourceChecksum: 'test-checksum',
    });

    expect(result.stats.symbolCount).toBeGreaterThan(0);
    expect(result.stats.typeEntryCount).toBe(2);
    expect(result.stats.fileCount).toBe(1);
  });

  it('should serialize symbol table with members', () => {
    const symbolTable = createSymbolTableWithMembers('TestClass');
    const symbolTables = new Map([
      [
        'apexlib://resources/StandardApexLibrary/System/TestClass.cls',
        symbolTable,
      ],
    ]);

    const result = serializer.serialize({
      symbolTables,
      typeRegistryEntries: createTestTypeRegistryEntries(),
      sourceChecksum: 'test-checksum',
    });

    expect(result.stats.symbolCount).toBe(3); // class + method + field
  });

  it('should produce valid header', () => {
    const symbolTable = createTestSymbolTable('TestClass');
    const symbolTables = new Map([
      [
        'apexlib://resources/StandardApexLibrary/System/TestClass.cls',
        symbolTable,
      ],
    ]);

    const result = serializer.serialize({
      symbolTables,
      typeRegistryEntries: [],
      sourceChecksum: 'test-checksum',
    });

    const view = new DataView(
      result.buffer.buffer,
      result.buffer.byteOffset,
      result.buffer.byteLength,
    );
    const header = readHeader(view);

    expect(header.magic).toBe(BINARY_FORMAT_MAGIC);
    expect(header.version).toBe(BINARY_FORMAT_VERSION);
    expect(header.symbolCount).toBe(1);
  });
});

describe('BinaryDeserializer', () => {
  let serializer: BinarySerializer;

  beforeEach(() => {
    serializer = new BinarySerializer();
  });

  it('should deserialize empty data', () => {
    const result = serializer.serialize({
      symbolTables: new Map(),
      typeRegistryEntries: [],
      sourceChecksum: 'test-checksum',
    });

    const deserializer = new BinaryDeserializer(result.buffer);
    const deserialized = deserializer.deserialize();

    expect(deserialized.symbolTables.size).toBe(0);
    expect(deserialized.typeRegistryEntries.length).toBe(0);
  });

  it('should deserialize simple symbol table', () => {
    const symbolTable = createTestSymbolTable('TestClass');
    const fileUri =
      'apexlib://resources/StandardApexLibrary/System/TestClass.cls';
    const symbolTables = new Map([[fileUri, symbolTable]]);

    const result = serializer.serialize({
      symbolTables,
      typeRegistryEntries: [],
      sourceChecksum: 'test-checksum',
    });

    const deserializer = new BinaryDeserializer(result.buffer);
    const deserialized = deserializer.deserialize();

    expect(deserialized.symbolTables.size).toBe(1);
    expect(deserialized.symbolTables.has(fileUri)).toBe(true);

    const loadedTable = deserialized.symbolTables.get(fileUri)!;
    const symbols = loadedTable.getAllSymbols();
    expect(symbols.length).toBe(1);
    expect(symbols[0].name).toBe('TestClass');
    expect(symbols[0].kind).toBe(SymbolKind.Class);
  });

  it('should deserialize type registry entries', () => {
    const entries = createTestTypeRegistryEntries();
    const result = serializer.serialize({
      symbolTables: new Map(),
      typeRegistryEntries: entries,
      sourceChecksum: 'test-checksum',
    });

    const deserializer = new BinaryDeserializer(result.buffer);
    const deserialized = deserializer.deserialize();

    expect(deserialized.typeRegistryEntries.length).toBe(2);
    expect(deserialized.typeRegistryEntries[0].name).toBe('TestClass');
    expect(deserialized.typeRegistryEntries[1].name).toBe('String');
  });

  it('should build pre-built indexes', () => {
    const entries = createTestTypeRegistryEntries();
    const result = serializer.serialize({
      symbolTables: new Map(),
      typeRegistryEntries: entries,
      sourceChecksum: 'test-checksum',
    });

    const deserializer = new BinaryDeserializer(result.buffer);
    const deserialized = deserializer.deserialize();

    // FQN index
    expect(deserialized.preBuiltFqnIndex.size).toBe(2);
    expect(deserialized.preBuiltFqnIndex.has('system.testclass')).toBe(true);
    expect(deserialized.preBuiltFqnIndex.has('system.string')).toBe(true);

    // Name index
    expect(deserialized.preBuiltNameIndex.size).toBeGreaterThan(0);
  });

  it('should preserve symbol location data', () => {
    const symbolTable = createTestSymbolTable('TestClass');
    const fileUri =
      'apexlib://resources/StandardApexLibrary/System/TestClass.cls';
    const symbolTables = new Map([[fileUri, symbolTable]]);

    const result = serializer.serialize({
      symbolTables,
      typeRegistryEntries: [],
      sourceChecksum: 'test-checksum',
    });

    const deserializer = new BinaryDeserializer(result.buffer);
    const deserialized = deserializer.deserialize();

    const loadedTable = deserialized.symbolTables.get(fileUri)!;
    const symbols = loadedTable.getAllSymbols();
    const classSymbol = symbols[0];

    expect(classSymbol.location.symbolRange.startLine).toBe(1);
    expect(classSymbol.location.symbolRange.endLine).toBe(10);
    expect(classSymbol.location.identifierRange.startLine).toBe(1);
  });

  it('should preserve modifier flags', () => {
    const symbolTable = createSymbolTableWithMembers('TestClass');
    const fileUri =
      'apexlib://resources/StandardApexLibrary/System/TestClass.cls';
    const symbolTables = new Map([[fileUri, symbolTable]]);

    const result = serializer.serialize({
      symbolTables,
      typeRegistryEntries: [],
      sourceChecksum: 'test-checksum',
    });

    const deserializer = new BinaryDeserializer(result.buffer);
    const deserialized = deserializer.deserialize();

    const loadedTable = deserialized.symbolTables.get(fileUri)!;
    const symbols = loadedTable.getAllSymbols();
    const classSymbol = symbols.find((s) => s.kind === SymbolKind.Class)!;
    const fieldSymbol = symbols.find((s) => s.kind === SymbolKind.Field)!;

    expect(classSymbol.modifiers.visibility).toBe(SymbolVisibility.Public);
    expect(classSymbol.modifiers.isBuiltIn).toBe(true);
    expect(fieldSymbol.modifiers.visibility).toBe(SymbolVisibility.Private);
  });
});

describe('Round-trip serialization', () => {
  it('should preserve all symbol data through round-trip', () => {
    const serializer = new BinarySerializer();
    const symbolTable = createSymbolTableWithMembers('RoundTripClass');
    const fileUri =
      'apexlib://resources/StandardApexLibrary/System/RoundTripClass.cls';
    const symbolTables = new Map([[fileUri, symbolTable]]);

    const entries: TypeRegistryEntry[] = [
      {
        fqn: 'system.roundtripclass',
        name: 'RoundTripClass',
        namespace: 'System',
        kind: SymbolKind.Class,
        symbolId: 'roundtrip-id',
        fileUri,
        isStdlib: true,
      },
    ];

    const result = serializer.serialize({
      symbolTables,
      typeRegistryEntries: entries,
      sourceChecksum: 'roundtrip-checksum',
    });

    const deserializer = new BinaryDeserializer(result.buffer);
    const deserialized = deserializer.deserialize();

    // Verify symbol table
    expect(deserialized.symbolTables.size).toBe(1);
    const loadedTable = deserialized.symbolTables.get(fileUri)!;
    expect(loadedTable).toBeDefined();

    // Verify symbols
    const symbols = loadedTable.getAllSymbols();
    expect(symbols.length).toBe(3); // class + method + field

    // Verify type registry
    expect(deserialized.typeRegistryEntries.length).toBe(1);
    expect(deserialized.typeRegistryEntries[0].fqn).toBe(
      'system.roundtripclass',
    );
  });

  it('should work with gzip compression', () => {
    const serializer = new BinarySerializer();
    const symbolTable = createTestSymbolTable('GzipClass');
    const fileUri =
      'apexlib://resources/StandardApexLibrary/System/GzipClass.cls';
    const symbolTables = new Map([[fileUri, symbolTable]]);

    const result = serializer.serialize({
      symbolTables,
      typeRegistryEntries: [],
      sourceChecksum: 'gzip-checksum',
    });

    // Compress
    const compressed = gzipSync(result.buffer, { level: 9 });
    expect(compressed.length).toBeLessThan(result.buffer.length);

    // Decompress and deserialize
    const decompressed = gunzipSync(compressed);
    const deserializer = new BinaryDeserializer(decompressed);
    const deserialized = deserializer.deserialize();

    expect(deserialized.symbolTables.size).toBe(1);
    const loadedTable = deserialized.symbolTables.get(fileUri)!;
    const symbols = loadedTable.getAllSymbols();
    expect(symbols[0].name).toBe('GzipClass');
  });
});
