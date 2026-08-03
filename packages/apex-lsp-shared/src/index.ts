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

export * from './enumUtils';

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

export * from './logger';

export * from './testing/performance-utils';
export * from './testing/performance-metrics';

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
  generateCapabilitiesSummary,
} from './settings/ConfigurationSummary';

// Export client capabilities
export * from './client/ApexClientCapabilities';

// Export canonical apex/* method registry
export * from './methods/ApexCustomMethods';

// Export priority types
export * from './types/priority';

// Export document selector utilities
export * from './document/DocumentSelectorUtils';

export {
  DEFAULT_TELEMETRY_SETTINGS,
  enableTracing,
  isTracingEnabled,
  disableTracing,
  runWithSpan,
  runSyncWithSpan,
  runWithCapturedContext,
  captureActiveTraceContext,
  withTracing,
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

/** Per-identifier hints for find missing artifact resolution */
export interface SemanticArtifactProvenance {
  /** URI of the semantic snapshot that produced this identifier. */
  readonly sourceUri: string;
  /** Document version represented by the symbol table, when known. */
  readonly documentVersion?: number;
  /** Exact parser-owned identifier range. */
  readonly referenceRange: {
    readonly startLine: number;
    readonly startColumn: number;
    readonly endLine: number;
    readonly endColumn: number;
  };
  /** Stable identity derived from reference IDs/context and its exact range. */
  readonly referenceIdentity: string;
  readonly resolvedSymbolId?: string;
  readonly resolvedTypeId?: string;
  readonly parseCompleteness: 'complete' | 'incomplete' | 'unknown';
}

export interface IdentifierSpec {
  readonly name: string;
  readonly provenance: SemanticArtifactProvenance;
  readonly typeReference?: TypeReference;
  readonly searchHints?: SearchHint[];
  readonly resolvedQualifier?: {
    readonly type: 'class' | 'interface' | 'enum' | 'variable' | 'unknown';
    readonly name: string;
    readonly namespace?: string;
    readonly isStatic: boolean;
    readonly filePath?: string;
  };
  readonly parentContext?: {
    readonly containingType?: any;
    readonly ancestorChain?: any[];
    readonly parentSymbol?: any;
    readonly contextualHierarchy?: string;
  };
}

/**
 * Lightweight summary of an ApexSymbol, used to avoid coupling the shared
 * package to the full ApexSymbol type from the parser.
 */
export interface SymbolSummary {
  readonly name: string;
  readonly kind: string;
}

export interface FindMissingArtifactParams {
  readonly identifiers: IdentifierSpec[];
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
}

export type FindMissingArtifactResult =
  { opened: string[] } | { notFound: true } | { accepted: true };

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
 * Why a workspace load was triggered. Lets the client show an action-tailored
 * status message (e.g. "Searching workspace for implementations…") instead of
 * the generic load text, so a feature that triggers a cold workspace load can
 * tell the user what it is doing right now.
 *
 * 'startup' is the default (explicit workspace load / no specific feature).
 * Feature reasons are added as features adopt the pattern (implementation is
 * first; references will follow).
 */
export type WorkspaceLoadReason = 'startup' | 'implementation' | 'references';

/**
 * User-facing status-bar message for each workspace-load reason. The client
 * shows this (with a busy spinner) at load start and reverts on
 * apex/workspaceIngestionComplete. Centralized here so server (which sends the
 * reason) and client (which renders it) stay in agreement, and so new features
 * adopt the pattern by adding one entry.
 */
export const WORKSPACE_LOAD_REASON_MESSAGE: Record<
  WorkspaceLoadReason,
  string
> = {
  startup: 'Loading Apex workspace…',
  implementation: 'Searching workspace for implementations…',
  references: 'Searching workspace for references…',
};

/**
 * Parameters for server-to-client workspace load request notification
 */
export interface RequestWorkspaceLoadParams {
  readonly workDoneToken?: ProgressToken;
  /**
   * Why the load was requested. The client maps this to an action-tailored
   * busy status message. Omitted/unknown → treated as 'startup'.
   */
  readonly reason?: WorkspaceLoadReason;
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
  /** Client-generated identifier shared by every batch in one workspace load. */
  readonly sessionId: string;
  readonly batchIndex: number;
  readonly totalBatches: number;
  readonly isLastBatch: boolean;
  readonly compressedData: string; // Base64-encoded ZIP file
  readonly fileMetadata: readonly WorkspaceFileMetadata[];
  /** W3C traceparent for extension-to-server workspace-load tracing. */
  readonly traceContext?: string;
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
  /** Client-generated identifier of the workspace load to process. */
  readonly sessionId: string;
  readonly totalBatches: number;
  /** W3C traceparent for the detached server-processing span. */
  readonly traceContext?: string;
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
  WorkDoneProgressBegin | WorkDoneProgressReport | WorkDoneProgressEnd;

// Wire schemas for IdentifierSpec — safe for postMessage / structured clone
export {
  WireTypeReferenceSchema,
  WireSearchHintSchema,
  WireResolvedQualifierSchema,
  WireParentContextSchema,
  WireSemanticArtifactProvenanceSchema,
  WireIdentifierSpecSchema,
} from './wireSchemas';
export type {
  WireTypeReference,
  WireSearchHint,
  WireResolvedQualifier,
  WireParentContext,
  WireSemanticArtifactProvenance,
  WireIdentifierSpec,
} from './wireSchemas';

// Worker wire schemas — internal worker IPC contract (Option B)
export {
  LSP_REQUEST_TYPES,
  WorkerRole,
  WorkerInit,
  PingWorker,
  WorkerRemoteStdlibWarmup,
  DataOwnerPreloadStandardNamespaces,
  QuerySymbolSubset,
  AwaitSymbolReadiness,
  UpdateSymbolSubset,
  ResolveDepUris,
  ResolveDependentUris,
  FindOccurrenceCandidates,
  EnsureWorkspaceLoaded,
  WorkspaceBatchIngest,
  CompileDocument,
  ResourceLoaderGetSymbolTable,
  ResourceLoaderGetSymbolTables,
  ResourceLoaderGetFile,
  ResourceLoaderResolveClass,
  ResourceLoaderGetStandardNamespaces,
  WorkerAssistanceRequest,
  isAssistanceRequest,
  isAssistanceResponse,
  WireLspRequestType,
  WirePosition,
  WireRange,
  DispatchDocumentOpen,
  DispatchDocumentChange,
  DispatchDocumentSave,
  DispatchDocumentClose,
  DispatchHover,
  DispatchDefinition,
  DispatchCompletion,
  DispatchSignatureHelp,
  DispatchCodeAction,
  DispatchReferences,
  DispatchRename,
  DispatchImplementation,
  DispatchDocumentSymbol,
  DispatchCodeLens,
  DispatchDiagnostic,
  DispatchCrossFileEnrichment,
  DispatchGenericLspRequest,
  WorkspaceBatchCompileOnDataOwner,
  BeginWorkspaceLoadSession,
  DrainDeferredReferences,
  QueryGraphData,
  DataOwnerQuerySymbolByName,
  DataOwnerTags,
  LspRequestTags,
  ResourceLoaderTags,
  AllWorkerTags,
  WIRE_PROTOCOL_VERSION,
  isAllowedTag,
} from './workerWireSchemas';

// Dedicated, platform-neutral compilation worker protocol.
export {
  CompilationDetailLevel,
  SerializedParserDiagnostic,
  SerializedCompilationSymbolTable,
  CompilationMetrics,
  CompileApexFileSuccess,
  CompileApexFileFailure,
  InitializeCompilationWorker,
  CompileApexFile,
  CompilationWorkerRequests,
} from './compilationWorkerWireSchemas';
export type { CompilationWorkerRequest } from './compilationWorkerWireSchemas';
export type {
  LSPRequestType,
  AssistanceRequestPayload,
  AssistanceResponsePayload,
  WorkerInitSuccess,
  PingWorkerSuccess,
  QuerySymbolSubsetSuccess,
  AwaitSymbolReadinessSuccess,
  UpdateSymbolSubsetSuccess,
  WorkerAssistanceSuccess,
  WorkspaceBatchIngestSuccess,
  ResourceLoaderGetSymbolTableSuccess,
  DataOwnerTag,
  LspRequestTag,
  ResourceLoaderTag,
  WorkerTag,
  DataOwnerRequest,
  LspRequestMessage,
  ResourceLoaderRequest,
  WorkerLogMessage,
  WorkerLogLevel,
} from './workerWireSchemas';

// Profiling param/result types for apex/profiling/* methods (3.1 typed surface)
// Structurally mirror the inline shapes in LCSAdapter + ProfilingService without
// importing them (shared stays adapter-free).

/**
 * Parameters for `apex/profiling/start` request.
 */
export interface ProfilingStartParams {
  readonly type?: 'cpu' | 'heap' | 'both';
}

/**
 * Result for `apex/profiling/start` request.
 */
export interface ProfilingStartResult {
  readonly success: boolean;
  readonly message: string;
  readonly type?: 'cpu' | 'heap' | 'both';
}

/**
 * Parameters for `apex/profiling/stop` request.
 */
export interface ProfilingStopParams {
  readonly tag?: string;
}

/**
 * Result for `apex/profiling/stop` request.
 */
export interface ProfilingStopResult {
  readonly success: boolean;
  readonly message: string;
  readonly files?: readonly string[];
}

/**
 * Parameters for `apex/profiling/status` request.
 */
export type ProfilingStatusParams = Record<string, never>;

/**
 * Result for `apex/profiling/status` request.
 */
export interface ProfilingStatusResult {
  readonly isProfiling: boolean;
  readonly type: 'idle' | 'cpu' | 'heap' | 'both';
  readonly available: boolean;
}

/**
 * Parameters for `apex/workspaceLoadFailed` notification (client→server).
 * Same shape as WorkspaceLoadCompleteParams — aliased for semantic clarity.
 */
export type WorkspaceLoadFailedParams = WorkspaceLoadCompleteParams;

/**
 * Parameters for `apex/queueStateChanged` notification (server→client).
 */
export interface QueueStateChangedParams {
  readonly metrics: Record<string, unknown>;
  readonly metadata: { readonly timestamp: number };
}

/**
 * Parameters for `apex/workspaceIngestionComplete` notification (server→client).
 * Empty object — no payload.
 */
export type WorkspaceIngestionCompleteParams = Record<string, never>;

// QueueState/GraphData protocol types — shared contract for apex/queueState
// and apex/graphData custom LSP requests. Structurally model the canonical
// apex-parser-ast runtime shapes without importing them (shared stays
// parser-ast-free). Type-only.
export type {
  WorkerTopologyShape,
  SchedulerMetricsShape,
  RangeShape,
  SymbolLocationShape,
  SymbolModifiersShape,
  GraphNodeAnnotationShape,
  GraphNodeShape,
  GraphEdgeShape,
  GraphDataShape,
  FileGraphDataShape,
  TypeGraphDataShape,
  DiagnosticGraphCorrelationShape,
  QueueStateParams,
  QueueStateResult,
  GraphDataParams,
  GraphDataResult,
} from './queueStateGraphData';
