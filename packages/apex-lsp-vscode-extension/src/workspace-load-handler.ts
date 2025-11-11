/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Effect, Ref, Context, Layer, pipe } from 'effect';
import type {
  ClientInterface,
  LoadWorkspaceParams,
  LoadWorkspaceResult,
  ProgressToken,
} from '@salesforce/apex-lsp-shared';
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

const validateDocumentSelector = Effect.succeed([
  { scheme: 'file', language: 'apex' },
  { scheme: 'vscode-test-web', language: 'apex' },
  { scheme: 'apexlib', language: 'apex' },
]);

// Loader
const launchWorkspaceLoaderEffect = (
  languageClient: ClientInterface,
  workDoneToken: ProgressToken | undefined,
  documentSelector: any[],
) =>
  Effect.gen(function* (_) {
    yield* _(setWorkspaceLoading(true));
    yield* _(setWorkspaceFailed(false)); // Reset failure state

    const result = yield* _(
      pipe(
        Effect.promise(() =>
          loadWorkspaceForServer(
            languageClient,
            workDoneToken,
            documentSelector,
          ),
        ),
        Effect.tapError((e) =>
          Effect.logError(`Failed to load workspace: ${String(e)}`),
        ),
        Effect.either, // Convert to Either instead of catchAll
      ),
    );

    if (result._tag === 'Left') {
      yield* _(setWorkspaceFailed(true));
    } else {
      yield* _(setWorkspaceLoaded(true));
    }
    yield* _(setWorkspaceLoading(false));
  });

// WorkspaceLoaderService
export class WorkspaceLoaderService extends Effect.Service<WorkspaceLoaderService>()(
  'WorkspaceLoaderService',
  {
    scoped: Effect.gen(function* (_) {
      yield* _(WorkspaceState);

      return {
        startWorkspaceLoad: (
          languageClient: ClientInterface,
          workDoneToken?: ProgressToken,
          documentSelector?: any[],
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

            yield* _(
              Effect.forkDaemon(
                launchWorkspaceLoaderEffect(
                  languageClient,
                  workDoneToken,
                  selector,
                ),
              ),
            );

            return isRetry
              ? ({ accepted: true, retryable: true } as const)
              : ({ accepted: true } as const);
          }),
        handleLoadWorkspace: (
          params: LoadWorkspaceParams,
          languageClient: ClientInterface,
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
export const handleLoadWorkspace = (
  params: LoadWorkspaceParams,
  languageClient: ClientInterface,
) => {
  // If queryOnly is true, return current state without triggering load
  if (params.queryOnly) {
    return queryWorkspaceState as Effect.Effect<
      LoadWorkspaceResult,
      never,
      never
    >;
  }

  // Normal load behavior
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
  languageClient: ClientInterface,
  workDoneToken?: ProgressToken,
  documentSelector?: any[],
) =>
  pipe(
    WorkspaceLoaderService,
    Effect.flatMap((service) =>
      service.startWorkspaceLoad(
        languageClient,
        workDoneToken,
        documentSelector,
      ),
    ),
  );

// Reset (for tests)
export const resetWorkspaceLoadingState = Effect.gen(function* (_) {
  const state = yield* _(getWorkspaceState);
  yield* _(Ref.set(state.isLoading, false));
  yield* _(Ref.set(state.hasLoaded, false));
  yield* _(Ref.set(state.hasFailed, false));
});
