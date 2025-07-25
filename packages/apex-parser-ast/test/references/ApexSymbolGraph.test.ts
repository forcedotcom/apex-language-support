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

describe('ApexSymbolGraph', () => {
  let graph: ApexSymbolGraph;

  beforeEach(() => {
    graph = new ApexSymbolGraph();
  });

  afterEach(() => {
    graph.clear();
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
      prefix: 'class',
      name,
      path: [filePath, name],
    },
    parentKey: null,
  });

  describe('Symbol Management', () => {
    it('should add symbols to the graph', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);

      graph.addSymbol(classSymbol, 'MyClass.cls');

      const stats = graph.getStats();
      expect(stats.totalSymbols).toBe(1);
      expect(stats.totalFiles).toBe(1);
    });

    it('should handle multiple symbols with the same name', () => {
      const class1 = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'Namespace1.MyClass',
        'File1.cls',
      );
      const class2 = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'Namespace2.MyClass',
        'File2.cls',
      );

      graph.addSymbol(class1, 'File1.cls');
      graph.addSymbol(class2, 'File2.cls');

      const symbols = graph.lookupSymbolByName('MyClass');
      expect(symbols).toHaveLength(2);
      expect(symbols.map((s) => s.fqn)).toContain('Namespace1.MyClass');
      expect(symbols.map((s) => s.fqn)).toContain('Namespace2.MyClass');
    });

    it('should lookup symbols by FQN', () => {
      const classSymbol = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'MyNamespace.MyClass',
      );

      graph.addSymbol(classSymbol, 'MyClass.cls');

      const found = graph.lookupSymbolByFQN('MyNamespace.MyClass');
      expect(found).toBeDefined();
      expect(found?.name).toBe('MyClass');
    });

    it('should get symbols in a file', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      graph.addSymbol(classSymbol, 'MyClass.cls');
      graph.addSymbol(methodSymbol, 'MyClass.cls');

      const symbols = graph.getSymbolsInFile('MyClass.cls');
      expect(symbols).toHaveLength(2);
      expect(symbols.map((s) => s.name)).toContain('MyClass');
      expect(symbols.map((s) => s.name)).toContain('myMethod');
    });

    it('should get files containing a symbol', () => {
      const class1 = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'MyClass',
        'File1.cls',
      );
      const class2 = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'MyClass',
        'File2.cls',
      );

      graph.addSymbol(class1, 'File1.cls');
      graph.addSymbol(class2, 'File2.cls');

      const files = graph.getFilesForSymbol('MyClass');
      expect(files).toHaveLength(2);
      expect(files).toContain('File1.cls');
      expect(files).toContain('File2.cls');
    });
  });

  describe('Reference Tracking', () => {
    it('should add references between symbols', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      graph.addSymbol(classSymbol, 'MyClass.cls');
      graph.addSymbol(methodSymbol, 'MyClass.cls');

      graph.addReference(methodSymbol, classSymbol, ReferenceType.METHOD_CALL, {
        startLine: 5,
        startColumn: 10,
        endLine: 5,
        endColumn: 20,
      });

      const references = graph.findReferencesTo(classSymbol);
      expect(references).toHaveLength(1);
      expect(references[0].symbol.name).toBe('myMethod');
      expect(references[0].referenceType).toBe(ReferenceType.METHOD_CALL);
    });

    it('should find references from a symbol', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);
      const fieldSymbol = createTestSymbol('myField', SymbolKind.Field);

      graph.addSymbol(classSymbol, 'MyClass.cls');
      graph.addSymbol(methodSymbol, 'MyClass.cls');
      graph.addSymbol(fieldSymbol, 'MyClass.cls');

      graph.addReference(methodSymbol, classSymbol, ReferenceType.METHOD_CALL, {
        startLine: 5,
        startColumn: 10,
        endLine: 5,
        endColumn: 20,
      });

      graph.addReference(
        methodSymbol,
        fieldSymbol,
        ReferenceType.FIELD_ACCESS,
        { startLine: 6, startColumn: 15, endLine: 6, endColumn: 25 },
      );

      const references = graph.findReferencesFrom(methodSymbol);
      expect(references).toHaveLength(2);
      expect(references.map((r) => r.symbol.name)).toContain('MyClass');
      expect(references.map((r) => r.symbol.name)).toContain('myField');
    });

    it('should handle deferred references for lazy loading', () => {
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      // Add method symbol first
      graph.addSymbol(methodSymbol, 'MyClass.cls');

      // Try to add reference to non-existent symbol (should be deferred)
      const nonExistentSymbol = createTestSymbol(
        'NonExistent',
        SymbolKind.Class,
      );
      graph.addReference(
        methodSymbol,
        nonExistentSymbol,
        ReferenceType.METHOD_CALL,
        { startLine: 5, startColumn: 10, endLine: 5, endColumn: 20 },
      );

      // Check that reference is deferred
      const stats = graph.getStats();
      expect(stats.deferredReferences).toBe(1);

      // Now add the target symbol (should process deferred reference)
      graph.addSymbol(nonExistentSymbol, 'NonExistent.cls');

      // Check that deferred reference was processed
      const newStats = graph.getStats();
      expect(newStats.deferredReferences).toBe(0);

      // Verify reference exists
      const references = graph.findReferencesTo(nonExistentSymbol);
      expect(references).toHaveLength(1);
      expect(references[0].symbol.name).toBe('myMethod');
    });

    it('should not create duplicate references', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      graph.addSymbol(classSymbol, 'MyClass.cls');
      graph.addSymbol(methodSymbol, 'MyClass.cls');

      // Add the same reference twice
      const location = {
        startLine: 5,
        startColumn: 10,
        endLine: 5,
        endColumn: 20,
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
    it('should analyze dependencies for a symbol', () => {
      const classA = createTestSymbol(
        'ClassA',
        SymbolKind.Class,
        'ClassA',
        'ClassA.cls',
      );
      const classB = createTestSymbol(
        'ClassB',
        SymbolKind.Class,
        'ClassB',
        'ClassB.cls',
      );
      const classC = createTestSymbol(
        'ClassC',
        SymbolKind.Class,
        'ClassC',
        'ClassC.cls',
      );

      graph.addSymbol(classA, 'ClassA.cls');
      graph.addSymbol(classB, 'ClassB.cls');
      graph.addSymbol(classC, 'ClassC.cls');

      // ClassA depends on ClassB and ClassC
      graph.addReference(classA, classB, ReferenceType.TYPE_REFERENCE, {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 10,
      });
      graph.addReference(classA, classC, ReferenceType.TYPE_REFERENCE, {
        startLine: 2,
        startColumn: 1,
        endLine: 2,
        endColumn: 10,
      });

      // ClassB depends on ClassC
      graph.addReference(classB, classC, ReferenceType.TYPE_REFERENCE, {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 10,
      });

      const analysis = graph.analyzeDependencies(classA);

      expect(analysis.dependencies).toHaveLength(2);
      expect(analysis.dependencies.map((d) => d.name)).toContain('ClassB');
      expect(analysis.dependencies.map((d) => d.name)).toContain('ClassC');
      expect(analysis.dependents).toHaveLength(0); // Nothing depends on ClassA
      expect(analysis.impactScore).toBe(0);
    });

    it('should calculate impact score correctly', () => {
      const classA = createTestSymbol(
        'ClassA',
        SymbolKind.Class,
        'ClassA',
        'ClassA.cls',
      );
      const classB = createTestSymbol(
        'ClassB',
        SymbolKind.Class,
        'ClassB',
        'ClassB.cls',
      );
      const classC = createTestSymbol(
        'ClassC',
        SymbolKind.Class,
        'ClassC',
        'ClassC.cls',
      );

      graph.addSymbol(classA, 'ClassA.cls');
      graph.addSymbol(classB, 'ClassB.cls');
      graph.addSymbol(classC, 'ClassC.cls');

      // Both ClassB and ClassC depend on ClassA
      graph.addReference(classB, classA, ReferenceType.TYPE_REFERENCE, {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 10,
      });
      graph.addReference(classC, classA, ReferenceType.TYPE_REFERENCE, {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 10,
      });

      const analysis = graph.analyzeDependencies(classA);

      expect(analysis.dependents).toHaveLength(2);
      expect(analysis.impactScore).toBe(2);
    });

    it('should detect circular dependencies', () => {
      const classA = createTestSymbol(
        'ClassA',
        SymbolKind.Class,
        'ClassA',
        'ClassA.cls',
      );
      const classB = createTestSymbol(
        'ClassB',
        SymbolKind.Class,
        'ClassB',
        'ClassB.cls',
      );

      graph.addSymbol(classA, 'ClassA.cls');
      graph.addSymbol(classB, 'ClassB.cls');

      // Create circular dependency: ClassA -> ClassB -> ClassA
      graph.addReference(classA, classB, ReferenceType.TYPE_REFERENCE, {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 10,
      });

      graph.addReference(classB, classA, ReferenceType.TYPE_REFERENCE, {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 10,
      });

      const cycles = graph.detectCircularDependencies();
      expect(cycles.length).toBeGreaterThan(0);

      // Check that the cycle contains both classes
      const cycle = cycles[0];
      // The cycle contains symbol IDs, so we need to check if they contain the class names
      const cycleSymbolNames = cycle.map((symbolId) => {
        // Extract the class name from the symbol ID (e.g., "ClassA:ClassA.cls" -> "ClassA")
        const parts = symbolId.split(':');
        return parts[0];
      });
      expect(cycleSymbolNames).toContain('ClassA');
      expect(cycleSymbolNames).toContain('ClassB');
    });

    it('should not detect cycles in acyclic graphs', () => {
      const classA = createTestSymbol(
        'ClassA',
        SymbolKind.Class,
        'ClassA',
        'ClassA.cls',
      );
      const classB = createTestSymbol(
        'ClassB',
        SymbolKind.Class,
        'ClassB',
        'ClassB.cls',
      );
      const classC = createTestSymbol(
        'ClassC',
        SymbolKind.Class,
        'ClassC',
        'ClassC.cls',
      );

      graph.addSymbol(classA, 'ClassA.cls');
      graph.addSymbol(classB, 'ClassB.cls');
      graph.addSymbol(classC, 'ClassC.cls');

      // Create acyclic dependency: ClassA -> ClassB -> ClassC
      graph.addReference(classA, classB, ReferenceType.TYPE_REFERENCE, {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 10,
      });
      graph.addReference(classB, classC, ReferenceType.TYPE_REFERENCE, {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 10,
      });

      const cycles = graph.detectCircularDependencies();
      expect(cycles).toHaveLength(0);
    });
  });

  describe('File Operations', () => {
    it('should remove all symbols from a file', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      graph.addSymbol(classSymbol, 'MyClass.cls');
      graph.addSymbol(methodSymbol, 'MyClass.cls');

      // Add a symbol to another file
      const otherSymbol = createTestSymbol(
        'OtherClass',
        SymbolKind.Class,
        'OtherClass',
        'OtherFile.cls',
      );
      graph.addSymbol(otherSymbol, 'OtherFile.cls');

      expect(graph.getStats().totalSymbols).toBe(3);
      expect(graph.getStats().totalFiles).toBe(2);

      // Remove the first file
      graph.removeFile('MyClass.cls');

      expect(graph.getStats().totalSymbols).toBe(1);
      expect(graph.getStats().totalFiles).toBe(1);

      // Verify the remaining symbol is from the other file
      const remainingSymbols = graph.getSymbolsInFile('OtherFile.cls');
      expect(remainingSymbols).toHaveLength(1);
      expect(remainingSymbols[0].name).toBe('OtherClass');
    });

    it('should clear all symbols from the graph', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      graph.addSymbol(classSymbol, 'MyClass.cls');
      graph.addSymbol(methodSymbol, 'MyClass.cls');

      expect(graph.getStats().totalSymbols).toBe(2);

      graph.clear();

      expect(graph.getStats().totalSymbols).toBe(0);
      expect(graph.getStats().totalFiles).toBe(0);
      expect(graph.getStats().totalReferences).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      graph.addSymbol(classSymbol, 'MyClass.cls');
      graph.addSymbol(methodSymbol, 'MyClass.cls');

      graph.addReference(methodSymbol, classSymbol, ReferenceType.METHOD_CALL, {
        startLine: 5,
        startColumn: 10,
        endLine: 5,
        endColumn: 20,
      });

      const stats = graph.getStats();

      expect(stats.totalSymbols).toBe(2);
      expect(stats.totalReferences).toBe(1);
      expect(stats.totalFiles).toBe(1);
      expect(stats.circularDependencies).toBe(0);
      expect(stats.deferredReferences).toBe(0);
    });

    it('should count deferred references correctly', () => {
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);
      graph.addSymbol(methodSymbol, 'MyClass.cls');

      // Add reference to non-existent symbol
      const nonExistentSymbol = createTestSymbol(
        'NonExistent',
        SymbolKind.Class,
      );
      graph.addReference(
        methodSymbol,
        nonExistentSymbol,
        ReferenceType.METHOD_CALL,
        { startLine: 5, startColumn: 10, endLine: 5, endColumn: 20 },
      );

      const stats = graph.getStats();
      expect(stats.deferredReferences).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle symbols without FQN', () => {
      const symbol = createTestSymbol('MyClass', SymbolKind.Class);
      symbol.fqn = undefined; // Remove FQN

      graph.addSymbol(symbol, 'MyClass.cls');

      // Should still be able to find by name
      const found = graph.lookupSymbolByName('MyClass');
      expect(found).toHaveLength(1);
      expect(found[0].name).toBe('MyClass');
    });

    it('should handle empty file paths', () => {
      const symbol = createTestSymbol('MyClass', SymbolKind.Class);
      symbol.key.path = []; // Empty path

      graph.addSymbol(symbol, 'MyClass.cls');

      // Should still work with fallback to 'unknown'
      const symbols = graph.getSymbolsInFile('MyClass.cls');
      expect(symbols).toHaveLength(1);
    });

    it('should handle duplicate symbol additions', () => {
      const symbol = createTestSymbol('MyClass', SymbolKind.Class);

      graph.addSymbol(symbol, 'MyClass.cls');
      graph.addSymbol(symbol, 'MyClass.cls'); // Add same symbol again

      const stats = graph.getStats();
      expect(stats.totalSymbols).toBe(1); // Should only count once
    });

    it('should handle references to non-existent symbols gracefully', () => {
      const symbol = createTestSymbol('MyClass', SymbolKind.Class);
      graph.addSymbol(symbol, 'MyClass.cls');

      // Try to find references to non-existent symbol
      const nonExistentSymbol = createTestSymbol(
        'NonExistent',
        SymbolKind.Class,
      );
      const references = graph.findReferencesTo(nonExistentSymbol);

      expect(references).toHaveLength(0);
    });
  });

  describe('Reference Types', () => {
    it('should handle different reference types', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);
      const fieldSymbol = createTestSymbol('myField', SymbolKind.Field);

      graph.addSymbol(classSymbol, 'MyClass.cls');
      graph.addSymbol(methodSymbol, 'MyClass.cls');
      graph.addSymbol(fieldSymbol, 'MyClass.cls');

      // Add different types of references
      graph.addReference(methodSymbol, classSymbol, ReferenceType.METHOD_CALL, {
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 10,
      });
      graph.addReference(
        methodSymbol,
        fieldSymbol,
        ReferenceType.FIELD_ACCESS,
        { startLine: 2, startColumn: 1, endLine: 2, endColumn: 10 },
      );
      graph.addReference(
        classSymbol,
        methodSymbol,
        ReferenceType.TYPE_REFERENCE,
        { startLine: 3, startColumn: 1, endLine: 3, endColumn: 10 },
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
});
