/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import Graph from 'graphology';
import { HashMap } from 'data-structure-typed';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { ApexSymbol } from '../types/symbol';

/**
 * Types of references between Apex symbols
 */
export enum ReferenceType {
  METHOD_CALL = 'method-call',
  FIELD_ACCESS = 'field-access',
  TYPE_REFERENCE = 'type-reference',
  INHERITANCE = 'inheritance',
  INTERFACE_IMPLEMENTATION = 'interface-implementation',
  VARIABLE_DECLARATION = 'variable-declaration',
  PARAMETER_TYPE = 'parameter-type',
  RETURN_TYPE = 'return-type',
  IMPORT = 'import',
  NAMESPACE_REFERENCE = 'namespace-reference',
}

/**
 * Edge attributes for symbol references
 */
export interface ReferenceEdge {
  type: ReferenceType;
  sourceFile: string;
  targetFile?: string;
  location: {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  };
  context?: {
    methodName?: string;
    parameterIndex?: number;
    isStatic?: boolean;
    namespace?: string;
  };
}

/**
 * Node attributes for Apex symbols
 */
export interface SymbolNode {
  symbol: ApexSymbol;
  filePath: string;
  lastUpdated: number;
  referenceCount: number;
}

/**
 * Result of a reference search
 */
export interface ReferenceResult {
  symbolId: string;
  symbol: ApexSymbol;
  filePath: string;
  referenceType: ReferenceType;
  location: ReferenceEdge['location'];
  context?: ReferenceEdge['context'];
}

/**
 * Dependency analysis result
 */
export interface DependencyAnalysis {
  dependencies: ApexSymbol[];
  dependents: ApexSymbol[];
  impactScore: number;
  circularDependencies: string[][];
}

/**
 * Graph-based symbol manager for tracking cross-file references
 * Uses graphology for graph algorithms and data-structure-typed for data storage
 */
export class ApexSymbolGraph {
  private readonly logger = getLogger();

  // Graphology graph for relationship tracking
  private referenceGraph: Graph<SymbolNode, ReferenceEdge> = new Graph({
    type: 'directed',
    allowSelfLoops: false,
    multi: false,
  });

  // data-structure-typed collections for fast lookups
  private symbolIndex: HashMap<string, ApexSymbol> = new HashMap();
  private symbolFileMap: HashMap<string, string> = new HashMap(); // Map symbol ID to file path
  private nameIndex: HashMap<string, string[]> = new HashMap();
  private fileIndex: HashMap<string, string[]> = new HashMap();
  private fqnIndex: HashMap<string, string> = new HashMap();

  // Deferred references for lazy loading
  private deferredReferences: HashMap<
    string,
    Array<{
      sourceSymbol: ApexSymbol;
      referenceType: ReferenceType;
      location: ReferenceEdge['location'];
      context?: ReferenceEdge['context'];
    }>
  > = new HashMap();

  constructor() {
    this.logger.debug(() => 'Initializing ApexSymbolGraph');
  }

  /**
   * Add a symbol to the graph
   */
  addSymbol(symbol: ApexSymbol, filePath: string): void {
    const symbolId = this.getSymbolId(symbol, filePath);

    // Add to data-structure-typed indexes for fast lookups
    this.symbolIndex.set(symbolId, symbol);
    this.symbolFileMap.set(symbolId, filePath);
    this.fqnIndex.set(symbol.fqn || symbolId, symbolId);

    // Add to name index for symbol resolution
    const existingNames = this.nameIndex.get(symbol.name) || [];
    if (!existingNames.includes(symbolId)) {
      existingNames.push(symbolId);
      this.nameIndex.set(symbol.name, existingNames);
    }

    // Add to file index
    const fileSymbols = this.fileIndex.get(filePath) || [];
    if (!fileSymbols.includes(symbolId)) {
      fileSymbols.push(symbolId);
      this.fileIndex.set(filePath, fileSymbols);
    }

    // Add to graphology graph
    if (!this.referenceGraph.hasNode(symbolId)) {
      this.referenceGraph.addNode(symbolId, {
        symbol,
        filePath,
        lastUpdated: Date.now(),
        referenceCount: 0,
      });
    }

    // Process any deferred references to this symbol
    this.processDeferredReferences(symbolId);

    // Also process deferred references using the FQN as key
    if (symbol.fqn) {
      this.processDeferredReferencesByName(symbol.fqn);
    }

    // Also process deferred references using the name as key
    this.processDeferredReferencesByName(symbol.name);

    this.logger.debug(() => `Added symbol: ${symbolId} from ${filePath}`);
  }

