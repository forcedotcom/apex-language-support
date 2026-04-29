/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Effect.Schema definitions for the internal worker wire contract (Option B).
 *
 * These schemas define the exact plain-data shapes that cross the
 * postMessage / worker_threads boundary between the LSP coordinator
 * and internal workers (data-owner, enrichment pool, resource-loader).
 *
 * All types use Schema.TaggedRequest with a `_tag` discriminant so
 * workers can decode, route, and reject messages at the schema level.
 *
 * Evolution strategy: add new tags or additive fields; bump
 * `protocolVersion` in WorkerInit for breaking changes; never retcon
 * existing tags.
 */

import { Schema } from 'effect';

// ---------------------------------------------------------------------------
// Worker roles
// ---------------------------------------------------------------------------

export const WorkerRole = Schema.Literal(
  'dataOwner',
  'enrichmentSearch',
  'resourceLoader',
  'compilation',
);
export type WorkerRole = Schema.Schema.Type<typeof WorkerRole>;

// ---------------------------------------------------------------------------
// WorkerInit — sent once after spawn to assign role + negotiate version
// ---------------------------------------------------------------------------

/** Matches `apex.environment.serverMode` — forwarded so workers mirror coordinator mode (e.g. dev hover metrics). */
export const WorkerServerMode = Schema.Literal('production', 'development');
export type WorkerServerMode = Schema.Schema.Type<typeof WorkerServerMode>;

export class WorkerInit extends Schema.TaggedRequest<WorkerInit>()(
  'WorkerInit',
  {
    success: Schema.Struct({ ready: Schema.Boolean }),
    failure: Schema.Never,
    payload: {
      role: WorkerRole,
      protocolVersion: Schema.Number,
      logLevel: Schema.optional(Schema.String),
      serverMode: Schema.optional(WorkerServerMode),
    },
  },
) {}

export type WorkerInitSuccess = Schema.Schema.Type<
  (typeof WorkerInit)['success']
>;

// ---------------------------------------------------------------------------
// PingWorker — proves round-trip encoding/decoding (vertical slice)
// ---------------------------------------------------------------------------

export class PingWorker extends Schema.TaggedRequest<PingWorker>()(
  'PingWorker',
  {
    success: Schema.Struct({ echo: Schema.String }),
    failure: Schema.Never,
    payload: {
      echo: Schema.String,
    },
  },
) {}

export type PingWorkerSuccess = Schema.Schema.Type<
  (typeof PingWorker)['success']
>;

// ---------------------------------------------------------------------------
// WorkerRemoteStdlibWarmup — coordinator asks DO/enrichment workers to
// await-fill remote stdlib namespace cache after assistance mediation is live
// ---------------------------------------------------------------------------

export class WorkerRemoteStdlibWarmup extends Schema.TaggedRequest<WorkerRemoteStdlibWarmup>()(
  'WorkerRemoteStdlibWarmup',
  {
    success: Schema.Struct({ ok: Schema.Literal(true) }),
    failure: Schema.Struct({
      _tag: Schema.Literal('WorkerRemoteStdlibWarmupError'),
      message: Schema.String,
    }),
    payload: {},
  },
) {}

// ---------------------------------------------------------------------------
// Wire protocol version
// ---------------------------------------------------------------------------

/** Current wire protocol version — bump on breaking schema changes */
export const WIRE_PROTOCOL_VERSION = 1;

// ---------------------------------------------------------------------------
// Side-channel messages (plain objects via postMessage, not Schema requests)
// ---------------------------------------------------------------------------

/** Fire-and-forget log message from worker to coordinator. */
export interface WorkerLogMessage {
  readonly _tag: 'WorkerLogMessage';
  readonly level: 'debug' | 'info' | 'warning' | 'error';
  readonly message: string;
}

/** Coordinator-to-worker notification to update the worker's log level. */
export interface WorkerLogLevelChange {
  readonly _tag: 'WorkerLogLevelChange';
  readonly logLevel: 'debug' | 'info' | 'warning' | 'error';
}

export type WorkerLogLevel = WorkerLogMessage['level'];

// ---------------------------------------------------------------------------
// QuerySymbolSubset — enrichment worker asks data-owner for symbol tables
// ---------------------------------------------------------------------------

