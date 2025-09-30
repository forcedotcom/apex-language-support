/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection, Logger } from 'vscode-jsonrpc';
import type {
  EnvironmentType,
  StorageConfig,
} from '@salesforce/apex-lsp-shared';

/**
 * Unified configuration for the LSP server
 */
export interface ServerConfig {
  environment: EnvironmentType;
  connection: MessageConnection;
  storageConfig?: StorageConfig;
  logger?: Logger;
}

/**
 * Browser-specific server configuration
 */
export interface BrowserServerConfig extends ServerConfig {
  environment: 'browser';
}

/**
 * Worker-specific server configuration
 */
export interface WorkerServerConfig extends ServerConfig {
  environment: 'webworker';
}

/**
 * Node.js-specific server configuration
 */
export interface NodeServerConfig extends ServerConfig {
  environment: 'node';
}

/**
 * Configuration factory for creating environment-specific configurations
 */
export class ServerConfigFactory {
  /**
   * Creates a browser server configuration
   */
  static createBrowserConfig(
    connection: MessageConnection,
    storageConfig?: StorageConfig,
  ): BrowserServerConfig {
    return {
      environment: 'browser',
      connection,
      storageConfig,
    };
  }

  /**
   * Creates a worker server configuration
   */
  static createWorkerConfig(
    connection: MessageConnection,
    storageConfig?: StorageConfig,
  ): WorkerServerConfig {
    return {
      environment: 'webworker',
      connection,
      storageConfig,
    };
  }

  /**
   * Creates a Node.js server configuration
   */
  static createNodeConfig(
    connection: MessageConnection,
    storageConfig?: StorageConfig,
  ): NodeServerConfig {
    return {
      environment: 'node',
      connection,
      storageConfig,
    };
  }
}
