/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Logger, MessageConnection } from 'vscode-jsonrpc';
import type { InitializeParams, InitializeResult } from '@salesforce/apex-lsp-shared';
import type { ClientInterface } from './Interfaces';
import { NodeMessageBridge } from './NodeBridge';

/**
 * Node.js-specific configuration for creating a client
 */
export interface NodeClientConfig {
  logger?: Logger;
}

/**
 * Node.js client implementation using MessageBridge
 */
export class Client implements ClientInterface {
  private connection!: MessageConnection;
  private disposed = false;
  private connectionPromise: Promise<void>;
  private connectionResolve!: () => void;
  private connectionReject!: (error: Error) => void;

  constructor(config: NodeClientConfig) {
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

  private async initializeConnection(config: NodeClientConfig): Promise<void> {
    try {
      this.connection = NodeMessageBridge.createConnection({
        mode: 'stdio',
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
 * Factory for creating Node.js clients
 */
export class ClientFactory {
  /**
   * Creates a client for Node.js environment
   */
  static createNodeClient(logger?: Logger): ClientInterface {
    return new Client({ logger });
  }

  /**
   * Creates a client for web worker environment from Node.js context
   */
  static async createWebWorkerClient(config: any): Promise<ClientInterface> {
    throw new Error(
      'createWebWorkerClient is not available in Node.js environment. Use browser-specific entry point.',
    );
  }

  /**
   * Creates a client based on auto-detected environment
   */
  static async createAutoClient(
    config: NodeClientConfig = {},
  ): Promise<ClientInterface> {
    return new Client(config);
  }
}
