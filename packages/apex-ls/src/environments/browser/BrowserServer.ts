/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection, Logger } from 'vscode-jsonrpc';
import type { BrowserServerConfig } from '../../core/ServerConfig';
import type { IStorage } from '@salesforce/apex-lsp-shared';

/**
 * Browser-specific Apex Language Server implementation.
 *
 * In browser environments, the "server" is typically a client that connects
 * to a worker-based server. This class handles the browser-side initialization
 * and connection management.
 */
export class BrowserServer {
  private readonly connection: MessageConnection;
  private readonly logger?: Logger;
  private storage?: IStorage;

  constructor(config: BrowserServerConfig) {
    this.connection = config.connection;
    this.logger = config.logger;
  }

  /**
   * Initializes the browser server
   */
  async initialize(): Promise<void> {
    this.logger?.info('🚀 Browser server initializing...');

    // Initialize browser-appropriate storage
    await this.initializeStorage();

    // Browser connections are typically handled by the extension host
    // No need to explicitly start listening as the connection is managed externally

    this.logger?.info('✅ Browser server initialized successfully');
  }

  /**
   * Initializes storage for browser environment
   */
  private async initializeStorage(): Promise<void> {
    try {
      // Import browser storage factory
      const { BrowserStorageFactory } = await import(
        '../../storage/StorageImplementations'
      );
      const factory = new BrowserStorageFactory();
      this.storage = await factory.createStorage();

      this.logger?.info('✅ Browser storage initialized (IndexedDB)');
    } catch (error) {
      this.logger?.error(`❌ Failed to initialize browser storage: ${error}`);
      throw error;
    }
  }

  /**
   * Gets the message connection
   */
  getConnection(): MessageConnection {
    return this.connection;
  }

  /**
   * Gets the storage instance
   */
  getStorage(): IStorage | undefined {
    return this.storage;
  }

  /**
   * Gracefully shuts down the browser server
   */
  async dispose(): Promise<void> {
    this.logger?.info('🛑 Browser server disposing...');

    // Browser connections are typically managed externally
    // Storage cleanup is handled by the browser's garbage collection

    this.logger?.info('✅ Browser server disposed');
  }
}

/**
 * Factory function for creating browser servers
 */
export async function createBrowserServer(
  config: BrowserServerConfig,
): Promise<BrowserServer> {
  const server = new BrowserServer(config);
  await server.initialize();
  return server;
}
