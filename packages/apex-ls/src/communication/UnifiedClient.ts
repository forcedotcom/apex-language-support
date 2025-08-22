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

/**
 * Configuration for creating a unified client
 */
export interface UnifiedClientConfig {
  environment: EnvironmentType;
  logger?: Logger;
  worker?: any; // Typed as any for cross-platform compatibility
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
    throw new Error(
      'Generic UnifiedClient should not be used directly. Use platform-specific implementations instead.',
    );
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
    worker: any,
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
    // Web worker client creation is not available in worker build
    throw new Error('Web worker client creation not available in worker build');
  }

  /**
   * Creates a client based on auto-detected environment
   */
  static async createAutoClient(
    config: Omit<UnifiedClientConfig, 'environment'>,
  ): Promise<UnifiedClientInterface> {
    const environment = await this.detectEnvironment();
    return new UnifiedClient({
      ...config,
      environment,
    });
  }

  /**
   * Detects the current environment
   */
  private static async detectEnvironment(): Promise<EnvironmentType> {
    const { isWorkerEnvironment, isBrowserEnvironment, isNodeEnvironment } =
      await import('../utils/EnvironmentDetector.worker');

    if (isWorkerEnvironment()) {
      return 'webworker';
    }

    if (isBrowserEnvironment()) {
      return 'browser';
    }

    if (isNodeEnvironment()) {
      return 'node';
    }

    throw new Error('Unable to detect environment');
  }
}
