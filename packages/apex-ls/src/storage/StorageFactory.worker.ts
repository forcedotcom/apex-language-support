/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { IStorage, StorageConfig } from './StorageInterface';
import { WorkerStorageFactory } from './WorkerStorageFactory';

/**
 * Worker-specific storage factory
 * This is the worker entry point for storage creation
 */
export class StorageFactory {
  /**
   * Creates a storage instance for worker environment
   */
  static async createStorage(config?: StorageConfig): Promise<IStorage> {
    return WorkerStorageFactory.createStorage(config);
  }
}