/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export shared interfaces and types
export type {
  IStorage,
  IStorageFactory,
  StorageConfig,
} from './storage/StorageInterface';

export type {
  IConnectionFactory,
  ConnectionConfig,
} from './server/ConnectionFactoryInterface';

export type {
  IMessageBridgeFactory,
  MessageBridgeConfig,
} from './communication/types';

export type { ApexStorage } from './storage/ApexStorageInterface';
export type { ApexStorageInterface } from './storage/ApexStorageManager';
export { ApexStorageAdapter } from './storage/ApexStorageManager';

export type { ClientInterface, ClientConfig } from './communication/Client';

// Export shared utilities
// Export environment-specific utilities and factories
export { isNodeEnvironment } from './utils/EnvironmentDetector';

// Export shared factories
export { StorageFactory } from './storage/StorageFactory';
export { Client as UniversalExtensionClient } from './communication/Client';
export { ClientFactory as UniversalClientFactory } from './communication/Client';
