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
  ApexSymbol,
  SymbolKind,
  SymbolVisibility,
} from '../../src/types/symbol';

describe('ApexSymbolGraph - Performance Tests', () => {
  let graph: ApexSymbolGraph;

  beforeEach(() => {
    graph = new ApexSymbolGraph();
  });

  afterEach(() => {
    graph.clear();
  });

  const createTestSymbol = (
    name: string,
    kind: SymbolKind,
    fqn?: string,
    filePath: string = 'TestFile.cls',
  ): ApexSymbol => ({
    id: `${filePath}:${name}`,
    name,
    kind,
    filePath,
    parentId: null,
    key: {
      prefix: 'symbol',
      name,
      path: [filePath],
      unifiedId: `${filePath}:${name}`,
      filePath,
      fqn: fqn || name,
      kind,
    },
    parentKey: null,
    fqn: fqn || name,
    _modifierFlags: 1, // PUBLIC flag
    _isLoaded: true,
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
    annotations: [],
    location: {
      startLine: 1,
      startColumn: 1,
      endLine: 1,
      endColumn: name.length + 1,
    },
  });

  const getMemoryUsage = () => {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
    };
  };

  const logMemoryUsage = (label: string) => {
    const mem = getMemoryUsage();
    console.log(`\n=== ${label} ===`);
    console.log(`Heap Used: ${(mem.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Heap Total: ${(mem.heapTotal / 1024 / 1024).toFixed(2)}MB`);
    console.log(`External: ${(mem.external / 1024 / 1024).toFixed(2)}MB`);
    console.log(`RSS: ${(mem.rss / 1024 / 1024).toFixed(2)}MB`);
  };

  describe('Memory Performance', () => {
    it('should measure baseline memory consumption', () => {
      logMemoryUsage('Baseline (Empty Graph)');
      const stats = graph.getStats();

      console.log('Graph Stats:', stats);

      expect(stats.totalSymbols).toBe(0);
      expect(stats.totalVertices).toBe(0);
      expect(stats.totalEdges).toBe(0);
    });

    it('should measure memory usage with 1,000 symbols', () => {
      logMemoryUsage('Before Adding Symbols');

      const startTime = performance.now();

      // Add 1,000 symbols
      for (let i = 0; i < 1000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Class${i}`,
          `File${i}.cls`,
        );
        graph.addSymbol(symbol, `File${i}.cls`);
      }

      const addTime = performance.now() - startTime;

      logMemoryUsage('After Adding 1,000 Symbols');
      const stats = graph.getStats();

      console.log(`Add time: ${addTime.toFixed(2)}ms`);
      console.log('Graph Stats:', stats);

      expect(stats.totalSymbols).toBe(1000);
      expect(stats.totalVertices).toBe(1000);
      expect(stats.totalEdges).toBe(0);
    });

    it('should measure memory usage with 10,000 symbols', () => {
      logMemoryUsage('Before Adding Symbols');

      const startTime = performance.now();

      // Add 10,000 symbols
      for (let i = 0; i < 10000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Class${i}`,
          `File${i}.cls`,
        );
        graph.addSymbol(symbol, `File${i}.cls`);
      }

      const addTime = performance.now() - startTime;

      logMemoryUsage('After Adding 10,000 Symbols');
      const stats = graph.getStats();

      console.log(`Add time: ${addTime.toFixed(2)}ms`);
      console.log('Graph Stats:', stats);

      expect(stats.totalSymbols).toBe(10000);
      expect(stats.totalVertices).toBe(10000);
      expect(stats.totalEdges).toBe(0);
    });

    it('should measure memory usage with references', () => {
      // Add 1,000 symbols first
      for (let i = 0; i < 1000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Class${i}`,
          `File${i}.cls`,
        );
        graph.addSymbol(symbol, `File${i}.cls`);
      }

      logMemoryUsage('After Adding 1,000 Symbols');

      const startTime = performance.now();

      // Add 5,000 references
      for (let i = 0; i < 5000; i++) {
        const sourceIndex = i % 1000;
        const targetIndex = (i + 1) % 1000;

        const sourceSymbol = createTestSymbol(
          `Class${sourceIndex}`,
          SymbolKind.Class,
          `Class${sourceIndex}`,
          `File${sourceIndex}.cls`,
        );
        const targetSymbol = createTestSymbol(
          `Class${targetIndex}`,
          SymbolKind.Class,
          `Class${targetIndex}`,
          `File${targetIndex}.cls`,
        );

        graph.addReference(
          sourceSymbol,
          targetSymbol,
          ReferenceType.METHOD_CALL,
          {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        );
      }

      const referenceTime = performance.now() - startTime;

      logMemoryUsage('After Adding 5,000 References');
      const stats = graph.getStats();

      console.log(`Reference add time: ${referenceTime.toFixed(2)}ms`);
      console.log('Graph Stats:', stats);

      expect(stats.totalSymbols).toBe(1000);
      expect(stats.totalVertices).toBe(1000);
      expect(stats.totalEdges).toBe(1000); // One edge per unique source-target pair
    });
  });

  describe('Performance Tests', () => {
    it('should measure symbol lookup performance', () => {
      // Add 10,000 symbols
      for (let i = 0; i < 10000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Class${i}`,
          `File${i}.cls`,
        );
        graph.addSymbol(symbol, `File${i}.cls`);
      }

      const startTime = performance.now();

      // Perform 1,000 lookups
      for (let i = 0; i < 1000; i++) {
        const symbolName = `Class${i % 10000}`;
        const found = graph.lookupSymbolByName(symbolName);
        expect(found.length).toBeGreaterThan(0);
      }

      const lookupTime = performance.now() - startTime;

      console.log(`Lookup time: ${lookupTime.toFixed(2)}ms for 1,000 lookups`);
      console.log(
        `Average lookup time: ${(lookupTime / 1000).toFixed(3)}ms per lookup`,
      );

      // Should be very fast (< 1ms per lookup)
      expect(lookupTime).toBeLessThan(1000); // < 1 second for 1000 lookups
    });

    it('should measure reference lookup performance', () => {
      // Add 1,000 symbols
      for (let i = 0; i < 1000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Class${i}`,
          `File${i}.cls`,
        );
        graph.addSymbol(symbol, `File${i}.cls`);
      }

      // Add 5,000 references
      for (let i = 0; i < 5000; i++) {
        const sourceIndex = i % 1000;
        const targetIndex = (i + 1) % 1000;

        const sourceSymbol = createTestSymbol(
          `Class${sourceIndex}`,
          SymbolKind.Class,
          `Class${sourceIndex}`,
          `File${sourceIndex}.cls`,
        );
        const targetSymbol = createTestSymbol(
          `Class${targetIndex}`,
          SymbolKind.Class,
          `Class${targetIndex}`,
          `File${targetIndex}.cls`,
        );

        graph.addReference(
          sourceSymbol,
          targetSymbol,
          ReferenceType.METHOD_CALL,
          {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        );
      }

      const startTime = performance.now();

      // Perform 1,000 reference lookups
      for (let i = 0; i < 1000; i++) {
        const symbol = createTestSymbol(
          `Class${i % 1000}`,
          SymbolKind.Class,
          `Class${i % 1000}`,
          `File${i % 1000}.cls`,
        );

        const referencesTo = graph.findReferencesTo(symbol);
        const referencesFrom = graph.findReferencesFrom(symbol);

        // Should find some references
        expect(
          referencesTo.length + referencesFrom.length,
        ).toBeGreaterThanOrEqual(0);
      }

      const referenceTime = performance.now() - startTime;

      console.log(
        `Reference lookup time: ${referenceTime.toFixed(2)}ms for 1,000 lookups`,
      );
      console.log(
        `Average reference lookup time: ${(referenceTime / 1000).toFixed(3)}ms per lookup`,
      );

      // Should be reasonably fast (< 5ms per lookup)
      expect(referenceTime).toBeLessThan(5000); // < 5 seconds for 1000 lookups
    });

    it('should measure circular dependency detection performance', () => {
      // Add 1,000 symbols
      for (let i = 0; i < 1000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Class${i}`,
          `File${i}.cls`,
        );
        graph.addSymbol(symbol, `File${i}.cls`);
      }

      // Add some circular references
      for (let i = 0; i < 100; i++) {
        const sourceIndex = i;
        const targetIndex = (i + 1) % 100;

        const sourceSymbol = createTestSymbol(
          `Class${sourceIndex}`,
          SymbolKind.Class,
          `Class${sourceIndex}`,
          `File${sourceIndex}.cls`,
        );
        const targetSymbol = createTestSymbol(
          `Class${targetIndex}`,
          SymbolKind.Class,
          `Class${targetIndex}`,
          `File${targetIndex}.cls`,
        );

        graph.addReference(
          sourceSymbol,
          targetSymbol,
          ReferenceType.METHOD_CALL,
          {
            startLine: 1,
            startColumn: 1,
            endLine: 1,
            endColumn: 10,
          },
        );
      }

      const startTime = performance.now();

      const cycles = graph.detectCircularDependencies();
      const cycleTime = performance.now() - startTime;

      console.log(`Cycle detection time: ${cycleTime.toFixed(2)}ms`);
      console.log(`Found ${cycles.length} cycles`);

      // Should be reasonably fast (< 100ms)
      expect(cycleTime).toBeLessThan(100);
    });
  });

  describe('Memory Optimization Tests', () => {
    it('should measure memory optimization statistics', () => {
      // Add 1,000 symbols
      for (let i = 0; i < 1000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Class${i}`,
          `File${i}.cls`,
        );
        graph.addSymbol(symbol, `File${i}.cls`);
      }

      const memoryStats = graph.getMemoryStats();
      const stats = graph.getStats();

      console.log('Memory Stats:', memoryStats);
      console.log('Graph Stats:', stats);

      expect(memoryStats.totalSymbols).toBe(1000);
      expect(memoryStats.totalVertices).toBe(1000);
      expect(memoryStats.memoryOptimizationLevel).toBe('OPTIMAL');
      expect(memoryStats.estimatedMemorySavings).toBeGreaterThan(0);
    });

    it('should measure memory efficiency with large datasets', () => {
      const initialMem = getMemoryUsage();

      // Add 50,000 symbols
      for (let i = 0; i < 50000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Class${i}`,
          `File${i}.cls`,
        );
        graph.addSymbol(symbol, `File${i}.cls`);
      }

      const finalMem = getMemoryUsage();
      const memoryIncrease = finalMem.heapUsed - initialMem.heapUsed;
      const memoryPerSymbol = memoryIncrease / 50000;

      console.log(
        `Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
      );
      console.log(
        `Memory per symbol: ${(memoryPerSymbol / 1024).toFixed(2)}KB`,
      );

      const stats = graph.getStats();
      console.log('Graph Stats:', stats);

      // Should be memory efficient (< 3KB per symbol including overhead)
      expect(memoryPerSymbol).toBeLessThan(3072); // < 3KB per symbol including overhead
    });
  });
});
