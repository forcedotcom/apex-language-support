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
 * Parse the symbol fragment of an ID (everything after the first `#` that follows the file URI).
 * Format: qualifiedName[#signature]$prefix — signature uses `#` when present; `$` disambiguates.
 */
const parseSymbolPart = (
  symbolPart: string,
): {
  uri: string;
  scopePath?: string[];
  name: string;
  lineNumber?: number;
  signature?: string;
  qualifiedName?: string;
} => {
  const parts = symbolPart.split('#');

  if (parts.length === 0) {
    throw new Error(`Invalid symbol part: ${symbolPart}`);
  }

  const qualifiedName = parts[0];
  const signature = parts.length > 1 ? parts[1].split('$')[0] : undefined;

  const nameParts = qualifiedName.split('.');
  const name = nameParts[nameParts.length - 1];
  const scopePath = nameParts.length > 1 ? nameParts.slice(0, -1) : undefined;

  return {
    uri: '',
    scopePath,
    name,
    signature,
    qualifiedName,
  };
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
 * @param name The symbol name
 * @param fileUri The file URI
 * @param scopePath Optional scope path for uniqueness (e.g., ["TestClass", "method1"])
 * @param lineNumber Unused; kept for call-site compatibility
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

  return symbolId;
};

/**
 * Extract the base URI from a compound symbol ID string.
 * Symbol metadata is separated from the file URI only by `#` (never by `:` outside the URI scheme).
 *
 * Scheme colons (e.g. `file://`, `vscode://path`) are preserved; only a `#` after the
 * resource path starts the symbol fragment.
 *
 * @param uri The URI that may contain symbol information
 * @returns The base file URI without symbol parts
 */
export const extractFilePathFromUri = (uri: string): string => {
  const extMatch = uri.match(/\.(cls|trigger|apex|soql|page|component|app)/);
  if (extMatch) {
    const extEnd = extMatch.index! + extMatch[0].length;
    const hashSep = uri.indexOf('#', extEnd);
    if (hashSep !== -1) {
      return uri.substring(0, hashSep);
    }
  }

  const protocolEnd = uri.indexOf('://');
  if (protocolEnd !== -1) {
    const afterScheme = protocolEnd + 3;
    const hashSep = uri.indexOf('#', afterScheme);
    if (hashSep !== -1) {
      return uri.substring(0, hashSep);
    }
  }

  const hashSep = uri.indexOf('#');
  if (hashSep !== -1) {
    return uri.substring(0, hashSep);
  }

  return uri;
};

/**
 * Parse a URI-based ID back into its components.
 * Requires `#` between the file URI and the symbol fragment.
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
  const uri = extractFilePathFromUri(id);
  if (uri === id) {
    throw new Error(`Invalid ID format - no symbol part found: ${id}`);
  }

  if (id.charAt(uri.length) !== '#') {
    throw new Error(
      `Invalid ID format - expected # separator at position ${uri.length}: ${id}`,
    );
  }

  const symbolPart = id.substring(uri.length + 1);

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
