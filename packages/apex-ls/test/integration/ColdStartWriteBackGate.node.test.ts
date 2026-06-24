/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Cold-start write-back + readiness-gate integration tests.
 *
 * Reproduces the live extension's cold-open stall: opening a file dispatches a
 * compile to the compilation worker, which writes its symbols back to the
 * data-owner via the coordinator assistance bus (dataOwner:UpdateSymbolSubset).
 * A request-pool read (documentSymbol/etc.) waits on the data-owner readiness
 * latch through awaitSymbolDataReady. If the write-back never lands, the gate
 * times out and the live server falls back to a coordinator-local compile —
 * the ~2s cold-start penalty the user observes.
 *
 * Unlike the other WriteBackProtocol integration tests (which call
 * topology.dataOwner.executeEffect(new UpdateSymbolSubset(...)) directly and so
 * never exercise the worker -> coordinator -> data-owner assistance round-trip),
 * these tests wire the REAL CoordinatorAssistanceMediator and attach it to the
 * live workers' assistance ports — exactly as LCSAdapter does in production.
 * That is the layer the bug lives in and the layer the skipped tests never
 * covered.
 *
 * ROOT CAUSE (found via these tests): writeBackCompiledSymbols posted the raw
 * symbol payload over a MessagePort, but a real, type-referencing class's
 * getAllSymbols() carries function values (lazy thunks, e.g. `() => null`).
 * MessagePort.postMessage uses the structured-clone algorithm, which THROWS on
 * functions ("() => null could not be cloned"). The write-back died before
 * reaching the coordinator, the readiness latch armed by the open was never
 * resolved, and the cold-read gate burned its full budget then fell back to a
 * local compile — the ~2s stall. The fix sanitizes the payload with
 * cloneForWire (the same JSON round-trip every other wire-crossing payload
 * uses), which strips the functions.
 *
 * Test roles:
 *  - GREEN: a trivial self-contained class (no function-valued fields) merges in
 *    ~1ms. This is why the bug hid — synthetic/trivial tables clone cleanly.
 *  - REGRESSION: a stdlib-referencing class (function-valued fields) that timed
 *    out before the fix and merges after it — the direct guard for this bug.
 *  - CANDIDATE A: a misrouted write-back (no dataOwnerHandler) reproduces the
 *    same `timeout` symptom from a different cause — a guard against assistance-
 *    bus wiring regressions.
 *  - CANDIDATE C: documents the distinct peek-before-arm race
 *    (`no-compile-pending`), a SEPARATE failure mode from the live `timeout`.
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
import { Effect } from 'effect';

const WORKER_TS_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const TSX_OPTIONS = { execArgv: ['--import', 'tsx'] };

// A trivial, fully self-contained class: no stdlib/System dependencies, so the
// compile can always produce a symbol table even on a cold (un-warmed) server.
const SELF_CONTAINED_CLASS = `public class TestClass {
    public String testMethod() {
        return 'Hello World';
    }
}`;

// A USER class that references standard-library types (System, String, List).
// Standard Apex classes are precompiled and served by the resource-loader
// worker — they are never "cold opened" themselves. What CAN be cold is a user
// file whose compile must chase those type references OUT to the resource-loader
// worker mid-compile (compilation worker -> resource-loader worker round-trip,
// resolved into the symbol manager). If that chasing is slow on a cold resource
// loader, the user file's compile — and thus its write-back — is LATE, and the
// readiness gate times out before the symbols merge. No SOQL/SObjects here:
// schema/workspace indexing is a separate path; this isolates stdlib type
// resolution during a user-file compile.
const STDLIB_DEPENDENT_CLASS = `public class StdlibClass {
    public String describe(List<String> names) {
        System.debug('describing');
        String joined = String.join(names, ', ');
        Integer total = names.size();
        return joined + ' (' + total + ')';
    }
}`;

const TEST_URI = 'file:///test/TestClass.cls';
const STDLIB_URI = 'file:///test/StdlibClass.cls';

// The cold-read gate derives its budget from the request timeout; give the
// await enough headroom that a genuine write-back (tens of ms) resolves well
// inside it, while a dropped write-back exhausts it and reports 'timeout'.
const GATE_BUDGET_MS = 3000;

const MATCH_LATEST_VERSION = -1;

interface QueryResult {
  entries: Record<string, unknown>;
  versions: Record<string, number>;
}

