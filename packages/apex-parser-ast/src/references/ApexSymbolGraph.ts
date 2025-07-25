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
import {
  ApexSymbol,
  createFromSymbol,
  LightweightSymbol,
  toLightweightSymbol,
} from '../types/symbol';

/**
 * Types of references between Apex symbols
 */
export enum ReferenceType {
  METHOD_CALL = 'method-call',
  FIELD_ACCESS = 'field-access',
  TYPE_REFERENCE = 'type-reference',
  INHERITANCE = 'inheritance',
  INTERFACE_IMPLEMENTATION = 'interface-implementation',
  // Phase 5: Extended Relationship Types
  CONSTRUCTOR_CALL = 'constructor-call',
  STATIC_ACCESS = 'static-access',
  INSTANCE_ACCESS = 'instance-access',
  IMPORT_REFERENCE = 'import-reference',
  NAMESPACE_REFERENCE = 'namespace-reference',
  ANNOTATION_REFERENCE = 'annotation-reference',
  TRIGGER_REFERENCE = 'trigger-reference',
  TEST_METHOD_REFERENCE = 'test-method-reference',
  WEBSERVICE_REFERENCE = 'webservice-reference',
  REMOTE_ACTION_REFERENCE = 'remote-action-reference',
  PROPERTY_ACCESS = 'property-access',
  ENUM_REFERENCE = 'enum-reference',
  TRIGGER_CONTEXT_REFERENCE = 'trigger-context-reference',
  SOQL_REFERENCE = 'soql-reference',
  SOSL_REFERENCE = 'sosl-reference',
  DML_REFERENCE = 'dml-reference',
  APEX_PAGE_REFERENCE = 'apex-page-reference',
  COMPONENT_REFERENCE = 'component-reference',
  CUSTOM_METADATA_REFERENCE = 'custom-metadata-reference',
  EXTERNAL_SERVICE_REFERENCE = 'external-service-reference',
  // Phase 6.5: Scope Hierarchy Integration
  SCOPE_PARENT = 'scope-parent',
  SCOPE_CHILD = 'scope-child',
  SCOPE_CONTAINS = 'scope-contains',
}

/**
 * Edge attributes for references between symbols
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
 * PHASE 4: Optimized node attributes for Apex symbols
 * Stores only references instead of full symbol objects for memory efficiency
 */
export interface OptimizedSymbolNode {
  /** Reference to lightweight symbol storage (16 bytes vs 200+ bytes) */
  symbolId: string;
  /** File path where symbol is defined */
  filePath: string;
  /** Last update timestamp */
  lastUpdated: number;
  /** Number of references to this symbol */
  referenceCount: number;
  /** Integer node ID for better performance (4 bytes vs 16-32 bytes) */
  nodeId: number;
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
 * PHASE 4: Graph-based symbol manager with optimized Graphology usage
 * Uses graphology for graph algorithms and data-structure-typed for data storage
 * Optimized for memory efficiency with lightweight node attributes and integer IDs
 */
export class ApexSymbolGraph {
  private readonly logger = getLogger();

  // PHASE 4: Optimized Graphology graph with integer node IDs
  private referenceGraph: Graph<OptimizedSymbolNode, ReferenceEdge> = new Graph(
    {
      type: 'directed',
      allowSelfLoops: false,
      multi: false,
    },
  );

  // PHASE 4: Separate lightweight symbol storage for memory efficiency
  private lightweightSymbols: HashMap<string, LightweightSymbol> =
    new HashMap();

  // PHASE 4: Integer ID mapping for better performance
  private symbolIdToNodeId: HashMap<string, number> = new HashMap();
  private nodeIdToSymbolId: HashMap<number, string> = new HashMap();
  private nextNodeId: number = 1;

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

  // PHASE 4: Memory optimization statistics
  private memoryStats = {
    totalSymbols: 0,
    totalLightweightSymbols: 0,
    totalNodeIds: 0,
    memoryOptimizationLevel: 'OPTIMAL' as string,
    estimatedMemorySavings: 0,
  };

  constructor() {
    this.logger.debug(
      () => 'Initializing ApexSymbolGraph with Phase 4 optimizations',
    );
  }

