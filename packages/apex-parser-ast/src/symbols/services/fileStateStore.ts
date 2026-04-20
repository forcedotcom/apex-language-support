/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap } from 'data-structure-typed';
import { Context, Effect, Layer } from 'effect';
import type { DetailLevel } from '../../parser/listeners/LayeredSymbolListenerBase';
import type { CommentAssociation } from '../../parser/listeners/ApexCommentCollectorListener';

/** Per-file tracking metadata */
export interface FileMetadata {
  fileUri: string;
  symbolCount: number;
  lastUpdated: number;
}

/**
 * Data service for per-file state: metadata, detail levels,
 * processed-table checksums, and comment associations.
 */
export interface FileStateStoreShape {
  readonly getFileMetadata: (
    fileUri: string,
  ) => Effect.Effect<FileMetadata | undefined>;
  readonly setFileMetadata: (
    fileUri: string,
    metadata: FileMetadata,
  ) => Effect.Effect<void>;
  readonly removeFileMetadata: (fileUri: string) => Effect.Effect<void>;
  readonly getAllFileMetadata: () => Effect.Effect<Map<string, FileMetadata>>;

  readonly getDetailLevel: (
    fileUri: string,
  ) => Effect.Effect<DetailLevel | undefined>;
  readonly setDetailLevel: (
    fileUri: string,
    level: DetailLevel,
  ) => Effect.Effect<void>;

  readonly getLastProcessedTableState: (
    fileUri: string,
  ) => Effect.Effect<string | undefined>;
  readonly setLastProcessedTableState: (
    fileUri: string,
    state: string,
  ) => Effect.Effect<void>;
  readonly removeLastProcessedTableState: (
    fileUri: string,
  ) => Effect.Effect<void>;

  readonly getCommentAssociations: (
    fileUri: string,
  ) => Effect.Effect<CommentAssociation[] | undefined>;
  readonly setCommentAssociations: (
    fileUri: string,
    associations: CommentAssociation[],
  ) => Effect.Effect<void>;

  readonly clear: () => Effect.Effect<void>;
}

export class FileStateStore extends Context.Tag('FileStateStore')<
  FileStateStore,
  FileStateStoreShape
>() {}

/** Shim Layer that delegates to existing HashMap fields */
export const fileStateStoreShim = (
  fileMetadata: HashMap<string, FileMetadata>,
  fileDetailLevels: HashMap<string, DetailLevel>,
  lastProcessedTableStateByFile: HashMap<string, string>,
  fileCommentAssociations: HashMap<string, CommentAssociation[]>,
): Layer.Layer<FileStateStore> =>
  Layer.succeed(FileStateStore, {
    getFileMetadata: (fileUri) =>
      Effect.sync(() => fileMetadata.get(fileUri) ?? undefined),
    setFileMetadata: (fileUri, metadata) =>
      Effect.sync(() => {
        fileMetadata.set(fileUri, metadata);
      }),
    removeFileMetadata: (fileUri) =>
      Effect.sync(() => {
        fileMetadata.delete(fileUri);
      }),
    getAllFileMetadata: () =>
      Effect.sync(() => {
        const result = new Map<string, FileMetadata>();
        for (const [k, v] of fileMetadata) {
          if (v !== undefined) result.set(k, v);
        }
        return result;
      }),

    getDetailLevel: (fileUri) =>
      Effect.sync(() => fileDetailLevels.get(fileUri) ?? undefined),
    setDetailLevel: (fileUri, level) =>
      Effect.sync(() => {
        fileDetailLevels.set(fileUri, level);
      }),

    getLastProcessedTableState: (fileUri) =>
      Effect.sync(
        () => lastProcessedTableStateByFile.get(fileUri) ?? undefined,
      ),
    setLastProcessedTableState: (fileUri, state) =>
      Effect.sync(() => {
        lastProcessedTableStateByFile.set(fileUri, state);
      }),
    removeLastProcessedTableState: (fileUri) =>
      Effect.sync(() => {
        lastProcessedTableStateByFile.delete(fileUri);
      }),

    getCommentAssociations: (fileUri) =>
      Effect.sync(() => fileCommentAssociations.get(fileUri) ?? undefined),
    setCommentAssociations: (fileUri, associations) =>
      Effect.sync(() => {
        fileCommentAssociations.set(fileUri, associations);
      }),

    clear: () =>
      Effect.sync(() => {
        fileMetadata.clear();
        fileDetailLevels.clear();
        lastProcessedTableStateByFile.clear();
        fileCommentAssociations.clear();
      }),
  });
