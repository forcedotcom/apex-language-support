/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { IStorage, StorageConfig } from './StorageInterface';
import type { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * Node.js-specific storage implementation
 */
class NodeStorage implements IStorage {
  private storage = new Map<string, TextDocument>();
  private config?: StorageConfig;

  async initialize(config?: StorageConfig): Promise<void> {
    this.config = config;
  }

  async getDocument(uri: string): Promise<TextDocument | undefined> {
    return this.storage.get(uri);
  }

  async setDocument(uri: string, document: TextDocument): Promise<void> {
    this.storage.set(uri, document);
  }

  async clearFile(uri: string): Promise<void> {
    this.storage.delete(uri);
  }

  async clearAll(): Promise<void> {
    this.storage.clear();
  }
}

/**
 * Node.js-specific storage factory
 */
export class NodeStorageFactory {
  private static instance: IStorage;

  /**
   * Creates a Node.js-specific storage instance
   */
  static async createStorage(config?: StorageConfig): Promise<IStorage> {
    if (!NodeStorageFactory.instance) {
      NodeStorageFactory.instance = new NodeStorage();
    }
    return NodeStorageFactory.instance;
  }
}

/**
 * Creates Node storage (function export for factory compatibility)
 */
export async function createNodeStorage(
  config?: StorageConfig,
): Promise<IStorage> {
  return NodeStorageFactory.createStorage(config);
}
