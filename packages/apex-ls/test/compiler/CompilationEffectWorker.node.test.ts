/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'node:path';
import { Worker as NodeWorkerThread } from 'node:worker_threads';
import * as Worker from '@effect/platform/Worker';
import * as NodeWorker from '@effect/platform-node/NodeWorker';
import { Cause, Effect, Exit, Fiber } from 'effect';
import {
  CompileApexFile,
  InitializeCompilationWorker,
  type CompilationWorkerRequest,
} from '@salesforce/apex-lsp-shared';
import { reconstructCompiledSymbolTable } from '../../src/compiler/CompilationWorkerHandler';
import {
  fromSerializedWorkerPool,
  makeSerializedWorkerPoolReadiness,
  withCompilationWorkerStartupTimeout,
} from '../../src/compiler/CompilationWorkerPool';
import { runWorkspaceCompilationPipeline } from '../../src/compiler/WorkspaceCompilationPipeline';

const WORKER_ENTRY = path.resolve(
  __dirname,
  '../../src/compiler.worker.node.ts',
);
const LIFECYCLE_WORKER_ENTRY = path.resolve(
  __dirname,
  '../fixtures/compilerLifecycleWorker.ts',
);

const compileRequest = (content: string, version = 1) =>
  new CompileApexFile({
    uri: 'file:///workspace/LifecycleFixture.cls',
    content,
    languageId: 'apex',
    version,
    detailLevel: 'public-api',
    collectReferences: true,
  });

