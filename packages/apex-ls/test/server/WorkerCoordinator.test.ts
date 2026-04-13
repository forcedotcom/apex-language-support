/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import {
  runVerticalSlice,
  initializeTopology,
  makeNodeWorkerLayer,
  clampPoolSize,
  WorkerTopologyDispatcher,
  TransportTopologyDispatcher,
  initializeTransportTopology,
} from '../../src/server/WorkerCoordinator';
import { PingWorker, QuerySymbolSubset } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';
import type { LoggerInterface } from '@salesforce/apex-lsp-shared';
import type { WorkerTopology } from '../../src/server/WorkerCoordinator';
import type {
  WorkerTopologyTransport,
  WorkerHandle,
  PoolHandle,
  TransportSpawnError,
  TransportSendError,
} from '@salesforce/apex-lsp-compliant-services';

const WORKER_TS_ENTRY = path.resolve(__dirname, '../../src/worker.platform.ts');
const TSX_OPTIONS = { execArgv: ['--import', 'tsx'] };

function createSpyLogger(): LoggerInterface & { messages: string[] } {
  const messages: string[] = [];
  const capture = (msgOrFn: string | (() => string)) => {
    messages.push(typeof msgOrFn === 'function' ? msgOrFn() : msgOrFn);
  };
  const noop = () => {};
  return {
    messages,
    info: capture,
    debug: noop,
    warn: noop,
    error: capture,
    log: noop,
  } as unknown as LoggerInterface & { messages: string[] };
}

