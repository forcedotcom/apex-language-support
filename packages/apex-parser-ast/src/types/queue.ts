/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Deferred, Effect, Fiber, Queue, Ref, Scope } from 'effect';

export const enum Priority {
  Immediate = 0,
  High = 1,
  Normal = 2,
  Low = 3,
  Background = 4,
}

export const AllPriorities = [
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
}

export interface PriorityScheduler {
  offer: <A, E, R>(
    priority: Priority,
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

// Internal state types for scheduler implementation
export interface SchedulerInternalState {
  readonly queues: ReadonlyMap<
    Priority,
    Queue.Queue<QueuedItem<unknown, unknown, unknown>>
  >;
  readonly tasksStarted: Ref.Ref<number>;
  readonly tasksCompleted: Ref.Ref<number>;
  readonly tasksDropped: Ref.Ref<number>;
  readonly shutdownSignal: Deferred.Deferred<void, void>;
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
