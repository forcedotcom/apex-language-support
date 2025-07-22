/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  GlobalSymbolRegistry,
  ResolutionContext,
} from '../../src/utils/GlobalSymbolRegistry';
import {
  SymbolTable,
  ApexSymbol,
  SymbolKind,
  SymbolVisibility,
} from '../../src/types/symbol';

describe('GlobalSymbolRegistry', () => {
  let globalRegistry: GlobalSymbolRegistry;
  let mockSymbolTable: SymbolTable;
  let mockSymbol: ApexSymbol;

  beforeEach(() => {
    globalRegistry = new GlobalSymbolRegistry();
    mockSymbolTable = new SymbolTable();

    // Create a mock symbol
    mockSymbol = {
      name: 'TestClass',
      kind: SymbolKind.Class,
      location: {
        startLine: 1,
        startColumn: 0,
        endLine: 10,
        endColumn: 0,
      },
      modifiers: {
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
      key: {
        prefix: SymbolKind.Class,
        name: 'TestClass',
        path: ['TestClass'],
      },
      parentKey: null,
    };
  });

  describe('registerSymbol', () => {
    it('should register a single symbol', () => {
      globalRegistry.registerSymbol(mockSymbol, 'test.cls', mockSymbolTable);

      const result = globalRegistry.lookupSymbol('TestClass');
      expect(result).toBeDefined();
      expect(result?.symbol.name).toBe('TestClass');
      expect(result?.filePath).toBe('test.cls');
      expect(result?.confidence).toBe(1.0);
      expect(result?.isAmbiguous).toBe(false);
    });

    it('should handle multiple symbols with the same name', () => {
      const symbol1 = { ...mockSymbol, name: 'System' };
      const symbol2 = {
        ...mockSymbol,
        name: 'System',
        key: { ...mockSymbol.key, name: 'System' },
      };

      globalRegistry.registerSymbol(symbol1, 'file1.cls', mockSymbolTable);
      globalRegistry.registerSymbol(symbol2, 'file2.cls', mockSymbolTable);

      const result = globalRegistry.lookupSymbol('System');
      expect(result).toBeDefined();
      expect(result?.isAmbiguous).toBe(true);
      expect(result?.candidates).toHaveLength(2);
    });

    it('should update file mappings correctly', () => {
      globalRegistry.registerSymbol(mockSymbol, 'test.cls', mockSymbolTable);

      const files = globalRegistry.getFilesForSymbol('TestClass');
      expect(files).toContain('test.cls');

      const symbols = globalRegistry.getSymbolsInFile('test.cls');
      expect(symbols).toContain('TestClass');
    });
  });

  describe('registerSymbolTable', () => {
    it('should register all symbols from a symbol table', () => {
      // Add symbols to the mock symbol table
      mockSymbolTable.addSymbol(mockSymbol);

      const methodSymbol: ApexSymbol = {
        name: 'testMethod',
        kind: SymbolKind.Method,
        location: {
          startLine: 5,
          startColumn: 0,
          endLine: 8,
          endColumn: 0,
        },
        modifiers: {
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
        key: {
          prefix: SymbolKind.Method,
          name: 'testMethod',
          path: ['TestClass', 'testMethod'],
        },
        parentKey: mockSymbol.key,
      };

      mockSymbolTable.addSymbol(methodSymbol);

      globalRegistry.registerSymbolTable(mockSymbolTable, 'test.cls');

      const classResult = globalRegistry.lookupSymbol('TestClass');
      const methodResult = globalRegistry.lookupSymbol('testMethod');

      expect(classResult).toBeDefined();
      expect(methodResult).toBeDefined();
    });
  });

  describe('lookupSymbol', () => {
    it('should return null for non-existent symbol', () => {
      const result = globalRegistry.lookupSymbol('NonExistent');
      expect(result).toBeNull();
    });

    it('should return unambiguous symbol with high confidence', () => {
      globalRegistry.registerSymbol(mockSymbol, 'test.cls', mockSymbolTable);

      const result = globalRegistry.lookupSymbol('TestClass');
      expect(result?.confidence).toBe(1.0);
      expect(result?.isAmbiguous).toBe(false);
    });

    it('should handle ambiguous symbols with context', () => {
      const symbol1 = { ...mockSymbol, name: 'System' };
      const symbol2 = {
        ...mockSymbol,
        name: 'System',
        key: { ...mockSymbol.key, name: 'System' },
      };

      globalRegistry.registerSymbol(symbol1, 'file1.cls', mockSymbolTable);
      globalRegistry.registerSymbol(symbol2, 'file2.cls', mockSymbolTable);

      const context: ResolutionContext = {
        sourceFile: 'file1.cls',
        expectedNamespace: 'System',
      };

      const result = globalRegistry.lookupSymbol('System', context);
      expect(result?.isAmbiguous).toBe(true);
      expect(result?.confidence).toBe(0.5); // Medium confidence for ambiguous symbols
    });
  });

  describe('getAllSymbolsWithName', () => {
    it('should return all symbols with a given name', () => {
      const symbol1 = { ...mockSymbol, name: 'System' };
      const symbol2 = {
        ...mockSymbol,
        name: 'System',
        key: { ...mockSymbol.key, name: 'System' },
      };

      globalRegistry.registerSymbol(symbol1, 'file1.cls', mockSymbolTable);
      globalRegistry.registerSymbol(symbol2, 'file2.cls', mockSymbolTable);

      const symbols = globalRegistry.getAllSymbolsWithName('System');
      expect(symbols).toHaveLength(2);
      expect(symbols[0].filePath).toBe('file1.cls');
      expect(symbols[1].filePath).toBe('file2.cls');
    });

    it('should return empty array for non-existent symbol', () => {
      const symbols = globalRegistry.getAllSymbolsWithName('NonExistent');
      expect(symbols).toHaveLength(0);
    });
  });

  describe('getFilesForSymbol', () => {
    it('should return all files containing a symbol', () => {
      const symbol1 = { ...mockSymbol, name: 'System' };
      const symbol2 = {
        ...mockSymbol,
        name: 'System',
        key: { ...mockSymbol.key, name: 'System' },
      };

      globalRegistry.registerSymbol(symbol1, 'file1.cls', mockSymbolTable);
      globalRegistry.registerSymbol(symbol2, 'file2.cls', mockSymbolTable);

      const files = globalRegistry.getFilesForSymbol('System');
      expect(files).toContain('file1.cls');
      expect(files).toContain('file2.cls');
      expect(files).toHaveLength(2);
    });

    it('should return empty array for non-existent symbol', () => {
      const files = globalRegistry.getFilesForSymbol('NonExistent');
      expect(files).toHaveLength(0);
    });
  });

  describe('getSymbolsInFile', () => {
    it('should return all symbols in a file', () => {
      const symbol1 = { ...mockSymbol, name: 'Class1' };
      const symbol2 = {
        ...mockSymbol,
        name: 'Class2',
        key: { ...mockSymbol.key, name: 'Class2' },
      };

      globalRegistry.registerSymbol(symbol1, 'test.cls', mockSymbolTable);
      globalRegistry.registerSymbol(symbol2, 'test.cls', mockSymbolTable);

      const symbols = globalRegistry.getSymbolsInFile('test.cls');
      expect(symbols).toContain('Class1');
      expect(symbols).toContain('Class2');
      expect(symbols).toHaveLength(2);
    });

    it('should return empty array for non-existent file', () => {
      const symbols = globalRegistry.getSymbolsInFile('non-existent.cls');
      expect(symbols).toHaveLength(0);
    });
  });

  describe('getSymbolTableForFile', () => {
    it('should return symbol table for a file', () => {
      globalRegistry.registerSymbol(mockSymbol, 'test.cls', mockSymbolTable);

      const result = globalRegistry.getSymbolTableForFile('test.cls');
      expect(result).toBe(mockSymbolTable);
    });

    it('should return undefined for non-existent file', () => {
      const result = globalRegistry.getSymbolTableForFile('non-existent.cls');
      expect(result).toBeUndefined();
    });
  });

  describe('getAllSymbols', () => {
    it('should return all registered symbols', () => {
      const symbol1 = { ...mockSymbol, name: 'Class1' };
      const symbol2 = {
        ...mockSymbol,
        name: 'Class2',
        key: { ...mockSymbol.key, name: 'Class2' },
      };

      globalRegistry.registerSymbol(symbol1, 'file1.cls', mockSymbolTable);
      globalRegistry.registerSymbol(symbol2, 'file2.cls', mockSymbolTable);

      const allSymbols = globalRegistry.getAllSymbols();
      expect(allSymbols.size).toBe(2);
      expect(allSymbols.has('Class1')).toBe(true);
      expect(allSymbols.has('Class2')).toBe(true);
    });

    it('should return empty map when no symbols registered', () => {
      const allSymbols = globalRegistry.getAllSymbols();
      expect(allSymbols.size).toBe(0);
    });
  });

  describe('getAllFiles', () => {
    it('should return all registered files', () => {
      globalRegistry.registerSymbol(mockSymbol, 'file1.cls', mockSymbolTable);
      globalRegistry.registerSymbol(mockSymbol, 'file2.cls', mockSymbolTable);

      const files = globalRegistry.getAllFiles();
      expect(files).toContain('file1.cls');
      expect(files).toContain('file2.cls');
      expect(files).toHaveLength(2);
    });

    it('should return empty array when no files registered', () => {
      const files = globalRegistry.getAllFiles();
      expect(files).toHaveLength(0);
    });
  });

  describe('removeFile', () => {
    it('should remove all symbols from a file', () => {
      const symbol1 = { ...mockSymbol, name: 'Class1' };
      const symbol2 = {
        ...mockSymbol,
        name: 'Class2',
        key: { ...mockSymbol.key, name: 'Class2' },
      };

      globalRegistry.registerSymbol(symbol1, 'file1.cls', mockSymbolTable);
      globalRegistry.registerSymbol(symbol2, 'file2.cls', mockSymbolTable);

      globalRegistry.removeFile('file1.cls');

      const files = globalRegistry.getAllFiles();
      expect(files).not.toContain('file1.cls');
      expect(files).toContain('file2.cls');

      const class1Result = globalRegistry.lookupSymbol('Class1');
      expect(class1Result).toBeNull();

      const class2Result = globalRegistry.lookupSymbol('Class2');
      expect(class2Result).toBeDefined();
    });
  });

  describe('clear', () => {
    it('should clear all symbols and files', () => {
      globalRegistry.registerSymbol(mockSymbol, 'test.cls', mockSymbolTable);

      globalRegistry.clear();

      const allSymbols = globalRegistry.getAllSymbols();
      const allFiles = globalRegistry.getAllFiles();

      expect(allSymbols.size).toBe(0);
      expect(allFiles).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      // Clear the registry first to ensure it's empty
      globalRegistry.clear();

      const symbol1 = { ...mockSymbol, name: 'Class1' };
      const symbol2 = {
        ...mockSymbol,
        name: 'Class2',
        key: { ...mockSymbol.key, name: 'Class2' },
      };
      const symbol3 = {
        ...mockSymbol,
        name: 'System',
        key: { ...mockSymbol.key, name: 'System' },
      };
      const symbol4 = {
        ...mockSymbol,
        name: 'System',
        key: { ...mockSymbol.key, name: 'System' },
      };

      // Use registerSymbol directly instead of registerSymbolTable
      // to avoid collecting any extra symbols from the symbol table
      globalRegistry.registerSymbol(symbol1, 'file1.cls', mockSymbolTable);
      globalRegistry.registerSymbol(symbol2, 'file2.cls', mockSymbolTable);
      globalRegistry.registerSymbol(symbol3, 'file3.cls', mockSymbolTable);
      globalRegistry.registerSymbol(symbol4, 'file4.cls', mockSymbolTable);

      const stats = globalRegistry.getStats();

      expect(stats.totalSymbols).toBe(4);
      expect(stats.totalFiles).toBe(4);
      expect(stats.ambiguousSymbols).toBe(1); // 'System' appears twice
      expect(stats.uniqueSymbolNames).toBe(3); // 'Class1', 'Class2', 'System'
    });

    it('should return zero statistics for empty registry', () => {
      const stats = globalRegistry.getStats();

      expect(stats.totalSymbols).toBe(0);
      expect(stats.totalFiles).toBe(0);
      expect(stats.ambiguousSymbols).toBe(0);
      expect(stats.uniqueSymbolNames).toBe(0);
    });
  });
});