export class QuerySymbolSubset extends Schema.TaggedRequest<QuerySymbolSubset>()(
  'QuerySymbolSubset',
  {
    success: Schema.Struct({
      /** JSON-encoded symbol table entries keyed by URI */
      entries: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
      /** Document version for each URI (for write-back validation) */
      versions: Schema.Record({ key: Schema.String, value: Schema.Number }),
      /** Current detail level for each URI */
      detailLevels: Schema.Record({
        key: Schema.String,
        value: Schema.Literal('public-api', 'protected', 'private', 'full'),
      }),
    }),
    failure: Schema.Struct({
      _tag: Schema.Literal('QuerySymbolSubsetError'),
      message: Schema.String,
    }),
    payload: {
      uris: Schema.Array(Schema.String),
    },
  },
) {}

export type QuerySymbolSubsetSuccess = Schema.Schema.Type<
  (typeof QuerySymbolSubset)['success']
>;

// ---------------------------------------------------------------------------
// UpdateSymbolSubset — enrichment worker writes back enriched symbols
// ---------------------------------------------------------------------------

export class UpdateSymbolSubset extends Schema.TaggedRequest<UpdateSymbolSubset>()(
  'UpdateSymbolSubset',
  {
    success: Schema.Struct({
      accepted: Schema.Boolean,
      merged: Schema.Number, // Count of symbols merged
      versionMismatch: Schema.Boolean, // Rejected due to stale version
    }),
    failure: Schema.Struct({
      _tag: Schema.Literal('UpdateSymbolSubsetError'),
      message: Schema.String,
    }),
    payload: {
      uri: Schema.String,
      documentVersion: Schema.Number, // Version this enrichment is based on
      enrichedSymbolTable: Schema.Unknown, // Serialized SymbolTable
      enrichedDetailLevel: Schema.Literal(
        'public-api',
        'protected',
        'private',
        'full',
      ),
      sourceWorkerId: Schema.String, // For debugging/metrics
    },
  },
) {}

export type UpdateSymbolSubsetSuccess = Schema.Schema.Type<
  (typeof UpdateSymbolSubset)['success']
>;

// ---------------------------------------------------------------------------
// ResolveDepUris — enrichment worker asks data-owner to resolve class names
// to file URIs and return the corresponding symbol tables in one round trip
// ---------------------------------------------------------------------------

export class ResolveDepUris extends Schema.TaggedRequest<ResolveDepUris>()(
  'ResolveDepUris',
  {
    success: Schema.Struct({
      entries: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
    }),
    failure: Schema.Struct({
      _tag: Schema.Literal('ResolveDepUrisError'),
      message: Schema.String,
    }),
    payload: {
      classNames: Schema.Array(Schema.String),
    },
  },
) {}

// ---------------------------------------------------------------------------
// WorkspaceBatchIngest — coordinator forwards decoded batch to data-owner
// ---------------------------------------------------------------------------

export class WorkspaceBatchIngest extends Schema.TaggedRequest<WorkspaceBatchIngest>()(
  'WorkspaceBatchIngest',
  {
    success: Schema.Struct({
      processedCount: Schema.Number,
    }),
    failure: Schema.Struct({
      _tag: Schema.Literal('WorkspaceBatchIngestError'),
      message: Schema.String,
    }),
    payload: {
      sessionId: Schema.String,
      /** Base64-encoded batch data (ZIP contents already decompressed on coordinator) */
      entries: Schema.Array(
        Schema.Struct({
          uri: Schema.String,
          content: Schema.String,
          languageId: Schema.String,
          version: Schema.Number,
        }),
      ),
    },
  },
) {}

export type WorkspaceBatchIngestSuccess = Schema.Schema.Type<
  (typeof WorkspaceBatchIngest)['success']
>;

// ---------------------------------------------------------------------------
// QueryGraphData — coordinator asks data-owner to compute graph data
// using the data-owner's own symbol manager (which holds all workspace symbols
// after compilation and enrichment write-backs).
// ---------------------------------------------------------------------------

export class QueryGraphData extends Schema.TaggedRequest<QueryGraphData>()(
  'QueryGraphData',
  {
    success: Schema.Unknown,
    failure: Schema.Struct({
      _tag: Schema.Literal('QueryGraphDataError'),
      message: Schema.String,
    }),
    payload: {
      type: Schema.Literal('all', 'file', 'type'),
      fileUri: Schema.optional(Schema.String),
      symbolType: Schema.optional(Schema.String),
      includeMetadata: Schema.optional(Schema.Boolean),
      includeDiagnostics: Schema.optional(Schema.Boolean),
    },
  },
) {}

