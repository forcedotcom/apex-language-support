/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { IStorage, StorageConfig } from './StorageInterface';
import { BrowserIndexedDBApexStorage } from './BrowserIndexedDBApexStorage';

/**
 * Factory for creating browser-specific storage instances
 */
export class BrowserStorageFactory {
  /**
   * Creates a browser-specific storage instance
   */
  static async createStorage(config: StorageConfig = {}): Promise<IStorage> {
    return BrowserIndexedDBApexStorage.getInstance();
  }
}

/**
 * Creates browser storage (function export for unified factory compatibility)
 */
export async function createBrowserStorage(config: StorageConfig = {}): Promise<IStorage> {
  return BrowserStorageFactory.createStorage(config);
}
