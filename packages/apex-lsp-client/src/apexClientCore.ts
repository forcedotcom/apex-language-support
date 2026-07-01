/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, Exit, Option, Ref, Runtime, Scope } from 'effect';
import {
  DEFAULT_APEX_SETTINGS,
  type ApexLanguageServerSettings,
  type Disposable,
  type InitializeParams,
  type InitializeResult,
} from '@salesforce/apex-lsp-shared';
import type { RpcConnection } from './rpcConnection';
import type { ApexClientMiddleware } from './apexClientMiddleware';
import {
  logMiddlewareEvent,
  loggingMiddleware,
} from './middleware/loggingMiddleware';
import { EffectLspLoggerLive } from './logging/effectLspLoggerLayer';
import type {
  CompletionItem,
  CompletionList,
  CompletionParams,
  Definition,
  DefinitionParams,
  DocumentSymbol,
  DocumentSymbolParams,
  Hover,
  HoverParams,
  LocationLink,
  SymbolInformation,
} from './lspPassThroughs';
import {
  composeRequestChain,
  composeNotificationChain,
} from './middleware/composeMiddleware';

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
 * Caller-supplied `initialize` params. `initializationOptions` is intentionally
 * omitted: it is always populated from `settings` by the core (see
 * {@link ApexClientCore.initialize}), so accepting it here would be a footgun —
 * the value would be silently discarded.
 */
export type ApexClientInitializeParams = Omit<
  Partial<InitializeParams>,
  'initializationOptions'
>;

/**
 * Error thrown when a lifecycle method is invoked after {@link
 * ApexClientCore.dispose} has run. The transport has already been torn down, so
 * the call fast-fails rather than sending on a dead connection.
 */
