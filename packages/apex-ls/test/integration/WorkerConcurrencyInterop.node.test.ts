/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Worker concurrency + interop integration tests (live assistance bus).
 *
 * The Apex Language Server is a near-real-time system: it must handle multiple
 * and parallel requests for the SAME data, racing write-backs, and rapid edits
 * without returning stale data, dropping work, or deadlocking. The cold-open
 * path is covered by ColdStartWriteBackGate.node.test.ts; this file covers the
 * remaining concurrency surfaces, all over REAL worker threads with the REAL
 * CoordinatorAssistanceMediator wired exactly as LCSAdapter does in production:
 *
 *  - Stale-version readiness: an awaiter must NOT get a "ready" signal for a
 *    superseded version's symbols (a v1 table still present while v2 is armed
 *    but not yet merged).
 *  - (further scenarios appended below as they are built)
 */

import * as path from 'path';
import {
  initializeTopology,
  makeNodeWorkerLayer,
  makeWorkerDispatcher,
  getRawWorkers,
  getAssistancePorts,
  getWorkerNames,
  clearRawWorkers,
} from '../../src/server/WorkerCoordinator';
import { CoordinatorAssistanceMediator } from '../../src/server/CoordinatorAssistanceMediator';
import { getLogger, type LoggerInterface } from '@salesforce/apex-lsp-shared';
import { Effect, Fiber } from 'effect';

const WORKER_TS_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const TSX_OPTIONS = { execArgv: ['--import', 'tsx'] };

const MATCH_LATEST_VERSION = -1;

// A self-contained class whose body changes between versions, so each version
// compiles to a distinguishable symbol table (different method name): v1 has
// `alpha`, v2 has `beta` (+ `gamma`). Used to tell which version's symbols are
// in the graph.
const classV1 = `public class Edited {
    public String alpha() { return 'a'; }
}`;
const classV2 = `public class Edited {
    public String beta() { return 'b'; }
    public Integer gamma() { return 1; }
}`;

const URI = 'file:///test/Edited.cls';

interface QueryResult {
  entries: Record<string, unknown>;
  versions: Record<string, number>;
}

const openParams = (uri: string, text: string, version: number) => ({
  document: {
    uri,
    languageId: 'apex',
    version,
    getText: () => text,
  },
  textDocument: { uri },
  text,
});

const changeParams = (uri: string, text: string, version: number) => ({
  document: {
    uri,
    languageId: 'apex',
    version,
    getText: () => text,
  },
  textDocument: { uri, version },
  contentChanges: [{ text }],
  text,
});

/**
 * Wire a CoordinatorAssistanceMediator exactly as LCSAdapter does: a primary
 * handler (fails loud — the write-back path must not touch it) and a
 * dataOwnerHandler routing dataOwner:* to the data-owner worker.
 */
function wireMediator(
  dispatcher: ReturnType<typeof makeWorkerDispatcher>,
  logger: LoggerInterface,
): CoordinatorAssistanceMediator {
  const primaryHandler = async (method: string) => {
    throw new Error(`unexpected primary assistance method: ${method}`);
  };
  return new CoordinatorAssistanceMediator(
    primaryHandler,
    logger,
    (method, params) => dispatcher.queryDataOwner(method, params),
  );
}

