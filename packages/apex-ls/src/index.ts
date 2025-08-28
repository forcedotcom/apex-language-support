/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export package-specific types only
export type { IMessageBridgeFactory } from './communication/Interfaces';
export type { NodeClientConfig } from './communication/NodeClient';

// Note: For external types, import directly from their source packages:
// - @salesforce/apex-lsp-shared for: IStorage, IStorageFactory,
// StorageConfig, EnvironmentType, LogLevel, ExtensionMode, Logger,
// BaseConfig, ClientInterface, IConnectionFactory, ConnectionConfig
// - @salesforce/apex-lsp-compliant-services for: ApexStorageInterface, ApexReference

// Export shared utilities
// Export environment-specific utilities and factories
export { isNodeEnvironment } from '@salesforce/apex-lsp-shared';

// Export shared factories
export { StorageFactory } from './storage/StorageFactory';
export { Client as UniversalExtensionClient } from './communication/NodeClient';
export { ClientFactory as UniversalClientFactory } from './communication/NodeClient';
