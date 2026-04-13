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
);
export type WorkerRole = Schema.Schema.Type<typeof WorkerRole>;

// ---------------------------------------------------------------------------
// WorkerInit — sent once after spawn to assign role + negotiate version
// ---------------------------------------------------------------------------

export class WorkerInit extends Schema.TaggedRequest<WorkerInit>()(
  'WorkerInit',
  {
    success: Schema.Struct({ ready: Schema.Boolean }),
    failure: Schema.Never,
    payload: {
      role: WorkerRole,
      protocolVersion: Schema.Number,
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
// QuerySymbolSubset — enrichment worker asks data-owner for symbol tables
// ---------------------------------------------------------------------------

export class QuerySymbolSubset extends Schema.TaggedRequest<QuerySymbolSubset>()(
  'QuerySymbolSubset',
  {
    success: Schema.Struct({
      /** JSON-encoded symbol table entries keyed by URI */
      entries: Schema.Record({ key: Schema.String, value: Schema.Unknown }),
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
// LSP request dispatch — coordinator sends queued work to workers
// ---------------------------------------------------------------------------

/**
 * LSP request type discriminant — mirrors LSPRequestType from
 * lsp-compliant-services but defined here for wire-level independence.
 */
export const WireLspRequestType = Schema.Literal(
  'hover',
  'completion',
  'definition',
  'references',
  'documentSymbol',
  'workspaceSymbol',
  'diagnostics',
  'codeAction',
  'signatureHelp',
  'rename',
  'documentOpen',
  'documentSave',
  'documentChange',
  'documentClose',
  'documentLoad',
  'findMissingArtifact',
  'executeCommand',
  'prerequisiteEnrichment',
  'codeLens',
  'foldingRange',
  'implementation',
  'resolve',
);
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
const WirePosition = Schema.Struct({
  line: Schema.Number,
  character: Schema.Number,
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
      contentChanges: Schema.Array(Schema.Unknown),
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
// Role-partitioned tag unions
// ---------------------------------------------------------------------------

/** Tags accepted by a data-owner worker */
export const DataOwnerTags = [
  'WorkerInit',
  'PingWorker',
  'QuerySymbolSubset',
  'WorkspaceBatchIngest',
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
  'DispatchHover',
  'DispatchDefinition',
  'DispatchReferences',
  'DispatchImplementation',
  'DispatchDocumentSymbol',
  'DispatchCodeLens',
  'DispatchDiagnostic',
  'DispatchGenericLspRequest',
] as const;
export type EnrichmentSearchTag = (typeof EnrichmentSearchTags)[number];

/** Tags accepted by a resource-loader worker */
export const ResourceLoaderTags = [
  'WorkerInit',
  'PingWorker',
  'ResourceLoaderGetSymbolTable',
] as const;
export type ResourceLoaderTag = (typeof ResourceLoaderTags)[number];

/** All known worker request tags */
export const AllWorkerTags = [
  ...new Set([
    ...DataOwnerTags,
    ...EnrichmentSearchTags,
    ...ResourceLoaderTags,
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
  | QuerySymbolSubset
  | WorkspaceBatchIngest
  | DispatchDocumentOpen
  | DispatchDocumentChange
  | DispatchDocumentSave
  | DispatchDocumentClose;

/** Request types the coordinator may send to an enrichment/search pool worker */
export type EnrichmentSearchRequest =
  | WorkerInit
  | PingWorker
  | DispatchHover
  | DispatchDefinition
  | DispatchReferences
  | DispatchImplementation
  | DispatchDocumentSymbol
  | DispatchCodeLens
  | DispatchDiagnostic
  | DispatchGenericLspRequest;

/** Request types the coordinator may send to a resource-loader worker */
export type ResourceLoaderRequest =
  | WorkerInit
  | PingWorker
  | ResourceLoaderGetSymbolTable;

/** Current wire protocol version — bump on breaking schema changes */
export const WIRE_PROTOCOL_VERSION = 1;

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
  }
}
