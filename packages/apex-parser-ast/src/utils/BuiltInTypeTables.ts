/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbol, SymbolKind, SymbolVisibility } from '../types/symbol';
import { BuiltInTypeTables } from '../namespace/NamespaceUtils';
import { createApexLibUri } from '../types/ProtocolHandler';
import { generateSymbolId } from '../types/UriBasedIdGenerator';

/**
 * Scalar keyword types (void, null) not backed by real .cls sources.
 * URIs use the same apexlib scheme as StandardApexLibrary; paths are
 * conventional (System/{name}) for stable IDs and graph edges.
 */
export class BuiltInTypeTablesImpl implements BuiltInTypeTables {
  private static instance: BuiltInTypeTablesImpl;

  // Only types that are not real classes in the ZIP
  // Wrapper types (String, Integer, etc.) and collections (List, Set, Map, …)
  // resolve via ResourceLoader; System/Schema types resolve via ResourceLoader
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
   * Scalar keywords void and null — synthetic symbols with apexlib URIs
   */
  private createScalarTypes(): Map<string, ApexSymbol> {
    const types = new Map<string, ApexSymbol>();

    const scalarTypeNames = ['void', 'null'];

    scalarTypeNames.forEach((name) => {
      const symbol = this.createScalarKeywordSymbol(name, SymbolKind.Class);
      types.set(name.toLowerCase(), symbol);
    });

    return types;
  }

  private createScalarKeywordSymbol(
    name: string,
    kind: SymbolKind,
  ): ApexSymbol {
    const namespace = 'System';
    const fileUri = createApexLibUri(`${namespace}/${name}`);
    const id = generateSymbolId(name, fileUri);
    return {
      id,
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
        path: ['stdlib', namespace, name],
        prefix: 'stdlib',
        name: name,
      },
      fileUri,
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
   * Find a scalar keyword type (void, null)
   */
  findType(lowerCaseName: string): ApexSymbol | null {
    return this.scalarTypes.get(lowerCaseName) ?? null;
  }

  /**
   * Get all scalar keyword types
   */
  getAllTypes(): ApexSymbol[] {
    return Array.from(this.scalarTypes.values());
  }

  /**
   * Get statistics about scalar keyword types
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
   * True if name is a scalar keyword (void, null)
   */
  isScalarKeywordName(name: string): boolean {
    return this.findType(name.toLowerCase()) !== null;
  }

  /**
   * Get scalar keyword types by category
   */
  getTypesByCategory(category: 'scalar'): ApexSymbol[] {
    if (category === 'scalar') {
      return Array.from(this.scalarTypes.values());
    }
    return [];
  }
}
