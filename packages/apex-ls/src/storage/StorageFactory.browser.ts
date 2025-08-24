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
} from '../utils/EnvironmentDetector.browser';

/**
 * Creates storage instances appropriate for the current environment
 */
export class StorageFactory {
  /**
   * Creates a storage instance appropriate for the current environment
   */
  static async createStorage(config: StorageConfig = {}): Promise<IStorage> {
    // Determine environment
    if (isWorkerEnvironment()) {
      throw new Error('Worker implementation not available in browser build');
    }

    if (isBrowserEnvironment()) {
      const { BrowserStorageFactory } = await import('./BrowserStorageFactory');
      return BrowserStorageFactory.createStorage(config);
    }

    throw new Error('Unsupported environment');
  }
}
