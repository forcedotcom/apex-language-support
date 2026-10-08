/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'node:path';
import { Effect } from 'effect';
import {
  clearRawWorkers,
  getAssistancePorts,
  getRawWorkers,
  getWorkerNames,
  initializeTopology,
  makeNodeWorkerLayer,
  makeWorkerDispatcher,
  runRemoteStdlibWarmupPhase,
  type WorkerTopology,
} from '../../src/server/WorkerCoordinator';
import { CoordinatorAssistanceMediator } from '../../src/server/CoordinatorAssistanceMediator';
import { createPrimaryAssistanceHandler } from '../../src/server/CoordinatorPrimaryAssistanceHandler';
import { ResourceLoaderProxy } from '../../src/server/ResourceLoaderProxy';
import {
  getLogger,
  setLogLevel,
  type LoggerInterface,
  type WorkerRole,
} from '@salesforce/apex-lsp-shared';

const WORKER_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const URI = 'file:///workspace/ManagedExample.cls';
const SOURCE = [
  'public class ManagedExample {',
  '  public class CustomException extends Exception {}',
  '  void run() {',
  '    Integer value = 1;',
  '  }',
  '}',
].join('\n');

const entry = {
  uri: URI,
  content: SOURCE,
  languageId: 'apex',
  version: 1,
  namespace: 'managed',
};

const workerLayerFactory = (role: WorkerRole) =>
  makeNodeWorkerLayer(WORKER_ENTRY, {
    name: `debugger-${role}`,
    execArgv: ['--import', 'tsx'],
    workerData: { role, compilationPoolSize: 1, compilationConcurrency: 1 },
  });

function wireProductionMediator(
  topology: WorkerTopology,
  dispatcher: ReturnType<typeof makeWorkerDispatcher>,
  logger: LoggerInterface,
): void {
  const resourceLoaderProxy = topology.resourceLoader
    ? new ResourceLoaderProxy(topology.resourceLoader, logger)
    : undefined;
  const mediator = new CoordinatorAssistanceMediator(
    createPrimaryAssistanceHandler({
      connection: {
        sendRequest: async () => null,
        sendNotification: async () => undefined,
      },
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
}

describe('debugger metadata through the worker topology', () => {
  let logger: LoggerInterface;

  beforeAll(() => {
    setLogLevel('error');
    logger = getLogger();
  });

  afterEach(() => {
    clearRawWorkers();
  });

  it('returns namespaced parser and standard-library debugger metadata from the data owner', async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const topology = yield* initializeTopology({
          poolSize: 1,
          compilationPoolSize: 1,
          enableResourceLoader: true,
          logger,
          logLevel: 'error',
          workerLayerFactory,
        });
        const dispatcher = makeWorkerDispatcher(topology, logger);
        wireProductionMediator(topology, dispatcher, logger);
        yield* runRemoteStdlibWarmupPhase(topology, 1);

        const ingest = dispatcher.createBatchIngestionDispatcher();
        const compile = dispatcher.createDataOwnerCompileDispatcher();
        yield* Effect.promise(() => ingest('debugger-session', [entry]));
        yield* Effect.promise(() =>
          compile({ sessionId: 'debugger-session', entries: [entry] }),
        );

        const lines = yield* Effect.promise(() =>
          dispatcher.queryDebuggerMetadata(URI, 'lineBreakpoints'),
        );
        const exceptions = yield* Effect.promise(() =>
          dispatcher.queryDebuggerMetadata(URI, 'exceptionBreakpoints'),
        );
        yield* Effect.promise(() =>
          expect(
            dispatcher.queryDebuggerMetadata(
              'file:///workspace/Missing.cls',
              'lineBreakpoints',
            ),
          ).rejects.toThrow('No document state is available'),
        );
        return { lines, exceptions };
      }).pipe(Effect.scoped),
    );

    expect(result.lines).toEqual([
      { uri: URI, typeref: 'managed/ManagedExample', lines: [4] },
    ]);
    expect(result.exceptions).toEqual(
      expect.arrayContaining([
        {
          uri: URI,
          typeref: 'managed/ManagedExample$CustomException',
          label: 'CustomException',
        },
        expect.objectContaining({
          uri: null,
          label: 'System.DmlException',
          typeref: 'com/salesforce/api/exception/DmlException',
        }),
      ]),
    );
  }, 120_000);
});
