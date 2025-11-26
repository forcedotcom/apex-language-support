/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, ProgressToken } from 'vscode-languageserver';
import {
  LoggerInterface,
  LoadWorkspaceParams,
  LoadWorkspaceResult,
  Priority,
} from '@salesforce/apex-lsp-shared';
import { Effect, Ref, Duration } from 'effect';
import { createQueuedItem, offer } from '@salesforce/apex-lsp-parser-ast';

/**
 * Result of workspace load operation
 */
export interface LoadResult {
  status: 'loaded' | 'failed' | 'timeout' | 'loading';
}

/**
 * Module-level Ref for tracking workspace load state.
 * Initialized once at module load time.
 */
const loadInProgressRef = Effect.runSync(Ref.make(false));

/**
 * Query workspace state without triggering load (pure Effect)
 *
 * @param connection Connection for server-client communication
 * @param logger Logger for debug/error messages
 * @returns Effect that resolves with workspace state
 */
function queryWorkspaceState(
  connection: Connection,
  logger: LoggerInterface,
): Effect.Effect<LoadWorkspaceResult, Error, never> {
  return Effect.gen(function* () {
    const result = yield* Effect.tryPromise({
      try: () =>
        connection.sendRequest('apex/loadWorkspace', {
          queryOnly: true,
        } as LoadWorkspaceParams),
      catch: (error) => error as Error,
    });

    logger.debug(
      () => `Workspace state query result: ${JSON.stringify(result)}`,
    );
    return result as LoadWorkspaceResult;
  }).pipe(
    Effect.catchAll((error) => {
      logger.error(() => `Failed to query workspace state: ${error}`);
      return Effect.succeed({
        error: `Failed to query workspace state: ${error}`,
      } as LoadWorkspaceResult);
    }),
  );
}

/**
 * Trigger workspace load on client (pure Effect, can be queued)
 * Returns Effect that sends load request but doesn't wait for completion
 *
 * @param connection Connection for server-client communication
 * @param logger Logger for debug/error messages
 * @param workDoneToken Optional progress token from client
 * @returns Effect that resolves with load result
 */
function triggerWorkspaceLoad(
  connection: Connection,
  logger: LoggerInterface,
  workDoneToken?: ProgressToken,
): Effect.Effect<LoadWorkspaceResult, Error, never> {
  return Effect.gen(function* () {
    const result = yield* Effect.tryPromise({
      try: () =>
        connection.sendRequest('apex/loadWorkspace', {
          workDoneToken,
        } as LoadWorkspaceParams),
      catch: (error) => error as Error,
    });

    logger.debug(() => `Workspace load result: ${JSON.stringify(result)}`);
    return result as LoadWorkspaceResult;
  }).pipe(
    Effect.catchAll((error) => {
      logger.error(() => `Failed to trigger workspace load: ${error}`);
      return Effect.succeed({
        error: `Failed to trigger workspace load: ${error}`,
      } as LoadWorkspaceResult);
    }),
  );
}

/**
 * Monitor workspace load progress (pure Effect)
 * Queries state periodically, yields to queue between checks
 * Re-queues itself if still loading
 *
 * @param connection Connection for server-client communication
 * @param logger Logger for debug/error messages
 * @param startTime Start time for timeout calculation
 * @param maxWaitTime Maximum time to wait in milliseconds
 * @param pollInterval Interval between checks in milliseconds
 * @returns Effect that resolves when load completes or times out
 */
