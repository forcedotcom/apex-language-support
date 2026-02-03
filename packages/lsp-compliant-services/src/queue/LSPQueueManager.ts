/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Priority, getLogger } from '@salesforce/apex-lsp-shared';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
  QueuedItem,
  offer,
  metrics,
  shutdown,
  SchedulerInitializationService,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect, Deferred, Fiber, Cause } from 'effect';
import { LSPRequestType, LSPQueueStats } from './LSPRequestQueue';
import { ServiceRegistry, GenericRequestHandler } from '../registry';

/**
 * Dependencies interface for LSPQueueManager initialization
 */
export interface LSPQueueManagerDependencies {
  serviceFactory: any; // ServiceFactory from lsp-compliant-services
  serviceConfig: any[]; // DEFAULT_SERVICE_CONFIG from lsp-compliant-services
  storageManager: any; // ApexStorageManager from lsp-compliant-services
  settingsManager: any; // ApexSettingsManager from lsp-compliant-services
}

/**
 * LSP Queue Manager
 *
 * Singleton manager for coordinating LSP requests with the symbol manager.
 * Provides a clean interface for LSP services to submit requests with
 * appropriate prioritization and error handling.
 */
export class LSPQueueManager {
  private static instance: LSPQueueManager | null = null;
  private readonly logger = getLogger();
  private readonly symbolManager: ISymbolManager;
  private readonly serviceRegistry: ServiceRegistry;
  private schedulerInitialized = false;
  private isShutdown = false;

  private constructor(dependencies?: LSPQueueManagerDependencies) {
    // Initialize the service registry
    this.serviceRegistry = new ServiceRegistry();

    this.symbolManager =
      ApexSymbolProcessingManager.getInstance().getSymbolManager();

    // Register all services if dependencies are provided
    if (dependencies) {
      this.registerServices(dependencies);
    }

    this.logger.debug(
      'LSP Queue Manager initialized (scheduler initialization handled separately)',
    );
  }

  /**
   * Ensure scheduler is initialized (lazy initialization)
   * Uses centralized SchedulerInitializationService to ensure single initialization
   */
  private async ensureSchedulerInitialized(): Promise<void> {
    // Fast path: if already initialized, return immediately
    if (this.schedulerInitialized) {
      return;
    }

    const schedulerService = SchedulerInitializationService.getInstance();
    await schedulerService.ensureInitialized();
    this.schedulerInitialized = schedulerService.isInitialized();
  }

