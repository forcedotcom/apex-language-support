/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { unzipSync } from 'fflate';
import type {
  ProcessWorkspaceBatchesParams,
  SendWorkspaceBatchParams,
  SendWorkspaceBatchResult,
} from '@salesforce/apex-lsp-shared';
import {
  getLogger,
  ApexSettingsManager,
  LSP_SPAN_NAMES,
} from '@salesforce/apex-lsp-shared';
import { provideCoordinatorTracing } from '@salesforce/apex-lsp-shared/observability/coordinatorEffectTracing';
import { context as otelContext } from '@opentelemetry/api';
import { extractTraceContext } from './traceContextInjection';

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
    const sessionId = params.sessionId.trim();
    if (!sessionId) {
      throw new Error('Workspace batch sessionId must not be empty');
    }
    if (!Number.isInteger(params.totalBatches) || params.totalBatches < 1) {
      throw new Error(
        `Invalid totalBatches ${params.totalBatches} for session ${sessionId}`,
      );
    }
    if (
      !Number.isInteger(params.batchIndex) ||
      params.batchIndex < 0 ||
      params.batchIndex >= params.totalBatches
    ) {
      throw new Error(
        `Invalid batchIndex ${params.batchIndex} for ${params.totalBatches} batches`,
      );
    }

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
    } else if (session.totalBatches !== params.totalBatches) {
      throw new Error(
        `Workspace session ${sessionId} expected ${session.totalBatches} batches, ` +
          `received ${params.totalBatches}`,
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

// ---------------------------------------------------------------------------
// Data-owner batch dispatch
// ---------------------------------------------------------------------------

export type BatchIngestionDispatcher = (
  sessionId: string,
  entries: Array<{
    uri: string;
    content: string;
    languageId: string;
    version: number;
  }>,
) => Promise<{ processedCount: number }>;

let batchIngestionDispatcher: BatchIngestionDispatcher | null = null;

export function setBatchIngestionDispatcher(
  dispatcher: BatchIngestionDispatcher | null,
): void {
  batchIngestionDispatcher = dispatcher;
  getLogger().debug(
    () => `Batch ingestion dispatcher ${dispatcher ? 'set' : 'cleared'}`,
  );
}

/**
 * How long {@link processStoredBatches} waits for the worker dispatcher to be
 * wired before falling through to coordinator-local processing. Configurable
 * so tests can shrink it; production keeps the 5s bootstrap-race window.
 */
let batchDispatcherWaitMs = 5000;

export function setBatchDispatcherWaitMs(ms: number): void {
  batchDispatcherWaitMs = ms;
}

export function getBatchIngestionDispatcher(): BatchIngestionDispatcher | null {
  return batchIngestionDispatcher;
}

export type WorkspaceLoadSessionDispatcher = (msg: {
  _tag: 'BeginWorkspaceLoadSession' | 'DrainDeferredReferences';
  sessionId?: string;
}) => Promise<unknown>;

let workspaceLoadSessionDispatcher: WorkspaceLoadSessionDispatcher | null =
  null;

export function setWorkspaceLoadSessionDispatcher(
  dispatcher: WorkspaceLoadSessionDispatcher | null,
): void {
  workspaceLoadSessionDispatcher = dispatcher;
  getLogger().debug(
    () => `Workspace load session dispatcher ${dispatcher ? 'set' : 'cleared'}`,
  );
}

export function getWorkspaceLoadSessionDispatcher(): WorkspaceLoadSessionDispatcher | null {
  return workspaceLoadSessionDispatcher;
}

export type DataOwnerCompileDispatcher = (params: {
  sessionId: string;
  entries: Array<{
    uri: string;
    content: string;
    languageId: string;
    version: number;
  }>;
  traceContext?: string;
}) => Promise<{ compiledCount: number; errorCount: number; elapsedMs: number }>;

let dataOwnerCompileDispatcher: DataOwnerCompileDispatcher | null = null;

export function setDataOwnerCompileDispatcher(
  dispatcher: DataOwnerCompileDispatcher | null,
): void {
  dataOwnerCompileDispatcher = dispatcher;
  getLogger().debug(
    () => `Data owner compile dispatcher ${dispatcher ? 'set' : 'cleared'}`,
  );
}

export function getDataOwnerCompileDispatcher(): DataOwnerCompileDispatcher | null {
  return dataOwnerCompileDispatcher;
}

export type CrossFileEnrichmentDispatcher = (
  fileUris: string[],
) => Promise<{ resolved: number; failed: number }>;

let crossFileEnrichmentDispatcher: CrossFileEnrichmentDispatcher | null = null;

export function setCrossFileEnrichmentDispatcher(
  dispatcher: CrossFileEnrichmentDispatcher | null,
): void {
  crossFileEnrichmentDispatcher = dispatcher;
  getLogger().debug(
    () => `Cross-file enrichment dispatcher ${dispatcher ? 'set' : 'cleared'}`,
  );
}

export function getCrossFileEnrichmentDispatcher(): CrossFileEnrichmentDispatcher | null {
  return crossFileEnrichmentDispatcher;
}

let ingestionCompleteCallback: (() => void) | null = null;

export function setIngestionCompleteCallback(cb: () => void): void {
  ingestionCompleteCallback = cb;
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

type BatchEntry = {
  uri: string;
  content: string;
  languageId: string;
  version: number;
};

function extractBatchEntries(compressedDataBase64: string): BatchEntry[] {
  const compressedData = decodeBase64(compressedDataBase64);
  const decompressedFiles = unzipSync(compressedData);

  const metadataEntry = decompressedFiles['__metadata.json'];
  if (!metadataEntry) {
    throw new Error('Missing __metadata.json in compressed batch');
  }

  const decoder = new TextDecoder();
  const metadata = JSON.parse(decoder.decode(metadataEntry)) as {
    fileMetadata: Array<{ uri: string; version: number }>;
  };

  const entries: BatchEntry[] = [];

  for (const fileMeta of metadata.fileMetadata) {
    const fileContent = decompressedFiles[fileMeta.uri];
    if (!fileContent) continue;
    entries.push({
      uri: fileMeta.uri,
      content: decoder.decode(fileContent),
      languageId: 'apex',
      version: fileMeta.version,
    });
  }

  return entries;
}

/**
 * Process all stored batches for a session.
 *
 * Pipeline: decode → data-owner ingest → Effect Worker compilation →
 * data-owner commit and deferred-reference drain.
 */
function waitForBatchIngestionDispatcher(
  logger: ReturnType<typeof getLogger>,
  timeoutMs = batchDispatcherWaitMs,
  pollMs = 50,
): Effect.Effect<BatchIngestionDispatcher, Error, never> {
  return Effect.gen(function* () {
    if (batchIngestionDispatcher) {
      return batchIngestionDispatcher;
    }
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      yield* Effect.sleep(`${pollMs} millis`);
      if (batchIngestionDispatcher) {
        logger.debug(
          () => '[BATCH-PROCESSING] Worker dispatcher became available',
        );
        return batchIngestionDispatcher;
      }
    }
    return yield* Effect.fail(
      new Error(
        `Worker batch ingestion dispatcher unavailable after ${timeoutMs}ms`,
      ),
    );
  });
}

function processStoredBatches(
  sessionId: string,
  batches: SendWorkspaceBatchParams[],
  totalFiles: number,
): Effect.Effect<void, never, never> {
  const logger = getLogger();

  const effect = Effect.gen(function* () {
    // Wrap entire processing in root span - yielded properly
    yield* Effect.withSpan(LSP_SPAN_NAMES.WORKSPACE_LOAD_TOTAL, {
      attributes: {
        'workspace.session_id': sessionId,
        'workspace.batch_count': batches.length,
        'workspace.total_files': totalFiles,
      },
    })(
      Effect.gen(function* () {
        const dispatcher = yield* waitForBatchIngestionDispatcher(logger);

        const batchStartTime = Date.now();
        logger.debug(
          () =>
            `[BATCH-PROCESSING] Processing ${batches.length} stored batches for session ${sessionId}`,
        );

        const entries = yield* decodeBatches(batches, logger);
        // The decoded entries now own the source content. Release the now
        // redundant base64/ZIP session payload before compilation begins.
        batchStorage.removeSession(sessionId);
        yield* processViaDataOwner(sessionId, entries, dispatcher, logger);
        const fileUris = entries.map((e) => e.uri);

        const totalElapsed = Date.now() - batchStartTime;
        const actualFiles = totalFiles || batches.length * 100;
        const throughput =
          totalElapsed > 0
            ? ((actualFiles / totalElapsed) * 1000).toFixed(0)
            : '∞';
        logger.info(
          () =>
            `[BATCH-PROCESSING] Completed session ${sessionId}: ` +
            `${batches.length} batches, ~${actualFiles} files in ${totalElapsed}ms ` +
            `(${throughput} files/sec)`,
        );
        ingestionCompleteCallback?.();

        const settings = ApexSettingsManager.getInstance().getSettings();
        if (
          settings.apex.deferredReferenceProcessing?.enableCrossFileDeferral &&
          crossFileEnrichmentDispatcher &&
          fileUris.length > 0
        ) {
          yield* Effect.withSpan(
            LSP_SPAN_NAMES.WORKSPACE_CROSS_FILE_ENRICHMENT,
            {
              attributes: {
                'workspace.session_id': sessionId,
                'workspace.file_count': fileUris.length,
              },
            },
          )(
            Effect.gen(function* () {
              logger.info(
                () =>
                  `[CROSS-FILE] Dispatching enrichment for ${fileUris.length} files`,
              );
              try {
                const result = yield* Effect.tryPromise({
                  try: () => crossFileEnrichmentDispatcher!(fileUris),
                  catch: (e) => e as Error,
                });
                logger.info(
                  () =>
                    `[CROSS-FILE] Enrichment complete: ${result.resolved} resolved, ${result.failed} failed`,
                );
              } catch (err) {
                logger.error(
                  () => `[CROSS-FILE] Enrichment dispatch failed: ${err}`,
                );
              }
            }),
          );
        }
      }),
    ); // Close the workspace.load.total span
  });

  return effect.pipe(
    Effect.catchAll((error: unknown) =>
      Effect.gen(function* () {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(
          () =>
            `[BATCH-PROCESSING] Error for session ${sessionId}: ${errorMessage}`,
        );
        batchStorage.removeSession(sessionId);
        ingestionCompleteCallback?.();
        return undefined;
      }),
    ),
  );
}

function decodeBatches(
  batches: SendWorkspaceBatchParams[],
  logger: ReturnType<typeof getLogger>,
): Effect.Effect<BatchEntry[], Error, never> {
  return Effect.gen(function* () {
    const allEntries: BatchEntry[] = [];

    for (const batchParams of batches) {
      const entries = yield* Effect.withSpan(
        LSP_SPAN_NAMES.WORKSPACE_BATCH_DECODE,
        {
          attributes: {
            'workspace.batch_index': batchParams.batchIndex,
            'workspace.batch_total': batchParams.totalBatches,
            'workspace.file_count': batchParams.fileMetadata.length,
          },
        },
      )(
        Effect.gen(function* () {
          const t0 = Date.now();
          const entries = yield* Effect.try({
            try: () => extractBatchEntries(batchParams.compressedData),
            catch: (e) =>
              new Error(`Decode failed batch ${batchParams.batchIndex}: ${e}`),
          });
          const decodeMs = Date.now() - t0;

          logger.debug(
            () =>
              `[BATCH-DECODE] Batch ${batchParams.batchIndex + 1}/${batchParams.totalBatches}: ` +
              `${entries.length} files (${decodeMs}ms)`,
          );

          return entries;
        }),
      );

      allEntries.push(...entries);
    }

    return allEntries;
  });
}

function processViaDataOwner(
  sessionId: string,
  entries: BatchEntry[],
  dispatcher: BatchIngestionDispatcher,
  logger: ReturnType<typeof getLogger>,
): Effect.Effect<void, Error, never> {
  return Effect.gen(function* () {
    const CHUNK_SIZE = 100;

    // Begin workspace load session - activates deferred cross-file resolution mode
    // on the data-owner for all subsequent UpdateSymbolSubset write-backs until
    // DrainDeferredReferences is called after all chunks complete.
    const sessionDispatcher = workspaceLoadSessionDispatcher;
    const dataOwnerCompile = dataOwnerCompileDispatcher;
    if (!sessionDispatcher || !dataOwnerCompile) {
      return yield* Effect.fail(
        new Error(
          'Worker workspace load requires session and data-owner compilation dispatchers',
        ),
      );
    }

    yield* Effect.tryPromise({
      try: () =>
        sessionDispatcher({
          _tag: 'BeginWorkspaceLoadSession',
          sessionId,
        }),
      catch: (e) => e as Error,
    });
    logger.info(() => `[BATCH] Begin workspace load session: ${sessionId}`);

    yield* Effect.withSpan('workspace.batch.ingest', {
      attributes: {
        'workspace.session_id': sessionId,
        'workspace.total_files': entries.length,
        'workspace.chunk_size': CHUNK_SIZE,
      },
    })(
      Effect.gen(function* () {
        for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
          const chunk = entries.slice(i, i + CHUNK_SIZE);
          const chunkIndex = Math.floor(i / CHUNK_SIZE);
          const totalChunks = Math.ceil(entries.length / CHUNK_SIZE);
          const contentChars = chunk.reduce(
            (total, entry) => total + entry.content.length,
            0,
          );
          const t0 = Date.now();
          const result = yield* Effect.withSpan(
            LSP_SPAN_NAMES.WORKSPACE_BATCH_INGEST_CHUNK,
            {
              attributes: {
                'workspace.session_id': sessionId,
                'workspace.chunk_index': chunkIndex,
                'workspace.chunk_total': totalChunks,
                'workspace.file_count': chunk.length,
                'workspace.content_chars': contentChars,
              },
            },
          )(
            Effect.gen(function* () {
              const dispatched = yield* Effect.tryPromise({
                try: () => dispatcher(sessionId, chunk),
                catch: (e) => e as Error,
              });
              yield* Effect.annotateCurrentSpan({
                'workspace.processed_count': dispatched.processedCount,
              });
              return dispatched;
            }),
          );
          const ingestMs = Date.now() - t0;

          logger.debug(
            () =>
              `[BATCH-INGEST] Chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ` +
              `${result.processedCount} files (${ingestMs}ms)`,
          );
        }
      }),
    );

    yield* Effect.withSpan('workspace.batch.compile', {
      attributes: {
        'workspace.session_id': sessionId,
        'workspace.total_files': entries.length,
      },
    })(
      Effect.gen(function* () {
        const CHUNK_SIZE = 100;
        const totalChunks = Math.ceil(entries.length / CHUNK_SIZE);

        logger.info(
          () =>
            `[BATCH-COMPILE] Starting post-ingest compilation for session ${sessionId}: ` +
            `${entries.length} files in ${totalChunks} chunks`,
        );

        const compileStartTime = Date.now();
        let totalCompiled = 0;
        let totalErrors = 0;

        for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
          const chunk = entries.slice(i, i + CHUNK_SIZE);
          const chunkIdx = Math.floor(i / CHUNK_SIZE) + 1;
          const contentChars = chunk.reduce(
            (total, entry) => total + entry.content.length,
            0,
          );
          try {
            const result = yield* Effect.withSpan(
              LSP_SPAN_NAMES.WORKSPACE_BATCH_COMPILE_CHUNK,
              {
                attributes: {
                  'workspace.session_id': sessionId,
                  'workspace.chunk_index': chunkIdx - 1,
                  'workspace.chunk_total': totalChunks,
                  'workspace.file_count': chunk.length,
                  'workspace.content_chars': contentChars,
                },
              },
            )(
              Effect.gen(function* () {
                const dispatched = yield* Effect.tryPromise({
                  try: () => dataOwnerCompile({ sessionId, entries: chunk }),
                  catch: (e) => e as Error,
                });
                yield* Effect.annotateCurrentSpan({
                  'workspace.compiled_count': dispatched.compiledCount,
                  'workspace.error_count': dispatched.errorCount,
                  'workspace.worker_elapsed_ms': dispatched.elapsedMs,
                });
                return dispatched;
              }),
            );
            totalCompiled += result.compiledCount;
            totalErrors += result.errorCount;
            logger.debug(
              () =>
                `[BATCH-COMPILE] Chunk ${chunkIdx}/${totalChunks}: ` +
                `compiled=${result.compiledCount}, errors=${result.errorCount}, ${result.elapsedMs}ms`,
            );
          } catch (err) {
            return yield* Effect.fail(
              err instanceof Error ? err : new Error(String(err)),
            );
          }
        }

        const totalElapsed = Date.now() - compileStartTime;
        const throughput =
          totalElapsed > 0
            ? ((totalCompiled / totalElapsed) * 1000).toFixed(0)
            : '∞';
        logger.info(
          () =>
            `[BATCH-COMPILE] Completed session ${sessionId}: ` +
            `compiled=${totalCompiled}, errors=${totalErrors}, ${totalElapsed}ms ` +
            `(${throughput} files/sec)`,
        );

        // End workspace load session and drain deferred resolutions.
        // This resolves ONLY supertype edges (INHERITANCE/INTERFACE_IMPLEMENTATION)
        // for go-to-implementation support. Ordinary cross-file refs are resolved
        // on-demand via PrerequisiteOrchestrationService per LSP request.
        yield* Effect.tryPromise({
          try: () =>
            sessionDispatcher({
              _tag: 'DrainDeferredReferences',
              sessionId,
            }),
          catch: (e) => e as Error,
        });
        logger.info(() => `[BATCH] End workspace load session: ${sessionId}`);
      }),
    );
  });
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
export async function handleProcessWorkspaceBatchesRequest(
  params: ProcessWorkspaceBatchesParams,
): Promise<{ success: boolean; error?: string }> {
  const logger = getLogger();

  try {
    const sessionId = params.sessionId.trim();

    if (
      !sessionId ||
      !batchStorage.areAllBatchesReceived(sessionId) ||
      batchStorage.getBatches(sessionId).length !== params.totalBatches
    ) {
      logger.warn(
        () =>
          `[BATCH-PROCESSING] Session ${sessionId || '<empty>'} is incomplete ` +
          `for ${params.totalBatches} batches`,
      );
      return {
        success: false,
        error: `Workspace batch session ${sessionId || '<empty>'} is incomplete`,
      };
    }

    logger.debug(
      () =>
        `[BATCH-PROCESSING] Processing all batches for session ${sessionId}`,
    );

    // Get all batches sorted by index
    const batches = batchStorage.getBatches(sessionId);

    // Process batches directly - wrapping with the root span inside processStoredBatches
    const totalFiles = batches.reduce(
      (sum, b) => sum + (b.fileMetadata?.length ?? 0),
      0,
    );

    // Start processing in background - use setTimeout(0) for cross-platform compatibility
    const parentContext = extractTraceContext(params.traceContext);
    setTimeout(() => {
      otelContext.with(parentContext, () => {
        Effect.runPromise(
          processStoredBatches(sessionId, batches, totalFiles).pipe(
            provideCoordinatorTracing(),
          ),
        ).catch((error) => {
          logger.error(
            () =>
              '[BATCH-PROCESSING] Background processing failed: ' +
              `${error instanceof Error ? error.message : String(error)}`,
          );
        });
      });
    }, 0);

    logger.debug(
      () =>
        `[BATCH-PROCESSING] Started background processing for session ${sessionId}`,
    );

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
