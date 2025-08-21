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
 * Worker-specific storage implementation using memory
 */
class WorkerStorage implements IStorage {
  private documents: Map<string, TextDocument>;

  constructor(private config: StorageConfig = {}) {
    this.documents = new Map();
  }

  async initialize(): Promise<void> {
    this.config.logger?.info('Worker storage initialized');
  }

  async getDocument(uri: string): Promise<TextDocument | undefined> {
    const document = this.documents.get(uri);
    this.config.logger?.info(
      document
        ? `Document found in worker storage: ${uri}`
        : `Document not found in worker storage: ${uri}`,
    );
    return document;
  }

  async setDocument(uri: string, document: TextDocument): Promise<void> {
    this.documents.set(uri, document);
    this.config.logger?.info(`Document stored in worker storage: ${uri}`);
  }

  async clearFile(uri: string): Promise<void> {
    this.documents.delete(uri);
    this.config.logger?.info(`File cleared from worker storage: ${uri}`);
  }

  async clearAll(): Promise<void> {
    this.documents.clear();
    this.config.logger?.info('All files cleared from worker storage');
  }
}

/**
 * Factory for creating worker-specific storage implementations
 */
export class WorkerStorageFactory implements IStorageFactory {
  /**
   * Creates a worker-specific storage implementation
   */
  async createStorage(config?: StorageConfig): Promise<IStorage> {
    const storage = new WorkerStorage(config);
    await storage.initialize();
    return storage;
  }
}

/**
 * Convenience function for creating worker storage
 */
export async function createWorkerStorage(
  config?: StorageConfig,
): Promise<IStorage> {
  const factory = new WorkerStorageFactory();
  return factory.createStorage(config);
}
