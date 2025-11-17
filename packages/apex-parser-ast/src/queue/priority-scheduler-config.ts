/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Context, Config, Layer } from 'effect';

export class PrioritySchedulerConfig extends Context.Tag(
  'PrioritySchedulerConfig',
)<
  PrioritySchedulerConfig,
  {
    readonly queueCapacity: number; // per-priority queue capacity
    readonly maxHighPriorityStreak: number; // starvation relief threshold
    readonly idleSleepMs: number; // controller idle sleep
  }
>() {}

export const PrioritySchedulerConfigLive = Layer.effect(
  PrioritySchedulerConfig,
  Config.all({
    queueCapacity: Config.number('SCHED_QUEUE_CAPACITY').pipe(
      Config.withDefault(64),
    ),
    maxHighPriorityStreak: Config.number('SCHED_MAX_STREAK').pipe(
      Config.withDefault(50),
    ),
    idleSleepMs: Config.number('SCHED_IDLE_SLEEP_MS').pipe(
      Config.withDefault(1),
    ),
  }),
);