export class ApexClientDisposedError extends Error {
  constructor(operation: string) {
    super(`Cannot ${operation}: ApexClientCore has been disposed`);
    this.name = 'ApexClientDisposedError';
  }
}

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
    params?: ApexClientInitializeParams,
  ) => Promise<InitializeResult>;
  readonly shutdown: () => Promise<void>;
  readonly use: (mw: ApexClientMiddleware) => Disposable;
  readonly request: <R>(method: string, params?: unknown) => Promise<R>;
  readonly notify: (method: string, params?: unknown) => void;
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

  // --- Middleware-composed send/receive helpers ---

  /**
   * Send a request through the outgoing middleware chain. Terminal function is
   * `connection.sendRequest`. Reads `middlewareRef` at invocation time (late-bound).
   */
  const sendRequestThroughChain = <R>(
    method: string,
    params?: unknown,
  ): Promise<R> => {
    const middlewares = Runtime.runSync(runtime)(Ref.get(middlewareRef));
    return composeRequestChain<unknown, R>(
      middlewares,
      (p) => connection.sendRequest<R>(method, p),
      'outgoing',
      method,
      params,
    );
  };

  /**
   * Send a notification through the outgoing middleware chain (synchronous per D2).
   * Terminal function is `connection.sendNotification`.
   */
  const sendNotificationThroughChain = (
    method: string,
    params?: unknown,
  ): void => {
    const middlewares = Runtime.runSync(runtime)(Ref.get(middlewareRef));
    composeNotificationChain<unknown>(
      middlewares,
      (p) => {
        connection.sendNotification(method, p);
      },
      'outgoing',
      method,
      params,
    );
  };

  /**
   * Register an incoming request handler that flows through the middleware chain.
   * The composed handler reads `middlewareRef` at call time (late-bound per D1).
   */
  const registerIncomingRequest = (
    method: string,
    rawHandler: (params: unknown) => unknown | Promise<unknown>,
  ): Disposable =>
    connection.onRequest(method, (params: unknown) => {
      const middlewares = Runtime.runSync(runtime)(Ref.get(middlewareRef));
      return composeRequestChain<unknown, unknown>(
        middlewares,
        (p) => Promise.resolve(rawHandler(p)),
        'incoming',
        method,
        params,
      );
    });

  /**
   * Register an incoming notification handler that flows through the middleware
   * chain. Synchronous per D2. Late-bound middlewareRef per D1.
   *
   * Not currently wired to a public method or CoreHandle — available for future
   * incoming notification handlers (e.g. typed `apex/*` surface in 3.1).
   */
  const _registerIncomingNotification = (
    method: string,
    rawHandler: (params: unknown) => void,
  ): Disposable =>
    connection.onNotification(method, (params: unknown) => {
      const middlewares = Runtime.runSync(runtime)(Ref.get(middlewareRef));
      composeNotificationChain<unknown>(
        middlewares,
        (p) => rawHandler(p),
        'incoming',
        method,
        params,
      );
    });

  // Default findMissingArtifact responder: { notFound: true }. Registered here,
  // before traffic. Logging middleware observes the incoming request via the chain.
  const findMissingArtifactDisposable = registerIncomingRequest(
    FIND_MISSING_ARTIFACT_METHOD,
    // TODO(3.1): delegate to a registered onFindMissingArtifact handler when
    // the typed apex/* surface lands; fall back to { notFound: true }.
    (_params) => ({ notFound: true }),
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

  // Guard that fast-fails a lifecycle call once the core has been disposed (the
  // transport is gone, so we must not run the handshake against a dead
  // connection — see use-after-dispose).
  const ensureNotDisposed = (operation: string) =>
    Effect.gen(function* () {
      const disposed = yield* Ref.get(disposedRef);
      if (disposed) {
        return yield* Effect.fail(new ApexClientDisposedError(operation));
      }
    });

  // Idempotent initialize. Memoizes the SUCCESS only — a transient failure does
  // NOT poison the instance, so a later call re-attempts the handshake (unlike
  // `Effect.cached`, which memoizes failures too). A mutex serializes
  // first-time computation so concurrent first calls observe first-wins
  // semantics: the winner's args are captured inside the critical section and
  // later callers see the memoized result.
  const initResultRef = yield* Ref.make<Option.Option<InitializeResult>>(
    Option.none(),
  );
  const initMutex = yield* Effect.makeSemaphore(1);

  const runInitialize = (
    settings: ApexLanguageServerSettings,
    params?: ApexClientInitializeParams,
  ) =>
    initMutex
      .withPermits(1)(
        Effect.gen(function* () {
          // First writer inside the critical section wins; if a prior call
          // already succeeded, return its result without re-sending.
          const existing = yield* Ref.get(initResultRef);
          if (Option.isSome(existing)) {
            return existing.value;
          }
          const initParams: InitializeParams = {
            processId:
              typeof process !== 'undefined' && process.pid
                ? process.pid
                : null,
            rootUri: null,
            capabilities: {},
            ...params,
            initializationOptions: settings,
          };
          // Strict LSP order: the `initialized` notification is sent ONLY after
          // the `initialize` response resolves — never fire-and-forget/parallel.
          const result = yield* Effect.promise(() =>
            connection.sendRequest<InitializeResult>('initialize', initParams),
          );
          yield* Effect.promise(async () => {
            await connection.sendNotification('initialized', {});
          });
          // Record success only — failures above never reach here, so they are
          // not memoized and a later call can retry.
          yield* Ref.set(initResultRef, Option.some(result));
          return result;
        }),
      )
      .pipe(Effect.withSpan('ApexClientCore.initialize'));

  const initialize = (
    settings: ApexLanguageServerSettings,
    params?: ApexClientInitializeParams,
  ): Promise<InitializeResult> =>
    Runtime.runPromise(runtime)(
      ensureNotDisposed('initialize').pipe(
        Effect.zipRight(runInitialize(settings, params)),
      ),
    );

  // Idempotent shutdown: shutdown request then exit notification, sequentially.
  // Memoizes success only (same rationale as initialize) and serializes via a
  // mutex.
  const shutdownDoneRef = yield* Ref.make(false);
  const shutdownMutex = yield* Effect.makeSemaphore(1);

  const runShutdown = shutdownMutex
    .withPermits(1)(
      Effect.gen(function* () {
        if (yield* Ref.get(shutdownDoneRef)) {
          return;
        }
        yield* Effect.promise(() => connection.sendRequest<void>('shutdown'));
        yield* Effect.promise(async () => {
          await connection.sendNotification('exit');
        });
        yield* Ref.set(shutdownDoneRef, true);
      }),
    )
    .pipe(Effect.withSpan('ApexClientCore.shutdown'));

  const shutdown = (): Promise<void> =>
    Runtime.runPromise(runtime)(
      ensureNotDisposed('shutdown').pipe(Effect.zipRight(runShutdown)),
    );

  const use = (mw: ApexClientMiddleware): Disposable => {
    if (Runtime.runSync(runtime)(Ref.get(disposedRef))) {
      throw new ApexClientDisposedError('register middleware');
    }
    Runtime.runSync(runtime)(Ref.update(middlewareRef, (ms) => [...ms, mw]));
    return {
      dispose: () => {
        Runtime.runSync(runtime)(
          Ref.update(middlewareRef, (ms) => ms.filter((m) => m !== mw)),
        );
      },
    };
  };

  /**
   * Generic request escape hatch: sends method+params through the outgoing
   * middleware chain. Guards against use-after-dispose.
   */
  const request = <R>(method: string, params?: unknown): Promise<R> => {
    if (Runtime.runSync(runtime)(Ref.get(disposedRef))) {
      return Promise.reject(new ApexClientDisposedError('request'));
    }
    return sendRequestThroughChain<R>(method, params);
  };

  /**
   * Generic notification pass-through: sends method+params through the outgoing
   * middleware chain (synchronous per D2). Guards against use-after-dispose.
   */
  const notify = (method: string, params?: unknown): void => {
    if (Runtime.runSync(runtime)(Ref.get(disposedRef))) {
      throw new ApexClientDisposedError('notify');
    }
    sendNotificationThroughChain(method, params);
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
    request,
    notify,
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
 * (strictly sequential; idempotent on success, with the first concurrent
 * caller's args winning), `shutdown` sends `shutdown` then `exit` (idempotent
 * on success), and `dispose` closes the construction scope (finalizers run
 * LIFO: handler/middleware cleanup first, transport teardown last). After
 * `dispose`, lifecycle calls fast-fail with {@link ApexClientDisposedError}.
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
      request: built.request,
      notify: built.notify,
      isDisposed: built.isDisposed,
      dispose: closeScope,
    };
    return new ApexClientCore(handle, closeScope);
  }

  /**
   * Send LSP `initialize` (with `initializationOptions = settings`, default
   * {@link DEFAULT_APEX_SETTINGS}) and, only after its result resolves,
   * `initialized`. The `initializationOptions` field is always sourced from
   * `settings`, so it is not accepted on `params` (see {@link
   * ApexClientInitializeParams}).
   *
   * Idempotent on success: repeated calls return the memoized result and do not
   * re-send. A failed handshake is NOT memoized — a later call re-attempts.
   * Concurrent first-time calls are serialized; the first caller's args win.
   * Rejects with {@link ApexClientDisposedError} if called after `dispose()`.
   */
  initialize(
    settings: ApexLanguageServerSettings = DEFAULT_APEX_SETTINGS,
    params?: ApexClientInitializeParams,
  ): Promise<InitializeResult> {
    return this.handle.initialize(settings, params);
  }

  /**
   * Send LSP `shutdown` then `exit`, sequentially. Idempotent on success.
   * Rejects with {@link ApexClientDisposedError} if called after `dispose()`.
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
   * Generic request escape hatch: sends `method` + `params` through the
   * registered middleware chain to `connection.sendRequest`. Rejects with
   * {@link ApexClientDisposedError} if called after `dispose()`.
   */
  request<R>(method: string, params?: unknown): Promise<R> {
    return this.handle.request<R>(method, params);
  }

  /**
   * Generic notification pass-through: sends `method` + `params` through the
   * registered middleware chain (synchronous per D2). Throws
   * {@link ApexClientDisposedError} if called after `dispose()`.
   */
  notify(method: string, params?: unknown): void {
    this.handle.notify(method, params);
  }

  /**
   * Send `textDocument/hover` through the middleware chain.
   */
  hover(params: HoverParams): Promise<Hover | null> {
    return this.request<Hover | null>('textDocument/hover', params);
  }

  /**
   * Send `textDocument/completion` through the middleware chain.
   */
  completion(
    params: CompletionParams,
  ): Promise<CompletionList | CompletionItem[] | null> {
    return this.request<CompletionList | CompletionItem[] | null>(
      'textDocument/completion',
      params,
    );
  }

  /**
   * Send `textDocument/definition` through the middleware chain.
   */
  definition(
    params: DefinitionParams,
  ): Promise<Definition | LocationLink[] | null> {
    return this.request<Definition | LocationLink[] | null>(
      'textDocument/definition',
      params,
    );
  }

  /**
   * Send `textDocument/documentSymbol` through the middleware chain.
   */
  documentSymbol(
    params: DocumentSymbolParams,
  ): Promise<DocumentSymbol[] | SymbolInformation[] | null> {
    return this.request<DocumentSymbol[] | SymbolInformation[] | null>(
      'textDocument/documentSymbol',
      params,
    );
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
