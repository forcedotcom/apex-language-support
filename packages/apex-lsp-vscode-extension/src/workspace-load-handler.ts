/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Effect, Ref, Context, Layer, pipe, Scope } from 'effect';
import type {
  LoadWorkspaceParams,
  LoadWorkspaceResult,
  ProgressToken,
  WorkspaceLoadCompleteParams,
  WorkspaceLoadReason,
} from '@salesforce/apex-lsp-shared';
import type { ApexClientCore } from '@salesforce/apex-lsp-client';
import { getDefaultDocumentSelectors } from '@salesforce/apex-lsp-shared';
import type { DocumentSelector } from 'vscode-languageserver-protocol';
import { loadWorkspaceForServer } from './workspace-loader';

// WorkspaceState service
export interface WorkspaceState {
  readonly isLoading: Ref.Ref<boolean>;
  readonly hasLoaded: Ref.Ref<boolean>;
  readonly hasFailed: Ref.Ref<boolean>;
}

export const WorkspaceState = Context.Tag('WorkspaceState')<
  WorkspaceState,
  WorkspaceState
>();

// Create shared Refs at module level to ensure state persists across Effect.runPromise calls
// Each Effect.runPromise creates a new runtime, but these Refs are shared across all runtimes
// Initialize them synchronously using Effect.runSync to ensure they exist before any async operations
const initializeSharedRefs = Effect.gen(function* (_) {
  return {
    isLoading: yield* _(Ref.make(false)),
    hasLoaded: yield* _(Ref.make(false)),
    hasFailed: yield* _(Ref.make(false)),
  };
});

// Run synchronously to create the Refs once at module load time
// This creates singleton Refs that persist across all Effect.runPromise calls
const sharedState = Effect.runSync(initializeSharedRefs);
const scopesWithWorkspaceReset = new WeakSet<Scope.CloseableScope>();

// Use Layer.succeed to provide the pre-created singleton state
// This ensures all requests share the same Refs regardless of runtime context
export const WorkspaceStateLive = Layer.succeed(WorkspaceState, sharedState);

// Access service
const getWorkspaceState = WorkspaceState;

// Helpers
const checkWorkspaceState = Effect.gen(function* (_) {
  const state = yield* _(getWorkspaceState);
  return {
    isWorkspaceLoading: yield* _(Ref.get(state.isLoading)),
    hasWorkspaceLoaded: yield* _(Ref.get(state.hasLoaded)),
    hasWorkspaceFailed: yield* _(Ref.get(state.hasFailed)),
  };
});

const setWorkspaceLoading = (flag: boolean) =>
  pipe(
    getWorkspaceState,
    Effect.flatMap((s) => Ref.set(s.isLoading, flag)),
  );

const setWorkspaceLoaded = (flag: boolean) =>
  pipe(
    getWorkspaceState,
    Effect.flatMap((s) => Ref.set(s.hasLoaded, flag)),
  );

const setWorkspaceFailed = (flag: boolean) =>
  pipe(
    getWorkspaceState,
    Effect.flatMap((s) => Ref.set(s.hasFailed, flag)),
  );

export const resetWorkspaceState = (state: WorkspaceState) =>
  Effect.all([
    Ref.set(state.isLoading, false),
    Ref.set(state.hasLoaded, false),
    Ref.set(state.hasFailed, false),
  ]).pipe(Effect.asVoid);

export const resetSharedWorkspaceState = resetWorkspaceState(sharedState);

const validateDocumentSelector = Effect.succeed(
  getDefaultDocumentSelectors('all'),
);

// Loader
const launchWorkspaceLoaderEffect = (
  languageClient: ApexClientCore,
  workDoneToken: ProgressToken | undefined,
  documentSelector: DocumentSelector,
  reason?: WorkspaceLoadReason,
) =>
  Effect.gen(function* (_) {
    yield* _(setWorkspaceLoading(true));
    yield* _(setWorkspaceFailed(false)); // Reset failure state

    const result = yield* _(
      pipe(
        Effect.tryPromise({
          try: (signal) =>
            loadWorkspaceForServer(
              languageClient,
              workDoneToken,
              documentSelector,
              reason,
              signal,
            ),
          catch: (error) => error,
        }),
        Effect.tapError((e) =>
          Effect.logError(`Failed to load workspace: ${String(e)}`),
        ),
        Effect.either, // Convert to Either instead of catchAll
      ),
    );

    if (result._tag === 'Left') {
      yield* _(setWorkspaceFailed(true));
      // Send failure notification to server
      const error = result.left as unknown;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      yield* _(
        Effect.tryPromise(() =>
          Promise.resolve(
            languageClient.workspaceLoadFailed({
              success: false,
              error: errorMessage,
            } as WorkspaceLoadCompleteParams),
          ),
        ).pipe(Effect.catchAll(() => Effect.void)),
      );
    } else {
      yield* _(setWorkspaceLoaded(true));
      // Send success notification to server
      yield* _(
        Effect.tryPromise(() =>
          Promise.resolve(
            languageClient.workspaceLoadComplete({
              success: true,
            } as WorkspaceLoadCompleteParams),
          ),
        ).pipe(Effect.catchAll(() => Effect.void)),
      );
    }
  }).pipe(Effect.ensuring(setWorkspaceLoading(false)));

