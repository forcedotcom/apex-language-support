/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { normalizeApexPath } from '../utils/PathUtils';
import {
  hasUriScheme,
  createApexLibUri,
  createFileUri,
  isStandardApexUri,
  getFilePathFromUri,
} from './ProtocolHandler';

/**
 * Convert a file path to a proper URI
 * @param fileUri The file URI to convert
 * @returns Proper URI string
 */
const convertToUri = (fileUri: string): string => {
  if (hasUriScheme(fileUri)) {
    return fileUri;
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
  // Split the symbol part by colons to get scope, prefix, name, and line number
  // New format: scope:prefix:name or prefix:name (with optional :lineNumber)
  // Old format (backward compatibility): scope:name or name (with optional :lineNumber)
  const symbolParts = symbolPart.split(':');

  // The last part might be a line number if it's just a number
  let lineNumber: number | undefined;
  let cleanName: string;
  let scopeParts: string[];

  // Check if last part is a line number
  const lastPart = symbolParts[symbolParts.length - 1];
  const hasLineNumber = /^\d+$/.test(lastPart);
  const partsWithoutLine = hasLineNumber
    ? symbolParts.slice(0, -1)
    : symbolParts;

  if (hasLineNumber) {
    lineNumber = parseInt(lastPart, 10);
  }

  if (partsWithoutLine.length === 1) {
    // Only one part: just the name (old format, no prefix)
    cleanName = partsWithoutLine[0];
    scopeParts = [];
  } else if (partsWithoutLine.length === 2) {
    // Two parts: could be prefix:name (new format) or scope:name (old format)
    // Try to detect: if first part looks like a prefix (single word, no dots), it's prefix:name
    // Otherwise, it's scope:name (old format)
    const firstPart = partsWithoutLine[0];
    if (!firstPart.includes('.')) {
      // Likely prefix:name format (new format)
      cleanName = partsWithoutLine[1];
      scopeParts = [];
    } else {
      // Likely scope:name format (old format, backward compatibility)
      cleanName = partsWithoutLine[1];
      scopeParts = [partsWithoutLine[0]];
    }
  } else {
    // Three or more parts: scope:prefix:name (new format) or scope:scope:name (old format)
    // The last part is always the name
    // The second-to-last part might be a prefix (if it's a single word) or part of scope
    cleanName = partsWithoutLine[partsWithoutLine.length - 1];
    const secondToLast = partsWithoutLine[partsWithoutLine.length - 2];

    // If second-to-last doesn't contain dots, it's likely a prefix (new format)
    // Otherwise, it's part of the scope path (old format)
    if (!secondToLast.includes('.')) {
      // New format: scope:prefix:name - exclude the prefix from scope
      scopeParts = partsWithoutLine.slice(0, -2);
    } else {
      // Old format: scope:scope:name - include everything except name
      scopeParts = partsWithoutLine.slice(0, -1);
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
 * @param prefix Optional symbol prefix/kind for uniqueness (e.g., "class", "block", "method")
 * @returns URI-based symbol ID
 */
export const generateSymbolId = (
  name: string,
  fileUri: string,
  scopePath?: string[],
  lineNumber?: number,
  prefix?: string,
): string => {
  const uri = convertToUri(fileUri);

  // Include prefix in ID to ensure uniqueness between semantic symbols and their block scopes
  const prefixPart = prefix ? `${prefix}:` : '';

  if (scopePath && scopePath.length > 0) {
    // Use colons to join scopePath for consistency across all symbol IDs
    // Format: fileUri:scopePath:prefix:name where scopePath uses colons
    const scopeStr = scopePath.join(':');
    const baseId = `${uri}:${scopeStr}:${prefixPart}${name}`;
    return lineNumber !== undefined ? `${baseId}:${lineNumber}` : baseId;
  }

  const baseId = `${uri}:${prefixPart}${name}`;
  return lineNumber !== undefined ? `${baseId}:${lineNumber}` : baseId;
};

/**
 * Extract just the file path from a URI that may contain symbol name and line number.
 * Scheme-agnostic: treats file://, memfs:, vscode-test-web://, built-in://, apexlib://,
 * and plain paths the same. Only {@link getFilePathFromUri} in ProtocolHandler
 * rewrites apexlib:// (stdlib resource path).
 *
 * Order: extension heuristic (works for memfs:/…/Foo.cls:Symbol and file:///…/Foo.cls:Symbol),
 * then hierarchical :// URIs (path colon or authority colon, e.g. built-in://apex:Name).
 */
export const extractFilePathFromUri = (uri: string): string => {
  const extMatch = uri.match(/\.(cls|trigger|apex)/);
  if (extMatch) {
    const extEnd = extMatch.index! + extMatch[0].length;
    const symbolSep = uri.indexOf(':', extEnd);
    if (symbolSep !== -1) {
      return uri.substring(0, symbolSep);
    }
  }

  const protocolEnd = uri.indexOf('://');
  if (protocolEnd !== -1) {
    const afterScheme = protocolEnd + 3;
    const pathStart = uri.indexOf('/', afterScheme);
    if (pathStart !== -1) {
      const symbolSep = uri.indexOf(':', pathStart);
      if (symbolSep !== -1) {
        return uri.substring(0, symbolSep);
      }
    } else {
      const symbolSep = uri.indexOf(':', afterScheme);
      if (symbolSep !== -1) {
        return uri.substring(0, symbolSep);
      }
    }
  }

  return uri;
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
  // Use extractFilePathFromUri to find the URI portion — this handles all
  // protocols consistently (file://, apexlib://, built-in://, memfs:/, etc.)
  const uri = extractFilePathFromUri(id);
  if (uri === id) {
    throw new Error(`Invalid ID format - no symbol part found: ${id}`);
  }

  const symbolPart = id.substring(uri.length + 1); // Skip the colon separator

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
 * Get the file path from a URI-based ID
 * @param id The URI-based ID
 * @returns The file URI
 */
export const getFilePathFromId = (id: string): string => {
  const parsed = parseSymbolId(id);
  return getFilePathFromUri(parsed.uri);
};
