/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export browser storage implementation (still needed)
export { BrowserStorageFactory } from './storage/StorageImplementations';

// Re-export shared types that are still needed
export type {
  IStorage,
  IStorageFactory,
  StorageConfig,
  ApexStorageInterface,
} from './index.browser';

// Export client types that are still needed
export type { ClientInterface } from './communication/Interfaces';
export { ApexStorageAdapter } from './index.browser';
