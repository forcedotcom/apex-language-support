/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap, DirectedGraph, DirectedVertex } from 'data-structure-typed';
import { Effect, Fiber, Duration } from 'effect';
import { Priority } from '@salesforce/apex-lsp-shared';
import {
  offer,
  createQueuedItem,
  metrics,
} from '../queue/priority-scheduler-utils';
import {
  getLogger,
  type EnumValue,
  Uint16,
  toUint16,
  type DeferredReferenceProcessingSettings,
} from '@salesforce/apex-lsp-shared';
import {
  generateSymbolId,
  parseSymbolId,
  extractFilePathFromUri,
} from '../types/UriBasedIdGenerator';
import { CaseInsensitiveHashMap } from '../utils/CaseInsensitiveMap';

import {
  ApexSymbol,
  SymbolTable,
  SymbolVisibility,
  SymbolLocation,
  SymbolKind,
} from '../types/symbol';
import { isBlockSymbol } from '../utils/symbolNarrowing';
import { calculateFQN } from '../utils/FQNUtils';
import { ResourceLoader } from '../utils/resourceLoader';
import { isApexKeyword } from '../utils/ApexKeywords';
import { isStandardApexUri } from '../types/ProtocolHandler';
import {
  getAllNodes as extractGetAllNodes,
  getAllEdges as extractGetAllEdges,
  getGraphData as extractGetGraphData,
  getGraphDataForFile as extractGetGraphDataForFile,
  getGraphDataByType as extractGetGraphDataByType,
  getGraphDataAsJSON as extractGetGraphDataAsJSON,
  getGraphDataForFileAsJSON as extractGetGraphDataForFileAsJSON,
  getGraphDataByTypeAsJSON as extractGetGraphDataByTypeAsJSON,
} from '../graphInfo/extractGraphData';

/**
 * Context for symbol resolution
 */
export interface ResolutionContext {
  fileUri?: string;
  expectedNamespace?: string;
  currentScope?: string;
  isStatic?: boolean;
}

/**
 * Result of a symbol lookup with confidence scoring
 */
export interface SymbolLookupResult {
  symbol: ApexSymbol;
  fileUri: string;
  confidence: number;
  isAmbiguous: boolean;
  candidates?: Array<{
    symbol: ApexSymbol;
    fileUri: string;
    symbolTable: SymbolTable;
    lastUpdated: number;
  }>;
}

/**
 * Types of references between Apex symbols
 * Using optimized numeric values for memory efficiency
 */
export const ReferenceType = {
  METHOD_CALL: 1,
  FIELD_ACCESS: 2,
  TYPE_REFERENCE: 3,
  INHERITANCE: 4,
  INTERFACE_IMPLEMENTATION: 5,
  // Phase 5: Extended Relationship Types
  CONSTRUCTOR_CALL: 6,
  STATIC_ACCESS: 7,
  INSTANCE_ACCESS: 8,
  IMPORT_REFERENCE: 9,
  NAMESPACE_REFERENCE: 10,
  ANNOTATION_REFERENCE: 11,
  TRIGGER_REFERENCE: 12,
  TEST_METHOD_REFERENCE: 13,
  WEBSERVICE_REFERENCE: 14,
  REMOTE_ACTION_REFERENCE: 15,
  PROPERTY_ACCESS: 16,
  ENUM_REFERENCE: 17,
  TRIGGER_CONTEXT_REFERENCE: 18,
  SOQL_REFERENCE: 19,
  SOSL_REFERENCE: 20,
  DML_REFERENCE: 21,
  APEX_PAGE_REFERENCE: 22,
  COMPONENT_REFERENCE: 23,
  CUSTOM_METADATA_REFERENCE: 24,
  EXTERNAL_SERVICE_REFERENCE: 25,
} as const;

/**
 * Reference edge between symbols with metadata
 * Optimized using smallNumericTypes for memory efficiency
 * Provides 75% memory reduction for location and numeric fields
 */
export interface ReferenceEdge {
  type: EnumValue<typeof ReferenceType>;
  sourceFileUri: string;
  targetFileUri: string;
  // location: CompactLocation; // Removed - redundant with source symbol location
  context?: {
    methodName?: string;
    parameterIndex?: Uint16; // 2 bytes vs 8 bytes (75% reduction)
    isStatic?: boolean;
    namespace?: string;
  };
}

/**
 * Result of a reference query
 */
export interface ReferenceResult {
  symbolId: string;
  symbol: ApexSymbol;
  fileUri: string;
  referenceType: EnumValue<typeof ReferenceType>;
  location: SymbolLocation;
  context?: {
    methodName?: string;
    parameterIndex?: number;
    isStatic?: boolean;
    namespace?: string;
  };
}

/**
 * Analysis of dependencies for a symbol
 */
export interface DependencyAnalysis {
  dependencies: ApexSymbol[];
  dependents: ApexSymbol[];
  impactScore: number;
  circularDependencies: string[][];
}

/**
 * Lightweight node for graph storage - only contains references
 */
export interface ReferenceNode {
  symbolId: string;
  fileUri: string;
  lastUpdated: number;
  referenceCount: number;
  nodeId: number;
}

/**
 * Task for processing deferred references with retry tracking
 */
type DeferredProcessingTask = {
  readonly _tag: 'DeferredProcessingTask';
  readonly symbolName: string;
  readonly taskType: 'processDeferred' | 'retryPending';
  readonly priority: Priority;
  readonly retryCount: number;
  readonly firstAttemptTime: number;
};

/**
 * Result of batch processing deferred references
 */
interface BatchProcessingResult {
  needsRetry: boolean;
  reason: string;
  remainingCount?: number;
}

/**
 * OPTIMIZED: ApexSymbolGraph with SymbolTable as primary storage
 * Eliminates duplicate symbol storage and delegates to SymbolTable
 */
export class ApexSymbolGraph {
  private static instance: ApexSymbolGraph | null = null;

  private readonly logger = getLogger();

  // OPTIMIZED: Only store references, not full symbols
  private referenceGraph: DirectedGraph<ReferenceNode, ReferenceEdge> =
    new DirectedGraph();

  // OPTIMIZED: Track symbol existence only
  private symbolIds: Set<string> = new Set();

  // Symbol to vertex mapping for efficient lookups
  private symbolToVertex: HashMap<string, DirectedVertex<ReferenceNode>> =
    new HashMap();

  // OPTIMIZED: Indexes for fast lookups (delegate to SymbolTable for actual data)
  // These maps provide O(1) lookup performance for common symbol operations

  /**
   * Maps symbol ID to file uri for quick file location lookups
   * Key: Symbol ID (e.g., "file:///path/MyClass.cls:MyClass")
   * Value: File uri (e.g., "file:///path/MyClass.cls")
   * Used by: File-based operations, symbol removal, dependency analysis
   */
  private symbolFileMap: HashMap<string, string> = new HashMap();

  /**
   * Maps symbol names to arrays of symbol IDs for name-based lookups
   * Key: Symbol name (e.g., "MyClass", "myMethod") - case-insensitive for Apex
   * Value: Array of symbol IDs that have this name
   * Used by: findSymbolByName(), handles overloading and multiple classes with same name
   */
  private nameIndex: CaseInsensitiveHashMap<string[]> =
    new CaseInsensitiveHashMap();

  /**
   * Maps file uris to arrays of symbol IDs for file-based lookups
   * Key: File uri (e.g., "file:///path/MyClass.cls")
   * Value: Array of symbol IDs in that file
   * Used by: getSymbolsInFile(), file-based symbol enumeration, file removal
   */
  private fileIndex: HashMap<string, string[]> = new HashMap();

  /**
   * Maps fully qualified names to symbol IDs for hierarchical lookups
   * Key: Fully qualified name (e.g., "MyNamespace.MyClass.myMethod") - case-insensitive for Apex
   * Value: Symbol ID
   * Used by: findSymbolByFQN(), hierarchical symbol resolution, namespace-aware lookups
   */
  private fqnIndex: CaseInsensitiveHashMap<string> =
    new CaseInsensitiveHashMap();

  /**
   * Maps symbol IDs to symbol objects for O(1) lookups
   * Key: Symbol ID (e.g., "file:///path/MyClass.cls:MyClass")
   * Value: ApexSymbol object
   * Used by: getParent() helper, optimized parent resolution
   */
  private symbolIdIndex: HashMap<string, ApexSymbol> = new HashMap();

  // OPTIMIZED: SymbolTable references for delegation
  private fileToSymbolTable: HashMap<string, SymbolTable> = new HashMap();
  private symbolToFiles: HashMap<string, string[]> = new HashMap();

  // OPTIMIZED: Simple cache for frequently accessed symbols (case-insensitive for Apex)
  private symbolCache: CaseInsensitiveHashMap<ApexSymbol[]> =
    new CaseInsensitiveHashMap();
  private cacheSize = 0;
  private readonly MAX_CACHE_SIZE = 1000;

  // Deferred references for lazy loading - keyed by symbol name instead of symbol ID (case-insensitive for Apex)
  private deferredReferences: CaseInsensitiveHashMap<
    Array<{
      sourceSymbol: ApexSymbol;
      referenceType: EnumValue<typeof ReferenceType>;
      location: SymbolLocation;
      context?: {
        methodName?: string;
        parameterIndex?: number;
        isStatic?: boolean;
        namespace?: string;
      };
    }>
  > = new CaseInsensitiveHashMap();

  // Pending deferred references that failed resolution (source symbol not found)
  // These are retried when new symbols are added, keyed by source symbol name (case-insensitive for Apex)
  private pendingDeferredReferences: CaseInsensitiveHashMap<
    Array<{
      targetSymbolName: string;
      referenceType: EnumValue<typeof ReferenceType>;
      location: SymbolLocation;
      context?: {
        methodName?: string;
        parameterIndex?: number;
        isStatic?: boolean;
        namespace?: string;
      };
    }>
  > = new CaseInsensitiveHashMap();

  private memoryStats = {
    totalSymbols: 0,
    totalVertices: 0,
    totalEdges: 0,
    memoryOptimizationLevel: 'OPTIMAL',
    estimatedMemorySavings: 0,
  };

  // Deferred reference processing metrics
  private deferredProcessingMetrics = {
    totalBatchesProcessed: 0,
    totalItemsProcessed: 0,
    totalSuccessCount: 0,
    totalFailureCount: 0,
    totalBatchDuration: 0, // milliseconds
    lastBatchTime: 0,
    activeTaskCount: 0,
    queueDepthHistory: [] as Array<{ timestamp: number; depth: number }>,
    lastMetricsLogTime: Date.now(),
  };

  // Deferred reference processing configuration (configurable via settings)
  private DEFERRED_BATCH_SIZE = 50;
  private MAX_RETRY_ATTEMPTS = 10;
  private RETRY_DELAY_MS = 100;
  private MAX_RETRY_DELAY_MS = 5000; // Cap exponential backoff at 5 seconds
  private QUEUE_CAPACITY_THRESHOLD = 90; // Don't retry if queue > 90% full
  private QUEUE_DRAIN_THRESHOLD = 75; // Only retry when queue < 75% full
  private QUEUE_FULL_RETRY_DELAY_MS = 10000; // 10 second delay when queue is full
  private MAX_QUEUE_FULL_RETRY_DELAY_MS = 30000; // Cap queue-full retry delay at 30 seconds
  private CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5; // Activate after 5 consecutive failures
  private CIRCUIT_BREAKER_RESET_THRESHOLD = 50; // Reset when queue < 50% full
  private failedReferences: Map<string, DeferredProcessingTask> = new Map();
  private activeRetryFibers: Set<Fiber.RuntimeFiber<void, Error>> = new Set();
  // Track symbols with pending retries to prevent duplicate retry scheduling
  private pendingRetrySymbols: Set<string> = new Set();
  // Circuit breaker state tracking
  private consecutiveRequeueFailures = 0;
  private circuitBreakerActive = false;
  // Rate limiter for deferred task enqueueing
  private deferredTaskRateLimiter = {
    lastEnqueueTime: Date.now(),
    enqueuedCount: 0,
    maxPerSecond: 10,
  };

