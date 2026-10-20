/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { zipSync } from 'fflate';
import type {
  WorkspaceFileBatch,
  WorkspaceFileMetadata,
} from '@salesforce/apex-lsp-shared';

export interface WorkspaceFileInput {
  readonly uri: string;
  readonly version: number;
  readonly content: string;
  readonly namespace?: string;
}

export function createWorkspaceFileBatches(
  files: readonly WorkspaceFileInput[],
  batchSize: number,
): readonly WorkspaceFileBatch[] {
  if (!Number.isSafeInteger(batchSize) || batchSize <= 0) {
    throw new RangeError('Workspace batch size must be a positive integer.');
  }

  const totalBatches = Math.ceil(files.length / batchSize);
  const batches: WorkspaceFileBatch[] = [];

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex += 1) {
    const batchFiles = files.slice(
      batchIndex * batchSize,
      (batchIndex + 1) * batchSize,
    );
    const fileMetadata: WorkspaceFileMetadata[] = batchFiles.map((file) => ({
      uri: file.uri,
      version: file.version,
      namespace: file.namespace,
    }));

    batches.push({
      batchIndex,
      totalBatches,
      isLastBatch: batchIndex === totalBatches - 1,
      fileMetadata,
      files: batchFiles.map((file) => ({
        uri: file.uri,
        version: file.version,
        content: file.content,
        namespace: file.namespace,
      })),
    });
  }

  return batches;
}

export function compressWorkspaceFileBatch(
  batch: WorkspaceFileBatch,
): Uint8Array {
  try {
    const encoder = new TextEncoder();
    const zipEntries: Record<string, Uint8Array> = {};

    for (const file of batch.files) {
      zipEntries[file.uri] = encoder.encode(file.content);
    }

    zipEntries['__metadata.json'] = encoder.encode(
      JSON.stringify({
        batchIndex: batch.batchIndex,
        totalBatches: batch.totalBatches,
        isLastBatch: batch.isLastBatch,
        fileMetadata: batch.fileMetadata,
      }),
    );

    return zipSync(zipEntries, { level: 6 });
  } catch (error) {
    throw new Error(
      `Failed to compress batch ${batch.batchIndex}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export function encodeWorkspaceBatchForTransport(
  compressed: Uint8Array,
): string {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(compressed).toString('base64');
    }

    return btoa(
      Array.from(compressed)
        .map((byte) => String.fromCharCode(byte))
        .join(''),
    );
  } catch (error) {
    throw new Error(
      `Failed to encode batch for transport: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