// ---------------------------------------------------------------------------
// CompileDocument — coordinator sends a single file to compilation worker
// ---------------------------------------------------------------------------

export class CompileDocument extends Schema.TaggedRequest<CompileDocument>()(
  'CompileDocument',
  {
    success: Schema.Struct({
      compiledCount: Schema.Number,
      elapsedMs: Schema.Number,
    }),
    failure: Schema.Struct({
      _tag: Schema.Literal('CompileDocumentError'),
      message: Schema.String,
    }),
    payload: {
      uri: Schema.String,
      content: Schema.String,
      languageId: Schema.String,
      version: Schema.Number,
      priority: Schema.Literal('high', 'low'),
    },
  },
) {}

// ---------------------------------------------------------------------------
// WorkspaceBatchCompile — coordinator sends a batch of files to compilation
// worker for public-api compilation after workspace load ingest completes
// ---------------------------------------------------------------------------

export class WorkspaceBatchCompile extends Schema.TaggedRequest<WorkspaceBatchCompile>()(
  'WorkspaceBatchCompile',
  {
    success: Schema.Struct({
      compiledCount: Schema.Number,
      errorCount: Schema.Number,
      elapsedMs: Schema.Number,
    }),
    failure: Schema.Struct({
      _tag: Schema.Literal('WorkspaceBatchCompileError'),
      message: Schema.String,
    }),
    payload: {
      sessionId: Schema.String,
      entries: Schema.Array(
        Schema.Struct({
          uri: Schema.String,
          content: Schema.String,
          languageId: Schema.String,
          version: Schema.Number,
        }),
      ),
    },
  },
) {}

// ---------------------------------------------------------------------------
// ResourceLoaderGetSymbolTable — pool/coordinator queries resource-loader
// ---------------------------------------------------------------------------

export class ResourceLoaderGetSymbolTable extends Schema.TaggedRequest<ResourceLoaderGetSymbolTable>()(
  'ResourceLoaderGetSymbolTable',
  {
    success: Schema.Struct({
      found: Schema.Boolean,
      /** JSON-encoded symbol table, or undefined if not found */
      symbolTable: Schema.optional(Schema.Unknown),
    }),
    failure: Schema.Struct({
      _tag: Schema.Literal('ResourceLoaderError'),
      message: Schema.String,
    }),
    payload: {
      classPath: Schema.String,
    },
  },
) {}

export type ResourceLoaderGetSymbolTableSuccess = Schema.Schema.Type<
  (typeof ResourceLoaderGetSymbolTable)['success']
>;

// ---------------------------------------------------------------------------
// ResourceLoaderGetFile — source code for goto-definition
// ---------------------------------------------------------------------------

export class ResourceLoaderGetFile extends Schema.TaggedRequest<ResourceLoaderGetFile>()(
  'ResourceLoaderGetFile',
  {
    success: Schema.Struct({
      found: Schema.Boolean,
      content: Schema.optional(Schema.String),
    }),
    failure: Schema.Struct({
      _tag: Schema.Literal('ResourceLoaderError'),
      message: Schema.String,
    }),
    payload: {
      path: Schema.String,
    },
  },
) {}

// ---------------------------------------------------------------------------
// ResourceLoaderResolveClass — resolve class name to canonical FQN
// ---------------------------------------------------------------------------

export class ResourceLoaderResolveClass extends Schema.TaggedRequest<ResourceLoaderResolveClass>()(
  'ResourceLoaderResolveClass',
  {
    success: Schema.Struct({
      found: Schema.Boolean,
      fqn: Schema.optional(Schema.String),
    }),
    failure: Schema.Struct({
      _tag: Schema.Literal('ResourceLoaderError'),
      message: Schema.String,
    }),
    payload: {
      className: Schema.String,
    },
  },
) {}

// ---------------------------------------------------------------------------
// ResourceLoaderGetStandardNamespaces — fetch the full namespace→classFiles map
// ---------------------------------------------------------------------------

export class ResourceLoaderGetStandardNamespaces extends Schema.TaggedRequest<ResourceLoaderGetStandardNamespaces>()(
  'ResourceLoaderGetStandardNamespaces',
  {
    success: Schema.Struct({
      namespaces: Schema.Record({
        key: Schema.String,
        value: Schema.Array(Schema.String),
      }),
    }),
    failure: Schema.Struct({
      _tag: Schema.Literal('ResourceLoaderError'),
      message: Schema.String,
    }),
    payload: {},
  },
) {}

