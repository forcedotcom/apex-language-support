/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Symbol Graph Pre-population Performance Tests
 *
 * These tests measure the startup cost of pre-populating the symbol graph
 * with different namespace combinations. Results inform the decision to
 * implement/skip this optional feature.
 *
 * Decision Criteria (from roadmap):
 * - Strong YES: If Database + System < 500ms
 * - Conditional: If 500-1000ms (reasonable trade-off)
 * - Reconsider: If > 1500ms (too expensive)
 */

import {
  LoggerInterface,
  getLogger,
  enableConsoleLogging,
  setLogLevel,
  ApexSettingsManager,
  LSPConfigurationManager,
} from '@salesforce/apex-lsp-shared';

import {
  ApexSymbolManager,
  ApexSymbolProcessingManager,
  SchedulerInitializationService,
  ResourceLoader,
} from '@salesforce/apex-lsp-parser-ast';
import { cleanupTestResources } from '../helpers/test-cleanup';

// Minimal mocks - only mock external dependencies
jest.mock('@salesforce/apex-lsp-shared', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    LSPConfigurationManager: {
      getInstance: jest.fn(),
    },
    ApexSettingsManager: {
      getInstance: jest.fn(),
    },
  };
});

interface PrePopulationResult {
  namespace: string;
  classCount: number;
  duration: number;
  avgPerClass: number;
}

