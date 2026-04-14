/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Coordinator that spawns and manages internal worker threads.
 *
 * Step 3 — vertical slice: spawn one worker, ping, shut down.
 * Step 4 — pool topology: data-owner x1, enrichment pool xM,
 *          optional resource-loader x0-1.
 */

import * as Worker from '@effect/platform/Worker';
import { WorkerError } from '@effect/platform/WorkerError';
import * as NodeWorker from '@effect/platform-node/NodeWorker';
import * as WorkerThreads from 'node:worker_threads';
import * as os from 'node:os';
import { Effect, Scope } from 'effect';
import {
  WorkerInit,
  PingWorker,
  WIRE_PROTOCOL_VERSION,
  WorkspaceBatchIngest,
  DispatchHover,
  DispatchDefinition,
  DispatchReferences,
  DispatchImplementation,
  DispatchDocumentSymbol,
  DispatchCodeLens,
  DispatchDiagnostic,
  DispatchDocumentOpen,
  DispatchDocumentChange,
  DispatchDocumentSave,
  DispatchDocumentClose,
  DispatchGenericLspRequest,
  type LSPRequestType,
  type LoggerInterface,
  type DataOwnerRequest,
  type EnrichmentSearchRequest,
  type ResourceLoaderRequest,
} from '@salesforce/apex-lsp-shared';
import type {
  WorkerDispatchStrategy,
  WorkerTopologyStatus,
  WorkerTopologyTransport,
  WorkerHandle,
  PoolHandle,
} from '@salesforce/apex-lsp-compliant-services';

// ---------------------------------------------------------------------------
// Worker Layer factory
// ---------------------------------------------------------------------------

const rawWorkers: WorkerThreads.Worker[] = [];

export const makeNodeWorkerLayer = (
  workerScript: string,
  workerOptions?: WorkerThreads.WorkerOptions,
) =>
  NodeWorker.layer((_id: number) => {
    const w = new WorkerThreads.Worker(workerScript, {
      // Prevent worker stdout/stderr from leaking into the LSP stdio
      // transport, which corrupts the Content-Length framed protocol.
      stdout: true,
      stderr: true,
      ...workerOptions,
    });
    rawWorkers.push(w);
    return w;
  });

/**
 * Returns raw Worker handles captured during topology initialization.
 * Used by CoordinatorAssistanceMediator to attach message listeners
 * for worker→coordinator assistance requests (Step 7).
 */
export function getRawWorkers(): WorkerThreads.Worker[] {
  return [...rawWorkers];
}

export function clearRawWorkers(): void {
  rawWorkers.length = 0;
}

// ---------------------------------------------------------------------------
// Browser Worker Layer factory (Step 10)
// ---------------------------------------------------------------------------

/**
 * Create a browser worker layer using native Web Worker API.
 * Uses dynamic import of @effect/platform-browser to avoid loading it
 * in Node.js environments.
 */
export async function makeBrowserWorkerLayer(
  workerScriptUrl: string,
): Promise<unknown> {
  const BrowserWorker = await import('@effect/platform-browser/BrowserWorker');

  const W = (globalThis as any).Worker as new (url: string | URL) => unknown;
  return BrowserWorker.layer((_id: number) => new W(workerScriptUrl) as never);
}

// Safe in CJS bundles: __dirname resolves at runtime to the dist/ directory
// where both server.node.js and worker.platform.js are co-located.
const DEFAULT_WORKER_SCRIPT = __dirname + '/worker.platform.js';

// ---------------------------------------------------------------------------
// Pool topology (Step 4)
// ---------------------------------------------------------------------------

export interface WorkerTopology {
  readonly dataOwner: Worker.SerializedWorker<DataOwnerRequest>;
  readonly enrichmentPool: Worker.SerializedWorkerPool<EnrichmentSearchRequest>;
  readonly resourceLoader: Worker.SerializedWorker<ResourceLoaderRequest> | null;
}

export interface TopologyConfig {
  readonly poolSize: number;
  readonly enableResourceLoader: boolean;
  readonly logger: LoggerInterface;
  readonly logLevel?: string;
}

