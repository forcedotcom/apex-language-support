/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { EnvironmentType } from '@salesforce/apex-lsp-shared';
import type {
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
    const environment = config?.environment ?? detectEnvironment();

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
}

/**
 * Abstract base class for storage factories with common functionality
 * Provides the same elegant inheritance pattern as BaseConnectionFactory
 */
export abstract class BaseStorageFactory implements IStorageFactory {
  abstract supports(environment: EnvironmentType): boolean;
  abstract createStorage(config?: StorageConfig): Promise<IStorage>;

  /**
   * Validates storage configuration
   */
  protected validateConfig(config?: StorageConfig): void {
    if (config?.environment && !this.supports(config.environment)) {
      throw new Error(
        `Factory does not support environment: ${config.environment}`,
      );
    }
  }

  /**
   * Handles storage creation errors with context
   */
  protected handleError(error: Error, context: string): never {
    throw new Error(`${context}: ${error.message}`);
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
