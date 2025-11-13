/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap } from 'data-structure-typed';
import { SymbolTable, FoldingRange } from '@salesforce/apex-lsp-parser-ast';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { Diagnostic } from 'vscode-languageserver-protocol';

/**
 * Document state with version tracking and indexing status
 *
 * This cache supports results from different listener types using optional fields.
 * Callers should check which fields are present before use.
 *
 * - ApexSymbolCollectorListener results: symbolTable and diagnostics fields
 * - ApexFoldingRangeListener results: foldingRanges field
 * - Future listeners can add their own optional fields
 *
 * The cache acts as a "todo list" for each file/version, tracking what work has been done.
 */
export interface DocumentState {
  // ApexSymbolCollectorListener results (optional)
  symbolTable?: SymbolTable;
  diagnostics?: Diagnostic[];

  // ApexFoldingRangeListener results (optional)
  foldingRanges?: FoldingRange[];

  // Common metadata
  documentVersion: number;
  timestamp: number;
  documentLength: number;

  // Symbol indexing state
  symbolsIndexed: boolean;
}

/**
 * Document state cache with version-based invalidation
 * Uses document.version as the cache key for perfect cache hit/miss detection
 */
export class DocumentStateCache {
  private readonly logger = getLogger();
  private readonly cache = new HashMap<string, DocumentState>();
  private readonly maxSize: number;
  private stats = {
    hits: 0,
    misses: 0,
    invalidations: 0,
    evictions: 0,
  };

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Get cached parse result for a document if version matches
   * @param uri Document URI
   * @param version Document version number
   * @returns Cached result if version matches, null otherwise
   */
  get(uri: string, version: number): DocumentState | null {
    const cached = this.cache.get(uri);

    // Version-based invalidation: only return if versions match
    if (cached && cached.documentVersion === version) {
      this.stats.hits++;
      this.logger.debug(
        () =>
          `Cache HIT for ${uri} (version ${version}) - ${this.getStats().hitRate.toFixed(2)}% hit rate`,
      );
      return cached;
    }

    if (cached) {
      this.stats.misses++;
      this.logger.debug(
        () =>
          `Cache MISS for ${uri} (cached: ${cached.documentVersion}, requested: ${version})`,
      );
    } else {
      this.stats.misses++;
      this.logger.debug(() => `Cache MISS for ${uri} (not cached)`);
    }

    return null;
  }

  /**
   * Get cached symbol table result for a document if version matches
   * @param uri Document URI
   * @param version Document version number
   * @returns Cached symbol result if version matches and symbol data exists, null otherwise
   */
  getSymbolResult(
    uri: string,
    version: number,
  ): { symbolTable: SymbolTable; diagnostics: Diagnostic[] } | null {
    const cached = this.get(uri, version);
    if (cached?.symbolTable && cached?.diagnostics !== undefined) {
      return {
        symbolTable: cached.symbolTable,
        diagnostics: cached.diagnostics,
      };
    }
    return null;
  }

  /**
   * Get cached folding range result for a document if version matches
   * @param uri Document URI
   * @param version Document version number
   * @returns Cached folding range result if version matches and folding data exists, null otherwise
   */
  getFoldingRangeResult(
    uri: string,
    version: number,
  ): { foldingRanges: FoldingRange[] } | null {
    const cached = this.get(uri, version);
    if (cached?.foldingRanges) {
      return { foldingRanges: cached.foldingRanges };
    }
    return null;
  }

  /**
   * Store parse result in cache with document version
   * Implements LRU eviction when cache is full
   * @param uri Document URI
   * @param result Parse result to cache
   */
  set(uri: string, result: DocumentState): void {
    // If cache is full and this URI is not already cached, evict oldest entry
    if (this.cache.size >= this.maxSize && !this.cache.has(uri)) {
      this.logger.debug(
        () =>
          `Cache full (${this.cache.size}/${this.maxSize}), evicting oldest entry`,
      );
      this.evictOldest();
    }

    this.cache.set(uri, result);
      this.logger.debug(
        () =>
          `Cached document state for ${uri} (version ${result.documentVersion}) - size: ${this.cache.size}/${this.maxSize}`,
      );
  }

  /**
   * Merge new parse result data with existing cache entry
   * Preserves existing data while adding new data
   * @param uri Document URI
   * @param newData New data to merge into existing cache entry
   */
  merge(uri: string, newData: Partial<DocumentState>): void {
    const existing = this.cache.get(uri);

    if (existing) {
      // Merge with existing data
      const merged: DocumentState = {
        ...existing,
        ...newData,
        // Always update timestamp when merging
        timestamp: Date.now(),
        // Preserve symbolsIndexed unless explicitly overridden
        symbolsIndexed:
          newData.symbolsIndexed !== undefined
            ? newData.symbolsIndexed
            : existing.symbolsIndexed,
      };

      this.cache.set(uri, merged);
      this.logger.debug(
        () =>
          'Merged document state for ' +
          `${uri} (version ${merged.documentVersion}) - size: ${this.cache.size}/${this.maxSize}`,
      );
    } else {
      // No existing entry, create new one with defaults
      const newEntry: DocumentState = {
        documentVersion: newData.documentVersion!,
        timestamp: Date.now(),
        documentLength: newData.documentLength!,
        symbolsIndexed: newData.symbolsIndexed ?? false, // Default to false for new entries
        ...newData,
      };

      this.set(uri, newEntry);
    }
  }

  /**
   * Evict the oldest cache entry (LRU eviction)
   */
  private evictOldest(): void {
    if (this.cache.size === 0) return;

    // Find the oldest entry by timestamp
    let oldestKey: string | undefined;
    let oldestTimestamp = Number.MAX_SAFE_INTEGER;

    for (const [key, value] of this.cache.entries()) {
      if (!value) continue;
      if (value.timestamp < oldestTimestamp) {
        oldestTimestamp = value.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      this.logger.debug(() => `Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  /**
   * Invalidate cache for a specific document (by URI)
   * @param uri Document URI
   */
  invalidate(uri: string): void {
    if (this.cache.delete(uri)) {
      this.stats.invalidations++;
      this.logger.debug(() => `Invalidated cache for ${uri}`);
    }
  }

  /**
   * Clear all cached parse results
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    this.stats.evictions += count;
    this.logger.debug(() => `Cleared entire parse cache (${count} entries)`);
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? this.stats.hits / total : 0;

    return {
      ...this.stats,
      totalRequests: total,
      hitRate,
      cacheSize: this.cache.size,
      maxSize: this.maxSize,
      utilization: this.cache.size / this.maxSize,
    };
  }

  /**
   * Get current cache size
   * @returns Number of cached entries
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Check if a document is currently cached
   * @param uri Document URI
   * @returns True if document is cached
   */
  has(uri: string): boolean {
    return this.cache.has(uri);
  }
}

/**
 * Singleton instance of document state cache
 */
let documentStateCacheInstance: DocumentStateCache | null = null;

/**
 * Get or create the singleton document state cache instance
 * @param maxSize Maximum number of entries to cache (default: 100)
 * @returns Document state cache instance
 */
export function getDocumentStateCache(maxSize?: number): DocumentStateCache {
  if (!documentStateCacheInstance) {
    documentStateCacheInstance = new DocumentStateCache(maxSize || 100);
  }
  return documentStateCacheInstance;
}
