/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap, DirectedGraph, DirectedVertex } from 'data-structure-typed';
import {
  getLogger,
  type EnumValue,
  CompactLocation,
  toCompactLocation,
  fromCompactLocation,
  Uint16,
  toUint16,
} from '@salesforce/apex-lsp-shared';

import { ApexSymbol, SymbolTable } from '../types/symbol';

/**
 * Context for symbol resolution
 */
export interface ResolutionContext {
  sourceFile?: string;
  expectedNamespace?: string;
  currentScope?: string;
  isStatic?: boolean;
}

/**
 * Result of a symbol lookup with confidence scoring
 */
export interface SymbolLookupResult {
  symbol: ApexSymbol;
  filePath: string;
  confidence: number;
  isAmbiguous: boolean;
  candidates?: Array<{
    symbol: ApexSymbol;
    filePath: string;
    symbolTable: SymbolTable;
    lastUpdated: number;
  }>;
}

/**
 * Types of references between Apex symbols
 * Using optimized numeric values for memory efficiency
 */
export const ReferenceType = {
  METHOD_CALL: 1,
  FIELD_ACCESS: 2,
  TYPE_REFERENCE: 3,
  INHERITANCE: 4,
  INTERFACE_IMPLEMENTATION: 5,
  // Phase 5: Extended Relationship Types
  CONSTRUCTOR_CALL: 6,
  STATIC_ACCESS: 7,
  INSTANCE_ACCESS: 8,
  IMPORT_REFERENCE: 9,
  NAMESPACE_REFERENCE: 10,
  ANNOTATION_REFERENCE: 11,
  TRIGGER_REFERENCE: 12,
  TEST_METHOD_REFERENCE: 13,
  WEBSERVICE_REFERENCE: 14,
  REMOTE_ACTION_REFERENCE: 15,
  PROPERTY_ACCESS: 16,
  ENUM_REFERENCE: 17,
  TRIGGER_CONTEXT_REFERENCE: 18,
  SOQL_REFERENCE: 19,
  SOSL_REFERENCE: 20,
  DML_REFERENCE: 21,
  APEX_PAGE_REFERENCE: 22,
  COMPONENT_REFERENCE: 23,
  CUSTOM_METADATA_REFERENCE: 24,
  EXTERNAL_SERVICE_REFERENCE: 25,
} as const;

/**
 * Reference edge between symbols with metadata
 * Optimized using smallNumericTypes for memory efficiency
 * Provides 75% memory reduction for location and numeric fields
 */
export interface ReferenceEdge {
  type: EnumValue<typeof ReferenceType>;
  sourceFile: string;
  targetFile: string;
  location: CompactLocation; // 8 bytes vs 32 bytes (75% reduction)
  context?: {
    methodName?: string;
    parameterIndex?: Uint16; // 2 bytes vs 8 bytes (75% reduction)
    isStatic?: boolean;
    namespace?: string;
  };
}

/**
 * Convert legacy edge format to optimized ReferenceEdge
 */
export const toReferenceEdge = (legacyEdge: {
  type: EnumValue<typeof ReferenceType>;
  sourceFile: string;
  targetFile: string;
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
}): ReferenceEdge => ({
  type: legacyEdge.type,
  sourceFile: legacyEdge.sourceFile,
  targetFile: legacyEdge.targetFile,
  location: toCompactLocation(legacyEdge.location),
  context: legacyEdge.context
    ? {
        methodName: legacyEdge.context.methodName,
        parameterIndex: legacyEdge.context.parameterIndex
          ? toUint16(legacyEdge.context.parameterIndex)
          : undefined,
        isStatic: legacyEdge.context.isStatic,
        namespace: legacyEdge.context.namespace,
      }
    : undefined,
});

/**
 * Convert optimized ReferenceEdge back to legacy format
 */
export const fromReferenceEdge = (
  edge: ReferenceEdge,
): {
  type: EnumValue<typeof ReferenceType>;
  sourceFile: string;
  targetFile: string;
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
} => ({
  type: edge.type,
  sourceFile: edge.sourceFile,
  targetFile: edge.targetFile,
  location: fromCompactLocation(edge.location),
  context: edge.context
    ? {
        methodName: edge.context.methodName,
        parameterIndex: edge.context.parameterIndex
          ? Number(edge.context.parameterIndex)
          : undefined,
        isStatic: edge.context.isStatic,
        namespace: edge.context.namespace,
      }
    : undefined,
});

