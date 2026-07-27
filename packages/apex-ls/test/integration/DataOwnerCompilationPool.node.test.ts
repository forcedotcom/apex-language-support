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
  getLogger,
  setLogLevel,
  type LoggerInterface,
} from '@salesforce/apex-lsp-shared';
import {
  clearRawWorkers,
  initializeTopology,
  makeNodeWorkerLayer,
  makeWorkerDispatcher,
} from '../../src/server/WorkerCoordinator';

const WORKER_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const COMPILATION_POOL_SIZE = 2;

const entries = [
  {
    uri: 'file:///workspace/PoolOne.cls',
    content: 'public class PoolOne { public void first() {} }',
    languageId: 'apex',
    version: 1,
  },
  {
    uri: 'file:///workspace/PoolTwo.cls',
    content: 'public class PoolTwo { public void second() {} }',
    languageId: 'apex',
    version: 1,
  },
];

describe('data-owner-managed Effect compilation pool', () => {
  let logger: LoggerInterface;

  beforeAll(() => {
    setLogLevel('error');
    logger = getLogger();
  });

  afterEach(() => {
    clearRawWorkers();
  });

  it('ingests, compiles, and commits through the configured backing workers', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: COMPILATION_POOL_SIZE,
        enableResourceLoader: false,
        logger,
        logLevel: 'error',
        workerLayerFactory: (role) =>
          makeNodeWorkerLayer(WORKER_ENTRY, {
            name: `test-${role}`,
            execArgv: ['--import', 'tsx'],
            workerData: {
              role,
              compilationPoolSize: COMPILATION_POOL_SIZE,
            },
          }),
      });
      const dispatcher = makeWorkerDispatcher(topology, logger);
      const session = dispatcher.createWorkspaceLoadSessionDispatcher();
      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();

      yield* Effect.promise(() =>
        session({
          _tag: 'BeginWorkspaceLoadSession',
          sessionId: 'effect-pool-session',
        }),
      );
      const ingested = yield* Effect.promise(() =>
        ingest('effect-pool-session', entries),
      );
      const compiled = yield* Effect.promise(() =>
        compile({ sessionId: 'effect-pool-session', entries }),
      );
      const subset = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('QuerySymbolSubset', {
          uris: entries.map((entry) => entry.uri),
        }),
      )) as {
        entries: Record<string, unknown>;
        versions: Record<string, number>;
      };
      yield* Effect.promise(() =>
        session({
          _tag: 'DrainDeferredReferences',
          sessionId: 'effect-pool-session',
        }),
      );

      return { ingested, compiled, subset };
    }).pipe(Effect.scoped);

    const { ingested, compiled, subset } = await Effect.runPromise(program);

    expect(ingested.processedCount).toBe(2);
    expect(compiled).toEqual(
      expect.objectContaining({
        compiledCount: 2,
        errorCount: 0,
        workerCount: COMPILATION_POOL_SIZE,
      }),
    );
    expect(Object.keys(subset.entries)).toEqual(
      expect.arrayContaining(entries.map((entry) => entry.uri)),
    );
    expect(subset.versions).toMatchObject({
      [entries[0].uri]: 1,
      [entries[1].uri]: 1,
    });
  }, 30_000);

  it('rejects compilation results when the document was not ingested', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: 1,
        enableResourceLoader: false,
        logger,
        logLevel: 'error',
        workerLayerFactory: (role) =>
          makeNodeWorkerLayer(WORKER_ENTRY, {
            name: `test-${role}`,
            execArgv: ['--import', 'tsx'],
            workerData: { role, compilationPoolSize: 1 },
          }),
      });
      const dispatcher = makeWorkerDispatcher(topology, logger);
      const session = dispatcher.createWorkspaceLoadSessionDispatcher();

      yield* Effect.promise(() =>
        session({
          _tag: 'BeginWorkspaceLoadSession',
          sessionId: 'missing-document-session',
        }),
      );
      const result = yield* Effect.promise(() =>
        dispatcher.createDataOwnerCompileDispatcher()({
          sessionId: 'missing-document-session',
          entries: [entries[0]],
        }),
      );
      yield* Effect.promise(() =>
        session({
          _tag: 'DrainDeferredReferences',
          sessionId: 'missing-document-session',
        }),
      );
      return result;
    }).pipe(Effect.scoped);

    const result = await Effect.runPromise(program);
    expect(result.compiledCount).toBe(0);
    expect(result.errorCount).toBe(1);
  }, 30_000);

  it('rejects a compiled result when the authoritative document version changed', async () => {
    const program = Effect.gen(function* () {
      const topology = yield* initializeTopology({
        poolSize: 1,
        compilationPoolSize: 1,
        enableResourceLoader: false,
        logger,
        logLevel: 'error',
        workerLayerFactory: (role) =>
          makeNodeWorkerLayer(WORKER_ENTRY, {
            name: `test-${role}`,
            execArgv: ['--import', 'tsx'],
            workerData: { role, compilationPoolSize: 1 },
          }),
      });
      const dispatcher = makeWorkerDispatcher(topology, logger);
      const session = dispatcher.createWorkspaceLoadSessionDispatcher();
      const ingest = dispatcher.createBatchIngestionDispatcher();
      const compile = dispatcher.createDataOwnerCompileDispatcher();
      const currentEntry = {
        ...entries[0],
        content: 'public class PoolOne { public void current() {} }',
        version: 2,
      };

      yield* Effect.promise(() =>
        session({
          _tag: 'BeginWorkspaceLoadSession',
          sessionId: 'stale-version-session',
        }),
      );
      yield* Effect.promise(() =>
        ingest('stale-version-session', [currentEntry]),
      );
      const result = yield* Effect.promise(() =>
        compile({
          sessionId: 'stale-version-session',
          entries: [entries[0]],
        }),
      );
      const subset = (yield* Effect.promise(() =>
        dispatcher.queryDataOwner('QuerySymbolSubset', {
          uris: [currentEntry.uri],
        }),
      )) as {
        entries: Record<string, unknown>;
        versions: Record<string, number>;
      };
      yield* Effect.promise(() =>
        session({
          _tag: 'DrainDeferredReferences',
          sessionId: 'stale-version-session',
        }),
      );

      return { result, subset };
    }).pipe(Effect.scoped);

    const { result, subset } = await Effect.runPromise(program);
    expect(result.compiledCount).toBe(0);
    expect(result.errorCount).toBe(1);
    expect(subset.entries[entries[0].uri]).toBeNull();
    expect(subset.versions[entries[0].uri]).toBe(2);
  }, 30_000);
});
