/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { RESOURCE_URIS, uriToBrowserUrl } from './ResourceUtils';

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

/**
 * Get the URI to the Salesforce version file
 * This function returns the URI directly without conversion
 * @returns The URI to the Salesforce version file
 */
export function getSalesforceVersionUri(): string {
  return RESOURCE_URIS.VERSION_FILE_URI;
}
