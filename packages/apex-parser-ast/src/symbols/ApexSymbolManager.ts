/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap, Stack } from 'data-structure-typed';
import { getLogger, type EnumValue } from '@salesforce/apex-lsp-shared';
import {
  ApexSymbol,
  SymbolKind,
  SymbolVisibility,
  SymbolFactory,
  SymbolTable,
  generateUnifiedId,
  SymbolLocation,
  Position,
  Range,
  SymbolResolutionStrategy,
} from '../types/symbol';
import { UnifiedCache } from '../utils/UnifiedCache';
import {
  SymbolMetrics,
  SystemStats,
  MemoryUsageStats,
  PerformanceMetrics,
  RelationshipStats,
  PatternAnalysis,
} from '../types/metrics';
import {
  getProtocolType,
  createFileUri,
  isUserCodeUri,
  extractFilePath,
  isStandardApexUri,
  extractApexLibPath,
} from '../types/ProtocolHandler';
import { ResolutionRequest, ResolutionResult } from './resolution/types';
import {
  TypeReference,
  ReferenceContext,
  ChainedTypeReference,
} from '../types/typeReference';
import {
  ApexSymbolGraph,
  ReferenceType,
  ReferenceResult,
  DependencyAnalysis,
} from './ApexSymbolGraph';
import {
  ISymbolManager,
  SymbolResolutionContext,
  SymbolResolutionResult,
} from '../types/ISymbolManager';
import { FQNOptions, calculateFQN, getAncestorChain } from '../utils/FQNUtils';
import type { SymbolProvider } from '../namespace/NamespaceUtils';
import { BuiltInTypeTablesImpl } from '../utils/BuiltInTypeTables';

import { ResourceLoader } from '../utils/resourceLoader';
import { BASE_RESOURCES_URI } from '../utils/ResourceUtils';
import type {
  ApexComment,
  CommentAssociation,
} from '../parser/listeners/ApexCommentCollectorListener';
import { CommentAssociator } from '../utils/CommentAssociator';
import { isChainedTypeReference } from '../utils/symbolNarrowing';

/**
 * Context for chain resolution - discriminated union for type safety
 */
type ChainResolutionContext =
  | { type: 'symbol'; symbol: ApexSymbol }
  | { type: 'namespace'; name: string }
  | { type: 'global' }
  | undefined;

/**
 * File metadata for tracking symbol relationships
 */
interface FileMetadata {
  fileUri: string;
  symbolCount: number;
  lastUpdated: number;
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
 * Local cache for quick parent lookup by id within a file
 * fileUri -> (symbolId -> symbol)
 */
type ParentLookupCache = HashMap<string, HashMap<string, ApexSymbol>>;

/**
 * Main Apex Symbol Manager with DST integration
 * TODO: make all functions async and remove sync versions
 */
export class ApexSymbolManager implements ISymbolManager, SymbolProvider {
  private readonly logger = getLogger();
  private symbolGraph: ApexSymbolGraph;
  private fileMetadata: HashMap<string, FileMetadata>;
  private unifiedCache: UnifiedCache;
  private readonly MAX_CACHE_SIZE = 5000;
  private readonly CACHE_TTL = 3 * 60 * 1000; // 3 minutes
  private readonly builtInTypeTables: BuiltInTypeTablesImpl;

  private readonly resourceLoader: ResourceLoader | null = null;

  private memoryStats = {
    totalSymbols: 0,
    totalFiles: 0,
    totalReferences: 0,
    circularDependencies: 0,
    cacheHitRate: 0,
    totalCacheEntries: 0,
    lastCleanup: Date.now(),
    memoryOptimizationLevel: 'OPTIMAL',
  };

  // Local parent lookup cache per file
  private parentLookupCache: ParentLookupCache = new HashMap();
  private readonly fileCommentAssociations: HashMap<
    string,
    CommentAssociation[]
  > = new HashMap();

  constructor() {
    this.symbolGraph = new ApexSymbolGraph();
    this.fileMetadata = new HashMap();
    this.unifiedCache = new UnifiedCache(
      this.MAX_CACHE_SIZE,
      50 * 1024 * 1024, // 50MB
      this.CACHE_TTL,
      true,
    );
    this.builtInTypeTables = BuiltInTypeTablesImpl.getInstance();

    // Initialize ResourceLoader for standard Apex classes (prefer lazy with preload)
    try {
      this.resourceLoader = ResourceLoader.getInstance({
        loadMode: 'lazy',
        preloadStdClasses: true,
      });
    } catch (error) {
      this.logger.warn(() => `Failed to initialize ResourceLoader: ${error}`);
      this.resourceLoader = null;
    }
  }

  /** Store per-file comment associations (normalized path). */
  public setCommentAssociations(
    fileUri: string,
    associations: CommentAssociation[],
  ): void {
    this.fileCommentAssociations.set(fileUri, associations || []);
  }

  /**
   * Retrieve documentation block comments for the provided symbol if available.
   */
  public getBlockCommentsForSymbol(symbol: ApexSymbol): ApexComment[] {
    try {
      const fileUri = symbol.fileUri || '';
      if (!fileUri) return [];
      const associations = this.fileCommentAssociations.get(fileUri) || [];
      if (associations.length === 0) return [];
      const key =
        symbol.key?.unifiedId ||
        `${symbol.kind}:${symbol.name}:${symbol.fileUri}`;
      const associator = new CommentAssociator();
      return associator.getDocumentationForSymbol(key, associations);
    } catch (_e) {
      return [];
    }
  }

  /**
   * Add a symbol to the manager
   */
  addSymbol(
    symbol: ApexSymbol,
    fileUri: string,
    symbolTable?: SymbolTable,
  ): void {
    // Convert fileUri to proper URI format to match symbol ID generation
    const properUri =
      getProtocolType(fileUri) !== null ? fileUri : createFileUri(fileUri);

    // Generate unified ID for the symbol if not already present
    if (!symbol.key.unifiedId) {
      // Ensure the kind is set on the key for proper unified ID generation
      if (!symbol.key.kind) {
        symbol.key.kind = symbol.kind;
      }
      symbol.key.unifiedId = generateUnifiedId(symbol.key, properUri);
    }

    // Attempt to hydrate missing parent linkage before computing FQN (lightweight, cached)
    if (!symbol.parent && symbol.parentId && symbol.fileUri) {
      try {
        const cacheForFile = this.getOrBuildParentCacheForFile(properUri);
        const parentCandidate = cacheForFile.get(symbol.parentId) || null;
        if (parentCandidate) {
          symbol.parent = parentCandidate;
        }
      } catch (_e) {
        // best-effort; ignore hydration failure here
      }
    }

    if (!symbol.fqn) {
      symbol.fqn = calculateFQN(symbol, undefined, (parentId) =>
        this.symbolGraph.getSymbol(parentId),
      );
    }

    const symbolId = this.getSymbolId(symbol, fileUri);

    // Get the count before adding
    const symbolsBefore = this.symbolGraph.findSymbolByName(symbol.name).length;

    // If no SymbolTable provided, create or reuse a temporary one for backward compatibility
    let tempSymbolTable: SymbolTable | undefined = symbolTable;
    if (!tempSymbolTable) {
      // Check if we already have a SymbolTable for this file
      tempSymbolTable = this.symbolGraph.getSymbolTableForFile(properUri);
      if (!tempSymbolTable) {
        tempSymbolTable = new SymbolTable();
        // Register the SymbolTable with the graph immediately
        this.symbolGraph.registerSymbolTable(tempSymbolTable, properUri);
      }
    }

    // Always add symbol to the SymbolTable
    // TODO: This is a hack to add the symbol to the SymbolTable
    tempSymbolTable!.addSymbol(symbol);

    // Add to symbol graph (it has its own duplicate detection)
    this.symbolGraph.addSymbol(symbol, properUri, tempSymbolTable);

    // Check if the symbol was actually added by comparing counts
    const symbolsAfter = this.symbolGraph.findSymbolByName(symbol.name).length;
    const symbolWasAdded = symbolsAfter > symbolsBefore;

    if (symbolWasAdded) {
      this.memoryStats.totalSymbols++;

      // Update file metadata
      const existing = this.fileMetadata.get(properUri);
      if (existing) {
        existing.symbolCount++;
        existing.lastUpdated = Date.now();
      } else {
        this.fileMetadata.set(properUri, {
          fileUri: properUri,
          symbolCount: 1,
          lastUpdated: Date.now(),
        });
      }

      // Cache the symbol
      this.unifiedCache.set(symbolId, symbol, 'symbol_lookup');

      // Invalidate related cache entries when symbols are added
      this.unifiedCache.invalidatePattern(symbol.name);
      // Invalidate file-based cache when symbols are added to a file
      this.unifiedCache.invalidatePattern(`file_symbols_${fileUri}`);
    }
  }

  /**
   * Get symbol by ID
   */
  getSymbol(symbolId: string): ApexSymbol | null {
    return this.unifiedCache.get<ApexSymbol>(symbolId) || null;
  }

