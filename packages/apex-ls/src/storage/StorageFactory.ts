/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  EnvironmentType,
  IStorage,
  IStorageFactory,
  IStorageFactoryRegistry,
  StorageConfig,
} from '@salesforce/apex-lsp-shared';
import { detectEnvironment } from '@salesforce/apex-lsp-shared';

/**
 * Registry for managing environment-specific storage factories
 * Follows the same elegant pattern as ConnectionFactoryRegistry
 */
export class StorageFactoryRegistry implements IStorageFactoryRegistry {
  private static instance: StorageFactoryRegistry;
  private readonly factories = new Map<EnvironmentType, IStorageFactory>();
  private readonly storageInstances = new Map<string, IStorage>();

  private constructor() {}

  /**
   * Gets the singleton registry instance
   */
  static getInstance(): StorageFactoryRegistry {
    if (!StorageFactoryRegistry.instance) {
      StorageFactoryRegistry.instance = new StorageFactoryRegistry();
    }
    return StorageFactoryRegistry.instance;
  }

  /**
   * Registers a storage factory for a specific environment
   */
  register(environment: EnvironmentType, factory: IStorageFactory): void {
    if (!factory.supports(environment)) {
      throw new Error(`Factory does not support environment: ${environment}`);
    }
    this.factories.set(environment, factory);
  }

  /**
   * Creates a storage instance for the specified or detected environment
   * Includes singleton management per environment to avoid duplicate instances
   */
  async createStorage(config?: StorageConfig): Promise<IStorage> {
    await ensureFactoriesRegistered();

    const environment = this.determineEnvironment(config);

    // Check for existing instance (singleton per environment)
    const instanceKey = `${environment}-${config?.storagePrefix ?? 'default'}`;
    if (this.storageInstances.has(instanceKey)) {
      return this.storageInstances.get(instanceKey)!;
    }

    const factory = this.factories.get(environment);
    if (!factory) {
      const supportedEnvs = Array.from(this.factories.keys()).join(', ');
      throw new Error(
        `No storage factory registered for environment: ${environment}. ` +
          `Supported environments: ${supportedEnvs}`,
      );
    }

    try {
      const storage = await factory.createStorage(config);
      this.storageInstances.set(instanceKey, storage);
      return storage;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(
        `Storage creation failed for ${environment}: ${errorMessage}`,
      );
    }
  }

  /**
   * Gets all registered environments
   */
  getSupportedEnvironments(): EnvironmentType[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Checks if an environment is supported
   */
  isSupported(environment: EnvironmentType): boolean {
    return this.factories.has(environment);
  }

  /**
   * Clears storage instance cache (useful for testing)
   */
  clearInstanceCache(): void {
    this.storageInstances.clear();
  }

  /**
   * Determines the environment for storage creation
   * Provides test-friendly environment detection without stack inspection
   */
  private determineEnvironment(config?: StorageConfig): EnvironmentType {
    if (config?.environment) {
      return config.environment;
    }

    // For test environments, default to node environment
    if (this.isTestEnvironment()) {
      return 'node';
    }

    return detectEnvironment();
  }

  /**
   * Checks if we're in a test environment without brittle stack inspection
   */
  private isTestEnvironment(): boolean {
    return (
      typeof process !== 'undefined' &&
      (process.env.NODE_ENV === 'test' ||
        process.env.JEST_WORKER_ID !== undefined)
    );
  }
}

/**
 * Legacy compatibility class that delegates to the registry
 * Maintains backward compatibility with existing imports
 */
export class StorageFactory {
  /**
   * Creates a storage instance using the registry pattern
   */
  static async createStorage(config?: StorageConfig): Promise<IStorage> {
    return storageFactory.createStorage(config);
  }
}

// Singleton instance for easy access
export const storageFactory = StorageFactoryRegistry.getInstance();

// Factory registration state
let factoriesRegistered = false;

// Register factories on first use using the exact pattern from working tests
async function ensureFactoriesRegistered() {
  if (factoriesRegistered) return;

  // Import exactly like the working storage tests do
  const { WorkerStorageFactory, BrowserStorageFactory } = await import(
    './StorageImplementations'
  );

  // Create factory objects using the exact same pattern as the tests
  const nodeFactory = {
    supports: (environment: EnvironmentType) => environment === 'node',
    createStorage: async (config?: StorageConfig) =>
      WorkerStorageFactory.createStorage(config),
  };

  const workerFactory = {
    supports: (environment: EnvironmentType) => environment === 'webworker',
    createStorage: async (config?: StorageConfig) =>
      WorkerStorageFactory.createStorage(config),
  };

  const browserFactory = {
    supports: (environment: EnvironmentType) => environment === 'browser',
    createStorage: async (config?: StorageConfig) => {
      const factory = new BrowserStorageFactory();
      return factory.createStorage(config);
    },
  };

  storageFactory.register('node', nodeFactory);
  storageFactory.register('webworker', workerFactory);
  storageFactory.register('browser', browserFactory);

  factoriesRegistered = true;
}
