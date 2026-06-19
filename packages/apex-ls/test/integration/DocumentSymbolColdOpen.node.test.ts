/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * REGRESSION (W-23006798): documentSymbol on a COLD-OPENED file returns EMPTY.
 *
 * Reproduces the live-log sequence for a freshly opened Apex file:
 *   1. documentOpen is dispatched to the data-owner worker, which stores the
 *      document TEXT and triggers a compile that writes symbols back. The
 *      data-owner ends up holding the file's symbols (e.g. "4 symbols merged at
 *      public-api").
 *   2. documentSymbol is dispatched to the request-pool worker. On the pool
 *      worker, DefaultApexDocumentSymbolProvider.provideDocumentSymbols reads
 *      the document TEXT from storage.getDocument(uri).getText() and RE-COMPILES
 *      it (with FullSymbolCollectorListener, for a complete hierarchy) — it
 *      never consults the loaded symbol graph. The regression:
 *      WorkerCoordinator.buildLspRequestMessage built DispatchDocumentSymbol
 *      with ONLY the URI and NO `content` (unlike hover/completion, which thread
 *      `content: getDocumentContent(uri)`), so the pool worker's storage had no
 *      document, getDocument returned null, and the provider returned an empty
 *      outline.
 *
 * The fix threads the live text into the DispatchDocumentSymbol payload (and the
 * pool handler stores it before re-compiling). This test drives the real
 * dispatch path (dispatcher.dispatch('documentSymbol', ...) -> buildLspRequestMessage)
 * and asserts the outline is NON-EMPTY — the content assertion the
 * EnrichmentRoundTrip round-trip tests omit, which is why they missed this.
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
import { getLogger } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

const WORKER_TS_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const TSX_OPTIONS = { execArgv: ['--import', 'tsx'] };

// A simple, self-contained interface: trivial to compile and outline. Mirrors
// the live-log file (MyInterface.cls) whose cold-open documentSymbol returned
// empty.
const SAMPLE = `public interface MyInterface {
    String getName();
    void setValue(Integer value);
    Boolean isActive();
}`;

const URI = 'file:///test/MyInterface.cls';

const stubConnection = {
  sendRequest: async () => null,
  sendNotification: async () => undefined,
};

/**
 * Wire the assistance bus exactly as LCSAdapter / EnrichmentRoundTrip does.
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

describe('documentSymbol on a cold-opened file (live assistance bus)', () => {
  const logger = getLogger();

  afterEach(() => {
    clearRawWorkers();
  });

  it('returns a NON-EMPTY outline for a cold-opened class', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: 'error',
      });
      const dispatcher = makeWorkerDispatcher(topology, logger, () => SAMPLE);
      wireProductionMediator(topology, dispatcher, logger);
      yield* runRemoteStdlibWarmupPhase(topology, 1);

      // Cold open: the data-owner stores the text + compiles + holds symbols.
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

      // documentSymbol via the real dispatch path: dispatch('documentSymbol')
      // routes through WorkerCoordinator.buildLspRequestMessage, which threads
      // the live document text (getDocumentContent) into the DispatchDocumentSymbol
      // payload — the fix. The pool worker stores that text so the provider can
      // re-compile the outline. (Before the fix, the builder omitted content and
      // the pool worker had no document to compile -> empty outline.)
      const result = yield* Effect.promise(() =>
        dispatcher.dispatch('documentSymbol', { textDocument: { uri: URI } }),
      );

      return { result };
    }).pipe(
      Effect.scoped,
      Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
    );

    const response = await Effect.runPromise(program);
    const symbols = response.result as unknown[] | null;

    console.log(`[cold-open:documentSymbol] result=${JSON.stringify(symbols)}`);

    // The outline must contain the interface (and ideally its members). With the
    // regression, `symbols` is null/empty because the pool worker has no
    // document text to re-compile.
    expect(Array.isArray(symbols)).toBe(true);
    expect((symbols as unknown[]).length).toBeGreaterThan(0);
  }, 120_000);
});
