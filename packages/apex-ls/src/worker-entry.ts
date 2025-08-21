/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export worker-specific implementations
export { WorkerMessageBridgeFactory } from './communication/WorkerMessageBridgeFactory';
export { WorkerConnectionFactory } from './server/WorkerConnectionFactory';
export { WorkerStorageFactory } from './storage/WorkerStorageFactory';

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
