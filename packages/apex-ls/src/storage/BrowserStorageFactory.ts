/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { IStorage, StorageConfig } from './StorageInterface';

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
 * Used as fallback when IndexedDB is not available
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
 * IndexedDB-based storage implementation for browsers
 */
class IndexedDBStorage extends BaseStorage {
  private dbName = 'ApexLanguageServer';
  private storeName = 'documents';
  private db?: IDBDatabase;

  protected async performInitialization(): Promise<void> {
    if (this.config?.storagePrefix) {
      this.dbName = this.config.storagePrefix;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));

      request.onsuccess = () => {
        this.db = request.result;
        this.config?.logger?.info('IndexedDB storage initialized');
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  async getDocument(uri: string): Promise<TextDocument | undefined> {
    this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(uri);

      request.onerror = () =>
        reject(new Error(`Failed to get document: ${uri}`));
      request.onsuccess = () => resolve(request.result);
    });
  }

  async setDocument(uri: string, document: TextDocument): Promise<void> {
    this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(document, uri);

      request.onerror = () =>
        reject(new Error(`Failed to set document: ${uri}`));
      request.onsuccess = () => resolve();
    });
  }

  async clearFile(uri: string): Promise<void> {
    this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(uri);

      request.onerror = () => reject(new Error(`Failed to clear file: ${uri}`));
      request.onsuccess = () => resolve();
    });
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();
    if (!this.db) throw new Error('Database not available');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () =>
        reject(new Error('Failed to clear all documents'));
      request.onsuccess = () => resolve();
    });
  }
}

/**
 * Browser-specific storage factory
 */
export class BrowserStorageFactory {
  /**
   * Creates a storage instance for browser environment
   */
  static async createStorage(config?: StorageConfig): Promise<IStorage> {
    let storage: IStorage;

    if (config?.useMemoryStorage) {
      storage = new MemoryStorage();
    } else if (typeof indexedDB !== 'undefined') {
      storage = new IndexedDBStorage();
    } else {
      config?.logger?.warn(
        'IndexedDB not available, falling back to memory storage',
      );
      storage = new MemoryStorage();
    }

    await storage.initialize(config);
    return storage;
  }
}