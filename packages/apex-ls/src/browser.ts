/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Export browser-specific implementations
export { BrowserStorageFactory } from './storage/StorageImplementations';

// For types, import directly from source packages:
// - @salesforce/apex-lsp-shared for: IStorage, IStorageFactory, StorageConfig, ClientInterface
// - @salesforce/apex-lsp-compliant-services for: ApexStorageInterface
