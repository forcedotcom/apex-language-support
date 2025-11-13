/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, Queue, Fiber } from 'effect';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { SymbolTable } from '../types/symbol';
import type { CommentAssociation } from '../parser/listeners/ApexCommentCollectorListener';
import { ApexSymbolManager } from './ApexSymbolManager';

/**
 * Task priority levels for symbol processing
 */
export type TaskPriority = 'HIGH' | 'NORMAL' | 'LOW';

/**
 * Task status for tracking processing state
 */
export type TaskStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'UNKNOWN';

/**
 * Symbol processing options
 */
export interface SymbolProcessingOptions {
  priority?: TaskPriority;
  timeout?: number;
  retryAttempts?: number;
  concurrency?: number;
  enableCrossFileResolution?: boolean;
  enableReferenceProcessing?: boolean;
  enableMetricsCollection?: boolean;
}

/**
 * Symbol processing task definition
 */
export interface SymbolProcessingTask {
  readonly _tag: 'SymbolProcessingTask';
  readonly id: string;
  readonly symbolTable: SymbolTable;
  readonly fileUri: string;
  readonly documentVersion?: number;
  readonly priority: TaskPriority;
  readonly options: SymbolProcessingOptions;
  readonly timestamp: number;
  readonly retryCount: number;
}

/**
 * Task type for storing comment associations
 */
export interface CommentAssociationTask {
  readonly _tag: 'CommentAssociationTask';
  readonly id: string;
  readonly fileUri: string;
  readonly associations: CommentAssociation[];
  readonly priority: TaskPriority;
  readonly timestamp: number;
}

type IndexingTask = SymbolProcessingTask | CommentAssociationTask;

/**
 * Task registry entry for tracking task status
 */
interface TaskRegistryEntry {
  task: IndexingTask;
  status: TaskStatus;
  startTime?: number;
  endTime?: number;
  error?: string;
  result?: any;
}

/**
 * Queue statistics
 */
export interface QueueStats {
  queueSize: number;
  pendingTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageProcessingTime: number;
  throughput: number; // tasks per second
}

/**
 * Task registry for tracking task status and statistics
 */
class TaskRegistry {
  private readonly tasks = new Map<string, TaskRegistryEntry>();
  private readonly logger = getLogger();

  /**
   * Register a new task
   */
  registerTask(task: IndexingTask): void {
    this.tasks.set(task.id, {
      task,
      status: 'PENDING',
    });
    this.logger.debug(() => `Task registered: ${task.id}`);
  }