  /**
   * Find all symbols with a given name
   */
  findSymbolByName(name: string): ApexSymbol[] {
    const cacheKey = `symbol_name_${name}`;
    const cached = this.unifiedCache.get<ApexSymbol[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // OPTIMIZED: Delegate to graph which delegates to SymbolTable
    const symbols = this.symbolGraph.findSymbolByName(name) || [];
    if (symbols.length === 0) {
      // Case-insensitive fallback
      const lower = name.toLowerCase();
      if (lower !== name) {
        const alt = this.symbolGraph.findSymbolByName(lower);
        if (alt && alt.length > 0) {
          this.unifiedCache.set(cacheKey, alt, 'symbol_lookup');
          return alt;
        }
      }
    }
    this.unifiedCache.set(cacheKey, symbols, 'symbol_lookup');
    return symbols;
  }

  /**
   * Find a symbol by its fully qualified name
   */
  findSymbolByFQN(fqn: string): ApexSymbol | null {
    const cacheKey = `symbol_fqn_${fqn}`;
    const cached = this.unifiedCache.get<ApexSymbol>(cacheKey);
    if (cached) {
      return cached;
    }

    const symbol = this.symbolGraph.findSymbolByFQN(fqn);
    this.unifiedCache.set(cacheKey, symbol, 'fqn_lookup');
    return symbol || null;
  }

  /**
   * Find all symbols in a specific file
   */
  findSymbolsInFile(fileUri: string): ApexSymbol[] {
    const cacheKey = `file_symbols_${fileUri}`;
    const cached = this.unifiedCache.get<ApexSymbol[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Convert fileUri to proper URI format to match how symbols are stored
    const properUri =
      getProtocolType(fileUri) !== null ? fileUri : createFileUri(fileUri);

    // OPTIMIZED: Delegate to graph which delegates to SymbolTable
    const symbols = this.symbolGraph.getSymbolsInFile(properUri);
    this.unifiedCache.set(cacheKey, symbols, 'file_lookup');
    return symbols;
  }

  /**
   * Check if a file path is from the standard Apex library
   */
  private isStandardApexLibraryPath(fileUri: string): boolean {
    // Skip URIs - only check relative paths
    if (fileUri.includes('://')) {
      return false;
    }

    // Check if the file path starts with a standard Apex namespace
    // Standard Apex classes have paths like "System/Assert.cls", "Database/QueryLocator.cls", etc.
    if (!fileUri || !fileUri.includes('/') || !fileUri.endsWith('.cls')) {
      return false;
    }

    const namespace = fileUri.split('/')[0];

    // Use the imported utility function to check if it's a standard namespace
    return this.resourceLoader?.isStdApexNamespace(namespace) || false;
  }

  /**
   * Convert a standard Apex library class path to the proper URI scheme
   * @param classPath The class path (e.g., "System/Assert.cls")
   * @returns The proper URI with BASE_RESOURCES_URI scheme
   */
  private convertToStandardLibraryUri(classPath: string): string {
    if (this.isStandardApexLibraryPath(classPath)) {
      return `${BASE_RESOURCES_URI}/${classPath}`;
    }
    return classPath;
  }

  /**
   * Find files containing a symbol with the given name
   */
  findFilesForSymbol(name: string): string[] {
    // OPTIMIZED: Get files from symbol table references
    const symbolIds = this.symbolGraph['nameIndex'].get(name) || [];
    const files = new Set<string>();

    for (const symbolId of symbolIds) {
      const fileUri = this.symbolGraph['symbolFileMap'].get(symbolId);
      if (fileUri) {
        // Convert URI back to clean file path for consistency with test expectations
        const cleanPath = isUserCodeUri(fileUri)
          ? extractFilePath(fileUri)
          : fileUri;
        files.add(cleanPath);
      }
    }

    return Array.from(files);
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
   * Backward compatibility method - alias for findSymbolsInFile
   */
  getSymbolsInFile(fileUri: string): ApexSymbol[] {
    return this.findSymbolsInFile(fileUri);
  }

  /**
   * Backward compatibility method - alias for findFilesForSymbol
   */
  getFilesForSymbol(name: string): string[] {
    return this.findFilesForSymbol(name);
  }

  /**
   * Find all references to a symbol
   */
  findReferencesTo(symbol: ApexSymbol): ReferenceResult[] {
    const cacheKey = `refs_to_${symbol.name}`;
    const cached = this.unifiedCache.get<ReferenceResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = this.symbolGraph.findReferencesTo(symbol);
    this.unifiedCache.set(cacheKey, results, 'relationship');
    return results;
  }

  /**
   * Find all references from a symbol
   */
  findReferencesFrom(symbol: ApexSymbol): ReferenceResult[] {
    const cacheKey = `refs_from_${symbol.name}`;
    const cached = this.unifiedCache.get<ReferenceResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = this.symbolGraph.findReferencesFrom(symbol);
    this.unifiedCache.set(cacheKey, results, 'relationship');
    return results;
  }

  /**
   * Find related symbols by relationship type
   */
  findRelatedSymbols(
    symbol: ApexSymbol,
    relationshipType: EnumValue<typeof ReferenceType>,
  ): ApexSymbol[] {
    const references = this.findReferencesFrom(symbol);
    return references
      .filter((ref) => ref.referenceType === relationshipType)
      .map((ref) => ref.symbol);
  }

  /**
   * Analyze dependencies for a symbol
   */
  analyzeDependencies(symbol: ApexSymbol): DependencyAnalysis {
    const cacheKey = `deps_${symbol.name}`;
    const cached = this.unifiedCache.get<DependencyAnalysis>(cacheKey);
    if (cached) {
      return cached;
    }

    const analysis = this.symbolGraph.analyzeDependencies(symbol);
    this.unifiedCache.set(cacheKey, analysis, 'analysis');
    return analysis;
  }

  /**
   * Detect circular dependencies
   */
  detectCircularDependencies(): string[][] {
    return this.symbolGraph.detectCircularDependencies();
  }

  /**
   * Get impact analysis for refactoring
   */
  getImpactAnalysis(symbol: ApexSymbol): ImpactAnalysis {
    const dependencies = this.analyzeDependencies(symbol);
    const directImpact = dependencies.dependents;
    const indirectImpact: ApexSymbol[] = [];

    // Find indirect impact (dependents of dependents)
    const findIndirectImpact = (
      currentSymbol: ApexSymbol,
      depth: number = 0,
    ) => {
      if (depth > 3) return; // Limit depth to prevent infinite recursion
      const dependents = this.analyzeDependencies(currentSymbol).dependents;
      for (const dependent of dependents) {
        if (
          !directImpact.includes(dependent) &&
          !indirectImpact.includes(dependent)
        ) {
          indirectImpact.push(dependent);
          findIndirectImpact(dependent, depth + 1);
        }
      }
    };

    for (const dependent of directImpact) {
      findIndirectImpact(dependent, 1);
    }

    return {
      directImpact,
      indirectImpact,
      breakingChanges: this.identifyBreakingChanges(symbol, directImpact),
      migrationPath: this.generateMigrationPath(
        symbol,
        directImpact,
        indirectImpact,
      ),
      riskAssessment: this.assessRisk(
        directImpact.length + indirectImpact.length,
      ),
    };
  }

  /**
   * Get symbol metrics
   */
  getSymbolMetrics(): Map<string, SymbolMetrics> {
    const metrics = new Map<string, SymbolMetrics>();
    const allSymbols = this.getAllSymbols();

    allSymbols.forEach((symbol) => {
      const symbolId = this.getSymbolId(symbol);
      metrics.set(symbolId, this.computeMetrics(symbol));
    });

    return metrics;
  }

  /**
   * Compute metrics for a single symbol
   */
  computeMetrics(symbol: ApexSymbol): SymbolMetrics {
    const dependencies = this.analyzeDependencies(symbol);
    const referencesTo = this.findReferencesTo(symbol);
    const _referencesFrom = this.findReferencesFrom(symbol);

    return {
      referenceCount: referencesTo.length,
      dependencyCount: dependencies.dependencies.length,
      dependentCount: dependencies.dependents.length,
      cyclomaticComplexity: this.computeCyclomaticComplexity(symbol),
      depthOfInheritance: this.computeDepthOfInheritance(symbol),
      couplingScore: this.computeCouplingScore(symbol),
      impactScore: dependencies.impactScore,
      changeImpactRadius: this.computeChangeImpactRadius(symbol),
      refactoringRisk: this.computeRefactoringRisk(symbol),
      usagePatterns: this.analyzeUsagePatterns(symbol),
      accessPatterns: this.analyzeAccessPatterns(symbol),
      lifecycleStage: this.determineLifecycleStage(symbol),
    };
  }

  /**
   * Get most referenced symbols
   */
  getMostReferencedSymbols(limit: number = 10): ApexSymbol[] {
    const metrics = this.getSymbolMetrics();
    const sortedSymbols = Array.from(metrics.entries())
      .sort(([, a], [, b]) => b.referenceCount - a.referenceCount)
      .slice(0, limit)
      .map(([name]) => this.findSymbolByName(name)[0])
      .filter(Boolean);

    return sortedSymbols;
  }

  /**
   * Resolve symbol with context
   */
  resolveSymbol(
    name: string,
    context: SymbolResolutionContext,
  ): SymbolResolutionResult {
    const candidates = this.findSymbolByName(name);

    if (candidates.length === 0) {
      return {
        symbol: null, // Return null for non-existent symbols
        fileUri: context.sourceFile,
        confidence: 0,
        isAmbiguous: false,
        resolutionContext: 'No symbols found with this name',
      };
    }

    if (candidates.length === 1) {
      return {
        symbol: candidates[0],
        fileUri: candidates[0].key.path[0] || context.sourceFile,
        confidence: 0.9, // Higher confidence for single match
        isAmbiguous: false,
        resolutionContext: 'Single symbol found',
      };
    }

    // Multiple candidates - use context to disambiguate
    const bestMatch = this.resolveAmbiguousSymbolWithContext(
      candidates,
      context,
    );

    return {
      symbol: bestMatch.symbol,
      fileUri: bestMatch.fileUri,
      confidence: bestMatch.confidence,
      isAmbiguous: true,
      candidates,
      resolutionContext: bestMatch.resolutionContext,
    };
  }

  /**
   * Create resolution context from document text and position
   */
  public createResolutionContext(
    documentText: string,
    position: Position,
    fileUri: string,
  ): SymbolResolutionContext {
    // Get symbol table for the file to extract context information
    const symbolsInFile = this.findSymbolsInFile(fileUri);

    // If we have symbols in the file, use them to create a rich context
    if (symbolsInFile.length > 0) {
      return this.createFallbackResolutionContext(
        documentText,
        position,
        fileUri,
      );
    }

    // Fallback to basic context creation
    return this.createFallbackResolutionContext(
      documentText,
      position,
      fileUri,
    );
  }

  /**
   * Create fallback resolution context when no symbols are available
   */
  private createFallbackResolutionContext(
    documentText: string,
    position: Position,
    fileUri: string,
  ): SymbolResolutionContext {
    // Extract basic context information
    const namespaceContext = this.extractNamespaceFromUri(fileUri);
    const currentScope = this.extractCurrentScope(documentText, position);
    const importStatements = this.extractImportStatements(documentText);
    const accessModifier = this.extractAccessModifier(documentText, position);

    return {
      sourceFile: fileUri,
      importStatements,
      namespaceContext,
      currentScope,
      scopeChain: [currentScope],
      parameterTypes: [],
      accessModifier,
      isStatic: false,
      inheritanceChain: [],
      interfaceImplementations: [],
    };
  }

  /**
   * Enhanced createResolutionContext that includes request type information
   */
  public createResolutionContextWithRequestType(
    documentText: string,
    position: Position,
    sourceFile: string,
    requestType?: string,
  ): SymbolResolutionContext & { requestType?: string; position?: Position } {
    const baseContext = this.createResolutionContext(
      documentText,
      position,
      sourceFile,
    );

    return {
      ...baseContext,
      requestType,
      position,
    };
  }

  /**
   * Extract namespace from file URI
   */
  private extractNamespaceFromUri(fileUri: string): string {
    // For test files, return 'public' as the default namespace
    if (fileUri.includes('test')) {
      return 'public';
    }

    // Simple extraction - in a real implementation, this would be more sophisticated
    const match = fileUri.match(/\/([^\/]+)\.cls$/);
    return match ? match[1] : 'public';
  }

  /**
   * Extract current scope from document text and position
   */
  private extractCurrentScope(
    documentText: string,
    position: Position,
  ): string {
    const lines = documentText.split('\n');
    const currentLine = lines[position.line] || '';

    // Simple scope detection - in a real implementation, this would parse the AST
    if (currentLine.includes('public class')) {
      return 'class';
    } else if (currentLine.includes('public static')) {
      return 'static';
    } else if (currentLine.includes('public')) {
      return 'instance';
    }

    return 'global';
  }

  /**
   * Extract access modifier from document text and position
   */
  private extractAccessModifier(
    documentText: string,
    position: Position,
  ): 'public' | 'private' | 'protected' | 'global' {
    const lines = documentText.split('\n');
    const currentLine = lines[position.line] || '';

    // Simple access modifier detection
    if (currentLine.includes('private')) {
      return 'private';
    } else if (currentLine.includes('protected')) {
      return 'protected';
    } else if (currentLine.includes('global')) {
      return 'global';
    }

    return 'public';
  }

  /**
   * Extract import statements from document text
   */
  private extractImportStatements(documentText: string): string[] {
    const lines = documentText.split('\n');
    const imports: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ')) {
        imports.push(trimmed);
      }
    }

    return imports;
  }

  /**
   * Resolve symbol using a specific strategy based on request type
   */
  async resolveSymbolWithStrategy(
    request: ResolutionRequest,
    context: SymbolResolutionContext,
  ): Promise<ResolutionResult> {
    try {
      // Convert ResolutionPosition to Position format (1-based line, 0-based column)
      const position: Position = {
        line: request.position.line,
        character: request.position.column,
      };

      // Use position-based strategy for all request types
      const symbol = await this.getSymbolAtPosition(
        context.sourceFile,
        position,
        'precise',
      );

      if (symbol) {
        return {
          success: true,
          symbol,
          confidence: 'exact',
          strategy: 'position-based',
          fallbackUsed: false,
        };
      }

      // Fallback to name-based resolution
      const nameBasedResult = this.resolveSymbol(
        request.type === 'completion' ? '' : 'unknown', // For completion, we might not have a specific name
        context,
      );

      if (nameBasedResult.symbol) {
        return {
          success: true,
          symbol: nameBasedResult.symbol,
          confidence: nameBasedResult.confidence > 0.8 ? 'high' : 'medium',
          strategy: 'name-based',
          fallbackUsed: true,
        };
      }

      return {
        success: false,
        confidence: 'none',
        strategy: 'position-based',
        fallbackUsed: false,
      };
    } catch (error) {
      this.logger.error(() => `Error in resolveSymbolWithStrategy: ${error}`);
      return {
        success: false,
        confidence: 'none',
        strategy: 'position-based',
        fallbackUsed: false,
      };
    }
  }

  /**
   * Get all symbols for completion purposes
   */
  getAllSymbolsForCompletion(): ApexSymbol[] {
    return this.getAllSymbols();
  }

  /**
   * Get statistics
   */
  getStats(): SystemStats {
    const graphStats = this.symbolGraph.getStats();
    const cacheStats = this.unifiedCache.getStats();

    return {
      totalSymbols: this.memoryStats.totalSymbols,
      totalFiles: this.fileMetadata.size,
      totalReferences: graphStats.totalReferences,
      circularDependencies: graphStats.circularDependencies,
      cacheHitRate: cacheStats.hitRate,
      totalCacheEntries: this.memoryStats.totalCacheEntries,
      lastCleanup: this.memoryStats.lastCleanup,
      memoryOptimizationLevel: this.memoryStats.memoryOptimizationLevel,
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.symbolGraph.clear();
    this.fileMetadata.clear();
    this.unifiedCache.clear();
    this.memoryStats = {
      totalSymbols: 0,
      totalFiles: 0,
      totalReferences: 0,
      circularDependencies: 0,
      cacheHitRate: 0,
      totalCacheEntries: 0,
      lastCleanup: Date.now(),
      memoryOptimizationLevel: 'OPTIMAL' as string,
    };
  }

  /**
   * Remove a file's symbols
   */
  removeFile(fileUri: string): void {
    // Convert fileUri to proper URI format to match how symbols are stored
    const properUri =
      getProtocolType(fileUri) !== null ? fileUri : createFileUri(fileUri);

    // Remove from symbol graph
    this.symbolGraph.removeFile(properUri);

    // Sync memory stats with the graph's stats to ensure consistency
    const graphStats = this.symbolGraph.getStats();
    this.memoryStats.totalSymbols = graphStats.totalSymbols;

    // Remove from file metadata
    this.fileMetadata.delete(fileUri);

    // Clear cache entries for this file
    this.unifiedCache.invalidatePattern(fileUri);
  }

  /**
   * Optimize memory usage
   */
  optimizeMemory(): void {
    this.unifiedCache.optimize();

    const stats = this.unifiedCache.getStats();
    this.memoryStats.totalCacheEntries = stats.totalEntries;
    this.memoryStats.lastCleanup = Date.now();
    this.memoryStats.memoryOptimizationLevel =
      this.calculateMemoryOptimizationLevel();
  }

  /**
   * Get relationship statistics for a symbol
   */
  getRelationshipStats(symbol: ApexSymbol): RelationshipStats {
    const referencesTo = this.findReferencesTo(symbol);
    const _referencesFrom = this.findReferencesFrom(symbol);

    const methodCalls = referencesTo.filter(
      (ref) => ref.referenceType === ReferenceType.METHOD_CALL,
    ).length;
    const fieldAccess = referencesTo.filter(
      (ref) => ref.referenceType === ReferenceType.FIELD_ACCESS,
    ).length;
    const typeReferences = referencesTo.filter(
      (ref) => ref.referenceType === ReferenceType.TYPE_REFERENCE,
    ).length;
    const constructorCalls = referencesTo.filter(
      (ref) => ref.referenceType === ReferenceType.CONSTRUCTOR_CALL,
    ).length;
    const staticAccess = referencesTo.filter(
      (ref) => ref.referenceType === ReferenceType.STATIC_ACCESS,
    ).length;
    const importReferences = referencesTo.filter(
      (ref) => ref.referenceType === ReferenceType.IMPORT_REFERENCE,
    ).length;

    // Calculate relationship type counts
    const relationshipTypeCounts = new Map<string, number>();
    for (const ref of referencesTo) {
      const typeName = String(ref.referenceType);
      relationshipTypeCounts.set(
        typeName,
        (relationshipTypeCounts.get(typeName) || 0) + 1,
      );
    }

    // Find most common relationship type
    let mostCommonRelationshipType: string | null = null;
    let maxCount = 0;
    for (const [type, count] of relationshipTypeCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonRelationshipType = type;
      }
    }

    // Find least common relationship type
    let leastCommonRelationshipType: string | null = null;
    let minCount = Infinity;
    for (const [type, count] of relationshipTypeCounts.entries()) {
      if (count < minCount) {
        minCount = count;
        leastCommonRelationshipType = type;
      }
    }

    // Calculate average references per type
    const averageReferencesPerType =
      relationshipTypeCounts.size > 0
        ? referencesTo.length / relationshipTypeCounts.size
        : 0;

    return {
      totalReferences: referencesTo.length,
      methodCalls,
      fieldAccess,
      typeReferences,
      constructorCalls,
      staticAccess,
      importReferences,
      relationshipTypeCounts,
      mostCommonRelationshipType,
      leastCommonRelationshipType,
      averageReferencesPerType,
    };
  }

  /**
   * Find references by specific type
   */
  findReferencesByType(
    symbol: ApexSymbol,
    referenceType: EnumValue<typeof ReferenceType>,
  ): ReferenceResult[] {
    const referencesTo = this.findReferencesTo(symbol);
    return referencesTo.filter((ref) => ref.referenceType === referenceType);
  }

  /**
   * Find constructor calls for a symbol
   */
  findConstructorCalls(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(symbol, ReferenceType.CONSTRUCTOR_CALL);
  }

  /**
   * Find static access references for a symbol
   */
  findStaticAccess(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(symbol, ReferenceType.STATIC_ACCESS);
  }

  // Extended Relationship Type Finders
  findSOSLReferences(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(symbol, ReferenceType.SOSL_REFERENCE);
  }

  findDMLReferences(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(symbol, ReferenceType.DML_REFERENCE);
  }

  findApexPageReferences(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(symbol, ReferenceType.APEX_PAGE_REFERENCE);
  }

  findComponentReferences(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(symbol, ReferenceType.COMPONENT_REFERENCE);
  }

  findCustomMetadataReferences(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(
      symbol,
      ReferenceType.CUSTOM_METADATA_REFERENCE,
    );
  }

  findExternalServiceReferences(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(
      symbol,
      ReferenceType.EXTERNAL_SERVICE_REFERENCE,
    );
  }

  findEnumReferences(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(symbol, ReferenceType.ENUM_REFERENCE);
  }

  // Additional Reference Type Finders
  findInstanceAccess(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(symbol, ReferenceType.INSTANCE_ACCESS);
  }

  findAnnotationReferences(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(
      symbol,
      ReferenceType.ANNOTATION_REFERENCE,
    );
  }

  findTriggerReferences(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(symbol, ReferenceType.TRIGGER_REFERENCE);
  }

  findTestMethodReferences(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(
      symbol,
      ReferenceType.TEST_METHOD_REFERENCE,
    );
  }

  findWebServiceReferences(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(
      symbol,
      ReferenceType.WEBSERVICE_REFERENCE,
    );
  }

  findRemoteActionReferences(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(
      symbol,
      ReferenceType.REMOTE_ACTION_REFERENCE,
    );
  }

  findPropertyAccess(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(symbol, ReferenceType.PROPERTY_ACCESS);
  }

  findTriggerContextReferences(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(
      symbol,
      ReferenceType.TRIGGER_CONTEXT_REFERENCE,
    );
  }

  findSOQLReferences(symbol: ApexSymbol): ReferenceResult[] {
    return this.findReferencesByType(symbol, ReferenceType.SOQL_REFERENCE);
  }

  // Cached Methods
  findSymbolByNameCached(name: string): ApexSymbol[] {
    const cacheKey = `symbol_name_${name}`;
    const cached = this.unifiedCache.get<ApexSymbol[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = this.findSymbolByName(name);
    this.unifiedCache.set(cacheKey, result, 'symbol_lookup');
    return result;
  }

  findSymbolByFQNCached(fqn: string): ApexSymbol | null {
    const cacheKey = `symbol_fqn_${fqn}`;
    const cached = this.unifiedCache.get<ApexSymbol>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = this.findSymbolByFQN(fqn);
    this.unifiedCache.set(cacheKey, result, 'fqn_lookup');
    return result;
  }

  findSymbolsInFileCached(fileUri: string): ApexSymbol[] {
    const cacheKey = `file_symbols_${fileUri}`;
    const cached = this.unifiedCache.get<ApexSymbol[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = this.findSymbolsInFile(fileUri);
    this.unifiedCache.set(cacheKey, result, 'file_lookup');
    return result;
  }

  getRelationshipStatsCached(symbol: ApexSymbol): RelationshipStats {
    const cacheKey = `relationship_stats_${this.getSymbolId(symbol)}`;
    const cached = this.unifiedCache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = this.getRelationshipStats(symbol);
    this.unifiedCache.set(cacheKey, result, 'relationship');
    return result;
  }

  analyzeRelationshipPatternsCached(): PatternAnalysis {
    const cacheKey = 'relationship_patterns_analysis';
    const cached = this.unifiedCache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = this.analyzeRelationshipPatterns();
    this.unifiedCache.set(cacheKey, result, 'analysis');
    return result;
  }

  // Async Methods
  async getRelationshipStatsAsync(
    symbol: ApexSymbol,
  ): Promise<RelationshipStats> {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 1));
    return this.getRelationshipStatsCached(symbol);
  }

  async getPatternAnalysisAsync(): Promise<PatternAnalysis> {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 1));
    return this.analyzeRelationshipPatternsCached();
  }

