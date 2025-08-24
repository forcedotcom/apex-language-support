/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type { EnvironmentType } from '../types';
import { isNodeEnvironment } from '../utils/EnvironmentDetector.node';
import type { StorageConfig } from '../storage/StorageInterface';
import { StorageFactory } from '../storage/StorageFactory.node';

/**
 * Configuration for creating a server
 */
export interface ServerConfig {
  environment: EnvironmentType;
  connection: MessageConnection;
  storageConfig?: StorageConfig;
}

/**
 * language server implementation
 */
export class ApexLanguageServer {
  private readonly connection: MessageConnection;
  private readonly storageConfig?: StorageConfig;

  constructor(config: ServerConfig) {
    if (!isNodeEnvironment()) {
      throw new Error('Node.js server can only run in Node.js environment');
    }

    this.connection = config.connection;
    this.storageConfig = config.storageConfig;
  }

  /**
   * Initializes the language server
   */
  async initialize(): Promise<void> {
    // Initialize storage
    const storage = await StorageFactory.createStorage(this.storageConfig);

    // Initialize server
    this.connection.listen();
  }
}
