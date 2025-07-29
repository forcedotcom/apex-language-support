/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolGraph } from '../../src/symbols/ApexSymbolGraph';
import {
  SymbolKind,
  SymbolVisibility,
  SymbolTable,
  SymbolFactory,
} from '../../src/types/symbol';

describe.skip('ApexSymbolGraph Phase 4: Context-Based Lookup', () => {
  let graph: ApexSymbolGraph;
  let symbolTable1: SymbolTable;
  let symbolTable2: SymbolTable;

  beforeEach(() => {
    graph = new ApexSymbolGraph();
    symbolTable1 = new SymbolTable();
    symbolTable2 = new SymbolTable();
  });

  describe('Context-based symbol lookup', () => {
    it('should lookup unambiguous symbols with full confidence', () => {
      // Create a unique symbol
      const uniqueSymbol = SymbolFactory.createFullSymbol(
        'UniqueClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 20 },
        '/path/to/file1.cls',
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
        },
        null,
        { superClass: undefined, interfaces: [] },
      );

      // Add symbol with symbol table
      graph.addSymbol(uniqueSymbol, '/path/to/file1.cls', symbolTable1);

      // Lookup with context
      const result = graph.lookupSymbolWithContext('UniqueClass');

      expect(result).not.toBeNull();
      expect(result!.symbol).toBe(uniqueSymbol);
      expect(result!.filePath).toBe('/path/to/file1.cls');
      expect(result!.confidence).toBe(1.0);
      expect(result!.isAmbiguous).toBe(false);
      expect(result!.candidates).toBeUndefined();
    });

    it('should resolve ambiguous symbols with context', () => {
      // Create two symbols with the same name in different files
      const symbol1 = SymbolFactory.createFullSymbol(
        'MyClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 20 },
        '/path/to/file1.cls',
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
        },
        null,
        { superClass: undefined, interfaces: [] },
      );

      const symbol2 = SymbolFactory.createFullSymbol(
        'MyClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 20 },
        '/path/to/file2.cls',
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
        },
        null,
        { superClass: undefined, interfaces: [] },
      );

      // Add both symbols with their symbol tables
      graph.addSymbol(symbol1, '/path/to/file1.cls', symbolTable1);
      graph.addSymbol(symbol2, '/path/to/file2.cls', symbolTable2);

      // Lookup with context
      const result = graph.lookupSymbolWithContext('MyClass');

      expect(result).not.toBeNull();
      expect(result!.isAmbiguous).toBe(true);
      expect(result!.confidence).toBe(0.5); // Medium confidence for ambiguous symbols
      expect(result!.candidates).toHaveLength(2);
      expect(result!.candidates!.map((c) => c.filePath)).toContain(
        '/path/to/file1.cls',
      );
      expect(result!.candidates!.map((c) => c.filePath)).toContain(
        '/path/to/file2.cls',
      );
    });

    it('should return null for non-existent symbols', () => {
      const result = graph.lookupSymbolWithContext('NonExistentClass');
      expect(result).toBeNull();
    });

    it('should include symbol table in candidates for ambiguous symbols', () => {
      // Create two symbols with the same name to make it ambiguous
      const symbol1 = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 20 },
        '/path/to/file1.cls',
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
        },
        null,
        { superClass: undefined, interfaces: [] },
      );

      const symbol2 = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 20 },
        '/path/to/file2.cls',
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
        },
        null,
        { superClass: undefined, interfaces: [] },
      );

      graph.addSymbol(symbol1, '/path/to/file1.cls', symbolTable1);
      graph.addSymbol(symbol2, '/path/to/file2.cls', symbolTable2);

      const result = graph.lookupSymbolWithContext('TestClass');
      expect(result).not.toBeNull();
      expect(result!.isAmbiguous).toBe(true);
      expect(result!.candidates).toHaveLength(2);
      expect(result!.candidates![0].symbolTable).toBe(symbolTable1);
      expect(result!.candidates![1].symbolTable).toBe(symbolTable2);
    });
  });

  describe('Symbol table integration', () => {
    it('should register symbol table when adding symbol', () => {
      const symbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 20 },
        '/path/to/file.cls',
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
        },
        null,
        { superClass: undefined, interfaces: [] },
      );

      graph.addSymbol(symbol, '/path/to/file.cls', symbolTable1);

      const retrievedTable = graph.getSymbolTableForFile('/path/to/file.cls');
      expect(retrievedTable).toBe(symbolTable1);
    });

    it('should register symbol table separately', () => {
      graph.registerSymbolTable(symbolTable1, '/path/to/file.cls');

      const retrievedTable = graph.getSymbolTableForFile('/path/to/file.cls');
      expect(retrievedTable).toBe(symbolTable1);
    });

    it('should return undefined for non-existent file', () => {
      const retrievedTable = graph.getSymbolTableForFile(
        '/path/to/nonexistent.cls',
      );
      expect(retrievedTable).toBeUndefined();
    });
  });

  describe('Clear and remove operations', () => {
    it('should clear symbol table storage on clear', () => {
      const symbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 20 },
        '/path/to/file.cls',
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
        },
        null,
        { superClass: undefined, interfaces: [] },
      );

      graph.addSymbol(symbol, '/path/to/file.cls', symbolTable1);
      expect(graph.getSymbolTableForFile('/path/to/file.cls')).toBe(
        symbolTable1,
      );

      graph.clear();
      expect(graph.getSymbolTableForFile('/path/to/file.cls')).toBeUndefined();
    });

    it('should remove symbol table on removeFile', () => {
      const symbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 20 },
        '/path/to/file.cls',
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
        },
        null,
        { superClass: undefined, interfaces: [] },
      );

      graph.addSymbol(symbol, '/path/to/file.cls', symbolTable1);
      expect(graph.getSymbolTableForFile('/path/to/file.cls')).toBe(
        symbolTable1,
      );

      graph.removeFile('/path/to/file.cls');
      expect(graph.getSymbolTableForFile('/path/to/file.cls')).toBeUndefined();
    });
  });

  describe('Backward compatibility', () => {
    it('should maintain existing lookup methods', () => {
      const symbol = SymbolFactory.createFullSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 10, endColumn: 20 },
        '/path/to/file.cls',
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
        },
        null,
        { superClass: undefined, interfaces: [] },
      );

      graph.addSymbol(symbol, '/path/to/file.cls');

      // Test existing methods still work
      const byName = graph.lookupSymbolByName('TestClass');
      expect(byName).toHaveLength(1);
      expect(byName[0]).toBe(symbol);

      const inFile = graph.getSymbolsInFile('/path/to/file.cls');
      expect(inFile).toHaveLength(1);
      expect(inFile[0]).toBe(symbol);

      const files = graph.getFilesForSymbol('TestClass');
      expect(files).toContain('/path/to/file.cls');
    });
  });
});
