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
  DataOwnerPreloadStandardNamespaces,
  QuerySymbolSubset,
  AwaitSymbolReadiness,
  UpdateSymbolSubset,
  InstallSObjectArtifacts,
  ResolveDepUris,
  ResolveDependentUris,
  CheckMemberConflicts,
  FindOccurrenceCandidates,
  ResolveMethodRenameFamily,
  WIRE_PROTOCOL_VERSION,
  WorkspaceBatchIngest,
  WorkspaceBatchCompileOnDataOwner,
  BeginWorkspaceLoadSession,
  DrainDeferredReferences,
  QueryGraphData,
  DataOwnerQuerySymbolByName,
  CompileDocument,
  DispatchHover,
  DispatchDefinition,
  DispatchCompletion,
  DispatchSignatureHelp,
  DispatchCodeAction,
  DispatchReferences,
  DispatchRename,
  DispatchPrepareRename,
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
  type LspRequestMessage,
  type ResourceLoaderRequest,
  type WorkerRole,
  type MissingArtifactPayload,
} from '@salesforce/apex-lsp-shared';
import type {
  WorkerDispatchStrategy,
  WorkerTopologyStatus,
  WorkerTopologyTransport,
  WorkerHandle,
  PoolHandle,
} from '@salesforce/apex-lsp-compliant-services';
import { injectTraceContextFromOtelSpan } from './traceContextInjection';

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
    resourceLimits?: { maxOldGenerationSizeMb?: number };
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
        workerScript,
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

export interface BrowserWorkerBootstrapOptions {
  readonly role?: WorkerRole;
  readonly compilationPoolSize?: number;
  readonly compilationConcurrency?: number;
  readonly workerPlatformUrl?: string;
}

function browserWorkerLayer(
  blobUrl: string,
  bootstrap: BrowserWorkerBootstrapOptions,
  BrowserWorker: typeof import('@effect/platform-browser/BrowserWorker'),
  W: new (url: string | URL) => BrowserWorkerLike,
  MC: new () => { port1: BrowserMessagePort; port2: BrowserMessagePort },
): Layer.Layer<Worker.WorkerManager | Worker.Spawner> {
  return BrowserWorker.layer((_id: number) => {
    const rawWorker = new W(blobUrl);
    const mcEffect = new MC();
    const mcAssist = new MC();

    rawWorker.postMessage(
      {
        _tag: 'WorkerPortsInit',
        effectPort: mcEffect.port2,
        assistPort: mcAssist.port2,
        ...bootstrap,
      },
      [mcEffect.port2, mcAssist.port2],
    );
    browserAssistancePorts.push(mcAssist.port1);

    return mcEffect.port1 as never;
  });
}

function withBlobUrlCleanup(
  layer: Layer.Layer<Worker.WorkerManager | Worker.Spawner>,
  blobUrls: ReadonlyArray<string>,
): Layer.Layer<Worker.WorkerManager | Worker.Spawner> {
  return Layer.merge(
    layer,
    Layer.scopedDiscard(
      Effect.addFinalizer(() =>
        Effect.sync(() => {
          for (const blobUrl of blobUrls) {
            URL.revokeObjectURL(blobUrl);
          }
        }),
      ),
    ),
  );
}

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
  bootstrap: BrowserWorkerBootstrapOptions = {},
): Promise<Layer.Layer<Worker.WorkerManager | Worker.Spawner>> {
  const BrowserWorker = await import('@effect/platform-browser/BrowserWorker');

  // Fetch the script and create a blob URL so the sub-worker shares the same
  // origin as the parent (server.web.js). Direct HTTP URLs fail with a
  // SecurityError when the parent runs from a different-origin blob context
  // (e.g. VS Code web extension subdomain isolation).
  const response = await fetch(workerScriptUrl);
  if (!response.ok) {
    throw new Error(
      `Unable to load browser worker bundle ${workerScriptUrl}: ${response.status} ${response.statusText}`,
    );
  }
  const scriptText = await response.text();
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
  return withBlobUrlCleanup(
    browserWorkerLayer(blobUrl, bootstrap, BrowserWorker, W, MC),
    [blobUrl],
  );
}

