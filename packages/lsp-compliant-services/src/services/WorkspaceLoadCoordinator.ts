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
  RequestWorkspaceLoadParams,
  WorkspaceLoadCompleteParams,
} from '@salesforce/apex-lsp-shared';
import { Effect, Ref } from 'effect';

/**
 * Module-level Refs for tracking workspace load state.
 * Initialized once at module load time.
 */
const isLoadedRef = Effect.runSync(Ref.make(false));
const isLoadingRef = Effect.runSync(Ref.make(false));
const hasFailedRef = Effect.runSync(Ref.make(false));

/**
 * Send workspace load request notification to client (pure Effect)
 * Returns immediately (fire-and-forget notification)
 *
 * @param connection Connection for server-client communication
 * @param logger Logger for debug/error messages
 * @param workDoneToken Optional progress token from client
 * @returns Effect that sends notification and returns immediately
 */
function sendRequestWorkspaceLoadNotification(
  connection: Connection,
  logger: LoggerInterface,
  workDoneToken?: ProgressToken,
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    const notificationStartTime = Date.now();
    const tokenStatus = workDoneToken ? 'present' : 'none';
    logger.debug(
      () =>
        `[WORKSPACE-LOAD] Sending request notification (workDoneToken: ${tokenStatus}) at ${notificationStartTime}`,
    );

    // sendNotification is synchronous and returns void
    try {
      connection.sendNotification('apex/requestWorkspaceLoad', {
        workDoneToken,
      } as RequestWorkspaceLoadParams);
    } catch (error) {
      logger.error(
        () => `[WORKSPACE-LOAD] Failed to send request notification: ${error}`,
      );
      return;
    }

    const notificationDuration = Date.now() - notificationStartTime;
    logger.debug(
      () =>
        `[WORKSPACE-LOAD] Request notification sent in ${notificationDuration}ms`,
    );
  });
}

/**
 * Handle workspace load complete notification from client
 * Updates server state based on notification
 *
 * @param params Notification parameters
 * @param logger Logger for debug/error messages
 * @returns Effect that updates state
 */
export function onWorkspaceLoadComplete(
  params: WorkspaceLoadCompleteParams,
  logger: LoggerInterface,
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    logger.debug(
      () =>
        `[WORKSPACE-LOAD] Received workspace load complete notification: ${JSON.stringify(params)}`,
    );

    if (params.success) {
      yield* Ref.set(isLoadedRef, true);
      yield* Ref.set(isLoadingRef, false);
      yield* Ref.set(hasFailedRef, false);
      logger.debug(
        () => '[WORKSPACE-LOAD] Workspace load completed successfully',
      );
    } else {
      yield* Ref.set(hasFailedRef, true);
      yield* Ref.set(isLoadingRef, false);
      yield* Ref.set(isLoadedRef, false);
      logger.error(
        () =>
          `[WORKSPACE-LOAD] Workspace load failed: ${params.error ?? 'Unknown error'}`,
      );
    }
  });
}

/**
 * Handle workspace load failed notification from client
 * Updates server state based on notification
 *
 * @param params Notification parameters
 * @param logger Logger for debug/error messages
 * @returns Effect that updates state
 */
export function onWorkspaceLoadFailed(
  params: WorkspaceLoadCompleteParams,
  logger: LoggerInterface,
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    logger.debug(
      () =>
        `[WORKSPACE-LOAD] Received workspace load failed notification: ${JSON.stringify(params)}`,
    );

    yield* Ref.set(hasFailedRef, true);
    yield* Ref.set(isLoadingRef, false);
    yield* Ref.set(isLoadedRef, false);
    logger.error(
      () =>
        `[WORKSPACE-LOAD] Workspace load failed: ${params.error ?? 'Unknown error'}`,
    );
  });
}

/**
 * Ensure workspace is loaded (pure Effect, can be queued)
 * Checks local state, sends notification if needed
 * Returns Effect that can be queued for non-blocking operation
 * Use isWorkspaceLoaded(), isWorkspaceLoading(), hasWorkspaceLoadFailed() to check state
 *
 * @param connection Connection for server-client communication
 * @param logger Logger for debug/error messages
 * @param workDoneToken Optional progress token from client
 * @returns Effect that resolves immediately (fire-and-forget notification)
 */
export function ensureWorkspaceLoaded(
  connection: Connection,
  logger: LoggerInterface,
  workDoneToken?: ProgressToken,
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    // Check local state first
    const isLoaded = yield* Ref.get(isLoadedRef);
    const isLoading = yield* Ref.get(isLoadingRef);

    if (isLoaded) {
      logger.debug(() => 'Workspace already loaded (from local state)');
      return;
    }

    if (isLoading) {
      logger.debug(() => 'Workspace currently loading (from local state)');
      return;
    }

    // Not loaded and not loading - send notification to request load
    logger.debug(() => 'Requesting workspace load via notification');
    yield* Ref.set(isLoadingRef, true);
    yield* Ref.set(hasFailedRef, false);

    // Send notification (fire-and-forget)
    yield* sendRequestWorkspaceLoadNotification(
      connection,
      logger,
      workDoneToken,
    );
  });
}

/**
 * Check if workspace is loaded
 *
 * @returns true if workspace is loaded, false otherwise
 */
export function isWorkspaceLoaded(): boolean {
  return Effect.runSync(Ref.get(isLoadedRef));
}

/**
 * Check if workspace load is currently in progress
 *
 * @returns true if load is in progress, false otherwise
 */
export function isWorkspaceLoading(): boolean {
  return Effect.runSync(Ref.get(isLoadingRef));
}

/**
 * Check if workspace load has failed
 *
 * @returns true if load has failed, false otherwise
 */
export function hasWorkspaceLoadFailed(): boolean {
  return Effect.runSync(Ref.get(hasFailedRef));
}

/**
 * Reset the workspace load state (useful for testing)
 */
export function reset(): void {
  Effect.runSync(Ref.set(isLoadedRef, false));
  Effect.runSync(Ref.set(isLoadingRef, false));
  Effect.runSync(Ref.set(hasFailedRef, false));
}