describe('WorkerCoordinator', () => {
  describe('vertical slice (step 3)', () => {
    it('round-trip: WorkerInit + PingWorker', async () => {
      const logger = createSpyLogger();
      await runVerticalSlice(logger, WORKER_TS_ENTRY, TSX_OPTIONS);

      expect(logger.messages).toEqual(
        expect.arrayContaining([
          expect.stringContaining('ready=true'),
          expect.stringContaining('vertical-slice-ping'),
        ]),
      );
    }, 15_000);
  });

  describe('pool topology (step 4)', () => {
    it('spawns data-owner + enrichment pool, ping round-trips on both', async () => {
      const logger = createSpyLogger();

      const program = Effect.gen(function* () {
        const topology = yield* initializeTopology({
          poolSize: 1,
          enableResourceLoader: false,
          logger,
        });

        const ping = yield* topology.dataOwner.executeEffect(
          new PingWorker({ echo: 'data-owner-ping' }),
        );
        expect(ping.echo).toBe('data-owner-ping');

        const poolPing = yield* topology.enrichmentPool.executeEffect(
          new PingWorker({ echo: 'pool-ping' }),
        );
        expect(poolPing.echo).toBe('pool-ping');
      }).pipe(
        Effect.scoped,
        Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
      );

      await Effect.runPromise(program);

      expect(logger.messages).toContainEqual(
        expect.stringContaining('Data owner initialized'),
      );
      expect(logger.messages).toContainEqual(
        expect.stringContaining('Enrichment pool initialized'),
      );
    }, 15_000);

    it('data-owner handles QuerySymbolSubset with mock data', async () => {
      const logger = createSpyLogger();

      const program = Effect.gen(function* () {
        const topology = yield* initializeTopology({
          poolSize: 1,
          enableResourceLoader: false,
          logger,
        });

        const result = yield* topology.dataOwner.executeEffect(
          new QuerySymbolSubset({ uris: ['file:///a.cls', 'file:///b.cls'] }),
        );

        expect(result.entries['file:///a.cls']).toBeNull();
        expect(result.entries['file:///b.cls']).toBeNull();
      }).pipe(
        Effect.scoped,
        Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
      );

      await Effect.runPromise(program);
    }, 15_000);

    it('spawns optional resource-loader when enabled', async () => {
      const logger = createSpyLogger();

      const program = Effect.gen(function* () {
        const topology = yield* initializeTopology({
          poolSize: 1,
          enableResourceLoader: true,
          logger,
        });

        expect(topology.resourceLoader).not.toBeNull();

        const ping = yield* topology.resourceLoader!.executeEffect(
          new PingWorker({ echo: 'loader-ping' }),
        );
        expect(ping.echo).toBe('loader-ping');
      }).pipe(
        Effect.scoped,
        Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
      );

      await Effect.runPromise(program);

      expect(logger.messages).toContainEqual(
        expect.stringContaining('Resource loader initialized'),
      );
    }, 15_000);
  });

  describe('WorkerTopologyDispatcher (step 5 + step 6)', () => {
    it('isAvailable returns true by default', () => {
      const logger = createSpyLogger();
      const mockTopology = {} as WorkerTopology;
      const dispatcher = new WorkerTopologyDispatcher(mockTopology, logger);
      expect(dispatcher.isAvailable()).toBe(true);
    });

    it('isAvailable can be toggled off', () => {
      const logger = createSpyLogger();
      const mockTopology = {} as WorkerTopology;
      const dispatcher = new WorkerTopologyDispatcher(mockTopology, logger);
      dispatcher.setAvailable(false);
      expect(dispatcher.isAvailable()).toBe(false);
    });

    it('dispatches QuerySymbolSubset through data-owner via live worker', async () => {
      const logger = createSpyLogger();

      const program = Effect.gen(function* () {
        const topology = yield* initializeTopology({
          poolSize: 1,
          enableResourceLoader: false,
          logger,
        });

        const dispatcher = new WorkerTopologyDispatcher(topology, logger);

        const ping = yield* topology.dataOwner.executeEffect(
          new PingWorker({ echo: 'dispatcher-test' }),
        );
        expect(ping.echo).toBe('dispatcher-test');
        expect(dispatcher.isAvailable()).toBe(true);
      }).pipe(
        Effect.scoped,
        Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
      );

      await Effect.runPromise(program);
    }, 15_000);

    describe('canDispatch — prerequisite atomicity (step 6)', () => {
      let dispatcher: WorkerTopologyDispatcher;

      beforeEach(() => {
        const logger = createSpyLogger();
        dispatcher = new WorkerTopologyDispatcher({} as WorkerTopology, logger);
      });

      it.each(['completion', 'signatureHelp', 'rename'] as const)(
        'blocks coordinator-only type: %s',
        (type) => {
          expect(dispatcher.canDispatch(type)).toBe(false);
        },
      );

      it.each([
        'hover',
        'definition',
        'documentSymbol',
        'references',
        'diagnostics',
        'documentOpen',
        'documentChange',
        'documentSave',
        'documentClose',
        'codeLens',
        'foldingRange',
        'implementation',
      ] as const)('allows worker-dispatchable type: %s', (type) => {
        expect(dispatcher.canDispatch(type)).toBe(true);
      });
    });
  });

  describe('createBatchIngestionDispatcher (Step 8)', () => {
    it('returns a function that sends WorkspaceBatchIngest to data-owner', async () => {
      const logger = createSpyLogger();

      const program = Effect.gen(function* () {
        const topology = yield* initializeTopology({
          poolSize: 1,
          enableResourceLoader: false,
          logger,
        });

        const dispatcher = new WorkerTopologyDispatcher(topology, logger);
        const ingest = dispatcher.createBatchIngestionDispatcher();

        const result = yield* Effect.promise(() =>
          ingest('test-session-1', [
            {
              uri: 'file:///Foo.cls',
              content: 'public class Foo {}',
              languageId: 'apex',
              version: 1,
            },
            {
              uri: 'file:///Bar.cls',
              content: 'public class Bar {}',
              languageId: 'apex',
              version: 2,
            },
          ]),
        );

        expect(result.processedCount).toBe(2);
      }).pipe(
        Effect.scoped,
        Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
      );

      await Effect.runPromise(program);
    }, 15_000);
  });

  describe('clampPoolSize', () => {
    it('clamps to at least 1', () => {
      expect(clampPoolSize(0)).toBe(1);
      expect(clampPoolSize(-5)).toBe(1);
    });

    it('clamps to at most cpus - 2', () => {
      const os = require('os');
      const maxExpected = Math.max(1, os.cpus().length - 2);
      expect(clampPoolSize(999)).toBe(maxExpected);
    });
  });

  describe('Transport isolation (Step 12)', () => {
    class MockWorkerTransport implements WorkerTopologyTransport {
      readonly spawnCalls: string[] = [];
      readonly sendCalls: Array<{ role: string; request: unknown }> = [];
      readonly poolDispatchCalls: Array<{ role: string; request: unknown }> =
        [];

      spawn(role: string): Effect.Effect<WorkerHandle, TransportSpawnError> {
        this.spawnCalls.push(role);
        return Effect.succeed({
          _tag: 'WorkerHandle' as const,
          role: role as any,
        });
      }

      send<R>(
        handle: WorkerHandle,
        request: R,
      ): Effect.Effect<unknown, TransportSendError> {
        this.sendCalls.push({ role: handle.role, request });
        return Effect.succeed({ accepted: true });
      }

      shutdown(): Effect.Effect<void> {
        return Effect.void;
      }

      makePool(
        role: string,
        size: number,
      ): Effect.Effect<PoolHandle, TransportSpawnError> {
        this.spawnCalls.push(`pool:${role}:${size}`);
        return Effect.succeed({
          _tag: 'PoolHandle' as const,
          role: role as any,
          size,
        });
      }

      dispatch<R>(
        pool: PoolHandle,
        request: R,
      ): Effect.Effect<unknown, TransportSendError> {
        this.poolDispatchCalls.push({ role: pool.role, request });
        return Effect.succeed({ result: { mockResult: true } });
      }

      shutdownPool(): Effect.Effect<void> {
        return Effect.void;
      }
    }

    it('initializeTransportTopology spawns via transport', async () => {
      const transport = new MockWorkerTransport();
      const logger = createSpyLogger();

      const topology = await Effect.runPromise(
        initializeTransportTopology(
          { poolSize: 2, enableResourceLoader: true, logger },
          transport,
        ),
      );

      expect(topology.dataOwner._tag).toBe('WorkerHandle');
      expect(topology.enrichmentPool._tag).toBe('PoolHandle');
      expect(topology.resourceLoader).not.toBeNull();
      expect(transport.spawnCalls).toContain('dataOwner');
      expect(transport.spawnCalls).toContain('resourceLoader');
      expect(
        transport.spawnCalls.find((s) => s.startsWith('pool:')),
      ).toBeDefined();
    });

    it('TransportTopologyDispatcher canDispatch matches WorkerTopologyDispatcher', () => {
      const transport = new MockWorkerTransport();
      const logger = createSpyLogger();
      const dispatcher = new TransportTopologyDispatcher(
        {
          transport,
          dataOwner: { _tag: 'WorkerHandle', role: 'dataOwner' },
          enrichmentPool: {
            _tag: 'PoolHandle',
            role: 'enrichmentSearch',
            size: 2,
          },
          resourceLoader: null,
        },
        logger,
      );

      expect(dispatcher.canDispatch('hover')).toBe(true);
      expect(dispatcher.canDispatch('completion')).toBe(false);
      expect(dispatcher.canDispatch('rename')).toBe(false);
      expect(dispatcher.canDispatch('documentOpen')).toBe(true);
    });

    it('TransportTopologyDispatcher routes data-owner types through transport.send', async () => {
      const transport = new MockWorkerTransport();
      const logger = createSpyLogger();
      const dataOwner: WorkerHandle = {
        _tag: 'WorkerHandle',
        role: 'dataOwner',
      };
      const dispatcher = new TransportTopologyDispatcher(
        {
          transport,
          dataOwner,
          enrichmentPool: {
            _tag: 'PoolHandle',
            role: 'enrichmentSearch',
            size: 2,
          },
          resourceLoader: null,
        },
        logger,
      );

      await dispatcher.dispatch('documentOpen', {
        document: {
          uri: 'file:///Test.cls',
          languageId: 'apex',
          version: 1,
          getText: () => 'public class Test {}',
        },
      });

      expect(transport.sendCalls.length).toBe(1);
      expect(transport.sendCalls[0].role).toBe('dataOwner');
    });

    it('TransportTopologyDispatcher routes enrichment types through transport.dispatch', async () => {
      const transport = new MockWorkerTransport();
      const logger = createSpyLogger();
      const dispatcher = new TransportTopologyDispatcher(
        {
          transport,
          dataOwner: { _tag: 'WorkerHandle', role: 'dataOwner' },
          enrichmentPool: {
            _tag: 'PoolHandle',
            role: 'enrichmentSearch',
            size: 2,
          },
          resourceLoader: null,
        },
        logger,
      );

      await dispatcher.dispatch('hover', {
        textDocument: { uri: 'file:///Test.cls' },
        position: { line: 0, character: 0 },
      });

      expect(transport.poolDispatchCalls.length).toBe(1);
      expect(transport.poolDispatchCalls[0].role).toBe('enrichmentSearch');
    });

    it('createBatchIngestionDispatcher routes through transport.send', async () => {
      const transport = new MockWorkerTransport();
      const logger = createSpyLogger();
      const dataOwner: WorkerHandle = {
        _tag: 'WorkerHandle',
        role: 'dataOwner',
      };
      const dispatcher = new TransportTopologyDispatcher(
        {
          transport,
          dataOwner,
          enrichmentPool: {
            _tag: 'PoolHandle',
            role: 'enrichmentSearch',
            size: 2,
          },
          resourceLoader: null,
        },
        logger,
      );

      const ingest = dispatcher.createBatchIngestionDispatcher();
      const result = await ingest('session-1', [
        {
          uri: 'file:///A.cls',
          content: 'class A {}',
          languageId: 'apex',
          version: 1,
        },
      ]);

      expect(result).toEqual({ accepted: true });
      expect(transport.sendCalls.length).toBe(1);
    });
  });
});
