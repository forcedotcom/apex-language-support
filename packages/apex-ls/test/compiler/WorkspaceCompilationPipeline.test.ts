/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Deferred, Effect, Exit, Fiber, Ref } from 'effect';
import { runWorkspaceCompilationPipeline } from '../../src/compiler/WorkspaceCompilationPipeline';

describe('WorkspaceCompilationPipeline', () => {
  it('continues compiling while the serialized consumer is blocked', async () => {
    const program = Effect.gen(function* () {
      const firstCommitStarted = yield* Deferred.make<void>();
      const releaseFirstCommit = yield* Deferred.make<void>();
      const thirdCompileStarted = yield* Deferred.make<void>();
      const commitOrder = yield* Ref.make<number[]>([]);

      const pipeline = runWorkspaceCompilationPipeline({
        entries: [0, 1, 2],
        parallelism: 2,
        bufferCapacity: 2,
        compile: (entry) =>
          Effect.gen(function* () {
            if (entry === 2) {
              yield* Deferred.succeed(thirdCompileStarted, undefined);
            }
            return entry;
          }),
        commit: (compiled) =>
          Effect.gen(function* () {
            if (compiled === 0) {
              yield* Deferred.succeed(firstCommitStarted, undefined);
              yield* Deferred.await(releaseFirstCommit);
            }
            yield* Ref.update(commitOrder, (order) => [...order, compiled]);
            return compiled;
          }),
      });

      const fiber = yield* Effect.fork(pipeline);
      yield* Deferred.await(firstCommitStarted);
      // This cannot complete in the old coupled design: both outer slots are
      // occupied by commits until the first serialized commit is released.
      yield* Deferred.await(thirdCompileStarted).pipe(
        Effect.timeoutFail({
          duration: '1 second',
          onTimeout: () => new Error('third compilation was starved by commit'),
        }),
      );
      yield* Deferred.succeed(releaseFirstCommit, undefined);

      const results = yield* Fiber.join(fiber);
      return { results, commitOrder: yield* Ref.get(commitOrder) };
    });

    const result = await Effect.runPromise(program);
    expect(result.results).toEqual([0, 1, 2]);
    expect(result.commitOrder).toEqual(expect.arrayContaining([0, 1, 2]));
  });

  it('propagates compilation failure without invoking a fallback', async () => {
    let commitCalls = 0;
    const result = await Effect.runPromiseExit(
      runWorkspaceCompilationPipeline({
        entries: [0],
        parallelism: 1,
        bufferCapacity: 1,
        compile: () => Effect.fail('compile failed'),
        commit: () => {
          commitCalls++;
          return Effect.succeed('committed');
        },
      }),
    );

    expect(Exit.isFailure(result)).toBe(true);
    expect(commitCalls).toBe(0);
  });
});
