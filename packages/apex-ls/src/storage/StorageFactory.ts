/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { IStorage, StorageConfig } from './StorageInterface';
import {
  isWorkerEnvironment,
  isBrowserEnvironment,
  isNodeEnvironment,
} from '../utils/EnvironmentDetector';

/**
 * Factory for creating appropriate storage implementations based on environment
 */
export class StorageFactory {
  private static instance: IStorage;

  /**
   * Creates a storage implementation appropriate for the current environment
   */
  static async createStorage(config?: StorageConfig): Promise<IStorage> {
    if (StorageFactory.instance) {
      return StorageFactory.instance;
    }

    if (isWorkerEnvironment()) {
      const { createWorkerStorage } = await import('./WorkerStorageFactory');
      StorageFactory.instance = await createWorkerStorage(config);
      return StorageFactory.instance;
    }

    if (isBrowserEnvironment()) {
      const { createBrowserStorage } = await import('./BrowserStorageFactory');
      StorageFactory.instance = await createBrowserStorage(config);
      return StorageFactory.instance;
    }

    if (isNodeEnvironment()) {
      // For Node.js, use dedicated node storage
      const { createNodeStorage } = await import('./NodeStorageFactory');
      StorageFactory.instance = await createNodeStorage(config);
      return StorageFactory.instance;
    }

    throw new Error('Unsupported environment');
  }
}
