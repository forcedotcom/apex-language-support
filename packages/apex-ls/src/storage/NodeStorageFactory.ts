/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Re-export the unified NodeStorageFactory
export { NodeStorageFactory } from './StorageImplementations';

// Legacy compatibility function
export async function createNodeStorage(config?: any): Promise<any> {
  const { NodeStorageFactory } = await import('./StorageImplementations');
  const factory = new NodeStorageFactory();
  return factory.createStorage(config);
}
