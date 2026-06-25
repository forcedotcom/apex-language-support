/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, Exit, Ref, Runtime, Scope } from 'effect';
import {
  DEFAULT_APEX_SETTINGS,
  type ApexLanguageServerSettings,
  type Disposable,
  type InitializeParams,
  type InitializeResult,
} from '@salesforce/apex-lsp-shared';
import type { RpcConnection } from './RpcConnection';
import type { ApexClientMiddleware } from './ApexClientMiddleware';
import {
  logMiddlewareEvent,
  loggingMiddleware,
} from './middleware/loggingMiddleware';
import { EffectLspLoggerLive } from './logging/EffectLspLoggerLayer';

/**
 * The server→client request the core answers by default. Temporary literal —
 * replace with the shared registry constant + `FindMissingArtifactResult` type
 * in 1.1/3.1.
 *
 * TODO(1.1/3.1): replace `'apex/findMissingArtifact'` and the inline
 * `{ notFound: true }` with the canonical registry constant and the
 * `FindMissingArtifactResult` type from `@salesforce/apex-lsp-shared`.
 */
const FIND_MISSING_ARTIFACT_METHOD = 'apex/findMissingArtifact';

/**
 * Options for constructing an {@link ApexClientCore}.
 */
export interface ApexClientCoreOptions {
  /**
   * Additional middlewares to register at construction, after the default
   * logging middleware (which is always registered first).
   */
  readonly middlewares?: ReadonlyArray<ApexClientMiddleware>;
}

/**
 * Internal handle captured by the public class. Holds the closures the public
 * methods delegate to plus the function that closes the construction scope
 * (= dispose). No mutable lifecycle state lives on the class — it all lives in
 * `Ref`s + the `Scope` inside {@link makeCore}.
 */
interface CoreHandle {
  readonly initialize: (
    settings: ApexLanguageServerSettings,
    params?: Partial<InitializeParams>,
  ) => Promise<InitializeResult>;
  readonly shutdown: () => Promise<void>;
  readonly use: (mw: ApexClientMiddleware) => Disposable;
  readonly isDisposed: () => boolean;
  readonly dispose: () => Promise<void>;
}

/**
 * Build a fully-wired core over an {@link RpcConnection}. Returns an Effect that
 * requires a `Scope`; finalizers registered here run when that scope closes
 * (= {@link ApexClientCore.dispose}).
 *
 * Finalizer ordering is load-bearing. Finalizers run LIFO, so we register
 * `connection.dispose()` FIRST (it must run LAST — transport teardown) and the
 * handler/middleware cleanup LAST (it must run FIRST, so a final log flush /
 * `onRequest` unsubscribe never hits an already-closed transport).
 *
 * Default handlers are registered during construction, BEFORE any message
 * flows. The passed `connection` MUST NOT be started/listening yet (see the
 * precondition on {@link ApexClientCore.create}).
 */
