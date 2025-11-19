/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SymbolTable } from '@salesforce/apex-lsp-parser-ast';
import { Diagnostic } from 'vscode-languageserver-protocol';
import {
  DocumentStateCache,
  DocumentState,
  getDocumentStateCache,
} from '../../src/services/DocumentStateCache';
import { getLogger } from '@salesforce/apex-lsp-shared';

// Mock getLogger to avoid console output during tests
jest.mock('@salesforce/apex-lsp-shared', () => ({
  ...jest.requireActual('@salesforce/apex-lsp-shared'),
  getLogger: jest.fn(() => ({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  })),
}));

describe('DocumentStateCache', () => {
  let cache: DocumentStateCache;

  beforeEach(() => {
    cache = new DocumentStateCache(10); // Small cache for testing
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a cache with default size when no size specified', () => {
      const defaultCache = new DocumentStateCache();
      expect(defaultCache).toBeDefined();
      expect(defaultCache.size()).toBe(0);
    });

    it('should create a cache with specified max size', () => {
      const sizedCache = new DocumentStateCache(50);
      expect(sizedCache).toBeDefined();
      expect(sizedCache.size()).toBe(0);
    });
  });

  describe('get and set', () => {
    it('should cache and retrieve parse results', () => {
      const uri = 'file:///test.cls';
      const version = 1;
      const result: DocumentState = {
        symbolTable: new SymbolTable(),
        diagnostics: [],
        documentVersion: version,
        timestamp: Date.now(),
        documentLength: 100,
        symbolsIndexed: false,
      };

      cache.set(uri, result);
      const retrieved = cache.get(uri, version);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.documentVersion).toBe(version);
    });

    it('should return null when version does not match', () => {
      const uri = 'file:///test.cls';
      const result: CachedParseResult = {
        symbolTable: new SymbolTable(),
        diagnostics: [],
        documentVersion: 1,
        timestamp: Date.now(),
        documentLength: 100,
      };

      cache.set(uri, result);
      const retrieved = cache.get(uri, 2); // Different version

      expect(retrieved).toBeNull();
    });

    it('should return null when URI is not cached', () => {
      const retrieved = cache.get('file:///nonexistent.cls', 1);
      expect(retrieved).toBeNull();
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when cache is full', () => {
      const maxSize = 3;

      // Create a cache with size 3 for this test
      const testCache = new DocumentStateCache(3);

      // Fill cache to capacity
      for (let i = 0; i < maxSize; i++) {
        const result: DocumentState = {
          symbolTable: new SymbolTable(),
          diagnostics: [],
          documentVersion: 1,
          timestamp: Date.now() - (maxSize - i) * 1000, // Different timestamps
          documentLength: 100,
          symbolsIndexed: false,
        };
        testCache.set(`file:///test${i}.cls`, result);
      }

      expect(testCache.size()).toBe(maxSize);

      // Verify oldest entry exists before eviction
      expect(testCache.has('file:///test0.cls')).toBe(true);

      // Add another entry - should evict oldest
      const newResult: DocumentState = {
        symbolTable: new SymbolTable(),
        diagnostics: [],
        documentVersion: 1,
        timestamp: Date.now(),
        documentLength: 100,
        symbolsIndexed: false,
      };

      const evictionsBefore = testCache.getStats().evictions;
      testCache.set('file:///test10.cls', newResult);

      // Verify eviction happened - oldest entry should be gone
      expect(testCache.has('file:///test0.cls')).toBe(false);
      // New entry should be present
      expect(testCache.has('file:///test10.cls')).toBe(true);
      // Cache size should remain at maxSize
      expect(testCache.size()).toBe(maxSize);

      const stats = testCache.getStats();
      expect(stats.evictions).toBe(evictionsBefore + 1);
    });

    it('should not evict when updating existing entry', () => {
      const uri = 'file:///test.cls';
      const result1: CachedParseResult = {
        symbolTable: new SymbolTable(),
        diagnostics: [],
        documentVersion: 1,
        timestamp: Date.now(),
        documentLength: 100,
      };

      cache.set(uri, result1);
      expect(cache.size()).toBe(1);

      const result2: DocumentState = {
        symbolTable: new SymbolTable(),
        diagnostics: [],
        documentVersion: 2,
        timestamp: Date.now(),
        documentLength: 100,
        symbolsIndexed: false,
      };

      cache.set(uri, result2);
      expect(cache.size()).toBe(1); // No new entry, just updated
    });
  });

  describe('invalidate', () => {
    it('should remove specific cache entry', () => {
      const uri = 'file:///test.cls';
      const result: CachedParseResult = {
        symbolTable: new SymbolTable(),
        diagnostics: [],
        documentVersion: 1,
        timestamp: Date.now(),
        documentLength: 100,
      };

      cache.set(uri, result);
      expect(cache.size()).toBe(1);

      cache.invalidate(uri);
      expect(cache.size()).toBe(0);
      expect(cache.get(uri, 1)).toBeNull();
    });

    it('should increment invalidation count', () => {
      const uri = 'file:///test.cls';
      const result: CachedParseResult = {
        symbolTable: new SymbolTable(),
        diagnostics: [],
        documentVersion: 1,
        timestamp: Date.now(),
        documentLength: 100,
      };

      cache.set(uri, result);
      cache.invalidate(uri);

      const stats = cache.getStats();
      expect(stats.invalidations).toBe(1);
    });
  });

  describe('clear', () => {
    it('should remove all cache entries', () => {
      for (let i = 0; i < 5; i++) {
        const result: CachedParseResult = {
          symbolTable: new SymbolTable(),
          diagnostics: [],
          documentVersion: 1,
          timestamp: Date.now(),
          documentLength: 100,
        };
        cache.set(`file:///test${i}.cls`, result);
      }

      expect(cache.size()).toBe(5);
      cache.clear();
      expect(cache.size()).toBe(0);
    });

    it('should increment eviction count', () => {
      for (let i = 0; i < 5; i++) {
        const result: CachedParseResult = {
          symbolTable: new SymbolTable(),
          diagnostics: [],
          documentVersion: 1,
          timestamp: Date.now(),
          documentLength: 100,
        };
        cache.set(`file:///test${i}.cls`, result);
      }

      cache.clear();
      const stats = cache.getStats();
      expect(stats.evictions).toBe(5);
    });
  });

  describe('getStats', () => {
    it('should track cache hits and misses', () => {
      const uri = 'file:///test.cls';
      const result: CachedParseResult = {
        symbolTable: new SymbolTable(),
        diagnostics: [],
        documentVersion: 1,
        timestamp: Date.now(),
        documentLength: 100,
      };

      // Set and retrieve (hit)
      cache.set(uri, result);
      cache.get(uri, 1);

      // Miss (different version)
      cache.get(uri, 2);

      // Miss (not cached)
      cache.get('file:///nonexistent.cls', 1);

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBeCloseTo(0.33, 2);
    });

    it('should track cache size and utilization', () => {
      const maxSize = 10;

      for (let i = 0; i < 5; i++) {
        const result: CachedParseResult = {
          symbolTable: new SymbolTable(),
          diagnostics: [],
          documentVersion: 1,
          timestamp: Date.now(),
          documentLength: 100,
        };
        cache.set(`file:///test${i}.cls`, result);
      }

      const stats = cache.getStats();
      expect(stats.cacheSize).toBe(5);
      expect(stats.maxSize).toBe(10);
      expect(stats.utilization).toBe(0.5);
    });
  });

  describe('has', () => {
    it('should return true when URI is cached', () => {
      const uri = 'file:///test.cls';
      const result: CachedParseResult = {
        symbolTable: new SymbolTable(),
        diagnostics: [],
        documentVersion: 1,
        timestamp: Date.now(),
        documentLength: 100,
      };

      cache.set(uri, result);
      expect(cache.has(uri)).toBe(true);
    });

    it('should return false when URI is not cached', () => {
      expect(cache.has('file:///nonexistent.cls')).toBe(false);
    });
  });

  describe('getDocumentStateCache singleton', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = getDocumentStateCache();
      const instance2 = getDocumentStateCache();

      expect(instance1).toBe(instance2);
    });

    it('should use default max size when not specified', () => {
      const instance = getDocumentStateCache();
      const stats = instance.getStats();

      expect(stats.maxSize).toBe(100);
    });

    it('should use default max size on first call', () => {
      // Singleton instance is created with default size
      const instance = getDocumentStateCache();
      const stats = instance.getStats();

      // Default size is 100 per the getDocumentStateCache implementation
      expect(stats.maxSize).toBe(100);
    });
  });

  describe('integration scenarios', () => {
    it('should handle version-based cache invalidation correctly', () => {
      const uri = 'file:///test.cls';

      // Set version 1
      const result1: CachedParseResult = {
        symbolTable: new SymbolTable(),
        diagnostics: [],
        documentVersion: 1,
        timestamp: Date.now(),
        documentLength: 100,
      };
      cache.set(uri, result1);

      // Version 1 should hit
      expect(cache.get(uri, 1)).not.toBeNull();

      // Version 2 should miss (document was edited)
      expect(cache.get(uri, 2)).toBeNull();

      // Update to version 2
      const result2: DocumentState = {
        symbolTable: new SymbolTable(),
        diagnostics: [],
        documentVersion: 2,
        timestamp: Date.now(),
        documentLength: 150,
        symbolsIndexed: false,
      };
      cache.set(uri, result2);

      // Version 2 should hit, version 1 should miss
      expect(cache.get(uri, 2)).not.toBeNull();
      expect(cache.get(uri, 1)).toBeNull();
    });

    it('should maintain cache stats across multiple operations', () => {
      const uri = 'file:///test.cls';

      for (let version = 1; version <= 5; version++) {
        const result: CachedParseResult = {
          symbolTable: new SymbolTable(),
          diagnostics: [],
          documentVersion: version,
          timestamp: Date.now(),
          documentLength: 100,
        };

        // Set version
        cache.set(uri, result);

        // Miss on previous version, hit on current
        if (version > 1) {
          expect(cache.get(uri, version - 1)).toBeNull();
        }
        expect(cache.get(uri, version)).not.toBeNull();
      }

      const stats = cache.getStats();
      expect(stats.hits).toBe(5);
      expect(stats.misses).toBeGreaterThanOrEqual(4); // At least version mismatches
    });
  });

  describe('symbolsIndexed field', () => {
    it('should default symbolsIndexed to false for new entries', () => {
      const uri = 'file:///test.cls';
      const result: DocumentState = {
        symbolTable: new SymbolTable(),
        diagnostics: [],
        documentVersion: 1,
        timestamp: Date.now(),
        documentLength: 100,
        symbolsIndexed: false,
      };

      cache.set(uri, result);
      const retrieved = cache.get(uri, 1);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.symbolsIndexed).toBe(false);
    });

    it('should preserve symbolsIndexed when merging if not explicitly overridden', () => {
      const uri = 'file:///test.cls';
      const initial: DocumentState = {
        symbolTable: new SymbolTable(),
        diagnostics: [],
        documentVersion: 1,
        timestamp: Date.now(),
        documentLength: 100,
        symbolsIndexed: true,
      };

      cache.set(uri, initial);

      // Merge without specifying symbolsIndexed
      cache.merge(uri, {
        diagnostics: [],
      });

      const retrieved = cache.get(uri, 1);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.symbolsIndexed).toBe(true); // Should preserve true
    });

    it('should update symbolsIndexed when explicitly set in merge', () => {
      const uri = 'file:///test.cls';
      const initial: DocumentState = {
        symbolTable: new SymbolTable(),
        diagnostics: [],
        documentVersion: 1,
        timestamp: Date.now(),
        documentLength: 100,
        symbolsIndexed: false,
      };

      cache.set(uri, initial);

      // Merge with explicit symbolsIndexed: true
      cache.merge(uri, {
        symbolsIndexed: true,
      });

      const retrieved = cache.get(uri, 1);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.symbolsIndexed).toBe(true);
    });

    it('should default symbolsIndexed to false for new entries created via merge', () => {
      const uri = 'file:///test.cls';

      // Merge into non-existent entry
      cache.merge(uri, {
        documentVersion: 1,
        documentLength: 100,
        symbolTable: new SymbolTable(),
      });

      const retrieved = cache.get(uri, 1);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.symbolsIndexed).toBe(false); // Should default to false
    });

    it('should allow setting symbolsIndexed to true in new entry via merge', () => {
      const uri = 'file:///test.cls';

      // Merge into non-existent entry with explicit symbolsIndexed
      cache.merge(uri, {
        documentVersion: 1,
        documentLength: 100,
        symbolTable: new SymbolTable(),
        symbolsIndexed: true,
      });

      const retrieved = cache.get(uri, 1);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.symbolsIndexed).toBe(true);
    });
  });
});
