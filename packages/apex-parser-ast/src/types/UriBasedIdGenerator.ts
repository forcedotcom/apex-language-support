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
 * Extract just the file path from a URI that may contain symbol name and line number
 * Uses the same logic as parseSymbolId() to handle all protocols consistently
 * @param uri The URI that may contain symbol information
 * @returns The base file URI without symbol parts
 */
export const extractFilePathFromUri = (uri: string): string => {
  // If it's a built-in URI, return as-is (only special case)
  if (uri.startsWith('built-in://')) {
    return uri;
  }

  // Use the same logic as parseSymbolId() to extract URI portion
  // Find the first colon (protocol separator)
  const uriEnd = uri.indexOf(':');
  if (uriEnd === -1) {
    // No protocol separator, return as-is
    return uri;
  }

  // Find the second colon (URI/symbol separator)
  const secondColon = uri.indexOf(':', uriEnd + 1);
  if (secondColon === -1) {
    // No symbol part, return the full URI
    return uri;
  }

  // Extract everything up to the second colon as the URI
  // This works for all protocols: file://, apexlib://, etc.
  return uri.substring(0, secondColon);
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
  // Find the first colon that separates the URI from the symbol part
  // This works for all supported protocols (file://, apexlib://, builtin://)
  const uriEnd = id.indexOf(':');
  if (uriEnd === -1) {
    throw new Error(`Invalid ID format - no URI separator found: ${id}`);
  }

  // Find the second colon to determine where the URI ends
  const secondColon = id.indexOf(':', uriEnd + 1);
  if (secondColon === -1) {
    throw new Error(`Invalid ID format - no symbol part found: ${id}`);
  }

  const uri = id.substring(0, secondColon);
  const symbolPart = id.substring(secondColon + 1); // Skip the colon

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
