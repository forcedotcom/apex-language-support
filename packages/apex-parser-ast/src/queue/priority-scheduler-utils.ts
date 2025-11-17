/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
// src/queue/priority-scheduler-utils.ts
import {
  Effect,
  Layer,
  Queue,
  Ref,
  Scope,
  Deferred,
  Duration,
  Chunk,
} from 'effect';
import {
  Priority,
  PriorityScheduler,
  PrioritySchedulerConfigShape,
  QueuedItem,
  ScheduledTask,
  SchedulerMetrics,
  SchedulerInternalState,
  SchedulerUtilsState,
  SchedulerUtilsInitializedState,
  AllPriorities,
} from '../types/queue';
// Controller loop function (copied from priority-scheduler.ts to avoid circular dependency)
function controllerLoop(
  state: SchedulerInternalState,
  cfg: PrioritySchedulerConfigShape,
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    let streak = 0;

    while (true) {
      if (yield* Deferred.isDone(state.shutdownSignal)) return;

      let executed = false;

      for (const p of AllPriorities) {
        const q = state.queues.get(p)!;
        const chunk = yield* Queue.takeUpTo(q, 1);

        if (!Chunk.isEmpty(chunk)) {
          const item = Chunk.unsafeHead(chunk)!;
          executed = true;
          streak++;

          yield* Ref.update(state.tasksStarted, (n) => n + 1);

          // Fork the effect to run it in the background
          const fiber = yield* Effect.fork(
            item.eff.pipe(
              Effect.ensuring(Ref.update(state.tasksCompleted, (n) => n + 1)),
            ),
          );

          // Fulfill the deferred so the fiber Effect in ScheduledTask can resolve
          yield* Deferred.succeed(item.fiberDeferred, fiber);

          break;
        }
      }

      // If no tasks were executed, sleep briefly before checking again
      if (!executed) {
        streak = 0;
        yield* Effect.sleep(Duration.millis(cfg.idleSleepMs));
      }

      // starvation relief
      if (streak > cfg.maxHighPriorityStreak) {
        streak = 0;

        for (let i = AllPriorities.length - 1; i >= 0; i--) {
          const q = state.queues.get(AllPriorities[i])!;
          const chunk = yield* Queue.takeUpTo(q, 1);

          if (!Chunk.isEmpty(chunk)) {
            const item = Chunk.unsafeHead(chunk)!;

            yield* Ref.update(state.tasksStarted, (n) => n + 1);

            const fiber = yield* Effect.fork(
              item.eff.pipe(
                Effect.ensuring(Ref.update(state.tasksCompleted, (n) => n + 1)),
              ),
            );

            yield* Deferred.succeed(item.fiberDeferred, fiber);
            break;
          }
        }
      }
    }
  }) as Effect.Effect<void, never, never>;
}

// Global Ref to store utils initialization state
const utilsStateRef = Ref.unsafeMake<SchedulerUtilsState>({
  type: 'uninitialized',
});

// Default config values matching PrioritySchedulerConfigLive
const DEFAULT_CONFIG = {
  queueCapacity: 64,
  maxHighPriorityStreak: 50,
  idleSleepMs: 1,
};

/**
 * Initialize the scheduler with the given configuration.
 * This must be called once at application startup before using offer/metrics/shutdown.
 * Returns an Effect that builds the scheduler and stores it for reuse.
 */
