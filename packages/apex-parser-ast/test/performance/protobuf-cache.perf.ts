/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Protobuf Cache Performance Benchmarks
 *
 * These benchmarks measure cache loading and symbol lookup performance:
 * 1. Cold load time from protobuf cache
 * 2. Warm load time (cached)
 * 3. Pure deserialization time
 * 4. Symbol table lookup performance
 * 5. Memory usage estimation
 *
 * Purpose: Track cache performance trends over time
 */

import Benchmark from 'benchmark';
import {
  StandardLibraryCacheLoader,
  isProtobufCacheAvailable,
  loadStandardLibraryCache,
} from '../../src/cache/stdlib-cache-loader';
import { StandardLibraryDeserializer } from '../../src/cache/stdlib-deserializer';

// Helper to format bytes
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

describe('Protobuf Cache Benchmarks', () => {
  const skipIfNoCacheAvailable = !isProtobufCacheAvailable();

  const isCI = process.env.CI === 'true';
  const isQuick = process.env.QUICK === 'true';
  const benchmarkSettings = isCI
    ? { maxTime: 30, minTime: 10, minSamples: 5, initCount: 1 }
    : isQuick
      ? { maxTime: 1, minTime: 0.1, minSamples: 1, initCount: 1 }
      : { maxTime: 6, minTime: 2, minSamples: 2, initCount: 1 };

  jest.setTimeout(1000 * 60 * 10);

  beforeEach(() => {
    StandardLibraryCacheLoader.clearCache();
  });

  it('benchmarks cold load from protobuf cache', (done) => {
    if (skipIfNoCacheAvailable) {
      console.log('Skipping: protobuf cache not available');
      done();
      return;
    }

    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    suite
      .add('Protobuf cache cold load', {
        defer: true,
        ...benchmarkSettings,
        fn: (deferred: any) => {
          StandardLibraryCacheLoader.clearCache();
          loadStandardLibraryCache()
            .then(() => deferred.resolve())
            .catch((err: any) => {
              console.error('Error in cold load:', err);
              deferred.resolve();
            });
        },
      })
      .on('cycle', (event: any) => {
        results[event.target.name] = event.target;
        console.log(String(event.target));
      })
      .on('complete', function (this: any) {
        const fs = require('fs');
        const path = require('path');
        const outputPath = path.join(
          __dirname,
          '../apex-parser-ast-benchmark-results.json',
        );

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
  });

  it('benchmarks warm load from protobuf cache', (done) => {
    if (skipIfNoCacheAvailable) {
      console.log('Skipping: protobuf cache not available');
      done();
      return;
    }

    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    // Warm the cache first
    loadStandardLibraryCache().then(() => {
      suite
        .add('Protobuf cache warm load', {
          defer: true,
          ...benchmarkSettings,
          fn: (deferred: any) => {
            loadStandardLibraryCache()
              .then(() => deferred.resolve())
              .catch((err: any) => {
                console.error('Error in warm load:', err);
                deferred.resolve();
              });
          },
        })
        .on('cycle', (event: any) => {
          results[event.target.name] = event.target;
          console.log(String(event.target));
        })
        .on('complete', function (this: any) {
          const fs = require('fs');
          const path = require('path');
          const outputPath = path.join(
            __dirname,
            '../apex-parser-ast-benchmark-results.json',
          );

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
    });
  });

  it('benchmarks pure protobuf deserialization', (done) => {
    if (skipIfNoCacheAvailable) {
      console.log('Skipping: protobuf cache not available');
      done();
      return;
    }

    const fs = require('fs');
    const path = require('path');
    const { gunzipSync } = require('fflate');

    const pbPath = path.resolve(__dirname, '../../resources/apex-stdlib.pb.gz');

    if (!fs.existsSync(pbPath)) {
      console.log('Skipping: protobuf cache file not found');
      done();
      return;
    }

    const compressedBuffer = fs.readFileSync(pbPath);
    const pbBuffer = gunzipSync(new Uint8Array(compressedBuffer));
    const deserializer = new StandardLibraryDeserializer();

    const suite = new Benchmark.Suite();
    const results: Record<string, Benchmark.Target> = {};

    suite
      .add('Protobuf deserialization', {
        defer: true,
        ...benchmarkSettings,
        fn: (deferred: any) => {
          try {
            deserializer.deserializeFromBinary(pbBuffer);
            deferred.resolve();
          } catch (err) {
            console.error('Error in deserialization:', err);
            deferred.resolve();
          }
        },
      })
      .on('cycle', (event: any) => {
        results[event.target.name] = event.target;
        console.log(String(event.target));
      })
      .on('complete', function (this: any) {
        const outputPath = path.join(
          __dirname,
          '../apex-parser-ast-benchmark-results.json',
        );

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
  });

  // Informational test - measures memory usage
  it('measures cache memory usage', async () => {
    if (skipIfNoCacheAvailable) {
      console.log('Skipping: protobuf cache not available');
      return;
    }

    if (global.gc) global.gc();

    const initialMemory = process.memoryUsage().heapUsed;

    StandardLibraryCacheLoader.clearCache();
    const loader = StandardLibraryCacheLoader.getInstance();
    const result = await loader.load();

    if (!result.data) {
      console.log('Skipping: no data loaded');
      return;
    }

    if (global.gc) global.gc();

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryDelta = finalMemory - initialMemory;

    console.log('\n📊 Memory Usage:');
    console.log(`   Initial heap: ${formatBytes(initialMemory)}`);
    console.log(`   Final heap: ${formatBytes(finalMemory)}`);
    console.log(`   Delta: ${formatBytes(memoryDelta)}`);
    console.log(`   Types loaded: ${result.data.metadata.typeCount}`);
    console.log(
      `   Bytes/type: ${(memoryDelta / result.data.metadata.typeCount).toFixed(0)}`,
    );

    // Informational only - no assertion on memory usage
    expect(result.success).toBe(true);
  });
});