const makeCore = Effect.fn('ApexClientCore.make')(function* (
  connection: RpcConnection,
  options: ApexClientCoreOptions,
) {
  // Capture the surrounding runtime (carries the provided logger Layer + Scope)
  // so the boundary closures run their child effects with the SAME runtime
  // rather than spawning a fresh, layer-less one.
  const runtime = yield* Effect.runtime();

  // --- mutable state lives here, never as class fields ---
  const disposedRef = yield* Ref.make(false);
  // Default logging middleware is always first; caller middlewares follow.
  const middlewareRef = yield* Ref.make<ReadonlyArray<ApexClientMiddleware>>([
    loggingMiddleware,
    ...(options.middlewares ?? []),
  ]);
  // Disposables to tear down when the scope closes (handler registrations,
  // and the Disposable each `use()` hands back removes that entry).
  const cleanupRef = yield* Ref.make<ReadonlyArray<Disposable>>([]);

  // Register transport teardown FIRST so LIFO runs it LAST.
  yield* Effect.addFinalizer(() =>
    Effect.promise(async () => {
      await connection.dispose();
    }),
  );

  // Default findMissingArtifact responder: { notFound: true }. Registered here,
  // before traffic. Logging middleware observes the incoming request.
  const findMissingArtifactDisposable = connection.onRequest(
    FIND_MISSING_ARTIFACT_METHOD,
    (params: unknown) => {
      Runtime.runFork(runtime)(
        logMiddlewareEvent(FIND_MISSING_ARTIFACT_METHOD, 'incoming'),
      );
      // TODO(3.1): delegate to a registered onFindMissingArtifact handler when
      // the typed apex/* surface lands; fall back to { notFound: true }.
      return { notFound: true };
    },
  );
  yield* Ref.update(cleanupRef, (ds) => [...ds, findMissingArtifactDisposable]);

  // Register handler/middleware cleanup LAST so LIFO runs it FIRST (before the
  // transport is torn down).
  yield* Effect.addFinalizer(() =>
    Effect.gen(function* () {
      yield* logMiddlewareEvent('dispose', 'outgoing');
      const cleanups = yield* Ref.get(cleanupRef);
      // Dispose in reverse registration order for symmetry with LIFO teardown.
      for (const d of [...cleanups].reverse()) {
        d.dispose();
      }
    }),
  );

  // Idempotent initialize. The first call's args win; the cached compute-once
  // primitive is created ONCE at construction and reads the stored args, so
  // repeated calls return the same InitializeResult and never re-send
  // initialize/initialized. Args live in a Ref (captured state), not a mutable
  // closure flag.
  const initArgsRef = yield* Ref.make<{
    readonly settings: ApexLanguageServerSettings;
    readonly params?: Partial<InitializeParams>;
  }>({ settings: DEFAULT_APEX_SETTINGS });

  const initializeEffect = Effect.gen(function* () {
    const { settings, params } = yield* Ref.get(initArgsRef);
    const initParams: InitializeParams = {
      processId:
        typeof process !== 'undefined' && process.pid ? process.pid : null,
      rootUri: null,
      capabilities: {},
      ...params,
      initializationOptions: settings,
    };
    // Strict LSP order: the `initialized` notification is sent ONLY after the
    // `initialize` response resolves — never fire-and-forget/parallel.
    const result = yield* Effect.promise(() =>
      connection.sendRequest<InitializeResult>('initialize', initParams),
    );
    yield* Effect.promise(async () => {
      await connection.sendNotification('initialized', {});
    });
    return result;
  }).pipe(Effect.withSpan('ApexClientCore.initialize'));
  const cachedInitialize = yield* Effect.cached(initializeEffect);

  const initialize = (
    settings: ApexLanguageServerSettings,
    params?: Partial<InitializeParams>,
  ): Promise<InitializeResult> =>
    Runtime.runPromise(runtime)(
      Effect.gen(function* () {
        // Record the first call's args; the cached effect reads them. Later
        // calls return the memoized result, so re-recording is harmless but we
        // keep first-wins semantics explicit.
        yield* Ref.set(initArgsRef, { settings, params });
        return yield* cachedInitialize;
      }),
    );

  // Idempotent shutdown: shutdown request then exit notification, sequentially.
  const shutdownEffect = Effect.gen(function* () {
    yield* Effect.promise(() => connection.sendRequest<void>('shutdown'));
    yield* Effect.promise(async () => {
      await connection.sendNotification('exit');
    });
  }).pipe(Effect.withSpan('ApexClientCore.shutdown'));
  const cachedShutdown = yield* Effect.cached(shutdownEffect);

  const shutdown = (): Promise<void> =>
    Runtime.runPromise(runtime)(cachedShutdown);

  const use = (mw: ApexClientMiddleware): Disposable => {
    Runtime.runSync(runtime)(Ref.update(middlewareRef, (ms) => [...ms, mw]));
    return {
      dispose: () => {
        Runtime.runSync(runtime)(
          Ref.update(middlewareRef, (ms) => ms.filter((m) => m !== mw)),
        );
      },
    };
  };

  // `Ref.get` is synchronous, so the disposed state can be read at the boundary
  // with `Runtime.runSync` — `isDisposed()` stays a plain `boolean` (matching
  // the shared `ClientInterface` contract) while the state still lives in a Ref.
  const isDisposed = (): boolean =>
    Runtime.runSync(runtime)(Ref.get(disposedRef));

  return {
    initialize,
    shutdown,
    use,
    isDisposed,
    disposedRef,
  };
});