/**
 * Build a documentOpen payload in the shape dispatch() expects: it reads
 * uri/version/languageId/getText() off `p.document`, matching the coordinator's
 * TextDocument.
 */
const openParams = (uri: string, text: string, version = 1) => ({
  document: {
    uri,
    languageId: 'apex',
    version,
    getText: () => text,
  },
  textDocument: { uri },
  text,
});

describe('Cold-start write-back + readiness gate (live assistance bus)', () => {
  const logger = getLogger();

  afterEach(() => {
    clearRawWorkers();
  });

  /**
   * GREEN baseline. Await the open fully (so arm + compile + write-back all
   * complete), THEN gate. The write-back has merged, so the gate is ready in
   * ~1ms. Proves the assistance bus + mediator + write-back + latch resolve are
   * all correct when nothing is dropped.
   */
  it('GREEN: data-owner symbols become ready after a worker write-back, within budget', async () => {
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

      const mediator = wireMediator(dispatcher, logger, {
        // The happy path does not exercise the primary handler; fail loud if
        // some unexpected method lands there.
        failOnPrimary: true,
        routeDataOwner: true,
      });
      mediator.attachToWorkers(
        getRawWorkers(),
        getAssistancePorts(),
        getWorkerNames(),
      );

      // Await the open to completion: arm + compile + write-back all done.
      openDocs.set(TEST_URI, SELF_CONTAINED_CLASS);
      yield* Effect.promise(() =>
        dispatcher.dispatch(
          'documentOpen',
          openParams(TEST_URI, SELF_CONTAINED_CLASS),
        ),
      );

      const startedAt = yield* Effect.sync(() => Date.now());
      const readiness = yield* Effect.promise(() =>
        dispatcher.awaitSymbolDataReady!(
          TEST_URI,
          MATCH_LATEST_VERSION,
          GATE_BUDGET_MS,
        ),
      );
      const waitedMs = (yield* Effect.sync(() => Date.now())) - startedAt;

      const query = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('QuerySymbolSubset', { uris: [TEST_URI] }),
      )) as QueryResult;

      return { readiness, waitedMs, query };
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    const { readiness, waitedMs, query } = await Effect.runPromise(program);

    console.log(
      `[GREEN] readiness=${JSON.stringify(readiness)} waitedMs=${waitedMs} ` +
        `version=${query.versions[TEST_URI]} ` +
        `hasEntry=${query.entries[TEST_URI] !== undefined}`,
    );

    expect(readiness.reason).toBeUndefined();
    expect(readiness.ready).toBe(true);
    expect(waitedMs).toBeLessThan(GATE_BUDGET_MS - 200);
    expect(query.entries[TEST_URI]).toBeDefined();
    expect(query.versions[TEST_URI]).toBe(1);
  }, 120_000);

  /**
   * CANDIDATE A — write-back never reaches the data-owner.
   *
   * Models the live evidence directly: the latch is armed by the open, but the
   * data-owner's UpdateSymbolSubset handler never runs (no '[DATA-OWNER]
   * UpdateSymbolSubset received' in the live log). We reproduce that by wiring
   * the mediator WITHOUT a dataOwnerHandler (2-arg construction, as the older
   * unit tests do). The 'dataOwner:UpdateSymbolSubset' write-back then falls to
   * the primary handler, which does not merge into the data-owner graph — so
   * the latch is never resolved.
   *
   * Expectation: gate returns { ready: false, reason: 'timeout' } after burning
   * (nearly) the full budget, and the data-owner holds NO symbols. If this
   * matches the live symptom, the root cause is a missing/misrouted
   * dataOwnerHandler on the live assistance bus.
   */
  it("CANDIDATE A: missing dataOwnerHandler drops the write-back -> gate 'timeout'", async () => {
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

      // No dataOwnerHandler: dataOwner:* write-backs fall to the primary
      // handler, which swallows them (returns {accepted:true} without merging).
      const mediator = wireMediator(dispatcher, logger, {
        failOnPrimary: false,
        routeDataOwner: false,
      });
      mediator.attachToWorkers(
        getRawWorkers(),
        getAssistancePorts(),
        getWorkerNames(),
      );

      // Await the open so the latch is ARMED (DispatchDocumentOpen ran), exactly
      // as the live log shows (latch=v1). The compile runs and posts its
      // write-back, but it is swallowed by the primary handler.
      openDocs.set(TEST_URI, SELF_CONTAINED_CLASS);
      yield* Effect.promise(() =>
        dispatcher.dispatch(
          'documentOpen',
          openParams(TEST_URI, SELF_CONTAINED_CLASS),
        ),
      );

      const startedAt = yield* Effect.sync(() => Date.now());
      const readiness = yield* Effect.promise(() =>
        dispatcher.awaitSymbolDataReady!(
          TEST_URI,
          MATCH_LATEST_VERSION,
          GATE_BUDGET_MS,
        ),
      );
      const waitedMs = (yield* Effect.sync(() => Date.now())) - startedAt;

      const query = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('QuerySymbolSubset', { uris: [TEST_URI] }),
      )) as QueryResult;

      return { readiness, waitedMs, query };
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    const { readiness, waitedMs, query } = await Effect.runPromise(program);

    console.log(
      `[CANDIDATE-A] readiness=${JSON.stringify(readiness)} waitedMs=${waitedMs} ` +
        `version=${query.versions[TEST_URI]} ` +
        `entry=${JSON.stringify(query.entries[TEST_URI])}`,
    );

    // Reproduces the live failure: armed-but-never-resolved -> timeout.
    expect(readiness.ready).toBe(false);
    expect(readiness.reason).toBe('timeout');
    expect(waitedMs).toBeGreaterThan(GATE_BUDGET_MS - 500);
    // The open stored the document (so a record exists at v1), but the swallowed
    // write-back never merged a symbol table — QuerySymbolSubset returns `null`
    // for a stored-but-unmerged file. That null IS the "No Symbols" the live
    // request-pool read would have seen.
    expect(query.entries[TEST_URI]).toBeNull();
  }, 120_000);

  /**
   * REGRESSION (the real live bug) — function-valued symbol fields must survive
   * the write-back wire crossing.
   *
   * A real, type-referencing Apex class compiles to a SymbolTable whose
   * getAllSymbols() carries function-valued properties (lazy thunks, e.g.
   * `() => null`). writeBackCompiledSymbols posts that payload over a
   * MessagePort, whose structured-clone algorithm THROWS on functions
   * ("() => null could not be cloned"). Before the fix, that threw synchronously
   * inside the write-back, so the request never reached the coordinator/data-
   * owner, the readiness latch armed by the open was never resolved, and the
   * cold-read gate burned its full budget then fell back to a local compile —
   * the ~2s cold-start stall the user saw.
   *
   * The GREEN baseline passed only because its trivial self-contained class
   * produced no function-valued fields. This test uses a stdlib-referencing
   * class (List<String>, String.join, System.debug) that DOES, so it would time
   * out before the fix. The fix sanitizes the payload with cloneForWire (the
   * same JSON round-trip every other wire-crossing data-owner payload uses),
   * which strips the functions. After the fix the write-back merges and the gate
   * is ready well inside budget.
   */
  it('REGRESSION: function-valued symbol fields survive the write-back -> gate ready', async () => {
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

      // GREEN wiring (correct dataOwnerHandler): any failure here is the
      // write-back payload, not the bus.
      const mediator = wireMediator(dispatcher, logger, {
        failOnPrimary: true,
        routeDataOwner: true,
      });
      mediator.attachToWorkers(
        getRawWorkers(),
        getAssistancePorts(),
        getWorkerNames(),
      );

      openDocs.set(STDLIB_URI, STDLIB_DEPENDENT_CLASS);
      yield* Effect.promise(() =>
        dispatcher.dispatch(
          'documentOpen',
          openParams(STDLIB_URI, STDLIB_DEPENDENT_CLASS),
        ),
      );

      const startedAt = yield* Effect.sync(() => Date.now());
      const readiness = yield* Effect.promise(() =>
        dispatcher.awaitSymbolDataReady!(
          STDLIB_URI,
          MATCH_LATEST_VERSION,
          GATE_BUDGET_MS,
        ),
      );
      const waitedMs = (yield* Effect.sync(() => Date.now())) - startedAt;

      const query = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('QuerySymbolSubset', { uris: [STDLIB_URI] }),
      )) as QueryResult;

      return { readiness, waitedMs, query };
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    const { readiness, waitedMs, query } = await Effect.runPromise(program);

    console.log(
      `[REGRESSION] readiness=${JSON.stringify(readiness)} waitedMs=${waitedMs} ` +
        `version=${query.versions[STDLIB_URI]} ` +
        `hasEntry=${query.entries[STDLIB_URI] != null}`,
    );

    // Post-fix: the sanitized write-back merges; the gate is ready well inside
    // budget. (Pre-fix this timed out: ready=false, reason='timeout', ~3s.)
    expect(readiness.reason).toBeUndefined();
    expect(readiness.ready).toBe(true);
    expect(waitedMs).toBeLessThan(GATE_BUDGET_MS - 200);
    // The data-owner now holds a real (non-null) symbol table at v1.
    expect(query.entries[STDLIB_URI]).not.toBeNull();
    expect(query.entries[STDLIB_URI]).toBeDefined();
    expect(query.versions[STDLIB_URI]).toBe(1);
  }, 120_000);

  /**
   * CANDIDATE C — the gate peeks before the open arms the latch.
   *
   * Dispatch the open DETACHED (do not await) and gate immediately. If the gate
   * peek beats DispatchDocumentOpen's armReadiness, it sees no latch and bails
   * with reason 'no-compile-pending' (NOT 'timeout'). This is a real race, but a
   * DIFFERENT failure mode than the live 'timeout' — recorded here to keep the
   * distinction explicit and to guard against regressions in either direction.
   */
  it("CANDIDATE C: gate races the open's arm -> 'no-compile-pending' (distinct from live)", async () => {
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

      const mediator = wireMediator(dispatcher, logger, {
        failOnPrimary: true,
        routeDataOwner: true,
      });
      mediator.attachToWorkers(
        getRawWorkers(),
        getAssistancePorts(),
        getWorkerNames(),
      );

      // Detached open: do NOT await. The gate fires immediately, racing
      // DispatchDocumentOpen's armReadiness on the data-owner serial runner.
      openDocs.set(TEST_URI, SELF_CONTAINED_CLASS);
      yield* Effect.forkDaemon(
        Effect.promise(() =>
          dispatcher.dispatch(
            'documentOpen',
            openParams(TEST_URI, SELF_CONTAINED_CLASS),
          ),
        ),
      );

      const startedAt = yield* Effect.sync(() => Date.now());
      const readiness = yield* Effect.promise(() =>
        dispatcher.awaitSymbolDataReady!(
          TEST_URI,
          MATCH_LATEST_VERSION,
          GATE_BUDGET_MS,
        ),
      );
      const waitedMs = (yield* Effect.sync(() => Date.now())) - startedAt;

      return { readiness, waitedMs };
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    const { readiness, waitedMs } = await Effect.runPromise(program);

    console.log(
      `[CANDIDATE-C] readiness=${JSON.stringify(readiness)} waitedMs=${waitedMs}`,
    );

    // A peek-before-arm race yields 'no-compile-pending', not 'timeout'. We do
    // not over-constrain timing (the race may occasionally arm first); the point
    // is to document that this race is a SEPARATE mode from the live timeout.
    expect(readiness.ready).toBe(false);
    expect(['no-compile-pending', 'timeout']).toContain(readiness.reason);
  }, 120_000);
});

