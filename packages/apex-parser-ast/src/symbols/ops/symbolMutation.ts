/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import type { CommentAssociation } from '../../parser/listeners/ApexCommentCollectorListener';
import { SymbolIndexStore } from '../services/symbolIndexStore';
import { ReferenceStore } from '../services/referenceStore';
import { CacheStore } from '../services/cacheStore';
import { FileStateStore } from '../services/fileStateStore';
import { createFileUri } from '../../types/ProtocolHandler';
import { extractFilePathFromUri } from '../../types/UriBasedIdGenerator';

type MutationDeps =
  | SymbolIndexStore
  | ReferenceStore
  | CacheStore
  | FileStateStore;

/** Remove a file and all its symbols from the graph, cache, and state */
export const removeFile = (
  fileUri: string,
): Effect.Effect<void, never, MutationDeps> =>
  Effect.gen(function* () {
    const properUri = createFileUri(fileUri);
    const normalizedUri = extractFilePathFromUri(properUri);

    const index = yield* SymbolIndexStore;
    yield* index.removeFile(normalizedUri);

    const fileState = yield* FileStateStore;
    yield* fileState.removeFileMetadata(normalizedUri);
    yield* fileState.removeLastProcessedTableState(normalizedUri);

    const cache = yield* CacheStore;
    yield* cache.invalidatePattern(normalizedUri);
  });

/** Clear all symbols, references, cache, and state */
export const clear = (): Effect.Effect<void, never, MutationDeps> =>
  Effect.gen(function* () {
    const index = yield* SymbolIndexStore;
    yield* index.clear();

    const refs = yield* ReferenceStore;
    yield* refs.clear();

    const cache = yield* CacheStore;
    yield* cache.clear();

    const fileState = yield* FileStateStore;
    yield* fileState.clear();
  });

/** Optimize memory by cleaning up caches */
export const optimizeMemory = (): Effect.Effect<void, never, CacheStore> =>
  Effect.gen(function* () {
    const cache = yield* CacheStore;
    yield* cache.optimize();
  });

/** Store per-file comment associations */
export const setCommentAssociations = (
  fileUri: string,
  associations: CommentAssociation[],
): Effect.Effect<void, never, FileStateStore> =>
  Effect.gen(function* () {
    const fileState = yield* FileStateStore;
    yield* fileState.setCommentAssociations(fileUri, associations || []);
  });
