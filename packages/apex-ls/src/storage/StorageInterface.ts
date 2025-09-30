/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Re-export storage interfaces from shared package
export type { IStorage, StorageConfig } from '@salesforce/apex-lsp-shared';

// Import types for use in interfaces
import type { IStorage, StorageConfig } from '@salesforce/apex-lsp-shared';

/**
 * Storage provider interface for creating storage instances
 */
export interface StorageProvider {
  /**
   * Creates a storage instance with the given configuration
   */
  createStorage(config?: StorageConfig): Promise<IStorage>;

  /**
   * Gets the storage type this provider supports
   */
  getStorageType(): string;

  /**
   * Checks if this provider supports the given environment
   */
  supportsEnvironment(environment: string): boolean;
}

/**
 * Storage factory interface for creating environment-appropriate storage
 */
export interface StorageFactory {
  /**
   * Creates storage appropriate for the current environment
   */
  createStorage(config?: StorageConfig): Promise<IStorage>;

  /**
   * Gets available storage providers
   */
  getProviders(): StorageProvider[];

  /**
   * Registers a new storage provider
   */
  registerProvider(provider: StorageProvider): void;
}
