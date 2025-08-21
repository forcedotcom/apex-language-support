/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { IStorage, StorageConfig } from './StorageInterface';
import { createWorkerStorage } from './WorkerStorageFactory';

/**
 * Node.js-specific storage factory
 * Uses memory storage (same as worker environment)
 */
export async function createNodeStorage(config?: StorageConfig): Promise<IStorage> {
  return createWorkerStorage(config);
}