describe('dedicated Effect compilation worker', () => {
  it('fails pool acquisition when a backing worker cannot start', async () => {
    const missingWorkerEntry = path.resolve(
      __dirname,
      '../../src/compiler.worker.missing.ts',
    );
    const program = Effect.scoped(
      withCompilationWorkerStartupTimeout(
        Worker.makePoolSerialized<CompilationWorkerRequest>({
          size: 1,
          concurrency: 1,
          initialMessage: () =>
            new InitializeCompilationWorker({ logLevel: 'error' }),
        }),
        () => 0,
        1,
        '100 millis',
      ),
    ).pipe(
      Effect.provide(
        NodeWorker.layer(
          () =>
            new NodeWorkerThread(missingWorkerEntry, {
              execArgv: ['--import', 'tsx'],
            }),
        ),
      ),
    );

    await expect(Effect.runPromise(program)).rejects.toThrow();
  }, 10_000);

  it('warms every configured worker and terminates them with the pool scope', async () => {
    const workers: NodeWorkerThread[] = [];
    let initializedWorkers = 0;
    const program = Effect.scoped(
      Effect.gen(function* () {
        const readiness = yield* makeSerializedWorkerPoolReadiness(2);
        const _pool =
          yield* Worker.makePoolSerialized<CompilationWorkerRequest>({
            size: 2,
            concurrency: 1,
            initialMessage: () =>
              new InitializeCompilationWorker({ logLevel: 'error' }),
            onCreate: (worker) =>
              Effect.sync(() => {
                initializedWorkers += 1;
              }).pipe(Effect.zipRight(readiness.onCreate(worker))),
          });

        yield* readiness.awaitReady;
        return initializedWorkers;
      }),
    ).pipe(
      Effect.provide(
        NodeWorker.layer(() => {
          const worker = new NodeWorkerThread(WORKER_ENTRY, {
            execArgv: ['--import', 'tsx'],
          });
          workers.push(worker);
          return worker;
        }),
      ),
    );

    await expect(Effect.runPromise(program)).resolves.toBe(2);
    expect(workers).toHaveLength(2);
    expect(workers.every((worker) => worker.threadId === -1)).toBe(true);
  }, 30_000);

  it('fails an in-flight request when its backing worker crashes', async () => {
    const workers: NodeWorkerThread[] = [];
    const program = Effect.scoped(
      Effect.gen(function* () {
        const pool = yield* Worker.makePoolSerialized<CompilationWorkerRequest>(
          {
            size: 1,
            concurrency: 1,
            initialMessage: () =>
              new InitializeCompilationWorker({ logLevel: 'error' }),
          },
        );
        const requestFiber = yield* pool
          .executeEffect(compileRequest('__hang__'))
          .pipe(Effect.fork);
        yield* Effect.sleep('50 millis');
        yield* Effect.promise(() => workers[0].terminate());
        return yield* Fiber.await(requestFiber);
      }),
    ).pipe(
      Effect.provide(
        NodeWorker.layer(() => {
          const worker = new NodeWorkerThread(LIFECYCLE_WORKER_ENTRY, {
            execArgv: ['--import', 'tsx'],
          });
          workers.push(worker);
          return worker;
        }),
      ),
    );

    const requestExit = await Effect.runPromise(program);
    expect(Exit.isFailure(requestExit)).toBe(true);
  }, 10_000);

  it('releases the pool lease after interrupting an in-flight request', async () => {
    const program = Effect.scoped(
      Effect.gen(function* () {
        const pool = yield* Worker.makePoolSerialized<CompilationWorkerRequest>(
          {
            size: 1,
            concurrency: 1,
            initialMessage: () =>
              new InitializeCompilationWorker({ logLevel: 'error' }),
          },
        );
        const requestFiber = yield* pool
          .executeEffect(compileRequest('__hang__'))
          .pipe(Effect.fork);
        yield* Effect.sleep('50 millis');
        const interrupted = yield* Fiber.interrupt(requestFiber);
        const nextResult = yield* pool.executeEffect(
          compileRequest(
            'public class LifecycleFixture { public void ready() {} }',
            2,
          ),
        );
        return { interrupted, nextResult };
      }),
    ).pipe(
      Effect.provide(
        NodeWorker.layer(
          () =>
            new NodeWorkerThread(LIFECYCLE_WORKER_ENTRY, {
              execArgv: ['--import', 'tsx'],
            }),
        ),
      ),
    );

    const { interrupted, nextResult } = await Effect.runPromise(program);
    expect(Exit.isFailure(interrupted)).toBe(true);
    if (Exit.isFailure(interrupted)) {
      expect(Cause.isInterruptedOnly(interrupted.cause)).toBe(true);
    }
    expect(nextResult.version).toBe(2);
    expect(nextResult.metrics.symbolCount).toBeGreaterThan(0);
  }, 10_000);

  it('lets an interactive request take the next lease before unscheduled workspace work', async () => {
    const completionOrder: number[] = [];
    const source = 'public class LifecycleFixture { public void ready() {} }';
    const program = Effect.scoped(
      Effect.gen(function* () {
        const pool = yield* Worker.makePoolSerialized<CompilationWorkerRequest>(
          {
            size: 1,
            concurrency: 1,
            initialMessage: () =>
              new InitializeCompilationWorker({ logLevel: 'error' }),
          },
        );
        const compilationPool = fromSerializedWorkerPool(pool, 1, 1);
        const workspace = yield* runWorkspaceCompilationPipeline({
          entries: [
            compileRequest(`__delay__${source}`, 1),
            compileRequest(source, 2),
          ],
          // The production workspace pipeline admits no more work than there
          // are backing workers. Its second request therefore cannot queue in
          // front of an interactive request while the first is running.
          parallelism: 1,
          bufferCapacity: 1,
          compile: (request) =>
            compilationPool
              .execute(request, 'low')
              .pipe(
                Effect.tap((result) =>
                  Effect.sync(() => completionOrder.push(result.version)),
                ),
              ),
          commit: (compiled) => Effect.succeed(compiled.version),
        }).pipe(Effect.fork);

        yield* Effect.sleep('25 millis');
        const interactive = yield* compilationPool
          .execute(compileRequest(source, 3), 'high')
          .pipe(
            Effect.tap((result) =>
              Effect.sync(() => completionOrder.push(result.version)),
            ),
            Effect.fork,
          );

        yield* Fiber.join(interactive);
        yield* Fiber.join(workspace);
      }),
    ).pipe(
      Effect.provide(
        NodeWorker.layer(
          () =>
            new NodeWorkerThread(LIFECYCLE_WORKER_ENTRY, {
              execArgv: ['--import', 'tsx'],
            }),
        ),
      ),
    );

    await Effect.runPromise(program);
    expect(completionOrder).toEqual([1, 3, 2]);
  }, 10_000);

  it('removes an interrupted request from the priority admission queue', async () => {
    const source = 'public class LifecycleFixture { public void ready() {} }';
    const program = Effect.scoped(
      Effect.gen(function* () {
        const pool = yield* Worker.makePoolSerialized<CompilationWorkerRequest>(
          {
            size: 1,
            concurrency: 1,
            initialMessage: () =>
              new InitializeCompilationWorker({ logLevel: 'error' }),
          },
        );
        const compilationPool = fromSerializedWorkerPool(pool, 1, 1);
        const blocker = yield* compilationPool
          .execute(compileRequest('__hang__'), 'low')
          .pipe(Effect.fork);
        yield* Effect.sleep('50 millis');
        const queued = yield* compilationPool
          .execute(compileRequest(source, 2), 'high')
          .pipe(Effect.fork);
        yield* Effect.sleep('25 millis');

        const queuedExit = yield* Fiber.interrupt(queued);
        yield* Fiber.interrupt(blocker);
        const nextResult = yield* compilationPool.execute(
          compileRequest(source, 3),
          'low',
        );
        return { queuedExit, nextResult };
      }),
    ).pipe(
      Effect.provide(
        NodeWorker.layer(
          () =>
            new NodeWorkerThread(LIFECYCLE_WORKER_ENTRY, {
              execArgv: ['--import', 'tsx'],
            }),
        ),
      ),
    );

    const { queuedExit, nextResult } = await Effect.runPromise(program);
    expect(Exit.isFailure(queuedExit)).toBe(true);
    if (Exit.isFailure(queuedExit)) {
      expect(Cause.isInterruptedOnly(queuedExit.cause)).toBe(true);
    }
    expect(nextResult.version).toBe(3);
  }, 10_000);

  it('compiles and reconstructs a file across a real Node worker boundary', async () => {
    const program = Effect.scoped(
      Effect.gen(function* () {
        const pool = yield* Worker.makePoolSerialized<CompilationWorkerRequest>(
          {
            size: 1,
            concurrency: 1,
            initialMessage: () =>
              new InitializeCompilationWorker({ logLevel: 'error' }),
          },
        );

        return yield* pool.executeEffect(
          new CompileApexFile({
            uri: 'file:///workspace/EffectWorkerFixture.cls',
            content:
              'public class EffectWorkerFixture { public void execute() {} }',
            languageId: 'apex',
            version: 9,
            detailLevel: 'public-api',
            collectReferences: true,
          }),
        );
      }),
    ).pipe(
      Effect.provide(
        NodeWorker.layer(
          () =>
            new NodeWorkerThread(WORKER_ENTRY, {
              execArgv: ['--import', 'tsx'],
            }),
        ),
      ),
    );

    const result = await Effect.runPromise(program);
    const table = reconstructCompiledSymbolTable(result);

    expect(result.version).toBe(9);
    expect(result.metrics.symbolCount).toBeGreaterThan(0);
    expect(table.getAllSymbols().map((symbol) => symbol.name)).toContain(
      'EffectWorkerFixture',
    );
  }, 30_000);
});
