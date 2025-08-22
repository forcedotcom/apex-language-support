/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Logger, MessageConnection } from 'vscode-jsonrpc';
import type { InitializeParams, InitializeResult } from '../types';
import type { WebWorkerClientConfig } from './interfaces';
import { createPlatformMessageBridge } from './MessageBridgeFactory.browser';

/**
 * Configuration for creating a unified browser client
 */
export interface UnifiedClientConfig {
  logger?: Logger;
  worker: Worker; // Required for browser environments
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
 * Unified client implementation for browser environments
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
      if (!config.worker) {
        throw new Error('Worker required for browser environment');
      }

      this.connection = await createPlatformMessageBridge({
        environment: 'browser',
        worker: config.worker,
        logger: config.logger,
      });

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
 * Factory for creating unified clients in browser environments
 */
export class UnifiedClientFactory {
  /**
   * Creates a client for browser environment with worker
   */
  static createBrowserClient(worker: Worker, logger?: Logger): UnifiedClientInterface {
    return new UnifiedClient({
      worker,
      logger,
    });
  }

  /**
   * Creates a client for web worker environment from browser context
   */
  static async createWebWorkerClient(
    config: WebWorkerClientConfig,
  ): Promise<UnifiedClientInterface> {
    // Create worker from context and filename
    const worker = new Worker(config.workerFileName);
    
    return new UnifiedClient({
      worker,
      logger: config.logger,
    });
  }

  /**
   * Creates a client based on provided configuration
   */
  static async createAutoClient(
    config: UnifiedClientConfig,
  ): Promise<UnifiedClientInterface> {
    return new UnifiedClient(config);
  }
}