function monitorWorkspaceLoad(
  connection: Connection,
  logger: LoggerInterface,
  startTime: number = Date.now(),
  maxWaitTime: number = 30000,
  pollInterval: number = 1000,
): Effect.Effect<LoadResult, Error, never> {
  return Effect.gen(function* () {
    // Yield control to queue before checking
    yield* Effect.yieldNow();

    // Check if timeout exceeded
    const elapsed = Date.now() - startTime;
    if (elapsed >= maxWaitTime) {
      logger.warn(() => 'Timeout waiting for client workspace load');
      yield* Ref.set(loadInProgressRef, false);
      return { status: 'timeout' } as LoadResult;
    }

    // Query workspace state
    const stateResult = yield* queryWorkspaceState(connection, logger);

    if ('loaded' in stateResult && stateResult.loaded) {
      logger.debug(() => 'Client workspace load completed');
      yield* Ref.set(loadInProgressRef, false);
      return { status: 'loaded' } as LoadResult;
    }

    if ('failed' in stateResult && stateResult.failed) {
      logger.debug(() => 'Client workspace load failed');
      yield* Ref.set(loadInProgressRef, false);
      return { status: 'failed' } as LoadResult;
    }

    // Still loading - check if load is still in progress before re-queuing
    const stillInProgress = yield* Ref.get(loadInProgressRef);
    if (!stillInProgress) {
      // Load completed/failed in another task, don't re-queue
      logger.debug(() => 'Workspace load completed in another task');
      return { status: 'loaded' } as LoadResult;
    }

    // Sleep and re-queue monitor task
    yield* Effect.sleep(Duration.millis(pollInterval));

    // Create and queue monitor task to continue checking
    const monitorEffect = monitorWorkspaceLoad(
      connection,
      logger,
      startTime,
      maxWaitTime,
      pollInterval,
    );

    const queuedItem = yield* createQueuedItem(
      monitorEffect,
      'workspace-load-monitor',
    );

    // Queue with low priority to not block other tasks
    yield* offer(Priority.Low, queuedItem);

    // Return intermediate status (monitor will continue)
    return { status: 'loading' } as LoadResult;
  });
}

/**
 * Ensure workspace is loaded (pure Effect, can be queued)
 * Queries state, triggers load if needed, queues monitor task
 * Returns Effect that can be queued for non-blocking operation
 *
 * @param connection Connection for server-client communication
 * @param logger Logger for debug/error messages
 * @param workDoneToken Optional progress token from client
 * @returns Effect that resolves when workspace load is initiated/monitored
 */
export function ensureWorkspaceLoaded(
  connection: Connection,
  logger: LoggerInterface,
  workDoneToken?: ProgressToken,
): Effect.Effect<LoadResult, Error, never> {
  return Effect.gen(function* () {
    // Check if load is already in progress
    const inProgress = yield* Ref.get(loadInProgressRef);
    if (inProgress) {
      logger.debug(
        () => 'Workspace load already in progress, monitoring existing load',
      );
      // Queue monitor task to wait for existing load
      const monitorEffect = monitorWorkspaceLoad(connection, logger);
      const queuedItem = yield* createQueuedItem(
        monitorEffect,
        'workspace-load-monitor',
      );
      yield* offer(Priority.Low, queuedItem);
      return { status: 'loading' } as LoadResult;
    }

    // Query current workspace state
    const stateResult = yield* queryWorkspaceState(connection, logger);

    if ('loaded' in stateResult && stateResult.loaded) {
      logger.debug(() => 'Workspace already loaded');
      return { status: 'loaded' } as LoadResult;
    }

    if ('loading' in stateResult && stateResult.loading) {
      logger.debug(
        () => 'Workspace currently loading on client, queuing monitor task',
      );
      // Client is loading, queue monitor task
      yield* Ref.set(loadInProgressRef, true);
      const monitorEffect = monitorWorkspaceLoad(connection, logger);
      const queuedItem = yield* createQueuedItem(
        monitorEffect,
        'workspace-load-monitor',
      );
      yield* offer(Priority.Low, queuedItem);
      return { status: 'loading' } as LoadResult;
    }

    if ('failed' in stateResult && stateResult.failed) {
      logger.debug(() => 'Previous workspace load failed, retrying');
      // Previous load failed, allow retry
    }

    // Trigger new workspace load
    logger.debug(() => 'Triggering workspace load');
    yield* Ref.set(loadInProgressRef, true);

    // Queue trigger task
    const triggerEffect = triggerWorkspaceLoad(
      connection,
      logger,
      workDoneToken,
    );
    const triggerQueuedItem = yield* createQueuedItem(
      triggerEffect,
      'workspace-load-trigger',
    );
    yield* offer(Priority.Normal, triggerQueuedItem);

    // Queue monitor task
    const monitorEffect = monitorWorkspaceLoad(connection, logger);
    const monitorQueuedItem = yield* createQueuedItem(
      monitorEffect,
      'workspace-load-monitor',
    );
    yield* offer(Priority.Low, monitorQueuedItem);

    return { status: 'loading' } as LoadResult;
  });
}

/**
 * Check if workspace load is currently in progress
 *
 * @returns true if load is in progress, false otherwise
 */
export function isLoadInProgress(): boolean {
  return Effect.runSync(Ref.get(loadInProgressRef));
}

/**
 * Reset the workspace load state (useful for testing)
 */
export function reset(): void {
  Effect.runSync(Ref.set(loadInProgressRef, false));
}
