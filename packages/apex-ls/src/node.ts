/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export Node.js-specific implementations
export { NodeMessageBridgeFactory } from './communication/NodeMessageBridgeFactory';
export { NodeConnectionFactory } from './server/NodeConnectionFactory';

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

// Export environment detection utilities
export {
  isWorkerEnvironment,
  isBrowserEnvironment,
  isNodeEnvironment,
} from './utils/EnvironmentDetector';

// Export unified factories that work in Node.js
export { UnifiedStorageFactory } from './storage/UnifiedStorageFactory';

// Export Node.js-specific message bridge and connection types
export type { NodeConnectionConfig } from './communication/NodeMessageBridge';
export { NodeMessageBridge, createNodeMessageBridge } from './communication/NodeMessageBridge';
export { createNodeConnection } from './server/NodeConnectionFactory';

// Export server components
export { UnifiedApexLanguageServer } from './server/UnifiedApexLanguageServer';
export type { UnifiedServerConfig } from './server/UnifiedApexLanguageServer';