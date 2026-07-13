/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Typed sender + handler surface for all 13 canonical `apex/*` methods.
 *
 * Direction-aware:
 * - clientToServer methods get typed SENDER functions (9)
 * - serverToClient methods get typed `on*` handler registrations (4)
 *
 * Factory accepts the existing `_registerIncomingNotification` and
 * `registerIncomingRequest` closures via dependency injection rather than
 * re-implementing their middleware composition.
 */

import { Ref, Runtime } from 'effect';
import {
  APEX_METHODS,
  type Disposable,
  type FindMissingArtifactParams,
  type FindMissingArtifactResult,
  type RequestWorkspaceLoadParams,
  type SendWorkspaceBatchParams,
  type SendWorkspaceBatchResult,
  type ProcessWorkspaceBatchesParams,
  type ProcessWorkspaceBatchesResult,
  type WorkspaceLoadCompleteParams,
  type WorkspaceLoadFailedParams,
  type QueueStateParams,
  type QueueStateResult,
  type GraphDataParams,
  type GraphDataResult,
  type ProfilingStartParams,
  type ProfilingStartResult,
  type ProfilingStopParams,
  type ProfilingStopResult,
  type ProfilingStatusParams,
  type ProfilingStatusResult,
  type QueueStateChangedParams,
  type WorkspaceIngestionCompleteParams,
} from '@salesforce/apex-lsp-shared';

// ---------------------------------------------------------------------------
// Public API surface interface
// ---------------------------------------------------------------------------

/**
 * Typed sender methods for clientToServer `apex/*` requests/notifications.
 */
export interface ApexMethodSenders {
  /** Send `apex/sendWorkspaceBatch` request. */
  readonly sendWorkspaceBatch: (
    params: SendWorkspaceBatchParams,
  ) => Promise<SendWorkspaceBatchResult>;

  /** Send `apex/processWorkspaceBatches` request. */
  readonly processWorkspaceBatches: (
    params: ProcessWorkspaceBatchesParams,
  ) => Promise<ProcessWorkspaceBatchesResult>;

  /** Send `apex/workspaceLoadComplete` notification. */
  readonly workspaceLoadComplete: (params: WorkspaceLoadCompleteParams) => void;

  /** Send `apex/workspaceLoadFailed` notification. */
  readonly workspaceLoadFailed: (params: WorkspaceLoadFailedParams) => void;

  /** Send `apex/queueState` request. */
  readonly queueState: (params: QueueStateParams) => Promise<QueueStateResult>;

  /** Send `apex/graphData` request. */
  readonly graphData: (params: GraphDataParams) => Promise<GraphDataResult>;

  /** Send `apex/profiling/start` request. */
  readonly profilingStart: (
    params: ProfilingStartParams,
  ) => Promise<ProfilingStartResult>;

  /** Send `apex/profiling/stop` request. */
  readonly profilingStop: (
    params: ProfilingStopParams,
  ) => Promise<ProfilingStopResult>;

  /** Send `apex/profiling/status` request. */
  readonly profilingStatus: (
    params: ProfilingStatusParams,
  ) => Promise<ProfilingStatusResult>;
}

/**
 * Handler registrations for serverToClient `apex/*` methods.
 */
export interface ApexMethodHandlers {
  /**
   * Register a handler for the `apex/findMissingArtifact` server request.
   * Returns a Disposable that, when disposed, reverts to the default
   * `{ notFound: true }` fallback handler.
   */
  readonly onFindMissingArtifact: (
    handler: (
      params: FindMissingArtifactParams,
    ) => FindMissingArtifactResult | Promise<FindMissingArtifactResult>,
  ) => Disposable;

  /**
   * Register a handler for the `apex/requestWorkspaceLoad` notification.
   * Returns a Disposable that removes the handler.
   */
  readonly onRequestWorkspaceLoad: (
    handler: (params: RequestWorkspaceLoadParams) => void,
  ) => Disposable;

  /**
   * Register a handler for the `apex/workspaceIngestionComplete` notification.
   * Returns a Disposable that removes the handler.
   */
  readonly onWorkspaceIngestionComplete: (
    handler: (params: WorkspaceIngestionCompleteParams) => void,
  ) => Disposable;

