/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { IStorage, StorageConfig } from './StorageInterface';
import { WebWorkerStorage } from './WebWorkerStorage';

/**
 * Factory for creating worker-specific storage instances
 */
export class WorkerStorageFactory {
  /**
   * Creates a worker-specific storage instance
   */
  static async createStorage(config: StorageConfig = {}): Promise<IStorage> {
    return WebWorkerStorage.getInstance();
  }
}

/**
 * Creates worker storage (function export for unified factory compatibility)
 */
export async function createWorkerStorage(config: StorageConfig = {}): Promise<IStorage> {
  return WorkerStorageFactory.createStorage(config);
}
