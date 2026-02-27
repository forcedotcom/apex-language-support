/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Utilities for working with Fully Qualified Names (FQNs) in Apex
 */

import { ApexSymbol, SymbolKind } from '../types/symbol';
import { isBlockSymbol } from './symbolNarrowing';
import { ResourceLoader } from './resourceLoader';

/**
 * Options for FQN generation
 */
export interface FQNOptions {
  /** Default namespace to use if none is specified */
  defaultNamespace?: string;
  /** Delimiter for inner class members (default '.') */
  innerClassDelimiter?: string;
  /** Delimiter for method/field members (default '.') */
  memberDelimiter?: string;
  /** Whether to normalize case (lowercase) for comparison purposes */
  normalizeCase?: boolean;
  /** Whether to exclude block symbols from FQN (default: false)
   * When true, block symbols like "class_1", "method_2" are excluded for cleaner user-facing FQNs
   * When false, all parent symbols including blocks are included (for internal/technical FQNs)
   */
  excludeBlockSymbols?: boolean;
}

// TODO: Remove this once we dig into FQN resolution
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_OPTIONS: FQNOptions = {
  innerClassDelimiter: '.',
  memberDelimiter: '.',
  normalizeCase: true, // Enable case normalization by default for Apex case-insensitive convention
};

/**
 * Calculates the fully qualified name for an Apex symbol
 * @param symbol The symbol to calculate the FQN for
 * @param options Options for FQN generation
 * @param getParent Function to resolve parent by ID (for lazy loading)
 * @returns The fully qualified name as a string
 */
export function calculateFQN(
  symbol: ApexSymbol,
  options?: FQNOptions,
  getParent?: (parentId: string) => ApexSymbol | null,
): string {
  // Collect all meaningful parent names (excluding block scopes and methods)
  const parts: string[] = [symbol.name];

  // First try to use parentId with getParent function (preferred for lazy loading)
  if (symbol.parentId && getParent) {
    let currentParentId: string | null = symbol.parentId;
    let depth = 0;
    const visitedIds = new Set<string>(); // Track visited IDs to prevent cycles
    visitedIds.add(symbol.id); // Don't include the symbol itself in the path

    while (currentParentId && depth < 20) {
      // Prevent infinite loops and self-references
      if (visitedIds.has(currentParentId) || currentParentId === symbol.id) {
        break; // Cycle detected or self-reference
      }
      visitedIds.add(currentParentId);

      const parent = getParent(currentParentId);
      if (!parent) {
        break;
      }

      // Don't include the symbol itself in the path
      if (parent.id === symbol.id) {
        break;
      }

      // Skip block symbols when requested (avoids "outerclass.outerclass.innerclass")
      // when inner class has parentId pointing to class block
      if (options?.excludeBlockSymbols === true && isBlockSymbol(parent)) {
        currentParentId = parent.parentId ?? null;
        depth++;
        continue;
      }

      // Include all parents in FQN - FQN should reflect the actual parent hierarchy
      parts.unshift(parent.name);

      currentParentId = parent.parentId ?? null;
      depth++;
    }
  }

  let fqn = parts.join('.');

  // Handle namespace
  if (symbol.namespace) {
    // If symbol has its own namespace, use it
    fqn = `${symbol.namespace}.${fqn}`;
  } else if (options?.defaultNamespace && !symbol.parentId) {
    // Only apply default namespace to top-level symbols
    fqn = `${options.defaultNamespace}.${fqn}`;
    symbol.namespace = options.defaultNamespace;
  }

  // Apply case normalization if requested (important for Apex case-insensitive convention)
  if (options?.normalizeCase) {
    fqn = fqn.toLowerCase();
  }

  return fqn;
}

/**
 * Checks if the given symbol is a type (class, interface, enum, trigger)
 * @param symbol The symbol to check
 * @returns True if the symbol is a type, false otherwise
 */
export function isType(symbol: ApexSymbol): boolean {
  return (
    symbol.kind === SymbolKind.Class ||
    symbol.kind === SymbolKind.Interface ||
    symbol.kind === SymbolKind.Enum ||
    symbol.kind === SymbolKind.Trigger
  );
}

/**
 * Gets the namespace part of a fully qualified name
 * @param fqn The fully qualified name
 * @returns The namespace part or undefined if there is no namespace
 */
export function getNamespaceFromFQN(fqn: string): string | undefined {
  // In Apex, namespaces are the top-level package
  const parts = fqn.split('.');
  return parts.length > 1 ? parts[0] : undefined;
}

/**
 * Get the chain of ancestors for a symbol
 * @param symbol The symbol to get ancestors for
 * @param getParent Function to resolve parent by ID (for lazy loading)
 * @returns Array of ancestors from top-level to closest parent
 */