  /**
   * Create a QueuedItem from request parameters
   */
  private createQueuedItem<T>(
    type: LSPRequestType,
    params: any,
    symbolManager: ISymbolManager,
    timeout: number,
    callback?: (result: T) => void,
    errorCallback?: (error: Error) => void,
  ): Effect.Effect<QueuedItem<T, Error, never>, never, never> {
    const serviceRegistry = this.serviceRegistry;
    const logger = this.logger;
    const taskId = this.generateTaskId();

    return Effect.gen(function* () {
      const fiberDeferred = yield* Deferred.make<
        Fiber.RuntimeFiber<T, Error>,
        Error
      >();

      // Wrap request execution in an Effect
      const requestEffect = Effect.tryPromise({
        try: async () => {
          const handler = serviceRegistry.getHandler(type);
          if (!handler) {
            throw new Error(`No handler registered for request type: ${type}`);
          }
          return handler.process(params, symbolManager);
        },
        catch: (error) => error as Error,
      }).pipe(
        Effect.timeout(timeout),
        Effect.catchAll((error) => {
          errorCallback?.(error as Error);
          logger.error(() => `Failed to process ${type} request: ${error}`);
          return Effect.fail(error);
        }),
        Effect.tap((result) => {
          callback?.(result);
          logger.debug(() => `Completed ${type} request`);
          return Effect.void;
        }),
      );

      return {
        id: taskId,
        eff: requestEffect,
        fiberDeferred,
        requestType: type,
      } satisfies QueuedItem<T, Error, never>;
    });
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `lsp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Register all services with the registry
   */
  private registerServices(dependencies: LSPQueueManagerDependencies): void {
    for (const config of dependencies.serviceConfig) {
      const service = config.serviceFactory({
        serviceFactory: dependencies.serviceFactory,
      });
      const handler = new GenericRequestHandler(
        config.requestType,
        service,
        config.priority,
        config.timeout,
        config.maxRetries,
      );

      this.serviceRegistry.register(handler, {
        priority: config.priority,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
      });
    }

    this.logger.debug(
      () => `Registered ${dependencies.serviceConfig.length} services`,
    );
  }

  /**
   * Get the singleton instance
   * @param dependencies Optional dependencies for initialization
   * (required on first call if services need to be registered)
   */
  static getInstance(
    dependencies?: LSPQueueManagerDependencies,
  ): LSPQueueManager {
    if (!LSPQueueManager.instance) {
      LSPQueueManager.instance = new LSPQueueManager(dependencies);
    }
    return LSPQueueManager.instance;
  }

  /**
   * Submit a hover request
   */
  async submitHoverRequest(params: any): Promise<any> {
    return this.submitRequest('hover', params, {
      priority: Priority.Immediate,
    });
  }

  /**
   * Submit a completion request
   */
  async submitCompletionRequest(params: any): Promise<any> {
    return this.submitRequest('completion', params, {
      priority: Priority.Immediate,
    });
  }

  /**
   * Submit a definition request
   */
  async submitDefinitionRequest(params: any): Promise<any> {
    return this.submitRequest('definition', params, {
      priority: Priority.High,
    });
  }

  /**
   * Submit a references request
   */
  async submitReferencesRequest(params: any): Promise<any> {
    return this.submitRequest('references', params, {
      priority: Priority.Normal,
    });
  }

  /**
   * Submit a document symbol request
   */
  async submitDocumentSymbolRequest(params: any): Promise<any> {
    return this.submitRequest('documentSymbol', params, {
      priority: Priority.High,
    });
  }

  /**
   * Submit a workspace symbol request
   */
  async submitWorkspaceSymbolRequest(params: any): Promise<any> {
    return this.submitRequest('workspaceSymbol', params, {
      priority: Priority.Normal,
    });
  }

  /**
   * Submit a diagnostics request
   */
  async submitDiagnosticsRequest(params: any): Promise<any> {
    return this.submitRequest('diagnostics', params, {
      priority: Priority.Normal,
    });
  }

  /**
   * Submit a code action request
   */
  async submitCodeActionRequest(params: any): Promise<any> {
    return this.submitRequest('codeAction', params, { priority: Priority.Low });
  }

  /**
   * Submit a signature help request
   */
  async submitSignatureHelpRequest(params: any): Promise<any> {
    return this.submitRequest('signatureHelp', params, {
      priority: Priority.Immediate,
    });
  }

  /**
   * Submit a rename request
   */
  async submitRenameRequest(params: any): Promise<any> {
    return this.submitRequest('rename', params, { priority: Priority.Low });
  }

  /**
   * Submit an execute command request
   */
  async submitExecuteCommandRequest(params: any): Promise<any> {
    return this.submitRequest('executeCommand', params, {
      priority: Priority.Normal,
    });
  }

  /**
   * Submit a notification (fire-and-forget, doesn't wait for completion)
   * @param type The notification type
   * @param params The notification parameters
   * @param options Optional configuration
   */
  submitNotification(
    type: LSPRequestType,
    params: any,
    options: {
      priority?: Priority;
      timeout?: number;
      errorCallback?: (error: Error) => void;
    } = {},
  ): void {
    if (this.isShutdown) {
      const error = new Error('LSP Queue Manager is shutdown');
      options.errorCallback?.(error);
      return;
    }

    // Queue the work but don't wait for completion
    (async () => {
      try {
        // Ensure scheduler is initialized
        await this.ensureSchedulerInitialized();

        // Get configuration from service registry
        const requestedPriority = options.priority;
        const registryPriority = this.serviceRegistry.getPriority(type);
        const priority = requestedPriority || registryPriority;
        const timeout =
          options.timeout || this.serviceRegistry.getTimeout(type);

        this.logger.debug(
          () =>
            `Submitting ${type} notification with priority ${priority} ` +
            `(requested: ${requestedPriority ?? 'none'}, registry: ${registryPriority})`,
        );

        // Create QueuedItem from request
        const queuedItem = await Effect.runPromise(
          this.createQueuedItem<any>(
            type,
            params,
            this.symbolManager,
            timeout,
            undefined, // No callback for notifications
            options.errorCallback,
          ),
        );

        // Schedule the task using the priority scheduler (don't wait)
        await Effect.runPromise(offer(priority, queuedItem));

        // Don't wait for completion - fire and forget
      } catch (error) {
        this.logger.error(
          () => `Failed to submit ${type} notification: ${error}`,
        );
        options.errorCallback?.(error as Error);
      }
    })();
  }

  /**
   * Submit a document open notification (fire-and-forget)
   */
  submitDocumentOpenNotification(params: any): void {
    this.submitNotification('documentOpen', params, {
      priority: Priority.High,
    });
  }

  /**
   * Submit a document save notification (fire-and-forget)
   */
  submitDocumentSaveNotification(params: any): void {
    this.submitNotification('documentSave', params, {
      priority: Priority.Normal,
    });
  }

  /**
   * Submit a document change notification (fire-and-forget)
   */
  submitDocumentChangeNotification(params: any): void {
    this.submitNotification('documentChange', params, {
      priority: Priority.Normal,
    });
  }

  /**
   * Submit a document close notification (fire-and-forget)
   */
  submitDocumentCloseNotification(params: any): void {
    this.submitNotification('documentClose', params, {
      priority: Priority.Immediate,
    });
  }

  /**
   * Submit a document load request
   * Requests the client to load a document via window/showDocument
   */
  async submitDocumentLoadRequest(params: any): Promise<any> {
    return this.submitRequest('documentLoad', params, {
      priority: Priority.High,
    });
  }

  /**
   * Submit a generic LSP request
   */
  async submitRequest<T>(
    type: LSPRequestType,
    params: any,
    options: {
      priority?: Priority;
      timeout?: number;
      callback?: (result: T) => void;
      errorCallback?: (error: Error) => void;
    } = {},
  ): Promise<T> {
    if (this.isShutdown) {
      throw new Error('LSP Queue Manager is shutdown');
    }

    const submitStartTime = Date.now();

    try {
      // Ensure scheduler is initialized
      const initStartTime = Date.now();
      await this.ensureSchedulerInitialized();
      const initTime = Date.now() - initStartTime;
      if (initTime > 10) {
        this.logger.debug(
          () => `[QUEUE-DIAG] ${type} scheduler init took ${initTime}ms`,
        );
      }

      // Get configuration from service registry
      const requestedPriority = options.priority;
      const registryPriority = this.serviceRegistry.getPriority(type);
      const priority = requestedPriority || registryPriority;
      const timeout = options.timeout || this.serviceRegistry.getTimeout(type);

      this.logger.debug(
        () =>
          `Submitting ${type} request with priority ${priority} ` +
          `(requested: ${requestedPriority ?? 'none'}, registry: ${registryPriority})`,
      );

      // Create QueuedItem from request
      const createStartTime = Date.now();
      const queuedItem = await Effect.runPromise(
        this.createQueuedItem<T>(
          type,
          params,
          this.symbolManager,
          timeout,
          options.callback,
          options.errorCallback,
        ),
      );
      const createTime = Date.now() - createStartTime;
      if (createTime > 10) {
        this.logger.debug(
          () => `[QUEUE-DIAG] ${type} createQueuedItem took ${createTime}ms`,
        );
      }

      // Schedule the task using the priority scheduler
      const queueStartTime = Date.now();
      const scheduledTask = await Effect.runPromise(
        offer(priority, queuedItem),
      );
      const queueWaitTime = Date.now() - queueStartTime;
      if (queueWaitTime > 5) {
        this.logger.debug(
          () =>
            `[QUEUE-DIAG] ${type} queued in ${queueWaitTime}ms, ` +
            `priority=${priority}`,
        );
      }

      // Wait for the fiber to complete
      const fiberStartTime = Date.now();
      const fiber = await Effect.runPromise(scheduledTask.fiber);
      const fiberWaitTime = Date.now() - fiberStartTime;
      if (fiberWaitTime > 5) {
        this.logger.debug(
          () => `[QUEUE-DIAG] ${type} fiber obtained in ${fiberWaitTime}ms`,
        );
      }

      const executionStartTime = Date.now();
      const result = await Effect.runPromise(Fiber.await(fiber));
      const executionTime = Date.now() - executionStartTime;
      const totalTime = Date.now() - submitStartTime;

      if (totalTime > 50 || queueWaitTime > 10 || executionTime > 50) {
        this.logger.debug(
          () =>
            `[QUEUE-DIAG] ${type} completed in ${totalTime}ms ` +
            `(init=${initTime}ms, create=${createTime}ms, ` +
            `queue=${queueWaitTime}ms, fiber=${fiberWaitTime}ms, ` +
            `execution=${executionTime}ms)`,
        );
      }

      if (result._tag === 'Failure') {
        // Extract the error from the Effect failure cause
        // The cause should be a Fail cause containing our Error
        let error: Error;
        // Check if cause is a Fail type (has _tag === 'Fail')
        if (
          result.cause &&
          typeof result.cause === 'object' &&
          '_tag' in result.cause
        ) {
          if (result.cause._tag === 'Fail' && 'error' in result.cause) {
            error = result.cause.error as Error;
          } else {
            // Try to extract from cause using Cause utilities
            try {
              const failureOption = Cause.failureOption(result.cause as any);
              if (
                failureOption &&
                '_tag' in failureOption &&
                failureOption._tag === 'Some'
              ) {
                error = (failureOption as any).value as Error;
              } else {
                error = new Error('Task failed');
              }
            } catch {
              error = new Error('Task failed');
            }
          }
        } else {
          error = new Error('Task failed');
        }
        options.errorCallback?.(error);
        throw error;
      }

      return result.value;
    } catch (error) {
      const totalTime = Date.now() - submitStartTime;
      this.logger.error(
        () =>
          `[QUEUE-DIAG] Failed to submit ${type} request after ${totalTime}ms: ${error}`,
      );
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<LSPQueueStats> {
    if (!this.schedulerInitialized) {
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

    const schedulerMetrics = await Effect.runPromise(metrics());

    return {
      immediateQueueSize: schedulerMetrics.queueSizes[Priority.Immediate] || 0,
      highPriorityQueueSize: schedulerMetrics.queueSizes[Priority.High] || 0,
      normalPriorityQueueSize:
        schedulerMetrics.queueSizes[Priority.Normal] || 0,
      lowPriorityQueueSize: schedulerMetrics.queueSizes[Priority.Low] || 0,
      totalProcessed: schedulerMetrics.tasksStarted,
      totalFailed: schedulerMetrics.tasksDropped,
      averageProcessingTime: 0, // Not tracked by scheduler
      activeWorkers: 1, // Scheduler runs in background
    };
  }

  /**
   * Get the underlying symbol manager
   */
  getSymbolManager(): ISymbolManager {
    return this.symbolManager;
  }

  /**
   * Shutdown the queue manager
   */
  async shutdown(): Promise<void> {
    if (this.isShutdown) {
      return;
    }

    this.logger.debug(() => 'Shutting down LSP Queue Manager');

    this.isShutdown = true;

    if (this.schedulerInitialized) {
      await Effect.runPromise(shutdown());
      this.schedulerInitialized = false;
    }

    // Clear the singleton instance
    LSPQueueManager.instance = null;
  }

  /**
   * Check if the queue manager is shutdown
   */
  isShutdownState(): boolean {
    return this.isShutdown;
  }

  /**
   * Reset the singleton instance (for testing only)
   */
  static reset(): void {
    LSPQueueManager.instance = null;
  }
}