export function initialize(config?: {
  queueCapacity: number;
  maxHighPriorityStreak: number;
  idleSleepMs: number;
}): Effect.Effect<void, Error, never> {
  return Effect.gen(function* () {
    const state = yield* Ref.get(utilsStateRef);

    if (state.type === 'initialized') {
      return yield* Effect.fail(
        new Error(
          'Scheduler already initialized. Call reset() first if you need to reinitialize.',
        ),
      );
    }

    const finalConfig = config ?? DEFAULT_CONFIG;

    // Create a persistent scope that will keep the scheduler alive
    // This scope is reused across all calls to maintain singleton behavior
    const scope = yield* Scope.make();

    // Build the scheduler manually within our persistent scope
    // This avoids Layer.scoped creating its own scope
    const queues = new Map<
      Priority,
      Queue.Queue<QueuedItem<unknown, unknown, unknown>>
    >();
    for (const p of AllPriorities) {
      queues.set(
        p,
        yield* Queue.bounded<QueuedItem<unknown, unknown, unknown>>(
          finalConfig.queueCapacity,
        ),
      );
    }

    const schedulerState: SchedulerInternalState = {
      queues,
      tasksStarted: yield* Ref.make(0),
      tasksCompleted: yield* Ref.make(0),
      tasksDropped: yield* Ref.make(0),
      shutdownSignal: yield* Deferred.make<void, void>(),
    };

    // Start the controller loop in the background within our scope
    // Provide the scope service first so forkScoped can use it
    const scopeLayer = Layer.succeed(Scope.Scope, scope);
    yield* Effect.forkScoped(controllerLoop(schedulerState, finalConfig)).pipe(
      Effect.provide(scopeLayer),
    );

    // Yield to allow the forked fiber to start
    yield* Effect.yieldNow();

    // Build the scheduler from the state
    const scheduler: PriorityScheduler = {
      offer<A, E, R>(priority: Priority, queuedItem: QueuedItem<A, E, R>) {
        return Effect.gen(function* () {
          const q = schedulerState.queues.get(priority)!;

          // Retry until queue has space
          let ok = false;
          while (!ok) {
            ok = yield* Queue.offer(
              q,
              queuedItem as QueuedItem<unknown, unknown, unknown>,
            );
            if (!ok) {
              yield* Effect.sleep(Duration.millis(1));
            }
          }

          return {
            fiber: Deferred.await(queuedItem.fiberDeferred),
            requestType: queuedItem.requestType,
          } satisfies ScheduledTask<A, E, R>;
        });
      },
      metrics: Effect.gen(function* () {
        const ms: any = {};

        for (const p of AllPriorities) {
          ms[p] = yield* Queue.size(schedulerState.queues.get(p)!);
        }

        return {
          queueSizes: ms,
          tasksStarted: yield* Ref.get(schedulerState.tasksStarted),
          tasksCompleted: yield* Ref.get(schedulerState.tasksCompleted),
          tasksDropped: yield* Ref.get(schedulerState.tasksDropped),
        } satisfies SchedulerMetrics;
      }),
      shutdown: Deferred.succeed(schedulerState.shutdownSignal, undefined).pipe(
        Effect.asVoid,
      ),
    };

    // Store the built service instance and scope for reuse
    // This ensures singleton behavior - the same scheduler instance is used across all calls
    yield* Ref.set(utilsStateRef, {
      type: 'initialized',
      scheduler,
      scope,
    } as SchedulerUtilsInitializedState);
  });
}

/**
 * Schedule a task with the given priority.
 * Requires scheduler to be initialized via initialize() first.
 */
export function offer<A = never, E = never, R = never>(
  priority: Priority,
  queuedItem: QueuedItem<A, E, R>,
): Effect.Effect<ScheduledTask<A, E, R>, Error, never> {
  return Effect.gen(function* () {
    const state: SchedulerUtilsState = yield* Ref.get(utilsStateRef);
    if (state.type !== 'initialized') {
      return yield* Effect.fail(
        new Error(
          'Scheduler not initialized. Call initialize() first at application startup.',
        ),
      );
    }
    const { scheduler } = state;

    // Use the pre-built scheduler instance
    // This ensures we're using the same scheduler instance across all calls
    return yield* scheduler.offer(priority, queuedItem);
  });
}

/**
 * Get scheduler metrics.
 * Requires scheduler to be initialized via initialize() first.
 */
export function metrics(): Effect.Effect<SchedulerMetrics, Error, never> {
  return Effect.gen(function* () {
    const state: SchedulerUtilsState = yield* Ref.get(utilsStateRef);
    if (state.type !== 'initialized') {
      return yield* Effect.fail(
        new Error(
          'Scheduler not initialized. Call initialize() first at application startup.',
        ),
      );
    }
    const { scheduler } = state;

    // Use the pre-built scheduler instance
    // This ensures we're using the same scheduler instance across all calls
    return yield* scheduler.metrics;
  });
}

/**
 * Shutdown the scheduler.
 * Requires scheduler to be initialized via initialize() first.
 * After shutdown, the scheduler must be reinitialized before use.
 */
export function shutdown(): Effect.Effect<void, Error, never> {
  return Effect.gen(function* () {
    const state: SchedulerUtilsState = yield* Ref.get(utilsStateRef);
    if (state.type !== 'initialized') {
      return yield* Effect.fail(
        new Error(
          'Scheduler not initialized. Call initialize() first at application startup.',
        ),
      );
    }
    const { scheduler } = state;

    // Use the pre-built scheduler instance to shutdown
    // The shutdown signal will stop the controller loop
    const shutdownResult = yield* scheduler.shutdown;

    // Clear the initialized state after shutdown
    yield* Ref.set(utilsStateRef, {
      type: 'uninitialized',
    });

    return shutdownResult;
  });
}

/**
 * Reset the scheduler state (for testing only).
 * This allows tests to reset the singleton state between test runs.
 * Note: This does not shutdown the scheduler - call shutdown() first if needed.
 */
export function reset(): Effect.Effect<void, never, never> {
  return Ref.set(utilsStateRef, {
    type: 'uninitialized',
  });
}
