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
/**
 * APEX_RESOURCES_SCHEME is the scheme used to identify resources in the Apex library.
 * It is used to prefix all resource URIs.
 */
export const APEX_RESOURCES_SCHEME = 'apex-resources';

/**
 * Base URI to resources in the package
 */
export const BASE_RESOURCES_URI = `${APEX_RESOURCES_SCHEME}:/resources`;

/**
 * URI to StandardApexLibrary in the package
 */
export const STANDARD_APEX_LIBRARY_URI = `${APEX_RESOURCES_SCHEME}:/resources/StandardApexLibrary`;

/**
 * URI to the version file in the package
 */
export const VERSION_FILE_URI = `${APEX_RESOURCES_SCHEME}:/resources/StandardApexLibrary/.version.json`;

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
 * URI handling utilities that work with any protocol
 */
export const UriUtils = {
  /**
   * Checks if a URI uses the apex-resources scheme
   */
  isApexResourceUri(uri: string): boolean {
    return uri.startsWith(`${APEX_RESOURCES_SCHEME}:`);
  },

  /**
   * Checks if a URI is from an external source (non-apex-resources)
   */
  isExternalUri(uri: string): boolean {
    return !this.isApexResourceUri(uri);
  },

  /**
   * Creates a resource URI for the given path
   */
  createResourceUri(path: string): string {
    return `${APEX_RESOURCES_SCHEME}:/resources/${path}`;
  },

  /**
   * Extracts the path from an apex-resources URI
   */
  extractResourcePath(uri: string): string | null {
    if (!this.isApexResourceUri(uri)) return null;
    const match = uri.match(/^apex-resources:\/resources\/(.+)$/);
    return match ? match[1] : null;
  },

  /**
   * Normalizes a URI for consistent handling
   * External URIs are returned as-is, apex-resources URIs are validated
   */
  normalizeUri(uri: string): string {
    if (this.isApexResourceUri(uri)) {
      // Validate and potentially normalize apex-resources URIs
      if (!uri.match(/^apex-resources:\/resources\/.+/)) {
        throw new Error(`Invalid apex-resources URI format: ${uri}`);
      }
    }
    return uri;
  },
};

/**
 * Legacy export for backward compatibility
 * @deprecated Use individual constants or UriUtils instead
 */
export const RESOURCE_URIS = {
  APEX_RESOURCES_SCHEME,
  BASE_RESOURCES_URI,
  STANDARD_APEX_LIBRARY_URI,
  VERSION_FILE_URI,
} as const;