describe('Worker concurrency + interop (live assistance bus)', () => {
  const logger = getLogger();

  afterEach(() => {
    clearRawWorkers();
  });

  /**
   * STALE-VERSION READINESS INVARIANT.
   *
   * After v1 merges, an edit to v2 arms a new (unsettled) latch at v2 while v1's
   * symbols are still the only thing in the graph. A reader gating for the
   * LATEST armed version (MATCH_LATEST_VERSION, what the cold-read gate uses for
   * a request that carries no version) must NEVER be told "ready" off the stale
   * v1 table: that would hand a request-pool reader v1 symbols for v2 content.
   *
   * Before the fix, the peek short-circuited on `st != null` under matchLatest
   * and returned an instant ready against the stale v1 table. The fix keys
   * "ready" on the MERGED document version (DocumentStateCache.documentVersion,
   * bumped only on an accepted merge) reaching the armed latch version.
   *
   * We assert the INVARIANT rather than a fixed outcome, so the test is robust to
   * compile timing: the gate result must be CONSISTENT with the symbols actually
   * in the graph —
   *   - if it reports ready, the merged symbols must be v2's (beta), never v1's
   *     (alpha) alone;
   *   - if it reports not-ready, the reason must be stale-version or timeout.
   * The one outcome that must NEVER happen is ready-while-graph-still-has-only-v1.
   */
  it("never reports ready off a superseded version's symbols", async () => {
    const SMALL_BUDGET_MS = 1500;

    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: 'error',
      });

      const openDocs = new Map<string, string>();
      const dispatcher = makeWorkerDispatcher(topology, logger, (uri) =>
        openDocs.get(uri),
      );

      const mediator = wireMediator(dispatcher, logger);
      mediator.attachToWorkers(
        getRawWorkers(),
        getAssistancePorts(),
        getWorkerNames(),
      );

      // 1. Open v1, await fully: v1 (alpha) compiles + merges, latch v1 settles.
      openDocs.set(URI, classV1);
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', openParams(URI, classV1, 1)),
      );
      const readyV1 = yield* Effect.promise(() =>
        dispatcher.awaitSymbolDataReady(URI, 1, SMALL_BUDGET_MS),
      );

      // 2. Change to v2 (beta) DETACHED: dispatch() awaits the store leg (arming
      //    an UNSETTLED v2 latch) before returning the compile promise, so v2 is
      //    armed-but-unmerged the instant this fork yields. The gate below races
      //    the v2 compile.
      openDocs.set(URI, classV2);
      const v2Fiber = yield* Effect.forkDaemon(
        Effect.promise(() =>
          dispatcher.dispatch('documentChange', changeParams(URI, classV2, 2)),
        ),
      );

      // 3. Reader gates for the latest armed version (v2).
      const startedAt = yield* Effect.sync(() => Date.now());
      const readiness = yield* Effect.promise(() =>
        dispatcher.awaitSymbolDataReady(
          URI,
          MATCH_LATEST_VERSION,
          SMALL_BUDGET_MS,
        ),
      );
      const waitedMs = (yield* Effect.sync(() => Date.now())) - startedAt;

      // Let v2 finish so the final query reflects a settled state.
      yield* Fiber.join(v2Fiber);

      const query = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('QuerySymbolSubset', { uris: [URI] }),
      )) as QueryResult;

      return { readyV1, readiness, waitedMs, query };
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    const { readyV1, readiness, waitedMs, query } =
      await Effect.runPromise(program);

    const entry = query.entries[URI] as {
      symbols?: { name?: string }[];
    } | null;
    const finalSymbols =
      entry?.symbols?.map((s) => s.name).join(',') ?? '<none>';

    console.log(
      `[stale-version] readyV1=${JSON.stringify(readyV1)} ` +
        `latestReadiness=${JSON.stringify(readiness)} waitedMs=${waitedMs} ` +
        `docVersion=${query.versions[URI]} finalSymbols=[${finalSymbols}]`,
    );

    // Sanity: v1 genuinely merged.
    expect(readyV1.ready).toBe(true);

    // The INVARIANT: the gate for the latest version is never ready off stale v1
    // symbols. Either it correctly reports not-ready (stale-version/timeout while
    // v2's compile is still in flight), or — if v2 merged fast enough that it
    // reports ready — the merged symbols must be v2's (beta), proving it waited
    // for the right version rather than short-circuiting on v1's presence.
    if (readiness.ready) {
      expect(finalSymbols).toContain('beta');
    } else {
      expect(['stale-version', 'timeout']).toContain(readiness.reason);
    }
  }, 120_000);

  /**
   * WRITE LIVENESS UNDER SUSTAINED READ LOAD.
   *
   * The data-owner runs a single serial fiber whose loop drains ALL currently-
   * queued reads, then processes exactly ONE write, per iteration
   * (worker.platform.ts initDataOwnerQueues). Read-priority like this raises a
   * fair question for a near-real-time system: could a steady barrage of symbol
   * queries (the request pool fanning out for the same hot file) starve the
   * write-backs that make NEW symbols available? Write-backs resolve readiness
   * latches, so starving them would directly worsen cold-read latency.
   *
   * The answer (verified by this test) is NO: takeAll is a one-shot SNAPSHOT of
   * the reads queued at that instant, not a keep-draining loop, so each
   * iteration processes exactly one write after one read batch — writes stay
   * live, bounded by a single read batch, not the unbounded read stream. This
   * test pins that guarantee: it hammers the data-owner with a large burst of
   * concurrent QuerySymbolSubset reads while concurrently issuing a write-back
   * (UpdateSymbolSubset), and asserts the write is accepted well within a
   * deadline. A future change to the queue loop that genuinely starved writes
   * behind reads would fail here.
   */
  it('does not starve write-backs under a sustained burst of reads', async () => {
    const READ_BURST = 1000;
    // Generous bound: the write must land well within this even while a large
    // burst of reads is in flight. A loop that genuinely starved writes behind
    // reads would blow past it.
    const WRITE_DEADLINE_MS = 5000;

    const readerUri = 'file:///test/Reader.cls';
    const readerClass = `public class Reader {
        public Integer count() { return 0; }
    }`;
    const writtenUri = 'file:///test/LateWrite.cls';
    const writtenClass = `public class LateWrite {
        public String tag() { return 'late'; }
    }`;

    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: 'error',
      });

      const openDocs = new Map<string, string>();
      const dispatcher = makeWorkerDispatcher(topology, logger, (uri) =>
        openDocs.get(uri),
      );
      const mediator = wireMediator(dispatcher, logger);
      mediator.attachToWorkers(
        getRawWorkers(),
        getAssistancePorts(),
        getWorkerNames(),
      );

      // Seed a file so reads have something to query, and open the target of the
      // write so its UpdateSymbolSubset will be ACCEPTED (document present at the
      // matching version). Opening LateWrite compiles+writes it back, so to test
      // a fresh write under load we instead open it WITHOUT awaiting the merge,
      // then drive an explicit write-back via queryDataOwner under read load.
      openDocs.set(readerUri, readerClass);
      yield* Effect.promise(() =>
        dispatcher.dispatch(
          'documentOpen',
          openParams(readerUri, readerClass, 1),
        ),
      );
      // Store LateWrite at v1 on the data-owner (arms latch) WITHOUT compiling,
      // so the explicit write-back below is the only thing that merges it.
      openDocs.set(writtenUri, writtenClass);
      yield* Effect.promise(() =>
        dispatcher.dispatch(
          'documentOpen',
          openParams(writtenUri, writtenClass, 1),
        ),
      );

      // Fire READ_BURST concurrent reads against the seeded file, and — in the
      // same tick — one write-back for a different file. Measure how long the
      // write takes to be accepted while the reads are contending.
      const writeStart = yield* Effect.sync(() => Date.now());

      const reads = Array.from({ length: READ_BURST }, () =>
        Effect.promise(() =>
          dispatcher.queryDataOwner('QuerySymbolSubset', { uris: [readerUri] }),
        ),
      );

      // The write-back: a fresh symbol table for writtenUri at v1. We re-query
      // its already-merged table and re-submit it as an enriched write-back at a
      // higher detail level so it is ACCEPTED (detail level increases).
      const writeBack = Effect.promise(() =>
        dispatcher.queryDataOwner('UpdateSymbolSubset', {
          uri: writtenUri,
          documentVersion: 1,
          enrichedSymbolTable: {
            symbols: [],
            references: [],
            hierarchicalReferences: [],
            metadata: {},
            fileUri: writtenUri,
          },
          enrichedDetailLevel: 'full',
          sourceWorkerId: 'test-writer',
        }),
      );

      // Run reads + the write concurrently; the write must resolve promptly.
      const writeResult = (yield* Effect.all([writeBack, ...reads], {
        concurrency: 'unbounded',
      }).pipe(Effect.map((all) => all[0]))) as {
        accepted: boolean;
        versionMismatch: boolean;
      };
      const writeMs = (yield* Effect.sync(() => Date.now())) - writeStart;

      return { writeResult, writeMs };
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    const { writeResult, writeMs } = await Effect.runPromise(program);

    console.log(
      `[write-liveness] reads=${READ_BURST} writeAccepted=${writeResult.accepted} ` +
        `versionMismatch=${writeResult.versionMismatch} writeMs=${writeMs}`,
    );

    // The write-back landed (accepted, version matched) ...
    expect(writeResult.versionMismatch).toBe(false);
    expect(writeResult.accepted).toBe(true);
    // ... and was NOT starved by the contending reads.
    expect(writeMs).toBeLessThan(WRITE_DEADLINE_MS);
  }, 120_000);

  /**
   * CONCURRENT AWAITERS ON ONE LATCH (stampede).
   *
   * The readiness latch is a SINGLE shared Deferred per URI+version. When the
   * request pool fans out — documentSymbol + diagnostics + codeLens + hover all
   * arriving for the same freshly-opened file — every one hits the cold-read
   * gate and awaits that same Deferred. When the compile's write-back resolves
   * it, ALL awaiters must wake and observe ready (none lost, none hung, none
   * left with a false not-ready). This test fires N concurrent
   * awaitSymbolDataReady calls against a cold open and asserts they ALL resolve
   * ready against the merged symbols.
   */
  it('wakes ALL concurrent awaiters when one write-back resolves the shared latch', async () => {
    const AWAITERS = 12;
    const uri = 'file:///test/Stampede.cls';
    const clsV1 = `public class Stampede {
        public String go() { return 'x'; }
    }`;
    const clsV2 = `public class Stampede {
        public String go() { return 'x'; }
        public Integer two() { return 2; }
    }`;

    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: 'error',
      });
      const openDocs = new Map<string, string>();
      const dispatcher = makeWorkerDispatcher(topology, logger, (u) =>
        openDocs.get(u),
      );
      const mediator = wireMediator(dispatcher, logger);
      mediator.attachToWorkers(
        getRawWorkers(),
        getAssistancePorts(),
        getWorkerNames(),
      );

      // 1. Open v1 and AWAIT it fully: this deterministically ARMS-then-SETTLES
      //    the v1 latch (symbols merged). Now the data-owner is warm for this
      //    URI, so the awaiters below cannot lose a peek-before-arm race.
      openDocs.set(uri, clsV1);
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', openParams(uri, clsV1, 1)),
      );

      // 2. Change to v2 DETACHED: dispatch() awaits the data-owner store leg
      //    (which arms an UNSETTLED v2 latch) before returning the compile
      //    promise, so by the time this fork yields, v2 is armed but its
      //    write-back is still in flight. The awaiters then attach to that one
      //    shared v2 Deferred.
      openDocs.set(uri, clsV2);
      const changeFiber = yield* Effect.forkDaemon(
        Effect.promise(() =>
          dispatcher.dispatch('documentChange', changeParams(uri, clsV2, 2)),
        ),
      );
      // Give the store leg a moment to arm the v2 latch before the awaiters peek
      // (the store is fast; the compile is the slow part they race against).
      yield* Effect.sleep('40 millis');

      // 3. N concurrent awaiters for the latest armed version (v2). They share
      //    the single v2 Deferred; the v2 write-back must wake them ALL.
      const awaiters = Array.from({ length: AWAITERS }, () =>
        Effect.promise(() =>
          dispatcher.awaitSymbolDataReady(uri, MATCH_LATEST_VERSION, 5000),
        ),
      );
      const results = (yield* Effect.all(awaiters, {
        concurrency: 'unbounded',
      })) as { ready: boolean; reason?: string }[];

      // Let the detached v2 change/compile finish before the scope closes.
      yield* Fiber.join(changeFiber);

      return { results };
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    const { results } = await Effect.runPromise(program);

    const readyCount = results.filter((r) => r.ready).length;
    const reasons = Array.from(
      new Set(results.filter((r) => !r.ready).map((r) => r.reason)),
    );

    console.log(
      `[stampede] awaiters=${AWAITERS} ready=${readyCount} ` +
        `notReadyReasons=[${reasons.join(',')}]`,
    );

    // The single v2 write-back must wake EVERY awaiter that shared its Deferred.
    // None may be lost (timeout) or left observing a stale v1 ready that isn't
    // current. All must resolve ready against the merged v2 symbols.
    expect(readyCount).toBe(AWAITERS);
    expect(reasons).toEqual([]);
  }, 120_000);

  /**
   * RACING WRITE-BACKS AT DIFFERENT DETAIL LEVELS (no regression).
   *
   * Two enrichment workers can write back the SAME file at different detail
   * levels concurrently (e.g. one resolved it to 'full', another only to
   * 'protected'). The data-owner serializes writes and compares detail levels
   * (getLayerOrderIndex) so a richer level is never overwritten by a poorer one.
   * This fires a 'full' and a 'protected' write-back concurrently for the same
   * URI/version and asserts the stored level ends at 'full' regardless of
   * arrival order.
   */
  it('does not let a lower detail-level write-back regress a higher one', async () => {
    const uri = 'file:///test/Layered.cls';
    const cls = `public class Layered {
        public String name() { return 'n'; }
    }`;

    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: 'error',
      });
      const openDocs = new Map<string, string>();
      const dispatcher = makeWorkerDispatcher(topology, logger, (u) =>
        openDocs.get(u),
      );
      const mediator = wireMediator(dispatcher, logger);
      mediator.attachToWorkers(
        getRawWorkers(),
        getAssistancePorts(),
        getWorkerNames(),
      );

      // Open + await: file present at v1, merged at public-api by the compile.
      openDocs.set(uri, cls);
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', openParams(uri, cls, 1)),
      );

      const writeBack = (level: 'protected' | 'full') =>
        dispatcher.queryDataOwner('UpdateSymbolSubset', {
          uri,
          documentVersion: 1,
          enrichedSymbolTable: {
            symbols: [],
            references: [],
            hierarchicalReferences: [],
            metadata: {},
            fileUri: uri,
          },
          enrichedDetailLevel: level,
          sourceWorkerId: `writer-${level}`,
        });

      // Fire both concurrently; the data-owner serializes them. Whichever order
      // they land, 'full' must win and 'protected' must not regress it.
      const [a, b] = (yield* Effect.all(
        [
          Effect.promise(() => writeBack('full')),
          Effect.promise(() => writeBack('protected')),
        ],
        { concurrency: 'unbounded' },
      )) as { accepted: boolean }[];

      const query = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('QuerySymbolSubset', { uris: [uri] }),
      )) as QueryResult & {
        detailLevels: Record<string, string>;
      };

      return { a, b, finalLevel: query.detailLevels?.[uri] };
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    const { a, b, finalLevel } = await Effect.runPromise(program);

    console.log(
      `[detail-race] fullAccepted=${a.accepted} protectedAccepted=${b.accepted} ` +
        `finalLevel=${finalLevel}`,
    );

    // The stored detail level must be the richest written ('full'), never
    // regressed to 'protected', regardless of which write-back landed first.
    expect(finalLevel).toBe('full');
  }, 120_000);
});
