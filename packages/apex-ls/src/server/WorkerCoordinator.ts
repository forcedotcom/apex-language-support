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
import { Effect, Layer, Scope } from 'effect';
import {
  WorkerInit,
  PingWorker,
  WorkerRemoteStdlibWarmup,
  QuerySymbolSubset,
  UpdateSymbolSubset,
  ResolveDepUris,
  WIRE_PROTOCOL_VERSION,
  WorkspaceBatchIngest,
  CompileDocument,
  WorkspaceBatchCompile,
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
  type CompilationRequest,
  type WorkerRole,
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
const assistancePorts: WorkerThreads.MessagePort[] = [];
const workerNames: string[] = [];

export const makeNodeWorkerLayer = (
  workerScript: string,
  workerOptions?: WorkerThreads.WorkerOptions,
) =>
  NodeWorker.layer((_id: number) => {
    const { MessageChannel } = WorkerThreads;
    const assistChannel = new MessageChannel();
    const w = new WorkerThreads.Worker(workerScript, {
      // Prevent worker stdout/stderr from leaking into the LSP stdio
      // transport, which corrupts the Content-Length framed protocol.
      stdout: true,
      stderr: true,
      ...workerOptions,
      workerData: {
        ...(workerOptions?.workerData as object | undefined),
        assistPort: assistChannel.port1,
      },
      transferList: [
        assistChannel.port1,
        ...(workerOptions?.transferList ?? []),
      ],
    });
    rawWorkers.push(w);
    assistancePorts.push(assistChannel.port2);
    workerNames.push(workerOptions?.name ?? '');
    return w;
  });

/**
 * Returns raw Worker handles captured during topology initialization.
 * Used by CoordinatorAssistanceMediator to attach log-forwarding listeners.
 */
export function getRawWorkers(): WorkerThreads.Worker[] {
  return [...rawWorkers];
}

/**
 * Returns dedicated assistance MessagePorts created during topology init.
 * Each port corresponds to a worker in getRawWorkers() by index.
 * Used by CoordinatorAssistanceMediator for worker→coordinator
 * assistance requests — keeps them off the main Worker channel so
 * they don't interfere with @effect/platform's protocol.
 */
export function getAssistancePorts(): WorkerThreads.MessagePort[] {
  return [...assistancePorts];
}

export function getWorkerNames(): string[] {
  return [...workerNames];
}

export function clearRawWorkers(): void {
  rawWorkers.length = 0;
  assistancePorts.length = 0;
  workerNames.length = 0;
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
  readonly compilation: Worker.SerializedWorker<CompilationRequest>;
}

export interface TopologyConfig {
  readonly poolSize: number;
  readonly enableResourceLoader: boolean;
  readonly logger: LoggerInterface;
  readonly logLevel?: string;
  /** Mirrors LSP `apex.environment.serverMode` for worker-side capabilities (e.g. dev hover metrics). */
  readonly serverMode?: 'production' | 'development';
  /** Per-role worker layer factory. When provided, each worker spawn uses a role-specific layer
   *  (e.g. with custom execArgv for profiling/debug). When omitted, the caller must provide
   *  Worker.WorkerManager | Worker.Spawner externally (existing behavior). */
  readonly workerLayerFactory?: (
    role: WorkerRole,
  ) => Layer.Layer<Worker.WorkerManager | Worker.Spawner>;
}

const makeInitMessage = (
  role: 'dataOwner' | 'enrichmentSearch' | 'resourceLoader' | 'compilation',
  logLevel?: string,
  serverMode: 'production' | 'development' = 'production',
) =>
  new WorkerInit({
    role,
    protocolVersion: WIRE_PROTOCOL_VERSION,
    logLevel,
    serverMode,
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
 *
 * When `config.workerLayerFactory` is provided, each worker spawn uses a
 * role-specific layer (e.g. with per-role `execArgv` for profiling/debug).
 * Otherwise the caller must provide `WorkerManager | Spawner` externally
 * via `makeNodeWorkerLayer(workerScript)`.
 */
export function initializeTopology(
  config: TopologyConfig & {
    workerLayerFactory: NonNullable<TopologyConfig['workerLayerFactory']>;
  },
): Effect.Effect<WorkerTopology, WorkerError, Scope.Scope>;
export function initializeTopology(
  config: TopologyConfig,
): Effect.Effect<
  WorkerTopology,
  WorkerError,
  Worker.WorkerManager | Worker.Spawner | Scope.Scope
>;
export function initializeTopology(
  config: TopologyConfig,
): Effect.Effect<
  WorkerTopology,
  WorkerError,
  Worker.WorkerManager | Worker.Spawner | Scope.Scope
> {
  return Effect.gen(function* () {
    const { logger, logLevel } = config;
    const serverMode = config.serverMode ?? 'production';
    const poolSize = clampPoolSize(config.poolSize);

    const withRoleLayer = <A, E>(
      eff: Effect.Effect<
        A,
        E,
        Worker.WorkerManager | Worker.Spawner | Scope.Scope
      >,
      role: WorkerRole,
    ): Effect.Effect<
      A,
      E,
      Worker.WorkerManager | Worker.Spawner | Scope.Scope
    > =>
      config.workerLayerFactory
        ? (eff.pipe(
            Effect.provide(config.workerLayerFactory(role)),
          ) as Effect.Effect<
            A,
            E,
            Worker.WorkerManager | Worker.Spawner | Scope.Scope
          >)
        : eff;

    let resourceLoader: Worker.SerializedWorker<ResourceLoaderRequest> | null =
      null;
    if (config.enableResourceLoader) {
      resourceLoader = yield* withRoleLayer(
        Worker.makeSerialized<ResourceLoaderRequest>({
          initialMessage: () =>
            makeInitMessage('resourceLoader', logLevel, serverMode),
        }),
        'resourceLoader',
      );
      logger.info(() => '[WorkerCoordinator] Resource loader initialized');
    }

    const dataOwner = yield* withRoleLayer(
      Worker.makeSerialized<DataOwnerRequest>({
        initialMessage: () =>
          makeInitMessage('dataOwner', logLevel, serverMode),
      }),
      'dataOwner',
    );
    logger.info(() => '[WorkerCoordinator] Data owner initialized');

    const compilation = yield* withRoleLayer(
      Worker.makeSerialized<CompilationRequest>({
        initialMessage: () =>
          makeInitMessage('compilation', logLevel, serverMode),
      }),
      'compilation',
    );
    logger.info(() => '[WorkerCoordinator] Compilation worker initialized');

    const enrichmentPool = yield* withRoleLayer(
      Worker.makePoolSerialized<EnrichmentSearchRequest>({
        size: poolSize,
        initialMessage: () =>
          makeInitMessage('enrichmentSearch', logLevel, serverMode),
      }),
      'enrichmentSearch',
    );
    logger.info(
      () =>
        `[WorkerCoordinator] Enrichment pool initialized (size=${poolSize})`,
    );

    return {
      dataOwner,
      enrichmentPool,
      resourceLoader,
      compilation,
    } as WorkerTopology;
  });
}

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
  readonly compilation: WorkerHandle;
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

    let resourceLoader: WorkerHandle | null = null;
    if (config.enableResourceLoader) {
      resourceLoader = yield* transport.spawn('resourceLoader');
      logger.info(
        () => '[WorkerCoordinator] Resource loader initialized (transport)',
      );
    }

    const dataOwner = yield* transport.spawn('dataOwner');
    logger.info(() => '[WorkerCoordinator] Data owner initialized (transport)');

    const compilation = yield* transport.spawn('compilation');
    logger.info(
      () => '[WorkerCoordinator] Compilation worker initialized (transport)',
    );

    const enrichmentPool = yield* transport.makePool(
      'enrichmentSearch',
      poolSize,
    );
    logger.info(
      () =>
        `[WorkerCoordinator] Enrichment pool initialized (transport, size=${poolSize})`,
    );

    return {
      transport,
      dataOwner,
      enrichmentPool,
      resourceLoader,
      compilation,
    };
  });

/**
 * Phase B — after `ResourceLoaderProxy` exists and assistance mediation is
 * attached: each data-owner and enrichment worker that uses the remote
 * stdlib layer runs an awaited namespace fill (see `WorkerRemoteStdlibWarmup`).
 * No-op when the resource-loader worker was not spawned.
 */
export const runRemoteStdlibWarmupPhase = (
  topology: WorkerTopology,
  poolSize: number,
) => {
  const req = new WorkerRemoteStdlibWarmup({});
  return Effect.gen(function* () {
    if (!topology.resourceLoader) {
      return;
    }
    const n = clampPoolSize(poolSize);
    yield* topology.dataOwner.executeEffect(req);
    for (let i = 0; i < n; i++) {
      yield* topology.enrichmentPool.executeEffect(req);
    }
  });
};

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
  // document lifecycle
  documentOpen: 'dataOwner',
  documentChange: 'dataOwner',
  documentSave: 'dataOwner',
  documentClose: 'dataOwner',
  documentLoad: 'coordinatorOnly',
  // LSP protocol operations
  codeAction: 'coordinatorOnly',
  codeLens: 'coordinatorOnly',
  completion: 'coordinatorOnly',
  definition: 'enrichmentPool',
  diagnostics: 'enrichmentPool',
  documentSymbol: 'coordinatorOnly',
  executeCommand: 'coordinatorOnly',
  findMissingArtifact: 'coordinatorOnly',
  foldingRange: 'coordinatorOnly',
  hover: 'enrichmentPool',
  implementation: 'coordinatorOnly',
  prerequisiteEnrichment: 'coordinatorOnly',
  references: 'coordinatorOnly',
  rename: 'coordinatorOnly',
  resolve: 'coordinatorOnly',
  signatureHelp: 'coordinatorOnly',
  workspaceSymbol: 'coordinatorOnly',
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
  readonly sendToCompilation: (msg: CompilationRequest) => Promise<unknown>;
  readonly sendBatch: (
    msg: WorkspaceBatchIngest,
  ) => Promise<{ processedCount: number }>;
  readonly poolSize: number;
  readonly hasResourceLoader: boolean;
  readonly getDocumentContent?: (uri: string) => string | undefined;
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
  createBatchCompileDispatcher(): (
    sessionId: string,
    entries: BatchIngestEntry[],
  ) => Promise<{
    compiledCount: number;
    errorCount: number;
    elapsedMs: number;
  }>;
  queryDataOwner(method: string, params: unknown): Promise<unknown>;
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

      if (type === 'documentOpen' || type === 'documentChange') {
        const dataOwnerMsg = buildDataOwnerMessage(type, params);
        const compileMsg = buildCompileMessage(type, params);
        logger.debug(() => `[WorkerDispatch] → dataOwner+compilation: ${type}`);
        callbacks
          .sendToDataOwner(dataOwnerMsg)
          .catch((err) =>
            logger.error(
              () => `[WorkerDispatch] dataOwner ${type} failed: ${err}`,
            ),
          );
        return callbacks.sendToCompilation(compileMsg);
      }

      if (DATA_OWNER_TYPES.has(type)) {
        const msg = buildDataOwnerMessage(type, params);
        logger.debug(() => `[WorkerDispatch] → dataOwner: ${type}`);
        return callbacks.sendToDataOwner(msg);
      }
      const msg = buildEnrichmentMessage(
        type,
        params,
        callbacks.getDocumentContent,
      );
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
      compilation: { active: available },
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

    createBatchCompileDispatcher() {
      return async (sessionId: string, entries: BatchIngestEntry[]) => {
        logger.debug(
          () =>
            '[WorkerDispatch] → compilation: WorkspaceBatchCompile ' +
            `(session=${sessionId}, entries=${entries.length})`,
        );
        return callbacks.sendToCompilation(
          new WorkspaceBatchCompile({ sessionId, entries }),
        ) as Promise<{
          compiledCount: number;
          errorCount: number;
          elapsedMs: number;
        }>;
      };
    },

    async queryDataOwner(method: string, params: unknown): Promise<unknown> {
      switch (method) {
        case 'QuerySymbolSubset': {
          const pqs = params as { uris?: string[] };
          return callbacks.sendToDataOwner(
            new QuerySymbolSubset({
              uris: pqs.uris ?? [],
            }),
          );
        }
        case 'UpdateSymbolSubset': {
          const pus = params as {
            uri: string;
            documentVersion: number;
            enrichedSymbolTable: unknown;
            enrichedDetailLevel:
              | 'public-api'
              | 'protected'
              | 'private'
              | 'full';
            sourceWorkerId: string;
          };
          return callbacks.sendToDataOwner(
            new UpdateSymbolSubset({
              uri: pus.uri,
              documentVersion: pus.documentVersion,
              enrichedSymbolTable: pus.enrichedSymbolTable,
              enrichedDetailLevel: pus.enrichedDetailLevel,
              sourceWorkerId: pus.sourceWorkerId,
            }),
          );
        }
        case 'ResolveDepUris': {
          const prd = params as { classNames?: string[] };
          return callbacks.sendToDataOwner(
            new ResolveDepUris({
              classNames: prd.classNames ?? [],
            }),
          );
        }
        default:
          throw new Error(`Unknown data-owner query method: ${method}`);
      }
    },
  };
}

