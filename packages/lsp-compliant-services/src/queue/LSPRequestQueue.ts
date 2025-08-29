/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect, Queue, Fiber, Duration } from 'effect';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { HoverProcessingService } from '../services/HoverProcessingService';
import { CompletionProcessingService } from '../services/CompletionProcessingService';
import { DefinitionProcessingService } from '../services/DefinitionProcessingService';
import { ReferencesProcessingService } from '../services/ReferencesProcessingService';
import { CodeActionProcessingService } from '../services/CodeActionProcessingService';
import { SignatureHelpProcessingService } from '../services/SignatureHelpProcessingService';
import { RenameProcessingService } from '../services/RenameProcessingService';

/**
 * LSP request types with their priority levels
 */
export type LSPRequestType =
  | 'hover'
  | 'completion'
  | 'definition'
  | 'references'
  | 'documentSymbol'
  | 'workspaceSymbol'
  | 'diagnostics'
  | 'codeAction'
  | 'signatureHelp'
  | 'rename'
  | 'documentOpen'
  | 'documentSave'
  | 'documentChange'
  | 'documentClose';

/**
 * Request priority levels
 */
export type RequestPriority = 'IMMEDIATE' | 'HIGH' | 'NORMAL' | 'LOW';

/**
 * LSP request task interface
 */
export interface LSPRequestTask {
  readonly id: string;
  readonly type: LSPRequestType;
  readonly priority: RequestPriority;
  readonly params: any;
  readonly symbolManager: ISymbolManager;
  readonly timestamp: number;
  readonly timeout: number;
  readonly retryAttempts: number;
  readonly maxRetries: number;
  readonly callback?: (result: any) => void;
  readonly errorCallback?: (error: Error) => void;
}

/**
 * LSP request result
 */
export interface LSPRequestResult<T = any> {
  readonly taskId: string;
  readonly type: LSPRequestType;
  readonly result: T;
  readonly processingTime: number;
  readonly timestamp: number;
}

/**
 * Queue statistics
 */
export interface LSPQueueStats {
  readonly immediateQueueSize: number;
  readonly highPriorityQueueSize: number;
  readonly normalPriorityQueueSize: number;
  readonly lowPriorityQueueSize: number;
  readonly totalProcessed: number;
  readonly totalFailed: number;
  readonly averageProcessingTime: number;
  readonly activeWorkers: number;
}

/**
 * LSP Request Queue Manager
 *
 * Handles LSP requests with different priority levels and ensures
 * immediate response for user-facing requests while providing
 * robust background processing for analysis requests.
 */
export class LSPRequestQueue {
  private readonly logger = getLogger();

  // Priority-based queues using Effect-TS
  private readonly immediateQueue: Queue.Queue<LSPRequestTask>;
  private readonly highPriorityQueue: Queue.Queue<LSPRequestTask>;
  private readonly normalPriorityQueue: Queue.Queue<LSPRequestTask>;
  private readonly lowPriorityQueue: Queue.Queue<LSPRequestTask>;

  // Worker fibers for each priority level
  private immediateWorker: Fiber.Fiber<void, never> | null = null;
  private highPriorityWorker: Fiber.Fiber<void, never> | null = null;
  private normalPriorityWorker: Fiber.Fiber<void, never> | null = null;
  private lowPriorityWorker: Fiber.Fiber<void, never> | null = null;

  // Statistics tracking
  private stats = {
    totalProcessed: 0,
    totalFailed: 0,
    totalProcessingTime: 0,
    activeWorkers: 0,
  };

  // Request type to priority mapping
  private readonly requestPriorities: Record<LSPRequestType, RequestPriority> =
    {
      // Immediate - User interaction, must respond instantly
      hover: 'IMMEDIATE',
      completion: 'IMMEDIATE',
      signatureHelp: 'IMMEDIATE',

      // High - Navigation, should be fast
      definition: 'HIGH',
      documentSymbol: 'HIGH',
      documentOpen: 'HIGH',

      // Normal - Analysis, can be background processed
      references: 'NORMAL',
      diagnostics: 'NORMAL',
      workspaceSymbol: 'NORMAL',
      documentSave: 'NORMAL',
      documentChange: 'NORMAL',

      // Low - Heavy analysis, background only
      codeAction: 'LOW',
      rename: 'LOW',
      documentClose: 'IMMEDIATE',
    };

