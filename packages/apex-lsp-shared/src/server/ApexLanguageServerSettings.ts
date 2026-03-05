/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Runtime platform enumeration
 */
export type RuntimePlatform = 'desktop' | 'web';

/**
 * Server mode enumeration
 */
export type ServerMode = 'production' | 'development';

/**
 * Comment collection settings for different LSP operations
 */
export interface CommentCollectionSettings {
  /** Whether to collect comments during document parsing (default: true) */
  enableCommentCollection: boolean;

  /** Whether to include single-line (//) comments (default: false) */
  includeSingleLineComments: boolean;

  /** Whether to associate comments with symbols for enhanced features (default: false) */
  associateCommentsWithSymbols: boolean;

  /** Enable comment collection for document change events (default: true) */
  enableForDocumentChanges: boolean;

  /** Enable comment collection for document open events (default: true) */
  enableForDocumentOpen: boolean;

  /** Enable comment collection for document symbols (default: false for performance) */
  enableForDocumentSymbols: boolean;

  /** Enable comment collection for folding ranges (default: false for performance) */
  enableForFoldingRanges: boolean;
}

/**
 * Performance-related settings that may affect comment collection
 */
export interface PerformanceSettings {
  /** Maximum file size (in bytes) for enabling comment collection (default: 100KB) */
  commentCollectionMaxFileSize: number;

  /** Whether to use async comment processing for large files (default: true) */
  useAsyncCommentProcessing: boolean;

  /** Debounce delay for document change comment processing in ms (default: 300) */
  documentChangeDebounceMs: number;
}

/**
 * Environment-specific settings
 */
export interface EnvironmentSettings {
  /** Current environment (node, browser, web-worker) */
  runtimePlatform: RuntimePlatform;

  /** Current server mode */
  serverMode: ServerMode;

  /** Profiling mode:
   * 'none' = disabled,
   * 'full' = continuous profiling from startup using Node.js
   * flags,
   * 'interactive' = manual start/stop using inspector API
   * 'none' = disabled by default
   * (default: 'none')
   */
  profilingMode: 'none' | 'full' | 'interactive';

  /** Type of profiling to perform when profiling is enabled (default: 'cpu') */
  profilingType: 'cpu' | 'heap' | 'both';

  /** Log level for comment collection (default: 'info') */
  commentCollectionLogLevel: 'debug' | 'info' | 'warn' | 'error';

  /** JavaScript heap size in GB for the language server process.
   *  If not specified, Node.js default heap size is used.
   *  Maximum allowed value is 32 GB.
   *  Values above 16 GB may cause performance issues if system memory is insufficient.
   */
  jsHeapSizeGB?: number;

  /**
   * Additional document schemes to include in document selectors.
   * Default schemes per capability are immutable and cannot be removed.
   * Additional schemes apply to all capabilities by default.
   * Use excludeCapabilities to exclude specific capabilities from a scheme.
   *
   * Default schemes:
   * - Most capabilities (documentSymbol, hover, foldingRange, diagnostic, completion, definition):
   *   include 'file', 'apexlib', 'vscode-test-web' for both 'apex' and 'apex-anon'
   * - CodeLens: includes 'file', 'vscode-test-web' only (excludes 'apexlib')
   *
   * Languages ('apex', 'apex-anon') are immutable and not configurable.
   */
  additionalDocumentSchemes?: Array<{
    /** The scheme name to add */
    scheme: string;
    /** Optional array of capability names to exclude this scheme from */
    excludeCapabilities?: string[];
  }>;
}

/**
 * Resource loading settings
 */
export interface ResourceSettings {
  /** Standard Apex Library path */
  standardApexLibraryPath?: string;
}

/**
 * Missing artifact resolution settings
 */
export interface MissingArtifactSettings {
  /** Enable missing artifact resolution feature */
  enabled: boolean;

  /** Timeout for blocking resolution in milliseconds */
  blockingWaitTimeoutMs: number;

  /** Polling interval for indexing barrier in milliseconds */
  indexingBarrierPollMs: number;

  /** Maximum number of candidates to open per request */
  maxCandidatesToOpen: number;

  /** Default timeout hint to send to client in milliseconds */
  timeoutMsHint: number;

  /** Whether to enable performance marks for debugging */
  enablePerfMarks: boolean;
}

/**
 * Workspace loading settings
 */
export interface LoadWorkspaceSettings {
  /** Whether to enable automatic workspace loading at startup */
  enabled: boolean;

  /** Maximum number of concurrent file operations during workspace loading */
  maxConcurrency: number;

  /** Number of file operations before yielding control to prevent UI blocking */
  yieldInterval: number;

  /** Delay in milliseconds when yielding control during workspace loading */
  yieldDelayMs: number;

  /** Number of files per batch when using batch loading (default: 100) */
  batchSize: number;

  /** When true, include .sfdx/tools/sobjects/customObjects in workspace scan (default: false) */
  includeSfdxToolsCustomObjects?: boolean;
}

/**
 * Deferred reference processing settings
 */
export interface DeferredReferenceProcessingSettings {
  /** Batch size for processing deferred references (default: 50) */
  deferredBatchSize: number;

  /** Batch size for initial reference processing when adding symbol tables (default: 50) */
  initialReferenceBatchSize: number;

  /** Maximum number of retry attempts for deferred references (default: 10) */
  maxRetryAttempts: number;

