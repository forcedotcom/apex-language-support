/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { TextDocument } from 'vscode-languageserver-textdocument';
import type {
  IStorage,
  IStorageFactory,
  StorageConfig,
} from './StorageInterface';

/**
 * Browser-specific storage implementation using IndexedDB
 */
class BrowserStorage implements IStorage {
  private db: IDBDatabase | undefined;
  private readonly DB_NAME: string;
  private readonly STORE_NAME = 'documents';

  constructor(private config: StorageConfig = {}) {
    this.DB_NAME = config.storagePrefix || 'apex-ls-storage';
  }

  async initialize(): Promise<void> {
    if (this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = () => {
        this.config.logger?.error('Failed to open IndexedDB');
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.config.logger?.info('IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
          this.config.logger?.info('Created document store in IndexedDB');
        }
      };
    });
  }

  async getDocument(uri: string): Promise<TextDocument | undefined> {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(uri);

      request.onerror = () => {
        this.config.logger?.error(
          `Failed to get document from IndexedDB: ${uri}`,
        );
        reject(new Error('Failed to get document from IndexedDB'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  async setDocument(uri: string, document: TextDocument): Promise<void> {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(document, uri);

      request.onerror = () => {
        this.config.logger?.error(
          `Failed to store document in IndexedDB: ${uri}`,
        );
        reject(new Error('Failed to store document in IndexedDB'));
      };

      request.onsuccess = () => {
        this.config.logger?.info(`Document stored in IndexedDB: ${uri}`);
        resolve();
      };
    });
  }

  async clearFile(uri: string): Promise<void> {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(uri);

      request.onerror = () => {
        this.config.logger?.error(
          `Failed to clear file from IndexedDB: ${uri}`,
        );
        reject(new Error('Failed to clear file from IndexedDB'));
      };

      request.onsuccess = () => {
        this.config.logger?.info(`File cleared from IndexedDB: ${uri}`);
        resolve();
      };
    });
  }

  async clearAll(): Promise<void> {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onerror = () => {
        this.config.logger?.error('Failed to clear all files from IndexedDB');
        reject(new Error('Failed to clear all files from IndexedDB'));
      };

      request.onsuccess = () => {
        this.config.logger?.info('All files cleared from IndexedDB');
        resolve();
      };
    });
  }
}

/**
 * Factory for creating browser-specific storage implementations
 */
export class BrowserStorageFactory implements IStorageFactory {
  /**
   * Creates a browser-specific storage implementation
   */
  async createStorage(config?: StorageConfig): Promise<IStorage> {
    const storage = new BrowserStorage(config);
    await storage.initialize();
    return storage;
  }
}

/**
 * Convenience function for creating browser storage
 */
export async function createBrowserStorage(
  config?: StorageConfig,
): Promise<IStorage> {
  const factory = new BrowserStorageFactory();
  return factory.createStorage(config);
}
