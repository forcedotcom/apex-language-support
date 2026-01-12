/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as fs from 'fs';
import * as path from 'path';
import { ResourceLoader } from '../../src/utils/resourceLoader';

/**
 * Helper function to load the StandardApexLibrary.zip for testing.
 * This simulates the client providing the ZIP buffer to the language server.
 *
 * @returns Uint8Array containing the StandardApexLibrary.zip contents
 */
export function loadStandardLibraryZip(): Uint8Array {
  const zipPath = path.join(
    __dirname,
    '../../resources/StandardApexLibrary.zip',
  );
  const zipBuffer = fs.readFileSync(zipPath);
  return new Uint8Array(zipBuffer);
}

/**
 * Initialize ResourceLoader with the StandardApexLibrary.zip for testing.
 * This should be called in beforeAll() or beforeEach() hooks.
 *
 * @param options Optional ResourceLoader options
 * @returns Initialized ResourceLoader instance
 */
export async function initializeResourceLoaderForTests(options?: {
  loadMode?: 'lazy' | 'full';
  preloadStdClasses?: boolean;
}): Promise<ResourceLoader> {
  const standardLibZip = loadStandardLibraryZip();
  const resourceLoader = ResourceLoader.getInstance({
    loadMode: options?.loadMode || 'lazy',
    preloadStdClasses: options?.preloadStdClasses,
    zipBuffer: standardLibZip,
  });
  await resourceLoader.initialize();
  return resourceLoader;
}

/**
 * Reset the ResourceLoader singleton.
 * This should be called in afterEach() or afterAll() hooks.
 */
export function resetResourceLoader(): void {
  ResourceLoader.resetInstance();
}
