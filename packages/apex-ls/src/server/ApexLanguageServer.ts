/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type { EnvironmentType } from '../types';
import { StorageFactory } from '../storage/StorageFactory.worker';
import { isWorkerEnvironment } from '../utils/EnvironmentDetector.worker';
import type { StorageConfig } from '../storage/StorageInterface';

/**
 * Configuration for the server
 */
export interface ServerConfig {
  environment: EnvironmentType;
  connection: MessageConnection;
  storageConfig?: StorageConfig;
}

/**
 * Apex language server implementation
 */
export class ApexLanguageServer {
  private environment: EnvironmentType;
  private connection: MessageConnection;
  private storageConfig?: StorageConfig;

  constructor(config: ServerConfig) {
    this.environment = config.environment;
    this.connection = config.connection;
    this.storageConfig = config.storageConfig;
  }

  /**
   * Initializes the server
   */
  async initialize(): Promise<void> {
    // Initialize storage with environment-specific configuration
    const storage = await StorageFactory.createStorage({
      ...this.storageConfig,
      useMemoryStorage: isWorkerEnvironment(),
    });

    // Initialize other components...
  }
}