  /**
   * Add a reference between symbols
   */
  addReference(
    sourceSymbol: ApexSymbol,
    targetSymbol: ApexSymbol,
    referenceType: ReferenceType,
    location: ReferenceEdge['location'],
    context?: ReferenceEdge['context'],
  ): void {
    // Find the symbol IDs by looking up the symbols in our indexes
    const sourceId = this.findSymbolId(sourceSymbol);
    const targetId = this.findSymbolId(targetSymbol);

    console.log(
      `Adding reference: ${sourceSymbol.name} -> ${targetSymbol.name}`,
    );
    console.log(`Source ID: ${sourceId}, Target ID: ${targetId}`);
    console.log(
      `Source FQN: ${sourceSymbol.fqn}, Target FQN: ${targetSymbol.fqn}`,
    );

    // Handle case where symbols are not found
    if (!sourceId) {
      this.logger.debug(() => `Source symbol not found: ${sourceSymbol.name}`);
      return;
    }

    if (!targetId) {
      // Target symbol not found - add as deferred reference
      // Use the symbol's FQN or name as the key for deferred references
      const deferredKey = targetSymbol.fqn || targetSymbol.name;
      this.logger.debug(() => `Adding deferred reference to: ${deferredKey}`);
      this.addDeferredReference(
        sourceSymbol,
        deferredKey,
        referenceType,
        location,
        context,
      );
      return;
    }

    // Add edge to graphology graph (check if edge already exists)
    const existingEdges = this.referenceGraph.edges(sourceId, targetId);
    console.log(
      `Checking edges from ${sourceId} to ${targetId}: ${existingEdges.length} existing edges`,
    );

    const hasEdge = existingEdges.some((edgeId) => {
      const edge = this.referenceGraph.getEdgeAttributes(edgeId);
      console.log(
        `Existing edge ${edgeId}: type=${edge.type}, checking against ${referenceType}`,
      );
      return edge.type === referenceType;
    });

    console.log(`Has edge: ${hasEdge}`);

    if (!hasEdge) {
      this.referenceGraph.addEdge(sourceId, targetId, {
        type: referenceType,
        sourceFile: sourceSymbol.key.path[0] || 'unknown',
        targetFile: targetSymbol.key.path[0] || 'unknown',
        location,
        context,
      });

      // Update reference count
      const targetNode = this.referenceGraph.getNodeAttributes(targetId);
      targetNode.referenceCount++;
      this.referenceGraph.setNodeAttribute(
        targetId,
        'referenceCount',
        targetNode.referenceCount,
      );
    }

    this.logger.debug(
      () => `Added reference: ${sourceId} -> ${targetId} (${referenceType})`,
    );
  }

  /**
   * Add a deferred reference for lazy loading
   */
  private addDeferredReference(
    sourceSymbol: ApexSymbol,
    targetId: string,
    referenceType: ReferenceType,
    location: ReferenceEdge['location'],
    context?: ReferenceEdge['context'],
  ): void {
    const existing = this.deferredReferences.get(targetId) || [];
    existing.push({
      sourceSymbol,
      referenceType,
      location,
      context,
    });
    this.deferredReferences.set(targetId, existing);

    this.logger.debug(() => `Added deferred reference to: ${targetId}`);
  }

  /**
   * Process deferred references when a symbol is added
   */
  private processDeferredReferences(symbolId: string): void {
    const deferred = this.deferredReferences.get(symbolId);
    if (!deferred) return;

    const targetSymbol = this.symbolIndex.get(symbolId);
    if (!targetSymbol) return;

    for (const ref of deferred) {
      this.addReference(
        ref.sourceSymbol,
        targetSymbol,
        ref.referenceType,
        ref.location,
        ref.context,
      );
    }

    // Clear processed deferred references
    this.deferredReferences.delete(symbolId);
  }

  /**
   * Process deferred references using symbol name or FQN
   */
  private processDeferredReferencesByName(nameOrFqn: string): void {
    const deferred = this.deferredReferences.get(nameOrFqn);
    if (!deferred) return;

    // Find the symbol by name or FQN
    let targetSymbol: ApexSymbol | null = null;

    // Try to find by FQN first
    const symbolId = this.fqnIndex.get(nameOrFqn);
    if (symbolId) {
      targetSymbol = this.symbolIndex.get(symbolId) || null;
    }

    // If not found by FQN, try to find by name
    if (!targetSymbol) {
      const symbolIds = this.nameIndex.get(nameOrFqn) || [];
      if (symbolIds.length > 0) {
        targetSymbol = this.symbolIndex.get(symbolIds[0]) || null;
      }
    }

    if (!targetSymbol) return;

    for (const ref of deferred) {
      this.addReference(
        ref.sourceSymbol,
        targetSymbol!,
        ref.referenceType,
        ref.location,
        ref.context,
      );
    }

    // Clear processed deferred references
    this.deferredReferences.delete(nameOrFqn);
  }

