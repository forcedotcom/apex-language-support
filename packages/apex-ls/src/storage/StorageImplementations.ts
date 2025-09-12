/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { TextDocument } from 'vscode-languageserver-textdocument';
import type {
  EnvironmentType,
  IStorage,
  IStorageFactory,
  StorageConfig,
} from '@salesforce/apex-lsp-shared';

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
 * Used for web workers and as fallback for other environments
 */
export class MemoryStorage extends BaseStorage {
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
export class IndexedDBStorage extends BaseStorage {
  private dbName = 'ApexLanguageServer';
  private storeName = 'documents';
  private db?: any; // IDBDatabase - type only available in browser environment

  protected async performInitialization(): Promise<void> {
    if (this.config?.storagePrefix) {
      this.dbName = this.config.storagePrefix;
    }

    const { getIndexedDB, isIndexedDBAvailable } = await import(
      '../utils/EnvironmentUtils'
    );

    if (!isIndexedDBAvailable()) {
      throw new Error('IndexedDB is not available in this environment');
    }

    const indexedDB = getIndexedDB()!;

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
 * Memory storage factory for environments that use in-memory storage
 * Used by Node.js and Web Worker environments
 */
export class MemoryStorageFactoryImpl extends BaseStorageFactory {
  supports(environment: EnvironmentType): boolean {
    return environment === 'node' || environment === 'webworker';
  }

  async createStorage(config?: StorageConfig): Promise<IStorage> {
    this.validateConfig(config);

    try {
      const storage = new MemoryStorage();
      await storage.initialize(config);
      return storage;
    } catch (error) {
      this.handleError(error as Error, 'MemoryStorageFactory');
    }
  }
}

/**
 * Browser-specific storage factory
 */
export class BrowserStorageFactory extends BaseStorageFactory {
  supports(environment: EnvironmentType): boolean {
    return environment === 'browser';
  }

  async createStorage(config?: StorageConfig): Promise<IStorage> {
    this.validateConfig(config);

    try {
      let storage: IStorage;

      // Use IndexedDB for browsers, fallback to memory if not available
      const { isIndexedDBAvailable } = await import(
        '../utils/EnvironmentUtils'
      );

      if (isIndexedDBAvailable()) {
        storage = new IndexedDBStorage();
      } else {
        config?.logger?.warn(
          'IndexedDB not available, falling back to memory storage',
        );
        storage = new MemoryStorage();
      }

      // Initialize the storage before returning
      await storage.initialize(config);
      return storage;
    } catch (error) {
      this.handleError(error as Error, 'BrowserStorageFactory');
    }
  }
}

// Legacy aliases for backward compatibility with static methods
export { MemoryStorageFactoryImpl as MemoryStorageFactory };

export const NodeStorageFactory = {
  createStorage: async (config?: StorageConfig) => {
    const factory = new MemoryStorageFactoryImpl();
    return factory.createStorage(config);
  },
};

export const WorkerStorageFactory = {
  createStorage: async (config?: StorageConfig) => {
    const factory = new MemoryStorageFactoryImpl();
    return factory.createStorage(config);
  },
};

// Add static method to BrowserStorageFactory for backward compatibility
const browserFactoryInstance = new BrowserStorageFactory();
export const BrowserStorageFactoryStatic = {
  createStorage: (config?: StorageConfig) =>
    browserFactoryInstance.createStorage(config),
};

// Add static method to the exported class
(BrowserStorageFactory as any).createStorage =
  BrowserStorageFactoryStatic.createStorage;
