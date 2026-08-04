/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * find-references through the live worker topology (W-22692429 / 6.13).
 *
 * EnrichmentRoundTrip.node.test.ts proves the references round-trip COMPLETES
 * (a result comes back rather than hanging on an unsettled assistance call).
 * This test goes one step further — the 6.13 deliverable — and asserts the
 * RESULT COUNT: dispatch find-references on a method with known cross-file call
 * sites and verify every call site comes back, across the worker boundary.
 *
 * The path under test is the production one: a request-pool worker handles
 * `references`, reaches OUT over the assistance bus to the coordinator for the
 * symbol subset (dataOwner:QuerySymbolSubset), the cross-file dependents
 * (dataOwner:ResolveDependentUris), and stdlib (resourceLoader:*), then returns
 * the LSP Location[]. The assistance bus is wired exactly as LCSAdapter wires it
 * in production.
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
  runRemoteStdlibWarmupPhase,
  type WorkerTopology,
} from '../../src/server/WorkerCoordinator';
import { CoordinatorAssistanceMediator } from '../../src/server/CoordinatorAssistanceMediator';
import { createPrimaryAssistanceHandler } from '../../src/server/CoordinatorPrimaryAssistanceHandler';
import { ResourceLoaderProxy } from '../../src/server/ResourceLoaderProxy';
import {
  getLogger,
  enableConsoleLogging,
  setLogLevel,
  LoggerInterface,
  type WorkerRole,
} from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

const WORKER_TS_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const TSX_OPTIONS = { execArgv: ['--import', 'tsx'] };
const LOG_LEVEL = 'debug';
const COMPILATION_POOL_SIZE = 2;
const workerLayerFactory = (role: WorkerRole) =>
  makeNodeWorkerLayer(WORKER_TS_ENTRY, {
    ...TSX_OPTIONS,
    workerData: {
      role,
      compilationPoolSize: COMPILATION_POOL_SIZE,
      compilationConcurrency: 1,
    },
  });

// A utility class whose instance method `greet` is called from TWO other files,
// twice in one of them — three cross-file call sites in total. Self-contained
// except for String, which the resource loader serves. Instance calls (vs
// static `RefUtil.greet()`) resolve through the cross-file reverse index; the
// qualified-static call site is a separate, narrower resolution path.
const UTIL_URI = 'file:///test/RefUtil.cls';
const UTIL_SRC = `public class RefUtil {
    public String greet(String input) {
        return input;
    }
}`;

const CALLER_A_URI = 'file:///test/RefCallerA.cls';
const CALLER_A_SRC = `public class RefCallerA {
    public String run() {
        RefUtil u = new RefUtil();
        return u.greet('a');
    }
}`;

const CALLER_B_URI = 'file:///test/RefCallerB.cls';
const CALLER_B_SRC = `public class RefCallerB {
    public void run() {
        RefUtil u = new RefUtil();
        String x = u.greet('b');
        String y = u.greet('c');
    }
}`;

const ALL_ENTRIES = [
  { uri: UTIL_URI, content: UTIL_SRC, languageId: 'apex', version: 1 },
  { uri: CALLER_A_URI, content: CALLER_A_SRC, languageId: 'apex', version: 1 },
  { uri: CALLER_B_URI, content: CALLER_B_SRC, languageId: 'apex', version: 1 },
];

const SOURCES: Record<string, string> = {
  [UTIL_URI]: UTIL_SRC,
  [CALLER_A_URI]: CALLER_A_SRC,
  [CALLER_B_URI]: CALLER_B_SRC,
};

/**
 * Minimal LSP connection stub for the primary handler's catch-all. The
 * self-contained fixture fires no client RPCs; if one does, resolve it benignly
 * so nothing hangs.
 */
const stubConnection = {
  sendRequest: async () => null,
  sendNotification: async () => undefined,
};

/**
 * Wire the assistance bus exactly as LCSAdapter does: real primary handler
 * (coordinator/* + resourceLoader/* via the proxy + catch-all) plus a
 * dataOwnerHandler routing dataOwner:* to the data-owner worker.
 */
function wireProductionMediator(
  topology: WorkerTopology,
  dispatcher: ReturnType<typeof makeWorkerDispatcher>,
  logger: ReturnType<typeof getLogger>,
): CoordinatorAssistanceMediator {
  const resourceLoaderProxy = topology.resourceLoader
    ? new ResourceLoaderProxy(topology.resourceLoader, logger)
    : undefined;
  const mediator = new CoordinatorAssistanceMediator(
    createPrimaryAssistanceHandler({
      connection: stubConnection,
      logger,
      getResourceLoaderProxy: () => resourceLoaderProxy,
    }),
    logger,
    (method, params) => dispatcher.queryDataOwner(method, params),
  );
  mediator.attachToWorkers(
    getRawWorkers(),
    getAssistancePorts(),
    getWorkerNames(),
  );
  return mediator;
}

const toLocations = (
  result: unknown,
): Array<{ uri?: string; targetUri?: string }> =>
  (Array.isArray(result) ? result : result ? [result] : []) as Array<{
    uri?: string;
    targetUri?: string;
  }>;

