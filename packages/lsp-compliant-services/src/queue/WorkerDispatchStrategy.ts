/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { LSPRequestType } from './LSPRequestQueue';

/** Shape returned by getTopologyStatus() for dashboard display. */
export interface WorkerTopologyStatus {
  readonly enabled: boolean;
  readonly dataOwner: { readonly active: boolean };
  readonly requestPool: {
    readonly size: number;
    readonly active: boolean;
  };
  readonly resourceLoader: { readonly active: boolean } | null;
  readonly compilation: { readonly active: boolean };
  readonly dispatchedCount: number;
  readonly coordinatorOnlyTypes: readonly string[];
}

/**
 * Strategy for dispatching queued LSP requests to worker threads.
 *
 * When set on LSPQueueManager, the queue's createQueuedItem wraps
 * `dispatch()` instead of calling the local ServiceRegistry handler.
 * The scheduler (priority ordering, concurrency limits, starvation
 * relief) is unchanged — only the Effect inside each QueuedItem changes.
 *
 * Implementations live in the `apex-ls` package (WorkerTopologyDispatcher)
 * because they depend on @effect/platform worker types.
 */
export interface WorkerDispatchStrategy {
  dispatch(type: LSPRequestType, params: unknown): Promise<unknown>;
  isAvailable(): boolean;
  canDispatch(type: LSPRequestType): boolean;
  /**
   * Whether this request type is dispatched to the request pool (a stateless
   * reader over the dataOwner graph).
   */
  dispatchesToPool?(type: LSPRequestType): boolean;
  /**
   * Whether this request type is dispatched to the data-owner worker. Document-
   * lifecycle types (documentOpen/Change/Save/Close) route here so the data-
   * owner accumulates symbols instead of the coordinator compiling locally.
   */
  dispatchesToDataOwner?(type: LSPRequestType): boolean;
  /**
   * Whether the given document is currently open in the editor. When open, a
   * compile is (or soon will be) in flight, so a request-pool read for the file
   * should defer until symbols are ready rather than racing an empty graph.
   * Optional: when absent, the cold-read gate is skipped entirely.
   */
  isFileOpen?(uri: string): boolean;
  /**
   * Block until the data-owner has merged the symbol graph for {uri, version},
   * or report why it can't. Replaces the old presence-poll: the data-owner arms
   * a per-URI latch when it stores an open/change and resolves it when the
   * compile's write-back merges, so the gate awaits a deterministic signal
   * rather than spinning. `reason` lets the gate distinguish a genuine timeout
   * (a slow compile) from "no compile is pending" (nothing to wait for — fall
   * back at once). Optional: when absent, the gate is skipped entirely.
   */
  awaitSymbolDataReady?(
    uri: string,
    version: number,
    timeoutMs: number,
  ): Promise<{
    ready: boolean;
    reason?: 'no-compile-pending' | 'timeout' | 'stale-version';
  }>;
  getTopologyStatus?(): WorkerTopologyStatus;
}
