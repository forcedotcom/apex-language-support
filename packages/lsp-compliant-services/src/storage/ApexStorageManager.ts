/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { ApexStorageInterface } from './ApexStorageInterface.js';

/**
 * Factory type for creating storage implementations
 */
export type ApexStorageFactory = (
  options?: Record<string, unknown>,
) => ApexStorageInterface;

/**
 * Configuration options for the storage manager
 */
export interface ApexStorageManagerOptions {
  /** Factory function to create the storage implementation */
  storageFactory: ApexStorageFactory;

  /** Options to pass to the storage implementation */
  storageOptions?: Record<string, unknown>;

  /** Auto-persist interval in milliseconds (0 disables auto-persist) */
  autoPersistIntervalMs?: number;
}

/**
 * Manages the lifecycle and access to the Apex artifact storage system
 */
export class ApexStorageManager {
  private static instance: ApexStorageManager | null = null;
  private storage: ApexStorageInterface | null = null;
  private autoPersistInterval: NodeJS.Timeout | null = null;
  private options: ApexStorageManagerOptions;

  /**
   * Private constructor to enforce singleton
   */
  private constructor(options: ApexStorageManagerOptions) {
    this.options = options;
  }

  /**
   * Get or create the singleton instance
   * @param options Configuration options (only used when creating)
   */
  public static getInstance(
    options?: ApexStorageManagerOptions,
  ): ApexStorageManager {
    if (!ApexStorageManager.instance) {
      if (!options) {
        throw new Error('Initial call to getInstance must provide options');
      }
      ApexStorageManager.instance = new ApexStorageManager(options);
    }
    return ApexStorageManager.instance;
  }

  /**
   * Initialize the storage system
   */
  public async initialize(): Promise<void> {
    if (this.storage) {
      return;
    }

    this.storage = this.options.storageFactory(this.options.storageOptions);
    await this.storage.initialize(this.options.storageOptions);

    // Set up auto-persist if configured
    if (
      this.options.autoPersistIntervalMs &&
      this.options.autoPersistIntervalMs > 0
    ) {
      this.autoPersistInterval = setInterval(async () => {
        await this.persist();
      }, this.options.autoPersistIntervalMs);
    }
  }

  /**
   * Shut down the storage system
   */
  public async shutdown(): Promise<void> {
    if (!this.storage) {
      return;
    }

    // Clear auto-persist interval if running
    if (this.autoPersistInterval) {
      clearInterval(this.autoPersistInterval);
      this.autoPersistInterval = null;
    }

    // Final persist before shutdown
    await this.persist();

    // Shut down the storage
    await this.storage.shutdown();
    this.storage = null;
  }

  /**
   * Get the underlying storage implementation
   */
  public getStorage(): ApexStorageInterface {
    if (!this.storage) {
      throw new Error('Storage not initialized. Call initialize() first.');
    }
    return this.storage;
  }

  /**
   * Manually trigger a persist operation
   */
  public async persist(): Promise<void> {
    if (this.storage) {
      await this.storage.persist();
    }
  }

  /**
   * Reset the singleton instance (mainly for testing)
   */
  public static reset(): void {
    ApexStorageManager.instance = null;
  }
}