/**
 * Wire a CoordinatorAssistanceMediator the way LCSAdapter does, with knobs to
 * model failure modes:
 *  - routeDataOwner: pass the dataOwnerHandler (3-arg) so dataOwner:* methods
 *    reach the data-owner worker. When false, omit it (2-arg) so write-backs
 *    fall to the primary handler — modeling a dropped write-back.
 *  - failOnPrimary: make the primary handler throw, to fail loud when a method
 *    is misrouted there unexpectedly (used by paths that must NOT touch it).
 */
function wireMediator(
  dispatcher: ReturnType<typeof makeWorkerDispatcher>,
  logger: LoggerInterface,
  opts: { routeDataOwner: boolean; failOnPrimary: boolean },
): CoordinatorAssistanceMediator {
  const primaryHandler = async (method: string) => {
    if (opts.failOnPrimary) {
      throw new Error(`unexpected primary assistance method: ${method}`);
    }
    // Swallow: return an accepted-looking response WITHOUT merging. This is what
    // a misrouted dataOwner:* write-back would hit when no dataOwnerHandler is
    // registered — the compile thinks it succeeded, but nothing merged.
    return { accepted: true, merged: 0, versionMismatch: false };
  };
  if (opts.routeDataOwner) {
    return new CoordinatorAssistanceMediator(
      primaryHandler,
      logger,
      (method, params) => dispatcher.queryDataOwner(method, params),
    );
  }
  return new CoordinatorAssistanceMediator(primaryHandler, logger);
}
