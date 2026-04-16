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
import { Effect, Deferred, Fiber, Context, Queue, Chunk } from 'effect';
import { LSPRequestType, LSPQueueStats } from './LSPRequestQueue';
import { ServiceRegistry, GenericRequestHandler } from '../registry';
import type { WorkerDispatchStrategy } from './WorkerDispatchStrategy';

/**
 * Dependencies interface for LSPQueueManager initialization
 */
export interface LSPQueueManagerDependencies {
  serviceFactory: unknown;
  serviceConfig: ReadonlyArray<{
    requestType: LSPRequestType;
    priority: Priority;
    timeout: number;
    maxRetries: number;
    serviceFactory: (deps: { serviceFactory: unknown }) => unknown;
  }>;
  storageManager: unknown;
  settingsManager: unknown;
}

class QueueShutdownError {
  readonly _tag = 'QueueShutdownError' as const;
  readonly message = 'LSP Queue Manager is shutdown';
}

class QueueSubmitError {
  readonly _tag = 'QueueSubmitError' as const;
  readonly type: LSPRequestType;
  readonly cause: unknown;
  constructor(type: LSPRequestType, cause: unknown) {
    this.type = type;
    this.cause = cause;
  }
  get message(): string {
    return `Failed to submit ${this.type} request: ${this.cause}`;
  }
}

type PendingNotification = {
  type: LSPRequestType;
  params: unknown;
  priority: Priority;
};

/**
 * LSP Queue Manager
 *
 * Singleton manager for coordinating LSP requests with the symbol manager.
 * Provides a clean interface for LSP services to submit requests with
 * appropriate prioritization and error handling.
 */
export class LSPQueueManager {
  private static instance: LSPQueueManager | null = null;
  private static readonly BUFFERED_TYPES = new Set<LSPRequestType>([
    'documentOpen',
    'documentChange',
    'documentSave',
    'documentClose',
  ]);

  private readonly logger = getLogger();
  private readonly symbolManager: ISymbolManager;
  private readonly serviceRegistry: ServiceRegistry;
  private readonly preInitQueue: Queue.Queue<PendingNotification> =
    Effect.runSync(Queue.unbounded<PendingNotification>());
  private schedulerInitialized = false;
  private isShutdown = false;
  private workerDispatcher: WorkerDispatchStrategy | null = null;

  private constructor(dependencies?: LSPQueueManagerDependencies) {
    this.serviceRegistry = new ServiceRegistry();

    this.symbolManager =
      ApexSymbolProcessingManager.getInstance().getSymbolManager();

    if (dependencies) {
      this.registerServices(dependencies);
    }

    this.logger.debug(
      'LSP Queue Manager initialized (scheduler initialization handled separately)',
    );
  }

  private ensureSchedulerInitialized(): Effect.Effect<void> {
    if (this.schedulerInitialized) {
      return Effect.void;
    }
    return Effect.promise(async () => {
      const schedulerService = SchedulerInitializationService.getInstance();
      await schedulerService.ensureInitialized();
      this.schedulerInitialized = schedulerService.isInitialized();
    });
  }

  /**
   * Inject a worker dispatch strategy. When set and available,
   * createQueuedItem wraps worker dispatch instead of local handler
   * execution. Pass null to revert to local-only.
   *
   * When a dispatcher is provided, any textDocument lifecycle notifications
   * that were buffered before workers were ready are drained to the dispatcher
   * in their original arrival order.
   */
  setWorkerDispatcher(dispatcher: WorkerDispatchStrategy | null): void {
    this.workerDispatcher = dispatcher;
    this.logger.debug(
      () =>
        `Worker dispatcher ${dispatcher ? 'set' : 'cleared'} on LSPQueueManager`,
    );

    if (dispatcher) {
      Effect.runFork(
        Queue.takeAll(this.preInitQueue).pipe(
          Effect.flatMap((chunk) => {
            const items = Chunk.toReadonlyArray(chunk);
            this.logger.debug(
              () =>
                `Draining ${items.length} pre-init buffered notifications to worker`,
            );
            return Effect.forEach(
              items,
              ({ type, params, priority }) =>
                Effect.sync(() =>
                  this.submitNotification(type, params, { priority }),
                ),
              { discard: true },
            );
          }),
        ),
      );
    }
  }

