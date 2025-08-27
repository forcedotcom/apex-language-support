/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  InitializeParams,
  InitializeResult,
} from 'vscode-languageserver-protocol';
import { WorkerLauncher } from '../launcher/WorkerLauncher';
import type { WorkerLaunchResult } from '../launcher/WorkerLauncher';
import type { ClientInterface } from '../communication/Interfaces';
import type { Logger } from '@salesforce/apex-lsp-shared';

/**
 * Configuration for the universal extension client
 */
export interface UniversalClientConfig {
  mode: 'webworker' | 'node';
  context?: any;
  workerFileName?: string;
  logger?: Logger;
}

/**
 * Universal extension client that can work with both web workers and Node.js language servers
 *
 * This client abstracts away the differences between:
 * - Web Worker-based language servers (for web VSCode and optionally desktop)
 * - Traditional Node.js language servers (for desktop VSCode)
 *
 * It provides a consistent interface regardless of the underlying implementation.
 */
export class UniversalExtensionClient {
  private config: UniversalClientConfig;
  private client: ClientInterface | null = null;
  private workerResult: WorkerLaunchResult | null = null;
  private isDisposed = false;

  constructor(config: UniversalClientConfig) {
    this.config = {
      logger: console as Logger,
      workerFileName: 'worker.mjs',
      ...config,
    };
  }

  /**
   * Initialize the language server client
   */
  async initialize(params: InitializeParams): Promise<InitializeResult> {
    if (this.isDisposed) {
      throw new Error('Client has been disposed');
    }

    const logger = this.config.logger;
    if (!logger) {
      throw new Error('Logger is required');
    }

    try {
      logger.info(
        `🚀 [UNIVERSAL-CLIENT] Initializing ${this.config.mode} language server`,
      );

      switch (this.config.mode) {
        case 'webworker':
          this.client = await this.initializeWebWorkerClient(params);
          break;

        case 'node':
          this.client = await this.initializeNodeClient(params);
          break;

        default:
          throw new Error(`Unsupported mode: ${this.config.mode}`);
      }

      if (!this.client) {
        throw new Error('Client initialization failed');
      }

      logger.success(
        `✅ [UNIVERSAL-CLIENT] ${this.config.mode} language server initialized`,
      );
      return await this.client.initialize(params);
    } catch (error) {
      logger.error(
        `❌ [UNIVERSAL-CLIENT] Failed to initialize ${this.config.mode} language server`,
        error instanceof Error ? error : new Error(String(error)),
      );
      throw error;
    }
  }

  /**
   * Initialize web worker-based client
   */
  private async initializeWebWorkerClient(
    params: InitializeParams,
  ): Promise<ClientInterface> {
    const logger = this.config.logger;
    if (!logger) {
      throw new Error('Logger is required');
    }

    logger.info('🔧 [UNIVERSAL-CLIENT] Setting up web worker client');

    const workerFileName = this.config.workerFileName;
    if (!workerFileName) {
      throw new Error('Worker file name is required for web worker mode');
    }

    // Launch worker
    this.workerResult = await WorkerLauncher.launch({
      context: this.config.context,
      workerFileName: workerFileName,
      environment: 'browser',
      logger,
    });

    logger.info('✅ [UNIVERSAL-CLIENT] Web worker client ready');
    return this.workerResult.client;
  }

  /**
   * Initialize Node.js-based client (placeholder for future implementation)
   */
  private async initializeNodeClient(params: InitializeParams): Promise<ClientInterface> {
    const logger = this.config.logger;
    if (!logger) {
      throw new Error('Logger is required');
    }

    logger.info('🔧 [UNIVERSAL-CLIENT] Setting up Node.js client');

    // For now, this is a placeholder
    // In the future, this could:
    // 1. Use the traditional LanguageClient from vscode-languageclient/node
    // 2. Launch the server in a child process
    // 3. Use the server directly if running in the same process

    throw new Error(
      'Node.js client mode not yet implemented - use web worker mode',
    );
  }

  /**
   * Send a notification to the language server
   */
  sendNotification(method: string, params?: any): void {
    if (!this.client) {
      throw new Error('Client not initialized');
    }
    this.client.sendNotification(method, params);
  }

  /**
   * Send a request to the language server
   */
  async sendRequest<T = any>(method: string, params?: any): Promise<T> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }
    return this.client.sendRequest<T>(method, params);
  }

  /**
   * Register a notification handler
   */
  onNotification(method: string, handler: (params: any) => void): void {
    if (!this.client) {
      throw new Error('Client not initialized');
    }
    this.client.onNotification(method, handler);
  }

  /**
   * Register a request handler
   */
  onRequest(method: string, handler: (params: any) => any): void {
    if (!this.client) {
      throw new Error('Client not initialized');
    }
    this.client.onRequest(method, handler);
  }

  /**
   * Check if the client is disposed
   */
  isDisposedClient(): boolean {
    return this.isDisposed || (this.client?.isDisposed() ?? true);
  }

  /**
   * Dispose the client and clean up resources
   */
  dispose(): void {
    if (this.isDisposed) {
      return;
    }

    const logger = this.config.logger;
    if (logger) {
      logger.info(
        `🧹 [UNIVERSAL-CLIENT] Disposing ${this.config.mode} language server`,
      );
    }

    if (this.client) {
      this.client.dispose();
      this.client = null;
    }

    if (this.workerResult) {
      WorkerLauncher.terminate(this.workerResult);
      this.workerResult = null;
    }

    this.isDisposed = true;
    if (logger) {
      logger.info(
        `✅ [UNIVERSAL-CLIENT] ${this.config.mode} language server disposed`,
      );
    }
  }

  /**
   * Get the underlying client (for advanced usage)
   */
  getUnderlyingClient(): ClientInterface | null {
    return this.client;
  }

  /**
   * Get the worker result (for web worker mode)
   */
  getWorkerResult(): WorkerLaunchResult | null {
    return this.workerResult;
  }
}

/**
 * Factory for creating universal extension clients
 */
export class UniversalClientFactory {
  /**
   * Creates a client that automatically chooses the best mode for the environment
   */
  static async createAutoClient(
    config: Omit<UniversalClientConfig, 'mode'>,
  ): Promise<UniversalExtensionClient> {
    const mode = this.detectBestMode();
    return new UniversalExtensionClient({
      ...config,
      mode,
    });
  }

  /**
   * Creates a web worker-based client
   */
  static async createWebWorkerClient(
    config: Omit<UniversalClientConfig, 'mode'>,
  ): Promise<UniversalExtensionClient> {
    return new UniversalExtensionClient({
      ...config,
      mode: 'webworker',
    });
  }

  /**
   * Creates a Node.js-based client
   */
  static async createNodeClient(
    config: Omit<UniversalClientConfig, 'mode'>,
  ): Promise<UniversalExtensionClient> {
    return new UniversalExtensionClient({
      ...config,
      mode: 'node',
    });
  }

  /**
   * Detects the best mode for the current environment
   */
  private static detectBestMode(): 'webworker' | 'node' {
    // For now, always prefer web worker mode since it works in all environments
    // In the future, this could be more sophisticated based on:
    // - VSCode environment detection
    // - Performance considerations
    // - Feature requirements

    if (typeof Worker !== 'undefined') {
      return 'webworker';
    }

    return 'node';
  }
}
