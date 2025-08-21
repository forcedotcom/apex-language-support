/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export browser-specific implementations
export { BrowserMessageBridgeFactory } from './communication/BrowserMessageBridgeFactory';
export { BrowserConnectionFactory } from './server/BrowserConnectionFactory';
export { BrowserStorageFactory } from './storage/BrowserStorageFactory';

// Export shared interfaces and types
export type {
  IMessageBridgeFactory,
  MessageBridgeConfig,
} from './communication/MessageBridgeInterface';
export type {
  IConnectionFactory,
  ConnectionConfig,
} from './server/ConnectionFactoryInterface';
export type {
  IStorage,
  IStorageFactory,
  StorageConfig,
} from './storage/StorageInterface';

// Export storage types
export type { ApexStorage } from './storage/ApexStorageInterface';
export type { ApexStorageInterface } from './storage/ApexStorageManager';
export { ApexStorageAdapter } from './storage/ApexStorageManager';