  getWorkerDispatcher(): WorkerDispatchStrategy | null {
    return this.workerDispatcher;
  }

  private createQueuedItem<T>(
    type: LSPRequestType,
    params: unknown,
    symbolManager: ISymbolManager,
    timeout: number,
    callback?: (result: T) => void,
    errorCallback?: (error: Error) => void,
  ): Effect.Effect<QueuedItem<T, Error, never>, never, never> {
    const serviceRegistry = this.serviceRegistry;
    const logger = this.logger;
    const taskId = this.generateTaskId();
    const dispatcher = this.workerDispatcher;

    return Effect.gen(function* () {
      const fiberDeferred = yield* Deferred.make<
        Fiber.RuntimeFiber<T, Error>,
        Error
      >();

      const requestEffect = Effect.tryPromise({
        try: async (): Promise<T> => {
          if (dispatcher?.isAvailable() && dispatcher.canDispatch(type)) {
            logger.debug(() => `Dispatching ${type} request to worker pool`);
            return (await dispatcher.dispatch(type, params)) as T;
          }
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

  private generateTaskId(): string {
    return `lsp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

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

  static getInstance(
    dependencies?: LSPQueueManagerDependencies,
  ): LSPQueueManager {
    if (!LSPQueueManager.instance) {
      LSPQueueManager.instance = new LSPQueueManager(dependencies);
    }
    return LSPQueueManager.instance;
  }

  // ---------------------------------------------------------------------------
  // Effect-based submit — core implementation
  // ---------------------------------------------------------------------------

  /**
   * Submit a typed request via the priority scheduler.
   * Returns an Effect that resolves with the handler result.
   */
  submitRequestEffect<T = unknown>(
    type: LSPRequestType,
    params: unknown,
    options: {
      priority?: Priority;
      timeout?: number;
      callback?: (result: T) => void;
      errorCallback?: (error: Error) => void;
    } = {},
  ): Effect.Effect<T, QueueShutdownError | QueueSubmitError> {
    if (this.isShutdown) {
      return Effect.fail(new QueueShutdownError());
    }

    const self = this;
    return Effect.gen(function* () {
      const submitStartTime = Date.now();
      const observabilityRequests = new Set<LSPRequestType>([
        'definition',
        'signatureHelp',
        'references',
        'rename',
      ]);

      yield* self.ensureSchedulerInitialized();

      const requestedPriority = options.priority;
      const registryPriority = self.serviceRegistry.getPriority(type);
      const priority = requestedPriority || registryPriority;
      const timeout = options.timeout || self.serviceRegistry.getTimeout(type);

      self.logger.debug(
        () =>
          `Submitting ${type} request with priority ${priority} ` +
          `(requested: ${requestedPriority ?? 'none'}, registry: ${registryPriority})`,
      );

      const queuedItem = yield* self.createQueuedItem<T>(
        type,
        params,
        self.symbolManager,
        timeout,
        options.callback,
        options.errorCallback,
      );

      const scheduledTask = yield* offer(priority, queuedItem);
      const fiber = yield* scheduledTask.fiber;
      const result = yield* Fiber.join(fiber);

      const totalTime = Date.now() - submitStartTime;
      if (observabilityRequests.has(type)) {
        self.logger.debug(
          () => `[REQ-HARDEN] queue timings type=${type} totalMs=${totalTime}`,
        );
      }

      return result;
    }).pipe(
      Effect.mapError((error) => {
        const submitError = new QueueSubmitError(type, error);
        options.errorCallback?.(
          error instanceof Error ? error : new Error(submitError.message),
        );
        return submitError as QueueShutdownError | QueueSubmitError;
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Promise-based public API (backward compat)
  //
  // Return type is intentionally wide — callers (LSP handlers) know
  // the concrete result type and assign directly.
  // ---------------------------------------------------------------------------

  async submitHoverRequest(params: unknown): Promise<any> {
    return this.submitRequest('hover', params, {
      priority: Priority.Immediate,
    });
  }

  async submitCompletionRequest(params: unknown): Promise<any> {
    return this.submitRequest('completion', params, {
      priority: Priority.Immediate,
    });
  }

  async submitDefinitionRequest(params: unknown): Promise<any> {
    return this.submitRequest('definition', params, {
      priority: Priority.High,
    });
  }

  async submitReferencesRequest(params: unknown): Promise<any> {
    return this.submitRequest('references', params, {
      priority: Priority.Normal,
    });
  }

  async submitDocumentSymbolRequest(params: unknown): Promise<any> {
    return this.submitRequest('documentSymbol', params, {
      priority: Priority.High,
    });
  }

  async submitWorkspaceSymbolRequest(params: unknown): Promise<any> {
    return this.submitRequest('workspaceSymbol', params, {
      priority: Priority.Normal,
    });
  }

  async submitDiagnosticsRequest(params: unknown): Promise<any> {
    return this.submitRequest('diagnostics', params, {
      priority: Priority.Normal,
    });
  }

  async submitCodeActionRequest(params: unknown): Promise<any> {
    return this.submitRequest('codeAction', params, { priority: Priority.Low });
  }

  async submitSignatureHelpRequest(params: unknown): Promise<any> {
    return this.submitRequest('signatureHelp', params, {
      priority: Priority.Immediate,
    });
  }

  async submitRenameRequest(params: unknown): Promise<any> {
    return this.submitRequest('rename', params, { priority: Priority.Low });
  }

  async submitExecuteCommandRequest(params: unknown): Promise<any> {
    return this.submitRequest('executeCommand', params, {
      priority: Priority.Normal,
    });
  }

  async submitImplementationRequest(params: unknown): Promise<any> {
    return this.submitRequest('implementation', params, {
      priority: Priority.High,
    });
  }

  async submitCodeLensRequest(params: unknown): Promise<any> {
    return this.submitRequest('codeLens', params, { priority: Priority.Low });
  }

  async submitFoldingRangeRequest(params: unknown): Promise<any> {
    return this.submitRequest('foldingRange', params, {
      priority: Priority.Low,
    });
  }

  async submitFindMissingArtifactRequest(params: unknown): Promise<any> {
    return this.submitRequest('findMissingArtifact', params, {
      priority: Priority.Low,
    });
  }

  /**
   * Submit a notification (fire-and-forget, doesn't wait for completion).
   *
   * If workers are not yet ready and the notification type is a textDocument
   * lifecycle event, it is buffered in the pre-init Effect queue and replayed
   * to the data-owner worker once setWorkerDispatcher is called.
   */
  submitNotification(
    type: LSPRequestType,
    params: unknown,
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

    if (!this.workerDispatcher && LSPQueueManager.BUFFERED_TYPES.has(type)) {
      const item: PendingNotification = {
        type,
        params,
        priority: options.priority ?? Priority.Normal,
      };
      Effect.runFork(Queue.offer(this.preInitQueue, item));
      this.logger.debug(() => `Pre-init buffer: queued ${type}`);
      return;
    }

    Effect.runFork(
      this.submitRequestEffect(type, params, {
        priority: options.priority,
        timeout: options.timeout,
        errorCallback: options.errorCallback,
      }).pipe(
        Effect.catchAll((err) =>
          Effect.sync(() => {
            this.logger.error(
              () => `Failed to submit ${type} notification: ${err.message}`,
            );
            options.errorCallback?.(new Error(err.message));
          }),
        ),
      ),
    );
  }

  submitDocumentOpenNotification(params: unknown): void {
    this.submitNotification('documentOpen', params, {
      priority: Priority.High,
    });
  }

  submitDocumentSaveNotification(params: unknown): void {
    this.submitNotification('documentSave', params, {
      priority: Priority.Normal,
    });
  }

  submitDocumentChangeNotification(params: unknown): void {
    this.submitNotification('documentChange', params, {
      priority: Priority.Normal,
    });
  }

  submitDocumentCloseNotification(params: unknown): void {
    this.submitNotification('documentClose', params, {
      priority: Priority.Immediate,
    });
  }

  async submitDocumentLoadRequest(params: unknown): Promise<any> {
    return this.submitRequest('documentLoad', params, {
      priority: Priority.High,
    });
  }

  /**
   * Submit a generic LSP request (Promise-based wrapper over submitRequestEffect).
   */
  async submitRequest<T = unknown>(
    type: LSPRequestType,
    params: unknown,
    options: {
      priority?: Priority;
      timeout?: number;
      callback?: (result: T) => void;
      errorCallback?: (error: Error) => void;
    } = {},
  ): Promise<T> {
    return Effect.runPromise(
      this.submitRequestEffect<T>(type, params, options).pipe(
        Effect.mapError((err) => {
          const error =
            err._tag === 'QueueSubmitError' && err.cause instanceof Error
              ? err.cause
              : new Error(err.message);
          throw error;
        }),
      ),
    );
  }

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
      averageProcessingTime: 0,
      activeWorkers: 1,
    };
  }

  getSymbolManager(): ISymbolManager {
    return this.symbolManager;
  }

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

    LSPQueueManager.instance = null;
  }

  isShutdownState(): boolean {
    return this.isShutdown;
  }

  static reset(): void {
    LSPQueueManager.instance = null;
  }
}

// ---------------------------------------------------------------------------
// Effect.Service — typed context tag for Effect-based consumers
// ---------------------------------------------------------------------------

/**
 * Effect-based queue service interface.
 * New code should depend on this tag via Context instead of using
 * the LSPQueueManager singleton directly.
 */
export interface LSPQueueService {
  readonly submitRequest: <T = unknown>(
    type: LSPRequestType,
    params: unknown,
    options?: {
      priority?: Priority;
      timeout?: number;
    },
  ) => Effect.Effect<T, QueueShutdownError | QueueSubmitError>;
  readonly submitNotification: (
    type: LSPRequestType,
    params: unknown,
    options?: { priority?: Priority },
  ) => Effect.Effect<void>;
  readonly setWorkerDispatcher: (
    dispatcher: WorkerDispatchStrategy | null,
  ) => void;
  readonly getStats: () => Effect.Effect<LSPQueueStats>;
  readonly shutdown: () => Effect.Effect<void>;
}

export const LSPQueueServiceTag =
  Context.GenericTag<LSPQueueService>('LSPQueueService');

/**
 * Create a live LSPQueueService layer backed by LSPQueueManager.
 * The dispatcher is injected at layer construction time instead
 * of via mutable `setWorkerDispatcher`.
 */
export function makeLSPQueueServiceLive(
  dependencies?: LSPQueueManagerDependencies,
  dispatcher?: WorkerDispatchStrategy | null,
) {
  const qm = LSPQueueManager.getInstance(dependencies);
  if (dispatcher !== undefined) {
    qm.setWorkerDispatcher(dispatcher);
  }
  const service: LSPQueueService = {
    submitRequest: (type, params, options) =>
      qm.submitRequestEffect(type, params, options),
    submitNotification: (type, params, options) =>
      Effect.sync(() => qm.submitNotification(type, params, options)),
    setWorkerDispatcher: (d) => qm.setWorkerDispatcher(d),
    getStats: () => Effect.promise(() => qm.getStats()),
    shutdown: () => Effect.promise(() => qm.shutdown()),
  };
  return service;
}