/**
 * The transport-agnostic Apex LSP client core.
 *
 * `ApexClientCore` is a thin imperative shell over an Effect service body. It
 * holds a single immutable handle (closures + the construction `Scope`); all
 * lifecycle state (`disposed`, registered middleware, cleanup) lives in `Ref`s
 * and the `Scope` inside the Effect — never as mutable class fields. Public
 * methods return `Promise`/plain types and run the inner Effect at the boundary
 * (providing the logger Layer); no exported signature references an Effect type.
 *
 * Concern 1 (lifecycle): `initialize` sends LSP `initialize` then `initialized`
 * (strictly sequential; idempotent via `Effect.cached`), `shutdown` sends
 * `shutdown` then `exit` (idempotent), and `dispose` closes the construction
 * scope (finalizers run LIFO: handler/middleware cleanup first, transport
 * teardown last).
 *
 * Adapter delegation (4.1): when the embedded host lets `vscode-languageclient`
 * own the `initialize`/`shutdown` handshake, the adapter delegates lifecycle to
 * it instead of re-sending — wiring lands in 4.1.
 */
export class ApexClientCore {
  private readonly handle: CoreHandle;
  private readonly closeScope: () => Promise<void>;

  private constructor(handle: CoreHandle, closeScope: () => Promise<void>) {
    this.handle = handle;
    this.closeScope = closeScope;
  }

  /**
   * Construct a core over the given connection. Default handlers (logging
   * middleware + `findMissingArtifact` responder) are registered during
   * construction, before any message flows.
   *
   * Precondition (load-bearing): the passed `connection` MUST NOT be
   * started/listening yet. Handlers are registered here so they are in place
   * before `initialize()` runs and before the server can send
   * `apex/findMissingArtifact`. Adapter responsibility (2.3/4.1): create
   * connection → build the core (handlers register) → THEN start the connection.
   * This mirrors `language-server.ts`, which registers handlers before
   * `client.start()`. If an adapter passes a live connection, registration
   * races the initialize handshake.
   */
  static async create(
    connection: RpcConnection,
    options: ApexClientCoreOptions = {},
  ): Promise<ApexClientCore> {
    const scope = await Effect.runPromise(Scope.make());
    const built = await Effect.runPromise(
      makeCore(connection, options).pipe(
        Effect.provideService(Scope.Scope, scope),
        Effect.provide(EffectLspLoggerLive),
      ),
    );

    const closeScope = (): Promise<void> =>
      Effect.runPromise(
        Effect.gen(function* () {
          const already = yield* Ref.get(built.disposedRef);
          if (already) return;
          yield* Ref.set(built.disposedRef, true);
          yield* Scope.close(scope, Exit.void);
        }).pipe(Effect.provide(EffectLspLoggerLive)),
      );

    const handle: CoreHandle = {
      initialize: built.initialize,
      shutdown: built.shutdown,
      use: built.use,
      isDisposed: built.isDisposed,
      dispose: closeScope,
    };
    return new ApexClientCore(handle, closeScope);
  }

  /**
   * Send LSP `initialize` (with `initializationOptions = settings`, default
   * {@link DEFAULT_APEX_SETTINGS}) and, only after its result resolves,
   * `initialized`. Idempotent: repeated calls return the memoized result and do
   * not re-send.
   */
  initialize(
    settings: ApexLanguageServerSettings = DEFAULT_APEX_SETTINGS,
    params?: Partial<InitializeParams>,
  ): Promise<InitializeResult> {
    return this.handle.initialize(settings, params);
  }

  /**
   * Send LSP `shutdown` then `exit`, sequentially. Idempotent.
   */
  shutdown(): Promise<void> {
    return this.handle.shutdown();
  }

  /**
   * Register a middleware over the defaults; the returned `Disposable` removes
   * it from the registered set.
   */
  use(mw: ApexClientMiddleware): Disposable {
    return this.handle.use(mw);
  }

  /**
   * Whether the core has been disposed.
   */
  isDisposed(): boolean {
    return this.handle.isDisposed();
  }

  /**
   * Tear down: close the construction scope so finalizers run LIFO
   * (handler/middleware cleanup first, transport teardown last). Idempotent.
   */
  dispose(): Promise<void> {
    return this.closeScope();
  }
}
