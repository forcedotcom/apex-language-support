/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbolManager } from '../../src/utils/ApexSymbolManager';
import {
  ApexSymbol,
  SymbolKind,
  SymbolVisibility,
  SymbolTable,
} from '../../src/types/symbol';
import { ReferenceType } from '../../src/references/ApexSymbolGraph';
import { disableLogging } from '@salesforce/apex-lsp-shared';

// Disable logging for performance tests
disableLogging();

/**
 * Memory Optimization Tests for Phase 6.5
 *
 * These tests validate the memory optimization features implemented in Phase 6.5:
 * - SymbolTable integration with lightweight metadata
 * - Scope hierarchy integration into graph structure
 * - Memory pool management with WeakRef
 * - Cache size limits and TTL
 * - Advanced memory monitoring and optimization
 */

describe('ApexSymbolManager - Phase 6.5 Memory Optimization Tests', () => {
  let manager: ApexSymbolManager;

  beforeEach(() => {
    manager = new ApexSymbolManager();
  });

  afterEach(() => {
    // Clean up
    manager.optimizeMemory();
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
    fqn: fqn || name,
    location: {
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: name.length,
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
    key: { prefix: 'test', name, path: [name] },
    parentKey: null,
  });

  // Helper function to create test SymbolTable
  const createTestSymbolTable = (symbols: ApexSymbol[]): SymbolTable => {
    const symbolTable = new SymbolTable();

    symbols.forEach((symbol) => {
      symbolTable.addSymbol(symbol);
    });

    return symbolTable;
  };

  describe('Phase 6.5.1: Scope Hierarchy Integration', () => {
    it('should integrate scope hierarchy into graph structure', () => {
      const symbols = [
        createTestSymbol('TestClass', SymbolKind.Class),
        createTestSymbol('testMethod', SymbolKind.Method),
        createTestSymbol('testField', SymbolKind.Field),
      ];

      const symbolTable = createTestSymbolTable(symbols);
      manager.addSymbolTable(symbolTable, 'TestFile.cls');

      // Verify scope hierarchy was extracted
      const scopes = manager.getScopesInFile('TestFile.cls');
      expect(scopes.length).toBeGreaterThan(0);

      // Verify scope relationships exist
      const scopeRelationships = manager.findReferencesByType(
        symbols[0],
        ReferenceType.SCOPE_CONTAINS,
      );
      expect(scopeRelationships.length).toBeGreaterThan(0);
    });

    it('should provide scope-based symbol lookup', () => {
      const symbols = [
        createTestSymbol('TestClass', SymbolKind.Class),
        createTestSymbol('testMethod', SymbolKind.Method),
      ];

      const symbolTable = createTestSymbolTable(symbols);
      manager.addSymbolTable(symbolTable, 'TestFile.cls');

      // Test scope-based lookup
      const classSymbols = manager.findSymbolsInScope(
        'TestFile.cls',
        'TestClass',
      );
      expect(classSymbols.length).toBeGreaterThan(0);

      // Test scope hierarchy lookup
      const hierarchySymbols = manager.findSymbolsInScopeHierarchy(
        'TestFile.cls',
        'testMethod',
      );
      expect(hierarchySymbols.length).toBeGreaterThan(0);
    });
  });

  describe('Phase 6.5.3: File-to-Symbol Mapping Optimization', () => {
    it('should use lightweight file metadata instead of full SymbolTable', () => {
      const symbols = Array.from({ length: 100 }, (_, i) =>
        createTestSymbol(
          `Symbol${i}`,
          SymbolKind.Class,
          `Namespace.Symbol${i}`,
          `File${i}.cls`,
        ),
      );

      // Add symbols to create memory pressure
      symbols.forEach((symbol, i) => {
        const symbolTable = createTestSymbolTable([symbol]);
        manager.addSymbolTable(symbolTable, `File${i}.cls`);
      });

      const memoryUsage = manager.getMemoryUsage();

      // Verify file metadata is stored efficiently
      expect(memoryUsage.fileMetadataSize).toBe(100);
      expect(memoryUsage.scopeHierarchySize).toBeGreaterThan(0);

      // Verify memory optimization level
      expect(memoryUsage.memoryOptimizationLevel).toBeDefined();
    });

    it('should maintain scope hierarchy information without full SymbolTable objects', () => {
      const symbols = [
        createTestSymbol('ParentClass', SymbolKind.Class),
        createTestSymbol('ChildClass', SymbolKind.Class),
        createTestSymbol('method1', SymbolKind.Method),
        createTestSymbol('method2', SymbolKind.Method),
      ];

      const symbolTable = createTestSymbolTable(symbols);
      manager.addSymbolTable(symbolTable, 'TestFile.cls');

      // Verify scope hierarchy is preserved
      const scopes = manager.getScopesInFile('TestFile.cls');
      expect(scopes.length).toBeGreaterThan(0);

      // Verify parent-child relationships
      const parentScope = manager.getParentScope('TestFile.cls', 'ChildClass');
      expect(parentScope).toBeDefined();

      const childScopes = manager.getChildScopes('TestFile.cls', 'ParentClass');
      expect(childScopes.length).toBeGreaterThan(0);
    });
  });

  describe('Phase 6.5.4: Scope-Based Query Enhancement', () => {
    it('should provide efficient scope-aware symbol lookup', () => {
      const symbols = [
        createTestSymbol('TestClass', SymbolKind.Class),
        createTestSymbol('publicMethod', SymbolKind.Method),
        createTestSymbol('privateField', SymbolKind.Field),
      ];

      const symbolTable = createTestSymbolTable(symbols);
      manager.addSymbolTable(symbolTable, 'TestFile.cls');

      // Test scope-specific lookup
      const classSymbols = manager.findSymbolsInScope(
        'TestFile.cls',
        'TestClass',
      );
      expect(classSymbols.some((s) => s.name === 'publicMethod')).toBe(true);

      // Test scope hierarchy lookup
      const hierarchySymbols = manager.findSymbolsInScopeHierarchy(
        'TestFile.cls',
        'publicMethod',
      );
      expect(hierarchySymbols.length).toBeGreaterThan(0);
    });

    it('should support complex scope hierarchy queries', () => {
      // Create a more complex hierarchy
      const symbols = [
        createTestSymbol('OuterClass', SymbolKind.Class),
        createTestSymbol('InnerClass', SymbolKind.Class),
        createTestSymbol('method1', SymbolKind.Method),
        createTestSymbol('method2', SymbolKind.Method),
        createTestSymbol('field1', SymbolKind.Field),
      ];

      const symbolTable = createTestSymbolTable(symbols);
      manager.addSymbolTable(symbolTable, 'ComplexFile.cls');

      // Test nested scope queries
      const outerSymbols = manager.findSymbolsInScope(
        'ComplexFile.cls',
        'OuterClass',
      );
      expect(outerSymbols.length).toBeGreaterThan(0);

      const innerSymbols = manager.findSymbolsInScope(
        'ComplexFile.cls',
        'InnerClass',
      );
      expect(innerSymbols.length).toBeGreaterThan(0);

      // Test scope hierarchy traversal
      const hierarchySymbols = manager.findSymbolsInScopeHierarchy(
        'ComplexFile.cls',
        'method1',
      );
      expect(hierarchySymbols.length).toBeGreaterThan(0);
    });
  });

  describe('Phase 6.5.5: Memory Optimization', () => {
    it('should enforce cache size limits', () => {
      // Add many symbols to trigger cache size limits
      for (let i = 0; i < 15000; i++) {
        const symbol = createTestSymbol(`Symbol${i}`, SymbolKind.Class);
        manager.addSymbol(symbol, `File${i}.cls`);
      }

      // Perform operations to populate caches
      for (let i = 0; i < 1000; i++) {
        manager.findSymbolByNameCached(`Symbol${i}`);
        manager.getRelationshipStatsCached(
          createTestSymbol(`Symbol${i}`, SymbolKind.Class),
        );
      }

      // Trigger memory optimization
      manager.optimizeMemory();

      const memoryUsage = manager.getMemoryUsage();

      // Verify cache size limits are enforced
      expect(memoryUsage.totalCacheEntries).toBeLessThanOrEqual(10000);
    });

    it('should provide comprehensive memory optimization statistics', () => {
      // Add symbols to create memory pressure
      for (let i = 0; i < 1000; i++) {
        const symbol = createTestSymbol(`Symbol${i}`, SymbolKind.Class);
        manager.addSymbol(symbol, `File${i}.cls`);
      }

      // Perform operations to populate caches
      for (let i = 0; i < 100; i++) {
        manager.findSymbolByNameCached(`Symbol${i}`);
      }

      const optimizationStats = manager.getMemoryOptimizationStats();

      // Verify optimization statistics
      expect(optimizationStats.optimizationLevel).toBeDefined();
      expect(optimizationStats.memoryReduction).toBeGreaterThan(0);
      expect(optimizationStats.cacheEfficiency).toBeGreaterThan(0);
      expect(optimizationStats.referenceEfficiency).toBeGreaterThan(0);
      expect(optimizationStats.scopeOptimization).toBeGreaterThan(0);
      expect(optimizationStats.recommendations).toBeInstanceOf(Array);
    });

    it('should manage symbol reference pool efficiently', () => {
      const symbols = Array.from({ length: 100 }, (_, i) =>
        createTestSymbol(`Symbol${i}`, SymbolKind.Class),
      );

      // Add symbols to populate reference pool
      symbols.forEach((symbol) => {
        manager.addSymbol(symbol, 'TestFile.cls');
      });

      const memoryUsage = manager.getMemoryUsage();

      // Verify reference pool statistics
      expect(memoryUsage.memoryPoolStats.totalReferences).toBeGreaterThan(0);
      expect(memoryUsage.memoryPoolStats.activeReferences).toBeGreaterThan(0);
      expect(memoryUsage.memoryPoolStats.referenceEfficiency).toBeGreaterThan(
        0,
      );
      expect(memoryUsage.memoryPoolStats.lastCleanup).toBeGreaterThan(0);
    });

    it('should provide detailed memory usage breakdown', () => {
      const symbols = Array.from({ length: 500 }, (_, i) =>
        createTestSymbol(
          `Symbol${i}`,
          SymbolKind.Class,
          `Namespace.Symbol${i}`,
          `File${i}.cls`,
        ),
      );

      // Add symbols and perform operations
      symbols.forEach((symbol, i) => {
        const symbolTable = createTestSymbolTable([symbol]);
        manager.addSymbolTable(symbolTable, `File${i}.cls`);
      });

      // Perform operations to populate caches
      for (let i = 0; i < 50; i++) {
        manager.findSymbolByNameCached(`Symbol${i}`);
        manager.getRelationshipStatsCached(symbols[i]);
      }

      const memoryUsage = manager.getMemoryUsage();

      // Verify comprehensive memory breakdown
      expect(memoryUsage.symbolCacheSize).toBeGreaterThan(0);
      expect(memoryUsage.relationshipCacheSize).toBeGreaterThan(0);
      expect(memoryUsage.metricsCacheSize).toBeGreaterThan(0);
      expect(memoryUsage.totalCacheEntries).toBeGreaterThan(0);
      expect(memoryUsage.estimatedMemoryUsage).toBeGreaterThan(0);
      expect(memoryUsage.fileMetadataSize).toBe(500);
      expect(memoryUsage.scopeHierarchySize).toBeGreaterThan(0);
      expect(memoryUsage.memoryOptimizationLevel).toBeDefined();
      expect(memoryUsage.memoryPoolStats).toBeDefined();
    });
  });

  describe('Memory Pressure Testing', () => {
    it('should handle large codebases efficiently', () => {
      const startTime = Date.now();

      // Simulate large codebase
      for (let i = 0; i < 10000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Namespace.Class${i}`,
          `File${i}.cls`,
        );
        manager.addSymbol(symbol, `File${i}.cls`);
      }

      const setupTime = Date.now() - startTime;
      expect(setupTime).toBeLessThan(5000); // Should complete within 5 seconds

      const memoryUsage = manager.getMemoryUsage();

      // Verify memory usage is reasonable
      expect(memoryUsage.estimatedMemoryUsage).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
      expect(memoryUsage.memoryOptimizationLevel).not.toBe(
        'REQUIRES_OPTIMIZATION',
      );
    });

    it('should maintain performance under memory pressure', () => {
      // Create memory pressure
      for (let i = 0; i < 5000; i++) {
        const symbol = createTestSymbol(`Symbol${i}`, SymbolKind.Class);
        manager.addSymbol(symbol, `File${i}.cls`);
      }

      // Perform operations under pressure
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        manager.findSymbolByNameCached(`Symbol${i}`);
        manager.getRelationshipStatsCached(
          createTestSymbol(`Symbol${i}`, SymbolKind.Class),
        );
      }

      const operationTime = performance.now() - startTime;

      // Should still perform reasonably well
      expect(operationTime).toBeLessThan(1000); // Less than 1 second for 200 operations
    });
  });

  describe('Web Worker Compatibility', () => {
    it('should be compatible with web worker memory constraints', () => {
      // Simulate web worker memory constraints
      const symbols = Array.from({ length: 1000 }, (_, i) =>
        createTestSymbol(
          `Symbol${i}`,
          SymbolKind.Class,
          `Namespace.Symbol${i}`,
          `File${i}.cls`,
        ),
      );

      // Add symbols with memory optimization
      symbols.forEach((symbol, i) => {
        const symbolTable = createTestSymbolTable([symbol]);
        manager.addSymbolTable(symbolTable, `File${i}.cls`);
      });

      const memoryUsage = manager.getMemoryUsage();
      const optimizationStats = manager.getMemoryOptimizationStats();

      // Verify web worker compatibility
      expect(memoryUsage.estimatedMemoryUsage).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
      expect(optimizationStats.memoryReduction).toBeGreaterThan(50); // At least 50% reduction
      expect(optimizationStats.optimizationLevel).not.toBe(
        'REQUIRES_OPTIMIZATION',
      );
    });
  });
});
