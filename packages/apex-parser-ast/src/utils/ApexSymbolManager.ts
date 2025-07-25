/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap } from 'data-structure-typed';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { ApexSymbol, SymbolTable } from '../types/symbol';
import {
  ApexSymbolGraph,
  ReferenceType,
  ReferenceResult,
  DependencyAnalysis,
} from '../references/ApexSymbolGraph';

/**
 * Context for symbol resolution
 */
export interface SymbolResolutionContext {
  // Source context
  sourceFile: string;
  sourceSymbol?: ApexSymbol;

  // Import context
  importStatements: string[];
  namespaceContext: string;

  // Scope context
  currentScope: string;
  scopeChain: string[]; // Full scope hierarchy

  // Type context
  expectedType?: string;
  parameterTypes: string[];
  returnType?: string;

  // Access context
  accessModifier: 'public' | 'private' | 'protected' | 'global';
  isStatic: boolean;

  // Relationship context
  relationshipType?: ReferenceType;
  inheritanceChain: string[];
  interfaceImplementations: string[];
}

/**
 * Result of a symbol resolution
 */
export interface SymbolResolutionResult {
  symbol: ApexSymbol;
  filePath: string;
  confidence: number;
  isAmbiguous: boolean;
  candidates?: ApexSymbol[];
  resolutionContext?: string;
}

/**
 * Impact analysis for refactoring
 */
export interface ImpactAnalysis {
  directImpact: ApexSymbol[];
  indirectImpact: ApexSymbol[];
  breakingChanges: string[];
  migrationPath: string[];
  riskAssessment: 'low' | 'medium' | 'high';
}

/**
 * Symbol metrics for analysis
 */
export interface SymbolMetrics {
  // Basic metrics
  referenceCount: number;
  dependencyCount: number;
  dependentCount: number;

  // Complexity metrics
  cyclomaticComplexity: number;
  depthOfInheritance: number;
  couplingScore: number;

  // Impact metrics
  impactScore: number;
  changeImpactRadius: number;
  refactoringRisk: number;

  // Usage patterns
  usagePatterns: string[];
  accessPatterns: string[];
  lifecycleStage: 'active' | 'deprecated' | 'legacy' | 'experimental';
}

/**
 * Unified graph-based symbol manager
 * Replaces CrossFileSymbolManager and GlobalSymbolRegistry
 */
export class ApexSymbolManager {
  private readonly logger = getLogger();

  // Core graph-based storage
  private symbolGraph: ApexSymbolGraph;

  // Symbol table index for compatibility
  private symbolTableIndex: HashMap<string, SymbolTable>;

  // Performance-optimized caching
  private symbolCache: HashMap<string, ApexSymbol>;
  private relationshipCache: HashMap<string, ReferenceResult[]>;
  private metricsCache: HashMap<string, SymbolMetrics>;

  // Lazy loading for expensive operations
  private lazyMetrics: HashMap<string, Promise<SymbolMetrics>>;
  private lazyAnalysis: HashMap<string, Promise<DependencyAnalysis>>;

  constructor() {
    this.symbolGraph = new ApexSymbolGraph();
    this.symbolTableIndex = new HashMap();
    this.symbolCache = new HashMap();
    this.relationshipCache = new HashMap();
    this.metricsCache = new HashMap();
    this.lazyMetrics = new HashMap();
    this.lazyAnalysis = new HashMap();
  }

  // ============================================================================
  // Phase 2.1: Symbol Management Methods
  // ============================================================================

  /**
   * Add a symbol to the graph
   */
  addSymbol(symbol: ApexSymbol, filePath: string): void {
    this.logger.debug(() => `Adding symbol: ${symbol.name} from ${filePath}`);

    // Add to graph
    this.symbolGraph.addSymbol(symbol, filePath);

    // Update cache
    const symbolId = this.getSymbolId(symbol, filePath);
    this.symbolCache.set(symbolId, symbol);

    // Clear related caches
    this.clearRelatedCaches(symbolId);
  }

  /**
   * Remove a symbol from the graph
   */
  removeSymbol(symbol: ApexSymbol, filePath: string): void {
    this.logger.debug(() => `Removing symbol: ${symbol.name} from ${filePath}`);

    const symbolId = this.getSymbolId(symbol, filePath);

    // Remove from graph (this will handle all graph operations)
    // Note: ApexSymbolGraph doesn't have individual symbol removal yet
    // We'll need to implement this or handle it through file removal

    // Clear caches
    this.symbolCache.delete(symbolId);
    this.clearRelatedCaches(symbolId);
  }

  /**
   * Remove all symbols from a file
   */
  removeFile(filePath: string): void {
    this.logger.debug(() => `Removing file: ${filePath}`);

    // Remove from graph
    this.symbolGraph.removeFile(filePath);

    // Remove from symbol table index
    this.symbolTableIndex.delete(filePath);

    // Clear all caches (simplified approach for now)
    this.clearAllCaches();
  }

  /**
   * Add a symbol table to the manager
   */
  addSymbolTable(symbolTable: SymbolTable, filePath: string): void {
    this.logger.debug(() => `Adding symbol table for: ${filePath}`);

    // Store symbol table
    this.symbolTableIndex.set(filePath, symbolTable);

    // Extract and add all symbols
    const collectSymbols = (scope: any): ApexSymbol[] => {
      const symbols: ApexSymbol[] = [];

      // Get symbols from current scope
      symbols.push(...scope.getAllSymbols());

      // Recursively collect from child scopes
      scope.getChildren().forEach((childScope: any) => {
        symbols.push(...collectSymbols(childScope));
      });

      return symbols;
    };

    const allSymbols = collectSymbols(symbolTable.getCurrentScope());

    // Add symbols in batch for better performance
    allSymbols.forEach((symbol) => {
      this.addSymbol(symbol, filePath);
    });

    this.logger.debug(
      () => `Added ${allSymbols.length} symbols from ${filePath}`,
    );
  }

