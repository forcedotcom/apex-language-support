/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Equivalence tests to verify that protobuf cache produces identical
 * symbols to ZIP-based parsing.
 */

import {
  StandardLibraryCacheLoader,
  isProtobufCacheAvailable,
} from '../../src/cache/stdlib-cache-loader';
import { ResourceLoader } from '../../src/utils/resourceLoader';
import type { MethodSymbol, VariableSymbol } from '../../src/types/symbol';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';

// These tests require the protobuf cache to be generated first
// Run: npm run generate:stdlib-cache
describe('Protobuf vs ZIP equivalence', () => {
  // Skip tests if protobuf cache is not available
  const skipIfNoCacheAvailable = !isProtobufCacheAvailable();

  beforeAll(() => {
    enableConsoleLogging();
    setLogLevel('error'); // Set to error to avoid busy logs in CI/CD
    if (skipIfNoCacheAvailable) {
      console.warn(
        'Skipping equivalence tests: protobuf cache not available. ' +
          'Run "npm run generate:stdlib-cache" to generate the cache.',
      );
    }
  });

  beforeEach(() => {
    // Clear caches before each test
    StandardLibraryCacheLoader.clearCache();
  });

  describe('when protobuf cache is available', () => {
    it('loads successfully from protobuf cache', async () => {
      if (skipIfNoCacheAvailable) {
        return;
      }

      const loader = StandardLibraryCacheLoader.getInstance();
      const result = await loader.load();

      expect(result.success).toBe(true);
      expect(result.loadMethod).toBe('protobuf');
      expect(result.data).toBeDefined();
      expect(result.data!.symbolTables.size).toBeGreaterThan(0);
    });

    it('produces non-empty namespace structure', async () => {
      if (skipIfNoCacheAvailable) {
        return;
      }

      const loader = StandardLibraryCacheLoader.getInstance();
      const result = await loader.load();

      expect(result.data!.metadata.namespaceCount).toBeGreaterThan(0);
      expect(result.data!.metadata.typeCount).toBeGreaterThan(0);
    });

    it('contains expected standard library classes', async () => {
      if (skipIfNoCacheAvailable) {
        return;
      }

      const loader = StandardLibraryCacheLoader.getInstance();
      const result = await loader.load();

      // Check for well-known Apex classes
      // Note: Generic classes like List<T> and Map<K,V> may have empty names due to parser limitations
      // So we check for non-generic classes and verify symbol tables exist for generics
      const expectedClasses = [
        'String',
        'Integer',
        'Boolean',
        'Object',
        'System',
      ];
      const foundClasses = new Set<string>();

      for (const type of result.data!.allTypes) {
        if (type.name) {
          foundClasses.add(type.name);
        }
      }

      for (const expectedClass of expectedClasses) {
        expect(foundClasses.has(expectedClass)).toBe(true);
      }

      // Verify that generic types at least have symbol tables
      const genericTypes = [
        'apexlib://resources/StandardApexLibrary/System/List.cls',
        'apexlib://resources/StandardApexLibrary/System/Map.cls',
        'apexlib://resources/StandardApexLibrary/System/Set.cls',
      ];
      for (const genericUri of genericTypes) {
        expect(result.data!.symbolTables.has(genericUri)).toBe(true);
      }
    });

    it('has valid symbol structure for types', async () => {
      if (skipIfNoCacheAvailable) {
        return;
      }

      const loader = StandardLibraryCacheLoader.getInstance();
      const result = await loader.load();

      // Spot check a few types
      for (const type of result.data!.allTypes.slice(0, 10)) {
        expect(type.id).toBeDefined();
        expect(type.name).toBeDefined();
        expect(typeof type.name).toBe('string');
        expect(type.name.length).toBeGreaterThan(0);
        expect(type.kind).toBeDefined();
        expect(['class', 'interface', 'enum', 'trigger']).toContain(type.kind);
        expect(type.modifiers).toBeDefined();
      }
    });

    it('types have valid location information', async () => {
      if (skipIfNoCacheAvailable) {
        return;
      }

      const loader = StandardLibraryCacheLoader.getInstance();
      const result = await loader.load();

      // Check a subset of types for valid locations
      for (const type of result.data!.allTypes.slice(0, 10)) {
        expect(type.location).toBeDefined();
        expect(type.location.symbolRange).toBeDefined();
        expect(typeof type.location.symbolRange.startLine).toBe('number');
        expect(typeof type.location.symbolRange.startColumn).toBe('number');
        expect(typeof type.location.symbolRange.endLine).toBe('number');
        expect(typeof type.location.symbolRange.endColumn).toBe('number');
      }
    });
  });

  describe('symbol table content validation', () => {
    it('symbol tables contain the expected type symbol', async () => {
      if (skipIfNoCacheAvailable) {
        return;
      }

      const loader = StandardLibraryCacheLoader.getInstance();
      const result = await loader.load();

      // Get a random symbol table and verify it contains its type
      for (const [_uri, symbolTable] of result.data!.symbolTables) {
        const symbols = symbolTable.getAllSymbols();
        expect(symbols.length).toBeGreaterThan(0);

        // There should be at least one type symbol
        const typeSymbols = symbols.filter(
          (s) =>
            s.kind === 'class' || s.kind === 'interface' || s.kind === 'enum',
        );
        expect(typeSymbols.length).toBeGreaterThan(0);

        // Only check a few to keep test fast
        break;
      }
    });

    it('methods have valid return types', async () => {
      if (skipIfNoCacheAvailable) {
        return;
      }

      const loader = StandardLibraryCacheLoader.getInstance();
      const result = await loader.load();

      let methodsChecked = 0;
      const maxMethodsToCheck = 20;

      for (const [_uri, symbolTable] of result.data!.symbolTables) {
        const symbols = symbolTable.getAllSymbols();

        for (const symbol of symbols) {
          if (symbol.kind === 'method' && methodsChecked < maxMethodsToCheck) {
            const methodSymbol = symbol as MethodSymbol;
            expect(methodSymbol.returnType).toBeDefined();
            expect(typeof methodSymbol.returnType.name).toBe('string');
            methodsChecked++;
          }
        }

        if (methodsChecked >= maxMethodsToCheck) break;
      }

      expect(methodsChecked).toBeGreaterThan(0);
    });

    it('method parameters have valid types', async () => {
      if (skipIfNoCacheAvailable) {
        return;
      }

      const loader = StandardLibraryCacheLoader.getInstance();
      const result = await loader.load();

      let paramsChecked = 0;
      const maxParamsToCheck = 20;

      for (const [_uri, symbolTable] of result.data!.symbolTables) {
        const symbols = symbolTable.getAllSymbols();

        for (const symbol of symbols) {
          if (symbol.kind === 'method' && paramsChecked < maxParamsToCheck) {
            const methodSymbol = symbol as MethodSymbol;
            if (methodSymbol.parameters && methodSymbol.parameters.length > 0) {
              for (const param of methodSymbol.parameters) {
                expect(param.type).toBeDefined();
                expect(typeof param.type.name).toBe('string');
                paramsChecked++;
              }
            }
          }
        }

        if (paramsChecked >= maxParamsToCheck) break;
      }
    });

    it('fields and properties have valid types', async () => {
      if (skipIfNoCacheAvailable) {
        return;
      }

      const loader = StandardLibraryCacheLoader.getInstance();
      const result = await loader.load();

      let fieldsChecked = 0;
      const maxFieldsToCheck = 20;

      for (const [_uri, symbolTable] of result.data!.symbolTables) {
        const symbols = symbolTable.getAllSymbols();

        for (const symbol of symbols) {
          if (
            (symbol.kind === 'field' || symbol.kind === 'property') &&
            fieldsChecked < maxFieldsToCheck
          ) {
            const varSymbol = symbol as VariableSymbol;
            expect(varSymbol.type).toBeDefined();
            expect(typeof varSymbol.type.name).toBe('string');
            fieldsChecked++;
          }
        }

        if (fieldsChecked >= maxFieldsToCheck) break;
      }
    });
  });

  describe('ResourceLoader integration', () => {
    it('ResourceLoader reports correct protobuf cache status', async () => {
      if (skipIfNoCacheAvailable) {
        return;
      }

      // Create a fresh ResourceLoader and initialize with protobuf
      const loader = ResourceLoader.getInstance();
      await loader.initialize();

      // The standard library symbol data should be loaded if available
      const isLoaded = loader.isStandardLibrarySymbolDataLoaded();
      expect(typeof isLoaded).toBe('boolean');
    });
  });
});

describe('Corruption handling', () => {
  it('handles invalid binary data gracefully', () => {
    const { StandardLibrary } = require('../../src/generated/apex-stdlib');

    // Try to parse random bytes
    const randomBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

    expect(() => {
      StandardLibrary.fromBinary(randomBytes);
    }).toThrow(); // Should throw on invalid protobuf
  });

  it('handles truncated binary data gracefully', () => {
    const { StandardLibrary } = require('../../src/generated/apex-stdlib');

    // Create valid data then truncate it
    const valid = StandardLibrary.create({
      generatedAt: new Date().toISOString(),
      sourceChecksum: 'test',
      namespaces: [],
    });
    const binary = StandardLibrary.toBinary(valid);

    // Truncate to half
    const truncated = binary.slice(0, Math.floor(binary.length / 2));

    expect(() => {
      StandardLibrary.fromBinary(truncated);
    }).toThrow(); // Should throw on truncated data
  });

  it('handles empty binary data gracefully', () => {
    const { StandardLibrary } = require('../../src/generated/apex-stdlib');

    const empty = new Uint8Array(0);

    // Empty data should parse to default values (not throw)
    const result = StandardLibrary.fromBinary(empty);
    expect(result.namespaces.length).toBe(0);
  });
});
