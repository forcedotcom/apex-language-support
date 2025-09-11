/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Supported URI protocols in the Apex language server
 */
export type UriProtocol = 'file' | 'apexlib' | 'builtin';

const PROTOCOL_PREFIXES = {
  file: 'file://',
  apexlib: 'apexlib://',
  builtin: 'builtin://',
} as const;

export const APEXLIB_RESOURCE_PREFIX =
  'apexlib://resources/StandardApexLibrary/';

/**
 * Determine the protocol type from a URI string
 * @param uri The URI to analyze
 * @returns The protocol type or null if unrecognized
 */
export const getProtocolType = (uri: string): UriProtocol | null => {
  if (uri.startsWith(PROTOCOL_PREFIXES.file)) {
    return 'file';
  }
  if (uri.startsWith(PROTOCOL_PREFIXES.apexlib)) {
    return 'apexlib';
  }
  if (uri.startsWith(PROTOCOL_PREFIXES.builtin)) {
    return 'builtin';
  }
  return null;
};

/**
 * Check if a URI uses a specific protocol
 * @param uri The URI to check
 * @param protocol The protocol to check for
 * @returns True if the URI uses the specified protocol
 */
export const hasProtocol = (uri: string, protocol: UriProtocol): boolean =>
  uri.startsWith(PROTOCOL_PREFIXES[protocol]);

/**
 * Create a file URI
 * @param filePath The file path
 * @returns The file URI
 */
export const createFileUri = (filePath: string): string =>
  `${PROTOCOL_PREFIXES.file}${filePath}`;

/**
 * Create an apexlib URI
 * @param resourcePath The resource path within the standard library
 * @returns The apexlib URI
 */
export const createApexLibUri = (resourcePath: string): string =>
  `${APEXLIB_RESOURCE_PREFIX}${resourcePath}`;
/**
 * Create a builtin URI
 * @param typeName The built-in type name
 * @returns The builtin URI
 */
export const createBuiltinUri = (typeName: string): string =>
  `${PROTOCOL_PREFIXES.builtin}${typeName}`;

/**
 * Extract the file path from a file URI
 * @param uri The file URI
 * @returns The file path
 */
export const extractFilePath = (uri: string): string => {
  if (!hasProtocol(uri, 'file')) {
    throw new Error(`Expected file URI, got: ${uri}`);
  }
  return uri.replace(PROTOCOL_PREFIXES.file, '');
};

/**
 * Extract the resource path from an apexlib URI
 * @param uri The apexlib URI
 * @returns The resource path
 */
export const extractApexLibPath = (uri: string): string => {
  if (!hasProtocol(uri, 'apexlib')) {
    throw new Error(`Expected apexlib URI, got: ${uri}`);
  }
  const match = uri.match(/apexlib:\/\/resources\/StandardApexLibrary\/(.+)/);
  return match ? match[1] : '';
};

/**
 * Extract the type name from a builtin URI
 * @param uri The builtin URI
 * @returns The type name
 */
export const extractBuiltinType = (uri: string): string => {
  if (!hasProtocol(uri, 'builtin')) {
    throw new Error(`Expected builtin URI, got: ${uri}`);
  }
  return uri.replace(PROTOCOL_PREFIXES.builtin, '');
};

/**
 * Check if a URI represents standard Apex library content
 * @param uri The URI to check
 * @returns True if this is a standard Apex library URI
 */
export const isStandardApexUri = (uri: string): boolean =>
  hasProtocol(uri, 'apexlib');

/**
 * Check if a URI represents user code
 * @param uri The URI to check
 * @returns True if this is a user code URI
 */
export const isUserCodeUri = (uri: string): boolean => hasProtocol(uri, 'file');

/**
 * Check if a URI represents a built-in type
 * @param uri The URI to check
 * @returns True if this is a built-in type URI
 */
export const isBuiltinUri = (uri: string): boolean =>
  hasProtocol(uri, 'builtin');

/**
 * Convert a file path to the appropriate URI based on content analysis
 * @param filePath The file path to convert
 * @param isStandardApexNamespace Function to check if a namespace is standard Apex
 * @returns The appropriate URI
 */
export const convertToAppropriateUri = (
  filePath: string,
  isStandardApexNamespace: (namespace: string) => boolean,
): string => {
  // Check if this is a standard Apex class
  if (filePath.includes('/') && filePath.endsWith('.cls')) {
    const namespace = filePath.split('/')[0];
    if (isStandardApexNamespace(namespace)) {
      return createApexLibUri(filePath);
    }
  }

  return createFileUri(filePath);
};

/**
 * Get the file path from any supported URI type
 * @param uri The URI to extract path from
 * @returns The file path
 */
export const getFilePathFromUri = (uri: string): string => {
  const protocol = getProtocolType(uri);

  switch (protocol) {
    case 'file':
      return extractFilePath(uri);
    case 'apexlib':
      return extractApexLibPath(uri);
    case 'builtin':
      return extractBuiltinType(uri);
    default:
      throw new Error(`Unsupported URI protocol: ${uri}`);
  }
};
