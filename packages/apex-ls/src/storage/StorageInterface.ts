/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { Logger } from 'vscode-jsonrpc';

/**
 * Configuration for storage implementations
 */
export interface StorageConfig {
  useMemoryStorage?: boolean;
  storagePrefix?: string;
  logger?: Logger;
}

/**
 * Interface for basic storage operations
 */
export interface IStorage {
  /**
   * Initialize the storage
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
   * Creates a storage implementation appropriate for the environment
   */
  createStorage(config?: StorageConfig): Promise<IStorage>;
}

/**
 * Convenience function type for creating platform-appropriate storage
 */
export type CreatePlatformStorage = (
  config?: StorageConfig,
) => Promise<IStorage>;
