/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Tests for gzip compression and decompression functionality.
 * Validates the compression/decompression round-trip and integration with protobuf.
 */

import { gzipSync, gunzipSync } from 'fflate';
import { StandardLibrarySerializer } from '../../src/cache/stdlib-serializer';
import { StandardLibraryDeserializer } from '../../src/cache/stdlib-deserializer';
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
  SymbolVisibility,
} from '../../src/types/symbol';

// Helper to create test data of various sizes
function createTestData(size: number): Uint8Array {
  const data = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    data[i] = i % 256;
  }
  return data;
}

// Helper to create a simple symbol table for testing
function createTestSymbolTable(className: string): SymbolTable {
  const symbolTable = new SymbolTable();
  symbolTable.setFileUri(`apex://stdlib/System/${className}`);

  const classSymbol = SymbolFactory.createFullSymbol(
    className,
    SymbolKind.Class,
    {
      symbolRange: { startLine: 1, startColumn: 0, endLine: 10, endColumn: 1 },
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

  return symbolTable;
}

describe('Gzip Compression', () => {
  describe('Compression/Decompression Round-trip', () => {
    it('gzipSync + gunzipSync returns identical data', () => {
      const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const compressed = gzipSync(original);
      const decompressed = gunzipSync(compressed);

      expect(decompressed).toEqual(original);
    });

    it('works with small data (< 1KB)', () => {
      const original = createTestData(100);
      const compressed = gzipSync(original);
      const decompressed = gunzipSync(compressed);

      expect(decompressed).toEqual(original);
      // Small data might not compress well
      expect(compressed.length).toBeGreaterThan(0);
    });

    it('works with medium data (1KB - 1MB)', () => {
      const original = createTestData(100 * 1024); // 100KB
      const compressed = gzipSync(original, { level: 9 });
      const decompressed = gunzipSync(compressed);

      expect(decompressed).toEqual(original);
      // Repetitive data should compress well
      expect(compressed.length).toBeLessThan(original.length);
    });

    it('works with protobuf binary data', () => {
      const serializer = new StandardLibrarySerializer();
      const symbolTable = createTestSymbolTable('TestClass');

      const namespaceData = [
        {
          name: 'System',
          symbolTables: new Map([
            ['apex://stdlib/System/TestClass', symbolTable],
          ]),
        },
      ];

      const protobufBinary = serializer.serialize(
        namespaceData,
        '59.0',
        'test-checksum',
      );

      const compressed = gzipSync(protobufBinary, { level: 9 });
      const decompressed = gunzipSync(compressed);

      expect(decompressed).toEqual(protobufBinary);
    });

    it('preserves empty array', () => {
      const original = new Uint8Array(0);
      const compressed = gzipSync(original);
      const decompressed = gunzipSync(compressed);

      expect(decompressed).toEqual(original);
      expect(decompressed.length).toBe(0);
    });
  });

  describe('Decompression Error Handling', () => {
    it('throws on invalid gzip magic bytes', () => {
      const invalidData = new Uint8Array([0x00, 0x01, 0x02, 0x03]);

      expect(() => {
        gunzipSync(invalidData);
      }).toThrow();
    });

    it('throws or produces different data when gzip is severely corrupted', () => {
      const original = createTestData(1000);
      const compressed = gzipSync(original);

      // Severely corrupt the compressed data section (not just checksum)
      // Overwrite the compressed data portion which should break the DEFLATE stream
      const corrupted = new Uint8Array(compressed);
      // Zero out a significant portion of the compressed data
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

      // Either it throws, or the decompressed data doesn't match original
      if (!threw && decompressed) {
        // If it didn't throw, the data should be corrupted
        // (it might succeed but with wrong data)
        const isCorrupted =
          decompressed.length !== original.length ||
          !decompressed.every((v, i) => v === original[i]);
        expect(threw || isCorrupted).toBe(true);
      } else {
        expect(threw).toBe(true);
      }
    });

    it('throws on truncated gzip data', () => {
      const original = createTestData(1000);
      const compressed = gzipSync(original);

      // Truncate the data
      const truncated = compressed.slice(0, compressed.length / 2);

      expect(() => {
        gunzipSync(truncated);
      }).toThrow();
    });

    it('handles gzip header only (no content)', () => {
      // Minimal gzip with no compressed content - this is malformed
      const headerOnly = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]);

      expect(() => {
        gunzipSync(headerOnly);
      }).toThrow();
    });
  });

  describe('Compression Ratio', () => {
    it('achieves significant compression for protobuf data', () => {
      const serializer = new StandardLibrarySerializer();

      // Create multiple symbol tables to get more realistic data
      const symbolTables = new Map<string, SymbolTable>();
      for (let i = 0; i < 100; i++) {
        const className = `TestClass${i}`;
        symbolTables.set(
          `apex://stdlib/System/${className}`,
          createTestSymbolTable(className),
        );
      }

      const namespaceData = [
        {
          name: 'System',
          symbolTables,
        },
      ];

      const protobufBinary = serializer.serialize(
        namespaceData,
        '59.0',
        'test-checksum',
      );

      const compressed = gzipSync(protobufBinary, { level: 9 });

      const compressionRatio =
        (1 - compressed.length / protobufBinary.length) * 100;

      // Protobuf data should compress well - expect at least 50% reduction
      expect(compressionRatio).toBeGreaterThan(50);
    });

    it('compression level 9 produces smaller output than level 1', () => {
      const data = createTestData(10000);

      const compressedLevel1 = gzipSync(data, { level: 1 });
      const compressedLevel9 = gzipSync(data, { level: 9 });

      // Higher compression level should produce smaller output
      expect(compressedLevel9.length).toBeLessThanOrEqual(
        compressedLevel1.length,
      );
    });
  });

  describe('Integration with Protobuf', () => {
    it('full round-trip: Serialize -> Compress -> Decompress -> Deserialize', () => {
      const serializer = new StandardLibrarySerializer();
      const deserializer = new StandardLibraryDeserializer();

      // Create test data
      const symbolTable = createTestSymbolTable('RoundTripTest');
      const namespaceData = [
        {
          name: 'System',
          symbolTables: new Map([
            ['apex://stdlib/System/RoundTripTest', symbolTable],
          ]),
        },
      ];

      // Serialize to protobuf
      const protobufBinary = serializer.serialize(
        namespaceData,
        '59.0',
        'round-trip-checksum',
      );

      // Compress
      const compressed = gzipSync(protobufBinary, { level: 9 });

      // Decompress
      const decompressed = gunzipSync(compressed);

      // Deserialize
      const result = deserializer.deserializeFromBinary(decompressed);

      // Verify data integrity
      expect(result.metadata.version).toBe('59.0');
      expect(result.metadata.sourceChecksum).toBe('round-trip-checksum');
      expect(result.metadata.namespaceCount).toBe(1);
      expect(result.metadata.typeCount).toBe(1);
      expect(result.allTypes[0].name).toBe('RoundTripTest');
      expect(result.allTypes[0].fqn).toBe('System.RoundTripTest');
    });

    it('verifies all data preserved through full cycle', () => {
      const serializer = new StandardLibrarySerializer();
      const deserializer = new StandardLibraryDeserializer();

      // Create more complex test data
      const symbolTables = new Map<string, SymbolTable>();
      const classNames = ['String', 'Integer', 'Boolean', 'Object', 'List'];

      for (const className of classNames) {
        symbolTables.set(
          `apex://stdlib/System/${className}`,
          createTestSymbolTable(className),
        );
      }

      const namespaceData = [
        {
          name: 'System',
          symbolTables,
        },
      ];

      // Full pipeline
      const binary = serializer.serialize(namespaceData, '60.0', 'multi-type');
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

    it('verifies metadata integrity through compression', () => {
      const serializer = new StandardLibrarySerializer();
      const deserializer = new StandardLibraryDeserializer();

      const symbolTable = createTestSymbolTable('MetadataTest');
      const namespaceData = [
        {
          name: 'Test',
          symbolTables: new Map([
            ['apex://stdlib/Test/MetadataTest', symbolTable],
          ]),
        },
      ];

      const version = '61.0';
      const checksum = 'metadata-integrity-test-12345';

      const binary = serializer.serialize(namespaceData, version, checksum);
      const compressed = gzipSync(binary);
      const decompressed = gunzipSync(compressed);
      const result = deserializer.deserializeFromBinary(decompressed);

      expect(result.metadata.version).toBe(version);
      expect(result.metadata.sourceChecksum).toBe(checksum);
      expect(result.metadata.generatedAt).toBeDefined();
    });
  });

  describe('Base64 Encoding/Decoding with Gzip', () => {
    it('handles base64 encode/decode of gzipped data', () => {
      const original = createTestData(1000);
      const compressed = gzipSync(original);

      // Simulate what happens in data URL
      const base64 = Buffer.from(compressed).toString('base64');
      const decoded = Buffer.from(base64, 'base64');
      const decompressed = gunzipSync(new Uint8Array(decoded));

      expect(decompressed).toEqual(original);
    });

    it('full pipeline: data -> gzip -> base64 -> decode -> gunzip -> data', () => {
      const serializer = new StandardLibrarySerializer();
      const deserializer = new StandardLibraryDeserializer();

      // Create protobuf data
      const symbolTable = createTestSymbolTable('Base64Test');
      const namespaceData = [
        {
          name: 'System',
          symbolTables: new Map([
            ['apex://stdlib/System/Base64Test', symbolTable],
          ]),
        },
      ];

      const protobufBinary = serializer.serialize(
        namespaceData,
        '59.0',
        'base64-test',
      );

      // Compress
      const compressed = gzipSync(protobufBinary, { level: 9 });

      // Encode to base64 (simulating data URL)
      const base64 = Buffer.from(compressed).toString('base64');

      // Decode from base64
      const decoded = Buffer.from(base64, 'base64');

      // Decompress
      const decompressed = gunzipSync(new Uint8Array(decoded));

      // Deserialize
      const result = deserializer.deserializeFromBinary(decompressed);

      expect(result.allTypes[0].name).toBe('Base64Test');
    });
  });

  describe('Edge Cases', () => {
    it('handles data with all zeros', () => {
      const zeros = new Uint8Array(10000);
      const compressed = gzipSync(zeros);
      const decompressed = gunzipSync(compressed);

      expect(decompressed).toEqual(zeros);
      // All zeros should compress very well
      expect(compressed.length).toBeLessThan(zeros.length / 10);
    });

    it('handles data with random bytes', () => {
      const random = new Uint8Array(1000);
      for (let i = 0; i < random.length; i++) {
        random[i] = Math.floor(Math.random() * 256);
      }

      const compressed = gzipSync(random);
      const decompressed = gunzipSync(compressed);

      expect(decompressed).toEqual(random);
    });

    it('handles very small data (1 byte)', () => {
      const tiny = new Uint8Array([42]);
      const compressed = gzipSync(tiny);
      const decompressed = gunzipSync(compressed);

      expect(decompressed).toEqual(tiny);
    });

    it('handles UTF-8 text data', () => {
      const text = 'Hello, World! 🌍 こんにちは';
      const encoder = new TextEncoder();
      const original = encoder.encode(text);

      const compressed = gzipSync(original);
      const decompressed = gunzipSync(compressed);

      const decoder = new TextDecoder();
      const decoded = decoder.decode(decompressed);

      expect(decoded).toBe(text);
    });
  });
});
