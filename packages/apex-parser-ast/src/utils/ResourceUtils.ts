/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * URIs to standard resource locations
 *
 * These URIs use a consistent format regardless of platform.
 * They all use the 'apex-resources:' scheme to indicate they're
 * resources within the Apex library.
 */
export const RESOURCE_URIS = {
  /**
   * Base URI to resources in the package
   */
  BASE_RESOURCES_URI: 'apex-resources:/resources',

  /**
   * URI to StandardApexLibrary in the package
   */
  STANDARD_APEX_LIBRARY_URI: 'apex-resources:/resources/StandardApexLibrary',

  /**
   * URI to the version file in the package
   */
  VERSION_FILE_URI:
    'apex-resources:/resources/StandardApexLibrary/.version.json',
};

/**
 * Legacy paths format - maintained for backward compatibility
 * @deprecated Use RESOURCE_URIS instead
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
 * Convert an apex-resources URI to a file path for Node.js environments
 * @param uri The URI to convert
 * @param basePath Optional base directory path to prepend
 * @returns A file path suitable for Node.js environments
 */
export function uriToNodePath(uri: string, basePath?: string): string {
  if (!uri.startsWith('apex-resources:/')) {
    throw new Error(`Invalid apex-resources URI: ${uri}`);
  }

  // Remove the scheme and get the path portion
  const resourcePath = uri.replace('apex-resources:/', '');

  // Make sure the resource path starts with a slash if it's not empty
  const formattedPath =
    resourcePath && !resourcePath.startsWith('/')
      ? `/${resourcePath}`
      : resourcePath;

  // Return the path with or without the basePath
  if (basePath) {
    // Remove trailing slash from basePath if present
    const cleanBasePath = basePath.endsWith('/')
      ? basePath.slice(0, -1)
      : basePath;

    return `${cleanBasePath}${formattedPath}`;
  }

  return formattedPath;
}

/**
 * Convert an apex-resources URI to a URL for browser environments
 * @param uri The URI to convert
 * @param baseUrl Optional base URL to prepend
 * @returns A URL suitable for browser environments
 */
export function uriToBrowserUrl(uri: string, baseUrl?: string): string {
  if (!uri.startsWith('apex-resources:/')) {
    throw new Error(`Invalid apex-resources URI: ${uri}`);
  }

  // Remove the scheme and get the path portion
  const resourcePath = uri.replace('apex-resources:/', '');

  // Make sure the resource path starts with a slash if it's not empty
  const formattedPath =
    resourcePath && !resourcePath.startsWith('/')
      ? `/${resourcePath}`
      : resourcePath;

  // Return the URL with or without the baseUrl
  if (baseUrl) {
    // Remove trailing slash from baseUrl if present
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    return `${cleanBaseUrl}${formattedPath}`;
  }

  return formattedPath;
}

/**
 * Join a base URI with a relative path
 * @param baseUri The base URI
 * @param relativePath The relative path to join
 * @returns A new URI with the paths joined
 */
export function joinUri(baseUri: string, relativePath: string): string {
  if (!baseUri.startsWith('apex-resources:/')) {
    throw new Error(`Invalid apex-resources URI: ${baseUri}`);
  }

  // Ensure the relative path doesn't start with a slash
  const cleanPath = relativePath.startsWith('/')
    ? relativePath.substring(1)
    : relativePath;

  // Join with a slash if the baseUri doesn't end with one
  return baseUri.endsWith('/')
    ? `${baseUri}${cleanPath}`
    : `${baseUri}/${cleanPath}`;
}

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
 *     this.logger.debug(`Salesforce version: ${versionJson.version}`);
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
 *     this.logger.debug(`Salesforce version: ${versionJson.version}`);
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
 * @deprecated Use joinUri(RESOURCE_URIS.STANDARD_APEX_LIBRARY_URI, relativePath) instead
 */
export function getStandardApexLibraryFilePath(relativePath: string): string {
  return `${RESOURCE_PATHS.STANDARD_APEX_LIBRARY_PATH}/${relativePath}`;
}
