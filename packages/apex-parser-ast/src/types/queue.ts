/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Deferred, Effect, Fiber, Queue, Ref, Scope } from 'effect';
import { Priority } from '@salesforce/apex-lsp-shared';

// Re-export Priority for convenience
export { Priority };

/**
 * Internal Critical priority (value 0) - highest priority for system tasks.
 * NOT exposed in public Priority enum to maintain API stability.
 * Used internally for system-initiated tasks like workspace load.
 */
export const Critical = 0 as const;

/**
 * Internal priority list that includes Critical priority.
 * Used by scheduler internally, not exposed to consumers.
 */
export const AllPrioritiesWithCritical: readonly number[] = [
  Critical,
  Priority.Immediate,
  Priority.High,
  Priority.Normal,
  Priority.Low,
  Priority.Background,
] as const;

export interface ScheduledTask<A = never, E = never, R = never> {
  readonly fiber: Effect.Effect<Fiber.RuntimeFiber<A, E>, E, R>;
  readonly requestType?: string;
}

export interface SchedulerMetrics {
  readonly queueSizes: Readonly<Record<Priority, number>>;
  readonly tasksStarted: number;
  readonly tasksCompleted: number;
  readonly tasksDropped: number;
  /** Request type breakdown per priority: priority -> requestType -> count */
  readonly requestTypeBreakdown?: Readonly<
    Record<Priority, Readonly<Record<string, number>>>
  >;
  /** Queue utilization percentage per priority (0-100) */
  readonly queueUtilization?: Readonly<Record<Priority, number>>;
  /** Currently active (executing) tasks per priority */
  readonly activeTasks?: Readonly<Record<Priority, number>>;
  /** Queue capacity per priority (bounded size) */
  readonly queueCapacity: number;
}

export interface PriorityScheduler {
  offer: <A, E, R>(
    priority: Priority | typeof Critical,
    queuedItem: QueuedItem<A, E, R>,
  ) => Effect.Effect<ScheduledTask<A, E, R>>;
  metrics: Effect.Effect<SchedulerMetrics>;
  shutdown: Effect.Effect<void>;
}

export interface PrioritySchedulerConfigShape {
  queueCapacity: number;
  maxHighPriorityStreak: number;
  idleSleepMs: number;
}

export interface QueuedItem<A = never, E = never, R = never> {
  readonly id: string;
  readonly eff: Effect.Effect<A, E, R>;
  readonly fiberDeferred: Deferred.Deferred<Fiber.RuntimeFiber<A, E>, E>;
  readonly requestType?: string;
}

// Internal priority type that includes Critical
export type InternalPriority = Priority | typeof Critical;

// Internal state types for scheduler implementation
export interface SchedulerInternalState {
  readonly queues: ReadonlyMap<
    number,
    Queue.Queue<QueuedItem<unknown, unknown, unknown>>
  >;
  readonly tasksStarted: Ref.Ref<number>;
  readonly tasksCompleted: Ref.Ref<number>;
  readonly tasksDropped: Ref.Ref<number>;
  readonly shutdownSignal: Deferred.Deferred<void, void>;
  /** Request type counts per priority: priority -> requestType -> count */
  readonly requestTypeCounts: Ref.Ref<Map<number, Map<string, number>>>;
  /** Active tasks per priority (currently executing) */
  readonly activeTaskCounts: Ref.Ref<Map<number, number>>;
  /** Queue capacity per priority */
  readonly queueCapacity: number;
}

// Internal state types for scheduler utils
export interface SchedulerUtilsUninitializedState {
  readonly type: 'uninitialized';
  readonly config?: PrioritySchedulerConfigShape;
}

export interface SchedulerUtilsInitializedState {
  readonly type: 'initialized';
  // Built scheduler service instance - stored for reuse
  // This ensures singleton behavior - the same scheduler instance is used across all calls
  readonly scheduler: PriorityScheduler;
  // Persistent scope that keeps the scheduler alive across calls
  // This ensures singleton behavior for the scoped layer
  readonly scope: Scope.Scope;
}

export type SchedulerUtilsState =
  | SchedulerUtilsUninitializedState
  | SchedulerUtilsInitializedState;
