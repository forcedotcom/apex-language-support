/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Effect-platform-backed implementation of WorkerTopologyTransport (Step 12).
 *
 * Wraps @effect/platform Worker/WorkerPool behind the transport-agnostic
 * interface defined in lsp-compliant-services. This is the only module
 * that imports @effect/platform Worker APIs at the coordinator level.
 */

import * as Worker from '@effect/platform/Worker';
import { Effect, Layer, Scope } from 'effect';
import { WorkerInit, WIRE_PROTOCOL_VERSION } from '@salesforce/apex-lsp-shared';
import type { WorkerRole } from '@salesforce/apex-lsp-shared';
import type {
  WorkerTopologyTransport,
  WorkerHandle,
  PoolHandle,
  TransportSpawnError,
  TransportSendError,
} from '@salesforce/apex-lsp-compliant-services';

// ---------------------------------------------------------------------------
// Internal handle types that carry the @effect/platform worker ref
// ---------------------------------------------------------------------------

interface InternalWorkerHandle extends WorkerHandle {
  readonly worker: Worker.SerializedWorker<any>;
}

interface InternalPoolHandle extends PoolHandle {
  readonly pool: Worker.SerializedWorkerPool<any>;
}

function isInternalWorkerHandle(h: WorkerHandle): h is InternalWorkerHandle {
  return 'worker' in h;
}

function isInternalPoolHandle(h: PoolHandle): h is InternalPoolHandle {
  return 'pool' in h;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export class EffectPlatformWorkerTransport implements WorkerTopologyTransport {
  constructor(
    private readonly workerLayer: Layer.Layer<
      Worker.WorkerManager | Worker.Spawner
    >,
    private readonly scope: Scope.Scope,
  ) {}

  spawn(role: WorkerRole): Effect.Effect<WorkerHandle, TransportSpawnError> {
    return Worker.makeSerialized<any>({
      initialMessage: () =>
        new WorkerInit({ role, protocolVersion: WIRE_PROTOCOL_VERSION }),
    }).pipe(
      Effect.map(
        (worker): WorkerHandle =>
          ({ _tag: 'WorkerHandle', role, worker }) as InternalWorkerHandle,
      ),
      Effect.provideService(Scope.Scope, this.scope),
      Effect.provide(this.workerLayer),
      Effect.mapError(
        (cause) =>
          ({ _tag: 'TransportSpawnError', role, cause }) as TransportSpawnError,
      ),
    );
  }

  send<R>(
    handle: WorkerHandle,
    request: R,
  ): Effect.Effect<unknown, TransportSendError> {
    if (!isInternalWorkerHandle(handle)) {
      return Effect.fail({
        _tag: 'TransportSendError',
        message: 'Invalid handle: not an EffectPlatformWorkerTransport handle',
        cause: undefined,
      } as TransportSendError);
    }
    return (
      handle.worker.executeEffect(request as any) as Effect.Effect<unknown>
    ).pipe(
      Effect.mapError(
        (cause) =>
          ({
            _tag: 'TransportSendError',
            message: `Send to ${handle.role} failed`,
            cause,
          }) as TransportSendError,
      ),
    );
  }

  shutdown(): Effect.Effect<void> {
    return Effect.void;
  }

  makePool(
    role: WorkerRole,
    size: number,
  ): Effect.Effect<PoolHandle, TransportSpawnError> {
    return Worker.makePoolSerialized<any>({
      size,
      initialMessage: () =>
        new WorkerInit({ role, protocolVersion: WIRE_PROTOCOL_VERSION }),
    }).pipe(
      Effect.map(
        (pool): PoolHandle =>
          ({ _tag: 'PoolHandle', role, size, pool }) as InternalPoolHandle,
      ),
      Effect.provideService(Scope.Scope, this.scope),
      Effect.provide(this.workerLayer),
      Effect.mapError(
        (cause) =>
          ({ _tag: 'TransportSpawnError', role, cause }) as TransportSpawnError,
      ),
    );
  }

  dispatch<R>(
    pool: PoolHandle,
    request: R,
  ): Effect.Effect<unknown, TransportSendError> {
    if (!isInternalPoolHandle(pool)) {
      return Effect.fail({
        _tag: 'TransportSendError',
        message: 'Invalid pool handle',
        cause: undefined,
      } as TransportSendError);
    }
    return (
      pool.pool.executeEffect(request as any) as Effect.Effect<unknown>
    ).pipe(
      Effect.mapError(
        (cause) =>
          ({
            _tag: 'TransportSendError',
            message: `Dispatch to ${pool.role} pool failed`,
            cause,
          }) as TransportSendError,
      ),
    );
  }

  shutdownPool(): Effect.Effect<void> {
    return Effect.void;
  }
}
