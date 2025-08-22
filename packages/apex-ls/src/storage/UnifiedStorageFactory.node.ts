/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { IStorage, StorageConfig } from './StorageInterface';
import { isNodeEnvironment } from '../utils/EnvironmentDetector.node';

/**
 * Factory for creating unified storage instances based on environment
 */
export class UnifiedStorageFactory {
  /**
   * Creates a storage instance appropriate for the current environment
   */
  static async createStorage(config: StorageConfig = {}): Promise<IStorage> {
    if (isNodeEnvironment()) {
      const { NodeStorageFactory } = await import('./NodeStorageFactory');
      return NodeStorageFactory.createStorage(config);
    }

    throw new Error('Unsupported environment');
  }
}
