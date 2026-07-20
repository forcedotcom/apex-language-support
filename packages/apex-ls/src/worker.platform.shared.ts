/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Platform-neutral worker logic shared by worker.platform.ts (Node) and
 * worker.platform.web.ts (Web/browser). Each entry file imports this module
 * with an explicit .ts extension — required because integration tests spawn
 * the entry files directly via tsx in a worker_threads subprocess, and tsx
 * cannot resolve bare relative specifiers in that context.
 *
 * Platform-specific values this module needs (coordinator assistance
 * transport, workerId, resource loader layer factory) are injected by each
 * shell via the setter functions below, called once at module load.
 */

import * as WorkerRunner from '@effect/platform/WorkerRunner';
import { Effect, LogLevel, Schema, Queue, Deferred, Option } from 'effect';
import type * as Tracer from 'effect/Tracer';
import {
  WorkerInit,
  PingWorker,
  WorkerRemoteStdlibWarmup,
  QuerySymbolSubset,
  AwaitSymbolReadiness,
  UpdateSymbolSubset,
  ResolveDepUris,
  ResolveDependentUris,
  WorkspaceBatchIngest,
  BeginWorkspaceLoadSession,
  DrainDeferredReferences,
  CompileDocument,
  WorkspaceBatchCompile,
  ResourceLoaderGetSymbolTable,
  ResourceLoaderGetFile,
  ResourceLoaderResolveClass,
  ResourceLoaderGetStandardNamespaces,
  DispatchDocumentOpen,
  DispatchDocumentChange,
  DispatchDocumentSave,
  DispatchDocumentClose,
  DispatchHover,
  DispatchDefinition,
  DispatchCompletion,
  DispatchSignatureHelp,
  DispatchCodeAction,
  DispatchReferences,
  DispatchImplementation,
  DispatchDocumentSymbol,
  DispatchCodeLens,
  DispatchDiagnostic,
  DispatchCrossFileEnrichment,
  DispatchGenericLspRequest,
  isAllowedTag,
  QueryGraphData,
  DataOwnerQuerySymbolByName,
  FindOccurrenceCandidates,
  WIRE_PROTOCOL_VERSION,
  ApexCapabilitiesManager,
  type WorkerRole,
  type WorkerLogLevel,
} from '@salesforce/apex-lsp-shared';
import { getDocumentStateCache } from '@salesforce/apex-lsp-compliant-services';
import type {
  DataOwnerServices,
  RequestServices,
} from '@salesforce/apex-lsp-compliant-services';
import type { SerializedSymbolTableData } from '@salesforce/apex-lsp-parser-ast';
import { getLogger } from '@salesforce/apex-lsp-shared';

// ---------------------------------------------------------------------------
// Schema union of all coordinator → worker requests
// WorkerAssistanceRequest excluded: it flows worker → coordinator
// ---------------------------------------------------------------------------

export const AllWorkerRequests = Schema.Union(
  WorkerInit,
  PingWorker,
  WorkerRemoteStdlibWarmup,
  QuerySymbolSubset,
  AwaitSymbolReadiness,
  UpdateSymbolSubset,
  ResolveDepUris,
  ResolveDependentUris,
  WorkspaceBatchIngest,
  BeginWorkspaceLoadSession,
  DrainDeferredReferences,
  QueryGraphData,
  DataOwnerQuerySymbolByName,
  FindOccurrenceCandidates,
  CompileDocument,
  WorkspaceBatchCompile,
  ResourceLoaderGetSymbolTable,
  ResourceLoaderGetFile,
  ResourceLoaderResolveClass,
  ResourceLoaderGetStandardNamespaces,
  DispatchDocumentOpen,
  DispatchDocumentChange,
  DispatchDocumentSave,
  DispatchDocumentClose,
  DispatchHover,
  DispatchDefinition,
  DispatchCompletion,
  DispatchSignatureHelp,
  DispatchCodeAction,
  DispatchReferences,
  DispatchImplementation,
  DispatchDocumentSymbol,
  DispatchCodeLens,
  DispatchDiagnostic,
  DispatchCrossFileEnrichment,
  DispatchGenericLspRequest,
);

// ---------------------------------------------------------------------------
// Minimal document interface matching the subset of TextDocument used
// by storage/processing services. Avoids importing the full
// vscode-languageserver-textdocument package in worker context.
// ---------------------------------------------------------------------------

export interface WorkerDocument {
  readonly uri: string;
  readonly languageId: string;
  readonly version: number;
  getText(): string;
  // Position/offset helpers. Completion (analyzeCompletionContext,
  // GeneralCompletionStrategy.getWordAtPosition) calls document.offsetAt(); a
  // bare object without it throws "offsetAt is not a function" and the request
  // returns zero items. These are optional so existing minimal WorkerDocuments
  // (hover/documentSymbol only use getText()) keep compiling; makeWorkerDocument
  // supplies real implementations for the enrichment path.
  offsetAt?(position: { line: number; character: number }): number;
  positionAt?(offset: number): { line: number; character: number };
}

/**
 * Build a WorkerDocument backed by `content` with working offsetAt/positionAt
 * helpers. The worker deliberately avoids importing the full
 * vscode-languageserver-textdocument package (see WorkerDocument), so we compute
 * line/character⇄offset from the text directly. Newlines are counted as part of
 * the preceding line (matching TextDocument's line-start indexing), so an
 * offset/position round-trips for the line/character values the LSP hands us.
 */
export function makeWorkerDocument(
  uri: string,
  content: string,
  version = 0,
): WorkerDocument {
  // Offsets of the first character of each line. lineStarts[0] === 0.
  const lineStarts: number[] = [0];
  for (let i = 0; i < content.length; i++) {
    if (content.charCodeAt(i) === 10 /* \n */) {
      lineStarts.push(i + 1);
    }
  }
  return {
    uri,
    languageId: 'apex',
    version,
    getText: () => content,
    offsetAt: (position) => {
      const line = Math.max(0, Math.min(position.line, lineStarts.length - 1));
      const lineStart = lineStarts[line];
      const lineEnd =
        line + 1 < lineStarts.length ? lineStarts[line + 1] : content.length;
      const maxChar = lineEnd - lineStart;
      return lineStart + Math.max(0, Math.min(position.character, maxChar));
    },
    positionAt: (offset) => {
      const clamped = Math.max(0, Math.min(offset, content.length));
      // Binary search for the line whose start is the greatest ≤ clamped.
      let low = 0;
      let high = lineStarts.length - 1;
      while (low < high) {
        const mid = Math.floor((low + high + 1) / 2);
        if (lineStarts[mid] <= clamped) {
          low = mid;
        } else {
          high = mid - 1;
        }
      }
      return { line: low, character: clamped - lineStarts[low] };
    },
  };
}

// ---------------------------------------------------------------------------
// Utility — deep clone for structured-clone-safe postMessage results
// ---------------------------------------------------------------------------

export function cloneForWire<T>(value: T): T | null {
  return value != null ? JSON.parse(JSON.stringify(value)) : null;
}

// ---------------------------------------------------------------------------
// Role state & guard
// ---------------------------------------------------------------------------

export let assignedRole: WorkerRole | null = null;

export function setAssignedRole(role: WorkerRole): void {
  assignedRole = role;
}

/**
 * Defects on role violation — these are programming errors (coordinator
 * misrouted a message) and should never happen in normal operation.
 */
export const guardRole = (tag: string): Effect.Effect<void> => {
  if (assignedRole === null) {
    return Effect.die(
      new Error(
        `WorkerRoleViolation: no role assigned yet, cannot handle '${tag}'`,
      ),
    );
  }
  if (!isAllowedTag(assignedRole, tag)) {
    return Effect.die(
      new Error(
        `WorkerRoleViolation: tag '${tag}' not allowed for role '${assignedRole}'`,
      ),
    );
  }
  return Effect.void;
};

// ---------------------------------------------------------------------------
// Worker log level (pure, platform-neutral — the transport that reads
// currentWorkerLogLevel to decide whether to post a message stays in each
// platform shell, since workerLogger/WorkerLoggerLayer differ structurally)
// ---------------------------------------------------------------------------

export const LOG_LEVEL_PRIORITY: Record<WorkerLogLevel, number> = {
  debug: 0,
  info: 1,
  warning: 2,
  error: 3,
};

export let currentWorkerLogLevel: WorkerLogLevel = 'error';

export function setWorkerLogLevel(level: string): void {
  if (level in LOG_LEVEL_PRIORITY) {
    currentWorkerLogLevel = level as WorkerLogLevel;
  }
}

export function effectLogLevelToWire(
  level: LogLevel.LogLevel,
): WorkerLogLevel | null {
  if (LogLevel.greaterThanEqual(level, LogLevel.Error)) return 'error';
  if (LogLevel.greaterThanEqual(level, LogLevel.Warning)) return 'warning';
  if (LogLevel.greaterThanEqual(level, LogLevel.Info)) return 'info';
  if (LogLevel.greaterThanEqual(level, LogLevel.Debug)) return 'debug';
  return null;
}

// ---------------------------------------------------------------------------
// Platform-specific value injection (DI shims)
//
// Each shell (worker.platform.ts / worker.platform.web.ts) calls these
// setters once, synchronously, at module load. Safe regardless of call
// order relative to this module's own top-level Effect.cached(...) blocks
// (Task 2/3), because Effect.cached defers the wrapped generator's body
// until the first time something actually runs the cached Effect — which
// only happens inside a request handler, well after both modules finish
// loading.
// ---------------------------------------------------------------------------

type AssistanceTransport = (
  method: string,
  params: unknown,
  blocking: boolean,
) => Promise<unknown>;

let _requestCoordinatorAssistancePromise: AssistanceTransport = () =>
  Promise.reject(new Error('assistance transport not initialized'));

export function setAssistanceTransport(fn: AssistanceTransport): void {
  _requestCoordinatorAssistancePromise = fn;
}

export function requestCoordinatorAssistancePromiseShared(
  method: string,
  params: unknown,
  blocking: boolean,
): Promise<unknown> {
  return _requestCoordinatorAssistancePromise(method, params, blocking);
}

type WorkerTracingHooks = {
  readonly initialize: (url: string, serviceName: string) => void;
  readonly provide: <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E, R>;
  readonly withParent: <A, E>(
    request: { readonly traceContext?: string },
    effect: Effect.Effect<A, E, never>,
  ) => Effect.Effect<A, E, never>;
};

let workerTracingHooks: WorkerTracingHooks = {
  initialize: () => {},
  provide: (effect) => effect,
  withParent: (_request, effect) => effect,
};

/**
 * Install Node-only tracing at the platform boundary. The browser worker leaves
 * the no-op hooks in place, so its bundle never imports OTEL or async_hooks.
 */
export function setWorkerTracingHooks(hooks: WorkerTracingHooks): void {
  workerTracingHooks = hooks;
}

export let workerId = 'uninitialized';

export function setWorkerId(id: string): void {
  workerId = id;
}

type ResourceLoaderLayerFactory = () => Promise<unknown>;

let _makeResourceLoaderRemoteLayer: ResourceLoaderLayerFactory = () => {
  throw new Error('resource loader layer factory not initialized');
};

export function setResourceLoaderLayerFactory(
  fn: ResourceLoaderLayerFactory,
): void {
  _makeResourceLoaderRemoteLayer = fn;
}

// 5th DI shim, not enumerated in the plan's 4-hook DI-boundary list: the
// WorkerRemoteStdlibWarmup handler (moving to shared in this task) calls
// warmRemoteStdlibNamespaceCache(), whose Node/Web bodies are structurally
// different (Node throws if the namespace map isn't initialized; Web
// swallows errors and has a differently-shaped response payload) and so
// stay in each platform shell, same rationale as makeResourceLoaderRemoteLayer.
type WarmRemoteStdlibNamespaceCache = () => Promise<void>;

let _warmRemoteStdlibNamespaceCache: WarmRemoteStdlibNamespaceCache = () => {
  throw new Error('remote stdlib namespace warmup not initialized');
};

export function setWarmRemoteStdlibNamespaceCache(
  fn: WarmRemoteStdlibNamespaceCache,
): void {
  _warmRemoteStdlibNamespaceCache = fn;
}

function warmRemoteStdlibNamespaceCacheShared(): Promise<void> {
  return _warmRemoteStdlibNamespaceCache();
}

// ---------------------------------------------------------------------------
// Data-owner internal tiered queue (Step 5)
//
// Reads (QuerySymbolSubset, etc.) get priority over writes
// (WorkspaceBatchIngest, DispatchDocument*). The processing loop
// drains all pending reads before processing one write, preventing
// bulk ingestion from starving enrichment-worker symbol queries.
// ---------------------------------------------------------------------------

export interface DOQueueItem {
  readonly eff: Effect.Effect<unknown, unknown>;
  readonly deferred: Deferred.Deferred<unknown, unknown>;
  readonly enqueuedAt: number;
  readonly queueDepth: number;
  readonly parentSpan: Option.Option<Tracer.AnySpan>;
  readonly trace?: {
    readonly spanName: string;
    readonly attributes?: Readonly<Record<string, unknown>>;
  };
}

export interface DOQueues {
  readonly read: Queue.Queue<DOQueueItem>;
  readonly write: Queue.Queue<DOQueueItem>;
}

const processItem = (item: DOQueueItem) =>
  Effect.gen(function* () {
    let execution = item.eff;
    if (item.trace) {
      const queueWaitMs = Date.now() - item.enqueuedAt;
      execution = Effect.gen(function* () {
        yield* Effect.annotateCurrentSpan({
          'data_owner.queue_wait_ms': queueWaitMs,
          'data_owner.queue_depth': item.queueDepth,
        });
        return yield* item.eff;
      }).pipe(
        Effect.withSpan(item.trace.spanName, {
          attributes: { ...item.trace.attributes },
        }),
      );
    }
    if (Option.isSome(item.parentSpan)) {
      execution = execution.pipe(Effect.withParentSpan(item.parentSpan.value));
    }

    // The queue loop is a daemon fiber created outside any individual worker
    // request runtime. Restoring only the parent span preserves IDs, but the
    // daemon still has the default no-op tracer, so its phase spans are never
    // exported. Re-provide the initialized worker tracer at the point where
    // queued work actually executes.
    execution = workerTracingHooks.provide(execution);

    const result = yield* Effect.either(execution);
    if (result._tag === 'Right') {
      yield* Deferred.succeed(item.deferred, result.right);
    } else {
      yield* Deferred.fail(item.deferred, result.left);
    }
  });

const initDataOwnerQueues: Effect.Effect<DOQueues> = Effect.cached(
  Effect.gen(function* () {
    const read = yield* Queue.unbounded<DOQueueItem>();
    const write = yield* Queue.unbounded<DOQueueItem>();

    const loop = Effect.forever(
      Effect.gen(function* () {
        const reads = yield* Queue.takeAll(read);
        const readItems = Array.from(reads);
        for (const item of readItems) {
          yield* processItem(item);
        }

        const writeChunk = yield* Queue.takeUpTo(write, 1);
        const writeItems = Array.from(writeChunk);
        for (const item of writeItems) {
          yield* processItem(item);
        }

        if (readItems.length === 0 && writeItems.length === 0) {
          yield* Effect.sleep('1 millis');
        }
      }),
    );

    yield* Effect.forkDaemon(loop);
    return { read, write } satisfies DOQueues;
  }),
).pipe(Effect.runSync);

