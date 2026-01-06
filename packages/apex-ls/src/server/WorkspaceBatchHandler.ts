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
import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  createQueuedItem,
  offer,
  Priority,
  SchedulerInitializationService,
} from '@salesforce/apex-lsp-parser-ast';
import { DocumentProcessingService } from '@salesforce/apex-lsp-compliant-services';

/**
 * Storage for workspace batches during transfer phase
 * Batches are stored here until all batches are received, then processed together
 */
interface WorkspaceBatchSession {
  sessionId: string;
  totalBatches: number;
  batches: Map<number, SendWorkspaceBatchParams>;
  receivedBatches: Set<number>;
  createdAt: number;
}

class WorkspaceBatchStorage {
  private sessions: Map<string, WorkspaceBatchSession> = new Map();
  private readonly logger = getLogger();
  private readonly SESSION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Store a batch for a workspace load session
   */
  storeBatch(params: SendWorkspaceBatchParams): string {
    // Use batchIndex 0 to determine session (first batch creates session)
    // For simplicity, we'll use a session ID based on totalBatches and timestamp
    // In practice, batches from same workspace load will have same totalBatches
    const sessionId = this.getSessionId(params);

    let session = this.sessions.get(sessionId);
    if (!session) {
      // Create new session
      session = {
        sessionId,
        totalBatches: params.totalBatches,
        batches: new Map(),
        receivedBatches: new Set(),
        createdAt: Date.now(),
      };
      this.sessions.set(sessionId, session);
      this.logger.debug(
        () =>
          `[BATCH-STORAGE] Created new session ${sessionId} for ${params.totalBatches} batches`,
      );
    }

    // Store the batch
    session.batches.set(params.batchIndex, params);
    session.receivedBatches.add(params.batchIndex);

    this.logger.debug(
      () =>
        `[BATCH-STORAGE] Stored batch ${params.batchIndex + 1}/${params.totalBatches} ` +
        `in session ${sessionId} (${session?.receivedBatches.size}/${session?.totalBatches} received)`,
    );

    return sessionId;
  }

  /**
   * Check if all batches for a session have been received
   */
  areAllBatchesReceived(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return false;
    }
    return (
      session.receivedBatches.size === session.totalBatches &&
      session.receivedBatches.size === session.batches.size
    );
  }

  /**
   * Get received batch count for a session
   */
  getReceivedBatchCount(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    return session?.receivedBatches.size ?? 0;
  }

  /**
   * Find session ID by totalBatches that has all batches received
   * Used for processing trigger
   */
  findCompleteSession(totalBatches: number): string | null {
    for (const [id, session] of this.sessions.entries()) {
      if (
        session.totalBatches === totalBatches &&
        this.areAllBatchesReceived(id)
      ) {
        return id;
      }
    }
    return null;
  }

  /**
   * Get all batches for a session, sorted by batchIndex
   */
  getBatches(sessionId: string): SendWorkspaceBatchParams[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }
    return Array.from(session.batches.values()).sort(
      (a, b) => a.batchIndex - b.batchIndex,
    );
  }

  /**
   * Remove a session (after processing)
   */
  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.logger.debug(() => `[BATCH-STORAGE] Removed session ${sessionId}`);
  }

  /**
   * Clean up old sessions (timeout)
   */
  cleanupOldSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.createdAt > this.SESSION_TIMEOUT_MS) {
        this.logger.warn(
          () =>
            `[BATCH-STORAGE] Cleaning up timed-out session ${sessionId} ` +
            `(${session.receivedBatches.size}/${session.totalBatches} batches received)`,
        );
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Generate session ID from batch params
   * Uses totalBatches and finds or creates a matching session
   * If multiple workspace loads happen simultaneously, this could create separate sessions
   */
  private getSessionId(params: SendWorkspaceBatchParams): string {
    // Find existing session with matching totalBatches that's not complete
    // This handles the case where batches arrive out of order
    for (const [sessionId, session] of this.sessions.entries()) {
      if (
        session.totalBatches === params.totalBatches &&
        !this.areAllBatchesReceived(sessionId)
      ) {
        // Check if this batch index is already in this session
        if (!session.receivedBatches.has(params.batchIndex)) {
          return sessionId;
        }
      }
    }

    // No matching session found - create new one
    // Use timestamp + totalBatches + random to ensure uniqueness
    const sessionId = `workspace-load-${Date.now()}-${params.totalBatches}-${Math.random().toString(36).slice(2, 9)}`;
    return sessionId;
  }
}

// Singleton instance
const batchStorage = new WorkspaceBatchStorage();

// Cleanup old sessions periodically
// Store interval ID so it can be cleared in tests
let cleanupIntervalId: NodeJS.Timeout | null = null;
let intervalInitialized = false;

