/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger } from '@salesforce/apex-lsp-shared';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { ServiceRegistry } from '../registry/ServiceRegistry';
import {
  LSPRequestType,
  RequestPriority,
  LSPRequestTask,
  LSPQueueStats,
} from './LSPRequestQueue';

/**
 * Generic LSP Request Queue that uses a service registry
 * for dynamic request handling without hard-coded service dependencies
 */
export class GenericLSPRequestQueue {
  private readonly logger = getLogger();

  // Priority-based queues using simple arrays (safer than Effect queues in constructor)
  private readonly immediateQueue: LSPRequestTask[] = [];
  private readonly highPriorityQueue: LSPRequestTask[] = [];
  private readonly normalPriorityQueue: LSPRequestTask[] = [];
  private readonly lowPriorityQueue: LSPRequestTask[] = [];

  // Simple processing interval (replaces Effect worker fibers)
  private processingInterval: NodeJS.Timeout | null = null;

  // Statistics tracking
  private stats = {
    totalProcessed: 0,
    totalFailed: 0,
    totalProcessingTime: 0,
    activeWorkers: 0,
  };

  constructor(private readonly serviceRegistry: ServiceRegistry) {
    // Initialize with simple arrays to avoid Effect.js runtime issues in constructor
    // Queues are now simple arrays initialized above

    this.logger.debug(
      () =>
        'Generic LSP Request Queue initialized with service registry (simple queues)',
    );

    // Start basic processing loop
    this.startProcessing();
  }

  /**
   * Add task to appropriate queue based on priority
   */
  private addToQueue(task: LSPRequestTask): void {
    switch (task.priority) {
      case 'IMMEDIATE':
        this.immediateQueue.push(task);
        break;
      case 'HIGH':
        this.highPriorityQueue.push(task);
        break;
      case 'NORMAL':
        this.normalPriorityQueue.push(task);
        break;
      case 'LOW':
        this.lowPriorityQueue.push(task);
        break;
      default:
        this.normalPriorityQueue.push(task);
    }
  }

  /**
   * Start simple processing loop instead of Effect workers
   */
  private startProcessing(): void {
    // Process queues every 10ms
    this.processingInterval = setInterval(() => {
      this.processQueues();
    }, 10);
  }

  /**
   * Process all queues in priority order
   */
  private async processQueues(): Promise<void> {
    // Process immediate first
    await this.processQueue(this.immediateQueue);
    // Then high priority
    await this.processQueue(this.highPriorityQueue);
    // Then normal
    await this.processQueue(this.normalPriorityQueue);
    // Finally low priority
    await this.processQueue(this.lowPriorityQueue);
  }

  /**
   * Process a single queue
   */
  private async processQueue(queue: LSPRequestTask[]): Promise<void> {
    while (queue.length > 0) {
      const task = queue.shift();
      if (task) {
        this.processTask(task);
      }
    }
  }

  /**
   * Process a single task
   */
  private async processTask(task: LSPRequestTask): Promise<void> {
    try {
      const startTime = Date.now();
      const result = await this.executeRequest(task);
      const processingTime = Date.now() - startTime;

      this.updateStats(processingTime, true);
      task.callback?.(result);

      this.logger.debug(
        () => `Completed ${task.type} request in ${processingTime}ms`,
      );
    } catch (error) {
      this.updateStats(0, false);
      task.errorCallback?.(error as Error);

      this.logger.error(
        () => `Failed to process ${task.type} request: ${error}`,
      );
    }
  }

  /**
   * Submit an LSP request for processing
   */
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
    // Get configuration from service registry
    const priority = options.priority || this.serviceRegistry.getPriority(type);
    const timeout = options.timeout || this.serviceRegistry.getTimeout(type);
    const maxRetries = this.serviceRegistry.getMaxRetries(type);

    const task: LSPRequestTask = {
      id: this.generateTaskId(),
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

    // For immediate requests, try to process synchronously first
    if (priority === 'IMMEDIATE') {
      return this.processImmediateRequest(task);
    }

    // For other priorities, queue for background processing
    return this.queueRequest(task);
  }

