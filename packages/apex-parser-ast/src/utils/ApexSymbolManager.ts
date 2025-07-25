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
  // Phase 3.1: Dependency Analysis
  // ============================================================================

  /**
   * Analyze dependencies for a specific symbol
   */
  analyzeDependencies(symbol: ApexSymbol): DependencyAnalysis {
    const _symbolId = this.getSymbolId(symbol);

    // Check lazy analysis cache
    const cachedAnalysis = this.lazyAnalysis.get(_symbolId);
    if (cachedAnalysis) {
      return cachedAnalysis as any; // Type assertion for now
    }

    // Perform dependency analysis
    const analysis = this.symbolGraph.analyzeDependencies(symbol);

    // Cache the result
    this.lazyAnalysis.set(_symbolId, Promise.resolve(analysis));

    return analysis;
  }

  /**
   * Detect all circular dependencies in the graph
   */
  detectCircularDependencies(): string[][] {
    return this.symbolGraph.detectCircularDependencies();
  }

  /**
   * Get impact analysis for refactoring a symbol
   */
  getImpactAnalysis(symbol: ApexSymbol): ImpactAnalysis {
    // Get direct impact (symbols that directly reference this symbol)
    const directReferences = this.findReferencesTo(symbol);
    const directImpact = directReferences.map((ref) => ref.symbol);

    // Get indirect impact (symbols that reference symbols that reference this symbol)
    const indirectImpact: ApexSymbol[] = [];
    const visited = new Set<string>();

    const findIndirectImpact = (
      currentSymbol: ApexSymbol,
      depth: number = 0,
    ) => {
      if (depth > 3 || visited.has(this.getSymbolId(currentSymbol))) {
        return; // Limit depth and avoid cycles
      }

      visited.add(this.getSymbolId(currentSymbol));

      const references = this.findReferencesTo(currentSymbol);
      for (const ref of references) {
        if (
          !directImpact.some(
            (s) => this.getSymbolId(s) === this.getSymbolId(ref.symbol),
          )
        ) {
          indirectImpact.push(ref.symbol);
          findIndirectImpact(ref.symbol, depth + 1);
        }
      }
    };

    // Find indirect impact for each directly impacted symbol
    for (const impactedSymbol of directImpact) {
      findIndirectImpact(impactedSymbol, 1);
    }

    // Remove duplicates from indirect impact
    const uniqueIndirectImpact = indirectImpact.filter(
      (symbol, index, array) =>
        index ===
        array.findIndex(
          (s) => this.getSymbolId(s) === this.getSymbolId(symbol),
        ),
    );

    // Assess risk based on impact size
    const totalImpact = directImpact.length + uniqueIndirectImpact.length;
    let riskAssessment: 'low' | 'medium' | 'high';

    if (totalImpact <= 5) {
      riskAssessment = 'low';
    } else if (totalImpact <= 20) {
      riskAssessment = 'medium';
    } else {
      riskAssessment = 'high';
    }

    // Generate migration path
    const migrationPath = this.generateMigrationPath(
      symbol,
      directImpact,
      uniqueIndirectImpact,
    );

    // Identify potential breaking changes
    const breakingChanges = this.identifyBreakingChanges(symbol, directImpact);

    return {
      directImpact,
      indirectImpact: uniqueIndirectImpact,
      breakingChanges,
      migrationPath,
      riskAssessment,
    };
  }

  // ============================================================================
  // Phase 3.2: Symbol Metrics
  // ============================================================================

  /**
   * Get metrics for all symbols
   */
  getSymbolMetrics(): Map<string, SymbolMetrics> {
    const metrics = new Map<string, SymbolMetrics>();

    // Get all symbols from the symbol index
    for (const [symbolId, symbol] of this.symbolCache) {
      const symbolMetrics = this.computeMetrics(symbol);
      metrics.set(symbolId, symbolMetrics);
    }

    return metrics;
  }

  /**
   * Compute metrics for a specific symbol
   */
  computeMetrics(symbol: ApexSymbol): SymbolMetrics {
    const symbolId = this.getSymbolId(symbol);

    // Check cache first
    const cached = this.metricsCache.get(symbolId);
    if (cached) {
      return cached;
    }

    // Compute basic metrics
    const referencesTo = this.findReferencesTo(symbol);
    const referencesFrom = this.findReferencesFrom(symbol);
    const referenceCount = referencesTo.length;
    const dependencyCount = referencesFrom.length;
    const dependentCount = referencesTo.length;

    // Compute complexity metrics
    const cyclomaticComplexity = this.computeCyclomaticComplexity(symbol);
    const depthOfInheritance = this.computeDepthOfInheritance(symbol);
    const couplingScore = this.computeCouplingScore(symbol);

    // Compute impact metrics
    const impactScore = this.computeImpactScore(symbol);
    const changeImpactRadius = this.computeChangeImpactRadius(symbol);
    const refactoringRisk = this.computeRefactoringRisk(symbol);

    // Determine usage patterns
    const usagePatterns = this.analyzeUsagePatterns(symbol);
    const accessPatterns = this.analyzeAccessPatterns(symbol);
    const lifecycleStage = this.determineLifecycleStage(symbol);

    const metrics: SymbolMetrics = {
      referenceCount,
      dependencyCount,
      dependentCount,
      cyclomaticComplexity,
      depthOfInheritance,
      couplingScore,
      impactScore,
      changeImpactRadius,
      refactoringRisk,
      usagePatterns,
      accessPatterns,
      lifecycleStage,
    };

    // Cache the result
    this.metricsCache.set(symbolId, metrics);

    return metrics;
  }

  /**
   * Get the most referenced symbols
   */
  getMostReferencedSymbols(limit: number = 10): ApexSymbol[] {
    const symbolMetrics = new Map<ApexSymbol, number>();

    // Compute reference counts for all symbols in cache
    for (const [, symbol] of this.symbolCache) {
      const references = this.findReferencesTo(symbol);
      symbolMetrics.set(symbol, references.length);
    }

    // Sort by reference count and return top N
    return Array.from(symbolMetrics.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([symbol]) => symbol);
  }

  // ============================================================================
  // Phase 3.3: Batch Operations
  // ============================================================================

  /**
   * Add multiple symbols in batch for better performance
   */
  async addSymbolsBatch(
    symbols: Array<{ symbol: ApexSymbol; filePath: string }>,
  ): Promise<void> {
    this.logger.debug(() => `Adding ${symbols.length} symbols in batch`);

    // Group symbols by file for efficient processing
    const symbolsByFile = new Map<string, ApexSymbol[]>();

    for (const { symbol, filePath } of symbols) {
      if (!symbolsByFile.has(filePath)) {
        symbolsByFile.set(filePath, []);
      }
      symbolsByFile.get(filePath)!.push(symbol);
    }

    // Process each file's symbols
    for (const [filePath, fileSymbols] of symbolsByFile) {
      for (const symbol of fileSymbols) {
        this.addSymbol(symbol, filePath);
      }
    }

    this.logger.debug(
      () => `Batch addition completed for ${symbols.length} symbols`,
    );
  }

  /**
   * Analyze dependencies for multiple symbols in batch
   */
  async analyzeDependenciesBatch(
    symbols: ApexSymbol[],
  ): Promise<Map<string, DependencyAnalysis>> {
    this.logger.debug(
      () => `Analyzing dependencies for ${symbols.length} symbols in batch`,
    );

    const results = new Map<string, DependencyAnalysis>();

    // Process symbols in parallel for better performance
    const analysisPromises = symbols.map(async (symbol) => {
      const symbolId = this.getSymbolId(symbol);
      const analysis = this.analyzeDependencies(symbol);
      return { symbolId, analysis };
    });

    const analysisResults = await Promise.all(analysisPromises);

    for (const { symbolId, analysis } of analysisResults) {
      results.set(symbolId, analysis);
    }

    this.logger.debug(
      () => `Batch dependency analysis completed for ${symbols.length} symbols`,
    );

    return results;
  }

  // ============================================================================
  // Phase 4.1: Enhanced Context Resolution
  // ============================================================================

  /**
   * Resolve a symbol by name with advanced context awareness
   */
  resolveSymbol(
    name: string,
    context: SymbolResolutionContext,
  ): SymbolResolutionResult {
    this.logger.debug(
      () => `Resolving symbol: ${name} with context from ${context.sourceFile}`,
    );

    // Step 1: Find all candidates with the given name
    const candidates = this.findSymbolByName(name);

    if (candidates.length === 0) {
      return {
        symbol: null as any,
        filePath: '',
        confidence: 0,
        isAmbiguous: false,
        resolutionContext: 'No symbols found with this name',
      };
    }

    if (candidates.length === 1) {
      // Single candidate - high confidence
      const candidate = candidates[0];
      return {
        symbol: candidate,
        filePath: this.getSymbolFilePath(candidate),
        confidence: 0.9,
        isAmbiguous: false,
        resolutionContext: 'Single symbol found',
      };
    }

    // Step 2: Apply context-aware resolution for multiple candidates
    const resolved = this.resolveAmbiguousSymbolWithContext(
      name,
      candidates,
      context,
    );

    return {
      symbol: resolved.symbol,
      filePath: resolved.filePath,
      confidence: resolved.confidence,
      isAmbiguous: true,
      candidates,
      resolutionContext: resolved.resolutionContext,
    };
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

  // ============================================================================
  // Phase 3 Helper Methods
  // ============================================================================

  /**
   * Generate migration path for refactoring
   */
  private generateMigrationPath(
    symbol: ApexSymbol,
    directImpact: ApexSymbol[],
    indirectImpact: ApexSymbol[],
  ): string[] {
    const path: string[] = [];

    // Step 1: Create backup/version
    path.push(`Create backup of ${symbol.name} and all impacted files`);

    // Step 2: Update direct dependencies first
    if (directImpact.length > 0) {
      path.push(`Update ${directImpact.length} direct dependencies`);
    }

    // Step 3: Update indirect dependencies
    if (indirectImpact.length > 0) {
      path.push(`Update ${indirectImpact.length} indirect dependencies`);
    }

    // Step 4: Update the target symbol
    path.push(`Refactor ${symbol.name}`);

    // Step 5: Run tests
    path.push('Run comprehensive test suite');

    return path;
  }

  /**
   * Identify potential breaking changes
   */
  private identifyBreakingChanges(
    symbol: ApexSymbol,
    directImpact: ApexSymbol[],
  ): string[] {
    const breakingChanges: string[] = [];

    // Check for public API changes
    if (
      symbol.modifiers.visibility === 'public' ||
      symbol.modifiers.visibility === 'global'
    ) {
      breakingChanges.push(
        `Public API change: ${symbol.name} is publicly accessible`,
      );
    }

    // Check for interface implementations
    if (
      symbol.kind === 'class' &&
      directImpact.some((s) => s.kind === 'interface')
    ) {
      breakingChanges.push(
        `Interface implementation: ${symbol.name} implements interfaces`,
      );
    }

    // Check for inheritance relationships
    if (directImpact.some((s) => s.kind === 'class')) {
      breakingChanges.push(
        `Inheritance relationship: ${symbol.name} has subclasses`,
      );
    }

    // Check for high usage
    if (directImpact.length > 10) {
      breakingChanges.push(
        `High usage: ${symbol.name} is referenced by ${directImpact.length} symbols`,
      );
    }

    return breakingChanges;
  }

  /**
   * Compute cyclomatic complexity for a symbol
   */
  private computeCyclomaticComplexity(symbol: ApexSymbol): number {
    // Simplified implementation - in a real system, this would analyze the actual code
    let complexity = 1; // Base complexity

    // Add complexity based on symbol kind
    switch (symbol.kind) {
      case 'method':
        complexity += 2; // Methods have higher complexity
        break;
      case 'class':
        complexity += 1; // Classes have moderate complexity
        break;
      case 'interface':
        complexity += 0.5; // Interfaces have low complexity
        break;
      default:
        complexity += 1;
    }

    // Add complexity based on references
    const references = this.findReferencesFrom(symbol);
    complexity += Math.min(references.length * 0.1, 5); // Cap at 5 additional complexity

    return Math.round(complexity * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Compute depth of inheritance for a symbol
   */
  private computeDepthOfInheritance(symbol: ApexSymbol): number {
    if (symbol.kind !== 'class') {
      return 0; // Only classes have inheritance
    }

    let depth = 0;
    let currentSymbol = symbol;

    // Traverse up the inheritance chain
    while (currentSymbol) {
      const inheritanceRefs = this.findRelatedSymbols(
        currentSymbol,
        ReferenceType.INHERITANCE,
      );
      if (inheritanceRefs.length > 0) {
        depth++;
        currentSymbol = inheritanceRefs[0]; // Assume single inheritance
      } else {
        break;
      }

      // Prevent infinite loops
      if (depth > 10) {
        break;
      }
    }

    return depth;
  }

  /**
   * Compute coupling score for a symbol
   */
  private computeCouplingScore(symbol: ApexSymbol): number {
    const referencesFrom = this.findReferencesFrom(symbol);
    const referencesTo = this.findReferencesTo(symbol);

    // Afferent coupling (incoming dependencies)
    const afferentCoupling = referencesTo.length;

    // Efferent coupling (outgoing dependencies)
    const efferentCoupling = referencesFrom.length;

    // Total coupling
    const totalCoupling = afferentCoupling + efferentCoupling;

    // Normalize to 0-1 scale
    return Math.min(totalCoupling / 100, 1);
  }

  /**
   * Compute impact score for a symbol
   */
  private computeImpactScore(symbol: ApexSymbol): number {
    const referencesTo = this.findReferencesTo(symbol);
    const directImpact = referencesTo.length;

    // Calculate indirect impact (simplified)
    let indirectImpact = 0;
    for (const ref of referencesTo) {
      const secondaryRefs = this.findReferencesTo(ref.symbol);
      indirectImpact += secondaryRefs.length;
    }

    const totalImpact = directImpact + indirectImpact;

    // Normalize to 0-1 scale
    return Math.min(totalImpact / 200, 1);
  }

  /**
   * Compute change impact radius
   */
  private computeChangeImpactRadius(symbol: ApexSymbol): number {
    const referencesTo = this.findReferencesTo(symbol);
    const uniqueFiles = new Set(
      referencesTo.map((ref) => ref.filePath || 'unknown'),
    );

    // Impact radius is the number of files that would be affected
    return uniqueFiles.size;
  }

  /**
   * Compute refactoring risk score
   */
  private computeRefactoringRisk(symbol: ApexSymbol): number {
    let risk = 0;

    // High risk factors
    if (
      symbol.modifiers.visibility === 'public' ||
      symbol.modifiers.visibility === 'global'
    ) {
      risk += 0.3;
    }

    const referencesTo = this.findReferencesTo(symbol);
    if (referencesTo.length > 10) {
      risk += 0.3;
    }

    if (
      symbol.kind === 'class' &&
      this.findRelatedSymbols(symbol, ReferenceType.INHERITANCE).length > 0
    ) {
      risk += 0.2;
    }

    // Medium risk factors
    if (symbol.modifiers.isStatic) {
      risk += 0.1;
    }

    if (symbol.modifiers.isFinal) {
      risk += 0.1;
    }

    return Math.min(risk, 1);
  }

  /**
   * Analyze usage patterns for a symbol
   */
  private analyzeUsagePatterns(symbol: ApexSymbol): string[] {
    const patterns: string[] = [];
    const referencesTo = this.findReferencesTo(symbol);

    // Analyze reference types
    const referenceTypes = new Map<ReferenceType, number>();
    for (const ref of referencesTo) {
      const count = referenceTypes.get(ref.referenceType) || 0;
      referenceTypes.set(ref.referenceType, count + 1);
    }

    // Add patterns based on usage
    for (const [type, count] of referenceTypes) {
      if (count > 5) {
        patterns.push(`Heavy ${type} usage (${count} references)`);
      }
    }

    // Add patterns based on symbol kind
    if (
      symbol.kind === 'class' &&
      referenceTypes.has(ReferenceType.INHERITANCE)
    ) {
      patterns.push('Inheritance pattern');
    }

    if (
      symbol.kind === 'method' &&
      referenceTypes.has(ReferenceType.METHOD_CALL)
    ) {
      patterns.push('Method call pattern');
    }

    return patterns;
  }

  /**
   * Analyze access patterns for a symbol
   */
  private analyzeAccessPatterns(symbol: ApexSymbol): string[] {
    const patterns: string[] = [];

    // Add patterns based on modifiers
    if (symbol.modifiers.isStatic) {
      patterns.push('Static access');
    }

    if (symbol.modifiers.visibility === 'public') {
      patterns.push('Public access');
    } else if (symbol.modifiers.visibility === 'private') {
      patterns.push('Private access');
    } else if (symbol.modifiers.visibility === 'protected') {
      patterns.push('Protected access');
    }

    if (symbol.modifiers.isFinal) {
      patterns.push('Final access');
    }

    return patterns;
  }

  /**
   * Determine lifecycle stage for a symbol
   */
  private determineLifecycleStage(
    symbol: ApexSymbol,
  ): 'active' | 'deprecated' | 'legacy' | 'experimental' {
    // Simplified implementation - in a real system, this would analyze comments, usage patterns, etc.
    const referencesTo = this.findReferencesTo(symbol);

    if (referencesTo.length === 0) {
      return 'legacy';
    } else if (referencesTo.length < 3) {
      return 'experimental';
    } else if (symbol.name.toLowerCase().includes('deprecated')) {
      return 'deprecated';
    } else {
      return 'active';
    }
  }

  /**
   * Enhanced confidence scoring based on relationship strength
   */
  private computeContextConfidence(
    symbol: ApexSymbol,
    context: SymbolResolutionContext,
  ): number {
    let confidence = 0.5; // Base confidence for ambiguous symbols

    // Import statement analysis (highest weight)
    if (context.importStatements.length > 0) {
      const importConfidence = this.analyzeImportStatements(
        symbol,
        context.importStatements,
      );
      confidence += importConfidence * 0.3; // 30% weight
    }

    // Namespace context analysis
    if (context.namespaceContext) {
      const namespaceConfidence = this.analyzeNamespaceContext(
        symbol,
        context.namespaceContext,
      );
      confidence += namespaceConfidence * 0.2; // 20% weight
    }

    // Scope chain analysis
    if (context.scopeChain.length > 0) {
      const scopeConfidence = this.analyzeScopeChain(
        symbol,
        context.scopeChain,
      );
      confidence += scopeConfidence * 0.15; // 15% weight
    }

    // Type context analysis
    if (
      context.expectedType ||
      context.parameterTypes.length > 0 ||
      context.returnType
    ) {
      const typeConfidence = this.analyzeTypeContext(symbol, context);
      confidence += typeConfidence * 0.15; // 15% weight
    }

    // Access modifier analysis
    const accessConfidence = this.analyzeAccessContext(symbol, context);
    confidence += accessConfidence * 0.1; // 10% weight

    // Relationship context analysis
    if (context.relationshipType) {
      const relationshipConfidence = this.analyzeRelationshipContext(
        symbol,
        context,
      );
      confidence += relationshipConfidence * 0.1; // 10% weight
    }

    return Math.min(confidence, 1.0); // Cap at 1.0
  }

  /**
   * Analyze import statements for namespace resolution
   */
  private analyzeImportStatements(
    symbol: ApexSymbol,
    importStatements: string[],
  ): number {
    let confidence = 0;

    for (const importStatement of importStatements) {
      // Check if the import statement matches the symbol's namespace
      if (symbol.fqn && importStatement.includes(symbol.fqn.split('.')[0])) {
        confidence += 0.8; // High confidence for namespace match
      }

      // Check for wildcard imports
      if (importStatement.endsWith('.*')) {
        const namespace = importStatement.replace('.*', '');
        if (symbol.fqn && symbol.fqn.startsWith(namespace)) {
          confidence += 0.6; // Medium confidence for wildcard import
        }
      }

      // Check for specific class imports
      if (importStatement.includes(symbol.name)) {
        confidence += 0.9; // Very high confidence for specific import
      }
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Analyze namespace context for resolution
   */
  private analyzeNamespaceContext(
    symbol: ApexSymbol,
    namespaceContext: string,
  ): number {
    if (!symbol.fqn) {
      return 0;
    }

    const symbolNamespace = symbol.fqn.split('.')[0];

    if (symbolNamespace === namespaceContext) {
      return 0.9; // High confidence for exact namespace match
    }

    if (symbolNamespace.toLowerCase() === namespaceContext.toLowerCase()) {
      return 0.7; // Medium confidence for case-insensitive match
    }

    return 0.1; // Low confidence for no match
  }

  /**
   * Analyze scope chain for resolution
   */
  private analyzeScopeChain(symbol: ApexSymbol, scopeChain: string[]): number {
    let confidence = 0;

    // Check if symbol is in the current scope
    if (scopeChain.includes(symbol.name)) {
      confidence += 0.5;
    }

    // Check for nested scope matches
    for (const scope of scopeChain) {
      if (symbol.fqn && symbol.fqn.includes(scope)) {
        confidence += 0.3;
      }
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Analyze type context for resolution
   */
  private analyzeTypeContext(
    symbol: ApexSymbol,
    context: SymbolResolutionContext,
  ): number {
    let confidence = 0;

    // Check expected type
    if (context.expectedType && symbol.fqn) {
      if (symbol.fqn === context.expectedType) {
        confidence += 0.8;
      } else if (symbol.fqn.includes(context.expectedType)) {
        confidence += 0.5;
      }
    }

    // Check parameter types
    for (const paramType of context.parameterTypes) {
      if (symbol.fqn && symbol.fqn.includes(paramType)) {
        confidence += 0.3;
      }
    }

    // Check return type
    if (context.returnType && symbol.fqn) {
      if (symbol.fqn === context.returnType) {
        confidence += 0.6;
      } else if (symbol.fqn.includes(context.returnType)) {
        confidence += 0.3;
      }
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Analyze access context for resolution
   */
  private analyzeAccessContext(
    symbol: ApexSymbol,
    context: SymbolResolutionContext,
  ): number {
    let confidence = 0;

    // Check access modifier compatibility
    const symbolVisibility = symbol.modifiers.visibility;
    const contextAccess = context.accessModifier;

    // Public symbols are always accessible
    if (symbolVisibility === 'public' || symbolVisibility === 'global') {
      confidence += 0.5;
    }

    // Private symbols only in same class
    if (symbolVisibility === 'private' && contextAccess === 'private') {
      confidence += 0.8;
    }

    // Protected symbols in inheritance chain
    if (symbolVisibility === 'protected' && contextAccess === 'protected') {
      confidence += 0.7;
    }

    // Check static access
    if (symbol.modifiers.isStatic === context.isStatic) {
      confidence += 0.3;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Analyze relationship context for resolution
   */
  private analyzeRelationshipContext(
    symbol: ApexSymbol,
    context: SymbolResolutionContext,
  ): number {
    if (!context.relationshipType) {
      return 0;
    }

    let confidence = 0;

    // Check if symbol supports the expected relationship type
    switch (context.relationshipType) {
      case ReferenceType.METHOD_CALL:
        if (symbol.kind === 'method') {
          confidence += 0.8;
        }
        break;
      case ReferenceType.FIELD_ACCESS:
        if (symbol.kind === 'field') {
          confidence += 0.8;
        }
        break;
      case ReferenceType.TYPE_REFERENCE:
        if (symbol.kind === 'class' || symbol.kind === 'interface') {
          confidence += 0.8;
        }
        break;
      case ReferenceType.INHERITANCE:
        if (symbol.kind === 'class') {
          confidence += 0.8;
        }
        break;
      case ReferenceType.INTERFACE_IMPLEMENTATION:
        if (symbol.kind === 'interface') {
          confidence += 0.8;
        }
        break;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Resolve ambiguous symbol using advanced context analysis
   */
  private resolveAmbiguousSymbolWithContext(
    name: string,
    candidates: ApexSymbol[],
    context: SymbolResolutionContext,
  ): {
    symbol: ApexSymbol;
    filePath: string;
    confidence: number;
    resolutionContext: string;
  } {
    // Calculate confidence scores for all candidates
    const scoredCandidates = candidates.map((candidate) => ({
      symbol: candidate,
      confidence: this.computeContextConfidence(candidate, context),
      filePath: this.getSymbolFilePath(candidate),
    }));

    // Sort by confidence (descending)
    scoredCandidates.sort((a, b) => b.confidence - a.confidence);

    const bestMatch = scoredCandidates[0];

    // Generate resolution context explanation
    let resolutionContext = `Resolved from ${candidates.length} candidates`;

    if (bestMatch.confidence > 0.8) {
      resolutionContext += ` - High confidence (${(bestMatch.confidence * 100).toFixed(1)}%)`;
    } else if (bestMatch.confidence > 0.6) {
      resolutionContext += ` - Medium confidence (${(bestMatch.confidence * 100).toFixed(1)}%)`;
    } else {
      resolutionContext += ` - Low confidence (${(bestMatch.confidence * 100).toFixed(1)}%)`;
    }

    // Add context details
    if (context.importStatements.length > 0) {
      resolutionContext += ' - Import analysis applied';
    }
    if (context.namespaceContext) {
      resolutionContext += ` - Namespace context: ${context.namespaceContext}`;
    }

    return {
      symbol: bestMatch.symbol,
      filePath: bestMatch.filePath,
      confidence: bestMatch.confidence,
      resolutionContext,
    };
  }

  /**
   * Get the file path for a symbol
   */
  private getSymbolFilePath(symbol: ApexSymbol): string {
    // Try to find the symbol in our cache to get the file path
    for (const [symbolId, cachedSymbol] of this.symbolCache) {
      if (this.symbolsMatch(cachedSymbol, symbol)) {
        // Extract file path from symbol ID
        const parts = symbolId.split(':');
        if (parts.length > 2) {
          return parts[parts.length - 1]; // Last part should be the file path
        }
      }
    }

    // Fallback to symbol key path
    return symbol.key.path[0] || 'unknown';
  }

  /**
   * Check if two symbols match
   */
  private symbolsMatch(symbol1: ApexSymbol, symbol2: ApexSymbol): boolean {
    return (
      symbol1.name === symbol2.name &&
      symbol1.kind === symbol2.kind &&
      symbol1.fqn === symbol2.fqn
    );
  }
}
