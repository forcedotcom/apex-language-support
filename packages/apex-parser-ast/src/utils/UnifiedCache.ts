/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap } from 'data-structure-typed';
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
  hitCount: number;
  missCount: number;
  evictionCount: number;
  hitRate: number;
  typeDistribution: HashMap<CacheEntryType, number>;
  lastOptimization: number;
}

/**
 * Unified cache implementation for entry-capacity optimization
 */
export class UnifiedCache {
  private readonly logger = getLogger();
  private cache: HashMap<
    string,
    UnifiedCacheEntry<any> | WeakRef<UnifiedCacheEntry<any>>
  > = new HashMap();
  private readonly registry: FinalizationRegistry<string> | null;
  // LRU ordering state:
  // - lruPrevByKey/lruNextByKey form a doubly-linked list keyed by cache key.
  // - lruHeadKey is least-recently-used, lruTailKey is most-recently-used.
  // This keeps key removal/move-to-tail operations O(1).
  private lruPrevByKey: Map<string, string | undefined> = new Map();
  private lruNextByKey: Map<string, string | undefined> = new Map();
  private lruHeadKey: string | undefined;
  private lruTailKey: string | undefined;
  private stats: UnifiedCacheStats = {
    totalEntries: 0,
    hitCount: 0,
    missCount: 0,
    evictionCount: 0,
    hitRate: 0,
    typeDistribution: new HashMap(),
    lastOptimization: Date.now(),
  };
  private readonly maxSize: number;
  private readonly ttl: number;
  private readonly enableWeakRef: boolean;
  private readonly useWeakRef: boolean;

  constructor(
    maxSize: number = 5000,
    ttl: number = 3 * 60 * 1000, // 3 minutes
    enableWeakRef: boolean = true,
  ) {
    this.maxSize = maxSize;
    this.ttl = ttl;
    this.enableWeakRef = enableWeakRef;
    this.useWeakRef =
      enableWeakRef &&
      typeof (globalThis as any).WeakRef !== 'undefined' &&
      typeof (globalThis as any).FinalizationRegistry !== 'undefined';
    this.registry = this.useWeakRef
      ? new (globalThis as any).FinalizationRegistry((key: string) => {
          this.handleGarbageCollected(key);
        })
      : null;
  }

  get<T>(key: string): T | undefined {
    const entryRef = this.cache.get(key);
    if (!entryRef) {
      this.stats.missCount++;
      this.updateHitRate();
      return undefined;
    }

    const entry = this.getEntry(entryRef);
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

  set<T>(key: string, value: T, type: CacheEntryType): void {
    const entry: UnifiedCacheEntry<T> = {
      value,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      type,
    };

    // Replace existing entry so stats stay consistent
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Ensure capacity before adding
    this.ensureCapacity();

    // Add to cache
    if (this.useWeakRef) {
      const entryRef = new (globalThis as any).WeakRef(entry);
      this.cache.set(key, entryRef);
      this.registry?.register(entry, key);
    } else {
      this.cache.set(key, entry);
    }

    this.updateAccessOrder(key);
    this.updateStats(type);
  }

  delete(key: string): boolean {
    const entryRef = this.cache.get(key);
    if (!entryRef) return false;

    const entry = this.getEntry(entryRef);
    if (entry) {
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

    const entry = this.getEntry(entryRef);
    if (!entry) {
      this.cache.delete(key);
      this.removeFromAccessOrder(key);
      return false;
    }

    return Date.now() - entry.timestamp <= this.ttl;
  }

  clear(): void {
    this.cache.clear();
    this.lruPrevByKey.clear();
    this.lruNextByKey.clear();
    this.lruHeadKey = undefined;
    this.lruTailKey = undefined;
    this.stats = {
      totalEntries: 0,
      hitCount: 0,
      missCount: 0,
      evictionCount: 0,
      hitRate: 0,
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
      const entry = entryRef ? this.getEntry(entryRef) : undefined;
      if (!entry || now - entry.timestamp > this.ttl) {
        this.delete(key);
      }
    }

    // Enforce entry-count limits
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

  private ensureCapacity(): void {
    let evictionAttempts = 0;
    const maxEvictionAttempts = this.stats.totalEntries + 10; // Safety limit

    while (
      this.stats.totalEntries >= this.maxSize &&
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
    const lruKey = this.lruHeadKey;
    if (!lruKey) return;

    const wasDeleted = this.delete(lruKey);

    // Always increment eviction count and remove from access order
    // even if the entry was already garbage collected
    this.stats.evictionCount++;

    // If the entry wasn't actually deleted (e.g., already garbage collected),
    // we still need to remove it from LRU order to prevent infinite loops
    if (!wasDeleted) {
      this.removeFromAccessOrder(lruKey);
      this.stats.totalEntries = Math.max(0, this.stats.totalEntries - 1);
    }
  }

  private enforceSizeLimits(): void {
    while (this.stats.totalEntries > this.maxSize) {
      this.evictLRU();
    }
  }

  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.appendToAccessOrder(key);
  }

  private removeFromAccessOrder(key: string): void {
    const prev = this.lruPrevByKey.get(key);
    const next = this.lruNextByKey.get(key);
    const isTracked =
      this.lruHeadKey === key ||
      this.lruTailKey === key ||
      this.lruPrevByKey.has(key) ||
      this.lruNextByKey.has(key);

    if (!isTracked) return;

    if (prev !== undefined) {
      this.lruNextByKey.set(prev, next);
    } else {
      this.lruHeadKey = next;
    }

    if (next !== undefined) {
      this.lruPrevByKey.set(next, prev);
    } else {
      this.lruTailKey = prev;
    }

    this.lruPrevByKey.delete(key);
    this.lruNextByKey.delete(key);
  }

  private appendToAccessOrder(key: string): void {
    this.lruPrevByKey.set(key, this.lruTailKey);
    this.lruNextByKey.set(key, undefined);

    if (this.lruTailKey !== undefined) {
      this.lruNextByKey.set(this.lruTailKey, key);
    } else {
      this.lruHeadKey = key;
    }

    this.lruTailKey = key;
  }

  private updateStats(type: CacheEntryType): void {
    this.stats.totalEntries++;
    this.updateTypeDistribution(type, 1);
  }

  private updateTypeDistribution(type: CacheEntryType, delta: number): void {
    const current = this.stats.typeDistribution.get(type) || 0;
    this.stats.typeDistribution.set(type, current + delta);
  }

  private updateHitRate(): void {
    const total = this.stats.hitCount + this.stats.missCount;
    this.stats.hitRate = total > 0 ? this.stats.hitCount / total : 0;
  }

  private handleGarbageCollected(key: string): void {
    if (this.cache.delete(key)) {
      this.removeFromAccessOrder(key);
      this.stats.totalEntries = Math.max(0, this.stats.totalEntries - 1);
    }
  }

  private getEntry(
    entryRef: UnifiedCacheEntry<any> | WeakRef<UnifiedCacheEntry<any>>,
  ): UnifiedCacheEntry<any> | undefined {
    if (
      this.useWeakRef &&
      typeof (globalThis as any).WeakRef !== 'undefined' &&
      entryRef instanceof (globalThis as any).WeakRef
    ) {
      return (entryRef as any).deref();
    }
    return entryRef as UnifiedCacheEntry<any>;
  }
}
