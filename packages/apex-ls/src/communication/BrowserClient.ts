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
  ClientInterface,
} from '@salesforce/apex-lsp-shared';
import type { ClientConfig, Worker } from './Interfaces';

// Re-export the interface for external use
export type { ClientInterface };
import { BrowserMessageBridge, WorkerMessageBridge } from './PlatformBridges';

/**
 * Browser-specific client implementation
 */
export class Client implements ClientInterface {
  private connection!: MessageConnection;
  private disposed = false;
  private connectionPromise: Promise<void>;
  private connectionResolve!: () => void;
  private connectionReject!: (error: Error) => void;

  constructor(config: ClientConfig) {
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

  private async initializeConnection(config: ClientConfig): Promise<void> {
    try {
      switch (config.environment) {
        case 'browser':
          if (!config.worker) {
            throw new Error('Worker required for browser environment');
          }
          this.connection = BrowserMessageBridge.createConnection({
            worker: config.worker,
            logger: config.logger,
          });
          break;
        case 'webworker':
          this.connection = WorkerMessageBridge.createConnection({
            logger: config.logger,
          });
          break;
        default:
          throw new Error(
            `Unsupported environment for browser client: ${config.environment}`,
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
 * Factory for creating clients in browser environments
 */
export class ClientFactory {
  /**
   * Creates a client for web browser environment using a worker
   */
  static createBrowserClient(worker: Worker, logger?: Logger): ClientInterface {
    return new Client({
      environment: 'browser',
      worker,
      logger,
    });
  }

  /**
   * Creates a client for web worker environment
   */
  static createWebWorkerClient(logger?: Logger): ClientInterface {
    return new Client({
      environment: 'webworker',
      logger,
    });
  }

  /**
   * Creates a client based on auto-detected environment
   */
  static async createAutoClient(
    config: Omit<ClientConfig, 'environment'> = {},
  ): Promise<ClientInterface> {
    const environment = await this.detectEnvironment();
    return new Client({
      ...config,
      environment,
    });
  }

  /**
   * Detects the current environment
   */
  private static async detectEnvironment(): Promise<EnvironmentType> {
    const { isWorkerEnvironment, isBrowserEnvironment } = await import(
      '@salesforce/apex-lsp-shared'
    );

    if (isWorkerEnvironment()) {
      return 'webworker';
    }

    if (isBrowserEnvironment()) {
      return 'browser';
    }

    throw new Error('Unable to detect browser environment');
  }
}
