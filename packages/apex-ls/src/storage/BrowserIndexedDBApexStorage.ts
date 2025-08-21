/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { TextDocument } from 'vscode-languageserver-textdocument';
import type { ApexStorage } from './ApexStorageInterface';

/**
 * Browser-specific storage implementation using IndexedDB
 */
export class BrowserIndexedDBApexStorage implements ApexStorage {
  private static instance: BrowserIndexedDBApexStorage;
  private db: IDBDatabase | undefined;
  private readonly DB_NAME = 'apex-ls-storage';
  private readonly STORE_NAME = 'documents';

  constructor() {
    // Private constructor for singleton
  }

  /**
   * Gets the singleton instance
   */
  static getInstance(): BrowserIndexedDBApexStorage {
    if (!BrowserIndexedDBApexStorage.instance) {
      BrowserIndexedDBApexStorage.instance = new BrowserIndexedDBApexStorage();
    }
    return BrowserIndexedDBApexStorage.instance;
  }

  /**
   * Initializes the storage
   */
  async initialize(): Promise<void> {
    if (this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
    });
  }

  /**
   * Gets a document from storage
   */
  async getDocument(uri: string): Promise<TextDocument | undefined> {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(uri);

      request.onerror = () => {
        reject(new Error('Failed to get document from IndexedDB'));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  /**
   * Sets a document in storage
   */
  async setDocument(uri: string, document: TextDocument): Promise<void> {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(document, uri);

      request.onerror = () => {
        reject(new Error('Failed to store document in IndexedDB'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Clears a file from storage
   */
  async clearFile(uri: string): Promise<void> {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(uri);

      request.onerror = () => {
        reject(new Error('Failed to clear file from IndexedDB'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * Clears all files from storage
   */
  async clearAll(): Promise<void> {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error('Failed to clear all files from IndexedDB'));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }
}
