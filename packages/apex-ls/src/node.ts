/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export Node.js-specific implementations
export { NodeMessageBridge } from './communication/NodeBridge';
export { NodeConnectionFactory } from './server/NodeConnectionFactory';

// Export package-specific types
export type { IMessageBridgeFactory } from './communication/Interfaces';

// For types, import directly from source packages:
// - @salesforce/apex-lsp-shared for: BaseConfig, IConnectionFactory,
// ConnectionConfig, IStorage, IStorageFactory, StorageConfig
// - @salesforce/apex-lsp-compliant-services for: ApexStorageInterface
