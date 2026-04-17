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
  readonly enrichmentPool: {
    readonly size: number;
    readonly active: boolean;
  };
  readonly resourceLoader: { readonly active: boolean } | null;
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
  getTopologyStatus?(): WorkerTopologyStatus;
}
