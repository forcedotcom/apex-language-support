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

describe('ApexSymbolGraph - Optimized Architecture', () => {
  let symbolGraph: ApexSymbolGraph;
  let symbolTable: SymbolTable;

  beforeEach(() => {
    symbolGraph = new ApexSymbolGraph();
    symbolTable = new SymbolTable();
  });

  describe('Optimized Symbol Storage', () => {
    it('should store symbols in SymbolTable and only references in graph', () => {
      // Create a symbol
      const symbol = SymbolFactory.createMinimalSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        '/test/file.cls',
      );

      // Add symbol to SymbolTable first
      symbolTable.addSymbol(symbol);

      // Add symbol to graph (should only store reference)
      symbolGraph.addSymbol(symbol, '/test/file.cls', symbolTable);

      // Verify symbol exists in graph
      const foundSymbol = symbolGraph.getSymbol(
        `${symbol.filePath}:${symbol.name}`,
      );
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
        { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        '/test/file.cls',
      );

      const methodSymbol = SymbolFactory.createMinimalSymbol(
        'testMethod',
        SymbolKind.Method,
        { startLine: 5, startColumn: 1, endLine: 5, endColumn: 20 },
        '/test/file.cls',
      );

      // Add to SymbolTable
      symbolTable.addSymbol(classSymbol);
      symbolTable.addSymbol(methodSymbol);

      // Add to graph
      symbolGraph.addSymbol(classSymbol, '/test/file.cls', symbolTable);
      symbolGraph.addSymbol(methodSymbol, '/test/file.cls', symbolTable);

      // Test findSymbolByName delegation
      const symbolsByName = symbolGraph.findSymbolByName('testMethod');
      expect(symbolsByName).toHaveLength(1);
      expect(symbolsByName[0].name).toBe('testMethod');

      // Test getSymbolsInFile delegation
      const symbolsInFile = symbolGraph.getSymbolsInFile('/test/file.cls');
      expect(symbolsInFile).toHaveLength(2);
      expect(symbolsInFile.map((s) => s.name)).toContain('TestClass');
      expect(symbolsInFile.map((s) => s.name)).toContain('testMethod');
    });

    it('should maintain cross-file reference tracking', () => {
      // Create symbols in different files
      const sourceSymbol = SymbolFactory.createMinimalSymbol(
        'SourceClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        '/source/file.cls',
      );

      const targetSymbol = SymbolFactory.createMinimalSymbol(
        'TargetClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        '/target/file.cls',
      );

      // Create SymbolTables for each file
      const sourceSymbolTable = new SymbolTable();
      const targetSymbolTable = new SymbolTable();

      sourceSymbolTable.addSymbol(sourceSymbol);
      targetSymbolTable.addSymbol(targetSymbol);

      // Add symbols to graph
      symbolGraph.addSymbol(
        sourceSymbol,
        '/source/file.cls',
        sourceSymbolTable,
      );
      symbolGraph.addSymbol(
        targetSymbol,
        '/target/file.cls',
        targetSymbolTable,
      );

      // Add cross-file reference
      symbolGraph.addReference(
        sourceSymbol,
        targetSymbol,
        ReferenceType.TYPE_REFERENCE,
        { startLine: 10, startColumn: 1, endLine: 10, endColumn: 20 },
      );

      // Verify reference tracking
      const referencesTo = symbolGraph.findReferencesTo(targetSymbol);
      expect(referencesTo).toHaveLength(1);
      expect(referencesTo[0].symbol.name).toBe('SourceClass');

      const referencesFrom = symbolGraph.findReferencesFrom(sourceSymbol);
      expect(referencesFrom).toHaveLength(1);
      expect(referencesFrom[0].symbol.name).toBe('TargetClass');
    });

    it('should handle scope-based symbol resolution', () => {
      // Create symbols with different scopes
      const classSymbol = SymbolFactory.createMinimalSymbol(
        'TestClass',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        '/test/file.cls',
      );

      const methodSymbol = SymbolFactory.createMinimalSymbol(
        'testMethod',
        SymbolKind.Method,
        { startLine: 5, startColumn: 1, endLine: 5, endColumn: 20 },
        '/test/file.cls',
      );

      // Add to SymbolTable with scope management
      symbolTable.addSymbol(classSymbol);
      symbolTable.enterScope('TestClass', 'class');
      symbolTable.addSymbol(methodSymbol);
      symbolTable.exitScope();

      // Add to graph
      symbolGraph.addSymbol(classSymbol, '/test/file.cls', symbolTable);
      symbolGraph.addSymbol(methodSymbol, '/test/file.cls', symbolTable);

      // Test context-based lookup
      const lookupResult = symbolGraph.lookupSymbolWithContext('testMethod', {
        sourceFile: '/test/file.cls',
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
          { startLine: i + 1, startColumn: 1, endLine: i + 1, endColumn: 10 },
          `/test/file${i}.cls`,
        );
        symbols.push(symbol);
      }

      // Add all symbols
      for (const symbol of symbols) {
        const symbolTable = new SymbolTable();
        symbolTable.addSymbol(symbol);
        symbolGraph.addSymbol(symbol, symbol.filePath, symbolTable);
      }

      // Verify memory stats
      const memoryStats = symbolGraph.getMemoryStats();
      expect(memoryStats.totalSymbols).toBe(100);
      expect(memoryStats.estimatedMemorySavings).toBeGreaterThan(0);
      expect(memoryStats.memoryOptimizationLevel).toBe('OPTIMIZED');
    });
  });

  describe('Graph Operations', () => {
    it('should maintain graph structure for cross-file relationships', () => {
      // Create a dependency chain
      const classA = SymbolFactory.createMinimalSymbol(
        'ClassA',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        '/fileA.cls',
      );
      const classB = SymbolFactory.createMinimalSymbol(
        'ClassB',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        '/fileB.cls',
      );
      const classC = SymbolFactory.createMinimalSymbol(
        'ClassC',
        SymbolKind.Class,
        { startLine: 1, startColumn: 1, endLine: 1, endColumn: 10 },
        '/fileC.cls',
      );

      // Create SymbolTables
      const tableA = new SymbolTable();
      const tableB = new SymbolTable();
      const tableC = new SymbolTable();

      tableA.addSymbol(classA);
      tableB.addSymbol(classB);
      tableC.addSymbol(classC);

      // Add to graph
      symbolGraph.addSymbol(classA, '/fileA.cls', tableA);
      symbolGraph.addSymbol(classB, '/fileB.cls', tableB);
      symbolGraph.addSymbol(classC, '/fileC.cls', tableC);

      // Create dependency chain: A -> B -> C
      symbolGraph.addReference(classA, classB, ReferenceType.TYPE_REFERENCE, {
        startLine: 10,
        startColumn: 1,
        endLine: 10,
        endColumn: 20,
      });
      symbolGraph.addReference(classB, classC, ReferenceType.TYPE_REFERENCE, {
        startLine: 15,
        startColumn: 1,
        endLine: 15,
        endColumn: 20,
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
        symbolTables.set(`/large/file${i}.cls`, new SymbolTable());
      }

      // Create 1000 symbols
      for (let i = 0; i < 1000; i++) {
        const symbol = SymbolFactory.createMinimalSymbol(
          `LargeSymbol${i}`,
          SymbolKind.Class,
          { startLine: i + 1, startColumn: 1, endLine: i + 1, endColumn: 10 },
          `/large/file${Math.floor(i / 100)}.cls`,
        );

        const filePath = symbol.filePath;
        const symbolTable = symbolTables.get(filePath)!;
        symbolTable.addSymbol(symbol);
        symbolGraph.addSymbol(symbol, filePath, symbolTable);
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