const makeInitMessage = (
  role: 'dataOwner' | 'enrichmentSearch' | 'resourceLoader',
  logLevel?: string,
) =>
  new WorkerInit({
    role,
    protocolVersion: WIRE_PROTOCOL_VERSION,
    logLevel,
  });

export function clampPoolSize(requested: number): number {
  const cpus = os.cpus().length;
  const max = Math.max(1, cpus - 2);
  return Math.max(1, Math.min(requested, max));
}

/**
 * Spawn the full worker topology and return handles.
 *
 * The caller owns the `Scope` — workers stay alive until it closes.
 * Provide `WorkerManager | Spawner` via `makeNodeWorkerLayer(workerScript)`.
 */
export const initializeTopology = (
  config: TopologyConfig,
): Effect.Effect<
  WorkerTopology,
  WorkerError,
  Worker.WorkerManager | Worker.Spawner | Scope.Scope
> =>
  Effect.gen(function* () {
    const { logger, logLevel } = config;
    const poolSize = clampPoolSize(config.poolSize);

    const dataOwner = yield* Worker.makeSerialized<DataOwnerRequest>({
      initialMessage: () => makeInitMessage('dataOwner', logLevel),
    });
    logger.info(() => '[WorkerCoordinator] Data owner initialized');

    const enrichmentPool =
      yield* Worker.makePoolSerialized<EnrichmentSearchRequest>({
        size: poolSize,
        initialMessage: () => makeInitMessage('enrichmentSearch', logLevel),
      });
    logger.info(
      () =>
        `[WorkerCoordinator] Enrichment pool initialized (size=${poolSize})`,
    );

    let resourceLoader: Worker.SerializedWorker<ResourceLoaderRequest> | null =
      null;
    if (config.enableResourceLoader) {
      resourceLoader = yield* Worker.makeSerialized<ResourceLoaderRequest>({
        initialMessage: () => makeInitMessage('resourceLoader', logLevel),
      });
      logger.info(() => '[WorkerCoordinator] Resource loader initialized');
    }

    return { dataOwner, enrichmentPool, resourceLoader } as WorkerTopology;
  });

// ---------------------------------------------------------------------------
// Vertical slice (Step 3 — kept for backward compat + simple testing)
// ---------------------------------------------------------------------------

type VerticalSliceRequests = WorkerInit | PingWorker;

/**
 * Spawn one worker, init it, ping it, log results, shut down.
 */
export function runVerticalSlice(
  logger: LoggerInterface,
  workerScript = DEFAULT_WORKER_SCRIPT,
  workerOptions?: WorkerThreads.WorkerOptions,
): Promise<void> {
  const program = Effect.gen(function* () {
    const worker = yield* Worker.makeSerialized<VerticalSliceRequests>({});

    const initResult = yield* worker.executeEffect(
      new WorkerInit({
        role: 'enrichmentSearch',
        protocolVersion: WIRE_PROTOCOL_VERSION,
      }),
    );
    logger.info(
      () => `[WorkerCoordinator] Worker init: ready=${initResult.ready}`,
    );

    const pingResult = yield* worker.executeEffect(
      new PingWorker({ echo: 'vertical-slice-ping' }),
    );
    logger.info(
      () => `[WorkerCoordinator] Ping round-trip OK: echo="${pingResult.echo}"`,
    );
  }).pipe(
    Effect.scoped,
    Effect.provide(makeNodeWorkerLayer(workerScript, workerOptions)),
  );

  return Effect.runPromise(program);
}

// ---------------------------------------------------------------------------
// Transport-isolated topology (Step 12)
// ---------------------------------------------------------------------------

/**
 * Transport-agnostic topology — holds opaque handles instead of
 * @effect/platform Worker refs. Consumers interact via the transport.
 */
export interface TransportTopology {
  readonly transport: WorkerTopologyTransport;
  readonly dataOwner: WorkerHandle;
  readonly enrichmentPool: PoolHandle;
  readonly resourceLoader: WorkerHandle | null;
}