export const makeWorkspaceLoadScope = Scope.make();

// WorkspaceLoaderService
export class WorkspaceLoaderService extends Effect.Service<WorkspaceLoaderService>()(
  'WorkspaceLoaderService',
  {
    scoped: Effect.gen(function* (_) {
      const workspaceState = yield* _(WorkspaceState);

      return {
        startWorkspaceLoad: (
          languageClient: ApexClientCore,
          workDoneToken?: ProgressToken,
          documentSelector?: DocumentSelector,
          reason?: WorkspaceLoadReason,
          scope?: Scope.CloseableScope,
        ) =>
          Effect.gen(function* (_) {
            const {
              isWorkspaceLoading,
              hasWorkspaceLoaded,
              hasWorkspaceFailed,
            } = yield* _(checkWorkspaceState);

            if (hasWorkspaceLoaded) {
              return { accepted: true, alreadyLoaded: true } as const;
            }

            if (isWorkspaceLoading) {
              return { accepted: true, inProgress: true } as const;
            }

            const selector =
              documentSelector ?? (yield* _(validateDocumentSelector));

            // If previously failed, allow retry and indicate retryable=true
            const isRetry = hasWorkspaceFailed === true;

            if (scope && !scopesWithWorkspaceReset.has(scope)) {
              scopesWithWorkspaceReset.add(scope);
              yield* _(
                Scope.addFinalizer(
                  scope,
                  resetWorkspaceState(workspaceState).pipe(
                    Effect.ensuring(
                      Effect.sync(() => scopesWithWorkspaceReset.delete(scope)),
                    ),
                  ),
                ),
              );
            }

            yield* _(
              scope
                ? Effect.forkIn(
                    launchWorkspaceLoaderEffect(
                      languageClient,
                      workDoneToken,
                      selector,
                      reason,
                    ),
                    scope,
                  )
                : Effect.forkDaemon(
                    launchWorkspaceLoaderEffect(
                      languageClient,
                      workDoneToken,
                      selector,
                      reason,
                    ),
                  ),
            );

            return isRetry
              ? ({ accepted: true, retryable: true } as const)
              : ({ accepted: true } as const);
          }),
        handleLoadWorkspace: (
          params: LoadWorkspaceParams,
          languageClient: ApexClientCore,
        ) =>
          Effect.flatMap(WorkspaceLoaderService, (svc) =>
            svc.startWorkspaceLoad(
              languageClient,
              params.workDoneToken,
              undefined,
            ),
          ),
      };
    }),
  },
) {}

// WorkspaceLoaderServiceLive Layer - Default should include dependencies
export const WorkspaceLoaderServiceLive = WorkspaceLoaderService.Default.pipe(
  Layer.provide(WorkspaceStateLive),
);

// Helper function for queryOnly state checking
const queryWorkspaceState = Effect.gen(function* (_) {
  const { isWorkspaceLoading, hasWorkspaceLoaded, hasWorkspaceFailed } =
    yield* _(checkWorkspaceState);

  if (hasWorkspaceLoaded) {
    return { loaded: true } as const;
  } else if (isWorkspaceLoading) {
    return { loading: true } as const;
  } else if (hasWorkspaceFailed) {
    return { failed: true } as const;
  } else {
    return { loaded: false } as const;
  }
});

// Export wrapper function
// Note: This function is deprecated - workspace load now uses notifications
// Kept for backward compatibility during migration
export const handleLoadWorkspace = (
  params: LoadWorkspaceParams,
  languageClient: ApexClientCore,
) => {
  // If queryOnly is true, return current state without triggering load
  if (params.queryOnly) {
    return queryWorkspaceState as Effect.Effect<
      LoadWorkspaceResult,
      never,
      never
    >;
  }

  // Normal load behavior - will send notifications on completion
  return pipe(
    WorkspaceLoaderService,
    Effect.flatMap((service) =>
      service.startWorkspaceLoad(
        languageClient,
        params.workDoneToken,
        undefined,
      ),
    ),
  ) as Effect.Effect<LoadWorkspaceResult, never, never>;
};

// Public helper for startup-triggered load
export const startWorkspaceLoad = (
  languageClient: ApexClientCore,
  workDoneToken?: ProgressToken,
  documentSelector?: DocumentSelector,
  reason?: WorkspaceLoadReason,
  scope?: Scope.CloseableScope,
) =>
  pipe(
    WorkspaceLoaderService,
    Effect.flatMap((service) =>
      service.startWorkspaceLoad(
        languageClient,
        workDoneToken,
        documentSelector,
        reason,
        scope,
      ),
    ),
  );

// Reset (for tests)
export const resetWorkspaceLoadingState = Effect.gen(function* (_) {
  const state = yield* _(getWorkspaceState);
  yield* _(resetWorkspaceState(state));
});
