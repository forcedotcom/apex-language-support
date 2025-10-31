/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  Effect,
  Queue,
  Fiber,
  Ref,
  Context,
  Layer,
  Duration,
  pipe,
} from 'effect';
import {
  getLogger,
  ApexSettingsManager,
  RequestPriority,
  QueueProcessingSettings,
  LoggerInterface,
} from '@salesforce/apex-lsp-shared';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { ServiceRegistry } from '../registry/ServiceRegistry';
import { BackgroundProcessingInitializationService } from '../services/BackgroundProcessingInitializationService';
import {
  LSPRequestType,
  LSPRequestTask,
  LSPQueueStats,
} from './LSPRequestQueue';

/**
 * LSP Queue State interface
 */
export interface LSPQueueState {
  readonly immediateQueue: Queue.Queue<LSPRequestTask>;
  readonly highPriorityQueue: Queue.Queue<LSPRequestTask>;
  readonly normalPriorityQueue: Queue.Queue<LSPRequestTask>;
  readonly lowPriorityQueue: Queue.Queue<LSPRequestTask>;
  readonly statsRef: Ref.Ref<{
    totalProcessed: number;
    totalFailed: number;
    totalProcessingTime: number;
  }>;
  readonly activeTasksRef: Record<RequestPriority, Ref.Ref<Set<string>>>;
  readonly taskCountRefs: Record<RequestPriority, Ref.Ref<number>>;
  readonly workerFibersRef: Ref.Ref<Fiber.RuntimeFiber<void, never>[]>;
}

/**
 * Context Tag for LSP Queue State
 */
export const LSPQueueStateTag = Context.Tag('LSPQueueState')<
  LSPQueueState,
  LSPQueueState
>();

/**
 * Context Tag for Queue Settings
 */
export const QueueSettingsTag = Context.Tag('QueueSettings')<
  QueueProcessingSettings,
  QueueProcessingSettings
>();

/**
 * Context Tag for Logger
 */
export const LoggerTag = Context.Tag('Logger')<
  LoggerInterface,
  LoggerInterface
>();

/**
 * Initialize shared Refs at module level
 */
const initializeSharedState = Effect.gen(function* (_) {
  return {
    immediateQueue: yield* _(Queue.bounded<LSPRequestTask>(100)),
    highPriorityQueue: yield* _(Queue.bounded<LSPRequestTask>(200)),
    normalPriorityQueue: yield* _(Queue.bounded<LSPRequestTask>(500)),
    lowPriorityQueue: yield* _(Queue.bounded<LSPRequestTask>(200)),
    statsRef: yield* _(
      Ref.make({
        totalProcessed: 0,
        totalFailed: 0,
        totalProcessingTime: 0,
      }),
    ),
    activeTasksRef: {
      IMMEDIATE: yield* _(Ref.make<Set<string>>(new Set())),
      HIGH: yield* _(Ref.make<Set<string>>(new Set())),
      NORMAL: yield* _(Ref.make<Set<string>>(new Set())),
      LOW: yield* _(Ref.make<Set<string>>(new Set())),
    },
    taskCountRefs: {
      IMMEDIATE: yield* _(Ref.make(0)),
      HIGH: yield* _(Ref.make(0)),
      NORMAL: yield* _(Ref.make(0)),
      LOW: yield* _(Ref.make(0)),
    },
    workerFibersRef: yield* _(Ref.make<Fiber.RuntimeFiber<void, never>[]>([])),
  };
});

// Run synchronously to create the Refs once at module load time
const sharedState = Effect.runSync(initializeSharedState);

// Use Layer.succeed to provide the pre-created singleton state
export const LSPQueueStateLive = Layer.succeed(LSPQueueStateTag, sharedState);

/**
 * Helper to get queue state
 */
const getQueueState = LSPQueueStateTag;

/**
 * Helper to check if background processing is ready
 */
const checkBackgroundProcessingReady = Effect.sync(() =>
  BackgroundProcessingInitializationService.getInstance().isBackgroundProcessingInitialized(),
);

/**
 * Create a worker Effect for a specific priority queue
 */
const createWorkerEffect = (
  queue: Queue.Queue<LSPRequestTask>,
  priority: RequestPriority,
): Effect.Effect<
  never,
  never,
  typeof LSPQueueStateTag | typeof QueueSettingsTag | typeof LoggerTag
