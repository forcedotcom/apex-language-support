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

import { ApexSymbol, SymbolKind } from '../types/symbol.js';

// List of known Salesforce built-in namespaces
export const BUILT_IN_NAMESPACES = [
  'System',
  'Schema',
  'Apex',
  'ApexPages',
  'Approval',
  'Auth',
  'Cache',
  'Canvas',
  'ChatterAnswers',
  'ConnectApi',
  'Database',
  'Dom',
  'EventBus',
  'Flow',
  'KbManagement',
  'Label',
  'Messaging',
  'Metadata',
  'Process',
  'QuickAction',
  'Reports',
  'Search',
  'Site',
  'Support',
  'Test',
  'Trigger',
  'UserProvisioning',
  'Visualforce',
];

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
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEFAULT_OPTIONS: FQNOptions = {
  innerClassDelimiter: '.',
  memberDelimiter: '.',
  normalizeCase: false,
};

/**
 * Calculates the fully qualified name for an Apex symbol
 * @param symbol The symbol to calculate the FQN for
 * @param options Options for FQN generation
 * @returns The fully qualified name as a string
 */
export function calculateFQN(symbol: ApexSymbol, options?: FQNOptions): string {
  // Start with the symbol name
  let fqn = symbol.name;

  // If the symbol has a parent, prepend the parent's FQN
  if (symbol.parent) {
    fqn = `${symbol.parent.name}.${fqn}`;

    // Continue up the hierarchy
    let currentParent = symbol.parent.parent;
    while (currentParent) {
      fqn = `${currentParent.name}.${fqn}`;
      currentParent = currentParent.parent;
    }
  }

  // If there's a namespace in the parent chain, extract it
  if (symbol.parent && symbol.parent.namespace) {
    symbol.namespace = symbol.parent.namespace;
  }
  // If no namespace was found but a default namespace is provided, use it
  else if (!symbol.namespace && options?.defaultNamespace) {
    symbol.namespace = options.defaultNamespace;

    // Only prepend the namespace for top-level symbols with no parent
    if (!symbol.parent) {
      fqn = `${options.defaultNamespace}.${fqn}`;
    }
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
 * @returns Array of ancestors from top-level to closest parent
 */
export function getAncestorChain(symbol: any): any[] {
  const ancestors: any[] = [];
  let current = symbol.parent;

  while (current) {
    // Only add type-level symbols to the chain
    if (
      current.kind === 'Class' ||
      current.kind === 'Interface' ||
      current.kind === 'Enum'
    ) {
      ancestors.unshift(current);
    }
    current = current.parent;
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

  // Simple primitive types
  const primitives = [
    'Boolean',
    'Decimal',
    'Double',
    'Integer',
    'Long',
    'String',
    'ID',
    'Date',
    'Datetime',
    'Time',
    'Blob',
    'Object',
  ];
  if (primitives.includes(symbol.name)) return true;

  // Check for List, Set, Map types
  if (
    symbol.name.startsWith('List<') ||
    symbol.name.startsWith('Set<') ||
    symbol.name.startsWith('Map<')
  ) {
    return true;
  }

  // Check if this is a type from a built-in namespace
  const namespace = symbol.namespace || extractNamespace(symbol.name);
  return namespace ? BUILT_IN_NAMESPACES.includes(namespace) : false;
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

  // If it's a built-in namespace, return the name itself
  if (BUILT_IN_NAMESPACES.includes(name)) {
    return name;
  }

  // If the name has a namespace prefix (e.g., 'Namespace.ClassName')
  if (name.includes('.')) {
    const parts = name.split('.');
    // Check if the first part is a built-in namespace
    if (BUILT_IN_NAMESPACES.includes(parts[0])) {
      return parts[0];
    }
  }

  // Return default namespace if provided
  return defaultNamespace || '';
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

  // Check if the FQN starts with a built-in namespace
  for (const namespace of BUILT_IN_NAMESPACES) {
    if (fqn === namespace || fqn.startsWith(`${namespace}.`)) {
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
