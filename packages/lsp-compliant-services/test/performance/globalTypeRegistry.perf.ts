/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * GlobalTypeRegistry Performance Benchmarks
 *
 * This benchmark suite measures the O(1) type lookup performance of the
 * GlobalTypeRegistry when loaded from pre-built protobuf cache via Effect service.
 *
 * Expected results:
 * - Registry initialization from cache: ~300ms (just deserialization)
 * - Single type lookup: Sub-millisecond (O(1))
 * - Memory overhead: ~100KB vs ~50MB for full symbol graph pre-loading
 *
 * Extracted from: symbolRefManager-prepopulation.perf.ts (lines 414-536)
 */

import {
  LoggerInterface,
  getLogger,
  enableConsoleLogging,
  setLogLevel,
} from '@salesforce/apex-lsp-shared';
import { ResourceLoader } from '@salesforce/apex-lsp-parser-ast';
import { cleanupTestResources } from '../helpers/test-cleanup';

describe('GlobalTypeRegistry Benchmarks', () => {
  let logger: LoggerInterface;
  let resourceLoader: ResourceLoader;

  const isCI = process.env.CI === 'true';
  const isQuick = process.env.QUICK === 'true';
  const benchmarkOptions = isCI
    ? { time: 30_000, warmupTime: 10_000, iterations: 5, warmupIterations: 1 }
    : isQuick
      ? { time: 1_000, warmupTime: 100, iterations: 1, warmupIterations: 1 }
      : { time: 6_000, warmupTime: 2_000, iterations: 2, warmupIterations: 1 };

  beforeAll(async () => {
    enableConsoleLogging();
    setLogLevel('error');
    logger = getLogger();

    resourceLoader = ResourceLoader.getInstance();
    await resourceLoader.initialize();
  });

  afterAll(async () => {
    await cleanupTestResources();
  });

  it('benchmarks GlobalTypeRegistry initialization from cache', async ({
    bench,
  }) => {
    await bench('GlobalTypeRegistry initialization', {}, async () => {
      // Reinitialize the same singleton to avoid per-iteration state growth.
      await resourceLoader.initialize();
    }).run(benchmarkOptions);
  }, 120000);

  it('benchmarks GlobalTypeRegistry O(1) type lookups', async ({ bench }) => {
    // Test type names
    const lookupTests = [
      'Exception',
      'String',
      'Database.QueryLocator',
      'System.Exception',
      'ApexPages.StandardController',
      'ConnectApi.FeedItem',
    ];
    const { Effect } = await import('effect');
    const { GlobalTypeRegistry, GlobalTypeRegistryLive } =
      await import('@salesforce/apex-lsp-parser-ast');

    await bench('GlobalTypeRegistry type lookup (O(1))', {}, async () => {
      const typeName =
        lookupTests[Math.floor(Math.random() * lookupTests.length)];

      await Effect.runPromise(
        Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          return yield* registry.resolveType(typeName);
        }).pipe(Effect.provide(GlobalTypeRegistryLive)),
      );
    }).run(benchmarkOptions);
  }, 120000);

  // Informational test to show registry statistics
  it('displays GlobalTypeRegistry statistics', async () => {
    const { Effect } = await import('effect');
    const { GlobalTypeRegistry, GlobalTypeRegistryLive } =
      await import('@salesforce/apex-lsp-parser-ast');

    logger.info('\n========================================');
    logger.info('GlobalTypeRegistry Statistics');
    logger.info('========================================');

    // Get registry statistics
    const stats = await Effect.runPromise(
      Effect.gen(function* () {
        const registry = yield* GlobalTypeRegistry;
        return yield* registry.getStats();
      }).pipe(Effect.provide(GlobalTypeRegistryLive)),
    );

    logger.info(`Total types: ${stats.totalTypes}`);
    logger.info(`Stdlib types: ${stats.stdlibTypes}`);
    logger.info(`User types: ${stats.userTypes}`);
    logger.info(`Total lookups: ${stats.lookupCount}`);
    logger.info(`Cache hits: ${stats.hitCount}`);
    logger.info(`Hit rate: ${(stats.hitRate * 100).toFixed(1)}%`);
    logger.info('========================================\n');

    // Informational only
    expect(stats.totalTypes).toBeGreaterThan(0);
  }, 30000);
});
