/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, Ref, Context, Layer } from 'effect';
import {
  Priority,
  getLogger,
  type EnumValue,
  toUint16,
} from '@salesforce/apex-lsp-shared';
import { DirectedVertex } from 'data-structure-typed';
import {
  metrics,
  createQueuedItem,
  offer,
} from '../queue/priority-scheduler-utils';
import { CaseInsensitiveHashMap } from '../utils/CaseInsensitiveMap';
import type { ApexSymbol, SymbolLocation } from '../types/symbol';
import type {
  ReferenceEdge,
  ReferenceType,
  ReferenceNode,
} from './ApexSymbolGraph';

/**
 * Deferred reference structure
 */
export type DeferredReference = {
  sourceSymbol: ApexSymbol;
  referenceType: EnumValue<typeof ReferenceType>;
  location: SymbolLocation;
  context?: {
    methodName?: string;
    parameterIndex?: number;
    isStatic?: boolean;
    namespace?: string;
  };
};

/**
 * Pending deferred reference structure
 */
export type PendingDeferredReference = {
  targetSymbolName: string;
  referenceType: EnumValue<typeof ReferenceType>;
  location: SymbolLocation;
  context?: {
    methodName?: string;
    parameterIndex?: number;
    isStatic?: boolean;
    namespace?: string;
  };
};

/**
 * Individual reference processing task
 */
export type DeferredReferenceTask = {
  readonly _tag: 'DeferredReferenceTask';
  readonly symbolName: string; // target symbol name
  readonly referenceIndex: number; // index in deferredReferences array
  readonly priority: Priority;
  readonly retryCount: number;
  readonly firstAttemptTime: number;
};

/**
 * Batched reference processing task (processes multiple references)
 */
export type BatchedDeferredReferenceTask = {
  readonly _tag: 'BatchedDeferredReferenceTask';
  readonly batchId: string; // Unique identifier for this batch (for log correlation)
  readonly symbolName: string; // target symbol name
  readonly startIndex: number; // starting index in deferredReferences array
  readonly endIndex: number; // ending index (exclusive) in deferredReferences array
  readonly priority: Priority;
  readonly retryCount: number;
  readonly firstAttemptTime: number;
};

/**
 * Pending reference retry task
 */
export type PendingDeferredReferenceTask = {
  readonly _tag: 'PendingDeferredReferenceTask';
  readonly sourceSymbolName: string;
  readonly referenceIndex: number; // index in pendingDeferredReferences array
  readonly priority: Priority;
  readonly retryCount: number;
  readonly firstAttemptTime: number;
};

/**
 * Result of processing a single reference
 */
export interface ReferenceProcessingResult {
  success: boolean;
  reason?: string;
  needsRetry?: boolean;
}

/**
 * Result of batch processing deferred references
 */
export interface BatchProcessingResult {
  needsRetry: boolean;
  reason: string;
  remainingCount?: number;
}

/**
 * Deferred processing metrics
 */
export interface DeferredProcessingMetrics {
  totalBatchesProcessed: number;
  totalItemsProcessed: number;
  totalSuccessCount: number;
  totalFailureCount: number;
  totalBatchDuration: number;
  lastBatchTime: number;
  activeTaskCount: number;
  queueDepthHistory: Array<{ timestamp: number; depth: number }>;
  lastMetricsLogTime: number;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalSymbols: number;
  totalVertices: number;
  totalEdges: number;
  memoryOptimizationLevel: string;
  estimatedMemorySavings: number;
}

/**
 * Deferred Reference Processor Service
 * Provides all dependencies needed for processing deferred references
 */
export class DeferredReferenceProcessorService extends Context.Tag(
  'DeferredReferenceProcessorService',
)<DeferredReferenceProcessorService, DeferredReferenceProcessorService.Impl>() {
  static readonly Live = (impl: DeferredReferenceProcessorService.Impl) =>
    Layer.succeed(this, impl);
}

export namespace DeferredReferenceProcessorService {
  export interface Impl {
    // Graph operations
    addEdge(
      sourceId: string,
      targetId: string,
      weight: number,
      edge: ReferenceEdge,
    ): boolean;
    getVertex(symbolId: string): DirectedVertex<ReferenceNode> | undefined;

    // Symbol lookups
    findSymbolByName(name: string): ApexSymbol[];
    getSymbolId(symbol: ApexSymbol, fileUri: string): string;

    // Storage access (mutable refs)
    deferredReferences: Ref.Ref<CaseInsensitiveHashMap<DeferredReference[]>>;
    pendingDeferredReferences: Ref.Ref<
      CaseInsensitiveHashMap<PendingDeferredReference[]>
    >;

    // Metrics (mutable refs)
    deferredProcessingMetrics: Ref.Ref<DeferredProcessingMetrics>;
    memoryStats: Ref.Ref<MemoryStats>;

    // Configuration
    deferredBatchSize: number;
    maxConcurrentReferencesPerSymbol?: number; // Limit parallel tasks per symbol
    yieldTimeThresholdMs?: number; // Time threshold (ms) - if batch exceeds this, yield more frequently

    // Queueing operations
    enqueueDeferredReferenceTask(
      task: DeferredReferenceTask,
    ): Effect.Effect<void, Error, never>;
    enqueuePendingReferenceTask(
      task: PendingDeferredReferenceTask,
    ): Effect.Effect<void, Error, never>;

    // Logger
    logger: ReturnType<typeof getLogger>;
  }
}

/**
 * Process a single deferred reference
 */
export function processDeferredReference(
  task: DeferredReferenceTask,
): Effect.Effect<
  ReferenceProcessingResult,
  never,
  DeferredReferenceProcessorService
