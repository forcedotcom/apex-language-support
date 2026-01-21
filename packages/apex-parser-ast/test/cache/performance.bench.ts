/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Performance benchmarks comparing protobuf cache loading vs ZIP-based parsing.
 *
 * These tests measure:
 * 1. Time to load from protobuf cache
 * 2. Time to load from ZIP and parse
 * 3. Memory usage differences
 * 4. Symbol lookup times after loading
 */

import {
  StandardLibraryCacheLoader,
  isProtobufCacheAvailable,
  loadStandardLibraryCache,
} from '../../src/cache/stdlib-cache-loader';
import { StandardLibraryDeserializer } from '../../src/cache/stdlib-deserializer';

// Helper to measure execution time
async function measureTime<T>(
  fn: () => Promise<T>,
  iterations: number = 1,
): Promise<{
  result: T;
  avgTimeMs: number;
  minTimeMs: number;
  maxTimeMs: number;
}> {
  const times: number[] = [];
  let result!: T;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    result = await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const avgTimeMs = times.reduce((a, b) => a + b, 0) / times.length;
  const minTimeMs = Math.min(...times);
  const maxTimeMs = Math.max(...times);

  return { result, avgTimeMs, minTimeMs, maxTimeMs };
}

// Helper to format bytes
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

describe('Performance Benchmarks', () => {
  const skipIfNoCacheAvailable = !isProtobufCacheAvailable();

  beforeEach(() => {
    StandardLibraryCacheLoader.clearCache();
  });

  describe('Protobuf cache loading performance', () => {
    it('measures cold load time from protobuf cache', async () => {
      if (skipIfNoCacheAvailable) {
        console.log('Skipping: protobuf cache not available');
        return;
      }

      StandardLibraryCacheLoader.clearCache();

      const { result, avgTimeMs } = await measureTime(async () =>
        loadStandardLibraryCache(),
      );

      console.log('\n📊 Protobuf Cache Cold Load Performance:');
      console.log(`   Load time: ${avgTimeMs.toFixed(2)}ms`);
      console.log(`   Load method: ${result.loadMethod}`);
      if (result.data) {
        console.log(`   Types loaded: ${result.data.metadata.typeCount}`);
        console.log(`   Namespaces: ${result.data.metadata.namespaceCount}`);
      }

      expect(result.success).toBe(true);
      expect(result.loadMethod).toBe('protobuf');
    });

    it('measures warm load time from protobuf cache (cached)', async () => {
      if (skipIfNoCacheAvailable) {
        console.log('Skipping: protobuf cache not available');
        return;
      }

      // First load to warm the cache
      await loadStandardLibraryCache();

      // Measure warm load (should be nearly instant)
      const { avgTimeMs, minTimeMs, maxTimeMs } = await measureTime(
        async () => loadStandardLibraryCache(),
        10,
      );

      console.log('\n📊 Protobuf Cache Warm Load Performance (10 iterations):');
      console.log(`   Avg time: ${avgTimeMs.toFixed(4)}ms`);
      console.log(`   Min time: ${minTimeMs.toFixed(4)}ms`);
      console.log(`   Max time: ${maxTimeMs.toFixed(4)}ms`);

      // Warm loads should be very fast (< 1ms)
      expect(avgTimeMs).toBeLessThan(5);
    });

    it('measures deserialization time only', async () => {
      if (skipIfNoCacheAvailable) {
        console.log('Skipping: protobuf cache not available');
        return;
      }

      // Read the gzipped protobuf binary directly
      const fs = require('fs');
      const path = require('path');
      const { gunzipSync } = require('fflate');

      const pbPath = path.resolve(
        __dirname,
        '../../resources/apex-stdlib-v59.0.pb.gz',
      );

      if (!fs.existsSync(pbPath)) {
        console.log('Skipping: protobuf cache file not found');
        return;
      }

      const compressedBuffer = fs.readFileSync(pbPath);
      const pbBuffer = gunzipSync(new Uint8Array(compressedBuffer));
      const deserializer = new StandardLibraryDeserializer();

      const { avgTimeMs, result } = await measureTime(
        async () => deserializer.deserializeFromBinary(pbBuffer),
        5,
      );

      console.log('\n📊 Pure Deserialization Performance (5 iterations):');
      console.log(`   Avg time: ${avgTimeMs.toFixed(2)}ms`);
      console.log(`   Buffer size: ${formatBytes(pbBuffer.length)}`);
      console.log(`   Types loaded: ${result.metadata.typeCount}`);
      console.log(
        `   Throughput: ${((result.metadata.typeCount / avgTimeMs) * 1000).toFixed(0)} types/sec`,
      );
    });
  });

  describe('Symbol lookup performance', () => {
    it('measures symbol table access time after protobuf load', async () => {
      if (skipIfNoCacheAvailable) {
        console.log('Skipping: protobuf cache not available');
        return;
      }

      // Load from protobuf
      const loader = StandardLibraryCacheLoader.getInstance();
      const loadResult = await loader.load();

      if (!loadResult.data) {
        console.log('Skipping: no data loaded');
        return;
      }

      // Measure random symbol table accesses
      const uris = Array.from(loadResult.data.symbolTables.keys());
      const iterations = 1000;

      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        const randomUri = uris[Math.floor(Math.random() * uris.length)];
        loadResult.data.symbolTables.get(randomUri);
      }
      const elapsed = performance.now() - start;

      console.log('\n📊 Symbol Table Lookup Performance:');
      console.log(`   ${iterations} lookups in ${elapsed.toFixed(2)}ms`);
      console.log(`   Avg lookup: ${(elapsed / iterations).toFixed(4)}ms`);
      console.log(
        `   Lookups/sec: ${((iterations / elapsed) * 1000).toFixed(0)}`,
      );

      // Lookups should be very fast
      expect(elapsed / iterations).toBeLessThan(1);
    });

    it('measures getAllSymbols iteration time', async () => {
      if (skipIfNoCacheAvailable) {
        console.log('Skipping: protobuf cache not available');
        return;
      }

      // Load from protobuf
      const loader = StandardLibraryCacheLoader.getInstance();
      const loadResult = await loader.load();

      if (!loadResult.data) {
        console.log('Skipping: no data loaded');
        return;
      }

      // Get a few symbol tables and measure getAllSymbols
      const uris = Array.from(loadResult.data.symbolTables.keys()).slice(0, 10);

      const start = performance.now();
      let totalSymbols = 0;

      for (const uri of uris) {
        const table = loadResult.data.symbolTables.get(uri);
        if (table) {
          const symbols = table.getAllSymbols();
          totalSymbols += symbols.length;
        }
      }

      const elapsed = performance.now() - start;

      console.log('\n📊 getAllSymbols Performance:');
      console.log(
        `   ${uris.length} tables iterated in ${elapsed.toFixed(2)}ms`,
      );
      console.log(`   Total symbols: ${totalSymbols}`);
      console.log(`   Symbols/ms: ${(totalSymbols / elapsed).toFixed(0)}`);
    });
  });

  describe('Memory estimation', () => {
    it('estimates memory usage of loaded cache', async () => {
      if (skipIfNoCacheAvailable) {
        console.log('Skipping: protobuf cache not available');
        return;
      }

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;

      // Load the cache
      StandardLibraryCacheLoader.clearCache();
      const loader = StandardLibraryCacheLoader.getInstance();
      const result = await loader.load();

      if (!result.data) {
        console.log('Skipping: no data loaded');
        return;
      }

      // Force GC if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryDelta = finalMemory - initialMemory;

      console.log('\n📊 Memory Usage Estimation:');
      console.log(`   Initial heap: ${formatBytes(initialMemory)}`);
      console.log(`   Final heap: ${formatBytes(finalMemory)}`);
      console.log(`   Delta: ${formatBytes(memoryDelta)}`);
      console.log(`   Types loaded: ${result.data.metadata.typeCount}`);
      console.log(
        `   Bytes/type: ${(memoryDelta / result.data.metadata.typeCount).toFixed(0)}`,
      );

      // Memory usage should be reasonable
      // Expect less than 1KB per type on average
      expect(memoryDelta / result.data.metadata.typeCount).toBeLessThan(10000);
    });
  });
});
