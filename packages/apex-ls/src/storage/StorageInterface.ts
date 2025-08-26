/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * Configuration for storage implementations
 */
export interface StorageConfig {
  /**
   * Force use of memory storage instead of persistent storage
   */
  useMemoryStorage?: boolean;

  /**
   * Prefix for storage keys (useful for namespacing)
   */
  storagePrefix?: string;

  /**
   * Logger instance for debugging
   */
  logger?: {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
  };
}

/**
 * Interface for storage implementations
 */
export interface IStorage {
  /**
   * Initialize the storage with optional configuration
   */
  initialize(config?: StorageConfig): Promise<void>;

  /**
   * Retrieve a document by URI
   */
  getDocument(uri: string): Promise<TextDocument | undefined>;

  /**
   * Store a document by URI
   */
  setDocument(uri: string, document: TextDocument): Promise<void>;

  /**
   * Clear a specific document by URI
   */
  clearFile(uri: string): Promise<void>;

  /**
   * Clear all documents
   */
  clearAll(): Promise<void>;
}