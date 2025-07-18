/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { RESOURCE_URIS, uriToNodePath, uriToBrowserUrl } from './ResourceUtils';

/**
 * Utility functions for platform-specific path operations
 *
 * These functions provide platform-specific paths that consumers
 * can use based on their runtime environment.
 * The actual reading of resources should be done by the consumers.
 */

/**
 * Get the URL to the Salesforce version file in a browser environment
 * @param basePath Optional base path for resources in browser environments
 * @returns The URL to the Salesforce version file
 */
export function getSalesforceVersionPathBrowser(basePath?: string): string {
  // Convert URI to browser URL
  return uriToBrowserUrl(RESOURCE_URIS.VERSION_FILE_URI, basePath);
}

// Node.js-specific code that will only be used in Node.js environments
// This is separated to avoid including Node.js modules in browser builds
// It will be properly tree-shaken by most bundlers when used in browser contexts
export let getSalesforceVersionPathNode: () => string;

if (
  typeof process !== 'undefined' &&
  process.versions &&
  process.versions.node
) {
  // We're in a Node.js environment
  getSalesforceVersionPathNode = () => {
    // Get the current directory where the code is running
    const currentDir = process.cwd();

    // Convert URI to Node.js path
    return uriToNodePath(RESOURCE_URIS.VERSION_FILE_URI, currentDir);
  };
} else {
  // Not in Node.js - provide a function that throws a helpful error
  getSalesforceVersionPathNode = () => {
    throw new Error(
      'getSalesforceVersionPathNode is only available in Node.js environments',
    );
  };
}