> =>
  Effect.gen(function* (_) {
    const state = yield* _(getQueueState);
    const settings = yield* _(QueueSettingsTag);
    const logger = yield* _(LoggerTag);

    const concurrencyLimit = settings.maxConcurrency[priority];
    const activeTasksRef = state.activeTasksRef[priority];
    const taskCountRef = state.taskCountRefs[priority];

    while (true) {
      // Check if background processing is initialized
      const isReady = yield* _(checkBackgroundProcessingReady);

      if (!isReady) {
        yield* _(Effect.sleep(Duration.millis(100)));
        continue;
      }

      // Check current active tasks count
      const activeTasks = yield* _(Ref.get(activeTasksRef));
      if (activeTasks.size >= concurrencyLimit) {
        yield* _(Effect.sleep(Duration.millis(10)));
        continue;
      }

      // Check queue size
      const queueSize = yield* _(Queue.size(queue));
      if (queueSize === 0) {
        yield* _(Effect.sleep(Duration.millis(10)));
        continue;
      }

      // Take task from queue
      const task = yield* _(Queue.take(queue));

      // Increment task count and check if we should yield
      const taskCount = yield* _(
        Ref.updateAndGet(taskCountRef, (count) => count + 1),
      );
      const shouldYield = taskCount % settings.yieldInterval === 0;

      // Add task to active set
      yield* _(
        Ref.update(activeTasksRef, (set) => {
          const newSet = new Set(set);
          newSet.add(task.id);
          return newSet;
        }),
      );

      // Process task in background
      yield* _(
        Effect.fork(
          Effect.gen(function* (_) {
            try {
              // Yield if needed before processing
              if (shouldYield) {
                yield* _(Effect.sleep(Duration.millis(settings.yieldDelayMs)));
              }

              // Execute request with timeout (no provide call here)
              const requestEffect = executeRequestEffect(task);

              const result = yield* _(
                Effect.race(
                  requestEffect,
                  Effect.sleep(Duration.millis(task.timeout)).pipe(
                    Effect.flatMap(() =>
                      Effect.fail(new Error(`Request timeout: ${task.type}`)),
                    ),
                  ),
                ),
              );

              // Update stats
              const processingTime = Date.now() - task.timestamp;
              yield* _(
                Ref.update(state.statsRef, (stats) => ({
                  ...stats,
                  totalProcessed: stats.totalProcessed + 1,
                  totalProcessingTime:
                    stats.totalProcessingTime + processingTime,
                })),
              );

              task.callback?.(result);

              logger.debug(
                () => `Completed ${task.type} request in ${processingTime}ms`,
              );
            } catch (error) {
              // Update stats
              yield* _(
                Ref.update(state.statsRef, (stats) => ({
                  ...stats,
                  totalProcessed: stats.totalProcessed + 1,
                  totalFailed: stats.totalFailed + 1,
                })),
              );

              logger.error(
                () => `Failed to process ${task.type} request: ${error}`,
              );

              // Retry logic for non-immediate requests
              if (
                priority !== 'IMMEDIATE' &&
                task.retryAttempts < task.maxRetries
              ) {
                const retryTask: LSPRequestTask = {
                  ...task,
                  retryAttempts: task.retryAttempts + 1,
                };

                logger.debug(
                  () =>
                    `Retrying ${task.type} (attempt ${retryTask.retryAttempts}/${task.maxRetries})`,
                );

                // Re-queue with exponential backoff
                yield* _(
                  Effect.sleep(
                    Duration.millis(
                      100 * Math.pow(2, retryTask.retryAttempts - 1),
                    ),
                  ),
                );
                yield* _(Queue.offer(queue, retryTask));
              } else {
                task.errorCallback?.(error as Error);
              }
            } finally {
              // Remove task from active set
              yield* _(
                Ref.update(activeTasksRef, (set) => {
                  const newSet = new Set(set);
                  newSet.delete(task.id);
                  return newSet;
                }),
              );
            }
          }),
        ),
      );
    }
  }) as unknown as Effect.Effect<
    never,
    never,
    typeof LSPQueueStateTag | typeof QueueSettingsTag | typeof LoggerTag
  >;

/**
 * Execute request using singleton service registry
 */
const executeRequestEffect = (
  task: LSPRequestTask,
): Effect.Effect<any, Error, never> =>
  Effect.gen(function* (_) {
    const serviceRegistry = new ServiceRegistry(); // <- singleton
    const handler = serviceRegistry.getHandler(task.type);

    if (!handler) {
      return yield* _(
        Effect.fail(
          new Error(`No handler registered for request type: ${task.type}`),
        ),
      );
    }

    return yield* _(
      Effect.promise(() => handler.process(task.params, task.symbolManager)),
    );
    // TODO: resolve double assertion
  }) as unknown as Effect.Effect<any, Error, never>;