/**
 * Result of a reference query
 */
export interface ReferenceResult {
  symbolId: string;
  symbol: ApexSymbol;
  filePath: string;
  referenceType: EnumValue<typeof ReferenceType>;
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
 * Analysis of dependencies for a symbol
 */
export interface DependencyAnalysis {
  dependencies: ApexSymbol[];
  dependents: ApexSymbol[];
  impactScore: number;
  circularDependencies: string[][];
}

/**
 * Lightweight node for graph storage - only contains references
 */
export interface ReferenceNode {
  symbolId: string;
  filePath: string;
  lastUpdated: number;
  referenceCount: number;
  nodeId: number;
}

/**
 * OPTIMIZED: ApexSymbolGraph with SymbolTable as primary storage
 * Eliminates duplicate symbol storage and delegates to SymbolTable
 */
export class ApexSymbolGraph {
  private readonly logger = getLogger();

  // OPTIMIZED: Only store references, not full symbols
  private referenceGraph: DirectedGraph<ReferenceNode, ReferenceEdge> =
    new DirectedGraph();

  // OPTIMIZED: Track symbol existence only
  private symbolIds: Set<string> = new Set();

  // Symbol to vertex mapping for efficient lookups
  private symbolToVertex: HashMap<string, DirectedVertex<ReferenceNode>> =
    new HashMap();

  // OPTIMIZED: Indexes for fast lookups (delegate to SymbolTable for actual data)
  private symbolFileMap: HashMap<string, string> = new HashMap(); // Map symbol ID to file path
  private nameIndex: HashMap<string, string[]> = new HashMap();
  private fileIndex: HashMap<string, string[]> = new HashMap();
  private fqnIndex: HashMap<string, string> = new HashMap();

  // OPTIMIZED: SymbolTable references for delegation
  private fileToSymbolTable: HashMap<string, SymbolTable> = new HashMap();
  private symbolToFiles: HashMap<string, string[]> = new HashMap();

  // Deferred references for lazy loading
  private deferredReferences: HashMap<
    string,
    Array<{
      sourceSymbol: ApexSymbol;
      referenceType: EnumValue<typeof ReferenceType>;
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
    }>
  > = new HashMap();

  private memoryStats = {
    totalSymbols: 0,
    totalVertices: 0,
    totalEdges: 0,
    memoryOptimizationLevel: 'OPTIMIZED',
    estimatedMemorySavings: 0,
  };

  constructor() {
    this.logger.debug(
      () => 'ApexSymbolGraph initialized with optimized architecture',
    );
  }

  /**
   * OPTIMIZED: Add symbol reference only - delegate storage to SymbolTable
   */
  addSymbol(
    symbol: ApexSymbol,
    filePath: string,
    symbolTable?: SymbolTable,
  ): void {
    const symbolId = this.getSymbolId(symbol, filePath);

    // Check if symbol already exists to prevent duplicates
    if (this.symbolIds.has(symbolId)) {
      this.logger.debug(
        () => `Symbol already exists: ${symbolId}, skipping duplicate addition`,
      );
      return;
    }

    // OPTIMIZED: Register SymbolTable immediately for delegation
    if (symbolTable) {
      this.registerSymbolTable(symbolTable, filePath);
    }

    // OPTIMIZED: Only track existence, don't store full symbol
    this.symbolIds.add(symbolId);

    // Add to indexes for fast lookups
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

    // OPTIMIZED: Add lightweight node to graph
    const referenceNode: ReferenceNode = {
      symbolId,
      filePath,
      lastUpdated: Date.now(),
      referenceCount: 0,
      nodeId: this.memoryStats.totalVertices + 1,
    };

    // Add vertex to graph
    const vertexAdded = this.referenceGraph.addVertex(symbolId, referenceNode);
    if (!vertexAdded) {
      this.logger.warn(() => `Failed to add vertex to graph: ${symbolId}`);
      return;
    }

    // Get the vertex from the graph
    const vertex = this.referenceGraph.getVertex(symbolId);
    if (!vertex) {
      this.logger.warn(
        () => `Vertex not found in graph after adding: ${symbolId}`,
      );
      return;
    }

    this.symbolToVertex.set(symbolId, vertex);
    this.logger.debug(() => `Added reference node to graph: ${symbolId}`);

    // Update memory statistics
    this.memoryStats.totalSymbols++;
    this.memoryStats.totalVertices++;

    // Process any deferred references to this symbol
    this.processDeferredReferences(symbolId);
  }

