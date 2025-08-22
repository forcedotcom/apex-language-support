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
} from './communication/interfaces';

export type { ApexStorage } from './storage/ApexStorageInterface';
export type { ApexStorageInterface } from './storage/ApexStorageManager';
export { ApexStorageAdapter } from './storage/ApexStorageManager';

export type {
  UnifiedClientInterface,
  UnifiedClientConfig,
} from './communication/UnifiedClient.node';

// Export shared utilities
// Export environment-specific utilities and factories
export {
  isNodeEnvironment,
} from './utils/EnvironmentDetector.node';

// Export shared factories
export { UnifiedStorageFactory } from './storage/UnifiedStorageFactory.node';
export { UnifiedClient as UniversalExtensionClient } from './communication/UnifiedClient.node';
export { UnifiedClientFactory as UniversalClientFactory } from './communication/UnifiedClient.node';
