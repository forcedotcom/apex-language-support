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
 * Parameter info for method signature generation
 */
export interface ParameterInfo {
  type: string;
  name?: string;
}

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
 * Parse the symbol part of an ID (everything after the URI).
 * Handles both new format (# separator, dot-qualified names) and
 * old format (: separator, colon-separated paths).
 *
 * @param symbolPart The symbol part to parse
 * @param separator The separator used (':#' for new, ':' for old)
 * @returns Parsed symbol components
 */
const parseSymbolPart = (
  symbolPart: string,
  separator: string,
): {
  uri: string;
  scopePath?: string[];
  name: string;
  lineNumber?: number;
  signature?: string;
  qualifiedName?: string;
} => {
  if (separator === '#') {
    // NEW FORMAT: qualifiedName#signature$prefix
    // Example: OuterClass.InnerClass.method#(String,Integer)$block
    const parts = symbolPart.split('#');

    if (parts.length === 0) {
      throw new Error(`Invalid symbol part: ${symbolPart}`);
    }

    const qualifiedName = parts[0];
    const signature = parts.length > 1 ? parts[1].split('$')[0] : undefined;

    // Extract simple name and scope path from qualified name
    const nameParts = qualifiedName.split('.');
    const name = nameParts[nameParts.length - 1];
    const scopePath = nameParts.length > 1 ? nameParts.slice(0, -1) : undefined;

    return {
      uri: '', // Set by caller
      scopePath,
      name,
      signature,
      qualifiedName,
    };
  } else {
    // OLD FORMAT (backward compatibility): scope:prefix:name:lineNumber
    // Example: MyClass:method:myMethod:42
    const symbolParts = symbolPart.split(':');

    // The last part might be a line number if it's just a number
    let lineNumber: number | undefined;
    let cleanName: string;
    let scopeParts: string[];

    const lastPart = symbolParts[symbolParts.length - 1];
    const hasLineNumber = /^\d+$/.test(lastPart);
    const partsWithoutLine = hasLineNumber
      ? symbolParts.slice(0, -1)
      : symbolParts;

    if (hasLineNumber) {
      lineNumber = parseInt(lastPart, 10);
    }

    if (partsWithoutLine.length === 1) {
      cleanName = partsWithoutLine[0];
      scopeParts = [];
    } else if (partsWithoutLine.length === 2) {
      const firstPart = partsWithoutLine[0];
      if (!firstPart.includes('.')) {
        cleanName = partsWithoutLine[1];
        scopeParts = [];
      } else {
        cleanName = partsWithoutLine[1];
        scopeParts = [partsWithoutLine[0]];
      }
    } else {
      cleanName = partsWithoutLine[partsWithoutLine.length - 1];
      const secondToLast = partsWithoutLine[partsWithoutLine.length - 2];

      if (!secondToLast.includes('.')) {
        scopeParts = partsWithoutLine.slice(0, -2);
      } else {
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
      uri: '',
      scopePath,
      name: cleanName,
      lineNumber,
    };
  }
};

/**
 * Normalize parameter types into a signature string for method disambiguation.
 *
 * Format: (Type1,Type2,Type3)
 * - Types are normalized to their simple names (no namespace prefix)
 * - Generic type parameters are preserved (e.g., List<String>)
 * - Whitespace is removed for consistency
 *
 * @param parameters The parameter list
 * @returns Normalized signature string
 */
function normalizeSignature(parameters: ParameterInfo[]): string {
  const typeNames = parameters.map((p) => normalizeTypeName(p.type));
  return `(${typeNames.join(',')})`;
}

/**
 * Normalize a type name for signature generation.
 * - Remove namespace prefixes (System.String -> String)
 * - Preserve generics (List<String>)
 * - Remove whitespace
 *
 * @param typeName The type name to normalize
 * @returns Normalized type name
 */
function normalizeTypeName(typeName: string): string {
  // Trim whitespace
  let normalized = typeName.trim();

  // Handle generic types (preserve the full generic signature)
  const genericMatch = normalized.match(/^([^<]+)(<.+>)$/);
  if (genericMatch) {
    const baseType = genericMatch[1];
    const genericPart = genericMatch[2];
    // Normalize the base type (remove namespace) but keep generic part
    normalized = `${removeNamespace(baseType)}${genericPart}`;
  } else {
    // Simple type: remove namespace
    normalized = removeNamespace(normalized);
  }

  // Remove all whitespace for consistency
  return normalized.replace(/\s+/g, '');
}

/**
 * Remove namespace prefix from a type name.
 * System.String -> String
 * MyNamespace.MyClass -> MyClass
 *
 * @param typeName The type name
 * @returns Type name without namespace
 */
function removeNamespace(typeName: string): string {
  const lastDot = typeName.lastIndexOf('.');
  return lastDot === -1 ? typeName : typeName.substring(lastDot + 1);
}

/**
 * Generate a unique symbol ID using stable, location-free format.
 *
 * NEW FORMAT (stable, no line numbers):
 *   - Separator: `#` (not `:`) to avoid URI confusion
 *   - Qualified names: dot-separated (e.g., `OuterClass.InnerClass.method`)
 *   - Method signatures: `#(Type1,Type2)` for overload disambiguation
 *   - Examples:
 *     - Class: `file:///MyClass.cls#MyClass`
 *     - Method: `file:///MyClass.cls#MyClass.myMethod#(String,Integer)`
 *     - Nested: `file:///Outer.cls#Outer.Inner.method`
 *
 * OLD FORMAT (deprecated, backward compat in parsing):
 *   - Separator: `:` (colon)
 *   - Paths: colon-separated
 *   - Line numbers: included
 *   - Example: `file:///MyClass.cls:MyClass:method:myMethod:42`
 *
 * @param name The symbol name
 * @param fileUri The file URI
 * @param scopePath Optional scope path for uniqueness (e.g., ["TestClass", "method1"])
 * @param lineNumber Optional line number - DEPRECATED, not used in stable IDs
 * @param prefix Optional symbol prefix/kind for uniqueness (e.g., "method", "block")
 *   - used for duplicate disambiguation only
 * @param parameters Optional parameters for method/constructor signatures
 * @param namespace Optional namespace for top-level types
 * @returns URI-based symbol ID in stable format
 */
export const generateSymbolId = (
  name: string,
  fileUri: string,
  scopePath?: string[],
  lineNumber?: number,
  prefix?: string,
  parameters?: ParameterInfo[],
  namespace?: string,
): string => {
  const uri = convertToUri(fileUri);

  // Build qualified name (dot-separated)
  let qualifiedName: string;

  if (namespace && (!scopePath || scopePath.length === 0)) {
    // Top-level symbol with namespace: namespace.ClassName
    qualifiedName = `${namespace}.${name}`;
  } else if (scopePath && scopePath.length > 0) {
    // Nested symbol: join scope path with dots
    // For example: OuterClass.InnerClass.method
    qualifiedName = [...scopePath, name].join('.');
  } else {
    // Simple case: just the name
    qualifiedName = name;
  }

  // Start with base ID: fileUri#qualifiedName
  let symbolId = `${uri}#${qualifiedName}`;

  // Add signature for methods/constructors if parameters are provided
  if (parameters && parameters.length > 0) {
    const signature = normalizeSignature(parameters);
    symbolId += `#${signature}`;
  }

  // Add prefix as disambiguator if provided (for blocks, duplicate symbols)
  // This is a fallback for edge cases where qualified name alone isn't unique
  if (prefix) {
    symbolId += `$${prefix}`;
  }

  // lineNumber is deprecated - not used in stable IDs
  // Kept as parameter for backward compatibility during migration

  return symbolId;
};

/**
 * Extract just the file path from a URI that may contain symbol name and line number.
 * Handles both old format (`:` separator) and new format (`#` separator).
 *
 * @param uri The URI that may contain symbol information
 * @returns The base file URI without symbol parts
 */
export const extractFilePathFromUri = (uri: string): string => {
  const protocol = getProtocolType(uri);

  // For known double-slash protocols, find the symbol separator after the authority
  if (protocol === 'file' || protocol === 'apexlib' || protocol === 'builtin') {
    // New format: file:///path/to/file.cls#ClassName  ->  file:///path/to/file.cls
    // Old format: file:///path/to/file.cls:ClassName  ->  file:///path/to/file.cls
    // built-in://apex:SomeName            ->  built-in://apex
    const protocolEnd = uri.indexOf('://');
    if (protocolEnd !== -1) {
      const afterScheme = protocolEnd + 3; // Skip "://"
      const pathStart = uri.indexOf('/', afterScheme);
      if (pathStart !== -1) {
        // Has path component: symbol separator is # or : after the path
        // Try # first (new format), then : (old format)
        const hashSep = uri.indexOf('#', pathStart);
        const colonSep = uri.indexOf(':', pathStart);

        if (hashSep !== -1 && (colonSep === -1 || hashSep < colonSep)) {
          return uri.substring(0, hashSep);
        } else if (colonSep !== -1) {
          return uri.substring(0, colonSep);
        }
      } else {
        // No path component (e.g., built-in://apex:Name) — separator in authority
        const hashSep = uri.indexOf('#', afterScheme);
        const colonSep = uri.indexOf(':', afterScheme);

        if (hashSep !== -1 && (colonSep === -1 || hashSep < colonSep)) {
          return uri.substring(0, hashSep);
        } else if (colonSep !== -1) {
          return uri.substring(0, colonSep);
        }
      }
    }
    return uri;
  }

  // For 'other' protocols (memfs:, vscode-test-web://, etc.) and plain paths,
  // find the separator that separates URI from symbol parts.
  // Use file-extension heuristic: if the URI contains a recognized extension, the symbol
  // separator is the first # or : after that extension.
  const extMatch = uri.match(/\.(cls|trigger|apex|soql|page|component|app)/);
  if (extMatch) {
    const extEnd = extMatch.index! + extMatch[0].length;
    const hashSep = uri.indexOf('#', extEnd);
    const colonSep = uri.indexOf(':', extEnd);

    if (hashSep !== -1 && (colonSep === -1 || hashSep < colonSep)) {
      return uri.substring(0, hashSep);
    } else if (colonSep !== -1) {
      return uri.substring(0, colonSep);
    }
  }

  return uri;
};

/**
 * Parse a URI-based ID back into its components.
 * Handles both new format (# separator) and old format (: separator).
 *
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
  signature?: string;
  qualifiedName?: string;
} => {
  // Use extractFilePathFromUri to find the URI portion
  const uri = extractFilePathFromUri(id);
  if (uri === id) {
    throw new Error(`Invalid ID format - no symbol part found: ${id}`);
  }

  // Detect separator: # for new format, : for old format
  const separatorChar = id.charAt(uri.length);
  if (separatorChar !== '#' && separatorChar !== ':') {
    throw new Error(
      `Invalid ID format - expected # or : separator at position ${uri.length}: ${id}`,
    );
  }

  const symbolPart = id.substring(uri.length + 1); // Skip the separator

  const parsed = parseSymbolPart(symbolPart, separatorChar);
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

/**
 * Extract the simple name from a qualified name.
 * OuterClass.InnerClass.method -> method
 * MyClass -> MyClass
 *
 * @param qualifiedName The qualified name
 * @returns Simple name
 */
export const extractSimpleName = (qualifiedName: string): string => {
  const lastDot = qualifiedName.lastIndexOf('.');
  return lastDot === -1 ? qualifiedName : qualifiedName.substring(lastDot + 1);
};

/**
 * Extract the scope path from a qualified name.
 * OuterClass.InnerClass.method -> ["OuterClass", "InnerClass"]
 * MyClass.method -> ["MyClass"]
 * MyClass -> []
 *
 * @param qualifiedName The qualified name
 * @returns Scope path array (empty if no scope)
 */
export const extractScopePath = (qualifiedName: string): string[] => {
  const lastDot = qualifiedName.lastIndexOf('.');
  if (lastDot === -1) {
    return [];
  }
  const scopePart = qualifiedName.substring(0, lastDot);
  return scopePart.split('.');
};