/**
 * Initialize a topology via the transport-agnostic interface.
 * Replaces direct @effect/platform Worker calls with transport.spawn/makePool.
 */
export const initializeTransportTopology = (
  config: TopologyConfig,
  transport: WorkerTopologyTransport,
): Effect.Effect<TransportTopology, unknown> =>
  Effect.gen(function* () {
    const { logger } = config;
    const poolSize = clampPoolSize(config.poolSize);

    const dataOwner = yield* transport.spawn('dataOwner');
    logger.info(() => '[WorkerCoordinator] Data owner initialized (transport)');

    const enrichmentPool = yield* transport.makePool(
      'enrichmentSearch',
      poolSize,
    );
    logger.info(
      () =>
        `[WorkerCoordinator] Enrichment pool initialized (transport, size=${poolSize})`,
    );

    let resourceLoader: WorkerHandle | null = null;
    if (config.enableResourceLoader) {
      resourceLoader = yield* transport.spawn('resourceLoader');
      logger.info(
        () => '[WorkerCoordinator] Resource loader initialized (transport)',
      );
    }

    return { transport, dataOwner, enrichmentPool, resourceLoader };
  });

// ---------------------------------------------------------------------------
// Dispatcher factory — bridges LSPQueueManager → worker pool
// ---------------------------------------------------------------------------

/**
 * Dispatch routing — single source of truth for where each LSP request
 * type is executed. Adding a new type here is the only change needed;
 * DATA_OWNER_TYPES and COORDINATOR_ONLY_TYPES are derived automatically.
 *
 * - dataOwner:       routed to the data-owner worker
 * - enrichmentPool:  routed to an enrichment pool worker (TODO: enable when data sharing is ready)
 * - coordinatorOnly: runs on the coordinator thread (local handler)
 */
type DispatchTarget = 'dataOwner' | 'enrichmentPool' | 'coordinatorOnly';

const DISPATCH_ROUTING: Record<LSPRequestType, DispatchTarget> = {
  documentOpen: 'dataOwner',
  documentChange: 'dataOwner',
  documentSave: 'dataOwner',
  documentClose: 'dataOwner',
  documentLoad: 'coordinatorOnly',
  hover: 'coordinatorOnly',
  completion: 'coordinatorOnly',
  definition: 'coordinatorOnly',
  implementation: 'coordinatorOnly',
  references: 'coordinatorOnly',
  documentSymbol: 'coordinatorOnly',
  workspaceSymbol: 'coordinatorOnly',
  diagnostics: 'coordinatorOnly',
  codeAction: 'coordinatorOnly',
  signatureHelp: 'coordinatorOnly',
  rename: 'coordinatorOnly',
  codeLens: 'coordinatorOnly',
  foldingRange: 'coordinatorOnly',
  findMissingArtifact: 'coordinatorOnly',
  executeCommand: 'coordinatorOnly',
  prerequisiteEnrichment: 'coordinatorOnly',
  resolve: 'coordinatorOnly',
};

const DATA_OWNER_TYPES = new Set(
  (Object.keys(DISPATCH_ROUTING) as LSPRequestType[]).filter(
    (t) => DISPATCH_ROUTING[t] === 'dataOwner',
  ),
);

const COORDINATOR_ONLY_TYPES = new Set(
  (Object.keys(DISPATCH_ROUTING) as LSPRequestType[]).filter(
    (t) => DISPATCH_ROUTING[t] === 'coordinatorOnly',
  ),
);

/** Batch ingestion entry shape. */
export interface BatchIngestEntry {
  uri: string;
  content: string;
  languageId: string;
  version: number;
}

/** Callbacks that parameterize the dispatcher for different transport backends. */
interface DispatcherCallbacks {
  readonly sendToDataOwner: (msg: DataOwnerRequest) => Promise<unknown>;
  readonly dispatchToPool: (msg: EnrichmentSearchRequest) => Promise<unknown>;
  readonly sendBatch: (
    msg: WorkspaceBatchIngest,
  ) => Promise<{ processedCount: number }>;
  readonly poolSize: number;
  readonly hasResourceLoader: boolean;
}