/**
 * Start all workers
 */
const startWorkersEffect = Effect.gen(function* (_) {
  const state = yield* _(getQueueState);
  const logger = yield* _(LoggerTag);

  // Start all workers concurrently
  const immediateWorker = yield* _(
    Effect.forkDaemon(createWorkerEffect(state.immediateQueue, 'IMMEDIATE')),
  );
  const highWorker = yield* _(
    Effect.forkDaemon(createWorkerEffect(state.highPriorityQueue, 'HIGH')),
  );
  const normalWorker = yield* _(
    Effect.forkDaemon(createWorkerEffect(state.normalPriorityQueue, 'NORMAL')),
  );
  const lowWorker = yield* _(
    Effect.forkDaemon(createWorkerEffect(state.lowPriorityQueue, 'LOW')),
  );

  // Store worker fibers
  yield* _(
    Ref.update(state.workerFibersRef, (fibers) => [
      ...fibers,
      immediateWorker,
      highWorker,
      normalWorker,
      lowWorker,
    ]),
  );

  logger.debug(() => 'All queue workers started');
});

/**
 * Get queue for priority
 */
const getQueueForPriority = (
  priority: RequestPriority,
  state: LSPQueueState,
): Queue.Queue<LSPRequestTask> => {
  switch (priority) {
    case 'IMMEDIATE':
      return state.immediateQueue;
    case 'HIGH':
      return state.highPriorityQueue;
    case 'NORMAL':
      return state.normalPriorityQueue;
    case 'LOW':
      return state.lowPriorityQueue;
    default:
      return state.normalPriorityQueue;
  }
};

/**
 * Generate unique task ID
 */