  private resourceLoader: ResourceLoader;

  constructor(
    deferredReferenceSettings?: Partial<DeferredReferenceProcessingSettings>,
  ) {
    this.resourceLoader = ResourceLoader.getInstance({
      preloadStdClasses: false,
    });
    // Initialize rate limiter from settings
    if (deferredReferenceSettings?.maxDeferredTasksPerSecond !== undefined) {
      this.deferredTaskRateLimiter.maxPerSecond =
        deferredReferenceSettings.maxDeferredTasksPerSecond;
    }
    // Note: Deferred reference processing now uses shared priority scheduler
    // Apply settings if provided
    if (deferredReferenceSettings) {
      this.updateDeferredReferenceSettings(deferredReferenceSettings);
    }
  }

  /**
   * Update deferred reference processing settings
   * @param settings Partial settings to update (only provided values will be updated)
   */
  updateDeferredReferenceSettings(
    settings: Partial<DeferredReferenceProcessingSettings>,
  ): void {
    if (settings.deferredBatchSize !== undefined) {
      this.DEFERRED_BATCH_SIZE = settings.deferredBatchSize;
    }
    if (settings.maxRetryAttempts !== undefined) {
      const oldValue = this.MAX_RETRY_ATTEMPTS;
      this.MAX_RETRY_ATTEMPTS = settings.maxRetryAttempts;
      this.logger.info(
        () =>
          `MAX_RETRY_ATTEMPTS updated from ${oldValue} to ${this.MAX_RETRY_ATTEMPTS}`,
      );
    }
    if (settings.retryDelayMs !== undefined) {
      this.RETRY_DELAY_MS = settings.retryDelayMs;
    }
    if (settings.maxRetryDelayMs !== undefined) {
      this.MAX_RETRY_DELAY_MS = settings.maxRetryDelayMs;
    }
    if (settings.queueCapacityThreshold !== undefined) {
      this.QUEUE_CAPACITY_THRESHOLD = settings.queueCapacityThreshold;
    }
    if (settings.queueDrainThreshold !== undefined) {
      this.QUEUE_DRAIN_THRESHOLD = settings.queueDrainThreshold;
    }
    if (settings.queueFullRetryDelayMs !== undefined) {
      this.QUEUE_FULL_RETRY_DELAY_MS = settings.queueFullRetryDelayMs;
    }
    if (settings.maxQueueFullRetryDelayMs !== undefined) {
      this.MAX_QUEUE_FULL_RETRY_DELAY_MS = settings.maxQueueFullRetryDelayMs;
    }
    if (settings.circuitBreakerFailureThreshold !== undefined) {
      this.CIRCUIT_BREAKER_FAILURE_THRESHOLD =
        settings.circuitBreakerFailureThreshold;
    }
    if (settings.circuitBreakerResetThreshold !== undefined) {
      this.CIRCUIT_BREAKER_RESET_THRESHOLD =
        settings.circuitBreakerResetThreshold;
    }
    if (settings.maxDeferredTasksPerSecond !== undefined) {
      this.deferredTaskRateLimiter.maxPerSecond =
        settings.maxDeferredTasksPerSecond;
    }
    this.logger.info(
      () =>
        `Deferred reference processing settings updated: ${JSON.stringify(settings)}`,
    );
  }

  /**
   * Check if a deferred task can be enqueued based on rate limiting
   * @returns true if task can be enqueued, false if rate limit exceeded
   */
  private canEnqueueDeferredTask(): boolean {
    const now = Date.now();
    const elapsed = now - this.deferredTaskRateLimiter.lastEnqueueTime;

    if (elapsed >= 1000) {
      // Reset counter every second
      this.deferredTaskRateLimiter.enqueuedCount = 0;
      this.deferredTaskRateLimiter.lastEnqueueTime = now;
    }

    if (
      this.deferredTaskRateLimiter.enqueuedCount >=
      this.deferredTaskRateLimiter.maxPerSecond
    ) {
      return false; // Rate limit exceeded - will be retried later via requeueTask
    }

    this.deferredTaskRateLimiter.enqueuedCount++;
    return true;
  }

  /**
   * Get the singleton instance of ApexSymbolGraph
   */
  static getInstance(): ApexSymbolGraph {
    if (!this.instance) {
      throw new Error(
        'ApexSymbolGraph instance not set. Call setInstance() first.',
      );
    }
    return this.instance;
  }

  /**
   * Set the singleton instance of ApexSymbolGraph
   */
  static setInstance(graph: ApexSymbolGraph): void {
    this.instance = graph;
  }

  /**
   * Process a deferred reference task with retry logic
   * Returns an Effect for use with the priority scheduler
   */
  private processDeferredTask(
    task: DeferredProcessingTask,
  ): Effect.Effect<void, Error, never> {
    const self = this;
    return Effect.gen(function* () {
      const taskStartTime = Date.now();
      const priorityName =
        task.priority === Priority.Low
          ? 'Low'
          : task.priority === Priority.Normal
            ? 'Normal'
            : task.priority === Priority.High
              ? 'High'
              : task.priority === Priority.Immediate
                ? 'Immediate'
                : task.priority === Priority.Background
                  ? 'Background'
                  : 'Unknown';

      // Log task start
      self.logger.info(
        () =>
          `[DEFERRED] Starting deferred task: symbol=${task.symbolName}, ` +
          `type=${task.taskType}, priority=${priorityName}, ` +
          `retryCount=${task.retryCount}`,
      );

      try {
        // Yield before starting batch processing
        yield* Effect.yieldNow();

        if (task.taskType === 'processDeferred') {
          const result = yield* self.processDeferredReferencesBatchEffect(
            task.symbolName,
          );
          if (result.needsRetry) {
            self.requeueTask(task, result.reason);
          }
        } else {
          const result = yield* self.retryPendingDeferredReferencesBatchEffect(
            task.symbolName,
          );
          if (result.needsRetry) {
            self.requeueTask(task, result.reason);
          }
        }

        const taskDuration = Date.now() - taskStartTime;
        // Log task completion
        self.logger.info(
          () =>
            `[DEFERRED] Completed deferred task: symbol=${task.symbolName}, ` +
            `type=${task.taskType}, duration=${taskDuration}ms`,
        );
      } catch (error) {
        const taskDuration = Date.now() - taskStartTime;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        self.logger.error(
          () =>
            `[DEFERRED] Error processing deferred task: symbol=${task.symbolName}, ` +
            `type=${task.taskType}, priority=${priorityName}, ` +
            `retryCount=${task.retryCount}, duration=${taskDuration}ms, ` +
            `error=${errorMessage}`,
        );
        self.requeueTask(task, 'processing_error');
        return yield* Effect.fail(
          new Error(`Deferred processing failed: ${error}`),
        );
      }
    });
  }

  /**
   * Re-queue a failed task with incremented retry count, or move to dead letters if max retries exceeded
   */
  private requeueTask(task: DeferredProcessingTask, reason: string): void {
    // If MAX_RETRY_ATTEMPTS is 0, disable all retries
    if (this.MAX_RETRY_ATTEMPTS === 0) {
      // Don't requeue - retries are disabled
      this.failedReferences.set(`${task.taskType}:${task.symbolName}`, task);
      this.pendingRetrySymbols.delete(`${task.taskType}:${task.symbolName}`);
      this.logger.info(
        () =>
          'Deferred reference task retries disabled (maxRetryAttempts=0): ' +
          `${task.symbolName} (retryCount=${task.retryCount}, ` +
          `MAX_RETRY_ATTEMPTS=${this.MAX_RETRY_ATTEMPTS})`,
      );
      return;
    }

    if (task.retryCount >= this.MAX_RETRY_ATTEMPTS) {
      // Move to dead letter tracking
      this.failedReferences.set(`${task.taskType}:${task.symbolName}`, task);
      // Clear pending retry tracking
      this.pendingRetrySymbols.delete(task.symbolName);
      this.logger.warn(
        () =>
          `Deferred reference task exceeded max retries: ${task.symbolName} ` +
          `(${task.retryCount} attempts, reason: ${reason})`,
      );
      return;
    }

    // Prevent duplicate retry scheduling for the same symbol
    // This avoids exponential explosion when queue is at capacity
    const retryKey = `${task.taskType}:${task.symbolName}`;
    if (this.pendingRetrySymbols.has(retryKey)) {
      // Already have a pending retry for this symbol, skip to avoid duplicate retries
      this.logger.debug(
        () =>
          `Skipping duplicate retry for ${task.symbolName} (retry ${task.retryCount + 1}) - ` +
          'pending retry already scheduled',
      );
      return;
    }

    // Mark this symbol as having a pending retry
    this.pendingRetrySymbols.add(retryKey);

    // Re-queue with incremented retry count and lower priority for retries
    const retryTask: DeferredProcessingTask = {
      ...task,
      retryCount: task.retryCount + 1,
      priority: Priority.Low, // Retries use lower priority
    };

    // Calculate exponential backoff delay with queue awareness
    // Use longer delay for queue-full scenarios to allow queue to drain
    const baseDelay =
      reason === 'queue_full'
        ? this.QUEUE_FULL_RETRY_DELAY_MS
        : this.RETRY_DELAY_MS;
    const exponentialDelay = baseDelay * Math.pow(2, task.retryCount);
    // Use different cap for queue-full scenarios to allow longer delays
    const maxDelay =
      reason === 'queue_full'
        ? this.MAX_QUEUE_FULL_RETRY_DELAY_MS
        : this.MAX_RETRY_DELAY_MS;
    const cappedDelay = Math.min(exponentialDelay, maxDelay);

    // Create Effect-based retry that sleeps then re-queues
    const self = this;
    const capturedRetryTask = retryTask;
    const capturedRetryKey = retryKey;

    const retryEffect = Effect.gen(function* () {
      // Sleep for the calculated delay
      yield* Effect.sleep(Duration.millis(cappedDelay));

      // Clear pending retry tracking when fiber starts
      self.pendingRetrySymbols.delete(capturedRetryKey);

      // Check circuit breaker state
      if (self.circuitBreakerActive) {
        const currentMetrics = yield* metrics();
        const lowQueueUtilization =
          currentMetrics.queueUtilization?.[Priority.Low] || 0;
        if (lowQueueUtilization < self.CIRCUIT_BREAKER_RESET_THRESHOLD) {
          self.circuitBreakerActive = false;
          self.consecutiveRequeueFailures = 0;
          self.logger.info(
            () =>
              `Circuit breaker reset: Low queue utilization dropped to ${lowQueueUtilization.toFixed(1)}%`,
          );
        } else {
          self.logger.debug(
            () =>
              `Skipping retry due to active circuit breaker (queue utilization: ${lowQueueUtilization.toFixed(1)}%)`,
          );
          return;
        }
      }

      // Check queue capacity before attempting to re-queue
      const currentMetrics = yield* metrics();
      const lowQueueUtilization =
        currentMetrics.queueUtilization?.[Priority.Low] || 0;
      const lowQueueSize = currentMetrics.queueSizes[Priority.Low] || 0;
      // Handle both legacy single number and per-priority Record
      const queueCapacity =
        typeof currentMetrics.queueCapacity === 'number'
          ? currentMetrics.queueCapacity
          : currentMetrics.queueCapacity[Priority.Low] || 200;

      if (lowQueueUtilization >= self.QUEUE_CAPACITY_THRESHOLD) {
        // Queue too full, re-schedule with queue-full delay
        if (capturedRetryTask.retryCount % 10 === 0) {
          self.logger.warn(
            () =>
              `Skipping retry for ${capturedRetryTask.symbolName}: Low queue at ${lowQueueUtilization.toFixed(1)}% ` +
              `capacity (${lowQueueSize}/${queueCapacity}). Will retry when ` +
              `queue drains below ${self.QUEUE_DRAIN_THRESHOLD}%. ` +
              `(retry attempt ${capturedRetryTask.retryCount}/${self.MAX_RETRY_ATTEMPTS})`,
          );
        }
        self.requeueTask(capturedRetryTask, 'queue_full');
        return;
      }

      if (lowQueueUtilization >= self.QUEUE_DRAIN_THRESHOLD) {
        // Queue still above drain threshold, wait longer
        if (capturedRetryTask.retryCount % 5 === 0) {
          self.logger.debug(
            () =>
              `Queue still at ${lowQueueUtilization.toFixed(1)}% for ${capturedRetryTask.symbolName}, ` +
              `waiting for drain below ${self.QUEUE_DRAIN_THRESHOLD}% before retry`,
          );
        }
        self.requeueTask(capturedRetryTask, 'queue_full');
        return;
      }

      // Create QueuedItem and schedule with priority scheduler
      const queuedItemEffect = createQueuedItem(
        self.processDeferredTask(capturedRetryTask),
        capturedRetryTask.taskType === 'processDeferred'
          ? 'deferred-reference-process'
          : 'deferred-reference-retry',
      );
      const scheduledTaskEffect = Effect.gen(function* () {
        const queuedItem = yield* queuedItemEffect;
        return yield* offer(capturedRetryTask.priority, queuedItem);
      });

      // Re-queue through scheduler (this will respect concurrency limits)
      yield* scheduledTaskEffect;

      // Successfully re-queued - clear pending retry flag
      self.pendingRetrySymbols.delete(capturedRetryKey);

      // Reset failure counter
      if (self.consecutiveRequeueFailures > 0) {
        self.consecutiveRequeueFailures = 0;
        if (self.circuitBreakerActive) {
          self.circuitBreakerActive = false;
          self.logger.info(
            () => 'Circuit breaker deactivated: Re-queue succeeded',
          );
        }
      }
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* () {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          if (
            !errorMessage.includes('not initialized') &&
            !errorMessage.includes('shutdown')
          ) {
            self.consecutiveRequeueFailures++;
            const isQueueFullError =
              errorMessage.includes('cannot be resolved synchronously') ||
              errorMessage.includes('queue');

            if (isQueueFullError) {
              self.logger.warn(
                () =>
                  `Failed to re-queue deferred task for ${capturedRetryTask.symbolName}: ${errorMessage} ` +
                  `(consecutive failures: ${self.consecutiveRequeueFailures})`,
              );
            } else {
              self.logger.error(
                () =>
                  `Failed to re-queue deferred task for ${capturedRetryTask.symbolName}: ${errorMessage} ` +
                  `(consecutive failures: ${self.consecutiveRequeueFailures})`,
              );
            }

            // Activate circuit breaker if threshold reached
            if (
              self.consecutiveRequeueFailures >=
              self.CIRCUIT_BREAKER_FAILURE_THRESHOLD
            ) {
              self.circuitBreakerActive = true;
              self.logger.warn(
                () =>
                  `Circuit breaker activated after ${self.consecutiveRequeueFailures} consecutive failures`,
              );
            }

            // Re-schedule retry with queue-full delay
            self.requeueTask(capturedRetryTask, 'queue_full');
          }
          return yield* Effect.void;
        }),
      ),
      Effect.asVoid,
    );

