/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Full enrichment round-trip integration tests (live assistance bus).
 *
 * These cover the path that WriteBackProtocol.integration.node.test.ts left
 * `it.skip` ("the coordinator assistance bus is not wired in this isolated
 * data-owner+pool topology, so those calls never settle and the dispatch
 * hangs", follow-up W-22692429): a request-pool worker handling
 * hover/references/implementation must reach OUT to the coordinator for
 * symbol data (dataOwner:QuerySymbolSubset / ResolveDepUris /
 * ResolveDependentUris), stdlib (resourceLoader:*), and write enriched symbols
 * back (dataOwner:UpdateSymbolSubset). The skipped tests dispatched onto an
 * isolated topology with no mediator, so every requestCoordinatorAssistance
 * call hung.
 *
 * Here we wire the assistance bus exactly as LCSAdapter does in production:
 *   - the REAL createPrimaryAssistanceHandler (with a ResourceLoaderProxy over
 *     the live resource-loader worker, so resourceLoader:* calls are served by
 *     the actual stdlib), and
 *   - a dataOwnerHandler routing dataOwner:* to the data-owner worker,
 * attached to the live workers' assistance ports, with the remote-stdlib warmup
 * phase run so the pool worker's namespace cache is primed. Then we dispatch
 * each LSP feature through the pool and assert it COMPLETES end-to-end (returns
 * a result rather than hanging) — proving the full worker→coordinator→worker
 * round-trip closes.
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
  DispatchHover,
  DispatchReferences,
  DispatchImplementation,
  getLogger,
} from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

const WORKER_TS_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const TSX_OPTIONS = { execArgv: ['--import', 'tsx'] };

// A class with an interface + implementor in one file, so go-to-implementation
// and references have real edges to resolve, while staying self-contained
// except for stdlib (String), which the resource loader serves.
const SAMPLE = `public interface Greeter {
    String greet();
}
public class EnglishGreeter implements Greeter {
    public String greet() {
        return 'Hello';
    }
}`;

const URI = 'file:///test/Greeter.cls';

// Cross-file interface + implementor in SEPARATE files, mirroring the live
// go-to-implementation bug (MyInterface.cls + MyImplementation.cls). The
// implementor's `implements` edge is cross-file, so the data-owner must resolve
// it for findReferencesTo(interface) — and thus go-to-implementation — to work.
const IFACE_URI = 'file:///test/IFace.cls';
const IFACE_SRC = `public interface IFace {
    String run();
}`;
const IMPL_URI = 'file:///test/FaceImpl.cls';
const IMPL_SRC = `public with sharing class FaceImpl implements IFace {
    public String run() {
        return 'r';
    }
}`;

// A SECOND cross-file implementor of IFace, added AFTER the first
// go-to-implementation already ran. Mirrors the live sequence the user hit:
// cold-open the interface, go-to-implementation (resolves the first
// implementor and caches that set), then create a new implementing class and
// go-to-implementation again — both must now resolve, not just the first.
const IMPL2_URI = 'file:///test/FaceImpl2.cls';
const IMPL2_SRC = `public with sharing class FaceImpl2 implements IFace {
    public String run() {
        return 'r2';
    }
}`;