  /**
   * Update task status
   */
  updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    result?: any,
    error?: string,
  ): void {
    const entry = this.tasks.get(taskId);
    if (entry) {
      entry.status = status;
      if (status === 'RUNNING' && !entry.startTime) {
        entry.startTime = Date.now();
      } else if (
        (status === 'COMPLETED' || status === 'FAILED') &&
        !entry.endTime
      ) {
        entry.endTime = Date.now();
      }
      if (result) entry.result = result;
      if (error) entry.error = error;

      this.logger.debug(() => `Task ${taskId} status updated to ${status}`);
    }
  }

  /**
   * Get task status
   */
  getStatus(taskId: string): TaskStatus {
    return this.tasks.get(taskId)?.status || 'UNKNOWN';
  }

  /**
   * Get task registry entry by task ID
   */
  getTaskEntry(taskId: string): TaskRegistryEntry | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Check if there's a pending or running task for a file/version combination
   * @param fileUri The file URI to check
   * @param documentVersion Optional document version to match
   * @returns True if there's a pending or running task for the file/version
   */
  hasPendingTaskForFile(fileUri: string, documentVersion?: number): boolean {
    return this.findPendingTaskIdForFile(fileUri, documentVersion) !== null;
  }

  /**
   * Find the task ID for a pending or running task for a file/version combination
   * @param fileUri The file URI to check
   * @param documentVersion Optional document version to match
   * @returns Task ID if found, null otherwise
   */
  findPendingTaskIdForFile(
    fileUri: string,
    documentVersion?: number,
  ): string | null {
    for (const [taskId, entry] of this.tasks.entries()) {
      if (entry.status !== 'PENDING' && entry.status !== 'RUNNING') {
        continue;
      }

      const task = entry.task;
      if (task._tag === 'SymbolProcessingTask') {
        // Match fileUri
        if (task.fileUri !== fileUri) {
          continue;
        }

        // If documentVersion is provided, match it; otherwise match any version
        if (documentVersion !== undefined) {
          if (task.documentVersion === documentVersion) {
            return taskId;
          }
        } else {
          // No version specified, match any version for this file
          return taskId;
        }
      }
    }

    return null;
  }

  /**
   * Get task statistics
   */
  getStats(): {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    averageProcessingTime: number;
  } {
    let pending = 0;
    let running = 0;
    let completed = 0;
    let failed = 0;
    let totalProcessingTime = 0;
    let completedCount = 0;

    for (const entry of this.tasks.values()) {
      switch (entry.status) {
        case 'PENDING':
          pending++;
          break;
        case 'RUNNING':
          running++;
          break;
        case 'COMPLETED':
          completed++;
          if (entry.startTime && entry.endTime) {
            totalProcessingTime += entry.endTime - entry.startTime;
            completedCount++;
          }
          break;
        case 'FAILED':
          failed++;
          break;
      }
    }

    return {
      pending,
      running,
      completed,
      failed,
      averageProcessingTime:
        completedCount > 0 ? totalProcessingTime / completedCount : 0,
    };
  }

  /**
   * Clean up completed tasks older than specified age
   */
  cleanup(ageMs: number = 5 * 60 * 1000): void {
    // Default 5 minutes
    const cutoff = Date.now() - ageMs;
    let cleaned = 0;

    for (const [taskId, entry] of this.tasks.entries()) {
      if (
        (entry.status === 'COMPLETED' || entry.status === 'FAILED') &&
        entry.endTime &&
        entry.endTime < cutoff
      ) {
        this.tasks.delete(taskId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(() => `Cleaned up ${cleaned} old task entries`);
    }
  }
}

/**
 * Effect-TS Queue Service for managing Apex symbol processing tasks
 * This service manages the queue and delegates actual processing to ApexSymbolManager
 *
 * ## Effect-TS Usage
 *
 * This service uses Effect-TS for managing asynchronous task processing:
 *
 * - **Queue**: Uses `Queue.bounded<IndexingTask>(100)` for thread-safe task queuing with back-pressure
 * - **Worker Fiber**: Background fiber processes tasks from the queue using `Effect.runFork`
 * - **Synchronous Operations**: Uses `Effect.runSync` for queue operations (offer, size, shutdown)
 *
 * ### Important Notes:
 *
 * 1. **Effect.runSync Limitations**: `Effect.runSync` cannot handle suspended effects. For bounded queues
 *    with sufficient capacity (100), `Queue.offer` should not suspend unless the queue is full.
 *
 * 2. **Queue Operations**:
 *    - `Queue.offer()`: Adds a task to the queue. For bounded queues, only suspends if queue is full.
 *    - `Queue.take()`: Removes a task from the queue. Used by the worker fiber in an infinite loop.
 *    - `Queue.size()`: Returns current queue size synchronously.
 *    - `Queue.shutdown()`: Shuts down the queue, preventing further operations.
 *
 * 3. **Worker Fiber**: The background worker runs continuously, taking tasks from the queue and processing
 *    them. The fiber is interrupted during shutdown.
 *
 * 4. **Error Handling**: Queue operations that might fail (e.g., during shutdown) should be wrapped in
 *    try-catch blocks to handle errors gracefully.
 */
export class ApexSymbolIndexingService {
  private readonly queue: Queue.Queue<IndexingTask>;
  private readonly taskRegistry: TaskRegistry;
  private readonly symbolManager: ApexSymbolManager;
  private readonly logger = getLogger();
  private workerFiber: any = null;

  constructor(symbolManager: ApexSymbolManager) {
    this.symbolManager = symbolManager;
    this.taskRegistry = new TaskRegistry();

    // Use Effect-TS Queue for thread-safe operations with back-pressure
    // Queue.bounded creates a bounded queue that can hold up to 100 tasks
    // This operation is synchronous and safe to use with Effect.runSync
    this.queue = Effect.runSync(Queue.bounded<IndexingTask>(100));
  }

  /**
   * Start the background worker that processes tasks from the queue
   *
   * ## Effect-TS Worker Pattern
   *
   * This method creates a background fiber that continuously processes tasks:
   *
   * 1. **Effect.gen**: Uses generator syntax to create an Effect program
   * 2. **Queue.take**: Suspends until a task is available in the queue
   * 3. **Effect.tryPromise**: Wraps async task processing in an Effect
   * 4. **Effect.runFork**: Runs the program in a background fiber that can be interrupted
   *
   * The worker runs indefinitely until interrupted via `shutdown()`. Each task is processed
   * sequentially, ensuring thread-safe access to the symbol manager.
   */
  startWorker(): void {
    if (this.workerFiber) {
      this.logger.warn(() => 'Worker already running');
      return;
    }

    const self = this;
    const workerProgram = Effect.gen(function* () {
      while (true) {
        // Take a task from the queue
        // This operation suspends until a task is available
        const task = yield* Queue.take(self.queue);

        // Process the task
        // Effect.tryPromise converts the async processTask into an Effect
        yield* Effect.tryPromise({
          try: () => self.processTask(task),
          catch: (error) => new Error(`Task processing failed: ${error}`),
        });
      }
    });

    // Run the worker in the background using Effect.runFork
    // This creates a fiber that can be interrupted later via Fiber.interrupt
    this.workerFiber = Effect.runFork(workerProgram);
    this.logger.debug(() => 'Background worker started');
  }

  /**
   * Process a single task by delegating to the symbol manager
   */
  private async processTask(task: IndexingTask): Promise<void> {
    try {
      this.taskRegistry.updateTaskStatus(task.id, 'RUNNING');

      this.logger.debug(() => `Processing task ${task.id} for ${task.fileUri}`);

      if (task._tag === 'SymbolProcessingTask') {
        // Delegate to the symbol manager to do the actual work
        this.logger.debug(
          () =>
            `[processTask] Adding symbol table for ${task.fileUri} (task: ${task.id})`,
        );
        const symbolsBefore = this.symbolManager.findSymbolsInFile(
          task.fileUri,
        );
        this.logger.debug(
          () =>
            `[processTask] Symbols in file before addSymbolTable: ${symbolsBefore.length}`,
        );

        await this.symbolManager.addSymbolTable(task.symbolTable, task.fileUri);

        const symbolsAfter = this.symbolManager.findSymbolsInFile(task.fileUri);
        this.logger.debug(
          () =>
            `[processTask] Symbols in file after addSymbolTable: ${symbolsAfter.length}`,
        );
        if (symbolsAfter.length > 0) {
          symbolsAfter.forEach((symbol, idx) => {
            this.logger.debug(
              () =>
                `[processTask] Symbol ${idx}: ${symbol.name} (kind: ${symbol.kind})`,
            );
          });
        }

        // Note: Cache update (symbolsIndexed: true) is handled by the LSP layer
        // to avoid circular dependencies. The LSP layer should listen for task
        // completion and update the cache accordingly.

        // If cross-file resolution is enabled, trigger it
        if (task.options.enableCrossFileResolution) {
          this.logger.debug(
            () => `Cross-file resolution enabled for task ${task.id}`,
          );
          // The symbol manager will handle cross-file resolution internally
        }
      } else if (task._tag === 'CommentAssociationTask') {
        // Persist comment associations for later retrieval (e.g., hover)
        this.symbolManager.setCommentAssociations(
          task.fileUri,
          task.associations,
        );
      }

      this.taskRegistry.updateTaskStatus(task.id, 'COMPLETED');
      this.logger.debug(() => `Task ${task.id} executed successfully`);
    } catch (error) {
      this.taskRegistry.updateTaskStatus(
        task.id,
        'FAILED',
        undefined,
        String(error),
      );
      this.logger.error(() => `Task ${task.id} failed: ${error}`);
    }
  }

  /**
   * Enqueue a task for background processing
   *
   * ## Effect-TS Queue Operations
   *
   * Uses `Effect.runSync(Queue.offer())` to add a task to the queue synchronously.
   *
   * **Important**: `Effect.runSync` cannot handle suspended effects. For bounded queues:
   * - `Queue.offer` will only suspend if the queue is full (100 tasks)
   * - In normal operation, the queue rarely fills up, so suspension is unlikely
   * - If the queue is full, `Effect.runSync` will throw an `AsyncFiberException`
   *
   * **Error Handling**: Wraps the operation in try-catch to handle potential suspension
   * or shutdown errors gracefully, similar to the pattern used in `ApexSymbolGraph`.
   *
   * @param task The indexing task to enqueue
   */
  enqueue(task: IndexingTask): void {
    this.taskRegistry.registerTask(task);

    try {
      // Use Effect.runSync to offer the task to the queue
      // For bounded queues, offer will only suspend if the queue is full
      // Since we have capacity 100 and typically only a few tasks, this should not suspend
      Effect.runSync(Queue.offer(this.queue, task));
      this.logger.debug(() => `Task ${task.id} enqueued`);
    } catch (error) {
      // Handle potential suspension or shutdown errors
      // Queue might be shutdown or full, or worker fiber might be suspended
      // Check for AsyncFiberException by error name or message
      const errorName = error?.constructor?.name || '';
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isAsyncFiberError =
        errorName === 'AsyncFiberException' ||
        errorMessage.includes('cannot be resolved synchronously') ||
        errorMessage.includes('AsyncFiberException') ||
        errorMessage.includes('shutdown') ||
        errorMessage.includes('interrupt');

      if (isAsyncFiberError) {
        this.logger.warn(
          () =>
            `Failed to enqueue task ${task.id}: ${errorMessage} - task will be skipped`,
        );
        // Don't throw - allow the test to continue
        // In production, this indicates the queue is full or worker is suspended
      } else {
        // Re-throw unexpected errors
        this.logger.error(
          () => `Unexpected error enqueueing task ${task.id}: ${error}`,
        );
        throw error;
      }
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return Effect.runSync(Queue.size(this.queue));
  }

  /**
   * Shutdown the queue service
   *
   * ## Effect-TS Cleanup
   *
   * Properly shuts down the Effect-TS resources:
   *
   * 1. **Fiber.interrupt**: Interrupts the background worker fiber, stopping task processing
   * 2. **Queue.shutdown**: Shuts down the queue, preventing further operations
   *
   * Both operations use `Effect.runSync` as they should complete synchronously during shutdown.
   * The worker fiber will stop processing new tasks, and any tasks already being processed
   * will complete before the fiber is fully interrupted.
   */
  shutdown(): void {
    if (this.workerFiber) {
      // Interrupt the worker fiber to stop processing tasks
      Effect.runSync(Fiber.interrupt(this.workerFiber));
      this.workerFiber = null;
    }

    // Shutdown the queue to prevent further operations
    Effect.runSync(Queue.shutdown(this.queue));
    this.logger.debug(() => 'Queue service shutdown complete');
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): TaskStatus {
    return this.taskRegistry.getStatus(taskId);
  }

  /**
   * Get task information by task ID
   */
  getTaskInfo(
    taskId: string,
  ): { fileUri: string; documentVersion?: number } | null {
    const entry = this.taskRegistry.getTaskEntry(taskId);
    if (!entry || entry.task._tag !== 'SymbolProcessingTask') {
      return null;
    }
    return {
      fileUri: entry.task.fileUri,
      documentVersion: entry.task.documentVersion,
    };
  }

  /**
   * Check if there's a pending or running task for a file/version combination
   */
  hasPendingTaskForFile(fileUri: string, documentVersion?: number): boolean {
    return this.taskRegistry.hasPendingTaskForFile(fileUri, documentVersion);
  }

  /**
   * Find the task ID for a pending or running task for a file/version combination
   */
  findPendingTaskIdForFile(
    fileUri: string,
    documentVersion?: number,
  ): string | null {
    return this.taskRegistry.findPendingTaskIdForFile(fileUri, documentVersion);
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): QueueStats {
    const taskStats = this.taskRegistry.getStats();
    return {
      queueSize: this.getQueueSize(),
      pendingTasks: taskStats.pending,
      runningTasks: taskStats.running,
      completedTasks: taskStats.completed,
      failedTasks: taskStats.failed,
      averageProcessingTime: taskStats.averageProcessingTime,
      throughput: this.calculateThroughput(taskStats),
    };
  }

  /**
   * Calculate throughput (tasks per second)
   */
  private calculateThroughput(taskStats: any): number {
    // Simple throughput calculation
    // In a real implementation, this would track actual throughput over time
    return taskStats.completed > 0 ? taskStats.completed / 60 : 0; // Assume 1 minute window
  }
}

/**
 * Main integration service that provides a simple interface for queuing Apex symbol processing
 */
export class ApexSymbolIndexingIntegration {
  private readonly indexingService: ApexSymbolIndexingService;
  private readonly logger = getLogger();

  constructor(symbolManager: ApexSymbolManager) {
    this.indexingService = new ApexSymbolIndexingService(symbolManager);
    // Start the background worker
    this.indexingService.startWorker();
  }

  /**
   * Queue a SymbolTable for background processing
   */
  processSymbolTable(
    symbolTable: SymbolTable,
    fileUri: string,
    options: SymbolProcessingOptions = {},
    documentVersion?: number,
  ): string {
    // Check if there's already a pending/running task for this file/version
    const existingTaskId = this.indexingService.findPendingTaskIdForFile(
      fileUri,
      documentVersion,
    );
    if (existingTaskId) {
      this.logger.debug(
        () =>
          `Deduplication: skipping symbol processing for ${fileUri} ` +
          `(version ${documentVersion ?? 'unknown'}) - ` +
          `task ${existingTaskId} already pending/running`,
      );
      return existingTaskId;
    }

    const task = this.createTask(
      symbolTable,
      fileUri,
      options,
      documentVersion,
    );

    // Enqueue the task
    this.indexingService.enqueue(task);

    this.logger.debug(() => `Symbol processing scheduled: ${task.id}`);
    return task.id;
  }

  /**
   * Get task status
   */
  getTaskStatus(taskId: string): TaskStatus {
    return this.indexingService.getTaskStatus(taskId);
  }

  /**
   * Get task information by task ID
   */
  getTaskInfo(
    taskId: string,
  ): { fileUri: string; documentVersion?: number } | null {
    return this.indexingService.getTaskInfo(taskId);
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): QueueStats {
    return this.indexingService.getQueueStats();
  }

  /**
   * Shutdown the symbol indexing system
   */
  shutdown(): void {
    this.indexingService.shutdown();
    this.logger.debug(() => 'Symbol indexing shutdown complete');
  }

  /**
   * Create a new processing task
   */
  private createTask(
    symbolTable: SymbolTable,
    fileUri: string,
    options: SymbolProcessingOptions,
    documentVersion?: number,
  ): SymbolProcessingTask {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      _tag: 'SymbolProcessingTask',
      id: taskId,
      symbolTable,
      fileUri,
      documentVersion,
      priority: options.priority || 'NORMAL',
      options: {
        priority: 'NORMAL',
        timeout: 30000, // 30 seconds
        retryAttempts: 3,
        concurrency: 4,
        enableCrossFileResolution: true,
        enableReferenceProcessing: true,
        enableMetricsCollection: true,
        ...options,
      },
      timestamp: Date.now(),
      retryCount: 0,
    };
  }

  /**
   * Schedule a comment association persistence task
   */
  scheduleCommentAssociations(
    fileUri: string,
    associations: CommentAssociation[],
    priority: TaskPriority = 'NORMAL',
  ): string {
    const taskId = `task_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const task: CommentAssociationTask = {
      _tag: 'CommentAssociationTask',
      id: taskId,
      fileUri,
      associations,
      priority,
      timestamp: Date.now(),
    };
    this.indexingService.enqueue(task);
    this.logger.debug(() => `Comment associations scheduled: ${taskId}`);
    return taskId;
  }
}
