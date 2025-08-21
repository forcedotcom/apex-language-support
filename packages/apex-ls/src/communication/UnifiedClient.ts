/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Logger, MessageConnection } from 'vscode-jsonrpc';
import type {
  InitializeParams,
  InitializeResult,
  EnvironmentType,
} from '../types';
import { createPlatformMessageBridge } from './MessageBridgeFactory.browser';

/**
 * Configuration for creating a unified client
 */
export interface UnifiedClientConfig {
  environment: EnvironmentType;
  logger?: Logger;
  worker?: Worker;
}

/**
 * Configuration for creating a web worker client
 */
export interface WebWorkerClientConfig {
  context: any;
  logger?: Logger;
  workerFileName: string;
}

/**
 * Unified client interface that works across all environments
 */
export interface UnifiedClientInterface {
  /**
   * Initializes the language server
   */
  initialize(params: InitializeParams): Promise<InitializeResult>;

  /**
   * Sends a notification to the server
   */
  sendNotification(method: string, params?: any): void;

  /**
   * Sends a request to the server
   */
  sendRequest<T = any>(method: string, params?: any): Promise<T>;

  /**
   * Registers a notification handler
   */
  onNotification(method: string, handler: (params: any) => void): void;

  /**
   * Registers a request handler
   */
  onRequest(method: string, handler: (params: any) => any): void;

  /**
   * Checks if the client is disposed
   */
  isDisposed(): boolean;

  /**
   * Disposes the client
   */
  dispose(): void;
}

/**
 * Unified client implementation using MessageBridge
 */
export class UnifiedClient implements UnifiedClientInterface {
  private connection!: MessageConnection;
  private disposed = false;
  private connectionPromise: Promise<void>;
  private connectionResolve!: () => void;
  private connectionReject!: (error: Error) => void;

  constructor(config: UnifiedClientConfig) {
    this.connectionPromise = new Promise((resolve, reject) => {
      this.connectionResolve = resolve;
      this.connectionReject = reject;
    });

    this.initializeConnection(config).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.connectionReject(new Error(errorMessage));
    });
  }

  private async initializeConnection(
    config: UnifiedClientConfig,
  ): Promise<void> {
    try {
      switch (config.environment) {
        case 'webworker':
          throw new Error(
            'Web worker client creation should be done from main thread',
          );

        case 'browser':
          if (!config.worker) {
            throw new Error('Worker required for browser environment');
          }
          this.connection = await createPlatformMessageBridge({
            environment: 'browser',
            worker: config.worker,
            logger: config.logger,
          });
          break;

        case 'node':
        default:
          throw new Error(
            `Unified client not yet implemented for environment: ${config.environment}`,
          );
      }

      this.connection.listen();
      this.connectionResolve();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize connection: ${errorMessage}`);
    }
  }

  async initialize(params: InitializeParams): Promise<InitializeResult> {
    await this.waitForConnection();
    this.checkDisposed();
    return this.connection.sendRequest('initialize', params);
  }

  sendNotification(method: string, params?: any): void {
    this.checkDisposed();
    if (!this.connection) {
      throw new Error('Connection not initialized');
    }
    this.connection.sendNotification(method, params);
  }

  async sendRequest<T = any>(method: string, params?: any): Promise<T> {
    await this.waitForConnection();
    this.checkDisposed();
    return this.connection.sendRequest(method, params);
  }

  onNotification(method: string, handler: (params: any) => void): void {
    this.checkDisposed();
    if (!this.connection) {
      throw new Error('Connection not initialized');
    }
    this.connection.onNotification(method, handler);
  }

  onRequest(method: string, handler: (params: any) => any): void {
    this.checkDisposed();
    if (!this.connection) {
      throw new Error('Connection not initialized');
    }
    this.connection.onRequest(method, handler);
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    if (this.connection) {
      this.connection.dispose();
    }
    this.disposed = true;
  }

  private checkDisposed(): void {
    if (this.disposed) {
      throw new Error('Client has been disposed');
    }
  }

  private async waitForConnection(): Promise<void> {
    try {
      await this.connectionPromise;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize connection: ${errorMessage}`);
    }
  }
}

/**
 * Factory for creating unified clients
 */
export class UnifiedClientFactory {
  /**
   * Creates a client for web browser environment using a worker
   */
  static createBrowserClient(
    worker: Worker,
    logger?: Logger,
  ): UnifiedClientInterface {
    return new UnifiedClient({
      environment: 'browser',
      worker,
      logger,
    });
  }

  /**
   * Creates a client for web worker environment
   */
  static async createWebWorkerClient(
    config: WebWorkerClientConfig,
  ): Promise<UnifiedClientInterface> {
    // Create a web worker using the provided file
    let workerUrl: URL;
    
    // Debug logging
    console.log('[UnifiedClient] Worker file name:', config.workerFileName);
    console.log('[UnifiedClient] Extension URI:', config.context.extensionUri);
    
    if (config.workerFileName.startsWith('/') || config.workerFileName.startsWith('http')) {
      // Use absolute URL directly
      workerUrl = new URL(config.workerFileName, window.location.origin);
      console.log('[UnifiedClient] Using absolute URL:', workerUrl.toString());
    } else {
      // Use relative URL with extension URI
      workerUrl = new URL(
        config.workerFileName,
        config.context.extensionUri,
      );
      console.log('[UnifiedClient] Using relative URL:', workerUrl.toString());
      
      // WORKAROUND: VS Code Web test environment has incorrect extension URI resolution
      // It resolves to /static/ instead of /static/devextensions/
      if (workerUrl.toString().includes('/static/dist/worker.mjs')) {
        const fixedUrl = workerUrl.toString().replace('/static/dist/', '/static/devextensions/dist/');
        workerUrl = new URL(fixedUrl);
        console.log('[UnifiedClient] Applied VS Code Web test fix:', workerUrl.toString());
      }
    }
    
    const worker = new Worker(workerUrl.toString());

    // Create a browser client that communicates with the worker
    return this.createBrowserClient(worker, config.logger);
  }

  /**
   * Creates a client based on auto-detected environment
   */
  static createAutoClient(
    config: Omit<UnifiedClientConfig, 'environment'>,
  ): UnifiedClientInterface {
    const environment = this.detectEnvironment();
    return new UnifiedClient({
      ...config,
      environment,
    });
  }

  /**
   * Detects the current environment
   */
  private static detectEnvironment(): EnvironmentType {
    // Check for web worker environment (both classic and ES module workers)
    // ES module workers don't have importScripts, so we check for self and lack of window/document
    if (
      typeof self !== 'undefined' &&
      typeof window === 'undefined' &&
      typeof document === 'undefined'
    ) {
      return 'webworker';
    }

    // Check for browser environment
    if (typeof window !== 'undefined') {
      return 'browser';
    }

    // Default to Node.js
    return 'node';
  }
}
