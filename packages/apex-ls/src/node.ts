/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export Node.js-specific implementations
// Export Node.js-specific implementations
export { NodeMessageBridge } from './communication/NodeBridge';
export { NodeConnectionFactory } from './server/NodeConnectionFactory';
export { NodeStorageFactory } from './storage/NodeStorageFactory';

// Re-export shared types from index
export type {
  IMessageBridgeFactory,
  BaseConfig,
} from './communication/Interfaces';
export type {
  IConnectionFactory,
  ConnectionConfig,
} from './server/ConnectionFactory';
export type {
  IStorage,
  IStorageFactory,
  StorageConfig,
} from '@salesforce/apex-lsp-shared';

// Export storage types
export type { ApexStorageInterface } from '@salesforce/apex-lsp-compliant-services';
