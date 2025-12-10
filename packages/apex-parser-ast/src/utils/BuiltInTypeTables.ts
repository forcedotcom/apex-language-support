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
import { STANDARD_SOBJECT_TYPES } from '../constants/constants';

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
  readonly scalarTypes: Map<string, ApexSymbol>;
  readonly sObjectTypes: Map<string, ApexSymbol>;

  private constructor() {
    this.scalarTypes = this.createScalarTypes();
    this.sObjectTypes = this.createSObjectTypes();
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
   * Create SObject type symbols
   * These are dynamic types, not real classes, so they need synthetic symbols
   */
  private createSObjectTypes(): Map<string, ApexSymbol> {
    const types = new Map<string, ApexSymbol>();

    // Common SObject types
    const sObjectTypeNames = [
      ...Array.from(STANDARD_SOBJECT_TYPES),
      'CustomObject__c', // Placeholder for custom objects
    ];

    sObjectTypeNames.forEach((name) => {
      const symbol = this.createBuiltInSymbol(
        name,
        SymbolKind.Class,
        'SObject',
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
   * Find a type in all built-in tables
   * Note: Wrapper types, collection types (List, Set, Map), System types, and
   * Schema types are now resolved via ResourceLoader
   * This only returns types that aren't real classes (scalar, sObject)
   */
  findType(lowerCaseName: string): ApexSymbol | null {
    // Check scalar types
    const scalarType = this.scalarTypes.get(lowerCaseName);
    if (scalarType) return scalarType;

    // Check SObject types
    const sObjectType = this.sObjectTypes.get(lowerCaseName);
    if (sObjectType) return sObjectType;

    return null;
  }

  /**
   * Get all built-in types
   * Note: Wrapper types, collection types (List, Set, Map), System types, and
   * Schema types are now resolved via ResourceLoader
   */
  getAllTypes(): ApexSymbol[] {
    const allTypes: ApexSymbol[] = [];

    this.scalarTypes.forEach((type) => allTypes.push(type));
    this.sObjectTypes.forEach((type) => allTypes.push(type));

    return allTypes;
  }

  /**
   * Get statistics about built-in types
   * Note: Wrapper types, collection types (List, Set, Map), System types, and
   * Schema types are now resolved via ResourceLoader
   */
  getStats(): {
    totalTypes: number;
    scalarTypes: number;
    sObjectTypes: number;
  } {
    return {
      totalTypes: this.getAllTypes().length,
      scalarTypes: this.scalarTypes.size,
      sObjectTypes: this.sObjectTypes.size,
    };
  }

  /**
   * Check if a type is built-in
   */
  isBuiltInType(name: string): boolean {
    const lowerCaseName = name.toLowerCase();
    return this.findType(lowerCaseName) !== null;
  }

  /**
   * Get built-in type by category
   * Note: Wrapper types, collection types (List, Set, Map), System types, and
   * Schema types are now resolved via ResourceLoader
   */
  getTypesByCategory(category: 'scalar' | 'sobject'): ApexSymbol[] {
    switch (category) {
      case 'scalar':
        return Array.from(this.scalarTypes.values());
      case 'sobject':
        return Array.from(this.sObjectTypes.values());
      default:
        return [];
    }
  }
}
