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
  Uint16,
  toUint16,
} from '@salesforce/apex-lsp-shared';
import { generateSymbolId, parseSymbolId } from '../types/UriBasedIdGenerator';

import {
  ApexSymbol,
  SymbolTable,
  SymbolVisibility,
  SymbolLocation,
} from '../types/symbol';
import { calculateFQN } from '../utils/FQNUtils';
import { ResourceLoader } from '../utils/resourceLoader';
import { isStandardApexUri } from '../types/ProtocolHandler';

/**
 * Context for symbol resolution
 */
export interface ResolutionContext {
  fileUri?: string;
  expectedNamespace?: string;
  currentScope?: string;
  isStatic?: boolean;
}

/**
 * Result of a symbol lookup with confidence scoring
 */
export interface SymbolLookupResult {
  symbol: ApexSymbol;
  fileUri: string;
  confidence: number;
  isAmbiguous: boolean;
  candidates?: Array<{
    symbol: ApexSymbol;
    fileUri: string;
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
  sourceFileUri: string;
  targetFileUri: string;
  // location: CompactLocation; // Removed - redundant with source symbol location
  context?: {
    methodName?: string;
    parameterIndex?: Uint16; // 2 bytes vs 8 bytes (75% reduction)
    isStatic?: boolean;
    namespace?: string;
  };
}

/**
 * Result of a reference query
 */
export interface ReferenceResult {
  symbolId: string;
  symbol: ApexSymbol;
  fileUri: string;
  referenceType: EnumValue<typeof ReferenceType>;
  location: SymbolLocation;
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
  fileUri: string;
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
  // These maps provide O(1) lookup performance for common symbol operations

  /**
   * Maps symbol ID to file uri for quick file location lookups
   * Key: Symbol ID (e.g., "file:///path/MyClass.cls:MyClass")
   * Value: File uri (e.g., "file:///path/MyClass.cls")
   * Used by: File-based operations, symbol removal, dependency analysis
   */
  private symbolFileMap: HashMap<string, string> = new HashMap();

  /**
   * Maps symbol names to arrays of symbol IDs for name-based lookups
   * Key: Symbol name (e.g., "MyClass", "myMethod")
   * Value: Array of symbol IDs that have this name
   * Used by: findSymbolByName(), handles overloading and multiple classes with same name
   */
  private nameIndex: HashMap<string, string[]> = new HashMap();

  /**
   * Maps file uris to arrays of symbol IDs for file-based lookups
   * Key: File uri (e.g., "file:///path/MyClass.cls")
   * Value: Array of symbol IDs in that file
   * Used by: getSymbolsInFile(), file-based symbol enumeration, file removal
   * FIXED: Using native Map for web worker compatibility
   */
  private fileIndex: Map<string, string[]> = new Map();

  /**
   * Maps fully qualified names to symbol IDs for hierarchical lookups
   * Key: Fully qualified name (e.g., "MyNamespace.MyClass.myMethod")
   * Value: Symbol ID
   * Used by: findSymbolByFQN(), hierarchical symbol resolution, namespace-aware lookups
   */
  private fqnIndex: HashMap<string, string> = new HashMap();

  // OPTIMIZED: SymbolTable references for delegation
  // CRITICAL FIX: Replace HashMap with native Map due to web worker compatibility issues
  // HashMap from data-structure-typed appears to have issues in web worker environment
  private fileToSymbolTable: Map<string, SymbolTable> = new Map();
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
      location: SymbolLocation;
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

  private resourceLoader: ResourceLoader;

  constructor() {
    this.resourceLoader = ResourceLoader.getInstance({
      loadMode: 'lazy',
      preloadStdClasses: false,
    });
  }

