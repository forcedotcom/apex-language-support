/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import path from 'path';

import { RESOURCE_PATHS } from './ResourceUtils.js';

/**
 * Utility functions for platform-specific path operations
 *
 * These functions provide platform-specific paths that consumers
 * can use based on their runtime environment.
 * The actual reading of resources should be done by the consumers.
 */

/**
 * Get the path to the Salesforce version file in a Node.js environment
 * @returns The path to the Salesforce version file
 */
export function getSalesforceVersionPathNode(): string {
  // Get the current directory where the code is running
  const currentDir = path.resolve();

  // Construct the path to the version file
  return path.join(
    currentDir,
    RESOURCE_PATHS.STANDARD_APEX_LIBRARY_PATH.replace(/^\//, ''),
    '.version.json',
  );
}

/**
 * Get the URL to the Salesforce version file in a browser environment
 * @param basePath Optional base path for resources in browser environments
 * @returns The URL to the Salesforce version file
 */
export function getSalesforceVersionPathBrowser(basePath?: string): string {
  // In browser environments, we need to provide the correct URL
  return basePath
    ? `${basePath}${RESOURCE_PATHS.VERSION_FILE_PATH}`
    : `${RESOURCE_PATHS.STANDARD_APEX_LIBRARY_PATH}/.version.json`;
}
