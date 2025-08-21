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
 * Web worker-specific storage implementation
 */
export class WebWorkerStorage implements ApexStorage {
  private static instance: WebWorkerStorage;
  private documents: Map<string, TextDocument>;

  constructor() {
    this.documents = new Map();
  }

  /**
   * Gets the singleton instance
   */
  static getInstance(): WebWorkerStorage {
    if (!WebWorkerStorage.instance) {
      WebWorkerStorage.instance = new WebWorkerStorage();
    }
    return WebWorkerStorage.instance;
  }

  /**
   * Initializes the storage
   */
  async initialize(): Promise<void> {
    // No initialization needed for in-memory storage
  }

  /**
   * Gets a document from storage
   */
  async getDocument(uri: string): Promise<TextDocument | undefined> {
    return this.documents.get(uri);
  }

  /**
   * Sets a document in storage
   */
  async setDocument(uri: string, document: TextDocument): Promise<void> {
    this.documents.set(uri, document);
  }

  /**
   * Clears a file from storage
   */
  async clearFile(uri: string): Promise<void> {
    this.documents.delete(uri);
  }

  /**
   * Clears all files from storage
   */
  async clearAll(): Promise<void> {
    this.documents.clear();
  }
}
