/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
// src/queue/priority-scheduler-oo.ts
import { Effect, Layer } from 'effect';
import { Priority, QueuedItem, ScheduledTask } from '../types/queue';
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
  offer<A = never, E = never, R = never>(
    priority: Priority,
    queuedItem: QueuedItem<A, E, R>,
  ): Promise<ScheduledTask<A, E, R>> {
    return Effect.runPromise(
      Effect.gen(function* () {
        const scheduler = yield* PrioritySchedulerService;
        return yield* scheduler.offer(priority, queuedItem);
      }).pipe(Effect.provide(this.layer)),
    );
  }

  /** Get metrics */
  metrics(): Promise<any> {
    return Effect.runPromise(
      Effect.gen(function* () {
        const scheduler = yield* PrioritySchedulerService;
        return yield* scheduler.metrics;
      }).pipe(Effect.provide(this.layer)),
    );
  }

  /** Shutdown scheduler */
  shutdown(): Promise<void> {
    return Effect.runPromise(
      Effect.gen(function* () {
        const scheduler = yield* PrioritySchedulerService;
        return yield* scheduler.shutdown;
      }).pipe(Effect.provide(this.layer)),
    );
  }
}