> {
  return Effect.gen(function* () {
    const service = yield* DeferredReferenceProcessorService;

    // Get the specific reference by index
    const deferredRefs = yield* Ref.get(service.deferredReferences);
    const deferred = deferredRefs.get(task.symbolName);
    if (!deferred || !deferred[task.referenceIndex]) {
      return { success: false, reason: 'reference_not_found' };
    }

    const ref = deferred[task.referenceIndex];

    // Find target symbol
    const targetSymbols = service.findSymbolByName(task.symbolName);
    if (targetSymbols.length === 0) {
      return { success: false, reason: 'target_not_found', needsRetry: true };
    }

    // Update fileUri lazily if needed
    if (!ref.sourceSymbol.fileUri) {
      const sourceSymbols = service.findSymbolByName(ref.sourceSymbol.name);
      if (sourceSymbols.length > 0) {
        ref.sourceSymbol.fileUri = sourceSymbols[0].fileUri;
      }
    }

    // Find the source symbol in the graph
    const sourceSymbols = service.findSymbolByName(ref.sourceSymbol.name);
    const sourceSymbolInGraph = ref.sourceSymbol.fileUri
      ? sourceSymbols.find((s) => s.fileUri === ref.sourceSymbol.fileUri)
      : sourceSymbols[0];

    if (!sourceSymbolInGraph) {
      // Move to pending
      const pendingRefs = yield* Ref.get(service.pendingDeferredReferences);
      const pending = pendingRefs.get(ref.sourceSymbol.name) || [];
      pending.push({
        targetSymbolName: task.symbolName,
        referenceType: ref.referenceType,
        location: ref.location,
        context: ref.context,
      });
      yield* Ref.update(service.pendingDeferredReferences, (refs) => {
        const updated = new CaseInsensitiveHashMap(refs);
        updated.set(ref.sourceSymbol.name, pending);
        return updated;
      });

      service.logger.info(
        () =>
          'Source symbol not found for deferred reference: ' +
          `source=${ref.sourceSymbol.name} (kind=${ref.sourceSymbol.kind}, ` +
          `fileUri=${ref.sourceSymbol.fileUri || 'none'}), ` +
          `target=${task.symbolName}, ` +
          `refType=${String(ref.referenceType)}` +
          (ref.context?.methodName
            ? `, method=${ref.context.methodName}`
            : '') +
          ', will retry when source symbol is added',
      );

      return { success: false, reason: 'source_not_found', needsRetry: true };
    }

    // Process the single reference
    const targetSymbol = targetSymbols[0];
    const sourceId = service.getSymbolId(
      sourceSymbolInGraph,
      sourceSymbolInGraph.fileUri,
    );
    const targetId = service.getSymbolId(targetSymbol, targetSymbol.fileUri);

    const referenceEdge: ReferenceEdge = {
      type: ref.referenceType,
      sourceFileUri: sourceSymbolInGraph.fileUri,
      targetFileUri: targetSymbol.fileUri,
      context: ref.context
        ? {
            methodName: ref.context.methodName,
            parameterIndex: ref.context.parameterIndex
              ? toUint16(ref.context.parameterIndex)
              : undefined,
            isStatic: ref.context.isStatic,
            namespace: ref.context.namespace,
          }
        : undefined,
    };

    const edgeAdded = service.addEdge(sourceId, targetId, 1, referenceEdge);
    if (!edgeAdded) {
      service.logger.debug(
        () =>
          `Failed to add deferred reference edge: ${sourceId} -> ${targetId}`,
      );
      return { success: false, reason: 'edge_add_failed' };
    }

    // Update reference count
    const targetVertex = service.getVertex(targetId);
    if (targetVertex?.value) {
      targetVertex.value.referenceCount++;
    }

    // Update memory stats
    yield* Ref.update(service.memoryStats, (stats) => ({
      ...stats,
      totalEdges: stats.totalEdges + 1,
    }));

    // Remove this reference from deferred list
    yield* Ref.update(service.deferredReferences, (refs) => {
      const updated = new CaseInsensitiveHashMap(refs);
      const remaining =
        updated
          .get(task.symbolName)
          ?.filter((_, i) => i !== task.referenceIndex) || [];
      if (remaining.length === 0) {
        updated.delete(task.symbolName);
      } else {
        updated.set(task.symbolName, remaining);
      }
      return updated;
    });

    // Update metrics
    yield* Ref.update(service.deferredProcessingMetrics, (metrics) => ({
      ...metrics,
      totalItemsProcessed: metrics.totalItemsProcessed + 1,
      totalSuccessCount: metrics.totalSuccessCount + 1,
    }));

    return { success: true };
  });
}

/**
 * Process a single pending deferred reference
 */
export function processPendingDeferredReference(
  task: PendingDeferredReferenceTask,
): Effect.Effect<
  ReferenceProcessingResult,
  never,
  DeferredReferenceProcessorService