/**
 * Initialize cleanup interval (called lazily to avoid creating it during tests)
 */
function initializeCleanupInterval(): void {
  if (intervalInitialized || cleanupIntervalId !== null) {
    return;
  }

  // Only create interval in production (not in test environment)
  // Check for test environment by looking at NODE_ENV or JEST_WORKER_ID
  const isTestEnvironment =
    typeof process !== 'undefined' &&
    (process.env.NODE_ENV === 'test' ||
      process.env.JEST_WORKER_ID !== undefined);

  if (!isTestEnvironment && typeof setInterval !== 'undefined') {
    cleanupIntervalId = setInterval(() => {
      batchStorage.cleanupOldSessions();
    }, 60000); // Every minute
    intervalInitialized = true;
  }
}

/**
 * Clear cleanup interval (for testing)
 */
export function clearCleanupInterval(): void {
  if (cleanupIntervalId !== null) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
  intervalInitialized = false;
}

// Initialize cleanup interval lazily (only in production)
// This prevents the interval from being created during test runs
if (
  typeof process !== 'undefined' &&
  process.env.NODE_ENV !== 'test' &&
  process.env.JEST_WORKER_ID === undefined
) {
  // Use setTimeout to defer initialization, allowing tests to run first
  if (typeof setTimeout !== 'undefined') {
    setTimeout(() => {
      initializeCleanupInterval();
    }, 0);
  }
}

/**
 * Clear all stored batches (for testing)
 */
export function clearBatchStorage(): void {
  batchStorage['sessions'].clear();
}

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
 * Background Effect that decompresses and processes a workspace batch
 * This runs asynchronously via the scheduler to avoid blocking the LSP request handler
 *
 * @param params Batch request parameters
 * @param compressedDataBase64 Base64-encoded compressed data (passed separately to avoid blocking decode)
 * @returns Effect that processes the batch
 */
