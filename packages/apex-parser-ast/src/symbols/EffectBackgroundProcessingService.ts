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
  readonly priority: TaskPriority;
  readonly options: SymbolProcessingOptions;
  readonly timestamp: number;
  readonly retryCount: number;
}

/**
 * Task registry entry for tracking task status
 */
interface TaskRegistryEntry {
  task: SymbolProcessingTask;
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
  registerTask(task: SymbolProcessingTask): void {
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
 */
export class ApexSymbolIndexingService {
  private readonly queue: Queue.Queue<SymbolProcessingTask>;
  private readonly taskRegistry: TaskRegistry;
  private readonly symbolManager: ApexSymbolManager;
  private readonly logger = getLogger();
  private workerFiber: any = null;

  constructor(symbolManager: ApexSymbolManager) {
    this.symbolManager = symbolManager;
    this.taskRegistry = new TaskRegistry();

    // Use Effect-TS Queue for thread-safe operations with back-pressure
    this.queue = Effect.runSync(Queue.bounded<SymbolProcessingTask>(100));
  }

  /**
   * Start the background worker that processes tasks from the queue
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
        const task = yield* Queue.take(self.queue);

        // Process the task
        yield* Effect.try({
          try: () => self.processTask(task),
          catch: (error) => new Error(`Task processing failed: ${error}`),
        });
      }
    });

    // Run the worker in the background using Effect.runFork
    this.workerFiber = Effect.runFork(workerProgram);
    this.logger.debug(() => 'Background worker started');
  }

  /**
   * Process a single task by delegating to the symbol manager
   */
  private processTask(task: SymbolProcessingTask): void {
    try {
      this.taskRegistry.updateTaskStatus(task.id, 'RUNNING');

      this.logger.debug(() => `Processing task ${task.id} for ${task.fileUri}`);

      // Delegate to the symbol manager to do the actual work
      this.symbolManager.addSymbolTable(task.symbolTable, task.fileUri);

      // If cross-file resolution is enabled, trigger it
      if (task.options.enableCrossFileResolution) {
        this.logger.debug(
          () => `Cross-file resolution enabled for task ${task.id}`,
        );
        // The symbol manager will handle cross-file resolution internally
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
   */
  enqueue(task: SymbolProcessingTask): void {
    this.taskRegistry.registerTask(task);

    // Use Effect.runSync to offer the task to the queue
    Effect.runSync(Queue.offer(this.queue, task));

    this.logger.debug(() => `Task ${task.id} enqueued`);
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return Effect.runSync(Queue.size(this.queue));
  }

  /**
   * Shutdown the queue service
   */
  shutdown(): void {
    if (this.workerFiber) {
      Effect.runSync(Fiber.interrupt(this.workerFiber));
      this.workerFiber = null;
    }

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
  ): string {
    const task = this.createTask(symbolTable, fileUri, options);

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
  ): SymbolProcessingTask {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      _tag: 'SymbolProcessingTask',
      id: taskId,
      symbolTable,
      fileUri,
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
}
