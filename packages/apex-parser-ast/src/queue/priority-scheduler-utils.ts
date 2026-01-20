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

import {
  getLogger,
  Priority,
  AllPriorities,
} from '@salesforce/apex-lsp-shared';
import {
  PriorityScheduler,
  PrioritySchedulerConfigShape,
  QueuedItem,
  ScheduledTask,
  SchedulerMetrics,
  SchedulerInternalState,
  SchedulerUtilsState,
  SchedulerUtilsInitializedState,
  Critical,
  AllPrioritiesWithCritical,
} from '../types/queue';

/**
 * Compare two SchedulerMetrics objects to detect if there are meaningful changes.
 * Returns true if metrics have changed, false if they're the same (idle state).
 */
function metricsChanged(
  previous: SchedulerMetrics | undefined,
  current: SchedulerMetrics,
): boolean {
  // If no previous metrics, always send (first update)
  if (!previous) {
    return true;
  }

  // Compare task counts (these change when tasks are processed)
  if (
    previous.tasksStarted !== current.tasksStarted ||
    previous.tasksCompleted !== current.tasksCompleted ||
    previous.tasksDropped !== current.tasksDropped
  ) {
    return true;
  }

  // Compare queue sizes (if any queue has items, we're not idle)
  for (const priority of AllPriorities) {
    const prevSize = previous.queueSizes[priority] || 0;
    const currSize = current.queueSizes[priority] || 0;
    if (prevSize !== currSize) {
      return true;
    }
  }

  // Compare active tasks (if any tasks are executing, we're not idle)
  if (previous.activeTasks && current.activeTasks) {
    for (const priority of AllPriorities) {
      const prevActive = previous.activeTasks[priority] || 0;
      const currActive = current.activeTasks[priority] || 0;
      if (prevActive !== currActive) {
        return true;
      }
    }
  } else if (previous.activeTasks !== current.activeTasks) {
    // One has activeTasks and the other doesn't
    return true;
  }

  // No changes detected - queue is idle
  return false;
}

// Helper function to calculate total active tasks across all priorities
function calculateTotalActiveTasks(
  state: SchedulerInternalState,
): Effect.Effect<number, never, never> {
  return Effect.gen(function* () {
    const activeCounts = yield* Ref.get(state.activeTaskCounts);
    let total = 0;
    for (const count of activeCounts.values()) {
      total += count;
    }
    return total;
  });
}

// Module-level priority name mapping (constant, created once)
const PRIORITY_TO_NAME: Record<number, string> = {
  0: 'CRITICAL',
  1: 'IMMEDIATE',
  2: 'HIGH',
  3: 'NORMAL',
  4: 'LOW',
  5: 'BACKGROUND',
};

