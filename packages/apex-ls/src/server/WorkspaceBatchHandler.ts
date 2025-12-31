/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { unzipSync } from 'fflate';
import { TextDocument } from 'vscode-languageserver-textdocument';
import type { TextDocumentChangeEvent } from 'vscode-languageserver';
import type {
  SendWorkspaceBatchParams,
  SendWorkspaceBatchResult,
} from '@salesforce/apex-lsp-shared';
import { dispatchProcessOnOpenDocument } from '@salesforce/apex-lsp-compliant-services';
import { getLogger } from '@salesforce/apex-lsp-shared';

/**
 * Decode base64 string to Uint8Array
 */
function decodeBase64(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return Buffer.from(base64, 'base64');
  } else {
    // Browser environment
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}

/**
 * Effect-based handler for workspace batch requests
 * Decompresses the batch and enqueues each file as a didOpen task
 *
 * @param params Batch request parameters
 * @returns Effect that resolves to batch response or fails with Error
 */
function handleWorkspaceBatchEffect(
  params: SendWorkspaceBatchParams,
): Effect.Effect<SendWorkspaceBatchResult, Error, never> {
  const logger = getLogger();

  return Effect.gen(function* () {
    logger.debug(
      () =>
        `Processing workspace batch ${params.batchIndex + 1}/${params.totalBatches} (${params.fileMetadata.length} files)`,
    );

    // Decode base64 to Uint8Array
    const compressedData = yield* Effect.try({
      try: () => decodeBase64(params.compressedData),
      catch: (error) =>
        new Error(
          `Failed to decode base64 data: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
    });

    // Decompress ZIP archive
    const decompressedFiles = yield* Effect.try({
      try: () => unzipSync(compressedData),
      catch: (error) =>
        new Error(
          `Failed to decompress batch: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
    });

    // Extract metadata
    const metadataEntry = decompressedFiles['__metadata.json'];
    if (!metadataEntry) {
      return yield* Effect.fail(
        new Error('Missing metadata entry in compressed batch'),
      );
    }

    // Parse metadata
    const metadata = yield* Effect.try({
      try: () => {
        const decoder = new TextDecoder();
        const metadataJson = decoder.decode(metadataEntry);
        return JSON.parse(metadataJson) as {
          batchIndex: number;
          totalBatches: number;
          isLastBatch: boolean;
          fileMetadata: Array<{ uri: string; version: number }>;
        };
      },
      catch: (error) =>
        new Error(
          `Failed to parse metadata: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
    });

    // Process each file in the batch
    let enqueuedCount = 0;

    yield* Effect.forEach(
      metadata.fileMetadata,
      (fileMeta) =>
        Effect.gen(function* () {
          // Get file content from decompressed files
          const fileContent = decompressedFiles[fileMeta.uri];
          if (!fileContent) {
            logger.warn(
              () =>
                `File content not found in batch for URI: ${fileMeta.uri}`,
            );
            return;
          }

          // Decode file content
          const decoder = new TextDecoder();
          const content = decoder.decode(fileContent);

          // Create TextDocument instance
          const document = TextDocument.create(
            fileMeta.uri,
            'apex',
            fileMeta.version,
            content,
          );

          // Create didOpen event
          const didOpenEvent: TextDocumentChangeEvent<TextDocument> = {
            document,
          };

          // Enqueue as didOpen task (fire-and-forget, processes asynchronously)
          dispatchProcessOnOpenDocument(didOpenEvent);
          enqueuedCount++;

          logger.debug(
            () =>
              `Enqueued didOpen task for ${fileMeta.uri} (version: ${fileMeta.version})`,
          );
        }),
      { concurrency: 1 }, // Sequential processing to avoid overwhelming the queue
    );

    logger.debug(
      () =>
        `Successfully processed batch ${params.batchIndex + 1}/${params.totalBatches}: ${enqueuedCount} files enqueued`,
    );

    return {
      success: true,
      enqueuedCount,
    } as SendWorkspaceBatchResult;
  });
}

/**
 * Handler function for workspace batch requests
 * Wraps the Effect-based handler for LSP compatibility
 *
 * @param params Batch request parameters
 * @returns Promise that resolves to batch response
 */
export async function handleWorkspaceBatch(
  params: SendWorkspaceBatchParams,
): Promise<SendWorkspaceBatchResult> {
  const logger = getLogger();

  try {
    return await Effect.runPromise(handleWorkspaceBatchEffect(params));
  } catch (error) {
    logger.error(
      () =>
        `Error processing workspace batch ${params.batchIndex + 1}/${params.totalBatches}: ${
          error instanceof Error ? error.message : String(error)
        }`,
    );

    return {
      success: false,
      enqueuedCount: 0,
      error:
        error instanceof Error ? error.message : String(error),
    } as SendWorkspaceBatchResult;
  }
}

