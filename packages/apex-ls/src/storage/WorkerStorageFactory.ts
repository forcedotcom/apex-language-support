/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { IStorage, StorageConfig } from '@salesforce/apex-lsp-shared';

/**
 * Base storage class with common functionality
 */
abstract class BaseStorage implements IStorage {
  protected config?: StorageConfig;
  protected initialized = false;

  async initialize(config?: StorageConfig): Promise<void> {
    this.config = config;
    await this.performInitialization();
    this.initialized = true;
  }

  /**
   * Environment-specific initialization logic
   */
  protected abstract performInitialization(): Promise<void>;

  abstract getDocument(uri: string): Promise<TextDocument | undefined>;
  abstract setDocument(uri: string, document: TextDocument): Promise<void>;
  abstract clearFile(uri: string): Promise<void>;
  abstract clearAll(): Promise<void>;

  /**
   * Ensures storage is initialized before operations
   */
  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Storage not initialized. Call initialize() first.');
    }
  }
}

/**
 * Memory-based storage implementation
 * Used for web workers due to limited persistence options
 */
class MemoryStorage extends BaseStorage {
  private documents = new Map<string, TextDocument>();

  protected async performInitialization(): Promise<void> {
    // Memory storage requires no special initialization
    this.config?.logger?.info('Memory storage initialized');
  }

  async getDocument(uri: string): Promise<TextDocument | undefined> {
    this.ensureInitialized();
    return this.documents.get(uri);
  }

  async setDocument(uri: string, document: TextDocument): Promise<void> {
    this.ensureInitialized();
    this.documents.set(uri, document);
  }

  async clearFile(uri: string): Promise<void> {
    this.ensureInitialized();
    this.documents.delete(uri);
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();
    this.documents.clear();
  }
}

/**
 * Web Worker-specific storage factory
 */
export class WorkerStorageFactory {
  /**
   * Creates a storage instance for worker environment
   * Workers use memory storage due to limited persistence options
   */
  static async createStorage(config?: StorageConfig): Promise<IStorage> {
    const storage = new MemoryStorage();
    await storage.initialize(config);
    return storage;
  }
}
