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

import { Effect, LogLevel, Schema, Queue, Deferred } from 'effect';
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
  type WorkerRole,
  type WorkerLogLevel,
} from '@salesforce/apex-lsp-shared';
import { getDocumentStateCache } from '@salesforce/apex-lsp-compliant-services';

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
  DrainDeferredReferences,
  QueryGraphData,
  DataOwnerQuerySymbolByName,
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
}

export interface DOQueues {
  readonly read: Queue.Queue<DOQueueItem>;
  readonly write: Queue.Queue<DOQueueItem>;
}

const processItem = (item: DOQueueItem) =>
  Effect.gen(function* () {
    const result = yield* Effect.either(item.eff);
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

export const dataOwnerRead = <A, E>(
  eff: Effect.Effect<A, E>,
): Effect.Effect<A, E> =>
  Effect.gen(function* () {
    const queues = yield* initDataOwnerQueues;
    const deferred = yield* Deferred.make<A, E>();
    yield* Queue.offer(queues.read, {
      eff: eff as Effect.Effect<unknown, unknown>,
      deferred: deferred as Deferred.Deferred<unknown, unknown>,
    });
    return yield* Deferred.await(deferred);
  });

export const dataOwnerWrite = <A, E>(
  eff: Effect.Effect<A, E>,
): Effect.Effect<A, E> =>
  Effect.gen(function* () {
    const queues = yield* initDataOwnerQueues;
    const deferred = yield* Deferred.make<A, E>();
    yield* Queue.offer(queues.write, {
      eff: eff as Effect.Effect<unknown, unknown>,
      deferred: deferred as Deferred.Deferred<unknown, unknown>,
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