  /** Initial retry delay in milliseconds (default: 100) */
  retryDelayMs: number;

  /** Maximum retry delay in milliseconds for exponential backoff (default: 5000) */
  maxRetryDelayMs: number;

  /** Queue capacity threshold percentage - don't retry if queue > this % full (default: 90) */
  queueCapacityThreshold: number;

  /** Queue drain threshold percentage - only retry when queue < this % full (default: 75) */
  queueDrainThreshold: number;

  /** Delay in milliseconds when queue is full (default: 10000) */
  queueFullRetryDelayMs: number;

  /** Maximum delay in milliseconds when queue is full (default: 30000) */
  maxQueueFullRetryDelayMs: number;

  /** Number of consecutive failures before activating circuit breaker (default: 5) */
  circuitBreakerFailureThreshold: number;

  /** Queue capacity percentage threshold to reset circuit breaker (default: 50) */
  circuitBreakerResetThreshold: number;

  /** Rate limit for enqueueing deferred tasks per second (default: 10) */
  maxDeferredTasksPerSecond?: number;

  /** Time threshold in milliseconds - if batch processing exceeds this, yield more frequently (default: 50) */
  yieldTimeThresholdMs?: number;
}

/**
 * Queue processing settings
 */
export interface QueueProcessingSettings {
  /** Maximum number of concurrent tasks per priority level
   * Supports: CRITICAL (0), IMMEDIATE (1), HIGH (2), NORMAL (3), LOW (4), BACKGROUND (5)
   */
  maxConcurrency: Record<string, number>;

  /** Optional overall maximum concurrent tasks across all priorities
   * When set, provides a safety net to prevent system overload
   * Default: sum of per-priority limits * 1.2 (20% buffer)
   * When overall limit is exceeded, only lower priorities (Normal/Low/Background) are blocked
   * Critical/Immediate/High priorities are always allowed through to prevent priority inversion
   */
  maxTotalConcurrency?: number;

  /** Number of tasks processed before yielding control to prevent blocking */
  yieldInterval: number;

  /** Delay in milliseconds when yielding control during queue processing */
  yieldDelayMs: number;
}

/**
 * Priority scheduler settings
 */
export interface SchedulerSettings {
  /** Queue capacity per priority level
   * Can be a single number (applied to all priorities) or a Record with per-priority values
   * Supports: CRITICAL (0), IMMEDIATE (1), HIGH (2), NORMAL (3), LOW (4), BACKGROUND (5)
   * Default: 200 for all priorities
   */
  queueCapacity: number | Record<string, number>;

  /** Maximum number of high-priority tasks before starvation relief (default: 50) */
  maxHighPriorityStreak: number;

  /** Idle sleep duration in milliseconds when no tasks available (default: 1) */
  idleSleepMs: number;

  /** Interval for periodic queue state notifications to client in milliseconds (default: 200) */
  queueStateNotificationIntervalMs: number;
}

/**
 * Symbol graph pre-population settings
 */
export interface SymbolGraphSettings {
  /**
   * Enable symbol graph pre-population feature.
   * When enabled, specified namespaces are loaded during server initialization.
   * Measured startup cost: ~190ms for Database + System (eliminates 60-80ms first-file penalty).
   * Default: true (enabled by default based on favorable performance tests)
   */
  enabled: boolean;

  /**
   * Standard Apex namespaces to pre-populate into symbol graph at startup.
   * Pre-populating common namespaces eliminates first-file penalty (~60-80ms).
   * Measured startup cost: Database (~18ms), System (~837ms), Combined (~190ms).
   * Default: ['Database', 'System']
   * Available namespaces: Database, System, Schema, ConnectApi, Cache, Dom, Flow, etc.
   */
  preloadNamespaces: string[];
}

/**
 * Validation settings
 */
export interface ValidationSettings {
  /**
   * Enable version-specific validation rules
   * When enabled, validators check API version requirements for annotations and other version-dependent features
   * Default: false (disabled by default for backward compatibility)
   */
  versionSpecificValidation: {
    enabled: boolean;
  };
}

/**
 * Complete Apex Language Server settings
 */
export interface ApexLanguageServerSettings {
  apex: {
    /** Comment collection configuration */
    commentCollection: CommentCollectionSettings;

    /** Performance-related settings */
    performance: PerformanceSettings;

    /** Environment-specific settings */
    environment: EnvironmentSettings;

    /** Resource loading settings */
    resources: ResourceSettings;

    /** Missing artifact resolution settings */
    findMissingArtifact: MissingArtifactSettings;

    /** Workspace loading settings */
    loadWorkspace: LoadWorkspaceSettings;

    /** Queue processing settings */
    queueProcessing: QueueProcessingSettings;

    /** Priority scheduler settings */
    scheduler: SchedulerSettings;

    /** Deferred reference processing settings */
    deferredReferenceProcessing?: DeferredReferenceProcessingSettings;

    /** Symbol graph pre-population settings */
    symbolGraph?: SymbolGraphSettings;

    /** Validation configuration */
    validation?: ValidationSettings;

    /** Server version for compatibility checks */
    version?: string;

    /**
     * General log level for the server (optional, from apex.logLevel)
     * Accepts: 'error', 'warning', 'info', 'log', 'debug'
     */
    logLevel?: string;
    worker: {
      logLevel?: string;
    };
  };
}
