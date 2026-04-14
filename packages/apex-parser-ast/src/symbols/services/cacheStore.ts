/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap } from 'data-structure-typed';
import { Context, Effect, Layer } from 'effect';
import type { ApexSymbol } from '../../types/symbol';
import type {
  UnifiedCache,
  CacheEntryType,
  UnifiedCacheStats,
} from '../../utils/UnifiedCache';

/**
 * Data service for the caching layer.
 * Wraps UnifiedCache, parentLookupCache, and symbolCache.
 * Pure derivation — can be dropped entirely in worker proxy scenarios.
 */
export interface CacheStoreShape {
  readonly get: <T>(key: string) => Effect.Effect<T | undefined>;
  readonly set: <T>(
    key: string,
    value: T,
    type: CacheEntryType,
  ) => Effect.Effect<void>;
  readonly invalidatePattern: (pattern: string) => Effect.Effect<void>;
  readonly clear: () => Effect.Effect<void>;
  readonly optimize: () => Effect.Effect<void>;
  readonly getStats: () => Effect.Effect<UnifiedCacheStats>;

  readonly getParentCache: (
    fileUri: string,
  ) => Effect.Effect<HashMap<string, ApexSymbol> | undefined>;
  readonly setParentCache: (
    fileUri: string,
    cache: HashMap<string, ApexSymbol>,
  ) => Effect.Effect<void>;
  readonly clearParentCache: () => Effect.Effect<void>;
}

export class CacheStore extends Context.Tag('CacheStore')<
  CacheStore,
  CacheStoreShape
>() {}

/** Shim Layer that delegates to existing UnifiedCache and parent cache instances */
export const cacheStoreShim = (
  unifiedCache: UnifiedCache,
  parentLookupCache: HashMap<string, HashMap<string, ApexSymbol>>,
): Layer.Layer<CacheStore> =>
  Layer.succeed(CacheStore, {
    get: <T>(key: string) =>
      Effect.sync(() => unifiedCache.get(key) as T | undefined),
    set: <T>(key: string, value: T, type: CacheEntryType) =>
      Effect.sync(() => unifiedCache.set(key, value, type)),
    invalidatePattern: (pattern) =>
      Effect.sync(() => unifiedCache.invalidatePattern(pattern)),
    clear: () =>
      Effect.sync(() => {
        unifiedCache.clear();
        parentLookupCache.clear();
      }),
    optimize: () => Effect.sync(() => unifiedCache.optimize()),
    getStats: () => Effect.sync(() => unifiedCache.getStats()),

    getParentCache: (fileUri) =>
      Effect.sync(() => parentLookupCache.get(fileUri) ?? undefined),
    setParentCache: (fileUri, cache) =>
      Effect.sync(() => {
        parentLookupCache.set(fileUri, cache);
      }),
    clearParentCache: () => Effect.sync(() => parentLookupCache.clear()),
  });