function processWorkspaceBatchBackground(
  params: SendWorkspaceBatchParams,
  compressedDataBase64: string,
): Effect.Effect<void, never, never> {
  const logger = getLogger();

  return Effect.gen(function* () {
    logger.debug(
      () =>
        `[BACKGROUND] Processing workspace batch ${params.batchIndex + 1}/${
          params.totalBatches
        } (${params.fileMetadata.length} files)`,
    );

    // Decode base64 to Uint8Array
    const compressedData = yield* Effect.try({
      try: () => decodeBase64(compressedDataBase64),
      catch: (error) =>
        new Error(
          `Failed to decode base64 data: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
    });

    // Decompress ZIP archive (CPU-intensive, now in background)
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
      logger.error(
        () =>
          `Missing metadata entry in compressed batch ${params.batchIndex + 1}/${params.totalBatches}`,
      );
      return;
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

    // Collect all document open events from the batch
    const didOpenEvents: TextDocumentChangeEvent<TextDocument>[] = [];

    yield* Effect.forEach(
      metadata.fileMetadata,
      (fileMeta) =>
        Effect.gen(function* () {
          // Get file content from decompressed files
          const fileContent = decompressedFiles[fileMeta.uri];
          if (!fileContent) {
            logger.warn(
              () => `File content not found in batch for URI: ${fileMeta.uri}`,
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

          didOpenEvents.push(didOpenEvent);
        }),
      { concurrency: 1 }, // Sequential processing to collect events
    );

    // Process batch via DocumentProcessingService
    if (didOpenEvents.length > 0) {
      const documentProcessingService = new DocumentProcessingService(logger);
      yield* Effect.promise(() =>
        documentProcessingService.processDocumentOpenBatch(didOpenEvents),
      );
      logger.debug(
        () =>
          `[BACKGROUND] Successfully processed workspace batch ${params.batchIndex + 1}/${params.totalBatches}: ` +
          `${didOpenEvents.length} files processed`,
      );
    }
  }).pipe(
    Effect.catchAll((error: unknown) =>
      Effect.gen(function* () {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(
          () =>
            '[BACKGROUND] Error processing workspace batch ' +
            `${params.batchIndex + 1}/${params.totalBatches}: ${errorMessage}`,
        );
        // Errors are logged but don't fail the Effect
        return undefined;
      }),
    ),
  );
}

/**
 * Process all stored batches for a session
 * This is called when all batches have been received
 */
function processStoredBatches(
  sessionId: string,
  batches: SendWorkspaceBatchParams[],
): Effect.Effect<void, never, never> {
  const logger = getLogger();

  return Effect.gen(function* () {
    logger.debug(
      () =>
        `[BATCH-PROCESSING] Processing ${batches.length} stored batches for session ${sessionId}`,
    );

    // Ensure scheduler is initialized
    const schedulerService = SchedulerInitializationService.getInstance();
    yield* Effect.promise(() => schedulerService.ensureInitialized());

    // Process each batch via scheduler
    for (const batchParams of batches) {
      const backgroundProcessingEffect = processWorkspaceBatchBackground(
        batchParams,
        batchParams.compressedData,
      );

      const queuedItem = yield* createQueuedItem(
        backgroundProcessingEffect,
        'workspace-batch',
      );
      yield* offer(Priority.Low, queuedItem);

      logger.debug(
        () =>
          `[BATCH-PROCESSING] Enqueued batch ${batchParams.batchIndex + 1}/${batchParams.totalBatches} ` +
          `(${batchParams.fileMetadata.length} files) for processing`,
      );
    }

    // Remove session after processing
    batchStorage.removeSession(sessionId);
    logger.debug(
      () =>
        `[BATCH-PROCESSING] Completed processing all batches for session ${sessionId}`,
    );
  }).pipe(
    Effect.catchAll((error: unknown) =>
      Effect.gen(function* () {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(
          () =>
            `[BATCH-PROCESSING] Error processing batches for session ${sessionId}: ${errorMessage}`,
        );
        // Remove session even on error to prevent memory leak
        batchStorage.removeSession(sessionId);
        return undefined;
      }),
    ),
  );
}

/**
 * Handler for workspace batch requests
 * Stores batches immediately and returns success without processing
 * Processing happens separately via apex/processWorkspaceBatches request
 *
 * @param params Batch request parameters
 * @returns Promise that resolves immediately after storing
 */
export async function handleWorkspaceBatchRequest(
  params: SendWorkspaceBatchParams,
): Promise<SendWorkspaceBatchResult> {
  const logger = getLogger();

  try {
    logger.debug(
      () =>
        `📦 Received workspace batch ${params.batchIndex + 1}/${
          params.totalBatches
        } (${params.fileMetadata.length} files) - storing for later processing`,
    );

    // Store the batch (synchronous, fast operation)
    const sessionId = batchStorage.storeBatch(params);

    const receivedCount = batchStorage.getReceivedBatchCount(sessionId);
    logger.debug(
      () =>
        `[BATCH-STORAGE] Stored batch ${params.batchIndex + 1}/${params.totalBatches} ` +
        `(${receivedCount}/${params.totalBatches} received for session ${sessionId})`,
    );

    // Return immediately - no processing happens here
    return {
      success: true,
      enqueuedCount: params.fileMetadata.length,
      stored: true,
      receivedCount,
      totalBatches: params.totalBatches,
    } as SendWorkspaceBatchResult;
  } catch (error) {
    logger.error(
      () =>
        `Error storing workspace batch ${params.batchIndex + 1}/${params.totalBatches}: ${
          error instanceof Error ? error.message : String(error)
        }`,
    );

    return {
      success: false,
      enqueuedCount: 0,
      error: error instanceof Error ? error.message : String(error),
    } as SendWorkspaceBatchResult;
  }
}

/**
 * Handler for processing stored workspace batches
 * Called after all batches have been sent to trigger processing
 *
 * @param params Processing request parameters
 * @returns Promise that resolves when processing is enqueued
 */
export async function handleProcessWorkspaceBatchesRequest(params: {
  totalBatches: number;
}): Promise<{ success: boolean; error?: string }> {
  const logger = getLogger();

  try {
    // Find session with matching totalBatches that has all batches
    const sessionId = batchStorage.findCompleteSession(params.totalBatches);

    if (!sessionId) {
      logger.warn(
        () =>
          `[BATCH-PROCESSING] No complete session found for ${params.totalBatches} batches`,
      );
      return {
        success: false,
        error: `No complete batch session found for ${params.totalBatches} batches`,
      };
    }

    logger.debug(
      () =>
        `[BATCH-PROCESSING] Processing all batches for session ${sessionId}`,
    );

    // Get all batches sorted by index
    const batches = batchStorage.getBatches(sessionId);

    // Fork processing to avoid blocking request handler
    Effect.runPromise(
      Effect.forkDaemon(processStoredBatches(sessionId, batches)),
    )
      .then(() => {
        logger.debug(
          () =>
            `[BATCH-PROCESSING] Started background processing for session ${sessionId}`,
        );
      })
      .catch((error) => {
        logger.error(
          () =>
            '[BATCH-PROCESSING] Failed to start batch processing: ' +
            `${error instanceof Error ? error.message : String(error)}`,
        );
      });

    return { success: true };
  } catch (error) {
    logger.error(
      () =>
        `Error processing workspace batches: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