interface DataOwnerQueueTrace {
  readonly spanName: string;
  readonly attributes?: Readonly<Record<string, unknown>>;
}

export const dataOwnerRead = <A, E>(
  eff: Effect.Effect<A, E>,
  trace?: DataOwnerQueueTrace,
): Effect.Effect<A, E> =>
  Effect.gen(function* () {
    const queues = yield* initDataOwnerQueues;
    const deferred = yield* Deferred.make<A, E>();
    const queueDepth = yield* Queue.size(queues.read);
    const parentSpan = yield* Effect.option(Effect.currentSpan);
    yield* Queue.offer(queues.read, {
      eff: eff as Effect.Effect<unknown, unknown>,
      deferred: deferred as Deferred.Deferred<unknown, unknown>,
      enqueuedAt: Date.now(),
      queueDepth,
      parentSpan,
      trace,
    });
    return yield* Deferred.await(deferred);
  });

export const dataOwnerWrite = <A, E>(
  eff: Effect.Effect<A, E>,
  trace?: DataOwnerQueueTrace,
): Effect.Effect<A, E> =>
  Effect.gen(function* () {
    const queues = yield* initDataOwnerQueues;
    const deferred = yield* Deferred.make<A, E>();
    const queueDepth = yield* Queue.size(queues.write);
    const parentSpan = yield* Effect.option(Effect.currentSpan);
    yield* Queue.offer(queues.write, {
      eff: eff as Effect.Effect<unknown, unknown>,
      deferred: deferred as Deferred.Deferred<unknown, unknown>,
      enqueuedAt: Date.now(),
      queueDepth,
      parentSpan,
      trace,
    });
    return yield* Deferred.await(deferred);
  });

// ---------------------------------------------------------------------------
// Symbol-readiness latches (data-owner role)
//
// Gives the coordinator a deterministic readiness signal: a documentOpen/Change
// arms a per-URI latch at the
// incoming version (inside the serial WRITE handler, so it is ordered before
// the compile it triggers), and UpdateSymbolSubset resolves it the instant the
// write-back for that version merges.
//
// Concurrency constraint: the data-owner runs ONE serial fiber that awaits each
// queued effect to completion before the next (see initDataOwnerQueues). The
// latch's Deferred must therefore be *awaited off that fiber* — the
// AwaitSymbolReadiness handler only reads the latch handle through the runner
// (a fast, non-blocking peek) and awaits it on its own fiber. Resolving and
// arming are the only latch operations that run inside the serial runner, and
// neither blocks.
// ---------------------------------------------------------------------------

export interface ReadinessLatch {
  /** Editor version this latch is satisfied at. */
  version: number;
  /** Resolves (void) when a write-back for `version` merges. */
  deferred: Deferred.Deferred<void, never>;
  /** Idempotency guard so success/clear settle at most once. */
  settled: boolean;
}

export const readinessLatches = new Map<string, ReadinessLatch>();

/**
 * Arm (or re-arm) the readiness latch for a URI at a given version. Called from
 * the document open/change WRITE handlers, before their compile is dispatched.
 * A newer version supersedes an unsettled older latch: the old Deferred is
 * resolved so any awaiter for the stale version stops waiting and re-evaluates
 * against the current version (the coordinator will re-await if still cold).
 */
export function armReadiness(uri: string, version: number): void {
  const existing = readinessLatches.get(uri);
  if (existing && existing.version === version) {
    return; // already armed for this exact version
  }
  if (existing && !existing.settled) {
    // Stale latch (older version still pending, or a re-open). Release awaiters.
    existing.settled = true;
    Effect.runSync(Deferred.succeed(existing.deferred, undefined));
  }
  readinessLatches.set(uri, {
    version,
    deferred: Effect.runSync(Deferred.make<void, never>()),
    settled: false,
  });
}

/**
 * Resolve the readiness latch for a URI once a write-back for `version` merges.
 * Called from UpdateSymbolSubset's accepted branch. No-op if the latch was
 * superseded by a newer version (the merge was for a version nobody awaits).
 */
export function resolveReadiness(uri: string, version: number): void {
  const latch = readinessLatches.get(uri);
  if (latch && latch.version === version && !latch.settled) {
    latch.settled = true;
    Effect.runSync(Deferred.succeed(latch.deferred, undefined));
  }
}

/** Drop a URI's latch on close, releasing any awaiter. */
export function clearReadiness(uri: string): void {
  const latch = readinessLatches.get(uri);
  if (latch && !latch.settled) {
    latch.settled = true;
    Effect.runSync(Deferred.succeed(latch.deferred, undefined));
  }
  readinessLatches.delete(uri);
}

/**
 * Whether the symbols currently in the graph for `uri` are CURRENT for what an
 * AwaitSymbolReadiness caller is waiting on. Used by both the initial peek and
 * the post-wake re-peek so they cannot drift.
 *
 * `hasSymbols` is whether a symbol table is present at all. `reqVersion < 0`
 * means "match the LATEST armed version" (the coordinator gate, whose
 * triggering request carries no version).
 *
 * A present table is current only if the MERGED version (DocumentStateCache's
 * documentVersion, bumped solely on an accepted write-back) has reached the
 * version we require:
 *   - no latch armed ⇒ nothing is compiling, any present table is current;
 *   - latch armed ⇒ require mergedVersion ≥ latch.version (matchLatest) or
 *     ≥ max(reqVersion, latch.version) (explicit).
 * Critically this does NOT trust latch.settled: a latch also settles on a
 * REJECTED or SUPERSEDED write-back that merged nothing, leaving the prior
 * version's symbols in the graph — reporting those as ready is a stale read.
 */
export function symbolsAreCurrent(
  uri: string,
  reqVersion: number,
  hasSymbols: boolean,
): boolean {
  if (!hasSymbols) return false;
  const latch = readinessLatches.get(uri);
  if (!latch) return true;
  const mergedVersion =
    getDocumentStateCache().getCurrentState(uri)?.documentVersion ?? -1;
  const requiredVersion =
    reqVersion < 0 ? latch.version : Math.max(reqVersion, latch.version);
  return mergedVersion >= requiredVersion;
}

// ---------------------------------------------------------------------------
// Handler factories & request types
//
// The outer shell (guardRole → dataOwnerWrite/ensureRequestServices) is
// identical across handlers; each factory captures the shared shell and
// leaves the caller to supply only the unique body logic.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Data-owner document handler factory
//
// The outer shell (guardRole → dataOwnerWrite → ensureDataOwnerServices)
// is identical for all document mutation handlers. The factory captures
// this; each handler only provides its unique body logic.
// ---------------------------------------------------------------------------

export const dataOwnerDocHandler =
  <R, A>(
    tag: string,
    body: (svc: DataOwnerServices, req: R) => Effect.Effect<A>,
  ) =>
  (req: R) =>
    guardRole(tag).pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            return yield* body(svc, req);
          }),
        ),
      ),
    );

// ---------------------------------------------------------------------------
// Enrichment handler factory
//
// All enrichment dispatch handlers follow the same pattern: guard the
// role, lazily bootstrap services, call a service method, clone the
// result for structured-clone-safe postMessage. The factory captures
// this pattern; each handler is a one-liner config.
// ---------------------------------------------------------------------------

export const requestHandler =
  <R>(
    tag: string,
    callService: (svc: RequestServices, req: R) => Promise<unknown>,
  ) =>
  (req: R) =>
    guardRole(tag).pipe(
      Effect.flatMap(() =>
        workerTracingHooks.withParent(
          req as { traceContext?: string },
          Effect.fn(`worker.lspRequest.${tag}`, {
            attributes: { telemetryIgnore: true },
          })(function* () {
            const svc = yield* ensureRequestServices;
            const result = yield* Effect.promise(() => callService(svc, req));
            return { result: cloneForWire(result) };
          })(),
        ),
      ),
    );

/**
 * Effect-returning request handler variant for handlers that need to yield*
 * Effect-returning helpers (e.g. loadSymbolDataForEnrichment after Part B
 * conversion). Identical to requestHandler except callService returns an Effect
 * and is yielded directly instead of wrapped in Effect.promise.
 */
export const effectRequestHandler =
  <R>(
    tag: string,
    callService: (
      svc: RequestServices,
      req: R,
    ) => Effect.Effect<unknown, never, never>,
  ) =>
  (req: R) =>
    guardRole(tag).pipe(
      Effect.flatMap(() =>
        workerTracingHooks.withParent(
          req as { traceContext?: string },
          Effect.fn(`worker.lspRequest.${tag}`, {
            attributes: { telemetryIgnore: true },
          })(function* () {
            const svc = yield* ensureRequestServices;
            const result = yield* callService(svc, req);
            return { result: cloneForWire(result) };
          })(),
        ),
      ),
    );

export type PositionReq = {
  textDocument: { uri: string };
  position: { line: number; character: number };
  content?: string;
};
export type DocOnlyReq = { textDocument: { uri: string } };
export type DocWithContentReq = {
  textDocument: { uri: string };
  content?: string;
};
export type RefsReq = PositionReq & {
  context: { includeDeclaration: boolean };
};
export type CompletionReq = PositionReq & {
  context?: { triggerKind: number; triggerCharacter?: string };
};
export type SignatureHelpReq = PositionReq & { context?: unknown };
export type CodeActionReq = {
  textDocument: { uri: string };
  range: {
    start: { line: number; character: number };
    end: { line: number; character: number };
  };
  content?: string;
  context?: unknown;
};

// ---------------------------------------------------------------------------
// Enrichment helpers
// ---------------------------------------------------------------------------

/**
 * Load symbol data from the data-owner worker into the local enrichment
 * worker's symbol manager. Stores the document text in local storage
 * and queries the data-owner for the file's symbol table via the
 * coordinator assistance proxy.
 *
 * Returns version and detail level metadata for the loaded URI.
 */
export function loadSymbolDataForEnrichment(
  svc: RequestServices,
  uri: string,
  content?: string,
): Effect.Effect<{ version: number; detailLevel: string }, never, never> {
  let version = -1;
  let detailLevel = 'public-api';

  return Effect.gen(function* () {
    if (content) {
      // Completion needs offsetAt/positionAt for live-buffer analysis.
      const doc = makeWorkerDocument(uri, content);
      svc.storageManager.getStorage().setDocument(uri, doc as never);
    }

    const response = (yield* Effect.fn('worker.enrichment.querySymbolSubset', {
      attributes: { uri },
    })(function* () {
      return (yield* Effect.tryPromise({
        try: () =>
          requestCoordinatorAssistancePromiseShared(
            'dataOwner:QuerySymbolSubset',
            { uris: [uri] },
            true,
          ),
        catch: (cause) => cause,
      })) as {
        entries: Record<string, unknown>;
        versions: Record<string, number>;
        detailLevels: Record<string, string>;
      };
    })()) as {
      entries: Record<string, unknown>;
      versions: Record<string, number>;
      detailLevels: Record<string, string>;
    };

    if (response?.entries) {
      const { SymbolTable, ReferenceContext } = yield* Effect.tryPromise({
        try: () => import('@salesforce/apex-lsp-parser-ast'),
        catch: (cause) => cause,
      });
      const ingestEntries = (entries: Record<string, unknown>) => {
        const tables: Array<{ fileUri: string; st: any }> = [];
        for (const [fileUri, stData] of Object.entries(entries)) {
          if (stData) {
            tables.push({
              fileUri,
              st: SymbolTable.fromSerializedData(
                stData as SerializedSymbolTableData,
              ),
            });
          }
        }
        return tables;
      };

      const loaded = yield* Effect.fn(
        'worker.enrichment.deserializeSymbolTables',
        {
          attributes: { uri, count: Object.keys(response.entries).length },
        },
      )(function* () {
        return yield* Effect.sync(() => ingestEntries(response.entries));
      })();
      for (const { fileUri, st } of loaded) {
        yield* Effect.fn('worker.enrichment.addSymbolTable', {
          attributes: { uri: fileUri },
        })(function* () {
          yield* svc.symbolManager.addSymbolTable(st, fileUri);
        })();
      }
      version = response.versions?.[uri] ?? -1;
      detailLevel = response.detailLevels?.[uri] ?? 'public-api';

      // Phase 2: pre-fetch cross-file dependencies.
      // Extract unresolved CLASS_REFERENCE / CONSTRUCTOR_CALL names from the
      // loaded file and ask the data-owner to resolve them to symbol tables.
      const currentSt = loaded.find((e) => e.fileUri === uri)?.st;
      if (currentSt) {
        const refs = currentSt.getAllReferences() as Array<{
          name: string;
          context: number;
          resolvedSymbolId?: string;
        }>;
        const classNames = new Set<string>();
        for (const ref of refs) {
          const isUnresolvedTypeRef =
            !ref.resolvedSymbolId &&
            (ref.context === ReferenceContext.CLASS_REFERENCE ||
              ref.context === ReferenceContext.CONSTRUCTOR_CALL ||
              ref.context === ReferenceContext.TYPE_DECLARATION);
          const isSupertypeRef =
            ref.context === ReferenceContext.INHERITANCE ||
            ref.context === ReferenceContext.INTERFACE_IMPLEMENTATION;
          if (isUnresolvedTypeRef || isSupertypeRef) {
            classNames.add(ref.name);
          }
        }
        if (classNames.size > 0) {
          const depResponse = yield* Effect.fn(
            'worker.enrichment.resolveDepUris',
            { attributes: { uri, depCount: classNames.size } },
          )(function* () {
            return (yield* Effect.tryPromise({
              try: () =>
                requestCoordinatorAssistancePromiseShared(
                  'dataOwner:ResolveDepUris',
                  { classNames: [...classNames] },
                  true,
                ),
              catch: (cause) => cause,
            })) as { entries: Record<string, unknown> };
          })().pipe(Effect.catchAll(() => Effect.succeed(undefined)));
          if (depResponse?.entries) {
            for (const { fileUri: depUri, st: depSt } of ingestEntries(
              depResponse.entries,
            )) {
              yield* svc.symbolManager.addSymbolTable(depSt, depUri);
            }
          }

          // Cross-worker fallback: ResolveDepUris resolves names that map to a
          // file via the data-owner's class→file index, but a qualified
          // TypeReference can still miss when the target file is not loaded in
          // this enrichment worker's LOCAL name index. Ask the data-owner
          // (which holds ALL workspace symbols) to resolve the remaining names
          // in one batched query and ingest the owning files' symbol tables.
          // The ingest count is intentionally not captured (see below).
          yield* Effect.tryPromise({
            try: () => resolveMissingNamesViaDataOwner(svc, [...classNames]),
            catch: (cause) => cause,
          }).pipe(Effect.catchAll(() => Effect.void));

          // Ingestion alone only lands the owning files' SYMBOLS in the local
          // name index (addSymbolTable processes same-file refs only and defers
          // cross-file edges). Hover/Completion/Definition resolve via an
          // on-demand name lookup, so the symbol is enough for them — but the
          // requesting file's TypeReference is still unresolved (no
          // resolvedSymbolId, no reverse-index edge). Materialize those edges
          // now so reverse-index + position-precise consumers see them too.
          //
          // NOT gated on resolveMissingNamesViaDataOwner's ingest count: the
          // earlier ResolveDepUris pass may have already loaded every dep, which
          // makes that count 0 even though the cursor file's references are
          // still unbound. find-references' 'precise' position→symbol lookup
          // needs those bindings (unlike hover/definition's on-demand by-name
          // resolution), so resolve whenever ANY class dep was requested.
          // resolveCrossFileReferencesForFile is re-entrancy-guarded and
          // addReference de-dupes, so this is near-free when nothing changed.
          yield* Effect.fn('worker.enrichment.resolveCrossFileReferences', {
            attributes: { uri },
          })(function* () {
            yield* svc.symbolManager.resolveCrossFileReferencesForFile(uri);
          })();
        }
      }
    }

    return { version, detailLevel };
  }).pipe(
    Effect.catchAll((error) =>
      Effect.sync(() => {
        // Assistance failures are expected during degradation. Preserve the
        // partial graph and let the LSP request continue.
        getLogger().warn(
          () =>
            `[ENRICHMENT] Symbol-subset load failed for ${uri}: ${String(error)}`,
        );
        return { version, detailLevel };
      }),
    ),
  );
}