describe('Symbol Graph Pre-population Performance', () => {
  let logger: LoggerInterface;
  let symbolManager: ApexSymbolManager;
  let resourceLoader: ResourceLoader;

  beforeAll(async () => {
    // Enable logging to see results
    enableConsoleLogging();
    setLogLevel('debug');
    logger = getLogger();

    // Mock settings manager
    const mockSettingsManager = {
      getSettings: jest.fn().mockReturnValue({
        apex: {
          scheduler: {
            queueCapacity: 200,
            maxHighPriorityStreak: 50,
            idleSleepMs: 1,
            queueStateNotificationIntervalMs: 200,
          },
          queueProcessing: {
            maxConcurrency: {
              CRITICAL: 4,
              IMMEDIATE: 4,
              HIGH: 2,
              NORMAL: 2,
              LOW: 2,
              BACKGROUND: 1,
            },
            maxTotalConcurrency: 9,
            yieldInterval: 10,
            yieldDelayMs: 25,
          },
          findMissingArtifact: {
            enabled: false, // Disable to avoid cascading dependency searches
            blockingWaitTimeoutMs: 0,
            indexingBarrierPollMs: 100,
            maxCandidatesToOpen: 0,
            timeoutMsHint: 0,
            enablePerfMarks: false,
          },
        },
      }),
    };

    (ApexSettingsManager.getInstance as jest.Mock).mockReturnValue(
      mockSettingsManager,
    );
    (LSPConfigurationManager.getInstance as jest.Mock).mockReturnValue({});

    // Initialize scheduler
    await SchedulerInitializationService.getInstance().ensureInitialized();

    // Initialize ResourceLoader with protobuf cache
    resourceLoader = ResourceLoader.getInstance();
    await resourceLoader.initialize();

    // Get symbol manager
    symbolManager =
      ApexSymbolProcessingManager.getInstance().getSymbolManager();

    logger.info(
      '✅ Test setup complete - ResourceLoader and SymbolManager initialized',
    );
  });

  afterAll(async () => {
    await cleanupTestResources();
  });

  /**
   * Helper function to pre-populate a namespace and measure time
   */
  async function prePopulateNamespace(
    namespace: string,
  ): Promise<PrePopulationResult> {
    const availableNamespaces = resourceLoader.getStandardNamespaces();
    const classFiles = availableNamespaces.get(namespace);

    if (!classFiles) {
      throw new Error(`Namespace '${namespace}' not found in stdlib`);
    }

    const startTime = performance.now();
    let loadedClasses = 0;

    for (const classFile of classFiles) {
      try {
        const className = classFile.value.replace(/\.cls$/i, '');
        const fqn = `${namespace}.${className}`;
        await symbolManager.resolveStandardApexClass(fqn);
        loadedClasses++;
      } catch (_error) {
        // Some classes may fail to load - that's okay for this test
        logger.debug(`Failed to load ${namespace}.${classFile.value}`);
      }
    }

    const duration = performance.now() - startTime;

    return {
      namespace,
      classCount: loadedClasses,
      duration,
      avgPerClass: duration / loadedClasses,
    };
  }

  test('Measure startup cost - Database namespace only', async () => {
    logger.info('');
    logger.info('='.repeat(80));
    logger.info('TEST: Database namespace pre-population');
    logger.info('='.repeat(80));

    const result = await prePopulateNamespace('Database');

    logger.info('');
    logger.info('📊 Results - Database namespace:');
    logger.info(`   Classes loaded: ${result.classCount}`);
    logger.info(`   Total time: ${result.duration.toFixed(2)}ms`);
    logger.info(`   Avg per class: ${result.avgPerClass.toFixed(2)}ms`);
    logger.info('');

    // Log decision guidance
    if (result.duration < 300) {
      logger.info('✅ FAST: < 300ms - Very acceptable for startup cost');
    } else if (result.duration < 500) {
      logger.info('✅ GOOD: 300-500ms - Acceptable startup cost');
    } else {
      logger.info('⚠️  SLOW: > 500ms - Significant startup cost');
    }

    expect(result.classCount).toBeGreaterThan(0);
    expect(result.duration).toBeGreaterThan(0);
  }, 30000);

  test('Measure startup cost - System namespace only', async () => {
    // Reset symbol manager for clean test
    await cleanupTestResources();
    await SchedulerInitializationService.getInstance().ensureInitialized();

    logger.info('');
    logger.info('='.repeat(80));
    logger.info('TEST: System namespace pre-population');
    logger.info('='.repeat(80));

    const result = await prePopulateNamespace('System');

    logger.info('');
    logger.info('📊 Results - System namespace:');
    logger.info(`   Classes loaded: ${result.classCount}`);
    logger.info(`   Total time: ${result.duration.toFixed(2)}ms`);
    logger.info(`   Avg per class: ${result.avgPerClass.toFixed(2)}ms`);
    logger.info('');

    // Log decision guidance
    if (result.duration < 700) {
      logger.info('✅ FAST: < 700ms - Acceptable for startup cost');
    } else if (result.duration < 1000) {
      logger.info('✅ GOOD: 700-1000ms - Reasonable startup cost');
    } else {
      logger.info('⚠️  SLOW: > 1000ms - High startup cost');
    }

    expect(result.classCount).toBeGreaterThan(0);
    expect(result.duration).toBeGreaterThan(0);
  }, 60000);

  test('Measure startup cost - Database + System combined', async () => {
    // Reset symbol manager for clean test
    await cleanupTestResources();
    await SchedulerInitializationService.getInstance().ensureInitialized();

    logger.info('');
    logger.info('='.repeat(80));
    logger.info('TEST: Database + System namespace pre-population');
    logger.info('='.repeat(80));

    const startTime = performance.now();

    const databaseResult = await prePopulateNamespace('Database');
    const systemResult = await prePopulateNamespace('System');

    const totalDuration = performance.now() - startTime;
    const totalClasses = databaseResult.classCount + systemResult.classCount;

    logger.info('');
    logger.info('📊 Results - Database + System combined:');
    logger.info(`   Total classes: ${totalClasses}`);
    logger.info(
      `   Database: ${databaseResult.classCount} classes in ${databaseResult.duration.toFixed(2)}ms`,
    );
    logger.info(
      `   System: ${systemResult.classCount} classes in ${systemResult.duration.toFixed(2)}ms`,
    );
    logger.info(`   Total time: ${totalDuration.toFixed(2)}ms`);
    logger.info(
      `   Avg per class: ${(totalDuration / totalClasses).toFixed(2)}ms`,
    );
    logger.info('');

    // Log decision guidance based on roadmap criteria
    if (totalDuration < 500) {
      logger.info('✅ STRONG YES: < 500ms - Low cost, high benefit!');
      logger.info('   Recommendation: Implement feature');
    } else if (totalDuration < 1000) {
      logger.info('✅ CONDITIONAL: 500-1000ms - Reasonable trade-off');
      logger.info('   Recommendation: Implement if first-file UX is important');
    } else if (totalDuration < 1500) {
      logger.info('⚠️  CONDITIONAL: 1000-1500ms - Noticeable startup cost');
      logger.info('   Recommendation: User opt-in only');
    } else {
      logger.info(
        '❌ RECONSIDER: > 1500ms - Too expensive for optional feature',
      );
      logger.info('   Recommendation: Skip or investigate optimization');
    }

    expect(totalClasses).toBeGreaterThan(0);
    expect(totalDuration).toBeGreaterThan(0);
  }, 90000);

  test('Measure startup cost - ALL namespaces ("*")', async () => {
    // Reset symbol manager for clean test
    await cleanupTestResources();
    await SchedulerInitializationService.getInstance().ensureInitialized();

    logger.info('');
    logger.info('='.repeat(80));
    logger.info('TEST: ALL namespaces pre-population');
    logger.info('='.repeat(80));

    const availableNamespaces = resourceLoader.getStandardNamespaces();
    const allNamespacesRaw = [...availableNamespaces.keys()];

    // Use dependency-ordered loading from ResourceLoader
    const allNamespaces = resourceLoader.getNamespaceDependencyOrder();

    logger.info('');
    logger.info(`Available namespaces: ${allNamespacesRaw.length} total`);
    logger.info('');
    const first10 = allNamespaces.slice(0, 10).join(', ');
    logger.info(
      `Processing order (dependency-ordered): ${first10}... (${allNamespaces.length} total)`,
    );
    logger.info('');

    const startTime = performance.now();
    const results: PrePopulationResult[] = [];
    let totalLoaded = 0;
    let namespaceCount = 0;

    for (const namespace of allNamespaces) {
      namespaceCount++;
      try {
        logger.info(
          `Loading namespace ${namespaceCount}/${allNamespaces.length}: ${namespace}...`,
        );
        const result = await prePopulateNamespace(namespace);
        results.push(result);
        totalLoaded += result.classCount;
        logger.info(
          `  ✓ ${namespace}: ${result.classCount} classes in ${result.duration.toFixed(2)}ms`,
        );
      } catch (error) {
        logger.warn(`Failed to load namespace ${namespace}: ${error}`);
      }
    }

    const totalDuration = performance.now() - startTime;

    logger.info('');
    logger.info('📊 Results - ALL namespaces:');
    logger.info(`   Total namespaces: ${allNamespaces.length}`);
    logger.info(`   Total classes: ${totalLoaded}`);
    logger.info(`   Total time: ${totalDuration.toFixed(2)}ms`);
    logger.info(
      `   Avg per class: ${(totalDuration / totalLoaded).toFixed(2)}ms`,
    );
    logger.info('');
    logger.info('Breakdown by namespace:');

    // Sort by duration descending
    results.sort((a, b) => b.duration - a.duration);
    for (const result of results) {
      const nameCol = result.namespace.padEnd(20);
      const countCol = result.classCount.toString().padStart(4);
      const durationCol = result.duration.toFixed(2).padStart(8);
      logger.info(`   ${nameCol} ${countCol} classes in ${durationCol}ms`);
    }
    logger.info('');

    // Log decision guidance
    if (totalDuration < 1000) {
      logger.info('✅ EXCELLENT: < 1000ms - All namespaces is feasible!');
    } else if (totalDuration < 2000) {
      logger.info(
        '✅ GOOD: 1-2s - All namespaces is reasonable for power users',
      );
    } else if (totalDuration < 5000) {
      logger.info(
        '⚠️  MODERATE: 2-5s - Noticeable but acceptable for some users',
      );
    } else {
      logger.info('❌ SLOW: > 5s - Too expensive for general use');
    }

    expect(totalLoaded).toBeGreaterThan(0);
    expect(totalDuration).toBeGreaterThan(0);
  }, 120000);

  test('Measure per-class cost breakdown (sample)', async () => {
    // Reset for clean test
    await cleanupTestResources();
    await SchedulerInitializationService.getInstance().ensureInitialized();

    logger.info('');
    logger.info('='.repeat(80));
    logger.info('TEST: Per-class cost breakdown');
    logger.info('='.repeat(80));

    const sampleClasses = [
      'Database.SaveResult',
      'System.Assert',
      'System.JSON',
      'Schema.DescribeSObjectResult',
    ];

    logger.info('');
    for (const fqn of sampleClasses) {
      const start = performance.now();
      try {
        await symbolManager.resolveStandardApexClass(fqn);
        const duration = performance.now() - start;
        logger.info(`   ${fqn}: ${duration.toFixed(2)}ms`);
      } catch (error) {
        logger.info(`   ${fqn}: FAILED - ${error}`);
      }
    }
    logger.info('');
  }, 30000);

  /**
   * NEW: GlobalTypeRegistry Performance Test
   *
   * This test measures the O(1) type lookup performance of the GlobalTypeRegistry.
   * Unlike pre-population tests above (which load full symbols), this tests the
   * registry initialization cost (metadata only) and lookup speed.
   *
   * Expected results:
   * - Registry initialization: ~10-20ms (1,000 types)
   * - Single type lookup: < 1ms (O(1))
   * - Memory overhead: ~100KB vs ~50MB for full pre-loading
   */
  it('should measure GlobalTypeRegistry initialization and lookup performance', async () => {
    logger.alwaysLog(() => '\n========================================');
    logger.alwaysLog(() => 'GlobalTypeRegistry Performance Measurement');
    logger.alwaysLog(() => '========================================');

    // Initialize ResourceLoader to trigger registry population
    const initStart = performance.now();
    await resourceLoader.initialize();
    const initEnd = performance.now();
    const initDuration = initEnd - initStart;

    logger.alwaysLog(
      () =>
        `ResourceLoader initialization: ${initDuration.toFixed(1)}ms ` +
        '(includes registry population)',
    );

    // Get the registry and check statistics
    const registry = resourceLoader.getGlobalTypeRegistry();
    const stats = registry.getStats();

    logger.alwaysLog(
      () =>
        `Registry populated with ${stats.totalTypes} types ` +
        `(stdlib: ${stats.stdlibTypes}, user: ${stats.userTypes})`,
    );

    // Measure lookup performance for common types
    const lookupTests = [
      'Exception',
      'String',
      'Database.QueryLocator',
      'System.Exception',
      'ApexPages.StandardController',
      'ConnectApi.FeedItem',
    ];

    logger.alwaysLog(() => '\nType Resolution Performance (O(1) lookups):');

    const lookupResults: Array<{
      type: string;
      duration: number;
      found: boolean;
    }> = [];

    for (const typeName of lookupTests) {
      const lookupStart = performance.now();
      const result = registry.resolveType(typeName);
      const lookupEnd = performance.now();
      const lookupDuration = lookupEnd - lookupStart;

      lookupResults.push({
        type: typeName,
        duration: lookupDuration,
        found: result !== undefined,
      });

      logger.alwaysLog(
        () =>
          `  ${typeName}: ${lookupDuration.toFixed(3)}ms ` +
          `(${result ? `found: ${result.fqn}` : 'not found'})`,
      );
    }

    // Calculate average lookup time
    const avgLookup =
      lookupResults.reduce((sum, r) => sum + r.duration, 0) /
      lookupResults.length;

    logger.alwaysLog(() => `\nAverage lookup time: ${avgLookup.toFixed(3)}ms`);

    // Final statistics
    const finalStats = registry.getStats();
    logger.alwaysLog(() => '\nRegistry Statistics:');
    logger.alwaysLog(() => `  Total types: ${finalStats.totalTypes}`);
    logger.alwaysLog(() => `  Total lookups: ${finalStats.lookupCount}`);
    logger.alwaysLog(() => `  Cache hits: ${finalStats.hitCount}`);
    logger.alwaysLog(
      () => `  Hit rate: ${(finalStats.hitRate * 100).toFixed(1)}%`,
    );

    logger.alwaysLog(() => '\n========================================');
    logger.alwaysLog(() => 'Registry Performance Summary:');
    logger.alwaysLog(
      () =>
        `  Initialization: ${initDuration.toFixed(1)}ms for ${stats.totalTypes} types`,
    );
    logger.alwaysLog(
      () =>
        `  Per-type cost: ${(initDuration / stats.totalTypes).toFixed(3)}ms`,
    );
    logger.alwaysLog(() => `  Lookup speed: ${avgLookup.toFixed(3)}ms (O(1))`);
    logger.alwaysLog(
      () =>
        `  Memory estimate: ~${Math.ceil((stats.totalTypes * 100) / 1024)}KB`,
    );
    logger.alwaysLog(() => '========================================\n');

    // Assertions
    expect(stats.totalTypes).toBeGreaterThan(900); // Should have ~1,000 stdlib types
    expect(avgLookup).toBeLessThan(1); // O(1) lookups should be sub-millisecond
    expect(initDuration).toBeLessThan(300); // Registry init should be fast
  }, 60000);
});
