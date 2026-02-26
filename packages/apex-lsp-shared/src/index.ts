/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

export * from './notification';
export * from './types';
export * from './storage/StorageInterface';
export * from './utils/CorrelatedMessage';
export * from './utils/Environment';
export * from './utils/BrowserUtils';
export * from './utils/ErrorUtils';
export * from './utils/Logging';
export * from './factories/ConnectionFactory';
export * from './communication/Interfaces';
export * from './server/ApexLanguageServerSettings';
export {
  setLogNotificationHandler,
  getLogNotificationHandler,
} from './notification';
export type {
  LogMessageType,
  LogMessageParams,
  LogNotificationHandler,
} from './notification';

// Export enum utilities
export * from './enumUtils';

// Export optimized enum utilities for memory efficiency (excluding duplicates)
export {
  defineOptimizedEnum,
  getOptimizedEnumKeys,
  getOptimizedEnumValues,
  getOptimizedEnumEntries,
  isValidOptimizedEnumKey,
  isValidOptimizedEnumValue,
  calculateOptimizedEnumSavings,
  compareEnumMemoryUsage,
} from './optimizedEnumUtils';

// Export logger functionality
export * from './logger';

// Export testing and metrics utilities
export * from './testing/performance-utils';
export * from './testing/performance-metrics';

// Explicitly export commonly used functions
export {
  defineEnum,
  isValidEnumKey,
  isValidEnumValue,
  getEnumKeys,
  getEnumValues,
  getEnumEntries,
} from './enumUtils';

// Export smaller numeric types for memory optimization
export * from './smallNumericTypes';

// Export capabilities management
export * from './capabilities/ApexCapabilitiesManager';
export * from './capabilities/ApexLanguageServerCapabilities';

// Export settings management
export * from './settings/ApexSettingsUtilities';
export * from './settings/ApexSettingsManager';
export * from './settings/LSPConfigurationManager';
export {
  generateStartupSummary,
  generateChangeSummary,
} from './settings/ConfigurationSummary';

// Export client capabilities
export * from './client/ApexClientCapabilities';

// Export priority types
export * from './types/priority';

// Export document selector utilities
export * from './document/DocumentSelectorUtils';

export {
  DEFAULT_TELEMETRY_SETTINGS,
  initializeTracing,
  isTracingEnabled,
  disableTracing,
  shutdownTracing,
  runWithSpan,
  runSyncWithSpan,
  withTracing,
  annotateCurrentSpan,
  LSP_SPAN_NAMES,
  type LspSpanAttributes,
  type TelemetrySettings,
  CommandPerformanceAggregator,
  collectStartupSnapshot,
  generateSessionId,
  type StartupSnapshotParams,
  type TelemetryEventType,
  type StartupSnapshotEvent,
  type CommandSummary,
  type CommandPerformanceEvent,
  type TelemetryEvent,
} from './observability';

// Experimental protocol: Missing Artifact Resolution
export type RequestKind =
  | 'definition'
  | 'typeDefinition'
  | 'implementation'
  | 'hover'
  | 'references'
  | 'completion'
  | 'signatureHelp';

// ReferenceContext enum values for type-safe context checking
export enum ReferenceContext {
  METHOD_CALL = 0,
  CLASS_REFERENCE = 1,
  TYPE_DECLARATION = 2,
  FIELD_ACCESS = 3,
  CONSTRUCTOR_CALL = 4,
  VARIABLE_USAGE = 5,
  PARAMETER_TYPE = 6,
  VARIABLE_DECLARATION = 7,
}

// Enhanced search hints for client-side artifact resolution
export interface SearchHint {
  readonly searchPatterns: string[];
  readonly priority: 'exact' | 'high' | 'medium' | 'low';
  readonly reasoning: string;
  readonly expectedFileType: 'class' | 'trigger';
  readonly namespace?: string;
  readonly fallbackPatterns?: string[];
  readonly confidence: number; // 0.0 to 1.0
}

// TypeReference from apex-parser-ast (avoiding import to keep shared package lightweight)
export interface TypeReference {
  readonly name: string;
  readonly location: {
    readonly symbolRange: {
      readonly startLine: number;
      readonly startColumn: number;
      readonly endLine: number;
      readonly endColumn: number;
    };
    readonly identifierRange: {
      readonly startLine: number;
      readonly startColumn: number;
      readonly endLine: number;
      readonly endColumn: number;
    };
  };
  readonly context: string | number; // ReferenceContext enum value
  readonly qualifier?: string;
  readonly qualifierLocation?: {
    readonly symbolRange: {
      readonly startLine: number;
      readonly startColumn: number;
      readonly endLine: number;
      readonly endColumn: number;
    };
    readonly identifierRange: {
      readonly startLine: number;
      readonly startColumn: number;
      readonly endLine: number;
      readonly endColumn: number;
    };
  };
  readonly memberLocation?: {
    readonly symbolRange: {
      readonly startLine: number;
      readonly startColumn: number;
      readonly endLine: number;
      readonly endColumn: number;
    };
    readonly identifierRange: {
      readonly startLine: number;
      readonly startColumn: number;
      readonly endLine: number;
      readonly endColumn: number;
    };
  };
  readonly parentContext?: string;
  readonly isResolved?: boolean;
  readonly access?: 'read' | 'write' | 'readwrite';
}

