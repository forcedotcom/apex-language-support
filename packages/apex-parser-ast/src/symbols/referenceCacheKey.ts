/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ApexSymbol, MethodSymbol } from '../types/symbol';
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
 * — the declared signature: parameter count plus parameter type strings.
 * Constructors are overloadable by parameter list too (`Foo()` vs
 * `Foo(String)`), so they need the discriminator as well. The parameter TYPES
 * (not just the count) are load-bearing now that same-arity overloads are
 * separated by signature (W-23182862): `use(String)` and `use(Integer)` are
 * distinct targets with distinct reference sets, so an arity-only key would
 * collide them and serve one overload's filtered results for the other.
 *
 * The `refs_to_` / `refs_from_` prefixes are load-bearing: the relationship
 * cache is invalidated wholesale by the `^refs_(to|from)_` pattern in
 * `ApexSymbolManager`, so both builders must keep those prefixes.
 */

/** File + signature discriminator shared by both key shapes. */
function discriminator(symbol: ApexSymbol): string {
  const filePart = symbol.fileUri
    ? extractFilePathFromUri(symbol.fileUri)
    : 'no-file';
  let signaturePart = '';
  if (isMethodOrConstructorSymbol(symbol)) {
    const params = (symbol as MethodSymbol).parameters ?? [];
    // Arity, then the parameter type strings, so same-arity overloads
    // (`use(String)` vs `use(Integer)`) get distinct keys. Lowercased to match
    // the case-insensitive signature comparison used in overload separation.
    const paramTypes = params
      .map((p) =>
        (p.type?.originalTypeString ?? p.type?.name ?? '').toLowerCase(),
      )
      .join(',');
    signaturePart = `:${params.length}(${paramTypes})`;
  }
  return `${symbol.name}@${filePart}${signaturePart}`;
}

/** Build the `findReferencesTo` relationship cache key. */
export function buildReferencesToCacheKey(symbol: ApexSymbol): string {
  return `refs_to_${discriminator(symbol)}`;
}

/** Build the `findReferencesFrom` relationship cache key. */
export function buildReferencesFromCacheKey(symbol: ApexSymbol): string {
  return `refs_from_${discriminator(symbol)}`;
}
