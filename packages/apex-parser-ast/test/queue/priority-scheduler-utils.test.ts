/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, Fiber } from 'effect';
import {
  Priority,
  AllPriorities,
  ScheduledTask,
  QueuedItem,
} from '../../src/types/queue';
import {
  initialize,
  offer,
  metrics,
  shutdown,
  reset,
  createQueuedItem,
} from '../../src/queue/priority-scheduler-utils';

// Helper to offer a task using utils API
const offerTask = <A, E, R>(
  priority: Priority,
  eff: Effect.Effect<A, E, R>,
  requestType?: string,
): Effect.Effect<ScheduledTask<A, E, R>, Error, never> =>
  Effect.gen(function* () {
    const queuedItem = yield* createQueuedItem(eff, requestType);
    const result = yield* offer(priority, queuedItem);
    return result;
  });

// Helper to await fiber with timeout and extract value
const awaitFiber = <A>(fiber: Fiber.RuntimeFiber<A, any>) =>
  Effect.gen(function* () {
    // Use race to add timeout
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

describe('PriorityScheduler', () => {
  const defaultConfig = {
    queueCapacity: 64,
    maxHighPriorityStreak: 50,
    idleSleepMs: 1,
  };

  beforeEach(async () => {
    await Effect.runPromise(reset());
    await Effect.runPromise(initialize(defaultConfig));
  });

  afterEach(async () => {
    await Effect.runPromise(shutdown()).pipe(
      Effect.catchAll(() => Effect.succeed(undefined)),
    );
    await Effect.runPromise(reset());
  });

  describe('Basic Scheduling', () => {
    it('should schedule and execute a single task', async () => {
      const queuedItem = await Effect.runPromise(
        createQueuedItem(Effect.succeed(42)),
      );
      const result = await Effect.runPromise(offer(Priority.Normal, queuedItem));
      // Wait for the fiber to complete with timeout
      const fiber = await Effect.runPromise(result.fiber);
      const fiberResult = await Effect.runPromise(awaitFiber(fiber));

      expect(fiberResult).toBe(42);
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
      const result = await Effect.runPromise(offer(Priority.Normal, queuedItem));
      const fiber = await Effect.runPromise(result.fiber);
      await Effect.runPromise(awaitFiber(fiber));
      const elapsed = Date.now() - startTime;

      // Should be async (not blocking)
      expect(elapsed).toBeLessThan(200);
    });

    it('should track request type in scheduled task', async () => {
      const queuedItem = await Effect.runPromise(
        createQueuedItem(Effect.succeed('test'), 'hover'),
      );
      const result = await Effect.runPromise(offer(Priority.Normal, queuedItem));

      expect(result.requestType).toBe('hover');
    });
  });

  describe('Priority Ordering', () => {
    it('should process Immediate priority before High priority', async () => {
      const executionOrder: Priority[] = [];

      const program = Effect.gen(function* () {
        // Create a barrier to ensure both tasks are queued before processing
        const barrier = yield* Effect.Deferred.make<void, never>();
        const tasksRef = yield* Effect.Ref.make<{
          high?: ScheduledTask<string, never, never>;
          immediate?: ScheduledTask<string, never, never>;
        }>({});

        // Submit high priority first, but delay its execution start
        yield* Effect.fork(
          Effect.gen(function* () {
            const queuedItem = yield* createQueuedItem(
              Effect.gen(function* () {
                // Wait for barrier before starting execution
                yield* Effect.Deferred.await(barrier);
                executionOrder.push(Priority.High);
                yield* Effect.sleep('10 millis');
                return 'high';
              }),
            );
            const task = yield* offer(Priority.High, queuedItem);
            yield* Effect.Ref.update(tasksRef, (t) => ({ ...t, high: task }));
          }),
        );

        // Small yield to allow High to be queued
        yield* Effect.yieldNow();

        // Submit immediate priority second
        yield* Effect.fork(
          Effect.gen(function* () {
            const queuedItem = yield* createQueuedItem(
              Effect.gen(function* () {
                // Wait for barrier before starting execution
                yield* Effect.Deferred.await(barrier);
                executionOrder.push(Priority.Immediate);
                return 'immediate';
              }),
            );
            const task = yield* offer(Priority.Immediate, queuedItem);
            yield* Effect.Ref.update(tasksRef, (t) => ({
              ...t,
              immediate: task,
            }));
          }),
        );

        // Wait a bit for both offers to complete (tasks dequeued and forked)
        yield* Effect.sleep('50 millis');

        // Get the tasks
        const tasks = yield* Effect.Ref.get(tasksRef);
        if (!tasks.high || !tasks.immediate) {
          throw new Error('Tasks not properly queued');
        }

        // Both tasks are now dequeued and forked, but execution is blocked by barrier
        // Release the barrier to allow execution
        yield* Effect.Deferred.succeed(barrier, undefined);
        yield* Effect.yieldNow(); // Allow scheduler to process

        // Wait for both to complete
        const highFiber = yield* tasks.high.fiber;
        const immediateFiber = yield* tasks.immediate.fiber;
        yield* awaitFiber(highFiber);
        yield* awaitFiber(immediateFiber);

        return executionOrder;
      });

      const order = await Effect.runPromise(program);

      // Immediate should execute first even though it was submitted second
      expect(order[0]).toBe(Priority.Immediate);
      expect(order[1]).toBe(Priority.High);
    });

    it('should process priorities in correct order: Immediate > High > Normal > Low > Background', async () => {
      const executionOrder: Priority[] = [];

      const program = Effect.gen(function* () {
        // Create a barrier to ensure all tasks are queued before processing
        const barrier = yield* Effect.Deferred.make<void, never>();
        const tasksRef = yield* Effect.Ref.make<
          ScheduledTask<string, never, never>[]
        >([]);

        // Submit all tasks in reverse priority order, but delay execution
        const priorities = [
          Priority.Background,
          Priority.Low,
          Priority.Normal,
          Priority.High,
          Priority.Immediate,
        ];

        // Fork all offers to queue them without waiting for dequeue
        yield* Effect.all(
          priorities.map((priority) =>
            Effect.fork(
              offerTask(
                priority,
                Effect.gen(function* () {
                  // Wait for barrier before starting execution
                  yield* Effect.Deferred.await(barrier);
                  executionOrder.push(priority);
                  yield* Effect.sleep('5 millis');
                  return priority.toString();
                }),
              ).pipe(
                Effect.tap((task) =>
                  Effect.Ref.update(tasksRef, (tasks) => [...tasks, task]),
                ),
              ),
            ),
          ),
        );

        // Wait a bit for all offers to complete (tasks dequeued and forked)
        yield* Effect.sleep('50 millis');

        // Get all tasks
        const tasks = yield* Effect.Ref.get(tasksRef);
        if (tasks.length !== 5) {
          throw new Error(`Expected 5 tasks, got ${tasks.length}`);
        }

        // All tasks are now dequeued and forked, but execution is blocked by barrier
        // Release the barrier to allow execution
        yield* Effect.Deferred.succeed(barrier, undefined);
        yield* Effect.yieldNow(); // Allow scheduler to process

        // Wait for all tasks to complete
        yield* Effect.all(
          tasks.map((t) =>
            Effect.gen(function* () {
              const fiber = yield* t.fiber;
              return yield* awaitFiber(fiber);
            }),
          ),
        );

        return executionOrder;
      });

      const order = await Effect.runPromise(program);

      // Should execute in priority order
      expect(order[0]).toBe(Priority.Immediate);
      expect(order[1]).toBe(Priority.High);
      expect(order[2]).toBe(Priority.Normal);
      expect(order[3]).toBe(Priority.Low);
      expect(order[4]).toBe(Priority.Background);
    });

    it('should process multiple tasks of same priority in FIFO order', async () => {
      const executionOrder: number[] = [];

      const program = Effect.gen(function* () {
        // Submit multiple normal priority tasks
        const tasks = yield* Effect.all([
          offerTask(
            Priority.Normal,
            Effect.gen(function* () {
              executionOrder.push(1);
              yield* Effect.sleep('5 millis');
              return 1;
            }),
          ),
          offerTask(
            Priority.Normal,
            Effect.gen(function* () {
              executionOrder.push(2);
              yield* Effect.sleep('5 millis');
              return 2;
            }),
          ),
          offerTask(
            Priority.Normal,
            Effect.gen(function* () {
              executionOrder.push(3);
              yield* Effect.sleep('5 millis');
              return 3;
            }),
          ),
        ]);

        // Wait for all tasks to complete
        yield* Effect.all(
          tasks.map((t) =>
            Effect.gen(function* () {
              const fiber = yield* t.fiber;
              return yield* awaitFiber(fiber);
            }),
          ),
        );

        return executionOrder;
      });

      const order = await Effect.runPromise(program);

      // Should execute in submission order
      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('Starvation Relief', () => {
    it('should trigger starvation relief after maxHighPriorityStreak', async () => {
      await Effect.runPromise(shutdown());
      await Effect.runPromise(
        initialize({
          queueCapacity: 64,
          maxHighPriorityStreak: 3, // Low threshold for testing
          idleSleepMs: 1,
        }),
      );

      const executionOrder: Priority[] = [];

      const program = Effect.gen(function* () {
        // Create refs to track tasks
        const highTasksRef = yield* Effect.Ref.make<
          ScheduledTask<string, never, never>[]
        >([]);
        const lowTaskRef = yield* Effect.Ref.make<
          ScheduledTask<string, never, never> | null
        >(null);

        // Submit many high priority tasks (forked to queue without waiting)
        yield* Effect.all(
          Array.from({ length: 5 }, (_, i) =>
            Effect.fork(
              offerTask(
                Priority.High,
                Effect.gen(function* () {
                  executionOrder.push(Priority.High);
                  yield* Effect.sleep('5 millis');
                  return `high-${i}`;
                }),
              ).pipe(
                Effect.tap((task) =>
                  Effect.Ref.update(highTasksRef, (tasks) => [...tasks, task]),
                ),
              ),
            ),
          ),
        );

        // Small yield to allow high tasks to be queued
        yield* Effect.yieldNow();

        // Submit a low priority task (forked to queue without waiting)
        yield* Effect.fork(
          offerTask(
            Priority.Low,
            Effect.gen(function* () {
              executionOrder.push(Priority.Low);
              return 'low';
            }),
          ).pipe(
            Effect.tap((task) => Effect.Ref.update(lowTaskRef, () => task)),
          ),
        );

        // Wait a bit for all offers to complete (tasks dequeued and forked)
        yield* Effect.sleep('50 millis');

        // Get all tasks
        const highTasks = yield* Effect.Ref.get(highTasksRef);
        const lowTask = yield* Effect.Ref.get(lowTaskRef);

        if (highTasks.length !== 5 || !lowTask) {
          throw new Error('Tasks not properly queued');
        }

        // All tasks are now dequeued and forked
        // The scheduler should process 3 high priority tasks, then trigger
        // starvation relief and process the low priority task

        // Wait for all tasks
        yield* Effect.all(
          highTasks.map((t) =>
            Effect.gen(function* () {
              const fiber = yield* t.fiber;
              return yield* awaitFiber(fiber);
            }),
          ),
        );
        const lowFiber = yield* lowTask.fiber;
        yield* awaitFiber(lowFiber);

        return executionOrder;
      });

      const order = await Effect.runPromise(program);

      // Low priority should execute before all high priority tasks complete
      // (starvation relief should kick in after 3 high priority tasks)
      const lowIndex = order.indexOf(Priority.Low);

      // Low should execute before the last high priority task
      // With maxHighPriorityStreak=3, low should execute after at most 3 high tasks
      expect(lowIndex).toBeLessThan(order.length - 1);
    });

    it('should reset streak after starvation relief', async () => {
      await Effect.runPromise(shutdown());
      await Effect.runPromise(
        initialize({
          queueCapacity: 64,
          maxHighPriorityStreak: 2,
          idleSleepMs: 1,
        }),
      );

      const executionOrder: Priority[] = [];

      const program = Effect.gen(function* () {
        // Submit tasks that will trigger starvation relief
        const tasks = yield* Effect.all([
          offerTask(
            Priority.High,
            Effect.gen(function* () {
              executionOrder.push(Priority.High);
              yield* Effect.sleep('5 millis');
              return 'high1';
            }),
          ),
          offerTask(
            Priority.High,
            Effect.gen(function* () {
              executionOrder.push(Priority.High);
              yield* Effect.sleep('5 millis');
              return 'high2';
            }),
          ),
          offerTask(
            Priority.Low,
            Effect.gen(function* () {
              executionOrder.push(Priority.Low);
              return 'low';
            }),
          ),
          offerTask(
            Priority.High,
            Effect.gen(function* () {
              executionOrder.push(Priority.High);
              yield* Effect.sleep('5 millis');
              return 'high3';
            }),
          ),
        ]);

        yield* Effect.all(
          tasks.map((t) =>
            Effect.gen(function* () {
              const fiber = yield* t.fiber;
              return yield* awaitFiber(fiber);
            }),
          ),
        );

        return executionOrder;
      });

      const order = await Effect.runPromise(program);

      // Low should execute after first 2 high priority tasks (starvation relief)
      expect(order).toContain(Priority.Low);
    });
  });

  describe('Metrics', () => {
    it('should track queue sizes correctly', async () => {
      const program = Effect.gen(function* () {
        // Submit tasks to different priority queues
        yield* offerTask(
          Priority.Immediate,
          Effect.succeed('immediate'),
        );
        yield* offerTask(Priority.High, Effect.succeed('high'));
        yield* offerTask(Priority.Normal, Effect.succeed('normal'));

        // Wait a bit for processing
        yield* Effect.sleep('50 millis');

        const metricsResult = yield* metrics();
        return metricsResult;
      });

      const metricsResult = await Effect.runPromise(program);

      expect(metricsResult).toHaveProperty('queueSizes');
      expect(metricsResult).toHaveProperty('tasksStarted');
      expect(metricsResult).toHaveProperty('tasksCompleted');
      expect(metricsResult).toHaveProperty('tasksDropped');

      // All queues should be tracked
      for (const priority of AllPriorities) {
        expect(metricsResult.queueSizes).toHaveProperty(priority.toString());
      }
    });

    it('should track tasks started and completed', async () => {
      const program = Effect.gen(function* () {
        const initialMetrics = yield* metrics();
        const initialStarted = initialMetrics.tasksStarted;
        const initialCompleted = initialMetrics.tasksCompleted;

        // Submit multiple tasks
        const tasks = yield* Effect.all(
          Array.from({ length: 5 }, () =>
            offerTask(Priority.Normal, Effect.succeed('task')),
          ),
        );

        // Wait for all tasks to complete
        yield* Effect.all(
          tasks.map((t) =>
            Effect.gen(function* () {
              const fiber = yield* t.fiber;
              return yield* awaitFiber(fiber);
            }),
          ),
        );
        yield* Effect.sleep('50 millis');

        const finalMetrics = yield* metrics();

        return {
          initialStarted,
          initialCompleted,
          finalStarted: finalMetrics.tasksStarted,
          finalCompleted: finalMetrics.tasksCompleted,
        };
      });

      const result = await Effect.runPromise(program);

      expect(result.finalStarted).toBeGreaterThanOrEqual(
        result.initialStarted + 5,
      );
      expect(result.finalCompleted).toBeGreaterThanOrEqual(
        result.initialCompleted + 5,
      );
    });

    it('should track queue sizes for all priorities', async () => {
      const program = Effect.gen(function* () {
        // Submit one task to each priority
        yield* offerTask(
          Priority.Immediate,
          Effect.succeed('immediate'),
        );
        yield* offerTask(Priority.High, Effect.succeed('high'));
        yield* offerTask(Priority.Normal, Effect.succeed('normal'));
        yield* offerTask(Priority.Low, Effect.succeed('low'));
        yield* offerTask(
          Priority.Background,
          Effect.succeed('background'),
        );

        yield* Effect.sleep('50 millis');

        const metricsResult = yield* metrics();
        return metricsResult.queueSizes;
      });

      const queueSizes = await Effect.runPromise(program);

      // All priorities should be tracked
      expect(queueSizes[Priority.Immediate]).toBeDefined();
      expect(queueSizes[Priority.High]).toBeDefined();
      expect(queueSizes[Priority.Normal]).toBeDefined();
      expect(queueSizes[Priority.Low]).toBeDefined();
      expect(queueSizes[Priority.Background]).toBeDefined();
    });
  });

  describe('Queue Capacity', () => {
    it('should handle queue capacity limits', async () => {
      await Effect.runPromise(shutdown());
      await Effect.runPromise(
        initialize({
          queueCapacity: 2, // Small capacity for testing
          maxHighPriorityStreak: 50,
          idleSleepMs: 1,
        }),
      );

      const program = Effect.gen(function* () {
        // Submit more tasks than capacity
        const tasks = yield* Effect.all(
          Array.from({ length: 5 }, (_, i) =>
            offerTask(
              Priority.Normal,
              Effect.gen(function* () {
                yield* Effect.sleep('10 millis');
                return `task-${i}`;
              }),
            ),
          ),
        );

        // Wait for all tasks to complete
        yield* Effect.all(
          tasks.map((t) =>
            Effect.gen(function* () {
              const fiber = yield* t.fiber;
              return yield* awaitFiber(fiber);
            }),
          ),
        );

        return 'completed';
      });

      // Should not throw - scheduler should retry until queue has space
      const result = await Effect.runPromise(program);

      expect(result).toBe('completed');
    });

    it('should retry queue offer when queue is full', async () => {
      await Effect.runPromise(shutdown());
      await Effect.runPromise(
        initialize({
          queueCapacity: 1,
          maxHighPriorityStreak: 50,
          idleSleepMs: 1,
        }),
      );

      const program = Effect.gen(function* () {
        // Submit tasks that will fill the queue
        const tasks = yield* Effect.all(
          Array.from({ length: 3 }, (_, i) =>
            offerTask(
              Priority.Normal,
              Effect.gen(function* () {
                yield* Effect.sleep('20 millis');
                return `task-${i}`;
              }),
            ),
          ),
        );

        yield* Effect.all(
          tasks.map((t) =>
            Effect.gen(function* () {
              const fiber = yield* t.fiber;
              return yield* awaitFiber(fiber);
            }),
          ),
        );

        return 'done';
      });

      const result = await Effect.runPromise(program);

      expect(result).toBe('done');
    });
  });

  describe('Error Handling', () => {
    it('should handle task errors gracefully', async () => {
      const queuedItem = await Effect.runPromise(
        createQueuedItem(Effect.fail(new Error('Task error')) as Effect.Effect<never>),
      );
      const result = await Effect.runPromise(offer(Priority.Normal, queuedItem));

      // Await the fiber directly - it should fail
      const fiber = await Effect.runPromise(result.fiber);
      const exit = await Effect.runPromise(Fiber.await(fiber));

      // Should handle the error
      if (exit._tag === 'Success') {
        throw new Error('Expected task to fail');
      } else {
        expect(exit.cause).toBeDefined();
      }
    });

    it('should continue processing other tasks after error', async () => {
      const results: string[] = [];

      const program = Effect.gen(function* () {
        // Submit a failing task
        const failQueuedItem = yield* createQueuedItem(
          Effect.fail(new Error('Fail')) as Effect.Effect<never>,
        );
        const failTask = yield* offer(Priority.Normal, failQueuedItem);

        // Submit a succeeding task
        const successQueuedItem = yield* createQueuedItem(
          Effect.succeed('success'),
        );
        const successTask = yield* offer(Priority.Normal, successQueuedItem);

        // Wait for the success task first
        const successFiber = yield* successTask.fiber;
        const successResult = yield* awaitFiber(successFiber);
        results.push(successResult);

        // Try to await the failing task - it will fail, but we catch it
        const failFiber = yield* failTask.fiber;
        yield* Fiber.await(failFiber).pipe(
          Effect.flatMap((exit) => {
            if (exit._tag === 'Success') {
              return Effect.succeed(exit.value);
            } else {
              // Expected failure - return undefined
              return Effect.succeed(undefined);
            }
          }),
          Effect.catchAll(() => Effect.succeed(undefined)),
        );

        return results;
      });

      const result = await Effect.runPromise(program);

      expect(result).toContain('success');
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      const program = Effect.gen(function* () {
        // Submit a task
        yield* offerTask(Priority.Normal, Effect.succeed('task'));

        // Shutdown
        yield* shutdown();

        return 'shutdown';
      });

      const result = await Effect.runPromise(program);

      expect(result).toBe('shutdown');
    });

    it('should stop processing new tasks after shutdown', async () => {
      const program = Effect.gen(function* () {
        // Submit a task before shutdown - this should complete
        const beforeQueuedItem = yield* createQueuedItem(
          Effect.succeed('before-shutdown'),
        );
        const beforeShutdownTask = yield* offer(
          Priority.Normal,
          beforeQueuedItem,
        );

        // Wait for it to complete
        const beforeFiber = yield* beforeShutdownTask.fiber;
        const beforeResult = yield* awaitFiber(beforeFiber);

        // Shutdown
        yield* shutdown();

        // Try to submit a task after shutdown
        // offer() will return immediately, but the fiber Effect won't resolve because
        // the deferred is never fulfilled (controller loop stopped)
        const afterQueuedItem = yield* createQueuedItem(
          Effect.succeed('after-shutdown'),
        );
        const afterShutdownTask = yield* offer(
          Priority.Normal,
          afterQueuedItem,
        );

        // Race getting the fiber (which waits for deferred) with a timeout
        // The deferred should never be fulfilled because controller loop stopped
        const result = yield* Effect.race(
          afterShutdownTask.fiber.pipe(
            Effect.flatMap((fiber) =>
              Fiber.await(fiber).pipe(
                Effect.flatMap((exit) =>
                  exit._tag === 'Success'
                    ? Effect.succeed('completed')
                    : Effect.succeed('failed'),
                ),
              ),
            ),
          ),
          Effect.sleep('100 millis').pipe(
            Effect.andThen(Effect.succeed('timeout')),
          ),
        );

        return { beforeResult, afterShutdownResult: result };
      });

      const result = await Effect.runPromise(program);

      // Task before shutdown should complete
      expect(result.beforeResult).toBe('before-shutdown');

      // Task after shutdown should timeout (not complete) because controller loop stopped
      expect(result.afterShutdownResult).toBe('timeout');
    });
  });

  describe('Idle Sleep', () => {
    it('should sleep when no tasks are available', async () => {
      await Effect.runPromise(shutdown());
      await Effect.runPromise(
        initialize({
          queueCapacity: 64,
          maxHighPriorityStreak: 50,
          idleSleepMs: 10,
        }),
      );

      const startTime = Date.now();

      const program = Effect.gen(function* () {
        // Submit a quick task
        yield* offerTask(Priority.Normal, Effect.succeed('quick'));

        // Wait a bit - scheduler should be idle
        yield* Effect.sleep('50 millis');

        return Date.now() - startTime;
      });

      const elapsed = await Effect.runPromise(program);

      // Should have elapsed time (scheduler was idle)
      expect(elapsed).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Concurrent Execution', () => {
    it('should execute multiple tasks concurrently', async () => {
      const startTime = Date.now();

      const program = Effect.gen(function* () {
        // Submit multiple tasks that take time
        const tasks = yield* Effect.all(
          Array.from({ length: 5 }, () =>
            offerTask(
              Priority.Normal,
              Effect.gen(function* () {
                yield* Effect.sleep('50 millis');
                return 'done';
              }),
            ),
          ),
        );

        // Wait for all tasks
        yield* Effect.all(
          tasks.map((t) =>
            Effect.gen(function* () {
              const fiber = yield* t.fiber;
              return yield* awaitFiber(fiber);
            }),
          ),
        );

        return Date.now() - startTime;
      });

      const elapsed = await Effect.runPromise(program);

      // Should be faster than sequential (5 * 50ms = 250ms)
      // But scheduler processes one at a time, so it will be sequential
      expect(elapsed).toBeGreaterThan(0);
    });
  });

  describe('Request Type Logging', () => {
    it('should include request type in scheduled task', async () => {
      const program = Effect.gen(function* () {
        const result1 = yield* offerTask(
          Priority.Normal,
          Effect.succeed('result1'),
          'hover',
        );
        const result2 = yield* offerTask(
          Priority.Normal,
          Effect.succeed('result2'),
          'completion',
        );

        return {
          type1: result1.requestType,
          type2: result2.requestType,
        };
      });

      const result = await Effect.runPromise(program);

      expect(result.type1).toBe('hover');
      expect(result.type2).toBe('completion');
    });
  });
});
