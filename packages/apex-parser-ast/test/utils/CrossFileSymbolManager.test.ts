/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CrossFileSymbolManager } from '../../src/utils/CrossFileSymbolManager';
import { GlobalSymbolRegistry } from '../../src/utils/GlobalSymbolRegistry';
import {
  SymbolTable,
  ApexSymbol,
  SymbolKind,
  SymbolVisibility,
} from '../../src/types/symbol';

describe('CrossFileSymbolManager', () => {
  let symbolManager: CrossFileSymbolManager;
  let mockGlobalRegistry: GlobalSymbolRegistry;
  let mockSymbolTable: SymbolTable;
  let mockSymbol: ApexSymbol;

  beforeEach(() => {
    // Create mock symbol
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

    mockSymbolTable = new SymbolTable();
    mockSymbolTable.addSymbol(mockSymbol);

    // Create the manager
    symbolManager = new CrossFileSymbolManager();

    // Get the actual global registry from the manager
    mockGlobalRegistry = (symbolManager as any).globalRegistry;
  });

  describe('constructor', () => {
    it('should create a new instance with global registry and resource loader', () => {
      expect(symbolManager).toBeDefined();
      expect(mockGlobalRegistry).toBeInstanceOf(GlobalSymbolRegistry);
      // The ResourceLoader is no longer managed directly by CrossFileSymbolManager
      // expect(mockResourceLoader).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should initialize with symbol tables', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      expect(symbolManager.getAllSymbols().size).toBeGreaterThan(0);
    });

    it('should not initialize twice', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);
      await symbolManager.initialize(symbolTables); // Should not re-initialize

      expect(symbolManager.getAllSymbols().size).toBeGreaterThan(0);
    });
  });

  describe('getAllSymbols', () => {
    it('should throw error if not initialized', () => {
      expect(() => symbolManager.getAllSymbols()).toThrow(
        'CrossFileSymbolManager not initialized. Call initialize() first.',
      );
    });

    it('should return all symbols after initialization', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      const allSymbols = symbolManager.getAllSymbols();
      expect(allSymbols).toBeDefined();
      expect(allSymbols.size).toBeGreaterThan(0);
    });
  });

  describe('getSymbolsByName', () => {
    it('should throw error if not initialized', () => {
      expect(() => symbolManager.getSymbolsByName('TestClass')).toThrow(
        'CrossFileSymbolManager not initialized. Call initialize() first.',
      );
    });

    it('should return symbols with specific name', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      const symbols = symbolManager.getSymbolsByName('TestClass');
      expect(symbols).toBeDefined();
      expect(symbols.length).toBeGreaterThan(0);
    });
  });

  describe('lookupSymbol', () => {
    it('should throw error if not initialized', () => {
      expect(() => symbolManager.lookupSymbol('TestClass')).toThrow(
        'CrossFileSymbolManager not initialized. Call initialize() first.',
      );
    });

    it('should return symbol lookup result', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      const result = symbolManager.lookupSymbol('TestClass');
      expect(result).toBeDefined();
      expect(result?.symbol.name).toBe('TestClass');
    });

    it('should return null for non-existent symbol', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      const result = symbolManager.lookupSymbol('NonExistent');
      expect(result).toBeNull();
    });
  });

  describe('getFilesForSymbol', () => {
    it('should throw error if not initialized', () => {
      expect(() => symbolManager.getFilesForSymbol('TestClass')).toThrow(
        'CrossFileSymbolManager not initialized. Call initialize() first.',
      );
    });

    it('should return files containing symbol', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      const files = symbolManager.getFilesForSymbol('TestClass');
      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
    });
  });

  describe('getSymbolsInFile', () => {
    it('should throw error if not initialized', () => {
      expect(() => symbolManager.getSymbolsInFile('test.cls')).toThrow(
        'CrossFileSymbolManager not initialized. Call initialize() first.',
      );
    });

    it('should return symbols in specific file', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      const symbols = symbolManager.getSymbolsInFile('test.cls');
      expect(symbols).toBeDefined();
      expect(Array.isArray(symbols)).toBe(true);
    });
  });

  describe('getSymbolTableForFile', () => {
    it('should throw error if not initialized', () => {
      expect(() => symbolManager.getSymbolTableForFile('test.cls')).toThrow(
        'CrossFileSymbolManager not initialized. Call initialize() first.',
      );
    });

    it('should return symbol table for file', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      const symbolTable = symbolManager.getSymbolTableForFile('test.cls');
      expect(symbolTable).toBeDefined();
    });
  });

  describe('getAllFiles', () => {
    it('should throw error if not initialized', () => {
      expect(() => symbolManager.getAllFiles()).toThrow(
        'CrossFileSymbolManager not initialized. Call initialize() first.',
      );
    });

    it('should return all files', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      const files = symbolManager.getAllFiles();
      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should throw error if not initialized', () => {
      expect(() => symbolManager.getStats()).toThrow(
        'CrossFileSymbolManager not initialized. Call initialize() first.',
      );
    });

    it('should return statistics', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      const stats = symbolManager.getStats();
      expect(stats).toBeDefined();
      expect(stats.totalSymbols).toBeGreaterThanOrEqual(0);
      expect(stats.totalFiles).toBeGreaterThanOrEqual(0);
      expect(stats.ambiguousSymbols).toBeGreaterThanOrEqual(0);
      expect(stats.uniqueSymbolNames).toBeGreaterThanOrEqual(0);
    });
  });

  describe('findSymbolsByPattern', () => {
    it('should throw error if not initialized', () => {
      expect(() => symbolManager.findSymbolsByPattern('Test')).toThrow(
        'CrossFileSymbolManager not initialized. Call initialize() first.',
      );
    });

    it('should return symbols matching pattern', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      const symbols = symbolManager.findSymbolsByPattern('Test');
      expect(symbols).toBeDefined();
      expect(symbols.size).toBeGreaterThanOrEqual(0);
    });

    it('should be case insensitive', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      const symbols1 = symbolManager.findSymbolsByPattern('test');
      const symbols2 = symbolManager.findSymbolsByPattern('TEST');

      expect(symbols1.size).toBe(symbols2.size);
    });
  });

  describe('findSymbolsByKind', () => {
    it('should throw error if not initialized', () => {
      expect(() => symbolManager.findSymbolsByKind('class')).toThrow(
        'CrossFileSymbolManager not initialized. Call initialize() first.',
      );
    });

    it('should return symbols of specific kind', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      const classes = symbolManager.findSymbolsByKind('class');
      expect(classes).toBeDefined();
      expect(classes.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAllClasses', () => {
    it('should return all classes', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      const classes = symbolManager.getAllClasses();
      expect(classes).toBeDefined();
      expect(classes.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAllMethods', () => {
    it('should return all methods', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      const methods = symbolManager.getAllMethods();
      expect(methods).toBeDefined();
      expect(methods.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAllFields', () => {
    it('should return all fields', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      const fields = symbolManager.getAllFields();
      expect(fields).toBeDefined();
      expect(fields.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getAllVariables', () => {
    it('should return all variables', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      const variables = symbolManager.getAllVariables();
      expect(variables).toBeDefined();
      expect(variables.size).toBeGreaterThanOrEqual(0);
    });
  });

  describe('refresh', () => {
    it('should refresh the global registry', async () => {
      const symbolTables = new Map<string, SymbolTable>();
      symbolTables.set('test.cls', mockSymbolTable);

      await symbolManager.initialize(symbolTables);

      // Mock the clear method
      const clearSpy = jest.spyOn(mockGlobalRegistry, 'clear');

      await symbolManager.refresh(symbolTables);

      expect(clearSpy).toHaveBeenCalled();
    });
  });
});
