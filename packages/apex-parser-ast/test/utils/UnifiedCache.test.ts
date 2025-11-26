/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { UnifiedCache } from '../../src/symbols/ApexSymbolManager';

// Mock the logger to avoid console output during tests
jest.mock('@salesforce/apex-lsp-shared', () => {
  const actual = jest.requireActual('@salesforce/apex-lsp-shared');
  return {
    ...actual,
    getLogger: () => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    }),
  };
});

describe.skip('UnifiedCache - Phase 3 Cache Consolidation', () => {
  let cache: UnifiedCache;

  beforeEach(() => {
    cache = new UnifiedCache(100, 1024 * 1024, 60000, false); // 100 entries, 1MB, 1 minute TTL, no WeakRef
  });

  afterEach(() => {
    cache.clear();
  });

  describe('Basic Operations', () => {
    it('should store and retrieve values', () => {
      const testData = { name: 'test', value: 123 };
      cache.set('test-key', testData, 'symbol_lookup');

      const retrieved = cache.get('test-key');
      expect(retrieved).toEqual(testData);
    });

    it('should return undefined for non-existent keys', () => {
      const retrieved = cache.get('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('test-key', 'value', 'symbol_lookup');

      expect(cache.has('test-key')).toBe(true);
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should delete entries', () => {
      cache.set('test-key', 'value', 'symbol_lookup');
      expect(cache.has('test-key')).toBe(true);

      cache.delete('test-key');
      expect(cache.has('test-key')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1', 'symbol_lookup');
      cache.set('key2', 'value2', 'fqn_lookup');

      expect(cache.getStats().totalEntries).toBe(2);

      cache.clear();
      expect(cache.getStats().totalEntries).toBe(0);
    });
  });

  describe('Cache Statistics', () => {
    it('should track hit and miss counts', () => {
      cache.set('test-key', 'value', 'symbol_lookup');

      // Hit
      cache.get('test-key');
      // Miss
      cache.get('non-existent');

      const stats = cache.getStats();
      expect(stats.hitCount).toBe(1);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should track entry types', () => {
      cache.set('key1', 'value1', 'symbol_lookup');
      cache.set('key2', 'value2', 'fqn_lookup');
      cache.set('key3', 'value3', 'relationship');

      const stats = cache.getStats();
      expect(stats.typeDistribution.get('symbol_lookup')).toBe(1);
      expect(stats.typeDistribution.get('fqn_lookup')).toBe(1);
      expect(stats.typeDistribution.get('relationship')).toBe(1);
    });

    it('should estimate memory size', () => {
      cache.set('string-key', 'test string', 'symbol_lookup');
      cache.set('number-key', 42, 'fqn_lookup');
      cache.set('object-key', { a: 1, b: 2 }, 'relationship');

      const stats = cache.getStats();
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.averageEntrySize).toBeGreaterThan(0);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', () => {
      const shortTTLCache = new UnifiedCache(100, 1024 * 1024, 10, false); // 10ms TTL

      shortTTLCache.set('test-key', 'value', 'symbol_lookup');
      expect(shortTTLCache.get('test-key')).toBe('value');

      // Wait for TTL to expire
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(shortTTLCache.get('test-key')).toBeUndefined();
          resolve(undefined);
        }, 20);
      });
    });

    it('should not expire entries before TTL', () => {
      const longTTLCache = new UnifiedCache(100, 1024 * 1024, 1000, false); // 1 second TTL

      longTTLCache.set('test-key', 'value', 'symbol_lookup');

      // Should still be valid after 50ms
      return new Promise((resolve) => {
        setTimeout(() => {
          expect(longTTLCache.get('test-key')).toBe('value');
          resolve(undefined);
        }, 50);
      });
    });
  });

  describe('LRU Eviction', () => {
    it('should evict least recently used entries when size limit is reached', () => {
      const smallCache = new UnifiedCache(3, 1024 * 1024, 60000, false); // 3 entries max

      // Add 4 entries
      smallCache.set('key1', 'value1', 'symbol_lookup');
      smallCache.set('key2', 'value2', 'fqn_lookup');
      smallCache.set('key3', 'value3', 'relationship');
      smallCache.set('key4', 'value4', 'metrics'); // Should evict key1

      expect(smallCache.get('key1')).toBeUndefined(); // Should be evicted
      expect(smallCache.get('key2')).toBe('value2');
      expect(smallCache.get('key3')).toBe('value3');
      expect(smallCache.get('key4')).toBe('value4');

      const stats = smallCache.getStats();
      expect(stats.evictionCount).toBeGreaterThan(0);
    });

    it('should update access order on get operations', () => {
      const smallCache = new UnifiedCache(2, 1024 * 1024, 60000, false); // 2 entries max

      smallCache.set('key1', 'value1', 'symbol_lookup');
      smallCache.set('key2', 'value2', 'fqn_lookup');

      // Access key1 to make it most recently used
      smallCache.get('key1');

      // Add new entry - should evict key2 (least recently used)
      smallCache.set('key3', 'value3', 'relationship');

      expect(smallCache.get('key1')).toBe('value1'); // Should still exist
      expect(smallCache.get('key2')).toBeUndefined(); // Should be evicted
      expect(smallCache.get('key3')).toBe('value3');
    });
  });

  describe('Memory Limit Enforcement', () => {
    it('should evict entries when memory limit is reached', () => {
      const memoryLimitedCache = new UnifiedCache(100, 100, 60000, false); // 100 bytes max

      // Add entries that exceed memory limit
      memoryLimitedCache.set(
        'key1',
        'very long string that exceeds memory limit very long string that exceeds memory limit ' +
          'very long string that exceeds memory limit',
        'symbol_lookup',
      );
      memoryLimitedCache.set(
        'key2',
        'another very long string that also exceeds the memory limit ' +
          'another very long string that also exceeds the memory limit',
        'fqn_lookup',
      );

      const stats = memoryLimitedCache.getStats();
      expect(stats.evictionCount).toBeGreaterThan(0);
    });
  });

  describe('Pattern Invalidation', () => {
    it('should invalidate entries matching pattern', () => {
      cache.set('user-profile', 'value1', 'symbol_lookup');
      cache.set('user-settings', 'value2', 'fqn_lookup');
      cache.set('system-config', 'value3', 'relationship');

      const removedCount = cache.invalidatePattern('user');
      expect(removedCount).toBe(2);

      expect(cache.get('user-profile')).toBeUndefined();
      expect(cache.get('user-settings')).toBeUndefined();
      expect(cache.get('system-config')).toBe('value3'); // Should still exist
    });

    it('should return 0 when no entries match pattern', () => {
      cache.set('key1', 'value1', 'symbol_lookup');

      const removedCount = cache.invalidatePattern('non-matching');
      expect(removedCount).toBe(0);
      expect(cache.get('key1')).toBe('value1'); // Should still exist
    });
  });

  describe('Optimization', () => {
    it('should remove expired entries during optimization', () => {
      const shortTTLCache = new UnifiedCache(100, 1024 * 1024, 10, false); // 10ms TTL

      shortTTLCache.set('test-key', 'value', 'symbol_lookup');
      expect(shortTTLCache.getStats().totalEntries).toBe(1);

      // Wait for TTL to expire
      return new Promise((resolve) => {
        setTimeout(() => {
          shortTTLCache.optimize();
          expect(shortTTLCache.getStats().totalEntries).toBe(0);
          resolve(undefined);
        }, 20);
      });
    });

    it('should enforce size limits during optimization', () => {
      const smallCache = new UnifiedCache(2, 1024 * 1024, 60000, false); // 2 entries max

      smallCache.set('key1', 'value1', 'symbol_lookup');
      smallCache.set('key2', 'value2', 'fqn_lookup');
      smallCache.set('key3', 'value3', 'relationship'); // Exceeds limit

      smallCache.optimize();

      const stats = smallCache.getStats();
      expect(stats.totalEntries).toBeLessThanOrEqual(2);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle large numbers of entries efficiently', () => {
      const largeCache = new UnifiedCache(
        10000,
        100 * 1024 * 1024,
        60000,
        false,
      );

      const startTime = Date.now();

      // Add 1000 entries
      for (let i = 0; i < 1000; i++) {
        largeCache.set(`key${i}`, `value${i}`, 'symbol_lookup');
      }

      const addTime = Date.now() - startTime;
      expect(addTime).toBeLessThan(1000); // Should complete in under 1 second

      // Retrieve 1000 entries
      const retrieveStartTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        largeCache.get(`key${i}`);
      }

      const retrieveTime = Date.now() - retrieveStartTime;
      expect(retrieveTime).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should maintain good hit rates with repeated access', () => {
      // Add entries
      for (let i = 0; i < 100; i++) {
        cache.set(`key${i}`, `value${i}`, 'symbol_lookup');
      }

      // Access same entries multiple times
      for (let round = 0; round < 5; round++) {
        for (let i = 0; i < 100; i++) {
          cache.get(`key${i}`);
        }
      }

      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0.8); // Should have >80% hit rate
    });
  });

  describe('Memory Optimization Features', () => {
    it('should track memory usage accurately', () => {
      cache.set('string-key', 'test string', 'symbol_lookup');
      cache.set('number-key', 42, 'fqn_lookup');
      cache.set('object-key', { a: 1, b: 2, c: 3 }, 'relationship');

      const stats = cache.getStats();
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.averageEntrySize).toBeGreaterThan(0);
      expect(stats.totalEntries).toBe(3);
    });

    it('should provide optimization recommendations through statistics', () => {
      const stats = cache.getStats();
      expect(stats.lastOptimization).toBeGreaterThan(0);
      expect(stats.typeDistribution).toBeInstanceOf(Object); // HashMap is an object
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Type Safety', () => {
    it('should maintain type safety with generic get method', () => {
      const stringValue = 'test string';
      const numberValue = 42;
      const objectValue = { key: 'value' };

      cache.set('string-key', stringValue, 'symbol_lookup');
      cache.set('number-key', numberValue, 'fqn_lookup');
      cache.set('object-key', objectValue, 'relationship');

      const retrievedString = cache.get<string>('string-key');
      const retrievedNumber = cache.get<number>('number-key');
      const retrievedObject = cache.get<{ key: string }>('object-key');

      expect(typeof retrievedString).toBe('string');
      expect(typeof retrievedNumber).toBe('number');
      expect(typeof retrievedObject).toBe('object');
      expect(retrievedObject?.key).toBe('value');
    });
  });
});
