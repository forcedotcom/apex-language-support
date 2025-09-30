/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection, Logger } from 'vscode-jsonrpc';
import type { EnvironmentType } from '@salesforce/apex-lsp-shared';
import {
  detectEnvironment,
  BaseConnectionFactory,
} from '@salesforce/apex-lsp-shared';
import { BrowserMessageBridge } from './PlatformBridges.browser';
import type { Worker } from './Interfaces';

/**
 * Unified configuration for all connection types
 */
export interface UnifiedConnectionConfig {
  environment?: EnvironmentType;
  worker?: Worker;
  logger?: Logger;
  mode?: 'stdio' | 'socket' | 'ipc'; // Use 'ipc' to match base interface
  port?: number;
  host?: string;
}

/**
 * Unified connection factory that handles all environments
 * Automatically detects environment and creates appropriate connections
 */
export class UnifiedConnectionFactory extends BaseConnectionFactory {
  supports(environment: EnvironmentType): boolean {
    return ['browser', 'webworker', 'node'].includes(environment);
  }

  async createConnection(
    config?: UnifiedConnectionConfig,
  ): Promise<MessageConnection> {
    const environment = config?.environment ?? detectEnvironment();
    this.validateConfig(config);

    try {
      switch (environment) {
        case 'browser':
          return this.createBrowserConnection(config);
        case 'webworker':
          return await this.createWorkerConnection(config);
        case 'node':
          return await this.createNodeConnection(config);
        default:
          throw new Error(`Unsupported environment: ${environment}`);
      }
    } catch (error) {
      this.handleError(
        error as Error,
        `UnifiedConnectionFactory(${environment})`,
      );
    }
  }

  /**
   * Creates a browser-to-worker connection
   */
  private createBrowserConnection(
    config?: UnifiedConnectionConfig,
  ): MessageConnection {
    if (!config?.worker) {
      throw new Error('Browser environment requires a worker instance');
    }
    return BrowserMessageBridge.forWorkerClient(config.worker, config.logger);
  }

  /**
   * Creates a worker-side connection
   */
  private async createWorkerConnection(
    config?: UnifiedConnectionConfig,
  ): Promise<MessageConnection> {
    const { WorkerMessageBridge } = await import('./PlatformBridges.worker');
    return WorkerMessageBridge.forWorkerServer(undefined, config?.logger);
  }

  /**
   * Creates a Node.js connection
   */
  private async createNodeConnection(
    config?: UnifiedConnectionConfig,
  ): Promise<MessageConnection> {
    const { NodeMessageBridge } = await import('./NodeBridge');
    return NodeMessageBridge.createConnection({
      mode: config?.mode ?? 'stdio',
      logger: config?.logger,
      port: config?.port,
      host: config?.host,
    });
  }

  /**
   * Environment-specific configuration validation
   */
  protected validateConfig(config?: UnifiedConnectionConfig): void {
    super.validateConfig(config);

    const env = config?.environment ?? detectEnvironment();

    switch (env) {
      case 'browser':
        if (!config?.worker) {
          throw new Error('Browser environment requires a worker instance');
        }
        break;
      case 'node':
        if (config?.mode === 'socket') {
          if (!config.port) {
            throw new Error('Port is required for socket mode');
          }
          if (config.port < 1 || config.port > 65535) {
            throw new Error('Port must be between 1 and 65535');
          }
        }
        break;
      case 'webworker':
        // No specific validation required for worker environment
        break;
    }
  }

  /**
   * Static convenience method for quick connection creation
   */
  static async createConnection(
    config?: UnifiedConnectionConfig,
  ): Promise<MessageConnection> {
    const factory = new UnifiedConnectionFactory();
    return factory.createConnection(config);
  }

  /**
   * Static convenience methods for specific environments
   */
  static createBrowserConnection(
    worker: Worker, // Worker type only available in browser environment
    logger?: Logger,
  ): MessageConnection {
    return BrowserMessageBridge.forWorkerClient(worker, logger);
  }

  static async createWorkerConnection(
    logger?: Logger,
  ): Promise<MessageConnection> {
    const { WorkerMessageBridge } = await import('./PlatformBridges.worker');
    return WorkerMessageBridge.forWorkerServer(undefined, logger);
  }

  static async createNodeConnection(config?: {
    mode?: 'stdio' | 'socket' | 'ipc';
    logger?: Logger;
    port?: number;
    host?: string;
  }): Promise<MessageConnection> {
    const { NodeMessageBridge } = await import('./NodeBridge');
    return NodeMessageBridge.createConnection({
      mode: config?.mode ?? 'stdio',
      logger: config?.logger,
      port: config?.port,
      host: config?.host,
    });
  }
}

// Legacy compatibility exports
export const BrowserConnectionFactory = {
  createConnection: (config?: { worker?: Worker; logger?: Logger }) =>
    UnifiedConnectionFactory.createConnection({
      environment: 'browser',
      worker: config?.worker,
      logger: config?.logger,
    }),
  forWorker: UnifiedConnectionFactory.createBrowserConnection,
  createBrowserConnection: UnifiedConnectionFactory.createBrowserConnection,
};

export const WorkerConnectionFactory = {
  createConnection: (config?: { logger?: Logger }) =>
    UnifiedConnectionFactory.createConnection({
      environment: 'webworker',
      logger: config?.logger,
    }),
  forWorkerServer: (logger?: Logger) =>
    UnifiedConnectionFactory.createWorkerConnection(logger),
};

export const NodeConnectionFactory = {
  createConnection: (config?: UnifiedConnectionConfig) =>
    UnifiedConnectionFactory.createConnection({
      environment: 'node',
      ...config,
    }),
};
