/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { normalizeApexPath } from '../utils/PathUtils';
import {
  getProtocolType,
  createApexLibUri,
  createFileUri,
  isStandardApexUri,
  isUserCodeUri,
  getFilePathFromUri,
} from './ProtocolHandler';

/**
 * Convert a file path to a proper URI
 *
 * @param fileUri The file URI to convert
 * @returns Proper URI string
 */
const convertToUri = (fileUri: string): string => {
  // If the fileUri is already a URI (has protocol), return it as-is
  const protocol = getProtocolType(fileUri);
  if (protocol !== null) {
    return fileUri; // Valid URI, return as-is
  }

  // Normalize the path to ensure consistent standard Apex path detection
  const normalizedPath = normalizeApexPath(fileUri);

  // Check if this is a standard Apex class using the resource loader singleton
  if (normalizedPath.includes('/') && normalizedPath.endsWith('.cls')) {
    const namespace = normalizedPath.split('/')[0];
    try {
      // Use dynamic require to avoid circular dependency
      const { ResourceLoader } = require('../utils/resourceLoader');
      const resourceLoader = ResourceLoader.getInstance();
      if (resourceLoader.isStdApexNamespace(namespace)) {
        return createApexLibUri(normalizedPath);
      }
    } catch (_error) {
      // If ResourceLoader is not available, fall back to file:// URI
      // This can happen during testing or if ResourceLoader is not initialized
    }
  }

  return createFileUri(fileUri);
};

/**
 * Parse the symbol part of an ID (everything after the URI)
 * @param symbolPart The symbol part to parse
 * @returns Parsed symbol components
 */
const parseSymbolPart = (
  symbolPart: string,
): {
  uri: string;
  scopePath?: string[];
  name: string;
  lineNumber?: number;
} => {
  // Split the symbol part by colons to get scope, name, and line number
  const symbolParts = symbolPart.split(':');

  // The last part might be a line number if it's just a number
  let lineNumber: number | undefined;
  let cleanName: string;
  let scopeParts: string[];

  if (symbolParts.length === 1) {
    // Only one part: just the name
    cleanName = symbolParts[0];
    scopeParts = [];
  } else if (symbolParts.length === 2) {
    // Two parts: could be name:line or scope:name
    const lastPart = symbolParts[1];
    if (/^\d+$/.test(lastPart)) {
      // Last part is a line number: scope:name:line
      cleanName = symbolParts[0];
      lineNumber = parseInt(lastPart, 10);
      scopeParts = [];
    } else {
      // Last part is the name: scope:name
      cleanName = symbolParts[1];
      scopeParts = [symbolParts[0]];
    }
  } else {
    // Three or more parts: scope:name:line
    const lastPart = symbolParts[symbolParts.length - 1];
    if (/^\d+$/.test(lastPart)) {
      // Last part is a line number
      cleanName = symbolParts[symbolParts.length - 2];
      lineNumber = parseInt(lastPart, 10);
      scopeParts = symbolParts.slice(0, -2);
    } else {
      // Last part is the name
      cleanName = symbolParts[symbolParts.length - 1];
      scopeParts = symbolParts.slice(0, -1);
    }
  }

  // Process scope parts to handle dots
  let scopePath: string[] | undefined;
  if (scopeParts.length > 0) {
    scopePath = [];
    for (const part of scopeParts) {
      if (part.includes('.')) {
        scopePath.push(...part.split('.'));
      } else {
        scopePath.push(part);
      }
    }
  }

  return {
    uri: '', // This will be set by the caller
    scopePath,
    name: cleanName,
    lineNumber,
  };
};

/**
 * Generate a unique symbol ID using URI-based format
 * @param name The symbol name
 * @param fileUri The file URI
 * @param scopePath Optional scope path for uniqueness (e.g., ["TestClass", "method1", "block1"])
 * @param lineNumber Optional line number for additional uniqueness
 * @returns URI-based symbol ID
 */
export const generateSymbolId = (
  name: string,
  fileUri: string,
  scopePath?: string[],
  lineNumber?: number,
): string => {
  const uri = convertToUri(fileUri);

  if (scopePath && scopePath.length > 0) {
    const scopeStr = scopePath.join('.');
    const baseId = `${uri}:${scopeStr}:${name}`;
    return lineNumber !== undefined ? `${baseId}:${lineNumber}` : baseId;
  }

  const baseId = `${uri}:${name}`;
  return lineNumber !== undefined ? `${baseId}:${lineNumber}` : baseId;
};

/**
 * Parse a URI-based ID back into its components
 * @param id The URI-based ID to parse
 * @returns Parsed ID components
 */
export const parseSymbolId = (
  id: string,
): {
  uri: string;
  scopePath?: string[];
  name: string;
  lineNumber?: number;
} => {
  // Handle complex URI formats like file://vscode-test-web://mount/path
  // We need to find where the URI ends and the symbol part begins
  // The URI part will contain the file path and the symbol part starts after the filename

  // Strategy: Find the last occurrence of a known file extension followed by a colon
  // This separates the URI from the symbol part
  const fileExtensions = ['.cls', '.trigger', '.apex'];
  let uriEndIndex = -1;

  for (const ext of fileExtensions) {
    const extIndex = id.lastIndexOf(ext + ':');
    if (extIndex !== -1) {
      uriEndIndex = extIndex + ext.length;
      break;
    }
  }

  // Fallback: if no file extension found, look for the pattern that separates URI from symbol
  // Look for the pattern where we have a complete URI followed by a symbol identifier
  if (uriEndIndex === -1) {
    // Look for patterns like "://...:" to find where URI ends
    const protocolPattern = /^[^:]+:\/\/[^:]+:/;
    const match = id.match(protocolPattern);
    if (match) {
      uriEndIndex = match[0].length - 1; // Exclude the final colon
    } else {
      throw new Error(`Invalid ID format - could not parse URI from: ${id}`);
    }
  }

  if (uriEndIndex === -1 || uriEndIndex >= id.length - 1) {
    throw new Error(`Invalid ID format - no symbol part found: ${id}`);
  }

  const uri = id.substring(0, uriEndIndex);
  const symbolPart = id.substring(uriEndIndex + 1); // Skip the colon

  const parsed = parseSymbolPart(symbolPart);
  parsed.uri = uri;
  return parsed;
};

/**
 * Check if an ID is a standard Apex class ID
 * @param id The ID to check
 * @returns True if this is a standard Apex class ID
 */
export const isStandardApexId = (id: string): boolean => {
  const parsed = parseSymbolId(id);
  return isStandardApexUri(parsed.uri);
};

/**
 * Check if an ID is a user code ID
 * @param id The ID to check
 * @returns True if this is a user code ID
 */
export const isUserCodeId = (id: string): boolean => {
  const parsed = parseSymbolId(id);
  return isUserCodeUri(parsed.uri);
};

/**
 * Get the file path from a URI-based ID
 * @param id The URI-based ID
 * @returns The file URI
 */
export const getFilePathFromId = (id: string): string => {
  const parsed = parseSymbolId(id);
  return getFilePathFromUri(parsed.uri);
};
