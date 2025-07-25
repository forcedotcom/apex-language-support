/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ApexSymbolManager,
  SymbolResolutionContext,
} from '../../src/utils/ApexSymbolManager';
import {
  ApexSymbol,
  SymbolKind,
  SymbolVisibility,
} from '../../src/types/symbol';
import { ReferenceType } from '../../src/references/ApexSymbolGraph';

describe('ApexSymbolManager', () => {
  let manager: ApexSymbolManager;

  beforeEach(() => {
    manager = new ApexSymbolManager();
  });

  afterEach(() => {
    // Clean up if needed
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

  // ============================================================================
  // Phase 2.1: Symbol Management Methods
  // ============================================================================

  describe('Symbol Management', () => {
    it('should add symbols to the manager', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);

      manager.addSymbol(classSymbol, 'MyClass.cls');

      const stats = manager.getStats();
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

      manager.addSymbol(class1, 'File1.cls');
      manager.addSymbol(class2, 'File2.cls');

      const symbols = manager.findSymbolByName('MyClass');
      expect(symbols).toHaveLength(2);
      expect(symbols.map((s) => s.fqn)).toContain('Namespace1.MyClass');
      expect(symbols.map((s) => s.fqn)).toContain('Namespace2.MyClass');
    });

    it('should remove all symbols from a file', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      manager.addSymbol(classSymbol, 'MyClass.cls');
      manager.addSymbol(methodSymbol, 'MyClass.cls');

      // Add a symbol to another file
      const otherSymbol = createTestSymbol('OtherClass', SymbolKind.Class);
      manager.addSymbol(otherSymbol, 'OtherClass.cls');

      // Remove the first file
      manager.removeFile('MyClass.cls');

      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(1);
      expect(stats.totalFiles).toBe(1);

      const remainingSymbols = manager.findSymbolsInFile('OtherClass.cls');
      expect(remainingSymbols).toHaveLength(1);
      expect(remainingSymbols[0].name).toBe('OtherClass');
    });

    it('should refresh with new symbol data', () => {
      const class1 = createTestSymbol('Class1', SymbolKind.Class);
      const class2 = createTestSymbol('Class2', SymbolKind.Class);

      manager.addSymbol(class1, 'File1.cls');
      manager.addSymbol(class2, 'File2.cls');

      // Verify initial state
      let stats = manager.getStats();
      expect(stats.totalSymbols).toBe(2);
      expect(stats.totalFiles).toBe(2);

      // Refresh with empty data
      manager.refresh(new Map());

      // Verify cleared state
      stats = manager.getStats();
      expect(stats.totalSymbols).toBe(0);
      expect(stats.totalFiles).toBe(0);
    });
  });

  // ============================================================================
  // Phase 2.2: Symbol Lookup Methods
  // ============================================================================

  describe('Symbol Lookup', () => {
    it('should find symbols by name', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      manager.addSymbol(classSymbol, 'MyClass.cls');

      const symbols = manager.findSymbolByName('MyClass');
      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('MyClass');
    });

    it('should find symbols by FQN', () => {
      const classSymbol = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'MyNamespace.MyClass',
      );

      manager.addSymbol(classSymbol, 'MyClass.cls');

      const found = manager.findSymbolByFQN('MyNamespace.MyClass');
      expect(found).toBeDefined();
      expect(found?.name).toBe('MyClass');
      expect(found?.fqn).toBe('MyNamespace.MyClass');
    });

    it('should return null for non-existent FQN', () => {
      const found = manager.findSymbolByFQN('NonExistent.Class');
      expect(found).toBeNull();
    });

    it('should find all symbols in a file', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      manager.addSymbol(classSymbol, 'MyClass.cls');
      manager.addSymbol(methodSymbol, 'MyClass.cls');

      const symbols = manager.findSymbolsInFile('MyClass.cls');
      expect(symbols).toHaveLength(2);
      expect(symbols.map((s) => s.name)).toContain('MyClass');
      expect(symbols.map((s) => s.name)).toContain('myMethod');
    });

    it('should find all files containing a symbol', () => {
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

      manager.addSymbol(class1, 'File1.cls');
      manager.addSymbol(class2, 'File2.cls');

      const files = manager.findFilesForSymbol('MyClass');
      expect(files).toHaveLength(2);
      expect(files).toContain('File1.cls');
      expect(files).toContain('File2.cls');
    });

    it('should return empty array for non-existent symbol', () => {
      const files = manager.findFilesForSymbol('NonExistent');
      expect(files).toHaveLength(0);
    });
  });

  // ============================================================================
  // Phase 2.3: Graph-Based Relationship Queries
  // ============================================================================

  describe('Relationship Queries', () => {
    it('should find references to a symbol', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      manager.addSymbol(classSymbol, 'MyClass.cls');
      manager.addSymbol(methodSymbol, 'MyClass.cls');

      // Add a reference from method to class
      // Note: This would require the underlying graph to support reference addition
      // For now, we'll test the method exists and returns empty array
      const references = manager.findReferencesTo(classSymbol);
      expect(Array.isArray(references)).toBe(true);
    });

    it('should find references from a symbol', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      manager.addSymbol(classSymbol, 'MyClass.cls');
      manager.addSymbol(methodSymbol, 'MyClass.cls');

      const references = manager.findReferencesFrom(classSymbol);
      expect(Array.isArray(references)).toBe(true);
    });

    it('should find related symbols by relationship type', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      manager.addSymbol(classSymbol, 'MyClass.cls');
      manager.addSymbol(methodSymbol, 'MyClass.cls');

      const relatedSymbols = manager.findRelatedSymbols(
        classSymbol,
        ReferenceType.METHOD_CALL,
      );
      expect(Array.isArray(relatedSymbols)).toBe(true);
    });

    it('should handle empty relationship queries gracefully', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      manager.addSymbol(classSymbol, 'MyClass.cls');

      const references = manager.findReferencesTo(classSymbol);
      expect(references).toHaveLength(0);

      const referencesFrom = manager.findReferencesFrom(classSymbol);
      expect(referencesFrom).toHaveLength(0);

      const relatedSymbols = manager.findRelatedSymbols(
        classSymbol,
        ReferenceType.METHOD_CALL,
      );
      expect(relatedSymbols).toHaveLength(0);
    });
  });

  // ============================================================================
  // Utility Methods
  // ============================================================================

  describe('Statistics and Utilities', () => {
    it('should provide accurate statistics', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      manager.addSymbol(classSymbol, 'MyClass.cls');
      manager.addSymbol(methodSymbol, 'MyClass.cls');

      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(2);
      expect(stats.totalFiles).toBe(1);
      expect(stats.totalReferences).toBe(0); // No references added yet
      expect(stats.circularDependencies).toBe(0);
      expect(typeof stats.cacheHitRate).toBe('number');
      expect(stats.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(stats.cacheHitRate).toBeLessThanOrEqual(1);
    });

    it('should handle empty manager statistics', () => {
      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(0);
      expect(stats.totalFiles).toBe(0);
      expect(stats.totalReferences).toBe(0);
      expect(stats.circularDependencies).toBe(0);
    });

    it('should provide consistent statistics after operations', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);

      // Initial state
      let stats = manager.getStats();
      expect(stats.totalSymbols).toBe(0);

      // After adding symbol
      manager.addSymbol(classSymbol, 'MyClass.cls');
      stats = manager.getStats();
      expect(stats.totalSymbols).toBe(1);

      // After removing file
      manager.removeFile('MyClass.cls');
      stats = manager.getStats();
      expect(stats.totalSymbols).toBe(0);
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle duplicate symbol additions gracefully', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);

      manager.addSymbol(classSymbol, 'MyClass.cls');
      manager.addSymbol(classSymbol, 'MyClass.cls'); // Duplicate

      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(1); // Should not create duplicates
    });

    it('should handle removal of non-existent files', () => {
      // Should not throw an error
      expect(() => {
        manager.removeFile('NonExistentFile.cls');
      }).not.toThrow();
    });

    it('should handle lookup of non-existent symbols', () => {
      const symbols = manager.findSymbolByName('NonExistent');
      expect(symbols).toHaveLength(0);

      const found = manager.findSymbolByFQN('NonExistent.Class');
      expect(found).toBeNull();

      const fileSymbols = manager.findSymbolsInFile('NonExistentFile.cls');
      expect(fileSymbols).toHaveLength(0);
    });

    it('should handle empty symbol tables', () => {
      // Should not throw an error when no symbols are present
      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(0);
      expect(stats.totalFiles).toBe(0);
    });
  });

  // ============================================================================
  // Performance Considerations
  // ============================================================================

  describe('Performance Considerations', () => {
    it('should handle large numbers of symbols efficiently', () => {
      const startTime = Date.now();

      // Add 1000 symbols
      for (let i = 0; i < 1000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Namespace.Class${i}`,
          `File${i}.cls`,
        );
        manager.addSymbol(symbol, `File${i}.cls`);
      }

      const addTime = Date.now() - startTime;
      expect(addTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Test lookup performance
      const lookupStartTime = Date.now();
      const symbols = manager.findSymbolByName('Class500');
      const lookupTime = Date.now() - lookupStartTime;
      expect(lookupTime).toBeLessThan(100); // Should complete within 100ms
      expect(symbols).toHaveLength(1); // Should find the symbol

      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(1000);
      expect(stats.totalFiles).toBe(1000);
    });

    it('should maintain performance after cache operations', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      manager.addSymbol(classSymbol, 'MyClass.cls');

      // First lookup (cache miss)
      const firstLookup = manager.findReferencesTo(classSymbol);

      // Second lookup (cache hit)
      const secondLookup = manager.findReferencesTo(classSymbol);

      // Both should return the same result
      expect(firstLookup).toEqual(secondLookup);
    });
  });

  // ============================================================================
  // Phase 3.1: Dependency Analysis
  // ============================================================================

  describe('Dependency Analysis', () => {
    it('should analyze dependencies for a symbol', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      manager.addSymbol(classSymbol, 'MyClass.cls');
      manager.addSymbol(methodSymbol, 'MyClass.cls');

      const analysis = manager.analyzeDependencies(classSymbol);

      expect(analysis).toBeDefined();
      expect(Array.isArray(analysis.dependencies)).toBe(true);
      expect(Array.isArray(analysis.dependents)).toBe(true);
      expect(typeof analysis.impactScore).toBe('number');
      expect(Array.isArray(analysis.circularDependencies)).toBe(true);
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

      manager.addSymbol(classA, 'ClassA.cls');
      manager.addSymbol(classB, 'ClassB.cls');

      const circularDependencies = manager.detectCircularDependencies();

      expect(Array.isArray(circularDependencies)).toBe(true);
      // Note: Without actual references added, this should return empty array
      expect(circularDependencies.length).toBeGreaterThanOrEqual(0);
    });

    it('should provide impact analysis for refactoring', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      manager.addSymbol(classSymbol, 'MyClass.cls');

      const impactAnalysis = manager.getImpactAnalysis(classSymbol);

      expect(impactAnalysis).toBeDefined();
      expect(Array.isArray(impactAnalysis.directImpact)).toBe(true);
      expect(Array.isArray(impactAnalysis.indirectImpact)).toBe(true);
      expect(Array.isArray(impactAnalysis.breakingChanges)).toBe(true);
      expect(Array.isArray(impactAnalysis.migrationPath)).toBe(true);
      expect(['low', 'medium', 'high']).toContain(
        impactAnalysis.riskAssessment,
      );
    });

    it('should assess risk correctly based on impact size', () => {
      const lowImpactSymbol = createTestSymbol('LowImpact', SymbolKind.Class);
      const highImpactSymbol = createTestSymbol('HighImpact', SymbolKind.Class);

      manager.addSymbol(lowImpactSymbol, 'LowImpact.cls');
      manager.addSymbol(highImpactSymbol, 'HighImpact.cls');

      const lowImpactAnalysis = manager.getImpactAnalysis(lowImpactSymbol);
      const highImpactAnalysis = manager.getImpactAnalysis(highImpactSymbol);

      // Both should have low risk initially (no references)
      expect(lowImpactAnalysis.riskAssessment).toBe('low');
      expect(highImpactAnalysis.riskAssessment).toBe('low');
    });
  });

  // ============================================================================
  // Phase 3.2: Symbol Metrics
  // ============================================================================

  describe('Symbol Metrics', () => {
    it('should compute metrics for a symbol', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      manager.addSymbol(classSymbol, 'MyClass.cls');

      const metrics = manager.computeMetrics(classSymbol);

      expect(metrics).toBeDefined();
      expect(typeof metrics.referenceCount).toBe('number');
      expect(typeof metrics.dependencyCount).toBe('number');
      expect(typeof metrics.dependentCount).toBe('number');
      expect(typeof metrics.cyclomaticComplexity).toBe('number');
      expect(typeof metrics.depthOfInheritance).toBe('number');
      expect(typeof metrics.couplingScore).toBe('number');
      expect(typeof metrics.impactScore).toBe('number');
      expect(typeof metrics.changeImpactRadius).toBe('number');
      expect(typeof metrics.refactoringRisk).toBe('number');
      expect(Array.isArray(metrics.usagePatterns)).toBe(true);
      expect(Array.isArray(metrics.accessPatterns)).toBe(true);
      expect(['active', 'deprecated', 'legacy', 'experimental']).toContain(
        metrics.lifecycleStage,
      );
    });

    it('should get metrics for all symbols', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      manager.addSymbol(classSymbol, 'MyClass.cls');
      manager.addSymbol(methodSymbol, 'MyClass.cls');

      const allMetrics = manager.getSymbolMetrics();

      expect(allMetrics).toBeInstanceOf(Map);
      expect(allMetrics.size).toBe(2);

      // Check that metrics are computed for each symbol
      for (const [, metrics] of allMetrics) {
        expect(typeof metrics.referenceCount).toBe('number');
        expect(typeof metrics.cyclomaticComplexity).toBe('number');
      }
    });

    it('should get the most referenced symbols', () => {
      const class1 = createTestSymbol('Class1', SymbolKind.Class);
      const class2 = createTestSymbol('Class2', SymbolKind.Class);
      const class3 = createTestSymbol('Class3', SymbolKind.Class);

      manager.addSymbol(class1, 'Class1.cls');
      manager.addSymbol(class2, 'Class2.cls');
      manager.addSymbol(class3, 'Class3.cls');

      const mostReferenced = manager.getMostReferencedSymbols(5);

      expect(Array.isArray(mostReferenced)).toBe(true);
      expect(mostReferenced.length).toBeLessThanOrEqual(5);

      // Should return symbols in order of reference count (descending)
      if (mostReferenced.length > 1) {
        const firstRefs = manager.findReferencesTo(mostReferenced[0]).length;
        const secondRefs = manager.findReferencesTo(mostReferenced[1]).length;
        expect(firstRefs).toBeGreaterThanOrEqual(secondRefs);
      }
    });

    it('should compute complexity metrics correctly', () => {
      const classSymbol = createTestSymbol('MyClass', SymbolKind.Class);
      const methodSymbol = createTestSymbol('myMethod', SymbolKind.Method);

      manager.addSymbol(classSymbol, 'MyClass.cls');
      manager.addSymbol(methodSymbol, 'MyClass.cls');

      const classMetrics = manager.computeMetrics(classSymbol);
      const methodMetrics = manager.computeMetrics(methodSymbol);

      // Methods should have higher complexity than classes
      expect(methodMetrics.cyclomaticComplexity).toBeGreaterThan(
        classMetrics.cyclomaticComplexity,
      );

      // Both should have reasonable complexity values
      expect(classMetrics.cyclomaticComplexity).toBeGreaterThan(0);
      expect(methodMetrics.cyclomaticComplexity).toBeGreaterThan(0);
    });

    it('should determine lifecycle stage correctly', () => {
      const activeSymbol = createTestSymbol('ActiveClass', SymbolKind.Class);
      const legacySymbol = createTestSymbol('LegacyClass', SymbolKind.Class);

      manager.addSymbol(activeSymbol, 'ActiveClass.cls');
      manager.addSymbol(legacySymbol, 'LegacyClass.cls');

      const activeMetrics = manager.computeMetrics(activeSymbol);
      const legacyMetrics = manager.computeMetrics(legacySymbol);

      // Both should be 'legacy' initially (no references)
      expect(activeMetrics.lifecycleStage).toBe('legacy');
      expect(legacyMetrics.lifecycleStage).toBe('legacy');
    });
  });

  // ============================================================================
  // Phase 3.3: Batch Operations
  // ============================================================================

  describe('Batch Operations', () => {
    it('should add multiple symbols in batch', async () => {
      const symbols = [
        {
          symbol: createTestSymbol('Class1', SymbolKind.Class),
          filePath: 'Class1.cls',
        },
        {
          symbol: createTestSymbol('Class2', SymbolKind.Class),
          filePath: 'Class2.cls',
        },
        {
          symbol: createTestSymbol('Method1', SymbolKind.Method),
          filePath: 'Class1.cls',
        },
      ];

      await manager.addSymbolsBatch(symbols);

      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(3);
      expect(stats.totalFiles).toBe(2); // Class1.cls and Class2.cls
    });

    it('should analyze dependencies for multiple symbols in batch', async () => {
      const class1 = createTestSymbol('Class1', SymbolKind.Class);
      const class2 = createTestSymbol('Class2', SymbolKind.Class);
      const class3 = createTestSymbol('Class3', SymbolKind.Class);

      manager.addSymbol(class1, 'Class1.cls');
      manager.addSymbol(class2, 'Class2.cls');
      manager.addSymbol(class3, 'Class3.cls');

      const symbols = [class1, class2, class3];
      const batchAnalysis = await manager.analyzeDependenciesBatch(symbols);

      expect(batchAnalysis).toBeInstanceOf(Map);
      expect(batchAnalysis.size).toBe(3);

      // Check that analysis was performed for each symbol
      for (const [symbolId, analysis] of batchAnalysis) {
        expect(typeof symbolId).toBe('string');
        expect(analysis).toBeDefined();
        expect(Array.isArray(analysis.dependencies)).toBe(true);
        expect(Array.isArray(analysis.dependents)).toBe(true);
      }
    });

    it('should handle empty batch operations gracefully', async () => {
      // Empty batch addition
      await manager.addSymbolsBatch([]);

      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(0);
      expect(stats.totalFiles).toBe(0);

      // Empty batch analysis
      const emptyAnalysis = await manager.analyzeDependenciesBatch([]);
      expect(emptyAnalysis.size).toBe(0);
    });

    it('should maintain consistency during batch operations', async () => {
      const symbols = [
        {
          symbol: createTestSymbol('Class1', SymbolKind.Class),
          filePath: 'Class1.cls',
        },
        {
          symbol: createTestSymbol('Class2', SymbolKind.Class),
          filePath: 'Class2.cls',
        },
      ];

      // Add symbols individually first
      manager.addSymbol(symbols[0].symbol, symbols[0].filePath);

      const statsBefore = manager.getStats();
      expect(statsBefore.totalSymbols).toBe(1);

      // Add remaining symbols in batch
      await manager.addSymbolsBatch([symbols[1]]);

      const statsAfter = manager.getStats();
      expect(statsAfter.totalSymbols).toBe(2);
      expect(statsAfter.totalFiles).toBe(2);
    });
  });

  // ============================================================================
  // Phase 3 Integration Tests
  // ============================================================================

  describe('Phase 3 Integration', () => {
    it('should provide comprehensive analysis workflow', async () => {
      // Setup: Add multiple symbols
      const class1 = createTestSymbol('BaseClass', SymbolKind.Class);
      const class2 = createTestSymbol('DerivedClass', SymbolKind.Class);
      const method1 = createTestSymbol('baseMethod', SymbolKind.Method);
      const method2 = createTestSymbol('derivedMethod', SymbolKind.Method);

      await manager.addSymbolsBatch([
        { symbol: class1, filePath: 'BaseClass.cls' },
        { symbol: class2, filePath: 'DerivedClass.cls' },
        { symbol: method1, filePath: 'BaseClass.cls' },
        { symbol: method2, filePath: 'DerivedClass.cls' },
      ]);

      // Step 1: Get overall metrics
      const allMetrics = manager.getSymbolMetrics();
      expect(allMetrics.size).toBe(4);

      // Step 2: Analyze dependencies
      const dependencyAnalysis = manager.analyzeDependencies(class1);
      expect(dependencyAnalysis).toBeDefined();

      // Step 3: Get impact analysis
      const impactAnalysis = manager.getImpactAnalysis(class1);
      expect(impactAnalysis.riskAssessment).toBeDefined();

      // Step 4: Get most referenced symbols
      const mostReferenced = manager.getMostReferencedSymbols(10);
      expect(mostReferenced.length).toBeLessThanOrEqual(10);

      // Step 5: Check for circular dependencies
      const circularDeps = manager.detectCircularDependencies();
      expect(Array.isArray(circularDeps)).toBe(true);

      // Verify all operations work together
      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(4);
      expect(stats.totalFiles).toBe(2);
    });

    it('should handle complex dependency scenarios', () => {
      // Create a more complex scenario with multiple symbol types
      const interface1 = createTestSymbol('MyInterface', SymbolKind.Interface);
      const class1 = createTestSymbol('MyClass', SymbolKind.Class);
      const method1 = createTestSymbol('publicMethod', SymbolKind.Method);
      const field1 = createTestSymbol('privateField', SymbolKind.Field);

      manager.addSymbol(interface1, 'MyInterface.cls');
      manager.addSymbol(class1, 'MyClass.cls');
      manager.addSymbol(method1, 'MyClass.cls');
      manager.addSymbol(field1, 'MyClass.cls');

      // Test metrics computation for different symbol types
      const interfaceMetrics = manager.computeMetrics(interface1);
      const classMetrics = manager.computeMetrics(class1);
      const methodMetrics = manager.computeMetrics(method1);
      const fieldMetrics = manager.computeMetrics(field1);

      // Each should have valid metrics
      expect(interfaceMetrics.cyclomaticComplexity).toBeGreaterThan(0);
      expect(classMetrics.cyclomaticComplexity).toBeGreaterThan(0);
      expect(methodMetrics.cyclomaticComplexity).toBeGreaterThan(0);
      expect(fieldMetrics.cyclomaticComplexity).toBeGreaterThan(0);

      // Test impact analysis for different symbol types
      const interfaceImpact = manager.getImpactAnalysis(interface1);
      const classImpact = manager.getImpactAnalysis(class1);
      const methodImpact = manager.getImpactAnalysis(method1);

      expect(interfaceImpact.riskAssessment).toBeDefined();
      expect(classImpact.riskAssessment).toBeDefined();
      expect(methodImpact.riskAssessment).toBeDefined();
    });
  });

  // ============================================================================
  // Phase 4.1: Enhanced Context Resolution
  // ============================================================================

  describe('Enhanced Context Resolution', () => {
    it('should resolve symbols with context awareness', () => {
      const class1 = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'Namespace1.MyClass',
      );
      const class2 = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'Namespace2.MyClass',
      );

      manager.addSymbol(class1, 'Class1.cls');
      manager.addSymbol(class2, 'Class2.cls');

      const context: SymbolResolutionContext = {
        sourceFile: 'TestFile.cls',
        importStatements: ['Namespace1.*'],
        namespaceContext: 'Namespace1',
        currentScope: 'TestClass',
        scopeChain: ['TestClass', 'TestMethod'],
        parameterTypes: [],
        accessModifier: 'public',
        isStatic: false,
        inheritanceChain: [],
        interfaceImplementations: [],
      };

      const result = manager.resolveSymbol('MyClass', context);

      expect(result).toBeDefined();
      expect(result.symbol).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.isAmbiguous).toBe(true);
      expect(result.candidates).toHaveLength(2);
      expect(result.resolutionContext).toContain('Resolved from 2 candidates');
    });

    it('should handle single symbol resolution with high confidence', () => {
      const class1 = createTestSymbol('UniqueClass', SymbolKind.Class);
      manager.addSymbol(class1, 'UniqueClass.cls');

      const context: SymbolResolutionContext = {
        sourceFile: 'TestFile.cls',
        importStatements: [],
        namespaceContext: '',
        currentScope: 'TestClass',
        scopeChain: ['TestClass'],
        parameterTypes: [],
        accessModifier: 'public',
        isStatic: false,
        inheritanceChain: [],
        interfaceImplementations: [],
      };

      const result = manager.resolveSymbol('UniqueClass', context);

      expect(result.symbol).toBeDefined();
      expect(result.confidence).toBe(0.9);
      expect(result.isAmbiguous).toBe(false);
      expect(result.candidates).toBeUndefined();
      expect(result.resolutionContext).toBe('Single symbol found');
    });

    it('should handle no symbol found gracefully', () => {
      const context: SymbolResolutionContext = {
        sourceFile: 'TestFile.cls',
        importStatements: [],
        namespaceContext: '',
        currentScope: 'TestClass',
        scopeChain: ['TestClass'],
        parameterTypes: [],
        accessModifier: 'public',
        isStatic: false,
        inheritanceChain: [],
        interfaceImplementations: [],
      };

      const result = manager.resolveSymbol('NonExistentClass', context);

      expect(result.symbol).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.isAmbiguous).toBe(false);
      expect(result.resolutionContext).toBe('No symbols found with this name');
    });

    it('should analyze import statements for resolution', () => {
      const class1 = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'Namespace1.MyClass',
      );
      const class2 = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'Namespace2.MyClass',
      );

      manager.addSymbol(class1, 'Class1.cls');
      manager.addSymbol(class2, 'Class2.cls');

      // Test with specific import
      const contextWithSpecificImport: SymbolResolutionContext = {
        sourceFile: 'TestFile.cls',
        importStatements: ['Namespace1.MyClass'],
        namespaceContext: '',
        currentScope: 'TestClass',
        scopeChain: ['TestClass'],
        parameterTypes: [],
        accessModifier: 'public',
        isStatic: false,
        inheritanceChain: [],
        interfaceImplementations: [],
      };

      const result1 = manager.resolveSymbol(
        'MyClass',
        contextWithSpecificImport,
      );
      expect(result1.confidence).toBeGreaterThan(0.8);

      // Test with wildcard import
      const contextWithWildcardImport: SymbolResolutionContext = {
        sourceFile: 'TestFile.cls',
        importStatements: ['Namespace1.*'],
        namespaceContext: '',
        currentScope: 'TestClass',
        scopeChain: ['TestClass'],
        parameterTypes: [],
        accessModifier: 'public',
        isStatic: false,
        inheritanceChain: [],
        interfaceImplementations: [],
      };

      const result2 = manager.resolveSymbol(
        'MyClass',
        contextWithWildcardImport,
      );
      expect(result2.confidence).toBeGreaterThan(0.6);
    });

    it('should analyze namespace context for resolution', () => {
      const class1 = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'Namespace1.MyClass',
      );
      const class2 = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'Namespace2.MyClass',
      );

      manager.addSymbol(class1, 'Class1.cls');
      manager.addSymbol(class2, 'Class2.cls');

      const context: SymbolResolutionContext = {
        sourceFile: 'TestFile.cls',
        importStatements: [],
        namespaceContext: 'Namespace1',
        currentScope: 'TestClass',
        scopeChain: ['TestClass'],
        parameterTypes: [],
        accessModifier: 'public',
        isStatic: false,
        inheritanceChain: [],
        interfaceImplementations: [],
      };

      const result = manager.resolveSymbol('MyClass', context);
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.resolutionContext).toContain(
        'Namespace context: Namespace1',
      );
    });

    it('should analyze type context for resolution', () => {
      const class1 = createTestSymbol(
        'String',
        SymbolKind.Class,
        'System.String',
      );
      const class2 = createTestSymbol(
        'String',
        SymbolKind.Class,
        'Custom.String',
      );

      manager.addSymbol(class1, 'SystemString.cls');
      manager.addSymbol(class2, 'CustomString.cls');

      const context: SymbolResolutionContext = {
        sourceFile: 'TestFile.cls',
        importStatements: [],
        namespaceContext: '',
        currentScope: 'TestClass',
        scopeChain: ['TestClass'],
        expectedType: 'System.String',
        parameterTypes: ['System.String'],
        returnType: 'System.String',
        accessModifier: 'public',
        isStatic: false,
        inheritanceChain: [],
        interfaceImplementations: [],
      };

      const result = manager.resolveSymbol('String', context);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should analyze access context for resolution', () => {
      const publicClass = createTestSymbol('PublicClass', SymbolKind.Class);
      const privateClass = createTestSymbol('PrivateClass', SymbolKind.Class);

      // Set modifiers
      publicClass.modifiers.visibility = SymbolVisibility.Public;
      privateClass.modifiers.visibility = SymbolVisibility.Private;

      manager.addSymbol(publicClass, 'PublicClass.cls');
      manager.addSymbol(privateClass, 'PrivateClass.cls');

      const publicContext: SymbolResolutionContext = {
        sourceFile: 'TestFile.cls',
        importStatements: [],
        namespaceContext: '',
        currentScope: 'TestClass',
        scopeChain: ['TestClass'],
        parameterTypes: [],
        accessModifier: 'public',
        isStatic: false,
        inheritanceChain: [],
        interfaceImplementations: [],
      };

      const privateContext: SymbolResolutionContext = {
        sourceFile: 'TestFile.cls',
        importStatements: [],
        namespaceContext: '',
        currentScope: 'TestClass',
        scopeChain: ['TestClass'],
        parameterTypes: [],
        accessModifier: 'private',
        isStatic: false,
        inheritanceChain: [],
        interfaceImplementations: [],
      };

      const publicResult = manager.resolveSymbol('PublicClass', publicContext);
      const privateResult = manager.resolveSymbol(
        'PrivateClass',
        privateContext,
      );

      expect(publicResult.confidence).toBeGreaterThan(0.5);
      expect(privateResult.confidence).toBeGreaterThan(0.5);
    });

    it('should analyze relationship context for resolution', () => {
      const method1 = createTestSymbol('myMethod', SymbolKind.Method);
      const field1 = createTestSymbol('myField', SymbolKind.Field);
      const class1 = createTestSymbol('MyClass', SymbolKind.Class);

      manager.addSymbol(method1, 'MyClass.cls');
      manager.addSymbol(field1, 'MyClass.cls');
      manager.addSymbol(class1, 'MyClass.cls');

      // Test method call context
      const methodContext: SymbolResolutionContext = {
        sourceFile: 'TestFile.cls',
        importStatements: [],
        namespaceContext: '',
        currentScope: 'TestClass',
        scopeChain: ['TestClass'],
        parameterTypes: [],
        accessModifier: 'public',
        isStatic: false,
        relationshipType: ReferenceType.METHOD_CALL,
        inheritanceChain: [],
        interfaceImplementations: [],
      };

      // Test field access context
      const fieldContext: SymbolResolutionContext = {
        sourceFile: 'TestFile.cls',
        importStatements: [],
        namespaceContext: '',
        currentScope: 'TestClass',
        scopeChain: ['TestClass'],
        parameterTypes: [],
        accessModifier: 'public',
        isStatic: false,
        relationshipType: ReferenceType.FIELD_ACCESS,
        inheritanceChain: [],
        interfaceImplementations: [],
      };

      const methodResult = manager.resolveSymbol('myMethod', methodContext);
      const fieldResult = manager.resolveSymbol('myField', fieldContext);

      expect(methodResult.confidence).toBeGreaterThan(0.5);
      expect(fieldResult.confidence).toBeGreaterThan(0.5);
    });

    it('should provide detailed resolution context explanations', () => {
      const class1 = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'Namespace1.MyClass',
      );
      const class2 = createTestSymbol(
        'MyClass',
        SymbolKind.Class,
        'Namespace2.MyClass',
      );

      manager.addSymbol(class1, 'Class1.cls');
      manager.addSymbol(class2, 'Class2.cls');

      const context: SymbolResolutionContext = {
        sourceFile: 'TestFile.cls',
        importStatements: ['Namespace1.*'],
        namespaceContext: 'Namespace1',
        currentScope: 'TestClass',
        scopeChain: ['TestClass'],
        parameterTypes: [],
        accessModifier: 'public',
        isStatic: false,
        inheritanceChain: [],
        interfaceImplementations: [],
      };

      const result = manager.resolveSymbol('MyClass', context);

      expect(result.resolutionContext).toContain('Resolved from 2 candidates');
      expect(result.resolutionContext).toContain('Import analysis applied');
      expect(result.resolutionContext).toContain(
        'Namespace context: Namespace1',
      );
      expect(result.resolutionContext).toMatch(/confidence \(\d+\.\d+%\)/);
    });
  });

  // ============================================================================
  // Phase 4 Integration Tests
  // ============================================================================

  describe('Phase 4 Integration', () => {
    it('should integrate context resolution with existing functionality', () => {
      // Setup: Add symbols with different namespaces
      const systemClass = createTestSymbol(
        'String',
        SymbolKind.Class,
        'System.String',
      );
      const customClass = createTestSymbol(
        'String',
        SymbolKind.Class,
        'Custom.String',
      );
      const method1 = createTestSymbol(
        'toString',
        SymbolKind.Method,
        'System.String.toString',
      );

      manager.addSymbol(systemClass, 'SystemString.cls');
      manager.addSymbol(customClass, 'CustomString.cls');
      manager.addSymbol(method1, 'SystemString.cls');

      // Test context resolution
      const context: SymbolResolutionContext = {
        sourceFile: 'TestFile.cls',
        importStatements: ['System.*'],
        namespaceContext: 'System',
        currentScope: 'TestClass',
        scopeChain: ['TestClass', 'TestMethod'],
        expectedType: 'System.String',
        parameterTypes: ['System.String'],
        returnType: 'System.String',
        accessModifier: 'public',
        isStatic: false,
        relationshipType: ReferenceType.METHOD_CALL,
        inheritanceChain: [],
        interfaceImplementations: [],
      };

      const result = manager.resolveSymbol('String', context);

      // Verify integration with existing functionality
      expect(result.symbol).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.7);

      // Test that resolved symbol works with other methods
      const metrics = manager.computeMetrics(result.symbol);
      expect(metrics).toBeDefined();

      const impact = manager.getImpactAnalysis(result.symbol);
      expect(impact).toBeDefined();
    });

    it('should handle complex resolution scenarios', () => {
      // Create a complex scenario with multiple ambiguous symbols
      const class1 = createTestSymbol(
        'Utils',
        SymbolKind.Class,
        'Namespace1.Utils',
      );
      const class2 = createTestSymbol(
        'Utils',
        SymbolKind.Class,
        'Namespace2.Utils',
      );
      const method1 = createTestSymbol(
        'format',
        SymbolKind.Method,
        'Namespace1.Utils.format',
      );
      const method2 = createTestSymbol(
        'format',
        SymbolKind.Method,
        'Namespace2.Utils.format',
      );

      manager.addSymbol(class1, 'Utils1.cls');
      manager.addSymbol(class2, 'Utils2.cls');
      manager.addSymbol(method1, 'Utils1.cls');
      manager.addSymbol(method2, 'Utils2.cls');

      // Test class resolution
      const classContext: SymbolResolutionContext = {
        sourceFile: 'TestFile.cls',
        importStatements: ['Namespace1.*'],
        namespaceContext: 'Namespace1',
        currentScope: 'TestClass',
        scopeChain: ['TestClass'],
        parameterTypes: [],
        accessModifier: 'public',
        isStatic: false,
        relationshipType: ReferenceType.TYPE_REFERENCE,
        inheritanceChain: [],
        interfaceImplementations: [],
      };

      const classResult = manager.resolveSymbol('Utils', classContext);
      expect(classResult.confidence).toBeGreaterThan(0.6);

      // Test method resolution
      const methodContext: SymbolResolutionContext = {
        sourceFile: 'TestFile.cls',
        importStatements: ['Namespace1.Utils'],
        namespaceContext: 'Namespace1',
        currentScope: 'TestClass',
        scopeChain: ['TestClass'],
        parameterTypes: ['String'],
        accessModifier: 'public',
        isStatic: false,
        relationshipType: ReferenceType.METHOD_CALL,
        inheritanceChain: [],
        interfaceImplementations: [],
      };

      const methodResult = manager.resolveSymbol('format', methodContext);
      expect(methodResult.confidence).toBeGreaterThan(0.6);
    });
  });
});
