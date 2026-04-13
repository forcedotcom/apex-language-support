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
} from '@salesforce/apex-lsp-shared';
import type {
  LoggerInterface,
  DataOwnerRequest,
  EnrichmentSearchRequest,
  ResourceLoaderRequest,
} from '@salesforce/apex-lsp-shared';

// ---------------------------------------------------------------------------
// Worker Layer factory
// ---------------------------------------------------------------------------

export const makeNodeWorkerLayer = (
  workerScript: string,
  workerOptions?: WorkerThreads.WorkerOptions,
) =>
  NodeWorker.layer(
    (_id: number) => new WorkerThreads.Worker(workerScript, workerOptions),
  );

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
