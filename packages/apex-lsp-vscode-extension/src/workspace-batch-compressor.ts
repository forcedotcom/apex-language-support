/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { Effect } from 'effect';
import { zipSync } from 'fflate';
import type {
  WorkspaceFileBatch,
  WorkspaceFileMetadata,
} from '@salesforce/apex-lsp-shared';

/**
 * File data structure for batch creation
 */
export interface FileData {
  readonly uri: vscode.Uri;
  readonly version: number;
  readonly content: string;
}

/**
 * Create batches of files for workspace loading
 * Pure Effect function that splits files into batches of specified size
 *
 * @param files Array of file data to batch
 * @param batchSize Number of files per batch
 * @returns Effect that resolves to array of WorkspaceFileBatch
 */
export function createFileBatches(
  files: readonly FileData[],
  batchSize: number,
): Effect.Effect<readonly WorkspaceFileBatch[], never, never> {
  return Effect.sync(() => {
    const batches: WorkspaceFileBatch[] = [];
    const totalBatches = Math.ceil(files.length / batchSize);

    for (let i = 0; i < files.length; i += batchSize) {
      const batchFiles = files.slice(i, i + batchSize);
      const batchIndex = Math.floor(i / batchSize);
      const isLastBatch = batchIndex === totalBatches - 1;

      const fileMetadata: WorkspaceFileMetadata[] = batchFiles.map((file) => ({
        uri: file.uri.toString(),
        version: file.version,
      }));

      batches.push({
        batchIndex,
        totalBatches,
        isLastBatch,
        fileMetadata,
        files: batchFiles.map((file) => ({
          uri: file.uri.toString(),
          version: file.version,
          content: file.content,
        })),
      });
    }

    return batches;
  });
}

/**
 * Compress a batch of files into a ZIP archive using fflate
 * Uses compression level 6 (default) for balanced compression/speed
 *
 * @param batch WorkspaceFileBatch to compress
 * @returns Effect that resolves to compressed Uint8Array or fails with Error
 */
export function compressBatch(
  batch: WorkspaceFileBatch,
): Effect.Effect<Uint8Array, Error, never> {
  return Effect.try({
    try: () => {
      // Create a map of file paths to content for ZIP creation
      const zipEntries: Record<string, Uint8Array> = {};

      // Add each file to the ZIP with URI as the key
      for (const file of batch.files) {
        // Convert string content to Uint8Array (UTF-8 encoded)
        const encoder = new TextEncoder();
        zipEntries[file.uri] = encoder.encode(file.content);
      }

      // Add metadata as a separate JSON entry
      const metadataJson = JSON.stringify({
        batchIndex: batch.batchIndex,
        totalBatches: batch.totalBatches,
        isLastBatch: batch.isLastBatch,
        fileMetadata: batch.fileMetadata,
      });
      const encoder = new TextEncoder();
      zipEntries['__metadata.json'] = encoder.encode(metadataJson);

      // Compress using fflate (compression level 6 is default)
      return zipSync(zipEntries, { level: 6 });
    },
    catch: (error) =>
      new Error(
        `Failed to compress batch ${batch.batchIndex}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ),
  });
}

/**
 * Encode compressed batch data as base64 string for JSON-RPC transport
 *
 * @param compressed Compressed Uint8Array data
 * @returns Effect that resolves to base64-encoded string or fails with Error
 */
export function encodeBatchForTransport(
  compressed: Uint8Array,
): Effect.Effect<string, Error, never> {
  return Effect.try({
    try: () => {
      // Convert Uint8Array to base64 string
      // For Node.js/browser compatibility, use a simple approach
      if (typeof Buffer !== 'undefined') {
        // Node.js environment
        return Buffer.from(compressed).toString('base64');
      } else {
        // Browser environment - convert to base64 manually
        const binary = Array.from(compressed)
          .map((byte) => String.fromCharCode(byte))
          .join('');
        return btoa(binary);
      }
    },
    catch: (error) =>
      new Error(
        `Failed to encode batch for transport: ${
          error instanceof Error ? error.message : String(error)
        }`,
      ),
  });
}