  // Request timeouts (in milliseconds)
  private readonly requestTimeouts: Record<RequestPriority, number> = {
    IMMEDIATE: 100, // 100ms for immediate requests
    HIGH: 1000, // 1 second for high priority
    NORMAL: 5000, // 5 seconds for normal priority
    LOW: 30000, // 30 seconds for low priority
  };

  // Retry policies
  private readonly retryPolicies: Record<RequestPriority, number> = {
    IMMEDIATE: 0, // No retries for immediate requests
    HIGH: 1, // 1 retry for high priority
    NORMAL: 2, // 2 retries for normal priority
    LOW: 3, // 3 retries for low priority
  };

  constructor() {
    // Initialize Effect-TS queues with appropriate sizes
    this.immediateQueue = Effect.runSync(Queue.bounded<LSPRequestTask>(50));
    this.highPriorityQueue = Effect.runSync(Queue.bounded<LSPRequestTask>(100));
    this.normalPriorityQueue = Effect.runSync(
      Queue.bounded<LSPRequestTask>(200),
    );
    this.lowPriorityQueue = Effect.runSync(Queue.bounded<LSPRequestTask>(100));

    // Start worker fibers
    this.startWorkers();

    this.logger.debug(
      () => 'LSP Request Queue initialized with priority-based processing',
    );
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
    const priority = options.priority || this.requestPriorities[type];
    const timeout = options.timeout || this.requestTimeouts[priority];
    const maxRetries = this.retryPolicies[priority];

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

      // Add to appropriate queue
      const queue = this.getQueueForPriority(task.priority);
      Effect.runSync(Queue.offer(queue, wrappedTask));

      this.logger.debug(
        () => `Queued ${task.type} request with priority ${task.priority}`,
      );
    });
  }

  /**
   * Start worker fibers for each priority level
   */
  private startWorkers(): void {
    // Immediate worker - processes tasks instantly
    this.immediateWorker = Effect.runFork(
      this.createWorker(this.immediateQueue, 'IMMEDIATE', {
        concurrency: 'unbounded',
      }),
    );

    // High priority worker - processes tasks quickly
    this.highPriorityWorker = Effect.runFork(
      this.createWorker(this.highPriorityQueue, 'HIGH', { concurrency: 4 }),
    );

    // Normal priority worker - background processing
    this.normalPriorityWorker = Effect.runFork(
      this.createWorker(this.normalPriorityQueue, 'NORMAL', { concurrency: 2 }),
    );

    // Low priority worker - heavy background processing
    this.lowPriorityWorker = Effect.runFork(
      this.createWorker(this.lowPriorityQueue, 'LOW', { concurrency: 1 }),
    );

    this.stats.activeWorkers = 4;
  }

  /**
   * Create a worker fiber for a specific priority queue
   */
  private createWorker(
    queue: Queue.Queue<LSPRequestTask>,
    priority: RequestPriority,
    options: { concurrency: number | 'unbounded' },
  ): Effect.Effect<never, never, never> {
    const self = this;
    return Effect.gen(function* (_) {
      while (true) {
        // Take a task from the queue
        const task = yield* _(Queue.take(queue));

        // Process the task with appropriate concurrency
        yield* _(
          Effect.fork(
            Effect.gen(function* (_) {
              try {
                const result = yield* _(
                  Effect.promise(() => self.executeRequest(task)),
                );

                self.updateStats(Date.now() - task.timestamp, true);
                task.callback?.(result);
              } catch (error) {
                self.updateStats(0, false);
                self.logger.error(
                  () => `${priority} request ${task.type} failed: ${error}`,
                );

                // Retry logic for non-immediate requests
                if (
                  priority !== 'IMMEDIATE' &&
                  task.retryAttempts < task.maxRetries
                ) {
                  // Create a mutable copy for retry attempts
                  const retryTask = {
                    ...task,
                    retryAttempts: task.retryAttempts + 1,
                  };
                  self.logger.debug(
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
              }
            }),
          ),
        );
      }
    });
  }

  /**
   * Execute the actual LSP request
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

    // Execute the request based on type
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
   * Execute request based on its type
   */
  private async executeRequestByType(task: LSPRequestTask): Promise<any> {
    switch (task.type) {
      case 'hover':
        return this.executeHoverRequest(task);
      case 'completion':
        return this.executeCompletionRequest(task);
      case 'definition':
        return this.executeDefinitionRequest(task);
      case 'references':
        return this.executeReferencesRequest(task);
      case 'documentSymbol':
        return this.executeDocumentSymbolRequest(task);
      case 'workspaceSymbol':
        return this.executeWorkspaceSymbolRequest(task);
      case 'diagnostics':
        return this.executeDiagnosticsRequest(task);
      case 'codeAction':
        return this.executeCodeActionRequest(task);
      case 'signatureHelp':
        return this.executeSignatureHelpRequest(task);
      case 'rename':
        return this.executeRenameRequest(task);
      case 'documentOpen':
        return this.executeDocumentOpenRequest(task);
      case 'documentSave':
        return this.executeDocumentSaveRequest(task);
      case 'documentChange':
        return this.executeDocumentChangeRequest(task);
      case 'documentClose':
        return this.executeDocumentCloseRequest(task);
      default:
        throw new Error(`Unknown request type: ${task.type}`);
    }
  }

  /**
   * Execute hover request
   */
  private async executeHoverRequest(task: LSPRequestTask): Promise<any> {
    const service = new HoverProcessingService(getLogger());
    return service.processHover(task.params);
  }

  /**
   * Execute completion request
   */
  private async executeCompletionRequest(task: LSPRequestTask): Promise<any> {
    const service = new CompletionProcessingService(getLogger());
    return service.processCompletion(task.params);
  }

  /**
   * Execute definition request
   */
  private async executeDefinitionRequest(task: LSPRequestTask): Promise<any> {
    const service = new DefinitionProcessingService(getLogger());
    return service.processDefinition(task.params);
  }

  /**
   * Execute references request
   */
  private async executeReferencesRequest(task: LSPRequestTask): Promise<any> {
    const service = new ReferencesProcessingService(getLogger());
    return service.processReferences(task.params);
  }

  /**
   * Execute document symbol request
   */
  private async executeDocumentSymbolRequest(
    task: LSPRequestTask,
  ): Promise<any> {
    const { DocumentSymbolProcessingService } = await import(
      '../services/DocumentSymbolProcessingService'
    );
    const service = new DocumentSymbolProcessingService(this.logger);
    return service.processDocumentSymbol(task.params);
  }

  /**
   * Execute workspace symbol request
   */
  private async executeWorkspaceSymbolRequest(
    task: LSPRequestTask,
  ): Promise<any> {
    const { WorkspaceSymbolProcessingService } = await import(
      '../services/WorkspaceSymbolProcessingService'
    );
    const service = new WorkspaceSymbolProcessingService(this.logger);
    return service.processWorkspaceSymbol(task.params);
  }

  /**
   * Execute diagnostics request
   */
  private async executeDiagnosticsRequest(task: LSPRequestTask): Promise<any> {
    const { DiagnosticProcessingService } = await import(
      '../services/DiagnosticProcessingService'
    );
    const service = new DiagnosticProcessingService(this.logger);
    return service.processDiagnostic(task.params);
  }

  /**
   * Execute code action request
   */
  private async executeCodeActionRequest(task: LSPRequestTask): Promise<any> {
    const service = new CodeActionProcessingService(getLogger());
    return service.processCodeAction(task.params);
  }

  /**
   * Execute signature help request
   */
  private async executeSignatureHelpRequest(
    task: LSPRequestTask,
  ): Promise<any> {
    const service = new SignatureHelpProcessingService(getLogger());
    return service.processSignatureHelp(task.params);
  }

  /**
   * Execute rename request
   */
  private async executeRenameRequest(task: LSPRequestTask): Promise<any> {
    const service = new RenameProcessingService(getLogger());
    return service.processRename(task.params);
  }

  /**
   * Execute document open request
   */
  private async executeDocumentOpenRequest(task: LSPRequestTask): Promise<any> {
    const { DidOpenDocumentHandler } = await import(
      '../handlers/DidOpenDocumentHandler'
    );
    const handler = new DidOpenDocumentHandler();
    return handler.handleDocumentOpen(task.params);
  }

  /**
   * Execute document save request
   */
  private async executeDocumentSaveRequest(task: LSPRequestTask): Promise<any> {
    const { HandlerFactory } = await import('../factories/HandlerFactory');
    const handler = HandlerFactory.createDidSaveDocumentHandler();
    return handler.handleDocumentSave(task.params);
  }

  /**
   * Execute document change request
   */
  private async executeDocumentChangeRequest(
    task: LSPRequestTask,
  ): Promise<any> {
    const { HandlerFactory } = await import('../factories/HandlerFactory');
    const handler = HandlerFactory.createDidChangeDocumentHandler();
    return handler.handleDocumentChange(task.params);
  }

  /**
   * Execute document close request
   */
  private async executeDocumentCloseRequest(
    task: LSPRequestTask,
  ): Promise<any> {
    const { HandlerFactory } = await import('../factories/HandlerFactory');
    const handler = HandlerFactory.createDidCloseDocumentHandler();
    return handler.handleDocumentClose(task.params);
  }

  /**
   * Get queue for specific priority
   */
  private getQueueForPriority(
    priority: RequestPriority,
  ): Queue.Queue<LSPRequestTask> {
    switch (priority) {
      case 'IMMEDIATE':
        return this.immediateQueue;
      case 'HIGH':
        return this.highPriorityQueue;
      case 'NORMAL':
        return this.normalPriorityQueue;
      case 'LOW':
        return this.lowPriorityQueue;
      default:
        return this.normalPriorityQueue;
    }
  }

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
      immediateQueueSize: Effect.runSync(Queue.size(this.immediateQueue)),
      highPriorityQueueSize: Effect.runSync(Queue.size(this.highPriorityQueue)),
      normalPriorityQueueSize: Effect.runSync(
        Queue.size(this.normalPriorityQueue),
      ),
      lowPriorityQueueSize: Effect.runSync(Queue.size(this.lowPriorityQueue)),
      totalProcessed: this.stats.totalProcessed,
      totalFailed: this.stats.totalFailed,
      averageProcessingTime:
        this.stats.totalProcessed > 0
          ? this.stats.totalProcessingTime / this.stats.totalProcessed
          : 0,
      activeWorkers: this.stats.activeWorkers,
    };
  }

  /**
   * Shutdown the queue system
   */
  shutdown(): void {
    this.logger.debug(() => 'Shutting down LSP Request Queue');

    // Interrupt all worker fibers
    if (this.immediateWorker) {
      Effect.runSync(Fiber.interrupt(this.immediateWorker));
    }
    if (this.highPriorityWorker) {
      Effect.runSync(Fiber.interrupt(this.highPriorityWorker));
    }
    if (this.normalPriorityWorker) {
      Effect.runSync(Fiber.interrupt(this.normalPriorityWorker));
    }
    if (this.lowPriorityWorker) {
      Effect.runSync(Fiber.interrupt(this.lowPriorityWorker));
    }

    // Shutdown all queues
    Effect.runSync(Queue.shutdown(this.immediateQueue));
    Effect.runSync(Queue.shutdown(this.highPriorityQueue));
    Effect.runSync(Queue.shutdown(this.normalPriorityQueue));
    Effect.runSync(Queue.shutdown(this.lowPriorityQueue));

    this.stats.activeWorkers = 0;
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `lsp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
