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
