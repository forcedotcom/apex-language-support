/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export shared interfaces and types from the shared package
export type {
  IStorage,
  IStorageFactory,
  StorageConfig,
  EnvironmentType,
  LogLevel,
  ExtensionMode,
  Logger,
} from '@salesforce/apex-lsp-shared';

export type {
  IConnectionFactory,
  ConnectionConfig,
} from './server/ConnectionFactory';

export type { IMessageBridgeFactory } from './communication/Interfaces';

// Re-export shared types and interfaces
export type { BaseConfig, ClientInterface } from '@salesforce/apex-lsp-shared';

// Re-export Apex storage types from the compliant services package
export type {
  ApexStorageInterface,
  ApexReference,
} from '@salesforce/apex-lsp-compliant-services';
export type { NodeClientConfig } from './communication/NodeClient';

// Export shared utilities
// Export environment-specific utilities and factories
export { isNodeEnvironment } from './utils/Environment';

// Export shared factories
export { StorageFactory } from './storage/StorageFactory';
export { Client as UniversalExtensionClient } from './communication/NodeClient';
export { ClientFactory as UniversalClientFactory } from './communication/NodeClient';