// Helper function to get priority name for logging
function getPriorityName(priority: Priority | typeof Critical): string {
  if (priority === Critical) {
    return 'Critical';
  }
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

/**
 * Process a single queued item: track metrics, fork execution, handle completion/errors
 * This function centralizes the common logic for processing tasks in both normal
 * and starvation relief scenarios.
 */
function processQueuedItem<A, E, R>(
  state: SchedulerInternalState,
  item: QueuedItem<A, E, R>,
  priority: Priority | typeof Critical,
  logger: ReturnType<typeof getLogger>,
  context?: 'starvation-relief',
): Effect.Effect<void, never, R> {
  return Effect.gen(function* () {
    const requestType = item.requestType || 'unknown';
    const startTime = Date.now();
    const priorityName = getPriorityName(priority);
    const contextSuffix =
      context === 'starvation-relief' ? ' (starvation relief)' : '';

    // Move from queued to active: decrement queued, increment active
    yield* Ref.update(state.queuedRequestTypeCounts, (counts) => {
      const priorityCounts = counts.get(priority) || new Map<string, number>();
      const currentCount = priorityCounts.get(requestType) || 0;
      priorityCounts.set(requestType, Math.max(0, currentCount - 1));
      counts.set(priority, priorityCounts);
      return counts;
    });

    yield* Ref.update(state.activeRequestTypeCounts, (counts) => {
      const priorityCounts = counts.get(priority) || new Map<string, number>();
      const currentCount = priorityCounts.get(requestType) || 0;
      priorityCounts.set(requestType, currentCount + 1);
      counts.set(priority, priorityCounts);
      return counts;
    });

    // Track requestType (processed/completed tasks)
    yield* Ref.update(state.requestTypeCounts, (counts) => {
      const priorityCounts = counts.get(priority) || new Map<string, number>();
      const currentCount = priorityCounts.get(requestType) || 0;
      priorityCounts.set(requestType, currentCount + 1);
      counts.set(priority, priorityCounts);
      return counts;
    });

    // Increment active task count
    yield* Ref.update(state.activeTaskCounts, (counts) => {
      const current = counts.get(priority) || 0;
      counts.set(priority, current + 1);
      return counts;
    });

    yield* Ref.update(state.tasksStarted, (n) => n + 1);

    // Log task start
    logger.debug(
      () =>
        `[QUEUE] Started ${requestType} (id: ${item.id}) with priority ${priorityName}${contextSuffix}`,
    );

    // Fork the effect to run it in the background
    const fiber = yield* Effect.fork(
      item.eff.pipe(
        Effect.ensuring(
          Effect.gen(function* () {
            const duration = Date.now() - startTime;
            // Move from active to completed: decrement active
            yield* Ref.update(state.activeRequestTypeCounts, (counts) => {
              const priorityCounts =
                counts.get(priority) || new Map<string, number>();
              const currentCount = priorityCounts.get(requestType) || 0;
              priorityCounts.set(requestType, Math.max(0, currentCount - 1));
              counts.set(priority, priorityCounts);
              return counts;
            });
            // Decrement active task count
            yield* Ref.update(state.activeTaskCounts, (counts) => {
              const current = counts.get(priority) || 0;
              counts.set(priority, Math.max(0, current - 1));
              return counts;
            });
            yield* Ref.update(state.tasksCompleted, (n) => n + 1);
            // Log task completion
            logger.debug(
              () =>
                `[QUEUE] Completed ${requestType} (id: ${item.id}) with priority ${priorityName}, ` +
                `duration: ${duration}ms`,
            );
          }),
        ),
        Effect.catchAll((error) =>
          Effect.gen(function* () {
            // Decrement active task count on error
            yield* Ref.update(state.activeTaskCounts, (counts) => {
              const current = counts.get(priority) || 0;
              counts.set(priority, Math.max(0, current - 1));
              return counts;
            });
            logger.error(
              () =>
                `[QUEUE] Failed ${requestType} (id: ${item.id}) ` +
                `with priority ${priorityName}, error: ${error}`,
            );
            // Yield the failure to propagate it, not return it
            yield* Effect.fail(error);
          }),
        ),
      ),
    );

    // Fulfill the deferred so the fiber Effect in ScheduledTask can resolve
    yield* Deferred.succeed(
      item.fiberDeferred,
      fiber as Fiber.RuntimeFiber<A, E>,
    );
  });
}

/**
 * Yield to the event loop for immediate yielding.
 * Uses setImmediate in Node.js (more effective) or setTimeout(0) in browsers.
 */
const yieldToEventLoop = Effect.async<void>((resume) => {
  if (typeof setImmediate !== 'undefined') {
    setImmediate(() => resume(Effect.void));
  } else {
    setTimeout(() => resume(Effect.void), 0);
  }
});

function controllerLoop(
  state: SchedulerInternalState,
  cfg: PrioritySchedulerConfigShape,
): Effect.Effect<void, never, never> {
  const logger = getLogger();
  let lastSummaryLogTime = Date.now();
  const SUMMARY_LOG_INTERVAL_MS = 30000; // 30 seconds
  let lastQueueSizes = new Map<number, number>();

  return Effect.gen(function* () {
    let streak = 0;

    while (true) {
      if (yield* Deferred.isDone(state.shutdownSignal)) return;

      yield* Effect.gen(function* () {
        let executed = false;
        const currentTime = Date.now();

        const loopStart = Date.now();
        const YIELD_BUDGET_MS = 5;

        // Periodic summary logging (every 30 seconds)
        if (currentTime - lastSummaryLogTime >= SUMMARY_LOG_INTERVAL_MS) {
          yield* logQueueSummary(state, cfg, logger);
          lastSummaryLogTime = currentTime;
        }

        for (const p of AllPrioritiesWithCritical) {
          if (Date.now() - loopStart >= YIELD_BUDGET_MS) {
            yield* yieldToEventLoop;
            break;
          }
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

          // Check threshold alerts - get capacity for this priority
          const capacityMap =
            typeof state.queueCapacity === 'number'
              ? {
                  CRITICAL: state.queueCapacity,
                  IMMEDIATE: state.queueCapacity,
                  HIGH: state.queueCapacity,
                  NORMAL: state.queueCapacity,
                  LOW: state.queueCapacity,
                  BACKGROUND: state.queueCapacity,
                }
              : state.queueCapacity;
          // Use module-level priority name mapping
          const priorityName = PRIORITY_TO_NAME[p] || 'NORMAL';
          const capacity =
            capacityMap[priorityName] || capacityMap.NORMAL || 200;
          const utilization = (queueSize / capacity) * 100;
          if (utilization >= 90) {
            logger.warn(
              () =>
                `[QUEUE] CRITICAL: ${getPriorityName(p)} queue at ${utilization.toFixed(1)}% ` +
                `capacity (${queueSize}/${capacity})`,
            );
          } else if (utilization >= 75) {
            logger.warn(
              () =>
                `[QUEUE] WARNING: ${getPriorityName(p)} queue at ${utilization.toFixed(1)}% ` +
                `capacity (${queueSize}/${capacity})`,
            );
          }

          // Check per-priority maxConcurrency first
          const activeCounts = yield* Ref.get(state.activeTaskCounts);
          const activeCount = activeCounts.get(p) || 0;
          const maxConcurrent = state.maxConcurrency[priorityName] || Infinity;

          // Skip this priority if per-priority maxConcurrency limit reached
          if (activeCount >= maxConcurrent) {
            logger.debug(
              () =>
                '[QUEUE] Skipping ' +
                `${getPriorityName(p)} priority: ` +
                'per-priority maxConcurrency limit reached ' +
                `(active: ${activeCount}/${maxConcurrent})`,
            );
            continue; // Move to next priority
          }

          // Check overall maxTotalConcurrency limit
          // Only block lower priorities (Normal/Low/Background) when overall limit exceeded
          // Critical/Immediate/High always allowed through to prevent priority inversion
          const totalActive = yield* calculateTotalActiveTasks(state);
          if (totalActive >= state.maxTotalConcurrency) {
            // Block lower priorities when over total limit
            // But allow Critical/Immediate/High through
            if (p >= Priority.Normal) {
              logger.debug(
                () =>
                  '[QUEUE] Skipping ' +
                  `${getPriorityName(p)} priority: ` +
                  'overall maxTotalConcurrency limit reached ' +
                  `(total active: ${totalActive}/${state.maxTotalConcurrency})`,
              );
              continue; // Block Normal/Low/Background
            }
            // Allow Critical/Immediate/High through even if over total limit
            logger.debug(
              () =>
                '[QUEUE] Allowing ' +
                `${getPriorityName(p)} priority through ` +
                'despite overall maxTotalConcurrency limit ' +
                `(total active: ${totalActive}/${state.maxTotalConcurrency}) ` +
                'to prevent priority inversion',
            );
          }

          const chunk = yield* Queue.takeUpTo(q, 1);

          if (!Chunk.isEmpty(chunk)) {
            const item = Chunk.unsafeHead(chunk)!;
            executed = true;
            streak++;

            yield* processQueuedItem(state, item, p, logger);

            // HARD macrotask yield — forces Node to service I/O
            yield* yieldToEventLoop;

            break;
          }
        }

        // If no tasks were executed, sleep briefly before checking again
        if (!executed) {
          streak = 0;
          yield* yieldToEventLoop;
          yield* Effect.sleep(Duration.millis(cfg.idleSleepMs));
        }

        // Enhanced starvation relief - process multiple lower-priority tasks based on queue imbalance
        if (streak > cfg.maxHighPriorityStreak) {
          yield* Effect.gen(function* () {
            logger.debug(
              () =>
                `[QUEUE] Starvation relief triggered after ${streak} high-priority tasks`,
            );
            streak = 0;

            // Calculate queue sizes to determine relief batch size
            const queueSizes = new Map<number, number>();
            for (const p of AllPrioritiesWithCritical) {
              const q = state.queues.get(p)!;
              queueSizes.set(p, yield* Queue.size(q));
            }

            // Calculate total high-priority queue size (Critical + Immediate + High)
            const highPriorityTotal =
              (queueSizes.get(Critical) || 0) +
              (queueSizes.get(Priority.Immediate) || 0) +
              (queueSizes.get(Priority.High) || 0);

            // Calculate total lower-priority queue size (Normal + Low + Background)
            const lowerPriorityTotal =
              (queueSizes.get(Priority.Normal) || 0) +
              (queueSizes.get(Priority.Low) || 0) +
              (queueSizes.get(Priority.Background) || 0);

            // Determine batch size: process at least 5-10% of lower-priority queue, minimum 3-5 tasks
            const reliefBatchSize = Math.max(
              Math.min(Math.ceil(lowerPriorityTotal * 0.1), 10),
              Math.min(5, lowerPriorityTotal),
            );

            logger.debug(
              () =>
                `[QUEUE] Relief batch size: ${reliefBatchSize} ` +
                `(high: ${highPriorityTotal}, low: ${lowerPriorityTotal})`,
            );

            let reliefProcessed = 0;

            // Process lower-priority tasks in reverse order (Background -> Low -> Normal)
            for (let i = AllPrioritiesWithCritical.length - 1; i >= 0; i--) {
              const p = AllPrioritiesWithCritical[i];
              // Skip Critical, Immediate, and High priorities in relief
              if (
                p === Critical ||
                p === Priority.Immediate ||
                p === Priority.High
              ) {
                continue;
              }

              if (reliefProcessed >= reliefBatchSize) {
                break;
              }

              const q = state.queues.get(p)!;
              const remainingBatch = reliefBatchSize - reliefProcessed;
              const chunk = yield* Queue.takeUpTo(q, remainingBatch);

              if (!Chunk.isEmpty(chunk)) {
                const items = Chunk.toReadonlyArray(chunk);
                reliefProcessed += items.length;

                for (const item of items) {
                  yield* processQueuedItem(
                    state,
                    item,
                    p,
                    logger,
                    'starvation-relief',
                  );
                }
              }
            }

            if (reliefProcessed > 0) {
              logger.debug(
                () =>
                  `[QUEUE] Starvation relief processed ${reliefProcessed} lower-priority tasks`,
              );
            }
          });
        }
      });
    }
  }) as Effect.Effect<void, never, never>;
}

// Helper function to get current metrics synchronously (for callbacks)
function getCurrentMetrics(
  state: SchedulerInternalState,
): Effect.Effect<SchedulerMetrics, never, never> {
  return Effect.gen(function* () {
    const ms: any = {};
    const utilization: any = {};
    const activeTasks: any = {};
    const requestTypeBreakdown: any = {};

    // Only include public priorities in metrics (exclude Critical for API stability)
    // Get capacity map (handle both legacy single number and per-priority Record)
    const capacityMap =
      typeof state.queueCapacity === 'number'
        ? {
            CRITICAL: state.queueCapacity,
            IMMEDIATE: state.queueCapacity,
            HIGH: state.queueCapacity,
            NORMAL: state.queueCapacity,
            LOW: state.queueCapacity,
            BACKGROUND: state.queueCapacity,
          }
        : state.queueCapacity;
    const priorityNameMap: Record<number, string> = {
      0: 'CRITICAL',
      1: 'IMMEDIATE',
      2: 'HIGH',
      3: 'NORMAL',
      4: 'LOW',
      5: 'BACKGROUND',
    };

    for (const p of AllPriorities) {
      const queueSize = yield* Queue.size(state.queues.get(p)!);
      ms[p] = queueSize;
      const priorityName = priorityNameMap[p] || 'NORMAL';
      const capacity = capacityMap[priorityName] || capacityMap.NORMAL || 200;
      utilization[p] = (queueSize / capacity) * 100;

      // Get active task count
      const activeCounts = yield* Ref.get(state.activeTaskCounts);
      const activeCountsValue = activeCounts as Map<number, number>;
      activeTasks[p] = activeCountsValue.get(p) || 0;

      // Get requestType breakdown (processed/completed)
      const requestTypeCounts = yield* Ref.get(state.requestTypeCounts);
      const requestTypeCountsValue = requestTypeCounts as Map<
        number,
        Map<string, number>
      >;
      const priorityCounts = requestTypeCountsValue.get(p) || new Map();
      const breakdown: Record<string, number> = {};
      for (const [requestType, count] of priorityCounts.entries()) {
        breakdown[requestType] = count;
      }
      requestTypeBreakdown[p] = breakdown;
    }

    // Build queued requestType breakdown
    const queuedRequestTypeBreakdown: Record<
      Priority,
      Record<string, number>
    > = {} as Record<Priority, Record<string, number>>;
    for (const p of AllPriorities) {
      const queuedRequestTypeCounts = yield* Ref.get(
        state.queuedRequestTypeCounts,
      );
      const queuedCountsValue = queuedRequestTypeCounts as Map<
        number,
        Map<string, number>
      >;
      const priorityCounts = queuedCountsValue.get(p) || new Map();
      const breakdown: Record<string, number> = {};
      for (const [requestType, count] of priorityCounts.entries()) {
        breakdown[requestType] = count;
      }
      queuedRequestTypeBreakdown[p] = breakdown;
    }

    // Build active requestType breakdown
    const activeRequestTypeBreakdown: Record<
      Priority,
      Record<string, number>
    > = {} as Record<Priority, Record<string, number>>;
    for (const p of AllPriorities) {
      const activeRequestTypeCounts = yield* Ref.get(
        state.activeRequestTypeCounts,
      );
      const activeCountsValue = activeRequestTypeCounts as Map<
        number,
        Map<string, number>
      >;
      const priorityCounts = activeCountsValue.get(p) || new Map();
      const breakdown: Record<string, number> = {};
      for (const [requestType, count] of priorityCounts.entries()) {
        breakdown[requestType] = count;
      }
      activeRequestTypeBreakdown[p] = breakdown;
    }

    // Return per-priority queue capacities
    const queueCapacityPerPriority = {} as Record<Priority, number>;
    for (const p of AllPriorities) {
      const priorityName = priorityNameMap[p] || 'NORMAL';
      const capacity = capacityMap[priorityName] || capacityMap.NORMAL || 200;
      queueCapacityPerPriority[p] = capacity;
    }

    return {
      queueSizes: ms,
      tasksStarted: (yield* Ref.get(state.tasksStarted)) as number,
      tasksCompleted: (yield* Ref.get(state.tasksCompleted)) as number,
      tasksDropped: (yield* Ref.get(state.tasksDropped)) as number,
      requestTypeBreakdown,
      queuedRequestTypeBreakdown,
      activeRequestTypeBreakdown,
      queueUtilization: utilization,
      activeTasks,
      queueCapacity: queueCapacityPerPriority,
    } satisfies SchedulerMetrics;
  });
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

    // Include Critical in internal logging but not in public metrics
    const criticalQueueSize = yield* Queue.size(state.queues.get(Critical)!);
    const criticalActive =
      (yield* Ref.get(state.activeTaskCounts)).get(Critical) || 0;

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

    logger.debug(
      () =>
        `[QUEUE] State: Critical=${criticalQueueSize}(${criticalActive}), ` +
        `Immediate=${queueSizes[Priority.Immediate]}(${activeTasks[Priority.Immediate]}), ` +
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

// Global Ref to store queue state change callback (can be updated after initialization)
const queueStateCallbackRef = Ref.unsafeMake<
  ((metrics: SchedulerMetrics) => void) | undefined
>(undefined);

// Global Ref to store last sent metrics for change detection
const lastSentMetricsRef = Ref.unsafeMake<SchedulerMetrics | undefined>(
  undefined,
);

// Global Ref to store task ID counter for guaranteed unique IDs
const taskIdCounterRef = Ref.unsafeMake<number>(0);

// Default config values (matching DEFAULT_APEX_SETTINGS.scheduler in apex-lsp-shared)
const DEFAULT_CONFIG: PrioritySchedulerConfigShape = {
  queueCapacity: {
    CRITICAL: 200,
    IMMEDIATE: 200,
    HIGH: 200,
    NORMAL: 200,
    LOW: 200,
    BACKGROUND: 200,
  },
  maxHighPriorityStreak: 50,
  idleSleepMs: 1,
  maxConcurrency: {
    CRITICAL: Infinity,
    IMMEDIATE: Infinity,
    HIGH: Infinity,
    NORMAL: Infinity,
    LOW: Infinity,
    BACKGROUND: Infinity,
  },
  maxTotalConcurrency: Infinity, // Default to Infinity (no overall limit)
};

/**
 * Initialize the scheduler with the given configuration.
 * This must be called once at application startup before using offer/metrics/shutdown.
 * Returns an Effect that builds the scheduler and stores it for reuse.
 *
 * @param config Scheduler configuration
 */
export function initialize(config?: {
  queueCapacity: number | Record<string, number>;
  maxHighPriorityStreak: number;
  idleSleepMs: number;
  maxConcurrency?: Record<string, number>;
  maxTotalConcurrency?: number;
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

    const maxConcurrencyMap =
      config?.maxConcurrency || DEFAULT_CONFIG.maxConcurrency;

    // Calculate default maxTotalConcurrency if not provided
    const maxTotalConcurrency =
      config?.maxTotalConcurrency ??
      (() => {
        const sum = Object.values(maxConcurrencyMap).reduce((a, b) => {
          const aVal = typeof a === 'number' ? a : Infinity;
          const bVal = typeof b === 'number' ? b : Infinity;
          return aVal === Infinity || bVal === Infinity
            ? Infinity
            : aVal + bVal;
        }, 0);
        return sum === Infinity ? Infinity : Math.ceil(sum * 1.2); // 20% buffer
      })();

    const finalConfig: PrioritySchedulerConfigShape = {
      ...DEFAULT_CONFIG,
      ...config,
      maxConcurrency: maxConcurrencyMap,
      maxTotalConcurrency,
    };

    // Log what we received for debugging
    const logger = getLogger();
    logger.debug(
      () =>
        `[SCHEDULER INIT] Received config.queueCapacity: ${JSON.stringify(config?.queueCapacity)}`,
    );
    logger.debug(
      () =>
        `[SCHEDULER INIT] finalConfig.queueCapacity: ${JSON.stringify(finalConfig.queueCapacity)}`,
    );

    // Handle backward compatibility: convert single number to per-priority Record
    let queueCapacityMap: Record<string, number>;
    if (typeof finalConfig.queueCapacity === 'number') {
      // Single capacity value - apply to all priorities
      queueCapacityMap = {
        CRITICAL: finalConfig.queueCapacity,
        IMMEDIATE: finalConfig.queueCapacity,
        HIGH: finalConfig.queueCapacity,
        NORMAL: finalConfig.queueCapacity,
        LOW: finalConfig.queueCapacity,
        BACKGROUND: finalConfig.queueCapacity,
      };
    } else {
      queueCapacityMap = finalConfig.queueCapacity;
    }

    logger.debug(
      () =>
        `[SCHEDULER INIT] Final queueCapacityMap: ${JSON.stringify(queueCapacityMap)}`,
    );

    // Create a persistent scope that will keep the scheduler alive
    // This scope is reused across all calls to maintain singleton behavior
    const scope = yield* Scope.make();

    // Build the scheduler manually within our persistent scope
    // This avoids Layer.scoped creating its own scope
    const queues = new Map<
      number,
      Queue.Queue<QueuedItem<unknown, unknown, unknown>>
    >();

    for (const p of AllPrioritiesWithCritical) {
      // Use module-level priority name mapping
      const priorityName = PRIORITY_TO_NAME[p] || 'NORMAL';
      const capacity =
        queueCapacityMap[priorityName] || queueCapacityMap.NORMAL || 200;

      queues.set(
        p,
        yield* Queue.bounded<QueuedItem<unknown, unknown, unknown>>(capacity),
      );
    }

    // Initialize requestType tracking map (processed/completed tasks)
    const requestTypeCountsMap = new Map<number, Map<string, number>>();
    for (const p of AllPrioritiesWithCritical) {
      requestTypeCountsMap.set(p, new Map<string, number>());
    }

    // Initialize queued requestType tracking map (waiting in queue)
    const queuedRequestTypeCountsMap = new Map<number, Map<string, number>>();
    for (const p of AllPrioritiesWithCritical) {
      queuedRequestTypeCountsMap.set(p, new Map<string, number>());
    }

    // Initialize active requestType tracking map (currently executing)
    const activeRequestTypeCountsMap = new Map<number, Map<string, number>>();
    for (const p of AllPrioritiesWithCritical) {
      activeRequestTypeCountsMap.set(p, new Map<string, number>());
    }

    // Initialize active task counts map
    const activeTaskCountsMap = new Map<number, number>();
    for (const p of AllPrioritiesWithCritical) {
      activeTaskCountsMap.set(p, 0);
    }

    // Initialize back pressure tracking maps
    const enqueueRetriesMap = new Map<number, number>();
    const enqueueWaitTimeMap = new Map<number, number>();
    const backPressureEventsMap = new Map<number, number>();
    const backPressureStartTimeMap = new Map<number, number>();
    for (const p of AllPrioritiesWithCritical) {
      enqueueRetriesMap.set(p, 0);
      enqueueWaitTimeMap.set(p, 0);
      backPressureEventsMap.set(p, 0);
      backPressureStartTimeMap.set(p, 0);
    }

    const schedulerState: SchedulerInternalState = {
      queues,
      tasksStarted: yield* Ref.make(0),
      tasksCompleted: yield* Ref.make(0),
      tasksDropped: yield* Ref.make(0),
      shutdownSignal: yield* Deferred.make<void, void>(),
      requestTypeCounts: yield* Ref.make(requestTypeCountsMap),
      queuedRequestTypeCounts: yield* Ref.make(queuedRequestTypeCountsMap),
      activeRequestTypeCounts: yield* Ref.make(activeRequestTypeCountsMap),
      activeTaskCounts: yield* Ref.make(activeTaskCountsMap),
      queueCapacity: queueCapacityMap,
      maxConcurrency: maxConcurrencyMap,
      maxTotalConcurrency,
      enqueueRetries: yield* Ref.make(enqueueRetriesMap),
      enqueueWaitTime: yield* Ref.make(enqueueWaitTimeMap),
      backPressureEvents: yield* Ref.make(backPressureEventsMap),
      backPressureStartTime: yield* Ref.make(backPressureStartTimeMap),
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
      offer<A, E, R>(
        priority: Priority | typeof Critical,
        queuedItem: QueuedItem<A, E, R>,
      ) {
        return Effect.gen(function* () {
          const q = schedulerState.queues.get(priority)!;
          const requestType = queuedItem.requestType || 'unknown';

          // Track back pressure: record start time and retry count
          const enqueueStartTime = Date.now();
          let retryCount = 0;
          let backPressureStarted = false;

          // Retry until queue has space
          let ok = false;
          while (!ok) {
            ok = yield* Queue.offer(
              q,
              queuedItem as QueuedItem<unknown, unknown, unknown>,
            );
            if (!ok) {
              retryCount++;
              // Track back pressure event
              if (!backPressureStarted) {
                backPressureStarted = true;
                const currentEvents = yield* Ref.get(
                  schedulerState.backPressureEvents,
                );
                const currentCount = currentEvents.get(priority) || 0;
                currentEvents.set(priority, currentCount + 1);
                yield* Ref.set(
                  schedulerState.backPressureEvents,
                  currentEvents,
                );
                // Record start time for back pressure duration tracking
                const startTimes = yield* Ref.get(
                  schedulerState.backPressureStartTime,
                );
                startTimes.set(priority, enqueueStartTime);
                yield* Ref.set(
                  schedulerState.backPressureStartTime,
                  startTimes,
                );
                logger.warn(
                  () =>
                    `[QUEUE] Back pressure detected for ${getPriorityName(priority)} priority: queue full`,
                );
              }
              yield* Effect.sleep(Duration.millis(1));
            }
          }

          // Track queued request type (item successfully added to queue)
          yield* Ref.update(
            schedulerState.queuedRequestTypeCounts,
            (counts) => {
              const priorityCounts =
                counts.get(priority) || new Map<string, number>();
              const currentCount = priorityCounts.get(requestType) || 0;
              priorityCounts.set(requestType, currentCount + 1);
              counts.set(priority, priorityCounts);
              return counts;
            },
          );

          // Update back pressure metrics if retries occurred
          if (retryCount > 0) {
            const waitTime = Date.now() - enqueueStartTime;
            // Update retry counts
            const retries = yield* Ref.get(schedulerState.enqueueRetries);
            const currentRetries = retries.get(priority) || 0;
            retries.set(priority, currentRetries + retryCount);
            yield* Ref.set(schedulerState.enqueueRetries, retries);

            // Update wait time (cumulative)
            const waitTimes = yield* Ref.get(schedulerState.enqueueWaitTime);
            const currentWaitTime = waitTimes.get(priority) || 0;
            waitTimes.set(priority, currentWaitTime + waitTime);
            yield* Ref.set(schedulerState.enqueueWaitTime, waitTimes);

            // Update back pressure duration if back pressure ended
            if (backPressureStarted) {
              const startTimes = yield* Ref.get(
                schedulerState.backPressureStartTime,
              );
              const startTime = startTimes.get(priority) || 0;
              if (startTime > 0) {
                const duration = Date.now() - startTime;
                // Note: We don't track cumulative duration here, just log it
                logger.debug(
                  () =>
                    `[QUEUE] Back pressure ended for ${getPriorityName(priority)} priority: ` +
                    `duration=${duration}ms, retries=${retryCount}`,
                );
                startTimes.set(priority, 0);
                yield* Ref.set(
                  schedulerState.backPressureStartTime,
                  startTimes,
                );
              }
            }
          }

          // Log enqueue event
          const queueSize = yield* Queue.size(q);
          const priorityNameDisplay = getPriorityName(priority);
          // Map priority to uppercase key for capacity map
          const priorityToKey: Record<string, string> = {
            Critical: 'CRITICAL',
            Immediate: 'IMMEDIATE',
            High: 'HIGH',
            Normal: 'NORMAL',
            Low: 'LOW',
            Background: 'BACKGROUND',
          };
          const priorityKey = priorityToKey[priorityNameDisplay] || 'NORMAL';
          const capacityMap =
            typeof schedulerState.queueCapacity === 'number'
              ? {
                  CRITICAL: schedulerState.queueCapacity,
                  IMMEDIATE: schedulerState.queueCapacity,
                  HIGH: schedulerState.queueCapacity,
                  NORMAL: schedulerState.queueCapacity,
                  LOW: schedulerState.queueCapacity,
                  BACKGROUND: schedulerState.queueCapacity,
                }
              : schedulerState.queueCapacity;
          const capacity =
            capacityMap[priorityKey] || capacityMap.NORMAL || 200;
          logger.debug(
            () =>
              `[QUEUE] Enqueued ${requestType} (id: ${queuedItem.id}) with priority ${priorityNameDisplay}, ` +
              `queue size: ${queueSize}/${capacity}`,
          );

          // Notify callback immediately after enqueueing to capture queue growth
          // This ensures we capture transient queue sizes before tasks complete
          // Note: Callback is already deferred via setImmediate in LCSAdapter to avoid blocking
          const callback = yield* Ref.get(queueStateCallbackRef);
          if (callback) {
            try {
              const currentMetrics = yield* getCurrentMetrics(schedulerState);
              const lastSent = yield* Ref.get(lastSentMetricsRef);
              if (metricsChanged(lastSent, currentMetrics)) {
                // Callback is already deferred via setImmediate in LCSAdapter
                // This prevents blocking the enqueue operation
                callback(currentMetrics);
                yield* Ref.set(lastSentMetricsRef, currentMetrics);
              }
            } catch (error) {
              // Don't let callback errors break enqueueing
              logger.debug(
                () => `Queue state callback error during enqueue: ${error}`,
              );
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
        const utilization: any = {};
        const activeTasks: any = {};
        const requestTypeBreakdown: any = {};
        const queuedRequestTypeBreakdown: any = {};
        const activeRequestTypeBreakdown: any = {};

        // Only include public priorities in metrics (exclude Critical for API stability)
        // Get capacity map (handle both legacy single number and per-priority Record)
        const capacityMap =
          typeof schedulerState.queueCapacity === 'number'
            ? {
                CRITICAL: schedulerState.queueCapacity,
                IMMEDIATE: schedulerState.queueCapacity,
                HIGH: schedulerState.queueCapacity,
                NORMAL: schedulerState.queueCapacity,
                LOW: schedulerState.queueCapacity,
                BACKGROUND: schedulerState.queueCapacity,
              }
            : schedulerState.queueCapacity;
        const priorityNameMap: Record<number, string> = {
          0: 'CRITICAL',
          1: 'IMMEDIATE',
          2: 'HIGH',
          3: 'NORMAL',
          4: 'LOW',
          5: 'BACKGROUND',
        };

        for (const p of AllPriorities) {
          const queueSize = yield* Queue.size(schedulerState.queues.get(p)!);
          ms[p] = queueSize;
          const priorityName = priorityNameMap[p] || 'NORMAL';
          const capacity =
            capacityMap[priorityName] || capacityMap.NORMAL || 200;
          utilization[p] = (queueSize / capacity) * 100;

          // Get active task count
          const activeCounts = yield* Ref.get(schedulerState.activeTaskCounts);
          activeTasks[p] = activeCounts.get(p) || 0;

          // Get requestType breakdown (processed/completed)
          const requestTypeCounts = yield* Ref.get(
            schedulerState.requestTypeCounts,
          );
          const priorityCounts = requestTypeCounts.get(p) || new Map();
          const breakdown: Record<string, number> = {};
          for (const [requestType, count] of priorityCounts.entries()) {
            breakdown[requestType] = count;
          }
          requestTypeBreakdown[p] = breakdown;

          // Get queued requestType breakdown
          const queuedRequestTypeCounts = yield* Ref.get(
            schedulerState.queuedRequestTypeCounts,
          );
          const queuedPriorityCounts =
            queuedRequestTypeCounts.get(p) || new Map();
          const queuedBreakdown: Record<string, number> = {};
          for (const [requestType, count] of queuedPriorityCounts.entries()) {
            queuedBreakdown[requestType] = count;
          }
          queuedRequestTypeBreakdown[p] = queuedBreakdown;

          // Get active requestType breakdown
          const activeRequestTypeCounts = yield* Ref.get(
            schedulerState.activeRequestTypeCounts,
          );
          const activePriorityCounts =
            activeRequestTypeCounts.get(p) || new Map();
          const activeBreakdown: Record<string, number> = {};
          for (const [requestType, count] of activePriorityCounts.entries()) {
            activeBreakdown[requestType] = count;
          }
          activeRequestTypeBreakdown[p] = activeBreakdown;
        }

        // Calculate back pressure metrics
        const enqueueRetries = yield* Ref.get(schedulerState.enqueueRetries);
        const enqueueWaitTimes = yield* Ref.get(schedulerState.enqueueWaitTime);
        const backPressureEvents = yield* Ref.get(
          schedulerState.backPressureEvents,
        );
        const backPressureStartTimes = yield* Ref.get(
          schedulerState.backPressureStartTime,
        );

        const retriesByPriority: Record<Priority, number> = {} as Record<
          Priority,
          number
        >;
        const waitTimeByPriority: Record<Priority, number> = {} as Record<
          Priority,
          number
        >;
        const backPressureDurationByPriority: Record<Priority, number> =
          {} as Record<Priority, number>;
        const eventsByPriority: Record<Priority, number> = {} as Record<
          Priority,
          number
        >;

        for (const p of AllPriorities) {
          retriesByPriority[p] = enqueueRetries.get(p) || 0;
          const totalWaitTime = enqueueWaitTimes.get(p) || 0;
          const retryCount = enqueueRetries.get(p) || 0;
          // Calculate average wait time
          waitTimeByPriority[p] =
            retryCount > 0 ? totalWaitTime / retryCount : 0;
          eventsByPriority[p] = backPressureEvents.get(p) || 0;

          // Calculate current back pressure duration if active
          const startTime = backPressureStartTimes.get(p) || 0;
          if (startTime > 0) {
            backPressureDurationByPriority[p] = Date.now() - startTime;
          } else {
            backPressureDurationByPriority[p] = 0;
          }
        }

        // Return per-priority queue capacities
        const queueCapacityPerPriority = {} as Record<Priority, number>;
        for (const p of AllPriorities) {
          const priorityName = priorityNameMap[p] || 'NORMAL';
          const capacity =
            capacityMap[priorityName] || capacityMap.NORMAL || 200;
          queueCapacityPerPriority[p] = capacity;
        }

        return {
          queueSizes: ms,
          tasksStarted: yield* Ref.get(schedulerState.tasksStarted),
          tasksCompleted: yield* Ref.get(schedulerState.tasksCompleted),
          tasksDropped: yield* Ref.get(schedulerState.tasksDropped),
          requestTypeBreakdown,
          queuedRequestTypeBreakdown,
          activeRequestTypeBreakdown,
          queueUtilization: utilization,
          activeTasks,
          queueCapacity: queueCapacityPerPriority,
          enqueueRetries: retriesByPriority,
          enqueueWaitTime: waitTimeByPriority,
          backPressureDuration: backPressureDurationByPriority,
          backPressureEvents: eventsByPriority,
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
  priority: Priority | typeof Critical,
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
 * Set the queue state change callback.
 * This callback will be called after each scheduler loop iteration with current metrics.
 * Can be called after initialization to register or update the callback.
 *
 * @param callback Callback function to receive queue state updates, or undefined to remove callback
 */
export function setQueueStateChangeCallback(
  callback?: (metrics: SchedulerMetrics) => void,
): Effect.Effect<void, never, never> {
  return Ref.set(queueStateCallbackRef, callback);
}

/**
 * Start a periodic background task that checks for queue state changes and invokes
 * the callback at the specified interval. The task runs until the scheduler is shut down.
 *
 * @param callback Callback function to receive queue state updates
 * @param intervalMs Interval in milliseconds between notification checks
 * @returns Effect that produces a Fiber handle for the notification task
 */
export function startQueueStateNotificationTask(
  callback: (metrics: SchedulerMetrics) => void,
  intervalMs: number,
): Effect.Effect<Fiber.RuntimeFiber<void, never>, Error, never> {
  return Effect.gen(function* () {
    const state = yield* Ref.get(utilsStateRef);

    if (state.type !== 'initialized') {
      return yield* Effect.fail(
        new Error(
          'Scheduler not initialized. Call initialize() first at application startup.',
        ),
      );
    }

    const { scope } = state;

    // Store callback in Ref for potential future use
    yield* Ref.set(queueStateCallbackRef, callback);

    // Create the periodic notification loop
    const notificationLoop = Effect.gen(function* () {
      const logger = getLogger();
      logger.debug(
        () =>
          `Starting queue state notification task with interval ${intervalMs}ms`,
      );

      while (true) {
        // Sleep for the configured interval
        yield* Effect.sleep(Duration.millis(intervalMs));

        // Check if scheduler is still initialized (shutdown check)
        const currentState = yield* Ref.get(utilsStateRef);
        if (currentState.type !== 'initialized') {
          logger.debug(
            () => 'Scheduler shutdown detected, stopping notification task',
          );
          break;
        }

        try {
          // Get current metrics using the metrics() function
          const currentMetricsResult = yield* Effect.either(metrics());
          if (currentMetricsResult._tag === 'Left') {
            // Scheduler not initialized or error getting metrics
            logger.debug(
              () =>
                `Error getting metrics in notification task: ${currentMetricsResult.left}`,
            );
            continue;
          }

          const currentMetrics = currentMetricsResult.right;
          const lastSent = yield* Ref.get(lastSentMetricsRef);

          // Check if metrics have changed
          if (metricsChanged(lastSent, currentMetrics)) {
            // Invoke callback (caller is responsible for deferring if needed)
            callback(currentMetrics);
            // Update last sent metrics
            yield* Ref.set(lastSentMetricsRef, currentMetrics);
          }
        } catch (error) {
          // Don't let errors break the notification loop
          logger.debug(
            () =>
              `Queue state notification task error: ${
                error instanceof Error ? error.message : String(error)
              }`,
          );
        }
      }

      logger.debug(() => 'Queue state notification task stopped');
    });

    // Fork the notification loop in the scheduler's scope
    const fiber = yield* Effect.forkScoped(notificationLoop).pipe(
      Effect.provide(Layer.succeed(Scope.Scope, scope)),
    );

    return fiber;
  });
}

/**
 * Reset lastSentMetricsRef to current metrics.
 * This ensures that future metric changes will trigger notifications.
 * Useful when a client requests current state and wants to receive updates.
 */
export function resetLastSentMetrics(): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    // Get current metrics using the same function as metrics()
    // If metrics() fails (scheduler not initialized), silently ignore
    const currentMetrics = yield* Effect.catchAll(metrics(), () =>
      Effect.succeed({
        queueSizes: {},
        tasksStarted: 0,
        tasksCompleted: 0,
        tasksDropped: 0,
        queueCapacity: {},
      } as SchedulerMetrics),
    );
    yield* Ref.set(lastSentMetricsRef, currentMetrics);
  });
}

/**
 * Reset the scheduler state (for testing only).
 * This allows tests to reset the singleton state between test runs.
 * Note: This does not shutdown the scheduler - call shutdown() first if needed.
 */
export function reset(): Effect.Effect<void, never, never> {
  return Effect.gen(function* () {
    yield* Ref.set(utilsStateRef, {
      type: 'uninitialized',
    });
    yield* Ref.set(queueStateCallbackRef, undefined);
    yield* Ref.set(lastSentMetricsRef, undefined);
    // Reset task ID counter on reset
    yield* Ref.set(taskIdCounterRef, 0);
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
    // Generate guaranteed unique ID using atomic counter
    const taskId = yield* Ref.updateAndGet(taskIdCounterRef, (n) => n + 1);
    return {
      id: `task-${taskId}`,
      eff,
      fiberDeferred,
      requestType,
    };
  });
}
