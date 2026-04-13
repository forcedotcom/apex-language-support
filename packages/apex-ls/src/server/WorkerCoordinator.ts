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
} from '@salesforce/apex-lsp-shared';
import type {
  LoggerInterface,
  DataOwnerRequest,
  EnrichmentSearchRequest,
  ResourceLoaderRequest,
} from '@salesforce/apex-lsp-shared';
import type {
  WorkerDispatchStrategy,
  LSPRequestType,
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
    const w = new WorkerThreads.Worker(workerScript, workerOptions);
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
): Promise<any> {
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
}

const makeInitMessage = (
  role: 'dataOwner' | 'enrichmentSearch' | 'resourceLoader',
) => new WorkerInit({ role, protocolVersion: WIRE_PROTOCOL_VERSION });

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
    const { logger } = config;
    const poolSize = clampPoolSize(config.poolSize);

    const dataOwner = yield* Worker.makeSerialized<DataOwnerRequest>({
      initialMessage: () => makeInitMessage('dataOwner'),
    });
    logger.info(() => '[WorkerCoordinator] Data owner initialized');

    const enrichmentPool =
      yield* Worker.makePoolSerialized<EnrichmentSearchRequest>({
        size: poolSize,
        initialMessage: () => makeInitMessage('enrichmentSearch'),
      });
    logger.info(
      () =>
        `[WorkerCoordinator] Enrichment pool initialized (size=${poolSize})`,
    );

    let resourceLoader: Worker.SerializedWorker<ResourceLoaderRequest> | null =
      null;
    if (config.enableResourceLoader) {
      resourceLoader = yield* Worker.makeSerialized<ResourceLoaderRequest>({
        initialMessage: () => makeInitMessage('resourceLoader'),
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
// WorkerTopologyDispatcher — bridges LSPQueueManager → worker pool
// ---------------------------------------------------------------------------

const DATA_OWNER_TYPES: ReadonlySet<LSPRequestType> = new Set([
  'documentOpen',
  'documentChange',
  'documentSave',
  'documentClose',
]);

/**
 * Request types whose processing services internally call
 * PrerequisiteOrchestrationService.runPrerequisitesForLspRequestType().
 *
 * Step 6 atomicity enforcement: these types must NOT be dispatched to
 * pool workers because InFlightPrerequisiteRegistry is per-process —
 * cross-worker dedup would silently fail. They fall back to local
 * coordinator execution where the single registry provides dedup.
 *
 * Step 11 must explicitly opt each type into worker dispatch after
 * implementing coordinator-mediated prerequisite coordination.
 */
const PREREQUISITE_REQUIRING_TYPES: ReadonlySet<LSPRequestType> = new Set([
  'hover',
  'definition',
  'completion',
  'signatureHelp',
  'documentSymbol',
  'references',
  'rename',
  'diagnostics',
  'documentOpen',
]);

/**
 * Maps LSP request types to wire DTOs and routes them to the correct
 * topology member. Injected into LSPQueueManager via setWorkerDispatcher().
 */
export class WorkerTopologyDispatcher implements WorkerDispatchStrategy {
  private available = true;

  constructor(
    private readonly topology: WorkerTopology,
    private readonly logger: LoggerInterface,
  ) {}

  isAvailable(): boolean {
    return this.available;
  }

  setAvailable(v: boolean): void {
    this.available = v;
  }

  canDispatch(type: LSPRequestType): boolean {
    if (PREREQUISITE_REQUIRING_TYPES.has(type)) {
      return false;
    }
    return true;
  }

  async dispatch(type: LSPRequestType, params: unknown): Promise<unknown> {
    if (DATA_OWNER_TYPES.has(type)) {
      return this.dispatchToDataOwner(type, params);
    }
    return this.dispatchToEnrichmentPool(type, params);
  }

  /**
   * Create a batch ingestion dispatcher for WorkspaceBatchHandler.
   * Sends decoded entries to the data-owner worker via WorkspaceBatchIngest.
   */
  createBatchIngestionDispatcher(): (
    sessionId: string,
    entries: Array<{
      uri: string;
      content: string;
      languageId: string;
      version: number;
    }>,
  ) => Promise<{ processedCount: number }> {
    return async (sessionId, entries) => {
      this.logger.debug(
        () =>
          '[WorkerDispatch] → dataOwner: WorkspaceBatchIngest ' +
          `(session=${sessionId}, entries=${entries.length})`,
      );
      const msg = new WorkspaceBatchIngest({ sessionId, entries });
      const eff = this.topology.dataOwner.executeEffect(msg);
      return Effect.runPromise(eff);
    };
  }

  // -- private routing helpers ------------------------------------------------

  private async dispatchToDataOwner(
    type: LSPRequestType,
    params: unknown,
  ): Promise<unknown> {
    const p = params as Record<string, any>;
    const msg = this.buildDataOwnerMessage(type, p);
    this.logger.debug(() => `[WorkerDispatch] → dataOwner: ${type}`);
    const eff = this.topology.dataOwner.executeEffect(
      msg as any,
    ) as Effect.Effect<unknown, unknown, never>;
    return Effect.runPromise(eff);
  }

  private async dispatchToEnrichmentPool(
    type: LSPRequestType,
    params: unknown,
  ): Promise<unknown> {
    const msg = this.buildEnrichmentMessage(
      type,
      params as Record<string, any>,
    );
    this.logger.debug(() => `[WorkerDispatch] → enrichmentPool: ${type}`);
    const eff = this.topology.enrichmentPool.executeEffect(
      msg as any,
    ) as Effect.Effect<unknown, unknown, never>;
    const response = await Effect.runPromise(eff);
    return (response as { result: unknown }).result;
  }

  private buildDataOwnerMessage(
    type: LSPRequestType,
    p: Record<string, any>,
  ): DataOwnerRequest {
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
          contentChanges: p.contentChanges ?? [],
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

  private buildEnrichmentMessage(
    type: LSPRequestType,
    p: Record<string, any>,
  ): EnrichmentSearchRequest {
    switch (type) {
      case 'hover':
        return new DispatchHover({
          textDocument: { uri: p.textDocument?.uri },
          position: {
            line: p.position?.line,
            character: p.position?.character,
          },
        });
      case 'definition':
        return new DispatchDefinition({
          textDocument: { uri: p.textDocument?.uri },
          position: {
            line: p.position?.line,
            character: p.position?.character,
          },
        });
      case 'references':
        return new DispatchReferences({
          textDocument: { uri: p.textDocument?.uri },
          position: {
            line: p.position?.line,
            character: p.position?.character,
          },
          context: {
            includeDeclaration: p.context?.includeDeclaration ?? false,
          },
        });
      case 'implementation':
        return new DispatchImplementation({
          textDocument: { uri: p.textDocument?.uri },
          position: {
            line: p.position?.line,
            character: p.position?.character,
          },
        });
      case 'documentSymbol':
        return new DispatchDocumentSymbol({
          textDocument: { uri: p.textDocument?.uri },
        });
      case 'codeLens':
        return new DispatchCodeLens({
          textDocument: { uri: p.textDocument?.uri },
        });
      case 'diagnostics':
        return new DispatchDiagnostic({
          textDocument: { uri: p.textDocument?.uri },
        });
      default:
        return new DispatchGenericLspRequest({
          requestType: type as any,
          params: p,
        });
    }
  }
}
