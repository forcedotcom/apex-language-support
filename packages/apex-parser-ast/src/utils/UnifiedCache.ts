/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap, Deque } from 'data-structure-typed';
import { getLogger } from '@salesforce/apex-lsp-shared';

/**
 * Unified cache entry
 */
export interface UnifiedCacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  type: CacheEntryType;
  size: number;
}

/**
 * Cache entry types
 */
export type CacheEntryType =
  | 'symbol_lookup'
  | 'fqn_lookup'
  | 'file_lookup'
  | 'relationship'
  | 'metrics'
  | 'pattern_match'
  | 'stats'
  | 'analysis';

/**
 * Unified cache statistics
 */
export interface UnifiedCacheStats {
  totalEntries: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  evictionCount: number;
  hitRate: number;
  averageEntrySize: number;
  typeDistribution: HashMap<CacheEntryType, number>;
  lastOptimization: number;
}

/**
 * Unified cache implementation for memory optimization
 */
export class UnifiedCache {
  private readonly logger = getLogger();
  private cache: HashMap<string, WeakRef<UnifiedCacheEntry<any>>> =
    new HashMap();
  private readonly registry = new (globalThis as any).FinalizationRegistry(
    (key: string) => {
      this.handleGarbageCollected(key);
    },
  );
  private accessOrder: Deque<string> = new Deque();
  private stats: UnifiedCacheStats = {
    totalEntries: 0,
    totalSize: 0,
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
    hitRate: 0,
    averageEntrySize: 0,
    typeDistribution: new HashMap(),
    lastOptimization: Date.now(),
  };
  private readonly maxSize: number;
  private readonly maxMemoryBytes: number;
  private readonly ttl: number;
  private readonly enableWeakRef: boolean;

  constructor(
    maxSize: number = 5000,
    maxMemoryBytes: number = 50 * 1024 * 1024, // 50MB
    ttl: number = 3 * 60 * 1000, // 3 minutes
    enableWeakRef: boolean = true,
  ) {
    this.maxSize = maxSize;
    this.maxMemoryBytes = maxMemoryBytes;
    this.ttl = ttl;
    this.enableWeakRef = enableWeakRef;
  }

