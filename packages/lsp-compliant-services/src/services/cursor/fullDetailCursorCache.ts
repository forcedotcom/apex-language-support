/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Per-SymbolManager cache of the most recent full-detail cursor recompiles,
 * keyed by document URI. Shared between the cross-file recompile path and the
 * enrichment/preparation code in the worker composition root, so it lives in
 * its own leaf module.
 */

import type { SymbolManagerHost } from './cursorResolution';

export interface FullDetailCursorCacheEntry {
  readonly content: string;
  readonly sourceVersion: number;
  readonly table: unknown;
}

export const fullDetailCursorBySymbolManager = new WeakMap<
  SymbolManagerHost['symbolManager'],
  Map<string, FullDetailCursorCacheEntry>
>();
export const MAX_FULL_DETAIL_CURSOR_CACHE_ENTRIES = 32;