  /**
   * OPTIMIZED: Get symbol by delegating to SymbolTable
   */
  getSymbol(symbolId: string): ApexSymbol | null {
    const filePath = this.symbolFileMap.get(symbolId);
    if (!filePath) {
      this.logger.debug(() => `No file path found for symbol ID: ${symbolId}`);
      return null;
    }

    const symbolTable = this.fileToSymbolTable.get(filePath);
    if (!symbolTable) {
      this.logger.debug(() => `No SymbolTable found for file: ${filePath}`);
      return null;
    }

    // OPTIMIZED: Delegate to SymbolTable for actual symbol data
    const symbolName = symbolId.split(':').pop() || '';
    const symbol = symbolTable.lookup(symbolName);

    if (!symbol) {
      this.logger.debug(
        () => `Symbol not found in SymbolTable: ${symbolName} in ${filePath}`,
      );
      return null;
    }

    return symbol;
  }

  /**
   * OPTIMIZED: Find symbols by name by delegating to SymbolTable
   */
  findSymbolByName(name: string): ApexSymbol[] {
    const symbolIds = this.nameIndex.get(name) || [];
    const symbols: ApexSymbol[] = [];

    for (const symbolId of symbolIds) {
      const symbol = this.getSymbol(symbolId);
      if (symbol) {
        symbols.push(symbol);
      }
    }

    return symbols;
  }

  /**
   * OPTIMIZED: Find symbol by FQN by delegating to SymbolTable
   */
  findSymbolByFQN(fqn: string): ApexSymbol | null {
    const symbolId = this.fqnIndex.get(fqn);
    if (!symbolId) {
      return null;
    }

    return this.getSymbol(symbolId);
  }

  /**
   * OPTIMIZED: Get symbols in file by delegating to SymbolTable
   */
  getSymbolsInFile(filePath: string): ApexSymbol[] {
    const symbolIds = this.fileIndex.get(filePath) || [];
    const symbols: ApexSymbol[] = [];

    for (const symbolId of symbolIds) {
      const symbol = this.getSymbol(symbolId);
      if (symbol) {
        symbols.push(symbol);
      }
    }

    return symbols;
  }

  /**
   * OPTIMIZED: Add reference between symbols using IDs only
   */
  addReference(
    sourceSymbol: ApexSymbol,
    targetSymbol: ApexSymbol,
    referenceType: EnumValue<typeof ReferenceType>,
    location: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    },
    context?: {
      methodName?: string;
      parameterIndex?: number;
      isStatic?: boolean;
      namespace?: string;
    },
  ): void {
    const sourceId = this.getSymbolId(sourceSymbol, sourceSymbol.filePath);
    const targetId = this.getSymbolId(targetSymbol, targetSymbol.filePath);

    // Check if both symbols exist in the graph
    if (!this.symbolIds.has(sourceId) || !this.symbolIds.has(targetId)) {
      this.logger.warn(
        () =>
          `Cannot add reference: source or target symbol not found. Source: ${sourceId}, Target: ${targetId}`,
      );
      return;
    }

    // Create optimized reference edge
    const referenceEdge: ReferenceEdge = {
      type: referenceType,
      sourceFile: sourceSymbol.filePath,
      targetFile: targetSymbol.filePath,
      location: toCompactLocation(location),
      context: context
        ? {
            methodName: context.methodName,
            parameterIndex: context.parameterIndex
              ? toUint16(context.parameterIndex)
              : undefined,
            isStatic: context.isStatic,
            namespace: context.namespace,
          }
        : undefined,
    };

    // Add edge to graph
    const edgeAdded = this.referenceGraph.addEdge(
      sourceId,
      targetId,
      1,
      referenceEdge,
    );
    if (!edgeAdded) {
      this.logger.warn(
        () => `Failed to add reference edge: ${sourceId} -> ${targetId}`,
      );
      return;
    }

    // Update reference count
    const targetVertex = this.symbolToVertex.get(targetId);
    if (targetVertex && targetVertex.value) {
      targetVertex.value.referenceCount++;
    }

    this.memoryStats.totalEdges++;
    this.logger.debug(
      () =>
        `Added reference: ${sourceId} -> ${targetId} (${String(referenceType)})`,
    );
  }

