/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// priority-scheduler.ts
import {
  Context,
  Effect,
  Queue,
  Ref,
  Deferred,
  Layer,
  Duration,
  Chunk,
} from 'effect';

import {
  Priority,
  AllPriorities,
  Critical,
  AllPrioritiesWithCritical,
  ScheduledTask,
  PriorityScheduler,
  PrioritySchedulerConfigShape,
  QueuedItem,
  SchedulerMetrics,
  SchedulerInternalState,
} from '../types/queue';

import { PrioritySchedulerConfig } from './priority-scheduler-config';

export class PrioritySchedulerService extends Context.Tag('PriorityScheduler')<
  PrioritySchedulerService,
  PriorityScheduler
>() {}

function controllerLoop(
  state: SchedulerInternalState,
  cfg: PrioritySchedulerConfigShape,
): Effect.Effect<void, never, never> {
  return Effect.gen(function* (_) {
    let streak = 0;

    while (true) {
      if (yield* _(Deferred.isDone(state.shutdownSignal))) return;

      let executed = false;

      for (const p of AllPrioritiesWithCritical) {
        const q = state.queues.get(p)!;
        const chunk = yield* _(Queue.takeUpTo(q, 1));

        if (!Chunk.isEmpty(chunk)) {
          const item = Chunk.unsafeHead(chunk)!;
          executed = true;
          streak++;

          yield* _(Ref.update(state.tasksStarted, (n) => n + 1));

          // Fork the effect to run it in the background
          const fiber = yield* _(
            Effect.fork(
              item.eff.pipe(
                Effect.ensuring(Ref.update(state.tasksCompleted, (n) => n + 1)),
              ),
            ),
          );

          // Fulfill the deferred so the fiber Effect in ScheduledTask can resolve
          yield* _(Deferred.succeed(item.fiberDeferred, fiber));

          break;
        }
      }

      // If no tasks were executed, sleep briefly before checking again
      if (!executed) {
        streak = 0;
        yield* _(Effect.sleep(Duration.millis(cfg.idleSleepMs)));
      }

      // starvation relief
      if (streak > cfg.maxHighPriorityStreak) {
        streak = 0;

        for (let i = AllPrioritiesWithCritical.length - 1; i >= 0; i--) {
          const q = state.queues.get(AllPrioritiesWithCritical[i])!;
          const chunk = yield* _(Queue.takeUpTo(q, 1));

          if (!Chunk.isEmpty(chunk)) {
            const item = Chunk.unsafeHead(chunk)!;

            yield* _(Ref.update(state.tasksStarted, (n) => n + 1));

            const fiber = yield* _(
              Effect.fork(
                item.eff.pipe(
                  Effect.ensuring(
                    Ref.update(state.tasksCompleted, (n) => n + 1),
                  ),
                ),
              ),
            );

            yield* _(Deferred.succeed(item.fiberDeferred, fiber));
            break;
          }
        }
      }
    }
  }) as Effect.Effect<void, never, never>;
}

/** Build scheduler with config + state */
function makeScheduler(state: SchedulerInternalState): PriorityScheduler {
  return {
    offer<A, E, R>(
      priority: Priority | typeof Critical,
      queuedItem: QueuedItem<A, E, R>,
    ) {
      return Effect.gen(function* (_) {
        const q = state.queues.get(priority)!;

        // Retry until queue has space (since interface doesn't allow errors)
        let ok = false;
        while (!ok) {
          ok = yield* _(
            Queue.offer(q, queuedItem as QueuedItem<unknown, unknown, unknown>),
          );
          if (!ok) {
            yield* _(Effect.sleep(Duration.millis(1)));
          }
        }

        // Return immediately after queuing - fiber is an Effect that resolves when available
        return {
          fiber: Deferred.await(queuedItem.fiberDeferred),
          requestType: queuedItem.requestType,
        } satisfies ScheduledTask<A, E, R>;
      });
    },
    metrics: Effect.gen(function* (_) {
      const ms: any = {};
      const utilization: any = {};
      const activeTasks: any = {};
      const requestTypeBreakdown: any = {};

      // Only include public priorities in metrics (exclude Critical for API stability)
      for (const p of AllPriorities) {
        const queueSize = yield* _(Queue.size(state.queues.get(p)!));
        ms[p] = queueSize;
        utilization[p] = (queueSize / state.queueCapacity) * 100;

        // Get active task count
        const activeCounts = yield* _(Ref.get(state.activeTaskCounts));
        activeTasks[p] = activeCounts.get(p) || 0;

        // Get requestType breakdown
        const requestTypeCounts = yield* _(Ref.get(state.requestTypeCounts));
        const priorityCounts = requestTypeCounts.get(p) || new Map();
        const breakdown: Record<string, number> = {};
        for (const [requestType, count] of priorityCounts.entries()) {
          breakdown[requestType] = count;
        }
        requestTypeBreakdown[p] = breakdown;
      }

      return {
        queueSizes: ms,
        tasksStarted: yield* _(Ref.get(state.tasksStarted)),
        tasksCompleted: yield* _(Ref.get(state.tasksCompleted)),
        tasksDropped: yield* _(Ref.get(state.tasksDropped)),
        requestTypeBreakdown,
        queueUtilization: utilization,
        activeTasks,
        queueCapacity: state.queueCapacity,
      } satisfies SchedulerMetrics;
    }),
    shutdown: Deferred.succeed(state.shutdownSignal, undefined).pipe(
      Effect.asVoid,
    ),
  };
}

export const PrioritySchedulerLive = Layer.scoped(
  PrioritySchedulerService,
  Effect.gen(function* (_) {
    const cfg = yield* _(PrioritySchedulerConfig);

    const queues = new Map<
      number,
      Queue.Queue<QueuedItem<unknown, unknown, unknown>>
    >();
    for (const p of AllPrioritiesWithCritical) {
      queues.set(
        p,
        yield* _(
          Queue.bounded<QueuedItem<unknown, unknown, unknown>>(
            cfg.queueCapacity,
          ),
        ),
      );
    }

    // Initialize requestType tracking map
    const requestTypeCountsMap = new Map<number, Map<string, number>>();
    for (const p of AllPrioritiesWithCritical) {
      requestTypeCountsMap.set(p, new Map<string, number>());
    }

    // Initialize active task counts map
    const activeTaskCountsMap = new Map<number, number>();
    for (const p of AllPrioritiesWithCritical) {
      activeTaskCountsMap.set(p, 0);
    }

    const state: SchedulerInternalState = {
      queues,
      tasksStarted: yield* _(Ref.make(0)),
      tasksCompleted: yield* _(Ref.make(0)),
      tasksDropped: yield* _(Ref.make(0)),
      shutdownSignal: yield* _(Deferred.make<void, void>()),
      requestTypeCounts: yield* _(Ref.make(requestTypeCountsMap)),
      activeTaskCounts: yield* _(Ref.make(activeTaskCountsMap)),
      queueCapacity: cfg.queueCapacity,
    };

    // Start the controller loop in the background
    // forkScoped ensures the loop is tied to the layer's scope for cleanup
    // We fork it and then yield to ensure it starts executing
    const _scope = yield* _(Effect.forkScoped(controllerLoop(state, cfg)));

    // Yield to allow the forked fiber to start
    yield* _(Effect.yieldNow());

    return makeScheduler(state);
  }),
);
