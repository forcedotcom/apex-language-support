/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Data-owner concurrency substrate: the tiered read/write queue that serializes
 * work on the authoritative graph, plus the per-URI symbol-readiness latches.
 *
 * Depends only on `runtimeContext` (tracing hooks) and the compliant-services
 * document-state cache, so it sits low in the worker dependency graph — the
 * handler factories and rename modules import from here, never the reverse.
 *
 * Imported with an explicit .ts extension for tsx-in-worker resolution (see
 * runtimeContext.ts for the rationale).
 */

import { Effect, Queue, Deferred, Option } from 'effect';
import type * as Tracer from 'effect/Tracer';
import { getDocumentStateCache } from '@salesforce/apex-lsp-compliant-services';
import { workerTracingHooks } from './runtimeContext.ts';

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

    const result = yield* Effect.exit(execution);
    yield* Deferred.done(item.deferred, result);
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
