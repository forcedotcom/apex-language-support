/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { LSPRequestType } from './LSPRequestQueue';

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
  /**
   * Send a request of the given LSP type to the appropriate worker
   * and return the result. The returned promise resolves when the
   * worker responds; rejects on worker error or timeout.
   */
  dispatch(type: LSPRequestType, params: unknown): Promise<unknown>;

  /**
   * Whether worker dispatch is currently active.
   * Returns false before topology initialisation, in browser
   * environments, or when the experiment flag is off.
   * When false, LSPQueueManager falls back to local handler execution.
   */
  isAvailable(): boolean;

  /**
   * Whether a specific request type can be dispatched to a worker.
   * Returns false for request types that require prerequisite
   * orchestration (Step 6 atomicity enforcement) — these must
   * run on the coordinator thread where InFlightPrerequisiteRegistry
   * provides cross-request deduplication.
   *
   * When false, LSPQueueManager falls back to local handler execution
   * for that type even if isAvailable() is true.
   */
  canDispatch(type: LSPRequestType): boolean;
}
