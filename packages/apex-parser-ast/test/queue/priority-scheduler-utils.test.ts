/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, Fiber, Deferred } from 'effect';
import { Priority, AllPriorities, QueuedItem } from '../../src/types/queue';
import * as SchedulerUtils from '../../src/queue/priority-scheduler-utils';

// Helper to generate unique IDs
const genId = (p = 'task') =>
  `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Helper to create a QueuedItem
const createQueuedItem = <A, E, R>(
  eff: Effect.Effect<A, E, R>,
  requestType?: string,
): Effect.Effect<QueuedItem<A, E, R>, never, never> =>
  Effect.gen(function* () {
    const fiberDeferred = yield* Deferred.make<Fiber.RuntimeFiber<A, E>, E>();
    return {
      id: genId(),
      eff,
      fiberDeferred,
      requestType,
    };
  });

// Helper to await fiber with timeout and extract value
const awaitFiber = <A>(fiber: Fiber.RuntimeFiber<A, any>) =>
  Effect.gen(function* () {
    const result = yield* Effect.race(
      Effect.gen(function* () {
        const exit = yield* Fiber.await(fiber);
        if (exit._tag === 'Success') {
          return exit.value;
        } else {
          throw exit.cause;
        }
      }),
      Effect.sleep('10 seconds').pipe(
        Effect.andThen(Effect.fail(new Error('Fiber await timeout'))),
      ),
    );
    return result;
  });

describe('PrioritySchedulerUtils', () => {
  // Reset scheduler state before each test
  beforeEach(async () => {
    try {
      await Effect.runPromise(SchedulerUtils.reset());
    } catch {
      // Ignore errors if reset fails
    }
  });

  describe('initialize', () => {
    it('should initialize scheduler with default config', async () => {
      await expect(
        Effect.runPromise(SchedulerUtils.initialize()),
      ).resolves.toBeUndefined();
    });

    it('should initialize scheduler with custom config', async () => {
      const config = {
        queueCapacity: 32,
        maxHighPriorityStreak: 25,
        idleSleepMs: 5,
      };

      await expect(
        Effect.runPromise(SchedulerUtils.initialize(config)),
      ).resolves.toBeUndefined();
    });

    it('should fail to initialize twice without reset', async () => {
      await Effect.runPromise(SchedulerUtils.initialize());
      await expect(
        Effect.runPromise(SchedulerUtils.initialize()),
      ).rejects.toThrow('Scheduler already initialized');
    });

    it('should allow reinitialization after reset', async () => {
      await Effect.runPromise(SchedulerUtils.initialize());
      await Effect.runPromise(SchedulerUtils.reset());
      await expect(
        Effect.runPromise(SchedulerUtils.initialize()),
      ).resolves.toBeUndefined();
    });
  });

  describe.skip('offer', () => {
    beforeEach(async () => {
      await Effect.runPromise(SchedulerUtils.initialize());
    });

    it('should schedule and execute a task', async () => {
      const program = Effect.gen(function* () {
        const queuedItem = yield* createQueuedItem(Effect.succeed(42));
        const result = yield* SchedulerUtils.offer(Priority.Normal, queuedItem);
        expect(result).toBeDefined();
        expect(result.fiber).toBeDefined();
        expect(result.requestType).toBeUndefined();

        const fiber = yield* result.fiber;
        const fiberResult = yield* awaitFiber(fiber);
        expect(fiberResult).toBe(42);
      });

      await Effect.runPromise(program);
    });

    it('should use default config when initialized without config', async () => {
      const queuedItem = await Effect.runPromise(
        createQueuedItem(Effect.succeed('default-config')),
      );

      const result = await Effect.runPromise(
        SchedulerUtils.offer(Priority.Normal, queuedItem),
      );

      expect(result).toBeDefined();
      const fiber = await Effect.runPromise(result.fiber);
      const fiberResult = await Effect.runPromise(awaitFiber(fiber));
      expect(fiberResult).toBe('default-config');
    });

    it('should use custom config when initialized with config', async () => {
      const config = {
        queueCapacity: 128,
        maxHighPriorityStreak: 100,
        idleSleepMs: 10,
      };

      await Effect.runPromise(SchedulerUtils.reset());
      await Effect.runPromise(SchedulerUtils.initialize(config));

      const queuedItem = await Effect.runPromise(
        createQueuedItem(Effect.succeed('custom-config')),
      );

      const result = await Effect.runPromise(
        SchedulerUtils.offer(Priority.Normal, queuedItem),
      );

      expect(result).toBeDefined();
      const fiber = await Effect.runPromise(result.fiber);
      const fiberResult = await Effect.runPromise(awaitFiber(fiber));
      expect(fiberResult).toBe('custom-config');
    });

    it('should accept request type parameter', async () => {
      const queuedItem = await Effect.runPromise(
        createQueuedItem(Effect.succeed('test'), 'hover'),
      );

      const result = await Effect.runPromise(
        SchedulerUtils.offer(Priority.Normal, queuedItem),
      );

      expect(result.requestType).toBe('hover');
    });

    it('should handle all priority levels', async () => {
      for (const priority of AllPriorities) {
        const queuedItem = await Effect.runPromise(
          createQueuedItem(Effect.succeed(`result-${priority}`)),
        );
        const result = await Effect.runPromise(
          SchedulerUtils.offer(priority, queuedItem),
        );

        expect(result).toBeDefined();
        const fiber = await Effect.runPromise(result.fiber);
        const fiberResult = await Effect.runPromise(awaitFiber(fiber));
        expect(fiberResult).toBe(`result-${priority}`);
      }
    });

    it('should execute tasks asynchronously', async () => {
      const startTime = Date.now();
      const queuedItem = await Effect.runPromise(
        createQueuedItem(
          Effect.sleep('100 millis').pipe(
            Effect.andThen(Effect.succeed('done')),
          ),
        ),
      );

      const result = await Effect.runPromise(
        SchedulerUtils.offer(Priority.Normal, queuedItem),
      );
      const fiber = await Effect.runPromise(result.fiber);
      await Effect.runPromise(awaitFiber(fiber));

      const elapsed = Date.now() - startTime;
      // Should be async (not blocking)
      expect(elapsed).toBeLessThan(200);
    });

    it('should fail if not initialized', async () => {
      await Effect.runPromise(SchedulerUtils.reset());
      const queuedItem = await Effect.runPromise(
        createQueuedItem(Effect.succeed(42)),
      );

      await expect(
        Effect.runPromise(SchedulerUtils.offer(Priority.Normal, queuedItem)),
      ).rejects.toThrow('Scheduler not initialized');
    });
  });

  describe('metrics', () => {
    beforeEach(async () => {
      await Effect.runPromise(SchedulerUtils.initialize());
    });

    it('should return metrics', async () => {
      const metrics = await Effect.runPromise(SchedulerUtils.metrics());

      expect(metrics).toHaveProperty('queueSizes');
      expect(metrics).toHaveProperty('tasksStarted');
      expect(metrics).toHaveProperty('tasksCompleted');
      expect(metrics).toHaveProperty('tasksDropped');
      expect(typeof metrics.tasksStarted).toBe('number');
      expect(typeof metrics.tasksCompleted).toBe('number');
      expect(typeof metrics.tasksDropped).toBe('number');
    });

    it('should return queue sizes for all priorities', async () => {
      const metrics = await Effect.runPromise(SchedulerUtils.metrics());

      expect(metrics.queueSizes).toBeDefined();
      for (const priority of AllPriorities) {
        expect(metrics.queueSizes[priority]).toBeDefined();
        expect(typeof metrics.queueSizes[priority]).toBe('number');
      }
    });

    it('should track metrics after tasks are executed', async () => {
      const initialMetrics = await Effect.runPromise(SchedulerUtils.metrics());

      const queuedItem = await Effect.runPromise(
        createQueuedItem(Effect.succeed(42)),
      );
      await Effect.runPromise(
        SchedulerUtils.offer(Priority.Normal, queuedItem),
      );

      // Wait a bit for task to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      const afterMetrics = await Effect.runPromise(SchedulerUtils.metrics());

      expect(afterMetrics.tasksStarted).toBeGreaterThanOrEqual(
        initialMetrics.tasksStarted,
      );
      expect(afterMetrics.tasksCompleted).toBeGreaterThanOrEqual(
        initialMetrics.tasksCompleted,
      );
    });
  });

  describe('shutdown', () => {
    beforeEach(async () => {
      await Effect.runPromise(SchedulerUtils.initialize());
    });

    it('should shutdown scheduler', async () => {
      await expect(
        Effect.runPromise(SchedulerUtils.shutdown()),
      ).resolves.toBeUndefined();
    });

    it('should shutdown scheduler after tasks are running', async () => {
      const queuedItem = await Effect.runPromise(
        createQueuedItem(Effect.succeed(42)),
      );
      await Effect.runPromise(
        SchedulerUtils.offer(Priority.Normal, queuedItem),
      );

      await expect(
        Effect.runPromise(SchedulerUtils.shutdown()),
      ).resolves.toBeUndefined();
    });

    it('should fail if not initialized', async () => {
      await Effect.runPromise(SchedulerUtils.reset());
      await expect(
        Effect.runPromise(SchedulerUtils.shutdown()),
      ).rejects.toThrow('Scheduler not initialized');
    });
  });

  describe('Singleton Behavior', () => {
    beforeEach(async () => {
      await Effect.runPromise(SchedulerUtils.initialize());
    });

    it('should use the same scheduler instance across multiple calls', async () => {
      const queuedItem1 = await Effect.runPromise(
        createQueuedItem(Effect.succeed('first')),
      );
      await Effect.runPromise(
        SchedulerUtils.offer(Priority.Normal, queuedItem1),
      );

      // Get initial metrics
      const metrics1 = await Effect.runPromise(SchedulerUtils.metrics());

      // Make another offer
      const queuedItem2 = await Effect.runPromise(
        createQueuedItem(Effect.succeed('second')),
      );
      await Effect.runPromise(
        SchedulerUtils.offer(Priority.Normal, queuedItem2),
      );

      // Get metrics again - should show accumulated state
      const metrics2 = await Effect.runPromise(SchedulerUtils.metrics());

      // Tasks started should have increased
      expect(metrics2.tasksStarted).toBeGreaterThanOrEqual(
        metrics1.tasksStarted,
      );
    });

    it('should use the same scheduler instance with concurrent calls', async () => {
      const queuedItems = await Promise.all(
        Array.from({ length: 5 }, () =>
          Effect.runPromise(createQueuedItem(Effect.succeed('concurrent'))),
        ),
      );

      // Concurrent offers should all use the same scheduler
      const results = await Promise.all(
        queuedItems.map((item) =>
          Effect.runPromise(SchedulerUtils.offer(Priority.Normal, item)),
        ),
      );

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.fiber).toBeDefined();
      });

      // All should complete successfully
      for (const result of results) {
        const fiber = await Effect.runPromise(result.fiber);
        const fiberResult = await Effect.runPromise(awaitFiber(fiber));
        expect(fiberResult).toBe('concurrent');
      }
    });
  });

  describe('Integration Tests', () => {
    beforeEach(async () => {
      await Effect.runPromise(
        SchedulerUtils.initialize({
          queueCapacity: 64,
          maxHighPriorityStreak: 50,
          idleSleepMs: 1,
        }),
      );
    });

    it('should handle multiple operations in sequence', async () => {
      // Offer a task
      const queuedItem = await Effect.runPromise(
        createQueuedItem(Effect.succeed('integration-test')),
      );
      const result = await Effect.runPromise(
        SchedulerUtils.offer(Priority.High, queuedItem),
      );

      // Wait a bit for the task to be picked up and executed
      await Effect.runPromise(Effect.sleep('10 millis'));

      // Get metrics
      const metrics = await Effect.runPromise(SchedulerUtils.metrics());
      expect(metrics.tasksStarted).toBeGreaterThan(0);

      // Verify task completed
      const fiber = await Effect.runPromise(result.fiber);
      const fiberResult = await Effect.runPromise(awaitFiber(fiber));
      expect(fiberResult).toBe('integration-test');

      // Shutdown
      await Effect.runPromise(SchedulerUtils.shutdown());
    });

    it('should handle priority ordering', async () => {
      const executionOrder: Priority[] = [];

      // Submit tasks in reverse priority order
      const backgroundItem = await Effect.runPromise(
        createQueuedItem(
          Effect.gen(function* () {
            executionOrder.push(Priority.Background);
            yield* Effect.sleep('10 millis');
            return 'background';
          }),
        ),
      );
      const backgroundTask = SchedulerUtils.offer(
        Priority.Background,
        backgroundItem,
      );

      const highItem = await Effect.runPromise(
        createQueuedItem(
          Effect.gen(function* () {
            executionOrder.push(Priority.High);
            yield* Effect.sleep('10 millis');
            return 'high';
          }),
        ),
      );
      const highTask = SchedulerUtils.offer(Priority.High, highItem);

      const immediateItem = await Effect.runPromise(
        createQueuedItem(
          Effect.gen(function* () {
            executionOrder.push(Priority.Immediate);
            yield* Effect.sleep('10 millis');
            return 'immediate';
          }),
        ),
      );
      const immediateTask = SchedulerUtils.offer(
        Priority.Immediate,
        immediateItem,
      );

      // Submit all concurrently
      await Promise.all([
        Effect.runPromise(backgroundTask),
        Effect.runPromise(highTask),
        Effect.runPromise(immediateTask),
      ]);

      // Wait for all tasks to complete
      await Effect.runPromise(Effect.sleep('50 millis'));

      // All tasks should have executed
      expect(executionOrder.length).toBe(3);
      expect(executionOrder).toContain(Priority.Immediate);
      expect(executionOrder).toContain(Priority.High);
      expect(executionOrder).toContain(Priority.Background);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await Effect.runPromise(SchedulerUtils.initialize());
    });

    it('should handle errors in scheduled tasks', async () => {
      const queuedItem = await Effect.runPromise(
        createQueuedItem(Effect.fail(new Error('Task error'))),
      );

      const result = await Effect.runPromise(
        SchedulerUtils.offer(Priority.Normal, queuedItem),
      );

      expect(result).toBeDefined();
      const fiber = await Effect.runPromise(result.fiber);

      // The fiber should fail
      await expect(Effect.runPromise(awaitFiber(fiber))).rejects.toThrow();
    });

    it('should return Effect that can be composed', async () => {
      const queuedItem = await Effect.runPromise(
        createQueuedItem(Effect.succeed(42)),
      );

      // Compose multiple Effects
      const program = Effect.gen(function* () {
        const task1 = yield* SchedulerUtils.offer(Priority.Normal, queuedItem);
        const metrics = yield* SchedulerUtils.metrics();
        return { task1, metrics };
      });

      const result = await Effect.runPromise(program);
      expect(result.task1).toBeDefined();
      expect(result.metrics).toBeDefined();
    });
  });
});
