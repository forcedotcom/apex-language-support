/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { Logger } from 'vscode-jsonrpc';

import type { EnvironmentType } from '../types';

/**
 * Configuration for storage implementations
 */
export interface StorageConfig {
  useMemoryStorage?: boolean;
  storagePrefix?: string;
  logger?: Logger;
  environment?: EnvironmentType;
}

/**
 * Unified interface for storage operations
 * Consolidates IStorage and ApexStorage interfaces which were 99% identical
 */
export interface IStorage {
  /**
   * Initialize the storage with optional configuration
   */
  initialize(config?: StorageConfig): Promise<void>;

  /**
   * Get a document from storage
   */
  getDocument(uri: string): Promise<TextDocument | undefined>;

  /**
   * Set a document in storage
   */
  setDocument(uri: string, document: TextDocument): Promise<void>;

  /**
   * Clear a file from storage
   */
  clearFile(uri: string): Promise<void>;

  /**
   * Clear all files from storage
   */
  clearAll(): Promise<void>;
}

/**
 * Interface for environment-specific storage factories
 */
export interface IStorageFactory {
  /**
   * Creates a storage implementation for the specific environment
   */
  createStorage(config?: StorageConfig): Promise<IStorage>;

  /**
   * Indicates if this factory supports the given environment
   */
  supports(environment: EnvironmentType): boolean;
}

/**
 * Interface for storage factory registry
 */
export interface IStorageFactoryRegistry {
  register(environment: EnvironmentType, factory: IStorageFactory): void;
  createStorage(config?: StorageConfig): Promise<IStorage>;
  getSupportedEnvironments(): EnvironmentType[];
  isSupported(environment: EnvironmentType): boolean;
}

/**
 * Convenience function type for creating platform-appropriate storage
 */
export type CreatePlatformStorage = (
  config?: StorageConfig,
) => Promise<IStorage>;
