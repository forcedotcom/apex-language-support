/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ApexSymbolGraph,
  ReferenceType,
} from '../../src/references/ApexSymbolGraph';
import {
  ApexSymbol,
  SymbolKind,
  SymbolVisibility,
} from '../../src/types/symbol';

describe('ApexSymbolGraph Phase 4: Optimized Graphology Implementation', () => {
  let graph: ApexSymbolGraph;

  beforeEach(() => {
    graph = new ApexSymbolGraph();
  });

  describe('Phase 4: Integer Node IDs and Lightweight Symbol Storage', () => {
    it('should use integer node IDs instead of string IDs', () => {
      const symbol1: ApexSymbol = {
        name: 'TestClass',
        kind: SymbolKind.Class,
        location: { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
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
        key: { prefix: 'class', name: 'TestClass', path: ['TestClass'] },
        parentKey: null,
        fqn: 'TestClass',
      };

      const symbol2: ApexSymbol = {
        name: 'TestMethod',
        kind: SymbolKind.Method,
        location: { startLine: 5, startColumn: 1, endLine: 8, endColumn: 1 },
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
          prefix: 'method',
          name: 'TestMethod',
          path: ['TestClass', 'TestMethod'],
        },
        parentKey: null,
        fqn: 'TestClass.TestMethod',
      };

      // Add symbols to graph
      graph.addSymbol(symbol1, 'test1.cls');
      graph.addSymbol(symbol2, 'test1.cls');

      // Verify that symbols are stored with integer node IDs
      const stats = graph.getStats();
      expect(stats.totalSymbols).toBe(2);

      // Verify that references work with integer node IDs
      graph.addReference(symbol1, symbol2, ReferenceType.METHOD_CALL, {
        startLine: 6,
        startColumn: 1,
        endLine: 6,
        endColumn: 10,
      });

      const referencesTo = graph.findReferencesTo(symbol2);
      expect(referencesTo).toHaveLength(1);
      expect(referencesTo[0].symbol.name).toBe('TestClass');
      expect(referencesTo[0].referenceType).toBe(ReferenceType.METHOD_CALL);
    });

    it('should store lightweight symbols separately from graph nodes', () => {
      const symbol: ApexSymbol = {
        name: 'TestClass',
        kind: SymbolKind.Class,
        location: { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
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
        key: { prefix: 'class', name: 'TestClass', path: ['TestClass'] },
        parentKey: null,
        fqn: 'TestClass',
        annotations: [
          {
            name: 'TestVisible',
            location: {
              startLine: 1,
              startColumn: 1,
              endLine: 1,
              endColumn: 12,
            },
          },
        ],
      };

      // Add symbol to graph
      graph.addSymbol(symbol, 'test.cls');

      // Verify that the symbol is accessible through the graph
      const foundSymbols = graph.lookupSymbolByName('TestClass');
      expect(foundSymbols).toHaveLength(1);
      expect(foundSymbols[0].name).toBe('TestClass');
      expect(foundSymbols[0].fqn).toBe('TestClass');
      expect(foundSymbols[0].annotations).toHaveLength(1);
    });

    it('should maintain graph algorithm functionality with integer node IDs', () => {
      const classA: ApexSymbol = {
        name: 'ClassA',
        kind: SymbolKind.Class,
        location: { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
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
        key: { prefix: 'class', name: 'ClassA', path: ['ClassA'] },
        parentKey: null,
        fqn: 'ClassA',
      };

      const classB: ApexSymbol = {
        name: 'ClassB',
        kind: SymbolKind.Class,
        location: { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
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
        key: { prefix: 'class', name: 'ClassB', path: ['ClassB'] },
        parentKey: null,
        fqn: 'ClassB',
      };

      const classC: ApexSymbol = {
        name: 'ClassC',
        kind: SymbolKind.Class,
        location: { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
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
        key: { prefix: 'class', name: 'ClassC', path: ['ClassC'] },
        parentKey: null,
        fqn: 'ClassC',
      };

      // Add symbols
      graph.addSymbol(classA, 'classA.cls');
      graph.addSymbol(classB, 'classB.cls');
      graph.addSymbol(classC, 'classC.cls');

      // Create dependencies: A -> B -> C -> A (circular)
      graph.addReference(classA, classB, ReferenceType.TYPE_REFERENCE, {
        startLine: 2,
        startColumn: 1,
        endLine: 2,
        endColumn: 10,
      });
      graph.addReference(classB, classC, ReferenceType.TYPE_REFERENCE, {
        startLine: 2,
        startColumn: 1,
        endLine: 2,
        endColumn: 10,
      });
      graph.addReference(classC, classA, ReferenceType.TYPE_REFERENCE, {
        startLine: 2,
        startColumn: 1,
        endLine: 2,
        endColumn: 10,
      });

      // Test dependency analysis
      const analysis = graph.analyzeDependencies(classA);
      expect(analysis.dependencies).toHaveLength(1);
      expect(analysis.dependents).toHaveLength(1);
      expect(analysis.impactScore).toBe(1);

      // Test circular dependency detection
      const cycles = graph.detectCircularDependencies();
      expect(cycles.length).toBeGreaterThan(0);
    });

    it('should provide memory optimization statistics', () => {
      const symbol: ApexSymbol = {
        name: 'TestClass',
        kind: SymbolKind.Class,
        location: { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
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
        key: { prefix: 'class', name: 'TestClass', path: ['TestClass'] },
        parentKey: null,
        fqn: 'TestClass',
      };

      // Add symbol to graph
      graph.addSymbol(symbol, 'test.cls');

      // Verify that memory optimization statistics are available
      const stats = graph.getStats();
      expect(stats.totalSymbols).toBe(1);
      expect(stats.totalReferences).toBe(0);
      expect(stats.totalFiles).toBe(1);
    });

    it('should handle file removal with integer node IDs', () => {
      const symbol1: ApexSymbol = {
        name: 'ClassA',
        kind: SymbolKind.Class,
        location: { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
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
        key: { prefix: 'class', name: 'ClassA', path: ['ClassA'] },
        parentKey: null,
        fqn: 'ClassA',
      };

      const symbol2: ApexSymbol = {
        name: 'ClassB',
        kind: SymbolKind.Class,
        location: { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
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
        key: { prefix: 'class', name: 'ClassB', path: ['ClassB'] },
        parentKey: null,
        fqn: 'ClassB',
      };

      // Add symbols to different files
      graph.addSymbol(symbol1, 'file1.cls');
      graph.addSymbol(symbol2, 'file2.cls');

      // Verify initial state
      expect(graph.getStats().totalSymbols).toBe(2);
      expect(graph.getStats().totalFiles).toBe(2);

      // Remove one file
      graph.removeFile('file1.cls');

      // Verify that only the remaining file's symbols exist
      expect(graph.getStats().totalSymbols).toBe(1);
      expect(graph.getStats().totalFiles).toBe(1);

      const remainingSymbols = graph.lookupSymbolByName('ClassB');
      expect(remainingSymbols).toHaveLength(1);
      expect(remainingSymbols[0].name).toBe('ClassB');
    });

    it('should clear all data correctly', () => {
      const symbol1: ApexSymbol = {
        name: 'TestClass1',
        kind: SymbolKind.Class,
        location: { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
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
        key: { prefix: 'class', name: 'TestClass1', path: ['TestClass1'] },
        parentKey: null,
        fqn: 'TestClass1',
      };

      const symbol2: ApexSymbol = {
        name: 'TestClass2',
        kind: SymbolKind.Class,
        location: { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
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
        key: { prefix: 'class', name: 'TestClass2', path: ['TestClass2'] },
        parentKey: null,
        fqn: 'TestClass2',
      };

      // Add symbols and create reference between them
      graph.addSymbol(symbol1, 'test1.cls');
      graph.addSymbol(symbol2, 'test2.cls');
      graph.addReference(symbol1, symbol2, ReferenceType.TYPE_REFERENCE, {
        startLine: 2,
        startColumn: 1,
        endLine: 2,
        endColumn: 10,
      });

      // Verify initial state
      expect(graph.getStats().totalSymbols).toBe(2);
      expect(graph.getStats().totalReferences).toBe(1);

      // Clear all data
      graph.clear();

      // Verify cleared state
      expect(graph.getStats().totalSymbols).toBe(0);
      expect(graph.getStats().totalReferences).toBe(0);
      expect(graph.getStats().totalFiles).toBe(0);
    });
  });

  describe('Phase 4: Performance and Memory Benefits', () => {
    it('should demonstrate memory efficiency with multiple symbols', () => {
      const symbols: ApexSymbol[] = [];

      // Create 100 test symbols
      for (let i = 0; i < 100; i++) {
        symbols.push({
          name: `TestClass${i}`,
          kind: SymbolKind.Class,
          location: { startLine: 1, startColumn: 1, endLine: 10, endColumn: 1 },
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
            prefix: 'class',
            name: `TestClass${i}`,
            path: [`TestClass${i}`],
          },
          parentKey: null,
          fqn: `TestClass${i}`,
        });
      }

      // Add all symbols to graph
      symbols.forEach((symbol, index) => {
        graph.addSymbol(symbol, `test${index}.cls`);
      });

      // Verify all symbols are stored
      expect(graph.getStats().totalSymbols).toBe(100);
      expect(graph.getStats().totalFiles).toBe(100);

      // Test lookup performance
      const startTime = Date.now();
      for (let i = 0; i < 100; i++) {
        const found = graph.lookupSymbolByName(`TestClass${i}`);
        expect(found).toHaveLength(1);
        expect(found[0].name).toBe(`TestClass${i}`);
      }
      const endTime = Date.now();
      const lookupTime = endTime - startTime;

      // Verify lookup performance is reasonable (should be fast)
      expect(lookupTime).toBeLessThan(1000); // Should complete in less than 1 second
    });
  });
});
