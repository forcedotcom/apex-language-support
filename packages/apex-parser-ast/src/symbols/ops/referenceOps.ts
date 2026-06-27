/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { ApexSymbol } from '../../types/symbol';
import type { EnumValue } from '@salesforce/apex-lsp-shared';
import type { ReferenceResult, ReferenceType } from '../ApexSymbolRefManager';
import type { SymbolReference } from '../../types/symbolReference';
import { SymbolIndexStore } from '../services/symbolIndexStore';
import { ReferenceStore } from '../services/referenceStore';
import { CacheStore } from '../services/cacheStore';
import {
  buildReferencesToCacheKey,
  buildReferencesFromCacheKey,
} from '../referenceCacheKey';

/** Find all references pointing to the given symbol, with cache */
export const findReferencesTo = (
  symbol: ApexSymbol,
): Effect.Effect<ReferenceResult[], never, ReferenceStore | CacheStore> =>
  Effect.gen(function* () {
    const cache = yield* CacheStore;
    // Share the file/arity-aware key with ApexSymbolManager so the two
    // findReferencesTo paths don't alias overloads against each other (F11-2).
    const cacheKey = buildReferencesToCacheKey(symbol);
    const cached = yield* cache.get<ReferenceResult[]>(cacheKey);
    if (cached) return cached;

    const refs = yield* ReferenceStore;
    const results = yield* refs.findReferencesTo(symbol);
    yield* cache.set(cacheKey, results, 'relationship');
    return results;
  });

/** Find all references originating from the given symbol, with cache */
export const findReferencesFrom = (
  symbol: ApexSymbol,
): Effect.Effect<ReferenceResult[], never, ReferenceStore | CacheStore> =>
  Effect.gen(function* () {
    const cache = yield* CacheStore;
    const cacheKey = buildReferencesFromCacheKey(symbol);
    const cached = yield* cache.get<ReferenceResult[]>(cacheKey);
    if (cached) return cached;

    const refs = yield* ReferenceStore;
    const results = yield* refs.findReferencesFrom(symbol);
    yield* cache.set(cacheKey, results, 'relationship');
    return results;
  });

/** Find symbols related by a specific relationship type */
export const findRelatedSymbols = (
  symbol: ApexSymbol,
  relationshipType: EnumValue<typeof ReferenceType>,
): Effect.Effect<ApexSymbol[], never, ReferenceStore | CacheStore> =>
  Effect.gen(function* () {
    const references = yield* findReferencesFrom(symbol);
    return references
      .filter((ref) => ref.referenceType === relationshipType)
      .map((ref) => ref.symbol);
  });

/** Get SymbolReference data at a specific position in a file */
export const getReferencesAtPosition = (
  fileUri: string,
  position: { line: number; character: number },
): Effect.Effect<SymbolReference[], never, SymbolIndexStore> =>
  Effect.gen(function* () {
    const index = yield* SymbolIndexStore;
    const symbolTable = yield* index.getSymbolTableForFile(fileUri);
    if (!symbolTable) return [];
    try {
      return symbolTable.getReferencesAtPosition(position);
    } catch {
      return [];
    }
  });

/** Get all references in a file */
export const getAllReferencesInFile = (
  fileUri: string,
): Effect.Effect<SymbolReference[], never, SymbolIndexStore> =>
  Effect.gen(function* () {
    const index = yield* SymbolIndexStore;
    const symbolTable = yield* index.getSymbolTableForFile(fileUri);
    if (!symbolTable) return [];
    try {
      return symbolTable.getAllReferences();
    } catch {
      return [];
    }
  });
