/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, Fiber } from 'effect';

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

export interface ScheduledTask {
  readonly fiber: Effect.Effect<Fiber.RuntimeFiber<any, any>, never>;
  readonly requestType?: string;
}

export interface SchedulerMetrics {
  readonly queueSizes: Readonly<Record<Priority, number>>;
  readonly tasksStarted: number;
  readonly tasksCompleted: number;
  readonly tasksDropped: number;
}

export interface PriorityScheduler {
  offer: <A>(
    prio: Priority,
    task: Effect.Effect<A>,
    requestType?: string,
  ) => Effect.Effect<ScheduledTask>;
  metrics: Effect.Effect<SchedulerMetrics>;
  shutdown: Effect.Effect<void>;
}

export interface PrioritySchedulerConfigShape {
  queueCapacity: number;
  maxHighPriorityStreak: number;
  idleSleepMs: number;
}