  get<T>(key: string): T | undefined {
    const entryRef = this.cache.get(key);
    if (!entryRef) {
      this.stats.missCount++;
      this.updateHitRate();
      return undefined;
    }

    const entry = entryRef.deref();
    if (!entry) {
      // Entry was garbage collected
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      this.stats.missCount++;
      this.updateHitRate();
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.delete(key);
      this.stats.missCount++;
      this.updateHitRate();
      return undefined;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.updateAccessOrder(key);
    this.stats.hitCount++;
    this.updateHitRate();

    return entry.value;
  }

  set<T>(
    key: string,
    value: T,
    type: CacheEntryType,
    estimatedSize?: number,
  ): void {
    // TEMPORARY: Never add values to cache (completely disable caching)
    return;

    // Original implementation (commented out for temporary change)
    /*
    const size = estimatedSize || this.estimateSize(value);
    const entry: UnifiedCacheEntry<T> = {
      value,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      type,
      size,
    };

    // Ensure capacity before adding
    this.ensureCapacity(size);

    // Add to cache
    if (this.enableWeakRef) {
      const entryRef = new (globalThis as any).WeakRef(entry);
      this.cache.set(key, entryRef);
      this.registry.register(entry, key);
    } else {
      this.cache.set(key, new (globalThis as any).WeakRef(entry));
    }

    this.updateAccessOrder(key);
    this.updateStats(entry, type, size);
    */
  }

  delete(key: string): boolean {
    const entryRef = this.cache.get(key);
    if (!entryRef) return false;

    const entry = entryRef.deref();
    if (entry) {
      this.stats.totalSize -= entry.size;
      this.updateTypeDistribution(entry.type, -1);
    }

    this.cache.delete(key);
    this.removeFromAccessOrder(key);
    this.stats.totalEntries--;

    return true;
  }

  has(key: string): boolean {
    const entryRef = this.cache.get(key);
    if (!entryRef) return false;

    const entry = entryRef.deref();
    if (!entry) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return false;
    }

    return Date.now() - entry.timestamp <= this.ttl;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
      hitRate: 0,
      averageEntrySize: 0,
      typeDistribution: new HashMap(),
      lastOptimization: Date.now(),
    };
  }

  getStats(): UnifiedCacheStats {
    return { ...this.stats };
  }

  optimize(): void {
    // Remove expired entries
    const now = Date.now();
    for (const [key, entryRef] of this.cache.entries()) {
      const entry = entryRef?.deref();
      if (!entry || now - entry.timestamp > this.ttl) {
        this.delete(key);
      }
    }

    // Enforce size limits
    this.enforceSizeLimits();

    this.stats.lastOptimization = now;
  }

  invalidatePattern(pattern: string): number {
    const regex = new RegExp(pattern, 'i');
    let invalidatedCount = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        if (this.delete(key)) {
          invalidatedCount++;
        }
      }
    }

    return invalidatedCount;
  }

  private ensureCapacity(newEntrySize: number): void {
    let evictionAttempts = 0;
    const maxEvictionAttempts = this.stats.totalEntries + 10; // Safety limit

    while (
      (this.stats.totalEntries >= this.maxSize ||
        this.stats.totalSize + newEntrySize > this.maxMemoryBytes) &&
      evictionAttempts < maxEvictionAttempts
    ) {
      this.evictLRU();
      evictionAttempts++;
    }

    // If we hit the safety limit, log a warning
    if (evictionAttempts >= maxEvictionAttempts) {
      this.logger.warn(
        () =>
          `Cache eviction safety limit reached: ${evictionAttempts} attempts`,
      );
    }
  }

  private evictLRU(): void {
    if (this.accessOrder.isEmpty()) return;

    const lruKey = this.accessOrder.shift();
    if (!lruKey) return;

    const wasDeleted = this.delete(lruKey);

    // Always increment eviction count and remove from access order
    // even if the entry was already garbage collected
    this.stats.evictionCount++;

    // If the entry wasn't actually deleted (e.g., already garbage collected),
    // we still need to remove it from accessOrder to prevent infinite loops
    if (!wasDeleted) {
      this.removeFromAccessOrder(lruKey);
      this.stats.totalEntries = Math.max(0, this.stats.totalEntries - 1);
    }
  }

  private enforceSizeLimits(): void {
    while (
      this.stats.totalEntries > this.maxSize ||
      this.stats.totalSize > this.maxMemoryBytes
    ) {
      this.evictLRU();
    }
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    // For Deque, we need to manually remove the key by rebuilding the deque
    // This is less efficient but maintains the order
    const tempDeque = new Deque<string>();

    while (!this.accessOrder.isEmpty()) {
      const item = this.accessOrder.shift();
      if (item && item !== key) {
        tempDeque.push(item);
      }
    }

    // Restore the deque without the removed key
    this.accessOrder = tempDeque;
  }

  private updateStats(
    entry: UnifiedCacheEntry<any>,
    type: CacheEntryType,
    size: number,
  ): void {
    this.stats.totalEntries++;
    this.stats.totalSize += size;
    this.updateTypeDistribution(type, 1);
    this.updateAverageEntrySize();
  }

  private updateTypeDistribution(type: CacheEntryType, delta: number): void {
    const current = this.stats.typeDistribution.get(type) || 0;
    this.stats.typeDistribution.set(type, current + delta);
  }

  private updateAverageEntrySize(): void {
    if (this.stats.totalEntries > 0) {
      this.stats.averageEntrySize =
        this.stats.totalSize / this.stats.totalEntries;
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hitCount + this.stats.missCount;
    this.stats.hitRate = total > 0 ? this.stats.hitCount / total : 0;
  }

  private estimateSize(value: any): number {
    // Simple size estimation with circular reference protection
    try {
      const jsonString = JSON.stringify(value);
      return new Blob([jsonString]).size;
    } catch (error) {
      // If JSON serialization fails due to circular references, estimate size differently
      if (error instanceof Error && error.message.includes('circular')) {
        // Estimate size based on object properties
        if (typeof value === 'object' && value !== null) {
          let size = 0;
          for (const key in value) {
            if (value.hasOwnProperty(key)) {
              size += key.length;
              const val = value[key];
              if (typeof val === 'string') {
                size += val.length;
              } else if (typeof val === 'number') {
                size += 8; // Assume 8 bytes for numbers
              } else if (typeof val === 'boolean') {
                size += 1; // Assume 1 byte for booleans
              }
            }
          }
          return size;
        }
      }
      // Fallback to a reasonable default size
      return 1024; // 1KB default
    }
  }

  private handleGarbageCollected(key: string): void {
    this.cache.delete(key);
    this.removeFromAccessOrder(key);
    this.stats.totalEntries--;
  }
}
