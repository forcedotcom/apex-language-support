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
  QueryGraphData,
  CompileDocument,
  WorkspaceBatchCompile,
  DispatchHover,
  DispatchDefinition,
  DispatchReferences,
  DispatchImplementation,
  DispatchDocumentSymbol,
  DispatchCodeLens,
  DispatchDiagnostic,
  DispatchCrossFileEnrichment,
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
// Worker Layer factory (Node.js — dynamically imported to avoid bundling
// node:worker_threads into the browser IIFE)
// ---------------------------------------------------------------------------

// Use `any` for Node types so the browser tsconfig doesn't need the node lib.
const rawWorkers: any[] = [];
const assistancePorts: any[] = [];
const workerNames: string[] = [];

/**
 * Create a Node.js worker layer. All node-specific imports are dynamic so
 * they are never evaluated in the browser bundle.
 */
export const makeNodeWorkerLayer = (
  workerScript: string,
  workerOptions?: {
    name?: string;
    execArgv?: string[];
    workerData?: unknown;
    transferList?: any[];
    stdout?: boolean;
    stderr?: boolean;
  },
) => {
  // Lazily resolve NodeWorker at call time (Node.js path only).
  const NodeWorker =
    require('@effect/platform-node/NodeWorker') as typeof import('@effect/platform-node/NodeWorker');
  const WT =
    require('node:worker_threads') as typeof import('node:worker_threads');

  return NodeWorker.layer((_id: number) => {
    const assistChannel = new WT.MessageChannel();
    const w = new WT.Worker(workerScript, {
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
};

/**
 * Returns raw Worker handles captured during topology initialization.
 * Used by CoordinatorAssistanceMediator to attach log-forwarding listeners.
 */
export function getRawWorkers(): any[] {
  return [...rawWorkers];
}

/**
 * Returns dedicated assistance MessagePorts created during topology init.
 * Each port corresponds to a worker in getRawWorkers() by index.
 */
export function getAssistancePorts(): any[] {
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
 * Minimal browser Worker interface — avoids DOM lib dependency in Node tsconfig.
 * Only the methods used by the coordinator and Effect's BrowserWorker.layer.
 */
export interface BrowserWorkerLike {
  postMessage(data: unknown, transfer?: unknown[]): void;
  addEventListener(
    type: 'message',
    listener: (event: { data: unknown }) => void,
  ): void;
}

/**
 * Minimal MessagePort interface — avoids DOM lib dependency in Node tsconfig.
 * Only the methods used by CoordinatorAssistanceMediator for side-channel IPC.
 */
export interface BrowserMessagePort {
  postMessage(data: unknown): void;
  addEventListener(
    type: 'message',
    listener: (event: { data: unknown }) => void,
  ): void;
  start(): void;
}

/**
 * Dedicated side-channel ports for browser workers.
 * port1 stays on the coordinator; port2 is transferred to the worker via
 * WorkerPortsInit. Mirrors the Node `assistancePorts` pattern exactly.
 */
const browserAssistancePorts: BrowserMessagePort[] = [];

/**
 * Create a browser worker layer using native Web Worker API.
 *
 * Each spawned worker gets two dedicated `MessagePort` pairs via a
 * `WorkerPortsInit` message posted to the worker's `self`:
 *   - `mcEffect`: carries only Effect protocol arrays (coordinator port1,
 *     worker port2). Effect never touches `self`, so no message-collision risk.
 *   - `mcAssist`: side-channel for logs and assistance RPC (coordinator port1
 *     stored in `browserAssistancePorts`, worker port2 used for all side-channel
 *     traffic). Mirrors the Node `assistPort`-via-`workerData` pattern.
 */
export async function makeBrowserWorkerLayer(
  workerScriptUrl: string,
): Promise<Layer.Layer<Worker.WorkerManager | Worker.Spawner>> {
  const BrowserWorker = await import('@effect/platform-browser/BrowserWorker');

  // Fetch the script and create a blob URL so the sub-worker shares the same
  // origin as the parent (server.web.js). Direct HTTP URLs fail with a
  // SecurityError when the parent runs from a different-origin blob context
  // (e.g. VS Code web extension subdomain isolation).
  const scriptText = await fetch(workerScriptUrl).then((r) => r.text());
  const blobUrl = URL.createObjectURL(
    new Blob([scriptText], { type: 'application/javascript' }),
  );

  const W = (globalThis as any).Worker as new (
    url: string | URL,
  ) => BrowserWorkerLike;
  // MessageChannel is a DOM API — use globalThis to avoid Node tsconfig errors.
  const MC = (globalThis as any).MessageChannel as new () => {
    port1: BrowserMessagePort;
    port2: BrowserMessagePort;
  };
  return BrowserWorker.layer((_id: number) => {
    const rawWorker = new W(blobUrl);

    // Two dedicated channels per worker:
    //   mcEffect — Effect protocol (coordinator ↔ worker)
    //   mcAssist — side-channel for logs + assistance RPC
    const mcEffect = new MC();
    const mcAssist = new MC();

    // Transfer both port2s to the worker via rawWorker.postMessage on `self`.
    // The worker listens on `self` for this one-time init message and never
    // starts Effect's BrowserWorkerRunner on `self`, so there is no collision.
    rawWorker.postMessage(
      {
        _tag: 'WorkerPortsInit',
        effectPort: mcEffect.port2,
        assistPort: mcAssist.port2,
      },
      [mcEffect.port2, mcAssist.port2],
    );
    browserAssistancePorts.push(mcAssist.port1);

    // Return the Effect protocol port to BrowserWorker.layer.
    // Effect will call port1Effect.postMessage([requestId, payload]) and listen
    // for responses on it — never touching self.
    return mcEffect.port1 as never;
  });
}

export function getBrowserAssistancePorts(): BrowserMessagePort[] {
  return [...browserAssistancePorts];
}

export function clearBrowserAssistancePorts(): void {
  browserAssistancePorts.length = 0;
}

// __dirname is only defined in Node CJS bundles; browser bundles leave it
// undefined (runVerticalSlice is Node-only so the default is never used there).
const DEFAULT_WORKER_SCRIPT =
  typeof __dirname !== 'undefined' ? __dirname + '/worker.platform.js' : '';

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
  let cpuCount = 4; // reasonable default for browser or when os is unavailable
  try {
    const os = require('node:os') as typeof import('node:os');
    cpuCount = os.cpus().length;
  } catch {
    // browser environment — use default
  }
  const max = Math.max(1, cpuCount - 2);
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
  workerOptions?: { execArgv?: string[]; workerData?: unknown },
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
  crossFileEnrichment: 'enrichmentPool',
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
  createCrossFileEnrichmentDispatcher(): (
    fileUris: string[],
  ) => Promise<{ resolved: number; failed: number }>;
  queryDataOwner(method: string, params: unknown): Promise<unknown>;
  queryGraphData(params: {
    type: 'all' | 'file' | 'type';
    fileUri?: string;
    symbolType?: string;
    includeMetadata?: boolean;
    includeDiagnostics?: boolean;
  }): Promise<unknown>;
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

    createCrossFileEnrichmentDispatcher() {
      return async (fileUris: string[]) => {
        let resolved = 0;
        let failed = 0;
        for (const uri of fileUris) {
          try {
            const msg = new DispatchCrossFileEnrichment({
              textDocument: { uri },
            });
            await callbacks.dispatchToPool(msg);
            resolved++;
          } catch {
            failed++;
          }
        }
        return { resolved, failed };
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

    queryGraphData(params): Promise<unknown> {
      return callbacks.sendToDataOwner(
        new QueryGraphData({
          type: params.type,
          fileUri: params.fileUri,
          symbolType: params.symbolType,
          includeMetadata: params.includeMetadata,
          includeDiagnostics: params.includeDiagnostics,
        }),
      );
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
    case 'crossFileEnrichment':
      return new DispatchCrossFileEnrichment({
        textDocument: { uri: p.textDocument.uri },
      });
    default:
      return new DispatchGenericLspRequest({
        requestType: type,
        params: p,
      });
  }
}
