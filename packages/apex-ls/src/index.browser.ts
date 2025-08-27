/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export package-specific types
export type { ClientConfig } from './communication/Interfaces';

// Export browser implementations
export { Client, ClientFactory } from './communication/BrowserClient';

// For types, import directly from source packages:
// - @salesforce/apex-lsp-shared for: IStorage, IStorageFactory, StorageConfig, IConnectionFactory, ConnectionConfig, ClientInterface
// - @salesforce/apex-lsp-compliant-services for: ApexStorageInterface, ApexReference

// Export shared utilities
export {
  isWorkerEnvironment,
  isBrowserEnvironment,
  isNodeEnvironment,
} from '@salesforce/apex-lsp-shared';

// Export shared factories
export { StorageFactory } from './storage/StorageFactory';
