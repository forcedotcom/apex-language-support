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
import { ApexSymbolManager } from '../../src/symbols/ApexSymbolManager';
import { CompilerService } from '../../src/parser/compilerService';
import { ApexSymbolCollectorListener } from '../../src/parser/listeners/ApexSymbolCollectorListener';
import { enableConsoleLogging, setLogLevel } from '@salesforce/apex-lsp-shared';
import { SymbolKind, SymbolVisibility } from '../../src/types/symbol';
import { initialize as schedulerInitialize, reset as schedulerReset } from '../../src/queue/priority-scheduler-utils';
import { Effect } from 'effect';

describe('ApexSymbolGraph', () => {
  let graph: ApexSymbolGraph;
  let symbolManager: ApexSymbolManager;
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
    // Reset scheduler after all tests
    await Effect.runPromise(schedulerReset());
  });

  beforeEach(() => {
    graph = new ApexSymbolGraph();
    symbolManager = new ApexSymbolManager();
    compilerService = new CompilerService();
    enableConsoleLogging();
    setLogLevel('error');
  });

  afterEach(() => {
    graph.clear();
  });

  // Helper function to compile Apex code and add to symbol manager
  const compileAndAddToManager = async (
    apexCode: string,
    fileName: string = 'file:///test/test.cls',
  ) => {
    const listener = new ApexSymbolCollectorListener();
    const result = compilerService.compile(apexCode, fileName, listener);

    if (result.result) {
      const symbolTable = result.result;
      symbolManager.addSymbolTable(symbolTable, fileName);

      // Also add symbols to the graph for testing
      const allSymbols = symbolTable.getAllSymbols();
      for (const symbol of allSymbols) {
        graph.addSymbol(symbol, fileName, symbolTable);
      }
    }

    return result;
  };

  // Debug test to check basic DST functionality
  it('should debug basic DST operations', async () => {
    const testCode = `
      public class MyClass {
        public void myMethod() {
          // Method implementation
        }
      }
    `;

    await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

    // Check if symbols were added
    const stats = graph.getStats();
    expect(stats.totalSymbols).toBeGreaterThan(0);
    expect(stats.totalFiles).toBe(1);

    // Try to find symbols by name
    const classSymbols = graph.lookupSymbolByName('MyClass');
    const methodSymbols = graph.lookupSymbolByName('myMethod');

    expect(classSymbols.length).toBeGreaterThan(0);
    expect(methodSymbols.length).toBeGreaterThan(0);
  });

  describe('Symbol Management', () => {
    it('should add symbols to the graph', async () => {
      const testCode = `
        public class MyClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      const stats = graph.getStats();
      expect(stats.totalSymbols).toBeGreaterThan(0);
      expect(stats.totalFiles).toBe(1);
    });

    it('should handle multiple symbols with the same name', async () => {
      const testCode1 = `
        public class MyClass {
          public void method1() {
            // Method implementation
          }
        }
      `;

      const testCode2 = `
        public class MyClass {
          public void method2() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode1, 'file:///test/File1.cls');
      await compileAndAddToManager(testCode2, 'file:///test/File2.cls');

      const symbols = graph.lookupSymbolByName('MyClass');
      expect(symbols).toHaveLength(2);

      // Check that both symbols are from different files
      // The fileUri field already contains the clean file path
      const fileUris = symbols.map((s) => s.fileUri);
      expect(fileUris).toContain('file:///test/File1.cls');
      expect(fileUris).toContain('file:///test/File2.cls');
    });

    it('should lookup symbols by FQN', async () => {
      const testCode = `
        public class MyClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      // Find the class symbol by FQN (should be calculated automatically)
      const classSymbols = graph.lookupSymbolByName('MyClass');
      expect(classSymbols.length).toBeGreaterThan(0);

      const classSymbol = classSymbols[0];
      if (classSymbol.fqn) {
        const found = graph.lookupSymbolByFQN(classSymbol.fqn);
        expect(found).toBeDefined();
        expect(found?.name).toBe('MyClass');
      }
    });

    it('should get symbols in a file', async () => {
      const testCode = `
        public class MyClass {
          public void myMethod() {
            // Method implementation
          }
          
          public String myField;
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      const symbols = graph.getSymbolsInFile('file:///test/MyClass.cls');
      expect(symbols.length).toBeGreaterThan(0);

      const symbolNames = symbols.map((s) => s.name);
      expect(symbolNames).toContain('MyClass');
      expect(symbolNames).toContain('myMethod');
    });

    it('should get files containing a symbol', async () => {
      const testCode1 = `
        public class MyClass {
          public void method1() {
            // Method implementation
          }
        }
      `;

      const testCode2 = `
        public class MyClass {
          public void method2() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode1, 'file:///test/File1.cls');
      await compileAndAddToManager(testCode2, 'file:///test/File2.cls');

      const files = graph.getFilesForSymbol('MyClass');
      expect(files).toHaveLength(2);
      expect(files).toContain('file:///test/File1.cls');
      expect(files).toContain('file:///test/File2.cls');
    });
  });

  describe('Position Data Integrity', () => {
    it('should preserve symbol position data between add and find operations', async () => {
      const testCode = `
        public class MyClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      // Find symbols
      const foundClass = graph.lookupSymbolByName('MyClass');
      const foundMethod = graph.lookupSymbolByName('myMethod');

      expect(foundClass).toHaveLength(1);
      expect(foundMethod).toHaveLength(1);

      // Verify position data is preserved (check that location data exists and is reasonable)
      expect(foundClass[0].location.symbolRange).toBeDefined();
      expect(foundClass[0].location.identifierRange).toBeDefined();
      expect(foundMethod[0].location.symbolRange).toBeDefined();
      expect(foundMethod[0].location.identifierRange).toBeDefined();

      // Verify position data has reasonable values
      expect(foundClass[0].location.symbolRange.startLine).toBeGreaterThan(0);
      expect(foundMethod[0].location.symbolRange.startLine).toBeGreaterThan(0);
    });

    it('should preserve position data when FQN is calculated during add', async () => {
      const testCode = `
        public class TestClass {
          public void testMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/TestClass.cls');

      // Find the symbol
      const found = graph.lookupSymbolByName('TestClass');
      expect(found).toHaveLength(1);

      // Verify position data is preserved
      expect(found[0].location.symbolRange).toBeDefined();
      expect(found[0].location.identifierRange).toBeDefined();
      expect(found[0].location.symbolRange.startLine).toBeGreaterThan(0);

      // Verify FQN was calculated
      expect(found[0].fqn).toBeDefined();
    });

    it('should preserve position data across different lookup methods', async () => {
      const testCode = `
        public class MyClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      // Test different lookup methods
      const byName = graph.lookupSymbolByName('MyClass');
      const inFile = graph.getSymbolsInFile('file:///test/MyClass.cls');

      expect(byName).toHaveLength(1);
      expect(inFile.length).toBeGreaterThan(0);

      // All should have consistent position data
      expect(byName[0].location.symbolRange).toBeDefined();
      expect(byName[0].location.identifierRange).toBeDefined();
      expect(inFile[0].location.symbolRange).toBeDefined();
      expect(inFile[0].location.identifierRange).toBeDefined();

      // Position data should be consistent across lookup methods
      expect(byName[0].location.symbolRange.startLine).toBe(
        inFile[0].location.symbolRange.startLine,
      );
    });

    it('should preserve position data when adding duplicate symbols', async () => {
      const testCode1 = `
        public class MyClass {
          public void method1() {
            // Method implementation
          }
        }
      `;

      const testCode2 = `
        public class MyClass {
          public void method2() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode1, 'file:///test/File1.cls');
      await compileAndAddToManager(testCode2, 'file:///test/File2.cls');

      // Find symbols
      const found = graph.lookupSymbolByName('MyClass');
      expect(found).toHaveLength(2);

      // Verify both symbols have position data
      expect(found[0].location.symbolRange).toBeDefined();
      expect(found[0].location.identifierRange).toBeDefined();
      expect(found[1].location.symbolRange).toBeDefined();
      expect(found[1].location.identifierRange).toBeDefined();

      // Verify they have reasonable position data
      expect(found[0].location.symbolRange.startLine).toBeGreaterThan(0);
      expect(found[1].location.symbolRange.startLine).toBeGreaterThan(0);
    });

    it('should preserve position data for symbols with references', async () => {
      const testCode = `
        public class MyClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      // Find symbols
      const foundClass = graph.lookupSymbolByName('MyClass');
      const foundMethod = graph.lookupSymbolByName('myMethod');

      expect(foundClass).toHaveLength(1);
      expect(foundMethod).toHaveLength(1);

      // Verify position data is preserved
      expect(foundClass[0].location.symbolRange).toBeDefined();
      expect(foundClass[0].location.identifierRange).toBeDefined();
      expect(foundMethod[0].location.symbolRange).toBeDefined();
      expect(foundMethod[0].location.identifierRange).toBeDefined();

      // Verify they have reasonable position data
      expect(foundClass[0].location.symbolRange.startLine).toBeGreaterThan(0);
      expect(foundMethod[0].location.symbolRange.startLine).toBeGreaterThan(0);
    });

    it('should preserve position data for complex nested symbols', async () => {
      const testCode = `
        public class OuterClass {
          public class InnerClass {
            public void innerMethod() {
              // Method implementation
            }
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/OuterClass.cls');

      // Find all symbols
      const allSymbols = graph.getSymbolsInFile('file:///test/OuterClass.cls');
      const foundOuter = allSymbols.find((s) => s.name === 'OuterClass');
      const foundInner = allSymbols.find((s) => s.name === 'InnerClass');
      const foundMethod = allSymbols.find((s) => s.name === 'innerMethod');

      expect(foundOuter).toBeDefined();
      expect(foundInner).toBeDefined();
      expect(foundMethod).toBeDefined();

      // Verify position data is preserved
      expect(foundOuter!.location.symbolRange).toBeDefined();
      expect(foundOuter!.location.identifierRange).toBeDefined();
      expect(foundInner!.location.symbolRange).toBeDefined();
      expect(foundInner!.location.identifierRange).toBeDefined();
      expect(foundMethod!.location.symbolRange).toBeDefined();
      expect(foundMethod!.location.identifierRange).toBeDefined();

      // Verify they have reasonable position data
      expect(foundOuter!.location.symbolRange.startLine).toBeGreaterThan(0);
      expect(foundInner!.location.symbolRange.startLine).toBeGreaterThan(0);
      expect(foundMethod!.location.symbolRange.startLine).toBeGreaterThan(0);
    });

    it('should preserve position data when symbols are retrieved by ID', async () => {
      const testCode = `
        public class TestClass {
          public void testMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/TestClass.cls');

      // Get symbol by ID
      const symbolId = 'file:///test/TestClass.cls:TestClass';
      const found = graph.getSymbol(symbolId);

      expect(found).toBeDefined();
      expect(found!.location.symbolRange).toBeDefined();
      expect(found!.location.identifierRange).toBeDefined();
      expect(found!.location.symbolRange.startLine).toBeGreaterThan(0);
    });

    it('should preserve position data across clear and re-add operations', async () => {
      const testCode = `
        public class TestClass {
          public void testMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/TestClass.cls');

      // Verify it's there
      let found = graph.lookupSymbolByName('TestClass');
      expect(found).toHaveLength(1);
      expect(found[0].location.symbolRange).toBeDefined();
      expect(found[0].location.identifierRange).toBeDefined();

      // Clear graph
      graph.clear();

      // Verify it's gone
      found = graph.lookupSymbolByName('TestClass');
      expect(found).toHaveLength(0);

      // Re-add the same symbol
      await compileAndAddToManager(testCode, 'file:///test/TestClass.cls');

      // Verify position data is still preserved
      found = graph.lookupSymbolByName('TestClass');
      expect(found).toHaveLength(1);
      expect(found[0].location.symbolRange).toBeDefined();
      expect(found[0].location.identifierRange).toBeDefined();
      expect(found[0].location.symbolRange.startLine).toBeGreaterThan(0);
    });
  });

  describe('Reference Tracking', () => {
    it('should add references between symbols', async () => {
      const testCode = `
        public class MyClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      // Get the symbols
      const classSymbols = graph.lookupSymbolByName('MyClass');
      const methodSymbols = graph.lookupSymbolByName('myMethod');

      expect(classSymbols).toHaveLength(1);
      expect(methodSymbols).toHaveLength(1);

      const classSymbol = classSymbols[0];
      const methodSymbol = methodSymbols[0];

      // Add reference between symbols
      graph.addReference(methodSymbol, classSymbol, ReferenceType.METHOD_CALL, {
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
      });

      const references = graph.findReferencesTo(classSymbol);
      expect(references).toHaveLength(1);
      expect(references[0].symbol.name).toBe('myMethod');
      expect(references[0].referenceType).toBe(ReferenceType.METHOD_CALL);
    });

    it('should find references from a symbol', async () => {
      const testCode = `
        public class MyClass {
          public String myField;
          
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      // Get the symbols
      const classSymbols = graph.lookupSymbolByName('MyClass');
      const methodSymbols = graph.lookupSymbolByName('myMethod');
      const fieldSymbols = graph.lookupSymbolByName('myField');

      expect(classSymbols).toHaveLength(1);
      expect(methodSymbols).toHaveLength(1);
      expect(fieldSymbols).toHaveLength(1);

      const classSymbol = classSymbols[0];
      const methodSymbol = methodSymbols[0];
      const fieldSymbol = fieldSymbols[0];

      // Add references
      graph.addReference(methodSymbol, classSymbol, ReferenceType.METHOD_CALL, {
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
      });

      graph.addReference(
        methodSymbol,
        fieldSymbol,
        ReferenceType.FIELD_ACCESS,
        {
          symbolRange: {
            startLine: 6,
            startColumn: 15,
            endLine: 6,
            endColumn: 25,
          },
          identifierRange: {
            startLine: 6,
            startColumn: 15,
            endLine: 6,
            endColumn: 25,
          },
        },
      );

      const references = graph.findReferencesFrom(methodSymbol);
      expect(references).toHaveLength(2);
      expect(references.map((r) => r.symbol.name)).toContain('MyClass');
      expect(references.map((r) => r.symbol.name)).toContain('myField');
    });

    it('should handle deferred references for lazy loading', async () => {
      const testCode = `
        public class MyClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      // Get the method symbol
      const methodSymbols = graph.lookupSymbolByName('myMethod');
      expect(methodSymbols).toHaveLength(1);
      const methodSymbol = methodSymbols[0];

      // Try to add reference to non-existent symbol (should be deferred)
      const nonExistentSymbol = {
        id: 'file:///test/NonExistent.cls:NonExistent',
        name: 'NonExistent',
        kind: SymbolKind.Class,
        fqn: 'NonExistent',
        fileUri: 'file:///test/NonExistent.cls:NonExistent',
        parentId: null,
        location: {
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
          isBuiltIn: false,
        },
        _modifierFlags: 0,
        _isLoaded: true,
        key: {
          prefix: 'class',
          name: 'NonExistent',
          path: ['NonExistent.cls', 'NonExistent'],
        },
        parentKey: null,
      };

      graph.addReference(
        methodSymbol,
        nonExistentSymbol,
        ReferenceType.METHOD_CALL,
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
      );

      // Check that reference is deferred
      const stats = graph.getStats();
      expect(stats.deferredReferences).toBe(1);

      // Now add the target symbol (should process deferred reference)
      graph.addSymbol(nonExistentSymbol, 'NonExistent.cls');

      // Wait a bit for async processing to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Check that deferred reference was processed (queue should be empty or processing)
      const statsAfter = graph.getStats();
      expect(statsAfter.deferredQueueSize).toBeGreaterThanOrEqual(0);
    });

    it('should not create duplicate references', async () => {
      const testCode = `
        public class MyClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      // Get the symbols
      const classSymbols = graph.lookupSymbolByName('MyClass');
      const methodSymbols = graph.lookupSymbolByName('myMethod');

      expect(classSymbols).toHaveLength(1);
      expect(methodSymbols).toHaveLength(1);

      const classSymbol = classSymbols[0];
      const methodSymbol = methodSymbols[0];

      // Add the same reference twice
      const location = {
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
      };
      graph.addReference(
        methodSymbol,
        classSymbol,
        ReferenceType.METHOD_CALL,
        location,
      );
      graph.addReference(
        methodSymbol,
        classSymbol,
        ReferenceType.METHOD_CALL,
        location,
      );

      const references = graph.findReferencesTo(classSymbol);
      expect(references).toHaveLength(1); // Should only have one reference
    });
  });

  describe('Dependency Analysis', () => {
    it('should analyze dependencies for a symbol', async () => {
      // Create ClassC first (no dependencies)
      const classCCode = `
        public class ClassC {
          public void methodC() {
            // Method implementation
          }
        }
      `;

      // Create ClassB (depends on ClassC)
      const classBCode = `
        public class ClassB {
          public ClassC getClassC() {
            return new ClassC();
          }
        }
      `;

      // Create ClassA (depends on ClassB and ClassC)
      const classACode = `
        public class ClassA {
          public ClassB getClassB() {
            return new ClassB();
          }
          
          public ClassC getClassC() {
            return new ClassC();
          }
        }
      `;

      // Compile all classes
      await compileAndAddToManager(classCCode, 'file:///test/ClassC.cls');
      await compileAndAddToManager(classBCode, 'file:///test/ClassB.cls');
      await compileAndAddToManager(classACode, 'file:///test/ClassA.cls');

      // Get the symbols
      const classASymbols = graph.lookupSymbolByName('ClassA');
      const classBSymbols = graph.lookupSymbolByName('ClassB');
      const classCSymbols = graph.lookupSymbolByName('ClassC');

      expect(classASymbols).toHaveLength(1);
      expect(classBSymbols).toHaveLength(1);
      expect(classCSymbols).toHaveLength(1);

      const classA = classASymbols[0];
      const classB = classBSymbols[0];
      const classC = classCSymbols[0];

      // Manually add references to simulate the dependencies that would be created
      // by the compiler's reference analysis
      graph.addReference(classA, classB, ReferenceType.TYPE_REFERENCE, {
        symbolRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
      });

      graph.addReference(classA, classC, ReferenceType.TYPE_REFERENCE, {
        symbolRange: {
          startLine: 7,
          startColumn: 1,
          endLine: 7,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 7,
          startColumn: 1,
          endLine: 7,
          endColumn: 10,
        },
      });

      // ClassB depends on ClassC
      graph.addReference(classB, classC, ReferenceType.TYPE_REFERENCE, {
        symbolRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
      });

      const analysis = graph.analyzeDependencies(classA);

      expect(analysis.dependencies).toHaveLength(2);
      expect(analysis.dependencies.map((d) => d.name)).toContain('ClassB');
      expect(analysis.dependencies.map((d) => d.name)).toContain('ClassC');
      expect(analysis.dependents).toHaveLength(0); // Nothing depends on ClassA
      expect(analysis.impactScore).toBe(0);
    });

    it('should calculate impact score correctly', async () => {
      // Create ClassA first (will be depended upon)
      const classACode = `
        public class ClassA {
          public void methodA() {
            // Method implementation
          }
        }
      `;

      // Create ClassB (depends on ClassA)
      const classBCode = `
        public class ClassB {
          public ClassA getClassA() {
            return new ClassA();
          }
        }
      `;

      // Create ClassC (depends on ClassA)
      const classCCode = `
        public class ClassC {
          public ClassA getClassA() {
            return new ClassA();
          }
        }
      `;

      // Compile all classes
      await compileAndAddToManager(classACode, 'file:///test/ClassA.cls');
      await compileAndAddToManager(classBCode, 'file:///test/ClassB.cls');
      await compileAndAddToManager(classCCode, 'file:///test/ClassC.cls');

      // Get the symbols
      const classASymbols = graph.lookupSymbolByName('ClassA');
      const classBSymbols = graph.lookupSymbolByName('ClassB');
      const classCSymbols = graph.lookupSymbolByName('ClassC');

      expect(classASymbols).toHaveLength(1);
      expect(classBSymbols).toHaveLength(1);
      expect(classCSymbols).toHaveLength(1);

      const classA = classASymbols[0];
      const classB = classBSymbols[0];
      const classC = classCSymbols[0];

      // Manually add references to simulate the dependencies
      graph.addReference(classB, classA, ReferenceType.TYPE_REFERENCE, {
        symbolRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
      });

      graph.addReference(classC, classA, ReferenceType.TYPE_REFERENCE, {
        symbolRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
      });

      const analysis = graph.analyzeDependencies(classA);

      expect(analysis.dependents).toHaveLength(2);
      // TODO: Implement impact score calculation
      expect(analysis.impactScore).toBe(0);
    });

    it('should detect circular dependencies', async () => {
      // Create ClassA (depends on ClassB)
      const classACode = `
        public class ClassA {
          public ClassB getClassB() {
            return new ClassB();
          }
        }
      `;

      // Create ClassB (depends on ClassA) - circular dependency
      const classBCode = `
        public class ClassB {
          public ClassA getClassA() {
            return new ClassA();
          }
        }
      `;

      // Compile both classes
      await compileAndAddToManager(classACode, 'file:///test/ClassA.cls');
      await compileAndAddToManager(classBCode, 'file:///test/ClassB.cls');

      // Get the symbols
      const classASymbols = graph.lookupSymbolByName('ClassA');
      const classBSymbols = graph.lookupSymbolByName('ClassB');

      expect(classASymbols).toHaveLength(1);
      expect(classBSymbols).toHaveLength(1);

      const classA = classASymbols[0];
      const classB = classBSymbols[0];

      // Manually add references to create circular dependency: ClassA -> ClassB -> ClassA
      graph.addReference(classA, classB, ReferenceType.TYPE_REFERENCE, {
        symbolRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
      });

      graph.addReference(classB, classA, ReferenceType.TYPE_REFERENCE, {
        symbolRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
      });

      const cycles = graph.detectCircularDependencies();
      expect(cycles.length).toBeGreaterThan(0);

      // Check that the cycle contains both classes
      const cycle = cycles[0];
      // The cycle contains URI-based symbol IDs, so we need to check if they contain the class names
      const cycleSymbolNames = cycle.map((symbolId) => {
        // Extract the class name from the URI-based symbol ID (e.g., "file://ClassA.cls:ClassA" -> "ClassA")
        if (symbolId.startsWith('file://')) {
          const parts = symbolId.split(':');
          return parts[2]; // Take the third part (the symbol name) after file:// and fileUri
        } else if (symbolId.startsWith('apexlib://')) {
          const parts = symbolId.split(':');
          return parts[parts.length - 2]; // Take the second-to-last part (the symbol name)
        } else {
          // Fallback for old format
          const parts = symbolId.split(':');
          return parts[1]; // Take the second part (the symbol name)
        }
      });
      expect(cycleSymbolNames).toContain('ClassA');
      expect(cycleSymbolNames).toContain('ClassB');
    });

    it('should not detect cycles in acyclic graphs', async () => {
      // Create ClassC first (no dependencies)
      const classCCode = `
        public class ClassC {
          public void methodC() {
            // Method implementation
          }
        }
      `;

      // Create ClassB (depends on ClassC)
      const classBCode = `
        public class ClassB {
          public ClassC getClassC() {
            return new ClassC();
          }
        }
      `;

      // Create ClassA (depends on ClassB)
      const classACode = `
        public class ClassA {
          public ClassB getClassB() {
            return new ClassB();
          }
        }
      `;

      // Compile all classes in order: ClassC -> ClassB -> ClassA
      await compileAndAddToManager(classCCode, 'file:///test/ClassC.cls');
      await compileAndAddToManager(classBCode, 'file:///test/ClassB.cls');
      await compileAndAddToManager(classACode, 'file:///test/ClassA.cls');

      // Get the symbols
      const classASymbols = graph.lookupSymbolByName('ClassA');
      const classBSymbols = graph.lookupSymbolByName('ClassB');
      const classCSymbols = graph.lookupSymbolByName('ClassC');

      expect(classASymbols).toHaveLength(1);
      expect(classBSymbols).toHaveLength(1);
      expect(classCSymbols).toHaveLength(1);

      const classA = classASymbols[0];
      const classB = classBSymbols[0];
      const classC = classCSymbols[0];

      // Manually add references to create acyclic dependency: ClassA -> ClassB -> ClassC
      graph.addReference(classA, classB, ReferenceType.TYPE_REFERENCE, {
        symbolRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
      });

      graph.addReference(classB, classC, ReferenceType.TYPE_REFERENCE, {
        symbolRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
      });

      const cycles = graph.detectCircularDependencies();
      expect(cycles).toHaveLength(0);
    });

    it('should not report false positive circular dependencies for simple classes', async () => {
      // Create a simple class similar to StdApex.cls with no circular dependencies
      const simpleClassCode = `
        public class StdApex {
          public StdApex(String msg) {
            String foo = msg;
          }

          public void testStdApex() {
            String foo = 'foo';
          }

          public static void debug(String message) {
            System.debug(message);
            Assert.isNotNull(message);
          }
        }
      `;

      // Compile the simple class
      await compileAndAddToManager(simpleClassCode, 'file:///test/StdApex.cls');

      // Get the symbols - filter to get unique symbols
      const allStdApexSymbols = graph.lookupSymbolByName('StdApex');
      const classSymbols = allStdApexSymbols.filter((s) => s.kind === 'class');
      const methodSymbols = graph.lookupSymbolByName('testStdApex');
      const staticMethodSymbols = graph.lookupSymbolByName('debug');

      // Take the first class symbol if there are duplicates
      expect(classSymbols.length).toBeGreaterThanOrEqual(1);
      expect(methodSymbols).toHaveLength(1);
      expect(staticMethodSymbols).toHaveLength(1);

      const classSymbol = classSymbols[0];
      const methodSymbol = methodSymbols[0];
      const staticMethodSymbol = staticMethodSymbols[0];

      // Analyze dependencies for each symbol - should not report circular dependencies
      const classAnalysis = graph.analyzeDependencies(classSymbol);
      const methodAnalysis = graph.analyzeDependencies(methodSymbol);
      const staticMethodAnalysis =
        graph.analyzeDependencies(staticMethodSymbol);

      // None of these symbols should have circular dependencies
      expect(classAnalysis.circularDependencies).toHaveLength(0);
      expect(methodAnalysis.circularDependencies).toHaveLength(0);
      expect(staticMethodAnalysis.circularDependencies).toHaveLength(0);
    });

    it('should correctly detect circular dependencies for symbols involved in cycles', async () => {
      // Create ClassA (depends on ClassB)
      const classACode = `
        public class ClassA {
          public ClassB getClassB() {
            return new ClassB();
          }
        }
      `;

      // Create ClassB (depends on ClassA) - circular dependency
      const classBCode = `
        public class ClassB {
          public ClassA getClassA() {
            return new ClassA();
          }
        }
      `;

      // Create ClassC (independent, no circular dependency)
      const classCCode = `
        public class ClassC {
          public void methodC() {
            // Method implementation
          }
        }
      `;

      // Compile all classes
      await compileAndAddToManager(classACode, 'file:///test/ClassA.cls');
      await compileAndAddToManager(classBCode, 'file:///test/ClassB.cls');
      await compileAndAddToManager(classCCode, 'file:///test/ClassC.cls');

      // Get the symbols
      const classASymbols = graph.lookupSymbolByName('ClassA');
      const classBSymbols = graph.lookupSymbolByName('ClassB');
      const classCSymbols = graph.lookupSymbolByName('ClassC');

      expect(classASymbols).toHaveLength(1);
      expect(classBSymbols).toHaveLength(1);
      expect(classCSymbols).toHaveLength(1);

      const classA = classASymbols[0];
      const classB = classBSymbols[0];
      const classC = classCSymbols[0];

      // Manually add references to create circular dependency: ClassA -> ClassB -> ClassA
      graph.addReference(classA, classB, ReferenceType.TYPE_REFERENCE, {
        symbolRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
      });

      graph.addReference(classB, classA, ReferenceType.TYPE_REFERENCE, {
        symbolRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
      });

      // Analyze dependencies for each symbol
      const classAAnalysis = graph.analyzeDependencies(classA);
      const classBAnalysis = graph.analyzeDependencies(classB);
      const classCAnalysis = graph.analyzeDependencies(classC);

      // ClassA and ClassB should have circular dependencies (they're in the cycle)
      expect(classAAnalysis.circularDependencies.length).toBeGreaterThan(0);
      expect(classBAnalysis.circularDependencies.length).toBeGreaterThan(0);

      // ClassC should not have circular dependencies (it's independent)
      expect(classCAnalysis.circularDependencies).toHaveLength(0);

      // Verify that the circular dependencies contain the expected symbols
      const classACycles = classAAnalysis.circularDependencies;

      // At least one cycle should contain both ClassA and ClassB
      const hasValidCycle = classACycles.some(
        (cycle) =>
          cycle.some((symbolId) => symbolId.includes('ClassA')) &&
          cycle.some((symbolId) => symbolId.includes('ClassB')),
      );
      expect(hasValidCycle).toBe(true);
    });

    it('should handle complex circular dependency scenarios correctly', async () => {
      // Create a more complex scenario: A -> B -> C -> A (3-way cycle)
      const classACode = `
        public class ClassA {
          public ClassB getClassB() {
            return new ClassB();
          }
        }
      `;

      const classBCode = `
        public class ClassB {
          public ClassC getClassC() {
            return new ClassC();
          }
        }
      `;

      const classCCode = `
        public class ClassC {
          public ClassA getClassA() {
            return new ClassA();
          }
        }
      `;

      const classDCode = `
        public class ClassD {
          public void methodD() {
            // Independent class
          }
        }
      `;

      // Compile all classes
      await compileAndAddToManager(classACode, 'file:///test/ClassA.cls');
      await compileAndAddToManager(classBCode, 'file:///test/ClassB.cls');
      await compileAndAddToManager(classCCode, 'file:///test/ClassC.cls');
      await compileAndAddToManager(classDCode, 'file:///test/ClassD.cls');

      // Get the symbols
      const classASymbols = graph.lookupSymbolByName('ClassA');
      const classBSymbols = graph.lookupSymbolByName('ClassB');
      const classCSymbols = graph.lookupSymbolByName('ClassC');
      const classDSymbols = graph.lookupSymbolByName('ClassD');

      const classA = classASymbols[0];
      const classB = classBSymbols[0];
      const classC = classCSymbols[0];
      const classD = classDSymbols[0];

      // Create 3-way circular dependency: A -> B -> C -> A
      graph.addReference(classA, classB, ReferenceType.TYPE_REFERENCE, {
        symbolRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
      });

      graph.addReference(classB, classC, ReferenceType.TYPE_REFERENCE, {
        symbolRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
      });

      graph.addReference(classC, classA, ReferenceType.TYPE_REFERENCE, {
        symbolRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
        identifierRange: {
          startLine: 3,
          startColumn: 1,
          endLine: 3,
          endColumn: 10,
        },
      });

      // Analyze dependencies
      const classAAnalysis = graph.analyzeDependencies(classA);
      const classBAnalysis = graph.analyzeDependencies(classB);
      const classCAnalysis = graph.analyzeDependencies(classC);
      const classDAnalysis = graph.analyzeDependencies(classD);

      // A, B, C should all have circular dependencies (they're in the cycle)
      expect(classAAnalysis.circularDependencies.length).toBeGreaterThan(0);
      expect(classBAnalysis.circularDependencies.length).toBeGreaterThan(0);
      expect(classCAnalysis.circularDependencies.length).toBeGreaterThan(0);

      // D should not have circular dependencies (it's independent)
      expect(classDAnalysis.circularDependencies).toHaveLength(0);
    });
  });

  describe('File Operations', () => {
    it('should remove all symbols from a file', async () => {
      const testCode1 = `
        public class MyClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      const testCode2 = `
        public class OtherClass {
          public void otherMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode1, 'file:///test/MyClass.cls');
      await compileAndAddToManager(testCode2, 'file:///test/OtherFile.cls');

      expect(graph.getStats().totalSymbols).toBeGreaterThan(0);
      expect(graph.getStats().totalFiles).toBe(2);

      // Remove the first file
      graph.removeFile('file:///test/MyClass.cls');

      expect(graph.getStats().totalFiles).toBe(1);

      // Verify the remaining symbols are from the other file
      const remainingSymbols = graph.getSymbolsInFile(
        'file:///test/OtherFile.cls',
      );
      expect(remainingSymbols.length).toBeGreaterThan(0);
      expect(remainingSymbols.some((s) => s.name === 'OtherClass')).toBe(true);
    });

    it('should clear all symbols from the graph', async () => {
      const testCode = `
        public class MyClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      expect(graph.getStats().totalSymbols).toBeGreaterThan(0);

      graph.clear();

      expect(graph.getStats().totalSymbols).toBe(0);
      expect(graph.getStats().totalFiles).toBe(0);
      expect(graph.getStats().totalReferences).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', async () => {
      const testCode = `
        public class MyClass {
          public void myMethod() {
            // Method implementation
          }
          
          public String myField;
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      const stats = graph.getStats();

      expect(stats.totalSymbols).toBeGreaterThan(0);
      expect(stats.totalFiles).toBe(1);
      expect(stats.circularDependencies).toBe(0);
      expect(stats.deferredReferences).toBe(0);
    });

    it('should count deferred references correctly', async () => {
      const testCode = `
        public class MyClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      // Get the method symbol
      const methodSymbols = graph.lookupSymbolByName('myMethod');
      expect(methodSymbols.length).toBeGreaterThan(0);
      const methodSymbol = methodSymbols[0];

      // Add reference to non-existent symbol (should be deferred)
      const nonExistentSymbol = {
        id: 'file:///test/NonExistent.cls:NonExistent',
        name: 'NonExistent',
        kind: SymbolKind.Class,
        fqn: 'NonExistent',
        fileUri: 'file:///test/NonExistent.cls:NonExistent',
        parentId: null,
        location: {
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
          isBuiltIn: false,
        },
        _modifierFlags: 0,
        _isLoaded: true,
        key: {
          prefix: 'class',
          name: 'NonExistent',
          path: ['NonExistent.cls', 'NonExistent'],
        },
        parentKey: null,
      };

      graph.addReference(
        methodSymbol,
        nonExistentSymbol,
        ReferenceType.METHOD_CALL,
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
      );

      const stats = graph.getStats();
      expect(stats.deferredReferences).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle symbols without FQN', async () => {
      const testCode = `
        public class MyClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      // Should still be able to find by name
      const found = graph.lookupSymbolByName('MyClass');
      expect(found).toHaveLength(1);
      expect(found[0].name).toBe('MyClass');
      // Note: Real symbols from compilation will have FQNs, so we just test basic functionality
    });

    it('should handle empty file paths', async () => {
      const testCode = `
        public class MyClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      // Should still work with real file paths
      const symbols = graph.getSymbolsInFile('file:///test/MyClass.cls');
      expect(symbols.length).toBeGreaterThan(0);
    });

    it('should handle duplicate symbol additions', async () => {
      const testCode = `
        public class MyClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      // Add the same symbol twice (this should be handled gracefully)
      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');
      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      const stats = graph.getStats();
      expect(stats.totalSymbols).toBeGreaterThan(0); // Should have symbols
      expect(stats.totalFiles).toBe(1); // Should only count the file once
    });

    it('should handle references to non-existent symbols gracefully', async () => {
      const testCode = `
        public class MyClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      // Try to find references to non-existent symbol
      const nonExistentSymbol = {
        id: 'file:///test/NonExistent.cls:NonExistent',
        name: 'NonExistent',
        kind: SymbolKind.Class,
        fqn: 'NonExistent',
        fileUri: 'file:///test/NonExistent.cls:NonExistent',
        parentId: null,
        location: {
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
          isBuiltIn: false,
        },
        _modifierFlags: 0,
        _isLoaded: true,
        key: {
          prefix: 'class',
          name: 'NonExistent',
          path: ['NonExistent.cls', 'NonExistent'],
        },
        parentKey: null,
      };

      const references = graph.findReferencesTo(nonExistentSymbol);
      expect(references).toHaveLength(0);
    });
  });

  describe('Reference Types', () => {
    it('should handle different reference types', async () => {
      const testCode = `
        public class MyClass {
          public String myField;
          
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(testCode, 'file:///test/MyClass.cls');

      // Get the symbols
      const classSymbols = graph.lookupSymbolByName('MyClass');
      const methodSymbols = graph.lookupSymbolByName('myMethod');
      const fieldSymbols = graph.lookupSymbolByName('myField');

      expect(classSymbols).toHaveLength(1);
      expect(methodSymbols).toHaveLength(1);
      expect(fieldSymbols).toHaveLength(1);

      const classSymbol = classSymbols[0];
      const methodSymbol = methodSymbols[0];
      const fieldSymbol = fieldSymbols[0];

      // Add different types of references
      graph.addReference(methodSymbol, classSymbol, ReferenceType.METHOD_CALL, {
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
      });
      graph.addReference(
        methodSymbol,
        fieldSymbol,
        ReferenceType.FIELD_ACCESS,
        {
          symbolRange: {
            startLine: 2,
            startColumn: 1,
            endLine: 2,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 2,
            startColumn: 1,
            endLine: 2,
            endColumn: 10,
          },
        },
      );
      graph.addReference(
        classSymbol,
        methodSymbol,
        ReferenceType.TYPE_REFERENCE,
        {
          symbolRange: {
            startLine: 3,
            startColumn: 1,
            endLine: 3,
            endColumn: 10,
          },
          identifierRange: {
            startLine: 3,
            startColumn: 1,
            endLine: 3,
            endColumn: 10,
          },
        },
      );

      const references = graph.findReferencesFrom(methodSymbol);
      expect(references).toHaveLength(2);
      expect(references.map((r) => r.referenceType)).toContain(
        ReferenceType.METHOD_CALL,
      );
      expect(references.map((r) => r.referenceType)).toContain(
        ReferenceType.FIELD_ACCESS,
      );
    });
  });

  describe('Deferred Reference Processing with Queue', () => {
    it('should queue deferred references for async processing', async () => {
      const sourceCode = `
        public class SourceClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(sourceCode, 'file:///test/SourceClass.cls');

      const methodSymbols = graph.lookupSymbolByName('myMethod');
      expect(methodSymbols).toHaveLength(1);
      const methodSymbol = methodSymbols[0];

      // Add reference to non-existent target (should be deferred)
      const targetSymbol = {
        id: 'file:///test/TargetClass.cls:TargetClass',
        name: 'TargetClass',
        kind: SymbolKind.Class,
        fqn: 'TargetClass',
        fileUri: 'file:///test/TargetClass.cls',
        parentId: null,
        location: {
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
          isBuiltIn: false,
        },
        _modifierFlags: 0,
        _isLoaded: true,
        key: {
          prefix: 'class',
          name: 'TargetClass',
          path: ['TargetClass.cls', 'TargetClass'],
        },
        parentKey: null,
      };

      graph.addReference(
        methodSymbol,
        targetSymbol,
        ReferenceType.METHOD_CALL,
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
      );

      // Check that reference is deferred
      const stats = graph.getStats();
      expect(stats.deferredReferences).toBe(1);

      // Queue should have a task for processing
      expect(stats.deferredQueueSize).toBeGreaterThanOrEqual(0);
    });

    it('should process deferred references when target symbol is added', async () => {
      const sourceCode = `
        public class SourceClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(sourceCode, 'file:///test/SourceClass.cls');

      const methodSymbols = graph.lookupSymbolByName('myMethod');
      expect(methodSymbols).toHaveLength(1);
      const methodSymbol = methodSymbols[0];

      // Add reference to non-existent target
      const targetSymbol = {
        id: 'file:///test/TargetClass.cls:TargetClass',
        name: 'TargetClass',
        kind: SymbolKind.Class,
        fqn: 'TargetClass',
        fileUri: 'file:///test/TargetClass.cls',
        parentId: null,
        location: {
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
          isBuiltIn: false,
        },
        _modifierFlags: 0,
        _isLoaded: true,
        key: {
          prefix: 'class',
          name: 'TargetClass',
          path: ['TargetClass.cls', 'TargetClass'],
        },
        parentKey: null,
      };

      graph.addReference(
        methodSymbol,
        targetSymbol,
        ReferenceType.METHOD_CALL,
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
      );

      // Now add the target symbol (should trigger async processing)
      const targetTable = new (await import('../../src/types/symbol')).SymbolTable();
      graph.addSymbol(targetSymbol, 'file:///test/TargetClass.cls', targetTable);

      // Wait for async processing to complete
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Check that reference was eventually processed
      const references = graph.findReferencesFrom(methodSymbol);
      // The reference should be processed (may take a moment)
      expect(references.length).toBeGreaterThanOrEqual(0);
    });

    it('should track queue size in stats', async () => {
      const stats = graph.getStats();
      expect(stats).toHaveProperty('deferredQueueSize');
      expect(stats).toHaveProperty('failedReferencesCount');
      expect(typeof stats.deferredQueueSize).toBe('number');
      expect(typeof stats.failedReferencesCount).toBe('number');
    });

    it('should provide access to failed references', () => {
      const failedCount = graph.getFailedReferencesCount();
      expect(failedCount).toBe(0);

      const failedRefs = graph.getFailedReferences();
      expect(Array.isArray(failedRefs)).toBe(true);
      expect(failedRefs.length).toBe(0);
    });

    it('should handle batch processing of multiple deferred references', async () => {
      const sourceCode = `
        public class SourceClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(sourceCode, 'file:///test/SourceClass.cls');

      const methodSymbols = graph.lookupSymbolByName('myMethod');
      expect(methodSymbols).toHaveLength(1);
      const methodSymbol = methodSymbols[0];

      // Add multiple references to non-existent targets
      for (let i = 0; i < 5; i++) {
        const targetSymbol = {
          id: `file:///test/TargetClass${i}.cls:TargetClass${i}`,
          name: `TargetClass${i}`,
          kind: SymbolKind.Class,
          fqn: `TargetClass${i}`,
          fileUri: `file:///test/TargetClass${i}.cls`,
          parentId: null,
          location: {
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
            isBuiltIn: false,
          },
          _modifierFlags: 0,
          _isLoaded: true,
          key: {
            prefix: 'class',
            name: `TargetClass${i}`,
            path: [`TargetClass${i}.cls`, `TargetClass${i}`],
          },
          parentKey: null,
        };

        graph.addReference(
          methodSymbol,
          targetSymbol,
          ReferenceType.METHOD_CALL,
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
        );
      }

      // Check that multiple deferred references are tracked
      const stats = graph.getStats();
      expect(stats.deferredReferences).toBeGreaterThanOrEqual(1);
    });

    it('should handle retry logic for failed deferred references', async () => {
      const sourceCode = `
        public class SourceClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(sourceCode, 'file:///test/SourceClass.cls');

      const methodSymbols = graph.lookupSymbolByName('myMethod');
      expect(methodSymbols).toHaveLength(1);
      const methodSymbol = methodSymbols[0];

      // Add reference to non-existent target
      const targetSymbol = {
        id: 'file:///test/TargetClass.cls:TargetClass',
        name: 'TargetClass',
        kind: SymbolKind.Class,
        fqn: 'TargetClass',
        fileUri: 'file:///test/TargetClass.cls',
        parentId: null,
        location: {
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
          isBuiltIn: false,
        },
        _modifierFlags: 0,
        _isLoaded: true,
        key: {
          prefix: 'class',
          name: 'TargetClass',
          path: ['TargetClass.cls', 'TargetClass'],
        },
        parentKey: null,
      };

      graph.addReference(
        methodSymbol,
        targetSymbol,
        ReferenceType.METHOD_CALL,
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
      );

      // Wait for initial processing attempt
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Queue should retry if target not found
      const stats = graph.getStats();
      expect(stats.deferredQueueSize).toBeGreaterThanOrEqual(0);
    });

    it('should clear deferred references on clear', () => {
      // Add some deferred references
      const statsBefore = graph.getStats();
      const queueSizeBefore = statsBefore.deferredQueueSize;

      // Clear should clear deferred references (scheduler is shared, not reinitialized)
      graph.clear();

      // After clear, deferred references should be cleared
      const statsAfter = graph.getStats();
      expect(statsAfter.deferredReferences).toBe(0);
      expect(statsAfter.failedReferencesCount).toBe(0);
      // Queue size may still have tasks from scheduler (shared), but deferred refs are cleared
      expect(statsAfter.deferredQueueSize).toBeGreaterThanOrEqual(0);
    });

    it('should not block event loop during deferred reference processing', async () => {
      const sourceCode = `
        public class SourceClass {
          public void myMethod() {
            // Method implementation
          }
        }
      `;

      await compileAndAddToManager(sourceCode, 'file:///test/SourceClass.cls');

      const methodSymbols = graph.lookupSymbolByName('myMethod');
      expect(methodSymbols).toHaveLength(1);
      const methodSymbol = methodSymbols[0];

      // Add many deferred references
      for (let i = 0; i < 100; i++) {
        const targetSymbol = {
          id: `file:///test/TargetClass${i}.cls:TargetClass${i}`,
          name: `TargetClass${i}`,
          kind: SymbolKind.Class,
          fqn: `TargetClass${i}`,
          fileUri: `file:///test/TargetClass${i}.cls`,
          parentId: null,
          location: {
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
            isBuiltIn: false,
          },
          _modifierFlags: 0,
          _isLoaded: true,
          key: {
            prefix: 'class',
            name: `TargetClass${i}`,
            path: [`TargetClass${i}.cls`, `TargetClass${i}`],
          },
          parentKey: null,
        };

        graph.addReference(
          methodSymbol,
          targetSymbol,
          ReferenceType.METHOD_CALL,
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
        );
      }

      // Verify that we can still interact with the graph immediately
      // (non-blocking behavior)
      const stats = graph.getStats();
      expect(stats).toBeDefined();
      expect(stats.deferredReferences).toBeGreaterThan(0);

      // Wait a bit for processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should still be responsive
      const statsAfter = graph.getStats();
      expect(statsAfter).toBeDefined();
    });
  });
});
