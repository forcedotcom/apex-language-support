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
