/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ISymbolManager } from '../../types/ISymbolManager';
import type { SymbolTable } from '../../types/symbol';

/**
 * Pure-data view of a serialized symbol table used by data-owner wire
 * responses. Mirrors the shape produced by `QuerySymbolSubset` so the
 * receiving worker can rehydrate via `SymbolTable.fromSerializedData`.
 */
export interface SerializedSymbolTableEntry {
  symbols: unknown[];
  references: unknown[];
  hierarchicalReferences: unknown[];
  metadata: unknown;
  fileUri: string;
}

/**
 * Result of {@link resolveDependentUris}: dependent file URIs mapped to
 * their serialized symbol tables. URI keys are the file URIs of the
 * *callers* — the files that reference symbols declared in the target
 * file. Used by Find References to load caller-side symbol tables before
 * the algorithm runs on the worker.
 */
export interface ResolveDependentUrisResult {
  entries: Record<string, SerializedSymbolTableEntry>;
}

/**
 * Iterate over symbols declared in `uri` and collect every file URI
 * whose declared symbols reference any of them. Returns a map from
 * dependent file URI to that file's serialized symbol table.
 *
 * @param symbolManager Symbol manager backing the data-owner.
 * @param uri Target file URI whose dependents we want to load.
 * @param symbolName Optional narrowing: only consider the symbol with
 *   this name declared in `uri`. When omitted, dependents of any symbol
 *   declared in `uri` are returned.
 *
 * Honors {@link findReferencesTo} via `ISymbolManager`. Self-references
 * (the target file referencing its own symbols) are excluded since the
 * caller already holds the target's own symbol table.
 */
export async function resolveDependentUris(
  symbolManager: ISymbolManager,
  uri: string,
  symbolName?: string,
): Promise<ResolveDependentUrisResult> {
  const declaredSymbols = await symbolManager.findSymbolsInFile(uri);
  const dependentUris = new Set<string>();

  for (const symbol of declaredSymbols) {
    if (symbolName && symbol.name !== symbolName) continue;
    const refs = await symbolManager.findReferencesTo(symbol);
    for (const ref of refs) {
      if (!ref.fileUri) continue;
      // Skip self-references — caller already owns the target's table.
      if (ref.fileUri === uri) continue;
      dependentUris.add(ref.fileUri);
    }
  }

  const entries: Record<string, SerializedSymbolTableEntry> = {};
  for (const dependentUri of dependentUris) {
    const st = await symbolManager.getSymbolTableForFile(dependentUri);
    if (!st) continue;
    entries[dependentUri] = serializeSymbolTable(st);
  }

  return { entries };
}

function serializeSymbolTable(st: SymbolTable): SerializedSymbolTableEntry {
  return {
    symbols: st.getAllSymbols(),
    references: st.getAllReferences(),
    hierarchicalReferences: st.getAllHierarchicalReferences(),
    metadata: st.getMetadata(),
    fileUri: st.getFileUri(),
  };
}
