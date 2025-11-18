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
} from '../../src/symbols/ApexSymbolGraph';
import { SymbolTable, SymbolFactory, SymbolKind } from '../../src/types/symbol';
import { initialize as schedulerInitialize, reset as schedulerReset } from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';

describe('ApexSymbolGraph - Optimized Architecture', () => {
  let symbolGraph: ApexSymbolGraph;
  let symbolTable: SymbolTable;

  beforeAll(async () => {
    // Initialize scheduler before all tests
    await Effect.runPromise(
      schedulerInitialize({
        queueCapacity: 100,
        maxHighPriorityStreak: 50,
        idleSleepMs: 1,
      }),
    );
  });

  afterAll(async () => {
    // Reset scheduler after all tests
    await Effect.runPromise(schedulerReset());
  });

  beforeEach(() => {
    symbolGraph = new ApexSymbolGraph();
    symbolTable = new SymbolTable();
  });

  describe('Position Data Integrity in Optimized Architecture', () => {
    it('should preserve position data when delegating to SymbolTable', () => {
      // Create a symbol with specific position data
      const symbol = SymbolFactory.createMinimalSymbol(
        'TestClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 10,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 13,
            endLine: 1,
            endColumn: 22,
          },
        },
        'file:///test/file.cls',
      );

      // Store original position data
      const originalLocation = { ...symbol.location };
      const originalSymbolRange = { ...symbol.location.symbolRange };
      const originalIdentifierRange = { ...symbol.location.identifierRange };

      // Add symbol to SymbolTable first
      symbolTable.addSymbol(symbol);

      // Add symbol to graph (should only store reference)
      symbolGraph.addSymbol(symbol, 'file:///test/file.cls', symbolTable);

      // Verify symbol exists in graph
      const foundSymbol = symbolGraph.getSymbol(symbol.id);
      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('TestClass');

      // Verify position data is preserved
      expect(foundSymbol!.location.symbolRange).toEqual(originalSymbolRange);
      expect(foundSymbol!.location.identifierRange).toEqual(
        originalIdentifierRange,
      );
      expect(foundSymbol!.location).toEqual(originalLocation);

      // Verify symbol is actually stored in SymbolTable with same position data
      const symbolTableSymbol = symbolTable.lookup('TestClass');
      expect(symbolTableSymbol).toBeDefined();
      expect(symbolTableSymbol?.name).toBe('TestClass');
      expect(symbolTableSymbol!.location).toEqual(originalLocation);
    });

    it('should preserve position data across multiple add/find operations', () => {
      const symbols = [
        SymbolFactory.createMinimalSymbol(
          'Class1',
          SymbolKind.Class,
          {
            symbolRange: {
              startLine: 1,
              startColumn: 0,
              endLine: 5,
              endColumn: 0,
            },
            identifierRange: {
              startLine: 1,
              startColumn: 13,
              endLine: 1,
              endColumn: 19,
            },
          },
          'file:///test/file1.cls',
        ),
        SymbolFactory.createMinimalSymbol(
          'Class2',
          SymbolKind.Class,
          {
            symbolRange: {
              startLine: 7,
              startColumn: 0,
              endLine: 12,
              endColumn: 0,
            },
            identifierRange: {
              startLine: 7,
              startColumn: 13,
              endLine: 7,
              endColumn: 19,
            },
          },
          'file:///test/file2.cls',
        ),
        SymbolFactory.createMinimalSymbol(
          'method1',
          SymbolKind.Method,
          {
            symbolRange: {
              startLine: 2,
              startColumn: 2,
              endLine: 4,
              endColumn: 2,
            },
            identifierRange: {
              startLine: 2,
              startColumn: 10,
              endLine: 2,
              endColumn: 17,
            },
          },
          'file:///test/file1.cls',
        ),
      ];

      // Store original position data
      const originalLocations = symbols.map((s) => ({ ...s.location }));

      // Add all symbols
      symbols.forEach((symbol) => {
        symbolTable.addSymbol(symbol);
        symbolGraph.addSymbol(symbol, symbol.fileUri, symbolTable);
      });

      // Find all symbols and verify position data
      symbols.forEach((originalSymbol, index) => {
        const foundSymbol = symbolGraph.getSymbol(originalSymbol.id);
        expect(foundSymbol).toBeDefined();
        expect(foundSymbol!.location).toEqual(originalLocations[index]);
      });
    });

    it('should preserve position data when FQN is calculated during delegation', () => {
      // Create symbol without FQN
      const symbol = SymbolFactory.createMinimalSymbol(
        'TestClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 5,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 13,
            endLine: 1,
            endColumn: 22,
          },
        },
        'file:///test/file.cls',
      );

      // Store original position data
      const originalLocation = { ...symbol.location };

      // Add to SymbolTable and graph
      symbolTable.addSymbol(symbol);
      symbolGraph.addSymbol(symbol, 'file:///test/file.cls', symbolTable);

      // Find symbol
      const foundSymbol = symbolGraph.getSymbol(symbol.id);
      expect(foundSymbol).toBeDefined();

      // Verify position data is unchanged despite FQN calculation
      expect(foundSymbol!.location).toEqual(originalLocation);

      // Verify FQN was calculated
      expect(foundSymbol!.fqn).toBeDefined();
      expect(foundSymbol!.fqn).toBe('TestClass');
    });

    it('should preserve position data when symbols are retrieved by different methods', () => {
      const symbol = SymbolFactory.createMinimalSymbol(
        'TestClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 0,
            endLine: 5,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 13,
            endLine: 1,
            endColumn: 22,
          },
        },
        'file:///test/file.cls',
      );

      // Store original position data
      const originalLocation = { ...symbol.location };

      // Add symbol
      symbolTable.addSymbol(symbol);
      symbolGraph.addSymbol(symbol, 'file:///test/file.cls', symbolTable);

      // Test different retrieval methods
      const byId = symbolGraph.getSymbol(symbol.id);
      const byName = symbolGraph.lookupSymbolByName('TestClass');
      const byFQN = symbolGraph.lookupSymbolByFQN('TestClass');
      const inFile = symbolGraph.getSymbolsInFile('file:///test/file.cls');

      // All should return the same symbol with identical position data
      expect(byId).toBeDefined();
      expect(byName).toHaveLength(1);
      expect(byFQN).toBeDefined();
      expect(inFile).toHaveLength(1);

      expect(byId!.location).toEqual(originalLocation);
      expect(byName[0].location).toEqual(originalLocation);
      expect(byFQN!.location).toEqual(originalLocation);
      expect(inFile[0].location).toEqual(originalLocation);
    });
  });

  describe('Optimized Symbol Storage', () => {
    it('should store symbols in SymbolTable and only references in graph', () => {
      // Create a symbol
      const symbol = SymbolFactory.createMinimalSymbol(
        'TestClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        },
        'file:///test/file.cls',
      );

      // Add symbol to SymbolTable first
      symbolTable.addSymbol(symbol);

      // Add symbol to graph (should only store reference)
      symbolGraph.addSymbol(symbol, 'file:///test/file.cls', symbolTable);

      // Verify symbol exists in graph
      const foundSymbol = symbolGraph.getSymbol(symbol.id);
      expect(foundSymbol).toBeDefined();
      expect(foundSymbol?.name).toBe('TestClass');

      // Verify symbol is actually stored in SymbolTable
      const symbolTableSymbol = symbolTable.lookup('TestClass');
      expect(symbolTableSymbol).toBeDefined();
      expect(symbolTableSymbol?.name).toBe('TestClass');
    });

    it('should delegate symbol lookups to SymbolTable', () => {
      // Create multiple symbols
      const classSymbol = SymbolFactory.createMinimalSymbol(
        'TestClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        },
        'file:///test/file.cls',
      );

      const methodSymbol = SymbolFactory.createMinimalSymbol(
        'testMethod',
        SymbolKind.Method,
        {
          symbolRange: {
            startLine: 5,
            startColumn: 1,
            endLine: 5,
            endColumn: 20,
          },
          identifierRange: {
            startLine: 5,
            startColumn: 1,
            endLine: 5,
            endColumn: 20,
          },
        },
        'file:///test/file.cls',
      );

      // Add to SymbolTable
      symbolTable.addSymbol(classSymbol);
      symbolTable.addSymbol(methodSymbol);

      // Add to graph
      symbolGraph.addSymbol(classSymbol, 'file:///test/file.cls', symbolTable);
      symbolGraph.addSymbol(methodSymbol, 'file:///test/file.cls', symbolTable);

      // Test findSymbolByName delegation
      const symbolsByName = symbolGraph.findSymbolByName('testMethod');
      expect(symbolsByName).toHaveLength(1);
      expect(symbolsByName[0].name).toBe('testMethod');

      // Test getSymbolsInFile delegation
      const symbolsInFile = symbolGraph.getSymbolsInFile(
        'file:///test/file.cls',
      );
      expect(symbolsInFile).toHaveLength(2);
      expect(symbolsInFile.map((s) => s.name)).toContain('TestClass');
      expect(symbolsInFile.map((s) => s.name)).toContain('testMethod');
    });

    it('should maintain cross-file reference tracking', () => {
      // Create symbols in different files
      const sourceSymbol = SymbolFactory.createMinimalSymbol(
        'SourceClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        },
        'file:///source/file.cls',
      );

      const targetSymbol = SymbolFactory.createMinimalSymbol(
        'TargetClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        },
        'file:///target/file.cls',
      );

      // Create SymbolTables for each file
      const sourceSymbolTable = new SymbolTable();
      const targetSymbolTable = new SymbolTable();

      sourceSymbolTable.addSymbol(sourceSymbol);
      targetSymbolTable.addSymbol(targetSymbol);

      // Add symbols to graph
      symbolGraph.addSymbol(
        sourceSymbol,
        'file:///source/file.cls',
        sourceSymbolTable,
      );
      symbolGraph.addSymbol(
        targetSymbol,
        'file:///target/file.cls',
        targetSymbolTable,
      );

      // Add cross-file reference
      symbolGraph.addReference(
        sourceSymbol,
        targetSymbol,
        ReferenceType.TYPE_REFERENCE,
        {
          symbolRange: {
            startLine: 10,
            startColumn: 1,
            endLine: 10,
            endColumn: 20,
          },
          identifierRange: {
            startLine: 10,
            startColumn: 1,
            endLine: 10,
            endColumn: 20,
          },
        },
      );

      // Verify reference tracking
      const referencesTo = symbolGraph.findReferencesTo(targetSymbol);
      expect(referencesTo).toHaveLength(1);
      expect(referencesTo[0].symbol.name).toBe('SourceClass');

      const referencesFrom = symbolGraph.findReferencesFrom(sourceSymbol);
      expect(referencesFrom).toHaveLength(1);
      expect(referencesFrom[0].symbol.name).toBe('TargetClass');
    });

    it('should handle scope-based symbol resolution with context', () => {
      // Create symbols with different scopes
      const classSymbol = SymbolFactory.createMinimalSymbol(
        'TestClass',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        },
        'file:///test/file.cls',
      );

      const methodSymbol = SymbolFactory.createMinimalSymbol(
        'testMethod',
        SymbolKind.Method,
        {
          symbolRange: {
            startLine: 5,
            startColumn: 1,
            endLine: 5,
            endColumn: 20,
          },
          identifierRange: {
            startLine: 5,
            startColumn: 1,
            endLine: 5,
            endColumn: 20,
          },
        },
        'file:///test/file.cls',
      );

      // Add to SymbolTable with scope management
      symbolTable.addSymbol(classSymbol);
      symbolTable.enterScope('TestClass', 'class');
      symbolTable.addSymbol(methodSymbol);
      symbolTable.exitScope();

      // Add to graph
      symbolGraph.addSymbol(classSymbol, 'file:///test/file.cls', symbolTable);
      symbolGraph.addSymbol(methodSymbol, 'file:///test/file.cls', symbolTable);

      // Test context-based lookup
      const lookupResult = symbolGraph.lookupSymbolWithContext('testMethod', {
        fileUri: 'file:///test/file.cls',
        currentScope: 'TestClass',
      });

      expect(lookupResult).toBeDefined();
      expect(lookupResult?.symbol.name).toBe('testMethod');
    });

    it('should provide memory optimization benefits', () => {
      // Create multiple symbols
      const symbols = [];
      for (let i = 0; i < 100; i++) {
        const symbol = SymbolFactory.createMinimalSymbol(
          `Symbol${i}`,
          SymbolKind.Class,
          {
            symbolRange: {
              startLine: i + 1,
              startColumn: 1,
              endLine: i + 1,
              endColumn: 10,
            },
            identifierRange: {
              startLine: i + 1,
              startColumn: 1,
              endLine: i + 1,
              endColumn: 10,
            },
          },
          `/test/file${i}.cls`,
        );
        symbols.push(symbol);
      }

      // Add all symbols
      for (const symbol of symbols) {
        const symbolTable = new SymbolTable();
        symbolTable.addSymbol(symbol);
        symbolGraph.addSymbol(symbol, symbol.fileUri, symbolTable);
      }

      // Verify memory stats
      const memoryStats = symbolGraph.getMemoryStats();
      expect(memoryStats.totalSymbols).toBe(100);
      expect(memoryStats.estimatedMemorySavings).toBeGreaterThan(0);
      expect(memoryStats.memoryOptimizationLevel).toBe('OPTIMAL');
    });
  });

  describe('Graph Operations', () => {
    it('should maintain graph structure for cross-file relationships', () => {
      // Create a dependency chain
      const classA = SymbolFactory.createMinimalSymbol(
        'ClassA',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        },
        'file:///fileA.cls',
      );
      const classB = SymbolFactory.createMinimalSymbol(
        'ClassB',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        },
        'file:///fileB.cls',
      );
      const classC = SymbolFactory.createMinimalSymbol(
        'ClassC',
        SymbolKind.Class,
        {
          symbolRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        },
        'file:///fileC.cls',
      );

      // Create SymbolTables
      const tableA = new SymbolTable();
      const tableB = new SymbolTable();
      const tableC = new SymbolTable();

      tableA.addSymbol(classA);
      tableB.addSymbol(classB);
      tableC.addSymbol(classC);

      // Add to graph
      symbolGraph.addSymbol(classA, 'file:///fileA.cls', tableA);
      symbolGraph.addSymbol(classB, 'file:///fileB.cls', tableB);
      symbolGraph.addSymbol(classC, 'file:///fileC.cls', tableC);

      // Create dependency chain: A -> B -> C
      symbolGraph.addReference(classA, classB, ReferenceType.TYPE_REFERENCE, {
        symbolRange: {
          startLine: 10,
          startColumn: 1,
          endLine: 10,
          endColumn: 20,
        },
        identifierRange: {
          startLine: 10,
          startColumn: 1,
          endLine: 10,
          endColumn: 20,
        },
      });
      symbolGraph.addReference(classB, classC, ReferenceType.TYPE_REFERENCE, {
        symbolRange: {
          startLine: 15,
          startColumn: 1,
          endLine: 15,
          endColumn: 20,
        },
        identifierRange: {
          startLine: 15,
          startColumn: 1,
          endLine: 15,
          endColumn: 20,
        },
      });

      // Verify dependency analysis
      const analysis = symbolGraph.analyzeDependencies(classA);
      expect(analysis.dependencies).toHaveLength(1);
      expect(analysis.dependencies[0].name).toBe('ClassB');

      const analysisB = symbolGraph.analyzeDependencies(classB);
      expect(analysisB.dependencies).toHaveLength(1);
      expect(analysisB.dependencies[0].name).toBe('ClassC');
      expect(analysisB.dependents).toHaveLength(1);
      expect(analysisB.dependents[0].name).toBe('ClassA');
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large numbers of symbols efficiently', () => {
      const startTime = Date.now();

      // Create SymbolTables per file (10 files for 1000 symbols)
      const symbolTables = new Map<string, SymbolTable>();
      for (let i = 0; i < 10; i++) {
        symbolTables.set(`file:///large/file${i}.cls`, new SymbolTable());
      }

      // Create 1000 symbols
      for (let i = 0; i < 1000; i++) {
        const symbol = SymbolFactory.createMinimalSymbol(
          `LargeSymbol${i}`,
          SymbolKind.Class,
          {
            symbolRange: {
              startLine: i + 1,
              startColumn: 1,
              endLine: i + 1,
              endColumn: 10,
            },
            identifierRange: {
              startLine: i + 1,
              startColumn: 1,
              endLine: i + 1,
              endColumn: 10,
            },
          },
          `file:///large/file${Math.floor(i / 100)}.cls`,
        );

        const fileUri = symbol.fileUri;
        const symbolTable = symbolTables.get(fileUri)!;
        symbolTable.addSymbol(symbol);
        symbolGraph.addSymbol(symbol, fileUri, symbolTable);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds

      // Verify all symbols are accessible
      const allSymbols = symbolGraph.findSymbolByName('LargeSymbol0');
      expect(allSymbols).toHaveLength(1);

      // Verify memory optimization
      const stats = symbolGraph.getStats();
      expect(stats.totalSymbols).toBe(1000);
    });
  });
});