export function getAncestorChain(
  symbol: any,
  getParent?: (parentId: string) => any,
): any[] {
  const ancestors: any[] = [];
  let currentParentId = symbol.parentId;

  while (currentParentId && getParent) {
    const current = getParent(currentParentId);
    if (!current) break;

    // Skip scope symbols (they're structural, not semantic)
    if (isBlockSymbol(current)) {
      currentParentId = current.parentId;
      continue;
    }

    // Only add type-level symbols to the chain
    if (
      current.kind === 'Class' ||
      current.kind === 'Interface' ||
      current.kind === 'Enum'
    ) {
      ancestors.unshift(current);
    }
    currentParentId = current.parentId;
  }

  return ancestors;
}

/**
 * Check if a type is a built-in Apex type
 * @param symbol The symbol to check
 * @returns Whether the symbol is a built-in type
 */
export function isBuiltInType(symbol: any): boolean {
  if (!symbol || !symbol.name) return false;

  // Check for List, Set, Map types (generic collection types)
  if (
    symbol.name.startsWith('List<') ||
    symbol.name.startsWith('Set<') ||
    symbol.name.startsWith('Map<')
  ) {
    return true;
  }

  // Check if this is a type from a built-in namespace (System namespace)
  // This includes wrapper types (String, Integer, etc.) and collection types (List, Set, Map)
  // which are now in StandardApexLibrary/System/ and resolved via ResourceLoader
  const namespace = symbol.namespace || extractNamespace(symbol.name);
  const resourceLoader = ResourceLoader.getInstance();
  return namespace
    ? [...resourceLoader.getStandardNamespaces().keys()].includes(namespace)
    : false;
}

/**
 * Get the appropriate delimiter between two symbols in an FQN
 */
export function getMemberDelimiter(
  symbol: any,
  parent: any,
  options: FQNOptions,
): string {
  if (!parent) return '';

  // Default delimiters
  const innerDelimiter = options.innerClassDelimiter || '.';
  const memberDelimiter = options.memberDelimiter || '.';

  // Use inner class delimiter for class, interface, and enum types
  if (
    symbol.kind === 'Class' ||
    symbol.kind === 'Interface' ||
    symbol.kind === 'Enum'
  ) {
    return innerDelimiter;
  }

  // Use member delimiter for methods, properties, fields
  return memberDelimiter;
}

/**
 * Extract namespace from a qualified name
 * @param name The qualified name to extract namespace from
 * @param defaultNamespace Default namespace to use if none is found
 * @returns The extracted namespace or empty string
 */
export function extractNamespace(
  name: string,
  defaultNamespace?: string,
): string {
  if (!name) return '';
  const resourceLoader = ResourceLoader.getInstance();
  // If it's a built-in namespace, return the name itself
  if (
    [...resourceLoader.getStandardNamespaces().keys()].includes(name as any)
  ) {
    return name;
  }

  // If the name has a namespace prefix (e.g., 'Namespace.ClassName')
  if (name.includes('.')) {
    const parts = name.split('.');
    // Check if the first part is a built-in namespace
    if (
      [...resourceLoader.getStandardNamespaces().keys()].includes(
        parts[0] as any,
      )
    ) {
      return parts[0];
    }
  }

  // Return default namespace if provided
  return defaultNamespace || '';
}

/**
 * Check if a symbol represents a block scope (should be skipped in FQN)
 * @param symbol The symbol to check
 * @returns True if the symbol is a block scope, false otherwise
 */
export function isBlockScope(symbol: any): boolean {
  if (!symbol) return false;
  // Exclude all block symbols from FQN (they're structural, not semantic)
  return symbol.kind === SymbolKind.Block;
}

/**
 * Check if a symbol is globally visible
 */
export function isGlobalSymbol(symbol: any): boolean {
  if (!symbol) return false;
  return symbol.visibility === 'global';
}

/**
 * Check if a fully qualified name belongs to a built-in type
 */
export function isBuiltInFQN(fqn: string): boolean {
  if (!fqn) return false;
  const resourceLoader = ResourceLoader.getInstance();
  // Check if the FQN starts with a built-in namespace
  for (const namespace of [...resourceLoader.getStandardNamespaces().keys()]) {
    if (fqn === namespace.toString() || fqn.startsWith(`${namespace}.`)) {
      return true;
    }
  }

  return false;
}

/**
 * Get a method signature for a method symbol
 */
export function getMethodSignature(methodSymbol: any): string {
  if (!methodSymbol || methodSymbol.kind !== 'Method') {
    return '';
  }

  // Build parameter string
  let params = '';
  if (methodSymbol.parameters && methodSymbol.parameters.length > 0) {
    params = methodSymbol.parameters
      .map((p: any) => p.type || 'Object')
      .join(',');
  }

  return `${methodSymbol.name}(${params})`;
}