> {
  return Effect.gen(function* () {
    const service = yield* DeferredReferenceProcessorService;

    // Get the specific reference by index
    const pendingRefs = yield* Ref.get(service.pendingDeferredReferences);
    const pending = pendingRefs.get(task.sourceSymbolName);
    if (!pending || !pending[task.referenceIndex]) {
      return { success: false, reason: 'reference_not_found' };
    }

    const ref = pending[task.referenceIndex];

    // Find the source symbol
    const sourceSymbols = service.findSymbolByName(task.sourceSymbolName);
    if (sourceSymbols.length === 0) {
      return { success: false, reason: 'source_not_found', needsRetry: true };
    }

    // Find the target symbol by name
    const targetSymbols = service.findSymbolByName(ref.targetSymbolName);
    if (targetSymbols.length === 0) {
      service.logger.debug(
        () =>
          `Target symbol not found for pending deferred reference: ${ref.targetSymbolName}, ` +
          'will retry when target symbol is added',
      );
      return { success: false, reason: 'target_not_found', needsRetry: true };
    }

    const sourceSymbol = sourceSymbols[0];
    const targetSymbol = targetSymbols[0];
    const sourceId = service.getSymbolId(sourceSymbol, sourceSymbol.fileUri);
    const targetId = service.getSymbolId(targetSymbol, targetSymbol.fileUri);

    // Create optimized reference edge
    const referenceEdge: ReferenceEdge = {
      type: ref.referenceType,
      sourceFileUri: sourceSymbol.fileUri,
      targetFileUri: targetSymbol.fileUri,
      context: ref.context
        ? {
            methodName: ref.context.methodName,
            parameterIndex: ref.context.parameterIndex
              ? toUint16(ref.context.parameterIndex)
              : undefined,
            isStatic: ref.context.isStatic,
            namespace: ref.context.namespace,
          }
        : undefined,
    };

    // Add edge to graph
    const edgeAdded = service.addEdge(sourceId, targetId, 1, referenceEdge);
    if (!edgeAdded) {
      service.logger.debug(
        () =>
          `Failed to add pending deferred reference edge: ${sourceId} -> ${targetId}`,
      );
      return { success: false, reason: 'edge_add_failed' };
    }

    // Update reference count
    const targetVertex = service.getVertex(targetId);
    if (targetVertex?.value) {
      targetVertex.value.referenceCount++;
    }

    // Update memory stats
    yield* Ref.update(service.memoryStats, (stats) => ({
      ...stats,
      totalEdges: stats.totalEdges + 1,
    }));

    // Remove this reference from pending list
    yield* Ref.update(service.pendingDeferredReferences, (refs) => {
      const updated = new CaseInsensitiveHashMap(refs);
      const remaining =
        updated
          .get(task.sourceSymbolName)
          ?.filter((_, i) => i !== task.referenceIndex) || [];
      if (remaining.length === 0) {
        updated.delete(task.sourceSymbolName);
      } else {
        updated.set(task.sourceSymbolName, remaining);
      }
      return updated;
    });

    // Update metrics
    yield* Ref.update(service.deferredProcessingMetrics, (metrics) => ({
      ...metrics,
      totalItemsProcessed: metrics.totalItemsProcessed + 1,
      totalSuccessCount: metrics.totalSuccessCount + 1,
    }));

    return { success: true };
  });
}

/**
 * Process a batch of deferred references (more efficient than individual tasks)
 */
export function processBatchedDeferredReferences(
  task: BatchedDeferredReferenceTask,
): Effect.Effect<
  { processed: number; failed: number },
  never,
  DeferredReferenceProcessorService
> {
  return Effect.gen(function* () {
    const service = yield* DeferredReferenceProcessorService;
    const logger = service.logger;
    let processed = 0;
    let failed = 0;

    const deferredRefs = yield* Ref.get(service.deferredReferences);
    const deferred = deferredRefs.get(task.symbolName);
    if (!deferred) {
      logger.debug(
        () =>
          `[DEFERRED:BATCH:${task.batchId}] No deferred references found for symbol: ${task.symbolName}`,
      );
      return { processed: 0, failed: 0 };
    }

    const batchSize = task.endIndex - task.startIndex;
    const batch = deferred.slice(task.startIndex, task.endIndex);

    logger.debug(
      () =>
        `[DEFERRED:BATCH:${task.batchId}] Starting batch processing: ` +
        `symbol=${task.symbolName}, ` +
        `indices=${task.startIndex}-${task.endIndex - 1}, ` +
        `size=${batchSize}`,
    );

    // Find target symbol once for the batch
    const targetSymbols = service.findSymbolByName(task.symbolName);
    if (targetSymbols.length === 0) {
      // Target not found - will retry later
      logger.debug(
        () =>
          `[DEFERRED:BATCH:${task.batchId}] Target symbol not found: ${task.symbolName}, ` +
          'will retry later',
      );
      return { processed: 0, failed: batchSize };
    }

    const targetSymbol = targetSymbols[0];
    const targetId = service.getSymbolId(targetSymbol, targetSymbol.fileUri);

    const batchStartTime = Date.now();
    const YIELD_TIME_THRESHOLD_MS = service.yieldTimeThresholdMs ?? 50;

    for (let i = 0; i < batch.length; i++) {
      const ref = batch[i];
      if (!ref) continue;

      // Update fileUri lazily if needed
      if (!ref.sourceSymbol.fileUri) {
        const sourceSymbols = service.findSymbolByName(ref.sourceSymbol.name);
        if (sourceSymbols.length > 0) {
          ref.sourceSymbol.fileUri = sourceSymbols[0].fileUri;
        }
      }

      // Find the source symbol in the graph
      const sourceSymbols = service.findSymbolByName(ref.sourceSymbol.name);
      const sourceSymbolInGraph = ref.sourceSymbol.fileUri
        ? sourceSymbols.find((s) => s.fileUri === ref.sourceSymbol.fileUri)
        : sourceSymbols[0];

      if (!sourceSymbolInGraph) {
        // Move to pending
        const pendingRefs = yield* Ref.get(service.pendingDeferredReferences);
        const pending = pendingRefs.get(ref.sourceSymbol.name) || [];
        pending.push({
          targetSymbolName: task.symbolName,
          referenceType: ref.referenceType,
          location: ref.location,
          context: ref.context,
        });
        yield* Ref.update(service.pendingDeferredReferences, (refs) => {
          const updated = new CaseInsensitiveHashMap(refs);
          updated.set(ref.sourceSymbol.name, pending);
          return updated;
        });
        logger.debug(
          () =>
            `[DEFERRED:BATCH:${task.batchId}] Source symbol not found: ` +
            `source=${ref.sourceSymbol.name}, ` +
            `target=${task.symbolName}, ` +
            'moved to pending',
        );
        failed++;
        continue;
      }

      const sourceId = service.getSymbolId(
        sourceSymbolInGraph,
        sourceSymbolInGraph.fileUri,
      );

      const referenceEdge: ReferenceEdge = {
        type: ref.referenceType,
        sourceFileUri: sourceSymbolInGraph.fileUri,
        targetFileUri: targetSymbol.fileUri,
        context: ref.context
          ? {
              methodName: ref.context.methodName,
              parameterIndex: ref.context.parameterIndex
                ? toUint16(ref.context.parameterIndex)
                : undefined,
              isStatic: ref.context.isStatic,
              namespace: ref.context.namespace,
            }
          : undefined,
      };

      const edgeAdded = service.addEdge(sourceId, targetId, 1, referenceEdge);
      if (!edgeAdded) {
        failed++;
        continue;
      }

      // Update reference count
      const targetVertex = service.getVertex(targetId);
      if (targetVertex?.value) {
        targetVertex.value.referenceCount++;
      }

      processed++;

      // Yield periodically to prevent blocking
      // Adaptive yield interval based on batch size and elapsed time
      // Small batches yield more frequently, large batches less frequently
      // If batch is taking too long, yield more frequently to prevent blocking
      const elapsedTime = Date.now() - batchStartTime;
      const baseYieldInterval = Math.max(1, Math.floor(batchSize / 20));

      // If batch is taking too long, reduce yield interval (yield more frequently)
      const yieldInterval =
        elapsedTime > YIELD_TIME_THRESHOLD_MS
          ? Math.max(1, Math.floor(baseYieldInterval / 2)) // Yield twice as often
          : baseYieldInterval;

      if (i % yieldInterval === 0) {
        yield* Effect.yieldNow();
      }
    }

    // Remove processed references from deferred list
    yield* Ref.update(service.deferredReferences, (refs) => {
      const updated = new CaseInsensitiveHashMap(refs);
      const remaining = deferred.filter(
        (_, index) => index < task.startIndex || index >= task.endIndex,
      );
      if (remaining.length === 0) {
        updated.delete(task.symbolName);
      } else {
        updated.set(task.symbolName, remaining);
      }
      return updated;
    });

    // Update memory stats
    yield* Ref.update(service.memoryStats, (stats) => ({
      ...stats,
      totalEdges: stats.totalEdges + processed,
    }));

    // Update metrics
    yield* Ref.update(service.deferredProcessingMetrics, (metrics) => ({
      ...metrics,
      totalItemsProcessed: metrics.totalItemsProcessed + processed + failed,
      totalSuccessCount: metrics.totalSuccessCount + processed,
      totalFailureCount: metrics.totalFailureCount + failed,
    }));

    return { processed, failed };
  });
}

