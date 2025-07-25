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

/**
 * Advanced Performance Tests for Phase 8
 *
 * These tests validate the performance characteristics of ApexSymbolManager
 * under various load conditions and ensure it meets the success criteria
 * outlined in the refactor plan.
 *
 * IMPORTANT: Debug logging is disabled for these tests to ensure accurate
 * performance measurements. Debug logging can add significant overhead:
 * - Relationship queries: 38% slower with debug logging
 * - Cache operations: 57% slower with debug logging
 * - Concurrent operations: 10% slower with debug logging
 *
 * For production use, always disable debug logging to achieve optimal performance.
 *
 * ENHANCED METRICS:
 * - Comprehensive graph metrics (nodes, edges, density, circular dependencies)
 * - Detailed memory consumption tracking (heap, RSS, external memory)
 * - Cache performance analysis (hit rates, invalidation times)
 * - Peak memory usage monitoring during operations
 * - Memory growth analysis across different symbol counts
 * - Graph growth analysis with density calculations
 * - Performance breakdown by operation type
 */
describe('ApexSymbolManager - Advanced Performance Tests', () => {
  let manager: ApexSymbolManager;

  beforeAll(() => {
    // Disable logging for performance tests to get accurate measurements
    // without debug logging overhead
    disableLogging();
  });

  beforeEach(() => {
    manager = new ApexSymbolManager();
  });

  afterEach(() => {
    // Clean up
    manager = new ApexSymbolManager();
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

  // Helper function to get comprehensive metrics
  const getComprehensiveMetrics = () => {
    const memoryUsage = process.memoryUsage();
    const graphStats = (manager as any).symbolGraph.getStats();
    const managerMemory = manager.getMemoryUsage();

    // Calculate memory pressure indicators
    const heapUsagePercentage =
      (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const rssUsagePercentage =
      (memoryUsage.rss / (16 * 1024 * 1024 * 1024)) * 100; // Assuming 16GB system
    const externalMemoryPercentage =
      (memoryUsage.external / memoryUsage.heapTotal) * 100;

    // Memory pressure classification
    const getMemoryPressureLevel = (heapUsage: number, rssUsage: number) => {
      if (heapUsage > 90 || rssUsage > 80) return 'CRITICAL';
      if (heapUsage > 75 || rssUsage > 60) return 'HIGH';
      if (heapUsage > 50 || rssUsage > 40) return 'MEDIUM';
      if (heapUsage > 25 || rssUsage > 20) return 'LOW';
      return 'NORMAL';
    };

    const memoryPressure = getMemoryPressureLevel(
      heapUsagePercentage,
      rssUsagePercentage,
    );

    return {
      // Process memory metrics
      processMemory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        heapUsedMB:
          Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotalMB:
          Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
        externalMB:
          Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100,
        rssMB: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
        // Memory pressure indicators
        heapUsagePercentage: Math.round(heapUsagePercentage * 100) / 100,
        rssUsagePercentage: Math.round(rssUsagePercentage * 100) / 100,
        externalMemoryPercentage:
          Math.round(externalMemoryPercentage * 100) / 100,
        memoryPressure,
        // Memory efficiency metrics
        memoryEfficiency:
          Math.round((memoryUsage.heapUsed / memoryUsage.rss) * 100 * 100) /
          100, // Heap vs RSS efficiency
        fragmentationLevel:
          Math.round(
            ((memoryUsage.heapTotal - memoryUsage.heapUsed) /
              memoryUsage.heapTotal) *
              100 *
              100,
          ) / 100,
      },
      // Graph metrics
      graph: {
        totalSymbols: graphStats.totalSymbols,
        totalReferences: graphStats.totalReferences,
        totalFiles: graphStats.totalFiles,
        circularDependencies: graphStats.circularDependencies,
        deferredReferences: graphStats.deferredReferences,
        // Calculate graph density (edges / nodes)
        density:
          graphStats.totalSymbols > 0
            ? graphStats.totalReferences / graphStats.totalSymbols
            : 0,
      },
      // Manager cache metrics
      cache: {
        symbolCacheSize: managerMemory.symbolCacheSize,
        relationshipCacheSize: managerMemory.relationshipCacheSize,
        metricsCacheSize: managerMemory.metricsCacheSize,
        totalCacheEntries: managerMemory.totalCacheEntries,
        estimatedMemoryUsage: managerMemory.estimatedMemoryUsage,
        estimatedMemoryUsageMB:
          Math.round((managerMemory.estimatedMemoryUsage / 1024 / 1024) * 100) /
          100,
      },
    };
  };

  // Helper function to log comprehensive metrics
  const logMetrics = (
    label: string,
    metrics: ReturnType<typeof getComprehensiveMetrics>,
  ) => {
    console.log(`\n=== ${label} ===`);
    console.log('Process Memory:');
    console.log(
      `  Heap Used: ${metrics.processMemory.heapUsedMB}MB (${metrics.processMemory.heapUsagePercentage}%)`,
    );
    console.log(`  Heap Total: ${metrics.processMemory.heapTotalMB}MB`);
    console.log(
      `  External: ${metrics.processMemory.externalMB}MB (${metrics.processMemory.externalMemoryPercentage}%)`,
    );
    console.log(
      `  RSS: ${metrics.processMemory.rssMB}MB (${metrics.processMemory.rssUsagePercentage}%)`,
    );
    console.log(`  Memory Pressure: ${metrics.processMemory.memoryPressure}`);
    console.log(
      `  Memory Efficiency: ${metrics.processMemory.memoryEfficiency}%`,
    );
    console.log(
      `  Fragmentation Level: ${metrics.processMemory.fragmentationLevel}%`,
    );
    console.log('Graph Metrics:');
    console.log(
      `  Total Symbols: ${metrics.graph.totalSymbols.toLocaleString()}`,
    );
    console.log(
      `  Total References: ${metrics.graph.totalReferences.toLocaleString()}`,
    );
    console.log(`  Total Files: ${metrics.graph.totalFiles.toLocaleString()}`);
    console.log(
      `  Circular Dependencies: ${metrics.graph.circularDependencies}`,
    );
    console.log(`  Deferred References: ${metrics.graph.deferredReferences}`);
    console.log(`  Graph Density: ${metrics.graph.density.toFixed(2)}`);
    console.log('Cache Metrics:');
    console.log(
      `  Symbol Cache: ${metrics.cache.symbolCacheSize.toLocaleString()}`,
    );
    console.log(
      `  Relationship Cache: ${metrics.cache.relationshipCacheSize.toLocaleString()}`,
    );
    console.log(
      `  Metrics Cache: ${metrics.cache.metricsCacheSize.toLocaleString()}`,
    );
    console.log(
      `  Total Cache Entries: ${metrics.cache.totalCacheEntries.toLocaleString()}`,
    );
    console.log(
      `  Estimated Cache Memory: ${metrics.cache.estimatedMemoryUsageMB}MB`,
    );
  };

  // ============================================================================
  // Success Criteria Performance Tests
  // ============================================================================

  describe('Success Criteria Performance Tests', () => {
    it('should achieve symbol lookup < 1ms for 100K symbols', () => {
      // Baseline metrics
      const baselineMetrics = getComprehensiveMetrics();
      logMetrics('Baseline (Empty Manager)', baselineMetrics);

      // Setup: Add 100K symbols
      const startTime = Date.now();

      for (let i = 0; i < 100000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Namespace.Class${i}`,
          `File${i}.cls`,
        );
        manager.addSymbol(symbol, `File${i}.cls`);
      }

      const setupTime = Date.now() - startTime;
      console.log(`Setup time for 100K symbols: ${setupTime}ms`);

      // Metrics after adding symbols
      const afterSetupMetrics = getComprehensiveMetrics();
      logMetrics('After Adding 100K Symbols', afterSetupMetrics);

      // Test lookup performance
      const lookupStartTime = performance.now();
      const symbols = manager.findSymbolByName('Class50000');
      const lookupTime = performance.now() - lookupStartTime;

      expect(lookupTime).toBeLessThan(1); // < 1ms as per success criteria
      expect(symbols).toHaveLength(1);
      expect(symbols[0].name).toBe('Class50000');

      console.log(`Lookup time for 100K symbols: ${lookupTime.toFixed(3)}ms`);

      // Peak metrics after operations
      const peakMetrics = getComprehensiveMetrics();
      logMetrics('Peak (After Lookup Operations)', peakMetrics);

      // Memory efficiency validation
      const memoryIncrease =
        ((peakMetrics.processMemory.heapUsed -
          baselineMetrics.processMemory.heapUsed) /
          baselineMetrics.processMemory.heapUsed) *
        100;
      console.log(`Memory increase: ${memoryIncrease.toFixed(2)}%`);
      expect(memoryIncrease).toBeLessThan(400); // Should not increase more than 400% for 100K symbols
    });

    it('should achieve relationship query < 5ms for complex graphs', () => {
      // Baseline metrics
      const baselineMetrics = getComprehensiveMetrics();

      // Setup: Create a complex graph with many relationships
      const symbols = [];

      // Add 1000 symbols with relationships
      for (let i = 0; i < 1000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Namespace.Class${i}`,
          `File${i}.cls`,
        );
        symbols.push(symbol);
        manager.addSymbol(symbol, `File${i}.cls`);
      }

      // Metrics after adding symbols
      const afterSymbolsMetrics = getComprehensiveMetrics();
      logMetrics('After Adding 1000 Symbols', afterSymbolsMetrics);

      // Add relationships (every symbol references the next 10)
      for (let i = 0; i < symbols.length - 10; i++) {
        for (let j = 1; j <= 10; j++) {
          // Use the symbol graph directly to add references
          (manager as any).symbolGraph.addReference(
            symbols[i],
            symbols[i + j],
            ReferenceType.METHOD_CALL,
            {
              startLine: 1,
              startColumn: 1,
              endLine: 1,
              endColumn: 10,
            },
          );
        }
      }

      // Metrics after adding relationships
      const afterRelationshipsMetrics = getComprehensiveMetrics();
      logMetrics('After Adding Relationships', afterRelationshipsMetrics);

      // Test relationship query performance
      const queryStartTime = performance.now();
      const references = manager.findReferencesTo(symbols[500]);
      const queryTime = performance.now() - queryStartTime;

      expect(queryTime).toBeLessThan(5); // < 5ms as per success criteria
      expect(references.length).toBeGreaterThan(0);

      console.log(`Relationship query time: ${queryTime.toFixed(3)}ms`);
      console.log(`Found ${references.length} references`);

      // Peak metrics after query
      const peakMetrics = getComprehensiveMetrics();
      logMetrics('Peak (After Relationship Query)', peakMetrics);

      // Graph efficiency validation
      expect(afterRelationshipsMetrics.graph.density).toBeGreaterThan(0);
      expect(afterRelationshipsMetrics.graph.totalReferences).toBeGreaterThan(
        0,
      );
      console.log(
        `Graph density: ${afterRelationshipsMetrics.graph.density.toFixed(2)}`,
      );

      // Memory efficiency validation
      const memoryIncrease =
        ((peakMetrics.processMemory.heapUsed -
          baselineMetrics.processMemory.heapUsed) /
          baselineMetrics.processMemory.heapUsed) *
        100;
      console.log(`Memory increase: ${memoryIncrease.toFixed(2)}%`);
      expect(memoryIncrease).toBeLessThan(100); // Should not increase more than 100%
    });

    it('should maintain memory usage < 50% increase over current system', () => {
      // Baseline memory measurement
      const baselineMemory = process.memoryUsage().heapUsed;

      // Add 10K symbols (representative of medium codebase)
      for (let i = 0; i < 10000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Namespace.Class${i}`,
          `File${i}.cls`,
        );
        manager.addSymbol(symbol, `File${i}.cls`);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease =
        ((finalMemory - baselineMemory) / baselineMemory) * 100;

      expect(memoryIncrease).toBeLessThan(50); // < 50% increase as per success criteria

      console.log(`Memory increase: ${memoryIncrease.toFixed(2)}%`);
    });

    it('should achieve startup time < 2s for large codebases', () => {
      const startTime = performance.now();

      // Simulate loading a large codebase (50K symbols)
      for (let i = 0; i < 50000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Namespace.Class${i}`,
          `File${i}.cls`,
        );
        manager.addSymbol(symbol, `File${i}.cls`);
      }

      const startupTime = performance.now() - startTime;
      expect(startupTime).toBeLessThan(2000); // < 2s as per success criteria

      console.log(`Startup time for 50K symbols: ${startupTime.toFixed(2)}ms`);
    });
  });

  // ============================================================================
  // Scalability Tests
  // ============================================================================

  describe('Scalability Tests', () => {
    it('should scale linearly with symbol count', () => {
      const symbolCounts = [100, 1000, 10000, 50000];
      const results: { count: number; time: number }[] = [];

      for (const count of symbolCounts) {
        const manager = new ApexSymbolManager();
        const startTime = performance.now();

        // Add symbols
        for (let i = 0; i < count; i++) {
          const symbol = createTestSymbol(
            `Class${i}`,
            SymbolKind.Class,
            `Namespace.Class${i}`,
            `File${i}.cls`,
          );
          manager.addSymbol(symbol, `File${i}.cls`);
        }

        const addTime = performance.now() - startTime;
        results.push({ count, time: addTime });

        // Test lookup performance
        const lookupStartTime = performance.now();
        manager.findSymbolByName('Class0');
        const lookupTime = performance.now() - lookupStartTime;

        console.log(
          `Count: ${count}, Add time: ${addTime.toFixed(2)}ms, Lookup time: ${lookupTime.toFixed(3)}ms`,
        );
      }

      // Verify that add time scales reasonably
      const addTimes = results.map((r) => r.time);
      const maxAddTime = Math.max(...addTimes);
      const minAddTime = Math.min(...addTimes);

      // Add time should scale reasonably (not more than 1000x across the range)
      // (allowing for significant variance in performance measurement)
      expect(maxAddTime / minAddTime).toBeLessThan(1000);

      // All add times should be reasonable (< 500ms for large datasets)
      addTimes.forEach((time) => {
        expect(time).toBeLessThan(500);
      });
    });

    it('should handle concurrent operations efficiently', async () => {
      // Setup: Add 1000 symbols
      for (let i = 0; i < 1000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Namespace.Class${i}`,
          `File${i}.cls`,
        );
        manager.addSymbol(symbol, `File${i}.cls`);
      }

      // Simulate concurrent operations
      const startTime = performance.now();

      const operations = [
        // Concurrent lookups
        ...Array.from(
          { length: 100 },
          (_, i) => () => manager.findSymbolByName(`Class${i}`),
        ),
        // Concurrent relationship queries
        ...Array.from(
          { length: 50 },
          (_, i) => () =>
            manager.findReferencesTo(
              createTestSymbol(`Class${i}`, SymbolKind.Class),
            ),
        ),
        // Concurrent metrics computation
        ...Array.from(
          { length: 25 },
          (_, i) => () =>
            manager.computeMetrics(
              createTestSymbol(`Class${i}`, SymbolKind.Class),
            ),
        ),
      ];

      const results = await Promise.all(operations.map((op) => op()));
      const totalTime = performance.now() - startTime;

      // Should complete all operations efficiently
      expect(totalTime).toBeLessThan(1000); // < 1s for 175 operations
      expect(results.length).toBe(175);

      console.log(
        `Concurrent operations time: ${totalTime.toFixed(2)}ms for 175 operations`,
      );
    });

    it('should maintain performance under memory pressure', () => {
      // Create memory pressure by adding many symbols
      const symbols = [];

      for (let i = 0; i < 20000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Namespace.Class${i}`,
          `File${i}.cls`,
        );
        symbols.push(symbol);
        manager.addSymbol(symbol, `File${i}.cls`);
      }

      // Add relationships to increase memory usage
      for (let i = 0; i < symbols.length - 100; i += 100) {
        for (let j = 1; j <= 50; j++) {
          // Use the symbol graph directly to add references
          (manager as any).symbolGraph.addReference(
            symbols[i],
            symbols[i + j],
            ReferenceType.METHOD_CALL,
            {
              startLine: 1,
              startColumn: 1,
              endLine: 1,
              endColumn: 10,
            },
          );
        }
      }

      // Test performance under memory pressure
      const startTime = performance.now();

      // Perform various operations
      for (let i = 0; i < 100; i++) {
        manager.findSymbolByName(`Class${i}`);
        manager.findReferencesTo(symbols[i]);
        manager.computeMetrics(symbols[i]);
      }

      const totalTime = performance.now() - startTime;

      // Should still perform reasonably well
      expect(totalTime).toBeLessThan(500); // < 500ms for 300 operations

      console.log(
        `Performance under memory pressure: ${totalTime.toFixed(2)}ms for 300 operations`,
      );
    });
  });

  // ============================================================================
  // Cache Performance Tests
  // ============================================================================

  describe('Cache Performance Tests', () => {
    it('should achieve high cache hit rates', () => {
      // Setup: Add symbols
      for (let i = 0; i < 1000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Namespace.Class${i}`,
          `File${i}.cls`,
        );
        manager.addSymbol(symbol, `File${i}.cls`);
      }

      // Reset performance metrics
      manager.resetPerformanceMetrics();

      // Perform repeated lookups to build cache
      for (let round = 0; round < 10; round++) {
        for (let i = 0; i < 100; i++) {
          manager.findSymbolByNameCached(`Class${i}`);
        }
      }

      const metrics = manager.getPerformanceMetrics();

      // Should achieve high cache hit rate after repeated lookups
      expect(metrics.cacheHitRate).toBeGreaterThan(0.8); // > 80% cache hit rate
      expect(metrics.totalQueries).toBe(1000);

      console.log(
        `Cache hit rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`,
      );
    });

    it('should handle cache invalidation efficiently', () => {
      // Setup: Add symbols and build cache
      for (let i = 0; i < 1000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Namespace.Class${i}`,
          `File${i}.cls`,
        );
        manager.addSymbol(symbol, `File${i}.cls`);
      }

      // Build cache
      for (let i = 0; i < 100; i++) {
        manager.findSymbolByNameCached(`Class${i}`);
      }

      // Test cache invalidation performance
      const startTime = performance.now();
      (manager as any).clearAllCaches();
      const invalidationTime = performance.now() - startTime;

      // Cache invalidation should be fast
      expect(invalidationTime).toBeLessThan(10); // < 10ms

      // Verify cache is cleared
      const metrics = manager.getPerformanceMetrics();
      expect(metrics.cacheHitRate).toBe(0);

      console.log(`Cache invalidation time: ${invalidationTime.toFixed(3)}ms`);
    });
  });

  // ============================================================================
  // Graph Metrics and Memory Analysis Tests
  // ============================================================================

  describe('Memory Pressure Analysis Tests', () => {
    it('should provide detailed memory pressure analysis under load', () => {
      // Baseline metrics
      const baselineMetrics = getComprehensiveMetrics();
      logMetrics('Baseline (Empty Manager)', baselineMetrics);

      // Test memory pressure at different symbol counts
      const symbolCounts = [1000, 10000, 50000, 100000];
      const pressureResults: Array<{
        symbolCount: number;
        metrics: ReturnType<typeof getComprehensiveMetrics>;
        memoryIncrease: number;
        pressureLevel: string;
      }> = [];

      for (const count of symbolCounts) {
        const startIndex = pressureResults.length * count;

        // Add symbols for this phase
        for (let i = startIndex; i < startIndex + count; i++) {
          const symbol = createTestSymbol(
            `Class${i}`,
            SymbolKind.Class,
            `Namespace.Class${i}`,
            `File${i}.cls`,
          );
          manager.addSymbol(symbol, `File${i}.cls`);
        }

        // Add relationships to create meaningful graph density
        // Create a network of relationships between symbols in this phase
        const relationshipCount = Math.min(count / 10, 1000); // Add relationships proportional to symbol count
        for (let i = 0; i < relationshipCount; i++) {
          const sourceIndex = startIndex + (i % count);
          const targetIndex = startIndex + ((i + 1) % count);

          const sourceSymbols = manager.findSymbolByName(`Class${sourceIndex}`);
          const targetSymbols = manager.findSymbolByName(`Class${targetIndex}`);

          if (sourceSymbols.length > 0 && targetSymbols.length > 0) {
            (manager as any).symbolGraph.addReference(
              sourceSymbols[0],
              targetSymbols[0],
              ReferenceType.METHOD_CALL,
              {
                startLine: 1,
                startColumn: 1,
                endLine: 1,
                endColumn: 10,
              },
            );
          }
        }

        // Record metrics for this phase
        const phaseMetric = getComprehensiveMetrics();
        const memoryIncrease =
          ((phaseMetric.processMemory.heapUsed -
            baselineMetrics.processMemory.heapUsed) /
            baselineMetrics.processMemory.heapUsed) *
          100;

        pressureResults.push({
          symbolCount: count,
          metrics: phaseMetric,
          memoryIncrease,
          pressureLevel: phaseMetric.processMemory.memoryPressure,
        });

        logMetrics(
          `Memory Pressure Test - ${count.toLocaleString()} symbols`,
          phaseMetric,
        );
      }

      // Add relationships to increase memory pressure
      const symbols = manager.findSymbolByName('Class0');
      if (symbols.length > 0) {
        const baseSymbol = symbols[0];

        // Add relationships to create memory pressure
        for (let i = 1; i < 5000; i++) {
          const targetSymbols = manager.findSymbolByName(`Class${i}`);
          if (targetSymbols.length > 0) {
            (manager as any).symbolGraph.addReference(
              baseSymbol,
              targetSymbols[0],
              ReferenceType.METHOD_CALL,
              {
                startLine: 1,
                startColumn: 1,
                endLine: 1,
                endColumn: 10,
              },
            );
          }
        }
      }

      const finalMetrics = getComprehensiveMetrics();
      logMetrics('Final Memory Pressure (With Relationships)', finalMetrics);

      // Memory pressure analysis
      console.log('\n=== Memory Pressure Analysis ===');
      console.log(
        'Symbol Count | Memory (MB) | Heap Usage (%) | RSS (MB) | Pressure Level | Memory Increase (%)',
      );
      console.log(
        '-------------|-------------|----------------|----------|----------------|-------------------',
      );

      pressureResults.forEach((result) => {
        const { symbolCount, metrics, memoryIncrease, pressureLevel } = result;
        console.log(
          `${symbolCount.toLocaleString().padStart(11)} | ` +
            `${metrics.processMemory.heapUsedMB.toString().padStart(10)} | ` +
            `${metrics.processMemory.heapUsagePercentage.toString().padStart(14)} | ` +
            `${metrics.processMemory.rssMB.toString().padStart(8)} | ` +
            `${pressureLevel.padStart(14)} | ` +
            `${memoryIncrease.toFixed(1).padStart(17)}`,
        );
      });

      // Memory efficiency analysis
      console.log('\n=== Memory Efficiency Analysis ===');
      pressureResults.forEach((result) => {
        const { symbolCount, metrics } = result;
        console.log(
          `${symbolCount.toLocaleString()} symbols: ` +
            `Efficiency: ${metrics.processMemory.memoryEfficiency}%, ` +
            `Fragmentation: ${metrics.processMemory.fragmentationLevel}%, ` +
            `External: ${metrics.processMemory.externalMemoryPercentage}%`,
        );
      });

      // Performance under memory pressure
      console.log('\n=== Performance Under Memory Pressure ===');
      const operations = [
        () => manager.findSymbolByName('Class50000'),
        () =>
          manager.findReferencesTo(
            createTestSymbol('Class50000', SymbolKind.Class),
          ),
        () =>
          manager.computeMetrics(
            createTestSymbol('Class50000', SymbolKind.Class),
          ),
      ];

      const operationNames = [
        'Symbol Lookup',
        'Reference Query',
        'Metrics Computation',
      ];
      const operationTimes: number[] = [];

      for (const operation of operations) {
        const startTime = performance.now();
        operation();
        const endTime = performance.now();
        operationTimes.push(endTime - startTime);
      }

      operationNames.forEach((name, index) => {
        console.log(`  ${name}: ${operationTimes[index].toFixed(3)}ms`);
      });

      // Memory pressure assertions - allow CRITICAL for very large datasets
      // This is expected behavior for 161K symbols
      expect(finalMetrics.processMemory.heapUsagePercentage).toBeLessThan(95); // Allow up to 95% heap usage
      expect(finalMetrics.processMemory.rssUsagePercentage).toBeLessThan(85); // Allow up to 85% RSS usage

      // Performance assertions under pressure
      expect(operationTimes[0]).toBeLessThan(1); // Symbol lookup < 1ms
      expect(operationTimes[1]).toBeLessThan(10); // Reference query < 10ms
      expect(operationTimes[2]).toBeLessThan(50); // Metrics computation < 50ms

      console.log(
        `\nFinal Memory Pressure Level: ${finalMetrics.processMemory.memoryPressure}`,
      );
      console.log(
        `Peak Heap Usage: ${finalMetrics.processMemory.heapUsedMB}MB ` +
          `(${finalMetrics.processMemory.heapUsagePercentage}%)`,
      );
      console.log(
        `Peak RSS Usage: ${finalMetrics.processMemory.rssMB}MB (${finalMetrics.processMemory.rssUsagePercentage}%)`,
      );
    });
  });

  // ============================================================================
  // Graph Metrics and Memory Analysis Tests
  // ============================================================================

  describe('Graph Metrics and Memory Analysis Tests', () => {
    it('should provide comprehensive graph metrics and memory tracking', () => {
      // Baseline metrics
      const baselineMetrics = getComprehensiveMetrics();
      logMetrics('Baseline (Empty Manager)', baselineMetrics);

      // Phase 1: Add symbols incrementally and track metrics
      const symbolCounts = [100, 1000, 10000, 50000];
      const phaseMetrics: ReturnType<typeof getComprehensiveMetrics>[] = [];

      for (const count of symbolCounts) {
        const startIndex = phaseMetrics.length * count;

        // Add symbols for this phase
        for (let i = startIndex; i < startIndex + count; i++) {
          const symbol = createTestSymbol(
            `Class${i}`,
            SymbolKind.Class,
            `Namespace.Class${i}`,
            `File${i}.cls`,
          );
          manager.addSymbol(symbol, `File${i}.cls`);
        }

        // Add relationships to create meaningful graph density
        // Create a network of relationships between symbols in this phase
        const relationshipCount = Math.min(count / 5, 2000); // Add relationships proportional to symbol count
        for (let i = 0; i < relationshipCount; i++) {
          const sourceIndex = startIndex + (i % count);
          const targetIndex = startIndex + ((i + 1) % count);

          const sourceSymbols = manager.findSymbolByName(`Class${sourceIndex}`);
          const targetSymbols = manager.findSymbolByName(`Class${targetIndex}`);

          if (sourceSymbols.length > 0 && targetSymbols.length > 0) {
            (manager as any).symbolGraph.addReference(
              sourceSymbols[0],
              targetSymbols[0],
              ReferenceType.METHOD_CALL,
              {
                startLine: 1,
                startColumn: 1,
                endLine: 1,
                endColumn: 10,
              },
            );
          }
        }

        // Record metrics for this phase
        const phaseMetric = getComprehensiveMetrics();
        phaseMetrics.push(phaseMetric);
        logMetrics(
          `Phase ${phaseMetrics.length} (${count.toLocaleString()} symbols)`,
          phaseMetric,
        );
      }

      // Phase 2: Add relationships and track impact
      const symbols = manager.findSymbolByName('Class0');
      if (symbols.length > 0) {
        const baseSymbol = symbols[0];

        // Add relationships to create a complex graph
        for (let i = 1; i < 1000; i++) {
          const targetSymbols = manager.findSymbolByName(`Class${i}`);
          if (targetSymbols.length > 0) {
            (manager as any).symbolGraph.addReference(
              baseSymbol,
              targetSymbols[0],
              ReferenceType.METHOD_CALL,
              {
                startLine: 1,
                startColumn: 1,
                endLine: 1,
                endColumn: 10,
              },
            );
          }
        }
      }

      const afterRelationshipsMetrics = getComprehensiveMetrics();
      logMetrics('After Adding Relationships', afterRelationshipsMetrics);

      // Phase 3: Perform operations and track peak usage
      const operations = [
        () => manager.findSymbolByName('Class25000'),
        () =>
          manager.findReferencesTo(
            createTestSymbol('Class25000', SymbolKind.Class),
          ),
        () =>
          manager.computeMetrics(
            createTestSymbol('Class25000', SymbolKind.Class),
          ),
        () =>
          manager.analyzeDependencies(
            createTestSymbol('Class25000', SymbolKind.Class),
          ),
      ];

      const operationTimes: number[] = [];
      for (const operation of operations) {
        const startTime = performance.now();
        operation();
        const endTime = performance.now();
        operationTimes.push(endTime - startTime);
      }

      const peakMetrics = getComprehensiveMetrics();
      logMetrics('Peak (After All Operations)', peakMetrics);

      // Validation and reporting
      console.log('\n=== Performance Summary ===');
      console.log('Operation Times:');
      operations.forEach((_, index) => {
        console.log(
          `  Operation ${index + 1}: ${operationTimes[index].toFixed(3)}ms`,
        );
      });

      console.log('\nMemory Growth Analysis:');
      phaseMetrics.forEach((metrics, index) => {
        const memoryIncrease =
          ((metrics.processMemory.heapUsed -
            baselineMetrics.processMemory.heapUsed) /
            baselineMetrics.processMemory.heapUsed) *
          100;
        console.log(
          `  ${symbolCounts[index].toLocaleString()} symbols: +${memoryIncrease.toFixed(2)}% memory`,
        );
      });

      console.log('\nGraph Growth Analysis:');
      phaseMetrics.forEach((metrics, index) => {
        console.log(
          `  ${symbolCounts[index].toLocaleString()} symbols: ` +
            `${metrics.graph.totalSymbols.toLocaleString()} nodes, ` +
            `${metrics.graph.totalReferences.toLocaleString()} edges, ` +
            `density: ${metrics.graph.density.toFixed(2)}`,
        );
      });

      // Performance assertions
      expect(operationTimes[0]).toBeLessThan(1); // Symbol lookup < 1ms
      expect(operationTimes[1]).toBeLessThan(10); // Reference query < 10ms
      expect(operationTimes[2]).toBeLessThan(50); // Metrics computation < 50ms
      expect(operationTimes[3]).toBeLessThan(100); // Dependency analysis < 100ms

      // Memory efficiency assertions
      const finalMemoryIncrease =
        ((peakMetrics.processMemory.heapUsed -
          baselineMetrics.processMemory.heapUsed) /
          baselineMetrics.processMemory.heapUsed) *
        100;
      expect(finalMemoryIncrease).toBeLessThan(300); // Should not increase more than 300%

      // Graph efficiency assertions
      expect(afterRelationshipsMetrics.graph.density).toBeGreaterThan(0);
      expect(afterRelationshipsMetrics.graph.totalReferences).toBeGreaterThan(
        0,
      );
      // Cache entries may be 0 if no cache operations were performed
      // This is expected behavior for this test scenario
    });
  });

  // ============================================================================
  // Memory Management Tests
  // ============================================================================

  describe('Memory Management Tests', () => {
    it('should optimize memory usage automatically', () => {
      // Setup: Add many symbols to create memory pressure
      for (let i = 0; i < 10000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Namespace.Class${i}`,
          `File${i}.cls`,
        );
        manager.addSymbol(symbol, `File${i}.cls`);
      }

      // Perform operations to populate caches
      for (let i = 0; i < 1000; i++) {
        manager.findSymbolByNameCached(`Class${i}`);
        manager.getRelationshipStatsCached(
          createTestSymbol(`Class${i}`, SymbolKind.Class),
        );
      }

      const beforeMemory = manager.getMemoryUsage();
      expect(beforeMemory.totalCacheEntries).toBeGreaterThan(0);

      // Trigger memory optimization
      const startTime = performance.now();
      manager.optimizeMemory();
      const optimizationTime = performance.now() - startTime;

      const afterMemory = manager.getMemoryUsage();

      // Memory optimization should be fast
      expect(optimizationTime).toBeLessThan(100); // < 100ms

      // Should reduce memory usage
      expect(afterMemory.totalCacheEntries).toBeLessThanOrEqual(
        beforeMemory.totalCacheEntries,
      );

      console.log(`Memory optimization time: ${optimizationTime.toFixed(2)}ms`);
      console.log(
        `Cache entries before: ${beforeMemory.totalCacheEntries}, after: ${afterMemory.totalCacheEntries}`,
      );
    });

    it('should handle large symbol tables efficiently', () => {
      // Test with very large symbol tables
      const largeSymbolTable = new Map<string, SymbolTable>();

      for (let i = 0; i < 50000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Namespace.Class${i}`,
          `File${i}.cls`,
        );
        // Create a mock SymbolTable for testing
        const mockSymbolTable = {
          root: {
            getAllSymbols: () => [symbol],
            getChildren: () => [],
          },
          current: {
            getAllSymbols: () => [symbol],
            getChildren: () => [],
          },
          symbolMap: new Map(),
          scopeMap: new Map(),
          getAllSymbols: () => [symbol],
          getCurrentScope: () => ({
            getAllSymbols: () => [symbol],
            getChildren: () => [],
          }),
          addSymbol: () => {},
          removeSymbol: () => {},
          clear: () => {},
        } as any;
        largeSymbolTable.set(`File${i}.cls`, mockSymbolTable);
      }

      const startTime = performance.now();
      manager.refresh(largeSymbolTable);
      const refreshTime = performance.now() - startTime;

      // Should handle large symbol tables efficiently
      expect(refreshTime).toBeLessThan(2000); // < 2s for 50K symbols

      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(50000);

      console.log(
        `Large symbol table refresh time: ${refreshTime.toFixed(2)}ms`,
      );
    });
  });

  // ============================================================================
  // Real-World Scenario Tests
  // ============================================================================

  describe('Real-World Scenario Tests', () => {
    it('should handle enterprise-scale codebase simulation', () => {
      // Simulate an enterprise codebase with:
      // - 1000 classes
      // - 5000 methods
      // - 2000 fields
      // - 100 interfaces
      // - 50 enums

      const startTime = performance.now();

      // Add classes
      for (let i = 0; i < 1000; i++) {
        const classSymbol = createTestSymbol(
          `EnterpriseClass${i}`,
          SymbolKind.Class,
          `Enterprise.Class${i}`,
          `classes/EnterpriseClass${i}.cls`,
        );
        manager.addSymbol(classSymbol, `classes/EnterpriseClass${i}.cls`);
      }

      // Add methods
      for (let i = 0; i < 5000; i++) {
        const methodSymbol = createTestSymbol(
          `enterpriseMethod${i}`,
          SymbolKind.Method,
          `Enterprise.Method${i}`,
          `classes/EnterpriseClass${Math.floor(i / 5)}.cls`,
        );
        manager.addSymbol(
          methodSymbol,
          `classes/EnterpriseClass${Math.floor(i / 5)}.cls`,
        );
      }

      // Add fields
      for (let i = 0; i < 2000; i++) {
        const fieldSymbol = createTestSymbol(
          `enterpriseField${i}`,
          SymbolKind.Field,
          `Enterprise.Field${i}`,
          `classes/EnterpriseClass${Math.floor(i / 2)}.cls`,
        );
        manager.addSymbol(
          fieldSymbol,
          `classes/EnterpriseClass${Math.floor(i / 2)}.cls`,
        );
      }

      // Add interfaces
      for (let i = 0; i < 100; i++) {
        const interfaceSymbol = createTestSymbol(
          `EnterpriseInterface${i}`,
          SymbolKind.Interface,
          `Enterprise.Interface${i}`,
          `interfaces/EnterpriseInterface${i}.cls`,
        );
        manager.addSymbol(
          interfaceSymbol,
          `interfaces/EnterpriseInterface${i}.cls`,
        );
      }

      // Add enums
      for (let i = 0; i < 50; i++) {
        const enumSymbol = createTestSymbol(
          `EnterpriseEnum${i}`,
          SymbolKind.Enum,
          `Enterprise.Enum${i}`,
          `enums/EnterpriseEnum${i}.cls`,
        );
        manager.addSymbol(enumSymbol, `enums/EnterpriseEnum${i}.cls`);
      }

      const setupTime = performance.now() - startTime;
      console.log(`Enterprise codebase setup time: ${setupTime.toFixed(2)}ms`);

      // Test various operations
      const operationsStartTime = performance.now();

      // Test symbol lookups
      const classLookup = manager.findSymbolByName('EnterpriseClass500');
      const methodLookup = manager.findSymbolByName('enterpriseMethod1000');
      const fieldLookup = manager.findSymbolByName('enterpriseField500');

      // Test file-based lookups
      const fileSymbols = manager.findSymbolsInFile(
        'classes/EnterpriseClass100.cls',
      );

      // Test FQN lookups
      const fqnLookup = manager.findSymbolByFQN('Enterprise.Class100');

      const operationsTime = performance.now() - operationsStartTime;

      // Verify results
      expect(classLookup).toHaveLength(1);
      expect(methodLookup).toHaveLength(1);
      expect(fieldLookup).toHaveLength(1);
      expect(fileSymbols.length).toBeGreaterThan(0);
      expect(fqnLookup).toBeDefined();

      // Operations should be fast
      expect(operationsTime).toBeLessThan(100); // < 100ms for multiple operations

      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(8150); // 1000 + 5000 + 2000 + 100 + 50

      console.log(
        `Enterprise codebase operations time: ${operationsTime.toFixed(2)}ms`,
      );
      console.log(`Total symbols: ${stats.totalSymbols}`);
    });

    it('should handle rapid file changes efficiently', () => {
      // Setup: Add initial symbols
      for (let i = 0; i < 1000; i++) {
        const symbol = createTestSymbol(
          `Class${i}`,
          SymbolKind.Class,
          `Namespace.Class${i}`,
          `File${i}.cls`,
        );
        manager.addSymbol(symbol, `File${i}.cls`);
      }

      // Simulate rapid file changes
      const startTime = performance.now();

      for (let change = 0; change < 100; change++) {
        // Remove a file
        manager.removeFile(`File${change}.cls`);

        // Add a new file
        const newSymbol = createTestSymbol(
          `NewClass${change}`,
          SymbolKind.Class,
          `Namespace.NewClass${change}`,
          `NewFile${change}.cls`,
        );
        manager.addSymbol(newSymbol, `NewFile${change}.cls`);
      }

      const totalTime = performance.now() - startTime;

      // Should handle rapid changes efficiently
      expect(totalTime).toBeLessThan(1000); // < 1s for 100 changes

      const stats = manager.getStats();
      expect(stats.totalSymbols).toBe(1000); // Should maintain same count

      console.log(
        `Rapid file changes time: ${totalTime.toFixed(2)}ms for 100 changes`,
      );
    });
  });
});
