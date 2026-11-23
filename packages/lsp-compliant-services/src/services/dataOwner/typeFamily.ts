/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import {
  inTypeSymbolGroup,
  SymbolKind,
  type ApexSymbol,
  type ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';
import type { ApexStorageManager } from '../../storage/ApexStorageManager';

/** The slice of the data-owner services the type-graph helpers read. */
export interface TypeGraphHost {
  readonly symbolManager: ISymbolManager;
  readonly storageManager: ApexStorageManager;
}

/**
 * Walk the type family (ancestors and descendants) for a given type.
 * Returns all transitive supertypes and subtypes, filtered to type symbols.
 * Reusable helper for hierarchy-aware rename validation — will be extended
 * in WI 5.2 (renameMethod) to handle interfaces + implementors.
 *
 * @param svc Data-owner services with symbolManager access
 * @param definingType The type whose family to walk
 * @returns Object with ancestors and descendants arrays
 */
export function walkTypeFamily(
  svc: TypeGraphHost,
  definingType: ApexSymbol,
): Effect.Effect<
  { ancestors: ApexSymbol[]; descendants: ApexSymbol[] },
  never,
  never
> {
  return Effect.gen(function* () {
    const allAncestors = yield* Effect.promise(() =>
      svc.symbolManager.findSupertypes(definingType),
    );
    const ancestors = allAncestors.filter(inTypeSymbolGroup);

    const allDescendants = yield* Effect.promise(() =>
      svc.symbolManager.findSubtypes(definingType),
    );
    const descendants = allDescendants.filter(inTypeSymbolGroup);

    return { ancestors, descendants };
  });
}

/**
 * Read a type's declared members from its BLOCK scope, guaranteeing the canonical
 * table is FULL-detail AND known-complete first. Batch-loaded files are served at
 * public-api detail (which drops private/protected/default members) and a
 * recovered/unknown table can silently drop declarations, so a naive read risks a
 * truncated set. (Re-)enriches from retained source to establish completeness, and
 * FAILS (with a message) when it cannot — callers preserve uncertainty rather than
 * trust an incomplete set. Shared by CheckMemberConflicts (4.0 conflict verdict)
 * and ResolveMethodRenameFamily (5.2 override discovery); callers re-tag the
 * string failure to their own error type.
 */
export function getTypeMembersFullDetail(
  svc: TypeGraphHost,
  type: ApexSymbol,
): Effect.Effect<ApexSymbol[], string, never> {
  return Effect.gen(function* () {
    let typeTable = yield* Effect.promise(() =>
      svc.symbolManager.getSymbolTableForFile(type.fileUri),
    );
    const isFullAndComplete = (
      t: typeof typeTable | null | undefined,
    ): boolean =>
      t?.getDetailLevel() === 'full' &&
      t.getMetadata().parseCompleteness === 'complete';
    if (!isFullAndComplete(typeTable)) {
      const doc = yield* Effect.promise(() =>
        svc.storageManager.getStorage().getDocument(type.fileUri),
      );
      const text = doc?.getText();
      if (!text) {
        return yield* Effect.fail(
          `Cannot read members for ${type.fileUri}: source text unavailable to ` +
            'establish a complete full-detail parse, so non-public members ' +
            'cannot be reliably inspected.',
        );
      }
      yield* svc.symbolManager.enrichToLevel(type.fileUri, 'full', text);
      typeTable = yield* Effect.promise(() =>
        svc.symbolManager.getSymbolTableForFile(type.fileUri),
      );
      if (!isFullAndComplete(typeTable)) {
        return yield* Effect.fail(
          `Cannot read members for ${type.fileUri}: could not establish a ` +
            'complete full-detail parse (canonical table at ' +
            `${typeTable?.getDetailLevel() ?? 'none'} / ` +
            `${typeTable?.getMetadata().parseCompleteness ?? 'unknown'}); the ` +
            'member set may be incomplete.',
        );
      }
    }
    if (!typeTable) {
      return yield* Effect.fail(
        `Cannot read members: no symbol table for ${type.fileUri}.`,
      );
    }
    // Members are children of the type's BLOCK scope, not the type itself.
    const blockSymbol = typeTable
      .getSymbolsInScope(type.id)
      .find((s) => s.kind === SymbolKind.Block);
    if (!blockSymbol) return [] as ApexSymbol[];
    return typeTable.getSymbolsInScope(blockSymbol.id);
  });
}
