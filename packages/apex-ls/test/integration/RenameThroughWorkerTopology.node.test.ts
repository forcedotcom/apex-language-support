/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * textDocument/rename through the live worker topology (W-23631069 / Phase 0).
 *
 * Phase 0 wires the rename pipe end-to-end but the pool-side handler is a
 * deliberate NO-OP: it returns `null` (LSP "nothing to rename"). This test is
 * the Phase-0 deliverable — prove the full path works across the worker
 * boundary before any occurrence-resolution / WorkspaceEdit logic lands:
 *
 *   coordinator.dispatch('rename') → request-pool worker DispatchRename handler
 *   → back to the coordinator as `null`.
 *
 * Mirrors ReferencesThroughWorkerTopology.node.test.ts: rename now routes to the
 * request pool (DISPATCH_ROUTING rename: 'requestPool'), so `dispatch('rename')`
 * must settle with `null` rather than throw "coordinator-only" or hang.
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

const UTIL_URI = 'file:///test/RenameTarget.cls';
const UTIL_SRC = `public class RenameTarget {
    public String greet(String input) {
        return input;
    }
}`;

const SOURCES: Record<string, string> = {
  [UTIL_URI]: UTIL_SRC,
};

const stubConnection = {
  sendRequest: async () => null,
  sendNotification: async () => undefined,
};

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

describe('rename through the worker topology (Phase 0 no-op)', () => {
  let logger: LoggerInterface;

  beforeAll(() => {
    enableConsoleLogging();
    setLogLevel(LOG_LEVEL);
    logger = getLogger();
  });

  afterEach(() => {
    clearRawWorkers();
  });

  it('routes rename to the request pool and settles with null (Phase 0)', async () => {
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

      // rename must NOT be coordinator-only anymore — it dispatches to the pool.
      const canDispatch = dispatcher.canDispatch('rename');

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

      // Dispatch rename on the `greet` method. The Phase-0 handler ignores the
      // position/newName and returns null; what we're proving is that the
      // request crosses the worker boundary and settles.
      const result = yield* Effect.promise(() =>
        dispatcher.dispatch('rename', {
          textDocument: { uri: UTIL_URI },
          position: { line: 1, character: 18 }, // on `greet`
          newName: 'salute',
        }),
      );

      return { canDispatch, result };
    }).pipe(Effect.scoped);

    const { canDispatch, result } = await Effect.runPromise(program);
    logger.debug(
      `[rename-topology] canDispatch=${canDispatch} result=${JSON.stringify(result)}`,
    );

    // The pipe is live (rename is pool-dispatchable) and the no-op handler
    // returns null across the boundary — no throw, no hang.
    expect(canDispatch).toBe(true);
    expect(result).toBeNull();
  }, 120_000);
});
