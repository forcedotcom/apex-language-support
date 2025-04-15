/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Paths to standard resource locations
 */
export const RESOURCE_PATHS = {
  /**
   * Base path to resources in the package
   */
  BASE_RESOURCES_PATH: '/resources',

  /**
   * Path to StandardApexLibrary in the package
   */
  STANDARD_APEX_LIBRARY_PATH: '/resources/StandardApexLibrary',

  /**
   * Path to the version file in the package
   */
  VERSION_FILE_PATH: '/resources/StandardApexLibrary/.version.json',
};

/**
 * Information about Salesforce version
 */
export interface SalesforceVersionInfo {
  /**
   * The Salesforce version number
   */
  version: number;
}

/**
 * Default Salesforce version to use if version file cannot be loaded
 */
export const DEFAULT_SALESFORCE_VERSION = 254;

/**
 * Get the Salesforce version from the version file
 *
 * This function throws an error by default. The apex-parser-ast package only provides
 * paths to resources - the actual reading of resources should be handled by the
 * consumer based on their environment.
 *
 * Use the platform-specific path utilities from the PlatformUtils module
 * to get the correct path for your environment:
 *
 * For Node.js:
 * ```
 * import { getSalesforceVersionPathNode } from '@salesforce/apex-lsp-parser-ast';
 *
 * async function getVersion() {
 *   try {
 *     const versionPath = getSalesforceVersionPathNode();
 *     // Read the file using your preferred method
 *     const versionData = await fs.readFile(versionPath, 'utf8');
 *     const versionJson = JSON.parse(versionData);
 *     console.log(`Salesforce version: ${versionJson.version}`);
 *   } catch (error) {
 *     console.error('Failed to read version:', error);
 *   }
 * }
 * ```
 *
 * For browsers:
 * ```
 * import { getSalesforceVersionPathBrowser } from '@salesforce/apex-lsp-parser-ast';
 *
 * async function getVersion() {
 *   try {
 *     const versionPath = getSalesforceVersionPathBrowser('/path/to/resources');
 *     // Fetch the file using your preferred method
 *     const response = await fetch(versionPath);
 *     const versionJson = await response.json();
 *     console.log(`Salesforce version: ${versionJson.version}`);
 *   } catch (error) {
 *     console.error('Failed to read version:', error);
 *   }
 * }
 * ```
 *
 * @returns The current Salesforce version number
 * @throws Error if the version file cannot be found or read
 */
export function getSalesforceVersion(): number {
  // This function needs to be implemented by the consumer based on their environment
  // The implementation will differ depending on whether running in Node.js, browser, etc.
  throw new Error(`Salesforce version file not found.

The apex-parser-ast package only provides paths to resources. The actual reading of resources 
should be handled by you, the consumer.

Please use the platform-specific path utilities to get the correct path for your environment:

For Node.js:
  import { getSalesforceVersionPathNode } from '@salesforce/apex-lsp-parser-ast';
  const versionPath = getSalesforceVersionPathNode();
  // Then read the file using your preferred method

For browsers:
  import { getSalesforceVersionPathBrowser } from '@salesforce/apex-lsp-parser-ast';
  const versionPath = getSalesforceVersionPathBrowser('/path/to/resources');
  // Then fetch the file using your preferred method`);
}

/**
 * Get the path to a file in the StandardApexLibrary
 * @param relativePath Path relative to the StandardApexLibrary directory
 * @returns The full path to the resource
 */
export function getStandardApexLibraryFilePath(relativePath: string): string {
  return `${RESOURCE_PATHS.STANDARD_APEX_LIBRARY_PATH}/${relativePath}`;
}
