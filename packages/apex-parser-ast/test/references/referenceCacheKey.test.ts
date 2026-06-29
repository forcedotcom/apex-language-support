/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Shared relationship-cache key builders (F11-2).
 *
 * `ApexSymbolManager.findReferencesTo/From` and the parallel `referenceOps`
 * functional ops (`findReferencesToOp` / `findReferencesFromOp`) both cache
 * RefManager results that are overload-separated by `separateOverloadReferences`.
 * They MUST key identically or the two paths alias each other's results. These
 * tests pin the key contract both implementations now share:
 *   (a) overloads of one method (differing arity) get distinct keys,
 *   (b) same-named members in different files get distinct keys,
 *   (c) the file part is normalized via extractFilePathFromUri (same as symbol
 *       IDs / the reverse index), so the key cannot disagree with them on file
 *       identity — e.g. a symbol-fragment suffix is stripped before keying,
 *   (d) the `refs_to_` / `refs_from_` prefixes survive (the wholesale
 *       `^refs_(to|from)_` cache invalidation depends on them).
 */

import { SymbolKind, type ApexSymbol } from '../../src/types/symbol';
import {
  buildReferencesToCacheKey,
  buildReferencesFromCacheKey,
} from '../../src/symbols/referenceCacheKey';

function methodSymbol(
  name: string,
  fileUri: string,
  arity: number,
): ApexSymbol {
  return {
    name,
    kind: SymbolKind.Method,
    fileUri,
    parameters: Array.from({ length: arity }, (_, i) => ({ name: `p${i}` })),
  } as unknown as ApexSymbol;
}

function typeSymbol(name: string, fileUri: string): ApexSymbol {
  return {
    name,
    kind: SymbolKind.Class,
    fileUri,
  } as unknown as ApexSymbol;
}

describe('reference cache key builders (F11-2 shared key)', () => {
  it('gives arity-distinct overloads of one method distinct keys', () => {
    const uri = 'file:///test/Foo.cls';
    const f0 = buildReferencesToCacheKey(methodSymbol('f', uri, 0));
    const f1 = buildReferencesToCacheKey(methodSymbol('f', uri, 1));
    const f2 = buildReferencesToCacheKey(methodSymbol('f', uri, 2));

    expect(new Set([f0, f1, f2]).size).toBe(3);
  });

  it('gives same-named members in different files distinct keys', () => {
    const a = buildReferencesToCacheKey(
      methodSymbol('m', 'file:///test/A.cls', 1),
    );
    const b = buildReferencesToCacheKey(
      methodSymbol('m', 'file:///test/B.cls', 1),
    );

    expect(a).not.toBe(b);
  });

  it('normalizes the file part via extractFilePathFromUri (no drift vs symbol IDs)', () => {
    // The reverse index and symbol IDs run file URIs through
    // extractFilePathFromUri before keying; the cache key must too, or it
    // disagrees with them on what "the same file" is. A symbol-fragment suffix
    // (`...#fragment`) is the spelling difference that normalization collapses,
    // so a fragment-bearing and a bare URI for one file share one key.
    const bare = buildReferencesToCacheKey(
      methodSymbol('m', 'file:///Users/x/Foo.cls', 1),
    );
    const withFragment = buildReferencesToCacheKey(
      methodSymbol('m', 'file:///Users/x/Foo.cls#m@1', 1),
    );

    expect(withFragment).toBe(bare);
  });

  it('keeps non-method (type) keys arity-free but still file-scoped', () => {
    const t = buildReferencesToCacheKey(
      typeSymbol('Foo', 'file:///test/Foo.cls'),
    );
    expect(t).not.toMatch(/:\d+$/);
    expect(t).toContain('Foo');
  });

  it('preserves the refs_to_ / refs_from_ prefixes (invalidation depends on them)', () => {
    const sym = methodSymbol('f', 'file:///test/Foo.cls', 1);
    const toKey = buildReferencesToCacheKey(sym);
    const fromKey = buildReferencesFromCacheKey(sym);

    expect(toKey.startsWith('refs_to_')).toBe(true);
    expect(fromKey.startsWith('refs_from_')).toBe(true);
    // Both must match the wholesale invalidation pattern.
    expect(/^refs_(to|from)_/.test(toKey)).toBe(true);
    expect(/^refs_(to|from)_/.test(fromKey)).toBe(true);
  });

  it('distinguishes the to/from families for the same symbol', () => {
    const sym = methodSymbol('f', 'file:///test/Foo.cls', 1);
    expect(buildReferencesToCacheKey(sym)).not.toBe(
      buildReferencesFromCacheKey(sym),
    );
  });

  it('handles a missing fileUri without throwing (no-file sentinel)', () => {
    const sym = {
      name: 'f',
      kind: SymbolKind.Method,
      parameters: [],
    } as unknown as ApexSymbol;
    expect(buildReferencesToCacheKey(sym)).toContain('no-file');
  });
});