/**
 * Create a dispatcher backed by @effect/platform Worker handles.
 */
export function makeWorkerDispatcher(
  topology: WorkerTopology,
  logger: LoggerInterface,
  getDocumentContent?: (uri: string) => string | undefined,
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
      sendToCompilation: (msg) => {
        const eff = topology.compilation.executeEffect(msg) as Effect.Effect<
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
      getDocumentContent,
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
  getDocumentContent?: (uri: string) => string | undefined,
) {
  return createDispatcher(
    {
      sendToDataOwner: (msg) =>
        Effect.runPromise(topology.transport.send(topology.dataOwner, msg)),
      dispatchToPool: (msg) =>
        Effect.runPromise(
          topology.transport.dispatch(topology.enrichmentPool, msg),
        ),
      sendToCompilation: (msg) =>
        Effect.runPromise(topology.transport.send(topology.compilation, msg)),
      sendBatch: (msg) =>
        Effect.runPromise(
          topology.transport.send(topology.dataOwner, msg),
        ) as Promise<{ processedCount: number }>,
      poolSize: topology.enrichmentPool.size,
      hasResourceLoader: topology.resourceLoader !== null,
      getDocumentContent,
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

function buildCompileMessage(
  type: LSPRequestType,
  params: unknown,
): CompilationRequest {
  const p = params as DocumentEventParams;
  const uri = p.document?.uri ?? p.textDocument?.uri ?? '';
  const content = p.document?.getText?.() ?? p.text ?? '';
  const version = p.document?.version ?? 0;
  const languageId = p.document?.languageId ?? 'apex';
  const priority = type === 'documentOpen' ? 'high' : 'high';
  return new CompileDocument({ uri, content, languageId, version, priority });
}

function buildEnrichmentMessage(
  type: LSPRequestType,
  params: unknown,
  getDocumentContent?: (uri: string) => string | undefined,
): EnrichmentSearchRequest {
  const p = params as EnrichmentParams;
  switch (type) {
    case 'hover':
      return new DispatchHover({
        textDocument: { uri: p.textDocument.uri },
        position: (p as PositionBasedParams).position,
        content: getDocumentContent?.(p.textDocument.uri),
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
