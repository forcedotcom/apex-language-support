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
export class UnifiedStorageFactory {
  private static instance: IStorage;

  /**
   * Creates a storage implementation appropriate for the current environment
   */
  static async createStorage(config?: StorageConfig): Promise<IStorage> {
    if (UnifiedStorageFactory.instance) {
      return UnifiedStorageFactory.instance;
    }

    if (isWorkerEnvironment()) {
      const { createWorkerStorage } = await import('./WorkerStorageFactory');
      UnifiedStorageFactory.instance = await createWorkerStorage(config);
      return UnifiedStorageFactory.instance;
    }

    if (isBrowserEnvironment()) {
      const { createBrowserStorage } = await import('./BrowserStorageFactory');
      UnifiedStorageFactory.instance = await createBrowserStorage(config);
      return UnifiedStorageFactory.instance;
    }

    if (isNodeEnvironment()) {
      // For Node.js, use dedicated node storage
      const { createNodeStorage } = await import('./NodeStorageFactory');
      UnifiedStorageFactory.instance = await createNodeStorage(config);
      return UnifiedStorageFactory.instance;
    }

    throw new Error('Unsupported environment');
  }
}
