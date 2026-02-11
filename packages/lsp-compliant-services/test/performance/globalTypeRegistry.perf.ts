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
 * Extracted from: SymbolGraphPrePopulation.performance.test.ts (lines 414-536)
 */

import Benchmark from 'benchmark';
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
  const benchmarkSettings = isCI
    ? { maxTime: 30, minTime: 10, minSamples: 5, initCount: 1 }
    : isQuick
      ? { maxTime: 1, minTime: 0.1, minSamples: 1, initCount: 1 }
      : { maxTime: 6, minTime: 2, minSamples: 2, initCount: 1 };

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

  it('benchmarks GlobalTypeRegistry initialization from cache', (done) => {
    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    suite
      .add('GlobalTypeRegistry initialization', {
        defer: true,
        ...benchmarkSettings,
        fn: async (deferred: any) => {
          try {
            // Reinitialize to measure cache load time
            const freshLoader = ResourceLoader.getInstance();
            await freshLoader.initialize();
            deferred.resolve();
          } catch (err) {
            console.error('Error in initialization benchmark:', err);
            deferred.resolve();
          }
        },
      })
      .on('cycle', (event: any) => {
        results[event.target.name] = event.target;
        logger.alwaysLog(String(event.target));
      })
      .on('complete', function (this: any) {
        const fs = require('fs');
        const path = require('path');
        const outputPath = path.join(
          __dirname,
          '../lsp-compliant-services-benchmark-results.json',
        );

        // Merge with existing results
        let allResults = results;
        try {
          if (fs.existsSync(outputPath)) {
            const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
            allResults = { ...existing, ...results };
          }
        } catch (error) {
          console.warn('Could not read existing results:', error);
        }

        fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
        done();
      })
      .run({ async: true });
  }, 120000);

  it('benchmarks GlobalTypeRegistry O(1) type lookups', (done) => {
    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    // Test type names
    const lookupTests = [
      'Exception',
      'String',
      'Database.QueryLocator',
      'System.Exception',
      'ApexPages.StandardController',
      'ConnectApi.FeedItem',
    ];

    suite
      .add('GlobalTypeRegistry type lookup (O(1))', {
        defer: true,
        ...benchmarkSettings,
        fn: async (deferred: any) => {
          try {
            const { Effect } = await import('effect');
            const { GlobalTypeRegistry, GlobalTypeRegistryLive } = await import(
              '@salesforce/apex-lsp-parser-ast'
            );

            // Lookup a random type from our test set
            const typeName =
              lookupTests[Math.floor(Math.random() * lookupTests.length)];

            await Effect.runPromise(
              Effect.gen(function* () {
                const registry = yield* GlobalTypeRegistry;
                return yield* registry.resolveType(typeName);
              }).pipe(Effect.provide(GlobalTypeRegistryLive)),
            );

            deferred.resolve();
          } catch (err) {
            console.error('Error in lookup benchmark:', err);
            deferred.resolve();
          }
        },
      })
      .on('cycle', (event: any) => {
        results[event.target.name] = event.target;
        logger.alwaysLog(String(event.target));
      })
      .on('complete', function (this: any) {
        const fs = require('fs');
        const path = require('path');
        const outputPath = path.join(
          __dirname,
          '../lsp-compliant-services-benchmark-results.json',
        );

        // Merge with existing results
        let allResults = results;
        try {
          if (fs.existsSync(outputPath)) {
            const existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
            allResults = { ...existing, ...results };
          }
        } catch (error) {
          console.warn('Could not read existing results:', error);
        }

        fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
        done();
      })
      .run({ async: true });
  }, 120000);

  // Informational test to show registry statistics
  it('displays GlobalTypeRegistry statistics', async () => {
    const { Effect } = await import('effect');
    const { GlobalTypeRegistry, GlobalTypeRegistryLive } = await import(
      '@salesforce/apex-lsp-parser-ast'
    );

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
