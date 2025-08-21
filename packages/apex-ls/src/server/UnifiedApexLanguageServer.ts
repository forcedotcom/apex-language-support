/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type { EnvironmentType } from '../types';
import { UnifiedStorageFactory } from '../storage/UnifiedStorageFactory';
import { isWorkerEnvironment } from '../utils/EnvironmentDetector';
import type { StorageConfig } from '../storage/StorageInterface';

/**
 * Configuration for the unified server
 */
export interface UnifiedServerConfig {
  environment: EnvironmentType;
  connection: MessageConnection;
  storageConfig?: StorageConfig;
}

/**
 * Unified Apex language server implementation
 */
export class UnifiedApexLanguageServer {
  private environment: EnvironmentType;
  private connection: MessageConnection;
  private storageConfig?: StorageConfig;

  constructor(config: UnifiedServerConfig) {
    this.environment = config.environment;
    this.connection = config.connection;
    this.storageConfig = config.storageConfig;
  }

  /**
   * Initializes the server
   */
  async initialize(): Promise<void> {
    // Initialize storage with environment-specific configuration
    const storage = await UnifiedStorageFactory.createStorage({
      ...this.storageConfig,
      useMemoryStorage: isWorkerEnvironment(),
    });

    // Initialize other components...
  }
}