/**
 * Queue deferred references for a symbol as batched tasks (more efficient)
 */
export function queueDeferredReferencesForSymbol(
  symbolName: string,
  priority: Priority = Priority.Low,
): Effect.Effect<void, Error, DeferredReferenceProcessorService> {
  return Effect.gen(function* () {
    const service = yield* DeferredReferenceProcessorService;
    const logger = service.logger;

    const deferredRefs = yield* Ref.get(service.deferredReferences);
    const deferred = deferredRefs.get(symbolName);
    if (!deferred || deferred.length === 0) {
      return;
    }

    // Use batch size from settings (default 10)
    const batchSize = service.deferredBatchSize || 10;
    const totalReferences = deferred.length;
    const numBatches = Math.ceil(totalReferences / batchSize);

    logger.debug(
      () =>
        `[DEFERRED] Queueing ${numBatches} batch tasks for ${totalReferences} ` +
        `deferred references for symbol: ${symbolName}`,
    );

    // Create batched tasks instead of individual tasks
    // Yield periodically during enqueueing to prevent blocking the event loop
    // Yield after every batch if we have many batches, or every few batches for smaller counts
    const yieldInterval =
      numBatches > 20 ? 1 : Math.max(1, Math.floor(numBatches / 5));
    for (let batchIdx = 0; batchIdx < numBatches; batchIdx++) {
      const startIndex = batchIdx * batchSize;
      const endIndex = Math.min(startIndex + batchSize, totalReferences);

      // Use Background priority for later batches to prevent overwhelming the queue
      const taskPriority = batchIdx === 0 ? priority : Priority.Background;

      // Generate unique batch ID: symbolName-batchIdx-timestamp
      const batchId = `${symbolName}-${batchIdx}-${Date.now()}`;

      const batchedTask: BatchedDeferredReferenceTask = {
        _tag: 'BatchedDeferredReferenceTask',
        batchId,
        symbolName,
        startIndex,
        endIndex,
        priority: taskPriority,
        retryCount: 0,
        firstAttemptTime: Date.now(),
      };

      // Enqueue the batched task
      const processEffect = processBatchedDeferredReferences(batchedTask).pipe(
        Effect.provide(DeferredReferenceProcessorService.Live(service)),
      );
      const queuedItem = yield* createQueuedItem(
        processEffect,
        'deferred-reference-batch-process',
      );
      yield* offer(taskPriority, queuedItem);

      // Yield periodically to allow higher priority tasks to be processed
      if (batchIdx % yieldInterval === 0 && batchIdx > 0) {
        yield* Effect.yieldNow();
      }
    }

    // Clear the deferred references for this symbol after queueing
    yield* Ref.update(service.deferredReferences, (refs) => {
      const updated = new CaseInsensitiveHashMap(refs);
      updated.delete(symbolName);
      return updated;
    });
  });
}

/**
 * Process a batch of pending deferred references (more efficient than individual tasks)
 */
export function processBatchedPendingDeferredReferences(
  task: BatchedDeferredReferenceTask,
): Effect.Effect<
  { processed: number; failed: number },
  never,
  DeferredReferenceProcessorService
