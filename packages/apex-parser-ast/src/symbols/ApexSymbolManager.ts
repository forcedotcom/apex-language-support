/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HashMap, Stack } from 'data-structure-typed';
import { Effect } from 'effect';
import {
  getLogger,
  type EnumValue,
  ApexSettingsManager,
  DEFAULT_APEX_SETTINGS,
} from '@salesforce/apex-lsp-shared';
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
  TypeSymbol,
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
  SymbolReference,
  ReferenceContext,
  ChainedSymbolReference,
  EnhancedSymbolReference,
} from '../types/symbolReference';
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
import { extractFilePathFromUri } from '../types/UriBasedIdGenerator';

import { ResourceLoader } from '../utils/resourceLoader';
import { STANDARD_APEX_LIBRARY_URI } from '../utils/ResourceUtils';
import { isApexKeyword, BUILTIN_TYPE_NAMES } from '../utils/ApexKeywords';
import type {
  ApexComment,
  CommentAssociation,
} from '../parser/listeners/ApexCommentCollectorListener';
import { CommentAssociator } from '../utils/CommentAssociator';
import {
  isChainedSymbolReference,
  isBlockSymbol,
} from '../utils/symbolNarrowing';

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
  // Track files currently being loaded to prevent recursive loops
  private loadingSymbolTables: Set<string> = new Set();

  constructor() {
    // Get settings from ApexSettingsManager (with fallback for test environments)
    let deferredReferenceSettings;
    let settingsManager: ApexSettingsManager | undefined;

    try {
      // Try to get settings manager instance
      if (
        ApexSettingsManager &&
        typeof ApexSettingsManager.getInstance === 'function'
      ) {
        settingsManager = ApexSettingsManager.getInstance();
        if (settingsManager) {
          const settings = settingsManager.getSettings();
          deferredReferenceSettings = settings.apex.deferredReferenceProcessing;
        }
      }
    } catch (_error) {
      // Fallback: use default settings if ApexSettingsManager is not available
      // This can happen in test environments where the module is mocked
      this.logger.debug(
        () =>
          'ApexSettingsManager not available, using default deferred reference processing settings',
      );
    }

    // Use default settings if not available
    if (!deferredReferenceSettings) {
      // Fallback to inline defaults if DEFAULT_APEX_SETTINGS is not available (e.g., in mocked test environments)
      try {
        deferredReferenceSettings =
          DEFAULT_APEX_SETTINGS?.apex?.deferredReferenceProcessing;
      } catch {
        // Ignore errors accessing DEFAULT_APEX_SETTINGS
      }

      // Final fallback: use hardcoded defaults
      if (!deferredReferenceSettings) {
        deferredReferenceSettings = {
          deferredBatchSize: 50,
          maxRetryAttempts: 10,
          retryDelayMs: 100,
          maxRetryDelayMs: 5000,
          queueCapacityThreshold: 90,
          queueDrainThreshold: 75,
          queueFullRetryDelayMs: 10000,
          maxQueueFullRetryDelayMs: 30000,
          circuitBreakerFailureThreshold: 5,
          circuitBreakerResetThreshold: 50,
        };
      }
    }

    // Initialize ApexSymbolGraph with deferred reference processing settings
    this.symbolGraph = new ApexSymbolGraph(deferredReferenceSettings);
    ApexSymbolGraph.setInstance(this.symbolGraph);

    // Register settings change listener if settings manager is available
    if (
      settingsManager &&
      typeof settingsManager.onSettingsChange === 'function'
    ) {
      settingsManager.onSettingsChange((newSettings) => {
        if (newSettings.apex.deferredReferenceProcessing) {
          this.symbolGraph.updateDeferredReferenceSettings(
            newSettings.apex.deferredReferenceProcessing,
          );
        }
      });
    }

    this.fileMetadata = new HashMap();
    this.unifiedCache = new UnifiedCache(
      this.MAX_CACHE_SIZE,
      50 * 1024 * 1024, // 50MB
      this.CACHE_TTL,
      true,
    );
    this.builtInTypeTables = BuiltInTypeTablesImpl.getInstance();

    // Initialize ResourceLoader for standard Apex classes (loadMode controlled by settings via LCSAdapter)
    try {
      this.resourceLoader = ResourceLoader.getInstance({
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
      // Synchronize id with key.unifiedId to avoid duplication
      symbol.id = symbol.key.unifiedId;
      // Ensure key.fileUri is set and synchronized
      if (!symbol.key.fileUri) {
        symbol.key.fileUri = properUri;
      }
      if (symbol.fileUri !== symbol.key.fileUri) {
        symbol.fileUri = symbol.key.fileUri;
      }
    } else {
      // If unifiedId exists but id is different, synchronize them
      // unifiedId is the source of truth
      if (symbol.id !== symbol.key.unifiedId) {
        symbol.id = symbol.key.unifiedId;
      }
      // Synchronize fileUri with key.fileUri (key.fileUri is source of truth)
      if (symbol.key.fileUri && symbol.fileUri !== symbol.key.fileUri) {
        symbol.fileUri = symbol.key.fileUri;
      }
    }

    // Parent property removed - FQN calculation uses getParent function parameter
    // No need to hydrate parent property

    if (!symbol.fqn) {
      symbol.fqn = calculateFQN(symbol, { normalizeCase: true }, (parentId) =>
        this.symbolGraph.getSymbol(parentId),
      );
      // Update key FQN for consistency
      symbol.key.fqn = symbol.fqn;
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
      // Sync totalSymbols from graph to ensure consistency
      // The graph is the source of truth for symbol counts
      const graphStats = this.symbolGraph.getStats();
      this.memoryStats.totalSymbols = graphStats.totalSymbols;

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
      // Normalize to lowercase to match cache key format in findSymbolByName()
      const normalizedName = symbol.name.toLowerCase();
      this.unifiedCache.invalidatePattern(`symbol_name_${normalizedName}`);
      // Also invalidate by name pattern for broader matching (normalized)
      this.unifiedCache.invalidatePattern(normalizedName);
      // Invalidate file-based cache when symbols are added to a file
      this.unifiedCache.invalidatePattern(`file_symbols_${fileUri}`);
    }
  }

  /**
   * Get symbol by ID
   * Delegates to ApexSymbolGraph for O(1) lookup via symbolIdIndex
   */
  getSymbol(symbolId: string): ApexSymbol | null {
    // First check cache for performance
    const cached = this.unifiedCache.get<ApexSymbol>(symbolId);
    if (cached) {
      return cached;
    }

    // Fallback to graph lookup (uses symbolIdIndex for O(1) or SymbolTable fallback)
    const symbol = this.symbolGraph.getSymbol(symbolId);
    if (symbol) {
      // Cache for future lookups
      this.unifiedCache.set(symbolId, symbol, 'symbol_lookup');
    }
    return symbol;
  }

  /**
   * Find all symbols with a given name
   */
  findSymbolByName(name: string): ApexSymbol[] {
    // Don't short-circuit keywords that are also standard namespaces/classes
    // Check if it's a standard namespace or class before short-circuiting
    const isStandardNamespace =
      this.resourceLoader && this.resourceLoader.isStdApexNamespace(name);
    const isBuiltInType = BUILTIN_TYPE_NAMES.has(name.toLowerCase());

    // Only short-circuit keywords that are NOT standard namespaces/classes/built-in types
    if (isApexKeyword(name) && !isStandardNamespace && !isBuiltInType) {
      return [];
    }

    // Normalize cache key to lowercase for consistency (nameIndex is now case-insensitive)
    const cacheKey = `symbol_name_${name.toLowerCase()}`;
    const cached = this.unifiedCache.get<ApexSymbol[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // OPTIMIZED: Delegate to graph which delegates to SymbolTable
    // nameIndex is now case-insensitive, so no fallback needed
    const symbols = this.symbolGraph.findSymbolByName(name) || [];
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

    // Normalize URI using the same logic as getSymbolsInFile() to ensure consistency
    // This ensures we use the same normalized URI that was used when registering SymbolTables
    const normalizedUri = extractFilePathFromUri(properUri);

    // OPTIMIZED: Delegate to graph which delegates to SymbolTable
    const symbols = this.symbolGraph.getSymbolsInFile(normalizedUri);
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
   * @returns The proper URI with STANDARD_APEX_LIBRARY_URI scheme
   */
  private convertToStandardLibraryUri(classPath: string): string {
    if (this.isStandardApexLibraryPath(classPath)) {
      return `${STANDARD_APEX_LIBRARY_URI}/${classPath}`;
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
   * Get symbol metrics (synchronous version)
   * For better performance with large symbol sets, use getSymbolMetricsEffect() instead
   */
  getSymbolMetrics(): Map<string, SymbolMetrics> {
    return Effect.runSync(this.getSymbolMetricsEffect());
  }

  /**
   * Get symbol metrics (Effect-based with yielding)
   * This version yields periodically to prevent blocking and can be queued as Background task
   */
  getSymbolMetricsEffect(): Effect.Effect<
    Map<string, SymbolMetrics>,
    never,
    never
  > {
    const self = this;
    return Effect.gen(function* () {
      const metrics = new Map<string, SymbolMetrics>();
      const allSymbols = self.getAllSymbols();

      const batchSize = 50;
      for (let i = 0; i < allSymbols.length; i++) {
        const symbol = allSymbols[i];
        const symbolId = self.getSymbolId(symbol);
        metrics.set(symbolId, self.computeMetrics(symbol));

        // Yield every batchSize symbols to allow other tasks to run
        if ((i + 1) % batchSize === 0) {
          yield* Effect.yieldNow();
        }
      }

      return metrics;
    });
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

    // Normalize URI using extractFilePathFromUri to match how symbols are stored
    // This ensures consistency with addSymbolTable which uses normalized URIs
    const normalizedUri = extractFilePathFromUri(properUri);

    // Remove from symbol graph (graph will normalize again, but we normalize here for consistency)
    this.symbolGraph.removeFile(normalizedUri);

    // Sync memory stats with the graph's stats to ensure consistency
    const graphStats = this.symbolGraph.getStats();
    this.memoryStats.totalSymbols = graphStats.totalSymbols;

    // Remove from file metadata (use original fileUri for metadata lookup)
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
    // Note: This is synchronous - for large workspaces, consider using async variant
    const fileEntries = Array.from(this.fileMetadata.entries());
    for (const [fileUri, _metadata] of fileEntries) {
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

    // Normalize URI using extractFilePathFromUri to ensure consistency with SymbolTable registration
    // This ensures that fileIndex lookups will find the symbols
    const normalizedUri = extractFilePathFromUri(properUri);

    // Register SymbolTable once for the entire file before processing symbols
    // This avoids redundant registration calls for each symbol
    this.symbolGraph.registerSymbolTable(symbolTable, normalizedUri);

    // Add all symbols from the symbol table
    const symbols = symbolTable.getAllSymbols
      ? symbolTable.getAllSymbols()
      : [];

    // Update all symbols to use the normalized URI
    // Process in batches with yields for large symbol tables to prevent blocking
    const batchSize = 100;
    const symbolNamesAdded = new Set<string>();
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      // Update the symbol's fileUri to match the normalized URI
      symbol.fileUri = normalizedUri;
      // Pass undefined for symbolTable since it's already registered above
      // addSymbol() will use the registered SymbolTable via ensureSymbolTableForFile()
      this.addSymbol(symbol, normalizedUri, undefined);
      symbolNamesAdded.add(symbol.name);

      // Yield every batchSize symbols to allow other tasks to run
      if ((i + 1) % batchSize === 0 && i + 1 < symbols.length) {
        // Use setTimeout to yield to event loop
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    // Invalidate cache for all symbol names that were added
    // This ensures that findSymbolByName() will see the newly added symbols
    for (const symbolName of symbolNamesAdded) {
      // Normalize to lowercase to match cache key format in findSymbolByName()
      const normalizedName = symbolName.toLowerCase();
      this.unifiedCache.invalidatePattern(`symbol_name_${normalizedName}`);
    }

    // Invalidate file-based cache when symbols are added to a file
    // This ensures that findSymbolsInFile() will see the newly added symbols
    // Do this BEFORE processing references so references can find the symbols
    this.unifiedCache.invalidatePattern(`file_symbols_${normalizedUri}`);

    // Also invalidate name-based cache to ensure findSymbolByName works correctly
    for (const symbolName of symbolNamesAdded) {
      const normalizedName = symbolName.toLowerCase();
      this.unifiedCache.invalidatePattern(`symbol_name_${normalizedName}`);
    }

    // Process type references and add them to the symbol graph
    // This must happen after symbols are added and cache is invalidated
    // Use the normalized URI for consistency with how symbols are stored
    await this.processSymbolReferencesToGraph(symbolTable, normalizedUri);

    // Sync memory stats with the graph's stats to ensure consistency
    // The graph is the source of truth for symbol counts
    const graphStats = this.symbolGraph.getStats();
    this.memoryStats.totalSymbols = graphStats.totalSymbols;
  }

  /**
   * Get SymbolReference data at a specific position in a file
   * This provides precise AST-based position data for enhanced symbol resolution
   * @param fileUri The file path to search in
   * @param position The position to search for references (1-based line index, 0-based column index)
   * @returns Array of SymbolReference objects at the position
   */
  getReferencesAtPosition(
    fileUri: string,
    position: { line: number; character: number },
  ): SymbolReference[] {
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
   * The method uses SymbolReferences as hints to locate symbols but only returns fully resolved
   * ApexSymbol objects. It may return null even when SymbolReferences are found if symbol
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
   * 1. SymbolReferences at exact position
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
      // Step 1: Try to find SymbolReferences at the position (parser-ast format already 1-based line, 0-based column)
      const typeReferences = this.getReferencesAtPosition(fileUri, position);

      if (typeReferences.length > 0) {
        // Step 2: For chained references, find the most specific reference for this position
        // If position is on a specific chain member, prefer references that match that member
        let referenceToResolve = typeReferences[0];

        // Prioritize chained references when position matches a chain member
        // This ensures we resolve the correct part of the chain (e.g., "System" in "System.Url")
        const chainedRefs = typeReferences.filter((ref) =>
          this.isChainedSymbolReference(ref),
        );

        // Always prefer chained references over non-chained references when available
        if (chainedRefs.length > 0) {
          // Check each chained reference to find the one that matches the position
          for (const ref of chainedRefs) {
            const chainNodes = (ref as ChainedSymbolReference).chainNodes;
            if (!chainNodes || chainNodes.length === 0) {
              continue;
            }

            // Check if position is at the start of the chained reference
            const chainedRefStart = ref.location.identifierRange;
            const isAtStartOfChainedRef =
              position.line === chainedRefStart.startLine &&
              position.character === chainedRefStart.startColumn;

            if (isAtStartOfChainedRef) {
              // Position is exactly at the start of the chained reference
              // This means we're on the first node - select this chained reference
              referenceToResolve = ref;
              break;
            }

            // First check if position matches a specific chain member
            const chainMember = this.findChainMemberAtPosition(
              ref as ChainedSymbolReference,
              position,
            );
            if (chainMember) {
              // Found a chained reference with a specific member at this position
              referenceToResolve = ref;
              break;
            }

            // If position is within the first node's range (but not at the start)
            const firstNode = chainNodes[0];
            const firstNodeStart = firstNode.location.identifierRange;
            // Check if position is within the first node's range
            if (
              position.line >= firstNodeStart.startLine &&
              position.line <= firstNodeStart.endLine &&
              position.character >= firstNodeStart.startColumn &&
              position.character <= firstNodeStart.endColumn
            ) {
              // Position is within the first node - resolve just that node
              referenceToResolve = ref;
              break;
            }
          }
          // If we didn't find a specific chained reference match, but we have chained references,
          // prioritize the first chained reference over non-chained references
          // This ensures chained references are always prioritized when available
          if (
            !this.isChainedSymbolReference(referenceToResolve) &&
            chainedRefs.length > 0
          ) {
            referenceToResolve = chainedRefs[0];
          }
        } else {
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
          referenceToResolve = sortedReferences[0];
        }

        const resolvedSymbol = await this.resolveSymbolReferenceToSymbol(
          referenceToResolve,
          fileUri,
          position,
        );
        if (resolvedSymbol) {
          return resolvedSymbol;
        }

        // If we have a chained reference but resolution failed, don't fall back to direct symbol lookup
        // Chained references should be resolved through the chain, not through direct symbol matching
        const wasChainedRef = this.isChainedSymbolReference(referenceToResolve);
        if (wasChainedRef) {
          this.logger.debug(
            () =>
              `Chained reference "${referenceToResolve.name}" found at ` +
              `${fileUri}:${position.line}:${position.character} ` +
              'but resolution returned null - not falling back to direct symbol lookup',
          );
          return null;
        }
      }

      // Note: Positions are already parser-ast format (1-based line, 0-based column).
      // No off-by-one adjustment is needed here.

      // Step 3: Try to locate references on the same line that span the position (scope fallback)
      // Only do this if we don't have a chained reference (chained references should be resolved through the chain)
      // Check if we had any chained references at this position - if so, skip fallback
      const hadChainedRefs =
        typeReferences.length > 0 &&
        typeReferences.some((ref) => this.isChainedSymbolReference(ref));

      if (hadChainedRefs) {
        // We had chained references but resolution failed - don't fall back to direct symbol lookup
        return null;
      }
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
          const resolvedFromLine = await this.resolveSymbolReferenceToSymbol(
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
        // Exclude scope symbols from resolution results (they're structural, not semantic)
        if (isBlockSymbol(symbol)) {
          return false;
        }

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

      // Compute FQN if missing or too generic
      if (!symbol.fqn || symbol.fqn === symbol.name) {
        symbol.fqn = calculateFQN(symbol, { normalizeCase: true }, (parentId) =>
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
  private async processSymbolReferencesToGraph(
    symbolTable: SymbolTable,
    fileUri: string,
  ): Promise<void> {
    try {
      const typeReferences = symbolTable.getAllReferences();

      // Process references in batches with yields to prevent blocking
      const batchSize = 50; // Process 50 references at a time
      for (let i = 0; i < typeReferences.length; i += batchSize) {
        const batch = typeReferences.slice(i, i + batchSize);

        // Process batch
        for (const typeRef of batch) {
          await this.processSymbolReferenceToGraph(
            typeRef,
            fileUri,
            symbolTable,
          );
        }

        // Yield after each batch (except the last) to allow other tasks to run
        if (i + batchSize < typeReferences.length) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
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
   * @param symbolTable The symbol table for the current file (to check for same-file symbols)
   */
  private async processSymbolReferenceToGraph(
    typeRef: SymbolReference,
    fileUri: string,
    symbolTable: SymbolTable,
  ): Promise<void> {
    try {
      // Check if this is a cross-file reference BEFORE trying to resolve
      // This prevents recursive cascades when processing standard library classes
      const qualifierInfo = this.extractQualifierFromChain(typeRef);
      let isCrossFileReference = false;

      if (qualifierInfo && qualifierInfo.isQualified) {
        // For qualified references (e.g., "System.debug"), check if the qualifier is in the current file
        // Special case: 'this' qualifier is always same-file
        if (qualifierInfo.qualifier.toLowerCase() === 'this') {
          // 'this' is always same-file, so check if the member exists in the file
          // Use getAllSymbols().find() for more reliable same-file lookup
          const allSymbols = symbolTable.getAllSymbols();
          const memberInFile = allSymbols.find(
            (s) => s.name === qualifierInfo.member,
          );
          if (!memberInFile) {
            isCrossFileReference = true;
          }
        } else {
          // Check if the qualifier is in the current file
          // Use getAllSymbols().find() for more reliable same-file lookup
          const allSymbols = symbolTable.getAllSymbols();
          const qualifierInFile = allSymbols.find(
            (s) => s.name === qualifierInfo.qualifier,
          );
          if (!qualifierInFile) {
            // Qualifier not in current file - this is a cross-file reference
            isCrossFileReference = true;
          }
        }
      } else {
        // For unqualified references, check if the symbol exists in the current file
        // Use getAllSymbols().find() for more reliable same-file lookup
        const allSymbols = symbolTable.getAllSymbols();
        const symbolInFile = allSymbols.find((s) => s.name === typeRef.name);
        if (!symbolInFile) {
          // Symbol not in current file - this is a cross-file reference
          isCrossFileReference = true;
        }
      }

      // If it's a cross-file reference, defer it immediately without resolving
      // This prevents triggering resolution of standard library classes or other files
      if (isCrossFileReference) {
        // For cross-file references, we still need a source symbol for deferral
        // Use the graph-based lookup as fallback since SymbolTable won't have cross-file symbols
        const properUri =
          getProtocolType(fileUri) !== null ? fileUri : createFileUri(fileUri);
        const normalizedUri = extractFilePathFromUri(properUri);
        let sourceSymbol = this.findContainingSymbolForReference(
          typeRef,
          normalizedUri,
        );
        if (!sourceSymbol) {
          // Fallback: Try to find the class symbol in the file
          const symbolsInFile = this.findSymbolsInFile(normalizedUri);
          sourceSymbol =
            symbolsInFile.find(
              (s) =>
                s.kind === SymbolKind.Class ||
                s.kind === SymbolKind.Interface ||
                s.kind === SymbolKind.Enum ||
                s.kind === SymbolKind.Trigger,
            ) || null;
        }

        if (sourceSymbol) {
          const referenceType = this.mapReferenceContextToType(typeRef.context);
          this.symbolGraph.enqueueDeferredReference(
            sourceSymbol,
            typeRef.name,
            referenceType,
            typeRef.location,
            {
              methodName: typeRef.parentContext,
              isStatic: await this.isStaticReference(typeRef),
            },
          );
        }
        return;
      }

      // At this point, we know the reference is to a symbol in the same file (Set A)
      // Optimize: Resolve both source and target from SymbolTable directly
      // This is deterministic since symbol collection is complete

      // 1. Resolve source symbol from SymbolTable (handles blocks by finding containing method/class)
      const sourceSymbol = this.findContainingSymbolFromSymbolTable(
        typeRef,
        symbolTable,
      );
      if (!sourceSymbol) {
        // Can't resolve source symbol - skip this reference
        this.logger.debug(
          () =>
            `Skipping type reference ${typeRef.name}: could not resolve source symbol from SymbolTable`,
        );
        return;
      }

      // 2. Resolve target symbol from SymbolTable (already optimized)
      const targetSymbol = await this.findTargetSymbolForReference(
        typeRef,
        fileUri,
        sourceSymbol,
        symbolTable,
      );
      if (!targetSymbol) {
        // Even though it should be in the file, we couldn't resolve it
        // Defer it as a fallback
        const referenceType = this.mapReferenceContextToType(typeRef.context);
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

      // 3. Add to graph directly (symbols are already in graph from addSymbolTable)
      // Get symbols from graph to ensure we use the exact instances stored there
      const sourceSymbolsInGraph = this.symbolGraph.findSymbolByName(
        sourceSymbol.name,
      );
      const targetSymbolsInGraph = this.symbolGraph.findSymbolByName(
        targetSymbol.name,
      );

      const sourceInGraph = sourceSymbol.fileUri
        ? sourceSymbolsInGraph.find((s) => s.fileUri === sourceSymbol.fileUri)
        : sourceSymbolsInGraph[0];

      const targetInGraph = targetSymbol.fileUri
        ? targetSymbolsInGraph.find((s) => s.fileUri === targetSymbol.fileUri)
        : targetSymbolsInGraph[0];

      // Symbols should be in graph since addSymbolTable runs before processSymbolReferencesToGraph
      // If they're not, queue for when they are added (rare edge case)
      if (!sourceInGraph || !targetInGraph) {
        const referenceType = this.mapReferenceContextToType(typeRef.context);
        this.symbolGraph.enqueueDeferredReference(
          sourceSymbol,
          targetSymbol.name,
          referenceType,
          typeRef.location,
          {
            methodName: typeRef.parentContext,
            isStatic: await this.isStaticReference(typeRef),
          },
        );
        return;
      }

      // Map ReferenceContext to ReferenceType
      const referenceType = this.mapReferenceContextToType(typeRef.context);

      // Add the reference to the symbol graph using symbols from the graph
      // This is deterministic for same-file references since both symbols are resolved from SymbolTable
      this.symbolGraph.addReference(
        sourceInGraph,
        targetInGraph,
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
    typeRef: SymbolReference,
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
   * Find the containing symbol for a type reference using SymbolTable directly.
   * Optimized for same-file references (Set A) - resolves from SymbolTable without graph lookup.
   * Handles block symbols by traversing up to find containing method/class/interface/enum/trigger.
   * @param typeRef The type reference
   * @param symbolTable The symbol table for the file
   * @returns The containing semantic symbol (method, class, interface, enum, or trigger) or null
   */
  private findContainingSymbolFromSymbolTable(
    typeRef: SymbolReference,
    symbolTable: SymbolTable,
  ): ApexSymbol | null {
    const position = {
      line: typeRef.location.identifierRange.startLine,
      character: typeRef.location.identifierRange.startColumn,
    };

    // Get scope hierarchy from SymbolTable (innermost to outermost blocks)
    const scopeHierarchy = symbolTable.getScopeHierarchy(position);
    const allSymbols = symbolTable.getAllSymbols();

    // Traverse from innermost to outermost to find the containing semantic symbol
    // Reverse to start from innermost (most specific)
    for (const blockSymbol of [...scopeHierarchy].reverse()) {
      // If this block has a parent, check if the parent is a semantic symbol
      if (blockSymbol.parentId) {
        const parent = allSymbols.find((s) => s.id === blockSymbol.parentId);
        if (parent) {
          // Check if parent is a semantic symbol (method, class, interface, enum, trigger)
          if (
            parent.kind === SymbolKind.Method ||
            parent.kind === SymbolKind.Class ||
            parent.kind === SymbolKind.Interface ||
            parent.kind === SymbolKind.Enum ||
            parent.kind === SymbolKind.Trigger
          ) {
            return parent;
          }

          // If parent is also a block, continue traversing up
          // This handles nested blocks (e.g., if inside for inside method)
          if (isBlockSymbol(parent) && parent.parentId) {
            let currentId: string | undefined = parent.parentId;
            const visited = new Set<string>();
            visited.add(parent.id);

            while (currentId && !visited.has(currentId)) {
              visited.add(currentId);
              const ancestor = allSymbols.find((s) => s.id === currentId);
              if (!ancestor) {
                break;
              }

              // Found a semantic symbol
              if (
                ancestor.kind === SymbolKind.Method ||
                ancestor.kind === SymbolKind.Class ||
                ancestor.kind === SymbolKind.Interface ||
                ancestor.kind === SymbolKind.Enum ||
                ancestor.kind === SymbolKind.Trigger
              ) {
                return ancestor;
              }

              // Continue up the chain if it's another block
              if (isBlockSymbol(ancestor) && ancestor.parentId) {
                currentId = ancestor.parentId;
              } else {
                break;
              }
            }
          }
        }
      }
    }

    // Fallback: If no containing semantic symbol found in scope hierarchy,
    // find the top-level type symbol (class, interface, enum, trigger)
    const topLevelSymbol = allSymbols.find(
      (s) =>
        s.kind === SymbolKind.Class ||
        s.kind === SymbolKind.Interface ||
        s.kind === SymbolKind.Enum ||
        s.kind === SymbolKind.Trigger,
    );

    return topLevelSymbol || null;
  }

  /**
   * Find the target symbol being referenced
   * @param typeRef The type reference
   * @param fileUri Optional file URI to prefer symbols from the same file
   * @param sourceSymbol Optional source symbol containing the reference (for 'this.' resolution)
   * @returns The target symbol or null if not found
   */
  private async findTargetSymbolForReference(
    typeRef: SymbolReference,
    fileUri?: string,
    sourceSymbol?: ApexSymbol | null,
    symbolTable?: SymbolTable,
  ): Promise<ApexSymbol | null> {
    // First, try to extract qualifier information from chainNodes
    const qualifierInfo = this.extractQualifierFromChain(typeRef);

    if (qualifierInfo && qualifierInfo.isQualified) {
      // Try to resolve the qualified reference
      // Pass fileUri and sourceSymbol to help resolve 'this.' expressions to class-scoped members
      const qualifiedSymbol = await this.resolveQualifiedReferenceFromChain(
        qualifierInfo.qualifier,
        qualifierInfo.member,
        typeRef.context,
        fileUri,
        sourceSymbol,
        typeRef,
      );

      if (qualifiedSymbol) {
        return qualifiedSymbol;
      }
    }

    // For unqualified references, use scope-based resolution if symbolTable is available
    if (symbolTable && fileUri) {
      // Phase 1: Same-file resolution using SymbolTable scope hierarchy
      // Use the reference location to find the scope hierarchy
      const position = {
        line: typeRef.location.identifierRange.startLine,
        character: typeRef.location.identifierRange.startColumn,
      };
      const scopeHierarchy = symbolTable.getScopeHierarchy(position);

      // Primary approach: Explicit scope hierarchy search using getAllSymbols()
      // Get all symbols from SymbolTable (they're all from the same file)
      const allFileSymbols = symbolTable.getAllSymbols();

      // Search for symbols with the target name, starting from the innermost scope
      // Reverse the hierarchy to search from innermost (most specific) to outermost
      const innermostToOutermost = [...scopeHierarchy].reverse();
      for (const blockSymbol of innermostToOutermost) {
        // Find symbols in this block scope (children of the block or nested blocks)
        // First, find direct children
        const directChildren = allFileSymbols.filter(
          (symbol) =>
            symbol.name === typeRef.name && symbol.parentId === blockSymbol.id,
        );

        // Also search nested blocks (descendants of this block)
        const nestedBlocks = allFileSymbols.filter(
          (s) => s.kind === SymbolKind.Block && s.parentId === blockSymbol.id,
        );
        const symbolsInNestedBlocks: ApexSymbol[] = [];
        for (const nestedBlock of nestedBlocks) {
          const nestedSymbols = allFileSymbols.filter(
            (symbol) =>
              symbol.name === typeRef.name &&
              symbol.parentId === nestedBlock.id,
          );
          symbolsInNestedBlocks.push(...nestedSymbols);
        }

        // Combine direct children and nested symbols
        const symbolsInScope = [...directChildren, ...symbolsInNestedBlocks];

        if (symbolsInScope.length > 0) {
          // Found a symbol in this scope - prioritize variables/parameters over fields
          // Sort by kind priority: variable/parameter > field
          const prioritized = symbolsInScope.sort((a, b) => {
            const aIsVar =
              a.kind === SymbolKind.Variable || a.kind === SymbolKind.Parameter;
            const bIsVar =
              b.kind === SymbolKind.Variable || b.kind === SymbolKind.Parameter;
            if (aIsVar && !bIsVar) return -1;
            if (!aIsVar && bIsVar) return 1;
            return 0;
          });
          return prioritized[0];
        }
      }

      // If not found in any block scope, search for symbols in parent scopes
      // This includes class fields, method parameters, etc.
      // Search from outermost to innermost to find the most specific parent symbol
      for (const blockSymbol of scopeHierarchy) {
        // Find all symbols with the target name
        const sameNameSymbols = allFileSymbols.filter(
          (s) => s.name === typeRef.name,
        );

        // Check if any symbol is a parent or ancestor of this block
        for (const symbol of sameNameSymbols) {
          // Check if this symbol is a direct parent of the block (e.g., class field, method parameter)
          if (blockSymbol.parentId === symbol.id) {
            return symbol;
          }
          // Check if symbol is an ancestor by following parentId chain up from the block
          let currentBlockId: string | null = blockSymbol.parentId;
          while (currentBlockId) {
            if (currentBlockId === symbol.id) {
              return symbol;
            }
            // Find parent block to continue chain
            const parentBlock = allFileSymbols.find(
              (s) => s.id === currentBlockId && s.kind === SymbolKind.Block,
            );
            currentBlockId = parentBlock?.parentId || null;
          }
        }
      }
    }

    // Fallback: Try to find the symbol by name (for unqualified references)
    const symbols = this.findSymbolByName(typeRef.name);
    if (symbols.length > 0) {
      // If fileUri is provided, prefer symbols from the same file
      if (fileUri) {
        const normalizedUri = extractFilePathFromUri(
          getProtocolType(fileUri) !== null ? fileUri : createFileUri(fileUri),
        );
        const sameFileSymbols = symbols.filter(
          (s) => s.fileUri === normalizedUri,
        );
        if (sameFileSymbols.length > 0) {
          return this.selectMostSpecificSymbol(sameFileSymbols, fileUri);
        }
      }
      // For now, take the first match. In a more sophisticated implementation,
      // we would use context to disambiguate
      return symbols[0];
    }

    // Try to resolve as built-in type
    const builtInSymbol = await this.resolveBuiltInType(typeRef);
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
    fileUri?: string,
    sourceSymbol?: ApexSymbol | null,
    originalTypeRef?: SymbolReference,
  ): Promise<ApexSymbol | null> {
    try {
      // Special case: 'this' qualifier means we're accessing an instance member
      // in the containing class. 'this' can only reference class-scoped members.
      if (qualifier.toLowerCase() === 'this') {
        // Find the containing class by traversing up the parent chain from source symbol
        let containingClass: ApexSymbol | null = null;
        if (sourceSymbol) {
          containingClass = this.getContainingType(sourceSymbol);
        }

        // Look for the member within the containing class scope
        // 'this' can only reference class-scoped members, so we must look in the containing class
        if (containingClass && fileUri) {
          const normalizedUri = extractFilePathFromUri(
            getProtocolType(fileUri) !== null
              ? fileUri
              : createFileUri(fileUri),
          );

          // Find all symbols with the member name
          const allSymbolsWithName = this.findSymbolByName(member);

          // Filter to symbols that are members of the containing class
          // A member is in the class if:
          // 1. It has the class as parent (parentId matches), OR
          // 2. It's in the same file and within the class's location range
          const classMembers = allSymbolsWithName.filter((s) => {
            // Check if parentId matches (most reliable)
            if (s.parentId === containingClass?.id) {
              return true;
            }
            // Fallback: Check if symbol is within class location bounds in same file
            if (
              s.fileUri === normalizedUri &&
              containingClass?.location &&
              s.location
            ) {
              const classStart =
                containingClass?.location.symbolRange.startLine;
              const classEnd = containingClass?.location.symbolRange.endLine;
              const symbolStart = s.location.symbolRange.startLine;
              const symbolEnd = s.location.symbolRange.endLine;
              // Symbol is within class if it starts after class starts and ends before class ends
              return symbolStart >= classStart && symbolEnd <= classEnd;
            }
            return false;
          });

          // Return the first matching class member
          if (classMembers.length > 0) {
            return classMembers[0];
          }
        }

        // Fallback: Look for the member by name (might be in a different file or scope)
        const symbols = this.findSymbolByName(member);
        if (symbols.length > 0) {
          // If fileUri is provided, prefer same-file symbols
          if (fileUri) {
            const normalizedUri = extractFilePathFromUri(
              getProtocolType(fileUri) !== null
                ? fileUri
                : createFileUri(fileUri),
            );
            const sameFileSymbol = symbols.find(
              (s) => s.fileUri === normalizedUri,
            );
            if (sameFileSymbol) {
              return sameFileSymbol;
            }
          }
          // Return first match if no same-file symbol found
          return symbols[0];
        }
        return null;
      }

      // Step 1: Find the qualifier symbol
      let qualifierSymbols = this.findSymbolByName(qualifier);

      // If no user-defined qualifier found, try built-in types
      if (qualifierSymbols.length === 0) {
        // Extract qualifier node from chain if available
        let qualifierRef: SymbolReference;
        if (
          originalTypeRef &&
          isChainedSymbolReference(originalTypeRef) &&
          originalTypeRef.chainNodes.length >= 2
        ) {
          // Use the qualifier node from the chain
          qualifierRef = originalTypeRef.chainNodes[0];
        } else {
          // Create a minimal SymbolReference for the qualifier string
          qualifierRef = {
            name: qualifier,
            context: ReferenceContext.NAMESPACE,
            location: originalTypeRef?.location || {
              symbolRange: {
                startLine: 0,
                startColumn: 0,
                endLine: 0,
                endColumn: 0,
              },
              identifierRange: {
                startLine: 0,
                startColumn: 0,
                endLine: 0,
                endColumn: 0,
              },
            },
            isResolved: false,
          };
        }
        const builtInQualifier = await this.resolveBuiltInType(qualifierRef);
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
   * Extract qualifier and member information from a SymbolReference
   * Handles both chained references (using chainNodes) and simple dot-notation references
   * @param typeRef The type reference
   * @returns Object with qualifier and member information, or null if not qualified
   */
  private extractQualifierFromChain(typeRef: SymbolReference): {
    qualifier: string;
    member: string;
    isQualified: boolean;
  } | null {
    // Check if this is a chained expression reference
    if (isChainedSymbolReference(typeRef)) {
      const chainNodes = typeRef.chainNodes;

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
  private async isStaticReference(typeRef: SymbolReference): Promise<boolean> {
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
      // Extract qualifier node from chain if available
      let qualifierRef: SymbolReference;
      if (isChainedSymbolReference(typeRef) && typeRef.chainNodes.length >= 2) {
        // Use the qualifier node from the chain
        qualifierRef = typeRef.chainNodes[0];
      } else {
        // Create a minimal SymbolReference for the qualifier string
        qualifierRef = {
          name: qualifierInfo.qualifier,
          context: ReferenceContext.NAMESPACE,
          location: typeRef.location,
          isResolved: false,
        };
      }
      const builtInQualifier = await this.resolveBuiltInType(qualifierRef);
      if (builtInQualifier) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all SymbolReference data for a file
   * @param fileUri The file path to get references for
   * @returns Array of all SymbolReference objects in the file
   */
  getAllReferencesInFile(fileUri: string): SymbolReference[] {
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
   * Resolve an unqualified type reference using scope-based resolution
   * @param typeReference The SymbolReference to resolve
   * @param sourceFile The file containing the reference
   * @param position The position in the file (1-based line, 0-based column)
   * @returns The resolved symbol or null if not found
   */
  private resolveUnqualifiedReferenceByScope(
    typeReference: SymbolReference,
    sourceFile: string,
    position: { line: number; character: number },
  ): ApexSymbol | null {
    try {
      const symbolTable = this.symbolGraph.getSymbolTableForFile(sourceFile);
      if (!symbolTable) {
        return null;
      }

      // Use scope-based resolution to find the correct symbol in scope
      const scopeHierarchy = symbolTable.getScopeHierarchy(position);
      const allFileSymbols = symbolTable.getAllSymbols();

      // Search from innermost (most specific) to outermost scope
      const innermostToOutermost = [...scopeHierarchy].reverse();
      for (const blockSymbol of innermostToOutermost) {
        // Find symbols in this block scope (direct children only)
        // For local symbol search, we want variables/parameters/methods in the current scope
        // The scope hierarchy already ensures we only search relevant blocks
        // But don't search for variables in class-level blocks - those are fields, not variables
        const isClassOrFileLevel =
          isBlockSymbol(blockSymbol) &&
          (blockSymbol.scopeType === 'class' ||
            blockSymbol.scopeType === 'file');
        const directChildren = allFileSymbols.filter(
          (symbol) =>
            symbol.name === typeReference.name &&
            symbol.parentId === blockSymbol.id &&
            // Look for variables, parameters, and methods in the current scope
            // But skip variables in class/file level blocks (those are fields, searched later)
            (((symbol.kind === SymbolKind.Variable ||
              symbol.kind === SymbolKind.Parameter) &&
              !isClassOrFileLevel) ||
              symbol.kind === SymbolKind.Method),
        );

        // Also search nested blocks, but only if they're in the scope hierarchy
        // (i.e., blocks that are ancestors/descendants of the current position)
        // This prevents searching unrelated sibling blocks (like method1 when we're in method3)
        // Only search for blocks that are actually in the scope hierarchy (already filtered by getScopeHierarchy)
        // AND are descendants of the current block
        // (not just children - we need to ensure they're in the hierarchy chain)
        const nestedBlocks = allFileSymbols.filter((s) => {
          if (s.kind !== SymbolKind.Block || s.parentId !== blockSymbol.id) {
            return false;
          }
          // Only include blocks that are in the scope hierarchy
          // This ensures we don't search sibling blocks (e.g., method1 when we're in method3)
          return scopeHierarchy.some(
            (hierarchyBlock) => hierarchyBlock.id === s.id,
          );
        });
        const symbolsInNestedBlocks: ApexSymbol[] = [];
        for (const nestedBlock of nestedBlocks) {
          // Only search for variables/parameters/methods in blocks that are actually nested
          // within the current block AND in the scope hierarchy
          // The scope hierarchy already ensures we only search relevant blocks
          // Double-check that the nested block is actually in the hierarchy
          const isInHierarchy = scopeHierarchy.some(
            (hierarchyBlock) => hierarchyBlock.id === nestedBlock.id,
          );
          if (!isInHierarchy) {
            continue;
          }
          const nestedSymbols = allFileSymbols.filter(
            (symbol) =>
              symbol.name === typeReference.name &&
              symbol.parentId === nestedBlock.id &&
              // Look for variables, parameters, and methods in nested blocks
              (symbol.kind === SymbolKind.Variable ||
                symbol.kind === SymbolKind.Parameter ||
                symbol.kind === SymbolKind.Method),
          );
          symbolsInNestedBlocks.push(...nestedSymbols);
        }

        // Combine direct children and nested symbols
        const symbolsInScope = [...directChildren, ...symbolsInNestedBlocks];

        if (symbolsInScope.length > 0) {
          // Found a symbol in this scope - prioritize variables/parameters over methods/fields
          // But verify that variables/parameters are in blocks that actually contain the position
          const validSymbols = symbolsInScope.filter((symbol) => {
            // For variables and parameters, verify they're in a block that contains the position
            if (
              symbol.kind === SymbolKind.Variable ||
              symbol.kind === SymbolKind.Parameter
            ) {
              // Find the block that contains this symbol
              const symbolBlock = allFileSymbols.find(
                (s) => s.kind === SymbolKind.Block && s.id === symbol.parentId,
              );
              if (symbolBlock && isBlockSymbol(symbolBlock)) {
                // Verify this block is in the scope hierarchy (contains the position)
                return scopeHierarchy.some(
                  (hierarchyBlock) => hierarchyBlock.id === symbolBlock.id,
                );
              }
              return false;
            }
            // Methods are always valid if found in scope
            return true;
          });

          if (validSymbols.length > 0) {
            const prioritized = validSymbols.sort((a, b) => {
              const aIsVar =
                a.kind === SymbolKind.Variable ||
                a.kind === SymbolKind.Parameter;
              const bIsVar =
                b.kind === SymbolKind.Variable ||
                b.kind === SymbolKind.Parameter;
              if (aIsVar && !bIsVar) return -1;
              if (!aIsVar && bIsVar) return 1;
              return 0;
            });
            return prioritized[0];
          }
        }
      }

      // If not found in any block scope, search for symbols in parent scopes
      // This includes class fields, method parameters, etc.
      // Search from innermost to outermost to find the closest parent symbol
      // Reverse the hierarchy to go from innermost (method) to outermost (class/file)
      const parentScopeSearchOrder = [...scopeHierarchy].reverse();
      for (const blockSymbol of parentScopeSearchOrder) {
        // Ensure blockSymbol is actually a block symbol with scopeType
        if (!isBlockSymbol(blockSymbol)) {
          continue;
        }

        // Skip method blocks when searching for class-level fields
        // We only want to search class/file level blocks for fields
        const isClassOrFileLevel =
          blockSymbol.scopeType === 'class' || blockSymbol.scopeType === 'file';
        const isMethodLevel = blockSymbol.scopeType === 'method';

        // At class/file level, look for fields and methods
        if (isClassOrFileLevel) {
          // First try fields
          const classFields = allFileSymbols.filter(
            (s) =>
              s.name === typeReference.name &&
              s.parentId === blockSymbol.id &&
              s.kind === SymbolKind.Field,
          );
          if (classFields.length > 0) {
            return classFields[0];
          }
          // Then try methods
          const classMethods = allFileSymbols.filter(
            (s) =>
              s.name === typeReference.name &&
              s.parentId === blockSymbol.id &&
              s.kind === SymbolKind.Method,
          );
          if (classMethods.length > 0) {
            return classMethods[0];
          }
        }

        // At method level, look for parameters (not local variables - those were already searched)
        if (isMethodLevel) {
          const parameters = allFileSymbols.filter(
            (s) =>
              s.name === typeReference.name &&
              s.parentId === blockSymbol.id &&
              s.kind === SymbolKind.Parameter,
          );
          if (parameters.length > 0) {
            return parameters[0];
          }
        }
      }

      // If class block wasn't in the hierarchy (because getScopeHierarchy only follows blocks),
      // we need to find it by traversing up through method symbols
      // Method blocks -> method symbols -> class block (method symbol's parentId points to class block)
      for (const blockSymbol of parentScopeSearchOrder) {
        if (!isBlockSymbol(blockSymbol)) {
          continue;
        }
        // If this is a method block, find its parent method symbol, then use that to find the class block
        if (blockSymbol.scopeType === 'method' && blockSymbol.parentId) {
          const methodSymbol = allFileSymbols.find(
            (s) => s.id === blockSymbol.parentId,
          );
          if (methodSymbol && methodSymbol.parentId) {
            // Method symbol's parentId points to the class block
            // Check if it's actually a class block
            const classBlock = allFileSymbols.find(
              (s) =>
                isBlockSymbol(s) &&
                s.scopeType === 'class' &&
                s.id === methodSymbol.parentId,
            );
            if (classBlock) {
              // Look for fields in the class block
              const classFields = allFileSymbols.filter(
                (s) =>
                  s.name === typeReference.name &&
                  s.parentId === classBlock.id &&
                  s.kind === SymbolKind.Field,
              );
              if (classFields.length > 0) {
                return classFields[0];
              }
              // Also look for methods in the class block
              const classMethods = allFileSymbols.filter(
                (s) =>
                  s.name === typeReference.name &&
                  s.parentId === classBlock.id &&
                  s.kind === SymbolKind.Method,
              );
              if (classMethods.length > 0) {
                return classMethods[0];
              }
            }
          }
        }
      }
      // If we've searched all scopes (both local variables and parent scopes) and didn't find anything,
      // return null to prevent falling through to name-based resolution which would incorrectly
      // pick the first symbol with that name (e.g., method1's variable instead of class field)
      // This ensures that scope-based resolution is authoritative for same-file symbol resolution
      return null;
    } catch (_error) {
      // If scope-based resolution fails, return null to allow fallback
      return null;
    }
  }

  /**
   * Resolve a SymbolReference to its target symbol
   * @param typeReference The SymbolReference to resolve
   * @param sourceFile The file containing the reference
   * @param position The position in the file (optional, for chain member detection)
   * @returns The resolved symbol or null if not found
   */
  private async resolveSymbolReferenceToSymbol(
    typeReference: SymbolReference,
    sourceFile: string,
    position?: { line: number; character: number },
  ): Promise<ApexSymbol | null> {
    try {
      // Step 0: Handle chained expression references
      if (isChainedSymbolReference(typeReference)) {
        return this.resolveChainedSymbolReference(typeReference, position);
      }

      // Step 1: Try qualified reference resolution using chainNodes
      const qualifierInfo = this.extractQualifierFromChain(typeReference);
      if (qualifierInfo && qualifierInfo.isQualified) {
        const qualifiedSymbol = await this.resolveQualifiedReferenceFromChain(
          qualifierInfo.qualifier,
          qualifierInfo.member,
          typeReference.context,
          sourceFile,
          undefined,
          typeReference,
        );

        if (qualifiedSymbol) {
          return qualifiedSymbol;
        }
      }

      // Step 2: Try built-in type resolution for the name itself
      const builtInSymbol = await this.resolveBuiltInType(typeReference);
      if (builtInSymbol) {
        this.logger.debug(
          () =>
            `Resolved built-in type "${typeReference.name}" to symbol: ${builtInSymbol.name}`,
        );
        return builtInSymbol;
      } else {
        // Diagnostic: Log when built-in type resolution fails
        this.logger.debug(
          () =>
            `Built-in type resolution failed for "${typeReference.name}" in ${sourceFile}`,
        );
      }

      // Step 2b: Try standard Apex class resolution
      // This must happen BEFORE keyword short-circuit because some keywords
      // (System, Database) are also valid standard Apex classes
      const standardClass = await this.resolveStandardApexClass(
        typeReference.name,
      );
      if (standardClass) {
        this.logger.debug(
          () =>
            `Resolved standard Apex class "${typeReference.name}" to symbol: ${standardClass.name}`,
        );
        return standardClass;
      }

      // Step 2c: Check if it's a standard namespace (e.g., System, Database)
      // Standard namespaces can be used as qualifiers in chained expressions
      const isStandardNamespace =
        this.resourceLoader &&
        this.resourceLoader.isStdApexNamespace(typeReference.name);
      if (isStandardNamespace) {
        // For a standalone namespace reference, we can't resolve it to a symbol
        // but we shouldn't short-circuit it either - let it continue to scope resolution
        // This allows chained expressions like System.Url to work
      }

      // Step 3: Continue resolution - if SymbolReference exists, it's an identifier
      // Keyword filtering already happened during parsing (in enterIdPrimary/enterAnyId)
      // If a SymbolReference was created, it means the parser determined it's being used
      // as an identifier (from id/anyId context), not as a keyword (accessLevel context)

      // Step 3: For unqualified references with position, use scope-based resolution
      if (position) {
        const scopeResolvedSymbol = this.resolveUnqualifiedReferenceByScope(
          typeReference,
          sourceFile,
          position,
        );
        if (scopeResolvedSymbol !== null) {
          return scopeResolvedSymbol;
        }
      }

      // Step 4: Try to find symbols by name (fallback when no position or scope resolution fails)
      const candidates = this.findSymbolByName(typeReference.name);

      if (candidates.length === 0) {
        return null;
      }

      // Step 5: For unqualified references, try same-file resolution first
      const sameFileCandidates = candidates.filter(
        (symbol) => symbol.key.path[0] === sourceFile,
      );

      if (sameFileCandidates.length > 0) {
        return this.selectMostSpecificSymbol(sameFileCandidates, sourceFile);
      }

      // Step 6: Fallback to any accessible symbol
      const accessibleCandidates = candidates.filter((symbol) =>
        this.isSymbolAccessibleFromFile(symbol, sourceFile),
      );

      if (accessibleCandidates.length > 0) {
        return this.selectMostSpecificSymbol(accessibleCandidates, sourceFile);
      }

      // Step 7: Last resort - return the first candidate
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
  /**
   * Validate that a type reference name is valid for resolution
   *
   * The parser/listener extracts identifiers from parser nodes (id()?.text, typeName(), etc.),
   * which are already validated by the ANTLR lexer/parser. The parser cannot produce invalid
   * identifiers - if it did, the parse would fail. This check only ensures we have a non-empty
   * name before attempting resolution.
   */
  private isValidSymbolReferenceName(name: string): boolean {
    // Basic null/empty check - the parser guarantees valid identifier characters
    return !!(name && name.length > 0);
  }

  private async resolveBuiltInType(
    typeRef: SymbolReference,
  ): Promise<ApexSymbol | null> {
    const name = typeRef.name;

    if (!this.isValidSymbolReferenceName(name)) {
      return null;
    }

    try {
      // Check if this is a ChainedSymbolReference with chain nodes
      if (isChainedSymbolReference(typeRef)) {
        const chainNodes = typeRef.chainNodes;

        // For qualified names like "System.Url" (2 nodes)
        if (chainNodes.length === 2) {
          const qualifierNode = chainNodes[0]; // System
          const memberNode = chainNodes[1]; // Url

          // Resolve qualifier as built-in type (recursive call with qualifier node)
          const qualifierSymbol = await this.resolveBuiltInType(qualifierNode);
          if (qualifierSymbol) {
            // Resolve member within qualifier namespace/class
            const fqn = `${qualifierNode.name}.${memberNode.name}`;
            const memberSymbol = await this.resolveStandardApexClass(fqn);
            if (memberSymbol) {
              this.logger.debug(
                () =>
                  `Resolved "${name}" via chain nodes as ${fqn}: ${memberSymbol.name}`,
              );
              return memberSymbol;
            }
          }
          // If chain resolution fails, fall through to string-based resolution
        }
        // For chains with more than 2 nodes, fall through to string-based resolution
      }

      // Step 1: Try to resolve as a built-in type via ResourceLoader first
      // Built-in types (wrapper types and collection types) are in StandardApexLibrary/System/
      // and are treated exactly like other StandardApexLibrary classes
      if (this.resourceLoader) {
        // Try to resolve as System.{TypeName} (ResourceLoader will check StandardApexLibrary/System/)
        const fqn = `System.${name}`;
        const standardClass = await this.resolveStandardApexClass(fqn);

        if (standardClass) {
          this.logger.debug(
            () =>
              `Resolved "${name}" via ResourceLoader as System.${name}: ${standardClass.name}`,
          );
          return standardClass;
        } else {
          // Diagnostic: Log when ResourceLoader resolution fails
          this.logger.debug(
            () =>
              `ResourceLoader resolution failed for "${name}" (tried System.${name})`,
          );
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

      // Step 3: Check other built-in types (scalar, collection, etc.)
      const builtInType = this.builtInTypeTables.findType(name.toLowerCase());
      if (builtInType) {
        return {
          ...builtInType,
          modifiers: {
            ...builtInType.modifiers,
            isBuiltIn: true,
          },
        };
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
   * Evolve the context of a SymbolReference after successful resolution
   * @param step The SymbolReference to evolve
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
      if (symbol.kind === SymbolKind.Class) {
        const typeSymbol = symbol as TypeSymbol;
        // Use TypeSymbol.superClass directly
        if (typeSymbol.superClass) {
          inheritanceChain.push(typeSymbol.superClass);
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
      if (symbol.kind === SymbolKind.Class) {
        const typeSymbol = symbol as TypeSymbol;
        // Use TypeSymbol.interfaces directly
        if (typeSymbol.interfaces && typeSymbol.interfaces.length > 0) {
          implementations.push(...typeSymbol.interfaces);
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
    let current = this.symbolGraph.getParent(symbol);
    while (current) {
      if (
        current.kind === SymbolKind.Class ||
        current.kind === SymbolKind.Interface ||
        current.kind === SymbolKind.Enum
      ) {
        return current;
      }
      current = this.symbolGraph.getParent(current);
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

      let namespace: string;
      let className: string;

      if (parts.length < 2) {
        // Handle single names like "System" - treat as both namespace and class
        // This is needed for standard Apex classes where namespace and class have the same name
        namespace = parts[0];
        className = parts[0];
      } else {
        // Handle fully qualified names like "System.assert"
        namespace = parts[0];
        className = parts[1];
      }

      // Check if the class exists in ResourceLoader (case-insensitive)
      // Always try to find the correct case from the namespace structure
      let classPath = `${namespace}/${className}.cls`;

      // Try to find the correct case from the namespace structure
      const namespaceStructure = this.resourceLoader.getStandardNamespaces();
      // Try case-sensitive lookup first
      let classes = namespaceStructure.get(namespace);
      // If not found, try case-insensitive lookup
      if (!classes) {
        for (const [nsKey, nsClasses] of namespaceStructure.entries()) {
          if (nsKey.toLowerCase() === namespace.toLowerCase()) {
            classes = nsClasses;
            // Update namespace to match the actual case from the structure
            namespace = nsKey;
            break;
          }
        }
      }

      if (classes) {
        const target = className.toLowerCase();

        for (const classFile of classes) {
          const cleanClassName = classFile.replace(/\.cls$/, '');

          if (cleanClassName.toLowerCase() === target) {
            classPath = `${namespace}/${cleanClassName}.cls`;
            this.logger.debug(
              () =>
                `Found class in namespace structure: ${classPath} (searched for ${name})`,
            );
            break;
          }
        }
      } else {
        // Diagnostic: Log when namespace not found
        this.logger.debug(
          () =>
            `Namespace "${namespace}" not found in ResourceLoader namespace structure`,
        );
      }

      // Verify the class exists with the correct case
      // For lazy loading, hasClass might return false even if the class exists
      // So if it's a standard namespace, try loading anyway
      const isStandardNamespace =
        this.resourceLoader.isStdApexNamespace(namespace);
      const hasClass = this.resourceLoader.hasClass(classPath);

      // If class not found and it's not a standard namespace, return null
      // For standard namespaces, we'll try loading even if hasClass returns false
      if (!hasClass && !isStandardNamespace) {
        // Diagnostic: Log when class path not found
        this.logger.debug(
          () =>
            `Class not found in ResourceLoader: ${classPath} (searched for ${name})`,
        );
        return null;
      }

      // For standard namespaces, if hasClass returns false, try to construct the path
      // from the namespace structure or use the default path
      if (!hasClass && isStandardNamespace) {
        this.logger.debug(
          () =>
            `Standard namespace "${namespace}" - trying to load ${classPath} even though hasClass returned false`,
        );
      }

      // Use async loading to prevent hanging
      // Prevent recursive loops - if we're already loading this file, skip
      const fileUri = `${STANDARD_APEX_LIBRARY_URI}/${classPath}`;
      if (this.loadingSymbolTables.has(fileUri)) {
        this.logger.debug(
          () =>
            `Skipping recursive load attempt for ${fileUri} - already loading`,
        );
        return null;
      }

      try {
        // Mark as loading to prevent recursive calls
        this.loadingSymbolTables.add(fileUri);

        const artifact =
          await this.resourceLoader.loadAndCompileClass(classPath);
        if (!artifact) {
          this.logger.debug(
            () =>
              `Failed to load artifact for ${classPath} (searched for ${name})`,
          );
          return null;
        }
        if (artifact?.compilationResult?.result) {
          // Add the symbol table to the symbol manager to get all symbols including methods
          await this.addSymbolTable(artifact.compilationResult.result, fileUri);

          // Find the class symbol from the loaded symbol table
          const symbols = artifact.compilationResult.result.getAllSymbols();
          // Try to find by name first
          let classSymbol = symbols.find(
            (s) => s.name === className && s.kind === SymbolKind.Class,
          );

          // If not found by name, try to find the first class symbol (for cases where name might be empty)
          // This can happen with generic types like List<T> where the parser might not extract the name correctly
          if (!classSymbol) {
            classSymbol = symbols.find((s) => s.kind === SymbolKind.Class);
            // If we found a class symbol but it has an empty name, set it from the className we're looking for
            if (classSymbol && !classSymbol.name) {
              classSymbol.name = className;
            }
          }

          if (classSymbol) {
            // Update the class symbol's fileUri to use the new URI scheme
            classSymbol.fileUri = fileUri;
            // Ensure the name is set correctly
            if (!classSymbol.name || classSymbol.name === '') {
              classSymbol.name = className;
            }
            return classSymbol;
          }

          // If still not found in the loaded symbol table, try finding it from the symbol graph
          // This handles cases where the symbol was added but might not be immediately available
          // in the loaded symbol table's getAllSymbols() result
          const graphSymbols = this.findSymbolByName(className);
          const graphClassSymbols = graphSymbols.filter(
            (s) =>
              s.kind === SymbolKind.Class &&
              (s.fileUri === fileUri ||
                s.fileUri?.includes('StandardApexLibrary') ||
                s.fileUri?.includes('apexlib://')),
          );
          if (graphClassSymbols.length > 0) {
            // Prefer symbols from the file we just loaded
            const fileSymbol = graphClassSymbols.find(
              (s) => s.fileUri === fileUri,
            );
            if (fileSymbol) {
              this.logger.debug(
                () =>
                  `Found class "${className}" from symbol graph after loading: ${fileSymbol.name}`,
              );
              return fileSymbol;
            }
            // Fallback to any standard Apex library symbol
            const standardSymbol = graphClassSymbols.find(
              (s) =>
                s.fileUri?.includes('apexlib://') ||
                s.fileUri?.includes('StandardApexLibrary'),
            );
            if (standardSymbol) {
              this.logger.debug(
                () =>
                  `Found class "${className}" from symbol graph (standard): ${standardSymbol.name}`,
              );
              return standardSymbol;
            }
            return graphClassSymbols[0];
          }
        } else {
          this.logger.debug(
            () =>
              `Compilation result is null for ${classPath} (searched for ${name})`,
          );
        }
        return null;
      } catch (_error) {
        return null;
      } finally {
        // Always remove from loading set, even on error
        this.loadingSymbolTables.delete(fileUri);
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
    typeRef: SymbolReference,
    fileUri: string,
  ): ApexSymbol | null {
    // Normalize URI to match how symbols are stored in the graph
    // This ensures consistency with addSymbolTable which uses normalized URIs
    const properUri =
      getProtocolType(fileUri) !== null ? fileUri : createFileUri(fileUri);
    const normalizedUri = extractFilePathFromUri(properUri);

    // Invalidate cache to ensure we get fresh symbols (they were just added)
    this.unifiedCache.invalidatePattern(`file_symbols_${normalizedUri}`);

    // Find symbols in the file and determine which one contains this reference
    const symbolsInFile = this.findSymbolsInFile(normalizedUri);

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

    // Fallback: If no containing symbol found, use the file-level class/interface/enum/trigger
    // This ensures references are still processed even if position matching fails
    if (!bestMatch && symbolsInFile.length > 0) {
      // Find the top-level type symbol (class, interface, enum, trigger)
      const topLevelSymbol = symbolsInFile.find(
        (s) =>
          s.kind === SymbolKind.Class ||
          s.kind === SymbolKind.Interface ||
          s.kind === SymbolKind.Enum ||
          s.kind === SymbolKind.Trigger,
      );
      if (topLevelSymbol) {
        return topLevelSymbol;
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
      // Step 1: Try to find SymbolReferences at the exact position
      const typeReferences = this.getReferencesAtPosition(fileUri, position);

      if (typeReferences.length > 0) {
        // Step 2: For chained references, find the most specific reference for this position
        // If position is on a specific chain member, prefer references that match that member
        let referenceToResolve = typeReferences[0];

        // Prioritize chained references when position matches a chain member
        // This ensures we resolve the correct part of the chain (e.g., "System" in "System.Url")
        const chainedRefs = typeReferences.filter((ref) =>
          this.isChainedSymbolReference(ref),
        );

        // Always prefer chained references over non-chained references when available
        if (chainedRefs.length > 0) {
          // Check each chained reference to find the one that matches the position
          for (const ref of chainedRefs) {
            const chainNodes = (ref as ChainedSymbolReference).chainNodes;
            if (!chainNodes || chainNodes.length === 0) {
              continue;
            }

            // Check if position is at the start of the chained reference
            const chainedRefStart = ref.location.identifierRange;
            const isAtStartOfChainedRef =
              position.line === chainedRefStart.startLine &&
              position.character === chainedRefStart.startColumn;

            if (isAtStartOfChainedRef) {
              // Position is exactly at the start of the chained reference
              // This means we're on the first node - select this chained reference
              referenceToResolve = ref;
              break;
            }

            // First check if position matches a specific chain member
            const chainMember = this.findChainMemberAtPosition(
              ref as ChainedSymbolReference,
              position,
            );
            if (chainMember) {
              // Found a chained reference with a specific member at this position
              referenceToResolve = ref;
              break;
            }

            // If position is within the first node's range (but not at the start)
            const firstNode = chainNodes[0];
            const firstNodeStart = firstNode.location.identifierRange;
            // Check if position is within the first node's range
            if (
              position.line >= firstNodeStart.startLine &&
              position.line <= firstNodeStart.endLine &&
              position.character >= firstNodeStart.startColumn &&
              position.character <= firstNodeStart.endColumn
            ) {
              // Position is within the first node - resolve just that node
              referenceToResolve = ref;
              break;
            }
          }
          // If we found a chained reference, use it even if we didn't find a specific member
          // This ensures chained references are prioritized over non-chained references
          if (
            chainedRefs.length > 0 &&
            referenceToResolve === typeReferences[0] &&
            !this.isChainedSymbolReference(referenceToResolve)
          ) {
            referenceToResolve = chainedRefs[0];
          }
        }

        // Step 3: Try to resolve the most specific reference
        // Keyword check happens inside resolveSymbolReferenceToSymbol
        // after built-in type resolution (some keywords are built-in types)
        const resolvedSymbol = await this.resolveSymbolReferenceToSymbol(
          referenceToResolve,
          fileUri,
          position,
        );
        if (resolvedSymbol) {
          return resolvedSymbol;
        }

        // If we have a chained reference but resolution failed, don't fall back to direct symbol lookup
        // Chained references should be resolved through the chain, not through direct symbol matching
        // However, only skip fallback if we actually tried to resolve a chained reference
        const wasChainedRef = this.isChainedSymbolReference(referenceToResolve);
        if (wasChainedRef) {
          this.logger.debug(
            () =>
              `Chained reference "${referenceToResolve.name}" found at ` +
              `${fileUri}:${position.line}:${position.character} ` +
              'but resolution returned null - not falling back to direct symbol lookup',
          );
          return null;
        }

        // Diagnostic: Log when type reference exists but resolution fails
        this.logger.debug(
          () =>
            `SymbolReference found for "${typeReferences[0].name}" at ` +
            `${fileUri}:${position.line}:${position.character} ` +
            'but resolution returned null',
        );
      } else {
        // Diagnostic: Log when no type references found
        this.logger.debug(
          () =>
            `No SymbolReferences found at ${fileUri}:${position.line}:${position.character}`,
        );
      }

      // Step 2: Look for symbols that start exactly at this position
      // Only do this if we don't have a chained reference (chained references should be resolved through the chain)
      // Check if we had any chained references at this position - if so, skip fallback
      const hadChainedRefs =
        typeReferences.length > 0 &&
        typeReferences.some((ref) => this.isChainedSymbolReference(ref));

      if (hadChainedRefs) {
        // We had chained references but resolution failed - don't fall back to direct symbol lookup
        return null;
      }

      const symbols = this.findSymbolsInFile(fileUri);

      const exactMatchSymbols = symbols.filter((symbol) => {
        // Exclude scope symbols from resolution results (they're structural, not semantic)
        if (isBlockSymbol(symbol)) {
          return false;
        }

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
   * Check if a SymbolReference is a chained expression reference
   */
  private isChainedSymbolReference(typeReference: SymbolReference): boolean {
    // Check if this is a ChainedSymbolReference by looking for the chainNodes property
    return isChainedSymbolReference(typeReference);
  }

  /**
   * Resolve an entire chain of nodes and return an array of resolved contexts
   * @param chainNodes Array of SymbolReference nodes representing the chain
   * @returns Array of ChainResolutionContext objects, or null if resolution fails
   */
  private async resolveEntireChain(
    chainNodes: SymbolReference[],
  ): Promise<ChainResolutionContext[] | null> {
    if (!chainNodes?.length) {
      return null;
    }

    // Find all possible resolution paths
    const resolutionPaths =
      await this.findAllPossibleResolutionPaths(chainNodes);

    if (resolutionPaths.length === 0) {
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
    chainNodes: SymbolReference[],
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
    chainNodes: SymbolReference[],
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
    step: SymbolReference,
    currentContext: ChainResolutionContext,
    nextStep?: SymbolReference,
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
    const builtInSymbol = await this.resolveBuiltInType(step);
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
    step: SymbolReference,
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
    step: SymbolReference,
    currentContext: ChainResolutionContext,
    nextStep?: SymbolReference,
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
    chainNodes: SymbolReference[],
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
    chainNodes: SymbolReference[],
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
    nextStep: SymbolReference,
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
  public async resolveChainedSymbolReference(
    typeReference: SymbolReference,
    position?: { line: number; character: number },
  ): Promise<ApexSymbol | null> {
    if (isChainedSymbolReference(typeReference)) {
      let resolvedContext: ChainResolutionContext | null = null;
      try {
        const chainNodes = typeReference.chainNodes;

        if (!chainNodes?.length) {
          this.logger.warn(
            () => 'Chained expression reference missing chainNodes property',
          );
          return null;
        }

        // Resolve the entire chain
        const resolvedChain = await this.resolveEntireChain(chainNodes);
        if (!resolvedChain) {
          return null;
        }

        // If position is provided, find the specific chain member and return its resolved symbol
        if (position) {
          const firstNode = chainNodes[0];

          // Check if position is on the first node (at start, within, or at chained ref start)
          if (this.isPositionOnFirstNode(typeReference, firstNode, position)) {
            const firstNodeSymbol = await this.resolveFirstNodeAsClass(
              firstNode.name,
              true,
            );
            if (firstNodeSymbol) {
              return firstNodeSymbol;
            }
            // If first node resolution failed, fall through to chain member resolution
          }

          // Find the chain member at the position
          const chainMember = this.findChainMemberAtPosition(
            typeReference,
            position,
          );

          if (chainMember) {
            // If position is on the first node, try resolving it as a class
            if (chainMember.index === 0) {
              const firstNodeSymbol = await this.resolveFirstNodeAsClass(
                chainNodes[0].name,
                false, // Don't retry here since we already tried above
              );
              if (firstNodeSymbol) {
                return firstNodeSymbol;
              }
            }

            // Resolve the chain member from the resolved chain context
            resolvedContext = resolvedChain[chainMember.index];
            if (resolvedContext?.type === 'symbol') {
              return resolvedContext.symbol || null;
            }

            // If the resolved context is not a symbol (e.g., namespace or global), and we're on the first node,
            // try to resolve the qualifier as a class symbol
            if (
              chainMember.index === 0 &&
              resolvedContext &&
              (resolvedContext.type === 'namespace' ||
                resolvedContext.type === 'global')
            ) {
              const qualifierName = chainNodes[0].name;
              const qualifierSymbols = this.findSymbolByName(qualifierName);

              // Filter for class symbols
              const classSymbols = qualifierSymbols.filter(
                (s) =>
                  s.kind === SymbolKind.Class ||
                  s.kind === SymbolKind.Interface,
              );

              if (classSymbols.length > 0) {
                // Prefer standard Apex classes for qualified references
                const standardClass = classSymbols.find(
                  (s) =>
                    s.fileUri?.includes('apexlib://') ||
                    s.fileUri?.includes('StandardApexLibrary'),
                );
                return standardClass || classSymbols[0];
              }

              // If no class found, try standard Apex class resolution
              const standardClass =
                await this.resolveStandardApexClass(qualifierName);
              if (standardClass) {
                return standardClass;
              }
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
   * Resolve the first node of a chained reference as a class symbol
   * Uses multiple resolution strategies to find the appropriate class
   * @param firstNodeName The name of the first node in the chain
   * @param includeRetry Whether to include retry logic after async loading
   * @returns Resolved ApexSymbol or null if not found
   */
  private async resolveFirstNodeAsClass(
    firstNodeName: string,
    includeRetry: boolean = true,
  ): Promise<ApexSymbol | null> {
    // Try standard Apex class resolution first (for System, Database, etc.)
    // If it's a standard namespace, try both "Namespace" and "Namespace.Namespace"
    let standardClass = await this.resolveStandardApexClass(firstNodeName);
    if (
      !standardClass &&
      this.resourceLoader?.isStdApexNamespace(firstNodeName)
    ) {
      // Try resolving as "Namespace.Namespace" (e.g., "System.System")
      standardClass = await this.resolveStandardApexClass(
        `${firstNodeName}.${firstNodeName}`,
      );
    }
    if (standardClass) {
      this.logger.debug(
        () =>
          `Resolved first node "${firstNodeName}" as standard class: ${standardClass?.name}`,
      );
      return standardClass;
    }

    // Try built-in type resolution
    // Create a minimal SymbolReference from the string name
    // Since resolveBuiltInType only uses typeRef.name, we can use dummy ranges
    const dummyLocation: SymbolLocation = {
      symbolRange: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
      identifierRange: {
        startLine: 0,
        startColumn: 0,
        endLine: 0,
        endColumn: 0,
      },
    };
    const typeRef: SymbolReference = new EnhancedSymbolReference(
      firstNodeName,
      dummyLocation,
      ReferenceContext.CLASS_REFERENCE,
      false,
    );
    const builtInSymbol = await this.resolveBuiltInType(typeRef);
    if (builtInSymbol) {
      this.logger.debug(
        () =>
          `Resolved first node "${firstNodeName}" as built-in type: ${builtInSymbol.name}`,
      );
      return builtInSymbol;
    }

    // Try finding by name (prefer class symbols)
    const qualifierSymbols = this.findSymbolByName(firstNodeName);
    const classSymbols = qualifierSymbols.filter(
      (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
    );
    if (classSymbols.length > 0) {
      // Prefer standard Apex classes
      const standardClass = classSymbols.find(
        (s) =>
          s.fileUri?.includes('apexlib://') ||
          s.fileUri?.includes('StandardApexLibrary'),
      );
      if (standardClass) {
        this.logger.debug(
          () =>
            `Resolved first node "${firstNodeName}" from name lookup as standard class: ${standardClass.name}`,
        );
        return standardClass;
      }
      return classSymbols[0];
    }

    // If no class found but it's a standard namespace, try to resolve the namespace class
    // Some namespaces have a class with the same name (e.g., System.System)
    if (
      this.resourceLoader &&
      this.resourceLoader.isStdApexNamespace(firstNodeName)
    ) {
      // Try resolving as "Namespace.Namespace" (e.g., "System.System")
      const namespaceClass = await this.resolveStandardApexClass(
        `${firstNodeName}.${firstNodeName}`,
      );
      if (namespaceClass) {
        this.logger.debug(
          () =>
            `Resolved first node "${firstNodeName}" as namespace class: ${namespaceClass.name}`,
        );
        return namespaceClass;
      }

      // If namespace class resolution failed, try finding by name with namespace prefix
      const namespaceQualifierSymbols = this.findSymbolByName(
        `${firstNodeName}.${firstNodeName}`,
      );
      const namespaceClassSymbols = namespaceQualifierSymbols.filter(
        (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
      );
      if (namespaceClassSymbols.length > 0) {
        const standardClass = namespaceClassSymbols.find(
          (s) =>
            s.fileUri?.includes('apexlib://') ||
            s.fileUri?.includes('StandardApexLibrary'),
        );
        if (standardClass) {
          this.logger.debug(
            () =>
              `Resolved first node "${firstNodeName}" as namespace class from name lookup: ${standardClass.name}`,
          );
          return standardClass;
        }
        return namespaceClassSymbols[0];
      }
    }

    // If we couldn't resolve the first node, try one more time with findSymbolByName
    // after potential async loading. This handles cases where resolveStandardApexClass
    // triggered async loading but the symbol wasn't immediately available
    if (includeRetry) {
      const retrySymbols = this.findSymbolByName(firstNodeName);
      const retryClassSymbols = retrySymbols.filter(
        (s) => s.kind === SymbolKind.Class || s.kind === SymbolKind.Interface,
      );
      if (retryClassSymbols.length > 0) {
        const standardClass = retryClassSymbols.find(
          (s) =>
            s.fileUri?.includes('apexlib://') ||
            s.fileUri?.includes('StandardApexLibrary'),
        );
        if (standardClass) {
          this.logger.debug(
            () =>
              `Resolved first node "${firstNodeName}" from retry name lookup as standard class: ${standardClass.name}`,
          );
          return standardClass;
        }
        return retryClassSymbols[0];
      }
    }

    return null;
  }

  /**
   * Find the specific chain member at a given position within a chained expression
   */
  private findChainMemberAtPosition(
    chainedRef: ChainedSymbolReference,
    position: { line: number; character: number },
  ): { member: any; index: number } | null {
    if (!isChainedSymbolReference(chainedRef)) {
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
   * Check if a position is at the start of a chained reference
   */
  private isPositionAtStartOfChainedRef(
    typeReference: ChainedSymbolReference,
    position: { line: number; character: number },
  ): boolean {
    const chainedRefStart = typeReference.location.identifierRange;
    return (
      position.line === chainedRefStart.startLine &&
      position.character === chainedRefStart.startColumn
    );
  }

  /**
   * Check if a position is on the first node of a chained reference
   * This includes positions at the start, within, or at the start of the chained reference
   */
  private isPositionOnFirstNode(
    typeReference: ChainedSymbolReference,
    firstNode: SymbolReference,
    position: { line: number; character: number },
  ): boolean {
    const firstNodeStart = firstNode.location.identifierRange;
    const isAtStartOfFirstNode =
      position.line === firstNodeStart.startLine &&
      position.character === firstNodeStart.startColumn;
    const isWithinFirstNode = this.isPositionWithinLocation(
      firstNode.location,
      position,
    );
    const isAtStartOfChainedRef = this.isPositionAtStartOfChainedRef(
      typeReference,
      position,
    );

    return isAtStartOfFirstNode || isWithinFirstNode || isAtStartOfChainedRef;
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

        // If symbol table not found, try alternative URI formats before loading
        if (!symbolTable) {
          // Try with proper URI format if contextFile is not already a URI
          const properUri =
            getProtocolType(contextFile) !== null
              ? contextFile
              : createFileUri(contextFile);
          if (properUri !== contextFile) {
            symbolTable = this.symbolGraph.getSymbolTableForFile(properUri);
          }
        }

        // If this is a standard Apex class and we still don't have a symbol table, try to load it
        // BUT: Only if the symbol doesn't already exist in the graph (to prevent loops)
        // If the symbol exists, the symbol table should exist too - skip reload to prevent loops
        if (
          !symbolTable &&
          isStandardApexUri(contextFile) &&
          this.resourceLoader
        ) {
          // Check if symbol already exists in graph - if so, don't reload (prevents loops)
          const existingSymbols = this.symbolGraph.findSymbolByName(
            contextSymbol.name,
          );
          const symbolExists = existingSymbols.some(
            (s) => s.id === contextSymbol.id,
          );

          if (symbolExists) {
            // Symbol already exists in graph - symbol table should exist too
            // This might be a URI format mismatch, but we shouldn't reload
            // Try one more time with normalized URI
            const normalizedUri = extractFilePathFromUri(
              getProtocolType(contextFile) !== null
                ? contextFile
                : createFileUri(contextFile),
            );
            symbolTable = this.symbolGraph.getSymbolTableForFile(normalizedUri);
            if (!symbolTable) {
              // Symbol exists but symbol table doesn't - this is unusual but don't reload
              this.logger.debug(
                () =>
                  `Symbol ${contextSymbol.name} exists in graph but symbol table not ` +
                  `found for ${contextFile} - skipping reload to prevent loop`,
              );
              return null;
            }
          } else {
            // Symbol doesn't exist - safe to load
            // Prevent recursive loops - if we're already loading this file, skip
            // Use normalized URI for the check to match what addSymbolTable uses
            const normalizedUri = extractFilePathFromUri(
              getProtocolType(contextFile) !== null
                ? contextFile
                : createFileUri(contextFile),
            );
            if (this.loadingSymbolTables.has(normalizedUri)) {
              this.logger.debug(
                () =>
                  `Skipping recursive load attempt for ${contextFile} (normalized: ${normalizedUri}) - already loading`,
              );
              // Re-check symbol table after a brief moment in case it was just added
              symbolTable = this.symbolGraph.getSymbolTableForFile(contextFile);
              if (!symbolTable) {
                return null;
              }
            } else {
              try {
                // Mark as loading to prevent recursive calls (use normalized URI)
                this.loadingSymbolTables.add(normalizedUri);

                // Extract the class path from the file path
                const classPath = extractApexLibPath(contextFile);

                const artifact =
                  await this.resourceLoader.loadAndCompileClass(classPath);
                if (artifact && artifact.compilationResult.result) {
                  symbolTable = artifact.compilationResult.result;

                  // Add the symbol table to our graph for future use
                  await this.addSymbolTable(symbolTable, contextFile);

                  // Re-fetch symbol table to ensure it's registered
                  symbolTable =
                    this.symbolGraph.getSymbolTableForFile(contextFile);
                }
              } catch (_error) {
                // Error loading, continue
              } finally {
                // Always remove from loading set, even on error
                this.loadingSymbolTables.delete(normalizedUri);
              }
            }
          }
        }

        if (symbolTable) {
          // If the context symbol is a class, find its class block and look for members there
          // This ensures we only find members that actually belong to the class
          if (
            contextSymbol.kind === SymbolKind.Class ||
            contextSymbol.kind === SymbolKind.Interface ||
            contextSymbol.kind === SymbolKind.Enum
          ) {
            // Find the class block (scope symbol with scopeType === 'class' and parentId === classSymbol.id)
            const allSymbols = symbolTable.getAllSymbols();
            const classBlock = allSymbols.find(
              (s) =>
                isBlockSymbol(s) &&
                s.scopeType === 'class' &&
                s.parentId === contextSymbol.id,
            );

            if (classBlock) {
              // Get all symbols in the class block scope
              const classMembers = symbolTable.getSymbolsInScope(classBlock.id);
              // Filter by name and kind, excluding block symbols
              const matchingMembers = classMembers.filter(
                (s) =>
                  !isBlockSymbol(s) &&
                  s.name === memberName &&
                  s.kind === memberType,
              );

              if (matchingMembers.length > 0) {
                return matchingMembers[0];
              }
            }
          }

          // Fallback: Look for members with the given name in the same file
          // (for non-class contexts or if class block lookup failed)
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
      // Create a minimal SymbolReference for the member name
      const memberRef: SymbolReference = {
        name: memberName,
        context: ReferenceContext.CLASS_REFERENCE,
        location: {
          symbolRange: {
            startLine: 0,
            startColumn: 0,
            endLine: 0,
            endColumn: 0,
          },
          identifierRange: {
            startLine: 0,
            startColumn: 0,
            endLine: 0,
            endColumn: 0,
          },
        },
        isResolved: false,
      };
      const builtInSymbol = await this.resolveBuiltInType(memberRef);
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

  /**
   * Get graph data as JSON-serializable data
   * Delegates to ApexSymbolGraph
   */
  getGraphData(): import('../types/graph').GraphData {
    return this.symbolGraph.getGraphData();
  }

  /**
   * Get graph data filtered by file as JSON-serializable data
   * Delegates to ApexSymbolGraph
   */
  getGraphDataForFile(fileUri: string): import('../types/graph').FileGraphData {
    return this.symbolGraph.getGraphDataForFile(fileUri);
  }

  /**
   * Get graph data filtered by symbol type as JSON-serializable data
   * Delegates to ApexSymbolGraph
   */
  getGraphDataByType(
    symbolType: string,
  ): import('../types/graph').TypeGraphData {
    return this.symbolGraph.getGraphDataByType(symbolType);
  }

  /**
   * Get graph data as a JSON string (for direct wire transmission)
   * Delegates to ApexSymbolGraph
   */
  getGraphDataAsJSON(): string {
    return this.symbolGraph.getGraphDataAsJSON();
  }

  /**
   * Get graph data for a file as a JSON string
   * Delegates to ApexSymbolGraph
   */
  getGraphDataForFileAsJSON(fileUri: string): string {
    return this.symbolGraph.getGraphDataForFileAsJSON(fileUri);
  }

  /**
   * Get graph data by type as a JSON string
   * Delegates to ApexSymbolGraph
   */
  getGraphDataByTypeAsJSON(symbolType: string): string {
    return this.symbolGraph.getGraphDataByTypeAsJSON(symbolType);
  }
}
