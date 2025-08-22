/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export browser-specific implementations
export { BrowserMessageBridgeFactory } from './communication/MessageBridgeFactory.browser';
export { ConnectionFactory as BrowserConnectionFactory } from './server/ConnectionFactory.browser';
export { BrowserStorageFactory } from './storage/BrowserStorageFactory';

// Export browser client implementations
export { UnifiedClient as UniversalExtensionClient } from './communication/UnifiedClient.browser';
export { UnifiedClientFactory as UniversalClientFactory } from './communication/UnifiedClient.browser';

// Re-export shared types from index
export type {
  IMessageBridgeFactory,
  MessageBridgeConfig,
  IConnectionFactory,
  ConnectionConfig,
  IStorage,
  IStorageFactory,
  StorageConfig,
  ApexStorage,
  ApexStorageInterface,
} from './index.browser';

// Export client types
export type {
  UnifiedClientInterface,
  UnifiedClientConfig,
  WebWorkerClientConfig,
} from './communication/interfaces';
export { ApexStorageAdapter } from './index.browser';