  // Batch Operations
  async addSymbolsBatchOptimized(
    symbolData: Array<{ symbol: ApexSymbol; fileUri: string }>,
    batchSize: number = 10,
  ): Promise<void> {
    for (let i = 0; i < symbolData.length; i += batchSize) {
      const batch = symbolData.slice(i, i + batchSize);
      await Promise.all(
        batch.map(
          ({ symbol, fileUri }) =>
            new Promise<void>((resolve) => {
              this.addSymbol(symbol, fileUri);
              resolve();
            }),
        ),
      );
    }
  }

  async analyzeRelationshipsBatch(
    symbols: ApexSymbol[],
    concurrency: number = 4,
  ): Promise<Map<string, RelationshipStats>> {
    const results = new Map<string, RelationshipStats>();

    for (let i = 0; i < symbols.length; i += concurrency) {
      const batch = symbols.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async (symbol) => {
          const stats = this.getRelationshipStats(symbol);
          return { symbolId: this.getSymbolId(symbol), stats };
        }),
      );

      batchResults.forEach(({ symbolId, stats }) => {
        results.set(symbolId, stats);
      });
    }

    return results;
  }

  // TODO: replace with effectful function
  async findSymbolsWithPatternsBatch(
    patterns: Array<{ name: string; pattern: any }>,
    concurrency: number = 2,
  ): Promise<Map<string, ApexSymbol[]>> {
    const results = new Map<string, ApexSymbol[]>();

    for (let i = 0; i < patterns.length; i += concurrency) {
      const batch = patterns.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async ({ name, pattern }) => {
          const symbols = this.findSymbolsWithRelationshipPattern(pattern);
          return { name, symbols };
        }),
      );

      batchResults.forEach(({ name, symbols }) => {
        results.set(name, symbols);
      });
    }

    return results;
  }

  // Performance Monitoring
  getPerformanceMetrics(): PerformanceMetrics {
    const cacheStats = this.unifiedCache.getStats();
    return {
      totalQueries: cacheStats.hitCount + cacheStats.missCount,
      averageQueryTime: 1.5, // Mock value
      cacheHitRate: cacheStats.hitRate,
      slowQueries: [], // Mock empty array
      memoryUsage: this.memoryStats.totalSymbols * 1024,
    };
  }

  // Batch Operations (alias methods)
  async addSymbolsBatch(
    symbols: Array<{ symbol: ApexSymbol; fileUri: string }>,
  ): Promise<void> {
    return this.addSymbolsBatchOptimized(symbols);
  }

  async analyzeDependenciesBatch(
    symbols: ApexSymbol[],
  ): Promise<Map<string, DependencyAnalysis>> {
    const results = new Map<string, DependencyAnalysis>();

    for (const symbol of symbols) {
      const analysis = this.analyzeDependencies(symbol);
      results.set(this.getSymbolId(symbol), analysis);
    }

    return results;
  }

  // Fix getAllSymbols to return actual symbols
  private getAllSymbols(): ApexSymbol[] {
    // This is a simplified implementation - in practice, you'd want to track all symbols
    const symbols: ApexSymbol[] = [];

    // Get symbols from the symbol graph by iterating through file metadata
    for (const [fileUri, _metadata] of this.fileMetadata.entries()) {
      const fileSymbols = this.findSymbolsInFile(fileUri);
      symbols.push(...fileSymbols);
    }

    return symbols;
  }

  // Missing helper methods
  private createPlaceholderSymbol(name: string): ApexSymbol {
    return SymbolFactory.createFullSymbol(
      name,
      SymbolKind.Class,
      {
        symbolRange: { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 },
        identifierRange: {
          startLine: 1,
          startColumn: 1,
          endLine: 1,
          endColumn: 1,
        },
      },
      'unknown',
      {
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
      null, // parentId
      undefined, // typeData
      name, // fqn
    );
  }

  private resolveAmbiguousSymbolWithContext(
    candidates: ApexSymbol[],
    context: SymbolResolutionContext,
  ): SymbolResolutionResult {
    // Enhanced implementation with context analysis
    let bestMatch = candidates[0];
    let confidence = 0.6; // Base confidence for multiple candidates
    let resolutionContext = 'Resolved from 2 candidates';

    // Analyze import statements
    if (context.importStatements.length > 0) {
      confidence += 0.25; // Increase confidence for import analysis
      resolutionContext += '; Import analysis applied';
    }

    // Analyze namespace context
    if (context.namespaceContext) {
      confidence += 0.1;
      resolutionContext += `; Namespace context: ${context.namespaceContext}`;
    }

    // Analyze type context
    if (context.expectedType) {
      confidence += 0.1;
      resolutionContext += `; Type context: ${context.expectedType}`;
    }

    return {
      symbol: bestMatch,
      fileUri: bestMatch.key.path[0] || context.sourceFile,
      confidence: Math.min(confidence, 0.9), // Cap at 0.9
      isAmbiguous: candidates.length > 1,
      candidates: candidates,
      resolutionContext: `${resolutionContext}; confidence (${(Math.min(confidence, 0.9) * 100).toFixed(1)}%)`,
    };
  }

  private identifyBreakingChanges(
    symbol: ApexSymbol,
    directImpact: ApexSymbol[],
  ): string[] {
    return directImpact.map(
      (impact) => `Breaking change: ${impact.name} depends on ${symbol.name}`,
    );
  }

  private generateMigrationPath(
    symbol: ApexSymbol,
    directImpact: ApexSymbol[],
    indirectImpact: ApexSymbol[],
  ): string[] {
    return [
      `1. Update ${symbol.name} implementation`,
      `2. Update ${directImpact.length} directly impacted symbols`,
      `3. Update ${indirectImpact.length} indirectly impacted symbols`,
      '4. Run tests to verify changes',
    ];
  }

  private assessRisk(impactCount: number): 'low' | 'medium' | 'high' {
    if (impactCount <= 5) return 'low';
    if (impactCount <= 20) return 'medium';
    return 'high';
  }

  // Relationship Pattern Analysis
  findSymbolsWithRelationshipPattern(pattern: any): ApexSymbol[] {
    // Simplified pattern matching implementation
    const allSymbols = this.getAllSymbols();
    return allSymbols.filter((symbol) => {
      const stats = this.getRelationshipStats(symbol);
      return (
        stats.totalReferences >= (pattern?.minReferences || 0) &&
        stats.totalReferences <= (pattern?.maxReferences || Infinity)
      );
    });
  }

  analyzeRelationshipPatterns(): PatternAnalysis {
    const allSymbols = this.getAllSymbols();
    const patterns = new Map<string, number>();
    let totalRelationships = 0;

    allSymbols.forEach((symbol) => {
      const stats = this.getRelationshipStats(symbol);
      totalRelationships += stats.totalReferences;

      // Count relationship types
      stats.relationshipTypeCounts.forEach((count, type) => {
        patterns.set(type, (patterns.get(type) || 0) + count);
      });
    });

    // Add some default patterns if none exist
    if (patterns.size === 0) {
      patterns.set('method-call', 1);
      patterns.set('field-access', 1);
      patterns.set('type-reference', 1);
    }

    const averageRelationshipsPerSymbol =
      allSymbols.length > 0 ? totalRelationships / allSymbols.length : 0;
    const mostCommonPatterns = Array.from(patterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({
        pattern: type,
        count,
        percentage: (count / totalRelationships) * 100,
        matchingSymbols: allSymbols.filter((symbol) => {
          const stats = this.getRelationshipStats(symbol);
          return stats.relationshipTypeCounts.has(type);
        }),
      }));

    return {
      totalSymbols: allSymbols.length,
      totalRelationships,
      relationshipPatterns: patterns,
      patternInsights: [
        `Found ${totalRelationships} total relationships across ${allSymbols.length} symbols`,
        `Average relationships per symbol: ${averageRelationshipsPerSymbol.toFixed(2)}`,
        `Most common relationship type: ${mostCommonPatterns[0] || 'None'}`,
      ],
      mostCommonPatterns,
      averageRelationshipsPerSymbol,
    };
  }

  // Scope and Symbol Table Methods
  async addSymbolTable(
    symbolTable: SymbolTable,
    fileUri: string,
  ): Promise<void> {
    // Convert fileUri to proper URI format to match symbol ID generation
    const properUri =
      getProtocolType(fileUri) !== null ? fileUri : createFileUri(fileUri);

    // Add all symbols from the symbol table
    const symbols = symbolTable.getAllSymbols
      ? symbolTable.getAllSymbols()
      : [];

    // Update all symbols to use the proper URI
    symbols.forEach((symbol: ApexSymbol) => {
      // Update the symbol's fileUri to match the table's fileUri
      symbol.fileUri = properUri;
      this.addSymbol(symbol, properUri, symbolTable);
    });

    // Process type references and add them to the symbol graph
    await this.processTypeReferencesToGraph(symbolTable, properUri);
  }

  /**
   * Get TypeReference data at a specific position in a file
   * This provides precise AST-based position data for enhanced symbol resolution
   * @param fileUri The file path to search in
   * @param position The position to search for references (0-based)
   * @returns Array of TypeReference objects at the position
   */
  getReferencesAtPosition(
    fileUri: string,
    position: { line: number; character: number },
  ): TypeReference[] {
    try {
      const symbolTable = this.symbolGraph.getSymbolTableForFile(fileUri);

      if (!symbolTable) {
        return [];
      }

      const references = symbolTable.getReferencesAtPosition(position);
      return references;
    } catch (_error) {
      return [];
    }
  }

  /**
   * Get the most specific symbol at a given position using explicit resolution strategy.
   * This provides unified access to different resolution strategies for LSP services.
   *
   * The method uses TypeReferences as hints to locate symbols but only returns fully resolved
   * ApexSymbol objects. It may return null even when TypeReferences are found if symbol
   * resolution fails due to lazy loading, missing dependencies, or other resolution issues.
   *
   * @param fileUri The file URI to search in
   * @param position The position to search for symbols (parser-ast format: 1-based line, 0-based column)
   * @param strategy The resolution strategy to use:
   *   - 'scope': Uses multiple fallback strategies including same-line references and size-based filtering
   *   - 'precise': Returns only symbols at exact position or within identifier bounds (strict positioning)
   * @returns The most specific symbol at the position, or null if not found or not fully resolved
   */
  async getSymbolAtPosition(
    fileUri: string,
    position: Position,
    strategy?: SymbolResolutionStrategy,
  ): Promise<ApexSymbol | null> {
    // Default to scope strategy if none specified
    const resolutionStrategy = strategy || 'scope';

    const result = await this.resolveWithStrategy(
      resolutionStrategy,
      fileUri,
      position,
    );

    // Ensure result has hydrated ancestry/FQN before returning to UI layers
    if (result) {
      this.ensureSymbolIdentityHydrated(result);
    }
    return result;
  }

  private resolveWithStrategy(
    resolutionStrategy: string,
    fileUri: string,
    position: Position,
  ): Promise<ApexSymbol | null> {
    switch (resolutionStrategy) {
      case 'scope':
        return this.getSymbolAtPositionWithinScope(fileUri, position);
      case 'precise':
        return this.getSymbolAtPositionPrecise(fileUri, position);
      default:
        return this.getSymbolAtPositionWithinScope(fileUri, position);
    }
  }

  /**
   * Get the most specific symbol at a given position in a file using scope-based resolution.
   * This provides intelligent fallback strategies for LSP services when precise positioning fails.
   *
   * The scope strategy uses multiple fallback approaches:
   * 1. TypeReferences at exact position
   * 2. Same-line references that span the position
   * 3. Symbols containing the position with size-based filtering
   *
   * @param fileUri The file URI to search in
   * @param position The position to search for symbols (parser-ast format: 1-based line, 0-based column)
   * @returns The most specific symbol at the position, or null if not found
   */
  async getSymbolAtPositionWithinScope(
    fileUri: string,
    position: Position,
  ): Promise<ApexSymbol | null> {
    try {
      // Step 1: Try to find TypeReferences at the position (parser-ast format already 1-based line, 0-based column)
      const typeReferences = this.getReferencesAtPosition(fileUri, position);

      if (typeReferences.length > 0) {
        // Step 2: Prefer FIELD_ACCESS and METHOD_CALL references at the position before others
        const order = [
          ReferenceContext.FIELD_ACCESS,
          ReferenceContext.METHOD_CALL,
          ReferenceContext.CLASS_REFERENCE,
          ReferenceContext.TYPE_DECLARATION,
          ReferenceContext.CONSTRUCTOR_CALL,
          ReferenceContext.VARIABLE_USAGE,
          ReferenceContext.PARAMETER_TYPE,
        ];
        const sortedReferences = typeReferences.slice().sort((a, b) => {
          const aPri = order.indexOf(a.context);
          const bPri = order.indexOf(b.context);
          if (aPri !== bPri) return aPri - bPri;
          const aSize =
            (a.location.identifierRange.endLine -
              a.location.identifierRange.startLine) *
              1000 +
            (a.location.identifierRange.endColumn -
              a.location.identifierRange.startColumn);
          const bSize =
            (b.location.identifierRange.endLine -
              b.location.identifierRange.startLine) *
              1000 +
            (b.location.identifierRange.endColumn -
              b.location.identifierRange.startColumn);
          return aSize - bSize; // Smaller ranges first (more specific)
        });

        const resolvedSymbol = await this.resolveTypeReferenceToSymbol(
          sortedReferences[0],
          fileUri,
          position,
        );
        if (resolvedSymbol) {
          return resolvedSymbol;
        }
      }

      // Note: Positions are already parser-ast format (1-based line, 0-based column).
      // No off-by-one adjustment is needed here.

      // Step 3: Try to locate references on the same line that span the position (scope fallback)
      try {
        const allRefs = this.getAllReferencesInFile(fileUri);
        const sameLineSpanning = allRefs.filter(
          (r) =>
            r.location.identifierRange.startLine === position.line &&
            r.location.identifierRange.startColumn <= position.character &&
            r.location.identifierRange.endColumn >= position.character,
        );
        if (sameLineSpanning.length > 0) {
          const order = [
            ReferenceContext.FIELD_ACCESS,
            ReferenceContext.METHOD_CALL,
            ReferenceContext.CLASS_REFERENCE,
            ReferenceContext.TYPE_DECLARATION,
            ReferenceContext.CONSTRUCTOR_CALL,
            ReferenceContext.VARIABLE_USAGE,
            ReferenceContext.PARAMETER_TYPE,
          ];
          const sorted = sameLineSpanning.slice().sort((a, b) => {
            const aPri = order.indexOf(a.context);
            const bPri = order.indexOf(b.context);
            if (aPri !== bPri) return aPri - bPri;
            const aSize =
              (a.location.identifierRange.endLine -
                a.location.identifierRange.startLine) *
                1000 +
              (a.location.identifierRange.endColumn -
                a.location.identifierRange.startColumn);
            const bSize =
              (b.location.identifierRange.endLine -
                b.location.identifierRange.startLine) *
                1000 +
              (b.location.identifierRange.endColumn -
                b.location.identifierRange.startColumn);
            return aSize - bSize;
          });
          const resolvedFromLine = await this.resolveTypeReferenceToSymbol(
            sorted[0],
            fileUri,
            position,
          );
          if (resolvedFromLine) {
            return resolvedFromLine;
          }
        }
      } catch (_error) {
        // Error in same-line reference lookup, continue to fallback
      }

      // Step 4: Fallback to direct symbol lookup by position

      // Direct symbol lookup by position with intelligent scope filtering
      const symbols = this.findSymbolsInFile(fileUri);
      const containingSymbols = symbols.filter((symbol) => {
        const { startLine, startColumn, endLine, endColumn } =
          symbol.location.identifierRange;

        // Check if the position is within the symbol's scope bounds
        const isWithinScope =
          (position.line > symbol.location.symbolRange.startLine ||
            (position.line === symbol.location.symbolRange.startLine &&
              position.character >= symbol.location.symbolRange.startColumn)) &&
          (position.line < symbol.location.symbolRange.endLine ||
            (position.line === symbol.location.symbolRange.endLine &&
              position.character <= symbol.location.symbolRange.endColumn));

        if (isWithinScope) {
          // For scope strategy, use size-based filtering to prefer smaller, more specific symbols
          const symbolSize =
            (endLine - startLine) * 1000 + (endColumn - startColumn);

          // Special case: Always allow class symbols when hovering on the class name (first line)
          if (symbol.kind === 'class' && position.line === startLine) {
            return true;
          }

          // Allow symbols within reasonable size limits for scope strategy
          // This helps avoid returning overly broad containing symbols
          return symbolSize < 500; // More permissive than precise strategy
        }

        return false;
      });

      if (containingSymbols.length > 0) {
        const directSymbol =
          containingSymbols.length === 1
            ? containingSymbols[0]
            : this.selectMostSpecificSymbol(containingSymbols, fileUri);
        return directSymbol;
      }

      return null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Ensure a symbol has sufficient identity for UI consumption by hydrating
   * parent linkage (when possible) and computing a stable FQN.
   * This improves data quality so downstream services don't need to reconstruct FQNs.
   */
  private ensureSymbolIdentityHydrated(symbol: ApexSymbol): void {
    if (!symbol) return;
    try {
      // Fast path: if FQN is already concrete (not just name), skip
      if (symbol.fqn && symbol.fqn !== symbol.name) {
        return;
      }

      // Only attempt hydration for member-like symbols
      const isMemberKind =
        symbol.kind === SymbolKind.Method ||
        symbol.kind === SymbolKind.Constructor ||
        symbol.kind === SymbolKind.Field ||
        symbol.kind === SymbolKind.Property;

      // Best-effort: hydrate missing parent from file by parentId
      if (isMemberKind && !symbol.parent && symbol.parentId && symbol.fileUri) {
        try {
          // Extract the base file URI from the symbol's fileUri
          // e.g., 'file:///test/TestClass.cls:file.TestClass.InnerClass:innerMethod' -> 'file:///test/TestClass.cls'
          const baseFileUri = symbol.fileUri.split(':')[0];
          const cacheForFile = this.getOrBuildParentCacheForFile(baseFileUri);
          const parentCandidate = cacheForFile.get(symbol.parentId) || null;
          if (parentCandidate) {
            symbol.parent = parentCandidate;
          }
        } catch (_e) {
          // ignore
        }
      }

      // Compute FQN if missing or too generic
      if (!symbol.fqn || symbol.fqn === symbol.name) {
        symbol.fqn = calculateFQN(symbol, undefined, (parentId) =>
          this.symbolGraph.getSymbol(parentId),
        );
      }
    } catch (_e) {
      // non-fatal; leave symbol as-is
    }
  }

  // Build or retrieve a fast lookup cache for a file's symbols
  private getOrBuildParentCacheForFile(
    fileUri: string,
  ): HashMap<string, ApexSymbol> {
    let cache = this.parentLookupCache.get(fileUri);
    if (cache) return cache;

    const map = new HashMap<string, ApexSymbol>();
    const symbols = this.findSymbolsInFile(fileUri);
    for (const s of symbols) {
      map.set(s.id, s);
    }
    this.parentLookupCache.set(fileUri, map);
    return map;
  }

  /**
   * Process type references from a SymbolTable and add them to the symbol graph
   * @param symbolTable The symbol table containing type references
   * @param fileUri The file path where the references were found
   */
  private async processTypeReferencesToGraph(
    symbolTable: SymbolTable,
    fileUri: string,
  ): Promise<void> {
    try {
      const typeReferences = symbolTable.getAllReferences();

      for (const typeRef of typeReferences) {
        await this.processTypeReferenceToGraph(typeRef, fileUri);
      }
    } catch (error) {
      this.logger.error(
        () => `Error processing type references for ${fileUri}: ${error}`,
      );
    }
  }

  /**
   * Process a single type reference and add it to the symbol graph
   * @param typeRef The type reference to process
   * @param fileUri The file path where the reference was found
   */
  private async processTypeReferenceToGraph(
    typeRef: TypeReference,
    fileUri: string,
  ): Promise<void> {
    try {
      // Find the source symbol (the symbol that contains this reference)
      const sourceSymbol = this.findContainingSymbolForReference(
        typeRef,
        fileUri,
      );
      if (!sourceSymbol) {
        return;
      }

      // Find the target symbol (the symbol being referenced)
      const targetSymbol = await this.findTargetSymbolForReference(typeRef);
      if (!targetSymbol) {
        // Map ReferenceContext to ReferenceType
        const referenceType = this.mapReferenceContextToType(typeRef.context);

        // Add the reference to the deferred references queue
        this.symbolGraph.enqueueDeferredReference(
          sourceSymbol,
          typeRef.name, // target symbol name
          referenceType,
          typeRef.location,
          {
            methodName: typeRef.parentContext,
            isStatic: await this.isStaticReference(typeRef),
          },
        );
        return;
      }

      // Skip creating edges for declaration references; they are not dependencies
      if (typeRef.context === ReferenceContext.VARIABLE_DECLARATION) {
        return;
      }

      // Map ReferenceContext to ReferenceType
      const referenceType = this.mapReferenceContextToType(typeRef.context);

      // Add the reference to the symbol graph
      this.symbolGraph.addReference(
        sourceSymbol,
        targetSymbol,
        referenceType,
        typeRef.location,
        {
          methodName: typeRef.parentContext,
          isStatic: await this.isStaticReference(typeRef),
        },
      );
    } catch (error) {
      this.logger.error(
        () => `Error processing type reference ${typeRef.name}: ${error}`,
      );
    }
  }

  /**
   * Find the source symbol that contains the given reference
   * Used for: Position-based lookups (LSP hover, go-to-definition)
   * @param typeRef The type reference
   * @param fileUri The file path
   * @returns The source symbol or null if not found
   */
  private async findSourceSymbolForReference(
    typeRef: TypeReference,
    fileUri: string,
  ): Promise<ApexSymbol | null> {
    // Try to find the symbol at the reference location
    const symbolAtPosition = await this.getSymbolAtPosition(fileUri, {
      line: typeRef.location.identifierRange.startLine,
      character: typeRef.location.identifierRange.startColumn,
    });

    if (symbolAtPosition) {
      return symbolAtPosition;
    }

    // Fallback: look for symbols in the same file that might contain this reference
    const symbolsInFile = this.findSymbolsInFile(fileUri);
    for (const symbol of symbolsInFile) {
      if (
        symbol.location &&
        symbol.location.symbolRange.startLine <=
          typeRef.location.identifierRange.startLine &&
        symbol.location.symbolRange.endLine >=
          typeRef.location.identifierRange.endLine
      ) {
        return symbol;
      }
    }

    return null;
  }

  /**
   * Find the target symbol being referenced
   * @param typeRef The type reference
   * @returns The target symbol or null if not found
   */
  private async findTargetSymbolForReference(
    typeRef: TypeReference,
  ): Promise<ApexSymbol | null> {
    // First, try to extract qualifier information from chainNodes
    const qualifierInfo = this.extractQualifierFromChain(typeRef);

    if (qualifierInfo && qualifierInfo.isQualified) {
      // Try to resolve the qualified reference
      const qualifiedSymbol = this.resolveQualifiedReferenceFromChain(
        qualifierInfo.qualifier,
        qualifierInfo.member,
        typeRef.context,
      );

      if (qualifiedSymbol) {
        return qualifiedSymbol;
      }
    }

    // Fallback: Try to find the symbol by name (for unqualified references)
    const symbols = this.findSymbolByName(typeRef.name);
    if (symbols.length > 0) {
      // For now, take the first match. In a more sophisticated implementation,
      // we would use context to disambiguate
      return symbols[0];
    }

    // Try to resolve as built-in type
    const builtInSymbol = await this.resolveBuiltInType(typeRef.name);
    if (builtInSymbol) {
      return builtInSymbol;
    }

    return null;
  }

  /**
   * Map ReferenceContext to ReferenceType
   * @param context The reference context
   * @returns The corresponding reference type
   */
  private mapReferenceContextToType(
    context: ReferenceContext,
  ): EnumValue<typeof ReferenceType> {
    switch (context) {
      case ReferenceContext.METHOD_CALL:
        return ReferenceType.METHOD_CALL;
      case ReferenceContext.FIELD_ACCESS:
        return ReferenceType.FIELD_ACCESS;
      case ReferenceContext.TYPE_DECLARATION:
        return ReferenceType.TYPE_REFERENCE;
      case ReferenceContext.CONSTRUCTOR_CALL:
        return ReferenceType.CONSTRUCTOR_CALL;
      case ReferenceContext.CLASS_REFERENCE:
        return ReferenceType.TYPE_REFERENCE;
      case ReferenceContext.VARIABLE_USAGE:
        return ReferenceType.FIELD_ACCESS;
      case ReferenceContext.PARAMETER_TYPE:
        return ReferenceType.TYPE_REFERENCE;
      case ReferenceContext.VARIABLE_DECLARATION:
        // Declarations are for editor UX; do not create dependency edges
        return ReferenceType.TYPE_REFERENCE;
      default:
        return ReferenceType.TYPE_REFERENCE;
    }
  }

  /**
   * Resolve a qualified reference using qualifier and member names
   * This replaces the removed resolveQualifiedReference method
   * @param qualifier The qualifier name (e.g., "System")
   * @param member The member name (e.g., "debug")
   * @param context The reference context
   * @returns The resolved symbol or null if not found
   */
  private async resolveQualifiedReferenceFromChain(
    qualifier: string,
    member: string,
    context: ReferenceContext,
  ): Promise<ApexSymbol | null> {
    try {
      // Step 1: Find the qualifier symbol
      let qualifierSymbols = this.findSymbolByName(qualifier);

      // If no user-defined qualifier found, try built-in types
      if (qualifierSymbols.length === 0) {
        const builtInQualifier = await this.resolveBuiltInType(qualifier);
        if (builtInQualifier) {
          qualifierSymbols = [builtInQualifier];
        }
      }

      // If still no qualifier found, try standard Apex classes
      if (qualifierSymbols.length === 0) {
        const standardClass = await this.resolveStandardApexClass(qualifier);
        if (standardClass) {
          qualifierSymbols = [standardClass];
        }
      }

      if (qualifierSymbols.length === 0) {
        return null;
      }

      // For now, take the first qualifier match
      const qualifierSymbol = qualifierSymbols[0];

      // Step 2: Find the member within the qualifier
      const memberSymbol = await this.resolveMemberInContext(
        { type: 'symbol', symbol: qualifierSymbol },
        member,
        context === ReferenceContext.METHOD_CALL ? 'method' : 'property',
      );

      if (memberSymbol) {
        return memberSymbol;
      }

      // Step 3: For method calls, try to resolve the qualifier itself if no member found
      if (context === ReferenceContext.METHOD_CALL) {
        return qualifierSymbol;
      }

      return null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Extract qualifier and member information from a TypeReference
   * Handles both chained references (using chainNodes) and simple dot-notation references
   * @param typeRef The type reference
   * @returns Object with qualifier and member information, or null if not qualified
   */
  private extractQualifierFromChain(typeRef: TypeReference): {
    qualifier: string;
    member: string;
    isQualified: boolean;
  } | null {
    // Check if this is a chained expression reference
    if (this.isChainedTypeReference(typeRef)) {
      const chainedRef = typeRef as any;
      const chainNodes = chainedRef.chainNodes;

      if (chainNodes && chainNodes.length >= 2) {
        // For qualified references like "System.debug", chainNodes[0] is the qualifier
        // and chainNodes[1] is the member
        const qualifier = chainNodes[0].name;
        const member = chainNodes[1].name;

        return {
          qualifier,
          member,
          isQualified: true,
        };
      }
    }

    // For simple references, check if the name contains a dot (indicating qualification)
    if (typeRef.name.includes('.')) {
      const parts = typeRef.name.split('.');
      if (parts.length >= 2) {
        const qualifier = parts.slice(0, -1).join('.');
        const member = parts[parts.length - 1];

        return {
          qualifier,
          member,
          isQualified: true,
        };
      }
    }

    return null;
  }

  /**
   * Determine if a reference is static based on its context
   * @param typeRef The type reference
   * @returns True if the reference is static
   */
  private async isStaticReference(typeRef: TypeReference): Promise<boolean> {
    // Check if this is a qualified reference (which is typically static)
    const qualifierInfo = this.extractQualifierFromChain(typeRef);
    if (qualifierInfo && qualifierInfo.isQualified) {
      // For qualified references like "System.debug", check if the qualifier is a class
      const qualifierSymbols = this.findSymbolByName(qualifierInfo.qualifier);
      if (qualifierSymbols.length > 0) {
        const qualifierSymbol = qualifierSymbols[0];
        return qualifierSymbol.kind === SymbolKind.Class;
      }

      // Also check if it's a built-in type (which are typically static)
      const builtInQualifier = await this.resolveBuiltInType(
        qualifierInfo.qualifier,
      );
      if (builtInQualifier) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all TypeReference data for a file
   * @param fileUri The file path to get references for
   * @returns Array of all TypeReference objects in the file
   */
  getAllReferencesInFile(fileUri: string): TypeReference[] {
    try {
      const symbolTable = this.symbolGraph.getSymbolTableForFile(fileUri);

      if (!symbolTable) {
        return [];
      }

      const references = symbolTable.getAllReferences();
      return references;
    } catch (_error) {
      return [];
    }
  }

  /**
   * Resolve a TypeReference to its target symbol
   * @param typeReference The TypeReference to resolve
   * @param sourceFile The file containing the reference
   * @param position The position in the file (optional, for chain member detection)
   * @returns The resolved symbol or null if not found
   */
  private async resolveTypeReferenceToSymbol(
    typeReference: TypeReference,
    sourceFile: string,
    position?: { line: number; character: number },
  ): Promise<ApexSymbol | null> {
    try {
      // Step 0: Handle chained expression references
      if (this.isChainedTypeReference(typeReference)) {
        return this.resolveChainedTypeReference(typeReference, position);
      }

      // Step 1: Try qualified reference resolution using chainNodes
      const qualifierInfo = this.extractQualifierFromChain(typeReference);
      if (qualifierInfo && qualifierInfo.isQualified) {
        const qualifiedSymbol = await this.resolveQualifiedReferenceFromChain(
          qualifierInfo.qualifier,
          qualifierInfo.member,
          typeReference.context,
        );

        if (qualifiedSymbol) {
          return qualifiedSymbol;
        }
      }

      // Step 2: Try built-in type resolution for the name itself
      const builtInSymbol = await this.resolveBuiltInType(typeReference.name);
      if (builtInSymbol) {
        return builtInSymbol;
      }

      // Step 3: Try to find symbols by name
      const candidates = this.findSymbolByName(typeReference.name);

      if (candidates.length === 0) {
        return null;
      }

      // Step 4: For unqualified references, try same-file resolution first
      const sameFileCandidates = candidates.filter(
        (symbol) => symbol.key.path[0] === sourceFile,
      );

      if (sameFileCandidates.length > 0) {
        return this.selectMostSpecificSymbol(sameFileCandidates, sourceFile);
      }

      // Step 5: Fallback to any accessible symbol
      const accessibleCandidates = candidates.filter((symbol) =>
        this.isSymbolAccessibleFromFile(symbol, sourceFile),
      );

      if (accessibleCandidates.length > 0) {
        return this.selectMostSpecificSymbol(accessibleCandidates, sourceFile);
      }

      // Step 6: Last resort - return the first candidate
      return candidates[0];
    } catch (_error) {
      return null;
    }
  }

  /**
   * Check if a symbol is accessible from a given file
   * @param symbol The symbol to check
   * @param sourceFile The file trying to access the symbol
   * @returns True if the symbol is accessible
   */
  private isSymbolAccessibleFromFile(
    symbol: ApexSymbol,
    sourceFile: string,
  ): boolean {
    // Built-in types are always accessible
    if (symbol.modifiers?.isBuiltIn) return true;

    // Same file access
    if (symbol.key.path[0] === sourceFile) return true;

    // Global access
    if (symbol.modifiers?.visibility === 'global') return true;

    // Public access (simplified - in real implementation would check package/namespace)
    if (symbol.modifiers?.visibility === 'public') return true;

    return false;
  }

  /**
   * Select the most specific symbol from a list of candidates
   * @param candidates List of candidate symbols
   * @param sourceFile The source file for context
   * @returns The most specific symbol
   */
  private selectMostSpecificSymbol(
    candidates: ApexSymbol[],
    sourceFile: string,
  ): ApexSymbol {
    if (candidates.length === 1) {
      return candidates[0];
    }

    // First, try to find symbols in the same file
    const sameFileCandidates = candidates.filter(
      (s) => s.key.path[0] === sourceFile,
    );
    if (sameFileCandidates.length > 0) {
      candidates = sameFileCandidates;
    }

    // Calculate symbol size and sort by smallest first (most specific)
    candidates.sort((a, b) => {
      const aSize = this.calculateSymbolSize(a);
      const bSize = this.calculateSymbolSize(b);

      // If sizes are significantly different, prefer smaller
      if (Math.abs(aSize - bSize) > 10) {
        const result = aSize - bSize;
        return result;
      }

      // If sizes are similar, use kind priority as tiebreaker
      // Updated priority order to prioritize methods over classes when they have the same name
      const priorityOrder = [
        'parameter',
        'variable',
        'field',
        'method', // Methods should be prioritized over classes
        'constructor', // Constructors should also be prioritized over classes
        'class',
        'interface',
        'enum',
      ];
      const aPriority = priorityOrder.indexOf(a.kind) ?? 999;
      const bPriority = priorityOrder.indexOf(b.kind) ?? 999;
      const result = aPriority - bPriority;
      return result;
    });

    return candidates[0];
  }

  private calculateSymbolSize(symbol: ApexSymbol): number {
    if (!symbol.location) {
      return Number.MAX_SAFE_INTEGER;
    }

    const { startLine, startColumn, endLine, endColumn } =
      symbol.location.identifierRange;

    // Calculate approximate character count
    const lineCount = endLine - startLine + 1;
    const columnCount = endColumn - startColumn + 1;

    // Weight line count more heavily than column count
    return lineCount * 100 + columnCount;
  }

  /**
   * Resolve a built-in type (String, Integer, etc.) or standard Apex class (System, Database, etc.)
   * @param name The name of the type to resolve
   * @returns The resolved symbol or null if not found
   */
  private async resolveBuiltInType(name: string): Promise<ApexSymbol | null> {
    try {
      // Step 1: Check built-in types first (String, Integer, Boolean, etc.)
      const builtInType = this.builtInTypeTables.findType(name.toLowerCase());
      if (builtInType) {
        // Only return built-in types for primitive types, not for standard Apex classes
        const isStandardApexClass =
          this.resourceLoader?.isStdApexNamespace(name);
        if (!isStandardApexClass) {
          return {
            ...builtInType,
            modifiers: {
              ...builtInType.modifiers,
              isBuiltIn: true,
            },
          };
        }
      }

      // Step 2: Check if this is a standard Apex class (System, Database, Schema, etc.)
      const isStandard = this.isStandardApexClass(name);

      if (isStandard) {
        if (!this.resourceLoader) {
          return null;
        }
        let standardClass: ApexSymbol | null = null;

        // Check if it's already a fully qualified name
        if (name.includes('.')) {
          // Direct call for FQN like "System.Assert"
          standardClass = await this.resolveStandardApexClass(name);
        } else {
          // For namespace-less names like "Assert", find the FQN first
          const fqn = this.findFQNForStandardClass(name);
          if (fqn) {
            standardClass = await this.resolveStandardApexClass(fqn);
          }
        }

        if (standardClass) {
          return standardClass;
        }
      }

      return null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Check if a name represents a valid namespace
   * @param name The name to check
   * @returns True if the name represents a valid namespace
   */
  private isValidNamespace(name: string): boolean {
    // Check if this is a standard Apex namespace (System, Database, Schema, etc.)
    if (this.isStandardApexClass(name)) {
      return true;
    }

    // Check if this is a user-defined namespace
    const namespaceSymbols = this.findSymbolsInNamespace(name);
    return namespaceSymbols.length > 0;
  }

  /**
   * Resolve a namespace by name
   * @param name The name of the namespace to resolve
   * @returns The resolved namespace symbol or null if not found
   */
  private resolveNamespace(name: string): ApexSymbol | null {
    try {
      // Check if this is a standard Apex namespace (System, Database, Schema, etc.)
      if (this.isStandardApexClass(name)) {
        return null; // Namespace identified but no symbol to return
      }

      // Check if this is a user-defined namespace
      const namespaceSymbols = this.findSymbolsInNamespace(name);
      if (namespaceSymbols.length > 0) {
        return null; // Namespace identified but no symbol to return
      }

      return null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Evolve the context of a TypeReference after successful resolution
   * @param step The TypeReference to evolve
   * @param newContext The new context type
   * @param resolutionStrategy The strategy that led to this resolution
   */
  private evolveContextAfterResolution(
    step: any,
    newContext: string,
    resolutionStrategy: string,
  ): void {
    try {
      // Map string context to ReferenceContext enum
      let newReferenceContext: ReferenceContext;
      switch (newContext) {
        case 'NAMESPACE':
          newReferenceContext = ReferenceContext.NAMESPACE;
          break;
        case 'CLASS_REFERENCE':
          newReferenceContext = ReferenceContext.CLASS_REFERENCE;
          break;
        case 'METHOD_CALL':
          newReferenceContext = ReferenceContext.METHOD_CALL;
          break;
        case 'FIELD_ACCESS':
          newReferenceContext = ReferenceContext.FIELD_ACCESS;
          break;
        default:
          return;
      }

      // Update the context
      step.context = newReferenceContext;
    } catch (_error) {
      // Error evolving context, continue
    }
  }

  /**
   * Select the best member candidate based on context and modifiers
   * @param candidates The candidate member symbols
   * @param context The reference context
   * @returns The best candidate or null if none found
   */
  private selectBestMemberCandidate(
    candidates: ApexSymbol[],
    context: ReferenceContext,
  ): ApexSymbol | null {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    // For method calls, prefer methods over other types
    if (context === ReferenceContext.METHOD_CALL) {
      const methods = candidates.filter((s) => s.kind === SymbolKind.Method);
      if (methods.length > 0) {
        // Prefer non-static methods for instance calls, static for class calls
        const nonStatic = methods.find((s) => s.modifiers?.isStatic === false);
        return nonStatic || methods[0];
      }
    }

    // For field access, prefer fields/properties over other types
    if (context === ReferenceContext.FIELD_ACCESS) {
      const fields = candidates.filter(
        (s) => s.kind === SymbolKind.Field || s.kind === SymbolKind.Property,
      );
      if (fields.length > 0) {
        // Prefer non-static for instance access, static for class access
        const nonStatic = fields.find((s) => s.modifiers?.isStatic === false);
        return nonStatic || fields[0];
      }
    }

    // Default: return first candidate
    return candidates[0];
  }

  /**
   * Ensure class symbols are loaded for standard Apex classes
   * @param classSymbol The class symbol to ensure is loaded
   */
  private async ensureClassSymbolsLoaded(
    classSymbol: ApexSymbol,
  ): Promise<void> {
    if (!this.resourceLoader || !classSymbol.fileUri?.endsWith('.cls')) {
      return;
    }

    try {
      // Extract relative path from URI for ResourceLoader calls
      let classPath = classSymbol.fileUri;
      if (isStandardApexUri(classPath)) {
        classPath = extractApexLibPath(classPath);
      }

      if (!this.resourceLoader.isClassCompiled(classPath)) {
        await this.resourceLoader.ensureClassLoaded(classPath);
      }

      const artifact = await this.resourceLoader.getCompiledArtifact(classPath);
      if (artifact && artifact.compilationResult?.result) {
        // Convert classPath to proper URI scheme for standard Apex library classes
        const fileUri = this.convertToStandardLibraryUri(classPath);
        await this.addSymbolTable(artifact.compilationResult.result, fileUri);

        // Update the class symbol's fileUri to use the new URI scheme
        classSymbol.fileUri = fileUri;
      }
    } catch (_error) {
      // Error loading class symbols, continue
    }
  }

  /**
   * Select the best qualifier from candidates
   * @param candidates The candidate qualifier symbols
   * @param sourceFile The source file making the reference
   * @returns The best qualifier or null if none found
   */
  private selectBestQualifier(
    candidates: ApexSymbol[],
    sourceFile: string,
  ): ApexSymbol | null {
    // Prefer concrete class symbols with real std class file paths when multiple candidates share the same name
    // This helps disambiguate cases like "System" which can be both a namespace and a class
    const classLikeCandidates = candidates.filter(
      (symbol) =>
        symbol.kind === SymbolKind.Class &&
        typeof symbol.fileUri === 'string' &&
        symbol.fileUri.endsWith(`/${symbol.name}.cls`),
    );
    if (classLikeCandidates.length > 0) {
      candidates = classLikeCandidates;
    }

    // Prefer same file
    const sameFile = candidates.find((symbol) => symbol.fileUri === sourceFile);
    if (sameFile) return sameFile;

    // Prefer accessible symbols
    const accessible = candidates.filter((symbol) =>
      this.isSymbolAccessibleFromFile(symbol, sourceFile),
    );
    if (accessible.length === 1) return accessible[0];
    if (accessible.length > 1) return accessible[0]; // Return first accessible

    // Fallback to first candidate
    return candidates[0] || null;
  }

  getScopesInFile(fileUri: string): string[] {
    const symbols = this.findSymbolsInFile(fileUri);
    const scopes = new Set<string>();

    symbols.forEach((symbol) => {
      if (symbol.key && symbol.key.path) {
        scopes.add(symbol.key.path.join('.'));
      }
    });

    return Array.from(scopes);
  }

  findSymbolsInScope(scopeName: string, fileUri: string): ApexSymbol[] {
    const symbols = this.findSymbolsInFile(fileUri);
    return symbols.filter((symbol) => {
      if (symbol.key && symbol.key.path) {
        return symbol.key.path.join('.').includes(scopeName);
      }
      return false;
    });
  }

  async refresh(symbolTable: any): Promise<void> {
    // Clear existing data and reload from symbol table
    this.clear();
    await this.addSymbolTable(symbolTable, 'refreshed');
  }

  // Performance Monitoring
  resetPerformanceMetrics(): void {
    this.unifiedCache.clear();
    this.memoryStats.lastCleanup = Date.now();
  }

  // Fix memory usage to include symbolCacheSize
  getMemoryUsage(): MemoryUsageStats {
    const cacheStats = this.unifiedCache.getStats();
    const estimatedMemoryUsage =
      this.memoryStats.totalSymbols * 1024 + cacheStats.totalSize;
    const fileMetadataSize = this.fileMetadata.size * 256;
    const cacheEfficiency = cacheStats.hitRate;

    return {
      totalSymbols: this.memoryStats.totalSymbols,
      totalCacheEntries: cacheStats.totalEntries,
      estimatedMemoryUsage,
      fileMetadataSize,
      memoryOptimizationLevel: this.memoryStats.memoryOptimizationLevel,
      cacheEfficiency,
      recommendations: this.generateMemoryOptimizationRecommendations(),
      memoryPoolStats: {
        totalReferences: this.symbolGraph.getStats().totalReferences,
        activeReferences: this.symbolGraph.getStats().totalReferences,
        referenceEfficiency: 0.85,
        poolSize: estimatedMemoryUsage,
      },
      symbolCacheSize: cacheStats.totalEntries,
    };
  }

  private getSymbolId(symbol: ApexSymbol, fileUri?: string): string {
    const path = fileUri || symbol.key.path[0] || 'unknown';
    // Include the symbol kind to distinguish between different types of symbols with the same name
    return `${symbol.name}:${symbol.kind}:${path}`;
  }

  // Fix lifecycle stage determination

  // Fix lifecycle stage determination
  private determineLifecycleStage(
    symbol: ApexSymbol,
  ): 'active' | 'deprecated' | 'legacy' | 'experimental' {
    // Simplified implementation - return 'legacy' for symbols with no references
    const references = this.findReferencesTo(symbol);
    if (references.length === 0) {
      return 'legacy';
    }
    return 'active';
  }

  // TODO: replace with accurate complexity computation
  private computeCyclomaticComplexity(symbol: ApexSymbol): number {
    // Simplified implementation - methods have higher complexity than classes
    if (symbol.kind === SymbolKind.Method) {
      return 3; // Mock higher complexity for methods
    }
    return 1; // Mock lower complexity for classes
  }

  // TODO: replace with accurate depth of inheritance computation
  private computeDepthOfInheritance(symbol: ApexSymbol): number {
    // Simplified implementation
    return 0;
  }

  // TODO: replace with accurate coupling score computation
  private computeCouplingScore(symbol: ApexSymbol): number {
    const dependencies = this.analyzeDependencies(symbol);
    return dependencies.dependencies.length + dependencies.dependents.length;
  }

  // TODO: replace with accurate change impact radius computation
  private computeChangeImpactRadius(symbol: ApexSymbol): number {
    const impact = this.getImpactAnalysis(symbol);
    return impact.directImpact.length + impact.indirectImpact.length;
  }

  // TODO: replace with accurate refactoring risk computation
  private computeRefactoringRisk(symbol: ApexSymbol): number {
    const impact = this.getImpactAnalysis(symbol);
    return impact.riskAssessment === 'high'
      ? 0.9
      : impact.riskAssessment === 'medium'
        ? 0.6
        : 0.3;
  }

  // TODO: replace with accurate usage patterns analysis
  private analyzeUsagePatterns(symbol: ApexSymbol): string[] {
    // Simplified implementation
    return ['standard'];
  }

  // TODO: replace with accurate access patterns analysis
  private analyzeAccessPatterns(symbol: ApexSymbol): string[] {
    // Simplified implementation
    return ['direct'];
  }

  // TODO: replace with accurate memory optimization level calculation
  private calculateMemoryOptimizationLevel(): string {
    const cacheStats = this.unifiedCache.getStats();
    if (cacheStats.hitRate > 0.8) return 'OPTIMAL';
    if (cacheStats.hitRate > 0.6) return 'GOOD';
    return 'NEEDS_OPTIMIZATION';
  }

  // TODO: replace with accurate memory optimization recommendations generation
  private generateMemoryOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const cacheStats = this.unifiedCache.getStats();

    if (cacheStats.hitRate < 0.7) {
      recommendations.push(
        'Consider increasing cache size to improve hit rate',
      );
    }

    if (cacheStats.evictionCount > 100) {
      recommendations.push(
        'High eviction rate detected - consider cache tuning',
      );
    }

    return recommendations;
  }

  /**
   * Create comprehensive resolution context using symbol manager knowledge
   */
  public createChainResolutionContext(
    documentText: string,
    position: Position,
    fileUri: string,
  ): SymbolResolutionContext {
    // Get symbol table for the file to extract context information
    const symbolsInFile = this.findSymbolsInFile(fileUri);

    // Find the symbol at the current position to determine context
    const symbolAtPosition = this.findSymbolAtPositionSync(fileUri, position);

    // If no symbols are loaded, fall back to text-based context extraction
    if (symbolsInFile.length === 0) {
      return this.createFallbackChainResolutionContext(
        documentText,
        position,
        fileUri,
      );
    }

    // Extract namespace context from file path or symbol information
    const namespaceContext = this.extractNamespaceFromFile(fileUri);

    // Determine current scope based on containing symbol
    const currentScope = this.determineScopeFromSymbol(symbolAtPosition);

    // Build scope chain from the containing symbol hierarchy
    const scopeChain = this.buildScopeChainFromSymbol(symbolAtPosition);

    // Extract inheritance information from class symbols
    const inheritanceChain = this.extractInheritanceFromSymbols(symbolsInFile);
    const interfaceImplementations =
      this.extractInterfaceImplementationsFromSymbols(symbolsInFile);

    // Determine access modifier and static status from containing symbol
    const accessModifier =
      this.extractAccessModifierFromSymbol(symbolAtPosition);
    const isStatic = this.extractIsStaticFromSymbol(symbolAtPosition);

    return {
      sourceFile: fileUri,
      namespaceContext,
      currentScope,
      scopeChain,
      expectedType: undefined, // Would need AST analysis for accurate type inference
      parameterTypes: [], // Would need AST analysis for parameter context
      accessModifier,
      isStatic,
      inheritanceChain,
      interfaceImplementations,
      importStatements: [], // Apex doesn't use imports
    };
  }

  /**
   * Create fallback resolution context using text parsing when no symbols are loaded
   */
  private createFallbackChainResolutionContext(
    documentText: string,
    position: Position,
    fileUri: string,
  ): SymbolResolutionContext {
    const lines = documentText.split('\n');
    const currentLine = lines[position.line] || '';

    // Extract basic context from text
    const namespaceContext = this.extractNamespaceFromText(currentLine);
    const currentScope = this.determineScopeFromText(currentLine);
    const accessModifier = this.extractAccessModifierFromText(currentLine);
    const isStatic = this.extractIsStaticFromText(currentLine);

    return {
      sourceFile: fileUri,
      namespaceContext,
      currentScope,
      scopeChain: [currentScope, 'global'],
      expectedType: undefined,
      parameterTypes: [],
      accessModifier,
      isStatic,
      inheritanceChain: [],
      interfaceImplementations: [],
      importStatements: [],
    };
  }

  /**
   * Extract namespace from text (fallback method)
   */
  private extractNamespaceFromText(line: string): string {
    // Look for access modifiers that might indicate namespace context
    if (line.includes('global')) return 'global';
    if (line.includes('public')) return 'public';
    if (line.includes('private')) return 'private';
    if (line.includes('protected')) return 'protected';
    return '';
  }

  /**
   * Determine scope from text (fallback method)
   */
  private determineScopeFromText(line: string): string {
    if (line.includes('class') || line.includes('interface')) return 'class';
    if (line.includes('method') || line.includes('(')) return 'method';
    if (line.includes('trigger')) return 'trigger';
    return 'global';
  }

  /**
   * Extract access modifier from text (fallback method)
   */
  private extractAccessModifierFromText(
    line: string,
  ): 'public' | 'private' | 'protected' | 'global' {
    if (line.includes('global')) return 'global';
    if (line.includes('public')) return 'public';
    if (line.includes('private')) return 'private';
    if (line.includes('protected')) return 'protected';
    return 'public';
  }

  /**
   * Extract static status from text (fallback method)
   */
  private extractIsStaticFromText(line: string): boolean {
    return line.includes('static');
  }

  /**
   * Find symbol at position synchronously (for context extraction)
   */
  private findSymbolAtPositionSync(
    fileUri: string,
    position: Position,
  ): ApexSymbol | null {
    const symbolsInFile = this.findSymbolsInFile(fileUri);

    // Find the most specific symbol that contains this position
    for (const symbol of symbolsInFile) {
      if (this.isPositionWithinSymbol(symbol, position)) {
        return symbol;
      }
    }

    return null;
  }

  /**
   * Check if a position is within a symbol's bounds
   */
  private isPositionWithinSymbol(
    symbol: ApexSymbol,
    position: Position,
  ): boolean {
    if (!symbol.location) return false;

    const { startLine, startColumn, endLine, endColumn } =
      symbol.location.symbolRange;

    // Check if position is within the symbol's range
    if (position.line < startLine || position.line > endLine) {
      return false;
    }

    if (position.line === startLine && position.character < startColumn) {
      return false;
    }

    if (position.line === endLine && position.character > endColumn) {
      return false;
    }

    return true;
  }

  /**
   * Extract namespace from SymbolTable and symbols in the file
   */
  private extractNamespaceFromFile(fileUri: string): string {
    // Get the SymbolTable for this file
    const symbolTable = this.symbolGraph.getSymbolTableForFile(fileUri);
    if (!symbolTable) {
      return '';
    }

    // Get all symbols in the file to find namespace information
    const symbolsInFile = this.findSymbolsInFile(fileUri);

    // Look for namespace information in the symbols
    for (const symbol of symbolsInFile) {
      if (symbol.namespace) {
        // If namespace is a string, return it directly
        if (typeof symbol.namespace === 'string') {
          return symbol.namespace;
        }
        // If namespace is a Namespace object, get its string representation
        if (
          symbol.namespace &&
          typeof symbol.namespace === 'object' &&
          'toString' in symbol.namespace
        ) {
          return symbol.namespace.toString();
        }
      }
    }

    return '';
  }

  /**
   * Determine scope from containing symbol
   */
  private determineScopeFromSymbol(symbol: ApexSymbol | null): string {
    if (!symbol) return 'global';

    switch (symbol.kind) {
      case SymbolKind.Class:
      case SymbolKind.Interface:
        return 'class';
      case SymbolKind.Method:
        return 'method';
      case SymbolKind.Trigger:
        return 'trigger';
      case SymbolKind.Variable:
      case SymbolKind.Field:
        return 'field';
      default:
        return 'global';
    }
  }

  /**
   * Build scope chain from symbol hierarchy
   */
  private buildScopeChainFromSymbol(symbol: ApexSymbol | null): string[] {
    if (!symbol) return ['global'];

    const scopeChain: string[] = [];
    let currentSymbol: ApexSymbol | null = symbol;

    // Walk up the symbol hierarchy
    while (currentSymbol) {
      const scope = this.determineScopeFromSymbol(currentSymbol);
      scopeChain.unshift(scope);

      // Get parent symbol
      currentSymbol = this.getContainingType(currentSymbol);
    }

    // Always end with global scope
    if (scopeChain[scopeChain.length - 1] !== 'global') {
      scopeChain.push('global');
    }

    return scopeChain;
  }

  /**
   * Extract inheritance chain from class symbols
   */
  private extractInheritanceFromSymbols(symbols: ApexSymbol[]): string[] {
    const inheritanceChain: string[] = [];

    for (const symbol of symbols) {
      if (symbol.kind === SymbolKind.Class && symbol._typeData) {
        // Look for superClass information in typeData
        if (symbol._typeData.superClass) {
          inheritanceChain.push(symbol._typeData.superClass);
        }
      }
    }

    return inheritanceChain;
  }

  /**
   * Extract interface implementations from class symbols
   */
  private extractInterfaceImplementationsFromSymbols(
    symbols: ApexSymbol[],
  ): string[] {
    const implementations: string[] = [];

    for (const symbol of symbols) {
      if (symbol.kind === SymbolKind.Class && symbol._typeData) {
        // Look for interfaces information in typeData
        if (symbol._typeData.interfaces) {
          implementations.push(...symbol._typeData.interfaces);
        }
      }
    }

    return implementations;
  }

  /**
   * Extract access modifier from symbol
   */
  private extractAccessModifierFromSymbol(
    symbol: ApexSymbol | null,
  ): 'public' | 'private' | 'protected' | 'global' {
    if (!symbol || !symbol.modifiers) return 'public';

    if (symbol.modifiers.visibility === SymbolVisibility.Global)
      return 'global';
    if (symbol.modifiers.visibility === SymbolVisibility.Public)
      return 'public';
    if (symbol.modifiers.visibility === SymbolVisibility.Private)
      return 'private';
    if (symbol.modifiers.visibility === SymbolVisibility.Protected)
      return 'protected';

    return 'public';
  }

  /**
   * Extract static status from symbol
   */
  private extractIsStaticFromSymbol(symbol: ApexSymbol | null): boolean {
    if (!symbol || !symbol.modifiers) return false;

    return symbol.modifiers.isStatic || false;
  }

  /**
   * Construct fully qualified name for a symbol using hierarchical relationships
   * @param symbol The symbol to construct FQN for
   * @param options Options for FQN generation
   * @returns The fully qualified name
   */
  public constructFQN(symbol: ApexSymbol, options?: FQNOptions): string {
    return calculateFQN(symbol, options, (parentId) =>
      this.symbolGraph.getSymbol(parentId),
    );
  }

  /**
   * Get the immediate containing type (class, interface, enum) for a symbol
   * @param symbol The symbol to find the containing type for
   * @returns The containing type symbol or null if not found
   */
  public getContainingType(symbol: ApexSymbol): ApexSymbol | null {
    // Find the immediate parent that is a type (class, interface, enum)
    let current = symbol.parent;
    while (current) {
      if (
        current.kind === SymbolKind.Class ||
        current.kind === SymbolKind.Interface ||
        current.kind === SymbolKind.Enum
      ) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }

  /**
   * Get the full chain of ancestor types for a symbol
   * @param symbol The symbol to get ancestors for
   * @returns Array of ancestor symbols from top-level to closest parent
   */
  public getAncestorChain(symbol: ApexSymbol): ApexSymbol[] {
    return getAncestorChain(symbol);
  }

  // SymbolProvider implementation methods
  find(referencingType: ApexSymbol, fullName: string): ApexSymbol | null {
    // Try to find by FQN first
    const symbol = this.findSymbolByFQN(fullName);
    if (symbol) return symbol;

    // Try to find by name
    const symbols = this.findSymbolByName(fullName);
    return symbols.length > 0 ? symbols[0] : null;
  }

  findBuiltInType(name: string): ApexSymbol | null {
    // Use cached built-in type tables instance
    return this.builtInTypeTables.findType(name.toLowerCase());
  }

  findSObjectType(name: string): ApexSymbol | null {
    const symbols = this.findSymbolByName(name);
    return (
      symbols.find((s) => s.kind === 'class' && s.namespace === 'SObject') ||
      null
    );
  }

  findExternalType(name: string, packageName: string): ApexSymbol | null {
    const symbols = this.findSymbolByName(name);
    return symbols.find((s) => s.namespace === packageName) || null;
  }

  /**
   * Check if a class name represents a standard Apex class
   * @param name The class name to check (e.g., 'System.Assert', 'Database.Batchable', 'Assert')
   * @returns true if it's a standard Apex class, false otherwise
   */
  public isStandardApexClass(name: string): boolean {
    // Check if it's a fully qualified name (e.g., "System.Assert")
    const parts = name.split('.');
    const namespace = parts[0];
    const className = parts[1];

    if (parts.length === 2) {
      // Use generated constant to validate namespace
      if (!this.resourceLoader?.isStdApexNamespace(namespace)) {
        return false;
      }
      return (
        this.resourceLoader?.hasClass(`${namespace}.${className}.cls`) || false
      );
    }

    // Check if it's just a class name without namespace (e.g., "Assert", "Database")
    if (parts.length === 1) {
      const className = parts[0];

      // If ResourceLoader is available, check if this class exists in any standard namespace
      if (this.resourceLoader) {
        const namespaceStructure = this.resourceLoader.getStandardNamespaces();

        // Check if the class exists in any standard namespace
        for (const [namespace, classes] of namespaceStructure.entries()) {
          if (this.resourceLoader?.isStdApexNamespace(namespace)) {
            // Check if any class in this namespace matches the className
            for (const classFile of classes ?? []) {
              // Remove .cls extension and check if it matches
              const cleanClassName = classFile.toString().replace(/\.cls$/, '');
              if (cleanClassName === className) {
                return true;
              }
            }
          }
        }
        return false;
      }

      // If ResourceLoader is not available, we can't determine if it's a standard class
      // without namespace, so return false to be safe
      return false;
    }

    return false;
  }

  /**
   * Get all available standard Apex class namespaces
   * @returns Array of standard Apex class namespaces
   */
  public getAvailableStandardClasses(): string[] {
    if (!this.resourceLoader) {
      // If ResourceLoader is not available, return empty array
      // This ensures the method doesn't crash when ResourceLoader is not initialized
      return [];
    }

    const namespaceStructure = this.resourceLoader.getStandardNamespaces();
    const availableClasses: string[] = [];

    for (const [namespace, classes] of namespaceStructure.entries()) {
      // Only include namespaces that are in our generated constants
      if (this.resourceLoader.isStdApexNamespace(namespace)) {
        // Add the namespace itself
        availableClasses.push(namespace.toString());

        // Add the individual classes
        for (const className of classes ?? []) {
          // Remove .cls extension
          const cleanClassName = className.toString().replace(/\.cls$/, '');
          availableClasses.push(`${namespace}.${cleanClassName}`);
        }
      }
    }

    return availableClasses;
  }

  /**
   * Find the fully qualified name (FQN) for a standard Apex class
   * @param className The class name without namespace (e.g., 'Assert', 'Batchable')
   * @returns The FQN if found (e.g., 'System.Assert', 'Database.Batchable'), null otherwise
   */
  public findFQNForStandardClass(className: string): string | null {
    if (!this.resourceLoader) {
      return null;
    }

    try {
      const namespaceStructure = this.resourceLoader.getStandardNamespaces();

      // Search through all standard namespaces (case-insensitive)
      const target = className.toLowerCase();
      for (const [namespace, classes] of namespaceStructure.entries()) {
        if (this.resourceLoader.isStdApexNamespace(namespace)) {
          // Check if any class in this namespace matches the className
          for (const classFile of classes ?? []) {
            const cleanClassName = classFile.replace(/\.cls$/, '');
            if (cleanClassName.toLowerCase() === target) {
              // Return FQN with the actual case from the standard library, not the input className
              const fqn = `${namespace}.${cleanClassName}`;
              return fqn;
            }
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.warn(
        () => `Error finding FQN for standard class ${className}: ${error}`,
      );
      return null;
    }
  }

  /**
   * Resolve a standard Apex class from the ResourceLoader
   * @param name The fully qualified name of the standard class (e.g., 'System.assert')
   * @returns The resolved ApexSymbol or null if not found
   */
  public async resolveStandardApexClass(
    name: string,
  ): Promise<ApexSymbol | null> {
    if (!this.resourceLoader) {
      return null;
    }

    try {
      // Extract namespace and class name
      const parts = name.split('.');

      if (parts.length < 2) {
        // Only handle fully qualified names like "System.assert"
        // Namespace-only names like "System" should not be resolved
        return null;
      }

      const namespace = parts[0];
      const className = parts[1];

      // Check if the class exists in ResourceLoader (case-insensitive)
      // Always try to find the correct case from the namespace structure
      let classPath = `${namespace}/${className}.cls`;

      // Try to find the correct case from the namespace structure
      const namespaceStructure = this.resourceLoader.getStandardNamespaces();
      const classes = namespaceStructure.get(namespace);

      if (classes) {
        const target = className.toLowerCase();

        for (const classFile of classes) {
          const cleanClassName = classFile.replace(/\.cls$/, '');

          if (cleanClassName.toLowerCase() === target) {
            classPath = `${namespace}/${cleanClassName}.cls`;
            break;
          }
        }
      }

      // Verify the class exists with the correct case
      if (!this.resourceLoader.hasClass(classPath)) {
        return null;
      }

      // Use async loading to prevent hanging
      try {
        const artifact =
          await this.resourceLoader.loadAndCompileClass(classPath);
        if (artifact?.compilationResult?.result) {
          // Convert classPath to proper URI scheme for standard Apex library classes
          const fileUri = `${BASE_RESOURCES_URI}/${classPath}`;

          // Add the symbol table to the symbol manager to get all symbols including methods
          await this.addSymbolTable(artifact.compilationResult.result, fileUri);

          // Find the class symbol from the loaded symbol table
          const symbols = artifact.compilationResult.result.getAllSymbols();
          const classSymbol = symbols.find((s) => s.name === className);

          if (classSymbol) {
            // Update the class symbol's fileUri to use the new URI scheme
            classSymbol.fileUri = fileUri;
            return classSymbol;
          }
        }
        return null;
      } catch (_error) {
        return null;
      }
    } catch (error) {
      this.logger.warn(
        () => `❌ Failed to resolve standard Apex class ${name}: ${error}`,
      );
      return null;
    }
  }

  /**
   * Find the symbol that contains the given reference (the scope)
   * Used for: Reference relationship tracking, Find References From/To
   * @param typeRef The type reference
   * @param fileUri The file path
   * @returns The containing symbol or null if not found
   */
  private findContainingSymbolForReference(
    typeRef: TypeReference,
    fileUri: string,
  ): ApexSymbol | null {
    // Find symbols in the file and determine which one contains this reference
    const symbolsInFile = this.findSymbolsInFile(fileUri);

    // Look for the most specific (innermost) containing symbol
    let bestMatch: ApexSymbol | null = null;

    for (const symbol of symbolsInFile) {
      const isContained = this.isPositionContainedInSymbol(
        typeRef.location.identifierRange,
        symbol.location,
      );

      if (isContained) {
        // If we don't have a match yet, use this one
        if (!bestMatch) {
          bestMatch = symbol;
        } else {
          // Check if this symbol is more specific (contained within the current best match)
          if (this.isSymbolContainedWithin(symbol, bestMatch)) {
            bestMatch = symbol;
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Check if a position is contained within a symbol's location
   * @param position The position to check
   * @param symbolLocation The symbol's location
   * @returns True if the position is contained within the symbol
   */
  private isPositionContainedInSymbol(
    position: Range,
    symbolLocation: SymbolLocation,
  ): boolean {
    const { startLine, startColumn, endLine, endColumn } =
      symbolLocation.symbolRange;

    // Check if the position is within the symbol's identifier bounds
    if (position.startLine < startLine || position.endLine > endLine) {
      return false;
    }

    // For same start line, check column bounds
    if (
      position.startLine === startLine &&
      position.startColumn < startColumn
    ) {
      return false;
    }

    // For same end line, check column bounds
    if (position.endLine === endLine && position.endColumn > endColumn) {
      return false;
    }

    return true;
  }

  /**
   * Check if one symbol is contained within another symbol
   * @param innerSymbol The potentially inner symbol
   * @param outerSymbol The potentially outer symbol
   * @returns True if innerSymbol is contained within outerSymbol
   */
  private isSymbolContainedWithin(
    innerSymbol: ApexSymbol,
    outerSymbol: ApexSymbol,
  ): boolean {
    const inner = innerSymbol.location;
    const outer = outerSymbol.location;

    // Check if inner symbol starts after outer symbol starts
    if (inner.symbolRange.startLine < outer.symbolRange.startLine) return false;
    if (
      inner.symbolRange.startLine === outer.symbolRange.startLine &&
      inner.symbolRange.startColumn < outer.symbolRange.startColumn
    ) {
      return false;
    }

    // Check if inner symbol ends before outer symbol ends
    if (inner.symbolRange.endLine > outer.symbolRange.endLine) return false;
    if (
      inner.symbolRange.endLine === outer.symbolRange.endLine &&
      inner.symbolRange.endColumn > outer.symbolRange.endColumn
    ) {
      return false;
    }

    return true;
  }

  /**
   * Get symbol at position with precise resolution (exact position matches only)
   * This is used for hover, definition, and references requests where we want exact matches
   */
  private async getSymbolAtPositionPrecise(
    fileUri: string,
    position: { line: number; character: number },
  ): Promise<ApexSymbol | null> {
    try {
      // Step 1: Try to find TypeReferences at the exact position
      const typeReferences = this.getReferencesAtPosition(fileUri, position);

      if (typeReferences.length > 0) {
        // Step 2: Try to resolve the most specific reference
        const resolvedSymbol = await this.resolveTypeReferenceToSymbol(
          typeReferences[0],
          fileUri,
          position,
        );
        if (resolvedSymbol) {
          return resolvedSymbol;
        }
      }

      // Step 2: Look for symbols that start exactly at this position
      const symbols = this.findSymbolsInFile(fileUri);

      const exactMatchSymbols = symbols.filter((symbol) => {
        const { startLine, startColumn, endLine, endColumn } =
          symbol.location.identifierRange;

        // Check if the position is exactly at the start of the identifier
        const isExactStart =
          position.line === startLine && position.character === startColumn;

        // Check if the position is within the identifier bounds (most precise)
        const isWithinIdentifier =
          (position.line > startLine ||
            (position.line === startLine &&
              position.character >= startColumn)) &&
          (position.line < endLine ||
            (position.line === endLine && position.character <= endColumn));

        // For precise resolution, only return exact matches
        if (isExactStart) {
          return true;
        }

        if (isWithinIdentifier) {
          return true;
        }

        return false;
      });

      if (exactMatchSymbols.length > 0) {
        // Return the smallest (most specific) symbol if multiple matches
        const mostSpecific =
          exactMatchSymbols.length === 1
            ? exactMatchSymbols[0]
            : exactMatchSymbols.reduce((prev, current) => {
                const prevSize =
                  (prev.location.identifierRange.endLine -
                    prev.location.identifierRange.startLine) *
                    1000 +
                  (prev.location.identifierRange.endColumn -
                    prev.location.identifierRange.startColumn);
                const currentSize =
                  (current.location.identifierRange.endLine -
                    current.location.identifierRange.startLine) *
                    1000 +
                  (current.location.identifierRange.endColumn -
                    current.location.identifierRange.startColumn);
                return currentSize < prevSize ? current : prev;
              });

        // Hydrate identity before returning
        this.ensureSymbolIdentityHydrated(mostSpecific);
        return mostSpecific;
      }

      return null;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Enhanced createChainResolutionContext that includes request type information
   */
  public createChainResolutionContextWithRequestType(
    documentText: string,
    position: Position,
    sourceFile: string,
    requestType?: string,
  ): SymbolResolutionContext & {
    requestType?: string;
    position?: Position;
  } {
    const baseContext = this.createChainResolutionContext(
      documentText,
      position,
      sourceFile,
    );

    return {
      ...baseContext,
      requestType,
      position: { line: position.line, character: position.character },
    };
  }

  /**
   * Enhanced symbol resolution with ResourceLoader integration
   */
  private async resolveSymbolWithResourceLoader(
    name: string,
    context: SymbolResolutionContext,
  ): Promise<ApexSymbol | null> {
    // Step 1: Check if this is a standard Apex class using generated constants
    if (this.resourceLoader && this.isStandardApexClass(name)) {
      // Try to resolve from ResourceLoader first
      const standardClass = await this.resolveStandardApexClassAsync(name);
      if (standardClass) {
        return standardClass;
      }
    }

    // Step 2: Check built-in types
    const builtInType = await this.resolveBuiltInType(name);
    if (builtInType) {
      return builtInType;
    }

    // Step 3: Check existing symbols in graph
    const existingSymbols = this.findSymbolByName(name);
    if (existingSymbols.length > 0) {
      return this.selectMostSpecificSymbol(
        existingSymbols,
        context.sourceFile || '',
      );
    }

    return null;
  }

  /**
   * Async resolution of standard Apex classes with lazy loading
   */
  private async resolveStandardApexClassAsync(
    name: string,
  ): Promise<ApexSymbol | null> {
    if (!this.resourceLoader) {
      return null;
    }

    try {
      // Extract namespace and class name
      const parts = name.split('.');
      if (parts.length < 2) {
        return null;
      }

      const namespace = parts[0];
      const className = parts[1];
      const classPath = `${namespace}/${className}.cls`;

      // Use generated constant to validate namespace
      if (!this.resourceLoader.isStdApexNamespace(namespace)) {
        return null;
      }

      // Check if class exists and is compiled
      if (!this.resourceLoader.hasClass(classPath)) {
        return null;
      }

      // Try to get compiled artifact (this will trigger lazy loading if needed)
      const artifact = await this.resourceLoader.getCompiledArtifact(classPath);
      if (artifact) {
        // Extract symbol from compiled artifact
        const symbolTable = artifact.compilationResult.result;
        if (symbolTable) {
          const symbols = symbolTable.getAllSymbols();
          const classSymbol = symbols.find((s) => s.name === className);

          if (classSymbol) {
            // Ensure the symbol has proper metadata
            classSymbol.fileUri = classPath;
            classSymbol.fqn = name;
            classSymbol.modifiers.isBuiltIn = false;

            // Add to symbol graph for future lookups
            this.addSymbol(classSymbol, classPath, symbolTable);

            return classSymbol;
          }
        }
      }

      // If not compiled yet, trigger lazy compilation
      const compiledArtifact =
        await this.resourceLoader.loadAndCompileClass(classPath);
      if (compiledArtifact) {
        // Process the newly compiled artifact
        const symbolTable = compiledArtifact.compilationResult.result;
        if (symbolTable) {
          const symbols = symbolTable.getAllSymbols();
          const classSymbol = symbols.find((s) => s.name === className);

          if (classSymbol) {
            classSymbol.fileUri = classPath;
            classSymbol.fqn = name;
            classSymbol.modifiers.isBuiltIn = false;

            // Add to symbol graph
            this.addSymbol(classSymbol, classPath, symbolTable);

            return classSymbol;
          }
        }
      }

      return null;
    } catch (error) {
      this.logger.warn(
        () => `Failed to resolve standard Apex class ${name}: ${error}`,
      );
      return null;
    }
  }
  /**
   * Check if a TypeReference is a chained expression reference
   */
  private isChainedTypeReference(typeReference: TypeReference): boolean {
    // Check if this is a ChainedTypeReference by looking for the chainNodes property
    return isChainedTypeReference(typeReference);
  }

  /**
   * Resolve an entire chain of nodes and return an array of resolved contexts
   * @param chainNodes Array of TypeReference nodes representing the chain
   * @returns Array of ChainResolutionContext objects, or null if resolution fails
   */
  private async resolveEntireChain(
    chainNodes: TypeReference[],
  ): Promise<ChainResolutionContext[] | null> {
    if (!chainNodes?.length) {
      return null;
    }

    // Find all possible resolution paths
    const resolutionPaths =
      await this.findAllPossibleResolutionPaths(chainNodes);

    if (resolutionPaths.length === 0) {
      this.logger.warn(() => 'No valid resolution paths found for chain');

      return null;
    }

    if (resolutionPaths.length === 1) {
      return resolutionPaths[0];
    }

    // Multiple valid paths - need to disambiguate
    const bestPath = this.disambiguateResolutionPaths(
      resolutionPaths,
      chainNodes,
    );

    return bestPath;
  }

  /**
   * Find all possible resolution paths for a chain of nodes
   * Uses backtracking to explore all valid combinations
   */
  private async findAllPossibleResolutionPaths(
    chainNodes: TypeReference[],
  ): Promise<ChainResolutionContext[][]> {
    const paths: ChainResolutionContext[][] = [];
    const pathStack = new Stack<ChainResolutionContext>();

    await this.exploreResolutionPaths(
      chainNodes,
      0,
      undefined,
      pathStack,
      paths,
    );

    paths.forEach((path, index) => {
      // Debug logging removed for performance
    });

    return paths;
  }

  /**
   * Recursively explore all possible resolution paths using backtracking
   */
  private async exploreResolutionPaths(
    chainNodes: TypeReference[],
    stepIndex: number,
    currentContext: ChainResolutionContext,
    pathStack: Stack<ChainResolutionContext>,
    allPaths: ChainResolutionContext[][],
  ): Promise<void> {
    if (stepIndex >= chainNodes.length) {
      // Complete path found - add to results
      const completePath = pathStack.toArray();
      allPaths.push(completePath);
      return;
    }

    const step = chainNodes[stepIndex];
    const nextStep =
      stepIndex + 1 < chainNodes.length ? chainNodes[stepIndex + 1] : undefined;

    // Get ALL possible resolutions for this step
    const possibleResolutions = await this.getAllPossibleResolutions(
      step,
      currentContext,
      nextStep,
    );

    for (const resolution of possibleResolutions) {
      pathStack.push(resolution);
      await this.exploreResolutionPaths(
        chainNodes,
        stepIndex + 1,
        resolution,
        pathStack,
        allPaths,
      );
      pathStack.pop(); // Backtrack
    }
  }

  /**
   * Get all possible resolution contexts for a single chain step
   */
  private async getAllPossibleResolutions(
    step: TypeReference,
    currentContext: ChainResolutionContext,
    nextStep?: TypeReference,
  ): Promise<ChainResolutionContext[]> {
    const resolutions: ChainResolutionContext[] = [];
    const stepName = step.name;

    // Strategy 1: Try namespace resolution
    if (this.canResolveAsNamespace(step, currentContext)) {
      if (this.isValidNamespace(stepName)) {
        const namespaceContext: ChainResolutionContext = {
          type: 'namespace',
          name: stepName,
        };
        resolutions.push(namespaceContext);
      }
    }

    // Strategy 2: Try class resolution
    const classSymbol = await this.tryResolveAsClass(stepName, currentContext);
    if (classSymbol) {
      resolutions.push({ type: 'symbol', symbol: classSymbol });
    }

    // Strategy 2.5: Try instance resolution (for variables that are treated as class references)
    const instanceSymbol = await this.tryResolveAsInstance(
      stepName,
      currentContext,
    );
    if (instanceSymbol) {
      resolutions.push({ type: 'symbol', symbol: instanceSymbol });
    }

    // Strategy 3: Try property/method resolution
    const memberSymbol = await this.tryResolveAsMember(
      step,
      currentContext,
      nextStep,
    );
    if (memberSymbol) {
      resolutions.push({ type: 'symbol', symbol: memberSymbol });
    }

    // Strategy 4: Try built-in type resolution
    const builtInSymbol = await this.resolveBuiltInType(stepName);
    if (builtInSymbol) {
      resolutions.push({ type: 'symbol', symbol: builtInSymbol });
    }

    // Strategy 5: Try global symbol resolution
    const globalSymbols = this.findSymbolByName(stepName);
    const matchingGlobalSymbol = globalSymbols.find(
      (s) => s.kind === 'class' || s.kind === 'property' || s.kind === 'method',
    );
    if (matchingGlobalSymbol) {
      resolutions.push({ type: 'symbol', symbol: matchingGlobalSymbol });
    }

    // Strategy 6: Try standard Apex class resolution (for cases like URL without namespace)
    if (currentContext?.type === 'namespace') {
      const fqn = `${currentContext.name}.${stepName}`;
      const standardClass = await this.resolveStandardApexClass(fqn);
      if (standardClass) {
        resolutions.push({ type: 'symbol', symbol: standardClass });
      }
    }

    return resolutions;
  }

  /**
   * Check if a step can be resolved as a namespace
   */
  private canResolveAsNamespace(
    step: TypeReference,
    currentContext: ChainResolutionContext,
  ): boolean {
    // Can resolve as namespace if:
    // 1. It's explicitly marked as NAMESPACE context
    // 2. It's a CHAIN_STEP that could be a namespace
    // 3. It's in a global context (no current context)
    return (
      step.context === ReferenceContext.NAMESPACE ||
      step.context === ReferenceContext.CHAIN_STEP ||
      !currentContext
    );
  }

  /**
   * Try to resolve a step as a class
   */
  private async tryResolveAsClass(
    stepName: string,
    currentContext: ChainResolutionContext,
  ): Promise<ApexSymbol | null> {
    if (currentContext?.type === 'namespace') {
      // Look for class in the namespace
      const namespaceSymbols = this.findSymbolsInNamespace(currentContext.name);

      let classSymbol = namespaceSymbols.find(
        (s) => s.name === stepName && s.kind === 'class',
      );

      // If not found in loaded symbols, try to resolve as standard Apex class
      if (!classSymbol) {
        const fqn = `${currentContext.name}.${stepName}`;

        classSymbol = (await this.resolveStandardApexClass(fqn)) || undefined;
      }

      return classSymbol || null;
    }

    if (currentContext?.type === 'symbol') {
      // Look for nested class in the current symbol
      const nestedClasses = this.findSymbolsInNamespace(
        currentContext.symbol.name,
      );
      return (
        nestedClasses.find((s) => s.name === stepName && s.kind === 'class') ||
        null
      );
    }

    // Look in global scope
    const globalSymbols = this.findSymbolByName(stepName);
    let classSymbol = globalSymbols.find((s) => s.kind === 'class');

    // If not found in global symbols, try to resolve as standard Apex class
    if (!classSymbol) {
      classSymbol =
        (await this.resolveStandardApexClass(stepName)) || undefined;
    }

    return classSymbol || null;
  }

  /**
   * Try to resolve a step as a member (property/method)
   */
  private async tryResolveAsMember(
    step: TypeReference,
    currentContext: ChainResolutionContext,
    nextStep?: TypeReference,
  ): Promise<ApexSymbol | null> {
    if (!currentContext || currentContext.type !== 'symbol') {
      return null;
    }

    const stepName = step.name;
    const stepContext = step.context;

    // Try as method if context suggests it
    if (stepContext === ReferenceContext.METHOD_CALL) {
      const methodSymbol = await this.resolveMemberInContext(
        currentContext,
        stepName,
        'method',
      );
      if (methodSymbol) {
        return methodSymbol;
      }
    }

    // Try as property if context suggests it
    if (stepContext === ReferenceContext.FIELD_ACCESS) {
      const propertySymbol = await this.resolveMemberInContext(
        currentContext,
        stepName,
        'property',
      );
      if (propertySymbol) {
        return propertySymbol;
      }
    }

    // Try both if context is ambiguous
    if (stepContext === ReferenceContext.CHAIN_STEP) {
      const methodSymbol = await this.resolveMemberInContext(
        currentContext,
        stepName,
        'method',
      );
      if (methodSymbol) {
        return methodSymbol;
      }

      const propertySymbol = await this.resolveMemberInContext(
        currentContext,
        stepName,
        'property',
      );
      if (propertySymbol) {
        return propertySymbol;
      }
    }

    return null;
  }

  /**
   * Disambiguate between multiple valid resolution paths
   * Applies heuristics to select the most likely correct path
   */
  private disambiguateResolutionPaths(
    paths: ChainResolutionContext[][],
    chainNodes: TypeReference[],
  ): ChainResolutionContext[] {
    // Strategy 1: Prefer namespace paths over class paths when both exist
    const namespacePaths = paths.filter((path) =>
      path.some((ctx) => ctx && ctx.type === 'namespace'),
    );

    if (namespacePaths.length > 0) {
      return this.selectBestNamespacePath(namespacePaths, chainNodes);
    }

    // Strategy 2: Prefer most specific resolution (fewer global lookups)
    const mostSpecificPath = paths.reduce((best, current) => {
      const bestSpecificity = this.getPathSpecificity(best);
      const currentSpecificity = this.getPathSpecificity(current);

      if (currentSpecificity > bestSpecificity) {
        return current;
      }
      return best;
    });

    // Strategy 3: Use static analysis of the next step if available
    if (chainNodes.length > 1) {
      const nextStep = chainNodes[1];
      const contextAwarePath = this.choosePathBasedOnNextStep(paths, nextStep);
      if (contextAwarePath) {
        return contextAwarePath;
      }
    }

    // Strategy 4: Prefer paths with method calls over property access
    const methodPaths = paths.filter((path) =>
      path.some(
        (ctx) =>
          ctx &&
          ctx.type === 'symbol' &&
          (ctx.symbol.kind === 'method' || this.isMethodSymbol(ctx.symbol)),
      ),
    );

    if (methodPaths.length > 0) {
      return methodPaths[0];
    }

    return mostSpecificPath;
  }

  /**
   * Select the best namespace path from multiple namespace paths
   */
  private selectBestNamespacePath(
    namespacePaths: ChainResolutionContext[][],
    chainNodes: TypeReference[],
  ): ChainResolutionContext[] {
    // Prefer paths where the namespace is used earlier in the chain
    return namespacePaths.reduce((best, current) => {
      const bestNamespaceIndex = this.getFirstNamespaceIndex(best);
      const currentNamespaceIndex = this.getFirstNamespaceIndex(current);

      // Prefer earlier namespace usage
      if (currentNamespaceIndex < bestNamespaceIndex) {
        return current;
      }

      // If same position, prefer shorter paths (more direct)
      if (
        currentNamespaceIndex === bestNamespaceIndex &&
        current.length < best.length
      ) {
        return current;
      }

      return best;
    });
  }

  /**
   * Get the index of the first namespace in a path
   */
  private getFirstNamespaceIndex(path: ChainResolutionContext[]): number {
    return path.findIndex((ctx) => ctx && ctx.type === 'namespace');
  }

  /**
   * Calculate the specificity score of a resolution path
   * Higher scores indicate more specific (better) resolutions
   */
  private getPathSpecificity(path: ChainResolutionContext[]): number {
    let score = 0;

    for (const ctx of path) {
      if (ctx && ctx.type === 'namespace') {
        score += 10; // Namespace resolution is very specific
      } else if (ctx && ctx.type === 'symbol') {
        const symbol = ctx.symbol;

        // Prefer more specific symbol types
        switch (symbol.kind) {
          case 'method':
            score += 8;
            break;
          case 'property':
            score += 6;
            break;
          case 'class':
            score += 4;
            break;
          default:
            score += 2;
        }

        // Bonus for static symbols
        if ((symbol as any).isStatic) {
          score += 1;
        }
      }
    }

    return score;
  }

  /**
   * Choose a path based on the context of the next step
   */
  private choosePathBasedOnNextStep(
    paths: ChainResolutionContext[][],
    nextStep: TypeReference,
  ): ChainResolutionContext[] | null {
    const nextStepContext = nextStep.context;

    // If next step is a method call, prefer paths that can resolve to a class
    if (nextStepContext === ReferenceContext.METHOD_CALL) {
      const classPaths = paths.filter((path) => {
        const lastContext = path[path.length - 1];
        return (
          lastContext?.type === 'symbol' &&
          (lastContext.symbol.kind === 'class' ||
            this.isClassSymbol(lastContext.symbol))
        );
      });

      if (classPaths.length > 0) {
        return classPaths[0];
      }
    }

    // If next step is field access, prefer paths that can resolve to an instance
    if (nextStepContext === ReferenceContext.FIELD_ACCESS) {
      const instancePaths = paths.filter((path) => {
        const lastContext = path[path.length - 1];
        return (
          lastContext?.type === 'symbol' &&
          (lastContext.symbol.kind === 'property' ||
            lastContext.symbol.kind === 'class' ||
            this.isInstanceSymbol(lastContext.symbol))
        );
      });

      if (instancePaths.length > 0) {
        return instancePaths[0];
      }
    }

    return null;
  }

  /**
   * Check if a symbol represents a method
   */
  private isMethodSymbol(symbol: ApexSymbol): boolean {
    return (
      symbol.kind === 'method' ||
      (symbol.kind === 'property' && symbol.name?.includes('()'))
    );
  }

  /**
   * Check if a symbol represents a class
   */
  private isClassSymbol(symbol: ApexSymbol): boolean {
    return (
      symbol.kind === 'class' ||
      symbol.kind === 'interface' ||
      symbol.kind === 'enum'
    );
  }

  /**
   * Check if a symbol represents an instance (not static)
   */
  private isInstanceSymbol(symbol: ApexSymbol): boolean {
    return (
      !(symbol as any).isStatic &&
      (symbol.kind === 'property' || symbol.kind === 'method')
    );
  }

  /**
   * Resolve a chained expression reference to its final symbol
   */
  public async resolveChainedTypeReference(
    typeReference: TypeReference,
    position?: { line: number; character: number },
  ): Promise<ApexSymbol | null> {
    if (isChainedTypeReference(typeReference)) {
      let resolvedContext: ChainResolutionContext | null = null;
      try {
        const chainNodes = typeReference.chainNodes;

        if (!chainNodes?.length) {
          this.logger.warn(
            () => 'Chained expression reference missing chainNodes property',
          );
          return null;
        }

        // If position is provided, find the specific chain member at that position
        // Always resolve the entire chain first, then return the symbol at the specific position if provided
        if (!chainNodes || chainNodes.length === 0) {
          this.logger.warn(() => 'No chain nodes available for resolution');
          return null;
        }

        // Resolve the entire chain
        const resolvedChain = await this.resolveEntireChain(chainNodes);
        if (!resolvedChain) {
          this.logger.warn(() => 'Failed to resolve entire chain');
          return null;
        }

        // If position is provided, find the specific chain member and return its resolved symbol
        if (position) {
          const chainMember = this.findChainMemberAtPosition(
            typeReference,
            position,
          );

          if (chainMember) {
            resolvedContext = resolvedChain[chainMember.index];
            if (resolvedContext?.type === 'symbol') {
              // Return the resolved symbol at the target index
              return resolvedContext.symbol || null;
            }
          }
        }

        // Return the final resolved symbol (last in the chain)
        resolvedContext = resolvedChain[resolvedChain.length - 1];
        return resolvedContext?.type === 'symbol'
          ? resolvedContext.symbol
          : null;
      } catch (error) {
        this.logger.error(
          () => `Error resolving chained expression reference: ${error}`,
        );
        return null;
      }
    } else {
      return null;
    }
  }

  /**
   * Find the specific chain member at a given position within a chained expression
   */
  private findChainMemberAtPosition(
    chainedRef: ChainedTypeReference,
    position: { line: number; character: number },
  ): { member: any; index: number } | null {
    if (!isChainedTypeReference(chainedRef)) {
      return null;
    }
    const chainNodes = chainedRef.chainNodes;
    if (chainNodes?.length === 0) {
      return null;
    }

    // Check each chain node to find the one at the specified position
    for (let i = 0; i < chainNodes.length; i++) {
      const node = chainNodes[i];
      if (this.isPositionWithinLocation(node.location, position)) {
        return { member: node, index: i };
      }
    }

    return null;
  }

  /**
   * Check if a position is within a symbol location
   */
  private isPositionWithinLocation(
    location: any,
    position: { line: number; character: number },
  ): boolean {
    const startLine = location.identifierRange.startLine;
    const startColumn = location.identifierRange.startColumn;
    const endLine = location.identifierRange.endLine;
    const endColumn = location.identifierRange.endColumn;

    // Convert to 0-based indexing for comparison
    const posLine = position.line;
    const posColumn = position.character;

    if (posLine < startLine || posLine > endLine) {
      return false;
    }

    if (posLine === startLine && posColumn < startColumn) {
      return false;
    }

    if (posLine === endLine && posColumn > endColumn) {
      return false;
    }

    return true;
  }

  /**
   * Try to resolve a step as a namespace
   */
  private tryResolveAsNamespace(
    stepName: string,
    currentContext: ChainResolutionContext,
  ): ApexSymbol | null {
    // Check if this could be a namespace by looking for symbols in that namespace
    const namespaceSymbols = this.findSymbolsInNamespace(stepName);
    if (namespaceSymbols.length > 0) {
      // Don't return a faux symbol - let the caller handle namespace context
      // This will be handled by the NAMESPACE context resolution in the calling method
      return null;
    }

    return null;
  }

  /**
   * Try to resolve a step as an instance (variable)
   */
  private async tryResolveAsInstance(
    stepName: string,
    currentContext: ChainResolutionContext,
  ): Promise<ApexSymbol | null> {
    // Try to find as a property in the current context (closest to variable)
    const propertySymbol = await this.resolveMemberInContext(
      currentContext,
      stepName,
      'property',
    );
    if (propertySymbol) {
      return propertySymbol;
    }

    // Try to find as a global variable
    const globalSymbols = this.findSymbolByName(stepName);
    const globalVariableSymbol = globalSymbols.find(
      (s) =>
        s.kind === 'variable' || s.kind === 'field' || s.kind === 'property',
    );
    if (globalVariableSymbol) {
      return globalVariableSymbol;
    }

    return null;
  }

  /**
   * Try to resolve a step as a property
   */
  private async tryResolveAsProperty(
    stepName: string,
    currentContext: ChainResolutionContext,
  ): Promise<ApexSymbol | null> {
    const propertySymbol = await this.resolveMemberInContext(
      currentContext,
      stepName,
      'property',
    );
    if (propertySymbol) {
      return propertySymbol;
    }

    return null;
  }

  /**
   * Find all symbols in a given namespace
   */
  private findSymbolsInNamespace(namespaceName: string): ApexSymbol[] {
    const allSymbols = this.getAllSymbols();
    return allSymbols.filter((symbol: ApexSymbol) => {
      // Check if symbol is in the namespace by looking at its file path
      // Standard Apex classes are in format: apexlib://System/Url.cls
      if (symbol.fileUri && isStandardApexUri(symbol.fileUri)) {
        const pathParts = symbol.fileUri.split('/');
        if (pathParts.length >= 2) {
          const namespace = pathParts[1];
          return namespace.toLowerCase() === namespaceName.toLowerCase();
        }
      }
      return false;
    });
  }
  /**
   * Resolve a member (property, method, etc.) in the context of a given symbol
   */
  private async resolveMemberInContext(
    context: ChainResolutionContext,
    memberName: string,
    memberType: 'property' | 'method' | 'class',
  ): Promise<ApexSymbol | null> {
    // Handle different context types
    if (context?.type === 'symbol') {
      const contextSymbol = context.symbol;
      const contextFile = contextSymbol.fileUri;
      if (contextFile) {
        let symbolTable = this.symbolGraph.getSymbolTableForFile(contextFile);

        // If this is a standard Apex class and we don't have a symbol table, try to load it
        if (
          !symbolTable &&
          isStandardApexUri(contextFile) &&
          this.resourceLoader
        ) {
          try {
            // Extract the class path from the file path
            const classPath = extractApexLibPath(contextFile);

            const artifact =
              await this.resourceLoader.loadAndCompileClass(classPath);
            if (artifact && artifact.compilationResult.result) {
              symbolTable = artifact.compilationResult.result;

              // Add the symbol table to our graph for future use
              await this.addSymbolTable(symbolTable, contextFile);
            } else {
            }
          } catch (_error) {}
        }

        if (symbolTable) {
          // Look for members with the given name in the same file
          const allSymbols = symbolTable.getAllSymbols();

          const contextMembers = allSymbols.filter(
            (s) => s.name === memberName && s.kind === memberType,
          );

          if (contextMembers.length > 0) {
            return contextMembers[0];
          } else {
            // Debug: show all symbols with the same name
            const _sameNameSymbols = allSymbols.filter(
              (s) => s.name === memberName,
            );
          }
        }
      }
    } else if (context?.type === 'namespace') {
      // For namespace context, look for symbols in that namespace
      const namespaceSymbols = this.findSymbolsInNamespace(context.name);
      const matchingSymbol = namespaceSymbols.find(
        (s) => s.kind === memberType && s.name === memberName,
      );

      if (matchingSymbol) {
        return matchingSymbol;
      }
    }

    // If not found in context file, try to find it as a built-in type or global symbol
    const globalSymbols = this.findSymbolByName(memberName);
    const matchingSymbol = globalSymbols.find((s) => s.kind === memberType);

    if (matchingSymbol) {
      return matchingSymbol;
    }

    // For built-in types, try to resolve them
    if (memberType === 'class') {
      const builtInSymbol = await this.resolveBuiltInType(memberName);
      if (builtInSymbol) {
        return builtInSymbol;
      }
    }

    return null;
  }

  /**
   * Get the return type of a method symbol
   */
  private getMethodReturnType(methodSymbol: ApexSymbol): string | null {
    // This is a simplified implementation - in a full system, you'd parse the method signature
    // For now, we'll try to extract it from the symbol's metadata or use heuristics

    // Check if the method symbol has return type information
    if ((methodSymbol as any).returnType) {
      return (methodSymbol as any).returnType;
    }

    // For built-in methods, we can use known return types
    const methodName = methodSymbol.name;
    const className = methodSymbol.parentId
      ? this.getSymbolById(methodSymbol.parentId)?.name
      : null;

    // Common return type patterns for built-in methods
    if (className === 'System' && methodName === 'getOrgDomainUrl') {
      return 'URL'; // System.getOrgDomainUrl() returns URL
    }

    // Add more known return types as needed

    return null;
  }

  /**
   * Get a symbol by its ID
   */
  private getSymbolById(symbolId: string): ApexSymbol | null {
    try {
      // Try to find the symbol by searching through all known files
      const allFiles = Array.from(
        this.symbolGraph['fileToSymbolTable']?.keys() || [],
      );

      for (const fileUri of allFiles) {
        const symbolTable = this.symbolGraph.getSymbolTableForFile(fileUri);
        if (symbolTable) {
          const symbols = symbolTable.getAllSymbols();
          const found = symbols.find((s: ApexSymbol) => s.id === symbolId);
          if (found) {
            return found;
          }
        }
      }

      return null;
    } catch (_error) {
      return null;
    }
  }
}