  /**
   * OPTIMIZED: Find references to a symbol
   */
  findReferencesTo(symbol: ApexSymbol): ReferenceResult[] {
    const targetId = this.getSymbolId(symbol, symbol.filePath);
    const results: ReferenceResult[] = [];

    // Get incoming edges from the graph
    const vertex = this.symbolToVertex.get(targetId);
    if (!vertex) {
      return results;
    }
    const incomingEdges = this.referenceGraph.incomingEdgesOf(vertex.key);

    for (const edge of incomingEdges) {
      if (!edge.value) continue;

      const sourceSymbol = this.getSymbol(String(edge.src));
      if (!sourceSymbol) {
        continue;
      }

      const referenceResult: ReferenceResult = {
        symbolId: String(edge.src),
        symbol: sourceSymbol,
        filePath: sourceSymbol.filePath,
        referenceType: edge.value.type,
        location: fromCompactLocation(edge.value.location),
        context: edge.value.context
          ? {
              methodName: edge.value.context.methodName,
              parameterIndex: edge.value.context.parameterIndex
                ? Number(edge.value.context.parameterIndex)
                : undefined,
              isStatic: edge.value.context.isStatic,
              namespace: edge.value.context.namespace,
            }
          : undefined,
      };

      results.push(referenceResult);
    }

    return results;
  }

  /**
   * OPTIMIZED: Find references from a symbol
   */
  findReferencesFrom(symbol: ApexSymbol): ReferenceResult[] {
    const sourceId = this.getSymbolId(symbol, symbol.filePath);
    const results: ReferenceResult[] = [];

    // Get outgoing edges from the graph
    const vertex = this.symbolToVertex.get(sourceId);
    if (!vertex) {
      return results;
    }
    const outgoingEdges = this.referenceGraph.outgoingEdgesOf(vertex.key);

    for (const edge of outgoingEdges) {
      if (!edge.value) continue;

      const targetSymbol = this.getSymbol(String(edge.dest));
      if (!targetSymbol) {
        continue;
      }

      const referenceResult: ReferenceResult = {
        symbolId: String(edge.dest),
        symbol: targetSymbol,
        filePath: targetSymbol.filePath,
        referenceType: edge.value.type,
        location: fromCompactLocation(edge.value.location),
        context: edge.value.context
          ? {
              methodName: edge.value.context.methodName,
              parameterIndex: edge.value.context.parameterIndex
                ? Number(edge.value.context.parameterIndex)
                : undefined,
              isStatic: edge.value.context.isStatic,
              namespace: edge.value.context.namespace,
            }
          : undefined,
      };

      results.push(referenceResult);
    }

    return results;
  }