/**
 * Core factory — creates a WorkerDispatchStrategy from transport callbacks.
 * Both direct-Worker and transport-isolated dispatchers use this.
 */
function createDispatcher(
  callbacks: DispatcherCallbacks,
  logger: LoggerInterface,
): WorkerDispatchStrategy & {
  setAvailable(v: boolean): void;
  createBatchIngestionDispatcher(): (
    sessionId: string,
    entries: BatchIngestEntry[],
  ) => Promise<{ processedCount: number }>;
} {
  let available = true;
  let dispatchedCount = 0;

  return {
    isAvailable: () => available,
    setAvailable: (v: boolean) => {
      available = v;
    },
    canDispatch: (type: LSPRequestType) => !COORDINATOR_ONLY_TYPES.has(type),

    async dispatch(type: LSPRequestType, params: unknown): Promise<unknown> {
      dispatchedCount++;
      if (DATA_OWNER_TYPES.has(type)) {
        const msg = buildDataOwnerMessage(type, params);
        logger.debug(() => `[WorkerDispatch] → dataOwner: ${type}`);
        return callbacks.sendToDataOwner(msg);
      }
      const msg = buildEnrichmentMessage(type, params);
      logger.debug(() => `[WorkerDispatch] → enrichmentPool: ${type}`);
      const response = await callbacks.dispatchToPool(msg);
      return (response as { result: unknown }).result;
    },

    getTopologyStatus: (): WorkerTopologyStatus => ({
      enabled: true,
      dataOwner: { active: available },
      enrichmentPool: { size: callbacks.poolSize, active: available },
      resourceLoader: callbacks.hasResourceLoader
        ? { active: available }
        : null,
      dispatchedCount,
      coordinatorOnlyTypes: [...COORDINATOR_ONLY_TYPES],
    }),

    createBatchIngestionDispatcher() {
      return async (sessionId: string, entries: BatchIngestEntry[]) => {
        logger.debug(
          () =>
            '[WorkerDispatch] → dataOwner: WorkspaceBatchIngest ' +
            `(session=${sessionId}, entries=${entries.length})`,
        );
        return callbacks.sendBatch(
          new WorkspaceBatchIngest({ sessionId, entries }),
        );
      };
    },
  };
}

/**
 * Create a dispatcher backed by @effect/platform Worker handles.
 */
export function makeWorkerDispatcher(
  topology: WorkerTopology,
  logger: LoggerInterface,
) {
  return createDispatcher(
    {
      sendToDataOwner: (msg) => {
        const eff = topology.dataOwner.executeEffect(msg) as Effect.Effect<
          unknown,
          unknown,
          never
        >;
        return Effect.runPromise(eff);
      },
      dispatchToPool: (msg) => {
        const eff = topology.enrichmentPool.executeEffect(msg) as Effect.Effect<
          unknown,
          unknown,
          never
        >;
        return Effect.runPromise(eff);
      },
      sendBatch: (msg) =>
        Effect.runPromise(topology.dataOwner.executeEffect(msg)),
      poolSize: 0,
      hasResourceLoader: topology.resourceLoader !== null,
    },
    logger,
  );
}

/**
 * Create a dispatcher backed by the transport-isolated interface.
 */
export function makeTransportDispatcher(
  topology: TransportTopology,
  logger: LoggerInterface,
) {
  return createDispatcher(
    {
      sendToDataOwner: (msg) =>
        Effect.runPromise(topology.transport.send(topology.dataOwner, msg)),
      dispatchToPool: (msg) =>
        Effect.runPromise(
          topology.transport.dispatch(topology.enrichmentPool, msg),
        ),
      sendBatch: (msg) =>
        Effect.runPromise(
          topology.transport.send(topology.dataOwner, msg),
        ) as Promise<{ processedCount: number }>,
      poolSize: topology.enrichmentPool.size,
      hasResourceLoader: topology.resourceLoader !== null,
    },
    logger,
  );
}

