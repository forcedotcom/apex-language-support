/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * Configuration for IndexedDB storage
 */
export interface IndexedDBStorageConfig {
  dbName?: string;
  storeName?: string;
  logger?: {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
  };
}

/**
 * IndexedDB-based storage for browser environments
 */
export class BrowserIndexedDBApexStorage {
  private dbName: string;
  private storeName: string;
  private db?: IDBDatabase;
  private logger?: IndexedDBStorageConfig['logger'];

  constructor(config?: IndexedDBStorageConfig) {
    this.dbName = config?.dbName || 'ApexLanguageServer';
    this.storeName = config?.storeName || 'documents';
    this.logger = config?.logger;
  }

  /**
   * Initialize the IndexedDB storage
   */
  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => reject(new Error('Failed to open IndexedDB'));

      request.onsuccess = () => {
        this.db = request.result;
        this.logger?.info(`IndexedDB storage initialized: ${this.dbName}`);
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

  /**
   * Store a document by URI
   */
  async setDocument(uri: string, document: TextDocument): Promise<void> {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(document, uri);

      request.onerror = () =>
        reject(new Error(`Failed to store document: ${uri}`));
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Retrieve a document by URI
   */
  async getDocument(uri: string): Promise<TextDocument | undefined> {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(uri);

      request.onerror = () =>
        reject(new Error(`Failed to retrieve document: ${uri}`));
      request.onsuccess = () => resolve(request.result);
    });
  }

  /**
   * Remove a document by URI
   */
  async removeDocument(uri: string): Promise<void> {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(uri);

      request.onerror = () =>
        reject(new Error(`Failed to remove document: ${uri}`));
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Clear all documents
   */
  async clearAll(): Promise<void> {
    if (!this.db) {
      throw new Error('Storage not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onerror = () =>
        reject(new Error('Failed to clear all documents'));
      request.onsuccess = () => resolve();
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = undefined;
    }
  }
}