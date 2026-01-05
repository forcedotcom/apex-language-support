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
import {
  SymbolTable,
  SymbolFactory,
  SymbolKind,
  ApexSymbol,
} from '../../src/types/symbol';
import {
  ReferenceContext,
  SymbolReferenceFactory,
} from '../../src/types/symbolReference';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
} from '../../src/queue/priority-scheduler-utils';
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
    // Shutdown scheduler after all tests to prevent hanging
    await Effect.runPromise(schedulerShutdown());
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
      // Lookup from file level (null scope) - symbols added without scope are at root level
      const symbolTableSymbol = symbolTable.lookup('TestClass', null);
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
      // FQN is normalized to lowercase for Apex case-insensitive convention
      expect(foundSymbol!.fqn).toBe('testclass');
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
      // Lookup from file level (null scope) - symbols added without scope are at root level
      const symbolTableSymbol = symbolTable.lookup('TestClass', null);
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
        'myMethod',
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
      const symbolsByName = symbolGraph.findSymbolByName('myMethod');
      expect(symbolsByName).toHaveLength(1);
      expect(symbolsByName[0].name).toBe('myMethod');

      // Test getSymbolsInFile delegation
      const symbolsInFile = symbolGraph.getSymbolsInFile(
        'file:///test/file.cls',
      );
      expect(symbolsInFile).toHaveLength(2);
      expect(symbolsInFile.map((s) => s.name)).toContain('TestClass');
      expect(symbolsInFile.map((s) => s.name)).toContain('myMethod');
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
        'myMethod',
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
      const lookupResult = symbolGraph.lookupSymbolWithContext('myMethod', {
        fileUri: 'file:///test/file.cls',
        currentScope: 'TestClass',
      });

      expect(lookupResult).toBeDefined();
      expect(lookupResult?.symbol.name).toBe('myMethod');
    });

    it('should provide memory optimization benefits', () => {
      // Create multiple symbols
      const symbols: ApexSymbol[] = [];
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

  describe('SymbolTable Reference Preservation', () => {
    it('should preserve references when replacing SymbolTable during workspace batch processing', () => {
      const fileUri = 'file:///test/TestClass.cls';

      // Step 1: Create initial SymbolTable with references (simulating initial file open)
      const initialSymbolTable = new SymbolTable();
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
        fileUri,
      );
      initialSymbolTable.addSymbol(symbol);

      // Add references to the initial SymbolTable (simulating collectReferences: true)
      const reference1 = SymbolReferenceFactory.createMethodCallReference(
        'createFile',
        {
          symbolRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
        },
        'FileUtilities',
        'testMethod',
      );
      const reference2 = SymbolReferenceFactory.createTypeDeclarationReference(
        'Property__c',
        {
          symbolRange: {
            startLine: 7,
            startColumn: 8,
            endLine: 7,
            endColumn: 18,
          },
          identifierRange: {
            startLine: 7,
            startColumn: 8,
            endLine: 7,
            endColumn: 18,
          },
        },
      );
      initialSymbolTable.addTypeReference(reference1);
      initialSymbolTable.addTypeReference(reference2);

      // Register the initial SymbolTable
      symbolGraph.registerSymbolTable(initialSymbolTable, fileUri);
      symbolGraph.addSymbol(symbol, fileUri, initialSymbolTable);

      // Verify references exist in the registered SymbolTable
      const registeredTable1 = symbolGraph.getSymbolTableForFile(fileUri);
      expect(registeredTable1).toBe(initialSymbolTable);
      expect(registeredTable1!.getAllReferences()).toHaveLength(2);
      expect(
        registeredTable1!.getReferencesAtPosition({ line: 5, character: 15 }),
      ).toHaveLength(1);

      // Step 2: Create new SymbolTable without references (simulating workspace batch processing)
      // This simulates the scenario where workspace batch processing creates a new SymbolTable
      // but doesn't collect references (or collects them differently)
      const newSymbolTable = new SymbolTable();
      const newSymbol = SymbolFactory.createMinimalSymbol(
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
        fileUri,
      );
      newSymbolTable.addSymbol(newSymbol);
      // Note: newSymbolTable has NO references - this simulates the bug scenario

      // Step 3: Register the new SymbolTable (replacing the old one)
      symbolGraph.registerSymbolTable(newSymbolTable, fileUri);

      // Step 4: Verify references are preserved in the new SymbolTable
      const registeredTable2 = symbolGraph.getSymbolTableForFile(fileUri);
      expect(registeredTable2).toBe(newSymbolTable);
      expect(registeredTable2!.getAllReferences()).toHaveLength(2);
      expect(registeredTable2!.getAllReferences()).toContain(reference1);
      expect(registeredTable2!.getAllReferences()).toContain(reference2);

      // Step 5: Verify getReferencesAtPosition still works correctly
      const refsAtPosition1 = registeredTable2!.getReferencesAtPosition({
        line: 5,
        character: 15,
      });
      expect(refsAtPosition1).toHaveLength(1);
      expect(refsAtPosition1[0]).toBe(reference1);

      const refsAtPosition2 = registeredTable2!.getReferencesAtPosition({
        line: 7,
        character: 13,
      });
      expect(refsAtPosition2).toHaveLength(1);
      expect(refsAtPosition2[0]).toBe(reference2);
    });

    it('should merge unique references when both SymbolTables have references', () => {
      const fileUri = 'file:///test/TestClass.cls';

      // Create initial SymbolTable with references
      const initialSymbolTable = new SymbolTable();
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
        fileUri,
      );
      initialSymbolTable.addSymbol(symbol);

      const reference1 = SymbolReferenceFactory.createMethodCallReference(
        'createFile',
        {
          symbolRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
        },
        'FileUtilities',
      );
      initialSymbolTable.addTypeReference(reference1);

      symbolGraph.registerSymbolTable(initialSymbolTable, fileUri);
      symbolGraph.addSymbol(symbol, fileUri, initialSymbolTable);

      // Create new SymbolTable with different references
      const newSymbolTable = new SymbolTable();
      const newSymbol = SymbolFactory.createMinimalSymbol(
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
        fileUri,
      );
      newSymbolTable.addSymbol(newSymbol);

      const reference2 = SymbolReferenceFactory.createTypeDeclarationReference(
        'Property__c',
        {
          symbolRange: {
            startLine: 7,
            startColumn: 8,
            endLine: 7,
            endColumn: 18,
          },
          identifierRange: {
            startLine: 7,
            startColumn: 8,
            endLine: 7,
            endColumn: 18,
          },
        },
      );
      newSymbolTable.addTypeReference(reference2);

      // Register the new SymbolTable (should merge references)
      symbolGraph.registerSymbolTable(newSymbolTable, fileUri);

      // Verify both references are present
      const registeredTable = symbolGraph.getSymbolTableForFile(fileUri);
      expect(registeredTable).toBe(newSymbolTable);
      const allReferences = registeredTable!.getAllReferences();
      expect(allReferences.length).toBeGreaterThanOrEqual(2);
      // Should contain both references
      const hasRef1 = allReferences.some(
        (r) =>
          r.name === reference1.name &&
          r.location.identifierRange.startLine ===
            reference1.location.identifierRange.startLine,
      );
      const hasRef2 = allReferences.some(
        (r) =>
          r.name === reference2.name &&
          r.location.identifierRange.startLine ===
            reference2.location.identifierRange.startLine,
      );
      expect(hasRef1).toBe(true);
      expect(hasRef2).toBe(true);
    });

    it('should not duplicate references when replacing with same SymbolTable instance', () => {
      const fileUri = 'file:///test/TestClass.cls';

      const symbolTable = new SymbolTable();
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
        fileUri,
      );
      symbolTable.addSymbol(symbol);

      const reference = SymbolReferenceFactory.createMethodCallReference(
        'createFile',
        {
          symbolRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
          identifierRange: {
            startLine: 5,
            startColumn: 10,
            endLine: 5,
            endColumn: 20,
          },
        },
        'FileUtilities',
      );
      symbolTable.addTypeReference(reference);

      // Register the same SymbolTable multiple times
      symbolGraph.registerSymbolTable(symbolTable, fileUri);
      symbolGraph.registerSymbolTable(symbolTable, fileUri);
      symbolGraph.registerSymbolTable(symbolTable, fileUri);

      // Verify references are not duplicated
      const registeredTable = symbolGraph.getSymbolTableForFile(fileUri);
      expect(registeredTable).toBe(symbolTable);
      expect(registeredTable!.getAllReferences()).toHaveLength(1);
    });
  });
});
