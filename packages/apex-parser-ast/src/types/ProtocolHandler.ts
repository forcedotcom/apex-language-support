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
export type UriProtocol = 'file' | 'apexlib' | 'builtin' | 'other';

const PROTOCOL_PREFIXES = {
  file: 'file://',
  apexlib: 'apexlib://',
  builtin: 'builtin://',
} as const;

export const APEXLIB_RESOURCE_PREFIX =
  'apexlib://resources/StandardApexLibrary/';

export const BUILTIN_RESOURCE_PREFIX = 'apexlib://resources/builtins/';

/**
 * Determine the protocol type from a URI string
 * Recognizes known protocols (file://, apexlib://, builtin://) and also
 * detects any URI with a protocol scheme (e.g., vscode-test-web://, vscode-vfs://)
 * to preserve VS Code web environment URIs.
 *
 * @param uri The URI to analyze
 * @returns The protocol type or null if it's a plain path without protocol
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
  // Check if this URI has any protocol scheme (e.g., vscode-test-web://, vscode-vfs://, etc.)
  // This preserves VS Code web URIs and other non-standard schemes
  if (uri.includes('://')) {
    return 'other';
  }
  return null;
};

/**
 * Check if a URI uses a specific protocol
 * @param uri The URI to check
 * @param protocol The protocol to check for
 * @returns True if the URI uses the specified protocol
 */
export const hasProtocol = (uri: string, protocol: UriProtocol): boolean => {
  if (protocol === 'other') {
    // For 'other', check if it has any protocol but not our known ones
    return (
      uri.includes('://') &&
      !uri.startsWith(PROTOCOL_PREFIXES.file) &&
      !uri.startsWith(PROTOCOL_PREFIXES.apexlib) &&
      !uri.startsWith(PROTOCOL_PREFIXES.builtin)
    );
  }
  return uri.startsWith(PROTOCOL_PREFIXES[protocol]);
};

/**
 * Create a file URI from a file path
 * Only prepends file:// if the path doesn't already have a protocol.
 * Preserves URIs with existing protocols (e.g., vscode-test-web://)
 *
 * @param fileUri The file path or URI
 * @returns The file URI
 */
export const createFileUri = (fileUri: string): string => {
  // If it already has a protocol, return as-is to preserve VS Code web URIs
  if (getProtocolType(fileUri) !== null) {
    return fileUri;
  }
  return `${PROTOCOL_PREFIXES.file}${fileUri}`;
};

/**
 * Create an apexlib URI
 * @param resourcePath The resource path within the standard library
 * @param isBuiltin Whether this is a built-in type (default: false)
 * @returns The apexlib URI
 */
export const createApexLibUri = (
  resourcePath: string,
  isBuiltin: boolean = false,
): string => {
  if (isBuiltin) {
    return `${BUILTIN_RESOURCE_PREFIX}${resourcePath}`;
  }
  return `${APEXLIB_RESOURCE_PREFIX}${resourcePath}`;
};
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
  // Try StandardApexLibrary first
  const standardMatch = uri.match(
    /apexlib:\/\/resources\/StandardApexLibrary\/(.+)/,
  );
  if (standardMatch) {
    return standardMatch[1];
  }
  // Try builtins
  const builtinMatch = uri.match(/apexlib:\/\/resources\/builtins\/(.+)/);
  if (builtinMatch) {
    return builtinMatch[1];
  }
  return '';
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
 * @param fileUri The file path to convert
 * @param isStandardApexNamespace Function to check if a namespace is standard Apex
 * @returns The appropriate URI
 */
export const convertToAppropriateUri = (
  fileUri: string,
  isStandardApexNamespace: (namespace: string) => boolean,
): string => {
  // Check if this is a standard Apex class
  if (fileUri.includes('/') && fileUri.endsWith('.cls')) {
    const namespace = fileUri.split('/')[0];
    if (isStandardApexNamespace(namespace)) {
      return createApexLibUri(fileUri);
    }
  }

  return createFileUri(fileUri);
};

/**
 * Get the file path from any supported URI type
 * For VS Code web URIs and other non-standard protocols, returns the URI as-is
 * since they should be treated as opaque identifiers.
 *
 * @param uri The URI to extract path from
 * @returns The file path or the URI itself for non-standard protocols
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
    case 'other':
      // For VS Code web URIs and other non-standard protocols, return as-is
      // These are opaque identifiers that should be preserved
      return uri;
    default:
      // Plain path without protocol - return as-is
      return uri;
  }
};
