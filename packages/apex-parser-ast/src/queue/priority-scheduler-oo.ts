/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
// src/queue/priority-scheduler-oo.ts
import { Effect, Layer } from 'effect';
import { Priority, ScheduledTask } from '../types/queue';
import {
  PrioritySchedulerLive,
  PrioritySchedulerService,
} from './priority-scheduler';
import { PrioritySchedulerConfig } from './priority-scheduler-config';

export class PrioritySchedulerOO {
  private readonly layer: Layer.Layer<PrioritySchedulerService, never, never>;

  constructor(config: {
    queueCapacity: number;
    maxHighPriorityStreak: number;
    idleSleepMs: number;
  }) {
    // Build a layer with config injected into the live scheduler
    const configLayer = Layer.succeed(PrioritySchedulerConfig, config);
    this.layer = PrioritySchedulerLive.pipe(Layer.provide(configLayer));
  }

  /** Schedule a task */
  offer<A>(
    priority: Priority,
    eff: Effect.Effect<A>,
    requestType?: string,
  ): Promise<ScheduledTask> {
    return Effect.runPromise(
      Effect.gen(function* () {
        const sched = yield* PrioritySchedulerService;
        return yield* sched.offer(priority, eff, requestType);
      }).pipe(Effect.provide(this.layer)),
    );
  }

  /** Get metrics */
  metrics(): Promise<any> {
    return Effect.runPromise(
      Effect.gen(function* () {
        const sched = yield* PrioritySchedulerService;
        return yield* sched.metrics;
      }).pipe(Effect.provide(this.layer)),
    );
  }

  /** Shutdown scheduler */
  shutdown(): Promise<void> {
    return Effect.runPromise(
      Effect.gen(function* () {
        const sched = yield* PrioritySchedulerService;
        return yield* sched.shutdown;
      }).pipe(Effect.provide(this.layer)),
    );
  }
}