  /**
   * Find all references to a symbol
   */
  findReferencesTo(symbol: ApexSymbol): ReferenceResult[] {
    const symbolId = this.findSymbolId(symbol);
    if (!symbolId || !this.referenceGraph.hasNode(symbolId)) {
      return [];
    }

    const results: ReferenceResult[] = [];
    const incomingEdges = this.referenceGraph.inEdges(symbolId);

    for (const edgeId of incomingEdges) {
      const edge = this.referenceGraph.getEdgeAttributes(edgeId);
      const sourceId = this.referenceGraph.source(edgeId);
      const sourceSymbol = this.symbolIndex.get(sourceId);

      if (sourceSymbol) {
        results.push({
          symbolId: sourceId,
          symbol: sourceSymbol,
          filePath: sourceSymbol.key.path[0] || 'unknown',
          referenceType: edge.type,
          location: edge.location,
          context: edge.context,
        });
      }
    }

    return results;
  }

  /**
   * Find all references from a symbol
   */
  findReferencesFrom(symbol: ApexSymbol): ReferenceResult[] {
    const symbolId = this.findSymbolId(symbol);
    if (!symbolId || !this.referenceGraph.hasNode(symbolId)) {
      return [];
    }

    const results: ReferenceResult[] = [];
    const outgoingEdges = this.referenceGraph.outEdges(symbolId);

    for (const edgeId of outgoingEdges) {
      const edge = this.referenceGraph.getEdgeAttributes(edgeId);
      const targetId = this.referenceGraph.target(edgeId);
      const targetSymbol = this.symbolIndex.get(targetId);

      if (targetSymbol) {
        results.push({
          symbolId: targetId,
          symbol: targetSymbol,
          filePath: targetSymbol.key.path[0] || 'unknown',
          referenceType: edge.type,
          location: edge.location,
          context: edge.context,
        });
      }
    }

    return results;
  }

  /**
   * Get all symbols in a file
   */
  getSymbolsInFile(filePath: string): ApexSymbol[] {
    const symbolIds = this.fileIndex.get(filePath) || [];
    return symbolIds
      .map((id) => this.symbolIndex.get(id))
      .filter(Boolean) as ApexSymbol[];
  }

  /**
   * Get all files containing a symbol
   */
  getFilesForSymbol(symbolName: string): string[] {
    const symbolIds = this.nameIndex.get(symbolName) || [];
    const files = new Set<string>();

    for (const symbolId of symbolIds) {
      // Find which file contains this symbol by checking the file index
      for (const [filePath, fileSymbolIds] of this.fileIndex.entries()) {
        if (fileSymbolIds && fileSymbolIds.includes(symbolId)) {
          files.add(filePath);
          break;
        }
      }
    }

    return Array.from(files);
  }

  /**
   * Lookup symbol by name
   */
  lookupSymbolByName(name: string): ApexSymbol[] {
    const symbolIds = this.nameIndex.get(name) || [];
    return symbolIds
      .map((id) => this.symbolIndex.get(id))
      .filter(Boolean) as ApexSymbol[];
  }

  /**
   * Lookup symbol by FQN
   */
  lookupSymbolByFQN(fqn: string): ApexSymbol | null {
    const symbolId = this.fqnIndex.get(fqn);
    if (!symbolId) return null;

    return this.symbolIndex.get(symbolId) || null;
  }

  /**
   * Analyze dependencies for a symbol
   */
  analyzeDependencies(symbol: ApexSymbol): DependencyAnalysis {
    const symbolId = this.findSymbolId(symbol);
    if (!symbolId || !this.referenceGraph.hasNode(symbolId)) {
      return {
        dependencies: [],
        dependents: [],
        impactScore: 0,
        circularDependencies: [],
      };
    }

    // Find dependencies (what this symbol depends on)
    const dependencies = this.findReferencesFrom(symbol).map(
      (ref) => ref.symbol,
    );

    // Find dependents (what depends on this symbol)
    const dependents = this.findReferencesTo(symbol).map((ref) => ref.symbol);

    // Detect circular dependencies
    const circularDependencies = this.detectCircularDependencies();

    return {
      dependencies,
      dependents,
      impactScore: dependents.length,
      circularDependencies,
    };
  }