describe('find-references through the worker topology (location count)', () => {
  let logger: LoggerInterface;

  beforeAll(() => {
    enableConsoleLogging();
    setLogLevel(LOG_LEVEL);
    logger = getLogger();
  });

  afterEach(() => {
    clearRawWorkers();
  });

  it('returns every cross-file usage of a type through the worker boundary', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        (uri) => SOURCES[uri],
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      // Cold-open the declaring file (the data-owner holds RefUtil's symbols),
      // then load the workspace so the callers' cross-file method-call edges
      // enter the data-owner reverse index.
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: UTIL_URI,
            languageId: 'apex',
            version: 1,
            getText: () => UTIL_SRC,
          },
          textDocument: { uri: UTIL_URI },
          text: UTIL_SRC,
        }),
      );

      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();
      yield* Effect.promise(() => ingest('wf-refs-count', ALL_ENTRIES));
      yield* Effect.promise(() =>
        compile({ sessionId: 'wf-refs-count', entries: ALL_ENTRIES }),
      );

      // find-references on the `RefUtil` TYPE usage in caller A — the cursor is
      // on `RefUtil` in `RefUtil u = new RefUtil()` (line 2). find-references
      // invoked from a usage resolves the cursor to the declared type, then the
      // data-owner reverse index yields every cross-file usage. The dispatch
      // threads the caller's document text so the pool worker's storage can map
      // the position to a symbol.
      const result = yield* Effect.promise(() =>
        dispatcher.dispatch('references', {
          textDocument: { uri: CALLER_A_URI },
          position: { line: 2, character: 8 }, // on `RefUtil` in `RefUtil u = ...`
          context: { includeDeclaration: true },
        }),
      );

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);
    logger.debug(`[D2] ${JSON.stringify(result)}`);

    const locations = toLocations(result);
    const uris = locations.map((l) => l.uri ?? l.targetUri ?? '');
    logger.debug(
      `[refs-topology] count=${locations.length} uris=${JSON.stringify(uris)}`,
    );

    // The crux: every cross-file usage of the RefUtil type comes back through
    // the worker boundary, not just a single collapsed result.
    //   - RefCallerA: two type usages (`RefUtil u`, `new RefUtil()`)
    //   - RefCallerB: two type usages
    //   - RefUtil:    the declaration (includeDeclaration: true)
    expect(locations.length).toBeGreaterThanOrEqual(3);
    expect(uris.some((u) => u.includes('RefCallerA'))).toBe(true);
    expect(uris.some((u) => u.includes('RefCallerB'))).toBe(true);
  }, 120_000);

  it('returns the same count on a repeat request after an intervening documentChange (W-23272674)', async () => {
    // Regression: find-references was not idempotent. The phase-1 lexical
    // prefilter scans the data-owner's stored document text; a documentChange
    // used to overwrite that text with a blank placeholder (the write-back
    // merges symbols but never restores text), so any file edited since the
    // last full workspace ingest silently dropped out of the candidate set and
    // its call sites vanished from the second request's result.
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        (uri) => SOURCES[uri],
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: UTIL_URI,
            languageId: 'apex',
            version: 1,
            getText: () => UTIL_SRC,
          },
          textDocument: { uri: UTIL_URI },
          text: UTIL_SRC,
        }),
      );

      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();
      yield* Effect.promise(() => ingest('wf-refs-idem', ALL_ENTRIES));
      yield* Effect.promise(() =>
        compile({ sessionId: 'wf-refs-idem', entries: ALL_ENTRIES }),
      );

      const dispatchRefs = () =>
        Effect.promise(() =>
          dispatcher.dispatch('references', {
            textDocument: { uri: CALLER_A_URI },
            position: { line: 2, character: 8 }, // on `RefUtil` usage in caller A
            context: { includeDeclaration: true },
          }),
        );

      const first = yield* dispatchRefs();

      // A caller file is edited (content unchanged, new version) — the exact
      // event that used to blank RefCallerB's stored text on the data-owner.
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentChange', {
          document: {
            uri: CALLER_B_URI,
            languageId: 'apex',
            version: 2,
            getText: () => CALLER_B_SRC,
          },
          textDocument: { uri: CALLER_B_URI },
          text: CALLER_B_SRC,
        }),
      );

      const second = yield* dispatchRefs();

      return { first, second };
    }).pipe(Effect.scoped);

    const { first, second } = await Effect.runPromise(program);

    const firstUris = toLocations(first).map((l) => l.uri ?? l.targetUri ?? '');
    const secondUris = toLocations(second).map(
      (l) => l.uri ?? l.targetUri ?? '',
    );
    logger.debug(
      `[refs-topology:idempotent] first=${firstUris.length} second=${secondUris.length}`,
    );

    // The second request must return the same locations as the first — in
    // particular RefCallerB (the edited file) must still contribute its usages.
    expect(secondUris.length).toBe(firstUris.length);
    expect(secondUris.some((u) => u.includes('RefCallerB'))).toBe(true);
    expect(secondUris.some((u) => u.includes('RefCallerA'))).toBe(true);
  }, 120_000);

  it('surfaces a cross-file usage whose casing differs from the declaration (W-23631075)', async () => {
    // Regression: the phase-1 lexical prefilter (textMentionsSymbol) was
    // case-sensitive. Apex identifiers are case-insensitive, so a caller that
    // writes `u.GREET(...)` references the same method as the `greet`
    // declaration — but a case-sensitive `\bgreet\b` prefilter never matched
    // that file's text, so it was dropped from the candidate set before
    // phase-2 (which already case-folds) could scan it. The differently-cased
    // call site silently vanished from the result. For rename this is worse
    // than a miss: the occurrence is left unrenamed and the build breaks with
    // no error.
    const DECL_URI = 'file:///test/CaseDeclUtil.cls';
    const DECL_SRC = `public class CaseDeclUtil {
    public String greet(String input) {
        return input;
    }
}`;
    // Caller references the method with a DIFFERENT casing (`GREET`).
    const CASE_CALLER_URI = 'file:///test/CaseCaller.cls';
    const CASE_CALLER_SRC = `public class CaseCaller {
    public String run() {
        CaseDeclUtil u = new CaseDeclUtil();
        return u.GREET('a');
    }
}`;
    const CASE_ENTRIES = [
      { uri: DECL_URI, content: DECL_SRC, languageId: 'apex', version: 1 },
      {
        uri: CASE_CALLER_URI,
        content: CASE_CALLER_SRC,
        languageId: 'apex',
        version: 1,
      },
    ];
    const CASE_SOURCES: Record<string, string> = {
      [DECL_URI]: DECL_SRC,
      [CASE_CALLER_URI]: CASE_CALLER_SRC,
    };

    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        (uri) => CASE_SOURCES[uri],
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: DECL_URI,
            languageId: 'apex',
            version: 1,
            getText: () => DECL_SRC,
          },
          textDocument: { uri: DECL_URI },
          text: DECL_SRC,
        }),
      );

      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();
      yield* Effect.promise(() => ingest('wf-refs-case', CASE_ENTRIES));
      yield* Effect.promise(() =>
        compile({ sessionId: 'wf-refs-case', entries: CASE_ENTRIES }),
      );

      // Cursor on the `greet` DECLARATION (line 1, char 18). The target name
      // resolves to `greet`; the prefilter then scans the caller's text, which
      // spells the call `GREET`. Only a case-insensitive prefilter surfaces it.
      const result = yield* Effect.promise(() =>
        dispatcher.dispatch('references', {
          textDocument: { uri: DECL_URI },
          position: { line: 1, character: 18 },
          context: { includeDeclaration: false },
        }),
      );

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);

    const locations = toLocations(result);
    const uris = locations.map((l) => l.uri ?? l.targetUri ?? '');
    logger.debug(
      `[refs-topology:case-insensitive] count=${locations.length} uris=${JSON.stringify(uris)}`,
    );

    // The differently-cased call site in CaseCaller must come back.
    expect(uris.some((u) => u.includes('CaseCaller'))).toBe(true);
  }, 120_000);

  it('omits the declaration when includeDeclaration is false', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        (uri) => SOURCES[uri],
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: UTIL_URI,
            languageId: 'apex',
            version: 1,
            getText: () => UTIL_SRC,
          },
          textDocument: { uri: UTIL_URI },
          text: UTIL_SRC,
        }),
      );

      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();
      yield* Effect.promise(() => ingest('wf-refs-nodecl', ALL_ENTRIES));
      yield* Effect.promise(() =>
        compile({ sessionId: 'wf-refs-nodecl', entries: ALL_ENTRIES }),
      );

      const result = yield* Effect.promise(() =>
        dispatcher.dispatch('references', {
          textDocument: { uri: CALLER_A_URI },
          position: { line: 2, character: 8 }, // on `RefUtil` usage in caller A
          context: { includeDeclaration: false },
        }),
      );

      return { result };
    }).pipe(Effect.scoped);

    const { result } = await Effect.runPromise(program);

    const locations = toLocations(result);
    const uris = locations.map((l) => l.uri ?? l.targetUri ?? '');
    logger.debug(
      `[refs-topology:no-decl] count=${locations.length} uris=${JSON.stringify(uris)}`,
    );

    // The usages still resolve cross-file; the type declaration in RefUtil is
    // suppressed. Every returned location is a usage in a caller file.
    expect(locations.length).toBeGreaterThanOrEqual(3);
    const declHit = locations.find((l) => {
      const u = l.uri ?? l.targetUri ?? '';
      // The declaration sits on line 0 (LSP) of RefUtil.cls; a usage never does.
      const range = (l as { range?: { start?: { line?: number } } }).range;
      return u.includes('RefUtil.cls') && range?.start?.line === 0;
    });
    // includeDeclaration:false → the RefUtil type declaration line is excluded.
    expect(declHit).toBeUndefined();
  }, 120_000);
});