> {
  return Effect.gen(function* () {
    const service = yield* DeferredReferenceProcessorService;
    const logger = service.logger;
    let processed = 0;
    let failed = 0;

    const pendingRefs = yield* Ref.get(service.pendingDeferredReferences);
    const pending = pendingRefs.get(task.symbolName);
    if (!pending) {
      logger.debug(
        () =>
          `[DEFERRED:BATCH:${task.batchId}] No pending references found for source symbol: ${task.symbolName}`,
      );
      return { processed: 0, failed: 0 };
    }

    const batchSize = task.endIndex - task.startIndex;
    const batch = pending.slice(task.startIndex, task.endIndex);

    logger.debug(
      () =>
        `[DEFERRED:BATCH:${task.batchId}] Starting pending batch processing: ` +
        `sourceSymbol=${task.symbolName}, ` +
        `indices=${task.startIndex}-${task.endIndex - 1}, ` +
        `size=${batchSize}`,
    );

    // Find source symbol once for the batch
    const sourceSymbols = service.findSymbolByName(task.symbolName);
    if (sourceSymbols.length === 0) {
      // Source not found - will retry later
      logger.debug(
        () =>
          `[DEFERRED:BATCH:${task.batchId}] Source symbol not found: ${task.symbolName}, ` +
          'will retry later',
      );
      return { processed: 0, failed: batchSize };
    }

    const sourceSymbol = sourceSymbols[0];
    const sourceId = service.getSymbolId(sourceSymbol, sourceSymbol.fileUri);

    const batchStartTime = Date.now();
    const YIELD_TIME_THRESHOLD_MS = service.yieldTimeThresholdMs ?? 50;

    for (let i = 0; i < batch.length; i++) {
      const ref = batch[i];
      if (!ref) continue;

      // Find the target symbol by name
      const targetSymbols = service.findSymbolByName(ref.targetSymbolName);
      if (targetSymbols.length === 0) {
        logger.debug(
          () =>
            `[DEFERRED:BATCH:${task.batchId}] Target symbol not found: ` +
            `target=${ref.targetSymbolName}, ` +
            `source=${task.symbolName}, ` +
            'will retry later',
        );
        failed++;
        continue;
      }

      const targetSymbol = targetSymbols[0];
      const targetId = service.getSymbolId(targetSymbol, targetSymbol.fileUri);

      const referenceEdge: ReferenceEdge = {
        type: ref.referenceType,
        sourceFileUri: sourceSymbol.fileUri,
        targetFileUri: targetSymbol.fileUri,
        context: ref.context
          ? {
              methodName: ref.context.methodName,
              parameterIndex: ref.context.parameterIndex
                ? toUint16(ref.context.parameterIndex)
                : undefined,
              isStatic: ref.context.isStatic,
              namespace: ref.context.namespace,
            }
          : undefined,
      };

      const edgeAdded = service.addEdge(sourceId, targetId, 1, referenceEdge);
      if (!edgeAdded) {
        failed++;
        continue;
      }

      // Update reference count
      const targetVertex = service.getVertex(targetId);
      if (targetVertex?.value) {
        targetVertex.value.referenceCount++;
      }

      processed++;

      // Yield periodically to prevent blocking
      // Adaptive yield interval based on batch size and elapsed time
      // Small batches yield more frequently, large batches less frequently
      // If batch is taking too long, yield more frequently to prevent blocking
      const elapsedTime = Date.now() - batchStartTime;
      const baseYieldInterval = Math.max(1, Math.floor(batchSize / 20));

      // If batch is taking too long, reduce yield interval (yield more frequently)
      const yieldInterval =
        elapsedTime > YIELD_TIME_THRESHOLD_MS
          ? Math.max(1, Math.floor(baseYieldInterval / 2)) // Yield twice as often
          : baseYieldInterval;

      if (i % yieldInterval === 0) {
        yield* Effect.yieldNow();
      }
    }

    // Remove processed references from pending list
    yield* Ref.update(service.pendingDeferredReferences, (refs) => {
      const updated = new CaseInsensitiveHashMap(refs);
      const remaining = pending.filter(
        (_, index) => index < task.startIndex || index >= task.endIndex,
      );
      if (remaining.length === 0) {
        updated.delete(task.symbolName);
      } else {
        updated.set(task.symbolName, remaining);
      }
      return updated;
    });

    // Update memory stats
    yield* Ref.update(service.memoryStats, (stats) => ({
      ...stats,
      totalEdges: stats.totalEdges + processed,
    }));

    // Update metrics
    yield* Ref.update(service.deferredProcessingMetrics, (metrics) => ({
      ...metrics,
      totalItemsProcessed: metrics.totalItemsProcessed + processed + failed,
      totalSuccessCount: metrics.totalSuccessCount + processed,
      totalFailureCount: metrics.totalFailureCount + failed,
    }));

    logger.debug(
      () =>
        `[DEFERRED:BATCH:${task.batchId}] Completed pending batch processing: ` +
        `sourceSymbol=${task.symbolName}, ` +
        `processed=${processed}, ` +
        `failed=${failed}, ` +
        `total=${processed + failed}`,
    );

    return { processed, failed };
  });
}

/**
 * Queue pending deferred references for a symbol as batched tasks (more efficient)
 */
export function queuePendingReferencesForSymbol(
  symbolName: string,
  priority: Priority = Priority.Low,
): Effect.Effect<void, Error, DeferredReferenceProcessorService> {
  return Effect.gen(function* () {
    const service = yield* DeferredReferenceProcessorService;
    const logger = service.logger;

    const pendingRefs = yield* Ref.get(service.pendingDeferredReferences);
    const pending = pendingRefs.get(symbolName);
    if (!pending || pending.length === 0) {
      return;
    }

    // Use batch size from settings (default 10)
    const batchSize = service.deferredBatchSize || 10;
    const totalReferences = pending.length;
    const numBatches = Math.ceil(totalReferences / batchSize);

    logger.debug(
      () =>
        `[DEFERRED] Queueing ${numBatches} batch tasks for ${totalReferences} ` +
        `pending deferred references for source symbol: ${symbolName}`,
    );

    // Create batched tasks instead of individual tasks
    // Yield periodically during enqueueing to prevent blocking the event loop
    // Yield after every batch if we have many batches, or every few batches for smaller counts
    const yieldInterval =
      numBatches > 20 ? 1 : Math.max(1, Math.floor(numBatches / 5));
    for (let batchIdx = 0; batchIdx < numBatches; batchIdx++) {
      const startIndex = batchIdx * batchSize;
      const endIndex = Math.min(startIndex + batchSize, totalReferences);

      // Use Background priority for later batches to prevent overwhelming the queue
      const taskPriority = batchIdx === 0 ? priority : Priority.Background;

      // Generate unique batch ID: symbolName-pending-batchIdx-timestamp
      const batchId = `${symbolName}-pending-${batchIdx}-${Date.now()}`;

      const batchedTask: BatchedDeferredReferenceTask = {
        _tag: 'BatchedDeferredReferenceTask',
        batchId,
        symbolName,
        startIndex,
        endIndex,
        priority: taskPriority,
        retryCount: 0,
        firstAttemptTime: Date.now(),
      };

      // Enqueue the batched task
      const processEffect = processBatchedPendingDeferredReferences(
        batchedTask,
      ).pipe(Effect.provide(DeferredReferenceProcessorService.Live(service)));
      const queuedItem = yield* createQueuedItem(
        processEffect,
        'pending-deferred-reference-batch-process',
      );
      yield* offer(taskPriority, queuedItem);

      // Yield periodically to allow higher priority tasks to be processed
      if (batchIdx % yieldInterval === 0 && batchIdx > 0) {
        yield* Effect.yieldNow();
      }
    }

    // Clear the pending deferred references for this symbol after queueing
    yield* Ref.update(service.pendingDeferredReferences, (refs) => {
      const updated = new CaseInsensitiveHashMap(refs);
      updated.delete(symbolName);
      return updated;
    });
  });
}

