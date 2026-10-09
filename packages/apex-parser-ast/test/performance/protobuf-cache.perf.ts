/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';
import { gunzipSync } from 'fflate';
import {
  StandardLibraryCacheLoader,
  isProtobufCacheAvailable,
  loadStandardLibraryCache,
} from '../../src/cache/stdlib-cache-loader';
import { StandardLibraryDeserializer } from '../../src/cache/stdlib-deserializer';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

describe('Protobuf Cache Benchmarks', () => {
  const skipIfNoCacheAvailable = !isProtobufCacheAvailable();
  const pbPath = resolve(__dirname, '../../resources/apex-stdlib.pb.gz');

  afterEach(() => {
    StandardLibraryCacheLoader.clearCache();
  });

  it('benchmarks cold load from protobuf cache', async ({ bench }) => {
    if (skipIfNoCacheAvailable) return;

    await bench('Protobuf cache cold load', {}, async () => {
      StandardLibraryCacheLoader.clearCache();
      await loadStandardLibraryCache();
    }).run();
  });

  it('benchmarks warm load from protobuf cache', async ({ bench }) => {
    if (skipIfNoCacheAvailable) return;

    await loadStandardLibraryCache();
    await bench('Protobuf cache warm load', {}, loadStandardLibraryCache).run();
  });

  it('benchmarks pure protobuf deserialization', async ({ bench }) => {
    if (skipIfNoCacheAvailable || !existsSync(pbPath)) return;

    const compressedBuffer = readFileSync(pbPath);
    const pbBuffer = gunzipSync(new Uint8Array(compressedBuffer));
    const deserializer = new StandardLibraryDeserializer();

    await bench('Protobuf deserialization', {}, () => {
      deserializer.deserializeFromBinary(pbBuffer);
    }).run();
  });

  it('measures cache memory usage', async () => {
    if (skipIfNoCacheAvailable) return;

    global.gc?.();
    const initialMemory = process.memoryUsage().heapUsed;
    const loader = StandardLibraryCacheLoader.getInstance();
    const result = await loader.load();

    if (!result.data) return;

    global.gc?.();
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryDelta = finalMemory - initialMemory;

    console.log('\nMemory Usage:');
    console.log(`   Initial heap: ${formatBytes(initialMemory)}`);
    console.log(`   Final heap: ${formatBytes(finalMemory)}`);
    console.log(`   Delta: ${formatBytes(memoryDelta)}`);
    console.log(`   Types loaded: ${result.data.metadata.typeCount}`);
    console.log(
      `   Bytes/type: ${(memoryDelta / result.data.metadata.typeCount).toFixed(0)}`,
    );

    expect(result.success).toBe(true);
  });
});
