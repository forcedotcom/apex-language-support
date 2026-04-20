/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { ApexSymbol } from '../../types/symbol';
import type { DependencyAnalysis } from '../ApexSymbolRefManager';
import type {
  GraphData,
  FileGraphData,
  TypeGraphData,
} from '../../types/graph';
import { ReferenceStore } from '../services/referenceStore';
import { CacheStore } from '../services/cacheStore';

/** Analyze dependencies for a symbol, with cache */
export const analyzeDependencies = (
  symbol: ApexSymbol,
): Effect.Effect<DependencyAnalysis, never, ReferenceStore | CacheStore> =>
  Effect.gen(function* () {
    const cache = yield* CacheStore;
    const cacheKey = `deps_${symbol.name}`;
    const cached = yield* cache.get<DependencyAnalysis>(cacheKey);
    if (cached) return cached;

    const refs = yield* ReferenceStore;
    const analysis = yield* refs.analyzeDependencies(symbol);
    yield* cache.set(cacheKey, analysis, 'analysis');
    return analysis;
  });

/** Detect all circular dependencies in the graph */
export const detectCircularDependencies = (): Effect.Effect<
  string[][],
  never,
  ReferenceStore
> =>
  Effect.gen(function* () {
    const refs = yield* ReferenceStore;
    return yield* refs.detectCircularDependencies();
  });

/** Get graph data as JSON-serializable data */
export const getGraphData = (): Effect.Effect<
  GraphData,
  never,
  ReferenceStore
> =>
  Effect.gen(function* () {
    const refs = yield* ReferenceStore;
    return yield* refs.getGraphData();
  });

/** Get graph data filtered by file */
export const getGraphDataForFile = (
  fileUri: string,
): Effect.Effect<FileGraphData, never, ReferenceStore> =>
  Effect.gen(function* () {
    const refs = yield* ReferenceStore;
    return yield* refs.getGraphDataForFile(fileUri);
  });

/** Get graph data filtered by symbol type */
export const getGraphDataByType = (
  symbolType: string,
): Effect.Effect<TypeGraphData, never, ReferenceStore> =>
  Effect.gen(function* () {
    const refs = yield* ReferenceStore;
    return yield* refs.getGraphDataByType(symbolType);
  });