/**
 * Process deferred references for a symbol in batches with retry tracking (Effect-based)
 * Legacy batch function for backward compatibility
 */
export function processDeferredReferencesBatchEffect(
  symbolName: string,
): Effect.Effect<
  BatchProcessingResult,
  never,
  DeferredReferenceProcessorService
> {
  return Effect.gen(function* () {
    const service = yield* DeferredReferenceProcessorService;

    const deferredRefs = yield* Ref.get(service.deferredReferences);
    const deferred = deferredRefs.get(symbolName);
    if (!deferred || deferred.length === 0) {
      return { needsRetry: false, reason: 'success' };
    }

    // Find the target symbol by name
    const targetSymbols = service.findSymbolByName(symbolName);
    if (targetSymbols.length === 0) {
      return { needsRetry: true, reason: 'target_not_found' };
    }

    // Use the first symbol with this name
    const targetSymbol = targetSymbols[0];
    const targetId = service.getSymbolId(targetSymbol, targetSymbol.fileUri);

    // Process in batches to avoid blocking
    const batchSize = Math.min(service.deferredBatchSize, deferred.length);
    const totalDeferred = deferred.length;
    const batchStartTime = Date.now();
    const YIELD_TIME_THRESHOLD_MS = service.yieldTimeThresholdMs ?? 50;

    service.logger.info(
      () =>
        `[DEFERRED] Starting batch processing for symbol: ${symbolName}, ` +
        `total deferred: ${totalDeferred}, batch size: ${batchSize}`,
    );

    const processed: typeof deferred = [];
    let hasFailures = false;
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < batchSize; i++) {
      const ref = deferred[i];
      if (!ref) continue;

      // Update fileUri lazily if needed
      if (!ref.sourceSymbol.fileUri) {
        const sourceSymbols = service.findSymbolByName(ref.sourceSymbol.name);
        if (sourceSymbols.length > 0) {
          ref.sourceSymbol.fileUri = sourceSymbols[0].fileUri;
        }
      }

      // Find the source symbol in the graph
      const sourceSymbols = service.findSymbolByName(ref.sourceSymbol.name);
      const sourceSymbolInGraph = ref.sourceSymbol.fileUri
        ? sourceSymbols.find((s) => s.fileUri === ref.sourceSymbol.fileUri)
        : sourceSymbols[0];

      if (!sourceSymbolInGraph) {
        // Move to pending
        const pendingRefs = yield* Ref.get(service.pendingDeferredReferences);
        const pending = pendingRefs.get(ref.sourceSymbol.name) || [];
        pending.push({
          targetSymbolName: symbolName,
          referenceType: ref.referenceType,
          location: ref.location,
          context: ref.context,
        });
        yield* Ref.update(service.pendingDeferredReferences, (refs) => {
          const updated = new CaseInsensitiveHashMap(refs);
          updated.set(ref.sourceSymbol.name, pending);
          return updated;
        });

        service.logger.info(
          () =>
            'Source symbol not found for deferred reference: ' +
            `source=${ref.sourceSymbol.name} (kind=${ref.sourceSymbol.kind}, ` +
            `fileUri=${ref.sourceSymbol.fileUri || 'none'}), ` +
            `target=${symbolName}, ` +
            `refType=${String(ref.referenceType)}` +
            (ref.context?.methodName
              ? `, method=${ref.context.methodName}`
              : '') +
            ', will retry when source symbol is added',
        );
        processed.push(ref);
        hasFailures = true;
        failureCount++;
        continue;
      }

      const sourceId = service.getSymbolId(
        sourceSymbolInGraph,
        sourceSymbolInGraph.fileUri,
      );

      const referenceEdge: ReferenceEdge = {
        type: ref.referenceType,
        sourceFileUri: sourceSymbolInGraph.fileUri,
        targetFileUri: targetSymbol.fileUri,
        context: ref.context
          ? {
              methodName: ref.context.methodName,
              parameterIndex: ref.context.parameterIndex
                ? toUint16(ref.context.parameterIndex)
                : undefined,
              isStatic: ref.context.isStatic,
              namespace: ref.context.namespace,
            }
          : undefined,
      };

      const edgeAdded = service.addEdge(sourceId, targetId, 1, referenceEdge);
      if (!edgeAdded) {
        service.logger.debug(
          () =>
            `Failed to add deferred reference edge: ${sourceId} -> ${targetId}`,
        );
        processed.push(ref);
        hasFailures = true;
        failureCount++;
        continue;
      }

      // Update reference count
      const targetVertex = service.getVertex(targetId);
      if (targetVertex?.value) {
        targetVertex.value.referenceCount++;
      }

      yield* Ref.update(service.memoryStats, (stats) => ({
        ...stats,
        totalEdges: stats.totalEdges + 1,
      }));

      processed.push(ref);
      successCount++;

      // Yield periodically to prevent blocking
      // Adaptive yield interval based on batch size and elapsed time
      // Small batches yield more frequently, large batches less frequently
      // If batch is taking too long, yield more frequently to prevent blocking
      const elapsedTime = Date.now() - batchStartTime;
      const baseYieldInterval = Math.max(1, Math.floor(batchSize / 20));

      // If batch is taking too long, reduce yield interval (yield more frequently)
      const yieldInterval =
        elapsedTime > YIELD_TIME_THRESHOLD_MS
          ? Math.max(1, Math.floor(baseYieldInterval / 2)) // Yield twice as often
          : baseYieldInterval;

      if ((i + 1) % yieldInterval === 0) {
        yield* Effect.yieldNow();
      }
    }

    // Remove processed references
    const remaining = deferred.slice(batchSize);
    const batchDuration = Date.now() - batchStartTime;

    // Update metrics
    yield* Ref.update(service.deferredProcessingMetrics, (m) => ({
      ...m,
      totalBatchesProcessed: m.totalBatchesProcessed + 1,
      totalItemsProcessed: m.totalItemsProcessed + processed.length,
      totalSuccessCount: m.totalSuccessCount + successCount,
      totalFailureCount: m.totalFailureCount + failureCount,
      totalBatchDuration: m.totalBatchDuration + batchDuration,
      lastBatchTime: batchDuration,
    }));

    // Track queue depth periodically
    const now = Date.now();
    const currentMetrics = yield* metrics().pipe(
      Effect.catchAll(() => Effect.succeed(null)),
    );
    if (currentMetrics) {
      const lowQueueSize = currentMetrics.queueSizes[Priority.Low] || 0;
      const currentMetricsRef = yield* Ref.get(
        service.deferredProcessingMetrics,
      );
      const updatedHistory = [
        ...currentMetricsRef.queueDepthHistory,
        { timestamp: now, depth: lowQueueSize },
      ];
      // Keep only last 100 entries
      const trimmedHistory =
        updatedHistory.length > 100
          ? updatedHistory.slice(-100)
          : updatedHistory;
      yield* Ref.update(service.deferredProcessingMetrics, (m) => ({
        ...m,
        queueDepthHistory: trimmedHistory,
      }));
    }

    // Log periodic summary every 50 batches or every 5 seconds
    const currentMetricsForLog = yield* Ref.get(
      service.deferredProcessingMetrics,
    );
    const timeSinceLastLog = now - currentMetricsForLog.lastMetricsLogTime;
    if (
      currentMetricsForLog.totalBatchesProcessed % 50 === 0 ||
      timeSinceLastLog >= 5000
    ) {
      yield* logDeferredProcessingSummary().pipe(
        Effect.catchAll(() => Effect.void),
      );
      yield* Ref.update(service.deferredProcessingMetrics, (m) => ({
        ...m,
        lastMetricsLogTime: now,
      }));
    }

    service.logger.info(
      () =>
        `[DEFERRED] Completed batch processing for symbol: ${symbolName}, ` +
        `processed: ${processed.length}/${batchSize}, ` +
        `success: ${successCount}, failures: ${failureCount}, ` +
        `remaining: ${remaining.length}, duration: ${batchDuration}ms`,
    );

    if (remaining.length > 0) {
      yield* Ref.update(service.deferredReferences, (refs) => {
        const updated = new CaseInsensitiveHashMap(refs);
        updated.set(symbolName, remaining);
        return updated;
      });
      return {
        needsRetry: true,
        reason: 'partial_processing',
        remainingCount: remaining.length,
      };
    } else {
      yield* Ref.update(service.deferredReferences, (refs) => {
        const updated = new CaseInsensitiveHashMap(refs);
        updated.delete(symbolName);
        return updated;
      });
      return {
        needsRetry: hasFailures,
        reason: hasFailures ? 'source_not_found' : 'success',
      };
    }
  });
}

