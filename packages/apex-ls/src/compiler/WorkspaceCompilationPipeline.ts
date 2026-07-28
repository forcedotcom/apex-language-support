/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Cause, Effect, Exit, Fiber, Queue } from 'effect';

export interface WorkspaceCompilationPipelineOptions<
  Entry,
  Compiled,
  Result,
  CompileError,
  CommitError,
  CompileRequirements,
  CommitRequirements,
> {
  readonly entries: ReadonlyArray<Entry>;
  readonly parallelism: number;
  readonly bufferCapacity: number;
  readonly compile: (
    entry: Entry,
    index: number,
  ) => Effect.Effect<Compiled, CompileError, CompileRequirements>;
  readonly commit: (
    compiled: Compiled,
    entry: Entry,
    index: number,
  ) => Effect.Effect<Result, CommitError, CommitRequirements>;
}

type CompilationQueueItem<Entry, Compiled, CompileError> = {
  readonly entry: Entry;
  readonly index: number;
  readonly result: Exit.Exit<Compiled, CompileError>;
};

export interface WorkspaceCompilationFailure<Entry, CompileError> {
  readonly entry: Entry;
  readonly index: number;
  readonly cause: Cause.Cause<CompileError>;
}

export interface WorkspaceCompilationPipelineResult<
  Entry,
  Result,
  CompileError,
> {
  readonly results: ReadonlyArray<Result>;
  readonly failures: ReadonlyArray<
    WorkspaceCompilationFailure<Entry, CompileError>
  >;
}

/**
 * Keep bounded compilation producers independent from the serialized commit
 * consumer. Per-file compilation failures retain their full Cause while other
 * entries continue through the pipeline; no alternate compilation path is
 * used. Infrastructure and commit failures still fail the whole pipeline.
 */
export const runWorkspaceCompilationPipeline = <
  Entry,
  Compiled,
  Result,
  CompileError,
  CommitError,
  CompileRequirements,
  CommitRequirements,
>(
  options: WorkspaceCompilationPipelineOptions<
    Entry,
    Compiled,
    Result,
    CompileError,
    CommitError,
    CompileRequirements,
    CommitRequirements
  >,
): Effect.Effect<
  WorkspaceCompilationPipelineResult<Entry, Result, CompileError>,
  CommitError,
  CompileRequirements | CommitRequirements
> =>
  Effect.scoped(
    Effect.gen(function* () {
      const parallelism = Math.max(1, Math.floor(options.parallelism));
      const bufferCapacity = Math.max(1, Math.floor(options.bufferCapacity));
      const queue = yield* Effect.acquireRelease(
        Queue.bounded<CompilationQueueItem<Entry, Compiled, CompileError>>(
          bufferCapacity,
        ),
        Queue.shutdown,
      );

      let queueHighWaterMark = 0;
      let offerAtCapacityCount = 0;
      let totalOfferWaitMs = 0;
      let maxOfferWaitMs = 0;

      const producer = yield* Effect.forkScoped(
        Effect.withSpan('workspace.compilation.producer', {
          attributes: {
            'workspace.file_count': options.entries.length,
            'workspace.compile_parallelism': parallelism,
            'workspace.result_buffer_capacity': bufferCapacity,
          },
        })(
          Effect.gen(function* () {
            yield* Effect.forEach(
              options.entries,
              (entry, index) =>
                Effect.gen(function* () {
                  const result = yield* Effect.exit(
                    options.compile(entry, index),
                  );
                  const queueDepth = Math.max(0, yield* Queue.size(queue));
                  queueHighWaterMark = Math.max(
                    queueHighWaterMark,
                    Math.min(bufferCapacity, queueDepth + 1),
                  );
                  if (queueDepth >= bufferCapacity) {
                    offerAtCapacityCount++;
                  }

                  const offerStart = performance.now();
                  yield* Queue.offer(queue, { entry, index, result });
                  const offerWaitMs = performance.now() - offerStart;
                  totalOfferWaitMs += offerWaitMs;
                  maxOfferWaitMs = Math.max(maxOfferWaitMs, offerWaitMs);
                }),
              { concurrency: parallelism, discard: true },
            );

            yield* Effect.annotateCurrentSpan({
              'workspace.queue.high_water_mark': queueHighWaterMark,
              'workspace.queue.offer_at_capacity_count': offerAtCapacityCount,
              'workspace.queue.offer_wait_ms': totalOfferWaitMs,
              'workspace.queue.max_offer_wait_ms': maxOfferWaitMs,
            });
          }),
        ),
      );

      const results = yield* Effect.withSpan('workspace.compilation.consumer', {
        attributes: {
          'workspace.file_count': options.entries.length,
        },
      })(
        Effect.gen(function* () {
          const committed = new Array<
            { readonly index: number; readonly result: Result } | undefined
          >(options.entries.length);
          const failures: WorkspaceCompilationFailure<Entry, CompileError>[] =
            [];
          let takeFromEmptyCount = 0;
          let totalTakeWaitMs = 0;
          let maxTakeWaitMs = 0;
          for (
            let processed = 0;
            processed < options.entries.length;
            processed++
          ) {
            const queueDepth = yield* Queue.size(queue);
            if (queueDepth <= 0) {
              takeFromEmptyCount++;
            }
            const takeStart = performance.now();
            const item = yield* Queue.take(queue);
            const takeWaitMs = performance.now() - takeStart;
            totalTakeWaitMs += takeWaitMs;
            maxTakeWaitMs = Math.max(maxTakeWaitMs, takeWaitMs);
            if (Exit.isFailure(item.result)) {
              failures.push({
                entry: item.entry,
                index: item.index,
                cause: item.result.cause,
              });
              continue;
            }
            committed[item.index] = {
              index: item.index,
              result: yield* options.commit(
                item.result.value,
                item.entry,
                item.index,
              ),
            };
          }
          yield* Effect.annotateCurrentSpan({
            'workspace.queue.take_from_empty_count': takeFromEmptyCount,
            'workspace.queue.take_wait_ms': totalTakeWaitMs,
            'workspace.queue.max_take_wait_ms': maxTakeWaitMs,
            'workspace.compile_failure_count': failures.length,
          });
          return {
            results: committed.flatMap((item) =>
              item === undefined ? [] : [item.result],
            ),
            failures,
          };
        }),
      );

      yield* Fiber.join(producer);
      return results;
    }),
  );
