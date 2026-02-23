/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbol, SymbolKind, SymbolVisibility } from '../types/symbol';
import { BuiltInTypeTables } from '../namespace/NamespaceUtils';
import { getLogger } from '@salesforce/apex-lsp-shared';

/**
 * Built-in type tables for Apex
 * Maps to Java TypeInfoTables
 */
export class BuiltInTypeTablesImpl implements BuiltInTypeTables {
  private static instance: BuiltInTypeTablesImpl;
  private readonly logger = getLogger();

  // Type tables - only for types that aren't real classes
  // Wrapper types (String, Integer, etc.) and collection types (List, Set, Map)
  // are now in StandardApexLibrary/System/ and resolved via ResourceLoader
  // System and Schema types are also in StandardApexLibrary and resolved via ResourceLoader
  // SObject types are resolved via the symbol graph / findMissingArtifact endpoint
  readonly scalarTypes: Map<string, ApexSymbol>;

  private constructor() {
    this.scalarTypes = this.createScalarTypes();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): BuiltInTypeTablesImpl {
    if (!BuiltInTypeTablesImpl.instance) {
      BuiltInTypeTablesImpl.instance = new BuiltInTypeTablesImpl();
    }
    return BuiltInTypeTablesImpl.instance;
  }

  /**
   * Create scalar type symbols (void, null)
   * These aren't real classes, so they need synthetic symbols
   */
  private createScalarTypes(): Map<string, ApexSymbol> {
    const types = new Map<string, ApexSymbol>();

    const scalarTypeNames = ['void', 'null'];

    scalarTypeNames.forEach((name) => {
      const symbol = this.createBuiltInSymbol(
        name,
        SymbolKind.Class,
        'BUILT_IN',
      );
      types.set(name.toLowerCase(), symbol);
    });

    return types;
  }

  /**
   * Create a built-in symbol
   */
  private createBuiltInSymbol(
    name: string,
    kind: SymbolKind,
    namespace: string,
  ): ApexSymbol {
    return {
      id: `built-in-${namespace}-${name}`,
      name,
      kind,
      namespace,
      location: {
        symbolRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 0,
        },
        identifierRange: {
          startLine: 1,
          startColumn: 0,
          endLine: 1,
          endColumn: 0,
        },
      },
      key: {
        path: ['built-in', namespace, name],
        prefix: 'built-in',
        name: name,
      },
      fileUri: 'built-in://apex',
      parentId: null,
      _isLoaded: true,
      modifiers: {
        visibility: SymbolVisibility.Public,
        isStatic: true,
        isFinal: true,
        isBuiltIn: true,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
      },
    };
  }

  /**
   * Find a type in built-in tables.
   * Note: Only scalar types (void, null) are synthetic. Wrapper types,
   * collection types (List, Set, Map), System types, Schema types, and
   * SObject types are all resolved via ResourceLoader or the symbol graph.
   */
  findType(lowerCaseName: string): ApexSymbol | null {
    return this.scalarTypes.get(lowerCaseName) ?? null;
  }

  /**
   * Get all built-in types
   */
  getAllTypes(): ApexSymbol[] {
    return Array.from(this.scalarTypes.values());
  }

  /**
   * Get statistics about built-in types
   */
  getStats(): {
    totalTypes: number;
    scalarTypes: number;
  } {
    return {
      totalTypes: this.scalarTypes.size,
      scalarTypes: this.scalarTypes.size,
    };
  }

  /**
   * Check if a type is built-in
   */
  isBuiltInType(name: string): boolean {
    return this.findType(name.toLowerCase()) !== null;
  }

  /**
   * Get built-in type by category
   */
  getTypesByCategory(category: 'scalar'): ApexSymbol[] {
    if (category === 'scalar') {
      return Array.from(this.scalarTypes.values());
    }
    return [];
  }
}