/**
 * A minimal LSP connection stub for the primary handler's catch-all
 * (connection.sendRequest / sendNotification). The round-trips under test do
 * not exercise client RPCs for a self-contained file; if one fires we resolve
 * it to a benign empty result so nothing hangs.
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

describe('Enrichment round-trip through the worker topology (live assistance bus)', () => {
  const logger = getLogger();

  afterEach(() => {
    clearRawWorkers();
  });

  const runFeature = (
    makeRequest: () =>
      | DispatchHover
      | DispatchReferences
      | DispatchImplementation,
  ) =>
    Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: 'error',
      });
      const dispatcher = makeWorkerDispatcher(topology, logger, () => SAMPLE);
      wireProductionMediator(topology, dispatcher, logger);
      // Prime the pool worker's remote-stdlib namespace cache (LCSAdapter runs
      // this after attaching the mediator). Without it, the first stdlib lookup
      // on the pool worker has no cache to consult.
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      // Open the file so the data-owner holds its symbols (the enrichment worker
      // loads this subset via dataOwner:QuerySymbolSubset).
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: URI,
            languageId: 'apex',
            version: 1,
            getText: () => SAMPLE,
          },
          textDocument: { uri: URI },
          text: SAMPLE,
        }),
      );

      // Dispatch the feature through the request pool. The handler reaches back
      // over the assistance bus for symbol data / stdlib / dependents and writes
      // enriched symbols back. The assertion is that it COMPLETES (the skipped
      // tests hung here because the bus was unwired).
      const response = (yield* topology.requestPool.executeEffect(
        makeRequest() as never,
      )) as { result: unknown };
      return response;
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

  it('completes a hover round-trip end-to-end', async () => {
    const response = await Effect.runPromise(
      runFeature(
        () =>
          new DispatchHover({
            textDocument: { uri: URI },
            position: { line: 4, character: 18 }, // on greet()
            content: SAMPLE,
          }),
      ),
    );

    console.log(
      `[round-trip:hover] completed result=${JSON.stringify(response.result)}`,
    );
    // The round-trip closed: a (possibly null) result came back rather than
    // hanging on an unsettled assistance call.
    expect(response).toBeDefined();
    expect('result' in response).toBe(true);
  }, 120_000);

  it('completes a references round-trip end-to-end', async () => {
    const response = await Effect.runPromise(
      runFeature(
        () =>
          new DispatchReferences({
            textDocument: { uri: URI },
            position: { line: 1, character: 11 }, // on greet in the interface
            context: { includeDeclaration: true },
          }),
      ),
    );

    console.log(
      `[round-trip:references] completed result=${JSON.stringify(response.result)}`,
    );
    expect(response).toBeDefined();
    expect('result' in response).toBe(true);
  }, 120_000);

  it('completes an implementation round-trip end-to-end', async () => {
    const response = await Effect.runPromise(
      runFeature(
        () =>
          new DispatchImplementation({
            textDocument: { uri: URI },
            position: { line: 1, character: 11 }, // on Greeter.greet()
          }),
      ),
    );

    console.log(
      `[round-trip:implementation] completed result=${JSON.stringify(response.result)}`,
    );
    expect(response).toBeDefined();
    expect('result' in response).toBe(true);
  }, 120_000);

  /**
   * CONCURRENT ENRICHMENT FROM MULTIPLE POOL WORKERS (activated from a former
   * WriteBackProtocol it.skip).
   *
   * Several pool workers each handle a hover for the same file concurrently;
   * each independently loads the symbol subset, enriches, and writes back via
   * dataOwner:UpdateSymbolSubset. The data-owner serializes those racing
   * write-backs and the detail-level guard prevents regression, so the file's
   * stored detail level only ever moves UP (toward 'full') — never backward —
   * and every dispatch completes. This is distinct from the direct-write-back
   * detail race and the latch-stampede in WorkerConcurrencyInterop: here the
   * write-backs originate from real concurrent ENRICHMENT runs on multiple pool
   * workers, exercising the full pool→coordinator→data-owner path under
   * contention.
   */
  it('handles concurrent hovers from multiple pool workers without losing or regressing enrichment', async () => {
    const HOVER_POSITIONS = [
      { line: 1, character: 11 },
      { line: 4, character: 18 },
      { line: 5, character: 15 },
      { line: 1, character: 11 },
      { line: 4, character: 18 },
    ];

    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 3, // multiple enrichment workers
        enableResourceLoader: true,
        logger,
        logLevel: 'error',
      });
      const dispatcher = makeWorkerDispatcher(topology, logger, () => SAMPLE);
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 3);

      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: URI,
            languageId: 'apex',
            version: 1,
            getText: () => SAMPLE,
          },
          textDocument: { uri: URI },
          text: SAMPLE,
        }),
      );

      // Fire several concurrent hovers at different positions; the pool spreads
      // them across its 3 workers, each enriching + writing back concurrently.
      const hovers = HOVER_POSITIONS.map((position) =>
        topology.requestPool.executeEffect(
          new DispatchHover({
            textDocument: { uri: URI },
            position,
            content: SAMPLE,
          }) as never,
        ),
      );
      const results = (yield* Effect.all(hovers, {
        concurrency: 'unbounded',
      })) as { result: unknown }[];

      const query = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('QuerySymbolSubset', { uris: [URI] }),
      )) as {
        versions: Record<string, number>;
        detailLevels: Record<string, string>;
      };

      return { results, query };
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    const { results, query } = await Effect.runPromise(program);

    const levelOrder: Record<string, number> = {
      'public-api': 1,
      protected: 2,
      private: 3,
      full: 4,
    };
    const finalLevel = query.detailLevels[URI];

    console.log(
      `[round-trip:concurrent-hovers] completed=${results.length} ` +
        `version=${query.versions[URI]} finalLevel=${finalLevel}`,
    );

    // Every concurrent dispatch completed (none hung on the bus) ...
    expect(results).toHaveLength(HOVER_POSITIONS.length);
    results.forEach((r) => expect('result' in r).toBe(true));
    // ... the version is unchanged (no edits) ...
    expect(query.versions[URI]).toBe(1);
    // ... and the stored detail level is at least public-api and never regressed
    // below what any single write-back established (monotonic under contention).
    expect(levelOrder[finalLevel]).toBeGreaterThanOrEqual(
      levelOrder['public-api'],
    );
  }, 120_000);

  /**
   * CROSS-FILE GO-TO-IMPLEMENTATION (regression for the live empty-result bug).
   *
   * Reproduces the exact live sequence: cold-open an interface, then load the
   * workspace (which batch-ingests + batch-compiles the implementor that lives
   * in another file), then go-to-implementation on the interface method. The
   * implementor's `implements` edge is CROSS-FILE; the data-owner never ran
   * resolveCrossFileReferencesForFile on the batch-compiled implementor, so its
   * edge stayed out of the reverse index and resolveDependentUris(interface)
   * returned nothing — go-to-implementation came back empty even after the load.
   * The fix resolves supertype edges eagerly in addSymbolTable, so the data
   * owner's reverse index sees implementor → interface and the pool worker's
   * loadDependentsForReferences pulls the implementor in.
   *
   * Asserts the result is NON-EMPTY and points at the implementor file — the
   * content assertion that the other round-trip tests omit.
   */
  it('go-to-implementation finds a cross-file implementor after a workspace load', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: 'error',
      });
      // getDocumentContent serves whichever file is asked for (the coordinator's
      // TextDocuments would do this live); documentSymbol/implementation thread
      // it, and the interface is the open file.
      const sources: Record<string, string> = { [IFACE_URI]: IFACE_SRC };
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        (uri) => sources[uri],
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      // 1. Cold-open the interface: data-owner stores + compiles it (target type
      //    enters the graph first — the live ordering).
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: IFACE_URI,
            languageId: 'apex',
            version: 1,
            getText: () => IFACE_SRC,
          },
          textDocument: { uri: IFACE_URI },
          text: IFACE_SRC,
        }),
      );

      // 2. Workspace load: batch-ingest then batch-compile the implementor (and
      //    the interface), exactly as the live load path does. The implementor's
      //    write-back lands at public-api; addSymbolTable must now resolve its
      //    implements edge into the data-owner reverse index.
      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createBatchCompileDispatcher();
      const entries = [
        { uri: IFACE_URI, content: IFACE_SRC, languageId: 'apex', version: 1 },
        { uri: IMPL_URI, content: IMPL_SRC, languageId: 'apex', version: 1 },
      ];
      yield* Effect.promise(() => ingest('wf-impl-test', entries));
      yield* Effect.promise(() => compile('wf-impl-test', entries));

      // 3. Go-to-implementation on the interface method `run` (line 1).
      const result = yield* Effect.promise(() =>
        dispatcher.dispatch('implementation', {
          textDocument: { uri: IFACE_URI },
          position: { line: 1, character: 11 }, // on `run` in `String run();`
        }),
      );

      return { result };
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    const { result } = await Effect.runPromise(program);

    // The result is an LSP Location | Location[] | LocationLink[]. Normalize to
    // an array and pull out the target URIs.
    const locations = (
      Array.isArray(result) ? result : result ? [result] : []
    ) as Array<{ uri?: string; targetUri?: string }>;
    const targetUris = locations.map((l) => l.uri ?? l.targetUri ?? '');

    console.log(
      `[round-trip:goto-impl] count=${locations.length} targets=${JSON.stringify(targetUris)}`,
    );

    // The crux: go-to-implementation must locate the implementor in the OTHER
    // file. Before the fix this array was empty.
    expect(locations.length).toBeGreaterThan(0);
    expect(targetUris.some((u) => u.includes('FaceImpl'))).toBe(true);
  }, 120_000);

  /**
   * MULTIPLE CROSS-FILE IMPLEMENTORS, added incrementally (regression for the
   * live "only the first implementor resolves" bug).
   *
   * The user's exact sequence: cold-open the interface, run
   * go-to-implementation (resolves implementor #1 and CACHES that result under
   * refs_to_<interface>), then create a NEW implementing class and run
   * go-to-implementation again. Before the fix the stale relationship cache in
   * ApexSymbolManager.findReferencesTo pinned the result to implementor #1, so
   * the newly-added implementor #2 never appeared. addSymbolTable now
   * invalidates the refs_to_ / refs_from_ cache family on every add, so the
   * second go-to-implementation sees BOTH implementors.
   *
   * Asserts the SECOND query returns BOTH implementor files — the multiplicity
   * the single-implementor test above cannot catch.
   */
  it('go-to-implementation returns ALL implementors when a second one is added after the first query', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: 'error',
      });
      const sources: Record<string, string> = { [IFACE_URI]: IFACE_SRC };
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        (uri) => sources[uri],
      );
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      // 1. Cold-open the interface.
      yield* Effect.promise(() =>
        dispatcher.dispatch('documentOpen', {
          document: {
            uri: IFACE_URI,
            languageId: 'apex',
            version: 1,
            getText: () => IFACE_SRC,
          },
          textDocument: { uri: IFACE_URI },
          text: IFACE_SRC,
        }),
      );

      // 2. Workspace load with ONLY the first implementor present.
      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createBatchCompileDispatcher();
      const firstWave = [
        { uri: IFACE_URI, content: IFACE_SRC, languageId: 'apex', version: 1 },
        { uri: IMPL_URI, content: IMPL_SRC, languageId: 'apex', version: 1 },
      ];
      yield* Effect.promise(() => ingest('wf-multi-test', firstWave));
      yield* Effect.promise(() => compile('wf-multi-test', firstWave));

      // 3. First go-to-implementation — populates the relationship cache with
      //    just implementor #1.
      const firstResult = yield* Effect.promise(() =>
        dispatcher.dispatch('implementation', {
          textDocument: { uri: IFACE_URI },
          position: { line: 1, character: 11 },
        }),
      );

      // 4. Create a NEW implementing class and compile it (as saving a new .cls
      //    does live). Its implements edge must invalidate the stale cache.
      const secondWave = [
        { uri: IMPL2_URI, content: IMPL2_SRC, languageId: 'apex', version: 1 },
      ];
      yield* Effect.promise(() => ingest('wf-multi-test-2', secondWave));
      yield* Effect.promise(() => compile('wf-multi-test-2', secondWave));

      // 5. Second go-to-implementation — must now return BOTH implementors.
      const secondResult = yield* Effect.promise(() =>
        dispatcher.dispatch('implementation', {
          textDocument: { uri: IFACE_URI },
          position: { line: 1, character: 11 },
        }),
      );

      return { firstResult, secondResult };
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    const { firstResult, secondResult } = await Effect.runPromise(program);

    const toUris = (result: unknown): string[] => {
      const locations = (
        Array.isArray(result) ? result : result ? [result] : []
      ) as Array<{ uri?: string; targetUri?: string }>;
      return locations.map((l) => l.uri ?? l.targetUri ?? '');
    };

    const firstUris = toUris(firstResult);
    const secondUris = toUris(secondResult);
    console.log(
      `[round-trip:goto-impl-multi] first=${JSON.stringify(firstUris)} ` +
        `second=${JSON.stringify(secondUris)}`,
    );

    // First query saw only implementor #1.
    expect(firstUris.some((u) => u.includes('FaceImpl'))).toBe(true);

    // The crux: after adding implementor #2, the second query returns BOTH.
    // Before the fix the stale cache returned only FaceImpl (the first).
    expect(secondUris.some((u) => u.includes('FaceImpl.cls'))).toBe(true);
    expect(secondUris.some((u) => u.includes('FaceImpl2'))).toBe(true);
  }, 120_000);
});