  /**
   * Register a handler for the `apex/queueStateChanged` notification.
   * Returns a Disposable that removes the handler.
   */
  readonly onQueueStateChanged: (
    handler: (params: QueueStateChangedParams) => void,
  ) => Disposable;
}

/**
 * The full typed apex/* method surface: senders + handler registrations.
 */
export interface ApexMethodSurface
  extends ApexMethodSenders, ApexMethodHandlers {}

// ---------------------------------------------------------------------------
// Factory dependencies (injected from makeCore closures)
// ---------------------------------------------------------------------------

/**
 * Options for {@link createApexMethodSurface}. Accepts the closures from
 * `makeCore` so the surface module composes over existing middleware without
 * re-implementing the chain.
 */
export interface ApexMethodSurfaceOptions {
  /**
   * The existing `sendRequestThroughChain` closure — sends a request via
   * the outgoing middleware chain.
   */
  readonly sendRequest: <R>(method: string, params?: unknown) => Promise<R>;

  /**
   * The existing `sendNotificationThroughChain` closure — sends a notification
   * via the outgoing middleware chain (synchronous).
   */
  readonly sendNotification: (method: string, params?: unknown) => void;

  /**
   * The existing `registerIncomingRequest` closure — registers an incoming
   * request handler that flows through middleware.
   */
  readonly registerIncomingRequest: (
    method: string,
    rawHandler: (params: unknown) => unknown | Promise<unknown>,
  ) => Disposable;

  /**
   * The existing `_registerIncomingNotification` closure — registers an
   * incoming notification handler that flows through middleware.
   */
  readonly registerIncomingNotification: (
    method: string,
    rawHandler: (params: unknown) => void,
  ) => Disposable;

  /**
   * The `cleanupRef` from makeCore — disposables pushed here are torn down
   * when the scope closes.
   */
  readonly cleanupRef: Ref.Ref<ReadonlyArray<Disposable>>;

