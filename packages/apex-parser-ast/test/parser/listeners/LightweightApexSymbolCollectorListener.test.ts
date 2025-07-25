/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LightweightApexSymbolCollectorListener } from '../../../src/parser/listeners/LightweightApexSymbolCollectorListener';
import {
  ApexSymbol,
  SymbolKind,
  SymbolVisibility,
  SymbolTable,
} from '../../../src/types/symbol';

describe('LightweightApexSymbolCollectorListener - Phase 2 Memory Optimization', () => {
  let collector: LightweightApexSymbolCollectorListener;
  let symbolTable: SymbolTable;

  beforeEach(() => {
    symbolTable = new SymbolTable();
    collector = new LightweightApexSymbolCollectorListener(symbolTable);
  });

  // Helper function to create test symbols
  const createTestSymbol = (
    name: string,
    kind: SymbolKind,
    fqn?: string,
    filePath: string = 'TestFile.cls',
  ): ApexSymbol => ({
    name,
    kind,
    fqn: fqn || `TestNamespace.${name}`,
    location: {
      startLine: 1,
      startColumn: 1,
      endLine: 10,
      endColumn: 20,
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
      prefix: kind,
      name,
      path: [filePath, name],
    },
    parentKey: null,
  });

  describe('Basic Functionality', () => {
    it('should create a lightweight symbol collector', () => {
      expect(collector).toBeDefined();
      expect(collector.getSymbolCount()).toBe(0);
    });

    it('should add symbols in lightweight format', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      collector.addLightweightSymbol(symbol, 'TestFile.cls');

      expect(collector.getSymbolCount()).toBe(1);

      // Get the actual symbol ID from the collector
      const symbolIds = collector.getAllSymbolIds();
      expect(symbolIds).toHaveLength(1);
      expect(collector.hasSymbol(symbolIds[0])).toBe(true);
    });

    it('should retrieve symbols by ID', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      collector.addLightweightSymbol(symbol, 'TestFile.cls');

      // Get the actual symbol ID from the collector
      const symbolIds = collector.getAllSymbolIds();
      const symbolId = symbolIds[0];

      const retrievedSymbol = collector.getSymbol(symbolId);
      expect(retrievedSymbol).toBeDefined();
      expect(retrievedSymbol?.name).toBe('TestClass');
      expect(retrievedSymbol?.kind).toBe(SymbolKind.Class);
    });

    it('should find symbols by name', () => {
      const symbol1 = createTestSymbol('TestClass', SymbolKind.Class);
      const symbol2 = createTestSymbol('TestMethod', SymbolKind.Method);
      const symbol3 = createTestSymbol('TestClass', SymbolKind.Interface); // Same name, different kind

      collector.addLightweightSymbol(symbol1, 'TestFile1.cls');
      collector.addLightweightSymbol(symbol2, 'TestFile1.cls');
      collector.addLightweightSymbol(symbol3, 'TestFile2.cls');

      const results = collector.findSymbolsByName('TestClass');
      expect(results).toHaveLength(2);
      expect(results.some((s) => s.kind === SymbolKind.Class)).toBe(true);
      expect(results.some((s) => s.kind === SymbolKind.Interface)).toBe(true);
    });

    it('should find symbols by FQN', () => {
      const symbol = createTestSymbol(
        'TestClass',
        SymbolKind.Class,
        'TestNamespace.TestClass',
      );
      collector.addLightweightSymbol(symbol, 'TestFile.cls');

      const result = collector.findSymbolByFQN('TestNamespace.TestClass');
      expect(result).toBeDefined();
      expect(result?.name).toBe('TestClass');
      expect(result?.fqn).toBe('TestNamespace.TestClass');
    });

    it('should find symbols in specific file', () => {
      const symbol1 = createTestSymbol('TestClass1', SymbolKind.Class);
      const symbol2 = createTestSymbol('TestClass2', SymbolKind.Class);
      const symbol3 = createTestSymbol('TestClass3', SymbolKind.Class);

      collector.addLightweightSymbol(symbol1, 'TestFile1.cls');
      collector.addLightweightSymbol(symbol2, 'TestFile1.cls');
      collector.addLightweightSymbol(symbol3, 'TestFile2.cls');

      const results1 = collector.findSymbolsInFile('TestFile1.cls');
      expect(results1).toHaveLength(2);
      expect(results1.some((s) => s.name === 'TestClass1')).toBe(true);
      expect(results1.some((s) => s.name === 'TestClass2')).toBe(true);

      const results2 = collector.findSymbolsInFile('TestFile2.cls');
      expect(results2).toHaveLength(1);
      expect(results2[0].name).toBe('TestClass3');
    });
  });

  describe('Memory Optimization', () => {
    it('should provide memory usage statistics', () => {
      // Add multiple symbols
      for (let i = 0; i < 100; i++) {
        const symbol = createTestSymbol(`TestClass${i}`, SymbolKind.Class);
        collector.addLightweightSymbol(symbol, 'TestFile.cls');
      }

      const stats = collector.getMemoryStats();

      expect(stats.totalSymbols).toBe(100);
      expect(stats.lightweightSize).toBeGreaterThan(0);
      expect(stats.estimatedFullSize).toBeGreaterThan(0);
      expect(stats.memoryReduction).toBeGreaterThan(0);
      expect(stats.memoryReduction).toBeLessThan(100);
    });

    it('should achieve significant memory reduction', () => {
      // Add multiple symbols with various types
      const symbols = [
        createTestSymbol('TestClass', SymbolKind.Class),
        createTestSymbol('TestMethod', SymbolKind.Method),
        createTestSymbol('TestField', SymbolKind.Field),
        createTestSymbol('TestProperty', SymbolKind.Property),
        createTestSymbol('TestVariable', SymbolKind.Variable),
        createTestSymbol('TestParameter', SymbolKind.Parameter),
        createTestSymbol('TestEnum', SymbolKind.Enum),
        createTestSymbol('TestEnumValue', SymbolKind.EnumValue),
        createTestSymbol('TestConstructor', SymbolKind.Constructor),
        createTestSymbol('TestTrigger', SymbolKind.Trigger),
      ];

      symbols.forEach((symbol) => {
        collector.addLightweightSymbol(symbol, 'TestFile.cls');
      });

      const stats = collector.getMemoryStats();

      // Should achieve at least 30% memory reduction
      expect(stats.memoryReduction).toBeGreaterThan(30);
      expect(stats.lightweightSize).toBeLessThan(stats.estimatedFullSize);
    });
  });

  describe('Symbol Management', () => {
    it('should get all symbol IDs', () => {
      const symbol1 = createTestSymbol('TestClass1', SymbolKind.Class);
      const symbol2 = createTestSymbol('TestClass2', SymbolKind.Class);

      collector.addLightweightSymbol(symbol1, 'TestFile1.cls');
      collector.addLightweightSymbol(symbol2, 'TestFile2.cls');

      const ids = collector.getAllSymbolIds();
      expect(ids).toHaveLength(2);
      // The IDs should contain the generated unified IDs
      expect(ids[0]).toContain('TestClass1');
      expect(ids[1]).toContain('TestClass2');
    });

    it('should check if symbol exists', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);

      // Add the symbol and get its actual ID
      collector.addLightweightSymbol(symbol, 'TestFile.cls');
      const symbolIds = collector.getAllSymbolIds();
      const symbolId = symbolIds[0];

      expect(collector.hasSymbol(symbolId)).toBe(true);
    });

    it('should remove symbols', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);

      // Add the symbol and get its actual ID
      collector.addLightweightSymbol(symbol, 'TestFile.cls');
      const symbolIds = collector.getAllSymbolIds();
      const symbolId = symbolIds[0];

      expect(collector.hasSymbol(symbolId)).toBe(true);

      const removed = collector.removeSymbol(symbolId);
      expect(removed).toBe(true);
      expect(collector.hasSymbol(symbolId)).toBe(false);
    });

    it('should clear all symbols', () => {
      const symbol1 = createTestSymbol('TestClass1', SymbolKind.Class);
      const symbol2 = createTestSymbol('TestClass2', SymbolKind.Class);

      collector.addLightweightSymbol(symbol1, 'TestFile1.cls');
      collector.addLightweightSymbol(symbol2, 'TestFile2.cls');

      expect(collector.getSymbolCount()).toBe(2);

      collector.clear();

      expect(collector.getSymbolCount()).toBe(0);
      expect(collector.getAllSymbolIds()).toHaveLength(0);
    });
  });

  describe('File Path Management', () => {
    it('should set and get current file path', () => {
      expect(collector.getCurrentFilePath()).toBe('');

      collector.setCurrentFilePath('TestFile.cls');
      expect(collector.getCurrentFilePath()).toBe('TestFile.cls');

      collector.setCurrentFilePath('AnotherFile.cls');
      expect(collector.getCurrentFilePath()).toBe('AnotherFile.cls');
    });
  });

  describe('Result Conversion', () => {
    it('should convert lightweight symbols to full symbols in result', () => {
      const symbol1 = createTestSymbol('TestClass1', SymbolKind.Class);
      const symbol2 = createTestSymbol('TestClass2', SymbolKind.Class);

      collector.addLightweightSymbol(symbol1, 'TestFile1.cls');
      collector.addLightweightSymbol(symbol2, 'TestFile2.cls');

      expect(collector.getSymbolCount()).toBe(2);

      const result = collector.getResult();

      // The result should be a SymbolTable with the converted symbols
      expect(result).toBeDefined();
      expect(result).toBeInstanceOf(SymbolTable);
    });

    it('should maintain symbol integrity through conversion', () => {
      const symbol = createTestSymbol(
        'TestClass',
        SymbolKind.Class,
        'TestNamespace.TestClass',
      );
      symbol.modifiers.visibility = SymbolVisibility.Private;
      symbol.modifiers.isStatic = true;

      collector.addLightweightSymbol(symbol, 'TestFile.cls');

      const result = collector.getResult();

      // The symbol should be accessible through the symbol table
      const retrievedSymbol = result.lookup('TestClass');
      expect(retrievedSymbol).toBeDefined();
      expect(retrievedSymbol?.name).toBe('TestClass');
      expect(retrievedSymbol?.kind).toBe(SymbolKind.Class);
      expect(retrievedSymbol?.modifiers.visibility).toBe(
        SymbolVisibility.Private,
      );
      expect(retrievedSymbol?.modifiers.isStatic).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle symbols with no FQN', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      symbol.fqn = undefined;

      collector.addLightweightSymbol(symbol, 'TestFile.cls');

      const retrievedSymbol = collector.getSymbol(symbol.key.unifiedId || '');
      expect(retrievedSymbol).toBeDefined();
      expect(retrievedSymbol?.fqn).toBeUndefined();
    });

    it('should handle symbols with null parent', () => {
      const symbol = createTestSymbol('TestClass', SymbolKind.Class);
      symbol.parentKey = null;

      collector.addLightweightSymbol(symbol, 'TestFile.cls');

      const symbolIds = collector.getAllSymbolIds();
      const symbolId = symbolIds[0];
      const retrievedSymbol = collector.getSymbol(symbolId);
      expect(retrievedSymbol).toBeDefined();
      expect(retrievedSymbol?.parentKey).toBeNull();
    });

    it('should handle non-existent symbol retrieval', () => {
      const result = collector.getSymbol('non-existent-id');
      expect(result).toBeNull();
    });

    it('should handle empty symbol search results', () => {
      const results = collector.findSymbolsByName('NonExistent');
      expect(results).toHaveLength(0);

      const result = collector.findSymbolByFQN('NonExistent.FQN');
      expect(result).toBeNull();

      const fileResults = collector.findSymbolsInFile('NonExistentFile.cls');
      expect(fileResults).toHaveLength(0);
    });
  });
});