export async function makeBrowserWorkerLayerFactory(
  workerScriptUrl: string,
  options: {
    readonly compilationPoolSize: number;
    readonly compilationConcurrency: number;
  },
): Promise<
  (role: WorkerRole) => Layer.Layer<Worker.WorkerManager | Worker.Spawner>
> {
  const BrowserWorker = await import('@effect/platform-browser/BrowserWorker');
  const workerResponse = await fetch(workerScriptUrl);
  if (!workerResponse.ok) {
    throw new Error(
      `Unable to load browser worker bundle ${workerScriptUrl}: ${workerResponse.status} ${workerResponse.statusText}`,
    );
  }

  const workerScript = await workerResponse.text();
  const workerBlobUrl = URL.createObjectURL(
    new Blob([workerScript], { type: 'application/javascript' }),
  );
  const W = (globalThis as any).Worker as new (
    url: string | URL,
  ) => BrowserWorkerLike;
  const MC = (globalThis as any).MessageChannel as new () => {
    port1: BrowserMessagePort;
    port2: BrowserMessagePort;
  };

  return (role) =>
    withBlobUrlCleanup(
      browserWorkerLayer(
        workerBlobUrl,
        {
          role,
          compilationPoolSize: options.compilationPoolSize,
          compilationConcurrency: options.compilationConcurrency,
          ...(role === 'dataOwner' ? { workerPlatformUrl: workerBlobUrl } : {}),
        },
        BrowserWorker,
        W,
        MC,
      ),
      [workerBlobUrl],
    );
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
  readonly dataOwner: Worker.SerializedWorkerPool<DataOwnerRequest>;
  readonly requestPool: Worker.SerializedWorkerPool<LspRequestMessage>;
  readonly requestPoolSize: number;
  readonly resourceLoader: Worker.SerializedWorkerPool<ResourceLoaderRequest> | null;
  readonly compilationPoolSize: number;
  readonly compilationConcurrency: number;
}

export interface TopologyConfig {
  readonly poolSize: number;
  readonly enableResourceLoader: boolean;
  readonly logger: LoggerInterface;
  readonly logLevel?: string;
  /** Mirrors LSP `apex.environment.serverMode` for worker-side capabilities (e.g. dev hover metrics). */
  readonly serverMode?: 'production' | 'development';
  /** Span collector URL for worker tracing (desktop only, if provided by extension). */
  readonly spanCollectorUrl?: string;
  /** Per-role worker layer factory. When provided, each worker spawn uses a role-specific layer
   *  (e.g. with custom execArgv for profiling/debug). When omitted, the caller must provide
   *  Worker.WorkerManager | Worker.Spawner externally (existing behavior). */
  readonly workerLayerFactory?: (
    role: WorkerRole,
  ) => Layer.Layer<Worker.WorkerManager | Worker.Spawner>;
  /** Maximum concurrent requests to the dataOwner worker. Default: 10.
   *  Higher values allow more UpdateSymbolSubset calls to dispatch concurrently,
   *  reducing IPC serialization overhead during workspace load. */
  readonly dataOwnerConcurrency?: number;
  /** Concurrent Effect Worker requests admitted per backing compiler worker. */
  readonly compilationConcurrency?: number;
  /** Number of backing compiler workers owned by the data owner. */
  readonly compilationPoolSize?: number;
}

