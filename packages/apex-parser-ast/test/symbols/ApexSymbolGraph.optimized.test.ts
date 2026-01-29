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
import { SymbolTable, SymbolKind, ApexSymbol } from '../../src/types/symbol';
import {
  initialize as schedulerInitialize,
  shutdown as schedulerShutdown,
} from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import * as fs from 'fs';
import * as path from 'path';

describe('ApexSymbolGraph - Optimized Architecture', () => {
  let symbolGraph: ApexSymbolGraph;
  let symbolTable: SymbolTable;
  let compilerService: CompilerService;

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
    compilerService = new CompilerService();
  });

  /**
   * Load a fixture file from the optimized fixtures directory
   */
  const loadFixture = (filename: string): string => {
    const fixturePath = path.join(__dirname, '../fixtures/optimized', filename);
    return fs.readFileSync(fixturePath, 'utf8');
  };

  /**
   * Compile a fixture file and return the SymbolTable
   */
  const compileFixture = (
    filename: string,
    fileUri?: string,
  ): SymbolTable | null => {
    const content = loadFixture(filename);
    const uri = fileUri || `file:///test/${filename}`;
    const listener = new ApexSymbolCollectorListener(undefined, 'full');
    const result = compilerService.compile(content, uri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    return result.result || null;
  };

  describe('Position Data Integrity in Optimized Architecture', () => {
    it('should preserve position data when delegating to SymbolTable', () => {
      const fileUri = 'file:///test/TestClass.cls';

      // Compile TestClass to get real symbol with position data
      const compiledTable = compileFixture('TestClass.cls', fileUri);
      expect(compiledTable).toBeDefined();

      if (!compiledTable) {
        return;
      }

      const symbol = compiledTable
        .getAllSymbols()
        .find((s) => s.name === 'TestClass' && s.kind === SymbolKind.Class);
      expect(symbol).toBeDefined();

      if (!symbol) {
        return;
      }

      // Store original position data
      const originalLocation = { ...symbol.location };
      const originalSymbolRange = { ...symbol.location.symbolRange };
      const originalIdentifierRange = { ...symbol.location.identifierRange };

      // Add symbol to SymbolTable first
      symbolTable.addSymbol(symbol);

      // Add symbol to graph (should only store reference)
      symbolGraph.addSymbol(symbol, fileUri, symbolTable);

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
      // Compile multiple fixture files to get real symbols
      const class1Table = compileFixture(
        'Class1.cls',
        'file:///test/file1.cls',
      );
      const class2Table = compileFixture(
        'Class2.cls',
        'file:///test/file2.cls',
      );

      expect(class1Table).toBeDefined();
      expect(class2Table).toBeDefined();

      if (!class1Table || !class2Table) {
        return;
      }

      const class1Symbol = class1Table
        .getAllSymbols()
        .find((s) => s.name === 'Class1' && s.kind === SymbolKind.Class);
      const class2Symbol = class2Table
        .getAllSymbols()
        .find((s) => s.name === 'Class2' && s.kind === SymbolKind.Class);
      const method1Symbol = class1Table
        .getAllSymbols()
        .find((s) => s.name === 'method1' && s.kind === SymbolKind.Method);

      expect(class1Symbol).toBeDefined();
      expect(class2Symbol).toBeDefined();
      expect(method1Symbol).toBeDefined();

      const symbols = [class1Symbol!, class2Symbol!, method1Symbol!].filter(
        (s) => s !== undefined,
      );

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
      const fileUri = 'file:///test/file.cls';

      // Compile TestClass to get real symbol
      const compiledTable = compileFixture('TestClass.cls', fileUri);
      expect(compiledTable).toBeDefined();

      if (!compiledTable) {
        return;
      }

      const symbol = compiledTable
        .getAllSymbols()
        .find((s) => s.name === 'TestClass' && s.kind === SymbolKind.Class);
      expect(symbol).toBeDefined();

      if (!symbol) {
        return;
      }

      // Store original position data
      const originalLocation = { ...symbol.location };

      // Add to SymbolTable and graph
      symbolTable.addSymbol(symbol);
      symbolGraph.addSymbol(symbol, fileUri, symbolTable);

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
      const fileUri = 'file:///test/file.cls';

      // Compile TestClass to get real symbol
      const compiledTable = compileFixture('TestClass.cls', fileUri);
      expect(compiledTable).toBeDefined();

      if (!compiledTable) {
        return;
      }

      const symbol = compiledTable
        .getAllSymbols()
        .find((s) => s.name === 'TestClass' && s.kind === SymbolKind.Class);
      expect(symbol).toBeDefined();

      if (!symbol) {
        return;
      }

      // Store original position data
      const originalLocation = { ...symbol.location };

      // Add symbol
      symbolTable.addSymbol(symbol);
      symbolGraph.addSymbol(symbol, fileUri, symbolTable);

      // Test different retrieval methods
      const byId = symbolGraph.getSymbol(symbol.id);
      const byName = symbolGraph.lookupSymbolByName('TestClass');
      const byFQN = symbolGraph.lookupSymbolByFQN('TestClass');
      const inFile = symbolGraph.getSymbolsInFile(fileUri);

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
      const fileUri = 'file:///test/file.cls';

      // Compile TestClass to get real symbol
      const compiledTable = compileFixture('TestClass.cls', fileUri);
      expect(compiledTable).toBeDefined();

      if (!compiledTable) {
        return;
      }

      const symbol = compiledTable
        .getAllSymbols()
        .find((s) => s.name === 'TestClass' && s.kind === SymbolKind.Class);
      expect(symbol).toBeDefined();

      if (!symbol) {
        return;
      }

      // Add symbol to SymbolTable first
      symbolTable.addSymbol(symbol);

      // Add symbol to graph (should only store reference)
      symbolGraph.addSymbol(symbol, fileUri, symbolTable);

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
      const fileUri = 'file:///test/file.cls';

      // Compile TestClassWithMethod to get real symbols (class and method)
      const compiledTable = compileFixture('TestClassWithMethod.cls', fileUri);
      expect(compiledTable).toBeDefined();

      if (!compiledTable) {
        return;
      }

      const classSymbol = compiledTable
        .getAllSymbols()
        .find(
          (s) =>
            s.name === 'TestClassWithMethod' && s.kind === SymbolKind.Class,
        );
      const methodSymbol = compiledTable
        .getAllSymbols()
        .find((s) => s.name === 'myMethod' && s.kind === SymbolKind.Method);

      expect(classSymbol).toBeDefined();
      expect(methodSymbol).toBeDefined();

      if (!classSymbol || !methodSymbol) {
        return;
      }

      // Add to SymbolTable
      symbolTable.addSymbol(classSymbol);
      symbolTable.addSymbol(methodSymbol);

      // Add to graph
      symbolGraph.addSymbol(classSymbol, fileUri, symbolTable);
      symbolGraph.addSymbol(methodSymbol, fileUri, symbolTable);

      // Test findSymbolByName delegation
      const symbolsByName = symbolGraph.findSymbolByName('myMethod');
      expect(symbolsByName).toHaveLength(1);
      expect(symbolsByName[0].name).toBe('myMethod');

      // Test getSymbolsInFile delegation
      const symbolsInFile = symbolGraph.getSymbolsInFile(fileUri);
      expect(symbolsInFile.length).toBeGreaterThanOrEqual(2);
      expect(symbolsInFile.map((s) => s.name)).toContain('TestClassWithMethod');
      expect(symbolsInFile.map((s) => s.name)).toContain('myMethod');
    });

    it('should maintain cross-file reference tracking', () => {
      // Compile SourceClass and TargetClass to get real symbols
      const sourceTable = compileFixture(
        'SourceClass.cls',
        'file:///source/file.cls',
      );
      const targetTable = compileFixture(
        'TargetClass.cls',
        'file:///target/file.cls',
      );

      expect(sourceTable).toBeDefined();
      expect(targetTable).toBeDefined();

      if (!sourceTable || !targetTable) {
        return;
      }

      const sourceSymbol = sourceTable
        .getAllSymbols()
        .find((s) => s.name === 'SourceClass' && s.kind === SymbolKind.Class);
      const targetSymbol = targetTable
        .getAllSymbols()
        .find((s) => s.name === 'TargetClass' && s.kind === SymbolKind.Class);

      expect(sourceSymbol).toBeDefined();
      expect(targetSymbol).toBeDefined();

      if (!sourceSymbol || !targetSymbol) {
        return;
      }

      // Register SymbolTables
      symbolGraph.registerSymbolTable(sourceTable, 'file:///source/file.cls');
      symbolGraph.registerSymbolTable(targetTable, 'file:///target/file.cls');

      // Add symbols to graph
      symbolGraph.addSymbol(
        sourceSymbol,
        'file:///source/file.cls',
        sourceTable,
      );
      symbolGraph.addSymbol(
        targetSymbol,
        'file:///target/file.cls',
        targetTable,
      );

      // Find the actual reference from SourceClass to TargetClass in the compiled table
      const sourceReferences = sourceTable.getAllReferences();
      const targetReference = sourceReferences.find(
        (r) => r.name === 'TargetClass',
      );

      expect(targetReference).toBeDefined();
      expect(targetReference?.location).toBeDefined();

      // Add cross-file reference using the actual reference location
      symbolGraph.addReference(
        sourceSymbol,
        targetSymbol,
        ReferenceType.TYPE_REFERENCE,
        targetReference!.location,
      );

      // Verify reference tracking
      const referencesTo = symbolGraph.findReferencesTo(targetSymbol);
      expect(referencesTo.length).toBeGreaterThanOrEqual(1);
      expect(referencesTo[0].symbol.name).toBe('SourceClass');

      const referencesFrom = symbolGraph.findReferencesFrom(sourceSymbol);
      expect(referencesFrom.length).toBeGreaterThanOrEqual(1);
      expect(referencesFrom[0].symbol.name).toBe('TargetClass');
    });

    it('should handle scope-based symbol resolution with context', () => {
      const fileUri = 'file:///test/file.cls';

      // Compile TestClassWithMethod to get real symbols with proper scoping
      const compiledTable = compileFixture('TestClassWithMethod.cls', fileUri);
      expect(compiledTable).toBeDefined();

      if (!compiledTable) {
        return;
      }

      const classSymbol = compiledTable
        .getAllSymbols()
        .find(
          (s) =>
            s.name === 'TestClassWithMethod' && s.kind === SymbolKind.Class,
        );
      const methodSymbol = compiledTable
        .getAllSymbols()
        .find((s) => s.name === 'myMethod' && s.kind === SymbolKind.Method);

      expect(classSymbol).toBeDefined();
      expect(methodSymbol).toBeDefined();

      if (!classSymbol || !methodSymbol) {
        return;
      }

      // Use the compiled SymbolTable which already has proper scoping
      symbolGraph.registerSymbolTable(compiledTable, fileUri);

      // Add symbols to graph
      symbolGraph.addSymbol(classSymbol, fileUri, compiledTable);
      symbolGraph.addSymbol(methodSymbol, fileUri, compiledTable);

      // Test context-based lookup
      const lookupResult = symbolGraph.lookupSymbolWithContext('myMethod', {
        fileUri: fileUri,
        currentScope: 'TestClassWithMethod',
      });

      expect(lookupResult).toBeDefined();
      expect(lookupResult?.symbol.name).toBe('myMethod');
    });

    it('should provide memory optimization benefits', () => {
      // Create multiple symbols using real compilation
      // For performance test, we'll compile a few real files multiple times
      const symbols: ApexSymbol[] = [];
      const fixtureFiles = ['TestClass.cls', 'Class1.cls', 'Class2.cls'];

      for (let i = 0; i < 100; i++) {
        const fixtureFile = fixtureFiles[i % fixtureFiles.length];
        const fileUri = `file:///test/file${i}.cls`;
        const compiledTable = compileFixture(fixtureFile, fileUri);

        if (compiledTable) {
          const classSymbol = compiledTable
            .getAllSymbols()
            .find((s) => s.kind === SymbolKind.Class);
          if (classSymbol) {
            symbols.push(classSymbol);
          }
        }
      }

      // Add all symbols
      for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];
        const fileUri = symbol.fileUri || `file:///test/file${i}.cls`;
        const symbolTable = compileFixture(
          fixtureFiles[i % fixtureFiles.length],
          fileUri,
        );
        if (symbolTable) {
          symbolGraph.addSymbol(symbol, fileUri, symbolTable);
        }
      }

      // Verify memory stats
      const memoryStats = symbolGraph.getMemoryStats();
      expect(memoryStats.totalSymbols).toBeGreaterThan(0);
      expect(memoryStats.estimatedMemorySavings).toBeGreaterThan(0);
      expect(memoryStats.memoryOptimizationLevel).toBe('OPTIMAL');
    });
  });

  describe('Graph Operations', () => {
    it('should maintain graph structure for cross-file relationships', () => {
      // Compile ClassA, ClassB, and ClassC to get real symbols
      const tableA = compileFixture('ClassA.cls', 'file:///fileA.cls');
      const tableB = compileFixture('ClassB.cls', 'file:///fileB.cls');
      const tableC = compileFixture('ClassC.cls', 'file:///fileC.cls');

      expect(tableA).toBeDefined();
      expect(tableB).toBeDefined();
      expect(tableC).toBeDefined();

      if (!tableA || !tableB || !tableC) {
        return;
      }

      const classA = tableA
        .getAllSymbols()
        .find((s) => s.name === 'ClassA' && s.kind === SymbolKind.Class);
      const classB = tableB
        .getAllSymbols()
        .find((s) => s.name === 'ClassB' && s.kind === SymbolKind.Class);
      const classC = tableC
        .getAllSymbols()
        .find((s) => s.name === 'ClassC' && s.kind === SymbolKind.Class);

      expect(classA).toBeDefined();
      expect(classB).toBeDefined();
      expect(classC).toBeDefined();

      if (!classA || !classB || !classC) {
        return;
      }

      // Register SymbolTables
      symbolGraph.registerSymbolTable(tableA, 'file:///fileA.cls');
      symbolGraph.registerSymbolTable(tableB, 'file:///fileB.cls');
      symbolGraph.registerSymbolTable(tableC, 'file:///fileC.cls');

      // Add to graph
      symbolGraph.addSymbol(classA, 'file:///fileA.cls', tableA);
      symbolGraph.addSymbol(classB, 'file:///fileB.cls', tableB);
      symbolGraph.addSymbol(classC, 'file:///fileC.cls', tableC);

      // Find actual references from compiled tables
      const refsAtoB = tableA
        .getAllReferences()
        .find((r) => r.name === 'ClassB');
      const refsBtoC = tableB
        .getAllReferences()
        .find((r) => r.name === 'ClassC');

      expect(refsAtoB).toBeDefined();
      expect(refsAtoB?.location).toBeDefined();
      expect(refsBtoC).toBeDefined();
      expect(refsBtoC?.location).toBeDefined();

      // Create dependency chain: A -> B -> C using actual reference locations
      symbolGraph.addReference(
        classA,
        classB,
        ReferenceType.TYPE_REFERENCE,
        refsAtoB!.location,
      );

      symbolGraph.addReference(
        classB,
        classC,
        ReferenceType.TYPE_REFERENCE,
        refsBtoC!.location,
      );

      // Verify dependency analysis
      const analysis = symbolGraph.analyzeDependencies(classA);
      expect(analysis.dependencies.length).toBeGreaterThanOrEqual(1);
      expect(analysis.dependencies[0].name).toBe('ClassB');

      const analysisB = symbolGraph.analyzeDependencies(classB);
      expect(analysisB.dependencies.length).toBeGreaterThanOrEqual(1);
      expect(analysisB.dependencies[0].name).toBe('ClassC');
      expect(analysisB.dependents.length).toBeGreaterThanOrEqual(1);
      expect(analysisB.dependents[0].name).toBe('ClassA');
    });
  });

  describe('Performance and Memory', () => {
    it('should handle large numbers of symbols efficiently', () => {
      const startTime = Date.now();

      // Use real compilation for performance test
      // Compile multiple fixture files to create many symbols
      const fixtureFiles = [
        'TestClass.cls',
        'Class1.cls',
        'Class2.cls',
        'ClassA.cls',
        'ClassB.cls',
      ];
      const symbolCount = 100; // Reduced from 1000 for test performance

      for (let i = 0; i < symbolCount; i++) {
        const fixtureFile = fixtureFiles[i % fixtureFiles.length];
        const fileUri = `file:///large/file${Math.floor(i / 20)}.cls`;
        const compiledTable = compileFixture(fixtureFile, fileUri);

        if (compiledTable) {
          const classSymbol = compiledTable
            .getAllSymbols()
            .find((s) => s.kind === SymbolKind.Class);
          if (classSymbol) {
            symbolGraph.registerSymbolTable(compiledTable, fileUri);
            symbolGraph.addSymbol(classSymbol, fileUri, compiledTable);
          }
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(10000); // 10 seconds for real compilation

      // Verify symbols are accessible
      const allSymbols = symbolGraph.findSymbolByName('TestClass');
      expect(allSymbols.length).toBeGreaterThan(0);

      // Verify memory optimization
      const stats = symbolGraph.getStats();
      expect(stats.totalSymbols).toBeGreaterThan(0);
    });
  });

  describe('SymbolTable Reference Preservation', () => {
    it('should preserve references when replacing SymbolTable during workspace batch processing', () => {
      const fileUri = 'file:///test/TestClass.cls';

      // Compile FileUtilities first (needed for cross-file reference)
      const fileUtilitiesTable = compileFixture(
        'FileUtilities.cls',
        'file:///test/FileUtilities.cls',
      );
      if (fileUtilitiesTable) {
        symbolGraph.registerSymbolTable(
          fileUtilitiesTable,
          'file:///test/FileUtilities.cls',
        );
        const fileUtilitiesSymbol = fileUtilitiesTable
          .getAllSymbols()
          .find((s) => s.name === 'FileUtilities');
        if (fileUtilitiesSymbol) {
          symbolGraph.addSymbol(
            fileUtilitiesSymbol,
            'file:///test/FileUtilities.cls',
            fileUtilitiesTable,
          );
        }
      }

      // Step 1: Create initial SymbolTable with references (simulating initial file open)
      // Compile TestClass with references enabled
      const initialSymbolTable = compileFixture('TestClass.cls', fileUri);
      expect(initialSymbolTable).toBeDefined();

      if (!initialSymbolTable) {
        return;
      }

      const testClassSymbol = initialSymbolTable
        .getAllSymbols()
        .find((s) => s.name === 'TestClass' && s.kind === SymbolKind.Class);
      expect(testClassSymbol).toBeDefined();

      // Get references from compilation - should include FileUtilities.createFile and Property__c
      const allReferences = initialSymbolTable.getAllReferences();
      expect(allReferences.length).toBeGreaterThan(0);

      // Find the FileUtilities.createFile reference (should be around line 4)
      const createFileRef = allReferences.find(
        (r) => r.name === 'createFile' || r.name === 'FileUtilities',
      );
      expect(createFileRef).toBeDefined();

      // Register the initial SymbolTable
      symbolGraph.registerSymbolTable(initialSymbolTable, fileUri);
      if (testClassSymbol) {
        symbolGraph.addSymbol(testClassSymbol, fileUri, initialSymbolTable);
      }

      // Verify references exist in the registered SymbolTable
      const registeredTable1 = symbolGraph.getSymbolTableForFile(fileUri);
      expect(registeredTable1).toBe(initialSymbolTable);
      expect(registeredTable1!.getAllReferences().length).toBeGreaterThan(0);

      // Step 2: Create new SymbolTable without references (simulating workspace batch processing)
      // Compile TestClass again but this time we'll simulate a scenario where references might be lost
      const newSymbolTable = compileFixture('TestClass.cls', fileUri);
      expect(newSymbolTable).toBeDefined();

      if (!newSymbolTable) {
        return;
      }

      const newTestClassSymbol = newSymbolTable
        .getAllSymbols()
        .find((s) => s.name === 'TestClass' && s.kind === SymbolKind.Class);
      expect(newTestClassSymbol).toBeDefined();

      // Step 3: Register the new SymbolTable (replacing the old one)
      // This should preserve references from initialSymbolTable
      symbolGraph.registerSymbolTable(newSymbolTable, fileUri);

      // Step 4: Verify references are preserved in the new SymbolTable
      const registeredTable2 = symbolGraph.getSymbolTableForFile(fileUri);
      expect(registeredTable2).toBe(newSymbolTable);
      // References should be preserved (merged from initialSymbolTable)
      expect(registeredTable2!.getAllReferences().length).toBeGreaterThan(0);

      // Step 5: Verify getReferencesAtPosition still works correctly
      // Find references at the position where FileUtilities.createFile is called
      const allRefs = registeredTable2!.getAllReferences();
      const fileUtilitiesRef = allRefs.find(
        (r) => r.name === 'createFile' || r.name === 'FileUtilities',
      );
      expect(fileUtilitiesRef).toBeDefined();
      expect(fileUtilitiesRef?.location).toBeDefined();

      // Use the actual reference position from the compiled table
      const refPosition = fileUtilitiesRef!.location.identifierRange.startLine;
      const refCharacter =
        fileUtilitiesRef!.location.identifierRange.startColumn;
      const refsAtCreateFile = registeredTable2!.getReferencesAtPosition({
        line: refPosition,
        character: refCharacter,
      });
      // Should find at least one reference (FileUtilities or createFile)
      expect(refsAtCreateFile.length).toBeGreaterThan(0);
    });

    it('should merge unique references when both SymbolTables have references', () => {
      const fileUri = 'file:///test/TestClass.cls';

      // Compile FileUtilities first (needed for cross-file reference)
      const fileUtilitiesTable = compileFixture(
        'FileUtilities.cls',
        'file:///test/FileUtilities.cls',
      );
      if (fileUtilitiesTable) {
        symbolGraph.registerSymbolTable(
          fileUtilitiesTable,
          'file:///test/FileUtilities.cls',
        );
        const fileUtilitiesSymbol = fileUtilitiesTable
          .getAllSymbols()
          .find((s) => s.name === 'FileUtilities');
        if (fileUtilitiesSymbol) {
          symbolGraph.addSymbol(
            fileUtilitiesSymbol,
            'file:///test/FileUtilities.cls',
            fileUtilitiesTable,
          );
        }
      }

      // Create initial SymbolTable with references (compiled with references)
      const initialSymbolTable = compileFixture('TestClass.cls', fileUri);
      expect(initialSymbolTable).toBeDefined();

      if (!initialSymbolTable) {
        return;
      }

      const testClassSymbol = initialSymbolTable
        .getAllSymbols()
        .find((s) => s.name === 'TestClass' && s.kind === SymbolKind.Class);
      expect(testClassSymbol).toBeDefined();

      // Get references from initial compilation
      const initialReferences = initialSymbolTable.getAllReferences();
      expect(initialReferences.length).toBeGreaterThan(0);

      // Find FileUtilities.createFile reference
      const createFileRef = initialReferences.find(
        (r) => r.name === 'createFile' || r.name === 'FileUtilities',
      );
      expect(createFileRef).toBeDefined();

      symbolGraph.registerSymbolTable(initialSymbolTable, fileUri);
      if (testClassSymbol) {
        symbolGraph.addSymbol(testClassSymbol, fileUri, initialSymbolTable);
      }

      // Create new SymbolTable with references (compile again - should have same references)
      const newSymbolTable = compileFixture('TestClass.cls', fileUri);
      expect(newSymbolTable).toBeDefined();

      if (!newSymbolTable) {
        return;
      }

      const newTestClassSymbol = newSymbolTable
        .getAllSymbols()
        .find((s) => s.name === 'TestClass' && s.kind === SymbolKind.Class);
      expect(newTestClassSymbol).toBeDefined();

      const newReferences = newSymbolTable.getAllReferences();
      // Find Property__c reference (should be in the new compilation)
      const propertyRef = newReferences.find((r) => r.name === 'Property__c');
      expect(propertyRef).toBeDefined();

      // Register the new SymbolTable (should merge references)
      symbolGraph.registerSymbolTable(newSymbolTable, fileUri);

      // Verify both references are present (merged)
      const registeredTable = symbolGraph.getSymbolTableForFile(fileUri);
      expect(registeredTable).toBe(newSymbolTable);
      const allReferences = registeredTable!.getAllReferences();
      expect(allReferences.length).toBeGreaterThanOrEqual(2);

      // Should contain both FileUtilities.createFile and Property__c references
      const hasCreateFileRef = allReferences.some(
        (r) => r.name === 'createFile' || r.name === 'FileUtilities',
      );
      const hasPropertyRef = allReferences.some(
        (r) => r.name === 'Property__c',
      );
      expect(hasCreateFileRef).toBe(true);
      expect(hasPropertyRef).toBe(true);
    });

    it('should not duplicate references when replacing with same SymbolTable instance', () => {
      const fileUri = 'file:///test/TestClass.cls';

      // Compile FileUtilities first (needed for cross-file reference)
      const fileUtilitiesTable = compileFixture(
        'FileUtilities.cls',
        'file:///test/FileUtilities.cls',
      );
      if (fileUtilitiesTable) {
        symbolGraph.registerSymbolTable(
          fileUtilitiesTable,
          'file:///test/FileUtilities.cls',
        );
        const fileUtilitiesSymbol = fileUtilitiesTable
          .getAllSymbols()
          .find((s) => s.name === 'FileUtilities');
        if (fileUtilitiesSymbol) {
          symbolGraph.addSymbol(
            fileUtilitiesSymbol,
            'file:///test/FileUtilities.cls',
            fileUtilitiesTable,
          );
        }
      }

      // Compile TestClass to get real SymbolTable with references
      const symbolTable = compileFixture('TestClass.cls', fileUri);
      expect(symbolTable).toBeDefined();

      if (!symbolTable) {
        return;
      }

      const testClassSymbol = symbolTable
        .getAllSymbols()
        .find((s) => s.name === 'TestClass' && s.kind === SymbolKind.Class);
      expect(testClassSymbol).toBeDefined();

      const initialReferenceCount = symbolTable.getAllReferences().length;
      expect(initialReferenceCount).toBeGreaterThan(0);

      // Register the same SymbolTable multiple times
      symbolGraph.registerSymbolTable(symbolTable, fileUri);
      symbolGraph.registerSymbolTable(symbolTable, fileUri);
      symbolGraph.registerSymbolTable(symbolTable, fileUri);

      // Verify references are not duplicated
      const registeredTable = symbolGraph.getSymbolTableForFile(fileUri);
      expect(registeredTable).toBe(symbolTable);
      expect(registeredTable!.getAllReferences().length).toBe(
        initialReferenceCount,
      );
    });
  });

  describe('clearFileIndex', () => {
    it('should clear file indexes without removing the SymbolTable', () => {
      const fileUri = 'file:///test/TestClass.cls';

      // Compile TestClass to get real symbol
      const compiledTable = compileFixture('TestClass.cls', fileUri);
      expect(compiledTable).toBeDefined();

      if (!compiledTable) {
        return;
      }

      const testClassSymbol = compiledTable
        .getAllSymbols()
        .find((s) => s.name === 'TestClass' && s.kind === SymbolKind.Class);
      expect(testClassSymbol).toBeDefined();

      if (!testClassSymbol) {
        return;
      }

      // Register SymbolTable and add symbol
      symbolGraph.registerSymbolTable(compiledTable, fileUri);
      symbolGraph.addSymbol(testClassSymbol, fileUri, compiledTable);

      // Verify symbol exists in graph before clearing
      const symbolsBeforeClear = symbolGraph.getSymbolsInFile(fileUri);
      expect(symbolsBeforeClear.length).toBeGreaterThan(0);

      // Verify SymbolTable is registered
      const tableBeforeClear = symbolGraph.getSymbolTableForFile(fileUri);
      expect(tableBeforeClear).toBe(compiledTable);

      // Clear the file index
      symbolGraph.clearFileIndex(fileUri);

      // Verify file index is cleared (no symbols in graph)
      const symbolsAfterClear = symbolGraph.getSymbolsInFile(fileUri);
      expect(symbolsAfterClear.length).toBe(0);

      // Verify SymbolTable is still registered (NOT removed)
      const tableAfterClear = symbolGraph.getSymbolTableForFile(fileUri);
      expect(tableAfterClear).toBe(compiledTable);
    });

    it('should allow re-adding symbols after clearFileIndex', () => {
      const fileUri = 'file:///test/TestClass.cls';

      // Compile TestClass to get real symbol
      const compiledTable = compileFixture('TestClass.cls', fileUri);
      expect(compiledTable).toBeDefined();

      if (!compiledTable) {
        return;
      }

      const testClassSymbol = compiledTable
        .getAllSymbols()
        .find((s) => s.name === 'TestClass' && s.kind === SymbolKind.Class);
      expect(testClassSymbol).toBeDefined();

      if (!testClassSymbol) {
        return;
      }

      // Register SymbolTable and add symbol
      symbolGraph.registerSymbolTable(compiledTable, fileUri);
      symbolGraph.addSymbol(testClassSymbol, fileUri, compiledTable);

      // Clear the file index
      symbolGraph.clearFileIndex(fileUri);

      // Re-add the symbol
      symbolGraph.addSymbol(testClassSymbol, fileUri, compiledTable);

      // Verify symbol is accessible again
      const symbolsAfterReadd = symbolGraph.getSymbolsInFile(fileUri);
      expect(symbolsAfterReadd.length).toBeGreaterThan(0);
      expect(symbolsAfterReadd[0].name).toBe('TestClass');
    });

    it('should clear all index types for a file', () => {
      const fileUri = 'file:///test/TestClass.cls';

      // Compile TestClass to get real symbol
      const compiledTable = compileFixture('TestClass.cls', fileUri);
      expect(compiledTable).toBeDefined();

      if (!compiledTable) {
        return;
      }

      const testClassSymbol = compiledTable
        .getAllSymbols()
        .find((s) => s.name === 'TestClass' && s.kind === SymbolKind.Class);
      expect(testClassSymbol).toBeDefined();

      if (!testClassSymbol) {
        return;
      }

      // Register SymbolTable and add symbol
      symbolGraph.registerSymbolTable(compiledTable, fileUri);
      symbolGraph.addSymbol(testClassSymbol, fileUri, compiledTable);

      // Verify symbol is findable by name before clearing
      const byNameBefore = symbolGraph.findSymbolByName('TestClass');
      expect(byNameBefore.length).toBeGreaterThan(0);

      // Clear the file index
      symbolGraph.clearFileIndex(fileUri);

      // Verify symbol is NOT findable by name after clearing
      const byNameAfter = symbolGraph.findSymbolByName('TestClass');
      expect(byNameAfter.length).toBe(0);
    });

    it('should be called by removeFile and also remove SymbolTable', () => {
      const fileUri = 'file:///test/TestClass.cls';

      // Compile TestClass to get real symbol
      const compiledTable = compileFixture('TestClass.cls', fileUri);
      expect(compiledTable).toBeDefined();

      if (!compiledTable) {
        return;
      }

      const testClassSymbol = compiledTable
        .getAllSymbols()
        .find((s) => s.name === 'TestClass' && s.kind === SymbolKind.Class);
      expect(testClassSymbol).toBeDefined();

      if (!testClassSymbol) {
        return;
      }

      // Register SymbolTable and add symbol
      symbolGraph.registerSymbolTable(compiledTable, fileUri);
      symbolGraph.addSymbol(testClassSymbol, fileUri, compiledTable);

      // Verify SymbolTable is registered before removal
      const tableBefore = symbolGraph.getSymbolTableForFile(fileUri);
      expect(tableBefore).toBe(compiledTable);

      // Remove the file (should clear indexes AND remove SymbolTable)
      symbolGraph.removeFile(fileUri);

      // Verify file index is cleared
      const symbolsAfterRemove = symbolGraph.getSymbolsInFile(fileUri);
      expect(symbolsAfterRemove.length).toBe(0);

      // Verify SymbolTable is also removed (unlike clearFileIndex)
      const tableAfter = symbolGraph.getSymbolTableForFile(fileUri);
      expect(tableAfter).toBeUndefined();
    });
  });
});
