/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap, DirectedGraph, DirectedVertex } from 'data-structure-typed';
import { Effect, Fiber, Duration, Ref, Layer } from 'effect';
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
  DeferredReferenceProcessorService,
  queuePendingReferencesForSymbol,
  processDeferredReference,
  processPendingDeferredReference,
  processDeferredReferencesBatchEffect,
  retryPendingDeferredReferencesBatchEffect,
  logDeferredProcessingSummary,
  type DeferredReference,
  type PendingDeferredReference,
  type DeferredProcessingMetrics,
  type MemoryStats,
} from './DeferredReferenceProcessor';
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
  TypeSymbol,
  Range,
  keyToString,
  inTypeSymbolGroup,
} from '../types/symbol';
import {
  isBlockSymbol,
  isMethodSymbol,
  isMethodOrConstructorSymbol,
} from '../utils/symbolNarrowing';
import { calculateFQN } from '../utils/FQNUtils';
import { doesSignatureMatch } from '../semantics/validation/utils/methodSignatureUtils';
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
    /** Call-site arity, used as the overload discriminator (F11-2). */
    argumentCount?: number;
    /**
     * Positional call-site argument type strings, the signature key that
     * separates same-arity overloads (`f(String)` vs `f(Integer)`, W-23182862).
     */
    argumentTypes?: string[];
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
    /** Call-site arity, used as the overload discriminator (F11-2). */
    argumentCount?: number;
    /**
     * Positional call-site argument type strings, the signature key that
     * separates same-arity overloads (`f(String)` vs `f(Integer)`, W-23182862).
     */
    argumentTypes?: string[];
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

export type SymbolTableRegistrationDecision =
  | 'accepted-replace'
  | 'accepted-merge'
  | 'accepted-fallback-merge'
  | 'rejected-stale'
  | 'noop-same-instance';

export interface SymbolTableRegistrationResult {
  decision: SymbolTableRegistrationDecision;
  fileUri: string;
  canonicalTable: SymbolTable;
  incomingVersion?: number;
  storedVersion?: number;
  reason?: string;
}

/**
 * Lightweight node for graph storage - only contains references
 * @deprecated Replaced by index-based reference tracking
 */
export interface ReferenceNode {
  symbolId: string;
  fileUri: string;
  lastUpdated: number;
  referenceCount: number;
  nodeId: number;
}

/**
 * Entry in the reference store with all metadata needed for reference lookups
 */
export interface RefStoreEntry {
  /** Source file URI where the reference originates */
  sourceFileUri: string;
  /** Stable ID of the source symbol making the reference */
  sourceSymbolId: string;
  /** Target file URI being referenced */
  targetFileUri: string;
  /** Stable ID of the target symbol being referenced */
  targetSymbolId: string;
  /** Type of reference (method call, field access, etc.) */
  referenceType: EnumValue<typeof ReferenceType>;
  /** Location of the reference in source code */
  location: SymbolLocation;
  /** Additional context for the reference */
  context?: {
    methodName?: string;
    parameterIndex?: number;
    isStatic?: boolean;
    namespace?: string;
    /** Call-site arity, used as the overload discriminator (F11-2). */
    argumentCount?: number;
    /**
     * Positional call-site argument type strings, the signature key that
     * separates same-arity overloads (`f(String)` vs `f(Integer)`, W-23182862).
     */
    argumentTypes?: string[];
  };
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
 * OPTIMIZED: ApexSymbolRefManager with SymbolTable as primary storage
 * Eliminates duplicate symbol storage and delegates to SymbolTable
 */
export class ApexSymbolRefManager {
  private static instance: ApexSymbolRefManager | null = null;
  private static readonly INTERNAL_KEY_SEP = '\x1f';

  private readonly logger = getLogger();

  // OPTIMIZED: Index-based reference tracking (replaces DirectedGraph)
  // reverseIndex: Who references this symbol? (for findReferencesTo)
  private reverseIndex: CaseInsensitiveHashMap<Set<string>> =
    new CaseInsensitiveHashMap();

  // forwardIndex: What refs originate from this file? (for file cleanup)
  private forwardIndex: CaseInsensitiveHashMap<Set<string>> =
    new CaseInsensitiveHashMap();

  // refStore: Full reference details keyed by refKey
  private refStore: CaseInsensitiveHashMap<RefStoreEntry> =
    new CaseInsensitiveHashMap();

  // OPTIMIZED: Indexes for fast lookups (delegate to SymbolTable for actual data)
  // These maps provide O(1) lookup performance for common symbol operations

  /**
   * Maps symbol ID to file uri for quick file location lookups
   * Key: Symbol ID (e.g., "file:///path/MyClass.cls#MyClass.MyClass$class")
   * Value: File uri (e.g., "file:///path/MyClass.cls")
   * Used by: File-based operations, symbol removal, dependency analysis
   */
  private symbolFileMap: CaseInsensitiveHashMap<string> =
    new CaseInsensitiveHashMap();

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
  private fileIndex: CaseInsensitiveHashMap<string[]> =
    new CaseInsensitiveHashMap();

  /**
   * Maps fully qualified names to symbol IDs for hierarchical lookups
   * Key: Fully qualified name (e.g., "MyNamespace.MyClass.myMethod") - case-insensitive for Apex
   * Value: Array of symbol IDs (supports duplicate declarations)
   * Used by: findSymbolByFQN(), hierarchical symbol resolution, namespace-aware lookups
   */
  private fqnIndex: CaseInsensitiveHashMap<string[]> =
    new CaseInsensitiveHashMap();

  /**
   * Maps symbol IDs to symbol objects for O(1) lookups
   * Key: Symbol ID (e.g., "file:///path/MyClass.cls#MyClass.MyClass$class")
   * Value: ApexSymbol object
   * Used by: getParent() helper, optimized parent resolution
   */
  private symbolIdIndex: HashMap<string, ApexSymbol> = new HashMap();
  private symbolQualifiedIndex: CaseInsensitiveHashMap<ApexSymbol> =
    new CaseInsensitiveHashMap();

  // OPTIMIZED: SymbolTable references for delegation
  private fileToSymbolTable: CaseInsensitiveHashMap<SymbolTable> =
    new CaseInsensitiveHashMap();
  private symbolToFiles: CaseInsensitiveHashMap<string[]> =
    new CaseInsensitiveHashMap();

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
      // Resolved target fileUri (when known at enqueue time), so the processor
      // can rebind to the correct same-named symbol across namespaces.
      targetFileUri?: string;
      context?: {
        methodName?: string;
        parameterIndex?: number;
        isStatic?: boolean;
        namespace?: string;
        argumentCount?: number;
        argumentTypes?: string[];
      };
    }>
  > = new CaseInsensitiveHashMap();

