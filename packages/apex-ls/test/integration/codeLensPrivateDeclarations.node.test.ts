/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import { Effect } from 'effect';
import {
  initializeTopology,
  makeNodeWorkerLayer,
  makeWorkerDispatcher,
  getRawWorkers,
  getAssistancePorts,
  getWorkerNames,
  clearRawWorkers,
  runRemoteStdlibWarmupPhase,
} from '../../src/server/WorkerCoordinator';
import { CoordinatorAssistanceMediator } from '../../src/server/CoordinatorAssistanceMediator';
import { createPrimaryAssistanceHandler } from '../../src/server/CoordinatorPrimaryAssistanceHandler';
import { ResourceLoaderProxy } from '../../src/server/ResourceLoaderProxy';
import {
  getLogger,
  enableConsoleLogging,
  setLogLevel,
  QuerySymbolSubset,
  type WorkerRole,
} from '@salesforce/apex-lsp-shared';

const WORKER_ENTRY = path.resolve(__dirname, '../../dist/worker.platform.js');
const URI = 'file:///test/PrivateTest.cls';
const SAMPLE = `@isTest
private class PrivateTest {
    @isTest
    static void testPrivate() {}
}`;
const LOG_LEVEL = 'error';
const workerLayerFactory = (role: WorkerRole) =>
  makeNodeWorkerLayer(WORKER_ENTRY, {
    workerData: {
      role,
      compilationPoolSize: 2,
      compilationConcurrency: 1,
    },
  });

describe('CodeLens for private test declarations (live worker topology)', () => {
  beforeAll(() => {
    enableConsoleLogging();
    setLogLevel(LOG_LEVEL);
  });

  afterEach(() => {
    clearRawWorkers();
  });

  it('returns class and qualified method run/debug descriptors without owner write-back or dependencies', async () => {
    const program = Effect.gen(function* () {
      const logger = getLogger();
      const topology = yield* initializeTopology({
        poolSize: 1,
        enableResourceLoader: true,
        logger,
        logLevel: LOG_LEVEL,
        serverMode: 'production',
        compilationPoolSize: 2,
        compilationConcurrency: 1,
        workerLayerFactory,
      });
      const dispatcher = makeWorkerDispatcher(
        topology,
        logger,
        () => SAMPLE,
        () => 1,
      );
      const resourceLoaderProxy = topology.resourceLoader
        ? new ResourceLoaderProxy(topology.resourceLoader, logger)
        : undefined;
      const ownerRequests: string[] = [];
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
        (method, params) => {
          ownerRequests.push(method);
          return dispatcher.queryDataOwner(method, params);
        },
      );
      mediator.attachToWorkers(
        getRawWorkers(),
        getAssistancePorts(),
        getWorkerNames(),
      );
      yield* runRemoteStdlibWarmupPhase(topology, 1);
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
      const before = yield* topology.dataOwner.executeEffect(
        new QuerySymbolSubset({ uris: [URI] }),
      );
      expect(before.detailLevels[URI]).toBe('private');
      expect(
        (
          before.entries[URI] as { symbols: Array<{ name: string }> }
        ).symbols.map((symbol) => symbol.name),
      ).toEqual(expect.arrayContaining(['PrivateTest', 'testPrivate']));
      ownerRequests.length = 0;

      const result = yield* Effect.promise(() =>
        dispatcher.dispatch('codeLens', { textDocument: { uri: URI } }),
      );
      const after = yield* topology.dataOwner.executeEffect(
        new QuerySymbolSubset({ uris: [URI] }),
      );
      return { result, before, after, ownerRequests };
    }).pipe(Effect.scoped);

    const { result, before, after, ownerRequests } =
      await Effect.runPromise(program);
    expect(result).toHaveLength(4);
    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          command: {
            title: 'Run All Tests',
            command: 'sf.apex.test.class.run.delegate',
            arguments: ['PrivateTest'],
          },
        }),
        expect.objectContaining({
          command: {
            title: 'Debug All Tests',
            command: 'sf.apex.debug.class.run.delegate',
            arguments: ['PrivateTest'],
          },
        }),
        expect.objectContaining({
          command: {
            title: 'Run Test',
            command: 'sf.apex.test.method.run.delegate',
            arguments: ['PrivateTest.testPrivate'],
          },
        }),
        expect.objectContaining({
          command: {
            title: 'Debug Test',
            command: 'sf.apex.debug.method.run.delegate',
            arguments: ['PrivateTest.testPrivate'],
          },
        }),
      ]),
    );
    expect(after).toEqual(before);
    expect(ownerRequests).toEqual(['QuerySymbolSubset']);
  }, 120_000);
});