// ---------------------------------------------------------------------------
// Canonical LSP request type list — single source of truth
//
// Both the plain TS union (LSPRequestType) and the Effect Schema literal
// (WireLspRequestType) are derived from this array, guaranteeing they
// stay in sync.
// ---------------------------------------------------------------------------

export const LSP_REQUEST_TYPES = [
  'hover',
  'completion',
  'definition',
  'implementation',
  'references',
  'documentSymbol',
  'workspaceSymbol',
  'diagnostics',
  'codeAction',
  'signatureHelp',
  'rename',
  'codeLens',
  'foldingRange',
  'documentOpen',
  'documentSave',
  'documentChange',
  'documentClose',
  'documentLoad',
  'findMissingArtifact',
  'executeCommand',
  'prerequisiteEnrichment',
  'resolve',
  'crossFileEnrichment',
] as const;

export type LSPRequestType = (typeof LSP_REQUEST_TYPES)[number];

// ---------------------------------------------------------------------------
// LSP request dispatch — coordinator sends queued work to workers
// ---------------------------------------------------------------------------

export const WireLspRequestType = Schema.Literal(...LSP_REQUEST_TYPES);
export type WireLspRequestType = Schema.Schema.Type<typeof WireLspRequestType>;

const DispatchError = Schema.Struct({
  _tag: Schema.Literal('DispatchError'),
  message: Schema.String,
  requestType: Schema.String,
});

/**
 * Position within a text document (mirrors LSP Position).
 * Shared sub-schema for position-based requests.
 */
export const WirePosition = Schema.Struct({
  line: Schema.Number,
  character: Schema.Number,
});

/** LSP Range — start/end positions. */
export const WireRange = Schema.Struct({
  start: WirePosition,
  end: WirePosition,
});

/**
 * Mirrors LSP TextDocumentContentChangeEvent.
 * Incremental: range + text; full: text only.
 */
export const WireContentChangeEvent = Schema.Struct({
  range: Schema.optional(WireRange),
  rangeLength: Schema.optional(Schema.Number),
  text: Schema.String,
});

/**
 * Text document identifier (mirrors LSP TextDocumentIdentifier).
 */
const WireTextDocumentId = Schema.Struct({ uri: Schema.String });

// -- Data-owner dispatch (document mutations) --------------------------------

export class DispatchDocumentOpen extends Schema.TaggedRequest<DispatchDocumentOpen>()(
  'DispatchDocumentOpen',
  {
    success: Schema.Struct({ accepted: Schema.Boolean }),
    failure: DispatchError,
    payload: {
      uri: Schema.String,
      languageId: Schema.String,
      version: Schema.Number,
      content: Schema.String,
    },
  },
) {}

export class DispatchDocumentChange extends Schema.TaggedRequest<DispatchDocumentChange>()(
  'DispatchDocumentChange',
  {
    success: Schema.Struct({ accepted: Schema.Boolean }),
    failure: DispatchError,
    payload: {
      uri: Schema.String,
      version: Schema.Number,
      contentChanges: Schema.Array(WireContentChangeEvent),
    },
  },
) {}

export class DispatchDocumentSave extends Schema.TaggedRequest<DispatchDocumentSave>()(
  'DispatchDocumentSave',
  {
    success: Schema.Struct({ accepted: Schema.Boolean }),
    failure: DispatchError,
    payload: {
      uri: Schema.String,
      version: Schema.Number,
    },
  },
) {}

export class DispatchDocumentClose extends Schema.TaggedRequest<DispatchDocumentClose>()(
  'DispatchDocumentClose',
  {
    success: Schema.Struct({ accepted: Schema.Boolean }),
    failure: DispatchError,
    payload: { uri: Schema.String },
  },
) {}

// -- Enrichment/search dispatch (position-based queries) ---------------------

export class DispatchHover extends Schema.TaggedRequest<DispatchHover>()(
  'DispatchHover',
  {
    success: Schema.Struct({ result: Schema.Unknown }),
    failure: DispatchError,
    payload: {
      textDocument: WireTextDocumentId,
      position: WirePosition,
      content: Schema.optional(Schema.String),
    },
  },
) {}

export class DispatchDefinition extends Schema.TaggedRequest<DispatchDefinition>()(
  'DispatchDefinition',
  {
    success: Schema.Struct({ result: Schema.Unknown }),
    failure: DispatchError,
    payload: {
      textDocument: WireTextDocumentId,
      position: WirePosition,
    },
  },
) {}

