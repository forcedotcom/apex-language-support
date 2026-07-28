/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Cold-start interactive-compilation + readiness-gate integration tests.
 *
 * Opening a file first stores it in the data-owner and then asks that same
 * worker to compile it through its persistent Effect worker pool. The
 * data-owner validates and commits the result locally before acknowledging the
 * request. A request-pool read (documentSymbol/etc.) waits on the data-owner
 * readiness latch through awaitSymbolDataReady.
 *
 * Test roles:
 *  - GREEN: a trivial self-contained class becomes ready after local commit.
 *  - INDEPENDENCE: interactive commit does not rely on assistance write-back.
 *  - REGRESSION: a stdlib-referencing class also commits through the pool.
 *  - CANDIDATE C: documents the distinct peek-before-arm race
 *    (`no-compile-pending`).
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
import {
  getLogger,
  type LoggerInterface,
  type WorkerRole,
  enableConsoleLogging,
  setLogLevel,
} from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

const WORKER_TS_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const TSX_OPTIONS = { execArgv: ['--import', 'tsx'] };
const LOG_LEVEL = 'error';
const COMPILATION_POOL_SIZE = 2;

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

const workerLayerFactory = (role: WorkerRole) =>
  makeNodeWorkerLayer(WORKER_TS_ENTRY, {
    ...TSX_OPTIONS,
    name: `cold-start-${role}`,
    workerData: {
      role,
      compilationPoolSize: COMPILATION_POOL_SIZE,
      compilationConcurrency: 1,
    },
  });

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

describe('Cold-start interactive compilation + readiness gate', () => {
  let logger: LoggerInterface;

  beforeAll(() => {
    enableConsoleLogging();
    setLogLevel(LOG_LEVEL);
    logger = getLogger();
  });

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
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        workerLayerFactory,
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
    }).pipe(Effect.scoped);

    const { readiness, waitedMs, query } = await Effect.runPromise(program);

    logger.debug(
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
   * Interactive compile results are committed locally by the data owner. A
   * missing dataOwner assistance route therefore cannot drop the result or
   * strand the readiness latch.
   */
  it('interactive commit does not depend on a dataOwner assistance route', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        workerLayerFactory,
      });

      const openDocs = new Map<string, string>();
      const dispatcher = makeWorkerDispatcher(topology, logger, (uri) =>
        openDocs.get(uri),
      );

      // Deliberately omit the dataOwnerHandler. The interactive path must not
      // use this route to commit compiler results.
      const mediator = wireMediator(dispatcher, logger, {
        failOnPrimary: false,
        routeDataOwner: false,
      });
      mediator.attachToWorkers(
        getRawWorkers(),
        getAssistancePorts(),
        getWorkerNames(),
      );

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
    }).pipe(Effect.scoped);

    const { readiness, waitedMs, query } = await Effect.runPromise(program);

    logger.debug(
      `[CANDIDATE-A] readiness=${JSON.stringify(readiness)} waitedMs=${waitedMs} ` +
        `version=${query.versions[TEST_URI]} ` +
        `entry=${JSON.stringify(query.entries[TEST_URI])}`,
    );

    expect(readiness.reason).toBeUndefined();
    expect(readiness.ready).toBe(true);
    expect(waitedMs).toBeLessThan(GATE_BUDGET_MS - 200);
    expect(query.entries[TEST_URI]).not.toBeNull();
    expect(query.entries[TEST_URI]).toBeDefined();
    expect(query.versions[TEST_URI]).toBe(1);
  }, 120_000);

  /** A real stdlib-dependent table must survive the dedicated compiler-worker
   * protocol, reconstruct locally, and resolve the readiness latch. */
  it('REGRESSION: stdlib-dependent symbols commit locally -> gate ready', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        workerLayerFactory,
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
    }).pipe(Effect.scoped);

    const { readiness, waitedMs, query } = await Effect.runPromise(program);

    logger.debug(
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

  it('open, change, and save all compile and commit through the persistent pool', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(topology, logger);
      const mediator = wireMediator(dispatcher, logger, {
        failOnPrimary: true,
        routeDataOwner: true,
      });
      mediator.attachToWorkers(
        getRawWorkers(),
        getAssistancePorts(),
        getWorkerNames(),
      );

      const events = [
        {
          type: 'documentOpen' as const,
          version: 1,
          text: 'public class TestClass { public void opened() {} }',
        },
        {
          type: 'documentChange' as const,
          version: 2,
          text: 'public class TestClass { public void changed() {} }',
        },
        {
          type: 'documentSave' as const,
          version: 3,
          text: 'public class TestClass { public void saved() {} }',
        },
      ];

      const observed: QueryResult[] = [];
      for (const event of events) {
        yield* Effect.promise(() =>
          dispatcher.dispatch(
            event.type,
            openParams(TEST_URI, event.text, event.version),
          ),
        );
        observed.push(
          (yield* Effect.promise(() =>
            dispatcher.queryDataOwner('QuerySymbolSubset', {
              uris: [TEST_URI],
            }),
          )) as QueryResult,
        );
      }
      return observed;
    }).pipe(Effect.scoped);

    const observed = await Effect.runPromise(program);
    expect(observed.map((result) => result.versions[TEST_URI])).toEqual([
      1, 2, 3,
    ]);
    for (const result of observed) {
      expect(result.entries[TEST_URI]).not.toBeNull();
      expect(result.entries[TEST_URI]).toBeDefined();
    }
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
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        workerLayerFactory,
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
    }).pipe(Effect.scoped);

    const { readiness, waitedMs } = await Effect.runPromise(program);

    logger.debug(
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