  // Pending deferred references that failed resolution (source symbol not found)
  // These are retried when new symbols are added, keyed by source symbol name (case-insensitive for Apex)
  private pendingDeferredReferences: CaseInsensitiveHashMap<
    Array<{
      targetSymbolName: string;
      // See deferredReferences.targetFileUri.
      targetFileUri?: string;
      referenceType: EnumValue<typeof ReferenceType>;
      location: SymbolLocation;
      context?: {
        methodName?: string;
        parameterIndex?: number;
        isStatic?: boolean;
        namespace?: string;
        argumentCount?: number;
        argumentTypes?: string[];
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
  private YIELD_TIME_THRESHOLD_MS = 50;
  private MAX_RETRY_DELAY_MS = 5000; // Cap exponential backoff at 5 seconds
  private QUEUE_CAPACITY_THRESHOLD = 90; // Don't retry if queue > 90% full
  private QUEUE_DRAIN_THRESHOLD = 75; // Only retry when queue < 75% full
  private QUEUE_FULL_RETRY_DELAY_MS = 10000; // 10 second delay when queue is full
  private MAX_QUEUE_FULL_RETRY_DELAY_MS = 30000; // Cap queue-full retry delay at 30 seconds
  private CIRCUIT_BREAKER_FAILURE_THRESHOLD = 5; // Activate after 5 consecutive failures
  private CIRCUIT_BREAKER_RESET_THRESHOLD = 50; // Reset when queue < 50% full
  private failedReferences: CaseInsensitiveHashMap<DeferredProcessingTask> =
    new CaseInsensitiveHashMap();
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

  // Refs for deferred reference processor service
  private deferredReferencesRef: Ref.Ref<
    CaseInsensitiveHashMap<DeferredReference[]>
  >;
  private pendingDeferredReferencesRef: Ref.Ref<
    CaseInsensitiveHashMap<PendingDeferredReference[]>
  >;
  private deferredProcessingMetricsRef: Ref.Ref<DeferredProcessingMetrics>;
  private memoryStatsRef: Ref.Ref<MemoryStats>;
  private deferredProcessorLayer: Layer.Layer<
    DeferredReferenceProcessorService,
    never
  >;

  constructor(
    deferredReferenceSettings?: Partial<DeferredReferenceProcessingSettings>,
  ) {
    this.resourceLoader = ResourceLoader.getInstance();
    // Initialize rate limiter from settings
    if (deferredReferenceSettings?.maxDeferredTasksPerSecond !== undefined) {
      this.deferredTaskRateLimiter.maxPerSecond =
        deferredReferenceSettings.maxDeferredTasksPerSecond;
    }
    // Initialize yield time threshold from settings
    if (deferredReferenceSettings?.yieldTimeThresholdMs !== undefined) {
      this.YIELD_TIME_THRESHOLD_MS =
        deferredReferenceSettings.yieldTimeThresholdMs;
    }
    // Note: Deferred reference processing now uses shared priority scheduler
    // Apply settings if provided
    if (deferredReferenceSettings) {
      this.updateDeferredReferenceSettings(deferredReferenceSettings);
    }

    // Create Refs for state (sync with class fields)
    this.deferredReferencesRef = Ref.unsafeMake(this.deferredReferences);
    this.pendingDeferredReferencesRef = Ref.unsafeMake(
      this.pendingDeferredReferences,
    );
    this.deferredProcessingMetricsRef = Ref.unsafeMake(
      this.deferredProcessingMetrics,
    );
    this.memoryStatsRef = Ref.unsafeMake(this.memoryStats);

    // Create service implementation
    // Note: We'll create the layer after serviceImpl is defined to avoid circular reference
    const self = this;
    const serviceImpl: DeferredReferenceProcessorService.Impl = {
      addEdge: (sourceId, targetId, weight, edge) => {
        throw new Error(
          'Graph-based addEdge removed. Use ApexSymbolRefManager.addReferenceToIndexes instead.',
        );
      },
      getVertex: (symbolId) => {
        throw new Error(
          'Graph-based getVertex removed. Vertices no longer exist.',
        );
      },
      findSymbolByName: (name) => self.findSymbolByName(name),
      getSymbolId: (symbol, fileUri) => self.getSymbolId(symbol, fileUri),
      deferredReferences: self.deferredReferencesRef,
      pendingDeferredReferences: self.pendingDeferredReferencesRef,
      deferredProcessingMetrics: self.deferredProcessingMetricsRef,
      memoryStats: self.memoryStatsRef,
      deferredBatchSize: self.DEFERRED_BATCH_SIZE,
      maxConcurrentReferencesPerSymbol: 10,
      yieldTimeThresholdMs: self.YIELD_TIME_THRESHOLD_MS,
      enqueueDeferredReferenceTask: (task) =>
        Effect.gen(function* () {
          // Create Layer on-the-fly for this call
          const layer = DeferredReferenceProcessorService.Live(serviceImpl);
          const processEffect = processDeferredReference(task).pipe(
            Effect.provide(layer),
          );
          const queuedItem = yield* createQueuedItem(
            processEffect,
            'deferred-reference-process',
          );
          yield* offer(task.priority, queuedItem);
        }),
      enqueuePendingReferenceTask: (task) =>
        Effect.gen(function* () {
          // Create Layer on-the-fly for this call
          const layer = DeferredReferenceProcessorService.Live(serviceImpl);
          const processEffect = processPendingDeferredReference(task).pipe(
            Effect.provide(layer),
          );
          const queuedItem = yield* createQueuedItem(
            processEffect,
            'pending-deferred-reference-process',
          );
          yield* offer(task.priority, queuedItem);
        }),
      logger: self.logger,
    };

    // Create Layer for use in other methods
    this.deferredProcessorLayer =
      DeferredReferenceProcessorService.Live(serviceImpl);
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
      // Update the service's deferredBatchSize by recreating the layer
      // Note: The serviceImpl object captures self.DEFERRED_BATCH_SIZE by reference,
      // so we need to update the service implementation
      const self = this;
      const serviceImpl: DeferredReferenceProcessorService.Impl = {
        addEdge: (sourceId, targetId, weight, edge) => {
          throw new Error(
            'Graph-based addEdge removed. Use ApexSymbolRefManager.addReferenceToIndexes instead.',
          );
        },
        getVertex: (symbolId) => {
          throw new Error(
            'Graph-based getVertex removed. Vertices no longer exist.',
          );
        },
        findSymbolByName: (name) => self.findSymbolByName(name),
        getSymbolId: (symbol, fileUri) => self.getSymbolId(symbol, fileUri),
        deferredReferences: self.deferredReferencesRef,
        pendingDeferredReferences: self.pendingDeferredReferencesRef,
        deferredProcessingMetrics: self.deferredProcessingMetricsRef,
        memoryStats: self.memoryStatsRef,
        deferredBatchSize: self.DEFERRED_BATCH_SIZE, // Updated value
        maxConcurrentReferencesPerSymbol: 10,
        yieldTimeThresholdMs: self.YIELD_TIME_THRESHOLD_MS,
        enqueueDeferredReferenceTask: (task) =>
          Effect.gen(function* () {
            const layer = DeferredReferenceProcessorService.Live(serviceImpl);
            const processEffect = processDeferredReference(task).pipe(
              Effect.provide(layer),
            );
            const queuedItem = yield* createQueuedItem(
              processEffect,
              'deferred-reference-process',
            );
            yield* offer(task.priority, queuedItem);
          }),
        enqueuePendingReferenceTask: (task) =>
          Effect.gen(function* () {
            const layer = DeferredReferenceProcessorService.Live(serviceImpl);
            const processEffect = processPendingDeferredReference(task).pipe(
              Effect.provide(layer),
            );
            const queuedItem = yield* createQueuedItem(
              processEffect,
              'pending-deferred-reference-process',
            );
            yield* offer(task.priority, queuedItem);
          }),
        logger: self.logger,
      };
      this.deferredProcessorLayer =
        DeferredReferenceProcessorService.Live(serviceImpl);
    }
    if (settings.yieldTimeThresholdMs !== undefined) {
      this.YIELD_TIME_THRESHOLD_MS = settings.yieldTimeThresholdMs;
      // Update the service's yieldTimeThresholdMs by recreating the layer
      const self = this;
      const serviceImpl: DeferredReferenceProcessorService.Impl = {
        addEdge: (sourceId, targetId, weight, edge) => {
          throw new Error(
            'Graph-based addEdge removed. Use ApexSymbolRefManager.addReferenceToIndexes instead.',
          );
        },
        getVertex: (symbolId) => {
          throw new Error(
            'Graph-based getVertex removed. Vertices no longer exist.',
          );
        },
        findSymbolByName: (name) => self.findSymbolByName(name),
        getSymbolId: (symbol, fileUri) => self.getSymbolId(symbol, fileUri),
        deferredReferences: self.deferredReferencesRef,
        pendingDeferredReferences: self.pendingDeferredReferencesRef,
        deferredProcessingMetrics: self.deferredProcessingMetricsRef,
        memoryStats: self.memoryStatsRef,
        deferredBatchSize: self.DEFERRED_BATCH_SIZE,
        maxConcurrentReferencesPerSymbol: 10,
        yieldTimeThresholdMs: self.YIELD_TIME_THRESHOLD_MS, // Updated value
        enqueueDeferredReferenceTask: (task) =>
          Effect.gen(function* () {
            const layer = DeferredReferenceProcessorService.Live(serviceImpl);
            const processEffect = processDeferredReference(task).pipe(
              Effect.provide(layer),
            );
            const queuedItem = yield* createQueuedItem(
              processEffect,
              'deferred-reference-process',
            );
            yield* offer(task.priority, queuedItem);
          }),
        enqueuePendingReferenceTask: (task) =>
          Effect.gen(function* () {
            const layer = DeferredReferenceProcessorService.Live(serviceImpl);
            const processEffect = processPendingDeferredReference(task).pipe(
              Effect.provide(layer),
            );
            const queuedItem = yield* createQueuedItem(
              processEffect,
              'pending-deferred-reference-process',
            );
            yield* offer(task.priority, queuedItem);
          }),
        logger: self.logger,
      };
      this.deferredProcessorLayer =
        DeferredReferenceProcessorService.Live(serviceImpl);
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

  private makeInternalKey(...parts: Array<string | number>): string {
    return parts
      .map((part) => String(part))
      .join(ApexSymbolRefManager.INTERNAL_KEY_SEP);
  }

  private makeRetryKey(
    taskType: DeferredProcessingTask['taskType'],
    symbolName: string,
  ): string {
    return this.makeInternalKey(taskType, symbolName);
  }

  private makeSourceCounterKey(
    sourceFileUri: string,
    sourceSymbolId: string,
  ): string {
    return this.makeInternalKey(sourceFileUri, sourceSymbolId);
  }

  private makeRefKey(
    sourceFileUri: string,
    sourceSymbolId: string,
    refIndex: number,
  ): string {
    return this.makeInternalKey(sourceFileUri, sourceSymbolId, refIndex);
  }

  /**
   * Build an artifact-qualified symbol key for index lookups.
   * This prevents collisions when identical symbol IDs exist across artifacts.
   */
  private makeQualifiedSymbolKey(fileUri: string, symbolId: string): string {
    return this.makeInternalKey(extractFilePathFromUri(fileUri), symbolId);
  }

  // Counter for generating unique refKeys within each source symbol
  private refIndexCounters: CaseInsensitiveHashMap<number> =
    new CaseInsensitiveHashMap();

  /**
   * Generate a unique refKey for a reference
   * Format: {sourceFileUri}:{sourceStableId}:{refIndex}
   */
  private generateRefKey(
    sourceFileUri: string,
    sourceSymbolId: string,
  ): string {
    const counterKey = this.makeSourceCounterKey(sourceFileUri, sourceSymbolId);
    const currentIndex = this.refIndexCounters.get(counterKey) || 0;
    this.refIndexCounters.set(counterKey, currentIndex + 1);
    return this.makeRefKey(sourceFileUri, sourceSymbolId, currentIndex);
  }

  /**
   * Reset refIndex counter for a source symbol (when symbol is replaced)
   */
  private resetRefIndexCounter(
    sourceFileUri: string,
    sourceSymbolId: string,
  ): void {
    const counterKey = this.makeSourceCounterKey(sourceFileUri, sourceSymbolId);
    this.refIndexCounters.delete(counterKey);
  }

  /**
   * Add a reference to the indexes
   */
  private addReferenceToIndexes(
    sourceFileUri: string,
    sourceSymbolId: string,
    targetSymbolId: string,
    entry: RefStoreEntry,
  ): boolean {
    const targetIndexKey = this.makeQualifiedSymbolKey(
      entry.targetFileUri,
      targetSymbolId,
    );

    // Check if reference already exists (prevent duplicates)
    // A duplicate is defined as same source, target, type, and location
    const existingRefKeys = this.reverseIndex.get(targetIndexKey);
    if (existingRefKeys) {
      for (const existingRefKey of existingRefKeys) {
        const existingEntry = this.refStore.get(existingRefKey);
        if (
          existingEntry &&
          existingEntry.sourceSymbolId === sourceSymbolId &&
          existingEntry.targetSymbolId === targetSymbolId &&
          existingEntry.referenceType === entry.referenceType &&
          existingEntry.location.identifierRange.startLine ===
            entry.location.identifierRange.startLine &&
          existingEntry.location.identifierRange.startColumn ===
            entry.location.identifierRange.startColumn
        ) {
          // Duplicate found, skip adding
          return false;
        }
      }
    }

    const refKey = this.generateRefKey(sourceFileUri, sourceSymbolId);

    // Add to reverse index (for findReferencesTo)
    if (!this.reverseIndex.has(targetIndexKey)) {
      this.reverseIndex.set(targetIndexKey, new Set());
    }
    this.reverseIndex.get(targetIndexKey)!.add(refKey);

    // Add to forward index (for file cleanup)
    if (!this.forwardIndex.has(sourceFileUri)) {
      this.forwardIndex.set(sourceFileUri, new Set());
    }
    this.forwardIndex.get(sourceFileUri)!.add(refKey);

    // Store full reference details
    this.refStore.set(refKey, entry);
    return true;
  }

  /**
   * Helper method to create a RefStoreEntry and add it to indexes
   */
  private createAndAddReference(
    sourceFileUri: string,
    sourceSymbolId: string,
    targetFileUri: string,
    targetSymbolId: string,
    referenceType: EnumValue<typeof ReferenceType>,
    location: SymbolLocation,
    context?: {
      methodName?: string;
      parameterIndex?: number;
      isStatic?: boolean;
      namespace?: string;
      argumentCount?: number;
      argumentTypes?: string[];
    },
  ): boolean {
    const refEntry: RefStoreEntry = {
      sourceFileUri,
      sourceSymbolId,
      targetFileUri,
      targetSymbolId,
      referenceType,
      location,
      context: context
        ? {
            methodName: context.methodName,
            parameterIndex: context.parameterIndex
              ? toUint16(context.parameterIndex)
              : undefined,
            isStatic: context.isStatic,
            namespace: context.namespace,
            argumentCount: context.argumentCount,
            argumentTypes: context.argumentTypes,
          }
        : undefined,
    };

    return this.addReferenceToIndexes(
      sourceFileUri,
      sourceSymbolId,
      targetSymbolId,
      refEntry,
    );
  }

  private removeReferenceKey(refKey: string): void {
    const entry = this.refStore.get(refKey);
    if (!entry) {
      return;
    }

    const targetIndexKey = this.makeQualifiedSymbolKey(
      entry.targetFileUri,
      entry.targetSymbolId,
    );
    const reverseSet = this.reverseIndex.get(targetIndexKey);
    if (reverseSet) {
      reverseSet.delete(refKey);
      if (reverseSet.size === 0) {
        this.reverseIndex.delete(targetIndexKey);
      }
    }

    const forwardSet = this.forwardIndex.get(entry.sourceFileUri);
    if (forwardSet) {
      forwardSet.delete(refKey);
      if (forwardSet.size === 0) {
        this.forwardIndex.delete(entry.sourceFileUri);
      }
    }

    this.refStore.delete(refKey);
  }

  /**
   * Remove all references from a file (used during file replacement)
   */
  private removeReferencesFromFile(fileUri: string): void {
    const refKeys = this.forwardIndex.get(fileUri);
    if (!refKeys) {
      return;
    }

    for (const refKey of [...refKeys]) {
      this.removeReferenceKey(refKey);
    }
  }

  /**
   * Remove incoming references whose TARGET is a symbol declared in `fileUri`
   * (the source may live in any file). Used by full file removal (removeFile),
   * NOT by clearReferenceStateForFile — re-adding a file must preserve these.
   */
  private removeIncomingReferencesToSymbols(
    symbolIds: Set<string>,
    fileUri: string,
  ): void {
    const normalizedFileUri = extractFilePathFromUri(fileUri);
    for (const symbolId of symbolIds) {
      const reverseIndexKey = this.makeQualifiedSymbolKey(
        normalizedFileUri,
        symbolId,
      );
      const refKeys = this.reverseIndex.get(reverseIndexKey);
      if (!refKeys) {
        continue;
      }
      for (const refKey of [...refKeys]) {
        this.removeReferenceKey(refKey);
      }
    }
  }

  /**
   * Clear reference state for a file when it is re-added/re-parsed.
   *
   * Only OUTGOING edges (references whose SOURCE is in `fileUri`) are removed,
   * since those will be re-created from the freshly parsed symbol table.
   *
   * INCOMING edges (references whose source is in ANOTHER file but whose
   * target is a symbol declared in `fileUri`) are intentionally preserved.
   * Deleting them would cause `findReferencesTo(symbolInThisFile)` to lose the
   * references that other files have into this file every time this file is
   * re-added (which happens on every enrichment write-back). The targets of
   * those incoming edges are stable IDs that survive a re-parse, so the edges
   * remain valid and must not be wiped here.
   */
  clearReferenceStateForFile(fileUri: string): void {
    const normalizedUri = extractFilePathFromUri(fileUri);

    // Remove ONLY this file's OWN (outbound) edges so they can be rebuilt from
    // the re-added symbol table. removeReferenceKey cleans both the forward and
    // reverse index entries for each removed edge, so inbound edges (target in
    // this file, source elsewhere) are untouched. Do NOT clear inbound edges to
    // this file's symbols: those edges belong to OTHER files (e.g. classes that
    // implement an interface declared here) and this re-add does not reprocess
    // them, so removing them would orphan every implementor/subclass. Re-adding
    // an interface previously wiped all its implementor edges this way,
    // collapsing go-to-implementation to nothing. Inbound edges are dropped only
    // on a true file deletion (removeFile), where the target symbols genuinely
    // go away.
    this.removeReferencesFromFile(normalizedUri);
    this.memoryStats.totalEdges = this.refStore.size;
  }

  /**
   * Get the singleton instance of ApexSymbolRefManager
   */
  static getInstance(): ApexSymbolRefManager {
    if (!this.instance) {
      throw new Error(
        'ApexSymbolRefManager instance not set. Call setInstance() first.',
      );
    }
    return this.instance;
  }

  /**
   * Set the singleton instance of ApexSymbolRefManager
   */
  static setInstance(graph: ApexSymbolRefManager): void {
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
    const taskKey = this.makeRetryKey(task.taskType, task.symbolName);
    // If MAX_RETRY_ATTEMPTS is 0, disable all retries
    if (this.MAX_RETRY_ATTEMPTS === 0) {
      // Don't requeue - retries are disabled
      this.failedReferences.set(taskKey, task);
      this.pendingRetrySymbols.delete(taskKey);
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
      this.failedReferences.set(taskKey, task);
      // Clear pending retry tracking
      this.pendingRetrySymbols.delete(taskKey);
      this.logger.warn(
        () =>
          `Deferred reference task exceeded max retries: ${task.symbolName} ` +
          `(${task.retryCount} attempts, reason: ${reason})`,
      );
      return;
    }

    // Prevent duplicate retry scheduling for the same symbol
    // This avoids exponential explosion when queue is at capacity
    const retryKey = taskKey;
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

    // Add the symbol to the SymbolTable (handles duplicates via union type)
    targetSymbolTable.addSymbol(symbol);

    const isNewSymbolId = !this.symbolIdIndex.has(symbolId);
    // Add to symbolIdIndex for O(1) lookups by ID (store first symbol for this ID)
    if (isNewSymbolId) {
      this.symbolIdIndex.set(symbolId, symbol);
    }
    this.symbolQualifiedIndex.set(
      this.makeQualifiedSymbolKey(normalizedFileUri, symbolId),
      symbol,
    );

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
    // Exclude block symbols for cleaner FQNs (e.g. "outerclass.innerclass" not "outerclass.outerclass.innerclass")
    const recalculatedFQN = calculateFQN(
      symbol,
      { normalizeCase: true, excludeBlockSymbols: true },
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
      const existing = this.fqnIndex.get(fqnToUse) || [];
      if (!existing.includes(symbolId)) {
        existing.push(symbolId);
        this.fqnIndex.set(fqnToUse, existing);
      }
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

    // Update memory statistics for new symbols
    if (isNewSymbolId) {
      this.memoryStats.totalSymbols++;
    }

    // Invalidate cache for this symbol name (cache might become stale)
    this.symbolCache.delete(symbol.name);

    // NOTE: Deferred references are NOT automatically processed when symbols are added.
    // They are stored and only processed on-demand when explicitly requested
    // (e.g., via resolveCrossFileReferencesForFile or similar on-demand methods).
    // This ensures we remain lazy and don't overwhelm the queue during workspace load.

    // Queue retry of pending deferred references that were waiting for this source symbol
    // Skip if retries are disabled (MAX_RETRY_ATTEMPTS === 0)
    if (
      this.pendingDeferredReferences.has(symbol.name) &&
      this.MAX_RETRY_ATTEMPTS > 0
    ) {
      // Sync Refs with class fields before queueing
      this.syncRefsToClassFields();
      try {
        // Use new queueing function that creates individual tasks
        const queueEffect = queuePendingReferencesForSymbol(
          symbol.name,
          Priority.Low,
        ).pipe(Effect.provide(this.deferredProcessorLayer));
        // Use async enqueueing to avoid blocking when queue is full
        Effect.runPromise(queueEffect).catch((error) => {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          this.logger.debug(
            () =>
              `Failed to enqueue pending deferred reference tasks for ${symbol.name}: ${errorMessage}`,
          );
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.debug(
          () =>
            `Failed to create pending deferred reference tasks for ${symbol.name}: ${errorMessage}`,
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

    // Fallback to SymbolTable delegation for backward compatibility.
    // Prefer exact ID matches to avoid returning similarly named block symbols.
    const normalizedUri = extractFilePathFromUri(symbolId);
    const symbolTable = this.fileToSymbolTable.get(normalizedUri);
    if (!symbolTable) {
      return null;
    }

    // Try exact lookup by ID first (covers unifiedId and synchronized symbol.id)
    const directById = symbolTable.getSymbolById(symbolId);
    if (directById) {
      this.symbolIdIndex.set(symbolId, directById);
      return directById;
    }

    // Then try exhaustive exact matching in case legacy IDs are present in symbolArray
    const allSymbols = symbolTable.getAllSymbols();
    const exactMatch =
      allSymbols.find((s) => s.id === symbolId) ||
      allSymbols.find((s) => s.key?.unifiedId === symbolId);
    if (exactMatch) {
      this.symbolIdIndex.set(symbolId, exactMatch);
      return exactMatch;
    }

    // Last-resort compatibility fallback for older callers that may use non-canonical IDs.
    // Parse the name and prefer non-block symbols with matching name.
    let symbolName: string | null = null;
    try {
      const parsed = parseSymbolId(symbolId);
      symbolName = parsed.name;
    } catch (_error) {
      symbolName = null;
    }
    if (!symbolName) {
      return null;
    }
    const matchingSymbol =
      allSymbols.find((s) => s.name === symbolName && !isBlockSymbol(s)) ||
      allSymbols.find((s) => s.name === symbolName);

    if (matchingSymbol) {
      this.symbolIdIndex.set(symbolId, matchingSymbol);
      return matchingSymbol;
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
   * Find symbols whose name starts with the given prefix (case-insensitive).
   * Iterates the nameIndex and collects symbols up to the specified limit.
   * @param prefix The prefix to match (case-insensitive)
   * @param limit Maximum number of symbols to return (default: 100)
   * @returns Array of symbols whose names start with the prefix
   */
  findSymbolsByPrefix(prefix: string, limit: number = 100): ApexSymbol[] {
    if (!prefix || prefix.length === 0) {
      return [];
    }

    const normalizedPrefix = prefix.toLowerCase();
    const results: ApexSymbol[] = [];

    for (const [name, symbolIds] of this.nameIndex.entries()) {
      if (results.length >= limit) {
        break;
      }

      // nameIndex keys are stored lowercase; compare against lowered name
      const normalizedName = name.toLowerCase();
      if (normalizedName.startsWith(normalizedPrefix)) {
        for (const symbolId of symbolIds) {
          if (results.length >= limit) {
            break;
          }
          const symbol = this.getSymbol(symbolId);
          if (symbol && !isBlockSymbol(symbol)) {
            results.push(symbol);
          }
        }
      }
    }

    return results;
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
   * Returns first match if duplicates exist (backward compatible)
   */
  findSymbolByFQN(fqn: string): ApexSymbol | null {
    const symbolIds = this.fqnIndex.get(fqn);
    if (!symbolIds || symbolIds.length === 0) {
      return null;
    }

    return this.getSymbol(symbolIds[0]); // Return first match
  }

  /**
   * Find all symbols with the same FQN (for duplicate detection)
   * @param fqn The fully qualified name to search for
   * @returns Array of all symbols with this FQN (empty if not found)
   */
  findSymbolsByFQN(fqn: string): ApexSymbol[] {
    const symbolIds = this.fqnIndex.get(fqn) || [];
    return symbolIds
      .map((id) => this.getSymbol(id))
      .filter((s): s is ApexSymbol => s !== null);
  }

  /**
   * OPTIMIZED: Get symbols in file by delegating to SymbolTable
   * Normalizes URI to ensure consistent lookup
   * Uses SymbolTable.getAllSymbols() when available to include overloaded methods
   * (methods with same name but different params share an id in fileIndex, so the
   * id-based lookup would collapse them to one; SymbolTable stores all in symbolArray)
   */
  getSymbolsInFile(fileUri: string): ApexSymbol[] {
    const normalizedUri = extractFilePathFromUri(fileUri);
    const symbolTable = this.fileToSymbolTable.get(normalizedUri);
    if (symbolTable) {
      return symbolTable.getAllSymbols();
    }
    // Fallback: no symbol table registered, use fileIndex (e.g. during migration)
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
   * Resolve symbol by artifact-qualified identity first, then by global ID.
   */
  private getSymbolByIdAndFile(
    symbolId: string,
    fileUri: string,
  ): ApexSymbol | null {
    const qualifiedKey = this.makeQualifiedSymbolKey(fileUri, symbolId);
    const symbol = this.symbolQualifiedIndex.get(qualifiedKey);
    if (symbol) {
      return symbol;
    }
    return this.getSymbol(symbolId);
  }

  private findSymbolInFileByName(
    fileUri: string,
    symbolName: string,
  ): ApexSymbol | null {
    const normalizedFileUri = extractFilePathFromUri(fileUri);
    const symbolsInFile = this.getSymbolsInFile(normalizedFileUri);
    return (
      symbolsInFile.find(
        (symbol) => symbol.name === symbolName && !isBlockSymbol(symbol),
      ) || null
    );
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
      argumentCount?: number;
      argumentTypes?: string[];
    },
  ): void {
    // Enforce source artifact invariant and normalize URI for stable matching.
    if (!sourceSymbol.fileUri) {
      this.logger.warn(
        () =>
          `Skipping addReference for source ${sourceSymbol.name}: missing fileUri`,
      );
      return;
    }
    sourceSymbol.fileUri = extractFilePathFromUri(sourceSymbol.fileUri);

    // Don't create reference edges to block targets (they're structural, not semantic).
    if (isBlockSymbol(targetSymbol)) {
      return;
    }

    // If source is a block symbol, resolve to nearest enclosing non-block declaration.
    let normalizedSourceSymbol = sourceSymbol;
    if (isBlockSymbol(sourceSymbol)) {
      const containingSymbol = this.findContainingSymbolForBlock(
        sourceSymbol,
        sourceSymbol.fileUri,
      );
      if (!containingSymbol) {
        this.logger.debug(
          () =>
            `Skipping reference with block source ${sourceSymbol.name} (no containing declaration found)`,
        );
        return;
      }
      normalizedSourceSymbol = containingSymbol;
    }

    const sourceSymbolInGraph = this.findSymbolInFileByName(
      normalizedSourceSymbol.fileUri,
      normalizedSourceSymbol.name,
    );
    const targetSymbolInGraph = targetSymbol.fileUri
      ? this.findSymbolInFileByName(targetSymbol.fileUri, targetSymbol.name)
      : null;

    if (!sourceSymbolInGraph || !targetSymbolInGraph) {
      // If symbols don't exist yet, add deferred reference. Key by name (the
      // exact fileUri may not be in the graph yet) but preserve the caller's
      // resolved target fileUri so the processor can rebind to the correct
      // same-named symbol rather than an arbitrary first match.
      this.addDeferredReference(
        normalizedSourceSymbol,
        targetSymbol.name,
        referenceType,
        location,
        context,
        targetSymbol.fileUri
          ? extractFilePathFromUri(targetSymbol.fileUri)
          : undefined,
      );

      // Scalar keywords (void, null) use apexlib URIs but are not loaded as graph vertices;
      // create a virtual symbol and add the reference immediately
      if (
        targetSymbol.fileUri &&
        targetSymbol.fileUri.startsWith('apexlib://') &&
        (targetSymbol.name === 'void' || targetSymbol.name === 'null')
      ) {
        this.createVirtualSymbolForStdlibScalarKeyword(
          targetSymbol,
          normalizedSourceSymbol,
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

    // Create reference entry and add to indexes
    if (
      this.createAndAddReference(
        sourceSymbolInGraph.fileUri,
        sourceId,
        targetSymbolInGraph.fileUri,
        targetId,
        referenceType,
        location,
        context,
      )
    ) {
      this.memoryStats.totalEdges++;
    }
  }

  /**
   * Find references to a symbol, dispatching by symbol kind.
   *
   * Different symbol kinds resolve their references through different sources:
   * - Locals (VARIABLE / PARAMETER): their references are confined to the
   *   declaring file, so we walk that file's local references (CodeUnit/AST)
   *   instead of the cross-file reference graph.
   * - FIELD / PROPERTY / METHOD (and types/enums): use the cross-file reference
   *   graph reverse index. Constructors and static methods are plain static
   *   lookups against the graph.
   * - Instance methods (non-static, non-constructor): override-aware — references
   *   to a virtual/overridable method must also surface references to the same
   *   method along the inheritance chain (superclass → interfaces → children →
   *   implementors), so we union matches across all related types.
   *
   * Note: This is a synchronous function. For large graphs, consider calling
   * from an async context.
   */
  findReferencesTo(symbol: ApexSymbol): ReferenceResult[] {
    if (!symbol.fileUri) {
      this.logger.warn(
        () =>
          `findReferencesTo requires fileUri for symbol ${symbol.name}; returning empty`,
      );
      return [];
    }

    // Locals never participate in the cross-file graph; walk the local file.
    if (
      symbol.kind === SymbolKind.Variable ||
      symbol.kind === SymbolKind.Parameter
    ) {
      return this.findLocalReferences(symbol);
    }

    // Instance methods (non-static, non-constructor) require an override-aware
    // walk so callers through base/derived/interface types are all found.
    // isMethodSymbol narrows to MethodSymbol, exposing the typed isConstructor
    // flag (kind===Method already excludes the Constructor kind, but a method
    // may still carry isConstructor; guard on both).
    if (
      isMethodSymbol(symbol) &&
      !symbol.modifiers?.isStatic &&
      !symbol.isConstructor
    ) {
      return this.separateOverloadReferences(
        symbol,
        this.findInstanceMethodReferences(symbol),
      );
    }

    // FIELD / PROPERTY / static & constructor METHOD / type / enum: the graph
    // reverse index is a direct, kind-agnostic lookup keyed on the declaration.
    return this.separateOverloadReferences(
      symbol,
      this.findReferencesViaGraph(symbol),
    );
  }

  /**
   * Narrow a method's reference results to the requested overload (F11-2).
   *
   * Name-keyed resolution collapses every overload of a method onto one target
   * declaration, so `findReferencesViaGraph` returns the union of references to
   * *all* same-named overloads. When the target is a method that actually has
   * same-named overload siblings, this filters the union down to the call sites
   * whose arity matches the requested overload's declared parameter count.
   *
   * Scope and limits:
   * - No-op unless `symbol` is a method with >1 same-named sibling on its
   *   declaring type. Non-methods and non-overloaded methods pass through
   *   untouched, so the common case is byte-for-byte unchanged.
   * - Arity is the discriminator (statically known at parse time). References
   *   whose `context.argumentCount` is undefined (parsed before this field
   *   existed, or non-call edges) are kept — we cannot prove they belong to a
   *   different overload, so we never drop them.
   * - Same-arity overloads (`f(String)` vs `f(Integer)`) are separated by
   *   call-site argument TYPES when those types resolve (W-23182862): a
   *   reference is dropped only when its `context.argumentTypes` matches a
   *   different same-arity overload's signature but not the target's. When the
   *   argument types are unresolved, or match no overload, the reference is
   *   kept — the set stays unified rather than risk a wrong split.
   * - Applies to constructors as well as methods: constructor overloads
   *   (`Foo()` vs `Foo(String)`) are separated by call-site arity the same way.
   */
  private separateOverloadReferences(
    symbol: ApexSymbol,
    results: ReferenceResult[],
  ): ReferenceResult[] {
    if (!isMethodOrConstructorSymbol(symbol)) {
      return results;
    }

    // Count same-named invocable siblings (methods/constructors) on the same
    // declaring type. Only when there is more than one is disambiguation
    // meaningful.
    const declaringType = this.findDeclaringTypeForMember(symbol);
    if (!declaringType) {
      return results;
    }
    // Source candidates from the declaring symbol's own file rather than a
    // workspace-wide findSymbolByName(name) scan: overload siblings live in the
    // same file as the declaration, so this is bounded by file size instead of
    // by the count of same-named symbols across the whole workspace. The
    // name/method/declaring-type filters below are unchanged, so the result set
    // is identical — only the candidate set we filter is narrower.
    const siblings = this.getSymbolsInFile(symbol.fileUri).filter(
      (s) =>
        s.name === symbol.name &&
        isMethodOrConstructorSymbol(s) &&
        this.findDeclaringTypeForMember(s)?.id === declaringType.id,
    );
    if (siblings.length <= 1) {
      return results;
    }

    const targetArity = symbol.parameters?.length ?? 0;

    // Same-arity siblings (other than the target) are the overloads that arity
    // alone cannot separate — e.g. `f(String)` vs `f(Integer)`. They drive the
    // type-aware step below (W-23182862).
    const sameAritySiblings = siblings.filter(
      (s) =>
        s.id !== symbol.id &&
        isMethodOrConstructorSymbol(s) &&
        (s.parameters?.length ?? 0) === targetArity,
    );

    return results.filter((r) => {
      const callArity = r.context?.argumentCount;
      // Drop references whose call-site arity is known and differs from this
      // overload's parameter count.
      if (callArity !== undefined && callArity !== targetArity) {
        return false;
      }

      // Arity matches (or is unknown). When the call-site has resolved argument
      // types AND there are same-arity siblings, separate by signature: drop
      // this reference only if its argument types match a DIFFERENT same-arity
      // overload but NOT the target. If they match the target, or match no
      // sibling (ambiguous / unresolved), keep it — we never split on a guess.
      const callArgumentTypes = r.context?.argumentTypes;
      if (
        callArity === targetArity &&
        callArgumentTypes !== undefined &&
        sameAritySiblings.length > 0
      ) {
        const matchesTarget = doesSignatureMatch(
          symbol,
          symbol.name,
          callArgumentTypes,
        );
        if (matchesTarget) {
          return true;
        }
        const matchesOtherOverload = sameAritySiblings.some((s) =>
          doesSignatureMatch(s, s.name, callArgumentTypes),
        );
        // Attributable to a different overload and not the target → drop.
        return !matchesOtherOverload;
      }

      // No type info, no same-arity ambiguity, or unknown arity: keep.
      return true;
    });
  }

  /**
   * Reverse-index (cross-file graph) lookup for a single declaration.
   * Returns incoming references whose target is the given symbol's declaration.
   */
  private findReferencesViaGraph(symbol: ApexSymbol): ReferenceResult[] {
    // Load-bearing guard: findReferencesTo's dispatch ensures fileUri is set for
    // the *original* symbol, but findInstanceMethodReferences also calls this on
    // related-type method symbols (methodOnType) whose fileUri is not pre-checked.
    if (!symbol.fileUri) {
      return [];
    }
    const normalizedSymbolFileUri = extractFilePathFromUri(symbol.fileUri);

    const targetSymbolInGraph = this.findSymbolInFileByName(
      normalizedSymbolFileUri,
      symbol.name,
    );

    if (!targetSymbolInGraph) {
      return [];
    }

    const targetId = this.getSymbolId(
      targetSymbolInGraph,
      targetSymbolInGraph.fileUri,
    );
    const results: ReferenceResult[] = [];

    // Get refKeys from reverse index
    const targetIndexKey = this.makeQualifiedSymbolKey(
      targetSymbolInGraph.fileUri,
      targetId,
    );
    const refKeys = this.reverseIndex.get(targetIndexKey);
    if (!refKeys) {
      return results;
    }

    // Map refKeys to ReferenceResult objects
    for (const refKey of refKeys) {
      const entry = this.refStore.get(refKey);
      if (!entry) continue;

      const sourceSymbol = this.getSymbolByIdAndFile(
        entry.sourceSymbolId,
        entry.sourceFileUri,
      );
      if (!sourceSymbol) {
        continue;
      }

      const referenceResult: ReferenceResult = {
        symbolId: entry.sourceSymbolId,
        symbol: sourceSymbol,
        fileUri: entry.sourceFileUri,
        referenceType: entry.referenceType,
        location: entry.location,
        context: entry.context,
      };

      results.push(referenceResult);
    }

    return results;
  }

  /**
   * Locals path: resolve references to a variable/parameter by walking the
   * declaring file's local references (not the cross-file graph). A local's
   * uses are by construction same-file, so we match the file's SymbolReferences
   * that resolve to — or, lacking resolution, name-match — the target local.
   *
   * The name-match fallback is scoped to the local's enclosing declaration
   * range: two same-named locals in sibling scopes (e.g. `total` in two methods
   * of one file) must not cross-contaminate. When a reference is resolved by id
   * we trust it directly; only the unresolved fallback is range-bounded.
   */
  private findLocalReferences(symbol: ApexSymbol): ReferenceResult[] {
    const fileUri = extractFilePathFromUri(symbol.fileUri);
    const symbolTable = this.getSymbolTableForFile(fileUri);
    if (!symbolTable) {
      return [];
    }

    const targetId = this.getSymbolId(symbol, fileUri);
    // Scope for the unresolved name-match fallback: the enclosing declaration
    // (method/block) that owns the local. References outside it cannot be uses
    // of this local even if they share its name.
    const scopeRange = this.getEnclosingScopeRange(symbol, fileUri);
    const results: ReferenceResult[] = [];

    for (const ref of symbolTable.getAllReferences()) {
      const matchesById =
        ref.resolvedSymbolId !== undefined && ref.resolvedSymbolId === targetId;
      // Fall back to name match only for unresolved references, and only when
      // the reference lies within the local's enclosing scope.
      const matchesByName =
        ref.resolvedSymbolId === undefined &&
        ref.name === symbol.name &&
        (scopeRange === undefined ||
          this.rangeContains(scopeRange, ref.location.identifierRange));
      if (!matchesById && !matchesByName) {
        continue;
      }

      results.push({
        symbolId: targetId,
        symbol,
        fileUri,
        referenceType: ReferenceType.INSTANCE_ACCESS,
        location: ref.location,
      });
    }

    return results;
  }

  /**
   * Range of the nearest enclosing declaration (method/block/type) that owns
   * `symbol`, used to scope the locals name-match fallback. Returns the parent
   * declaration's symbolRange, or the symbol's own range if it has no usable
   * parent. `undefined` means "could not determine a scope" (callers then skip
   * range-bounding rather than drop matches).
   */
  private getEnclosingScopeRange(
    symbol: ApexSymbol,
    fileUri: string,
  ): Range | undefined {
    if (symbol.parentId) {
      const parent = this.getSymbolByIdAndFile(symbol.parentId, fileUri);
      if (parent?.location?.symbolRange) {
        return parent.location.symbolRange;
      }
    }
    return symbol.location?.symbolRange;
  }

  /**
   * True when `inner` is positionally contained within `outer` (inclusive),
   * comparing (line, column) pairs. Both ranges are 1-based line / 0-based col.
   */
  private rangeContains(outer: Range, inner: Range): boolean {
    const startsAfter =
      inner.startLine > outer.startLine ||
      (inner.startLine === outer.startLine &&
        inner.startColumn >= outer.startColumn);
    const endsBefore =
      inner.endLine < outer.endLine ||
      (inner.endLine === outer.endLine && inner.endColumn <= outer.endColumn);
    return startsAfter && endsBefore;
  }

  /**
   * Instance-method path: override-aware traversal.
   *
   * For a non-static, non-constructor method we union the graph references of
   * the method as declared on every type related by inheritance to the
   * declaring type: the declaring type itself, its superclass chain, the
   * interfaces it (transitively) implements/extends, and every child / implementor
   * type. Type traversal is cycle-guarded with a visited-types set; result
   * de-duplication is keyed on (sourceFileUri, sourceSymbolId, line, column).
   *
   * Related-type discovery (collectRelatedTypeNames) walks W-23006798's
   * INHERITANCE / INTERFACE_IMPLEMENTATION edges. Those edges target the *type*
   * symbol (an implementor->interface / subclass->superclass edge), so they live
   * in a type's reverse-index bucket — never a method's. This union only ever
   * reads *method* buckets — findReferencesViaGraph(symbol) and
   * findReferencesViaGraph(methodOnType), both keyed on a method declaration —
   * so an inheritance edge can never surface here as a method reference, and no
   * reference-type filtering of the *method* lookup is required to keep them out.
   * (collectRelatedTypeNames does filter the *type* lookups it walks to those two
   * inheritance reference types; see findSupertypesViaEdges / findSubtypesViaEdges.)
   */
  private findInstanceMethodReferences(symbol: ApexSymbol): ReferenceResult[] {
    const methodName = symbol.name;

    // Collect the set of type names to consider, walking the hierarchy.
    // collectRelatedTypeNames discovers the chain purely from resolved
    // INHERITANCE / INTERFACE_IMPLEMENTATION edges via findSupertypes /
    // findSubtypes, both of which drain deferred references on read — so a
    // lazily-resolved extends/implements edge (target ingested after source) is
    // still seen and the related-type set is not under-populated.
    const declaringType = this.findDeclaringTypeForMember(symbol);
    const relatedTypeNames = this.collectRelatedTypeNames(declaringType);

    const results: ReferenceResult[] = [];
    const seen = new Set<string>();

    const addUnique = (refs: ReferenceResult[]): void => {
      for (const r of refs) {
        const loc = r.location.identifierRange;
        const dedupeKey = `${r.fileUri}#${r.symbolId}#${loc.startLine}:${loc.startColumn}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        results.push(r);
      }
    };

    // Always include references to this exact declaration.
    addUnique(this.findReferencesViaGraph(symbol));

    // Then any same-named method declared on a related type.
    for (const typeName of relatedTypeNames) {
      const typeSymbols = this.findSymbolByName(typeName).filter((s) =>
        inTypeSymbolGroup(s),
      );
      for (const typeSymbol of typeSymbols) {
        const methodOnType = this.findMethodOnType(typeSymbol, methodName);
        if (methodOnType && methodOnType.id !== symbol.id) {
          addUnique(this.findReferencesViaGraph(methodOnType));
        }
      }
    }

    return results;
  }

  /**
   * Find the type (class/interface/enum) declaration that directly contains the
   * given member symbol, by walking parentId up to the nearest type group.
   */
  private findDeclaringTypeForMember(
    symbol: ApexSymbol,
  ): TypeSymbol | undefined {
    let current: ApexSymbol | null = symbol;
    const guard = new Set<string>();
    while (current && current.parentId && !guard.has(current.id)) {
      guard.add(current.id);
      const parent = this.getSymbolByIdAndFile(
        current.parentId,
        current.fileUri,
      );
      if (!parent) {
        break;
      }
      if (inTypeSymbolGroup(parent)) {
        return parent as TypeSymbol;
      }
      current = parent;
    }
    return undefined;
  }

  /**
   * Collect the names of all types related to `declaringType` by inheritance:
   * the type itself, its superclass chain, the interfaces it implements/extends
   * (transitively), and any type that extends or implements it. Cycle-guarded.
   *
   * Inheritance discovery runs entirely off W-23006798's maintained reverse-index
   * edges — the canonical inheritance source. `class X extends Super` and
   * `class X implements I` emit subclass→superclass / implementor→interface
   * edges (ReferenceType.INHERITANCE / INTERFACE_IMPLEMENTATION) at ingest time.
   * Ancestors are the OUTGOING such edges of a type; descendants are the
   * INCOMING such edges. There is therefore one source of truth for the graph
   * (the edges) and no per-request whole-workspace scan: each step costs
   * O(edges incident to that type), not O(workspace types).
   */
  private collectRelatedTypeNames(
    declaringType: TypeSymbol | undefined,
  ): Set<string> {
    const related = new Set<string>();
    if (!declaringType) {
      return related;
    }

    // The related set is {declaringType} ∪ its supertypes ∪ the subtypes of the
    // declaring type and of every supertype. Walking down from each ancestor too
    // (not just the declaring type) is what makes the union override-aware: a
    // caller through a sibling override reachable via a shared supertype is
    // surfaced. Both directions read the same maintained edges via the public
    // findSupertypes / findSubtypes, so there is one inheritance source of truth.
    related.add(declaringType.name);

    const upward = this.findSupertypes(declaringType);
    for (const supertype of upward) {
      related.add(supertype.name);
    }

    // Subtype cones of the declaring type and every ancestor. findSubtypes is
    // itself transitive and cycle-guarded; the outer `related` set de-dupes the
    // overlap between cones by name.
    for (const root of [declaringType, ...upward]) {
      for (const subtype of this.findSubtypes(root)) {
        related.add(subtype.name);
      }
    }

    return related;
  }

  /**
   * Supertypes of `type`: the targets of its OUTGOING INHERITANCE /
   * INTERFACE_IMPLEMENTATION edges (the superclass it extends, the interfaces it
   * implements / extends). Reads W-23006798's maintained edges, not the
   * `superClass`/`interfaces` string arrays, so the inheritance graph has a
   * single source of truth.
   */
  private findSupertypesViaEdges(type: ApexSymbol): ApexSymbol[] {
    const supertypes: ApexSymbol[] = [];
    for (const ref of this.findReferencesFrom(type)) {
      if (this.isInheritanceEdge(ref) && inTypeSymbolGroup(ref.symbol)) {
        supertypes.push(ref.symbol);
      }
    }
    return supertypes;
  }

  /**
   * Subtypes of `type`: the sources of its INCOMING INHERITANCE /
   * INTERFACE_IMPLEMENTATION edges (the subclasses that extend it, the classes
   * that implement it). This is the implementor/subclass lookup W-23006798's
   * edges exist to answer directly — O(edges into this type), no workspace scan.
   */
  private findSubtypesViaEdges(type: ApexSymbol): ApexSymbol[] {
    const subtypes: ApexSymbol[] = [];
    for (const ref of this.findReferencesViaGraph(type)) {
      if (this.isInheritanceEdge(ref) && inTypeSymbolGroup(ref.symbol)) {
        subtypes.push(ref.symbol);
      }
    }
    return subtypes;
  }

  /** True for an extends/implements graph edge (subclass or implementor). */
  private isInheritanceEdge(ref: ReferenceResult): boolean {
    return (
      ref.referenceType === ReferenceType.INHERITANCE ||
      ref.referenceType === ReferenceType.INTERFACE_IMPLEMENTATION
    );
  }

  /**
   * All transitive SUBTYPES of `type` — every class/interface that (directly or
   * indirectly) extends or implements it: subclasses, classes that implement an
   * interface, sub-interfaces, and the subclasses of those, to any depth. Walks
   * the INCOMING INHERITANCE / INTERFACE_IMPLEMENTATION edges; `type` itself is
   * not included. Cycle-guarded and de-duplicated by type name.
   *
   * This is the single canonical implementor/subclass query for the workspace —
   * the one go-to-implementation and find-references both build on, so they
   * provably agree. Reads only the maintained reverse-index edges (no
   * `superClass`/`interfaces` string scan, no whole-workspace enumeration), and
   * drains deferred references first so a lazily-resolved extends/implements edge
   * (target ingested after source) is still seen. O(edges in the subtype cone).
   *
   * The drain operates on THIS manager's own graph — which, in the worker
   * topology, is the request worker's transient subset graph (built per request
   * from loadDependentsForReferences), NOT the data owner's. It resolves any
   * edge whose endpoints are both present in this local graph; it does not, and
   * need not, reach the data owner. Cost scales with this graph's deferred map
   * (typically tiny — only the request's loaded dependents), not the workspace.
   */
  public findSubtypes(type: ApexSymbol): ApexSymbol[] {
    this.drainAllDeferredReferencesSync();
    return this.collectTransitiveTypes(type, (t) =>
      this.findSubtypesViaEdges(t),
    );
  }

  /**
   * All transitive SUPERTYPES of `type` — its superclass chain plus every
   * interface it (or an ancestor) implements/extends, to any depth. Walks the
   * OUTGOING INHERITANCE / INTERFACE_IMPLEMENTATION edges; `type` itself is not
   * included. Cycle-guarded and de-duplicated by type name. Same maintained-edge
   * source of truth, and the same drain-on-read against THIS manager's local
   * graph (see {@link findSubtypes} for the graph-locality note).
   */
  public findSupertypes(type: ApexSymbol): ApexSymbol[] {
    this.drainAllDeferredReferencesSync();
    return this.collectTransitiveTypes(type, (t) =>
      this.findSupertypesViaEdges(t),
    );
  }

  /**
   * Breadth-first transitive closure of `step` starting from `start`, excluding
   * `start` itself. `step` yields the next ring of related types (sub- or
   * super-types) for a single node; this drains it to all depths. The
   * lower-cased-name visited set both de-duplicates and terminates inheritance
   * cycles. Shared spine of {@link findSubtypes} / {@link findSupertypes}.
   */
  private collectTransitiveTypes(
    start: ApexSymbol,
    step: (type: ApexSymbol) => ApexSymbol[],
  ): ApexSymbol[] {
    const results: ApexSymbol[] = [];
    const visited = new Set<string>([start.name.toLowerCase()]);
    const stack: ApexSymbol[] = [start];

    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const next of step(current)) {
        const key = next.name.toLowerCase();
        if (visited.has(key)) {
          continue;
        }
        visited.add(key);
        results.push(next);
        stack.push(next);
      }
    }

    return results;
  }

  /**
   * Find a method member with the given name declared on `type`.
   *
   * Method symbols are parented to their class *block* symbol rather than the
   * class declaration directly, so we match by resolving each candidate's
   * declaring type back to `type`.
   *
   * Known imprecision: matching is by name + kind===Method + same file +
   * declaring-type id only. Overloaded methods that share a name on the same
   * type (differing arity/parameters) are NOT disambiguated — this returns the
   * first match. Overload-aware disambiguation is deferred to a later story.
   */
  private findMethodOnType(
    type: ApexSymbol,
    methodName: string,
  ): ApexSymbol | undefined {
    const candidates = this.findSymbolByName(methodName);
    return candidates.find((s) => {
      if (s.kind !== SymbolKind.Method || s.fileUri !== type.fileUri) {
        return false;
      }
      const declaringType = this.findDeclaringTypeForMember(s);
      return declaringType?.id === type.id;
    });
  }

  /**
   * OPTIMIZED: Find references from a symbol
   * Note: This is a synchronous function. For large graphs, consider calling from
   * an async context or using the async variant if available.
   */
  findReferencesFrom(symbol: ApexSymbol): ReferenceResult[] {
    if (!symbol.fileUri) {
      this.logger.warn(
        () =>
          `findReferencesFrom requires fileUri for symbol ${symbol.name}; returning empty`,
      );
      return [];
    }
    const normalizedSymbolFileUri = extractFilePathFromUri(symbol.fileUri);

    const sourceSymbolInGraph = this.findSymbolInFileByName(
      normalizedSymbolFileUri,
      symbol.name,
    );

    if (!sourceSymbolInGraph) {
      return [];
    }

    const sourceId = this.getSymbolId(
      sourceSymbolInGraph,
      sourceSymbolInGraph.fileUri,
    );
    const results: ReferenceResult[] = [];

    // Get all refKeys for this file from forward index
    const fileRefKeys = this.forwardIndex.get(sourceSymbolInGraph.fileUri);
    if (!fileRefKeys) {
      return results;
    }

    // Filter refKeys that match the source symbol
    for (const refKey of fileRefKeys) {
      const entry = this.refStore.get(refKey);
      if (!entry || entry.sourceSymbolId !== sourceId) {
        continue;
      }

      const targetSymbol = this.getSymbolByIdAndFile(
        entry.targetSymbolId,
        entry.targetFileUri,
      );
      if (!targetSymbol) {
        continue;
      }

      const referenceResult: ReferenceResult = {
        symbolId: entry.targetSymbolId,
        symbol: targetSymbol,
        fileUri: entry.targetFileUri,
        referenceType: entry.referenceType,
        location: entry.location,
        context: entry.context,
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

    // Get all symbol IDs from the symbol ID index
    const symbolIds = Array.from(this.symbolIdIndex.keys());

    for (const symbolId of symbolIds) {
      if (!visited.has(symbolId)) {
        this.detectCyclesDFS(symbolId, visited, recursionStack, [], cycles);
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
    if (this.symbolIdIndex.has(symbolId)) {
      this.detectCyclesDFS(symbolId, visited, recursionStack, [], cycles);
    }

    // Filter cycles to only include those that contain the target symbol
    return cycles.filter((cycle) => cycle.includes(symbolId));
  }

  /**
   * Helper method for cycle detection using DFS
   */
  private detectCyclesDFS(
    symbolId: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    currentPath: string[],
    cycles: string[][],
  ): void {
    visited.add(symbolId);
    recursionStack.add(symbolId);
    currentPath.push(symbolId);

    // Get symbol's file URI to find its outgoing references
    const symbolInGraph = this.getSymbol(symbolId);
    if (!symbolInGraph) {
      recursionStack.delete(symbolId);
      currentPath.pop();
      return;
    }

    // Get all refKeys for this file from forward index
    const fileRefKeys = this.forwardIndex.get(symbolInGraph.fileUri);
    if (fileRefKeys) {
      // Filter to references from this specific symbol
      for (const refKey of fileRefKeys) {
        const entry = this.refStore.get(refKey);
        if (!entry || entry.sourceSymbolId !== symbolId) {
          continue;
        }

        const neighborId = entry.targetSymbolId;

        if (!visited.has(neighborId)) {
          this.detectCyclesDFS(
            neighborId,
            visited,
            recursionStack,
            currentPath,
            cycles,
          );
        } else if (recursionStack.has(neighborId)) {
          // Found a cycle
          const cycleStartIndex = currentPath.indexOf(neighborId);
          if (cycleStartIndex !== -1) {
            const cycle = currentPath.slice(cycleStartIndex);
            cycles.push([...cycle]);
          }
        }
      }
    }

    recursionStack.delete(symbolId);
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
      // Derive from authoritative index to avoid drift/negative counts.
      totalSymbols: this.symbolIdIndex.size,
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
      // Note: Daemon fibers created with Effect.forkDaemon don't get cleaned up
      // automatically when scopes close, so we must explicitly interrupt them here.
      // We use runSync to wait for the interruption to complete synchronously.
      const fibersToInterrupt = Array.from(this.activeRetryFibers);
      for (const fiber of fibersToInterrupt) {
        try {
          // Interrupt the fiber and wait for it to complete
          // Fiber.interrupt returns an Effect that waits for the interruption to complete
          Effect.runSync(Fiber.interrupt(fiber).pipe(Effect.asVoid));
        } catch (interruptError) {
          // Fiber might already be interrupted or completed - ignore
          this.logger.debug(
            () =>
              `Error interrupting retry fiber (may already be done): ${interruptError}`,
          );
        }
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
  registerSymbolTable(
    symbolTable: SymbolTable,
    fileUri: string,
    options?: {
      mergeReferences?: boolean;
      hasErrors?: boolean;
      hasHardIncompleteParse?: boolean;
    },
  ): SymbolTableRegistrationResult {
    // Normalize URI the same way getSymbolId() does to ensure consistency
    // This ensures SymbolTable lookup in getSymbol() will succeed
    const normalizedUri = extractFilePathFromUri(fileUri);

    // Check if the same SymbolTable instance is already registered
    const existing = this.fileToSymbolTable.get(normalizedUri);
    if (existing === symbolTable) {
      // Same instance already registered, skip redundant registration
      const sameInstanceMetadata = existing.getMetadata();
      return {
        decision: 'noop-same-instance',
        fileUri: normalizedUri,
        canonicalTable: existing,
        incomingVersion: sameInstanceMetadata.documentVersion,
        storedVersion: sameInstanceMetadata.documentVersion,
      };
    }

    const incomingMetadata = symbolTable.getMetadata();
    const incomingVersion = incomingMetadata.documentVersion;
    const storedVersion = existing?.getMetadata().documentVersion;

    this.logger.debug(
      () =>
        `[registerSymbolTable] Registering SymbolTable for URI: ${normalizedUri} ` +
        `(original: ${fileUri}, ` +
        `symbolCount: ${symbolTable.getAllSymbols().length}, ` +
        `documentVersion: ${incomingVersion})`,
    );

    // Keep metadata normalized at registration boundary.
    symbolTable.setMetadata({
      fileUri: normalizedUri,
    });

    if (
      incomingVersion !== undefined &&
      storedVersion !== undefined &&
      incomingVersion < storedVersion
    ) {
      this.logger.debug(
        () =>
          `[registerSymbolTable] Rejecting stale registration for ${normalizedUri}: ` +
          `incomingVersion=${incomingVersion} < storedVersion=${storedVersion}`,
      );
      return {
        decision: 'rejected-stale',
        fileUri: normalizedUri,
        canonicalTable: existing ?? symbolTable,
        incomingVersion,
        storedVersion,
        reason: 'incoming version older than stored version',
      };
    }

    const isNewerVersion =
      incomingVersion !== undefined &&
      (storedVersion === undefined || incomingVersion > storedVersion);

    // Parser-error safeguard: only fallback when we have hard incomplete signals.
    const newSymbolCount = symbolTable.getAllSymbols().length;
    const existingSymbolCount = existing ? existing.getAllSymbols().length : 0;
    const hasHardIncompleteSignal =
      options?.hasHardIncompleteParse === true ||
      incomingMetadata.parseCompleteness === 'incomplete' ||
      (!!options?.hasErrors && existingSymbolCount > 0 && newSymbolCount === 0);
    const isIncompleteParse =
      isNewerVersion && hasHardIncompleteSignal && existingSymbolCount > 0;

    const useReplace = isNewerVersion && !isIncompleteParse;

    if (isIncompleteParse) {
      this.logger.debug(
        () =>
          `[registerSymbolTable] Incomplete parse detected for ${normalizedUri}: ` +
          `new symbols: ${newSymbolCount}, existing symbols: ${existingSymbolCount}, ` +
          `parseCompleteness=${incomingMetadata.parseCompleteness}. ` +
          'Falling back to merge to preserve valid symbols.',
      );
    }

    // If replacing an existing SymbolTable, decide whether to preserve old symbols
    if (existing && existing !== symbolTable) {
      const existingReferences = existing.getAllReferences();
      const newReferences = symbolTable.getAllReferences();
      const existingSymbols = existing.getAllSymbols();
      const newSymbols = symbolTable.getAllSymbols();

      this.logger.debug(
        () =>
          `[registerSymbolTable] Replacing existing SymbolTable for ${normalizedUri}: ` +
          `existing symbols: ${existingSymbols.length}, new symbols: ${newSymbols.length}, ` +
          `existing references: ${existingReferences.length}, new references: ${newReferences.length}, ` +
          `mode: ${useReplace ? 'replace' : 'merge'}`,
      );

      // Log symbol names for debugging
      this.logger.debug(
        () =>
          `[registerSymbolTable] Existing symbols: ${existingSymbols.map((s) => `${s.name}(${s.kind})`).join(', ')}`,
      );
      this.logger.debug(
        () =>
          `[registerSymbolTable] New symbols: ${newSymbols.map((s) => `${s.name}(${s.kind})`).join(', ')}`,
      );

      if (useReplace) {
        // REPLACE MODE: New version is newer — treat new parse as authoritative.
        // Do NOT preserve old symbols that are missing from the new table.
        // This prevents parser artifacts (unknownClass, partial names) from accumulating.
        this.logger.debug(
          () =>
            `[registerSymbolTable] Replace mode: version ${incomingVersion} > ${storedVersion}, ` +
            `discarding ${existingSymbols.length - newSymbols.length} symbols not in new parse`,
        );
      } else {
        // MERGE MODE: Same/unknown version or enrichment scenario.
        // Preserve symbols from old SymbolTable that aren't in the new one.
        // This is critical for private/protected symbols that won't be in PublicAPISymbolListener results
        let symbolsPreserved = 0;
        const newSymbolKeys = new Set(
          newSymbols.map((s) => keyToString(s.key)),
        );
        for (const symbol of existingSymbols) {
          const symbolKey = keyToString(symbol.key);
          if (!newSymbolKeys.has(symbolKey)) {
            // Symbol doesn't exist in new SymbolTable - preserve it
            symbolTable.addSymbol(symbol);
            symbolsPreserved++;
          } else {
            // Symbol exists in both - only merge if enrichment is needed
            const existingInNew = newSymbols.find(
              (s) => keyToString(s.key) === symbolKey,
            );
            if (existingInNew) {
              const detailLevelOrder: Record<string, number> = {
                'public-api': 1,
                protected: 2,
                private: 3,
                full: 4,
              };
              const existingLevel =
                detailLevelOrder[existingInNew._detailLevel || ''] || 0;
              const newLevel = detailLevelOrder[symbol._detailLevel || ''] || 0;
              const needsEnrichment = newLevel > existingLevel;

              if (needsEnrichment) {
                symbolTable.addSymbol(symbol);
              }
            } else {
              this.logger.warn(
                () =>
                  '[DEBUG-DUP] registerSymbolTable: Symbol key matched but symbol not found in newSymbols',
              );
            }
          }
        }
        if (symbolsPreserved > 0) {
          this.logger.debug(
            () =>
              `[registerSymbolTable] Preserved ${symbolsPreserved} symbols from existing SymbolTable`,
          );
        }
      }

      // Preserve references from the old SymbolTable
      // If the new SymbolTable has no references but the old one does, merge them
      // This ensures hover/definition requests work even if workspace batch processing
      // creates a new SymbolTable without references (e.g., if collectReferences wasn't set)
      const shouldMergeReferences =
        (options?.mergeReferences ?? true) &&
        (!useReplace || newReferences.length === 0);
      if (
        shouldMergeReferences &&
        existingReferences.length > 0 &&
        newReferences.length === 0
      ) {
        this.logger.debug(
          () =>
            `[registerSymbolTable] Merging ${existingReferences.length} references from existing SymbolTable`,
        );
        for (const ref of existingReferences) {
          symbolTable.addTypeReference(ref);
        }
      } else if (
        shouldMergeReferences &&
        existingReferences.length > 0 &&
        newReferences.length > 0
      ) {
        // Both have references - merge unique ones (avoid duplicates)
        const newRefSet = new Set(
          newReferences.map(
            (r) =>
              `${r.location.identifierRange.startLine}:${r.location.identifierRange.startColumn}:${r.name}`,
          ),
        );
        let mergedCount = 0;
        for (const ref of existingReferences) {
          const refKey =
            `${ref.location.identifierRange.startLine}:` +
            `${ref.location.identifierRange.startColumn}:${ref.name}`;
          if (!newRefSet.has(refKey)) {
            symbolTable.addTypeReference(ref);
            mergedCount++;
          }
        }
        if (mergedCount > 0) {
          this.logger.debug(
            () =>
              `[registerSymbolTable] Merged ${mergedCount} additional references from existing SymbolTable`,
          );
        } else {
          this.logger.debug(
            () =>
              `[registerSymbolTable] No additional references to merge (all ${existingReferences.length} ` +
              'existing references already present in new SymbolTable)',
          );
        }
      }
    }

    // Use normalized URI for registration to match what getSymbol() will look up
    this.fileToSymbolTable.set(normalizedUri, symbolTable);

    // Verify registration succeeded
    const registered = this.fileToSymbolTable.get(normalizedUri);
    if (!registered) {
      this.logger.warn(
        () =>
          `[registerSymbolTable] Failed to register SymbolTable for URI: ${normalizedUri}`,
      );
      return {
        decision: useReplace
          ? 'accepted-replace'
          : isIncompleteParse
            ? 'accepted-fallback-merge'
            : 'accepted-merge',
        fileUri: normalizedUri,
        canonicalTable: symbolTable,
        incomingVersion,
        storedVersion,
      };
    } else {
      const finalRefCount = registered.getAllReferences().length;
      this.logger.debug(
        () =>
          `[registerSymbolTable] Successfully registered SymbolTable for URI: ${normalizedUri} ` +
          `(references: ${finalRefCount})`,
      );
      return {
        decision: useReplace
          ? 'accepted-replace'
          : isIncompleteParse
            ? 'accepted-fallback-merge'
            : 'accepted-merge',
        fileUri: normalizedUri,
        canonicalTable: registered,
        incomingVersion,
        storedVersion,
      };
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
      symbolTable.setMetadata({
        fileUri: normalizedUri,
      });
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

    // Clear indexes
    this.reverseIndex.clear();
    this.forwardIndex.clear();
    this.refStore.clear();
    this.refIndexCounters.clear();
    this.symbolFileMap.clear();
    this.nameIndex.clear();
    this.fileIndex.clear();
    this.fqnIndex.clear();
    this.symbolIdIndex.clear();
    this.symbolQualifiedIndex.clear();
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

    // Clear Refs
    Effect.runSync(
      Ref.set(this.deferredReferencesRef, new CaseInsensitiveHashMap()),
    );
    Effect.runSync(
      Ref.set(this.pendingDeferredReferencesRef, new CaseInsensitiveHashMap()),
    );
    Effect.runSync(
      Ref.set(this.deferredProcessingMetricsRef, {
        totalBatchesProcessed: 0,
        totalItemsProcessed: 0,
        totalSuccessCount: 0,
        totalFailureCount: 0,
        totalBatchDuration: 0,
        lastBatchTime: 0,
        activeTaskCount: 0,
        queueDepthHistory: [],
        lastMetricsLogTime: Date.now(),
      }),
    );
    Effect.runSync(
      Ref.set(this.memoryStatsRef, {
        totalSymbols: 0,
        totalVertices: 0,
        totalEdges: 0,
        memoryOptimizationLevel: 'OPTIMAL',
        estimatedMemorySavings: 0,
      }),
    );
  }

  /**
   * Sync Refs with class fields (call before queueing to ensure latest state)
   */
  private syncRefsToClassFields(): void {
    Effect.runSync(
      Ref.set(this.deferredReferencesRef, this.deferredReferences),
    );
    Effect.runSync(
      Ref.set(
        this.pendingDeferredReferencesRef,
        this.pendingDeferredReferences,
      ),
    );
    Effect.runSync(
      Ref.set(
        this.deferredProcessingMetricsRef,
        this.deferredProcessingMetrics,
      ),
    );
    Effect.runSync(Ref.set(this.memoryStatsRef, this.memoryStats));
  }

  /**
   * Sync class fields with Refs (call after processing to update class state)
   */
  private syncClassFieldsFromRefs(): void {
    this.deferredReferences = Effect.runSync(
      Ref.get(this.deferredReferencesRef),
    );
    this.pendingDeferredReferences = Effect.runSync(
      Ref.get(this.pendingDeferredReferencesRef),
    );
    this.deferredProcessingMetrics = Effect.runSync(
      Ref.get(this.deferredProcessingMetricsRef),
    );
    this.memoryStats = Effect.runSync(Ref.get(this.memoryStatsRef));
  }

  /**
   * Remove a file's symbols from the graph
   * Normalizes URI to ensure consistent lookup
   */
  removeFile(fileUri: string): void {
    const normalizedUri = extractFilePathFromUri(fileUri);
    const symbolIds = this.fileIndex.get(normalizedUri) || [];
    const symbolIdSet = new Set(symbolIds);

    // Remove all references from/to symbols in this file
    this.removeReferencesFromFile(normalizedUri);
    this.removeIncomingReferencesToSymbols(symbolIdSet, normalizedUri);

    for (const symbolId of symbolIds) {
      // Remove from indexes
      this.symbolFileMap.delete(symbolId);
      this.symbolIdIndex.delete(symbolId);
      this.symbolQualifiedIndex.delete(
        this.makeQualifiedSymbolKey(normalizedUri, symbolId),
      );

      // Remove symbolId from every FQN bucket (fqnIndex is keyed by FQN, not symbolId)
      for (const [fqn, ids] of this.fqnIndex.entries()) {
        if (!ids) continue;
        const filteredIds = ids.filter((id) => id !== symbolId);
        if (filteredIds.length === 0) {
          this.fqnIndex.delete(fqn);
        } else if (filteredIds.length !== ids.length) {
          this.fqnIndex.set(fqn, filteredIds);
        }
      }

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

    // Re-sync from authoritative source to prevent negative totals/drift.
    this.memoryStats.totalSymbols = this.symbolIdIndex.size;
    this.memoryStats.totalEdges = this.refStore.size;
  }

  /**
   * Evict declarations that no longer exist in a file after a re-parse.
   *
   * `removeFile` purges an entire file; this is the surgical analogue used on
   * the re-add path: given the symbol ids that the fresh parse still declares
   * for `fileUri`, it drops every other id that the file previously declared
   * from the symbol indexes AND purges the INCOMING reverse-index edges that
   * targeted those gone declarations.
   *
   * Why this is needed (W-23133526 / follow-up N1 + F10-1): on a content-change
   * re-parse `registerSymbolTable` swaps the file's SymbolTable, but the graph
   * indexes (`fileIndex`/`nameIndex`/`symbolIdIndex`/...) are only ever added
   * to — a declaration that was renamed away (`Foo` -> `Baz`) or deleted is
   * never removed. Its stale id lingers and any incoming reverse-index edge
   * keyed on it (e.g. another file's edge into `Foo`) stays resolvable, so
   * `findReferencesTo(Foo)` can still surface phantom references until the
   * referencing file is itself re-resolved. Reclaiming those dead reverse-index
   * entries here, at the moment the declaration disappears, also caps the
   * unbounded accumulation called out by F10-1 (no separate compaction pass is
   * required for the rename/delete case).
   *
   * Only call this from the REPLACE branch of a re-parse, where the fresh parse
   * is authoritative. It must NOT run for enrichment/merge passes (same document
   * version, higher detail level), because those intentionally preserve old
   * private/protected declarations absent from the partial fresh table.
   *
   * @param fileUri The file being re-parsed
   * @param liveSymbolIds Symbol ids the fresh canonical table still declares
   */
  evictStaleFileDeclarations(
    fileUri: string,
    liveSymbolIds: ReadonlySet<string>,
  ): void {
    const normalizedUri = extractFilePathFromUri(fileUri);
    const previousIds = this.fileIndex.get(normalizedUri);
    if (!previousIds || previousIds.length === 0) {
      return;
    }

    const staleIds = previousIds.filter((id) => !liveSymbolIds.has(id));
    if (staleIds.length === 0) {
      return;
    }

    // Purge incoming reverse-index edges whose TARGET is a gone declaration so
    // findReferencesTo(<old name>) no longer resolves a stale id. Outgoing edges
    // from this file were already cleared by clearReferenceStateForFile.
    this.removeIncomingReferencesToSymbols(new Set(staleIds), normalizedUri);

    for (const symbolId of staleIds) {
      this.symbolFileMap.delete(symbolId);
      this.symbolIdIndex.delete(symbolId);
      this.symbolQualifiedIndex.delete(
        this.makeQualifiedSymbolKey(normalizedUri, symbolId),
      );

      // Remove the gone id from every FQN bucket (keyed by FQN, not id).
      for (const [fqn, ids] of this.fqnIndex.entries()) {
        if (!ids) continue;
        const filteredIds = ids.filter((id) => id !== symbolId);
        if (filteredIds.length === 0) {
          this.fqnIndex.delete(fqn);
        } else if (filteredIds.length !== ids.length) {
          this.fqnIndex.set(fqn, filteredIds);
        }
      }

      // Remove the gone id from every name bucket (keyed by name, not id).
      for (const [name, ids] of this.nameIndex.entries()) {
        if (!ids) continue;
        const filteredIds = ids.filter((id) => id !== symbolId);
        if (filteredIds.length === 0) {
          this.nameIndex.delete(name);
        } else if (filteredIds.length !== ids.length) {
          this.nameIndex.set(name, filteredIds);
        }
      }
    }

    // Keep only the live ids in the file index.
    const remainingIds = previousIds.filter((id) => liveSymbolIds.has(id));
    if (remainingIds.length === 0) {
      this.fileIndex.delete(normalizedUri);
    } else {
      this.fileIndex.set(normalizedUri, remainingIds);
    }

    // Re-sync from authoritative source to prevent drift.
    this.memoryStats.totalSymbols = this.symbolIdIndex.size;
    this.memoryStats.totalEdges = this.refStore.size;

    this.logger.debug(
      () =>
        `[evictStaleFileDeclarations] Evicted ${staleIds.length} stale ` +
        `declaration(s) for ${normalizedUri} after re-parse`,
    );
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
    return this.symbolIdIndex.has(symbolId) ? symbolId : null;
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
      argumentCount?: number;
      argumentTypes?: string[];
    },
    targetFileUri?: string,
  ): void {
    if (!sourceSymbol.fileUri) {
      this.logger.warn(
        () =>
          `Skipping deferred reference for source ${sourceSymbol.name}: missing fileUri`,
      );
      return;
    }
    const existing = this.deferredReferences.get(targetSymbolName) || [];
    existing.push({
      sourceSymbol,
      referenceType,
      location,
      targetFileUri,
      context,
    });
    this.deferredReferences.set(targetSymbolName, existing);

    // Sync to Ref
    Effect.runSync(
      Ref.set(this.deferredReferencesRef, this.deferredReferences),
    );

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
   * Create a virtual symbol for stdlib scalar keywords (void, null) and add the reference immediately.
   */
  private createVirtualSymbolForStdlibScalarKeyword(
    targetSymbol: ApexSymbol,
    sourceSymbol: ApexSymbol,
    referenceType: EnumValue<typeof ReferenceType>,
    location: SymbolLocation,
    context?: {
      methodName?: string;
      parameterIndex?: number;
      isStatic?: boolean;
      namespace?: string;
      argumentCount?: number;
      argumentTypes?: string[];
    },
  ): void {
    const virtualSymbolId = generateSymbolId(
      targetSymbol.name,
      targetSymbol.fileUri!,
    );

    // Check if we already have this virtual symbol
    if (this.symbolIdIndex.has(virtualSymbolId)) {
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
    this.symbolIdIndex.set(virtualSymbolId, virtualSymbol);
    this.symbolFileMap.set(virtualSymbolId, virtualSymbol.fileUri);
    this.symbolQualifiedIndex.set(
      this.makeQualifiedSymbolKey(virtualSymbol.fileUri, virtualSymbolId),
      virtualSymbol,
    );

    // Add to name index
    const existingNames = this.nameIndex.get(virtualSymbol.name) || [];
    if (!existingNames.includes(virtualSymbolId)) {
      existingNames.push(virtualSymbolId);
      this.nameIndex.set(virtualSymbol.name, existingNames);
    }

    // Add to FQN index
    if (virtualSymbol.fqn) {
      const existing = this.fqnIndex.get(virtualSymbol.fqn) || [];
      if (!existing.includes(virtualSymbolId)) {
        existing.push(virtualSymbolId);
        this.fqnIndex.set(virtualSymbol.fqn, existing);
      }
    }

    // Update memory statistics
    this.memoryStats.totalSymbols++;

    // Now add the reference
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
   * Add a reference to the indexes between two symbols
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
      argumentCount?: number;
      argumentTypes?: string[];
    },
  ): void {
    // Don't create reference entries for scope symbols (they're structural, not semantic)
    if (isBlockSymbol(sourceSymbol) || isBlockSymbol(targetSymbol)) {
      return;
    }
    if (!sourceSymbol.fileUri) {
      this.logger.warn(
        () =>
          `Skipping addReferenceToGraph for source ${sourceSymbol.name}: missing fileUri`,
      );
      return;
    }
    const normalizedSourceFileUri = extractFilePathFromUri(
      sourceSymbol.fileUri,
    );

    const sourceSymbolInGraph = this.findSymbolInFileByName(
      normalizedSourceFileUri,
      sourceSymbol.name,
    );

    if (!sourceSymbolInGraph) {
      return;
    }

    const sourceId = this.getSymbolId(
      sourceSymbolInGraph,
      sourceSymbolInGraph.fileUri,
    );

    // Create reference store entry
    const refEntry: RefStoreEntry = {
      sourceFileUri: sourceSymbolInGraph.fileUri,
      sourceSymbolId: sourceId,
      targetFileUri: targetSymbol.fileUri,
      targetSymbolId: targetSymbolId,
      referenceType: referenceType,
      location: location,
      context: context
        ? {
            methodName: context.methodName,
            parameterIndex: context.parameterIndex,
            isStatic: context.isStatic,
            namespace: context.namespace,
            argumentCount: context.argumentCount,
            argumentTypes: context.argumentTypes,
          }
        : undefined,
    };

    // Add to indexes
    this.addReferenceToIndexes(
      sourceSymbolInGraph.fileUri,
      sourceId,
      targetSymbolId,
      refEntry,
    );
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
      argumentCount?: number;
      argumentTypes?: string[];
    },
    targetFileUri?: string,
  ): void {
    if (!sourceSymbol.fileUri) {
      this.logger.warn(
        () =>
          `Skipping enqueueDeferredReference for source ${sourceSymbol.name}: missing fileUri`,
      );
      return;
    }
    sourceSymbol.fileUri = extractFilePathFromUri(sourceSymbol.fileUri);

    // If sourceSymbol is a block, find the containing method/class
    let actualSourceSymbol = sourceSymbol;
    if (isBlockSymbol(sourceSymbol)) {
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
      targetFileUri ? extractFilePathFromUri(targetFileUri) : undefined,
    );
  }

  /**
   * Get deferred references for a symbol name
   * @param symbolName The symbol name to get deferred references for
   * @returns Array of deferred references, or undefined if none exist
   */
  public getDeferredReferences(symbolName: string):
    | Array<{
        sourceSymbol: ApexSymbol;
        referenceType: EnumValue<typeof ReferenceType>;
        location: SymbolLocation;
        context?: {
          methodName?: string;
          parameterIndex?: number;
          isStatic?: boolean;
          namespace?: string;
          argumentCount?: number;
          argumentTypes?: string[];
        };
      }>
    | undefined {
    // Sync class fields from Refs to ensure we have the latest state
    this.syncClassFieldsFromRefs();
    return this.deferredReferences.get(symbolName);
  }

  /**
   * Drain ALL deferred references synchronously, in-place, with NO scheduler.
   *
   * Walks the deferred-reference map directly and, for every entry whose source
   * and target symbols are now present in the graph, adds the incoming edge to
   * the reference indexes (the same indexes `findReferencesTo` reads from).
   * Entries that still cannot be resolved (target/source not yet ingested) are
   * left in the map for a later drain.
   *
   * This is the synchronous counterpart to the Effect/scheduler-driven deferred
   * processing used elsewhere; it is intended to be called once after a batch of
   * symbol tables has been ingested (e.g. post-batch on the data-owner) so that
   * cross-file incoming edges are fully populated without queueing work.
   *
   * @returns Number of deferred references that were resolved into graph edges.
   */
  public drainAllDeferredReferencesSync(): number {
    // Ensure the in-memory map reflects the latest Ref state.
    this.syncClassFieldsFromRefs();

    // `resolved` = deferrals satisfied (source + target now both in graph);
    // `edgesAdded` = a subset that produced a brand-new edge (the rest were
    // already-present exact duplicates). Tracked separately for observability.
    let resolved = 0;
    let edgesAdded = 0;

    // Snapshot the keys up-front: we mutate the map while iterating.
    const targetNames = Array.from(this.deferredReferences.keys());

    for (const targetName of targetNames) {
      const deferred = this.deferredReferences.get(targetName);
      if (!deferred || deferred.length === 0) {
        this.deferredReferences.delete(targetName);
        continue;
      }

      // Resolve the target once per name. If the target declaration is not yet
      // in the graph, leave every entry deferred for a later pass.
      const targetCandidates = this.findSymbolByName(targetName);
      if (targetCandidates.length === 0) {
        continue;
      }

      const remaining: typeof deferred = [];

      for (const ref of deferred) {
        const sourceSymbol = ref.sourceSymbol;
        if (!sourceSymbol.fileUri) {
          // Source has no file anchor; cannot place the edge. Drop it.
          continue;
        }

        // Locate the source declaration in its own file.
        const sourceInGraph = this.findSymbolInFileByName(
          sourceSymbol.fileUri,
          sourceSymbol.name,
        );
        if (!sourceInGraph) {
          // Source not ingested yet — keep deferred for a later drain.
          remaining.push(ref);
          continue;
        }

        // Disambiguate the target when the name resolves to multiple files.
        const targetSymbol = this.pickDeferredTarget(
          targetCandidates,
          sourceInGraph,
          ref.context?.namespace,
          targetName,
        );

        const sourceId = this.getSymbolId(sourceInGraph, sourceInGraph.fileUri);
        const targetId = this.getSymbolId(targetSymbol, targetSymbol.fileUri);

        const added = this.createAndAddReference(
          sourceInGraph.fileUri,
          sourceId,
          targetSymbol.fileUri,
          targetId,
          ref.referenceType,
          ref.location,
          ref.context,
        );
        if (added) {
          this.memoryStats.totalEdges++;
          edgesAdded++;
        }
        // Both source and target are now in the graph, so the incoming edge is
        // populated — newly added, or already present (createAndAddReference
        // returns false only on an exact duplicate). Either way the deferral is
        // satisfied, so count it resolved and drop it from the deferred map.
        resolved++;
      }

      if (remaining.length === 0) {
        this.deferredReferences.delete(targetName);
      } else {
        this.deferredReferences.set(targetName, remaining);
      }
    }

    // Persist the mutated map back to the Ref so Effect-based readers agree.
    Effect.runSync(
      Ref.set(this.deferredReferencesRef, this.deferredReferences),
    );

    this.logger.debug(
      () =>
        `[DEFERRED] drainAllDeferredReferencesSync satisfied ${resolved} deferral(s) ` +
        `(${edgesAdded} new edge(s), ${resolved - edgesAdded} already present); ` +
        `${this.deferredReferences.size} target name(s) still deferred`,
    );

    return resolved;
  }

  /**
   * Async wrapper around {@link drainAllDeferredReferencesSync} for Effect-genned
   * call sites. The drain itself is fully synchronous (no scheduler); this only
   * adapts it into an Effect so it can be `yield*`-ed alongside other effects.
   */
  public drainAllDeferredReferences(): Effect.Effect<number, never, never> {
    return Effect.sync(() => this.drainAllDeferredReferencesSync());
  }

  /**
   * Target names that currently have at least one deferred (unresolved) reference
   * awaiting their declaring artifact. Exposed for observability and testing so
   * callers can assert deferral/drain behavior without reaching into the private
   * `deferredReferences` map.
   */
  public getDeferredTargetNames(): string[] {
    return Array.from(this.deferredReferences.keys());
  }

  /**
   * Pick which target declaration a deferred reference resolves to when its
   * name is declared in more than one file. Resolution tiers, most→least
   * specific:
   *   1. Same file as the source declaration (a local/same-file target wins).
   *   2. Namespace match, when the reference carried a namespace hint.
   *   3. Sole candidate.
   * Falls back to the first candidate, logging the ambiguity so a wrong-target
   * edge is at least observable.
   */
  private pickDeferredTarget(
    candidates: ApexSymbol[],
    sourceInGraph: ApexSymbol,
    namespaceHint: string | undefined,
    targetName: string,
  ): ApexSymbol {
    // 1. Prefer a target in the same file as the source.
    const sameFile = candidates.find(
      (t) => t.fileUri === sourceInGraph.fileUri,
    );
    if (sameFile) {
      return sameFile;
    }

    // 2. Namespace-aware match when the reference carried a namespace hint.
    if (namespaceHint) {
      const wanted = namespaceHint.toLowerCase();
      const byNamespace = candidates.filter((t) => {
        const ns =
          typeof t.namespace === 'string'
            ? t.namespace
            : (t.namespace?.toString?.() ?? '');
        return ns.toLowerCase() === wanted;
      });
      if (byNamespace.length === 1) {
        return byNamespace[0];
      }
    }

    // 3. Unambiguous single candidate.
    if (candidates.length === 1) {
      return candidates[0];
    }

    // Still ambiguous: take the first but surface it — attaching the edge to
    // the wrong same-named declaration is a known imprecision worth tracing.
    this.logger.debug(
      () =>
        `[DEFERRED] ambiguous target '${targetName}' (${candidates.length} ` +
        'declarations, no same-file or namespace match); ' +
        `attaching edge to ${candidates[0].fileUri}`,
    );
    return candidates[0];
  }

  /**
   * Process deferred references for a symbol in batches with retry tracking (Effect-based)
   * Returns result indicating if retry is needed and why
   * This version yields periodically to prevent blocking
   * @deprecated Use queueDeferredReferencesForSymbol for individual task queueing
   */
  public processDeferredReferencesBatchEffect(
    symbolName: string,
  ): Effect.Effect<BatchProcessingResult, never, never> {
    // Sync class fields to Refs before processing
    this.syncRefsToClassFields();
    return processDeferredReferencesBatchEffect(symbolName).pipe(
      Effect.provide(this.deferredProcessorLayer),
      Effect.tap(() =>
        Effect.sync(() => {
          // Sync Refs back to class fields after processing
          this.syncClassFieldsFromRefs();
        }),
      ),
    );
  }
  /**
   * Retry pending deferred references when source symbol is added (Effect-based)
   * Returns result indicating if retry is needed and why
   * This version yields periodically to prevent blocking
   * @deprecated Use queuePendingReferencesForSymbol for individual task queueing
   */
  private retryPendingDeferredReferencesBatchEffect(
    symbolName: string,
  ): Effect.Effect<BatchProcessingResult, never, never> {
    // Sync class fields to Refs before processing
    this.syncRefsToClassFields();
    return retryPendingDeferredReferencesBatchEffect(symbolName).pipe(
      Effect.provide(this.deferredProcessorLayer),
      Effect.tap(() =>
        Effect.sync(() => {
          // Sync Refs back to class fields after processing
          this.syncClassFieldsFromRefs();
        }),
      ),
    );
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
    return new Set(this.symbolIdIndex.keys());
  }

  public findFilesForSymbolName(name: string): string[] {
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
   * @deprecated Graph-based accessors removed. Use getRefStore/getReverseIndex/getForwardIndex instead.
   */
  public getSymbolToVertex(): HashMap<string, DirectedVertex<ReferenceNode>> {
    throw new Error(
      'Graph-based access removed. Use index-based methods instead.',
    );
  }

  /**
   * @deprecated Graph-based accessors removed. Use getRefStore/getReverseIndex/getForwardIndex instead.
   */
  public getReferenceGraph(): DirectedGraph<ReferenceNode, ReferenceEdge> {
    throw new Error(
      'Graph-based access removed. Use index-based methods instead.',
    );
  }

  /**
   * Get the reference store (maps refKey -> RefStoreEntry)
   */
  public getRefStore(): CaseInsensitiveHashMap<RefStoreEntry> {
    return this.refStore;
  }

  /**
   * Get the reverse index (maps targetSymbolId -> Set<refKey>)
   */
  public getReverseIndex(): CaseInsensitiveHashMap<Set<string>> {
    return this.reverseIndex;
  }

  /**
   * Get the forward index (maps sourceFileUri -> Set<refKey>)
   */
  public getForwardIndex(): CaseInsensitiveHashMap<Set<string>> {
    return this.forwardIndex;
  }

  public getFileToSymbolTable(): CaseInsensitiveHashMap<SymbolTable> {
    return this.fileToSymbolTable;
  }

  public getFileIndex(): CaseInsensitiveHashMap<string[]> {
    return this.fileIndex;
  }

  public getLoggerInstance() {
    return this.logger;
  }

  /**
   * Log periodic summary of deferred processing metrics
   */
  private logDeferredProcessingSummary(): Effect.Effect<void, never, never> {
    // Sync class fields to Refs before logging
    this.syncRefsToClassFields();
    return logDeferredProcessingSummary().pipe(
      Effect.provide(this.deferredProcessorLayer),
    );
  }
}