  /**
   * Detect circular dependencies in the graph
   */
  detectCircularDependencies(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    this.logger.debug(
      () =>
        `Detecting cycles in graph with ${this.referenceGraph.order} nodes and ${this.referenceGraph.size} edges`,
    );

    for (const node of this.referenceGraph.nodes()) {
      if (!visited.has(node)) {
        this.dfsDetectCycles(node, visited, recursionStack, cycles, []);
      }
    }

    this.logger.debug(() => `Found ${cycles.length} cycles`);
    return cycles;
  }

  /**
   * DFS to detect cycles in the graph
   */
  private dfsDetectCycles(
    node: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    cycles: string[][],
    path: string[],
  ): void {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const outgoingEdges = this.referenceGraph.outEdges(node);
    for (const edgeId of outgoingEdges) {
      const neighbor = this.referenceGraph.target(edgeId);

      if (!visited.has(neighbor)) {
        this.dfsDetectCycles(neighbor, visited, recursionStack, cycles, path);
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycles.push([...cycle]);
      }
    }

    recursionStack.delete(node);
    path.pop();
  }

  /**
   * Get statistics about the graph
   */
  getStats(): {
    totalSymbols: number;
    totalReferences: number;
    totalFiles: number;
    circularDependencies: number;
    deferredReferences: number;
  } {
    return {
      totalSymbols: this.symbolIndex.size,
      totalReferences: this.referenceGraph.size,
      totalFiles: this.fileIndex.size,
      circularDependencies: this.detectCircularDependencies().length,
      deferredReferences: this.deferredReferences.size,
    };
  }

  /**
   * Remove a file's symbols from the graph
   */
  removeFile(filePath: string): void {
    const symbolIds = this.fileIndex.get(filePath) || [];

    for (const symbolId of symbolIds) {
      // Remove from graphology graph
      if (this.referenceGraph.hasNode(symbolId)) {
        this.referenceGraph.dropNode(symbolId);
      }

      // Remove from data-structure-typed indexes
      this.symbolIndex.delete(symbolId);
      this.fqnIndex.delete(symbolId);
    }

    // Update name index
    for (const [name, ids] of this.nameIndex.entries()) {
      if (ids) {
        const filteredIds = ids.filter((id) => !symbolIds.includes(id));
        if (filteredIds.length === 0) {
          this.nameIndex.delete(name);
        } else {
          this.nameIndex.set(name, filteredIds);
        }
      }
    }

    // Remove from file index
    this.fileIndex.delete(filePath);

    this.logger.debug(
      () => `Removed file: ${filePath} with ${symbolIds.length} symbols`,
    );
  }

  /**
   * Clear all symbols from the graph
   */
  clear(): void {
    this.referenceGraph.clear();
    this.symbolIndex.clear();
    this.nameIndex.clear();
    this.fileIndex.clear();
    this.fqnIndex.clear();
    this.deferredReferences.clear();

    this.logger.debug(() => 'Cleared all symbols from graph');
  }

  /**
   * Find the symbol ID for a given symbol by searching through our indexes
   */
  private findSymbolId(symbol: ApexSymbol): string | null {
    console.log(`Finding symbol ID for: ${symbol.name} (FQN: ${symbol.fqn})`);

    // First try to find by FQN
    if (symbol.fqn) {
      const symbolId = this.fqnIndex.get(symbol.fqn);
      if (symbolId) {
        console.log(`Found by FQN: ${symbolId}`);
        return symbolId;
      }
    }

    // If not found by FQN, search by name and match the symbol
    const symbolIds = this.nameIndex.get(symbol.name) || [];
    console.log(`Found ${symbolIds.length} symbols with name: ${symbol.name}`);

    for (const symbolId of symbolIds) {
      const storedSymbol = this.symbolIndex.get(symbolId);
      if (storedSymbol && this.symbolsMatch(storedSymbol, symbol)) {
        console.log(`Found by name match: ${symbolId}`);
        return symbolId;
      }
    }

    console.log(`Symbol not found: ${symbol.name}`);
    return null;
  }

  /**
   * Check if two symbols match (same name, kind, and key path)
   */
  private symbolsMatch(symbol1: ApexSymbol, symbol2: ApexSymbol): boolean {
    return (
      symbol1.name === symbol2.name &&
      symbol1.kind === symbol2.kind &&
      symbol1.key.path.join('.') === symbol2.key.path.join('.')
    );
  }

  /**
   * Generate a unique ID for a symbol
   */
  private getSymbolId(symbol: ApexSymbol, filePath?: string): string {
    const baseId =
      symbol.fqn ||
      `${symbol.kind}:${symbol.name}:${symbol.key.path.join('.')}`;
    // Include file path to ensure uniqueness when symbols have same FQN
    return filePath ? `${baseId}:${filePath}` : baseId;
  }
}