export interface FindMissingArtifactParams {
  readonly identifier: string;
  readonly origin: {
    readonly uri: string;
    readonly position?: { line: number; character: number };
    readonly requestKind: RequestKind;
  };
  readonly mode: 'blocking' | 'background';
  readonly maxCandidates?: number;
  readonly maxCandidatesToOpen?: number;
  readonly timeoutMsHint?: number;
  readonly workDoneToken?: unknown;
  readonly correlationId?: string;
  // Simply pass the TypeReference object directly - much cleaner!
  readonly typeReference?: TypeReference;
  // Enhanced parent context - full parent symbol data when available
  readonly parentContext?: {
    readonly containingType?: any; // ApexSymbol of immediate containing type (class/interface/enum)
    readonly ancestorChain?: any[]; // Array of ApexSymbol ancestors from top-level to closest parent
    readonly parentSymbol?: any; // Direct parent ApexSymbol if available
    readonly contextualHierarchy?: string; // Human-readable hierarchy like "MyClass.MyMethod.localVar"
  };
  // New: Pre-resolved search hints from LSP services
  readonly searchHints?: SearchHint[];
  // New: Resolved qualifier information
  readonly resolvedQualifier?: {
    readonly type: 'class' | 'interface' | 'enum' | 'variable' | 'unknown';
    readonly name: string;
    readonly namespace?: string;
    readonly isStatic: boolean;
    readonly filePath?: string; // If already known
  };
}

export type FindMissingArtifactResult =
  | { opened: string[] }
  | { notFound: true }
  | { accepted: true };

/**
 * Result type for findApexTests command
 */
export interface FindApexTestsResult {
  testClasses: Array<{
    class: {
      name: string;
      fileUri: string;
      location: {
        uri: string;
        range: {
          start: { line: number; character: number };
          end: { line: number; character: number };
        };
      };
    };
    methods: Array<{
      name: string;
      location: {
        uri: string;
        range: {
          start: { line: number; character: number };
          end: { line: number; character: number };
        };
      };
    }>;
  }>;
}

export type ProgressToken = number | string;

/**
 * @deprecated Use RequestWorkspaceLoadParams and notification-based pattern instead
 */
export interface LoadWorkspaceParams {
  readonly workDoneToken?: ProgressToken;
  readonly queryOnly?: boolean; // NEW: Query state without triggering load
}

/**
 * @deprecated Use WorkspaceLoadCompleteParams notification instead
 */
export type LoadWorkspaceResult =
  | {
      accepted: true;
      alreadyLoaded?: boolean;
      inProgress?: boolean;
      retryable?: boolean;
    }
  | { loaded: true } // NEW: For queryOnly responses
  | { loading: true } // NEW: For queryOnly responses
  | { failed: true } // NEW: For queryOnly responses
  | { loaded: false } // NEW: For queryOnly responses when not loaded and not loading
  | { error: string };

/**
 * Parameters for server-to-client workspace load request notification
 */
export interface RequestWorkspaceLoadParams {
  readonly workDoneToken?: ProgressToken;
}

/**
 * Parameters for client-to-server workspace load completion notification
 */
export interface WorkspaceLoadCompleteParams {
  readonly success: boolean;
  readonly error?: string;
}

/**
 * File metadata for workspace batch loading
 */
export interface WorkspaceFileMetadata {
  readonly uri: string;
  readonly version: number;
}

/**
 * Workspace file batch containing files and metadata
 */
export interface WorkspaceFileBatch {
  readonly batchIndex: number;
  readonly totalBatches: number;
  readonly isLastBatch: boolean;
  readonly fileMetadata: readonly WorkspaceFileMetadata[];
  readonly files: Array<{
    readonly uri: string;
    readonly version: number;
    readonly content: string;
  }>;
}

/**
 * Parameters for client-to-server workspace batch request
 */
export interface SendWorkspaceBatchParams {
  readonly batchIndex: number;
  readonly totalBatches: number;
  readonly isLastBatch: boolean;
  readonly compressedData: string; // Base64-encoded ZIP file
  readonly fileMetadata: readonly WorkspaceFileMetadata[];
}

/**
 * Result for server-to-client workspace batch response
 */
export interface SendWorkspaceBatchResult {
  readonly success: boolean;
  readonly enqueuedCount: number;
  readonly stored?: boolean; // Indicates batch was stored (not processed yet)
  readonly receivedCount?: number; // Number of batches received so far
  readonly totalBatches?: number; // Total batches expected
  readonly error?: string;
}

/**
 * Parameters for processing stored workspace batches
 */
export interface ProcessWorkspaceBatchesParams {
  readonly totalBatches: number;
}

/**
 * Result for processing workspace batches request
 */
export interface ProcessWorkspaceBatchesResult {
  readonly success: boolean;
  readonly error?: string;
}

/**
 * LSP Work Done Progress interfaces
 */
export interface WorkDoneProgressBegin {
  kind: 'begin';
  title: string;
  cancellable?: boolean;
  message?: string;
  percentage?: number;
}

export interface WorkDoneProgressReport {
  kind: 'report';
  cancellable?: boolean;
  message?: string;
  percentage?: number;
}

export interface WorkDoneProgressEnd {
  kind: 'end';
  message?: string;
}

export type WorkDoneProgress =
  | WorkDoneProgressBegin
  | WorkDoneProgressReport
  | WorkDoneProgressEnd;