// ---------------------------------------------------------------------------
// Typed dispatch param interfaces
// ---------------------------------------------------------------------------

/** Params shape for document mutation dispatches (open/change/save/close). */
interface DocumentEventParams {
  readonly document?: {
    readonly uri: string;
    readonly languageId?: string;
    readonly version?: number;
    readonly getText?: () => string;
  };
  readonly textDocument?: { readonly uri: string };
  readonly text?: string;
  readonly contentChanges?: ReadonlyArray<{
    readonly range?: {
      readonly start: { readonly line: number; readonly character: number };
      readonly end: { readonly line: number; readonly character: number };
    };
    readonly rangeLength?: number;
    readonly text: string;
  }>;
}

/** Params shape for position-based enrichment dispatches. */
interface PositionBasedParams {
  readonly textDocument: { readonly uri: string };
  readonly position: { readonly line: number; readonly character: number };
  readonly context?: { readonly includeDeclaration: boolean };
}

/** Params shape for document-only enrichment dispatches (symbols, lenses). */
interface DocumentOnlyParams {
  readonly textDocument: { readonly uri: string };
}

type EnrichmentParams = PositionBasedParams | DocumentOnlyParams;

// ---------------------------------------------------------------------------
// Shared message builders (used by both dispatcher variants)
// ---------------------------------------------------------------------------

function buildDataOwnerMessage(
  type: LSPRequestType,
  params: unknown,
): DataOwnerRequest {
  const p = params as DocumentEventParams;
  switch (type) {
    case 'documentOpen':
      return new DispatchDocumentOpen({
        uri: p.document?.uri ?? p.textDocument?.uri ?? '',
        languageId: p.document?.languageId ?? 'apex',
        version: p.document?.version ?? 0,
        content: p.document?.getText?.() ?? p.text ?? '',
      });
    case 'documentChange':
      return new DispatchDocumentChange({
        uri: p.document?.uri ?? p.textDocument?.uri ?? '',
        version: p.document?.version ?? 0,
        contentChanges: (p.contentChanges ?? []).map((c) => ({
          text: c.text,
          ...(c.range ? { range: c.range } : {}),
          ...(c.rangeLength !== undefined
            ? { rangeLength: c.rangeLength }
            : {}),
        })),
      });
    case 'documentSave':
      return new DispatchDocumentSave({
        uri: p.document?.uri ?? p.textDocument?.uri ?? '',
        version: p.document?.version ?? 0,
      });
    case 'documentClose':
      return new DispatchDocumentClose({
        uri: p.document?.uri ?? p.textDocument?.uri ?? '',
      });
    default:
      throw new Error(`No data-owner mapping for request type: ${type}`);
  }
}

function buildEnrichmentMessage(
  type: LSPRequestType,
  params: unknown,
): EnrichmentSearchRequest {
  const p = params as EnrichmentParams;
  switch (type) {
    case 'hover':
      return new DispatchHover({
        textDocument: { uri: p.textDocument.uri },
        position: (p as PositionBasedParams).position,
      });
    case 'definition':
      return new DispatchDefinition({
        textDocument: { uri: p.textDocument.uri },
        position: (p as PositionBasedParams).position,
      });
    case 'references': {
      const r = p as PositionBasedParams;
      return new DispatchReferences({
        textDocument: { uri: r.textDocument.uri },
        position: r.position,
        context: {
          includeDeclaration: r.context?.includeDeclaration ?? false,
        },
      });
    }
    case 'implementation':
      return new DispatchImplementation({
        textDocument: { uri: p.textDocument.uri },
        position: (p as PositionBasedParams).position,
      });
    case 'documentSymbol':
      return new DispatchDocumentSymbol({
        textDocument: { uri: p.textDocument.uri },
      });
    case 'codeLens':
      return new DispatchCodeLens({
        textDocument: { uri: p.textDocument.uri },
      });
    case 'diagnostics':
      return new DispatchDiagnostic({
        textDocument: { uri: p.textDocument.uri },
      });
    default:
      return new DispatchGenericLspRequest({
        requestType: type,
        params: p,
      });
  }
}