  /**
   * OPTIMIZED: Add symbol reference only - delegate storage to SymbolTable
   */
  addSymbol(
    symbol: ApexSymbol,
    fileUri: string,
    symbolTable?: SymbolTable,
  ): void {
    const symbolId = this.getSymbolId(symbol, fileUri);
    // console.log(
    //   `🔍 [ApexSymbolGraph] addSymbol called for: ${symbol.name}, ID: ${symbolId}`,
    // );

    // Check if symbol already exists to prevent duplicates
    if (this.symbolIds.has(symbolId)) {
      // console.log(
      //   `⚠️ [ApexSymbolGraph] Symbol ${symbol.name} already exists with ID: ${symbolId}`,
      // );
      return;
    }

    // OPTIMIZED: Register SymbolTable immediately for delegation
    // CRITICAL FIX: Use the same URI normalization as getSymbolId for consistency
    const normalizedFileUri = this.extractFilePathFromUri(fileUri);
    // console.log(
    //   `🔍 [ApexSymbolGraph] Normalized fileUri: ${fileUri} -> ${normalizedFileUri}`,
    // );

    let targetSymbolTable: SymbolTable;
    if (symbolTable) {
      this.registerSymbolTable(symbolTable, normalizedFileUri);
      targetSymbolTable = symbolTable;
    } else {
      // For backward compatibility, create a minimal SymbolTable if none provided
      // This ensures the symbol can be found later
      this.ensureSymbolTableForFile(normalizedFileUri);
      targetSymbolTable = this.fileToSymbolTable.get(normalizedFileUri)!;
    }

    // Add the symbol to the SymbolTable
    targetSymbolTable.addSymbol(symbol);

    // OPTIMIZED: Only track existence, don't store full symbol
    this.symbolIds.add(symbolId);
    // console.log(
    //   `✅ [ApexSymbolGraph] Symbol ${symbol.name} successfully added with ID: ${symbolId}`,
    // );

    // Add to indexes for fast lookups
    this.symbolFileMap.set(symbolId, fileUri);

    // BUG FIX: Calculate and store FQN if not already present
    let fqnToUse = symbol.fqn;
    // console.log(
    //   `🔍 [ApexSymbolGraph] FQN calculation for ${symbol.name}, current fqn: ${fqnToUse}`,
    // );

    try {
      if (!fqnToUse) {
        // console.log(`🔍 [ApexSymbolGraph] Calculating FQN for ${symbol.name}`);
        // Create a parent resolution function that works with the symbol's parent relationship
        const getParent = (parentId: string): ApexSymbol | null => {
          // First try to find by parentId in the symbol table
          const allSymbols = targetSymbolTable.getAllSymbols();
          const parentSymbol = allSymbols.find((s) => s.id === parentId);
          if (parentSymbol) {
            return parentSymbol;
          }

          // If not found, try to find by name (for backward compatibility)
          const symbolsByName = allSymbols.filter((s) => s.name === parentId);
          if (symbolsByName.length > 0) {
            return symbolsByName[0];
          }

          return null;
        };

        fqnToUse = calculateFQN(symbol, undefined, getParent);
        // console.log(
        //   `🔍 [ApexSymbolGraph] Calculated FQN for ${symbol.name}: ${fqnToUse}`,
        // );
        // Store the calculated FQN on the symbol for consistency
        symbol.fqn = fqnToUse;
      } else {
        // console.log(
        //   `🔍 [ApexSymbolGraph] Using existing FQN for ${symbol.name}: ${fqnToUse}`,
        // );
      }

      if (fqnToUse) {
        this.fqnIndex.set(fqnToUse, symbolId);
        // console.log(
        //   `✅ [ApexSymbolGraph] Added to fqnIndex: ${fqnToUse} -> ${symbolId}`,
        // );
      }
    } catch (_error) {
      // console.log(
      //   `❌ [ApexSymbolGraph] Error in FQN calculation for ${symbol.name}: ${error}`,
      // );
      // Continue execution even if FQN calculation fails
    }

    // Add to name index for symbol resolution
    const existingNames = this.nameIndex.get(symbol.name) || [];
    // console.log(
    //   `🔍 [ApexSymbolGraph] Adding to nameIndex: ${symbol.name} -> ${symbolId}`,
    // );
    // console.log(
    //   `🔍 [ApexSymbolGraph] Existing names for ${symbol.name}: [${existingNames.join(', ')}]`,
    // );
    if (!existingNames.includes(symbolId)) {
      existingNames.push(symbolId);
      this.nameIndex.set(symbol.name, existingNames);
      // console.log(
      //   `✅ [ApexSymbolGraph] Added to nameIndex: ${symbol.name} -> [${existingNames.join(', ')}]`,
      // );
    } else {
      // console.log(
      //   `⚠️ [ApexSymbolGraph] Symbol ID ${symbolId} already in nameIndex for ${symbol.name}`,
      // );
    }

    const fileSymbols = this.fileIndex.get(fileUri) || [];
    // console.log(
    //   `🔍 [ApexSymbolGraph] Adding to fileIndex: ${fileUri} -> ${symbolId} (current count: ${fileSymbols.length})`,
    // );
    if (!fileSymbols.includes(symbolId)) {
      fileSymbols.push(symbolId);
      this.fileIndex.set(fileUri, fileSymbols);
      // console.log(
      //   `✅ [ApexSymbolGraph] Added to fileIndex: ${fileUri} now has ${fileSymbols.length} symbols`,
      // );
    } else {
      // console.log(
      //   `⚠️ [ApexSymbolGraph] Symbol ID ${symbolId} already in fileIndex for ${fileUri}`,
      // );
    }

    // OPTIMIZED: Add lightweight node to graph
    const referenceNode: ReferenceNode = {
      symbolId,
      fileUri: fileUri,
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

    // If this is a standard Apex class, ensure it's properly registered
    if (fileUri.includes('/') && fileUri.endsWith('.cls')) {
      // This might be a standard class from ResourceLoader
      const namespace = fileUri.split('/')[0];
      if (this.resourceLoader?.isStdApexNamespace(namespace)) {
        // Mark as standard class
        symbol.modifiers.isBuiltIn = false;
        symbol.modifiers.visibility = SymbolVisibility.Global;
      }
    }

    // Update fileUri for any symbols in deferred references that match this symbol
    // This ensures that when deferred references are processed, they can find the source symbols
    for (const [_targetName, refs] of this.deferredReferences.entries()) {
      if (refs) {
        for (const ref of refs) {
          if (
            ref.sourceSymbol.name === symbol.name &&
            ref.sourceSymbol.fileUri !== fileUri
          ) {
            ref.sourceSymbol.fileUri = fileUri;
          }
        }
      }
    }
  }

  /**
   * Get symbol by delegating to SymbolTable
   */
  getSymbol(symbolId: string): ApexSymbol | null {
    // console.log(`🔍 [ApexSymbolGraph] getSymbol called with ID: ${symbolId}`);

    // Parse URI-based ID
    const parsed = parseSymbolId(symbolId);
    // console.log(
    //   `🔍 [ApexSymbolGraph] Parsed ID - URI: ${parsed.uri}, Name: ${parsed.name}`,
    // );

    const symbolName = parsed.name;
    // console.log(
    //   `🔍 [ApexSymbolGraph] Looking for SymbolTable with URI: ${parsed.uri}`,
    // );
    // console.log(
    //   `🔍 [ApexSymbolGraph] Available SymbolTable URIs: [${Array.from(this.fileToSymbolTable.keys()).join(', ')}]`,
    // );

    // CRITICAL DEBUG: Test HashMap behavior in web worker
    const symbolTable = this.fileToSymbolTable.get(parsed.uri);
    // console.log(
    //   `🔍 [ApexSymbolGraph] HashMap.get() result: ${symbolTable ? 'FOUND' : 'NULL'}`,
    // );

    // Test key equality - this will tell us if it's a HashMap issue or string comparison issue
    const availableKeys = Array.from(this.fileToSymbolTable.keys());
    for (const key of availableKeys) {
      const _isEqual = key === parsed.uri;
      const _lengthMatch = key.length === parsed.uri.length;
      // console.log(
      //   `🔍 [ApexSymbolGraph] Key comparison: "${key}" === "${parsed.uri}" = ${isEqual}, lengths: ${key.length} vs ${parsed.uri.length} = ${lengthMatch}`,
      // );
      if (key === parsed.uri) {
        const _testGet = this.fileToSymbolTable.get(key);
        // console.log(
        //   `🔍 [ApexSymbolGraph] Direct get with matching key: ${testGet ? 'FOUND' : 'NULL'}`,
        // );
      }
    }

    if (!symbolTable) {
      // console.log(
      //   `❌ [ApexSymbolGraph] No SymbolTable found for URI: ${parsed.uri}`,
      // );
      return null;
    }

    // Get all symbols from the SymbolTable and find by name
    const allSymbols = symbolTable.getAllSymbols();
    // console.log(
    //   `🔍 [ApexSymbolGraph] SymbolTable.getAllSymbols() returned ${allSymbols.length} symbols`,
    // );
    if (allSymbols.length > 0) {
      // console.log(
      //   `🔍 [ApexSymbolGraph] Available symbol names: [${allSymbols.map((s) => s.name).join(', ')}]`,
      // );
    }

    const matchingSymbol = allSymbols.find((s) => s.name === symbolName);
    // console.log(
    //   `🔍 [ApexSymbolGraph] Looking for symbol name: ${symbolName}, found: ${matchingSymbol ? 'YES' : 'NO'}`,
    // );
    if (matchingSymbol) {
      // Always create a deep copy to avoid mutating the original symbol
      const symbolCopy = {
        ...matchingSymbol,
        fileUri: parsed.uri,
        location: {
          ...matchingSymbol.location,
          symbolRange: { ...matchingSymbol.location.symbolRange },
          identifierRange: { ...matchingSymbol.location.identifierRange },
        },
        // Preserve parent relationship for FQN calculation
        parent: matchingSymbol.parent,
      };
      return symbolCopy;
    }

    return null;
  }

  /**
   * OPTIMIZED: Find symbols by name by delegating to SymbolTable
   */
  findSymbolByName(name: string): ApexSymbol[] {
    // console.log(`🔍 [ApexSymbolGraph] findSymbolByName called for: ${name}`);
    // TEMPORARY: Disable symbolCache - always bypass cache
    // Check cache first
    // const cached = this.symbolCache.get(name);
    // if (cached) {
    //   return cached;
    // }

    const symbolIds = this.nameIndex.get(name) || [];
    // console.log(
    //   `🔍 [ApexSymbolGraph] Found ${symbolIds.length} symbol IDs for ${name}: [${symbolIds.join(', ')}]`,
    // );

    const symbols: ApexSymbol[] = [];

    for (const symbolId of symbolIds) {
      // console.log(`🔍 [ApexSymbolGraph] Getting symbol for ID: ${symbolId}`);
      const symbol = this.getSymbol(symbolId);
      if (symbol) {
        // console.log(
        //   `✅ [ApexSymbolGraph] Found symbol: ${symbol.name} (${symbol.kind})`,
        // );
        symbols.push(symbol);
      } else {
        // console.log(
        //   `❌ [ApexSymbolGraph] Could not retrieve symbol for ID: ${symbolId}`,
        // );
      }
    }

    // TEMPORARY: Disable symbolCache - never cache results
    // Cache the result if cache isn't full
    // if (this.cacheSize < this.MAX_CACHE_SIZE) {
    //   this.symbolCache.set(name, symbols);
    //   this.cacheSize++;
    // }

    // console.log(
    //   `📊 [ApexSymbolGraph] Returning ${symbols.length} symbols for ${name}`,
    // );
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
      const fileUri = this.symbolFileMap.get(symbolId);
      if (fileUri) {
        files.add(fileUri);
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
   * CRITICAL FIX: Bypass broken fileIndex and use SymbolTable directly
   */
  getSymbolsInFile(fileUri: string): ApexSymbol[] {
    // console.log(`🔍 [ApexSymbolGraph] getSymbolsInFile called for: ${fileUri}`);

    // FALLBACK: If fileIndex approach fails, use SymbolTable directly
    const symbolTable = this.fileToSymbolTable.get(fileUri);
    if (symbolTable) {
      // console.log(
      //   `🔍 [ApexSymbolGraph] Using SymbolTable fallback for ${fileUri}`,
      // );
      const allSymbols = symbolTable.getAllSymbols();
      // console.log(
      //   `✅ [ApexSymbolGraph] SymbolTable fallback returned ${allSymbols.length} symbols`,
      // );
      return allSymbols;
    }

    // ORIGINAL: Try fileIndex approach first (may be broken in web worker)
    const symbolIds = this.fileIndex.get(fileUri) || [];
    // console.log(
    //   `🔍 [ApexSymbolGraph] fileIndex returned ${symbolIds.length} symbol IDs: [${symbolIds.slice(0, 5).join(', ')}${symbolIds.length > 5 ? '...' : ''}]`,
    // );

    const symbols: ApexSymbol[] = [];

    for (const symbolId of symbolIds) {
      const symbol = this.getSymbol(symbolId);
      if (symbol) {
        symbols.push(symbol);
      } else {
        // console.log(
        //   `⚠️ [ApexSymbolGraph] Could not retrieve symbol for ID: ${symbolId}`,
        // );
      }
    }

    // console.log(
    //   `📊 [ApexSymbolGraph] Final result: ${symbols.length} symbols for ${fileUri}`,
    // );
    return symbols;
  }

  /**
   * OPTIMIZED: Add reference between symbols using IDs only
   */
  addReference(
    sourceSymbol: ApexSymbol,
    targetSymbol: ApexSymbol,
    referenceType: EnumValue<typeof ReferenceType>,
    location: SymbolLocation,
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

    // If fileUri is undefined, match any symbol with the same name
    // Otherwise, require exact fileUri match
    const sourceSymbolInGraph = sourceSymbol.fileUri
      ? sourceSymbols.find((s) => s.fileUri === sourceSymbol.fileUri)
      : sourceSymbols[0]; // Take the first symbol with matching name

    const targetSymbolInGraph = targetSymbol.fileUri
      ? targetSymbols.find((s) => s.fileUri === targetSymbol.fileUri)
      : targetSymbols[0]; // Take the first symbol with matching name

    if (!sourceSymbolInGraph || !targetSymbolInGraph) {
      // If symbols don't exist yet, add deferred reference
      // Use symbol name as key since we don't know the exact fileUri
      this.addDeferredReference(
        sourceSymbol,
        targetSymbol.name,
        referenceType,
        location,
        context,
      );

      // For built-in types, create a virtual symbol and add the reference immediately
      if (
        targetSymbol.fileUri &&
        targetSymbol.fileUri.startsWith('built-in://')
      ) {
        this.createVirtualSymbolForBuiltInType(
          targetSymbol,
          sourceSymbol,
          referenceType,
          location,
          context,
        );
      }
      return;
    }

    const sourceId = this.getSymbolId(
      sourceSymbolInGraph,
      sourceSymbolInGraph.fileUri,
    );
    const targetId = this.getSymbolId(
      targetSymbolInGraph,
      targetSymbolInGraph.fileUri,
    );

    // Check if reference already exists
    const existingEdge = this.referenceGraph.getEdge(sourceId, targetId);
    if (existingEdge) {
      return;
    }

    // Create optimized reference edge
    const referenceEdge: ReferenceEdge = {
      type: referenceType,
      sourceFileUri: sourceSymbolInGraph.fileUri,
      targetFileUri: targetSymbolInGraph.fileUri,
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
  }

  /**
   * OPTIMIZED: Find references to a symbol
   */
  findReferencesTo(symbol: ApexSymbol): ReferenceResult[] {
    // Find the actual symbol in the graph by name and file path
    const targetSymbols = this.findSymbolByName(symbol.name);

    // If fileUri is undefined, match any symbol with the same name
    // Otherwise, require exact fileUri match
    const targetSymbolInGraph = symbol.fileUri
      ? targetSymbols.find((s) => s.fileUri === symbol.fileUri)
      : targetSymbols[0]; // Take the first symbol with matching name

    if (!targetSymbolInGraph) {
      return [];
    }

    const targetId = this.getSymbolId(
      targetSymbolInGraph,
      targetSymbolInGraph.fileUri,
    );
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
        fileUri: sourceSymbol.fileUri,
        referenceType: edge.value.type,
        location: sourceSymbol.location,
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

    // If fileUri is undefined, match any symbol with the same name
    // Otherwise, require exact fileUri match
    const sourceSymbolInGraph = symbol.fileUri
      ? sourceSymbols.find((s) => s.fileUri === symbol.fileUri)
      : sourceSymbols[0]; // Take the first symbol with matching name

    if (!sourceSymbolInGraph) {
      return [];
    }

    const sourceId = this.getSymbolId(
      sourceSymbolInGraph,
      sourceSymbolInGraph.fileUri,
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
        fileUri: targetSymbol.fileUri,
        referenceType: edge.value.type,
        location: targetSymbol.location,
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
   * Detect circular dependencies involving a specific symbol
   */
  detectCircularDependenciesForSymbol(symbol: ApexSymbol): string[][] {
    const symbolId = this.getSymbolId(symbol, symbol.fileUri);
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    // Start DFS from the specific symbol
    if (this.symbolToVertex.has(symbolId)) {
      this.detectCyclesDFS(symbolId, visited, recursionStack, [], cycles);
    }

    // Filter cycles to only include those that contain the target symbol
    return cycles.filter((cycle) => cycle.includes(symbolId));
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
    const circularDependencies =
      this.detectCircularDependenciesForSymbol(symbol);

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
    const symbolIds =
      this.nameIndex.get(symbolName) ||
      this.nameIndex.get(symbolName.toLowerCase()) ||
      [];

    if (symbolIds.length === 0) {
      return null;
    }

    // Get all symbols with this name by delegating to SymbolTable
    const candidates = symbolIds
      .map((id) => {
        const symbol = this.getSymbol(id);
        const fileUri = this.symbolFileMap.get(id);
        const symbolTable = fileUri
          ? this.fileToSymbolTable.get(fileUri)
          : undefined;

        if (!symbol || !fileUri || !symbolTable) return null;

        return {
          symbol,
          fileUri,
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
        fileUri: candidate.fileUri,
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
      fileUri: resolved.fileUri,
      confidence: resolved.confidence,
      isAmbiguous: true,
      candidates,
    };
  }

  /**
   * Get SymbolTable for a file
   */
  getSymbolTableForFile(fileUri: string): SymbolTable | undefined {
    return this.fileToSymbolTable.get(fileUri);
  }

  /**
   * Register SymbolTable for a file
   */
  registerSymbolTable(symbolTable: SymbolTable, fileUri: string): void {
    // console.log(
    //   `🔍 [ApexSymbolGraph] registerSymbolTable: storing with key: ${fileUri}`,
    // );
    this.fileToSymbolTable.set(fileUri, symbolTable);
    // console.log(
    //   `🔍 [ApexSymbolGraph] fileToSymbolTable now has keys: [${Array.from(this.fileToSymbolTable.keys()).join(', ')}]`,
    // );
  }

  /**
   * Ensure a SymbolTable is registered for a file if it doesn't exist
   */
  private ensureSymbolTableForFile(fileUri: string): void {
    if (!this.fileToSymbolTable.has(fileUri)) {
      const symbolTable = new SymbolTable();
      this.fileToSymbolTable.set(fileUri, symbolTable);
    }
  }

  /**
   * Resolve ambiguous symbol using context
   */
  private resolveAmbiguousSymbol(
    symbolName: string,
    candidates: Array<{
      symbol: ApexSymbol;
      fileUri: string;
      symbolTable: SymbolTable;
      lastUpdated: number;
    }>,
    context?: ResolutionContext,
  ): { symbol: ApexSymbol; fileUri: string; confidence: number } {
    // If no context provided, return first candidate with medium confidence
    if (!context) {
      const candidate = candidates[0];
      return {
        symbol: candidate.symbol,
        fileUri: candidate.fileUri,
        confidence: 0.5,
      };
    }

    // Strategy 1: Try to match by source file first (highest priority)
    if (context.fileUri) {
      const fileMatch = candidates.find((c) => c.fileUri === context.fileUri);
      if (fileMatch) {
        return {
          symbol: fileMatch.symbol,
          fileUri: fileMatch.fileUri,
          confidence: 0.9,
        };
      }
    }

    // Strategy 2: Handle method resolution based on context
    // For qualified calls like System.debug, prefer the standard library method
    // For unqualified calls like debug(), prefer local methods
    const standardLibraryMethods = candidates.filter(
      (c) =>
        c.symbol.kind === 'method' && this.isStandardLibraryMethod(c.symbol),
    );

    const localMethods = candidates.filter(
      (c) =>
        // Check if this is a method from the same file/class as the context
        c.fileUri === context.fileUri ||
        (c.symbol.kind === 'method' && !this.isStandardLibraryMethod(c.symbol)),
    );

    // If we have both standard library and local methods, prefer based on context
    if (standardLibraryMethods.length > 0 && localMethods.length > 0) {
      // For qualified calls (when expectedNamespace is set), prefer standard library
      if (context.expectedNamespace) {
        const bestStandard = standardLibraryMethods[0];
        return {
          symbol: bestStandard.symbol,
          fileUri: bestStandard.fileUri,
          confidence: 0.8,
        };
      }
      // For unqualified calls, prefer local methods
      else {
        const bestLocal = localMethods[0];
        return {
          symbol: bestLocal.symbol,
          fileUri: bestLocal.fileUri,
          confidence: 0.8,
        };
      }
    }

    // If only one type exists, use it
    if (localMethods.length > 0) {
      const bestLocal = localMethods[0];
      return {
        symbol: bestLocal.symbol,
        fileUri: bestLocal.fileUri,
        confidence: 0.8,
      };
    }

    if (standardLibraryMethods.length > 0) {
      const bestStandard = standardLibraryMethods[0];
      return {
        symbol: bestStandard.symbol,
        fileUri: bestStandard.fileUri,
        confidence: 0.8,
      };
    }

    // Strategy 3: Prefer non-static methods for instance context, static for static context
    if (context.isStatic !== undefined) {
      const contextAwareMethods = candidates.filter((c) => {
        if (c.symbol.kind !== 'method') return false;
        const isStatic = c.symbol.modifiers?.isStatic ?? false;
        return context.isStatic ? isStatic : !isStatic;
      });

      if (contextAwareMethods.length > 0) {
        const bestMethod = contextAwareMethods[0];
        return {
          symbol: bestMethod.symbol,
          fileUri: bestMethod.fileUri,
          confidence: 0.7,
        };
      }
    }

    // Strategy 4: Try to match by scope if provided
    if (context.currentScope) {
      // For now, return first candidate with scope context
      // This can be enhanced with actual scope hierarchy matching
      const candidate = candidates[0];
      return {
        symbol: candidate.symbol,
        fileUri: candidate.fileUri,
        confidence: 0.6,
      };
    }

    // Default: return first candidate with medium confidence
    const candidate = candidates[0];
    return {
      symbol: candidate.symbol,
      fileUri: candidate.fileUri,
      confidence: 0.5,
    };
  }

  /**
   * Check if a symbol is from a standard Apex library (like System, String, etc.)
   */
  private isStandardLibraryMethod(symbol: ApexSymbol): boolean {
    // Use the existing isStandardApexUri function to check if the symbol's file URI
    // is from the standard Apex library
    return symbol.fileUri ? isStandardApexUri(symbol.fileUri) : false;
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
  removeFile(fileUri: string): void {
    const symbolIds = this.fileIndex.get(fileUri) || [];

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
    this.fileIndex.delete(fileUri);

    // Remove SymbolTable reference
    this.fileToSymbolTable.delete(fileUri);

    this.memoryStats.totalSymbols -= symbolIds.length;
  }

  /**
   * Generate a unique symbol ID using URI-based format
   */
  private getSymbolId(symbol: ApexSymbol, fileUri: string): string {
    // If the symbol already has an ID, use it
    if (symbol.id) {
      return symbol.id;
    }

    // Extract just the file path from the fileUri (remove symbol name and line number)
    const theFileUri = this.extractFilePathFromUri(
      fileUri || symbol.fileUri || 'unknown',
    );
    const lineNumber = symbol.location?.identifierRange.startLine;
    return generateSymbolId(
      symbol.name,
      theFileUri,
      undefined, // scopePath not available here
      lineNumber,
    );
  }

  /**
   * Extract just the file path from a URI that may contain symbol name and line number
   */
  private extractFilePathFromUri(uri: string): string {
    // If it's a built-in URI, return as-is
    // TODO: remove once all apex classes are converted to use file uris
    if (uri.startsWith('built-in://')) {
      return uri;
    }

    // CRITICAL FIX: Handle complex URI formats like file://vscode-test-web://mount/path
    // Remove symbol name and line number from the URI, but preserve complex protocol structures

    // Check if this looks like a URI with symbol information appended
    // Look for file extensions followed by colons (indicating symbol parts)
    const fileExtensions = ['.cls', '.trigger', '.apex'];
    for (const ext of fileExtensions) {
      const extIndex = uri.lastIndexOf(ext + ':');
      if (extIndex !== -1) {
        // Found a file extension followed by colon - everything before + ext is the file URI
        // console.log(
        //   `🔍 [ApexSymbolGraph] extractFilePathFromUri: ${uri} -> ${uri.substring(0, extIndex + ext.length)}`,
        // );
        return uri.substring(0, extIndex + ext.length);
      }
    }

    // Fallback for simple formats or URIs without symbol parts
    // console.log(
    //   `🔍 [ApexSymbolGraph] extractFilePathFromUri: ${uri} -> ${uri} (no extraction needed)`,
    // );
    return uri;
  }

  /**
   * Find symbol ID for a symbol
   */
  private findSymbolId(symbol: ApexSymbol): string | null {
    const fileUri = symbol.fileUri || 'unknown';
    const symbolId = this.getSymbolId(symbol, fileUri);
    return this.symbolIds.has(symbolId) ? symbolId : null;
  }

  /**
   * Add a deferred reference
   */
  private addDeferredReference(
    sourceSymbol: ApexSymbol,
    targetSymbolName: string,
    referenceType: EnumValue<typeof ReferenceType>,
    location: SymbolLocation,
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
  }

  /**
   * Create a virtual symbol for built-in types and add the reference immediately
   * TODO: remove once all apex classes are converted to use file uris
   */
  private createVirtualSymbolForBuiltInType(
    targetSymbol: ApexSymbol,
    sourceSymbol: ApexSymbol,
    referenceType: EnumValue<typeof ReferenceType>,
    location: SymbolLocation,
    context?: {
      methodName?: string;
      parameterIndex?: number;
      isStatic?: boolean;
      namespace?: string;
    },
  ): void {
    // Create a virtual symbol ID for the built-in type
    const virtualSymbolId = `built-in://apex:${targetSymbol.name}`;

    // Check if we already have this virtual symbol
    if (this.symbolIds.has(virtualSymbolId)) {
      // Symbol already exists, just add the reference
      this.addReferenceToGraph(
        sourceSymbol,
        targetSymbol,
        virtualSymbolId,
        referenceType,
        location,
        context,
      );
      return;
    }

    // Create a virtual symbol for the built-in type
    const virtualSymbol: ApexSymbol = {
      ...targetSymbol,
      id: virtualSymbolId,
      fileUri: targetSymbol.fileUri,
    };

    // Add the virtual symbol to the graph
    this.symbolIds.add(virtualSymbolId);
    this.symbolFileMap.set(virtualSymbolId, virtualSymbol.fileUri);

    // Add to name index
    const existingNames = this.nameIndex.get(virtualSymbol.name) || [];
    if (!existingNames.includes(virtualSymbolId)) {
      existingNames.push(virtualSymbolId);
      this.nameIndex.set(virtualSymbol.name, existingNames);
    }

    // Add to FQN index
    if (virtualSymbol.fqn) {
      this.fqnIndex.set(virtualSymbol.fqn, virtualSymbolId);
    }

    // Create a lightweight node for the graph
    const referenceNode: ReferenceNode = {
      symbolId: virtualSymbolId,
      fileUri: virtualSymbol.fileUri,
      lastUpdated: Date.now(),
      referenceCount: 0,
      nodeId: this.memoryStats.totalVertices + 1,
    };

    // Add vertex to graph
    const vertexAdded = this.referenceGraph.addVertex(
      virtualSymbolId,
      referenceNode,
    );
    if (!vertexAdded) {
      return;
    }

    // Get the vertex from the graph
    const vertex = this.referenceGraph.getVertex(virtualSymbolId);
    if (vertex) {
      this.symbolToVertex.set(virtualSymbolId, vertex);
    }

    // Now add the reference to the graph
    this.addReferenceToGraph(
      sourceSymbol,
      targetSymbol,
      virtualSymbolId,
      referenceType,
      location,
      context,
    );
  }

  /**
   * Add a reference to the graph between two symbols
   */
  private addReferenceToGraph(
    sourceSymbol: ApexSymbol,
    targetSymbol: ApexSymbol,
    targetSymbolId: string,
    referenceType: EnumValue<typeof ReferenceType>,
    location: SymbolLocation,
    context?: {
      methodName?: string;
      parameterIndex?: number;
      isStatic?: boolean;
      namespace?: string;
    },
  ): void {
    // Find the source symbol in the graph
    const sourceSymbols = this.findSymbolByName(sourceSymbol.name);
    const sourceSymbolInGraph = sourceSymbol.fileUri
      ? sourceSymbols.find((s) => s.fileUri === sourceSymbol.fileUri)
      : sourceSymbols[0];

    if (!sourceSymbolInGraph) {
      return;
    }

    const sourceId = this.getSymbolId(
      sourceSymbolInGraph,
      sourceSymbolInGraph.fileUri,
    );
    // Check if reference already exists
    const existingEdge = this.referenceGraph.getEdge(sourceId, targetSymbolId);
    if (existingEdge) {
      return;
    }

    // Create optimized reference edge
    const referenceEdge: ReferenceEdge = {
      type: referenceType,
      sourceFileUri: sourceSymbolInGraph.fileUri,
      targetFileUri: targetSymbol.fileUri,
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
      targetSymbolId,
      1,
      referenceEdge,
    );
    if (!edgeAdded) {
    }
  }

  /**
   * Public API to enqueue a deferred reference for later resolution
   * Thin wrapper over the internal deferred reference mechanism
   */
  enqueueDeferredReference(
    sourceSymbol: ApexSymbol,
    targetSymbolName: string,
    referenceType: EnumValue<typeof ReferenceType>,
    location: SymbolLocation,
    context?: {
      methodName?: string;
      parameterIndex?: number;
      isStatic?: boolean;
      namespace?: string;
    },
  ): void {
    this.addDeferredReference(
      sourceSymbol,
      targetSymbolName,
      referenceType,
      location,
      context,
    );
  }

  /**
   * Process deferred references for a symbol
   */
  private processDeferredReferences(symbolName: string): void {
    const deferred = this.deferredReferences.get(symbolName);
    if (!deferred) {
      return;
    }

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
    const targetId = this.getSymbolId(targetSymbol, targetSymbol.fileUri);

    for (const ref of deferred) {
      // Find the source symbol in the graph
      const sourceSymbols = this.findSymbolByName(ref.sourceSymbol.name);

      // If fileUri is undefined, match any symbol with the same name
      // Otherwise, require exact fileUri match
      const sourceSymbolInGraph = ref.sourceSymbol.fileUri
        ? sourceSymbols.find((s) => s.fileUri === ref.sourceSymbol.fileUri)
        : sourceSymbols[0]; // Take the first symbol with matching name

      if (!sourceSymbolInGraph) {
        this.logger.warn(
          () =>
            `Source symbol not found for deferred reference: ${ref.sourceSymbol.name}`,
        );
        continue;
      }

      const sourceId = this.getSymbolId(
        sourceSymbolInGraph,
        sourceSymbolInGraph.fileUri,
      );

      // Create optimized reference edge
      const referenceEdge: ReferenceEdge = {
        type: ref.referenceType,
        sourceFileUri: sourceSymbolInGraph.fileUri,
        targetFileUri: targetSymbol.fileUri,
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

      // Update reference count
      const targetVertex = this.symbolToVertex.get(targetId);
      if (targetVertex && targetVertex.value) {
        targetVertex.value.referenceCount++;
      }

      this.memoryStats.totalEdges++;
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
    // Impact score disabled: always return zero
    return 0;
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