  /**
   * Process immediate requests synchronously for instant response
   */
  private async processImmediateRequest<T>(task: LSPRequestTask): Promise<T> {
    try {
      this.logger.debug(() => `Processing immediate request: ${task.type}`);

      const startTime = Date.now();
      const result = await this.executeRequest(task);
      const processingTime = Date.now() - startTime;

      this.updateStats(processingTime, true);

      this.logger.debug(
        () => `Immediate request ${task.type} completed in ${processingTime}ms`,
      );

      task.callback?.(result);
      return result;
    } catch (error) {
      this.updateStats(0, false);
      this.logger.error(
        () => `Immediate request ${task.type} failed: ${error}`,
      );

      task.errorCallback?.(error as Error);
      throw error;
    }
  }

  /**
   * Queue request for background processing
   */
  private async queueRequest<T>(task: LSPRequestTask): Promise<T> {
    return new Promise((resolve, reject) => {
      // Wrap callbacks to resolve/reject the promise
      const wrappedTask: LSPRequestTask = {
        ...task,
        callback: (result: T) => {
          task.callback?.(result);
          resolve(result);
        },
        errorCallback: (error: Error) => {
          task.errorCallback?.(error);
          reject(error);
        },
      };

      // Add to appropriate queue (simple array push)
      this.addToQueue(wrappedTask);

      this.logger.debug(
        () => `Queued ${task.type} request with priority ${task.priority}`,
      );
    });
  }

  // Old Effect-based workers removed - using simple processing loop instead

  // Old createWorker method removed - using simple processing loop instead

  /**
   * Execute the actual LSP request using the service registry
   */
  private async executeRequest(task: LSPRequestTask): Promise<any> {
    const startTime = Date.now();

    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`Request timeout: ${task.type}`)),
        task.timeout,
      );
    });

    // Execute the request using the service registry
    const requestPromise = this.executeRequestByType(task);

    // Race between request completion and timeout
    const result = await Promise.race([requestPromise, timeoutPromise]);

    const processingTime = Date.now() - startTime;
    this.logger.debug(
      () => `${task.type} request completed in ${processingTime}ms`,
    );

    return result;
  }

  /**
   * Execute request using the service registry
   */
  private async executeRequestByType(task: LSPRequestTask): Promise<any> {
    const handler = this.serviceRegistry.getHandler(task.type);
    if (!handler) {
      throw new Error(`No handler registered for request type: ${task.type}`);
    }

    return handler.process(task.params, task.symbolManager);
  }

  // Old getQueueForPriority method removed - using simple array queues instead

  /**
   * Update statistics
   */
  private updateStats(processingTime: number, success: boolean): void {
    this.stats.totalProcessed++;
    this.stats.totalProcessingTime += processingTime;

    if (!success) {
      this.stats.totalFailed++;
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): LSPQueueStats {
    return {
      immediateQueueSize: this.immediateQueue.length,
      highPriorityQueueSize: this.highPriorityQueue.length,
      normalPriorityQueueSize: this.normalPriorityQueue.length,
      lowPriorityQueueSize: this.lowPriorityQueue.length,
      totalProcessed: this.stats.totalProcessed,
      totalFailed: this.stats.totalFailed,
      averageProcessingTime:
        this.stats.totalProcessed > 0
          ? this.stats.totalProcessingTime / this.stats.totalProcessed
          : 0,
      activeWorkers: this.processingInterval ? 1 : 0, // Simple processing = 1 worker
    };
  }

  /**
   * Shutdown the queue system
   */
  shutdown(): void {
    this.logger.debug(() => 'Shutting down Generic LSP Request Queue');

    // Stop the processing interval
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Clear all queues
    this.immediateQueue.length = 0;
    this.highPriorityQueue.length = 0;
    this.normalPriorityQueue.length = 0;
    this.lowPriorityQueue.length = 0;
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `lsp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