  /**
   * PHASE 4: Add a symbol to the graph with optimized memory usage
   */
  addSymbol(symbol: ApexSymbol, filePath: string): void {
    const symbolId = this.getSymbolId(symbol, filePath);

    // Check if symbol already exists to prevent duplicates
    if (this.symbolIndex.has(symbolId)) {
      this.logger.debug(
        () => `Symbol already exists: ${symbolId}, skipping duplicate addition`,
      );
      return;
    }

    // PHASE 4: Create lightweight symbol for memory efficiency
    const lightweightSymbol = toLightweightSymbol(symbol, filePath);
    this.lightweightSymbols.set(symbolId, lightweightSymbol);

    // PHASE 4: Generate integer node ID for better performance
    const nodeId = this.nextNodeId++;
    this.symbolIdToNodeId.set(symbolId, nodeId);
    this.nodeIdToSymbolId.set(nodeId, symbolId);

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

    // PHASE 4: Add to graphology graph with optimized node attributes
    if (!this.referenceGraph.hasNode(nodeId)) {
      this.referenceGraph.addNode(nodeId, {
        symbolId, // Reference to separate storage (16 bytes)
        filePath, // String (50-100 bytes)
        lastUpdated: Date.now(), // Number (8 bytes)
        referenceCount: 0, // Number (8 bytes)
        nodeId, // Integer ID (4 bytes)
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

    // Update memory statistics
    this.memoryStats.totalSymbols++;
    this.memoryStats.totalLightweightSymbols++;
    this.memoryStats.totalNodeIds++;
    this.updateMemoryOptimizationStats();

    this.logger.debug(
      () => `Added symbol: ${symbolId} (nodeId: ${nodeId}) from ${filePath}`,
    );
  }

  /**
   * PHASE 4: Add a reference between symbols with optimized node lookup
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

    // PHASE 4: Get integer node IDs for better performance
    const sourceNodeId = this.symbolIdToNodeId.get(sourceId);
    const targetNodeId = this.symbolIdToNodeId.get(targetId);

    if (!sourceNodeId || !targetNodeId) {
      this.logger.debug(
        () => `Node IDs not found for symbols: ${sourceId}, ${targetId}`,
      );
      return;
    }

    // Add edge to graphology graph (check if edge already exists)
    // Use outEdges to get only edges going FROM sourceNodeId TO targetNodeId
    const existingEdges = this.referenceGraph
      .outEdges(sourceNodeId)
      .filter((edgeId) => this.referenceGraph.target(edgeId) === targetNodeId);

    const hasEdge = existingEdges.some((edgeId) => {
      const edge = this.referenceGraph.getEdgeAttributes(edgeId);
      return edge.type === referenceType;
    });

    if (!hasEdge) {
      this.referenceGraph.addEdge(sourceNodeId, targetNodeId, {
        type: referenceType,
        sourceFile: sourceSymbol.key.path[0] || 'unknown',
        targetFile: targetSymbol.key.path[0] || 'unknown',
        location,
        context,
      });

      // PHASE 4: Update reference count using optimized node attributes
      const targetNode = this.referenceGraph.getNodeAttributes(targetNodeId);
      targetNode.referenceCount++;
      this.referenceGraph.setNodeAttribute(
        targetNodeId,
        'referenceCount',
        targetNode.referenceCount,
      );
    }
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
    const nodeId = this.symbolIdToNodeId.get(symbolId);
    if (!symbolId || !nodeId || !this.referenceGraph.hasNode(nodeId)) {
      return [];
    }

    const results: ReferenceResult[] = [];
    const incomingEdges = this.referenceGraph.inEdges(nodeId);

    for (const edgeId of incomingEdges) {
      const edge = this.referenceGraph.getEdgeAttributes(edgeId);
      const sourceNodeId = this.referenceGraph.source(edgeId);
      const sourceSymbolId = this.nodeIdToSymbolId.get(sourceNodeId);
      const sourceSymbol = sourceSymbolId
        ? this.symbolIndex.get(sourceSymbolId)
        : null;

      if (sourceSymbol) {
        results.push({
          symbolId: sourceSymbolId!,
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
    const nodeId = this.symbolIdToNodeId.get(symbolId);
    if (!symbolId || !nodeId || !this.referenceGraph.hasNode(nodeId)) {
      return [];
    }

    const results: ReferenceResult[] = [];
    const outgoingEdges = this.referenceGraph.outEdges(nodeId);

    for (const edgeId of outgoingEdges) {
      const edge = this.referenceGraph.getEdgeAttributes(edgeId);
      const targetNodeId = this.referenceGraph.target(edgeId);
      const targetSymbolId = this.nodeIdToSymbolId.get(targetNodeId);
      const targetSymbol = targetSymbolId
        ? this.symbolIndex.get(targetSymbolId)
        : null;

      if (targetSymbol) {
        results.push({
          symbolId: targetSymbolId!,
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
    const nodeId = this.symbolIdToNodeId.get(symbolId);
    if (!symbolId || !nodeId || !this.referenceGraph.hasNode(nodeId)) {
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
    const visited = new Set<number>();
    const recursionStack = new Set<number>();

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
    node: number,
    visited: Set<number>,
    recursionStack: Set<number>,
    cycles: string[][],
    path: number[],
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
        // Found a cycle - convert node IDs back to symbol IDs
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        const symbolCycle = cycle.map(
          (nodeId) => this.nodeIdToSymbolId.get(nodeId) || `unknown-${nodeId}`,
        );
        cycles.push(symbolCycle);
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
   * PHASE 4: Update memory optimization statistics
   */
  private updateMemoryOptimizationStats(): void {
    const currentTotalMemory =
      this.symbolIndex.size * 200 + this.referenceGraph.size * 20; // Rough estimate
    const newTotalMemory =
      this.lightweightSymbols.size * 16 + this.referenceGraph.size * 20; // Rough estimate
    const estimatedSavings = currentTotalMemory - newTotalMemory;

    this.memoryStats.memoryOptimizationLevel =
      estimatedSavings > 1000000
        ? 'HIGH'
        : estimatedSavings > 100000
          ? 'MEDIUM'
          : 'OPTIMAL';
    this.memoryStats.estimatedMemorySavings = estimatedSavings;
  }

  /**
   * Remove a file's symbols from the graph
   */
  removeFile(filePath: string): void {
    const symbolIds = this.fileIndex.get(filePath) || [];

    for (const symbolId of symbolIds) {
      // Remove from graphology graph
      const nodeId = this.symbolIdToNodeId.get(symbolId);
      if (nodeId && this.referenceGraph.hasNode(nodeId)) {
        this.referenceGraph.dropNode(nodeId);
      }

      // Remove from data-structure-typed indexes
      this.symbolIndex.delete(symbolId);
      this.fqnIndex.delete(symbolId);
      this.lightweightSymbols.delete(symbolId); // Remove lightweight symbol
      this.symbolIdToNodeId.delete(symbolId); // Remove node ID mapping
      this.nodeIdToSymbolId.delete(this.symbolIdToNodeId.get(symbolId)!); // Remove reverse mapping

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
    }

    // Update file index
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
    this.lightweightSymbols.clear();
    this.symbolIdToNodeId.clear();
    this.nodeIdToSymbolId.clear();
    this.nextNodeId = 1;

    this.logger.debug(() => 'Cleared all symbols from graph');
  }

  /**
   * Find the symbol ID for a given symbol by searching through our indexes
   */
  private findSymbolId(symbol: ApexSymbol): string | null {
    // First try to find by FQN
    if (symbol.fqn) {
      const symbolId = this.fqnIndex.get(symbol.fqn);
      if (symbolId) {
        return symbolId;
      }
    }

    // If not found by FQN, search by name and match the symbol
    const symbolIds = this.nameIndex.get(symbol.name) || [];

    for (const symbolId of symbolIds) {
      const storedSymbol = this.symbolIndex.get(symbolId);
      if (storedSymbol && this.symbolsMatch(storedSymbol, symbol)) {
        return symbolId;
      }
    }

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
   * Updated for Phase 6.5.2: Symbol Key System Unification
   */
  private getSymbolId(symbol: ApexSymbol, filePath?: string): string {
    // Use unified key system if available, fallback to legacy method
    if (symbol.key.unifiedId) {
      return symbol.key.unifiedId;
    }

    // Generate unified ID and cache it
    const unifiedKey = createFromSymbol(symbol, filePath);
    symbol.key = unifiedKey;

    return unifiedKey.unifiedId!;
  }
}