export class DispatchReferences extends Schema.TaggedRequest<DispatchReferences>()(
  'DispatchReferences',
  {
    success: Schema.Struct({ result: Schema.Unknown }),
    failure: DispatchError,
    payload: {
      textDocument: WireTextDocumentId,
      position: WirePosition,
      context: Schema.Struct({
        includeDeclaration: Schema.Boolean,
      }),
    },
  },
) {}

export class DispatchImplementation extends Schema.TaggedRequest<DispatchImplementation>()(
  'DispatchImplementation',
  {
    success: Schema.Struct({ result: Schema.Unknown }),
    failure: DispatchError,
    payload: {
      textDocument: WireTextDocumentId,
      position: WirePosition,
    },
  },
) {}

export class DispatchDocumentSymbol extends Schema.TaggedRequest<DispatchDocumentSymbol>()(
  'DispatchDocumentSymbol',
  {
    success: Schema.Struct({ result: Schema.Unknown }),
    failure: DispatchError,
    payload: { textDocument: WireTextDocumentId },
  },
) {}

export class DispatchCodeLens extends Schema.TaggedRequest<DispatchCodeLens>()(
  'DispatchCodeLens',
  {
    success: Schema.Struct({ result: Schema.Unknown }),
    failure: DispatchError,
    payload: { textDocument: WireTextDocumentId },
  },
) {}

export class DispatchDiagnostic extends Schema.TaggedRequest<DispatchDiagnostic>()(
  'DispatchDiagnostic',
  {
    success: Schema.Struct({ result: Schema.Unknown }),
    failure: DispatchError,
    payload: { textDocument: WireTextDocumentId },
  },
) {}

export class DispatchCrossFileEnrichment extends Schema.TaggedRequest<DispatchCrossFileEnrichment>()(
  'DispatchCrossFileEnrichment',
  {
    success: Schema.Struct({ result: Schema.Unknown }),
    failure: DispatchError,
    payload: { textDocument: WireTextDocumentId },
  },
) {}

/**
 * Catch-all for less common LSP requests that don't warrant a dedicated
 * schema yet. Params and result are opaque — both are already
 * JSON-serializable since they originate from LSP JSON-RPC.
 */
export class DispatchGenericLspRequest extends Schema.TaggedRequest<DispatchGenericLspRequest>()(
  'DispatchGenericLspRequest',
  {
    success: Schema.Struct({ result: Schema.Unknown }),
    failure: DispatchError,
    payload: {
      requestType: WireLspRequestType,
      params: Schema.Unknown,
    },
  },
) {}

// ---------------------------------------------------------------------------
// WorkerAssistanceRequest — worker asks coordinator for client RPC
// (e.g. apex/findMissingArtifact)
// ---------------------------------------------------------------------------

export class WorkerAssistanceRequest extends Schema.TaggedRequest<WorkerAssistanceRequest>()(
  'WorkerAssistanceRequest',
  {
    success: Schema.Struct({
      correlationId: Schema.String,
      result: Schema.Unknown,
    }),
    failure: Schema.Struct({
      _tag: Schema.Literal('WorkerAssistanceError'),
      correlationId: Schema.String,
      message: Schema.String,
    }),
    payload: {
      correlationId: Schema.String,
      method: Schema.String,
      params: Schema.Unknown,
      blocking: Schema.Boolean,
    },
  },
) {}

export type WorkerAssistanceSuccess = Schema.Schema.Type<
  (typeof WorkerAssistanceRequest)['success']
>;

/**
 * Plain-object shapes for assistance messages exchanged over the
 * worker MessagePort side-channel. These are NOT Schema-decoded —
 * they flow as raw postMessage objects alongside the @effect/platform
 * protocol.
 */
export interface AssistanceRequestPayload {
  readonly _tag: 'WorkerAssistanceRequest';
  readonly correlationId: string;
  readonly method: string;
  readonly params: unknown;
  readonly blocking: boolean;
}

export interface AssistanceResponsePayload {
  readonly _tag: 'WorkerAssistanceResponse';
  readonly correlationId: string;
  readonly result?: unknown;
  readonly error?: string;
}

export function isAssistanceRequest(
  data: unknown,
): data is AssistanceRequestPayload {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>)._tag === 'WorkerAssistanceRequest'
  );
}

export function isAssistanceResponse(
  data: unknown,
): data is AssistanceResponsePayload {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>)._tag === 'WorkerAssistanceResponse'
  );
}