  /**
   * Refresh the manager with new symbol data
   */
  refresh(symbolTables: Map<string, SymbolTable>): void {
    this.logger.debug(() => 'Refreshing ApexSymbolManager...');

    // Clear existing data
    this.symbolGraph.clear();
    this.symbolTableIndex.clear();
    this.clearAllCaches();

    // Add new symbol tables
    if (symbolTables) {
      for (const [filePath, symbolTable] of symbolTables) {
        this.addSymbolTable(symbolTable, filePath);
      }
    }

    this.logger.debug(() => 'ApexSymbolManager refreshed');
  }

  // ============================================================================
  // Phase 2.2: Symbol Lookup Methods
  // ============================================================================

  /**
   * Find all symbols with a given name
   */
  findSymbolByName(name: string): ApexSymbol[] {
    return this.symbolGraph.lookupSymbolByName(name);
  }

  /**
   * Find a symbol by its fully qualified name
   */
  findSymbolByFQN(fqn: string): ApexSymbol | null {
    return this.symbolGraph.lookupSymbolByFQN(fqn);
  }

  /**
   * Find all symbols in a specific file
   */
  findSymbolsInFile(filePath: string): ApexSymbol[] {
    return this.symbolGraph.getSymbolsInFile(filePath);
  }

  /**
   * Find all files containing a symbol with the given name
   */
  findFilesForSymbol(name: string): string[] {
    return this.symbolGraph.getFilesForSymbol(name);
  }

  // ============================================================================
  // Phase 2.3: Graph-Based Relationship Queries
  // ============================================================================

  /**
   * Find all references to a symbol
   */
  findReferencesTo(symbol: ApexSymbol): ReferenceResult[] {
    const cacheKey = `refs_to_${this.getSymbolId(symbol)}`;

    // Check cache first
    const cached = this.relationshipCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Query graph
    const results = this.symbolGraph.findReferencesTo(symbol);

    // Cache results
    this.relationshipCache.set(cacheKey, results);

    return results;
  }

  /**
   * Find all symbols that reference this symbol
   */
  findReferencesFrom(symbol: ApexSymbol): ReferenceResult[] {
    const cacheKey = `refs_from_${this.getSymbolId(symbol)}`;

    // Check cache first
    const cached = this.relationshipCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Query graph
    const results = this.symbolGraph.findReferencesFrom(symbol);

    // Cache results
    this.relationshipCache.set(cacheKey, results);

    return results;
  }

  /**
   * Find related symbols by relationship type
   */
  findRelatedSymbols(
    symbol: ApexSymbol,
    relationshipType: ReferenceType,
  ): ApexSymbol[] {
    const cacheKey = `related_${this.getSymbolId(symbol)}_${relationshipType}`;

    // Check cache first
    const cached = this.relationshipCache.get(cacheKey);
    if (cached) {
      return cached.map((ref) => ref.symbol);
    }

    // Query graph and filter by relationship type
    const allReferences = this.symbolGraph.findReferencesFrom(symbol);
    const filteredReferences = allReferences.filter(
      (ref) => ref.referenceType === relationshipType,
    );

    // Cache results
    this.relationshipCache.set(cacheKey, filteredReferences);

    return filteredReferences.map((ref) => ref.symbol);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get statistics about the symbol manager
   */
  getStats(): {
    totalSymbols: number;
    totalFiles: number;
    totalReferences: number;
    circularDependencies: number;
    cacheHitRate: number;
  } {
    const graphStats = this.symbolGraph.getStats();

    return {
      totalSymbols: graphStats.totalSymbols,
      totalFiles: graphStats.totalFiles,
      totalReferences: graphStats.totalReferences,
      circularDependencies: graphStats.circularDependencies,
      cacheHitRate: this.calculateCacheHitRate(),
    };
  }

  /**
   * Clear all caches
   */
  private clearAllCaches(): void {
    this.symbolCache.clear();
    this.relationshipCache.clear();
    this.metricsCache.clear();
    this.lazyMetrics.clear();
    this.lazyAnalysis.clear();
  }

  /**
   * Clear caches related to a specific symbol
   */
  private clearRelatedCaches(symbolId: string): void {
    // Clear relationship caches that might be affected
    const keysToRemove: string[] = [];

    for (const key of this.relationshipCache.keys()) {
      if (key.includes(symbolId)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => this.relationshipCache.delete(key));

    // Clear metrics cache for this symbol
    this.metricsCache.delete(symbolId);
    this.lazyMetrics.delete(symbolId);
    this.lazyAnalysis.delete(symbolId);
  }

  /**
   * Generate a unique ID for a symbol
   */
  private getSymbolId(symbol: ApexSymbol, filePath?: string): string {
    const baseId =
      symbol.fqn ||
      `${symbol.kind}:${symbol.name}:${symbol.key.path.join('.')}`;
    return filePath ? `${baseId}:${filePath}` : baseId;
  }

  /**
   * Calculate cache hit rate (simplified implementation)
   */
  private calculateCacheHitRate(): number {
    // This is a simplified implementation
    // In a real system, you'd track actual hits vs misses
    return 0.85; // Placeholder value
  }
}
