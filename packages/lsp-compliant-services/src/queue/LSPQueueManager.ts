/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger, ApexSettingsManager } from '@salesforce/apex-lsp-shared';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';
import {
  LSPRequestType,
  RequestPriority,
  LSPQueueStats,
} from './LSPRequestQueue';
import { ServiceRegistry } from '../registry/ServiceRegistry';
import { GenericLSPRequestQueue } from './GenericLSPRequestQueue';
import { ServiceFactory } from '../factories/ServiceFactory';
import { DEFAULT_SERVICE_CONFIG } from '../config/ServiceConfiguration';
import { GenericRequestHandler } from '../registry/GenericRequestHandler';
import { ApexStorageManager } from '../storage/ApexStorageManager';

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
  private readonly requestQueue: GenericLSPRequestQueue;
  private readonly symbolManager: ISymbolManager;
  private readonly serviceRegistry: ServiceRegistry;
  private isShutdown = false;

  private constructor() {
    // Initialize the service registry
    this.serviceRegistry = new ServiceRegistry();

    // Initialize the generic queue with the service registry
    this.requestQueue = new GenericLSPRequestQueue(this.serviceRegistry);

    this.symbolManager =
      ApexSymbolProcessingManager.getInstance().getSymbolManager();

    // Register all services
    this.registerServices();

    this.logger.debug(
      () => 'LSP Queue Manager initialized with service registry',
    );
  }

  /**
   * Register all services with the registry
   */
  private registerServices(): void {
    const serviceFactory = new ServiceFactory({
      logger: this.logger,
      symbolManager: this.symbolManager,
      storageManager: ApexStorageManager.getInstance(),
      settingsManager: ApexSettingsManager.getInstance(),
    });

    for (const config of DEFAULT_SERVICE_CONFIG) {
      const service = config.serviceFactory({ serviceFactory });
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
      () => `Registered ${DEFAULT_SERVICE_CONFIG.length} services`,
    );
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): LSPQueueManager {
    if (!LSPQueueManager.instance) {
      LSPQueueManager.instance = new LSPQueueManager();
    }
    return LSPQueueManager.instance;
  }

  /**
   * Submit a hover request
   */
  async submitHoverRequest(params: any): Promise<any> {
    return this.submitRequest('hover', params, { priority: 'IMMEDIATE' });
  }

  /**
   * Submit a completion request
   */
  async submitCompletionRequest(params: any): Promise<any> {
    return this.submitRequest('completion', params, { priority: 'IMMEDIATE' });
  }

  /**
   * Submit a definition request
   */
  async submitDefinitionRequest(params: any): Promise<any> {
    return this.submitRequest('definition', params, { priority: 'HIGH' });
  }

  /**
   * Submit a references request
   */
  async submitReferencesRequest(params: any): Promise<any> {
    return this.submitRequest('references', params, { priority: 'NORMAL' });
  }

  /**
   * Submit a document symbol request
   */
  async submitDocumentSymbolRequest(params: any): Promise<any> {
    return this.submitRequest('documentSymbol', params, { priority: 'HIGH' });
  }

  /**
   * Submit a workspace symbol request
   */
  async submitWorkspaceSymbolRequest(params: any): Promise<any> {
    return this.submitRequest('workspaceSymbol', params, {
      priority: 'NORMAL',
    });
  }

  /**
   * Submit a diagnostics request
   */
  async submitDiagnosticsRequest(params: any): Promise<any> {
    return this.submitRequest('diagnostics', params, { priority: 'NORMAL' });
  }

  /**
   * Submit a code action request
   */
  async submitCodeActionRequest(params: any): Promise<any> {
    return this.submitRequest('codeAction', params, { priority: 'LOW' });
  }

  /**
   * Submit a signature help request
   */
  async submitSignatureHelpRequest(params: any): Promise<any> {
    return this.submitRequest('signatureHelp', params, {
      priority: 'IMMEDIATE',
    });
  }

  /**
   * Submit a rename request
   */
  async submitRenameRequest(params: any): Promise<any> {
    return this.submitRequest('rename', params, { priority: 'LOW' });
  }

  /**
   * Submit a document open request
   */
  async submitDocumentOpenRequest(params: any): Promise<any> {
    return this.submitRequest('documentOpen', params, { priority: 'HIGH' });
  }

  /**
   * Submit a document save request
   */
  async submitDocumentSaveRequest(params: any): Promise<any> {
    return this.submitRequest('documentSave', params, { priority: 'NORMAL' });
  }

  /**
   * Submit a document change request
   */
  async submitDocumentChangeRequest(params: any): Promise<any> {
    return this.submitRequest('documentChange', params, { priority: 'NORMAL' });
  }

  /**
   * Submit a document close request
   */
  async submitDocumentCloseRequest(params: any): Promise<any> {
    return this.submitRequest('documentClose', params, {
      priority: 'IMMEDIATE',
    });
  }

  /**
   * Submit a generic LSP request
   */
  async submitRequest<T>(
    type: LSPRequestType,
    params: any,
    options: {
      priority?: RequestPriority;
      timeout?: number;
      callback?: (result: T) => void;
      errorCallback?: (error: Error) => void;
    } = {},
  ): Promise<T> {
    if (this.isShutdown) {
      throw new Error('LSP Queue Manager is shutdown');
    }

    try {
      this.logger.debug(
        () =>
          `Submitting ${type} request with priority ${options.priority || 'default'}`,
      );

      return await this.requestQueue.submitRequest(
        type,
        params,
        this.symbolManager,
        options,
      );
    } catch (error) {
      this.logger.error(() => `Failed to submit ${type} request: ${error}`);
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): LSPQueueStats {
    return this.requestQueue.getStats();
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
  shutdown(): void {
    if (this.isShutdown) {
      return;
    }

    this.logger.debug(() => 'Shutting down LSP Queue Manager');

    this.isShutdown = true;
    this.requestQueue.shutdown();

    // Clear the singleton instance
    LSPQueueManager.instance = null;
  }

  /**
   * Check if the queue manager is shutdown
   */
  isShutdownState(): boolean {
    return this.isShutdown;
  }
}