// ---------------------------------------------------------------------------
// Role-partitioned tag unions
// ---------------------------------------------------------------------------

/** Tags accepted by a data-owner worker */
export const DataOwnerTags = [
  'WorkerInit',
  'PingWorker',
  'WorkerRemoteStdlibWarmup',
  'QuerySymbolSubset',
  'UpdateSymbolSubset',
  'ResolveDepUris',
  'WorkspaceBatchIngest',
  'QueryGraphData',
  'DispatchDocumentOpen',
  'DispatchDocumentChange',
  'DispatchDocumentSave',
  'DispatchDocumentClose',
] as const;
export type DataOwnerTag = (typeof DataOwnerTags)[number];

/** Tags accepted by an enrichment/search pool worker */
export const EnrichmentSearchTags = [
  'WorkerInit',
  'PingWorker',
  'WorkerRemoteStdlibWarmup',
  'DispatchHover',
  'DispatchDefinition',
  'DispatchReferences',
  'DispatchImplementation',
  'DispatchDocumentSymbol',
  'DispatchCodeLens',
  'DispatchDiagnostic',
  'DispatchCrossFileEnrichment',
  'DispatchGenericLspRequest',
] as const;
export type EnrichmentSearchTag = (typeof EnrichmentSearchTags)[number];

/** Tags accepted by a resource-loader worker */
export const ResourceLoaderTags = [
  'WorkerInit',
  'PingWorker',
  'ResourceLoaderGetSymbolTable',
  'ResourceLoaderGetFile',
  'ResourceLoaderResolveClass',
  'ResourceLoaderGetStandardNamespaces',
] as const;
export type ResourceLoaderTag = (typeof ResourceLoaderTags)[number];

/** Tags accepted by a compilation worker */
export const CompilationTags = [
  'WorkerInit',
  'PingWorker',
  'WorkerRemoteStdlibWarmup',
  'CompileDocument',
  'WorkspaceBatchCompile',
] as const;
export type CompilationTag = (typeof CompilationTags)[number];

/** All known worker request tags */
export const AllWorkerTags = [
  ...new Set([
    ...DataOwnerTags,
    ...EnrichmentSearchTags,
    ...ResourceLoaderTags,
    ...CompilationTags,
  ]),
] as const;
export type WorkerTag = (typeof AllWorkerTags)[number];

// ---------------------------------------------------------------------------
// Role-specific request union types (coordinator-side type safety)
// ---------------------------------------------------------------------------

/** Request types the coordinator may send to a data-owner worker */
export type DataOwnerRequest =
  | WorkerInit
  | PingWorker
  | WorkerRemoteStdlibWarmup
  | QuerySymbolSubset
  | UpdateSymbolSubset
  | ResolveDepUris
  | WorkspaceBatchIngest
  | QueryGraphData
  | DispatchDocumentOpen
  | DispatchDocumentChange
  | DispatchDocumentSave
  | DispatchDocumentClose;

/** Request types the coordinator may send to an enrichment/search pool worker */
export type EnrichmentSearchRequest =
  | WorkerInit
  | PingWorker
  | WorkerRemoteStdlibWarmup
  | DispatchHover
  | DispatchDefinition
  | DispatchReferences
  | DispatchImplementation
  | DispatchDocumentSymbol
  | DispatchCodeLens
  | DispatchDiagnostic
  | DispatchCrossFileEnrichment
  | DispatchGenericLspRequest;

/** Request types the coordinator may send to a resource-loader worker */
export type ResourceLoaderRequest =
  | WorkerInit
  | PingWorker
  | ResourceLoaderGetSymbolTable
  | ResourceLoaderGetFile
  | ResourceLoaderResolveClass
  | ResourceLoaderGetStandardNamespaces;

/** Request types the coordinator may send to a compilation worker */
export type CompilationRequest =
  | WorkerInit
  | PingWorker
  | WorkerRemoteStdlibWarmup
  | CompileDocument
  | WorkspaceBatchCompile;

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

export function isAllowedTag(role: WorkerRole, tag: string): boolean {
  switch (role) {
    case 'dataOwner':
      return (DataOwnerTags as readonly string[]).includes(tag);
    case 'enrichmentSearch':
      return (EnrichmentSearchTags as readonly string[]).includes(tag);
    case 'resourceLoader':
      return (ResourceLoaderTags as readonly string[]).includes(tag);
    case 'compilation':
      return (CompilationTags as readonly string[]).includes(tag);
  }
}
