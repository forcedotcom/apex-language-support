/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ApexSymbol } from '../types/symbol';
import { extractFilePathFromUri } from '../types/UriBasedIdGenerator';
import { isMethodOrConstructorSymbol } from '../utils/symbolNarrowing';

/**
 * Shared cache-key builders for the `findReferencesTo` / `findReferencesFrom`
 * relationship cache.
 *
 * There are two callers of these caches — `ApexSymbolManager` and the
 * `ops/referenceOps.ts` functional ops (exported via the package index as
 * `findReferencesToOp` / `findReferencesFromOp`). Both go through the same
 * RefManager and get overload-separated by `separateOverloadReferences`
 * (F11-2), so they MUST key their caches identically; otherwise the two paths
 * disagree and one can serve the other a stale or wrong-overload result.
 *
 * Name alone is too coarse as a key: it collapses (a) overloads of one method
 * and (b) same-named members across different files into a single entry, so a
 * query for one would serve another's cached results. The key therefore also
 * carries the declaring file (normalized the same way symbol IDs and the
 * reverse index are, via {@link extractFilePathFromUri}, so two spellings of
 * one URI don't drift into separate entries) and — for methods AND constructors
 * — the declared arity, the same discriminator the reverse-index overload
 * separation uses. Constructors are overloadable by parameter list too
 * (`Foo()` vs `Foo(String)`), so they need the arity discriminator as well.
 *
 * The `refs_to_` / `refs_from_` prefixes are load-bearing: the relationship
 * cache is invalidated wholesale by the `^refs_(to|from)_` pattern in
 * `ApexSymbolManager`, so both builders must keep those prefixes.
 */

/** File + arity discriminator shared by both key shapes. */
function discriminator(symbol: ApexSymbol): string {
  const filePart = symbol.fileUri
    ? extractFilePathFromUri(symbol.fileUri)
    : 'no-file';
  const arityPart = isMethodOrConstructorSymbol(symbol)
    ? `:${symbol.parameters?.length ?? 0}`
    : '';
  return `${symbol.name}@${filePart}${arityPart}`;
}

/** Build the `findReferencesTo` relationship cache key. */
export function buildReferencesToCacheKey(symbol: ApexSymbol): string {
  return `refs_to_${discriminator(symbol)}`;
}

/** Build the `findReferencesFrom` relationship cache key. */
export function buildReferencesFromCacheKey(symbol: ApexSymbol): string {
  return `refs_from_${discriminator(symbol)}`;
}
