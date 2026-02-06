/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DirectedGraph } from 'data-structure-typed';
import {
  SymbolKind,
  type ApexSymbol,
  type SymbolTable,
  type TypeSymbol,
  type MethodSymbol,
  type VariableSymbol,
} from '../types/symbol';
import type { TypeInfo } from '../types/typeInfo';

/**
 * Namespace dependency information
 */
export interface NamespaceDependencies {
  namespace: string;
  dependsOn: Set<string>; // Namespaces this one depends on
  classCount: number;
}

/**
 * Analyzes namespace dependencies from symbol tables
 * to enable optimal loading order via topological sort
 */
export class NamespaceDependencyAnalyzer {
  /**
   * Analyze all symbol tables to build namespace dependency graph
   * @param symbolTables Map from binary cache deserialization (URI -> SymbolTable)
   * @returns Namespace dependencies
   */
  static analyzeFromSymbolTables(
    symbolTables: Map<string, SymbolTable>,
  ): Map<string, NamespaceDependencies> {
    const deps = new Map<string, NamespaceDependencies>();

    for (const [uri, symbolTable] of symbolTables) {
      // Extract namespace from URI: apexlib://resources/StandardApexLibrary/{namespace}/{className}.cls
      const namespace = this.extractNamespace(uri);
      if (!namespace) continue;

      // Get or create namespace entry
      if (!deps.has(namespace)) {
        deps.set(namespace, {
          namespace,
          dependsOn: new Set(),
          classCount: 0,
        });
      }

      const nsData = deps.get(namespace)!;
      nsData.classCount++;

      // Extract dependencies from symbol references
      const symbols = symbolTable.getAllSymbols();
      for (const symbol of symbols) {
        // Check fields, parameters, return types, extends, implements
        const references = this.extractTypeReferences(symbol);
        for (const ref of references) {
          const refNamespace = this.extractNamespaceFromType(ref);
          if (refNamespace && refNamespace !== namespace) {
            nsData.dependsOn.add(refNamespace);
          }
        }
      }
    }

    return deps;
  }

  /**
   * Perform topological sort on namespace dependencies
   * Returns namespaces in load order (dependencies first)
   * Uses DirectedGraph.topologicalSort() from data-structure-typed library
   */
  static topologicalSort(
    dependencies: Map<string, NamespaceDependencies>,
  ): string[] {
    const graph = new DirectedGraph<string, void>();

    // Add all namespaces as vertices
    for (const [namespace] of dependencies) {
      graph.addVertex(namespace, namespace);
    }

    // Add edges: namespace -> dependency (reversed for correct sort direction)
    for (const [namespace, data] of dependencies) {
      for (const dep of data.dependsOn) {
        // Edge from dependency to dependent (dep must load before namespace)
        graph.addEdge(dep, namespace);
      }
    }

    // Perform topological sort - returns keys in dependency order
    const sorted = graph.topologicalSort('key') as string[] | undefined;

    if (!sorted) {
      // Circular dependency detected - fall back to foundation-first
      const FOUNDATION = ['System', 'Database', 'Schema'];
      const all = [...dependencies.keys()];
      return [
        ...all.filter((ns) => FOUNDATION.includes(ns)),
        ...all.filter((ns) => !FOUNDATION.includes(ns)),
      ];
    }

    return sorted;
  }

  /**
   * Extract namespace from URI
   * URI format: apexlib://resources/StandardApexLibrary/{namespace}/{className}.cls
   */
  private static extractNamespace(uri: string): string | null {
    const match = uri.match(
      /apexlib:\/\/resources\/StandardApexLibrary\/([^/]+)\//,
    );
    return match ? match[1] : null;
  }

  /**
   * Extract type references from a symbol
   * Handles inheritance, fields, methods, parameters, return types
   */
  private static extractTypeReferences(symbol: ApexSymbol): string[] {
    const refs: string[] = [];

    // Type symbols (class/interface/enum) - check inheritance
    if (
      symbol.kind === SymbolKind.Class ||
      symbol.kind === SymbolKind.Interface ||
      symbol.kind === SymbolKind.Enum
    ) {
      const typeSymbol = symbol as TypeSymbol;
      if (typeSymbol.superClass) {
        refs.push(typeSymbol.superClass);
      }
      if (typeSymbol.interfaces) {
        refs.push(...typeSymbol.interfaces);
      }
    }

    // Method symbols - check return type and parameters
    if (
      symbol.kind === SymbolKind.Method ||
      symbol.kind === SymbolKind.Constructor
    ) {
      const methodSymbol = symbol as MethodSymbol;
      if (methodSymbol.returnType) {
        refs.push(...this.extractFromTypeInfo(methodSymbol.returnType));
      }
      if (methodSymbol.parameters) {
        for (const param of methodSymbol.parameters) {
          if (param.type) {
            refs.push(...this.extractFromTypeInfo(param.type));
          }
        }
      }
    }

    // Variable symbols (field/property/variable/parameter) - check type
    if (
      symbol.kind === SymbolKind.Field ||
      symbol.kind === SymbolKind.Property ||
      symbol.kind === SymbolKind.Variable ||
      symbol.kind === SymbolKind.Parameter
    ) {
      const varSymbol = symbol as VariableSymbol;
      if (varSymbol.type) {
        refs.push(...this.extractFromTypeInfo(varSymbol.type));
      }
      // Also check initializer type if present
      if (varSymbol.initializerType) {
        refs.push(...this.extractFromTypeInfo(varSymbol.initializerType));
      }
    }

    return refs;
  }

  /**
   * Extract type names from TypeInfo (handles generics and nested types)
   */
  private static extractFromTypeInfo(typeInfo: TypeInfo): string[] {
    const refs: string[] = [];

    // Main type name
    if (typeInfo.name) {
      refs.push(typeInfo.name);
    }

    // Generic type parameters (e.g., List<Account>)
    if (typeInfo.typeParameters) {
      for (const param of typeInfo.typeParameters) {
        refs.push(...this.extractFromTypeInfo(param));
      }
    }

    return refs;
  }

  /**
   * Extract namespace from a type name
   * Handles:
   * - Fully qualified names: System.Exception -> System
   * - Implicit System types: String, List, Map (no namespace extracted)
   * - Simple names: Account (no namespace extracted)
   */
  private static extractNamespaceFromType(typeName: string): string | null {
    // Handle generic syntax: List<Account> -> List
    const baseType = typeName.split('<')[0].trim();

    // Check if it has a namespace prefix (e.g., System.Exception)
    if (baseType.includes('.')) {
      const parts = baseType.split('.');
      // First part is the namespace
      return parts[0];
    }

    // No explicit namespace
    return null;
  }
}