    // Fork as daemon fiber so it runs independently
    // Note: forkDaemon returns Effect<Fiber>, so we need to run it to get the fiber
    // Since requeueTask is synchronous, we use Effect.runPromise to run the forkDaemon Effect
    // The fiber itself runs asynchronously, but we get the fiber handle from the promise
    const retryFiberEffect = Effect.forkDaemon(retryEffect);
    Effect.runPromise(retryFiberEffect)
      .then((retryFiber) => {
        this.activeRetryFibers.add(
          retryFiber as Fiber.RuntimeFiber<void, Error>,
        );
      })
      .catch((error) => {
        // Log error but don't throw - retry will be handled by the fiber's error handling
        this.logger.error(
          () =>
            `Failed to fork retry fiber for ${retryTask.symbolName}: ${error}`,
        );
      });
  }

  /**
   * OPTIMIZED: Add symbol reference only - delegate storage to SymbolTable
   */
  addSymbol(
    symbol: ApexSymbol,
    fileUri: string,
    symbolTable?: SymbolTable,
  ): void {
    // Normalize URI once at the start to ensure consistency throughout
    const normalizedFileUri = extractFilePathFromUri(fileUri);
    const symbolId = this.getSymbolId(symbol, normalizedFileUri);

    // Check if symbol already exists to prevent duplicates
    if (this.symbolIds.has(symbolId)) {
      return;
    }

    // OPTIMIZED: Register SymbolTable immediately for delegation
    let targetSymbolTable: SymbolTable;
    if (symbolTable) {
      // Register with normalized URI to match what getSymbol() will look up
      // registerSymbolTable() is now idempotent and will skip if same instance already registered
      this.registerSymbolTable(symbolTable, normalizedFileUri);
      targetSymbolTable = symbolTable;
    } else {
      // For backward compatibility, create a minimal SymbolTable if none provided
      // This ensures the symbol can be found later
      this.ensureSymbolTableForFile(normalizedFileUri);
      targetSymbolTable = this.fileToSymbolTable.get(normalizedFileUri)!;
    }

    // Add the symbol to the SymbolTable
    targetSymbolTable.addSymbol(symbol);

    // OPTIMIZED: Only track existence, don't store full symbol
    this.symbolIds.add(symbolId);

    // Add to symbolIdIndex for O(1) lookups by ID
    this.symbolIdIndex.set(symbolId, symbol);

    // Add to indexes for fast lookups (use normalized URI)
    this.symbolFileMap.set(symbolId, normalizedFileUri);

    // Calculate and store FQN, recalculating if needed to include parent hierarchy
    // For child symbols (methods, fields, etc.), the initial FQN might only be namespace.name
    // We recalculate here to get the full hierarchy (namespace.parent.name)
    let fqnToUse = symbol.fqn;

    // Create a parent resolution function that works with the symbol's parent relationship
    const getParent = (parentId: string): ApexSymbol | null => {
      // First try to find by parentId in the symbol table
      const allSymbols = targetSymbolTable.getAllSymbols();
      const parentSymbol = allSymbols.find((s) => s.id === parentId);
      if (parentSymbol) {
        return parentSymbol;
      }

      // If not found, try to find by name (for backward compatibility)
      const symbolsByName = allSymbols.filter((s) => s.name === parentId);
      if (symbolsByName.length > 0) {
        return symbolsByName[0];
      }

      return null;
    };

    // Recalculate FQN to ensure it includes the full parent hierarchy
    // This is especially important for child symbols that initially only have namespace.name
    const recalculatedFQN = calculateFQN(
      symbol,
      { normalizeCase: true },
      getParent,
    );

    // Use recalculated FQN if:
    // 1. No FQN was set initially, OR
    // 2. The recalculated FQN is different (includes parent hierarchy)
    if (!fqnToUse || recalculatedFQN !== fqnToUse) {
      fqnToUse = recalculatedFQN;
      // Store the calculated FQN on the symbol and key for consistency
      symbol.fqn = fqnToUse;
      symbol.key.fqn = fqnToUse;
    }

    // Exclude scope symbols from FQN index (they're structural, not semantic)
    if (fqnToUse && !isBlockSymbol(symbol)) {
      this.fqnIndex.set(fqnToUse, symbolId);
    }

    // Exclude scope symbols from name index (users shouldn't search for "block1" or "if_2")
    if (!isBlockSymbol(symbol)) {
      const existingNames = this.nameIndex.get(symbol.name) || [];
      if (!existingNames.includes(symbolId)) {
        existingNames.push(symbolId);
        this.nameIndex.set(symbol.name, existingNames);
      }
    }

    // Use normalized URI for fileIndex to ensure consistency
    const fileSymbols = this.fileIndex.get(normalizedFileUri) || [];
    if (!fileSymbols.includes(symbolId)) {
      fileSymbols.push(symbolId);
      this.fileIndex.set(normalizedFileUri, fileSymbols);
    }

    // OPTIMIZED: Add lightweight node to graph
    const referenceNode: ReferenceNode = {
      symbolId,
      fileUri: fileUri,
      lastUpdated: Date.now(),
      referenceCount: 0,
      nodeId: this.memoryStats.totalVertices + 1,
    };

    // Add vertex to graph
    const vertexAdded = this.referenceGraph.addVertex(symbolId, referenceNode);
    if (!vertexAdded) {
      this.logger.warn(() => `Failed to add vertex to graph: ${symbolId}`);
      return;
    }

    // Get the vertex from the graph
    const vertex = this.referenceGraph.getVertex(symbolId);
    if (!vertex) {
      this.logger.warn(
        () => `Vertex not found in graph after adding: ${symbolId}`,
      );
      return;
    }

    this.symbolToVertex.set(symbolId, vertex);

    // Update memory statistics
    this.memoryStats.totalSymbols++;
    this.memoryStats.totalVertices++;

    // Invalidate cache for this symbol name (cache might become stale)
    this.symbolCache.delete(symbol.name);

    // Queue deferred reference processing instead of executing synchronously
    // This prevents event loop blocking when many symbols are added
    if (this.deferredReferences.has(symbol.name)) {
      // Check rate limit before enqueueing
      if (this.canEnqueueDeferredTask()) {
        const task: DeferredProcessingTask = {
          _tag: 'DeferredProcessingTask',
          symbolName: symbol.name,
          taskType: 'processDeferred',
          priority: Priority.Low, // Use Low priority to avoid competing with client requests
          retryCount: 0,
          firstAttemptTime: Date.now(),
        };
        try {
          const queuedItemEffect = createQueuedItem(
            this.processDeferredTask(task),
            'deferred-reference-process',
          );
          const scheduledTaskEffect = Effect.gen(function* () {
            const queuedItem = yield* queuedItemEffect;
            return yield* offer(task.priority, queuedItem);
          });
          // Use async enqueueing to avoid blocking when queue is full
          Effect.runPromise(scheduledTaskEffect).catch((error) => {
            // If scheduling fails, log and continue - deferred processing will retry later
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            this.logger.debug(
              () =>
                `Failed to enqueue deferred processing task for ${symbol.name}: ${errorMessage}`,
            );
          });
        } catch (error) {
          // If scheduling fails, log and continue - deferred processing will retry later
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.debug(
            () =>
              `Failed to create deferred processing task for ${symbol.name}: ${errorMessage}`,
          );
        }
      }
      // If rate limit exceeded, skip enqueueing - task will be retried later when symbol is processed again
    }

    // Queue retry of pending deferred references that were waiting for this source symbol
    // Skip if retries are disabled (MAX_RETRY_ATTEMPTS === 0)
    if (
      this.pendingDeferredReferences.has(symbol.name) &&
      this.MAX_RETRY_ATTEMPTS > 0
    ) {
      const task: DeferredProcessingTask = {
        _tag: 'DeferredProcessingTask',
        symbolName: symbol.name,
        taskType: 'retryPending',
        priority: Priority.Low, // Retry operations use Low priority
        retryCount: 0,
        firstAttemptTime: Date.now(),
      };
      try {
        const queuedItemEffect = createQueuedItem(
          this.processDeferredTask(task),
          'deferred-reference-retry',
        );
        const scheduledTaskEffect = Effect.gen(function* () {
          const queuedItem = yield* queuedItemEffect;
          return yield* offer(task.priority, queuedItem);
        });
        // Use async enqueueing to avoid blocking when queue is full
        Effect.runPromise(scheduledTaskEffect).catch((error) => {
          // If scheduling fails, log and continue - retry will happen later
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.debug(
            () =>
              `Failed to enqueue pending retry task for ${symbol.name}: ${errorMessage}`,
          );
        });
      } catch (error) {
        // If scheduling fails, log and continue - retry will happen later
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.debug(
          () =>
            `Failed to create pending retry task for ${symbol.name}: ${errorMessage}`,
        );
      }
    } else if (
      this.pendingDeferredReferences.has(symbol.name) &&
      this.MAX_RETRY_ATTEMPTS === 0
    ) {
      // Retries are disabled, clear pending references
      this.pendingDeferredReferences.delete(symbol.name);
      this.logger.debug(
        () =>
          `Skipping retryPending task for ${symbol.name} (retries disabled, maxRetryAttempts=0)`,
      );
    }

    // If this is a standard Apex class, ensure it's properly registered
    if (fileUri.includes('/') && fileUri.endsWith('.cls')) {
      // This might be a standard class from ResourceLoader
      const namespace = fileUri.split('/')[0];
      if (this.resourceLoader?.isStdApexNamespace(namespace)) {
        // Mark as standard class
        symbol.modifiers.isBuiltIn = false;
        symbol.modifiers.visibility = SymbolVisibility.Global;
      }
    }

    // OPTIMIZED: Remove expensive iteration - fileUri updates are now handled lazily
    // during batch processing when deferred references are actually processed
  }

  /**
   * Get symbol by ID using optimized symbolIdIndex
   */
  getSymbol(symbolId: string): ApexSymbol | null {
    // First try symbolIdIndex for O(1) lookup
    const symbol = this.symbolIdIndex.get(symbolId);
    if (symbol) {
      return symbol;
    }

    // Fallback to SymbolTable delegation for backward compatibility
    const parsed = parseSymbolId(symbolId);
    const symbolName = parsed.name;
    // Normalize URI to ensure consistent lookup (matches how SymbolTables are registered)
    const normalizedUri = extractFilePathFromUri(parsed.uri);
    const symbolTable = this.fileToSymbolTable.get(normalizedUri);
    if (!symbolTable) {
      return null;
    }

    // Get all symbols from the SymbolTable and find by name
    const matchingSymbol = symbolTable.findSymbolWith(
      (s) => s.name === symbolName,
    );

    if (matchingSymbol) {
      // Always create a deep copy to avoid mutating the original symbol
      const symbolCopy = {
        ...matchingSymbol,
        fileUri: normalizedUri,
        location: {
          ...matchingSymbol.location,
          symbolRange: { ...matchingSymbol.location.symbolRange },
          identifierRange: { ...matchingSymbol.location.identifierRange },
        },
      };
      // Cache in symbolIdIndex for future lookups
      this.symbolIdIndex.set(symbolId, symbolCopy);
      return symbolCopy;
    }

    return null;
  }

  /**
   * Get parent symbol using optimized symbolIdIndex for O(1) lookup
   * @param symbol The symbol to get the parent for
   * @returns The parent symbol if found, null otherwise
   */
  getParent(symbol: ApexSymbol): ApexSymbol | null {
    if (!symbol.parentId) {
      return null;
    }

    // Use symbolIdIndex for O(1) lookup
    return this.symbolIdIndex.get(symbol.parentId) || null;
  }

  /**
   * OPTIMIZED: Find symbols by name by delegating to SymbolTable
   */
  findSymbolByName(name: string): ApexSymbol[] {
    // Short-circuit: Keywords are language constructs, not symbols
    if (isApexKeyword(name)) {
      return [];
    }

    // TEMPORARY: Disable symbolCache - always bypass cache
    // Check cache first
    // const cached = this.symbolCache.get(name);
    // if (cached) {
    //   return cached;
    // }

    const symbolIds = this.nameIndex.get(name) || [];

    const symbols: ApexSymbol[] = [];
    for (const symbolId of symbolIds) {
      const symbol = this.getSymbol(symbolId);
      // Exclude scope symbols from name-based lookups (they're structural, not semantic)
      if (symbol && !isBlockSymbol(symbol)) {
        symbols.push(symbol);
      }
    }

    // Cache the result if cache isn't full
    if (this.cacheSize < this.MAX_CACHE_SIZE) {
      this.symbolCache.set(name, symbols);
      this.cacheSize++;
    }

    return symbols;
  }

  /**
   * Backward compatibility method - alias for findSymbolByName
   */
  lookupSymbolByName(name: string): ApexSymbol[] {
    return this.findSymbolByName(name);
  }

  /**
   * Backward compatibility method - alias for findSymbolByFQN
   */
  lookupSymbolByFQN(fqn: string): ApexSymbol | null {
    return this.findSymbolByFQN(fqn);
  }

  /**
   * Get files containing a symbol with the given name
   */
  getFilesForSymbol(name: string): string[] {
    const symbolIds = this.nameIndex.get(name) || [];
    const files = new Set<string>();

    for (const symbolId of symbolIds) {
      const fileUri = this.symbolFileMap.get(symbolId);
      if (fileUri) {
        files.add(fileUri);
      }
    }

    return Array.from(files);
  }

  /**
   * OPTIMIZED: Find symbol by FQN by delegating to SymbolTable
   */
  findSymbolByFQN(fqn: string): ApexSymbol | null {
    const symbolId = this.fqnIndex.get(fqn);
    if (!symbolId) {
      return null;
    }

    return this.getSymbol(symbolId);
  }

  /**
   * OPTIMIZED: Get symbols in file by delegating to SymbolTable
   * Normalizes URI to ensure consistent lookup
   */
  getSymbolsInFile(fileUri: string): ApexSymbol[] {
    // Normalize URI to match how SymbolTables are registered
    const normalizedUri = extractFilePathFromUri(fileUri);
    const symbolIds = this.fileIndex.get(normalizedUri) || [];

    const symbols: ApexSymbol[] = [];

    for (const symbolId of symbolIds) {
      const symbol = this.getSymbol(symbolId);
      if (symbol) {
        symbols.push(symbol);
      } else {
        this.logger.debug(
          () =>
            `[getSymbolsInFile] Failed to retrieve symbol for symbolId: ${symbolId} ` +
            `(fileUri: ${normalizedUri})`,
        );
      }
    }

    return symbols;
  }

  /**
   * Find the containing method or class symbol for a block symbol
   * Traverses up the parentId chain to find a non-block symbol
   */
  private findContainingSymbolForBlock(
    blockSymbol: ApexSymbol,
    fileUri: string,
  ): ApexSymbol | null {
    if (!isBlockSymbol(blockSymbol) || !blockSymbol.parentId) {
      return null;
    }

    // Get the symbol table for this file
    const normalizedFileUri = extractFilePathFromUri(fileUri);
    const symbolTable = this.fileToSymbolTable.get(normalizedFileUri);
    if (!symbolTable) {
      return null;
    }

    // Traverse up the parentId chain to find a method or class symbol
    let currentId: string | undefined = blockSymbol.parentId;
    const visited = new Set<string>(); // Prevent infinite loops

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);

      // Find the symbol by ID in the symbol table
      const allSymbols = symbolTable.getAllSymbols();
      const parentSymbol = allSymbols.find((s) => s.id === currentId);

      if (!parentSymbol) {
        break;
      }

      // If we found a method or class symbol, use it
      if (
        parentSymbol.kind === SymbolKind.Method ||
        parentSymbol.kind === SymbolKind.Class ||
        parentSymbol.kind === SymbolKind.Interface ||
        parentSymbol.kind === SymbolKind.Enum ||
        parentSymbol.kind === SymbolKind.Trigger
      ) {
        return parentSymbol;
      }

      // If it's another block, continue traversing up
      if (isBlockSymbol(parentSymbol) && parentSymbol.parentId) {
        currentId = parentSymbol.parentId;
      } else {
        break;
      }
    }

    return null;
  }

  /**
   * OPTIMIZED: Add reference between symbols using IDs only
   */
  addReference(
    sourceSymbol: ApexSymbol,
    targetSymbol: ApexSymbol,
    referenceType: EnumValue<typeof ReferenceType>,
    location: SymbolLocation,
    context?: {
      methodName?: string;
      parameterIndex?: number;
      isStatic?: boolean;
      namespace?: string;
    },
  ): void {
    // Don't create reference edges to/from scope symbols (they're structural, not semantic)
    if (isBlockSymbol(sourceSymbol) || isBlockSymbol(targetSymbol)) {
      return;
    }

    // Find the actual symbols in the graph by name and file path
    const sourceSymbols = this.findSymbolByName(sourceSymbol.name);
    const targetSymbols = this.findSymbolByName(targetSymbol.name);

    // If fileUri is undefined, match any symbol with the same name
    // Otherwise, require exact fileUri match
    const sourceSymbolInGraph = sourceSymbol.fileUri
      ? sourceSymbols.find((s) => s.fileUri === sourceSymbol.fileUri)
      : sourceSymbols[0]; // Take the first symbol with matching name

    const targetSymbolInGraph = targetSymbol.fileUri
      ? targetSymbols.find((s) => s.fileUri === targetSymbol.fileUri)
      : targetSymbols[0]; // Take the first symbol with matching name

    if (!sourceSymbolInGraph || !targetSymbolInGraph) {
      // If symbols don't exist yet, add deferred reference
      // But first, if sourceSymbol is a block, find the containing method/class
      let actualSourceSymbol = sourceSymbol;
      if (isBlockSymbol(sourceSymbol) && sourceSymbol.fileUri) {
        const containingSymbol = this.findContainingSymbolForBlock(
          sourceSymbol,
          sourceSymbol.fileUri,
        );
        if (containingSymbol) {
          actualSourceSymbol = containingSymbol;
          this.logger.debug(
            () =>
              `Replacing block symbol ${sourceSymbol.name} with containing symbol ` +
              `${containingSymbol.name} (kind=${containingSymbol.kind}) for deferred reference`,
          );
        } else {
          // If we can't find a containing symbol, skip this reference
          // Block symbols shouldn't be used as source symbols
          this.logger.debug(
            () =>
              `Skipping deferred reference with block symbol source ${sourceSymbol.name} ` +
              '(no containing method/class found)',
          );
          return;
        }
      }

      // Use symbol name as key since we don't know the exact fileUri
      this.addDeferredReference(
        actualSourceSymbol,
        targetSymbol.name,
        referenceType,
        location,
        context,
      );

      // For built-in types, create a virtual symbol and add the reference immediately
      if (
        targetSymbol.fileUri &&
        targetSymbol.fileUri.startsWith('built-in://')
      ) {
        this.createVirtualSymbolForBuiltInType(
          targetSymbol,
          sourceSymbol,
          referenceType,
          location,
          context,
        );
      }
      return;
    }

    const sourceId = this.getSymbolId(
      sourceSymbolInGraph,
      sourceSymbolInGraph.fileUri,
    );
    const targetId = this.getSymbolId(
      targetSymbolInGraph,
      targetSymbolInGraph.fileUri,
    );

    // Check if reference already exists
    const existingEdge = this.referenceGraph.getEdge(sourceId, targetId);
    if (existingEdge) {
      return;
    }

    // Create optimized reference edge
    const referenceEdge: ReferenceEdge = {
      type: referenceType,
      sourceFileUri: sourceSymbolInGraph.fileUri,
      targetFileUri: targetSymbolInGraph.fileUri,
      context: context
        ? {
            methodName: context.methodName,
            parameterIndex: context.parameterIndex
              ? toUint16(context.parameterIndex)
              : undefined,
            isStatic: context.isStatic,
            namespace: context.namespace,
          }
        : undefined,
    };

    // Add edge to graph
    const edgeAdded = this.referenceGraph.addEdge(
      sourceId,
      targetId,
      1,
      referenceEdge,
    );
    if (!edgeAdded) {
      this.logger.warn(
        () => `Failed to add reference edge: ${sourceId} -> ${targetId}`,
      );
      return;
    }

    // Update reference count
    const targetVertex = this.symbolToVertex.get(targetId);
    if (targetVertex && targetVertex.value) {
      targetVertex.value.referenceCount++;
    }

    this.memoryStats.totalEdges++;
  }

  /**
   * OPTIMIZED: Find references to a symbol
   * Note: This is a synchronous function. For large graphs, consider calling from
   * an async context or using the async variant if available.
   */
  findReferencesTo(symbol: ApexSymbol): ReferenceResult[] {
    // Find the actual symbol in the graph by name and file path
    const targetSymbols = this.findSymbolByName(symbol.name);

    // If fileUri is undefined, match any symbol with the same name
    // Otherwise, require exact fileUri match
    const targetSymbolInGraph = symbol.fileUri
      ? targetSymbols.find((s) => s.fileUri === symbol.fileUri)
      : targetSymbols[0]; // Take the first symbol with matching name

    if (!targetSymbolInGraph) {
      return [];
    }

    const targetId = this.getSymbolId(
      targetSymbolInGraph,
      targetSymbolInGraph.fileUri,
    );
    const results: ReferenceResult[] = [];

    // Get incoming edges from the graph
    const vertex = this.symbolToVertex.get(targetId);
    if (!vertex) {
      return results;
    }
    const incomingEdges = this.referenceGraph.incomingEdgesOf(vertex.key);

    for (const edge of incomingEdges) {
      if (!edge.value) continue;

      const sourceSymbol = this.getSymbol(String(edge.src));
      if (!sourceSymbol) {
        continue;
      }

      const referenceResult: ReferenceResult = {
        symbolId: String(edge.src),
        symbol: sourceSymbol,
        fileUri: sourceSymbol.fileUri,
        referenceType: edge.value.type,
        location: sourceSymbol.location,
        context: edge.value.context
          ? {
              methodName: edge.value.context.methodName,
              parameterIndex: edge.value.context.parameterIndex
                ? Number(edge.value.context.parameterIndex)
                : undefined,
              isStatic: edge.value.context.isStatic,
              namespace: edge.value.context.namespace,
            }
          : undefined,
      };

      results.push(referenceResult);
    }

    return results;
  }

  /**
   * OPTIMIZED: Find references from a symbol
   * Note: This is a synchronous function. For large graphs, consider calling from
   * an async context or using the async variant if available.
   */
  findReferencesFrom(symbol: ApexSymbol): ReferenceResult[] {
    // Find the actual symbol in the graph by name and file path
    const sourceSymbols = this.findSymbolByName(symbol.name);

    // If fileUri is undefined, match any symbol with the same name
    // Otherwise, require exact fileUri match
    const sourceSymbolInGraph = symbol.fileUri
      ? sourceSymbols.find((s) => s.fileUri === symbol.fileUri)
      : sourceSymbols[0]; // Take the first symbol with matching name

    if (!sourceSymbolInGraph) {
      return [];
    }

    const sourceId = this.getSymbolId(
      sourceSymbolInGraph,
      sourceSymbolInGraph.fileUri,
    );
    const results: ReferenceResult[] = [];

    // Get outgoing edges from the graph
    const vertex = this.symbolToVertex.get(sourceId);
    if (!vertex) {
      return results;
    }
    const outgoingEdges = this.referenceGraph.outgoingEdgesOf(vertex.key);

    for (const edge of outgoingEdges) {
      if (!edge.value) continue;

      const targetSymbol = this.getSymbol(String(edge.dest));
      if (!targetSymbol) {
        continue;
      }

      const referenceResult: ReferenceResult = {
        symbolId: String(edge.dest),
        symbol: targetSymbol,
        fileUri: targetSymbol.fileUri,
        referenceType: edge.value.type,
        location: targetSymbol.location,
        context: edge.value.context
          ? {
              methodName: edge.value.context.methodName,
              parameterIndex: edge.value.context.parameterIndex
                ? Number(edge.value.context.parameterIndex)
                : undefined,
              isStatic: edge.value.context.isStatic,
              namespace: edge.value.context.namespace,
            }
          : undefined,
      };

      results.push(referenceResult);
    }

    return results;
  }

  /**
   * Detect circular dependencies in the reference graph
   */
  detectCircularDependencies(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    // Get all vertices from the symbolToVertex map
    const vertices = Array.from(this.symbolToVertex.keys());

    for (const vertexKey of vertices) {
      if (!visited.has(vertexKey)) {
        this.detectCyclesDFS(vertexKey, visited, recursionStack, [], cycles);
      }
    }

    return cycles;
  }

  /**
   * Detect circular dependencies involving a specific symbol
   */
  detectCircularDependenciesForSymbol(symbol: ApexSymbol): string[][] {
    const symbolId = this.getSymbolId(symbol, symbol.fileUri);
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    // Start DFS from the specific symbol
    if (this.symbolToVertex.has(symbolId)) {
      this.detectCyclesDFS(symbolId, visited, recursionStack, [], cycles);
    }

    // Filter cycles to only include those that contain the target symbol
    return cycles.filter((cycle) => cycle.includes(symbolId));
  }

  /**
   * Helper method for cycle detection using DFS
   */
  private detectCyclesDFS(
    vertexKey: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    currentPath: string[],
    cycles: string[][],
  ): void {
    visited.add(vertexKey);
    recursionStack.add(vertexKey);
    currentPath.push(vertexKey);

    // Get outgoing edges from this vertex
    const outgoingEdges = this.referenceGraph.outgoingEdgesOf(vertexKey);

    for (const edge of outgoingEdges) {
      const neighborKey = String(edge.dest);

      if (!visited.has(neighborKey)) {
        this.detectCyclesDFS(
          neighborKey,
          visited,
          recursionStack,
          currentPath,
          cycles,
        );
      } else if (recursionStack.has(neighborKey)) {
        // Found a cycle
        const cycleStartIndex = currentPath.indexOf(neighborKey);
        if (cycleStartIndex !== -1) {
          const cycle = currentPath.slice(cycleStartIndex);
          cycles.push([...cycle]);
        }
      }
    }

    recursionStack.delete(vertexKey);
    currentPath.pop();
  }

  /**
   * OPTIMIZED: Analyze dependencies by delegating to SymbolTable for symbol data
   */
  analyzeDependencies(symbol: ApexSymbol): DependencyAnalysis {
    const dependencies: ApexSymbol[] = [];
    const dependents: ApexSymbol[] = [];

    // Get references from this symbol (dependencies)
    const referencesFrom = this.findReferencesFrom(symbol);
    for (const ref of referencesFrom) {
      dependencies.push(ref.symbol);
    }

    // Get references to this symbol (dependents)
    const referencesTo = this.findReferencesTo(symbol);
    for (const ref of referencesTo) {
      dependents.push(ref.symbol);
    }

    const impactScore = this.calculateImpactScore(dependents, dependencies);
    const circularDependencies =
      this.detectCircularDependenciesForSymbol(symbol);

    return {
      dependencies,
      dependents,
      impactScore,
      circularDependencies,
    };
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    return {
      ...this.memoryStats,
      estimatedMemorySavings: this.calculateMemorySavings(),
    };
  }

  /**
   * Get overall statistics
   */
  getStats() {
    return {
      totalSymbols: this.memoryStats.totalSymbols,
      totalFiles: this.fileIndex.size, // Count actual files, not just SymbolTables
      totalReferences: this.memoryStats.totalEdges,
      circularDependencies: this.detectCircularDependencies().length,
      cacheHitRate: 0, // Not applicable in optimized architecture
      // Backward compatibility fields
      totalVertices: this.memoryStats.totalVertices,
      totalEdges: this.memoryStats.totalEdges,
      deferredReferences: this.deferredReferences.size,
      deferredQueueSize: this.getDeferredQueueSize(),
      failedReferencesCount: this.getFailedReferencesCount(),
    };
  }

  /**
   * Get the current size of the deferred reference processing queue (from scheduler metrics)
   */
  getDeferredQueueSize(): number {
    try {
      const schedulerMetrics = Effect.runSync(metrics());
      // Sum Normal and Low priority queues (where deferred tasks are scheduled)
      return (
        (schedulerMetrics.queueSizes[Priority.Normal] || 0) +
        (schedulerMetrics.queueSizes[Priority.Low] || 0)
      );
    } catch (error) {
      // If scheduler not initialized or error getting metrics, return 0
      this.logger.debug(() => `Failed to get deferred queue size: ${error}`);
      return 0;
    }
  }

  /**
   * Get the count of failed references that exceeded max retry attempts
   */
  getFailedReferencesCount(): number {
    return this.failedReferences.size;
  }

  /**
   * Get all failed references that exceeded max retry attempts (for debugging/monitoring)
   */
  getFailedReferences(): DeferredProcessingTask[] {
    return Array.from(this.failedReferences.values());
  }

  /**
   * Shutdown deferred reference processing
   * Note: The scheduler itself is shared and should not be shut down here.
   * Only cleanup local resources (retry timers).
   */
  private shutdownDeferredWorker(): void {
    try {
      // Clear all active retry timers
      // Interrupt all active retry fibers
      for (const fiber of this.activeRetryFibers) {
        // Interrupt the fiber - this is async but we run it synchronously
        // The interrupt will cancel the fiber's execution
        Effect.runSync(Fiber.interrupt(fiber).pipe(Effect.asVoid));
      }
      this.activeRetryFibers.clear();
      this.pendingRetrySymbols.clear();

      this.logger.debug(
        () => 'Deferred reference processing shutdown complete',
      );
    } catch (error) {
      // Ignore errors during shutdown
      this.logger.debug(
        () => `Error during deferred processing shutdown: ${error}`,
      );
    }
  }

  /**
   * OPTIMIZED: Lookup symbol by name with context
   */
  lookupSymbolWithContext(
    symbolName: string,
    context?: ResolutionContext,
  ): SymbolLookupResult | null {
    // Short-circuit: Keywords are language constructs, not symbols
    if (isApexKeyword(symbolName)) {
      return null;
    }

    // CaseInsensitiveHashMap handles case-insensitive lookup automatically
    const symbolIds = this.nameIndex.get(symbolName) || [];

    if (symbolIds.length === 0) {
      return null;
    }

    // Get all symbols with this name by delegating to SymbolTable
    const candidates = symbolIds
      .map((id) => {
        const symbol = this.getSymbol(id);
        const fileUri = this.symbolFileMap.get(id);
        const symbolTable = fileUri
          ? this.fileToSymbolTable.get(fileUri)
          : undefined;

        if (!symbol || !fileUri || !symbolTable) return null;

        // Exclude scope symbols from lookup results (they're structural, not semantic)
        if (isBlockSymbol(symbol)) return null;

        return {
          symbol,
          fileUri,
          symbolTable,
          lastUpdated: Date.now(),
        };
      })
      .filter(
        (candidate): candidate is NonNullable<typeof candidate> =>
          candidate !== null,
      );

    if (candidates.length === 0) {
      return null;
    }

    if (candidates.length === 1) {
      // Unambiguous symbol
      const candidate = candidates[0];
      return {
        symbol: candidate.symbol,
        fileUri: candidate.fileUri,
        confidence: 1.0,
        isAmbiguous: false,
      };
    }

    // Ambiguous symbol - resolve using context
    const resolved = this.resolveAmbiguousSymbol(
      symbolName,
      candidates,
      context,
    );
    return {
      symbol: resolved.symbol,
      fileUri: resolved.fileUri,
      confidence: resolved.confidence,
      isAmbiguous: true,
      candidates,
    };
  }

  /**
   * Get SymbolTable for a file
   * Normalizes URI to ensure consistent lookup
   */
  getSymbolTableForFile(fileUri: string): SymbolTable | undefined {
    const normalizedUri = extractFilePathFromUri(fileUri);
    return this.fileToSymbolTable.get(normalizedUri);
  }

  /**
   * Register SymbolTable for a file
   * Ensures URI is normalized consistently with getSymbolId() to avoid lookup mismatches
   */
  registerSymbolTable(symbolTable: SymbolTable, fileUri: string): void {
    // Normalize URI the same way getSymbolId() does to ensure consistency
    // This ensures SymbolTable lookup in getSymbol() will succeed
    const normalizedUri = extractFilePathFromUri(fileUri);

    // Check if the same SymbolTable instance is already registered
    const existing = this.fileToSymbolTable.get(normalizedUri);
    if (existing === symbolTable) {
      // Same instance already registered, skip redundant registration
      return;
    }

    this.logger.debug(
      () =>
        `[registerSymbolTable] Registering SymbolTable for URI: ${normalizedUri} ` +
        `(original: ${fileUri}, ` +
        `symbolCount: ${symbolTable.getAllSymbols().length})`,
    );

    // Use normalized URI for registration to match what getSymbol() will look up
    // This allows replacing placeholders created by ensureSymbolTableForFile()
    this.fileToSymbolTable.set(normalizedUri, symbolTable);

    // Verify registration succeeded
    const registered = this.fileToSymbolTable.get(normalizedUri);
    if (!registered) {
      this.logger.warn(
        () =>
          `[registerSymbolTable] Failed to register SymbolTable for URI: ${normalizedUri}`,
      );
    } else {
      this.logger.debug(
        () =>
          `[registerSymbolTable] Successfully registered SymbolTable for URI: ${normalizedUri}`,
      );
    }
  }

  /**
   * Ensure a SymbolTable is registered for a file if it doesn't exist
   * Normalizes URI to ensure consistency with SymbolTable registration
   */
  private ensureSymbolTableForFile(fileUri: string): void {
    const normalizedUri = extractFilePathFromUri(fileUri);
    if (!this.fileToSymbolTable.has(normalizedUri)) {
      const symbolTable = new SymbolTable();
      this.fileToSymbolTable.set(normalizedUri, symbolTable);
      this.logger.debug(
        () =>
          `[ensureSymbolTableForFile] Created new SymbolTable for URI: ${normalizedUri}`,
      );
    }
  }

  /**
   * Resolve ambiguous symbol using context
   */
  private resolveAmbiguousSymbol(
    symbolName: string,
    candidates: Array<{
      symbol: ApexSymbol;
      fileUri: string;
      symbolTable: SymbolTable;
      lastUpdated: number;
    }>,
    context?: ResolutionContext,
  ): { symbol: ApexSymbol; fileUri: string; confidence: number } {
    // If no context provided, return first candidate with medium confidence
    if (!context) {
      const candidate = candidates[0];
      return {
        symbol: candidate.symbol,
        fileUri: candidate.fileUri,
        confidence: 0.5,
      };
    }

    // Strategy 1: Try to match by source file first (highest priority)
    if (context.fileUri) {
      const fileMatch = candidates.find((c) => c.fileUri === context.fileUri);
      if (fileMatch) {
        return {
          symbol: fileMatch.symbol,
          fileUri: fileMatch.fileUri,
          confidence: 0.9,
        };
      }
    }

    // Strategy 2: Handle method resolution based on context
    // For qualified calls like System.debug, prefer the standard library method
    // For unqualified calls like debug(), prefer local methods
    const standardLibraryMethods = candidates.filter(
      (c) =>
        c.symbol.kind === 'method' && this.isStandardLibraryMethod(c.symbol),
    );

    const localMethods = candidates.filter(
      (c) =>
        // Check if this is a method from the same file/class as the context
        c.fileUri === context.fileUri ||
        (c.symbol.kind === 'method' && !this.isStandardLibraryMethod(c.symbol)),
    );

    // If we have both standard library and local methods, prefer based on context
    if (standardLibraryMethods.length > 0 && localMethods.length > 0) {
      // For qualified calls (when expectedNamespace is set), prefer standard library
      if (context.expectedNamespace) {
        const bestStandard = standardLibraryMethods[0];
        return {
          symbol: bestStandard.symbol,
          fileUri: bestStandard.fileUri,
          confidence: 0.8,
        };
      }
      // For unqualified calls, prefer local methods
      else {
        const bestLocal = localMethods[0];
        return {
          symbol: bestLocal.symbol,
          fileUri: bestLocal.fileUri,
          confidence: 0.8,
        };
      }
    }

    // If only one type exists, use it
    if (localMethods.length > 0) {
      const bestLocal = localMethods[0];
      return {
        symbol: bestLocal.symbol,
        fileUri: bestLocal.fileUri,
        confidence: 0.8,
      };
    }

    if (standardLibraryMethods.length > 0) {
      const bestStandard = standardLibraryMethods[0];
      return {
        symbol: bestStandard.symbol,
        fileUri: bestStandard.fileUri,
        confidence: 0.8,
      };
    }

    // Strategy 3: Prefer non-static methods for instance context, static for static context
    if (context.isStatic !== undefined) {
      const contextAwareMethods = candidates.filter((c) => {
        if (c.symbol.kind !== 'method') return false;
        const isStatic = c.symbol.modifiers?.isStatic ?? false;
        return context.isStatic ? isStatic : !isStatic;
      });

      if (contextAwareMethods.length > 0) {
        const bestMethod = contextAwareMethods[0];
        return {
          symbol: bestMethod.symbol,
          fileUri: bestMethod.fileUri,
          confidence: 0.7,
        };
      }
    }

    // Strategy 4: Try to match by scope if provided
    if (context.currentScope) {
      // For now, return first candidate with scope context
      // This can be enhanced with actual scope hierarchy matching
      const candidate = candidates[0];
      return {
        symbol: candidate.symbol,
        fileUri: candidate.fileUri,
        confidence: 0.6,
      };
    }

    // Default: return first candidate with medium confidence
    const candidate = candidates[0];
    return {
      symbol: candidate.symbol,
      fileUri: candidate.fileUri,
      confidence: 0.5,
    };
  }

  /**
   * Check if a symbol is from a standard Apex library (like System, String, etc.)
   */
  private isStandardLibraryMethod(symbol: ApexSymbol): boolean {
    // Use the existing isStandardApexUri function to check if the symbol's file URI
    // is from the standard Apex library
    return symbol.fileUri ? isStandardApexUri(symbol.fileUri) : false;
  }

  /**
   * Generate a unique key for a symbol
   */
  private getSymbolKey(symbol: ApexSymbol): string {
    return `${symbol.kind}:${symbol.name}`;
  }

  /**
   * Clear all data
   */
  clear(): void {
    // Shutdown deferred worker and queue before clearing
    this.shutdownDeferredWorker();

    this.referenceGraph.clear();
    this.symbolIds.clear();
    this.symbolToVertex.clear();
    this.symbolFileMap.clear();
    this.nameIndex.clear();
    this.fileIndex.clear();
    this.fqnIndex.clear();
    this.symbolIdIndex.clear();
    this.deferredReferences.clear();
    this.pendingDeferredReferences.clear();

    // Clear SymbolTable references
    this.fileToSymbolTable.clear();
    this.symbolToFiles.clear();

    // Clear cache
    this.symbolCache.clear();
    this.cacheSize = 0;

    // Clear failed references
    this.failedReferences.clear();

    this.memoryStats = {
      totalSymbols: 0,
      totalVertices: 0,
      totalEdges: 0,
      memoryOptimizationLevel: 'OPTIMAL',
      estimatedMemorySavings: 0,
    };

    // Note: Deferred reference processing now uses shared priority scheduler
    // No queue initialization needed here
  }

  /**
   * Remove a file's symbols from the graph
   * Normalizes URI to ensure consistent lookup
   */
  removeFile(fileUri: string): void {
    const normalizedUri = extractFilePathFromUri(fileUri);
    const symbolIds = this.fileIndex.get(normalizedUri) || [];

    for (const symbolId of symbolIds) {
      // Remove from graph
      const vertex = this.symbolToVertex.get(symbolId);
      if (vertex) {
        this.referenceGraph.deleteVertex(vertex);
        this.memoryStats.totalVertices--;
      }

      // Remove from indexes
      this.symbolFileMap.delete(symbolId);
      this.fqnIndex.delete(symbolId);
      this.symbolIds.delete(symbolId);
      this.symbolToVertex.delete(symbolId);
      this.symbolIdIndex.delete(symbolId);

      // Update name index
      for (const [name, ids] of this.nameIndex.entries()) {
        if (ids) {
          const filteredIds = ids.filter((id) => id !== symbolId);
          if (filteredIds.length === 0) {
            this.nameIndex.delete(name);
          } else {
            this.nameIndex.set(name, filteredIds);
          }
        }
      }
    }

    // Remove from file index (use normalized URI)
    this.fileIndex.delete(normalizedUri);

    // Remove SymbolTable reference (use normalized URI)
    this.fileToSymbolTable.delete(normalizedUri);

    this.memoryStats.totalSymbols -= symbolIds.length;
  }

  /**
   * Generate a unique symbol ID using URI-based format
   */
  private getSymbolId(symbol: ApexSymbol, fileUri: string): string {
    // If the symbol already has an ID, use it
    if (symbol.id) {
      return symbol.id;
    }

    // Extract just the file path from the fileUri (remove symbol name and line number)
    const theFileUri = extractFilePathFromUri(
      fileUri || symbol.fileUri || 'unknown',
    );
    const lineNumber = symbol.location?.identifierRange.startLine;
    return generateSymbolId(
      symbol.name,
      theFileUri,
      undefined, // scopePath not available here
      lineNumber,
      symbol.kind, // Include kind/prefix to ensure uniqueness
    );
  }

  /**
   * Find symbol ID for a symbol
   */
  private findSymbolId(symbol: ApexSymbol): string | null {
    const fileUri = symbol.fileUri || 'unknown';
    const symbolId = this.getSymbolId(symbol, fileUri);
    return this.symbolIds.has(symbolId) ? symbolId : null;
  }

  /**
   * Add a deferred reference
   */
  private addDeferredReference(
    sourceSymbol: ApexSymbol,
    targetSymbolName: string,
    referenceType: EnumValue<typeof ReferenceType>,
    location: SymbolLocation,
    context?: {
      methodName?: string;
      parameterIndex?: number;
      isStatic?: boolean;
      namespace?: string;
    },
  ): void {
    const existing = this.deferredReferences.get(targetSymbolName) || [];
    existing.push({
      sourceSymbol,
      referenceType,
      location,
      context,
    });
    this.deferredReferences.set(targetSymbolName, existing);

    // Log when references are deferred for debugging
    this.logger.debug(
      () =>
        'Deferred reference added: ' +
        `source=${sourceSymbol.name} (kind=${sourceSymbol.kind}, ` +
        `fileUri=${sourceSymbol.fileUri || 'none'}), ` +
        `target=${targetSymbolName}, ` +
        `refType=${String(referenceType)}` +
        (context?.methodName ? `, method=${context.methodName}` : ''),
    );
  }

  /**
   * Create a virtual symbol for built-in types and add the reference immediately
   * TODO: remove once all apex classes are converted to use file uris
   */
  private createVirtualSymbolForBuiltInType(
    targetSymbol: ApexSymbol,
    sourceSymbol: ApexSymbol,
    referenceType: EnumValue<typeof ReferenceType>,
    location: SymbolLocation,
    context?: {
      methodName?: string;
      parameterIndex?: number;
      isStatic?: boolean;
      namespace?: string;
    },
  ): void {
    // Create a virtual symbol ID for the built-in type
    const virtualSymbolId = `built-in://apex:${targetSymbol.name}`;

    // Check if we already have this virtual symbol
    if (this.symbolIds.has(virtualSymbolId)) {
      // Symbol already exists, just add the reference
      this.addReferenceToGraph(
        sourceSymbol,
        targetSymbol,
        virtualSymbolId,
        referenceType,
        location,
        context,
      );
      return;
    }

    // Create a virtual symbol for the built-in type
    const virtualSymbol: ApexSymbol = {
      ...targetSymbol,
      id: virtualSymbolId,
      fileUri: targetSymbol.fileUri,
    };

    // Add the virtual symbol to the graph
    this.symbolIds.add(virtualSymbolId);
    this.symbolFileMap.set(virtualSymbolId, virtualSymbol.fileUri);

    // Add to name index
    const existingNames = this.nameIndex.get(virtualSymbol.name) || [];
    if (!existingNames.includes(virtualSymbolId)) {
      existingNames.push(virtualSymbolId);
      this.nameIndex.set(virtualSymbol.name, existingNames);
    }

    // Add to FQN index
    if (virtualSymbol.fqn) {
      this.fqnIndex.set(virtualSymbol.fqn, virtualSymbolId);
    }

    // Create a lightweight node for the graph
    const referenceNode: ReferenceNode = {
      symbolId: virtualSymbolId,
      fileUri: virtualSymbol.fileUri,
      lastUpdated: Date.now(),
      referenceCount: 0,
      nodeId: this.memoryStats.totalVertices + 1,
    };

    // Add vertex to graph
    const vertexAdded = this.referenceGraph.addVertex(
      virtualSymbolId,
      referenceNode,
    );
    if (!vertexAdded) {
      return;
    }

    // Get the vertex from the graph
    const vertex = this.referenceGraph.getVertex(virtualSymbolId);
    if (vertex) {
      this.symbolToVertex.set(virtualSymbolId, vertex);
    }

    // Now add the reference to the graph
    this.addReferenceToGraph(
      sourceSymbol,
      targetSymbol,
      virtualSymbolId,
      referenceType,
      location,
      context,
    );
  }

  /**
   * Add a reference to the graph between two symbols
   */
  private addReferenceToGraph(
    sourceSymbol: ApexSymbol,
    targetSymbol: ApexSymbol,
    targetSymbolId: string,
    referenceType: EnumValue<typeof ReferenceType>,
    location: SymbolLocation,
    context?: {
      methodName?: string;
      parameterIndex?: number;
      isStatic?: boolean;
      namespace?: string;
    },
  ): void {
    // Don't create reference edges to/from scope symbols (they're structural, not semantic)
    if (isBlockSymbol(sourceSymbol) || isBlockSymbol(targetSymbol)) {
      return;
    }

    // Find the source symbol in the graph
    const sourceSymbols = this.findSymbolByName(sourceSymbol.name);
    const sourceSymbolInGraph = sourceSymbol.fileUri
      ? sourceSymbols.find((s) => s.fileUri === sourceSymbol.fileUri)
      : sourceSymbols[0];

    if (!sourceSymbolInGraph) {
      return;
    }

    const sourceId = this.getSymbolId(
      sourceSymbolInGraph,
      sourceSymbolInGraph.fileUri,
    );
    // Check if reference already exists
    const existingEdge = this.referenceGraph.getEdge(sourceId, targetSymbolId);
    if (existingEdge) {
      return;
    }

    // Create optimized reference edge
    const referenceEdge: ReferenceEdge = {
      type: referenceType,
      sourceFileUri: sourceSymbolInGraph.fileUri,
      targetFileUri: targetSymbol.fileUri,
      context: context
        ? {
            methodName: context.methodName,
            parameterIndex: context.parameterIndex
              ? toUint16(context.parameterIndex)
              : undefined,
            isStatic: context.isStatic,
            namespace: context.namespace,
          }
        : undefined,
    };

    // Add edge to graph
    const edgeAdded = this.referenceGraph.addEdge(
      sourceId,
      targetSymbolId,
      1,
      referenceEdge,
    );
    if (!edgeAdded) {
    }
  }

  /**
   * Public API to enqueue a deferred reference for later resolution
   * Thin wrapper over the internal deferred reference mechanism
   */
  enqueueDeferredReference(
    sourceSymbol: ApexSymbol,
    targetSymbolName: string,
    referenceType: EnumValue<typeof ReferenceType>,
    location: SymbolLocation,
    context?: {
      methodName?: string;
      parameterIndex?: number;
      isStatic?: boolean;
      namespace?: string;
    },
  ): void {
    // If sourceSymbol is a block, find the containing method/class
    let actualSourceSymbol = sourceSymbol;
    if (isBlockSymbol(sourceSymbol) && sourceSymbol.fileUri) {
      const containingSymbol = this.findContainingSymbolForBlock(
        sourceSymbol,
        sourceSymbol.fileUri,
      );
      if (containingSymbol) {
        actualSourceSymbol = containingSymbol;
        this.logger.debug(
          () =>
            `Replacing block symbol ${sourceSymbol.name} with containing symbol ` +
            `${containingSymbol.name} (kind=${containingSymbol.kind}) for deferred reference`,
        );
      } else {
        // If we can't find a containing symbol, skip this reference
        // Block symbols shouldn't be used as source symbols
        this.logger.debug(
          () =>
            `Skipping deferred reference with block symbol source ${sourceSymbol.name} ` +
            '(no containing method/class found)',
        );
        return;
      }
    }

    this.addDeferredReference(
      actualSourceSymbol,
      targetSymbolName,
      referenceType,
      location,
      context,
    );
  }

  /**
   * Process deferred references for a symbol in batches with retry tracking (Effect-based)
   * Returns result indicating if retry is needed and why
   * This version yields periodically to prevent blocking
   */
  private processDeferredReferencesBatchEffect(
    symbolName: string,
  ): Effect.Effect<BatchProcessingResult, never, never> {
    const self = this;
    return Effect.gen(function* () {
      const deferred = self.deferredReferences.get(symbolName);
      if (!deferred || deferred.length === 0) {
        return { needsRetry: false, reason: 'success' };
      }

      // Find the target symbol by name
      const targetSymbols = self.findSymbolByName(symbolName);
      if (targetSymbols.length === 0) {
        // Target symbol not found - re-queue for retry
        return { needsRetry: true, reason: 'target_not_found' };
      }

      // Use the first symbol with this name
      const targetSymbol = targetSymbols[0];
      const targetId = self.getSymbolId(targetSymbol, targetSymbol.fileUri);

      // Process in batches to avoid blocking
      const batchSize = Math.min(self.DEFERRED_BATCH_SIZE, deferred.length);
      const totalDeferred = deferred.length;
      const batchStartTime = Date.now();

      // Log batch start
      self.logger.info(
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

        // Update fileUri lazily if needed (replaces expensive iteration from addSymbol)
        if (!ref.sourceSymbol.fileUri) {
          // Find source symbol to get fileUri
          const sourceSymbols = self.findSymbolByName(ref.sourceSymbol.name);
          if (sourceSymbols.length > 0) {
            ref.sourceSymbol.fileUri = sourceSymbols[0].fileUri;
          }
        }

        // Find the source symbol in the graph
        const sourceSymbols = self.findSymbolByName(ref.sourceSymbol.name);

        // If fileUri is undefined, match any symbol with the same name
        // Otherwise, require exact fileUri match
        const sourceSymbolInGraph = ref.sourceSymbol.fileUri
          ? sourceSymbols.find((s) => s.fileUri === ref.sourceSymbol.fileUri)
          : sourceSymbols[0]; // Take the first symbol with matching name

        if (!sourceSymbolInGraph) {
          // Source symbol not found - keep for retry later when source symbol is added
          const pending =
            self.pendingDeferredReferences.get(ref.sourceSymbol.name) || [];
          pending.push({
            targetSymbolName: symbolName,
            referenceType: ref.referenceType,
            location: ref.location,
            context: ref.context,
          });
          self.pendingDeferredReferences.set(ref.sourceSymbol.name, pending);

          self.logger.info(
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

        const sourceId = self.getSymbolId(
          sourceSymbolInGraph,
          sourceSymbolInGraph.fileUri,
        );

        // Create optimized reference edge
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

        // Add edge to graph
        const edgeAdded = self.referenceGraph.addEdge(
          sourceId,
          targetId,
          1,
          referenceEdge,
        );
        if (!edgeAdded) {
          self.logger.debug(
            () =>
              `Failed to add deferred reference edge: ${sourceId} -> ${targetId}`,
          );
          processed.push(ref);
          hasFailures = true;
          failureCount++;
          continue;
        }

        // Update reference count
        const targetVertex = self.symbolToVertex.get(targetId);
        if (targetVertex && targetVertex.value) {
          targetVertex.value.referenceCount++;
        }

        self.memoryStats.totalEdges++;
        processed.push(ref);
        successCount++;

        // Yield every 3 items to allow other tasks to run
        if ((i + 1) % 3 === 0) {
          yield* Effect.yieldNow();
        }
      }

      // Remove processed references
      const remaining = deferred.slice(batchSize);
      const batchDuration = Date.now() - batchStartTime;

      // Update metrics
      self.deferredProcessingMetrics.totalBatchesProcessed++;
      self.deferredProcessingMetrics.totalItemsProcessed += processed.length;
      self.deferredProcessingMetrics.totalSuccessCount += successCount;
      self.deferredProcessingMetrics.totalFailureCount += failureCount;
      self.deferredProcessingMetrics.totalBatchDuration += batchDuration;
      self.deferredProcessingMetrics.lastBatchTime = batchDuration;

      // Track queue depth periodically and log summaries
      const now = Date.now();
      const currentMetrics = yield* metrics().pipe(
        Effect.catchAll(() => Effect.succeed(null)),
      );
      if (currentMetrics) {
        const lowQueueSize = currentMetrics.queueSizes[Priority.Low] || 0;
        self.deferredProcessingMetrics.queueDepthHistory.push({
          timestamp: now,
          depth: lowQueueSize,
        });
        // Keep only last 100 entries
        if (self.deferredProcessingMetrics.queueDepthHistory.length > 100) {
          self.deferredProcessingMetrics.queueDepthHistory.shift();
        }
      }

      // Log periodic summary every 50 batches or every 5 seconds
      const timeSinceLastLog =
        now - self.deferredProcessingMetrics.lastMetricsLogTime;
      if (
        self.deferredProcessingMetrics.totalBatchesProcessed % 50 === 0 ||
        timeSinceLastLog >= 5000
      ) {
        yield* self
          .logDeferredProcessingSummary()
          .pipe(Effect.catchAll(() => Effect.void));
        self.deferredProcessingMetrics.lastMetricsLogTime = now;
      }

      // Log batch completion
      self.logger.info(
        () =>
          `[DEFERRED] Completed batch processing for symbol: ${symbolName}, ` +
          `processed: ${processed.length}/${batchSize}, ` +
          `success: ${successCount}, failures: ${failureCount}, ` +
          `remaining: ${remaining.length}, duration: ${batchDuration}ms`,
      );

      if (remaining.length > 0) {
        self.deferredReferences.set(symbolName, remaining);
        return {
          needsRetry: true,
          reason: 'partial_processing',
          remainingCount: remaining.length,
        };
      } else {
        self.deferredReferences.delete(symbolName);
      }

      return {
        needsRetry: hasFailures,
        reason: hasFailures ? 'source_not_found' : 'success',
      };
    });
  }

  /**
   * Process deferred references for a symbol in batches with retry tracking
   * Returns result indicating if retry is needed and why
   * @deprecated Use processDeferredReferencesBatchEffect for Effect-based processing with yielding
   */
  private processDeferredReferencesBatch(
    symbolName: string,
  ): BatchProcessingResult {
    const deferred = this.deferredReferences.get(symbolName);
    if (!deferred || deferred.length === 0) {
      return { needsRetry: false, reason: 'success' };
    }

    // Find the target symbol by name
    const targetSymbols = this.findSymbolByName(symbolName);
    if (targetSymbols.length === 0) {
      // Target symbol not found - re-queue for retry
      return { needsRetry: true, reason: 'target_not_found' };
    }

    // Use the first symbol with this name
    const targetSymbol = targetSymbols[0];
    const targetId = this.getSymbolId(targetSymbol, targetSymbol.fileUri);

    // Process in batches to avoid blocking
    const batchSize = Math.min(this.DEFERRED_BATCH_SIZE, deferred.length);
    const processed: typeof deferred = [];
    let hasFailures = false;

    for (let i = 0; i < batchSize; i++) {
      const ref = deferred[i];
      if (!ref) continue;

      // Update fileUri lazily if needed (replaces expensive iteration from addSymbol)
      if (!ref.sourceSymbol.fileUri) {
        // Find source symbol to get fileUri
        const sourceSymbols = this.findSymbolByName(ref.sourceSymbol.name);
        if (sourceSymbols.length > 0) {
          ref.sourceSymbol.fileUri = sourceSymbols[0].fileUri;
        }
      }

      // Find the source symbol in the graph
      const sourceSymbols = this.findSymbolByName(ref.sourceSymbol.name);

      // If fileUri is undefined, match any symbol with the same name
      // Otherwise, require exact fileUri match
      const sourceSymbolInGraph = ref.sourceSymbol.fileUri
        ? sourceSymbols.find((s) => s.fileUri === ref.sourceSymbol.fileUri)
        : sourceSymbols[0]; // Take the first symbol with matching name

      if (!sourceSymbolInGraph) {
        // Source symbol not found - keep for retry later when source symbol is added
        const pending =
          this.pendingDeferredReferences.get(ref.sourceSymbol.name) || [];
        pending.push({
          targetSymbolName: symbolName,
          referenceType: ref.referenceType,
          location: ref.location,
          context: ref.context,
        });
        this.pendingDeferredReferences.set(ref.sourceSymbol.name, pending);

        this.logger.info(
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
        continue;
      }

      const sourceId = this.getSymbolId(
        sourceSymbolInGraph,
        sourceSymbolInGraph.fileUri,
      );

      // Create optimized reference edge
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

      // Add edge to graph
      const edgeAdded = this.referenceGraph.addEdge(
        sourceId,
        targetId,
        1,
        referenceEdge,
      );
      if (!edgeAdded) {
        this.logger.warn(
          () =>
            `Failed to add deferred reference edge: ${sourceId} -> ${targetId}`,
        );
        processed.push(ref);
        hasFailures = true;
        continue;
      }

      // Update reference count
      const targetVertex = this.symbolToVertex.get(targetId);
      if (targetVertex && targetVertex.value) {
        targetVertex.value.referenceCount++;
      }

      this.memoryStats.totalEdges++;
      processed.push(ref);
    }

    // Remove processed references
    const remaining = deferred.filter((ref) => !processed.includes(ref));
    if (remaining.length === 0) {
      this.deferredReferences.delete(symbolName);
      return { needsRetry: false, reason: 'success' };
    } else {
      // Update with remaining references
      this.deferredReferences.set(symbolName, remaining);
      return {
        needsRetry: true,
        reason: hasFailures
          ? 'source_not_found_or_edge_failed'
          : 'batch_incomplete',
        remainingCount: remaining.length,
      };
    }
  }

  /**
   * Process deferred references for a symbol (legacy method, kept for backward compatibility)
   * @deprecated Use processDeferredReferencesBatch instead
   */
  private processDeferredReferences(symbolName: string): void {
    const result = this.processDeferredReferencesBatch(symbolName);
    if (result.needsRetry && result.remainingCount === undefined) {
      // If it needs retry but no remaining count, it means target not found
      // This is handled by the queue system now
      this.logger.debug(
        () =>
          `Deferred reference processing queued for retry: ${symbolName} (${result.reason})`,
      );
    }
  }

  /**
   * Retry pending deferred references when source symbol is added (Effect-based)
   * Returns result indicating if retry is needed and why
   * This version yields periodically to prevent blocking
   */
  private retryPendingDeferredReferencesBatchEffect(
    symbolName: string,
  ): Effect.Effect<BatchProcessingResult, never, never> {
    const self = this;
    return Effect.gen(function* () {
      const pending = self.pendingDeferredReferences.get(symbolName);
      if (!pending || pending.length === 0) {
        return { needsRetry: false, reason: 'success' };
      }

      // Find the source symbol
      const sourceSymbols = self.findSymbolByName(symbolName);
      if (sourceSymbols.length === 0) {
        // Source symbol not found - re-queue for retry
        return { needsRetry: true, reason: 'source_not_found' };
      }

      const sourceSymbol = sourceSymbols[0];
      const sourceId = self.getSymbolId(sourceSymbol, sourceSymbol.fileUri);

      // Process in batches to avoid blocking
      const batchSize = Math.min(self.DEFERRED_BATCH_SIZE, pending.length);
      const totalPending = pending.length;
      const batchStartTime = Date.now();

      // Log batch start
      self.logger.info(
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
        const targetSymbols = self.findSymbolByName(ref.targetSymbolName);
        if (targetSymbols.length === 0) {
          // Target symbol still not found - keep for later retry
          self.logger.debug(
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
        const targetId = self.getSymbolId(targetSymbol, targetSymbol.fileUri);

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
        const edgeAdded = self.referenceGraph.addEdge(
          sourceId,
          targetId,
          1,
          referenceEdge,
        );
        if (!edgeAdded) {
          self.logger.debug(
            () =>
              `Failed to add pending deferred reference edge: ${sourceId} -> ${targetId}`,
          );
          processed.push(ref);
          hasFailures = true;
          failureCount++;
          continue;
        }

        // Update reference count
        const targetVertex = self.symbolToVertex.get(targetId);
        if (targetVertex && targetVertex.value) {
          targetVertex.value.referenceCount++;
        }

        self.memoryStats.totalEdges++;
        processed.push(ref);
        successCount++;

        // Yield every 10 items to allow other tasks to run
        if ((i + 1) % 10 === 0) {
          yield* Effect.yieldNow();
        }
      }

      // Remove processed references
      const remaining = pending.filter((ref) => !processed.includes(ref));
      const batchDuration = Date.now() - batchStartTime;

      // Update metrics
      self.deferredProcessingMetrics.totalBatchesProcessed++;
      self.deferredProcessingMetrics.totalItemsProcessed += processed.length;
      self.deferredProcessingMetrics.totalSuccessCount += successCount;
      self.deferredProcessingMetrics.totalFailureCount += failureCount;
      self.deferredProcessingMetrics.totalBatchDuration += batchDuration;
      self.deferredProcessingMetrics.lastBatchTime = batchDuration;

      // Log batch completion
      self.logger.info(
        () =>
          `[DEFERRED] Completed retry batch processing for symbol: ${symbolName}, ` +
          `processed: ${processed.length}/${batchSize}, ` +
          `success: ${successCount}, failures: ${failureCount}, ` +
          `remaining: ${remaining.length}, duration: ${batchDuration}ms`,
      );

      if (remaining.length === 0) {
        self.pendingDeferredReferences.delete(symbolName);
        return { needsRetry: false, reason: 'success' };
      } else {
        // Update with remaining references
        self.pendingDeferredReferences.set(symbolName, remaining);
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
   * Retry pending deferred references when source symbol is added (batch version)
   * Returns result indicating if retry is needed and why
   * @deprecated Use retryPendingDeferredReferencesBatchEffect for Effect-based processing with yielding
   */
  private retryPendingDeferredReferencesBatch(
    symbolName: string,
  ): BatchProcessingResult {
    const pending = this.pendingDeferredReferences.get(symbolName);
    if (!pending || pending.length === 0) {
      return { needsRetry: false, reason: 'success' };
    }

    // Find the source symbol
    const sourceSymbols = this.findSymbolByName(symbolName);
    if (sourceSymbols.length === 0) {
      // Source symbol not found - re-queue for retry
      return { needsRetry: true, reason: 'source_not_found' };
    }

    const sourceSymbol = sourceSymbols[0];
    const sourceId = this.getSymbolId(sourceSymbol, sourceSymbol.fileUri);

    // Process in batches to avoid blocking
    const batchSize = Math.min(this.DEFERRED_BATCH_SIZE, pending.length);
    const processed: typeof pending = [];
    let hasFailures = false;

    for (let i = 0; i < batchSize; i++) {
      const ref = pending[i];
      if (!ref) continue;

      // Find the target symbol by name
      const targetSymbols = this.findSymbolByName(ref.targetSymbolName);
      if (targetSymbols.length === 0) {
        // Target symbol still not found - keep for later retry
        this.logger.debug(
          () =>
            `Target symbol not found for pending deferred reference: ${ref.targetSymbolName}, ` +
            'will retry when target symbol is added',
        );
        processed.push(ref);
        hasFailures = true;
        continue;
      }

      const targetSymbol = targetSymbols[0];
      const targetId = this.getSymbolId(targetSymbol, targetSymbol.fileUri);

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
      const edgeAdded = this.referenceGraph.addEdge(
        sourceId,
        targetId,
        1,
        referenceEdge,
      );
      if (!edgeAdded) {
        this.logger.warn(
          () =>
            `Failed to add pending deferred reference edge: ${sourceId} -> ${targetId}`,
        );
        processed.push(ref);
        hasFailures = true;
        continue;
      }

      // Update reference count
      const targetVertex = this.symbolToVertex.get(targetId);
      if (targetVertex && targetVertex.value) {
        targetVertex.value.referenceCount++;
      }

      this.memoryStats.totalEdges++;
      processed.push(ref);

      this.logger.debug(
        () =>
          `Retried pending deferred reference: ${symbolName} -> ${ref.targetSymbolName}`,
      );
    }

    // Remove processed references
    const remaining = pending.filter((ref) => !processed.includes(ref));
    if (remaining.length === 0) {
      this.pendingDeferredReferences.delete(symbolName);
      return { needsRetry: false, reason: 'success' };
    } else {
      // Update with remaining references
      this.pendingDeferredReferences.set(symbolName, remaining);
      return {
        needsRetry: true,
        reason: hasFailures
          ? 'target_not_found_or_edge_failed'
          : 'batch_incomplete',
        remainingCount: remaining.length,
      };
    }
  }

  /**
   * Retry pending deferred references when source symbol is added (legacy method)
   * @deprecated Use retryPendingDeferredReferencesBatch instead
   */
  private retryPendingDeferredReferences(sourceSymbol: ApexSymbol): void {
    const result = this.retryPendingDeferredReferencesBatch(sourceSymbol.name);
    if (result.needsRetry && result.remainingCount === undefined) {
      // If it needs retry but no remaining count, it means source not found
      // This is handled by the queue system now
      this.logger.debug(
        () =>
          `Pending deferred reference retry queued: ${sourceSymbol.name} (${result.reason})`,
      );
    }
  }

  /**
   * Calculate impact score for dependency analysis
   */
  private calculateImpactScore(
    dependents: ApexSymbol[],
    dependencies: ApexSymbol[],
  ): number {
    // Impact score disabled: always return zero
    return 0;
  }

  /**
   * Calculate estimated memory savings
   */
  private calculateMemorySavings(): number {
    // Estimate memory savings from not storing full symbols
    const estimatedSymbolSize = 500; // bytes per symbol
    const savedBytes = this.memoryStats.totalSymbols * estimatedSymbolSize;
    return savedBytes;
  }

  /**
   * Get all nodes (symbols) in the graph as JSON-serializable data
   * Leverages existing SymbolTable.toJSON() cleaning patterns
   */
  getAllNodes(): import('../types/graph').GraphNode[] {
    return extractGetAllNodes();
  }

  /**
   * Get all edges (references) in the graph as JSON-serializable data
   */
  getAllEdges(): import('../types/graph').GraphEdge[] {
    return extractGetAllEdges();
  }

  /**
   * Get complete graph data (nodes + edges) as JSON-serializable data
   */
  getGraphData(): import('../types/graph').GraphData {
    return extractGetGraphData();
  }

  /**
   * Get graph data filtered by file as JSON-serializable data
   */
  getGraphDataForFile(fileUri: string): import('../types/graph').FileGraphData {
    return extractGetGraphDataForFile(fileUri);
  }

  /**
   * Get graph data filtered by symbol type as JSON-serializable data
   */
  getGraphDataByType(
    symbolType: string,
  ): import('../types/graph').TypeGraphData {
    return extractGetGraphDataByType(symbolType);
  }

  /**
   * Get graph data as a JSON string (for direct wire transmission)
   * Leverages existing JSON.stringify patterns
   */
  getGraphDataAsJSON(): string {
    return extractGetGraphDataAsJSON();
  }

  /**
   * Get graph data for a file as a JSON string
   */
  getGraphDataForFileAsJSON(fileUri: string): string {
    return extractGetGraphDataForFileAsJSON(fileUri);
  }

  /**
   * Get graph data by type as a JSON string
   */
  getGraphDataByTypeAsJSON(symbolType: string): string {
    return extractGetGraphDataByTypeAsJSON(symbolType);
  }

  /**
   * Public accessor methods for graph data extraction functions
   */
  public getSymbolIds(): Set<string> {
    return this.symbolIds;
  }

  public getSymbolToVertex(): HashMap<string, DirectedVertex<ReferenceNode>> {
    return this.symbolToVertex;
  }

  public getReferenceGraph(): DirectedGraph<ReferenceNode, ReferenceEdge> {
    return this.referenceGraph;
  }

  public getFileToSymbolTable(): HashMap<string, SymbolTable> {
    return this.fileToSymbolTable;
  }

  public getFileIndex(): HashMap<string, string[]> {
    return this.fileIndex;
  }

  public getLoggerInstance() {
    return this.logger;
  }

  /**
   * Log periodic summary of deferred processing metrics
   */
  private logDeferredProcessingSummary(): Effect.Effect<void, never, never> {
    const self = this;
    return Effect.gen(function* () {
      const deferredMetrics = self.deferredProcessingMetrics;
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

      self.logger.info(
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
}
