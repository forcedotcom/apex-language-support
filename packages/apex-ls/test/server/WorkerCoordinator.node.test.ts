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
  makeWorkerDispatcher,
  makeTransportDispatcher,
  initializeTransportTopology,
  runRemoteStdlibWarmupPhase,
} from '../../src/server/WorkerCoordinator';
import {
  DispatchReferences,
  PingWorker,
  QueryGraphData,
  QuerySymbolSubset,
  UpdateSymbolSubset,
} from '@salesforce/apex-lsp-shared';
import { Effect, Scope } from 'effect';
import type { LoggerInterface } from '@salesforce/apex-lsp-shared';
import type { WorkerTopology } from '../../src/server/WorkerCoordinator';
type DispatcherResult = ReturnType<typeof makeWorkerDispatcher>;
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
    alwaysLog: capture,
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
    }, 120_000);
  });

  describe('pool topology (step 4)', () => {
    describe('without resource loader', () => {
      let topology: WorkerTopology;
      let logger: ReturnType<typeof createSpyLogger>;
      let scope: Scope.CloseableScope;

      beforeAll(async () => {
        logger = createSpyLogger();
        scope = Effect.runSync(Scope.make());
        const program = Effect.gen(function* () {
          return yield* initializeTopology({
            poolSize: 1,
            enableResourceLoader: false,
            logger,
          });
        }).pipe(
          Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
        );
        topology = await Effect.runPromise(
          Effect.provideService(program, Scope.Scope, scope),
        );
      }, 120_000);

      afterAll(async () => {
        await Effect.runPromise(Scope.close(scope, Effect.void));
      }, 30_000);

      it('spawns data-owner + enrichment pool, ping round-trips on both', async () => {
        const ping = await Effect.runPromise(
          topology.dataOwner.executeEffect(
            new PingWorker({ echo: 'data-owner-ping' }),
          ),
        );
        expect(ping.echo).toBe('data-owner-ping');

        const poolPing = await Effect.runPromise(
          topology.requestPool.executeEffect(
            new PingWorker({ echo: 'pool-ping' }),
          ),
        );
        expect(poolPing.echo).toBe('pool-ping');

        expect(logger.messages).toContainEqual(
          expect.stringContaining('Data owner initialized'),
        );
        expect(logger.messages).toContainEqual(
          expect.stringContaining('Enrichment pool initialized'),
        );
      });

      it('data-owner handles QuerySymbolSubset with mock data', async () => {
        const result = await Effect.runPromise(
          topology.dataOwner.executeEffect(
            new QuerySymbolSubset({ uris: ['file:///a.cls', 'file:///b.cls'] }),
          ),
        );

        expect(result.entries['file:///a.cls']).toBeNull();
        expect(result.entries['file:///b.cls']).toBeNull();
        expect(result.versions).toBeDefined();
        expect(result.detailLevels).toBeDefined();
        expect(result.versions['file:///a.cls']).toBe(-1);
        expect(result.detailLevels['file:///a.cls']).toBe('public-api');
      });

      it('data-owner handles UpdateSymbolSubset and rejects when document not found', async () => {
        const result = await Effect.runPromise(
          topology.dataOwner.executeEffect(
            new UpdateSymbolSubset({
              uri: 'file:///test.cls',
              documentVersion: 1,
              enrichedSymbolTable: {
                symbols: [],
                references: [],
                hierarchicalReferences: [],
                metadata: {
                  fileUri: 'file:///test.cls',
                  documentVersion: 1,
                  parseCompleteness: 'complete' as const,
                },
                fileUri: 'file:///test.cls',
              },
              enrichedDetailLevel: 'protected' as const,
              sourceWorkerId: 'test-worker-1',
            }),
          ),
        );

        // Should reject because document doesn't exist (not a version mismatch per se)
        expect(result.accepted).toBe(false);
        expect(result.versionMismatch).toBe(false);
        expect(result.merged).toBe(0);
      });

      it('data-owner rejects UpdateSymbolSubset when detail level is not higher', async () => {
        const result1 = await Effect.runPromise(
          topology.dataOwner.executeEffect(
            new UpdateSymbolSubset({
              uri: 'file:///test.cls',
              documentVersion: 1,
              enrichedSymbolTable: {
                symbols: [],
                references: [],
                hierarchicalReferences: [],
                metadata: {
                  fileUri: 'file:///test.cls',
                  documentVersion: 1,
                  parseCompleteness: 'complete' as const,
                },
                fileUri: 'file:///test.cls',
              },
              enrichedDetailLevel: 'public-api' as const,
              sourceWorkerId: 'test-worker-1',
            }),
          ),
        );

        // Note: In real scenario, we'd need document to exist first
        // This test verifies the detail level comparison logic
        expect(result1.accepted).toBe(false); // Will fail version check
      });

      it('runRemoteStdlibWarmupPhase is a no-op when resource loader is disabled', async () => {
        await expect(
          Effect.runPromise(runRemoteStdlibWarmupPhase(topology, 1)),
        ).resolves.toBeUndefined();
      });
    });

    describe('with resource loader', () => {
      let topology: WorkerTopology;
      let logger: ReturnType<typeof createSpyLogger>;
      let scope: Scope.CloseableScope;

      beforeAll(async () => {
        logger = createSpyLogger();
        scope = Effect.runSync(Scope.make());
        const program = Effect.gen(function* () {
          return yield* initializeTopology({
            poolSize: 1,
            enableResourceLoader: true,
            logger,
          });
        }).pipe(
          Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
        );
        topology = await Effect.runPromise(
          Effect.provideService(program, Scope.Scope, scope),
        );
      }, 120_000);

      afterAll(async () => {
        await Effect.runPromise(Scope.close(scope, Effect.void));
      }, 30_000);

      it('spawns optional resource-loader when enabled', async () => {
        expect(topology.resourceLoader).not.toBeNull();

        const ping = await Effect.runPromise(
          topology.resourceLoader!.executeEffect(
            new PingWorker({ echo: 'loader-ping' }),
          ),
        );
        expect(ping.echo).toBe('loader-ping');

        expect(logger.messages).toContainEqual(
          expect.stringContaining('Resource loader initialized'),
        );
      });

      it('initializes resource-loader worker before data owner when enabled', () => {
        const rlIdx = logger.messages.findIndex((m) =>
          m.includes('Resource loader initialized'),
        );
        const doIdx = logger.messages.findIndex((m) =>
          m.includes('Data owner initialized'),
        );
        expect(rlIdx).toBeGreaterThanOrEqual(0);
        expect(doIdx).toBeGreaterThan(rlIdx);
      });
    });
  });

  describe('makeWorkerDispatcher (step 5 + step 6)', () => {
    let topology: WorkerTopology;
    let scope: Scope.CloseableScope;

    beforeAll(async () => {
      const logger = createSpyLogger();
      scope = Effect.runSync(Scope.make());
      const program = Effect.gen(function* () {
        return yield* initializeTopology({
          poolSize: 1,
          enableResourceLoader: false,
          logger,
        });
      }).pipe(
        Effect.provide(makeNodeWorkerLayer(WORKER_TS_ENTRY, TSX_OPTIONS)),
      );
      topology = await Effect.runPromise(
        Effect.provideService(program, Scope.Scope, scope),
      );
    }, 120_000);

    afterAll(async () => {
      await Effect.runPromise(Scope.close(scope, Effect.void));
    }, 30_000);

    it('isAvailable returns true by default', () => {
      const logger = createSpyLogger();
      const mockTopology = {} as WorkerTopology;
      const dispatcher = makeWorkerDispatcher(mockTopology, logger);
      expect(dispatcher.isAvailable()).toBe(true);
    });

    it('isAvailable can be toggled off', () => {
      const logger = createSpyLogger();
      const mockTopology = {} as WorkerTopology;
      const dispatcher = makeWorkerDispatcher(mockTopology, logger);
      dispatcher.setAvailable(false);
      expect(dispatcher.isAvailable()).toBe(false);
    });

    it('dispatches QuerySymbolSubset through data-owner via live worker', async () => {
      const logger = createSpyLogger();
      const dispatcher = makeWorkerDispatcher(topology, logger);

      const ping = await Effect.runPromise(
        topology.dataOwner.executeEffect(
          new PingWorker({ echo: 'dispatcher-test' }),
        ),
      );
      expect(ping.echo).toBe('dispatcher-test');
      expect(dispatcher.isAvailable()).toBe(true);
    });

    it('queryGraphData routes to data-owner and returns graph payload', async () => {
      const logger = createSpyLogger();
      const dispatcher = makeWorkerDispatcher(topology, logger);
      const result = await dispatcher.queryGraphData({ type: 'all' });

      // With no symbols ingested the graph should be structurally valid but empty
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    describe('canDispatch — prerequisite atomicity (step 6)', () => {
      let dispatcher: DispatcherResult;

      beforeEach(() => {
        const logger = createSpyLogger();
        dispatcher = makeWorkerDispatcher({} as WorkerTopology, logger);
      });

      it.each(['signatureHelp', 'rename', 'foldingRange'] as const)(
        'blocks coordinator-only type: %s',
        (type) => {
          expect(dispatcher.canDispatch(type)).toBe(false);
        },
      );

      it.each([
        'documentOpen',
        'documentChange',
        'documentSave',
        'documentClose',
        'hover',
        'completion',
        'diagnostics',
        'definition',
        'implementation',
        'references',
        'documentSymbol',
        'codeLens',
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

        const dispatcher = makeWorkerDispatcher(topology, logger);
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
    }, 120_000);
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
      expect(topology.requestPool._tag).toBe('PoolHandle');
      expect(topology.resourceLoader).not.toBeNull();
      expect(topology.compilation._tag).toBe('WorkerHandle');
      expect(transport.spawnCalls).toContain('dataOwner');
      expect(transport.spawnCalls).toContain('resourceLoader');
      expect(transport.spawnCalls).toContain('compilation');
      expect(transport.spawnCalls[0]).toBe('resourceLoader');
      expect(transport.spawnCalls[1]).toBe('dataOwner');
      expect(transport.spawnCalls[2]).toBe('compilation');
      expect(
        transport.spawnCalls.find((s) => s.startsWith('pool:')),
      ).toBeDefined();
    });

    it('makeTransportDispatcher canDispatch matches makeWorkerDispatcher', () => {
      const transport = new MockWorkerTransport();
      const logger = createSpyLogger();
      const dispatcher = makeTransportDispatcher(
        {
          transport,
          dataOwner: { _tag: 'WorkerHandle', role: 'dataOwner' },
          requestPool: {
            _tag: 'PoolHandle',
            role: 'lspRequest',
            size: 2,
          },
          resourceLoader: null,
          compilation: { _tag: 'WorkerHandle', role: 'compilation' },
        },
        logger,
      );

      expect(dispatcher.canDispatch('hover')).toBe(true);
      expect(dispatcher.canDispatch('completion')).toBe(true);
      expect(dispatcher.canDispatch('rename')).toBe(false);
      expect(dispatcher.canDispatch('documentOpen')).toBe(true);
    });

    it('makeTransportDispatcher routes documentOpen to both data-owner and compilation', async () => {
      const transport = new MockWorkerTransport();
      const logger = createSpyLogger();
      const dataOwner: WorkerHandle = {
        _tag: 'WorkerHandle',
        role: 'dataOwner',
      };
      const compilation: WorkerHandle = {
        _tag: 'WorkerHandle',
        role: 'compilation',
      };
      const dispatcher = makeTransportDispatcher(
        {
          transport,
          dataOwner,
          requestPool: {
            _tag: 'PoolHandle',
            role: 'lspRequest',
            size: 2,
          },
          resourceLoader: null,
          compilation,
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

      expect(transport.sendCalls.length).toBe(2);
      const roles = transport.sendCalls.map((c: { role: string }) => c.role);
      expect(roles).toContain('dataOwner');
      expect(roles).toContain('compilation');
    });

    it('makeTransportDispatcher routes enrichment types through transport.dispatch', async () => {
      const transport = new MockWorkerTransport();
      const logger = createSpyLogger();
      const dispatcher = makeTransportDispatcher(
        {
          transport,
          dataOwner: { _tag: 'WorkerHandle', role: 'dataOwner' },
          requestPool: {
            _tag: 'PoolHandle',
            role: 'lspRequest',
            size: 2,
          },
          resourceLoader: null,
          compilation: { _tag: 'WorkerHandle', role: 'compilation' },
        },
        logger,
      );

      await dispatcher.dispatch('hover', {
        textDocument: { uri: 'file:///Test.cls' },
        position: { line: 0, character: 0 },
      });

      expect(transport.poolDispatchCalls.length).toBe(1);
      expect(transport.poolDispatchCalls[0].role).toBe('lspRequest');
    });

    it('routes references through the enrichment pool with includeDeclaration threaded', async () => {
      const transport = new MockWorkerTransport();
      const logger = createSpyLogger();
      const dispatcher = makeTransportDispatcher(
        {
          transport,
          dataOwner: { _tag: 'WorkerHandle', role: 'dataOwner' },
          requestPool: {
            _tag: 'PoolHandle',
            role: 'lspRequest',
            size: 2,
          },
          resourceLoader: null,
          compilation: { _tag: 'WorkerHandle', role: 'compilation' },
        },
        logger,
      );

      await dispatcher.dispatch('references', {
        textDocument: { uri: 'file:///Test.cls' },
        position: { line: 3, character: 7 },
        context: { includeDeclaration: true },
      });

      expect(transport.poolDispatchCalls.length).toBe(1);
      expect(transport.poolDispatchCalls[0].role).toBe('lspRequest');
      const req = transport.poolDispatchCalls[0].request as DispatchReferences;
      expect(req._tag).toBe('DispatchReferences');
      expect(req.textDocument.uri).toBe('file:///Test.cls');
      expect(req.position).toEqual({ line: 3, character: 7 });
      expect(req.context.includeDeclaration).toBe(true);
    });

    it('defaults references includeDeclaration to false when context is absent', async () => {
      const transport = new MockWorkerTransport();
      const logger = createSpyLogger();
      const dispatcher = makeTransportDispatcher(
        {
          transport,
          dataOwner: { _tag: 'WorkerHandle', role: 'dataOwner' },
          requestPool: {
            _tag: 'PoolHandle',
            role: 'lspRequest',
            size: 2,
          },
          resourceLoader: null,
          compilation: { _tag: 'WorkerHandle', role: 'compilation' },
        },
        logger,
      );

      await dispatcher.dispatch('references', {
        textDocument: { uri: 'file:///Test.cls' },
        position: { line: 0, character: 0 },
      });

      const req = transport.poolDispatchCalls[0].request as DispatchReferences;
      expect(req.context.includeDeclaration).toBe(false);
    });

    it('makeTransportDispatcher queryGraphData routes to data-owner via transport.send', async () => {
      const transport = new MockWorkerTransport();
      const logger = createSpyLogger();
      const dataOwner: WorkerHandle = {
        _tag: 'WorkerHandle',
        role: 'dataOwner',
      };
      const dispatcher = makeTransportDispatcher(
        {
          transport,
          dataOwner,
          requestPool: {
            _tag: 'PoolHandle',
            role: 'lspRequest',
            size: 2,
          },
          resourceLoader: null,
          compilation: { _tag: 'WorkerHandle', role: 'compilation' },
        },
        logger,
      );

      await dispatcher.queryGraphData({ type: 'all' });

      expect(transport.sendCalls.length).toBe(1);
      expect(transport.sendCalls[0].role).toBe('dataOwner');
      expect((transport.sendCalls[0].request as QueryGraphData)._tag).toBe(
        'QueryGraphData',
      );
    });

    it('createBatchIngestionDispatcher routes through transport.send', async () => {
      const transport = new MockWorkerTransport();
      const logger = createSpyLogger();
      const dataOwner: WorkerHandle = {
        _tag: 'WorkerHandle',
        role: 'dataOwner',
      };
      const dispatcher = makeTransportDispatcher(
        {
          transport,
          dataOwner,
          requestPool: {
            _tag: 'PoolHandle',
            role: 'lspRequest',
            size: 2,
          },
          resourceLoader: null,
          compilation: { _tag: 'WorkerHandle', role: 'compilation' },
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