  /**
   * Detect circular dependencies using graph algorithms
   */
  detectCircularDependencies(): string[][] {
    // Implementation would use graph cycle detection algorithms
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * OPTIMIZED: Analyze dependencies by delegating to SymbolTable for symbol data
   */
  analyzeDependencies(symbol: ApexSymbol): DependencyAnalysis {
    const dependencies: ApexSymbol[] = [];
    const dependents: ApexSymbol[] = [];

    // Get references from this symbol (dependencies)
    const referencesFrom = this.findReferencesFrom(symbol);
    for (const ref of referencesFrom) {
      dependencies.push(ref.symbol);
    }

    // Get references to this symbol (dependents)
    const referencesTo = this.findReferencesTo(symbol);
    for (const ref of referencesTo) {
      dependents.push(ref.symbol);
    }

    const impactScore = this.calculateImpactScore(dependents, dependencies);
    const circularDependencies = this.detectCircularDependencies();

    return {
      dependencies,
      dependents,
      impactScore,
      circularDependencies,
    };
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    return {
      ...this.memoryStats,
      estimatedMemorySavings: this.calculateMemorySavings(),
    };
  }

  /**
   * Get overall statistics
   */
  getStats() {
    return {
      totalSymbols: this.memoryStats.totalSymbols,
      totalFiles: this.fileToSymbolTable.size,
      totalReferences: this.memoryStats.totalEdges,
      circularDependencies: this.detectCircularDependencies().length,
      cacheHitRate: 0, // Not applicable in optimized architecture
    };
  }

  /**
   * OPTIMIZED: Lookup symbol by name with context
   */
  lookupSymbolWithContext(
    symbolName: string,
    context?: ResolutionContext,
  ): SymbolLookupResult | null {
    const symbolIds = this.nameIndex.get(symbolName) || [];

    if (symbolIds.length === 0) {
      return null;
    }

    // Get all symbols with this name by delegating to SymbolTable
    const candidates = symbolIds
      .map((id) => {
        const symbol = this.getSymbol(id);
        const filePath = this.symbolFileMap.get(id);
        const symbolTable = filePath
          ? this.fileToSymbolTable.get(filePath)
          : undefined;

        if (!symbol || !filePath || !symbolTable) return null;

        return {
          symbol,
          filePath,
          symbolTable,
          lastUpdated: Date.now(),
        };
      })
      .filter(
        (candidate): candidate is NonNullable<typeof candidate> =>
          candidate !== null,
      );

    if (candidates.length === 0) {
      return null;
    }

    if (candidates.length === 1) {
      // Unambiguous symbol
      const candidate = candidates[0];
      return {
        symbol: candidate.symbol,
        filePath: candidate.filePath,
        confidence: 1.0,
        isAmbiguous: false,
      };
    }

    // Ambiguous symbol - resolve using context
    const resolved = this.resolveAmbiguousSymbol(
      symbolName,
      candidates,
      context,
    );
    return {
      symbol: resolved.symbol,
      filePath: resolved.filePath,
      confidence: resolved.confidence,
      isAmbiguous: true,
      candidates,
    };
  }

  /**
   * Get SymbolTable for a file
   */
  getSymbolTableForFile(filePath: string): SymbolTable | undefined {
    return this.fileToSymbolTable.get(filePath);
  }

  /**
   * Register SymbolTable for a file
   */
  registerSymbolTable(symbolTable: SymbolTable, filePath: string): void {
    this.fileToSymbolTable.set(filePath, symbolTable);

    // Update symbol to files mapping
    const symbols = this.getSymbolsInFile(filePath);
    for (const symbol of symbols) {
      const symbolKey = this.getSymbolKey(symbol);
      const existingFiles = this.symbolToFiles.get(symbolKey) || [];
      if (!existingFiles.includes(filePath)) {
        existingFiles.push(filePath);
        this.symbolToFiles.set(symbolKey, existingFiles);
      }
    }
  }

  /**
   * Resolve ambiguous symbol using context
   */
  private resolveAmbiguousSymbol(
    symbolName: string,
    candidates: Array<{
      symbol: ApexSymbol;
      filePath: string;
      symbolTable: SymbolTable;
      lastUpdated: number;
    }>,
    context?: ResolutionContext,
  ): { symbol: ApexSymbol; filePath: string; confidence: number } {
    // If no context provided, return first candidate with medium confidence
    if (!context) {
      const candidate = candidates[0];
      return {
        symbol: candidate.symbol,
        filePath: candidate.filePath,
        confidence: 0.5,
      };
    }

    // Try to match by source file first
    if (context.sourceFile) {
      const fileMatch = candidates.find(
        (c) => c.filePath === context.sourceFile,
      );
      if (fileMatch) {
        return {
          symbol: fileMatch.symbol,
          filePath: fileMatch.filePath,
          confidence: 0.8,
        };
      }
    }

    // Try to match by scope if provided
    if (context.currentScope) {
      // For now, return first candidate with scope context
      // This can be enhanced with actual scope hierarchy matching
      const candidate = candidates[0];
      return {
        symbol: candidate.symbol,
        filePath: candidate.filePath,
        confidence: 0.7,
      };
    }

    // Default: return first candidate with medium confidence
    const candidate = candidates[0];
    return {
      symbol: candidate.symbol,
      filePath: candidate.filePath,
      confidence: 0.5,
    };
  }

  /**
   * Generate a unique key for a symbol
   */
  private getSymbolKey(symbol: ApexSymbol): string {
    return `${symbol.kind}:${symbol.name}`;
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.referenceGraph.clear();
    this.symbolIds.clear();
    this.symbolToVertex.clear();
    this.symbolFileMap.clear();
    this.nameIndex.clear();
    this.fileIndex.clear();
    this.fqnIndex.clear();
    this.deferredReferences.clear();

    // Clear SymbolTable references
    this.fileToSymbolTable.clear();
    this.symbolToFiles.clear();

    this.memoryStats = {
      totalSymbols: 0,
      totalVertices: 0,
      totalEdges: 0,
      memoryOptimizationLevel: 'OPTIMIZED',
      estimatedMemorySavings: 0,
    };
  }

  /**
   * Remove a file's symbols from the graph
   */
  removeFile(filePath: string): void {
    const symbolIds = this.fileIndex.get(filePath) || [];

    for (const symbolId of symbolIds) {
      // Remove from graph
      const vertex = this.symbolToVertex.get(symbolId);
      if (vertex) {
        this.referenceGraph.deleteVertex(vertex);
        this.memoryStats.totalVertices--;
      }

      // Remove from indexes
      this.symbolFileMap.delete(symbolId);
      this.fqnIndex.delete(symbolId);
      this.symbolIds.delete(symbolId);
      this.symbolToVertex.delete(symbolId);

      // Update name index
      for (const [name, ids] of this.nameIndex.entries()) {
        if (ids) {
          const filteredIds = ids.filter((id) => id !== symbolId);
          if (filteredIds.length === 0) {
            this.nameIndex.delete(name);
          } else {
            this.nameIndex.set(name, filteredIds);
          }
        }
      }
    }

    // Remove from file index
    this.fileIndex.delete(filePath);

    // Remove SymbolTable reference
    this.fileToSymbolTable.delete(filePath);

    this.memoryStats.totalSymbols -= symbolIds.length;
  }

  /**
   * Generate a unique symbol ID
   */
  private getSymbolId(symbol: ApexSymbol, filePath: string): string {
    return `${filePath}:${symbol.name}`;
  }

  /**
   * Find symbol ID for a symbol
   */
  private findSymbolId(symbol: ApexSymbol): string | null {
    const filePath = symbol.filePath;
    const symbolId = this.getSymbolId(symbol, filePath);
    return this.symbolIds.has(symbolId) ? symbolId : null;
  }

  /**
   * Add a deferred reference
   */
  private addDeferredReference(
    sourceSymbol: ApexSymbol,
    targetKey: string,
    referenceType: EnumValue<typeof ReferenceType>,
    location: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    },
    context?: {
      methodName?: string;
      parameterIndex?: number;
      isStatic?: boolean;
      namespace?: string;
    },
  ): void {
    const existing = this.deferredReferences.get(targetKey) || [];
    existing.push({
      sourceSymbol,
      referenceType,
      location,
      context,
    });
    this.deferredReferences.set(targetKey, existing);
  }

  /**
   * Process deferred references for a symbol
   */
  private processDeferredReferences(symbolId: string): void {
    const deferred = this.deferredReferences.get(symbolId);
    if (!deferred) {
      return;
    }

    const targetSymbol = this.getSymbol(symbolId);
    if (!targetSymbol) {
      return;
    }

    for (const ref of deferred) {
      this.addReference(
        ref.sourceSymbol,
        targetSymbol,
        ref.referenceType,
        ref.location,
        ref.context,
      );
    }

    this.deferredReferences.delete(symbolId);
  }

  /**
   * Calculate impact score for dependency analysis
   */
  private calculateImpactScore(
    dependents: ApexSymbol[],
    dependencies: ApexSymbol[],
  ): number {
    const dependentCount = dependents.length;
    const dependencyCount = dependencies.length;

    // Simple impact calculation - can be enhanced
    return dependentCount * 2 + dependencyCount;
  }

  /**
   * Calculate estimated memory savings
   */
  private calculateMemorySavings(): number {
    // Estimate memory savings from not storing full symbols
    const estimatedSymbolSize = 500; // bytes per symbol
    const savedBytes = this.memoryStats.totalSymbols * estimatedSymbolSize;
    return savedBytes;
  }
}