const makeInitMessage = (
  role: WorkerRole,
  logLevel?: string,
  serverMode: 'production' | 'development' = 'production',
  spanCollectorUrl?: string,
) =>
  new WorkerInit({
    role,
    protocolVersion: WIRE_PROTOCOL_VERSION,
    logLevel,
    serverMode,
    spanCollectorUrl,
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

// ---------------------------------------------------------------------------
// Trace context injection helpers
// ---------------------------------------------------------------------------

/**
 * Inject trace context into a message payload using OTEL's global active span.
 * Mutates the message object by adding a traceContext field if a span is active.
 *
 * This must be called synchronously within the same call stack as runWithSpan(),
 * otherwise the OTEL context will be lost.
 */
function injectTraceContextIntoMessage(message: Record<string, unknown>): void {
  const enriched = injectTraceContextFromOtelSpan(message);
  if ('traceContext' in enriched) {
    (message as Record<string, unknown>).traceContext = enriched.traceContext;
  }
}

// ---------------------------------------------------------------------------
// Topology initialization
// ---------------------------------------------------------------------------

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
    const { logger, logLevel, spanCollectorUrl } = config;
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

    // Spawn all workers in parallel for faster initialization
    const [resourceLoader, dataOwner, requestPool] = yield* Effect.all(
      [
        config.enableResourceLoader
          ? withRoleLayer(
              Worker.makePoolSerialized<ResourceLoaderRequest>({
                initialMessage: () =>
                  makeInitMessage(
                    'resourceLoader',
                    logLevel,
                    serverMode,
                    spanCollectorUrl,
                  ),
                size: 1,
                concurrency: 1, // Serial processing for resource loading
              }),
              'resourceLoader',
            )
          : Effect.succeed(null),
        withRoleLayer(
          Worker.makePoolSerialized<DataOwnerRequest>({
            initialMessage: () =>
              makeInitMessage(
                'dataOwner',
                logLevel,
                serverMode,
                spanCollectorUrl,
              ),
            size: 1, // Single worker instance
            concurrency: config.dataOwnerConcurrency ?? 10, // Allow up to N concurrent requests to the worker
          }),
          'dataOwner',
        ),
        withRoleLayer(
          Worker.makePoolSerialized<LspRequestMessage>({
            size: poolSize,
            initialMessage: () =>
              makeInitMessage(
                'lspRequest',
                logLevel,
                serverMode,
                spanCollectorUrl,
              ),
          }),
          'lspRequest',
        ),
      ],
      { concurrency: 'unbounded' },
    );

    // Log after all are initialized
    if (resourceLoader) {
      logger.alwaysLog('[WorkerCoordinator] Resource loader initialized');
    }
    logger.alwaysLog('[WorkerCoordinator] Data owner initialized');
    logger.alwaysLog(
      () =>
        '[WorkerCoordinator] Compilation pool initialized ' +
        `(owner=dataOwner, size=${config.compilationPoolSize ?? 2}, ` +
        `concurrencyPerWorker=${config.compilationConcurrency ?? 1})`,
    );
    logger.alwaysLog(
      () =>
        `[WorkerCoordinator] Enrichment pool initialized (size=${poolSize})`,
    );

    return {
      dataOwner,
      requestPool,
      requestPoolSize: poolSize,
      resourceLoader,
      compilationPoolSize: config.compilationPoolSize ?? 2,
      compilationConcurrency: config.compilationConcurrency ?? 1,
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
        role: 'lspRequest',
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
  readonly requestPool: PoolHandle;
  readonly resourceLoader: WorkerHandle | null;
  readonly compilationPoolSize: number;
  readonly compilationConcurrency: number;
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
      logger.alwaysLog(
        '[WorkerCoordinator] Resource loader initialized (transport)',
      );
    }

    const dataOwner = yield* transport.spawn('dataOwner');
    logger.alwaysLog('[WorkerCoordinator] Data owner initialized (transport)');
    logger.alwaysLog(
      () =>
        '[WorkerCoordinator] Compilation pool configured ' +
        `(owner=dataOwner, size=${config.compilationPoolSize ?? 2}, ` +
        `concurrencyPerWorker=${config.compilationConcurrency ?? 1})`,
    );

    const requestPool = yield* transport.makePool('lspRequest', poolSize);
    logger.alwaysLog(
      () =>
        `[WorkerCoordinator] Enrichment pool initialized (transport, size=${poolSize})`,
    );

    return {
      transport,
      dataOwner,
      requestPool,
      resourceLoader,
      compilationPoolSize: config.compilationPoolSize ?? 2,
      compilationConcurrency: config.compilationConcurrency ?? 1,
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
  preloadNamespaces: readonly string[] = [],
) => {
  const req = new WorkerRemoteStdlibWarmup({});
  return Effect.gen(function* () {
    if (!topology.resourceLoader) {
      return undefined;
    }
    const n = clampPoolSize(poolSize);
    // Warm all workers in parallel — each is independent
    yield* Effect.all(
      [
        topology.dataOwner.executeEffect(req),
        topology.resourceLoader.executeEffect(req),
        ...Array.from({ length: n }, () =>
          topology.requestPool.executeEffect(req),
        ),
      ],
      { concurrency: 'unbounded' },
    );

    if (preloadNamespaces.length === 0) {
      return undefined;
    }

    return yield* topology.dataOwner.executeEffect(
      new DataOwnerPreloadStandardNamespaces({
        namespaces: [...preloadNamespaces],
      }),
    );
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
 * - requestPool:  routed to an enrichment pool worker
 * - coordinatorOnly: runs on the coordinator thread (local handler)
 */
type DispatchTarget = 'dataOwner' | 'requestPool' | 'coordinatorOnly';

const DISPATCH_ROUTING: Record<LSPRequestType, DispatchTarget> = {
  // document lifecycle
  documentOpen: 'dataOwner',
  documentChange: 'dataOwner',
  documentSave: 'dataOwner',
  documentClose: 'dataOwner',
  documentLoad: 'coordinatorOnly',
  // LSP protocol operations
  // File-scoped symbol readers run on the request pool (each loads the file's
  // subset) so the coordinator holds no symbols.
  codeAction: 'requestPool',
  codeLens: 'requestPool',
  // Completion runs on the LSP-request pool (loads the active file's subset,
  // incl. live edits, from the data-owner) so the coordinator holds no symbols.
  completion: 'requestPool',
  definition: 'requestPool',
  diagnostics: 'requestPool',
  documentSymbol: 'requestPool',
  executeCommand: 'coordinatorOnly',
  findMissingArtifact: 'coordinatorOnly',
  foldingRange: 'coordinatorOnly',
  hover: 'requestPool',
  // Implementation search must read the workspace-wide symbol graph (the
  // dataOwner's authoritative store), so it runs in the enrichment pool like
  // definition — not on the coordinator, whose local store only holds opened files.
  implementation: 'requestPool',
  prerequisiteEnrichment: 'coordinatorOnly',
  references: 'requestPool',
  // Rename reads the workspace-wide symbol graph to collect cross-file
  // occurrences (like references), so it runs on the enrichment pool — not the
  // coordinator, whose local store only holds opened files.
  rename: 'requestPool',
  // W-23631080: prepareRename runs on the request pool, like rename — it needs
  // the live document text to parse the cursor file standalone and resolve the
  // local under the cursor.
  prepareRename: 'requestPool',
  resolve: 'coordinatorOnly',
  signatureHelp: 'requestPool',
  // workspaceSymbol stays coordinator-only: it is workspace-wide, not
  // file-scoped, so the load-one-file request-pool model does not fit.
  workspaceSymbol: 'coordinatorOnly',
  crossFileEnrichment: 'requestPool',
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

const REQUEST_POOL_TYPES = new Set(
  (Object.keys(DISPATCH_ROUTING) as LSPRequestType[]).filter(
    (t) => DISPATCH_ROUTING[t] === 'requestPool',
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
  readonly dispatchToPool: (msg: LspRequestMessage) => Promise<unknown>;
  readonly sendBatch: (
    msg: WorkspaceBatchIngest,
  ) => Promise<{ processedCount: number }>;
  readonly poolSize: number;
  readonly hasResourceLoader: boolean;
  readonly compilationPoolSize: number;
  readonly getDocumentContent?: (uri: string) => string | undefined;
  readonly getDocumentVersion?: (uri: string) => number | undefined;
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
  createCrossFileEnrichmentDispatcher(): (
    fileUris: string[],
  ) => Promise<{ resolved: number; failed: number }>;
  createWorkspaceLoadSessionDispatcher(): (msg: {
    _tag: 'BeginWorkspaceLoadSession' | 'DrainDeferredReferences';
    sessionId?: string;
  }) => Promise<unknown>;
  createDataOwnerCompileDispatcher(): (entries: {
    sessionId: string;
    entries: Array<{
      uri: string;
      content: string;
      languageId: string;
      version: number;
    }>;
    traceContext?: string;
  }) => Promise<{
    compiledCount: number;
    errorCount: number;
    elapsedMs: number;
    workerCount: number;
  }>;
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
  const sendTracedToDataOwner = (message: DataOwnerRequest) => {
    injectTraceContextIntoMessage(
      message as unknown as Record<string, unknown>,
    );
    return callbacks.sendToDataOwner(message);
  };

  return {
    isAvailable: () => available,
    setAvailable: (v: boolean) => {
      available = v;
    },
    canDispatch: (type: LSPRequestType) => !COORDINATOR_ONLY_TYPES.has(type),

    dispatchesToPool: (type: LSPRequestType) => REQUEST_POOL_TYPES.has(type),

    dispatchesToDataOwner: (type: LSPRequestType) => DATA_OWNER_TYPES.has(type),

    // True when the file is open in the editor — which means a compile is (or
    // soon will be) in flight for it. The coordinator's own TextDocuments set
    // is the authoritative "compile coming" signal, sidestepping the dataOwner
    // version === -1 race. Backed by getDocumentContent (this.documents.get).
    isFileOpen: (uri: string): boolean =>
      callbacks.getDocumentContent?.(uri) !== undefined,

    // Block until the dataOwner has merged the symbol graph for {uri, version},
    // or report why it can't. A deterministic await rather than a poll: a
    // document open/change arms a per-URI latch on the dataOwner, and the
    // compile's write-back resolves it. `reason` lets the gate distinguish a
    // genuine timeout (keep waiting / fall back) from "no compile is pending"
    // (fall back immediately).
    async awaitSymbolDataReady(
      uri: string,
      version: number,
      timeoutMs: number,
    ): Promise<{
      ready: boolean;
      reason?: 'no-compile-pending' | 'timeout' | 'stale-version';
    }> {
      const res = (await this.queryDataOwner('AwaitSymbolReadiness', {
        uri,
        version,
        timeoutMs,
      })) as
        | {
            ready?: boolean;
            reason?: 'no-compile-pending' | 'timeout' | 'stale-version';
          }
        | undefined;
      return { ready: res?.ready === true, reason: res?.reason };
    },

    async dispatch(type: LSPRequestType, params: unknown): Promise<unknown> {
      dispatchedCount++;

      if (
        type === 'documentOpen' ||
        type === 'documentChange' ||
        type === 'documentSave'
      ) {
        const dataOwnerMsg = buildDataOwnerMessage(type, params);
        const compileMsg = buildCompileMessage(type, params);

        // Inject trace context into both messages
        injectTraceContextIntoMessage(
          dataOwnerMsg as unknown as Record<string, unknown>,
        );
        injectTraceContextIntoMessage(
          compileMsg as unknown as Record<string, unknown>,
        );

        logger.debug(
          () => `[WorkerDispatch] → dataOwner store→pool compile: ${type}`,
        );
        // Store the document on the data-owner BEFORE asking it to compile and
        // commit through its persistent pool. Version validation rejects a
        // result if a newer mutation wins while compilation is in flight.
        // A failed store is terminal for this dispatch: compiling content the
        // authoritative owner did not accept cannot produce a valid commit.
        await callbacks.sendToDataOwner(dataOwnerMsg);
        return callbacks.sendToDataOwner(compileMsg);
      }

      if (DATA_OWNER_TYPES.has(type)) {
        const msg = buildDataOwnerMessage(type, params);
        injectTraceContextIntoMessage(
          msg as unknown as Record<string, unknown>,
        );
        logger.debug(() => `[WorkerDispatch] → dataOwner: ${type}`);
        return callbacks.sendToDataOwner(msg);
      }
      const msg = buildLspRequestMessage(
        type,
        params,
        callbacks.getDocumentContent,
        callbacks.getDocumentVersion,
      );
      injectTraceContextIntoMessage(msg as unknown as Record<string, unknown>);
      logger.debug(() => `[WorkerDispatch] → requestPool: ${type}`);
      const response = await callbacks.dispatchToPool(msg);
      return (response as { result: unknown }).result;
    },

    getTopologyStatus: (): WorkerTopologyStatus => ({
      enabled: true,
      dataOwner: { active: available },
      requestPool: { size: callbacks.poolSize, active: available },
      resourceLoader: callbacks.hasResourceLoader
        ? { active: available }
        : null,
      compilation: {
        active: available,
        poolSize: callbacks.compilationPoolSize,
      },
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
        const message = new WorkspaceBatchIngest({ sessionId, entries });
        injectTraceContextIntoMessage(
          message as unknown as Record<string, unknown>,
        );
        return callbacks.sendBatch(message);
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
            injectTraceContextIntoMessage(
              msg as unknown as Record<string, unknown>,
            );
            await callbacks.dispatchToPool(msg);
            resolved++;
          } catch {
            failed++;
          }
        }
        return { resolved, failed };
      };
    },

    createWorkspaceLoadSessionDispatcher() {
      return async (msg: {
        _tag: 'BeginWorkspaceLoadSession' | 'DrainDeferredReferences';
        sessionId?: string;
      }) => {
        if (msg._tag === 'BeginWorkspaceLoadSession' && msg.sessionId) {
          return sendTracedToDataOwner(
            new BeginWorkspaceLoadSession({ sessionId: msg.sessionId }),
          );
        } else if (msg._tag === 'DrainDeferredReferences') {
          return sendTracedToDataOwner(
            new DrainDeferredReferences({ sessionId: msg.sessionId }),
          );
        }
        return Promise.resolve();
      };
    },

    createDataOwnerCompileDispatcher() {
      return async (params: {
        sessionId: string;
        entries: Array<{
          uri: string;
          content: string;
          languageId: string;
          version: number;
        }>;
        traceContext?: string;
      }) => {
        const result = await sendTracedToDataOwner(
          new WorkspaceBatchCompileOnDataOwner(params),
        );
        return result as {
          compiledCount: number;
          errorCount: number;
          elapsedMs: number;
          workerCount: number;
        };
      };
    },

    async queryDataOwner(method: string, params: unknown): Promise<unknown> {
      switch (method) {
        case 'QuerySymbolSubset': {
          const pqs = params as {
            uris?: string[];
            includeEntries?: boolean;
          };
          return sendTracedToDataOwner(
            new QuerySymbolSubset({
              uris: pqs.uris ?? [],
              includeEntries: pqs.includeEntries,
            }),
          );
        }
        case 'AwaitSymbolReadiness': {
          const par = params as {
            uri?: string;
            version?: number;
            timeoutMs?: number;
          };
          return sendTracedToDataOwner(
            new AwaitSymbolReadiness({
              uri: par.uri ?? '',
              version: par.version ?? 0,
              timeoutMs: par.timeoutMs ?? 0,
            }),
          );
        }
        case 'UpdateSymbolSubset': {
          const pus = params as {
            uri: string;
            documentVersion: number;
            enrichedSymbolTable: unknown;
            enrichedDetailLevel:
              'public-api' | 'protected' | 'private' | 'full';
            sourceWorkerId: string;
          };
          return sendTracedToDataOwner(
            new UpdateSymbolSubset({
              uri: pus.uri,
              documentVersion: pus.documentVersion,
              enrichedSymbolTable: pus.enrichedSymbolTable,
              enrichedDetailLevel: pus.enrichedDetailLevel,
              sourceWorkerId: pus.sourceWorkerId,
            }),
          );
        }
        case 'InstallSObjectArtifacts': {
          const pis = params as {
            artifacts: MissingArtifactPayload[];
            originUri?: string;
          };
          return sendTracedToDataOwner(
            new InstallSObjectArtifacts({
              artifacts: pis.artifacts,
              originUri: pis.originUri,
            }),
          );
        }
        case 'ResolveDepUris': {
          const prd = params as { classNames?: string[] };
          return sendTracedToDataOwner(
            new ResolveDepUris({
              classNames: prd.classNames ?? [],
            }),
          );
        }
        case 'ResolveDependentUris': {
          const prd = params as { uri: string; symbolName?: string };
          return sendTracedToDataOwner(
            new ResolveDependentUris({
              uri: prd.uri,
              symbolName: prd.symbolName,
            }),
          );
        }
        case 'CheckMemberConflicts': {
          const cmc = params as {
            definingTypeFqn: string;
            newName: string;
            memberKind: 'field' | 'method';
            isRenamedMemberPrivate: boolean;
            currentName?: string;
          };
          return sendTracedToDataOwner(
            new CheckMemberConflicts({
              definingTypeFqn: cmc.definingTypeFqn,
              newName: cmc.newName,
              memberKind: cmc.memberKind,
              isRenamedMemberPrivate: cmc.isRenamedMemberPrivate,
              currentName: cmc.currentName,
            }),
          );
        }
        case 'FindOccurrenceCandidates': {
          const pfc = params as {
            symbolName: string;
            skipTextFilter?: boolean;
          };
          return sendTracedToDataOwner(
            new FindOccurrenceCandidates({
              symbolName: pfc.symbolName,
              skipTextFilter: pfc.skipTextFilter,
            }),
          );
        }
        case 'ResolveMethodRenameFamily': {
          const prm = params as {
            definingTypeFqn: string;
            methodName: string;
            signature?: string[];
            isStatic: boolean;
          };
          return sendTracedToDataOwner(
            new ResolveMethodRenameFamily({
              definingTypeFqn: prm.definingTypeFqn,
              methodName: prm.methodName,
              signature: prm.signature,
              isStatic: prm.isStatic,
            }),
          );
        }
        case 'QuerySymbolByName': {
          const pqn = params as {
            name?: string;
            names?: readonly string[];
            namespace?: string;
          };
          return sendTracedToDataOwner(
            new DataOwnerQuerySymbolByName({
              name: pqn.name,
              names: pqn.names,
              namespace: pqn.namespace,
            }),
          );
        }
        case 'DrainDeferredReferences': {
          const drainParams = params as { sessionId?: string } | undefined;
          return sendTracedToDataOwner(
            new DrainDeferredReferences({
              sessionId: drainParams?.sessionId,
            }),
          );
        }
        default:
          throw new Error(`Unknown data-owner query method: ${method}`);
      }
    },

    queryGraphData(params): Promise<unknown> {
      return sendTracedToDataOwner(
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
 *
 * @internal Exported for in-package use by `LCSAdapter` and for unit tests;
 * not part of the stable public API and may change without notice.
 */
export function makeWorkerDispatcher(
  topology: WorkerTopology,
  logger: LoggerInterface,
  getDocumentContent?: (uri: string) => string | undefined,
  getDocumentVersion?: (uri: string) => number | undefined,
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
        const eff = topology.requestPool.executeEffect(msg) as Effect.Effect<
          unknown,
          unknown,
          never
        >;
        return Effect.runPromise(eff);
      },
      sendBatch: (msg) =>
        Effect.runPromise(topology.dataOwner.executeEffect(msg)),
      poolSize: topology.requestPoolSize,
      hasResourceLoader: topology.resourceLoader !== null,
      compilationPoolSize: topology.compilationPoolSize,
      getDocumentContent,
      getDocumentVersion,
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
  getDocumentVersion?: (uri: string) => number | undefined,
) {
  return createDispatcher(
    {
      sendToDataOwner: (msg) =>
        Effect.runPromise(topology.transport.send(topology.dataOwner, msg)),
      dispatchToPool: (msg) =>
        Effect.runPromise(
          topology.transport.dispatch(topology.requestPool, msg),
        ),
      sendBatch: (msg) =>
        Effect.runPromise(
          topology.transport.send(topology.dataOwner, msg),
        ) as Promise<{ processedCount: number }>,
      poolSize: topology.requestPool.size,
      hasResourceLoader: topology.resourceLoader !== null,
      compilationPoolSize: topology.compilationPoolSize,
      getDocumentContent,
      getDocumentVersion,
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
        // Full-text sync: the change event carries the entire updated document,
        // so document.getText() is the authoritative post-change content. The
        // data-owner stores this as the file's text (used by text-based scans
        // like find-references' lexical prefilter) rather than a blank
        // placeholder (W-23272674).
        content: p.document?.getText?.() ?? p.text ?? '',
      });
    case 'documentSave':
      return new DispatchDocumentSave({
        uri: p.document?.uri ?? p.textDocument?.uri ?? '',
        version: p.document?.version ?? 0,
        content: p.document?.getText?.() ?? p.text ?? '',
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
): CompileDocument {
  const p = params as DocumentEventParams;
  const uri = p.document?.uri ?? p.textDocument?.uri ?? '';
  const content = p.document?.getText?.() ?? p.text ?? '';
  const version = p.document?.version ?? 0;
  const languageId = p.document?.languageId ?? 'apex';
  const priority = type === 'documentOpen' ? 'high' : 'high';
  return new CompileDocument({ uri, content, languageId, version, priority });
}

function buildLspRequestMessage(
  type: LSPRequestType,
  params: unknown,
  getDocumentContent?: (uri: string) => string | undefined,
  getDocumentVersion?: (uri: string) => number | undefined,
): LspRequestMessage {
  const p = params as EnrichmentParams;
  const documentVersion = getDocumentVersion?.(p.textDocument.uri);
  switch (type) {
    case 'hover':
      return new DispatchHover({
        textDocument: { uri: p.textDocument.uri },
        position: (p as PositionBasedParams).position,
        content: getDocumentContent?.(p.textDocument.uri),
        documentVersion,
      });
    case 'completion': {
      const c = p as PositionBasedParams & {
        context?: { triggerKind: number; triggerCharacter?: string };
      };
      return new DispatchCompletion({
        textDocument: { uri: c.textDocument.uri },
        position: c.position,
        content: getDocumentContent?.(c.textDocument.uri),
        documentVersion,
        ...(c.context ? { context: c.context } : {}),
      });
    }
    case 'definition':
      return new DispatchDefinition({
        textDocument: { uri: p.textDocument.uri },
        position: (p as PositionBasedParams).position,
        content: getDocumentContent?.(p.textDocument.uri),
        documentVersion,
      });
    case 'signatureHelp': {
      const s = p as PositionBasedParams & { context?: unknown };
      return new DispatchSignatureHelp({
        textDocument: { uri: s.textDocument.uri },
        position: s.position,
        content: getDocumentContent?.(s.textDocument.uri),
        documentVersion,
        ...(s.context !== undefined ? { context: s.context } : {}),
      });
    }
    case 'codeAction': {
      const a = p as {
        textDocument: { uri: string };
        range: {
          start: { line: number; character: number };
          end: { line: number; character: number };
        };
        context?: unknown;
      };
      return new DispatchCodeAction({
        textDocument: { uri: a.textDocument.uri },
        range: a.range,
        content: getDocumentContent?.(a.textDocument.uri),
        ...(a.context !== undefined ? { context: a.context } : {}),
      });
    }
    case 'references': {
      const r = p as PositionBasedParams;
      return new DispatchReferences({
        textDocument: { uri: r.textDocument.uri },
        position: r.position,
        context: {
          includeDeclaration: r.context?.includeDeclaration ?? false,
        },
        // The pool worker's DispatchReferences handler maps the cursor to a
        // symbol via its local document; carry the live text so its storage
        // isn't empty (same as documentSymbol). Without it find-references
        // returns [] on the pool.
        content: getDocumentContent?.(r.textDocument.uri),
      });
    }
    case 'rename': {
      const rn = p as PositionBasedParams & { newName: string };
      return new DispatchRename({
        textDocument: { uri: rn.textDocument.uri },
        position: rn.position,
        newName: rn.newName,
        // Same as DispatchReferences: the pool worker resolves the cursor to a
        // symbol via its local document, so carry the live text or the rename
        // scan finds nothing on the pool.
        content: getDocumentContent?.(rn.textDocument.uri),
      });
    }
    case 'prepareRename': {
      // W-23631080: prepareRename dispatches to the pool worker just like rename,
      // carrying the live document text so the worker can parse the cursor file
      // standalone and resolve the local under the cursor.
      return new DispatchPrepareRename({
        textDocument: { uri: p.textDocument.uri },
        position: (p as PositionBasedParams).position,
        content: getDocumentContent?.(p.textDocument.uri),
      });
    }
    case 'implementation':
      return new DispatchImplementation({
        textDocument: { uri: p.textDocument.uri },
        position: (p as PositionBasedParams).position,
        content: getDocumentContent?.(p.textDocument.uri),
      });
    case 'documentSymbol':
      return new DispatchDocumentSymbol({
        textDocument: { uri: p.textDocument.uri },
        // documentSymbol re-compiles from the document text on the pool worker
        // (it does not read the dataOwner symbol graph), so it must carry the
        // live text — same as hover/completion. Omitting it left the pool
        // worker with no document to compile and returned an empty outline on
        // cold open.
        content: getDocumentContent?.(p.textDocument.uri),
      });
    case 'codeLens':
      return new DispatchCodeLens({
        textDocument: { uri: p.textDocument.uri },
      });
    case 'diagnostics':
      return new DispatchDiagnostic({
        textDocument: { uri: p.textDocument.uri },
        content: getDocumentContent?.(p.textDocument.uri),
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