/**
 * Cross-worker symbol resolution fallback.
 *
 * When the enrichment worker's LOCAL name index ({@link findSymbolByName})
 * misses a referenced name, route a {@link DataOwnerQuerySymbolByName} query
 * through the assistance proxy to the data-owner — which holds ALL workspace
 * symbols — and ingest the owning file's symbol table so the reference can
 * resolve locally.
 *
 * Best-effort and idempotent: names already known locally are skipped, and a
 * failed query leaves the graph partial.
 *
 * @param svc Enrichment services (symbol manager + storage).
 * @param names Candidate names to resolve (e.g. unresolved class references).
 * @param queryByName Coordinator-assistance fetcher; injectable so the
 *   ingestion contract can be unit-tested without a live assistance bus.
 *   Defaults to {@link requestCoordinatorAssistancePromise}.
 * @param namespace Optional namespace/qualifier hint (e.g. the leading
 *   qualifier of a qualified TypeReference such as `MyNs` in `MyNs.Foo`).
 *   Threaded through to the {@link DataOwnerQuerySymbolByName} query so the
 *   data-owner can disambiguate same-named matches across namespaces. Omitted
 *   from the wire payload when absent so unqualified queries are byte-identical
 *   to before.
 * @returns Count of owning files ingested (0 on failure or no matches).
 */
export async function resolveMissingNamesViaDataOwner(
  svc: RequestServices,
  names: readonly string[],
  queryByName: (
    method: string,
    params: unknown,
    blocking: boolean,
  ) => Promise<unknown> = requestCoordinatorAssistancePromiseShared,
  namespace?: string,
): Promise<number> {
  // Drop duplicates and names the LOCAL name index already resolves before any
  // IPC. The local-skip also dedups against ResolveDepUris: any name it already
  // resolved is now in the local index, so it falls out here and is not
  // re-queried. The residual is exactly the set ResolveDepUris could not map.
  const residual: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name)) continue;
    seen.add(name);
    const local = await svc.symbolManager.findSymbolByName(name);
    if (local.length === 0) residual.push(name);
  }

  if (residual.length === 0) return 0;

  const { SymbolTable } = await import('@salesforce/apex-lsp-parser-ast');
  try {
    // ONE blocking round-trip for the whole residual set. A file referencing N
    // unowned/managed-package types previously fired N sequential blocking hops
    // per keystroke; batching makes it a single hop. The success `entries` map
    // is keyed by owning file URI, so it carries every matched name's table.
    //
    // Thread the optional namespace/qualifier hint through to the data-owner
    // for same-name disambiguation. Only add the key when a namespace is
    // supplied so unqualified queries keep the exact prior payload shape.
    const queryParams: { names: string[]; namespace?: string } = {
      names: residual,
    };
    if (namespace) {
      queryParams.namespace = namespace;
    }
    const response = (await queryByName(
      'dataOwner:QuerySymbolByName',
      queryParams,
      true,
    )) as {
      matches?: ReadonlyArray<{ name: string; fileUri: string }>;
      entries?: Record<string, unknown>;
    };

    if (!response?.entries) return 0;
    let ingested = 0;
    for (const [fileUri, stData] of Object.entries(response.entries)) {
      if (!stData) continue;
      const st = SymbolTable.fromSerializedData(
        stData as SerializedSymbolTableData,
      );
      await Effect.runPromise(svc.symbolManager.addSymbolTable(st, fileUri));
      ingested++;
    }
    getLogger().debug(
      () =>
        `[ENRICHMENT] Cross-worker resolved ${residual.length} name(s) via ` +
        `data-owner: ${response.matches?.length ?? 0} match(es), ` +
        `${ingested} file(s) ingested`,
    );
    return ingested;
  } catch (err) {
    getLogger().debug(
      () =>
        '[ENRICHMENT] Cross-worker resolve failed for ' +
        `${residual.length} name(s): ${err}`,
    );
    return 0;
  }
}

/**
 * Load caller-side symbol tables needed by Find References into the local
 * enrichment worker's symbol manager.
 *
 * Where {@link loadSymbolDataForEnrichment} pre-fetches *outbound* deps (the
 * files this file references), Find References needs the *inbound* direction:
 * the files whose declared symbols reference the target. Those caller tables
 * must be present locally before `processReferences` runs so the reference
 * search sees cross-file usages, not just same-file ones.
 *
 * Best-effort: a failed resolve leaves the graph partial and the caller
 * proceeds with whatever tables are already loaded.
 *
 * @param svc Enrichment services (symbol manager + storage).
 * @param uri Target file URI whose dependents we want to load.
 * @param symbolName Optional narrowing to a single declared symbol's
 *   dependents; when omitted, dependents of any symbol declared in `uri`.
 * @param fetchDependents Coordinator-assistance fetcher; injectable so the
 *   ingestion contract can be unit-tested without a live assistance bus.
 *   Defaults to {@link requestCoordinatorAssistancePromise}.
 * @returns Count of dependent files ingested (0 on failure or no dependents).
 */
export async function loadDependentsForReferences(
  svc: RequestServices,
  uri: string,
  symbolName?: string,
  fetchDependents: (
    method: string,
    params: unknown,
    blocking: boolean,
  ) => Promise<unknown> = requestCoordinatorAssistancePromiseShared,
): Promise<number> {
  try {
    const response = (await fetchDependents(
      'dataOwner:ResolveDependentUris',
      { uri, symbolName },
      true,
    )) as { entries: Record<string, unknown> };

    if (!response?.entries) return 0;

    const { SymbolTable } = await import('@salesforce/apex-lsp-parser-ast');
    let ingested = 0;
    const ingestedUris: string[] = [];
    for (const [fileUri, stData] of Object.entries(response.entries)) {
      if (!stData) continue;
      const st = SymbolTable.fromSerializedData(
        stData as SerializedSymbolTableData,
      );
      await Effect.runPromise(svc.symbolManager.addSymbolTable(st, fileUri));
      ingested++;
      ingestedUris.push(fileUri);
    }

    // Resolve each freshly-loaded dependent's own cross-file references so its
    // OUTGOING edges — crucially the implements/extends supertype edges — land
    // in this worker's reverse index. find-implementation / find-references on a
    // supertype reads the reverse index of the TARGET (interface/superclass) for
    // its INCOMING edges; that edge is authored on the DEPENDENT (implementor/
    // subclass) side, so resolving the target file alone never materializes it.
    // The dependents were just ingested above, so their resolution targets are
    // present and this is bounded; resolveCrossFileReferencesForFile is
    // re-entrancy-guarded and addReference de-dupes, keeping it near-free on
    // repeat. (Replaces the former whole-workspace superClass/interfaces[] string
    // scan in ImplementationProcessingService, which masked this gap.)
    for (const fileUri of ingestedUris) {
      await Effect.runPromise(
        svc.symbolManager.resolveCrossFileReferencesForFile(fileUri),
      );
    }

    getLogger().debug(
      () =>
        `[REFERENCES] Loaded ${ingested} dependent table(s) for ${uri}` +
        (symbolName ? ` (symbol: ${symbolName})` : ''),
    );
    return ingested;
  } catch (err) {
    // Dependent pre-fetch is best-effort; reference search can still run on
    // the tables already loaded (e.g. same-file references). But reaching this
    // catch means cross-file callers were NOT loaded, so the result is likely
    // incomplete — warn so a "cross-file references missing" report has a
    // breadcrumb to follow.
    getLogger().warn(
      () => `[REFERENCES] Dependent pre-fetch failed for ${uri}: ${err}`,
    );
    return 0;
  }
}

/**
 * Recompile the cursor file at FULL detail into the worker's local symbol
 * manager, then resolve its cross-file references.
 *
 * Find References maps the cursor POSITION to a symbol via
 * getReferencesAtPosition / getSymbolAtPosition, which only see references that
 * live inside method bodies when the file was parsed at full detail. The
 * data-owner serves files at 'public-api' (bodies stripped), so a cursor on an
 * in-body usage (`RefUtil u = new RefUtil()`) resolves to nothing and Find
 * References returns []. documentSymbol hits the same wall and solves it by
 * recompiling the open file from its text with FullSymbolCollectorListener;
 * we do the same here so the cursor file carries its in-body references, then
 * resolve cross-file edges so usages in OTHER files still resolve to it.
 *
 * Best-effort: a missing/uncompilable document leaves the public-api graph in
 * place and Find References proceeds with whatever it has.
 *
 * @param svc Enrichment services (symbol manager).
 * @param uri Cursor file URI to recompile.
 * @param content Live document text; when absent, nothing is recompiled.
 */
export async function recompileCursorFileAtFullDetail(
  svc: RequestServices,
  uri: string,
  content?: string,
): Promise<boolean> {
  // Only TRULY-ABSENT content (undefined) skips the recompile. An empty string
  // is a valid zero-length file — rejecting it with a `!content` falsy check
  // would leave a freshly-opened empty `.cls` at public-api detail and silently
  // return []. This mirrors the upstream `typeof req.content === 'string'` gate,
  // which already treats '' as "content present".
  if (content === undefined) return false;
  try {
    const { CompilerService, FullSymbolCollectorListener, SymbolTable } =
      await import('@salesforce/apex-lsp-parser-ast');
    const table = new SymbolTable();
    const listener = new FullSymbolCollectorListener(table);
    const result = new CompilerService().compile(content, uri, listener, {
      collectReferences: true,
      resolveReferences: true,
    });
    const st = result?.result instanceof SymbolTable ? result.result : table;
    await Effect.runPromise(svc.symbolManager.addSymbolTable(st, uri));
    // Re-resolve so the freshly-parsed in-body references re-key into the
    // cross-file reverse index (the public-api version's edges are superseded).
    await Effect.runPromise(
      svc.symbolManager.resolveCrossFileReferencesForFile(uri),
    );
    return true;
  } catch (err) {
    // The cursor file stays at public-api detail, so an in-body cursor won't
    // resolve and Find References can return []. Warn so that empty result is
    // attributable to a recompile failure rather than a genuine no-match.
    getLogger().warn(
      () => `[REFERENCES] Full-detail recompile failed for ${uri}: ${err}`,
    );
    return false;
  }
}

/**
 * Load the symbol tables of every TYPE the cursor file references, regardless of
 * whether those references already carry a resolvedSymbolId.
 *
 * loadSymbolDataForEnrichment's Phase-2 prefetch only fetches types whose
 * references are UNRESOLVED (`!resolvedSymbolId`) — correct for hover/definition,
 * which follow the resolvedSymbolId to the data-owner on demand. But Find
 * References needs the referenced type's table PRESENT locally to enumerate that
 * type's own references: a `RefUtil` usage already resolved by the data-owner
 * still leaves RefUtil's table absent in the pool, so findReferencesTo(RefUtil)
 * sees nothing. This loads those already-resolved type tables too.
 *
 * Best-effort: failures leave the partial graph in place.
 *
 * @param svc Enrichment services (symbol manager).
 * @param uri Cursor file URI whose referenced types to load.
 */
export async function loadReferencedTypesForFile(
  svc: RequestServices,
  uri: string,
): Promise<number> {
  try {
    const { ReferenceContext } =
      await import('@salesforce/apex-lsp-parser-ast');
    const st = await svc.symbolManager.getSymbolTableForFile(uri);
    if (!st) return 0;
    const refs = st.getAllReferences();
    // Group the referenced type leaf names by their qualifier so the qualifier
    // can be threaded to the data-owner as a disambiguation namespace hint. A
    // qualified `MyNs.Foo` resolves by its LEAF (`Foo`) — the data-owner's name
    // index is keyed on the simple name — while the head (`MyNs`) is the
    // namespace hint. `declaringFileForCursorSymbol` strips to the same leaf.
    // The undefined-qualifier bucket is the unqualified hot path; it stays a
    // single batched, namespace-free query (byte-identical to before).
    const namesByQualifier = new Map<string | undefined, Set<string>>();
    for (const ref of refs) {
      if (
        ref.context === ReferenceContext.CLASS_REFERENCE ||
        ref.context === ReferenceContext.CONSTRUCTOR_CALL ||
        ref.context === ReferenceContext.TYPE_DECLARATION
      ) {
        const dot = ref.name.lastIndexOf('.');
        const leaf = dot >= 0 ? ref.name.slice(dot + 1) : ref.name;
        const qualifier = dot >= 0 ? ref.name.slice(0, dot) : undefined;
        const bucket = namesByQualifier.get(qualifier) ?? new Set<string>();
        bucket.add(leaf);
        namesByQualifier.set(qualifier, bucket);
      }
    }
    if (namesByQualifier.size === 0) return 0;
    // One batched query per distinct qualifier. In the common case a file's
    // type refs share a single bucket (unqualified, or one managed package), so
    // this is the same single round-trip as before; mixed qualifiers cost one
    // hop each rather than collapsing namespaces onto one ambiguous query.
    let ingested = 0;
    for (const [qualifier, leaves] of namesByQualifier) {
      ingested += await resolveMissingNamesViaDataOwner(
        svc,
        [...leaves],
        undefined,
        qualifier,
      );
    }
    // Bind the cursor file's references to the freshly-loaded type tables so the
    // reverse index + position-precise lookups resolve.
    await Effect.runPromise(
      svc.symbolManager.resolveCrossFileReferencesForFile(uri),
    );
    return ingested;
  } catch (err) {
    // Target type tables may be absent locally, so findReferencesTo(type) can
    // come back empty. Warn so the gap is attributable.
    getLogger().warn(
      () => `[REFERENCES] Referenced-type load failed for ${uri}: ${err}`,
    );
    return 0;
  }
}

/**
 * Resolve the symbol under the cursor and return the file URI it is DECLARED
 * in. Find References on a usage must load callers of the TARGET symbol, which
 * may live in a different file than the cursor (e.g. the cursor is on a
 * `RefUtil` usage in CallerA, but the references span CallerB too). The target's
 * dependents hang off its declaring file, so the handler loads dependents for
 * THIS uri rather than the cursor file.
 *
 * Requires the cursor file to already be compiled at full detail locally (so
 * the position resolves). Returns null when no symbol resolves or it carries no
 * fileUri, in which case the caller falls back to the cursor file.
 */
