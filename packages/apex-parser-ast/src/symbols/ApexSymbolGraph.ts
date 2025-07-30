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

import {
  ApexSymbol,
  SymbolTable,
  SymbolKind,
  SymbolVisibility,
} from '../types/symbol';
import { calculateFQN } from '../utils/FQNUtils';

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

  // OPTIMIZED: Simple cache for frequently accessed symbols
  private symbolCache: HashMap<string, ApexSymbol[]> = new HashMap();
  private cacheSize = 0;
  private readonly MAX_CACHE_SIZE = 1000;

  // Deferred references for lazy loading - keyed by symbol name instead of symbol ID
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
    memoryOptimizationLevel: 'OPTIMAL',
    estimatedMemorySavings: 0,
  };

  constructor() {
    this.logger.debug(
      () => 'ApexSymbolGraph initialized with optimal architecture',
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
    } else {
      // For backward compatibility, create a minimal SymbolTable if none provided
      // This ensures the symbol can be found later
      this.ensureSymbolTableForFile(filePath);
    }

    // OPTIMIZED: Only track existence, don't store full symbol
    this.symbolIds.add(symbolId);

    // Add to indexes for fast lookups
    this.symbolFileMap.set(symbolId, filePath);

    // BUG FIX: Calculate and store FQN if not already present
    if (!symbol.fqn) {
      symbol.fqn = calculateFQN(symbol);
      this.logger.debug(
        () => `Calculated FQN for ${symbol.name}: ${symbol.fqn}`,
      );
    }

    if (symbol.fqn) {
      this.fqnIndex.set(symbol.fqn, symbolId);
    }

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

    // Invalidate cache for this symbol name (cache might become stale)
    this.symbolCache.delete(symbol.name);

    // Process any deferred references for this symbol
    // Only process if there are actually deferred references to avoid unnecessary work
    if (this.deferredReferences.has(symbol.name)) {
      this.processDeferredReferences(symbol.name);
    }
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
    if (symbolTable) {
      // OPTIMIZED: Delegate to SymbolTable for actual symbol data
      const symbolName = symbolId.split(':').pop() || '';
      const symbol = symbolTable.lookup(symbolName);

      if (symbol) {
        // Ensure the symbol has the correct filePath property
        if (!symbol.filePath || symbol.filePath !== filePath) {
          symbol.filePath = filePath;
        }
        return symbol;
      }
    }

    // Fallback: Try to reconstruct symbol from stored data
    // This is for backward compatibility when SymbolTables aren't available
    const symbolName = symbolId.split(':').pop() || '';

    // Find the FQN by looking up the symbolId in the fqnIndex values
    let fqn = symbolName; // Default to symbol name
    for (const [fqnKey, id] of this.fqnIndex.entries()) {
      if (id === symbolId) {
        fqn = fqnKey;
        break;
      }
    }

    // Create a minimal symbol representation using SymbolFactory
    const fallbackSymbol: ApexSymbol = {
      id: symbolId,
      name: symbolName,
      kind: SymbolKind.Class, // Default to class as fallback
      location: {
        startLine: 0,
        startColumn: 0,
        endLine: 0,
        endColumn: 0,
      },
      filePath: filePath,
      parentId: null,
      key: {
        prefix: 'class',
        name: symbolName,
        path: [filePath, symbolName],
        unifiedId: symbolId,
        filePath: filePath,
        kind: SymbolKind.Class,
      },
      parentKey: null,
      fqn: fqn,
      _modifierFlags: 0,
      _isLoaded: true,
      modifiers: {
        visibility: SymbolVisibility.Public,
        isStatic: false,
        isFinal: false,
        isAbstract: false,
        isVirtual: false,
        isOverride: false,
        isTransient: false,
        isTestMethod: false,
        isWebService: false,
        isBuiltIn: false,
      },
      parent: null,
    };

    this.logger.debug(() => `Returning fallback symbol for: ${symbolId}`);
    return fallbackSymbol;
  }

  /**
   * OPTIMIZED: Find symbols by name by delegating to SymbolTable
   */
  findSymbolByName(name: string): ApexSymbol[] {
    // Check cache first
    const cached = this.symbolCache.get(name);
    if (cached) {
      return cached;
    }

    const symbolIds = this.nameIndex.get(name) || [];
    const symbols: ApexSymbol[] = [];

    for (const symbolId of symbolIds) {
      const symbol = this.getSymbol(symbolId);
      if (symbol) {
        symbols.push(symbol);
      }
    }

    // Cache the result if cache isn't full
    if (this.cacheSize < this.MAX_CACHE_SIZE) {
      this.symbolCache.set(name, symbols);
      this.cacheSize++;
    }

    return symbols;
  }

  /**
   * Backward compatibility method - alias for findSymbolByName
   */
  lookupSymbolByName(name: string): ApexSymbol[] {
    return this.findSymbolByName(name);
  }

  /**
   * Backward compatibility method - alias for findSymbolByFQN
   */
  lookupSymbolByFQN(fqn: string): ApexSymbol | null {
    return this.findSymbolByFQN(fqn);
  }

  /**
   * Get files containing a symbol with the given name
   */
  getFilesForSymbol(name: string): string[] {
    const symbolIds = this.nameIndex.get(name) || [];
    const files = new Set<string>();

    for (const symbolId of symbolIds) {
      const filePath = this.symbolFileMap.get(symbolId);
      if (filePath) {
        files.add(filePath);
      }
    }

    return Array.from(files);
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
    // Find the actual symbols in the graph by name and file path
    const sourceSymbols = this.findSymbolByName(sourceSymbol.name);
    const targetSymbols = this.findSymbolByName(targetSymbol.name);

    // If filePath is undefined, match any symbol with the same name
    // Otherwise, require exact filePath match
    const sourceSymbolInGraph = sourceSymbol.filePath
      ? sourceSymbols.find((s) => s.filePath === sourceSymbol.filePath)
      : sourceSymbols[0]; // Take the first symbol with matching name

    const targetSymbolInGraph = targetSymbol.filePath
      ? targetSymbols.find((s) => s.filePath === targetSymbol.filePath)
      : targetSymbols[0]; // Take the first symbol with matching name

    if (!sourceSymbolInGraph || !targetSymbolInGraph) {
      // If symbols don't exist yet, add deferred reference
      // Use symbol name as key since we don't know the exact filePath
      this.addDeferredReference(
        sourceSymbol,
        targetSymbol.name,
        referenceType,
        location,
        context,
      );
      this.logger.debug(
        () =>
          `Added deferred reference: ${sourceSymbol.name} -> ${targetSymbol.name} ` +
          '(target not found yet)',
      );
      return;
    }

    const sourceId = this.getSymbolId(
      sourceSymbolInGraph,
      sourceSymbolInGraph.filePath,
    );
    const targetId = this.getSymbolId(
      targetSymbolInGraph,
      targetSymbolInGraph.filePath,
    );

    // Check if reference already exists
    const existingEdge = this.referenceGraph.getEdge(sourceId, targetId);
    if (existingEdge) {
      this.logger.debug(
        () => `Reference already exists: ${sourceId} -> ${targetId}`,
      );
      return;
    }

    // Create optimized reference edge
    const referenceEdge: ReferenceEdge = {
      type: referenceType,
      sourceFile: sourceSymbolInGraph.filePath,
      targetFile: targetSymbolInGraph.filePath,
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
    this.logger.debug(() => `Added reference: ${sourceId} -> ${targetId}`);
  }

  /**
   * OPTIMIZED: Find references to a symbol
   */
  findReferencesTo(symbol: ApexSymbol): ReferenceResult[] {
    // Find the actual symbol in the graph by name and file path
    const targetSymbols = this.findSymbolByName(symbol.name);
    this.logger.debug(
      () =>
        `findReferencesTo: looking for symbol ${symbol.name} with filePath ${symbol.filePath}`,
    );
    this.logger.debug(
      () =>
        `findReferencesTo: found ${targetSymbols.length} symbols with name ${symbol.name}`,
    );

    // If filePath is undefined, match any symbol with the same name
    // Otherwise, require exact filePath match
    const targetSymbolInGraph = symbol.filePath
      ? targetSymbols.find((s) => s.filePath === symbol.filePath)
      : targetSymbols[0]; // Take the first symbol with matching name

    if (!targetSymbolInGraph) {
      this.logger.debug(
        () =>
          `findReferencesTo: no matching symbol found for ${symbol.name} with filePath ${symbol.filePath}`,
      );
      return [];
    }

    this.logger.debug(
      () =>
        `findReferencesTo: found matching symbol with filePath ${targetSymbolInGraph.filePath}`,
    );
    const targetId = this.getSymbolId(
      targetSymbolInGraph,
      targetSymbolInGraph.filePath,
    );
    this.logger.debug(() => `findReferencesTo: using targetId ${targetId}`);
    const results: ReferenceResult[] = [];

    // Get incoming edges from the graph
    const vertex = this.symbolToVertex.get(targetId);
    if (!vertex) {
      this.logger.debug(
        () => `findReferencesTo: no vertex found for targetId ${targetId}`,
      );
      return results;
    }
    const incomingEdges = this.referenceGraph.incomingEdgesOf(vertex.key);
    this.logger.debug(
      () => `findReferencesTo: found ${incomingEdges.length} incoming edges`,
    );

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
    // Find the actual symbol in the graph by name and file path
    const sourceSymbols = this.findSymbolByName(symbol.name);

    // If filePath is undefined, match any symbol with the same name
    // Otherwise, require exact filePath match
    const sourceSymbolInGraph = symbol.filePath
      ? sourceSymbols.find((s) => s.filePath === symbol.filePath)
      : sourceSymbols[0]; // Take the first symbol with matching name

    if (!sourceSymbolInGraph) {
      return [];
    }

    const sourceId = this.getSymbolId(
      sourceSymbolInGraph,
      sourceSymbolInGraph.filePath,
    );
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
   * Detect circular dependencies in the reference graph
   */
  detectCircularDependencies(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    // Get all vertices from the symbolToVertex map
    const vertices = Array.from(this.symbolToVertex.keys());

    for (const vertexKey of vertices) {
      if (!visited.has(vertexKey)) {
        this.detectCyclesDFS(vertexKey, visited, recursionStack, [], cycles);
      }
    }

    return cycles;
  }

  /**
   * Helper method for cycle detection using DFS
   */
  private detectCyclesDFS(
    vertexKey: string,
    visited: Set<string>,
    recursionStack: Set<string>,
    currentPath: string[],
    cycles: string[][],
  ): void {
    visited.add(vertexKey);
    recursionStack.add(vertexKey);
    currentPath.push(vertexKey);

    // Get outgoing edges from this vertex
    const outgoingEdges = this.referenceGraph.outgoingEdgesOf(vertexKey);

    for (const edge of outgoingEdges) {
      const neighborKey = String(edge.dest);

      if (!visited.has(neighborKey)) {
        this.detectCyclesDFS(
          neighborKey,
          visited,
          recursionStack,
          currentPath,
          cycles,
        );
      } else if (recursionStack.has(neighborKey)) {
        // Found a cycle
        const cycleStartIndex = currentPath.indexOf(neighborKey);
        if (cycleStartIndex !== -1) {
          const cycle = currentPath.slice(cycleStartIndex);
          cycles.push([...cycle]);
        }
      }
    }

    recursionStack.delete(vertexKey);
    currentPath.pop();
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
      totalFiles: this.fileIndex.size, // Count actual files, not just SymbolTables
      totalReferences: this.memoryStats.totalEdges,
      circularDependencies: this.detectCircularDependencies().length,
      cacheHitRate: 0, // Not applicable in optimized architecture
      // Backward compatibility fields
      totalVertices: this.memoryStats.totalVertices,
      totalEdges: this.memoryStats.totalEdges,
      deferredReferences: this.deferredReferences.size,
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
    this.logger.debug(() => `Registered SymbolTable for file: ${filePath}`);
  }

  /**
   * Ensure a SymbolTable is registered for a file if it doesn't exist
   */
  private ensureSymbolTableForFile(filePath: string): void {
    if (!this.fileToSymbolTable.has(filePath)) {
      const symbolTable = new SymbolTable();
      this.fileToSymbolTable.set(filePath, symbolTable);
      this.logger.debug(
        () => `Created minimal SymbolTable for file: ${filePath}`,
      );
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

    // Clear cache
    this.symbolCache.clear();
    this.cacheSize = 0;

    this.memoryStats = {
      totalSymbols: 0,
      totalVertices: 0,
      totalEdges: 0,
      memoryOptimizationLevel: 'OPTIMAL',
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
    // Ensure we have a valid filePath
    const validFilePath = filePath || symbol.filePath || 'unknown';
    return `${validFilePath}:${symbol.name}`;
  }

  /**
   * Find symbol ID for a symbol
   */
  private findSymbolId(symbol: ApexSymbol): string | null {
    const filePath = symbol.filePath || 'unknown';
    const symbolId = this.getSymbolId(symbol, filePath);
    return this.symbolIds.has(symbolId) ? symbolId : null;
  }

  /**
   * Add a deferred reference
   */
  private addDeferredReference(
    sourceSymbol: ApexSymbol,
    targetSymbolName: string,
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
    const existing = this.deferredReferences.get(targetSymbolName) || [];
    existing.push({
      sourceSymbol,
      referenceType,
      location,
      context,
    });
    this.deferredReferences.set(targetSymbolName, existing);
    this.logger.debug(
      () => `Added deferred reference with key: ${targetSymbolName}`,
    );
  }

  /**
   * Process deferred references for a symbol
   */
  private processDeferredReferences(symbolName: string): void {
    this.logger.debug(
      () => `Processing deferred references for symbol: ${symbolName}`,
    );

    const deferred = this.deferredReferences.get(symbolName);
    if (!deferred) {
      this.logger.debug(
        () => `No deferred references found for symbol: ${symbolName}`,
      );
      return;
    }

    this.logger.debug(
      () =>
        `Found ${deferred.length} deferred references for symbol: ${symbolName}`,
    );

    // Find the target symbol by name
    const targetSymbols = this.findSymbolByName(symbolName);
    if (targetSymbols.length === 0) {
      this.logger.warn(
        () =>
          `Target symbol not found for deferred reference processing: ${symbolName}`,
      );
      return;
    }

    // Use the first symbol with this name
    const targetSymbol = targetSymbols[0];
    const targetId = this.getSymbolId(targetSymbol, targetSymbol.filePath);

    for (const ref of deferred) {
      // Find the source symbol in the graph
      const sourceSymbols = this.findSymbolByName(ref.sourceSymbol.name);
      this.logger.debug(
        () =>
          `processDeferredReferences: looking for source symbol ${ref.sourceSymbol.name} ` +
          `with filePath ${ref.sourceSymbol.filePath}`,
      );
      this.logger.debug(
        () =>
          `processDeferredReferences: found ${sourceSymbols.length} source symbols ` +
          `with name ${ref.sourceSymbol.name}`,
      );

      // If filePath is undefined, match any symbol with the same name
      // Otherwise, require exact filePath match
      const sourceSymbolInGraph = ref.sourceSymbol.filePath
        ? sourceSymbols.find((s) => s.filePath === ref.sourceSymbol.filePath)
        : sourceSymbols[0]; // Take the first symbol with matching name

      if (!sourceSymbolInGraph) {
        this.logger.warn(
          () =>
            `Source symbol not found for deferred reference: ${ref.sourceSymbol.name}`,
        );
        continue;
      }

      this.logger.debug(
        () =>
          `processDeferredReferences: found matching source symbol with filePath ${sourceSymbolInGraph.filePath}`,
      );
      const sourceId = this.getSymbolId(
        sourceSymbolInGraph,
        sourceSymbolInGraph.filePath,
      );
      this.logger.debug(
        () =>
          `processDeferredReferences: adding edge ${sourceId} -> ${targetId}`,
      );

      // Create optimized reference edge
      const referenceEdge: ReferenceEdge = {
        type: ref.referenceType,
        sourceFile: sourceSymbolInGraph.filePath,
        targetFile: targetSymbol.filePath,
        location: toCompactLocation(ref.location),
        context: ref.context
          ? {
              methodName: ref.context.methodName,
              parameterIndex: ref.context.parameterIndex
                ? toUint16(ref.context.parameterIndex)
                : undefined,
              isStatic: ref.context.isStatic,
              namespace: ref.context.namespace,
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
          () =>
            `Failed to add deferred reference edge: ${sourceId} -> ${targetId}`,
        );
        continue;
      }

      this.logger.debug(
        () =>
          `processDeferredReferences: successfully added edge ${sourceId} -> ${targetId}`,
      );
      // Update reference count
      const targetVertex = this.symbolToVertex.get(targetId);
      if (targetVertex && targetVertex.value) {
        targetVertex.value.referenceCount++;
      }

      this.memoryStats.totalEdges++;
      this.logger.debug(
        () =>
          `Processed deferred reference: ${sourceId} -> ${targetId} (${String(ref.referenceType)})`,
      );
    }

    this.deferredReferences.delete(symbolName); // Delete by symbol name
  }

  /**
   * Calculate impact score for dependency analysis
   */
  private calculateImpactScore(
    dependents: ApexSymbol[],
    dependencies: ApexSymbol[],
  ): number {
    // Impact score is based on how many things depend on this symbol
    // The more dependents, the higher the impact score
    return dependents.length;
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
