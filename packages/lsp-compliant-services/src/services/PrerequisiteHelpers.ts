/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DetailLevel, SymbolTable } from '@salesforce/apex-lsp-parser-ast';

/**
 * Get the numeric order of a detail level for comparison
 * Higher numbers indicate more detail
 */
export function getLayerOrderIndex(level: DetailLevel): number {
  const order: Record<DetailLevel, number> = {
    'public-api': 1,
    protected: 2,
    private: 3,
    full: 4,
  };
  return order[level] ?? 0;
}

/**
 * Check if a SymbolTable has references
 */
export function hasReferences(
  symbolTable: SymbolTable | null | undefined,
): boolean {
  if (!symbolTable) {
    return false;
  }
  // SymbolTable has a references array - check if it has any
  const refs = symbolTable.getAllReferences();
  return refs.length > 0;
}

/**
 * Check if cross-file references have been resolved for a file
 * This checks if references in the SymbolTable have resolvedSymbolId set
 * indicating they've been linked to symbols (including cross-file)
 */
export function hasCrossFileResolution(
  symbolTable: SymbolTable | null | undefined,
): boolean {
  if (!symbolTable) {
    return false;
  }
  const refs = symbolTable.getAllReferences();
  if (refs.length === 0) {
    return false;
  }
  // Check if any references have been resolved (have resolvedSymbolId)
  // This indicates cross-file resolution has been attempted
  return refs.some((ref) => ref.resolvedSymbolId !== undefined);
}
