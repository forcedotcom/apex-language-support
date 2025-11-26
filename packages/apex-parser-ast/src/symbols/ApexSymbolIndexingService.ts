/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { getLogger, Priority } from '@salesforce/apex-lsp-shared';
import { SymbolTable } from '../types/symbol';
import type { CommentAssociation } from '../parser/listeners/ApexCommentCollectorListener';
import { ApexSymbolManager } from './ApexSymbolManager';
import {
  offer,
  createQueuedItem,
  metrics,
} from '../queue/priority-scheduler-utils';

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
  priority?: Priority;
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
  readonly priority: Priority;
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
  readonly priority: Priority;
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
 * Priority Scheduler Service for managing Apex symbol processing tasks
 * This service uses the shared priority scheduler and delegates actual processing to ApexSymbolManager
 *
 * ## Priority Scheduler Usage
 *
 * This service uses the shared priority scheduler for task processing:
 *
 * - **Scheduler**: Uses `priority-scheduler-utils` for priority-based task scheduling
 * - **Task Processing**: Tasks are wrapped in Effects and scheduled with their priority
 * - **No Worker Fiber**: The scheduler handles task execution automatically
 *
 * ### Important Notes:
 *
 * 1. **Scheduler Initialization**: The scheduler must be initialized before using this service.
 *    This is handled by `SchedulerInitializationService` at application startup.
 *
 * 2. **Task Priority**: Tasks use the `Priority` enum from `@salesforce/apex-lsp-shared`.
 *    Default priority is `Priority.Normal`.
 *
 * 3. **Task Registry**: Maintains a registry of tasks for status tracking and deduplication.
 */
export class ApexSymbolIndexingService {
  private readonly taskRegistry: TaskRegistry;
  private readonly symbolManager: ApexSymbolManager;
  private readonly logger = getLogger();

  constructor(symbolManager: ApexSymbolManager) {
    this.symbolManager = symbolManager;
    this.taskRegistry = new TaskRegistry();
  }

  /**
   * Process a single task by delegating to the symbol manager
   * Returns an Effect for use with the priority scheduler
   */
  private processTask(task: IndexingTask): Effect.Effect<void, Error, never> {
    const self = this;
    return Effect.gen(function* () {
      self.taskRegistry.updateTaskStatus(task.id, 'RUNNING');

      self.logger.debug(() => `Processing task ${task.id} for ${task.fileUri}`);

      if (task._tag === 'SymbolProcessingTask') {
        // Yield control before starting symbol processing
        yield* Effect.yieldNow();

        // Delegate to the symbol manager to do the actual work
        self.logger.debug(
          () =>
            `[processTask] Adding symbol table for ${task.fileUri} (task: ${task.id})`,
        );
        const symbolsBefore = self.symbolManager.findSymbolsInFile(
          task.fileUri,
        );
        self.logger.debug(
          () =>
            `[processTask] Symbols in file before addSymbolTable: ${symbolsBefore.length}`,
        );

        // Process symbols with yielding
        yield* Effect.tryPromise({
          try: () =>
            self.symbolManager.addSymbolTable(task.symbolTable, task.fileUri),
          catch: (error) => new Error(`Failed to add symbol table: ${error}`),
        });

        const symbolsAfter = self.symbolManager.findSymbolsInFile(task.fileUri);
        self.logger.debug(
          () =>
            `[processTask] Symbols in file after addSymbolTable: ${symbolsAfter.length}`,
        );
        if (symbolsAfter.length > 0) {
          symbolsAfter.forEach((symbol, idx) => {
            self.logger.debug(
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
          self.logger.debug(
            () => `Cross-file resolution enabled for task ${task.id}`,
          );
          // The symbol manager will handle cross-file resolution internally
        }
      } else if (task._tag === 'CommentAssociationTask') {
        // Persist comment associations for later retrieval (e.g., hover)
        self.symbolManager.setCommentAssociations(
          task.fileUri,
          task.associations,
        );
      }

      self.taskRegistry.updateTaskStatus(task.id, 'COMPLETED');
      self.logger.debug(() => `Task ${task.id} executed successfully`);
    }).pipe(
      Effect.catchAll((error) => {
        self.taskRegistry.updateTaskStatus(
          task.id,
          'FAILED',
          undefined,
          String(error),
        );
        self.logger.error(() => `Task ${task.id} failed: ${error}`);
        return Effect.fail(error as Error);
      }),
    );
  }

  /**
   * Enqueue a task for background processing using the priority scheduler
   *
   * @param task The indexing task to enqueue
   */
  enqueue(task: IndexingTask): void {
    this.taskRegistry.registerTask(task);

    try {
      // Create a QueuedItem from the task processing Effect
      const queuedItemEffect = createQueuedItem(
        this.processTask(task),
        task._tag === 'SymbolProcessingTask'
          ? 'symbol-indexing'
          : 'comment-association',
      );

      // Schedule the task with its priority
      const priority =
        task._tag === 'SymbolProcessingTask' ? task.priority : Priority.Normal;
      const scheduledTaskEffect = Effect.gen(function* () {
        const queuedItem = yield* queuedItemEffect;
        return yield* offer(priority, queuedItem);
      });

      // Run the scheduling effect
      Effect.runSync(scheduledTaskEffect);
      this.logger.debug(
        () => `Task ${task.id} enqueued with priority ${priority}`,
      );
    } catch (error) {
      // Handle scheduling errors
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        () => `Failed to enqueue task ${task.id}: ${errorMessage}`,
      );
      // Mark task as failed in registry
      this.taskRegistry.updateTaskStatus(
        task.id,
        'FAILED',
        undefined,
        errorMessage,
      );
    }
  }

  /**
   * Get queue size (aggregated from scheduler metrics)
   */
  getQueueSize(): number {
    try {
      const schedulerMetrics = Effect.runSync(metrics());
      // Sum all priority queue sizes
      return Object.values(schedulerMetrics.queueSizes).reduce(
        (sum, size) => sum + size,
        0,
      );
    } catch (error) {
      // If scheduler not initialized or error getting metrics, return 0
      this.logger.debug(() => `Failed to get queue size: ${error}`);
      return 0;
    }
  }

  /**
   * Shutdown the indexing service
   * Note: The scheduler itself is shared and should not be shut down here.
   * Only cleanup local resources (task registry).
   */
  shutdown(): void {
    // Cleanup task registry (completed/failed tasks older than 5 minutes)
    this.taskRegistry.cleanup(5 * 60 * 1000);
    this.logger.debug(() => 'Indexing service shutdown complete');
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
   * Get queue statistics (aggregated from scheduler metrics and task registry)
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
    // Note: No worker needed - scheduler handles task execution
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
      priority: options.priority || Priority.Normal,
      options: {
        priority: Priority.Normal,
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
    priority: Priority = Priority.Normal,
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
