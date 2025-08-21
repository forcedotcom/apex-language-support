/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export environment detection utilities
export {
  isWorkerEnvironment,
  isBrowserEnvironment,
  isNodeEnvironment,
} from './utils/EnvironmentDetector';

// Export storage interfaces and factories
export type {
  IStorage,
  IStorageFactory,
  StorageConfig,
} from './storage/StorageInterface';
export { UnifiedStorageFactory } from './storage/UnifiedStorageFactory';
export { BrowserStorageFactory } from './storage/BrowserStorageFactory';

// Export connection interfaces and factories
export type {
  IConnectionFactory,
  ConnectionConfig,
} from './server/ConnectionFactoryInterface';
export { ConnectionFactory } from './server/ConnectionFactory.browser';
export { BrowserConnectionFactory } from './server/BrowserConnectionFactory';

// Export message bridge interfaces and factories
export type {
  IMessageBridgeFactory,
  MessageBridgeConfig,
} from './communication/MessageBridgeInterface';
export { createPlatformMessageBridge } from './communication/MessageBridgeFactory.browser';
export { BrowserMessageBridgeFactory } from './communication/BrowserMessageBridgeFactory';

// Export storage types
export type { ApexStorage } from './storage/ApexStorageInterface';
export type { ApexStorageInterface } from './storage/ApexStorageManager';
export { ApexStorageAdapter } from './storage/ApexStorageManager';

// Export client types and factories
export type {
  UnifiedClientInterface,
  UnifiedClientConfig,
  WebWorkerClientConfig,
} from './communication/UnifiedClient';
export { UnifiedClient as UniversalExtensionClient } from './communication/UnifiedClient';
export { UnifiedClientFactory as UniversalClientFactory } from './communication/UnifiedClient';