export async function declaringFileForCursorSymbol(
  svc: RequestServices,
  uri: string,
  position: { line: number; character: number },
): Promise<string | null> {
  try {
    // LSP (0-based line) → parser (1-based line, 0-based column).
    const parserPosition = {
      line: position.line + 1,
      character: position.character,
    };

    // Preferred: precise position→symbol resolution gives the declaring file
    // directly.
    const symbol = await svc.symbolManager.getSymbolAtPosition(
      uri,
      parserPosition,
      'precise',
    );
    const fileUri = (symbol as { fileUri?: string } | null)?.fileUri;
    if (fileUri && fileUri !== uri) return fileUri;

    // Fallback: 'precise' can return null when the cursor file's reference
    // isn't yet bound to a resolvedSymbolId (cross-file edges not fully
    // materialized in the worker's partial graph). The reference under the
    // cursor still carries the NAME, and the target symbol is loaded by name —
    // so resolve the name to its declaring file directly. This is what lets
    // find-references on a `RefUtil` usage reach RefUtil.cls's dependents.
    const refs = await svc.symbolManager.getReferencesAtPosition(
      uri,
      parserPosition,
    );
    const name = refs?.[0]?.name;
    if (!name) return null;
    // Strip any qualified prefix (`Outer.Inner` → leaf segment is searched, but
    // a type usage like `RefUtil` is already unqualified).
    const leaf = name.includes('.') ? name.split('.').pop()! : name;
    const named = await svc.symbolManager.findSymbolByName(leaf);
    const namedUri = (named as { fileUri?: string } | null)?.fileUri;
    return namedUri && namedUri !== uri ? namedUri : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Lazy role-specific service containers (bootstrapped on first dispatch)
// ---------------------------------------------------------------------------

/**
 * Get numeric order index for detail levels.
 * Matches LayerEnrichmentService's ordering.
 */
export function getLayerOrderIndex(
  level: 'public-api' | 'protected' | 'private' | 'full',
): number {
  const order: Record<string, number> = {
    'public-api': 1,
    protected: 2,
    private: 3,
    full: 4,
  };
  return order[level] || 0;
}

export const ensureDataOwnerServices: Effect.Effect<DataOwnerServices> =
  Effect.runSync(
    Effect.cached(
      Effect.gen(function* () {
        const { bootstrapDataOwnerServices } = yield* Effect.promise(
          () => import('@salesforce/apex-lsp-compliant-services'),
        );
        const resourceLoaderLayer = (yield* Effect.promise(() =>
          _makeResourceLoaderRemoteLayer(),
        )) as import('effect').Layer.Layer<
          import('@salesforce/apex-lsp-parser-ast').ResourceLoaderService
        >;
        const svc = yield* Effect.promise(() =>
          bootstrapDataOwnerServices(resourceLoaderLayer),
        );
        yield* Effect.logInfo('[DATA-OWNER] services bootstrapped');
        return svc;
      }),
    ),
  );

export const ensureRequestServices: Effect.Effect<RequestServices> =
  Effect.runSync(
    Effect.cached(
      Effect.gen(function* () {
        const {
          bootstrapRequestServices,
          EnhancedMissingArtifactResolutionService,
        } = yield* Effect.promise(
          () => import('@salesforce/apex-lsp-compliant-services'),
        );
        const resourceLoaderLayer = (yield* Effect.promise(() =>
          _makeResourceLoaderRemoteLayer(),
        )) as import('effect').Layer.Layer<
          import('@salesforce/apex-lsp-parser-ast').ResourceLoaderService
        >;
        const svc = yield* Effect.promise(() =>
          bootstrapRequestServices(resourceLoaderLayer),
        );

        // Wire coordinator assistance so the enrichment worker can forward
        // apex/findMissingArtifact to the coordinator (which holds the LSP
        // client connection) rather than silently dropping the request.
        //
        // blocking=true: the coordinator mediator must await its handler (drive
        // the client to open the artifact, which flows to the data-owner via
        // didOpen) and return the real FindMissingArtifactResult. With
        // blocking=false it returns {accepted:true} immediately, which the
        // blocking-resolution caller mis-reads as "resolved" before the artifact
        // loads. The background caller doesn't await, so blocking=true is
        // harmless there.
        EnhancedMissingArtifactResolutionService.setAssistanceProxy((params) =>
          requestCoordinatorAssistancePromiseShared(
            'apex/findMissingArtifact',
            params,
            true,
          ),
        );

        yield* Effect.logInfo('[ENRICHMENT] services bootstrapped');
        return svc;
      }),
    ),
  );

// ---------------------------------------------------------------------------
// Compilation services (lazy bootstrap)
// ---------------------------------------------------------------------------

export interface CompilationServices {
  readonly compile: (
    content: string,
    uri: string,
  ) => {
    symbolTable: unknown;
    errors: unknown[];
  } | null;
}

export const ensureCompilationServices: Effect.Effect<CompilationServices> =
  Effect.runSync(
    Effect.cached(
      Effect.gen(function* () {
        const { CompilerService, VisibilitySymbolListener, SymbolTable } =
          yield* Effect.promise(
            () => import('@salesforce/apex-lsp-parser-ast'),
          );
        const compilerService = new CompilerService();

        const compile = (content: string, uri: string) => {
          const table = new SymbolTable();
          const listener = new VisibilitySymbolListener('public-api', table);
          const result = compilerService.compile(content, uri, listener, {
            collectReferences: true,
            resolveReferences: true,
          });
          if (!result) return null;
          const symbolTable =
            result.result instanceof SymbolTable ? result.result : table;
          return { symbolTable, errors: result.errors };
        };

        yield* Effect.logInfo('[COMPILATION] services bootstrapped');
        return { compile } as CompilationServices;
      }),
    ),
  );

// ---------------------------------------------------------------------------
// Compiled-symbol write-back (compilation role)
// ---------------------------------------------------------------------------

export function writeBackCompiledSymbols(
  symbolTable: {
    getAllSymbols(): unknown[];
    getAllReferences(): unknown[];
    getAllHierarchicalReferences?(): unknown[];
    getMetadata(): unknown;
    getFileUri(): string;
  },
  uri: string,
  documentVersion: number,
): Effect.Effect<boolean, never, never> {
  const startTime = Date.now();
  return Effect.gen(function* () {
    // Serialize symbol table with instrumentation using Effect span
    const serializeStart = Date.now();
    const {
      enrichedSymbolTable,
      serializeMs,
      symbolCount,
      referenceCount,
      payloadSizeBytes,
    } = yield* Effect.fn('worker.compilation.serializeSymbols', {
      attributes: { uri },
    })(function* () {
      const table = cloneForWire({
        symbols: symbolTable.getAllSymbols(),
        references: symbolTable.getAllReferences(),
        hierarchicalReferences:
          symbolTable.getAllHierarchicalReferences?.() ?? [],
        metadata: symbolTable.getMetadata(),
        fileUri: symbolTable.getFileUri(),
      });
      const serializeMs = Date.now() - serializeStart;

      const symbolCount = Array.isArray(table?.symbols)
        ? table.symbols.length
        : 0;
      const referenceCount = Array.isArray(table?.references)
        ? table.references.length
        : 0;

      // Estimate payload size
      const payloadSizeBytes = JSON.stringify(table).length;

      return yield* Effect.succeed({
        enrichedSymbolTable: table,
        serializeMs,
        symbolCount,
        referenceCount,
        payloadSizeBytes,
      });
    })();

    yield* Effect.logDebug(
      `[COMPILATION] Serialization complete: ${symbolCount} symbols, ` +
        `${referenceCount} refs, ${payloadSizeBytes} bytes, ${serializeMs}ms for ${uri}`,
    );

    // IPC call with span and post-IPC cleanup tracking
    const { response, ipcCallMs } = yield* Effect.fn(
      'worker.compilation.updateSymbolSubset',
      {
        attributes: {
          uri,
          symbolCount,
          referenceCount,
          payloadSizeBytes,
          serializeMs,
        },
      },
    )(function* () {
      const ipcCallStart = Date.now();
      const response = (yield* Effect.promise(() =>
        requestCoordinatorAssistancePromiseShared(
          'dataOwner:UpdateSymbolSubset',
          {
            uri,
            documentVersion,
            enrichedSymbolTable,
            enrichedDetailLevel: 'public-api',
            sourceWorkerId: workerId,
          },
          true,
        ),
      )) as { accepted: boolean; merged: number; versionMismatch: boolean };
      const ipcCallMs = Date.now() - ipcCallStart;

      // Track post-IPC cleanup/overhead
      yield* Effect.fn('worker.compilation.postIpcCleanup', {
        attributes: { uri, ipcCallMs },
      })(function* () {
        // Explicit cleanup marker - any work here contributes to post-IPC gap
        return yield* Effect.succeed(undefined);
      })();

      return yield* Effect.succeed({ response, ipcCallMs });
    })();

    const elapsed = Date.now() - startTime;
    const accepted = response?.accepted ?? false;

    yield* Effect.logDebug(
      `[COMPILATION] Write-back ${accepted ? 'accepted' : 'rejected'}: ` +
        `${symbolCount} symbols for ${uri} (v${documentVersion}, ${elapsed}ms total, ` +
        `${serializeMs}ms serialize, ${ipcCallMs}ms IPC, ${payloadSizeBytes} bytes)` +
        (response?.versionMismatch ? ' [version mismatch]' : ''),
    );
    return accepted;
  }).pipe(
    Effect.catchAll((err) =>
      Effect.gen(function* () {
        const elapsed = Date.now() - startTime;
        yield* Effect.logWarning(
          `[COMPILATION] Write-back failed: ${uri} (${elapsed}ms total) - ${err}`,
        );
        return false;
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Role-specific initialization
// ---------------------------------------------------------------------------

export const handleWorkerInitRole = (
  req: Schema.Schema.Type<typeof WorkerInit>,
): Effect.Effect<{ ready: boolean }> => {
  if (req.role === 'resourceLoader') {
    return Effect.gen(function* () {
      const { ResourceLoader } = yield* Effect.promise(
        () => import('@salesforce/apex-lsp-parser-ast'),
      );
      yield* Effect.promise(() => ResourceLoader.getInstance().initialize());
      yield* Effect.logInfo('[resource-loader] stdlib loaded');
      return { ready: true };
    });
  }
  if (req.role === 'dataOwner') {
    return Effect.gen(function* () {
      yield* ensureDataOwnerServices;
      return { ready: true };
    });
  }
  if (req.role === 'lspRequest') {
    return Effect.gen(function* () {
      yield* ensureRequestServices;
      return { ready: true };
    });
  }
  if (req.role === 'compilation') {
    return Effect.gen(function* () {
      yield* ensureCompilationServices;
      return { ready: true };
    });
  }
  return Effect.succeed({ ready: true });
};

// ---------------------------------------------------------------------------
// Enrichment write-back gating & write-back (Step 5)
// ---------------------------------------------------------------------------

/**
 * Determine if enrichment is needed based on current and required detail levels.
 * Uses the same ordering as LayerEnrichmentService on origin/main.
 */
export function shouldEnrich(
  currentLevel: string,
  requiredLevel: 'public-api' | 'protected' | 'private' | 'full',
): boolean {
  const levelOrder: Record<string, number> = {
    'public-api': 1,
    protected: 2,
    private: 3,
    full: 4,
  };

  const currentOrder = levelOrder[currentLevel] || 0;
  const requiredOrder = levelOrder[requiredLevel] || 0;

  return requiredOrder > currentOrder;
}

/**
 * Write back enriched symbol data to the data-owner worker.
 * Returns true if the write-back was accepted, false otherwise.
 */
export function writeBackEnrichedSymbols(
  svc: RequestServices,
  uri: string,
  documentVersion: number,
  enrichedDetailLevel: 'public-api' | 'protected' | 'private' | 'full',
): Effect.Effect<boolean, never, never> {
  const startTime = Date.now();
  return Effect.gen(function* () {
    const symbolTable = yield* Effect.tryPromise({
      try: () => svc.symbolManager.getSymbolTableForFile(uri),
      catch: (cause) => cause,
    });
    if (!symbolTable) {
      yield* Effect.logDebug(
        `[ENRICHMENT] Write-back skipped: no symbol table for ${uri}`,
      );
      return false;
    }

    // Serialize symbol table to wire format with instrumentation
    const { enrichedSymbolTable, serializeMs, payloadSizeBytes } =
      yield* Effect.fn('worker.enrichment.serializeSymbols', {
        attributes: { uri },
      })(function* () {
        const serializeStart = Date.now();
        const table = cloneForWire({
          symbols: symbolTable.getAllSymbols(),
          references: symbolTable.getAllReferences(),
          hierarchicalReferences: symbolTable.getAllHierarchicalReferences(),
          metadata: symbolTable.getMetadata(),
          fileUri: symbolTable.getFileUri(),
        });
        const serializeMs = Date.now() - serializeStart;

        // Estimate payload size (approximate via JSON serialization)
        const payloadSizeBytes = JSON.stringify(table).length;

        return yield* Effect.succeed({
          enrichedSymbolTable: table,
          serializeMs,
          payloadSizeBytes,
        });
      })();

    const symbolCount = Array.isArray(enrichedSymbolTable?.symbols)
      ? enrichedSymbolTable.symbols.length
      : 0;
    const referenceCount = Array.isArray(enrichedSymbolTable?.references)
      ? enrichedSymbolTable.references.length
      : 0;

    const response = (yield* Effect.fn('worker.enrichment.updateSymbolSubset', {
      attributes: {
        uri,
        symbolCount,
        referenceCount,
        detailLevel: enrichedDetailLevel,
        payloadSizeBytes,
        serializeMs,
      },
    })(function* () {
      const ipcCallStart = Date.now();
      const result = (yield* Effect.tryPromise({
        try: () =>
          requestCoordinatorAssistancePromiseShared(
            'dataOwner:UpdateSymbolSubset',
            {
              uri,
              documentVersion,
              enrichedSymbolTable,
              enrichedDetailLevel,
              sourceWorkerId: workerId,
            },
            true,
          ),
        catch: (cause) => cause,
      })) as { accepted: boolean; merged: number; versionMismatch: boolean };

      const ipcCallMs = Date.now() - ipcCallStart;

      // Track post-IPC cleanup/overhead
      yield* Effect.fn('worker.enrichment.postIpcCleanup', {
        attributes: { uri, ipcCallMs },
      })(function* () {
        // Explicit cleanup marker - any work here contributes to post-IPC gap
        return yield* Effect.succeed(undefined);
      })();

      return result;
    })()) as { accepted: boolean; merged: number; versionMismatch: boolean };

    const elapsed = Date.now() - startTime;
    const accepted = response?.accepted ?? false;

    yield* Effect.logDebug(
      `[ENRICHMENT] Write-back ${accepted ? 'accepted' : 'rejected'}: ` +
        `${symbolCount} symbols, ${enrichedDetailLevel} level, ${uri} ` +
        `(v${documentVersion}, ${elapsed}ms)` +
        (response?.versionMismatch ? ' [version mismatch]' : ''),
    );

    return accepted;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* () {
        const elapsed = Date.now() - startTime;
        yield* Effect.logWarning(
          `[ENRICHMENT] Write-back failed: ${uri} (${elapsed}ms) - ${String(error)}`,
        );
        return false;
      }),
    ),
  );
}

// ---------------------------------------------------------------------------
// Helper: Worker log emission (delegates to shared logger)
// ---------------------------------------------------------------------------

function emitWorkerLog(level: string, message: string): void {
  const logger = getLogger();
  switch (level) {
    case 'debug':
      logger.debug(() => message);
      break;
    case 'info':
      logger.info(() => message);
      break;
    case 'warn':
    case 'warning':
      logger.warn(() => message);
      break;
    case 'error':
      logger.error(() => message);
      break;
  }
}

// ---------------------------------------------------------------------------
// Find-references helpers (W-23272674)
// ---------------------------------------------------------------------------

/**
 * Phase-2 of find-references (W-23272674, standalone-scan pivot): given the
 * candidate files surfaced by the phase-1 lexical prefilter, parse EACH ONE at
 * full detail into its OWN throwaway SymbolTable and scan that table for
 * genuine code references to the target — WITHOUT ingesting anything into the
 * shared ApexSymbolManager.
 *
 * This replaces the former shared-graph approach (recompile each candidate via
 * `addSymbolTable`, then read the reverse index). That path was proven
 * infeasible: `addSymbolTable`'s cost scales with total loaded graph size, so a
 * single small candidate cost ~8s against a loaded workspace and blew the
 * request timeout. A standalone parse+scan is ~40x faster (parse ~160ms + scan
 * ~1ms per file) and, because comments and string literals never parse as
 * references, inherently rejects the false positives that make the IDE's native
 * text search noisy. See memory project-findreferences-standalone-pivot.
 *
 * @returns Flat list of occurrence matches across all candidates (parser
 *   coordinates: 1-based line, 0-based column).
 */
export async function scanCandidatesForOccurrences(
  candidates: Array<{ uri: string; content: string }>,
  target: { name: string; kind?: string },
): Promise<
  Array<{
    uri: string;
    identifierRange: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    };
  }>
> {
  const {
    CompilerService,
    FullSymbolCollectorListener,
    SymbolTable,
    findOccurrencesInFile,
  } = await import('@salesforce/apex-lsp-parser-ast');

  const out: Array<{
    uri: string;
    identifierRange: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    };
  }> = [];

  // De-dupe candidate URIs so a file mentioned twice is scanned once.
  const seen = new Set<string>();
  for (const candidate of candidates) {
    if (seen.has(candidate.uri)) continue;
    seen.add(candidate.uri);
    try {
      const table = new SymbolTable();
      const listener = new FullSymbolCollectorListener(table);
      const result = new CompilerService().compile(
        candidate.content,
        candidate.uri,
        listener,
        { collectReferences: true, resolveReferences: true },
      );
      const st = result?.result instanceof SymbolTable ? result.result : table;
      const matches = findOccurrencesInFile(st, candidate.uri, target);
      for (const m of matches) {
        out.push({ uri: m.uri, identifierRange: m.identifierRange });
      }
    } catch (err) {
      // A candidate that fails to parse contributes no matches rather than
      // failing the whole request; the others still resolve.
      getLogger().warn(
        () => `[REFERENCES] phase2 scan failed for ${candidate.uri}: ${err}`,
      );
    }
  }
  return out;
}

/**
 * Resolve the target symbol under the cursor to its NAME and kind, for the
 * workspace-wide find-references rebuild. Only name+kind are needed here — no
 * declaring-file lookup, type prefetch, or dependent loading (phase-2 does the
 * symbolic match). Resolution order: precise position→symbol first, then fall
 * back to the reference name under the cursor resolved by name.
 *
 * The cursor file must already be compiled at full detail (so in-body usages
 * resolve) before this runs.
 */
export async function targetSymbolForCursor(
  svc: RequestServices,
  uri: string,
  position: { line: number; character: number },
): Promise<{ name: string; kind?: string } | null> {
  try {
    // LSP (0-based line) → parser (1-based line, 0-based column).
    const parserPosition = {
      line: position.line + 1,
      character: position.character,
    };

    // Preferred: precise position→symbol resolution carries name + kind.
    const symbol = (await svc.symbolManager.getSymbolAtPosition(
      uri,
      parserPosition,
      'precise',
    )) as { name?: string; kind?: unknown } | null;
    if (symbol?.name) {
      return {
        name: symbol.name,
        kind: typeof symbol.kind === 'string' ? symbol.kind : undefined,
      };
    }

    // Fallback: 'precise' returns null when the cursor's reference isn't yet
    // bound to a resolvedSymbolId. The reference still carries the NAME; resolve
    // it by name to recover the kind.
    const refs = await svc.symbolManager.getReferencesAtPosition(
      uri,
      parserPosition,
    );
    const name = refs?.[0]?.name;
    if (!name) return null;
    const leaf = name.includes('.') ? name.split('.').pop()! : name;
    const named = (await svc.symbolManager.findSymbolByName(leaf))?.[0] as
      { name?: string; kind?: unknown } | undefined;
    return {
      name: named?.name ?? leaf,
      kind: named && typeof named.kind === 'string' ? named.kind : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * A declaration's file URI and identifier range (parser coordinates: 1-based
 * line, 0-based column), as returned by {@link declarationLocationForCursor}.
 */
type DeclarationLocation = {
  uri: string;
  identifierRange: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
};

/**
 * Resolve the DECLARATION location of the symbol under the cursor, for
 * find-references with `includeDeclaration`. Uses the same precise
 * position→symbol resolution as {@link targetSymbolForCursor}; when the cursor
 * is on a usage rather than the declaration, resolves the usage's reference to
 * its declaring symbol by name. Returns the declaration's identifier range in
 * parser coordinates (1-based line, 0-based column), or null when it can't be
 * determined (the caller then simply omits the declaration).
 */
export async function declarationLocationForCursor(
  svc: RequestServices,
  uri: string,
  position: { line: number; character: number },
): Promise<DeclarationLocation | null> {
  try {
    const parserPosition = {
      line: position.line + 1,
      character: position.character,
    };

    const asDecl = (sym: unknown): DeclarationLocation | null => {
      const s = sym as {
        fileUri?: string;
        location?: { identifierRange?: DeclarationLocation['identifierRange'] };
      } | null;
      const ir = s?.location?.identifierRange;
      if (!s?.fileUri || !ir) return null;
      return { uri: s.fileUri, identifierRange: ir };
    };

    // Preferred: the precise symbol at the cursor IS the declaration (cursor on
    // the declaration itself) or the symbol a usage resolves to.
    const precise = await svc.symbolManager.getSymbolAtPosition(
      uri,
      parserPosition,
      'precise',
    );
    const fromPrecise = asDecl(precise);
    if (fromPrecise) return fromPrecise;

    // Fallback: resolve the reference name under the cursor to its declaration.
    const refs = await svc.symbolManager.getReferencesAtPosition(
      uri,
      parserPosition,
    );
    const name = refs?.[0]?.name;
    if (!name) return null;
    const leaf = name.includes('.') ? name.split('.').pop()! : name;
    const named = (await svc.symbolManager.findSymbolByName(leaf))?.[0];
    return asDecl(named);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Enrichment dispatch handlers (Step 11 on the original file)
// ---------------------------------------------------------------------------

const requestHandlers = {
  DispatchHover: effectRequestHandler<PositionReq>(
    'DispatchHover',
    (svc, req) =>
      Effect.gen(function* () {
        const { version, detailLevel } = yield* loadSymbolDataForEnrichment(
          svc,
          req.textDocument.uri,
          req.content,
        );

        // The data-owner only retains public-api detail. Recompile the live
        // cursor file locally so private members, fields, and locals exist.
        yield* Effect.promise(() =>
          recompileCursorFileAtFullDetail(
            svc,
            req.textDocument.uri,
            req.content,
          ),
        );

        // Hover requires 'full' detail level per LspRequestPrerequisiteMapping
        const requiredLevel = 'full';
        const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);

        const result = yield* Effect.promise(() =>
          svc.hoverService.processHover({
            textDocument: { uri: req.textDocument.uri },
            position: req.position,
          }),
        );

        // Write back enriched symbols if enrichment occurred
        if (needsEnrichment) {
          yield* writeBackEnrichedSymbols(
            svc,
            req.textDocument.uri,
            version,
            requiredLevel,
          );
        }

        return result;
      }),
  ),
  DispatchCompletion: effectRequestHandler<CompletionReq>(
    'DispatchCompletion',
    (svc, req) =>
      Effect.gen(function* () {
        // Completion runs on the in-flight (possibly unsaved) document text, so
        // load the local subset from that content rather than the data-owner's
        // last-stored version.
        const { version, detailLevel } = yield* loadSymbolDataForEnrichment(
          svc,
          req.textDocument.uri,
          req.content,
        );

        // Completion operates on in-flight declarations, not the data-owner's
        // previous public-api snapshot.
        yield* Effect.promise(() =>
          recompileCursorFileAtFullDetail(
            svc,
            req.textDocument.uri,
            req.content,
          ),
        );

        // Completion needs full member visibility for member-access suggestions.
        const requiredLevel = 'full';
        const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);

        // triggerKind crosses the wire as a plain number but IS a
        // CompletionTriggerKind value (1/2/3); the worker avoids importing LSP
        // types, so build the params untyped and let the service narrow.
        const completionParams = {
          textDocument: { uri: req.textDocument.uri },
          position: req.position,
          ...(req.context ? { context: req.context } : {}),
        };
        const result = yield* Effect.promise(() =>
          svc.completionService.processCompletion(
            completionParams as Parameters<
              typeof svc.completionService.processCompletion
            >[0],
          ),
        );

        if (needsEnrichment) {
          yield* writeBackEnrichedSymbols(
            svc,
            req.textDocument.uri,
            version,
            requiredLevel,
          );
        }

        return result;
      }),
  ),
  DispatchSignatureHelp: effectRequestHandler<SignatureHelpReq>(
    'DispatchSignatureHelp',
    (svc, req) =>
      Effect.gen(function* () {
        // Signature help runs on the in-flight document text while typing args.
        const { version, detailLevel } = yield* loadSymbolDataForEnrichment(
          svc,
          req.textDocument.uri,
          req.content,
        );
        const requiredLevel = 'full';
        const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);
        const params = {
          textDocument: { uri: req.textDocument.uri },
          position: req.position,
          ...(req.context !== undefined ? { context: req.context } : {}),
        };
        const result = yield* Effect.promise(() =>
          svc.signatureHelpService.processSignatureHelp(
            params as Parameters<
              typeof svc.signatureHelpService.processSignatureHelp
            >[0],
          ),
        );
        if (needsEnrichment) {
          yield* writeBackEnrichedSymbols(
            svc,
            req.textDocument.uri,
            version,
            requiredLevel,
          );
        }
        return result;
      }),
  ),
  DispatchCodeAction: effectRequestHandler<CodeActionReq>(
    'DispatchCodeAction',
    (svc, req) =>
      Effect.gen(function* () {
        const { version, detailLevel } = yield* loadSymbolDataForEnrichment(
          svc,
          req.textDocument.uri,
          req.content,
        );
        const requiredLevel = 'full';
        const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);
        const params = {
          textDocument: { uri: req.textDocument.uri },
          range: req.range,
          ...(req.context !== undefined ? { context: req.context } : {}),
        };
        const result = yield* Effect.promise(() =>
          svc.codeActionService.processCodeAction(
            params as Parameters<
              typeof svc.codeActionService.processCodeAction
            >[0],
          ),
        );
        if (needsEnrichment) {
          yield* writeBackEnrichedSymbols(
            svc,
            req.textDocument.uri,
            version,
            requiredLevel,
          );
        }
        return result;
      }),
  ),
  DispatchDefinition: effectRequestHandler<PositionReq>(
    'DispatchDefinition',
    (svc, req) =>
      Effect.gen(function* () {
        const { version, detailLevel } = yield* loadSymbolDataForEnrichment(
          svc,
          req.textDocument.uri,
          req.content,
        );

        yield* Effect.promise(() =>
          recompileCursorFileAtFullDetail(
            svc,
            req.textDocument.uri,
            req.content,
          ),
        );

        // Definition requires 'full' detail level per LspRequestPrerequisiteMapping
        const requiredLevel = 'full';
        const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);

        const result = yield* Effect.promise(() =>
          svc.definitionService.processDefinition({
            textDocument: { uri: req.textDocument.uri },
            position: req.position,
          }),
        );

        // Write back enriched symbols if enrichment occurred
        if (needsEnrichment) {
          yield* writeBackEnrichedSymbols(
            svc,
            req.textDocument.uri,
            version,
            requiredLevel,
          );
        }

        return result;
      }),
  ),
  DispatchReferences: requestHandler<RefsReq>(
    'DispatchReferences',
    async (svc, req) => {
      // Find-references (W-23272674) runs a workspace-wide, two-phase scan:
      //   phase-1 (data-owner): cheap lexical prefilter of all stored workspace
      //     documents for the target name → candidate {uri, content};
      //   phase-2 (here): parse each candidate STANDALONE and scan its own
      //     references for genuine usages of the target — no shared-graph
      //     ingest (see scanCandidatesForOccurrences / memory
      //     project-findreferences-standalone-pivot).
      // The cursor file still needs a full-detail recompile so the TARGET under
      // the cursor resolves to a name + kind (the data-owner serves public-api
      // detail, bodies stripped). That single recompile is bounded and stable;
      // the former per-candidate ingest was the unbounded cost that timed out.
      const cursorTextAvailable = typeof req.content === 'string';
      const cursorRecompiled = await recompileCursorFileAtFullDetail(
        svc,
        req.textDocument.uri,
        req.content,
      );

      // With no document text the cursor file stays at public-api detail and
      // the position→symbol lookup cannot succeed; return an explicit empty
      // result rather than a misleading no-match.
      if (!cursorRecompiled && !cursorTextAvailable) {
        getLogger().warn(
          () =>
            `[REFERENCES] No document text for ${req.textDocument.uri}; ` +
            'cursor file cannot be recompiled at full detail, so position ' +
            'resolution cannot succeed. Aborting with an empty result.',
        );
        return [];
      }

      // --- Phase-1: resolve the target, then lexically prefilter the workspace.
      const target = await targetSymbolForCursor(
        svc,
        req.textDocument.uri,
        req.position,
      );
      emitWorkerLog(
        'info',
        `[REFERENCES] target: name=${target?.name ?? '<none>'} ` +
          `kind=${target?.kind ?? '<none>'}`,
      );
      if (!target?.name) return [];

      const scan = (await requestCoordinatorAssistancePromiseShared(
        'dataOwner:FindOccurrenceCandidates',
        { symbolName: target.name },
        true,
      )) as { candidates: Array<{ uri: string; content: string }> };
      const rawCandidates = scan?.candidates ?? [];

      // Live-buffer fidelity for the file under the cursor: phase-1 and phase-2
      // both scan the data-owner's STORED content, which can lag the unsaved
      // editor buffer. `req.content` is the live text for the cursor file, so
      // override that one candidate's content with it (matched by URI). Other
      // files keep their stored content. Safe for phase-2, which parses each
      // candidate's `content` standalone (see scanCandidatesForOccurrences).
      const candidates =
        typeof req.content === 'string'
          ? rawCandidates.map((c) =>
              c.uri === req.textDocument.uri
                ? { ...c, content: req.content as string }
                : c,
            )
          : rawCandidates;
      emitWorkerLog('info', `[REFERENCES] candidates: ${candidates.length}`);

      // --- Phase-2: standalone parse + reference scan over each candidate.
      const occurrences = await scanCandidatesForOccurrences(
        candidates,
        target,
      );
      emitWorkerLog(
        'info',
        `[REFERENCES] phase2: ${occurrences.length} occurrence(s) across ` +
          `${candidates.length} candidate(s)`,
      );

      // Build the LSP result. Parser coordinates are 1-based line / 0-based
      // column; LSP is 0-based line, so subtract 1 from each line. De-dupe by
      // (uri, range) so a symbol referenced twice at the same token — or the
      // declaration coinciding with a reference — is one entry.
      const locations: Array<{
        uri: string;
        range: {
          start: { line: number; character: number };
          end: { line: number; character: number };
        };
      }> = [];
      const seenRanges = new Set<string>();
      const pushLocation = (
        uri: string,
        r: {
          startLine: number;
          startColumn: number;
          endLine: number;
          endColumn: number;
        },
      ): void => {
        // NUL separator between uri and range so a URI ending in digits can't
        // abut the line number and collapse two distinct (uri,range) pairs onto
        // one key. Pure safety; behavior unchanged for real URIs.
        const key = `${uri}\x1f${r.startLine}:${r.startColumn}:${r.endLine}:${r.endColumn}`;
        if (seenRanges.has(key)) return;
        seenRanges.add(key);
        locations.push({
          uri,
          range: {
            start: { line: r.startLine - 1, character: r.startColumn },
            end: { line: r.endLine - 1, character: r.endColumn },
          },
        });
      };

      // Include the declaration when requested. The cursor file was recompiled
      // into the shared graph above, so the precise symbol at the cursor (or
      // the symbol its usage resolves to) carries the declaration's identifier
      // range.
      if (req.context.includeDeclaration) {
        const decl = await declarationLocationForCursor(
          svc,
          req.textDocument.uri,
          req.position,
        );
        if (decl) pushLocation(decl.uri, decl.identifierRange);
      }

      for (const occ of occurrences) {
        pushLocation(occ.uri, occ.identifierRange);
      }

      emitWorkerLog(
        'info',
        `[REFERENCES] done (${locations.length} location(s))`,
      );
      return locations;
    },
  ),
  DispatchImplementation: effectRequestHandler<PositionReq>(
    'DispatchImplementation',
    (svc, req) =>
      Effect.gen(function* () {
        // Mirror the references enrichment shape, but for the inbound IMPLEMENTS /
        // EXTENDS direction:
        //   load symbol data → load inbound implementor/subtype tables →
        //   resolve cross-file edges → process → write back.
        const { version, detailLevel } = yield* loadSymbolDataForEnrichment(
          svc,
          req.textDocument.uri,
        );

        // Go-to-implementation must see every implementor/subtype of the target
        // type, which live in *other* files. loadDependentsForReferences pulls the
        // inbound tables (files whose declared symbols reference symbols in this
        // file) from the data-owner AND resolves each one's cross-file references,
        // so the implements/extends edges authored on those implementor/subclass
        // files land in this worker's reverse index — which is what
        // ImplementationProcessingService.findSubtypes reads.
        yield* Effect.promise(() =>
          loadDependentsForReferences(svc, req.textDocument.uri),
        );

        // Also resolve the target file's own cross-file refs (e.g. an interface
        // that extends another interface) so the full supertype graph is present.
        yield* svc.symbolManager.resolveCrossFileReferencesForFile(
          req.textDocument.uri,
        );

        // Implementor discovery reads interfaces/superClass + method declarations,
        // which are present at 'full' detail (per LspRequestPrerequisiteMapping).
        const requiredLevel = 'full';
        const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);

        const result = yield* Effect.promise(() =>
          svc.implementationService.processImplementation({
            textDocument: { uri: req.textDocument.uri },
            position: req.position,
          }),
        );

        if (needsEnrichment) {
          yield* writeBackEnrichedSymbols(
            svc,
            req.textDocument.uri,
            version,
            requiredLevel,
          );
        }

        return result;
      }),
  ),
  DispatchDocumentSymbol: effectRequestHandler<DocWithContentReq>(
    'DispatchDocumentSymbol',
    (svc, req) =>
      Effect.gen(function* () {
        // documentSymbol re-compiles the file from its TEXT
        // (DefaultApexDocumentSymbolProvider parses with
        // FullSymbolCollectorListener for a complete hierarchy) rather than
        // reading the dataOwner symbol graph. So the pool worker must have the
        // document text in local storage: thread req.content into
        // loadSymbolDataForEnrichment, which stores it before the provider runs.
        // Without it the provider's storage.getDocument() returns null and the
        // outline is empty (the cold-open regression).
        yield* loadSymbolDataForEnrichment(
          svc,
          req.textDocument.uri,
          req.content,
        );
        return yield* Effect.promise(() =>
          svc.documentSymbolService.processDocumentSymbol({
            textDocument: { uri: req.textDocument.uri },
          }),
        );
      }),
  ),
  DispatchCodeLens: effectRequestHandler<DocOnlyReq>(
    'DispatchCodeLens',
    (svc, req) =>
      Effect.gen(function* () {
        yield* loadSymbolDataForEnrichment(svc, req.textDocument.uri);
        return yield* Effect.fn('worker.lspRequest.processCodeLens', {
          attributes: { uri: req.textDocument.uri },
        })(function* () {
          return yield* Effect.promise(() =>
            svc.codeLensService.processCodeLens({
              textDocument: { uri: req.textDocument.uri },
            }),
          );
        })();
      }),
  ),
  DispatchDiagnostic: effectRequestHandler<DocOnlyReq>(
    'DispatchDiagnostic',
    (svc, req) =>
      Effect.gen(function* () {
        const { version, detailLevel } = yield* loadSymbolDataForEnrichment(
          svc,
          req.textDocument.uri,
        );

        // Diagnostics requires 'full' detail level per LspRequestPrerequisiteMapping
        const requiredLevel = 'full';
        const needsEnrichment = shouldEnrich(detailLevel, requiredLevel);

        const result = yield* Effect.promise(() =>
          svc.diagnosticService.processDiagnostic({
            textDocument: { uri: req.textDocument.uri },
          }),
        );

        // Write back enriched symbols if enrichment occurred
        if (needsEnrichment) {
          yield* writeBackEnrichedSymbols(
            svc,
            req.textDocument.uri,
            version,
            requiredLevel,
          );
        }

        return result;
      }),
  ),
  DispatchCrossFileEnrichment: effectRequestHandler<DocOnlyReq>(
    'DispatchCrossFileEnrichment',
    (svc, req) =>
      Effect.gen(function* () {
        const { version } = yield* loadSymbolDataForEnrichment(
          svc,
          req.textDocument.uri,
        );
        yield* svc.symbolManager.resolveCrossFileReferencesForFile(
          req.textDocument.uri,
        );
        yield* writeBackEnrichedSymbols(
          svc,
          req.textDocument.uri,
          version,
          'public-api',
        );
        return { resolved: true };
      }),
  ),
};

// ---------------------------------------------------------------------------
// Write-back metrics tracking (worker.platform.ts:161-194)
//
// Not named in the plan's export list — moved here because it's mutated
// inside UpdateSymbolSubset, which is moving in this task. The two exported
// accessor wrappers Node carried (`getWriteBackMetrics`/
// `resetWriteBackMetrics`) are confirmed dead (zero consumers repo-wide, per
// the plan doc) and are intentionally NOT re-exported here — only the
// underlying mutable object, which UpdateSymbolSubset needs, moves.
// ---------------------------------------------------------------------------

interface WriteBackMetrics {
  attempted: number;
  accepted: number;
  rejectedVersionMismatch: number;
  rejectedDocumentMissing: number;
  rejectedDetailLevel: number;
  totalSymbolsMerged: number;
}

const writeBackMetrics: WriteBackMetrics = {
  attempted: 0,
  accepted: 0,
  rejectedVersionMismatch: 0,
  rejectedDocumentMissing: 0,
  rejectedDetailLevel: 0,
  totalSymbolsMerged: 0,
};

// ---------------------------------------------------------------------------
// Handlers — one per _tag in AllWorkerRequests
// ---------------------------------------------------------------------------

type SerializedWorkerHandlers = WorkerRunner.SerializedRunner.Handlers<
  Schema.Schema.Type<typeof AllWorkerRequests>
>;

type UntypedWorkerHandler = (
  request: never,
) => Effect.Effect<unknown, unknown, never>;

/**
 * Apply the incoming coordinator context and create one processing span for a
 * serialized worker request. Keeping this at the runner boundary prevents a
 * role-specific handler factory from accidentally being the only traced path.
 */
export function withWorkerRequestTracing<A, E>(
  tag: string,
  request: { readonly traceContext?: string },
  effect: Effect.Effect<A, E, never>,
): Effect.Effect<A, E, never> {
  const role = assignedRole ?? 'unassigned';
  const tracedEffect = Effect.fn(`worker.${role}.${tag}`, {
    attributes: { telemetryIgnore: true, 'worker.role': role },
  })(() => effect)();

  return workerTracingHooks.withParent(request, tracedEffect);
}

const untracedHandlers: SerializedWorkerHandlers = {
  WorkerInit: (req) => {
    if (assignedRole !== null) {
      return Effect.die(
        new Error('WorkerInit received but role already assigned'),
      );
    }
    setAssignedRole(req.role);
    if (req.logLevel) {
      setWorkerLogLevel(req.logLevel);
    }
    const resolvedServerMode = req.serverMode ?? 'production';
    ApexCapabilitiesManager.getInstance().setMode(resolvedServerMode);
    (globalThis as Record<string, unknown>).__apexWorkerInitServerMode =
      resolvedServerMode;

    // Initialize worker tracing if span collector URL provided (desktop only)
    if (req.spanCollectorUrl) {
      const serviceName = `apex-ls-worker-${req.role}`;
      workerTracingHooks.initialize(req.spanCollectorUrl, serviceName);
    }

    return Effect.gen(function* () {
      yield* Effect.logInfo(
        `[worker] role=${req.role} protocol=v${req.protocolVersion}/${WIRE_PROTOCOL_VERSION}` +
          ` logLevel=${currentWorkerLogLevel}` +
          (req.spanCollectorUrl ? ' tracing=enabled' : ''),
      );
    }).pipe(Effect.flatMap(() => handleWorkerInitRole(req)));
  },

  PingWorker: (req) =>
    guardRole('PingWorker').pipe(Effect.map(() => ({ echo: req.echo }))),

  WorkerRemoteStdlibWarmup: (_req) =>
    guardRole('WorkerRemoteStdlibWarmup').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          if (assignedRole === 'dataOwner') {
            yield* ensureDataOwnerServices;
            yield* Effect.tryPromise({
              try: () => warmRemoteStdlibNamespaceCacheShared(),
              catch: (e) => ({
                _tag: 'WorkerRemoteStdlibWarmupError' as const,
                message: e instanceof Error ? e.message : String(e),
              }),
            });
          } else if (assignedRole === 'lspRequest') {
            yield* ensureRequestServices;
            yield* Effect.tryPromise({
              try: () => warmRemoteStdlibNamespaceCacheShared(),
              catch: (e) => ({
                _tag: 'WorkerRemoteStdlibWarmupError' as const,
                message: e instanceof Error ? e.message : String(e),
              }),
            });
          } else if (assignedRole === 'compilation') {
            yield* ensureCompilationServices;
            yield* Effect.tryPromise({
              try: () => warmRemoteStdlibNamespaceCacheShared(),
              catch: (e) => ({
                _tag: 'WorkerRemoteStdlibWarmupError' as const,
                message: e instanceof Error ? e.message : String(e),
              }),
            });
          } else if (assignedRole === 'resourceLoader') {
            // resourceLoader IS the stdlib source - warm it by initializing ResourceLoader
            // which triggers stdlib protobuf loading and namespace indexing
            const { ResourceLoader } = yield* Effect.promise(
              () => import('@salesforce/apex-lsp-parser-ast'),
            );
            yield* Effect.tryPromise({
              try: () => ResourceLoader.getInstance().initialize(),
              catch: (e) => ({
                _tag: 'WorkerRemoteStdlibWarmupError' as const,
                message: e instanceof Error ? e.message : String(e),
              }),
            });
          }
          return { ok: true as const };
        }),
      ),
    ),

  // -- Data-owner handlers (routed through internal tiered queue) ------------

  QuerySymbolSubset: (req) =>
    guardRole('QuerySymbolSubset').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const sm = svc.symbolManager;
            const storage = svc.storageManager.getStorage();
            const cache = getDocumentStateCache();

            const entries: Record<string, unknown> = {};
            const versions: Record<string, number> = {};
            const detailLevels: Record<
              string,
              'public-api' | 'protected' | 'private' | 'full'
            > = {};

            const serializeSt = (
              st: Awaited<ReturnType<typeof sm.getSymbolTableForFile>> & object,
            ) =>
              cloneForWire({
                symbols: st.getAllSymbols(),
                references: st.getAllReferences(),
                hierarchicalReferences: st.getAllHierarchicalReferences(),
                metadata: st.getMetadata(),
                fileUri: st.getFileUri(),
              });

            for (const uri of req.uris) {
              // Get symbol table
              const st = yield* Effect.promise(() =>
                sm.getSymbolTableForFile(uri),
              );
              entries[uri] = st ? serializeSt(st) : null;

              // Get document version
              const doc = yield* Effect.promise(() => storage.getDocument(uri));
              versions[uri] = doc?.version ?? -1;

              // Get detail level from cache
              const state = cache.getCurrentState(uri);
              const level = state?.detailLevel ?? 'public-api';
              // Ensure type safety
              detailLevels[uri] =
                level === 'public-api' ||
                level === 'protected' ||
                level === 'private' ||
                level === 'full'
                  ? level
                  : 'public-api';
            }

            return { entries, versions, detailLevels };
          }),
        ),
      ),
    ),

  // Deterministic readiness wait: block until the symbol graph for
  // {uri, version} is populated, or report why not.
  //
  // "Snapshot in runner, await outside": the serial data-owner fiber must never
  // block on a Deferred whose resolver (UpdateSymbolSubset) is queued behind it
  // on that same fiber — that is a self-deadlock. So the only work done *inside*
  // the runner (peekReadiness) is a fast, non-blocking read that returns either
  // an immediate verdict or the latch's Deferred handle. The actual wait happens
  // here, on the handler's own fiber.
  AwaitSymbolReadiness: (req) =>
    guardRole('AwaitSymbolReadiness').pipe(
      Effect.flatMap(() => {
        // Peek: resolve the current state through the serial runner without
        // blocking it. Returns the latch's Deferred only when a compile for this
        // (or a newer) version is actually pending.
        // A negative req.version means "match whatever version is currently
        // armed" — the coordinator gate uses it when the triggering request
        // (e.g. documentSymbol) carries no version of its own and simply wants
        // the latest open/change to finish compiling.
        const matchLatest = req.version < 0;
        const peekReadiness = dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const st = yield* Effect.promise(() =>
              svc.symbolManager.getSymbolTableForFile(req.uri),
            );
            const latch = readinessLatches.get(req.uri);
            if (symbolsAreCurrent(req.uri, req.version, st != null)) {
              return { kind: 'ready' as const };
            }
            if (!latch) {
              // Nothing armed: no open/change is driving a compile for this URI.
              // The coordinator decides whether to fall back to a local handler.
              return { kind: 'no-latch' as const };
            }
            if (!matchLatest && latch.version > req.version) {
              // A newer edit superseded the version we were asked about.
              return { kind: 'stale-version' as const };
            }
            return { kind: 'await' as const, deferred: latch.deferred };
          }),
        );

        return Effect.gen(function* () {
          const snapshot = yield* peekReadiness;
          if (snapshot.kind === 'ready') {
            return { ready: true };
          }
          if (snapshot.kind === 'no-latch') {
            return { ready: false, reason: 'no-compile-pending' as const };
          }
          if (snapshot.kind === 'stale-version') {
            return { ready: false, reason: 'stale-version' as const };
          }

          // Await the latch off the serial fiber, bounded by the caller's
          // timeout. A `false` here means the timer won the race.
          const fired = yield* Deferred.await(snapshot.deferred).pipe(
            Effect.as(true),
            Effect.timeoutTo({
              duration: `${req.timeoutMs} millis`,
              onTimeout: () => false,
              onSuccess: () => true,
            }),
          );
          if (!fired) {
            return { ready: false, reason: 'timeout' as const };
          }

          // The latch resolves on a successful merge, on supersession by a newer
          // version, AND on a rejected write-back (armReadiness/clearReadiness/
          // the reject branches). Re-peek with the SAME currency check as the
          // initial peek (symbolsAreCurrent) to tell a real merge from a stale
          // wake-up: a supersession or rejected-write-back wake-up leaves the
          // prior version's table present while the merged version has NOT
          // advanced — reporting ready off that stale table is the bug. When not
          // current, return stale-version so the coordinator re-issues the gate
          // against the newer version.
          const after = yield* dataOwnerRead(
            Effect.gen(function* () {
              const svc = yield* ensureDataOwnerServices;
              const st = yield* Effect.promise(() =>
                svc.symbolManager.getSymbolTableForFile(req.uri),
              );
              return symbolsAreCurrent(req.uri, req.version, st != null);
            }),
          );
          return after
            ? { ready: true }
            : { ready: false, reason: 'stale-version' as const };
        });
      }),
    ),

  UpdateSymbolSubset: (req) =>
    guardRole('UpdateSymbolSubset').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            writeBackMetrics.attempted++;

            const svc = yield* ensureDataOwnerServices;
            const storage = svc.storageManager.getStorage();
            const cache = getDocumentStateCache();

            // Version validation
            const currentDoc = yield* Effect.promise(() =>
              storage.getDocument(req.uri),
            );

            if (!currentDoc) {
              writeBackMetrics.rejectedDocumentMissing++;
              yield* Effect.annotateCurrentSpan(
                'data_owner.outcome',
                'rejected-document-missing',
              );
              yield* Effect.logDebug(
                `[DATA-OWNER] Write-back rejected: document not found for ${req.uri}`,
              );
              // Terminal for this version: no document means no awaiter can ever
              // be satisfied by it. Release so the coordinator stops waiting and
              // falls back rather than blocking the full gate budget.
              resolveReadiness(req.uri, req.documentVersion);
              return {
                accepted: false,
                merged: 0,
                versionMismatch: false,
              };
            }

            if (currentDoc.version !== req.documentVersion) {
              writeBackMetrics.rejectedVersionMismatch++;
              yield* Effect.annotateCurrentSpan({
                'data_owner.outcome': 'rejected-version-mismatch',
                'document.current_version': currentDoc.version,
              });
              yield* Effect.logDebug(
                '[DATA-OWNER] Write-back rejected: version mismatch ' +
                  `(current=${currentDoc.version}, update=${req.documentVersion}) ` +
                  `for ${req.uri} from ${req.sourceWorkerId}`,
              );
              // The compile was for a stale version; the current version's
              // write-back (if any) will resolve its own latch. Release any
              // awaiter for this version so it re-evaluates.
              resolveReadiness(req.uri, req.documentVersion);
              return {
                accepted: false,
                merged: 0,
                versionMismatch: true,
              };
            }

            // Detail level validation
            // When no cache entry exists (file not yet compiled on data-owner),
            // currentOrder is 0 so any write-back level is accepted.
            const currentState = cache.getCurrentState(req.uri);
            const rawLevel = currentState?.detailLevel;
            const currentOrder =
              rawLevel === 'public-api' ||
              rawLevel === 'protected' ||
              rawLevel === 'private' ||
              rawLevel === 'full'
                ? getLayerOrderIndex(rawLevel)
                : 0;
            const enrichedOrder = getLayerOrderIndex(req.enrichedDetailLevel);

            // The detail-level downgrade guard prevents a poorer enrichment from
            // overwriting a richer one — but ONLY for the SAME document version.
            // A write-back for a NEWER version carries fresh content and MUST
            // merge even at an equal/lower detail level: the cached level
            // describes the OLD version's symbols, which are now stale. Guarding
            // on level alone dropped a new version's symbols whenever its compile
            // happened to land at the same level (e.g. public-api after an edit),
            // leaving the graph stuck on the prior version's symbols until some
            // later write-back happened to raise the level. Only skip when the
            // cache is at the same-or-newer version AND same-or-richer level.
            const cachedVersion = currentState?.documentVersion ?? -1;
            const sameOrOlderVersion = req.documentVersion <= cachedVersion;
            if (sameOrOlderVersion && enrichedOrder <= currentOrder) {
              writeBackMetrics.rejectedDetailLevel++;
              yield* Effect.annotateCurrentSpan({
                'data_owner.outcome': 'rejected-detail-level',
                'document.cached_version': cachedVersion,
                'symbol.current_detail_level': rawLevel ?? 'none',
              });
              yield* Effect.logDebug(
                `[DATA-OWNER] Write-back skipped: already have ${rawLevel ?? 'none'} ` +
                  `(order=${currentOrder}) >= ${req.enrichedDetailLevel} ` +
                  `at v${cachedVersion} >= v${req.documentVersion} for ${req.uri}`,
              );
              // Symbols at this (or a richer) level are already in the graph for
              // this (or a newer) version — the awaiter's data IS ready. Release.
              resolveReadiness(req.uri, req.documentVersion);
              return { accepted: false, merged: 0, versionMismatch: false };
            }

            // Deserialize enriched symbol table
            const enrichedSt = yield* Effect.withSpan(
              'dataOwner.update.deserialize',
              { attributes: { 'document.uri': req.uri } },
            )(
              Effect.gen(function* () {
                const { SymbolTable } = yield* Effect.promise(
                  () => import('@salesforce/apex-lsp-parser-ast'),
                );
                return SymbolTable.fromSerializedData(
                  req.enrichedSymbolTable as never,
                );
              }),
            );

            const mergedCount = enrichedSt.getAllSymbols().length;
            const referenceCount = enrichedSt.getAllReferences().length;

            // Merge into symbol manager (returns Effect, so yield directly)
            yield* Effect.withSpan('dataOwner.update.mergeSymbols', {
              attributes: {
                'document.uri': req.uri,
                'document.version': req.documentVersion,
                'symbol.count': mergedCount,
                'reference.count': referenceCount,
              },
            })(
              svc.symbolManager.addSymbolTable(
                enrichedSt,
                req.uri,
                req.documentVersion,
                false, // hasErrors
              ),
            );

            // Populate cross-file incoming edges for this file now that its
            // symbols are merged. During workspace batch load the workspace load
            // session is active and we skip eager full per-file resolution —
            // addSymbolTable already deferred supertype edges to deferredResolutions
            // (drained at session end), and ordinary cross-file refs resolve on-demand
            // via PrerequisiteOrchestrationService. After the workspace load session
            // ends, single-file didOpen/didChange write-backs (session inactive) still
            // resolve eagerly for that one file — bounded, correct interactive behavior.
            if (!svc.symbolManager.isWorkspaceLoadSessionActive()) {
              yield* Effect.withSpan('dataOwner.update.resolveCrossFile', {
                attributes: {
                  'document.uri': req.uri,
                  'reference.count': referenceCount,
                },
              })(svc.symbolManager.resolveCrossFileReferencesForFile(req.uri));
            }

            // Update cache with new detail level
            cache.merge(req.uri, {
              documentVersion: req.documentVersion,
              detailLevel: req.enrichedDetailLevel,
              timestamp: Date.now(),
            });

            writeBackMetrics.accepted++;
            writeBackMetrics.totalSymbolsMerged += mergedCount;

            yield* Effect.annotateCurrentSpan({
              'data_owner.outcome': 'accepted',
              'symbol.count': mergedCount,
              'reference.count': referenceCount,
            });

            // Symbols for this version are now in the graph — release any
            // coordinator request awaiting readiness for this URI/version.
            resolveReadiness(req.uri, req.documentVersion);

            // Log to both Effect logger and console for debugging
            const logMsg =
              `[DATA-OWNER] Write-back accepted: ${mergedCount} symbols ` +
              `merged at ${req.enrichedDetailLevel} level for ${req.uri} ` +
              `(from ${req.sourceWorkerId})`;
            console.log(logMsg);
            yield* Effect.logDebug(logMsg);

            return {
              accepted: true,
              merged: mergedCount,
              versionMismatch: false,
            };
          }),
          {
            spanName: 'dataOwner.update.execute',
            attributes: {
              'document.uri': req.uri,
              'document.version': req.documentVersion,
              'symbol.detail_level': req.enrichedDetailLevel,
              'worker.source_id': req.sourceWorkerId,
            },
          },
        ),
      ),
    ),

  FindOccurrenceCandidates: (req) =>
    guardRole('FindOccurrenceCandidates').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const { textMentionsSymbol } = yield* Effect.promise(
              () => import('@salesforce/apex-lsp-parser-ast'),
            );
            const all = yield* Effect.promise(() =>
              svc.storageManager.getStorage().getAllDocumentContents(),
            );
            const candidates = all.filter((d) =>
              textMentionsSymbol(d.content, req.symbolName),
            );
            emitWorkerLog(
              'info',
              `[REFERENCES] FindOccurrenceCandidates: symbol=${req.symbolName} ` +
                `scanned ${all.length} docs, ${candidates.length} candidates`,
            );
            return { candidates };
          }),
        ),
      ),
    ),

  DrainDeferredReferences: (req) =>
    guardRole('DrainDeferredReferences').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;

            // End workspace load session and resolve all deferred files (if sessionId provided)
            let processedCount = 0;
            if (req.sessionId) {
              const sessionId = req.sessionId; // Capture for type narrowing
              processedCount = yield* Effect.promise(() =>
                svc.symbolManager.endWorkspaceLoadSession(sessionId),
              );
              yield* Effect.logInfo(
                `[DATA-OWNER] End workspace load session: ${sessionId}, ` +
                  `resolved=${processedCount} deferred files`,
              );
            }

            // Drain remaining deferred references (legacy behavior)
            const resolved =
              yield* svc.symbolManager.drainAllDeferredReferences();
            yield* Effect.annotateCurrentSpan(
              'reference.resolved_count',
              resolved,
            );
            yield* Effect.logDebug(
              `[DATA-OWNER] DrainDeferredReferences resolved ${resolved} additional edge(s)`,
            );
            return { resolved, processedCount };
          }),
          {
            spanName: 'dataOwner.references.drain',
            attributes: req.sessionId
              ? { 'workspace.session_id': req.sessionId }
              : {},
          },
        ),
      ),
    ),

  ResolveDepUris: (req) =>
    guardRole('ResolveDepUris').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const sm = svc.symbolManager;

            const uris = new Set<string>();
            for (const name of req.classNames) {
              const files = yield* Effect.promise(() =>
                sm.findFilesForSymbol(name),
              );
              for (const f of files) uris.add(f);
            }

            const entries: Record<string, unknown> = {};
            for (const uri of uris) {
              const st = yield* Effect.promise(() =>
                sm.getSymbolTableForFile(uri),
              );
              if (st) {
                // Key the entry by the table's CANONICAL fileUri, not the
                // lookup `uri`. findFilesForSymbol strips the `file://` scheme
                // (returns `/test/X.cls`), so keying by `uri` would make the
                // requesting worker ingest the table under a schemeless URI that
                // never matches its references' `file:///test/X.cls` targets —
                // cross-file edges then fail to bind and find-references on a
                // usage of this type returns []. getFileUri() preserves scheme.
                const canonicalUri = st.getFileUri();
                entries[canonicalUri] = cloneForWire({
                  symbols: st.getAllSymbols(),
                  references: st.getAllReferences(),
                  hierarchicalReferences: st.getAllHierarchicalReferences(),
                  metadata: st.getMetadata(),
                  fileUri: canonicalUri,
                });
              }
            }

            return { entries };
          }),
        ),
      ),
    ),

  DataOwnerQuerySymbolByName: (req) =>
    guardRole('DataOwnerQuerySymbolByName').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const sm = svc.symbolManager;

            // Resolve a batch (`names`) or a single name. Batching lets an
            // enrichment worker collapse N per-keystroke blocking round-trips
            // into one. De-dupe so a name repeated across callers is queried
            // once.
            const queryNames = [
              ...new Set(
                (req.names && req.names.length > 0
                  ? req.names
                  : req.name
                    ? [req.name]
                    : []
                ).filter((n): n is string => !!n),
              ),
            ];

            // Optional namespace hint: a qualified reference (`MyNs.Foo`)
            // carries its leading qualifier so the data-owner can disambiguate
            // same-named matches across namespaces. Applied as a SOFT
            // preference, not a hard filter — if no symbol's namespace matches
            // the hint, fall back to all matches. This keeps inner-class
            // qualifiers (`Outer.Inner`, where `Outer` is a type, not a
            // namespace) working: nothing matches the hint, so all candidates
            // are returned as before.
            const nsHint = req.namespace?.toLowerCase();
            const symbolNamespace = (s: {
              namespace?: unknown;
            }): string | undefined => {
              const ns = s.namespace;
              if (!ns) return undefined;
              return (typeof ns === 'string' ? ns : String(ns)).toLowerCase();
            };

            const matches: Array<{
              name: string;
              fileUri: string;
              kind?: string;
            }> = [];
            const uris = new Set<string>();
            for (const queryName of queryNames) {
              // The data-owner holds ALL workspace symbols, so its name index
              // resolves names an enrichment worker's local subset may miss.
              const symbols = yield* Effect.promise(() =>
                sm.findSymbolByName(queryName),
              );
              const withFile = symbols.filter((s) => !!s?.fileUri);
              // Prefer the namespace-matched subset when the hint actually
              // matches something; otherwise keep every candidate.
              const nsMatched = nsHint
                ? withFile.filter((s) => symbolNamespace(s) === nsHint)
                : [];
              const selected = nsMatched.length > 0 ? nsMatched : withFile;
              for (const symbol of selected) {
                matches.push({
                  name: symbol.name,
                  fileUri: symbol.fileUri!,
                  kind:
                    typeof symbol.kind === 'string' ? symbol.kind : undefined,
                });
                uris.add(symbol.fileUri!);
              }
            }

            // Return the owning files' symbol tables so the worker can ingest
            // them and finish resolving the reference (mirrors ResolveDepUris).
            const entries: Record<string, unknown> = {};
            for (const uri of uris) {
              const st = yield* Effect.promise(() =>
                sm.getSymbolTableForFile(uri),
              );
              if (st) {
                entries[uri] = cloneForWire({
                  symbols: st.getAllSymbols(),
                  references: st.getAllReferences(),
                  hierarchicalReferences: st.getAllHierarchicalReferences(),
                  metadata: st.getMetadata(),
                  fileUri: st.getFileUri(),
                });
              }
            }

            return { matches, entries };
          }),
        ),
      ),
    ),

  ResolveDependentUris: (req) =>
    guardRole('ResolveDependentUris').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const { resolveDependentUris } = yield* Effect.promise(
              () => import('@salesforce/apex-lsp-parser-ast'),
            );
            const result = yield* Effect.promise(() =>
              resolveDependentUris(svc.symbolManager, req.uri, req.symbolName),
            );
            const wire: Record<string, unknown> = {};
            for (const [uri, entry] of Object.entries(result.entries)) {
              // cloneForWire (JSON round-trip) drops the class identity and
              // any non-enumerable/getter props on the symbol-table objects
              // so the result is a plain tree that survives structured-clone
              // across the worker postMessage boundary.
              wire[uri] = cloneForWire(entry);
            }
            return { entries: wire };
          }),
        ),
      ),
    ),

  BeginWorkspaceLoadSession: (req) =>
    guardRole('BeginWorkspaceLoadSession').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            svc.symbolManager.beginWorkspaceLoadSession(req.sessionId);
            yield* Effect.logInfo(
              `[DATA-OWNER] Begin workspace load session: ${req.sessionId}`,
            );
            return { ok: true as const };
          }),
        ),
      ),
    ),

  WorkspaceBatchIngest: (req) =>
    guardRole('WorkspaceBatchIngest').pipe(
      Effect.flatMap(() =>
        dataOwnerWrite(
          Effect.gen(function* () {
            const startTime = Date.now();
            const svc = yield* ensureDataOwnerServices;

            const storage = svc.storageManager.getStorage();
            for (const entry of req.entries) {
              const doc: WorkerDocument = {
                uri: entry.uri,
                getText: () => entry.content,
                languageId: entry.languageId,
                version: entry.version,
              };
              // Keep the ingest span open until storage has accepted the
              // document. Besides making the timing honest, this guarantees
              // the compilation worker's subsequent write-back cannot race a
              // still-pending document store and be rejected as missing.
              yield* Effect.promise(() =>
                storage.setDocument(entry.uri, doc as never),
              );
            }
            const elapsed = Date.now() - startTime;
            yield* Effect.annotateCurrentSpan(
              'workspace.ingest_elapsed_ms',
              elapsed,
            );
            const stats = (yield* Effect.promise(
              () =>
                (svc.symbolManager as any).getStats?.() ??
                Promise.resolve(null),
            )) as {
              totalFiles: number;
              totalSymbols: number;
              totalReferences: number;
            } | null;
            const statsStr = stats
              ? ` | graph: ${stats.totalFiles} files, ${stats.totalSymbols} symbols, ${stats.totalReferences} refs`
              : '';
            yield* Effect.logDebug(
              `[DATA-OWNER] WorkspaceBatchIngest: session=${req.sessionId}, ` +
                `stored=${req.entries.length} files in ${elapsed}ms${statsStr}`,
            );
            return { processedCount: req.entries.length };
          }),
          {
            spanName: 'dataOwner.batch.ingest',
            attributes: {
              'workspace.session_id': req.sessionId,
              'workspace.file_count': req.entries.length,
              'workspace.content_chars': req.entries.reduce(
                (total, entry) => total + entry.content.length,
                0,
              ),
            },
          },
        ),
      ),
    ),

  QueryGraphData: (req) =>
    guardRole('QueryGraphData').pipe(
      Effect.flatMap(() =>
        dataOwnerRead(
          Effect.gen(function* () {
            const svc = yield* ensureDataOwnerServices;
            const { GraphDataProcessingService } = yield* Effect.promise(
              () => import('@salesforce/apex-lsp-compliant-services'),
            );
            const service = new GraphDataProcessingService(
              getLogger(),
              svc.symbolManager,
            );
            const result = yield* Effect.promise(() =>
              service.processGraphData({
                type: req.type,
                fileUri: req.fileUri,
                symbolType: req.symbolType,
                includeMetadata: req.includeMetadata ?? false,
                includeDiagnostics: req.includeDiagnostics ?? false,
              }),
            );
            return cloneForWire(result);
          }),
        ),
      ),
    ),

  DispatchDocumentOpen: dataOwnerDocHandler(
    'DispatchDocumentOpen',
    (svc, req) =>
      Effect.gen(function* () {
        const doc: WorkerDocument = {
          uri: req.uri,
          getText: () => req.content,
          languageId: req.languageId,
          version: req.version,
        };
        // Await the store: the write-back's version check (UpdateSymbolSubset)
        // and the readiness latch both require the document to be present at
        // this version BEFORE the compile this open triggers runs. The prior
        // `void` left that a race — a fast compile could write back before the
        // store landed and be rejected as "document not found".
        yield* Effect.promise(() =>
          svc.storageManager.getStorage().setDocument(req.uri, doc as never),
        );
        // Arm before returning: dispatch() sequences this store ahead of the
        // compile, so the latch exists when a fast-following documentSymbol
        // awaits it.
        armReadiness(req.uri, req.version);
        return { accepted: true };
      }),
  ),

  DispatchDocumentChange: dataOwnerDocHandler(
    'DispatchDocumentChange',
    (svc, req) =>
      Effect.gen(function* () {
        const doc: WorkerDocument = {
          uri: req.uri,
          getText: () => req.content,
          languageId: 'apex',
          version: req.version,
        };
        yield* Effect.promise(() =>
          svc.storageManager.getStorage().setDocument(req.uri, doc as never),
        );
        // Re-arm at the new version; supersedes the prior latch so an awaiter
        // for the old version stops waiting and re-evaluates.
        armReadiness(req.uri, req.version);
        return { accepted: true };
      }),
  ),

  DispatchDocumentSave: dataOwnerDocHandler(
    'DispatchDocumentSave',
    (svc, req) =>
      Effect.gen(function* () {
        // Mirror DispatchDocumentChange: store a version placeholder and arm the
        // readiness latch so the CompileDocument this save triggers can write
        // its symbols back (UpdateSymbolSubset requires the document present at
        // this version) and a request racing the save re-evaluates against the
        // saved version. The compile message carries the real saved content; the
        // placeholder text is replaced when the write-back merges.
        const doc: WorkerDocument = {
          uri: req.uri,
          getText: () => '',
          languageId: 'apex',
          version: req.version,
        };
        yield* Effect.promise(() =>
          svc.storageManager.getStorage().setDocument(req.uri, doc as never),
        );
        armReadiness(req.uri, req.version);
        return { accepted: true };
      }),
  ),

  DispatchDocumentClose: dataOwnerDocHandler(
    'DispatchDocumentClose',
    (svc, req) =>
      Effect.sync(() => {
        const closeDoc: WorkerDocument = {
          uri: req.uri,
          getText: () => '',
          languageId: 'apex',
          version: 0,
        };
        svc.documentCloseProcessingService.processDocumentClose({
          document: closeDoc as never,
        });
        // Release any awaiter and drop the latch so the Map doesn't grow
        // unbounded across a long session of opens/closes.
        clearReadiness(req.uri);
        return { accepted: true };
      }),
  ),

  // -- Compilation worker handlers ---------------------------------------------

  CompileDocument: (req) =>
    guardRole('CompileDocument').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const startTime = Date.now();
          const svc = yield* ensureCompilationServices;

          const result = svc.compile(req.content, req.uri);
          let compiledCount = 0;
          if (result && result.symbolTable) {
            compiledCount = 1;
            yield* writeBackCompiledSymbols(
              result.symbolTable as any,
              req.uri,
              req.version,
            );
          }

          const elapsedMs = Date.now() - startTime;
          yield* Effect.logDebug(
            `[COMPILATION] CompileDocument: ${req.uri} (v${req.version}, ` +
              `priority=${req.priority}, ${elapsedMs}ms)`,
          );
          return { compiledCount, elapsedMs };
        }),
      ),
    ),

  WorkspaceBatchCompile: (req) =>
    guardRole('WorkspaceBatchCompile').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const batchStartTime = Date.now();
          const svc = yield* ensureCompilationServices;

          const concurrency = (req as any).concurrency ?? 1;
          yield* Effect.annotateCurrentSpan({
            'workspace.session_id': req.sessionId,
            'workspace.file_count': req.entries.length,
            'workspace.content_chars': req.entries.reduce(
              (total, entry) => total + entry.content.length,
              0,
            ),
            'workspace.concurrency': concurrency,
          });

          // Compile files with bounded concurrency to overlap write-back IPC round-trips.
          // The dataOwner still processes writes serially, but keeping its queue non-empty
          // eliminates idle-wait cycles and maximizes throughput.
          const results = yield* Effect.forEach(
            req.entries,
            (entry, i) =>
              Effect.withSpan('workspace.file.compile', {
                attributes: {
                  'workspace.session_id': req.sessionId,
                  'workspace.file_index': i,
                  'workspace.file_total': req.entries.length,
                  'document.uri': entry.uri,
                  'document.version': entry.version,
                  'document.content_chars': entry.content.length,
                },
              })(
                Effect.gen(function* () {
                  const compileStart = Date.now();
                  const result = yield* Effect.try({
                    try: () => svc.compile(entry.content, entry.uri),
                    catch: (error) => ({
                      _tag: 'WorkspaceBatchCompileError' as const,
                      message:
                        error instanceof Error ? error.message : String(error),
                    }),
                  });
                  const compileMs = Date.now() - compileStart;
                  const symbolTable = result?.symbolTable as any;
                  const symbolCount =
                    symbolTable?.getAllSymbols?.().length ?? 0;
                  const referenceCount =
                    symbolTable?.getAllReferences?.().length ?? 0;

                  yield* Effect.annotateCurrentSpan({
                    'workspace.compile_ms': compileMs,
                    'symbol.count': symbolCount,
                    'reference.count': referenceCount,
                  });

                  if (!symbolTable) {
                    yield* Effect.annotateCurrentSpan(
                      'workspace.compile_outcome',
                      'no-symbol-table',
                    );
                    return { outcome: 'error' as const };
                  }

                  const writeBackStart = Date.now();
                  yield* writeBackCompiledSymbols(
                    symbolTable,
                    entry.uri,
                    entry.version,
                  );
                  yield* Effect.annotateCurrentSpan({
                    'workspace.write_back_ms': Date.now() - writeBackStart,
                    'workspace.compile_outcome': 'compiled',
                  });
                  return { outcome: 'compiled' as const };
                }),
              ).pipe(
                // Per-entry error containment: never fail, resolve to error outcome instead
                Effect.catchAll(() =>
                  Effect.succeed({ outcome: 'error' as const }),
                ),
              ),
            { concurrency },
          );

          const compiledCount = results.filter(
            (r) => r.outcome === 'compiled',
          ).length;
          const errorCount = results.filter(
            (r) => r.outcome === 'error',
          ).length;

          const elapsedMs = Date.now() - batchStartTime;
          yield* Effect.annotateCurrentSpan({
            'workspace.compiled_count': compiledCount,
            'workspace.error_count': errorCount,
            'workspace.elapsed_ms': elapsedMs,
          });
          yield* Effect.logInfo(
            `[COMPILATION] WorkspaceBatchCompile: session=${req.sessionId}, ` +
              `compiled=${compiledCount}, errors=${errorCount}, ${elapsedMs}ms`,
          );
          return { compiledCount, errorCount, elapsedMs };
        }),
      ),
    ),

  // -- Enrichment/search pool handlers (Step 11) ----------------------------
  //
  // All enrichment handlers follow the same pattern: guard role, bootstrap
  // services, call the service method, clone the result for postMessage.
  // The `requestHandler` factory eliminates the repetition.

  ...requestHandlers,

  DispatchGenericLspRequest: (req) =>
    guardRole('DispatchGenericLspRequest').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          yield* Effect.logWarning(
            `[ENRICHMENT] GenericLspRequest: unhandled type=${req.requestType}`,
          );
          return { result: null };
        }),
      ),
    ),

  // -- Resource-loader handlers (Step 9) -------------------------------------

  ResourceLoaderGetSymbolTable: (req) =>
    guardRole('ResourceLoaderGetSymbolTable').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const { ResourceLoader } = yield* Effect.promise(
            () => import('@salesforce/apex-lsp-parser-ast'),
          );
          const st = yield* Effect.promise(() =>
            ResourceLoader.getInstance().getSymbolTable(req.classPath),
          );
          if (!st) return { found: false };
          return { found: true, symbolTable: cloneForWire(st) };
        }),
      ),
    ),

  ResourceLoaderGetFile: (req) =>
    guardRole('ResourceLoaderGetFile').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const { ResourceLoader } = yield* Effect.promise(
            () => import('@salesforce/apex-lsp-parser-ast'),
          );
          const content = yield* Effect.promise(() =>
            ResourceLoader.getInstance().getFile(req.path),
          );
          return content !== undefined
            ? { found: true, content }
            : { found: false };
        }),
      ),
    ),

  ResourceLoaderResolveClass: (req) =>
    guardRole('ResourceLoaderResolveClass').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const { ResourceLoader } = yield* Effect.promise(
            () => import('@salesforce/apex-lsp-parser-ast'),
          );
          const fqn = ResourceLoader.getInstance().resolveStandardClassFqn(
            req.className,
          );
          return fqn !== null ? { found: true, fqn } : { found: false };
        }),
      ),
    ),

  ResourceLoaderGetStandardNamespaces: () =>
    guardRole('ResourceLoaderGetStandardNamespaces').pipe(
      Effect.flatMap(() =>
        Effect.gen(function* () {
          const { ResourceLoader } = yield* Effect.promise(
            () => import('@salesforce/apex-lsp-parser-ast'),
          );
          const raw = ResourceLoader.getInstance().getStandardNamespaces();
          const namespaces: Record<string, string[]> = {};
          for (const [k, v] of raw) {
            namespaces[k] = v.map((cis) =>
              typeof cis === 'string' ? cis : (cis as { value: string }).value,
            );
          }
          return { namespaces };
        }),
      ),
    ),
};

/**
 * Every decoded coordinator request enters through this table. Wrap the whole
 * table once so data-owner, compilation, resource-loader, and request-pool
 * workers all extract and use the same parent-context contract.
 */
export const handlers = Object.fromEntries(
  Object.entries(untracedHandlers).map(([tag, untypedHandler]) => {
    const handler = untypedHandler as unknown as UntypedWorkerHandler;
    return [
      tag,
      (request: unknown) =>
        withWorkerRequestTracing(
          tag,
          request as { readonly traceContext?: string },
          handler(request as never),
        ),
    ];
  }),
) as unknown as SerializedWorkerHandlers;
