/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Transport isolation layer (Step 12).
 *
 * Abstracts the "send request, await response" pattern away from the
 * concrete @effect/platform Worker implementation. Domain logic
 * depends on these interfaces; only the adapter (e.g.
 * EffectPlatformWorkerTransport) imports platform-specific modules.
 */

import { Effect } from 'effect';
import type { WorkerRole } from '@salesforce/apex-lsp-shared';

// ---------------------------------------------------------------------------
// Handle types — opaque to consumers
// ---------------------------------------------------------------------------

/** Opaque handle to a single spawned worker. */
export interface WorkerHandle {
  readonly _tag: 'WorkerHandle';
  readonly role: WorkerRole;
}

/** Opaque handle to a pool of workers sharing the same role. */
export interface PoolHandle {
  readonly _tag: 'PoolHandle';
  readonly role: WorkerRole;
  readonly size: number;
}

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class TransportSpawnError {
  readonly _tag = 'TransportSpawnError';
  constructor(
    readonly role: WorkerRole,
    readonly cause: unknown,
  ) {}
}

export class TransportSendError {
  readonly _tag = 'TransportSendError';
  constructor(
    readonly message: string,
    readonly cause: unknown,
  ) {}
}

// ---------------------------------------------------------------------------
// Single-worker transport
// ---------------------------------------------------------------------------

export interface WorkerTransport {
  /**
   * Spawn a worker with the given role. The transport sends WorkerInit
   * automatically before returning the handle.
   */
  spawn(role: WorkerRole): Effect.Effect<WorkerHandle, TransportSpawnError>;

  /**
   * Send a serialized request to a worker and await the response.
   * The request must be an @effect/schema-encoded tagged request.
   */
  send<R>(
    handle: WorkerHandle,
    request: R,
  ): Effect.Effect<unknown, TransportSendError>;

  /** Gracefully shut down a worker. */
  shutdown(handle: WorkerHandle): Effect.Effect<void>;
}

// ---------------------------------------------------------------------------
// Pool transport
// ---------------------------------------------------------------------------

export interface WorkerPoolTransport {
  /**
   * Spawn a pool of workers with the given role and size.
   * Each worker receives WorkerInit automatically.
   */
  makePool(
    role: WorkerRole,
    size: number,
  ): Effect.Effect<PoolHandle, TransportSpawnError>;

  /**
   * Dispatch a request to any available worker in the pool.
   * The pool implementation decides which worker receives it.
   */
  dispatch<R>(
    pool: PoolHandle,
    request: R,
  ): Effect.Effect<unknown, TransportSendError>;

  /** Shut down all workers in the pool. */
  shutdownPool(pool: PoolHandle): Effect.Effect<void>;
}

// ---------------------------------------------------------------------------
// Combined transport — convenience union for topology setup
// ---------------------------------------------------------------------------

export interface WorkerTopologyTransport
  extends WorkerTransport, WorkerPoolTransport {}