/**
 * Retry pending deferred references when source symbol is added (Effect-based)
 * Legacy batch function for backward compatibility
 */
export function retryPendingDeferredReferencesBatchEffect(
  symbolName: string,
): Effect.Effect<
  BatchProcessingResult,
  never,
  DeferredReferenceProcessorService
> {
  return Effect.gen(function* () {
    const service = yield* DeferredReferenceProcessorService;

    const pendingRefs = yield* Ref.get(service.pendingDeferredReferences);
    const pending = pendingRefs.get(symbolName);
    if (!pending || pending.length === 0) {
      return { needsRetry: false, reason: 'success' };
    }

    // Find the source symbol
    const sourceSymbols = service.findSymbolByName(symbolName);
    if (sourceSymbols.length === 0) {
      return { needsRetry: true, reason: 'source_not_found' };
    }

    const sourceSymbol = sourceSymbols[0];
    const sourceId = service.getSymbolId(sourceSymbol, sourceSymbol.fileUri);

    // Process in batches to avoid blocking
    const batchSize = Math.min(service.deferredBatchSize, pending.length);
    const totalPending = pending.length;
    const batchStartTime = Date.now();
    const YIELD_TIME_THRESHOLD_MS = service.yieldTimeThresholdMs ?? 50;

    service.logger.info(
      () =>
        `[DEFERRED] Starting retry batch processing for symbol: ${symbolName}, ` +
        `total pending: ${totalPending}, batch size: ${batchSize}`,
    );

    const processed: typeof pending = [];
    let hasFailures = false;
    let successCount = 0;
    let failureCount = 0;

    for (let i = 0; i < batchSize; i++) {
      const ref = pending[i];
      if (!ref) continue;

      // Find the target symbol by name
      const targetSymbols = service.findSymbolByName(ref.targetSymbolName);
      if (targetSymbols.length === 0) {
        service.logger.debug(
          () =>
            `Target symbol not found for pending deferred reference: ${ref.targetSymbolName}, ` +
            'will retry when target symbol is added',
        );
        processed.push(ref);
        hasFailures = true;
        failureCount++;
        continue;
      }

      const targetSymbol = targetSymbols[0];
      const targetId = service.getSymbolId(targetSymbol, targetSymbol.fileUri);

      const referenceEdge: ReferenceEdge = {
        type: ref.referenceType,
        sourceFileUri: sourceSymbol.fileUri,
        targetFileUri: targetSymbol.fileUri,
        context: ref.context
          ? {
              methodName: ref.context.methodName,
              parameterIndex: ref.context.parameterIndex
                ? toUint16(ref.context.parameterIndex)
                : undefined,
              isStatic: ref.context.isStatic,
              namespace: ref.context.namespace,
            }
          : undefined,
      };

      const edgeAdded = service.addEdge(sourceId, targetId, 1, referenceEdge);
      if (!edgeAdded) {
        service.logger.debug(
          () =>
            `Failed to add pending deferred reference edge: ${sourceId} -> ${targetId}`,
        );
        processed.push(ref);
        hasFailures = true;
        failureCount++;
        continue;
      }

      // Update reference count
      const targetVertex = service.getVertex(targetId);
      if (targetVertex?.value) {
        targetVertex.value.referenceCount++;
      }

      yield* Ref.update(service.memoryStats, (stats) => ({
        ...stats,
        totalEdges: stats.totalEdges + 1,
      }));

      processed.push(ref);
      successCount++;

      // Yield periodically to prevent blocking
      // Adaptive yield interval based on batch size and elapsed time
      // Small batches yield more frequently, large batches less frequently
      // If batch is taking too long, yield more frequently to prevent blocking
      const elapsedTime = Date.now() - batchStartTime;
      const baseYieldInterval = Math.max(1, Math.floor(batchSize / 20));

      // If batch is taking too long, reduce yield interval (yield more frequently)
      const yieldInterval =
        elapsedTime > YIELD_TIME_THRESHOLD_MS
          ? Math.max(1, Math.floor(baseYieldInterval / 2)) // Yield twice as often
          : baseYieldInterval;

      if ((i + 1) % yieldInterval === 0) {
        yield* Effect.yieldNow();
      }
    }

    // Remove processed references
    const remaining = pending.filter((ref) => !processed.includes(ref));
    const batchDuration = Date.now() - batchStartTime;

    // Update metrics
    yield* Ref.update(service.deferredProcessingMetrics, (m) => ({
      ...m,
      totalBatchesProcessed: m.totalBatchesProcessed + 1,
      totalItemsProcessed: m.totalItemsProcessed + processed.length,
      totalSuccessCount: m.totalSuccessCount + successCount,
      totalFailureCount: m.totalFailureCount + failureCount,
      totalBatchDuration: m.totalBatchDuration + batchDuration,
      lastBatchTime: batchDuration,
    }));

    service.logger.info(
      () =>
        `[DEFERRED] Completed retry batch processing for symbol: ${symbolName}, ` +
        `processed: ${processed.length}/${batchSize}, ` +
        `success: ${successCount}, failures: ${failureCount}, ` +
        `remaining: ${remaining.length}, duration: ${batchDuration}ms`,
    );

    if (remaining.length === 0) {
      yield* Ref.update(service.pendingDeferredReferences, (refs) => {
        const updated = new CaseInsensitiveHashMap(refs);
        updated.delete(symbolName);
        return updated;
      });
      return { needsRetry: false, reason: 'success' };
    } else {
      yield* Ref.update(service.pendingDeferredReferences, (refs) => {
        const updated = new CaseInsensitiveHashMap(refs);
        updated.set(symbolName, remaining);
        return updated;
      });
      return {
        needsRetry: true,
        reason: hasFailures
          ? 'target_not_found_or_edge_failed'
          : 'batch_incomplete',
        remainingCount: remaining.length,
      };
    }
  });
}

