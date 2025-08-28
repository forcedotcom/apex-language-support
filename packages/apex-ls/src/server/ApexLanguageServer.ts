/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type {
  EnvironmentType,
  StorageConfig,
  IStorage,
} from '@salesforce/apex-lsp-shared';
import {
  isNodeEnvironment,
  isWorkerEnvironment,
  isBrowserEnvironment,
} from '@salesforce/apex-lsp-shared';

/**
 * Unified configuration for the server
 */
export interface ServerConfig {
  environment: EnvironmentType;
  connection: MessageConnection;
  storageConfig?: StorageConfig;
}

// Import the unified storage factory registry
// Import storage factories directly like the working tests do

/**
 * Unified Apex language server implementation
 * Adapts behavior based on runtime environment
 */
export class ApexLanguageServer {
  private readonly environment: EnvironmentType;
  private readonly connection: MessageConnection;
  private readonly storageConfig?: StorageConfig;

  constructor(config: ServerConfig) {
    this.environment = config.environment;
    this.connection = config.connection;
    this.storageConfig = config.storageConfig;

    // Validate environment compatibility at construction time
    this.validateEnvironment();
  }

  /**
   * Creates storage using the exact same pattern as the working tests
   */
  private async createStorage(config?: StorageConfig): Promise<IStorage> {
    // Import fresh each time to avoid module cache issues with mocked tests
    const { WorkerStorageFactory, BrowserStorageFactory } = await import(
      '../storage/StorageImplementations'
    );

    switch (this.environment) {
      case 'browser':
        const browserFactory = new BrowserStorageFactory();
        return browserFactory.createStorage(config);
      case 'node':
      case 'webworker':
        // Use WorkerStorageFactory the exact same way as the working tests
        return WorkerStorageFactory.createStorage(config);
      default:
        throw new Error(
          `Unsupported environment for storage: ${this.environment}`,
        );
    }
  }

  /**
   * Initializes the language server with environment-aware configuration
   */
  async initialize(): Promise<void> {
    // Initialize environment-appropriate storage using direct approach like tests
    const storageConfig = this.getEnvironmentStorageConfig();
    const _storage = await this.createStorage(storageConfig);

    // Environment-specific initialization
    switch (this.environment) {
      case 'node':
        // Node.js servers need to explicitly start listening
        this.connection.listen();
        break;
      case 'webworker':
        // Workers are already listening through message bridge
        break;
      case 'browser':
        // Browser connections handled by extension host
        break;
    }

    // Common initialization logic for all environments
    await this.initializeCommonServices();
  }

  /**
   * Gets environment-specific storage configuration
   */
  private getEnvironmentStorageConfig(): StorageConfig {
    return {
      ...this.storageConfig,
      // Use memory storage for workers due to limited persistence options
      useMemoryStorage: this.environment === 'webworker',
    };
  }

  /**
   * Validates that the server can run in the current environment
   */
  private validateEnvironment(): void {
    switch (this.environment) {
      case 'node':
        if (!isNodeEnvironment()) {
          throw new Error('Node.js server can only run in Node.js environment');
        }
        break;
      case 'webworker':
        if (!isWorkerEnvironment()) {
          throw new Error('Worker server can only run in worker environment');
        }
        break;
      case 'browser':
        if (!isBrowserEnvironment()) {
          throw new Error('Browser server can only run in browser environment');
        }
        break;
      default:
        throw new Error(`Unknown environment: ${this.environment}`);
    }
  }

  /**
   * Common service initialization shared across all environments
   */
  private async initializeCommonServices(): Promise<void> {
    // Initialize language services, parsers, etc.
    // This logic is identical across all environments
  }

  /**
   * Gracefully shuts down the server
   */
  async dispose(): Promise<void> {
    // Environment-specific cleanup
    if (this.environment === 'node') {
      this.connection.dispose();
    }
    // Common cleanup logic
  }
}
