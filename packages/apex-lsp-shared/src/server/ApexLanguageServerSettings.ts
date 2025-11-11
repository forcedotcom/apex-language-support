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

export type ResourceLoadMode = 'lazy' | 'full';

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
}

/**
 * Resource loading settings
 */
export interface ResourceSettings {
  /** Resource loading mode (default: 'full' for Node.js, 'lazy' for browser) */
  loadMode: ResourceLoadMode;

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
}

/**
 * Request priority levels for queue processing
 */
export type RequestPriority = 'IMMEDIATE' | 'HIGH' | 'NORMAL' | 'LOW';

/**
 * Queue processing settings
 */
export interface QueueProcessingSettings {
  /** Maximum number of concurrent tasks per priority level */
  maxConcurrency: Record<RequestPriority, number>;

  /** Number of tasks processed before yielding control to prevent blocking */
  yieldInterval: number;

  /** Delay in milliseconds when yielding control during queue processing */
  yieldDelayMs: number;
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
