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
  Fiber,
} from 'effect';
import { getLogger, Priority } from '@salesforce/apex-lsp-shared';
import {
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

// Helper function to get priority name for logging
function getPriorityName(priority: Priority): string {
  switch (priority) {
    case Priority.Immediate:
      return 'Immediate';
    case Priority.High:
      return 'High';
    case Priority.Normal:
      return 'Normal';
    case Priority.Low:
      return 'Low';
    case Priority.Background:
      return 'Background';
    default:
      return `Priority${priority}`;
  }
}
// Controller loop function (copied from priority-scheduler.ts to avoid circular dependency)
function controllerLoop(
  state: SchedulerInternalState,
  cfg: PrioritySchedulerConfigShape,
): Effect.Effect<void, never, never> {
  const logger = getLogger();
  let lastSummaryLogTime = Date.now();
  const SUMMARY_LOG_INTERVAL_MS = 30000; // 30 seconds
  let lastQueueSizes = new Map<Priority, number>();

  return Effect.gen(function* () {
    let streak = 0;

    while (true) {
      if (yield* Deferred.isDone(state.shutdownSignal)) return;

      let executed = false;
      const currentTime = Date.now();

      // Periodic summary logging (every 30 seconds)
      if (currentTime - lastSummaryLogTime >= SUMMARY_LOG_INTERVAL_MS) {
        yield* logQueueSummary(state, cfg, logger);
        lastSummaryLogTime = currentTime;
      }

      for (const p of AllPriorities) {
        const q = state.queues.get(p)!;
        const queueSize = yield* Queue.size(q);
        const oldSize = lastQueueSizes.get(p) || 0;

        // Log significant queue size changes (>10 items)
        if (Math.abs(queueSize - oldSize) > 10) {
          logger.debug(
            () =>
              `[QUEUE] ${getPriorityName(p)} queue size changed: ${oldSize} -> ${queueSize}`,
          );
        }
        lastQueueSizes.set(p, queueSize);

        // Check threshold alerts
        const utilization = (queueSize / state.queueCapacity) * 100;
        if (utilization >= 90) {
          logger.warn(
            () =>
              `[QUEUE] CRITICAL: ${getPriorityName(p)} queue at ${utilization.toFixed(1)}% capacity (${queueSize}/${state.queueCapacity})`,
          );
        } else if (utilization >= 75) {
          logger.warn(
            () =>
              `[QUEUE] WARNING: ${getPriorityName(p)} queue at ${utilization.toFixed(1)}% capacity (${queueSize}/${state.queueCapacity})`,
          );
        }

        const chunk = yield* Queue.takeUpTo(q, 1);

        if (!Chunk.isEmpty(chunk)) {
          const item = Chunk.unsafeHead(chunk)!;
          executed = true;
          streak++;

          const requestType = item.requestType || 'unknown';
          const startTime = Date.now();

          // Track requestType
          yield* Ref.update(state.requestTypeCounts, (counts) => {
            const priorityCounts = counts.get(p) || new Map<string, number>();
            const currentCount = priorityCounts.get(requestType) || 0;
            priorityCounts.set(requestType, currentCount + 1);
            counts.set(p, priorityCounts);
            return counts;
          });

          // Increment active task count
          yield* Ref.update(state.activeTaskCounts, (counts) => {
            const current = counts.get(p) || 0;
            counts.set(p, current + 1);
            return counts;
          });

          yield* Ref.update(state.tasksStarted, (n) => n + 1);

          // Log task start
          logger.debug(
            () =>
              `[QUEUE] Started ${requestType} with priority ${getPriorityName(p)}`,
          );

          // Fork the effect to run it in the background
          const fiber = yield* Effect.fork(
            item.eff.pipe(
              Effect.ensuring(
                Effect.gen(function* () {
                  const duration = Date.now() - startTime;
                  // Decrement active task count
                  yield* Ref.update(state.activeTaskCounts, (counts) => {
                    const current = counts.get(p) || 0;
                    counts.set(p, Math.max(0, current - 1));
                    return counts;
                  });
                  yield* Ref.update(state.tasksCompleted, (n) => n + 1);
                  // Log task completion
                  logger.debug(
                    () =>
                      `[QUEUE] Completed ${requestType} with priority ${getPriorityName(p)}, duration: ${duration}ms`,
                  );
                }),
              ),
              Effect.catchAll((error) => {
                return Effect.gen(function* () {
                  // Decrement active task count on error
                  yield* Ref.update(state.activeTaskCounts, (counts) => {
                    const current = counts.get(p) || 0;
                    counts.set(p, Math.max(0, current - 1));
                    return counts;
                  });
                  logger.error(
                    () =>
                      `[QUEUE] Failed ${requestType} with priority ${getPriorityName(p)}, error: ${error}`,
                  );
                  return Effect.fail(error);
                });
              }),
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
        logger.debug(
          () =>
            `[QUEUE] Starvation relief triggered after ${streak} high-priority tasks`,
        );
        streak = 0;

        for (let i = AllPriorities.length - 1; i >= 0; i--) {
          const p = AllPriorities[i];
          const q = state.queues.get(p)!;
          const chunk = yield* Queue.takeUpTo(q, 1);

          if (!Chunk.isEmpty(chunk)) {
            const item = Chunk.unsafeHead(chunk)!;
            const requestType = item.requestType || 'unknown';
            const startTime = Date.now();

            // Track requestType
            yield* Ref.update(state.requestTypeCounts, (counts) => {
              const priorityCounts = counts.get(p) || new Map<string, number>();
              const currentCount = priorityCounts.get(requestType) || 0;
              priorityCounts.set(requestType, currentCount + 1);
              counts.set(p, priorityCounts);
              return counts;
            });

            // Increment active task count
            yield* Ref.update(state.activeTaskCounts, (counts) => {
              const current = counts.get(p) || 0;
              counts.set(p, current + 1);
              return counts;
            });

            yield* Ref.update(state.tasksStarted, (n) => n + 1);

            logger.debug(
              () =>
                `[QUEUE] Started ${requestType} with priority ${getPriorityName(p)} (starvation relief)`,
            );

            const fiber = yield* Effect.fork(
              item.eff.pipe(
                Effect.ensuring(
                  Effect.gen(function* () {
                    const duration = Date.now() - startTime;
                    // Decrement active task count
                    yield* Ref.update(state.activeTaskCounts, (counts) => {
                      const current = counts.get(p) || 0;
                      counts.set(p, Math.max(0, current - 1));
                      return counts;
                    });
                    yield* Ref.update(state.tasksCompleted, (n) => n + 1);
                    logger.debug(
                      () =>
                        `[QUEUE] Completed ${requestType} with priority ${getPriorityName(p)}, duration: ${duration}ms`,
                    );
                  }),
                ),
                Effect.catchAll((error) => {
                  return Effect.gen(function* () {
                    // Decrement active task count on error
                    yield* Ref.update(state.activeTaskCounts, (counts) => {
                      const current = counts.get(p) || 0;
                      counts.set(p, Math.max(0, current - 1));
                      return counts;
                    });
                    logger.error(
                      () =>
                        `[QUEUE] Failed ${requestType} with priority ${getPriorityName(p)}, error: ${error}`,
                    );
                    return Effect.fail(error);
                  });
                }),
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

// Helper function to log periodic queue summary
function logQueueSummary(
  state: SchedulerInternalState,
  cfg: PrioritySchedulerConfigShape,
  logger: any,
): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    const queueSizes: Record<Priority, number> = {} as any;
    const activeTasks: Record<Priority, number> = {} as any;
    const requestTypeBreakdown: Record<
      Priority,
      Record<string, number>
    > = {} as any;

    for (const p of AllPriorities) {
      const q = state.queues.get(p)!;
      queueSizes[p] = yield* Queue.size(q);
      const activeCounts = yield* Ref.get(state.activeTaskCounts);
      activeTasks[p] = activeCounts.get(p) || 0;

      const requestTypeCounts = yield* Ref.get(state.requestTypeCounts);
      const priorityCounts = requestTypeCounts.get(p) || new Map();
      const breakdown: Record<string, number> = {};
      for (const [requestType, count] of priorityCounts.entries()) {
        breakdown[requestType] = count;
      }
      requestTypeBreakdown[p] = breakdown;
    }

    const tasksStarted = yield* Ref.get(state.tasksStarted);
    const tasksCompleted = yield* Ref.get(state.tasksCompleted);
    const tasksDropped = yield* Ref.get(state.tasksDropped);

    logger.info(
      () =>
        `[QUEUE] State: Immediate=${queueSizes[Priority.Immediate]}(${activeTasks[Priority.Immediate]}), ` +
        `High=${queueSizes[Priority.High]}(${activeTasks[Priority.High]}), ` +
        `Normal=${queueSizes[Priority.Normal]}(${activeTasks[Priority.Normal]}), ` +
        `Low=${queueSizes[Priority.Low]}(${activeTasks[Priority.Low]}), ` +
        `Background=${queueSizes[Priority.Background]}(${activeTasks[Priority.Background]}) | ` +
        `Started=${tasksStarted}, Completed=${tasksCompleted}, Dropped=${tasksDropped}`,
    );

    // Log requestType breakdown if available (DEBUG level)
    const hasBreakdown = Object.values(requestTypeBreakdown).some(
      (breakdown) => Object.keys(breakdown).length > 0,
    );
    if (hasBreakdown) {
      logger.debug(() => {
        const breakdownStr = Object.entries(requestTypeBreakdown)
          .map(([priority, breakdown]) => {
            const priorityName = getPriorityName(Number(priority) as Priority);
            const breakdownEntries = Object.entries(breakdown)
              .map(([type, count]) => `${type}:${count}`)
              .join(', ');
            return breakdownEntries
              ? `${priorityName}=[${breakdownEntries}]`
              : null;
          })
          .filter(Boolean)
          .join(', ');
        return `[QUEUE] RequestType breakdown: ${breakdownStr}`;
      });
    }
  });
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

    // Initialize requestType tracking map
    const requestTypeCountsMap = new Map<Priority, Map<string, number>>();
    for (const p of AllPriorities) {
      requestTypeCountsMap.set(p, new Map<string, number>());
    }

    // Initialize active task counts map
    const activeTaskCountsMap = new Map<Priority, number>();
    for (const p of AllPriorities) {
      activeTaskCountsMap.set(p, 0);
    }

    const schedulerState: SchedulerInternalState = {
      queues,
      tasksStarted: yield* Ref.make(0),
      tasksCompleted: yield* Ref.make(0),
      tasksDropped: yield* Ref.make(0),
      shutdownSignal: yield* Deferred.make<void, void>(),
      requestTypeCounts: yield* Ref.make(requestTypeCountsMap),
      activeTaskCounts: yield* Ref.make(activeTaskCountsMap),
      queueCapacity: finalConfig.queueCapacity,
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
    const logger = getLogger();
    const scheduler: PriorityScheduler = {
      offer<A, E, R>(priority: Priority, queuedItem: QueuedItem<A, E, R>) {
        return Effect.gen(function* () {
          const q = schedulerState.queues.get(priority)!;
          const requestType = queuedItem.requestType || 'unknown';

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

          // Log enqueue event
          const queueSize = yield* Queue.size(q);
          logger.debug(
            () =>
              `[QUEUE] Enqueued ${requestType} with priority ${getPriorityName(priority)}, queue size: ${queueSize}/${schedulerState.queueCapacity}`,
          );

          return {
            fiber: Deferred.await(queuedItem.fiberDeferred),
            requestType: queuedItem.requestType,
          } satisfies ScheduledTask<A, E, R>;
        });
      },
      metrics: Effect.gen(function* () {
        const ms: any = {};
        const utilization: any = {};
        const activeTasks: any = {};
        const requestTypeBreakdown: any = {};

        for (const p of AllPriorities) {
          const queueSize = yield* Queue.size(schedulerState.queues.get(p)!);
          ms[p] = queueSize;
          utilization[p] = (queueSize / schedulerState.queueCapacity) * 100;

          // Get active task count
          const activeCounts = yield* Ref.get(schedulerState.activeTaskCounts);
          activeTasks[p] = activeCounts.get(p) || 0;

          // Get requestType breakdown
          const requestTypeCounts = yield* Ref.get(
            schedulerState.requestTypeCounts,
          );
          const priorityCounts = requestTypeCounts.get(p) || new Map();
          const breakdown: Record<string, number> = {};
          for (const [requestType, count] of priorityCounts.entries()) {
            breakdown[requestType] = count;
          }
          requestTypeBreakdown[p] = breakdown;
        }

        return {
          queueSizes: ms,
          tasksStarted: yield* Ref.get(schedulerState.tasksStarted),
          tasksCompleted: yield* Ref.get(schedulerState.tasksCompleted),
          tasksDropped: yield* Ref.get(schedulerState.tasksDropped),
          requestTypeBreakdown,
          queueUtilization: utilization,
          activeTasks,
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

/**
 * Create a QueuedItem from an Effect.
 * This is a convenience helper for creating queued items to submit to the scheduler.
 *
 * @param eff - The Effect to wrap in a QueuedItem
 * @param requestType - Optional request type identifier for tracking/monitoring
 * @returns An Effect that produces a QueuedItem ready to be scheduled
 */
export function createQueuedItem<A, E, R>(
  eff: Effect.Effect<A, E, R>,
  requestType?: string,
): Effect.Effect<QueuedItem<A, E, R>, never, never> {
  return Effect.gen(function* () {
    const fiberDeferred = yield* Deferred.make<Fiber.RuntimeFiber<A, E>, E>();
    return {
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      eff,
      fiberDeferred,
      requestType,
    };
  });
}