const generateTaskId = (): string =>
  `lsp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/**
 * Process immediate request synchronously
 */
const processImmediateRequestEffect = <T>(
  task: LSPRequestTask,
): Effect.Effect<T, Error, typeof LSPQueueStateTag | typeof LoggerTag> =>
  Effect.gen(function* (_) {
    const state = yield* _(getQueueState);
    const logger = yield* _(LoggerTag);

    logger.debug(() => `Processing immediate request: ${task.type}`);

    const startTime = Date.now();
    const result = yield* _(executeRequestEffect(task));
    const processingTime = Date.now() - startTime;

    // Update stats
    yield* _(
      Ref.update(state.statsRef, (stats) => ({
        ...stats,
        totalProcessed: stats.totalProcessed + 1,
        totalProcessingTime: stats.totalProcessingTime + processingTime,
      })),
    );

    logger.debug(
      () => `Immediate request ${task.type} completed in ${processingTime}ms`,
    );

    task.callback?.(result);
    return result;
  }).pipe(
    Effect.catchAll((error) =>
      Effect.gen(function* (_) {
        const state = yield* _(getQueueState);
        const logger = yield* _(LoggerTag);

        // Update stats
        yield* _(
          Ref.update(state.statsRef, (stats) => ({
            ...stats,
            totalProcessed: stats.totalProcessed + 1,
            totalFailed: stats.totalFailed + 1,
          })),
        );

        logger.error(() => `Immediate request ${task.type} failed: ${error}`);
        task.errorCallback?.(error as Error);
        return yield* _(Effect.fail(error));
      }),
    ),
  ) as unknown as Effect.Effect<
    T,
    Error,
    typeof LSPQueueStateTag | typeof LoggerTag
  >;

/**
 * Queue request for background processing
 */
const queueRequestEffect = <T>(
  task: LSPRequestTask,
): Effect.Effect<T, Error, typeof LSPQueueStateTag | typeof LoggerTag> =>
  Effect.gen(function* (_) {
    const state = yield* _(getQueueState);
    const logger = yield* _(LoggerTag);

    return yield* _(
      Effect.async<T, Error>((resume) => {
        const wrappedTask: LSPRequestTask = {
          ...task,
          callback: (result: T) => {
            task.callback?.(result);
            resume(Effect.succeed(result));
          },
          errorCallback: (error: Error) => {
            task.errorCallback?.(error);
            resume(Effect.fail(error));
          },
        };

        // Add to appropriate queue
        const queue = getQueueForPriority(task.priority, state);
        Effect.runSync(Queue.offer(queue, wrappedTask));

        logger.debug(
          () => `Queued ${task.type} request with priority ${task.priority}`,
        );
      }),
    );
  }) as unknown as Effect.Effect<
    T,
    Error,
    typeof LSPQueueStateTag | typeof LoggerTag
  >;

/**
 * LSP Queue Service
 */
export class LSPQueueService extends Effect.Service<LSPQueueService>()(
  'LSPQueueService',
  {
    scoped: Effect.gen(function* (_) {
      yield* _(LSPQueueStateTag);
      yield* _(QueueSettingsTag);
      yield* _(LoggerTag);

      // Start workers on service initialization
      yield* _(startWorkersEffect);

      return {
        /**
         * Submit an LSP request for processing
         */
        submitRequest: <T>(
          type: LSPRequestType,
          params: any,
          symbolManager: ISymbolManager,
          options: {
            priority?: RequestPriority;
            timeout?: number;
            callback?: (result: T) => void;
            errorCallback?: (error: Error) => void;
          } = {},
        ) =>
          Effect.gen(function* (_) {
            const serviceRegistry = new ServiceRegistry();

            const priority =
              options.priority || serviceRegistry.getPriority(type);
            const timeout = options.timeout || serviceRegistry.getTimeout(type);
            const maxRetries = serviceRegistry.getMaxRetries(type);

            const task: LSPRequestTask = {
              id: generateTaskId(),
              type,
              priority,
              params,
              symbolManager,
              timestamp: Date.now(),
              timeout,
              retryAttempts: 0,
              maxRetries,
              callback: options.callback,
              errorCallback: options.errorCallback,
            };

            // For immediate requests, process synchronously
            if (priority === 'IMMEDIATE') {
              return yield* _(processImmediateRequestEffect(task));
            }

            // For other priorities, queue for background processing
            return yield* _(queueRequestEffect(task));
          }),

        /**
         * Get queue statistics
         */
        getStats: () =>
          Effect.gen(function* (_) {
            const state = yield* _(getQueueState);
            const stats = yield* _(Ref.get(state.statsRef));

            return {
              immediateQueueSize: yield* _(Queue.size(state.immediateQueue)),
              highPriorityQueueSize: yield* _(
                Queue.size(state.highPriorityQueue),
              ),
              normalPriorityQueueSize: yield* _(
                Queue.size(state.normalPriorityQueue),
              ),
              lowPriorityQueueSize: yield* _(
                Queue.size(state.lowPriorityQueue),
              ),
              totalProcessed: stats.totalProcessed,
              totalFailed: stats.totalFailed,
              averageProcessingTime:
                stats.totalProcessed > 0
                  ? stats.totalProcessingTime / stats.totalProcessed
                  : 0,
              activeWorkers: 4,
            } satisfies LSPQueueStats;
          }),

        /**
         * Shutdown the queue system
         */
        shutdown: () =>
          Effect.gen(function* (_) {
            const state = yield* _(getQueueState);
            const logger = yield* _(LoggerTag);

            logger.debug(() => 'Shutting down Generic LSP Request Queue');

            // Interrupt all worker fibers
            const fibers = yield* _(Ref.get(state.workerFibersRef));
            yield* _(
              Effect.forEach(fibers, (fiber) => Fiber.interrupt(fiber), {
                discard: true,
              }),
            );

            // Shutdown all queues
            yield* _(Queue.shutdown(state.immediateQueue));
            yield* _(Queue.shutdown(state.highPriorityQueue));
            yield* _(Queue.shutdown(state.normalPriorityQueue));
            yield* _(Queue.shutdown(state.lowPriorityQueue));
          }),
      };
    }),
  },
) {}

/**
 * Create Layers for dependencies
 */

export const QueueSettingsLive = (settings: QueueProcessingSettings) =>
  Layer.succeed(QueueSettingsTag, settings);

export const LoggerLive = (logger: LoggerInterface) =>
  Layer.succeed(LoggerTag, logger);

/**
 * Create the complete service layer
 */
export const LSPQueueServiceLive = (
  serviceRegistry: ServiceRegistry,
  settings?: Partial<QueueProcessingSettings>,
): Layer.Layer<LSPQueueService, never, never> => {
  const settingsManager = ApexSettingsManager.getInstance();
  const serverSettings = settingsManager.getSettings();
  const queueSettings = serverSettings.apex.queueProcessing;

  const finalSettings: QueueProcessingSettings = {
    maxConcurrency: settings?.maxConcurrency ?? queueSettings.maxConcurrency,
    yieldInterval: settings?.yieldInterval ?? queueSettings.yieldInterval,
    yieldDelayMs: settings?.yieldDelayMs ?? queueSettings.yieldDelayMs,
  };

  return LSPQueueService.Default.pipe(
    Layer.provide(LSPQueueStateLive),
    // NOTE: no ServiceRegistry layer provided — the code uses the singleton via ServiceRegistry.getInstance()
    Layer.provide(QueueSettingsLive(finalSettings)),
    Layer.provide(LoggerLive(getLogger())),
  ) as Layer.Layer<LSPQueueService, never, never>;
};

/**
 * Wrapper function for submitting requests (Effect-based)
 */
export const submitLSPRequest = <T>(
  type: LSPRequestType,
  params: any,
  symbolManager: ISymbolManager,
  options: {
    priority?: RequestPriority;
    timeout?: number;
    callback?: (result: T) => void;
    errorCallback?: (error: Error) => void;
  } = {},
) =>
  pipe(
    LSPQueueService,
    Effect.flatMap((service) =>
      service.submitRequest(type, params, symbolManager, options),
    ),
  );

/**
 * Wrapper function for getting stats (Effect-based)
 */
export const getLSPQueueStats = () =>
  pipe(
    LSPQueueService,
    Effect.flatMap((service) => service.getStats()),
  );

/**
 * Wrapper function for shutdown (Effect-based)
 */
export const shutdownLSPQueue = () =>
  pipe(
    LSPQueueService,
    Effect.flatMap((service) => service.shutdown()),
  );

/**
 * Backward compatibility: Promise-based wrapper class
 * This maintains the same interface as the original GenericLSPRequestQueue
 */
export class GenericLSPRequestQueue {
  private readonly layer: Layer.Layer<LSPQueueService, never, never>;
  private readonly scopeFiber: Fiber.RuntimeFiber<void, never>;
  private isShutdown = false;

  constructor(
    private readonly serviceRegistry: ServiceRegistry,
    settings?: {
      maxConcurrency?: Record<RequestPriority, number>;
      yieldInterval?: number;
      yieldDelayMs?: number;
    },
  ) {
    // Create layer with all dependencies
    this.layer = LSPQueueServiceLive(serviceRegistry, settings);

    // Start a persistent scope to keep workers running
    // The service will be initialized when first accessed within a scope
    const scopeEffect = Effect.scoped(
      pipe(
        LSPQueueService,
        Effect.tap(() => Effect.void),
        Effect.provide(this.layer),
        Effect.asVoid,
        Effect.forever, // Keep the scope alive forever
      ),
    );

    // Fork the scope to keep workers running in the background
    this.scopeFiber = Effect.runFork(scopeEffect);

    getLogger().debug(
      () =>
        'Generic LSP Request Queue initialized with Effect-TS Service pattern',
    );
  }

  submitRequest<T>(
    type: LSPRequestType,
    params: any,
    symbolManager: ISymbolManager,
    options: {
      priority?: RequestPriority;
      timeout?: number;
      callback?: (result: T) => void;
      errorCallback?: (error: Error) => void;
    } = {},
  ): Promise<T> {
    if (this.isShutdown) {
      return Promise.reject(
        new Error('GenericLSPRequestQueue has been shut down'),
      );
    }

    // Provide the layer - Effect.provide works with layers and makes all dependencies available
    return Effect.runPromise(
      Effect.scoped(
        pipe(
          submitLSPRequest(type, params, symbolManager, options),
          Effect.provide(this.layer),
        ),
      ) as Effect.Effect<T, Error, never>,
    ) as Promise<T>;
  }

  getStats(): LSPQueueStats {
    if (this.isShutdown) {
      return {
        immediateQueueSize: 0,
        highPriorityQueueSize: 0,
        normalPriorityQueueSize: 0,
        lowPriorityQueueSize: 0,
        totalProcessed: 0,
        totalFailed: 0,
        averageProcessingTime: 0,
        activeWorkers: 0,
      };
    }

    // Provide the layer - Effect.provide works with layers and makes all dependencies available
    return Effect.runSync(
      Effect.scoped(
        pipe(getLSPQueueStats(), Effect.provide(this.layer)),
      ) as Effect.Effect<LSPQueueStats, never, never>,
    );
  }

  shutdown(): void {
    if (this.isShutdown) {
      return;
    }

    try {
      // Shutdown the service
      Effect.runSync(
        shutdownLSPQueue().pipe(Effect.provide(this.layer)) as Effect.Effect<
          void,
          never,
          never
        >,
      );

      // Interrupt the scope fiber to clean up resources
      Effect.runSync(Fiber.interrupt(this.scopeFiber));
    } catch (error) {
      // Log but don't throw - shutdown should be idempotent
      getLogger().warn(() => `Error during shutdown: ${error}`);
    } finally {
      this.isShutdown = true;
    }
  }
}