/**
 * Log periodic summary of deferred processing metrics
 */
export function logDeferredProcessingSummary(): Effect.Effect<
  void,
  never,
  DeferredReferenceProcessorService
> {
  return Effect.gen(function* () {
    const service = yield* DeferredReferenceProcessorService;

    const deferredMetrics = yield* Ref.get(service.deferredProcessingMetrics);
    const avgBatchDuration =
      deferredMetrics.totalBatchesProcessed > 0
        ? deferredMetrics.totalBatchDuration /
          deferredMetrics.totalBatchesProcessed
        : 0;
    const itemsPerSecond =
      deferredMetrics.totalBatchDuration > 0
        ? (deferredMetrics.totalItemsProcessed /
            deferredMetrics.totalBatchDuration) *
          1000
        : 0;
    const successRate =
      deferredMetrics.totalItemsProcessed > 0
        ? (deferredMetrics.totalSuccessCount /
            deferredMetrics.totalItemsProcessed) *
          100
        : 0;

    // Get current queue metrics
    let currentQueueSize = 0;
    let currentQueueUtilization = 0;
    let activeTasks = 0;
    try {
      const queueMetrics = yield* metrics();
      currentQueueSize = queueMetrics.queueSizes[Priority.Low] || 0;
      currentQueueUtilization =
        queueMetrics.queueUtilization?.[Priority.Low] || 0;
      activeTasks = queueMetrics.activeTasks?.[Priority.Low] || 0;
    } catch (_error) {
      // Metrics not available, use defaults
    }

    service.logger.info(
      () =>
        '[DEFERRED] Processing Summary: ' +
        `batches=${deferredMetrics.totalBatchesProcessed}, ` +
        `items=${deferredMetrics.totalItemsProcessed}, ` +
        `success=${deferredMetrics.totalSuccessCount}, ` +
        `failures=${deferredMetrics.totalFailureCount}, ` +
        `avgBatchDuration=${avgBatchDuration.toFixed(1)}ms, ` +
        `itemsPerSecond=${itemsPerSecond.toFixed(1)}, ` +
        `successRate=${successRate.toFixed(1)}%, ` +
        `queueSize=${currentQueueSize}, ` +
        `queueUtilization=${currentQueueUtilization.toFixed(1)}%, ` +
        `activeTasks=${activeTasks}`,
    );
  }).pipe(Effect.catchAll(() => Effect.void));
}
