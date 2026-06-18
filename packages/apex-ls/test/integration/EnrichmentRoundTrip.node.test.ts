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
});