  /**
   * The captured runtime from makeCore — used for synchronous Ref operations.
   */
  readonly runtime: Runtime.Runtime<never>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the typed `apex/*` method surface. All methods delegate to the
 * injected closures (which already compose middleware). No Effect types leak
 * into the returned surface.
 */
export const createApexMethodSurface = (
  options: ApexMethodSurfaceOptions,
): ApexMethodSurface => {
  const {
    sendRequest,
    sendNotification,
    registerIncomingRequest,
    registerIncomingNotification,
    cleanupRef,
    runtime,
  } = options;

  // Helper to push a disposable to cleanupRef
  const pushCleanup = (d: Disposable): void => {
    Runtime.runSync(runtime)(Ref.update(cleanupRef, (ds) => [...ds, d]));
  };

  // Helper to remove a specific disposable from cleanupRef
  const removeCleanup = (d: Disposable): void => {
    Runtime.runSync(runtime)(
      Ref.update(cleanupRef, (ds) => ds.filter((x) => x !== d)),
    );
  };

  // --- clientToServer SENDERS (9) ---

  const sendWorkspaceBatch = (
    params: SendWorkspaceBatchParams,
  ): Promise<SendWorkspaceBatchResult> =>
    sendRequest<SendWorkspaceBatchResult>(
      APEX_METHODS.sendWorkspaceBatch.method,
      params,
    );

  const processWorkspaceBatches = (
    params: ProcessWorkspaceBatchesParams,
  ): Promise<ProcessWorkspaceBatchesResult> =>
    sendRequest<ProcessWorkspaceBatchesResult>(
      APEX_METHODS.processWorkspaceBatches.method,
      params,
    );

  const workspaceLoadComplete = (params: WorkspaceLoadCompleteParams): void => {
    sendNotification(APEX_METHODS.workspaceLoadComplete.method, params);
  };

  const workspaceLoadFailed = (params: WorkspaceLoadFailedParams): void => {
    sendNotification(APEX_METHODS.workspaceLoadFailed.method, params);
  };

  const queueState = (params: QueueStateParams): Promise<QueueStateResult> =>
    sendRequest<QueueStateResult>(APEX_METHODS.queueState.method, params);

  const graphData = (params: GraphDataParams): Promise<GraphDataResult> =>
    sendRequest<GraphDataResult>(APEX_METHODS.graphData.method, params);

  const profilingStart = (
    params: ProfilingStartParams,
  ): Promise<ProfilingStartResult> =>
    sendRequest<ProfilingStartResult>(
      APEX_METHODS.profilingStart.method,
      params,
    );

  const profilingStop = (
    params: ProfilingStopParams,
  ): Promise<ProfilingStopResult> =>
    sendRequest<ProfilingStopResult>(APEX_METHODS.profilingStop.method, params);

  const profilingStatus = (
    params: ProfilingStatusParams,
  ): Promise<ProfilingStatusResult> =>
    sendRequest<ProfilingStatusResult>(
      APEX_METHODS.profilingStatus.method,
      params,
    );

  // --- serverToClient HANDLER REGISTRATIONS (4) ---

  // Track the current findMissingArtifact registration so it can be swapped
  let currentFindMissingArtifactDisposable: Disposable | null = null;

  /**
   * Default fallback: always answers `{ notFound: true }`.
   */
  const defaultFindMissingArtifactHandler = (
    _params: unknown,
  ): FindMissingArtifactResult => ({ notFound: true });

  // Register the default handler at surface-creation time
  currentFindMissingArtifactDisposable = registerIncomingRequest(
    APEX_METHODS.findMissingArtifact.method,
    defaultFindMissingArtifactHandler,
  );
  pushCleanup(currentFindMissingArtifactDisposable);

  const onFindMissingArtifact = (
    handler: (
      params: FindMissingArtifactParams,
    ) => FindMissingArtifactResult | Promise<FindMissingArtifactResult>,
  ): Disposable => {
    // Dispose the current registration (default or previously-set handler)
    if (currentFindMissingArtifactDisposable) {
      removeCleanup(currentFindMissingArtifactDisposable);
      currentFindMissingArtifactDisposable.dispose();
    }

    // Register the new handler
    const newDisposable = registerIncomingRequest(
      APEX_METHODS.findMissingArtifact.method,
      handler as (params: unknown) => unknown | Promise<unknown>,
    );
    currentFindMissingArtifactDisposable = newDisposable;
    pushCleanup(newDisposable);

    // Return a Disposable that reverts to the default fallback
    return {
      dispose: () => {
        removeCleanup(newDisposable);
        newDisposable.dispose();
        // Re-register the default fallback
        const fallback = registerIncomingRequest(
          APEX_METHODS.findMissingArtifact.method,
          defaultFindMissingArtifactHandler,
        );
        currentFindMissingArtifactDisposable = fallback;
        pushCleanup(fallback);
      },
    };
  };

  const onRequestWorkspaceLoad = (
    handler: (params: RequestWorkspaceLoadParams) => void,
  ): Disposable => {
    const disposable = registerIncomingNotification(
      APEX_METHODS.requestWorkspaceLoad.method,
      handler as (params: unknown) => void,
    );
    pushCleanup(disposable);
    return {
      dispose: () => {
        removeCleanup(disposable);
        disposable.dispose();
      },
    };
  };

  const onWorkspaceIngestionComplete = (
    handler: (params: WorkspaceIngestionCompleteParams) => void,
  ): Disposable => {
    const disposable = registerIncomingNotification(
      APEX_METHODS.workspaceIngestionComplete.method,
      handler as (params: unknown) => void,
    );
    pushCleanup(disposable);
    return {
      dispose: () => {
        removeCleanup(disposable);
        disposable.dispose();
      },
    };
  };

  const onQueueStateChanged = (
    handler: (params: QueueStateChangedParams) => void,
  ): Disposable => {
    const disposable = registerIncomingNotification(
      APEX_METHODS.queueStateChanged.method,
      handler as (params: unknown) => void,
    );
    pushCleanup(disposable);
    return {
      dispose: () => {
        removeCleanup(disposable);
        disposable.dispose();
      },
    };
  };

  return {
    // Senders
    sendWorkspaceBatch,
    processWorkspaceBatches,
    workspaceLoadComplete,
    workspaceLoadFailed,
    queueState,
    graphData,
    profilingStart,
    profilingStop,
    profilingStatus,
    // Handlers
    onFindMissingArtifact,
    onRequestWorkspaceLoad,
    onWorkspaceIngestionComplete,
    onQueueStateChanged,
  };
};
