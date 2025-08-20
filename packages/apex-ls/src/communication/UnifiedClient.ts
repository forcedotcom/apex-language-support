/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  Logger,
} from 'vscode-jsonrpc';
import type {
  InitializeParams,
  InitializeResult,
} from '../types';
import { MessageBridge } from './MessageBridge';
import type { EnvironmentType } from '../types';

/**
 * Configuration for creating a unified client
 */
export interface UnifiedClientConfig {
  environment: EnvironmentType;
  logger?: Logger;
  worker?: Worker;
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
  private bridge: MessageBridge;
  private disposed = false;

  constructor(config: UnifiedClientConfig) {
    switch (config.environment) {
      case 'webworker':
        throw new Error(
          'Web worker client creation should be done from main thread',
        );

      case 'browser':
        if (!config.worker) {
          throw new Error('Worker required for browser environment');
        }
        this.bridge = MessageBridge.forWorkerClient(
          config.worker,
          config.logger,
        );
        break;

      case 'node':
      default:
        throw new Error(
          `Unified client not yet implemented for environment: ${config.environment}`,
        );
    }

    this.bridge.listen();
  }

  async initialize(params: InitializeParams): Promise<InitializeResult> {
    this.checkDisposed();
    const connection = this.bridge.getConnection();
    return connection.sendRequest('initialize', params);
  }

  sendNotification(method: string, params?: any): void {
    this.checkDisposed();
    const connection = this.bridge.getConnection();
    connection.sendNotification(method, params);
  }

  async sendRequest<T = any>(method: string, params?: any): Promise<T> {
    this.checkDisposed();
    const connection = this.bridge.getConnection();
    return connection.sendRequest(method, params);
  }

  onNotification(method: string, handler: (params: any) => void): void {
    this.checkDisposed();
    const connection = this.bridge.getConnection();
    connection.onNotification(method, handler);
  }

  onRequest(method: string, handler: (params: any) => any): void {
    this.checkDisposed();
    const connection = this.bridge.getConnection();
    connection.onRequest(method, handler);
  }

  isDisposed(): boolean {
    return this.disposed;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.bridge.dispose();
    this.disposed = true;
  }

  private checkDisposed(): void {
    if (this.disposed) {
      throw new Error('Client has been disposed');
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