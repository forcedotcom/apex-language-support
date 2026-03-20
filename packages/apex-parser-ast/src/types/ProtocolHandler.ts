/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

const FILE_URI_PREFIX = 'file://';

export const APEXLIB_RESOURCE_PREFIX =
  'apexlib://resources/StandardApexLibrary/';

/**
 * True if the string already has a URI scheme (not a plain path).
 * Supports double-slash schemes (e.g. file://, vscode-test-web://) and
 * single-slash schemes (e.g. memfs:/, vscode-vfs:/). Plain paths and Windows
 * drive paths are not treated as URIs.
 */
export const hasUriScheme = (uri: string): boolean =>
  uri.includes('://') || /^[a-zA-Z][a-zA-Z0-9+.-]+:\//.test(uri);

/**
 * Create a file URI from a file path
 * Only prepends file:// if the path doesn't already have a protocol.
 * Preserves URIs with existing protocols (e.g., vscode-test-web://)
 *
 * @param fileUri The file path or URI
 * @returns The file URI
 */
export const createFileUri = (fileUri: string): string => {
  if (hasUriScheme(fileUri)) {
    return fileUri;
  }
  return `${FILE_URI_PREFIX}${fileUri}`;
};

/**
 * Create an apexlib URI
 * @param resourcePath The resource path within the standard library
 * @returns The apexlib URI
 */
export const createApexLibUri = (resourcePath: string): string =>
  `${APEXLIB_RESOURCE_PREFIX}${resourcePath}`;

/**
 * Extract the file path from a file URI
 * @param uri The file URI
 * @returns The file path
 */
export const extractFilePath = (uri: string): string => {
  if (!uri.startsWith(FILE_URI_PREFIX)) {
    throw new Error(`Expected file URI, got: ${uri}`);
  }
  return uri.slice(FILE_URI_PREFIX.length);
};

/**
 * Extract the resource path from an apexlib URI
 * @param uri The apexlib URI
 * @returns The resource path
 */
export const extractApexLibPath = (uri: string): string => {
  if (!uri.startsWith('apexlib://')) {
    throw new Error(`Expected apexlib URI, got: ${uri}`);
  }
  const match = uri.match(/apexlib:\/\/resources\/StandardApexLibrary\/(.+)/);
  if (match) {
    return match[1];
  }
  return '';
};

/**
 * Check if a URI represents standard Apex library content
 * @param uri The URI to check
 * @returns True if this is a standard Apex library URI
 */
export const isStandardApexUri = (uri: string): boolean =>
  uri.startsWith('apexlib://');

/**
 * Get the file path from any supported URI type.
 * Only apexlib:// is rewritten to a resource path; all other URIs are returned as-is.
 *
 * @param uri The URI to extract path from
 * @returns The StandardApexLibrary-relative path for apexlib, otherwise the URI unchanged
 */
export const getFilePathFromUri = (uri: string): string => {
  if (uri.startsWith('apexlib://')) {
    return extractApexLibPath(uri);
  }
  return uri;
};
