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

import { yieldToEventLoop } from '../utils/effectUtils';
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
import { createFileUri, extractFilePath } from '../types/ProtocolHandler';
import { ResolutionRequest, ResolutionResult } from './resolution/types';
import {
  SymbolReference,
  ReferenceContext,
  ChainedSymbolReference,
} from '../types/symbolReference';
import {
  ApexSymbolRefManager,
  ReferenceType,
  ReferenceResult,
  DependencyAnalysis,
  type SymbolTableRegistrationResult,
} from './ApexSymbolRefManager';
import {
  ISymbolManager,
  SymbolResolutionContext,
  SymbolResolutionResult,
} from '../types/ISymbolManager';
import { FQNOptions, calculateFQN, getAncestorChain } from '../utils/FQNUtils';
import {
  type SymbolProvider,
  resolveTypeName,
  ReferenceTypeEnum,
  IdentifierContext,
  type CompilationContext,
  Namespaces,
} from '../namespace/NamespaceUtils';
import {
  getImplicitQualifiedCandidates,
  getImplicitNamespaceOrder,
  isPrimaryImplicitNamespace,
} from '../namespace/NamespaceResolutionPolicy';
import { BuiltInTypeTablesImpl } from '../utils/BuiltInTypeTables';
import { extractFilePathFromUri } from '../types/UriBasedIdGenerator';

import { STANDARD_APEX_LIBRARY_URI } from '../utils/ResourceUtils';
import {
  type ResourceLoaderServiceShape,
  ResourceLoaderNoOpInstance,
} from './services/ResourceLoaderService';
import {
  GlobalTypeRegistry,
  GlobalTypeRegistryLive,
  type TypeRegistryEntry,
} from '../services/GlobalTypeRegistryService';
import { isApexKeyword, BUILTIN_TYPE_NAMES } from '../utils/ApexKeywords';
import { DEFAULT_SALESFORCE_API_VERSION } from '../constants/constants';
import type {
  ApexComment,
  CommentAssociation,
} from '../parser/listeners/ApexCommentCollectorListener';
import { CommentAssociator } from '../utils/CommentAssociator';
import {
  inTypeSymbolGroup,
  isChainedSymbolReference,
  isBlockSymbol,
} from '../utils/symbolNarrowing';
import { DetailLevel } from '../parser/listeners/LayeredSymbolListenerBase';
import { CompilerService } from '../parser/compilerService';
import { ApexSymbolCollectorListener } from '../parser/listeners/ApexSymbolCollectorListener';
import { type GenericTypeSubstitutionMap } from '../utils/genericTypeSubstitution';
import {
  isPositionWithinSymbol as posIsWithinSymbol,
  isPositionInIdentifierRange as posInIdRange,
  isPositionContainedInSymbol as posContainedInSymbol,
  isSymbolContainedWithin as symContainedWithin,
  isPositionWithinLocation as posWithinLocation,
  isPositionAtStartOfChainedRef as posAtStartOfChain,
  isPositionOnFirstNode as posOnFirstNode,
  findChainMemberAtPosition as findChainMember,
  findContainingSymbolFromSymbolTable as containingSymFromST,
} from './ops/positionUtils';
import {
  createFallbackResolutionContext as fallbackResCtx,
  createFallbackChainResolutionContext as fallbackChainResCtx,
  extractNamespaceFromUri as nsFromUri,
  extractCurrentScope as scopeFromText,
  extractAccessModifier as accessModFromText,
  extractImportStatements as importsFromText,
  extractNamespaceFromText as nsFromTextLine,
  determineScopeFromText as scopeFromTextLine,
  extractAccessModifierFromText as accessModFromTextLine,
  extractIsStaticFromText as isStaticFromTextLine,
  determineScopeFromSymbol as scopeFromSymbol,
  extractInheritanceFromSymbols as inheritanceFromSymbols,
  extractInterfaceImplementationsFromSymbols as interfacesFromSymbols,
  extractAccessModifierFromSymbol as accessModFromSymbol,
  extractIsStaticFromSymbol as isStaticFromSymbol,
} from './ops/resolutionContext';
import type {
  ChainResolutionContext,
  SymbolManagerOps,
} from './services/symbolResolver';
import {
  extractQualifierFromChain as extractQualFromChainOp,
  normalizeTypeNameForLookup as normalizeTypeNameOp,
  buildTypeLookupCandidates as buildTypeCandidatesOp,
  resolvePreferredTypeSymbolForLookup as resolvePreferredTypeOp,
  isValidSymbolReferenceName as isValidSymRefNameOp,
  isValidNamespace as isValidNsOp,
  findSymbolsInNamespace as findSymsInNsOp,
  resolveUnqualifiedReferenceByScope as resolveUnqualRefByScopeOp,
  isStaticReference as isStaticRefOp,
  computeIsStaticReference as computeIsStaticRefOp,
  selectMostSpecificSymbol as selectMostSpecificOp,
  isSymbolAccessibleFromFile as isSymAccessibleOp,
  isStandardApexClass as isStandardApexClassOp,
  resolveStandardLibraryType as resolveStdLibTypeOp,
  resolveStandardApexClass as resolveStdApexClassOp,
  loadAndRegisterStdlibSymbolTable as loadAndRegStdlibSTOp,
} from './ops/symbolRefResolution';
import {
  resolveChainedSymbolReference as resolveChainedSymRefOp,
  resolveEntireChain as resolveEntireChainOp,
  findAllPossibleResolutionPaths as findAllResPathsOp,
  exploreResolutionPaths as exploreResPathsOp,
  getAllPossibleResolutions as getAllPossibleResOp,
  disambiguateResolutionPaths as disambiguateResPathsOp,
  selectBestNamespacePath as selectBestNsPathOp,
  getFirstNamespaceIndex as getFirstNsIndexOp,
  getPathSpecificity as getPathSpecificityOp,
  choosePathBasedOnNextStep as choosePathByNextStepOp,
  isMethodSymbol as isMethodSymOp,
  isClassSymbol as isClassSymOp,
  isInstanceSymbol as isInstanceSymOp,
  resolveFirstNodeAsClass as resolveFirstNodeOp,
  tryResolveAsInstance as tryResolveInstanceOp,
  tryResolveAsClass as tryResolveClassOp,
  tryResolveAsMember as tryResolveMemberOp,
  canResolveAsNamespace as canResolveAsNsOp,
  resolveMemberInContext as resolveMemberInCtxOp,
  resolveSuperclassSymbol as resolveSuperclassSymOp,
  resolveObjectClass as resolveObjectClassOp,
  getSymbolById as getSymbolByIdOp,
  selectBestMemberCandidate as selectBestMemberOp,
  ensureClassSymbolsLoaded as ensureClassSymsOp,
  selectBestQualifier as selectBestQualOp,
  evolveContextAfterResolution as evolveCtxAfterResOp,
  resolveQualifiedReferenceFromChain as resolveQualRefFromChainOp,
  findTargetSymbolForReference as findTargetSymForRefOp,
  resolveSymbolReferenceToSymbol as resolveSymRefToSymOp,
} from './ops/chainResolution';

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

interface ResolverStats {
  resolverCalls: number;
  resolverQualifiedCalls: number;
  resolverQualifiedMs: number;
  resolverScopeHierarchyMs: number;
  resolverScopeSearchMs: number;
  resolverDirectLookupMs: number;
  resolverBuiltInMs: number;
  resolverPreResolvedHits: number;
  resolverQualifiedThisCalls: number;
  resolverQualifiedThisLookupMs: number;
  resolverQualifiedGlobalLookupMs: number;
  resolverQualifiedResolveMemberMs: number;
  resolverQualifiedStandardClassMs: number;
  resolverQualifiedCacheHits: number;
  resolverQualifiedCacheMisses: number;
  resolverQualifiedTypeContextPromotions: number;
  resolverMemberContextCacheHits: number;
  resolverMemberContextCacheMisses: number;
}

interface ReferenceResolutionStats extends ResolverStats {
  literalSkips: number;
  crossFileSkips: number;
  unresolvedSkips: number;
  declarationSkips: number;
  graphLookupCalls: number;
  graphEdgesAdded: number;
  resolveTargetMs: number;
  graphLookupMs: number;
  addReferenceMs: number;
}

/**
 * Main Apex Symbol Manager with DST integration
 * TODO: make all functions async and remove sync versions
 */
export class ApexSymbolManager implements ISymbolManager, SymbolProvider {
  private readonly logger = getLogger();
  private symbolRefManager: ApexSymbolRefManager;
  private fileMetadata: HashMap<string, FileMetadata>;
  private unifiedCache: UnifiedCache;
  private readonly MAX_CACHE_SIZE = 5000;
  private readonly CACHE_TTL = 3 * 60 * 1000; // 3 minutes
  private readonly builtInTypeTables: BuiltInTypeTablesImpl;

  private stdlibProvider: ResourceLoaderServiceShape;

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
  // Deduplicate concurrent stdlib load+graph insertion work per file.
  private inFlightStdlibHydration: Map<string, Promise<SymbolTable | null>> =
    new Map();
  // Track files in cross-file resolution to skip concurrent/redundant calls (e.g. multiple LSP requests)
  private resolvingCrossFileRefs: Set<string> = new Set();
  // Cache for isStaticReference results to avoid recomputing
  private readonly isStaticCache = new WeakMap<SymbolReference, boolean>();
  // Batch size for initial reference processing
  private readonly initialReferenceBatchSize: number;
  // Track detail level per file for enrichment
  private readonly fileDetailLevels: HashMap<string, DetailLevel> =
    new HashMap();
  // Track last processed SymbolTable state per file to avoid duplicate work
  private readonly lastProcessedTableStateByFile: HashMap<string, string> =
    new HashMap();
  // Compiler service for enrichment operations
  private readonly compilerService: CompilerService;

  constructor(
    stdlibProvider: ResourceLoaderServiceShape = ResourceLoaderNoOpInstance,
  ) {
    this.stdlibProvider = stdlibProvider;
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
          initialReferenceBatchSize: 50,
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

    // Store initialReferenceBatchSize for use in processSymbolReferencesToGraph
    this.initialReferenceBatchSize =
      deferredReferenceSettings.initialReferenceBatchSize ?? 50;

    // Initialize ApexSymbolRefManager with deferred reference processing settings
    this.symbolRefManager = new ApexSymbolRefManager(deferredReferenceSettings);
    ApexSymbolRefManager.setInstance(this.symbolRefManager);

    // Initialize compiler service for enrichment operations
    this.compilerService = new CompilerService();

    // Register settings change listener if settings manager is available
    if (
      settingsManager &&
      typeof settingsManager.onSettingsChange === 'function'
    ) {
      settingsManager.onSettingsChange((newSettings) => {
        if (newSettings.apex.deferredReferenceProcessing) {
          this.symbolRefManager.updateDeferredReferenceSettings(
            newSettings.apex.deferredReferenceProcessing,
          );
        }
      });
    }

    this.fileMetadata = new HashMap();
    this.unifiedCache = new UnifiedCache(
      this.MAX_CACHE_SIZE,
      this.CACHE_TTL,
      true,
    );
    this.builtInTypeTables = BuiltInTypeTablesImpl.getInstance();
  }

  /**
   * Replace the stdlib provider after construction.
   * Used by the coordinator to inject a real ResourceLoader-backed provider
   * once the resource loader has finished async initialization.
   */
  public setStdlibProvider(provider: ResourceLoaderServiceShape): void {
    this.stdlibProvider = provider;
  }

  /** Store per-file comment associations (normalized path). */
  public async setCommentAssociations(
    fileUri: string,
    associations: CommentAssociation[],
  ): Promise<void> {
    this.fileCommentAssociations.set(fileUri, associations || []);
  }

  /**
   * Retrieve documentation block comments for the provided symbol if available.
   */
  public async getBlockCommentsForSymbol(
    symbol: ApexSymbol,
  ): Promise<ApexComment[]> {
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
  async addSymbol(
    symbol: ApexSymbol,
    fileUri: string,
    symbolTable?: SymbolTable,
    skipPostAddBookkeeping = false,
  ): Promise<void> {
    // Convert fileUri to proper URI format to match symbol ID generation
    const properUri = createFileUri(fileUri);

    // Generate unified ID for the symbol if not already present
    if (!symbol.key.unifiedId) {
      // Ensure the kind is set on the key for proper unified ID generation
      if (!symbol.key.kind) {
        symbol.key.kind = symbol.kind;
      }
      symbol.key.unifiedId = generateUnifiedId(
        symbol.key,
        properUri,
        symbol.location,
      );
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
        this.symbolRefManager.getSymbol(parentId),
      );
      // Update key FQN for consistency
      symbol.key.fqn = symbol.fqn;
    }

    const symbolId = this.getSymbolId(symbol, fileUri);

    // Fast duplicate pre-check by unified ID; avoids expensive name-index scans.
    const existingSymbolById = this.symbolRefManager.getSymbol(
      symbol.key?.unifiedId || symbol.id,
    );

    // If no SymbolTable provided, create or reuse a temporary one for backward compatibility
    let tempSymbolTable: SymbolTable | undefined = symbolTable;
    if (!tempSymbolTable) {
      // Check if we already have a SymbolTable for this file
      tempSymbolTable = this.symbolRefManager.getSymbolTableForFile(properUri);
      if (!tempSymbolTable) {
        tempSymbolTable = new SymbolTable();
        tempSymbolTable.setMetadata({
          fileUri: properUri,
        });
        // Register the SymbolTable with the graph immediately
        this.symbolRefManager.registerSymbolTable(tempSymbolTable, properUri);
      }
    }

    // Add symbol to the SymbolTable only if it doesn't already exist
    // This prevents duplicates when addSymbolTable is called after registerSymbolTable
    // which may have already merged symbols into the table
    const symbolKey = symbol.key?.unifiedId || symbol.id;
    const existingInTable = symbolKey
      ? tempSymbolTable!.getAllSymbolsById(symbolKey)
      : [];
    if (existingInTable.length === 0) {
      tempSymbolTable!.addSymbol(symbol);
    }

    // Add to symbol graph (it has its own duplicate detection)
    this.symbolRefManager.addSymbol(symbol, properUri, tempSymbolTable);

    // If the symbol ID already existed, this add is effectively a no-op.
    const symbolWasAdded = !existingSymbolById;

    if (symbolWasAdded && !skipPostAddBookkeeping) {
      // Sync totalSymbols from graph to ensure consistency
      // The graph is the source of truth for symbol counts
      const graphStats = this.symbolRefManager.getStats();
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
   * Delegates to ApexSymbolRefManager for O(1) lookup via symbolIdIndex
   */
  async getSymbol(symbolId: string): Promise<ApexSymbol | null> {
    // First check cache for performance
    const cached = this.unifiedCache.get<ApexSymbol>(symbolId);
    if (cached) {
      return cached;
    }

    // Fallback to graph lookup (uses symbolIdIndex for O(1) or SymbolTable fallback)
    const symbol = this.symbolRefManager.getSymbol(symbolId);
    if (symbol) {
      // Cache for future lookups
      this.unifiedCache.set(symbolId, symbol, 'symbol_lookup');
    }
    return symbol;
  }

  /**
   * Find all symbols with a given name
   */
  async findSymbolByName(name: string): Promise<ApexSymbol[]> {
    // Don't short-circuit keywords that are also standard namespaces/classes
    // Check if it's a standard namespace or class before short-circuiting
    const isStandardNamespace = this.stdlibProvider.isStdApexNamespace(name);
    const isStdlibPrimitiveTypeName = BUILTIN_TYPE_NAMES.has(
      name.toLowerCase(),
    );

    // Only short-circuit keywords that are NOT standard namespaces/classes/stdlib primitive names
    if (
      isApexKeyword(name) &&
      !isStandardNamespace &&
      !isStdlibPrimitiveTypeName
    ) {
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
    const symbols = this.symbolRefManager.findSymbolByName(name) || [];
    this.unifiedCache.set(cacheKey, symbols, 'symbol_lookup');
    return symbols;
  }

  /**
   * Find a symbol by its fully qualified name
   * Returns first match if duplicates exist (backward compatible)
   */
  async findSymbolByFQN(fqn: string): Promise<ApexSymbol | null> {
    const cacheKey = `symbol_fqn_${fqn}`;
    const cached = this.unifiedCache.get<ApexSymbol>(cacheKey);
    if (cached) {
      return cached;
    }

    const symbol = this.symbolRefManager.findSymbolByFQN(fqn);
    this.unifiedCache.set(cacheKey, symbol, 'fqn_lookup');
    return symbol || null;
  }

  /**
   * Find all symbols with the same FQN (for duplicate detection)
   * @param fqn The fully qualified name to search for
   * @returns Array of all symbols with this FQN (empty if not found)
   */
  async findSymbolsByFQN(fqn: string): Promise<ApexSymbol[]> {
    return this.symbolRefManager.findSymbolsByFQN(fqn);
  }

  /**
   * Find all symbols in a specific file
   */
  async findSymbolsInFile(fileUri: string): Promise<ApexSymbol[]> {
    const cacheKey = `file_symbols_${fileUri}`;
    const cached = this.unifiedCache.get<ApexSymbol[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // Convert fileUri to proper URI format to match how symbols are stored
    const properUri = createFileUri(fileUri);

    // Normalize URI using the same logic as getSymbolsInFile() to ensure consistency
    // This ensures we use the same normalized URI that was used when registering SymbolTables
    const normalizedUri = extractFilePathFromUri(properUri);

    // OPTIMIZED: Delegate to graph which delegates to SymbolTable
    const symbols = this.symbolRefManager.getSymbolsInFile(normalizedUri);
    this.unifiedCache.set(cacheKey, symbols, 'file_lookup');
    return symbols;
  }

  /**
   * Get SymbolTable for a file
   * @param fileUri The file URI
   * @returns The SymbolTable for the file, or undefined if not found
   */
  async getSymbolTableForFile(
    fileUri: string,
  ): Promise<SymbolTable | undefined> {
    // Convert fileUri to proper URI format to match how symbols are stored
    const properUri = createFileUri(fileUri);

    // Normalize URI using the same logic as getSymbolsInFile() to ensure consistency
    const normalizedUri = extractFilePathFromUri(properUri);

    return this.symbolRefManager.getSymbolTableForFile(normalizedUri);
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
    return this.stdlibProvider.isStdApexNamespace(namespace);
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
  async findFilesForSymbol(name: string): Promise<string[]> {
    const fileUris = this.symbolRefManager.findFilesForSymbolName(name);
    return fileUris.map((fileUri) =>
      fileUri.startsWith('file://') ? extractFilePath(fileUri) : fileUri,
    );
  }

  /**
   * Backward compatibility method - alias for findSymbolByName
   */
  async lookupSymbolByName(name: string): Promise<ApexSymbol[]> {
    return await this.findSymbolByName(name);
  }

  /**
   * Backward compatibility method - alias for findSymbolByFQN
   */
  async lookupSymbolByFQN(fqn: string): Promise<ApexSymbol | null> {
    return await this.findSymbolByFQN(fqn);
  }

  /**
   * Backward compatibility method - alias for findSymbolsInFile
   */
  async getSymbolsInFile(fileUri: string): Promise<ApexSymbol[]> {
    return await this.findSymbolsInFile(fileUri);
  }

  /**
   * Backward compatibility method - alias for findFilesForSymbol
   */
  async getFilesForSymbol(name: string): Promise<string[]> {
    return await this.findFilesForSymbol(name);
  }

  /**
   * Find all references to a symbol
   */
  async findReferencesTo(symbol: ApexSymbol): Promise<ReferenceResult[]> {
    const cacheKey = `refs_to_${symbol.name}`;
    const cached = this.unifiedCache.get<ReferenceResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = this.symbolRefManager.findReferencesTo(symbol);
    this.unifiedCache.set(cacheKey, results, 'relationship');
    return results;
  }

  /**
   * Find all references from a symbol
   */
  async findReferencesFrom(symbol: ApexSymbol): Promise<ReferenceResult[]> {
    const cacheKey = `refs_from_${symbol.name}`;
    const cached = this.unifiedCache.get<ReferenceResult[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = this.symbolRefManager.findReferencesFrom(symbol);
    this.unifiedCache.set(cacheKey, results, 'relationship');
    return results;
  }

  /**
   * Find related symbols by relationship type
   */
  async findRelatedSymbols(
    symbol: ApexSymbol,
    relationshipType: EnumValue<typeof ReferenceType>,
  ): Promise<ApexSymbol[]> {
    const references = await this.findReferencesFrom(symbol);
    return references
      .filter((ref) => ref.referenceType === relationshipType)
      .map((ref) => ref.symbol);
  }

  /**
   * Analyze dependencies for a symbol
   */
  async analyzeDependencies(symbol: ApexSymbol): Promise<DependencyAnalysis> {
    const cacheKey = `deps_${symbol.name}`;
    const cached = this.unifiedCache.get<DependencyAnalysis>(cacheKey);
    if (cached) {
      return cached;
    }

    const analysis = this.symbolRefManager.analyzeDependencies(symbol);
    this.unifiedCache.set(cacheKey, analysis, 'analysis');
    return analysis;
  }

  /**
   * Detect circular dependencies
   */
  async detectCircularDependencies(): Promise<string[][]> {
    return this.symbolRefManager.detectCircularDependencies();
  }

  /**
   * Get impact analysis for refactoring
   */
  async getImpactAnalysis(symbol: ApexSymbol): Promise<ImpactAnalysis> {
    const dependencies = await this.analyzeDependencies(symbol);
    const directImpact = dependencies.dependents;
    const indirectImpact: ApexSymbol[] = [];

    // Find indirect impact (dependents of dependents)
    const findIndirectImpact = async (
      currentSymbol: ApexSymbol,
      depth: number = 0,
    ) => {
      if (depth > 3) return; // Limit depth to prevent infinite recursion
      const dependents = (await this.analyzeDependencies(currentSymbol))
        .dependents;
      for (const dependent of dependents) {
        if (
          !directImpact.includes(dependent) &&
          !indirectImpact.includes(dependent)
        ) {
          indirectImpact.push(dependent);
          await findIndirectImpact(dependent, depth + 1);
        }
      }
    };

    for (const dependent of directImpact) {
      await findIndirectImpact(dependent, 1);
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
      const allSymbols = yield* Effect.promise(() => self.getAllSymbols());

      const batchSize = 50;
      for (let i = 0; i < allSymbols.length; i++) {
        const symbol = allSymbols[i];
        const symbolId = self.getSymbolId(symbol);
        metrics.set(
          symbolId,
          yield* Effect.promise(() => self.computeMetrics(symbol)),
        );

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
  async computeMetrics(symbol: ApexSymbol): Promise<SymbolMetrics> {
    const dependencies = await this.analyzeDependencies(symbol);
    const referencesTo = await this.findReferencesTo(symbol);
    const _referencesFrom = await this.findReferencesFrom(symbol);

    return {
      referenceCount: referencesTo.length,
      dependencyCount: dependencies.dependencies.length,
      dependentCount: dependencies.dependents.length,
      cyclomaticComplexity: this.computeCyclomaticComplexity(symbol),
      depthOfInheritance: this.computeDepthOfInheritance(symbol),
      couplingScore: await this.computeCouplingScore(symbol),
      impactScore: dependencies.impactScore,
      changeImpactRadius: await this.computeChangeImpactRadius(symbol),
      refactoringRisk: await this.computeRefactoringRisk(symbol),
      usagePatterns: this.analyzeUsagePatterns(symbol),
      accessPatterns: this.analyzeAccessPatterns(symbol),
      lifecycleStage: await this.determineLifecycleStage(symbol),
    };
  }

  /**
   * Get most referenced symbols
   */
  async getMostReferencedSymbols(limit: number = 10): Promise<ApexSymbol[]> {
    const metrics = this.getSymbolMetrics();
    const sortedSymbols = (
      await Promise.all(
        Array.from(metrics.entries())
          .sort(([, a], [, b]) => b.referenceCount - a.referenceCount)
          .slice(0, limit)
          .map(async ([name]) => (await this.findSymbolByName(name))[0]),
      )
    ).filter(Boolean);

    return sortedSymbols;
  }

  /**
   * Resolve symbol with context
   */
  async resolveSymbol(
    name: string,
    context: SymbolResolutionContext,
  ): Promise<SymbolResolutionResult> {
    const candidates = await this.findSymbolByName(name);

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
  public async createResolutionContext(
    documentText: string,
    position: Position,
    fileUri: string,
  ): Promise<SymbolResolutionContext> {
    // Get symbol table for the file to extract context information
    const symbolsInFile = await this.findSymbolsInFile(fileUri);

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

  private createFallbackResolutionContext(
    documentText: string,
    position: Position,
    fileUri: string,
  ): SymbolResolutionContext {
    return fallbackResCtx(documentText, position, fileUri);
  }

  /**
   * Enhanced createResolutionContext that includes request type information
   */
  public async createResolutionContextWithRequestType(
    documentText: string,
    position: Position,
    sourceFile: string,
    requestType?: string,
  ): Promise<
    SymbolResolutionContext & { requestType?: string; position?: Position }
  > {
    const baseContext = await this.createResolutionContext(
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

  private extractNamespaceFromUri(fileUri: string): string {
    return nsFromUri(fileUri);
  }

  private extractCurrentScope(
    documentText: string,
    position: Position,
  ): string {
    return scopeFromText(documentText, position);
  }

  private extractAccessModifier(
    documentText: string,
    position: Position,
  ): 'public' | 'private' | 'protected' | 'global' {
    return accessModFromText(documentText, position);
  }

  private extractImportStatements(documentText: string): string[] {
    return importsFromText(documentText);
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
      const nameBasedResult = await this.resolveSymbol(
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
  async getAllSymbolsForCompletion(): Promise<ApexSymbol[]> {
    return await this.getAllSymbols();
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<SystemStats> {
    const graphStats = this.symbolRefManager.getStats();
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
  async clear(): Promise<void> {
    this.symbolRefManager.clear();
    this.fileMetadata.clear();
    this.unifiedCache.clear();
    this.lastProcessedTableStateByFile.clear();
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
  async removeFile(fileUri: string): Promise<void> {
    // Convert fileUri to proper URI format to match how symbols are stored
    const properUri = createFileUri(fileUri);

    // Normalize URI using extractFilePathFromUri to match how symbols are stored
    // This ensures consistency with addSymbolTable which uses normalized URIs
    const normalizedUri = extractFilePathFromUri(properUri);

    // Unregister user types from GlobalTypeRegistry before removing symbols
    // Get symbol table before removal to extract types
    const symbolTable =
      this.symbolRefManager.getSymbolTableForFile(normalizedUri);
    if (symbolTable) {
      try {
        const unregisterEffect = Effect.gen(function* () {
          const registry = yield* GlobalTypeRegistry;
          const removed = yield* registry.unregisterByFileUri(normalizedUri);
          return removed;
        });

        const removed = Effect.runSync(
          unregisterEffect.pipe(Effect.provide(GlobalTypeRegistryLive)),
        );

        this.logger.debug(
          () =>
            `[GlobalTypeRegistry] Unregistered ${removed.length} types from ${normalizedUri}`,
        );
      } catch (error) {
        // Log error but don't fail - registry cleanup is best-effort
        this.logger.warn(
          () =>
            `[GlobalTypeRegistry] Failed to unregister types for ${normalizedUri}: ${error}`,
        );
      }
    }

    // Remove from symbol graph (graph will normalize again, but we normalize here for consistency)
    this.symbolRefManager.removeFile(normalizedUri);

    // Sync memory stats with the graph's stats to ensure consistency
    const graphStats = this.symbolRefManager.getStats();
    this.memoryStats.totalSymbols = graphStats.totalSymbols;

    // Remove from file metadata (normalized key)
    this.fileMetadata.delete(normalizedUri);

    // Clear cache entries for this file
    this.unifiedCache.invalidatePattern(normalizedUri);
    this.lastProcessedTableStateByFile.delete(normalizedUri);
  }

  /**
   * Optimize memory usage
   */
  async optimizeMemory(): Promise<void> {
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
  async getRelationshipStats(symbol: ApexSymbol): Promise<RelationshipStats> {
    const referencesTo = await this.findReferencesTo(symbol);
    const _referencesFrom = await this.findReferencesFrom(symbol);

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
  async findReferencesByType(
    symbol: ApexSymbol,
    referenceType: EnumValue<typeof ReferenceType>,
  ): Promise<ReferenceResult[]> {
    const referencesTo = await this.findReferencesTo(symbol);
    return referencesTo.filter((ref) => ref.referenceType === referenceType);
  }

  /**
   * Find constructor calls for a symbol
   */
  async findConstructorCalls(symbol: ApexSymbol): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(
      symbol,
      ReferenceType.CONSTRUCTOR_CALL,
    );
  }

  /**
   * Find static access references for a symbol
   */
  async findStaticAccess(symbol: ApexSymbol): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(symbol, ReferenceType.STATIC_ACCESS);
  }

  // Extended Relationship Type Finders
  async findSOSLReferences(symbol: ApexSymbol): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(
      symbol,
      ReferenceType.SOSL_REFERENCE,
    );
  }

  async findDMLReferences(symbol: ApexSymbol): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(symbol, ReferenceType.DML_REFERENCE);
  }

  async findApexPageReferences(symbol: ApexSymbol): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(
      symbol,
      ReferenceType.APEX_PAGE_REFERENCE,
    );
  }

  async findComponentReferences(
    symbol: ApexSymbol,
  ): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(
      symbol,
      ReferenceType.COMPONENT_REFERENCE,
    );
  }

  async findCustomMetadataReferences(
    symbol: ApexSymbol,
  ): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(
      symbol,
      ReferenceType.CUSTOM_METADATA_REFERENCE,
    );
  }

  async findExternalServiceReferences(
    symbol: ApexSymbol,
  ): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(
      symbol,
      ReferenceType.EXTERNAL_SERVICE_REFERENCE,
    );
  }

  async findEnumReferences(symbol: ApexSymbol): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(
      symbol,
      ReferenceType.ENUM_REFERENCE,
    );
  }

  // Additional Reference Type Finders
  async findInstanceAccess(symbol: ApexSymbol): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(
      symbol,
      ReferenceType.INSTANCE_ACCESS,
    );
  }

  async findAnnotationReferences(
    symbol: ApexSymbol,
  ): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(
      symbol,
      ReferenceType.ANNOTATION_REFERENCE,
    );
  }

  async findTriggerReferences(symbol: ApexSymbol): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(
      symbol,
      ReferenceType.TRIGGER_REFERENCE,
    );
  }

  async findTestMethodReferences(
    symbol: ApexSymbol,
  ): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(
      symbol,
      ReferenceType.TEST_METHOD_REFERENCE,
    );
  }

  async findWebServiceReferences(
    symbol: ApexSymbol,
  ): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(
      symbol,
      ReferenceType.WEBSERVICE_REFERENCE,
    );
  }

  async findRemoteActionReferences(
    symbol: ApexSymbol,
  ): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(
      symbol,
      ReferenceType.REMOTE_ACTION_REFERENCE,
    );
  }

  async findPropertyAccess(symbol: ApexSymbol): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(
      symbol,
      ReferenceType.PROPERTY_ACCESS,
    );
  }

  async findTriggerContextReferences(
    symbol: ApexSymbol,
  ): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(
      symbol,
      ReferenceType.TRIGGER_CONTEXT_REFERENCE,
    );
  }

  async findSOQLReferences(symbol: ApexSymbol): Promise<ReferenceResult[]> {
    return await this.findReferencesByType(
      symbol,
      ReferenceType.SOQL_REFERENCE,
    );
  }

  // Cached Methods
  async findSymbolByNameCached(name: string): Promise<ApexSymbol[]> {
    const cacheKey = `symbol_name_${name}`;
    const cached = this.unifiedCache.get<ApexSymbol[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.findSymbolByName(name);
    this.unifiedCache.set(cacheKey, result, 'symbol_lookup');
    return result;
  }

  async findSymbolByFQNCached(fqn: string): Promise<ApexSymbol | null> {
    const cacheKey = `symbol_fqn_${fqn}`;
    const cached = this.unifiedCache.get<ApexSymbol>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.findSymbolByFQN(fqn);
    this.unifiedCache.set(cacheKey, result, 'fqn_lookup');
    return result;
  }

  async findSymbolsInFileCached(fileUri: string): Promise<ApexSymbol[]> {
    const cacheKey = `file_symbols_${fileUri}`;
    const cached = this.unifiedCache.get<ApexSymbol[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.findSymbolsInFile(fileUri);
    this.unifiedCache.set(cacheKey, result, 'file_lookup');
    return result;
  }

  async getRelationshipStatsCached(
    symbol: ApexSymbol,
  ): Promise<RelationshipStats> {
    const cacheKey = `relationship_stats_${this.getSymbolId(symbol)}`;
    const cached = this.unifiedCache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.getRelationshipStats(symbol);
    this.unifiedCache.set(cacheKey, result, 'relationship');
    return result;
  }

  async analyzeRelationshipPatternsCached(): Promise<PatternAnalysis> {
    const cacheKey = 'relationship_patterns_analysis';
    const cached = this.unifiedCache.get<any>(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.analyzeRelationshipPatterns();
    this.unifiedCache.set(cacheKey, result, 'analysis');
    return result;
  }

  // Async Methods
  async getRelationshipStatsAsync(
    symbol: ApexSymbol,
  ): Promise<RelationshipStats> {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 1));
    return await this.getRelationshipStatsCached(symbol);
  }

  async getPatternAnalysisAsync(): Promise<PatternAnalysis> {
    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 1));
    return await this.analyzeRelationshipPatternsCached();
  }

  // Batch Operations
  async addSymbolsBatchOptimized(
    symbolData: Array<{ symbol: ApexSymbol; fileUri: string }>,
    batchSize: number = 10,
  ): Promise<void> {
    for (let i = 0; i < symbolData.length; i += batchSize) {
      const batch = symbolData.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async ({ symbol, fileUri }) => {
          await this.addSymbol(symbol, fileUri);
        }),
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
          const stats = await this.getRelationshipStats(symbol);
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
          const symbols =
            await this.findSymbolsWithRelationshipPattern(pattern);
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
      const analysis = await this.analyzeDependencies(symbol);
      results.set(this.getSymbolId(symbol), analysis);
    }

    return results;
  }

  // Fix getAllSymbols to return actual symbols
  public async getAllSymbols(): Promise<ApexSymbol[]> {
    // This is a simplified implementation - in practice, you'd want to track all symbols
    const symbols: ApexSymbol[] = [];

    // Get symbols from the symbol graph by iterating through file metadata
    // Note: This is synchronous - for large workspaces, consider using async variant
    const fileEntries = Array.from(this.fileMetadata.entries());
    for (const [fileUri, _metadata] of fileEntries) {
      const fileSymbols = await this.findSymbolsInFile(fileUri);
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
  async findSymbolsWithRelationshipPattern(
    pattern: any,
  ): Promise<ApexSymbol[]> {
    // Simplified pattern matching implementation
    const allSymbols = await this.getAllSymbols();
    const results: ApexSymbol[] = [];
    for (const symbol of allSymbols) {
      const stats = await this.getRelationshipStats(symbol);
      if (
        stats.totalReferences >= (pattern?.minReferences || 0) &&
        stats.totalReferences <= (pattern?.maxReferences || Infinity)
      ) {
        results.push(symbol);
      }
    }
    return results;
  }

  async analyzeRelationshipPatterns(): Promise<PatternAnalysis> {
    const allSymbols = await this.getAllSymbols();
    const patterns = new Map<string, number>();
    let totalRelationships = 0;

    for (const symbol of allSymbols) {
      const stats = await this.getRelationshipStats(symbol);
      totalRelationships += stats.totalReferences;

      // Count relationship types
      stats.relationshipTypeCounts.forEach((count, type) => {
        patterns.set(type, (patterns.get(type) || 0) + count);
      });
    }

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
        matchingSymbols: [] as ApexSymbol[],
      }));

    for (const entry of mostCommonPatterns) {
      for (const symbol of allSymbols) {
        const stats = await this.getRelationshipStats(symbol);
        if (stats.relationshipTypeCounts.has(entry.pattern)) {
          entry.matchingSymbols.push(symbol);
        }
      }
    }

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
  /**
   * Add a symbol table to the manager.
   * This method processes same-file references immediately (for graph edges and scope resolution)
   * and defers cross-file references for on-demand resolution to avoid queue pressure during workspace loading.
   * Cross-file references will be resolved on-demand when needed (hover, goto definition, diagnostics).
   *
   * @param symbolTable The symbol table to add
   * @param fileUri The file URI associated with the symbol table
   */
  /**
   * Add a symbol table to the manager.
   * This method processes same-file references immediately (for graph edges and scope resolution)
   * and defers cross-file references for on-demand resolution to avoid queue pressure during workspace loading.
   * Cross-file references will be resolved on-demand when needed (hover, goto definition, diagnostics).
   *
   * @param symbolTable The symbol table to add
   * @param fileUri The file URI associated with the symbol table
   * @returns Effect that resolves when the symbol table is added
   */
  addSymbolTable(
    symbolTable: SymbolTable,
    fileUri: string,
    documentVersion?: number,
    hasErrors?: boolean,
  ): Effect.Effect<void, never, never> {
    const self = this;
    return Effect.gen(function* () {
      const addStartTime = Date.now();

      // Convert fileUri to proper URI format to match symbol ID generation
      const properUri = createFileUri(fileUri);

      // Normalize URI using extractFilePathFromUri to ensure consistency with SymbolTable registration
      // This ensures that fileIndex lookups will find the symbols
      const normalizedUri = extractFilePathFromUri(properUri);

      const existingMetadata = symbolTable.getMetadata();
      const metadataUpdate: {
        fileUri: string;
        documentVersion: number;
        hasErrors?: boolean;
      } = {
        fileUri: normalizedUri,
        documentVersion:
          documentVersion ?? existingMetadata.documentVersion ?? 1,
      };
      if (hasErrors !== undefined) {
        metadataUpdate.hasErrors = hasErrors;
      }
      symbolTable.setMetadata(metadataUpdate);

      const registration = yield* self.registerSymbolTableForFile(
        symbolTable,
        normalizedUri,
        {
          mergeReferences: false,
          hasErrors,
        },
      );

      if (registration.decision === 'rejected-stale') {
        self.logger.debug(
          () =>
            `[addSymbolTable] Ignoring stale symbol table for ${normalizedUri} ` +
            `(incoming=${registration.incomingVersion ?? 'unknown'}, ` +
            `stored=${registration.storedVersion ?? 'unknown'})`,
        );
        return;
      }

      if (registration.decision === 'noop-same-instance') {
        // Same instance may still have been mutated by layered enrichment.
        // Only skip when a stable state signature matches the last processed pass.
        const noopTable = registration.canonicalTable ?? symbolTable;
        const noopSignature = self.getSymbolTableStateSignature(noopTable);
        const lastSignature =
          self.lastProcessedTableStateByFile.get(normalizedUri);
        if (lastSignature === noopSignature) {
          return;
        }
      }

      // Rebuild per-file reference edges from the canonical table selected by registration.
      self.symbolRefManager.clearReferenceStateForFile(normalizedUri);

      // After registration, get the canonical symbol table (may have been merged)
      const finalSymbolTable = registration.canonicalTable;
      if (!finalSymbolTable) {
        self.logger.warn(
          () =>
            `[addSymbolTable] SymbolTable not found after registration for ${normalizedUri}`,
        );
        return;
      }

      // Add all symbols from the symbol table to the graph
      // Only add symbols that aren't already in the graph to avoid duplicates
      const symbols = finalSymbolTable.getAllSymbols
        ? finalSymbolTable.getAllSymbols()
        : [];

      // Update all symbols to use the normalized URI
      // Process in batches with yields for large symbol tables to prevent blocking
      const batchSize = 100;
      const symbolNamesAdded = new Set<string>();
      let yieldsPerformed = 0;
      for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];
        // Update the symbol's fileUri to match the normalized URI
        symbol.fileUri = normalizedUri;

        // Only add to graph if not already present (registerSymbolTable already handled SymbolTable)
        // Pass the registered SymbolTable to avoid creating a new one
        yield* Effect.promise(() =>
          self.addSymbol(symbol, normalizedUri, finalSymbolTable, true),
        );
        symbolNamesAdded.add(symbol.name);

        // Yield every batchSize symbols to allow other tasks to run
        if ((i + 1) % batchSize === 0 && i + 1 < symbols.length) {
          yieldsPerformed++;
          yield* yieldToEventLoop; // Yield to event loop using setImmediate
        }
      }

      const addDuration = Date.now() - addStartTime;
      if (addDuration > 50 || yieldsPerformed > 0) {
        self.logger.debug(
          () =>
            `[WORKSPACE-LOAD] Added ${symbols.length} symbols for ${normalizedUri} ` +
            `in ${addDuration}ms (${yieldsPerformed} yields)`,
        );
      }

      // Invalidate cache for all symbol names that were added
      // This ensures that findSymbolByName() will see the newly added symbols
      for (const symbolName of symbolNamesAdded) {
        // Normalize to lowercase to match cache key format in findSymbolByName()
        const normalizedName = symbolName.toLowerCase();
        self.unifiedCache.invalidatePattern(`symbol_name_${normalizedName}`);
      }

      // Invalidate file-based cache when symbols are added to a file
      // This ensures that findSymbolsInFile() will see the newly added symbols
      self.unifiedCache.invalidatePattern(`file_symbols_${normalizedUri}`);

      // Also invalidate name-based cache to ensure findSymbolByName works correctly
      for (const symbolName of symbolNamesAdded) {
        const normalizedName = symbolName.toLowerCase();
        self.unifiedCache.invalidatePattern(`symbol_name_${normalizedName}`);
      }

      // Process same-file references immediately (cheap, synchronous, needed for graph edges)
      // Skip cross-file references to avoid queue pressure - they'll be resolved on-demand
      yield* self.processSameFileReferencesToGraphEffect(
        finalSymbolTable,
        normalizedUri,
      );

      // Sync memory stats with the graph's stats to ensure consistency
      // The graph is the source of truth for symbol counts
      const graphStats = self.symbolRefManager.getStats();
      self.memoryStats.totalSymbols = graphStats.totalSymbols;
      // Preserve file-level bookkeeping that per-symbol path normally updates.
      // Bulk add skips per-symbol bookkeeping for performance, so we update once.
      if (symbols.length > 0) {
        const existingFileMeta = self.fileMetadata.get(normalizedUri);
        if (existingFileMeta) {
          existingFileMeta.symbolCount += symbols.length;
          existingFileMeta.lastUpdated = Date.now();
        } else {
          self.fileMetadata.set(normalizedUri, {
            fileUri: normalizedUri,
            symbolCount: symbols.length,
            lastUpdated: Date.now(),
          });
        }
      } else {
        self.fileMetadata.delete(normalizedUri);
      }

      // Register user types to GlobalTypeRegistry for O(1) lookup
      const symbolTableForRegistry =
        self.symbolRefManager.getSymbolTableForFile(normalizedUri);
      if (symbolTableForRegistry) {
        // Run registry update with GlobalTypeRegistry context
        const registerEffect = self.registerUserTypesToGlobalRegistry(
          symbolTableForRegistry,
          normalizedUri,
        );
        yield* Effect.provide(registerEffect, GlobalTypeRegistryLive);
      }

      // Process deferred references for types that were just added
      // This ensures that when a new file (like Foo.cls) is added, deferred references
      // in other files (like Bar.cls) that reference those types get resolved
      const sourceFilesToReResolve = new Set<string>();
      for (const symbolName of symbolNamesAdded) {
        // Check if there are deferred references waiting for this type
        const deferredRefs =
          self.symbolRefManager.getDeferredReferences(symbolName);
        if (deferredRefs && deferredRefs.length > 0) {
          // Collect source file URIs from deferred references
          for (const deferredRef of deferredRefs) {
            if (deferredRef.sourceSymbol?.fileUri) {
              sourceFilesToReResolve.add(deferredRef.sourceSymbol.fileUri);
            }
          }

          // Process deferred references for this type
          // Use Effect.tryPromise to handle the async operation and catch errors
          yield* Effect.tryPromise({
            try: () =>
              Effect.runPromise(
                self.symbolRefManager
                  .processDeferredReferencesBatchEffect(symbolName)
                  .pipe(
                    Effect.catchAll(() =>
                      Effect.succeed({
                        needsRetry: false,
                        reason: 'success' as const,
                      }),
                    ),
                  ),
              ),
            catch: () => ({ needsRetry: false, reason: 'success' as const }),
          }).pipe(
            Effect.catchAll(() => Effect.succeed(undefined)),
            Effect.asVoid,
          );
        }
      }
      // Re-run cross-file resolution for source files that had deferred references
      // This updates SymbolReference objects with resolvedSymbolId
      for (const sourceFileUri of sourceFilesToReResolve) {
        yield* self.resolveCrossFileReferencesForFile(sourceFileUri);
      }
      self.lastProcessedTableStateByFile.set(
        normalizedUri,
        self.getSymbolTableStateSignature(finalSymbolTable),
      );
    });
  }

  async addSymbolTableAsync(
    symbolTable: SymbolTable,
    fileUri: string,
    documentVersion?: number,
    hasErrors?: boolean,
  ): Promise<void> {
    await Effect.runPromise(
      this.addSymbolTable(symbolTable, fileUri, documentVersion, hasErrors),
    );
  }

  getAllFileUris(): string[] {
    return Array.from(this.fileMetadata.keys());
  }

  private getSymbolTableStateSignature(symbolTable: SymbolTable): string {
    const metadata = symbolTable.getMetadata();
    return [
      metadata.documentVersion ?? '',
      symbolTable.getAllSymbols().length,
      symbolTable.getAllReferences().length,
      metadata.hasErrors ? 1 : 0,
    ].join('|');
  }

  registerSymbolTableForFile(
    symbolTable: SymbolTable,
    fileUri: string,
    options?: {
      mergeReferences?: boolean;
      hasErrors?: boolean;
    },
  ): Effect.Effect<SymbolTableRegistrationResult, never, never> {
    const normalizedUri = extractFilePathFromUri(createFileUri(fileUri));
    return Effect.sync(() =>
      this.symbolRefManager.registerSymbolTable(symbolTable, normalizedUri, {
        mergeReferences: options?.mergeReferences,
        hasErrors: options?.hasErrors,
      }),
    );
  }

  /**
   * Process same-file references only (skip cross-file references).
   * This processes references synchronously and adds edges to the graph for dependency tracking.
   * Cross-file references are skipped to avoid queue pressure - they'll be resolved on-demand.
   *
   * @param symbolTable The symbol table containing type references
   * @param fileUri The file path where the references were found
   */
  private async processSameFileReferencesToGraph(
    symbolTable: SymbolTable,
    fileUri: string,
  ): Promise<void> {
    return Effect.runPromise(
      this.processSameFileReferencesToGraphEffect(symbolTable, fileUri),
    );
  }

  /**
   * Register user types from a symbol table to GlobalTypeRegistry.
   * Extracts top-level types (classes, interfaces, enums) and registers them
   * for O(1) type resolution.
   *
   * @param symbolTable The symbol table containing types to register
   * @param fileUri The file URI for the types
   */
  private registerUserTypesToGlobalRegistry(
    symbolTable: SymbolTable,
    fileUri: string,
  ): Effect.Effect<void, never, GlobalTypeRegistry> {
    const self = this;
    return Effect.gen(function* () {
      // Extract top-level types (parentId === null)
      const allSymbols = symbolTable.getAllSymbols();
      const topLevelTypes = allSymbols.filter((symbol) => {
        const isTopLevel =
          symbol.parentId === null || symbol.parentId === 'null';
        const isType =
          symbol.kind === SymbolKind.Class ||
          symbol.kind === SymbolKind.Interface ||
          symbol.kind === SymbolKind.Enum;
        return isTopLevel && isType;
      });

      // Skip if no types (e.g., trigger-only file)
      if (topLevelTypes.length === 0) {
        return;
      }

      // Build registry entries
      const entries: TypeRegistryEntry[] = [];
      for (const symbol of topLevelTypes) {
        // Extract namespace first
        const namespace = self.extractNamespaceForRegistry(symbol, fileUri);

        // Calculate FQN if missing
        let fqn = symbol.fqn;
        if (!fqn) {
          // Build FQN from namespace and name
          fqn = namespace ? `${namespace}.${symbol.name}` : symbol.name;
        }

        entries.push({
          fqn: fqn.toLowerCase(),
          name: symbol.name,
          namespace,
          kind: symbol.kind as
            | SymbolKind.Class
            | SymbolKind.Interface
            | SymbolKind.Enum,
          symbolId: symbol.id,
          fileUri,
          isStdlib: false, // User type
        });
      }

      // Register in bulk
      const registry = yield* GlobalTypeRegistry;
      yield* registry.registerTypes(entries);

      self.logger.debug(
        () =>
          `[GlobalTypeRegistry] Registered ${entries.length} user types for ${fileUri}`,
      );
    });
  }

  /**
   * Extract namespace for a symbol for GlobalTypeRegistry.
   * Uses project namespace from settings.
   *
   * @param symbol The symbol to extract namespace from
   * @param fileUri The file URI (for logging)
   * @returns Namespace string
   */
  private extractNamespaceForRegistry(
    symbol: ApexSymbol,
    fileUri: string,
  ): string {
    // Try symbol.namespace first
    if (symbol.namespace) {
      if (typeof symbol.namespace === 'string') {
        return symbol.namespace;
      }
      // namespace object - use toString()
      if (
        typeof symbol.namespace === 'object' &&
        'toString' in symbol.namespace
      ) {
        return symbol.namespace.toString();
      }
    }

    // Try FQN
    if (symbol.fqn && symbol.fqn.includes('.')) {
      const parts = symbol.fqn.split('.');
      if (parts.length > 1) {
        return parts.slice(0, -1).join('.');
      }
    }

    // TODO: Use project namespace from settings when available
    // For now, use 'default' namespace for all user types
    // Future: Extract from ApexSettings.projectNamespace or org metadata
    return 'default';
  }

  /**
   * Process same-file references only (Effect-based).
   * Cross-file references are skipped to avoid queue pressure.
   *
   * @param symbolTable The symbol table containing type references
   * @param fileUri The file path where the references were found
   */
  private processSameFileReferencesToGraphEffect(
    symbolTable: SymbolTable,
    fileUri: string,
  ): Effect.Effect<void, never, never> {
    const self = this;
    return Effect.gen(function* () {
      try {
        const typeReferences = symbolTable.getAllReferences();
        const qualifiedResolutionCache = new HashMap<
          string,
          ApexSymbol | null
        >();
        const memberResolutionCache = new HashMap<string, ApexSymbol | null>();
        const unresolvedByName = new HashMap<string, number>();
        const refsByName = new HashMap<string, number>();
        const stats = {
          literalSkips: 0,
          crossFileSkips: 0,
          unresolvedSkips: 0,
          declarationSkips: 0,
          graphLookupCalls: 0,
          graphEdgesAdded: 0,
          resolveTargetMs: 0,
          graphLookupMs: 0,
          addReferenceMs: 0,
          resolverCalls: 0,
          resolverQualifiedCalls: 0,
          resolverQualifiedMs: 0,
          resolverScopeHierarchyMs: 0,
          resolverScopeSearchMs: 0,
          resolverDirectLookupMs: 0,
          resolverBuiltInMs: 0,
          resolverPreResolvedHits: 0,
          resolverQualifiedThisCalls: 0,
          resolverQualifiedThisLookupMs: 0,
          resolverQualifiedGlobalLookupMs: 0,
          resolverQualifiedResolveMemberMs: 0,
          resolverQualifiedStandardClassMs: 0,
          resolverQualifiedCacheHits: 0,
          resolverQualifiedCacheMisses: 0,
          resolverQualifiedTypeContextPromotions: 0,
          resolverMemberContextCacheHits: 0,
          resolverMemberContextCacheMisses: 0,
        };

        // Process references in batches with yields to prevent blocking
        const batchSize = self.initialReferenceBatchSize;
        for (let i = 0; i < typeReferences.length; i += batchSize) {
          const batch = typeReferences.slice(i, i + batchSize);

          // Process batch - only same-file references
          for (const typeRef of batch) {
            const nameKey = typeRef.name?.toLowerCase?.() ?? '';
            if (nameKey) {
              refsByName.set(nameKey, (refsByName.get(nameKey) ?? 0) + 1);
            }
            yield* self.processSameFileReferenceToGraphEffect(
              typeRef,
              fileUri,
              symbolTable,
              qualifiedResolutionCache,
              memberResolutionCache,
              stats,
              unresolvedByName,
            );
          }

          // Yield after each batch (except the last) to allow other tasks to run
          if (i + batchSize < typeReferences.length) {
            yield* Effect.yieldNow();
          }
        }
      } catch (error) {
        self.logger.error(
          () =>
            `Error processing same-file references for ${fileUri}: ${error}`,
        );
      }
    });
  }

  /**
   * Process a single same-file reference and add it to the symbol graph.
   * Cross-file references are skipped.
   *
   * @param typeRef The type reference to process
   * @param fileUri The file path where the reference was found
   * @param symbolTable The symbol table for the current file
   */
  private processSameFileReferenceToGraphEffect(
    typeRef: SymbolReference,
    fileUri: string,
    symbolTable: SymbolTable,
    qualifiedResolutionCache: HashMap<string, ApexSymbol | null>,
    memberResolutionCache: HashMap<string, ApexSymbol | null>,
    stats?: ReferenceResolutionStats,
    unresolvedByName?: HashMap<string, number>,
  ): Effect.Effect<void, never, never> {
    const self = this;
    return Effect.gen(function* () {
      try {
        // Skip LITERAL references - they don't represent symbol relationships
        if (typeRef.context === ReferenceContext.LITERAL) {
          if (stats) {
            stats.literalSkips += 1;
          }
          return;
        }

        // Check if this is a cross-file reference - if so, skip it
        const qualifierInfo = self.extractQualifierFromChain(typeRef);
        let isCrossFileReference = false;

        if (qualifierInfo && qualifierInfo.isQualified) {
          // For qualified references, check if the qualifier is in the current file
          if (qualifierInfo.qualifier.toLowerCase() === 'this') {
            const allSymbols = symbolTable.getAllSymbols();
            const memberInFile = allSymbols.find(
              (s) => s.name === qualifierInfo.member,
            );
            if (!memberInFile) {
              isCrossFileReference = true;
            }
          } else {
            const allSymbols = symbolTable.getAllSymbols();
            const qualifierInFile = allSymbols.find(
              (s) => s.name === qualifierInfo.qualifier,
            );
            if (!qualifierInFile) {
              isCrossFileReference = true;
            }
          }
        } else {
          // For unqualified references, check if the symbol exists in the current file
          const allSymbols = symbolTable.getAllSymbols();
          const symbolInFile = allSymbols.find((s) => s.name === typeRef.name);
          if (!symbolInFile) {
            isCrossFileReference = true;
          }
        }

        // Skip cross-file references - they'll be resolved on-demand
        if (isCrossFileReference) {
          if (stats) {
            stats.crossFileSkips += 1;
          }
          return;
        }

        // Process same-file reference - resolve and add to graph
        // This is the same logic as processSymbolReferenceToGraphEffect for same-file refs
        const sourceSymbol = self.findContainingSymbolFromSymbolTable(
          typeRef,
          symbolTable,
        );
        if (!sourceSymbol) {
          return;
        }

        // Resolve target symbol
        let targetSymbol: ApexSymbol | null = null;
        if (typeRef.resolvedSymbolId) {
          const resolvedId = typeRef.resolvedSymbolId;
          targetSymbol = yield* Effect.promise(() =>
            self.getSymbol(resolvedId),
          );
        }

        if (!targetSymbol) {
          const resolveTargetStart = Date.now();
          targetSymbol = yield* Effect.tryPromise({
            try: () =>
              self.findTargetSymbolForReference(
                typeRef,
                fileUri,
                sourceSymbol,
                symbolTable,
                qualifiedResolutionCache,
                memberResolutionCache,
                stats,
              ),
            catch: (error) => error as Error,
          }).pipe(Effect.catchAll(() => Effect.succeed(null)));
          if (stats) {
            stats.resolveTargetMs += Date.now() - resolveTargetStart;
          }
          if (targetSymbol) {
            typeRef.resolvedSymbolId = targetSymbol.id;
          }
        }

        if (!targetSymbol) {
          // Same-file reference couldn't be resolved
          // This shouldn't happen if second-pass resolution worked correctly,
          // but if it does, skip it rather than deferring (deferring won't help for same-file refs)
          // Only cross-file references should be deferred, as they may be resolved when the target file is loaded
          self.logger.debug(
            () =>
              `Skipping unresolved same-file reference ${typeRef.name} in ${fileUri} ` +
              '(should have been resolved during second-pass)',
          );
          if (stats) {
            stats.unresolvedSkips += 1;
          }
          if (unresolvedByName) {
            const unresolvedKey =
              qualifierInfo && qualifierInfo.isQualified
                ? `${qualifierInfo.qualifier}.${qualifierInfo.member}`
                : typeRef.name;
            unresolvedByName.set(
              unresolvedKey,
              (unresolvedByName.get(unresolvedKey) ?? 0) + 1,
            );
          }
          return; // Skip, don't defer
        }

        // Skip creating edges for declaration references
        if (
          typeRef.context === ReferenceContext.VARIABLE_DECLARATION ||
          typeRef.context === ReferenceContext.PROPERTY_REFERENCE
        ) {
          if (stats) {
            stats.declarationSkips += 1;
          }
          return;
        }

        // Add to graph
        const graphLookupStart = Date.now();
        const sourceSymbolsInGraph = self.symbolRefManager.findSymbolByName(
          sourceSymbol.name,
        );
        const targetSymbolsInGraph = self.symbolRefManager.findSymbolByName(
          targetSymbol.name,
        );
        if (stats) {
          stats.graphLookupCalls += 2;
          stats.graphLookupMs += Date.now() - graphLookupStart;
        }

        // Capture targetSymbol in a const to help TypeScript narrow the type
        // (needed because it will be used in closures below)
        const resolvedTargetSymbol = targetSymbol;

        // Find source symbol in graph - only match by fileUri if available
        // If fileUri is not set, we can't reliably match, so skip
        const sourceInGraph = sourceSymbol.fileUri
          ? sourceSymbolsInGraph.find((s) => s.fileUri === sourceSymbol.fileUri)
          : sourceSymbolsInGraph.length === 1
            ? sourceSymbolsInGraph[0]
            : undefined;

        // Find target symbol in graph - only match by fileUri if available
        // If fileUri is not set, we can't reliably match, so skip
        const targetInGraph = resolvedTargetSymbol.fileUri
          ? targetSymbolsInGraph.find(
              (s) => s.fileUri === resolvedTargetSymbol.fileUri,
            )
          : targetSymbolsInGraph.length === 1
            ? targetSymbolsInGraph[0]
            : undefined;

        if (!sourceInGraph || !targetInGraph) {
          // Can't reliably match symbols without fileUri when multiple symbols exist
          return;
        }

        const referenceType = self.mapReferenceContextToType(typeRef.context);
        const isStatic = yield* self.isStaticReferenceEffect(typeRef);
        const addReferenceStart = Date.now();
        self.symbolRefManager.addReference(
          sourceInGraph,
          targetInGraph,
          referenceType,
          typeRef.location,
          {
            methodName: typeRef.parentContext,
            isStatic: isStatic,
          },
        );
        if (stats) {
          stats.graphEdgesAdded += 1;
          stats.addReferenceMs += Date.now() - addReferenceStart;
        }
      } catch (error) {
        self.logger.error(
          () =>
            `Error processing same-file reference ${typeRef.name}: ${error}`,
        );
      }
    });
  }

  /**
   * Get SymbolReference data at a specific position in a file
   * This provides precise AST-based position data for enhanced symbol resolution
   * @param fileUri The file path to search in
   * @param position The position to search for references (1-based line index, 0-based column index)
   * @returns Array of SymbolReference objects at the position
   */
  async getReferencesAtPosition(
    fileUri: string,
    position: { line: number; character: number },
  ): Promise<SymbolReference[]> {
    try {
      const symbolTable = this.symbolRefManager.getSymbolTableForFile(fileUri);

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
      const typeReferences = await this.getReferencesAtPosition(
        fileUri,
        position,
      );

      if (typeReferences.length > 0) {
        // Step 2: For chained references, find the most specific reference for this position
        // If position is on a specific chain member, prefer references that match that member
        let referenceToResolve = typeReferences[0];

        // Prioritize chained references when position matches a chain member
        // This ensures we resolve the correct part of the chain (e.g., "System" in "System.Url")
        const chainedRefs = typeReferences.filter((ref) =>
          isChainedSymbolReference(ref),
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
            !isChainedSymbolReference(referenceToResolve) &&
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
        const wasChainedRef = isChainedSymbolReference(referenceToResolve);
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
        typeReferences.some((ref) => isChainedSymbolReference(ref));

      if (hadChainedRefs) {
        // We had chained references but resolution failed - don't fall back to direct symbol lookup
        return null;
      }
      try {
        const allRefs = await this.getAllReferencesInFile(fileUri);
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
      const symbols = await this.findSymbolsInFile(fileUri);
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
          this.symbolRefManager.getSymbol(parentId),
        );
      }
    } catch (_e) {
      // non-fatal; leave symbol as-is
    }
  }

  // Build or retrieve a fast lookup cache for a file's symbols
  private async getOrBuildParentCacheForFile(
    fileUri: string,
  ): Promise<HashMap<string, ApexSymbol>> {
    let cache = this.parentLookupCache.get(fileUri);
    if (cache) return cache;

    const map = new HashMap<string, ApexSymbol>();
    const symbols = await this.findSymbolsInFile(fileUri);
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
    return Effect.runPromise(
      this.processSymbolReferencesToGraphEffect(symbolTable, fileUri),
    );
  }

  /**
   * Resolve cross-file references for a file on-demand.
   * This method processes references from the SymbolTable and resolves cross-file references
   * when needed (e.g., for diagnostics, hover, goto definition).
   *
   * @param fileUri The file URI to resolve cross-file references for
   * @returns Effect that resolves cross-file references for the file
   */
  resolveCrossFileReferencesForFile(
    fileUri: string,
  ): Effect.Effect<void, never, never> {
    const self = this;
    return Effect.gen(function* () {
      const properUri = createFileUri(fileUri);
      const normalizedUri = extractFilePathFromUri(properUri);

      // Skip if already resolving this file (prevents redundant work from overlapping LSP requests)
      if (self.resolvingCrossFileRefs.has(normalizedUri)) {
        self.logger.debug(
          () =>
            `Skipping cross-file resolution for ${normalizedUri} (already in progress)`,
        );
        return;
      }

      self.resolvingCrossFileRefs.add(normalizedUri);
      try {
        const symbolTable =
          self.symbolRefManager.getSymbolTableForFile(normalizedUri);
        if (!symbolTable) {
          self.logger.debug(
            () =>
              `No SymbolTable found for ${normalizedUri}, skipping cross-file reference resolution`,
          );
          return;
        }

        yield* self.processSymbolReferencesToGraphEffect(
          symbolTable,
          normalizedUri,
        );

        // Resolve unqualified METHOD_CALL references through the superclass chain.
        // Same-file resolution (ApexReferenceResolver) only looks within the current
        // file's symbol table. Inherited method calls like getBaseName() — where the
        // method is defined in a cross-file base class — require walking the superclass
        // hierarchy using the global symbol graph, which is only possible here.
        yield* self.resolveInheritedMethodCallsEffect(
          symbolTable,
          normalizedUri,
        );
      } finally {
        self.resolvingCrossFileRefs.delete(normalizedUri);
      }
    });
  }

  /**
   * Resolve unqualified METHOD_CALL references through the superclass chain.
   *
   * Same-file resolution (ApexReferenceResolver.resolveSameFileReferences) only searches
   * the current file's symbol table. Inherited method calls — e.g. getBaseName() called
   * inside CrossFileChildClass when the method is defined in CrossFileBaseClass — are not
   * resolvable there. This step runs after cross-file graph processing and looks up the
   * containing class's superClass chain in the global symbol graph.
   */
  private resolveInheritedMethodCallsEffect(
    symbolTable: SymbolTable,
    fileUri: string,
  ): Effect.Effect<void, never, never> {
    const self = this;
    return Effect.gen(function* () {
      const refs = symbolTable.getAllReferences();
      for (const ref of refs) {
        // Only unresolved, non-chained, unqualified METHOD_CALL references
        if (
          ref.resolvedSymbolId ||
          isChainedSymbolReference(ref) ||
          ref.context !== ReferenceContext.METHOD_CALL
        ) {
          continue;
        }

        // Find the class scope containing this reference
        const position = {
          line: ref.location.identifierRange.startLine,
          character: ref.location.identifierRange.startColumn,
        };
        const scopeHierarchy = symbolTable.getScopeHierarchy(position);
        const classBlock = scopeHierarchy.find(
          (s) => isBlockSymbol(s) && (s as any).scopeType === 'class',
        );
        if (!classBlock) continue;

        // Find the TypeSymbol (class declaration) that owns this class block
        const allSymbolsInFile = symbolTable.getAllSymbols();
        const classSymbol = allSymbolsInFile.find(
          (s) => s.id === classBlock.parentId && s.kind === SymbolKind.Class,
        ) as TypeSymbol | undefined;
        if (!classSymbol?.superClass) continue;

        // Walk the superclass chain until we find the method
        const superClassName = classSymbol.superClass;
        const resolved = yield* Effect.promise(() =>
          self.findMethodInSuperclassChain(ref.name, superClassName),
        );
        if (resolved) {
          ref.resolvedSymbolId = resolved.id;
          self.logger.debug(
            () =>
              `[resolveInheritedMethodCalls] Resolved "${ref.name}" in ${fileUri} ` +
              `to inherited method in ${resolved.fileUri ?? 'unknown'}`,
          );
          yield* Effect.yieldNow();
        }
      }
    });
  }

  /**
   * Search for a method with the given name in the superclass chain.
   * Uses the global symbol graph so it works across files.
   * @param methodName The unqualified method name to find
   * @param superClassName The immediate superclass name to start from
   * @param visited Guard against circular inheritance
   */
  private async findMethodInSuperclassChain(
    methodName: string,
    superClassName: string,
    visited: Set<string> = new Set(),
  ): Promise<ApexSymbol | null> {
    if (visited.has(superClassName)) return null;
    visited.add(superClassName);

    // Locate the superclass in the global symbol graph
    const superClassCandidates = await this.findSymbolByName(superClassName);
    const superClass = superClassCandidates.find(
      (s) => s.kind === SymbolKind.Class,
    ) as TypeSymbol | undefined;
    if (!superClass?.fileUri) return null;

    const superTable = this.symbolRefManager.getSymbolTableForFile(
      superClass.fileUri,
    );
    if (!superTable) return null;

    const superSymbols = superTable.getAllSymbols();

    // Find the class block inside the superclass
    const superClassBlock = superSymbols.find(
      (s) =>
        isBlockSymbol(s) &&
        (s as any).scopeType === 'class' &&
        s.parentId === superClass.id,
    );
    if (!superClassBlock) return null;

    // Look for the method directly under the class block
    const method = superSymbols.find(
      (s) =>
        s.name === methodName &&
        s.kind === SymbolKind.Method &&
        s.parentId === superClassBlock.id,
    );
    if (method) return method;

    // Recurse into the superclass's own superclass
    if (superClass.superClass) {
      return await this.findMethodInSuperclassChain(
        methodName,
        superClass.superClass,
        visited,
      );
    }

    return null;
  }

  /**
   * Process type references from a SymbolTable and add them to the symbol graph (Effect-based)
   * @param symbolTable The symbol table containing type references
   * @param fileUri The file path where the references were found
   */
  private processSymbolReferencesToGraphEffect(
    symbolTable: SymbolTable,
    fileUri: string,
  ): Effect.Effect<void, never, never> {
    const self = this;
    return Effect.gen(function* () {
      try {
        const typeReferences = symbolTable.getAllReferences();

        // Process references in batches with yields to prevent blocking
        const batchSize = self.initialReferenceBatchSize;
        for (let i = 0; i < typeReferences.length; i += batchSize) {
          const batch = typeReferences.slice(i, i + batchSize);

          // Process batch
          for (const typeRef of batch) {
            yield* self.processSymbolReferenceToGraphEffect(
              typeRef,
              fileUri,
              symbolTable,
            );
          }

          // Yield after each batch (except the last) to allow other tasks to run
          if (i + batchSize < typeReferences.length) {
            yield* Effect.yieldNow();
          }
        }
      } catch (error) {
        self.logger.error(
          () => `Error processing type references for ${fileUri}: ${error}`,
        );
      }
    });
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
    return Effect.runPromise(
      this.processSymbolReferenceToGraphEffect(typeRef, fileUri, symbolTable),
    );
  }

  /**
   * Process a single type reference and add it to the symbol graph (Effect-based)
   * @param typeRef The type reference to process
   * @param fileUri The file path where the reference was found
   * @param symbolTable The symbol table for the current file (to check for same-file symbols)
   */
  private processSymbolReferenceToGraphEffect(
    typeRef: SymbolReference,
    fileUri: string,
    symbolTable: SymbolTable,
  ): Effect.Effect<void, never, never> {
    const self = this;
    return Effect.gen(function* () {
      try {
        // Skip LITERAL references - they don't represent symbol relationships
        // They're tracked for semantic analysis but shouldn't create graph edges
        if (typeRef.context === ReferenceContext.LITERAL) {
          return;
        }

        // Check if this is a cross-file reference BEFORE trying to resolve
        // This prevents recursive cascades when processing standard library classes
        const qualifierInfo = self.extractQualifierFromChain(typeRef);
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

        // If it's a cross-file reference, try to resolve it first if the artifact is already loaded
        // Only defer if resolution fails (artifact not loaded yet)
        if (isCrossFileReference) {
          // Try to resolve the cross-file reference first
          // This handles cases where artifacts were loaded via artifact loading before cross-file resolution runs
          let targetSymbol: ApexSymbol | null = null;

          // For TYPE_DECLARATION and CONSTRUCTOR_CALL, try to find the type in symbol manager
          if (
            typeRef.context === ReferenceContext.TYPE_DECLARATION ||
            typeRef.context === ReferenceContext.CONSTRUCTOR_CALL
          ) {
            const symbols = yield* Effect.promise(() =>
              self.findSymbolByName(typeRef.name),
            );
            targetSymbol =
              symbols.find(
                (s) =>
                  s.kind === SymbolKind.Class ||
                  s.kind === SymbolKind.Interface ||
                  s.kind === SymbolKind.Enum,
              ) || null;
          } else {
            // For METHOD_CALL and FIELD_ACCESS: use Jorje-style resolution for qualifier
            // (e.g. Test.setMock -> System.Test, not Canvas.Test in default namespace)
            const qualifierInfo = self.extractQualifierFromChain(typeRef);
            const hasValidatedQualifiedCall =
              qualifierInfo?.isQualified === true &&
              qualifierInfo.member === typeRef.name;
            const qualifier = hasValidatedQualifiedCall
              ? qualifierInfo!.qualifier
              : null;

            if (qualifier) {
              // First check if qualifier is a variable/field/parameter (instance call)
              // Only resolve as type if it's NOT a variable
              const allSymbols = symbolTable.getAllSymbols();
              const qualifierAsVariable = allSymbols.find(
                (s) =>
                  (s.kind === SymbolKind.Variable ||
                    s.kind === SymbolKind.Field ||
                    s.kind === SymbolKind.Parameter) &&
                  s.name === qualifier,
              );

              // If qualifier is a variable, this is an instance call (not static)
              if (qualifierAsVariable) {
                // Don't set isStatic - it's an instance call
                // Continue to resolve the method on the variable's type
              } else {
                // Qualifier is not a variable - try to resolve as type
                const containingClass = symbolTable
                  .getAllSymbols()
                  .find(inTypeSymbolGroup) as TypeSymbol | undefined;

                if (containingClass) {
                  const rawNs = containingClass.namespace;
                  const ns =
                    rawNs != null
                      ? typeof rawNs === 'string'
                        ? Namespaces.create(rawNs)
                        : rawNs
                      : null;
                  const nsStr =
                    ns != null
                      ? typeof ns === 'string'
                        ? ns
                        : (ns.getGlobal?.() ?? ns.toString?.() ?? '')
                      : '';
                  const fqnCandidates = getImplicitQualifiedCandidates(
                    qualifier,
                    nsStr || null,
                  );
                  for (const fqn of fqnCandidates) {
                    if (
                      !(yield* Effect.promise(() => self.findSymbolByFQN(fqn)))
                    ) {
                      yield* Effect.promise(() =>
                        self.resolveStandardApexClass(fqn),
                      );
                    }
                  }
                  const compilationContext: CompilationContext = {
                    namespace: ns,
                    version: DEFAULT_SALESFORCE_API_VERSION,
                    isTrusted: true,
                    sourceType: 'FILE',
                    referencingType: containingClass,
                    enclosingTypes: [],
                    parentTypes: [],
                    isStaticContext: true,
                    currentSymbolTable: symbolTable,
                  };
                  const resolutionResult = yield* Effect.promise(() =>
                    resolveTypeName(
                      [qualifier],
                      compilationContext,
                      ReferenceTypeEnum.METHOD,
                      IdentifierContext.NONE,
                      self,
                    ),
                  );
                  if (
                    resolutionResult.isResolved &&
                    resolutionResult.symbol &&
                    (resolutionResult.symbol.kind === SymbolKind.Class ||
                      resolutionResult.symbol.kind === SymbolKind.Interface)
                  ) {
                    targetSymbol = resolutionResult.symbol;
                    // Qualifier resolved to a type (Class/Interface) and is NOT a variable = static call
                    // Set isStatic on the reference so validators can use it
                    typeRef.isStatic = true;
                    if (
                      isChainedSymbolReference(typeRef) &&
                      typeRef.chainNodes?.[0]
                    ) {
                      typeRef.chainNodes[0].resolvedSymbolId = targetSymbol.id;
                    }
                  }
                }
              }
            }

            if (!targetSymbol) {
              const symbols = yield* Effect.promise(() =>
                self.findSymbolByName(typeRef.name),
              );
              if (symbols.length > 0) {
                targetSymbol = symbols[0];
              }
            }
          }

          // If we found the target symbol, resolve it immediately
          if (targetSymbol) {
            // Update resolvedSymbolId
            typeRef.resolvedSymbolId = targetSymbol.id;

            // Find source symbol for graph edge
            const properUri = createFileUri(fileUri);
            const normalizedUri = extractFilePathFromUri(properUri);
            let sourceSymbol = yield* Effect.promise(() =>
              self.findContainingSymbolForReference(typeRef, normalizedUri),
            );
            if (!sourceSymbol) {
              // Fallback: Try to find the class symbol in the file
              const symbolsInFile = yield* Effect.promise(() =>
                self.findSymbolsInFile(normalizedUri),
              );
              sourceSymbol = symbolsInFile.find(inTypeSymbolGroup) || null;
            }

            // Add reference to graph if both symbols found
            if (sourceSymbol && targetSymbol) {
              const sourceSymbolsInGraph =
                self.symbolRefManager.findSymbolByName(sourceSymbol.name);
              const targetSymbolsInGraph =
                self.symbolRefManager.findSymbolByName(targetSymbol.name);
              const sourceUri = sourceSymbol.fileUri;
              const targetUri = targetSymbol.fileUri;

              const sourceInGraph = sourceUri
                ? sourceSymbolsInGraph.find((s) => s.fileUri === sourceUri)
                : sourceSymbolsInGraph[0];

              const targetInGraph = targetUri
                ? targetSymbolsInGraph.find((s) => s.fileUri === targetUri)
                : targetSymbolsInGraph[0];

              if (sourceInGraph && targetInGraph) {
                const referenceType = self.mapReferenceContextToType(
                  typeRef.context,
                );
                const isStatic = yield* self.isStaticReferenceEffect(typeRef);
                self.symbolRefManager.addReference(
                  sourceInGraph,
                  targetInGraph,
                  referenceType,
                  typeRef.location,
                  {
                    methodName: typeRef.parentContext,
                    isStatic: isStatic,
                  },
                );
                return; // Successfully resolved and added to graph
              }
            }
          }

          // If resolution failed (artifact not loaded), defer for later
          // For cross-file references, we still need a source symbol for deferral
          const properUri = createFileUri(fileUri);
          const normalizedUri = extractFilePathFromUri(properUri);
          let sourceSymbol = yield* Effect.promise(() =>
            self.findContainingSymbolForReference(typeRef, normalizedUri),
          );
          if (!sourceSymbol) {
            // Fallback: Try to find the class symbol in the file
            const symbolsInFile = yield* Effect.promise(() =>
              self.findSymbolsInFile(normalizedUri),
            );
            sourceSymbol = symbolsInFile.find(inTypeSymbolGroup) || null;
          }

          if (sourceSymbol) {
            const referenceType = self.mapReferenceContextToType(
              typeRef.context,
            );
            const isStatic = yield* self.isStaticReferenceEffect(typeRef);
            self.symbolRefManager.enqueueDeferredReference(
              sourceSymbol,
              typeRef.name,
              referenceType,
              typeRef.location,
              {
                methodName: typeRef.parentContext,
                isStatic: isStatic,
              },
            );
          }
          return;
        }

        // At this point, we know the reference is to a symbol in the same file (Set A)
        // Optimize: Resolve both source and target from SymbolTable directly
        // This is deterministic since symbol collection is complete

        // 1. Resolve source symbol from SymbolTable (handles blocks by finding containing method/class)
        const sourceSymbol = self.findContainingSymbolFromSymbolTable(
          typeRef,
          symbolTable,
        );
        if (!sourceSymbol) {
          // Can't resolve source symbol - skip this reference
          self.logger.debug(
            () =>
              `Skipping type reference ${typeRef.name}: could not resolve source symbol from SymbolTable`,
          );
          return;
        }

        // 2. Resolve target symbol - check if already resolved by listener second-pass first
        let targetSymbol: ApexSymbol | null = null;
        if (typeRef.resolvedSymbolId) {
          // Fast path: use pre-resolved symbol ID from listener second-pass
          const resolvedId = typeRef.resolvedSymbolId;
          targetSymbol = yield* Effect.promise(() =>
            self.getSymbol(resolvedId),
          );
          if (targetSymbol) {
            self.logger.debug(
              () =>
                `Using pre-resolved symbol ID "${typeRef.resolvedSymbolId}" ` +
                `for reference "${typeRef.name}" in graph processing`,
            );
          }
        }

        // Fall back to normal resolution if not already resolved
        if (!targetSymbol) {
          targetSymbol = yield* Effect.tryPromise({
            try: () =>
              self.findTargetSymbolForReference(
                typeRef,
                fileUri,
                sourceSymbol,
                symbolTable,
              ),
            catch: (error) => error as Error,
          }).pipe(Effect.catchAll(() => Effect.succeed(null)));
          if (targetSymbol) {
            // Update resolvedSymbolId if not already set
            typeRef.resolvedSymbolId = targetSymbol.id;
          }
        }

        if (!targetSymbol) {
          // Same-file reference couldn't be resolved
          // This shouldn't happen if second-pass resolution worked correctly,
          // but if it does, skip it rather than deferring (deferring won't help for same-file refs)
          // Only cross-file references should be deferred, as they may be resolved when the target file is loaded
          self.logger.debug(
            () =>
              `Skipping unresolved same-file reference ${typeRef.name} in ${fileUri} ` +
              'during on-demand resolution (should have been resolved during second-pass)',
          );
          return; // Skip, don't defer
        }

        // At this point, targetSymbol is guaranteed to be non-null
        const resolvedTargetSymbol = targetSymbol;

        // Skip creating edges for declaration references; they are not dependencies
        // Note: VARIABLE_DECLARATION and PROPERTY_REFERENCE references are still marked as resolved above
        // since we successfully found the target symbol, even though we don't add them to the graph
        // These are for editor UX (hover, go-to-definition) and don't represent actual dependencies
        if (
          typeRef.context === ReferenceContext.VARIABLE_DECLARATION ||
          typeRef.context === ReferenceContext.PROPERTY_REFERENCE
        ) {
          return;
        }

        // 3. Add to graph directly (symbols are already in graph from addSymbolTable)
        // Get symbols from graph to ensure we use the exact instances stored there
        const sourceSymbolsInGraph = self.symbolRefManager.findSymbolByName(
          sourceSymbol.name,
        );
        const targetSymbolsInGraph = self.symbolRefManager.findSymbolByName(
          resolvedTargetSymbol.name,
        );

        const sourceInGraph = sourceSymbol.fileUri
          ? sourceSymbolsInGraph.find((s) => s.fileUri === sourceSymbol.fileUri)
          : sourceSymbolsInGraph[0];

        const targetInGraph = resolvedTargetSymbol.fileUri
          ? targetSymbolsInGraph.find(
              (s) => s.fileUri === resolvedTargetSymbol.fileUri,
            )
          : targetSymbolsInGraph[0];

        // Symbols should be in graph since addSymbolTable runs before processSymbolReferencesToGraph
        // If they're not, queue for when they are added (rare edge case)
        if (!sourceInGraph || !targetInGraph) {
          const referenceType = self.mapReferenceContextToType(typeRef.context);
          const isStatic = yield* self.isStaticReferenceEffect(typeRef);
          self.symbolRefManager.enqueueDeferredReference(
            sourceSymbol,
            resolvedTargetSymbol.name,
            referenceType,
            typeRef.location,
            {
              methodName: typeRef.parentContext,
              isStatic: isStatic,
            },
          );
          return;
        }

        // Map ReferenceContext to ReferenceType
        const referenceType = self.mapReferenceContextToType(typeRef.context);

        // Add the reference to the symbol graph using symbols from the graph
        // This is deterministic for same-file references since both symbols are resolved from SymbolTable
        const isStatic = yield* self.isStaticReferenceEffect(typeRef);
        self.symbolRefManager.addReference(
          sourceInGraph,
          targetInGraph,
          referenceType,
          typeRef.location,
          {
            methodName: typeRef.parentContext,
            isStatic: isStatic,
          },
        );
      } catch (error) {
        self.logger.error(
          () => `Error processing type reference ${typeRef.name}: ${error}`,
        );
      }
    });
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
    const symbolsInFile = await this.findSymbolsInFile(fileUri);
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
    return containingSymFromST(typeRef, symbolTable);
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
    qualifiedResolutionCache?: HashMap<string, ApexSymbol | null>,
    memberResolutionCache?: HashMap<string, ApexSymbol | null>,
    resolverStats?: ResolverStats,
  ): Promise<ApexSymbol | null> {
    return findTargetSymForRefOp(
      this as unknown as SymbolManagerOps,
      typeRef,
      fileUri,
      sourceSymbol,
      symbolTable,
      qualifiedResolutionCache,
      memberResolutionCache,
      resolverStats,
    );
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
    symbolTable?: SymbolTable,
    qualifiedResolutionCache?: HashMap<string, ApexSymbol | null>,
    memberResolutionCache?: HashMap<string, ApexSymbol | null>,
    resolverStats?: ResolverStats,
  ): Promise<ApexSymbol | null> {
    return resolveQualRefFromChainOp(
      this as unknown as SymbolManagerOps,
      qualifier,
      member,
      context,
      fileUri,
      sourceSymbol,
      originalTypeRef,
      symbolTable,
      qualifiedResolutionCache,
      memberResolutionCache,
      resolverStats,
    );
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
    return extractQualFromChainOp(typeRef);
  }

  private normalizeTypeNameForLookup(typeName: string): string {
    return normalizeTypeNameOp(typeName);
  }

  private buildTypeLookupCandidates(typeName: string): string[] {
    return buildTypeCandidatesOp(typeName);
  }

  private async resolvePreferredTypeSymbolForLookup(
    rawTypeName: string,
    fileUri?: string,
    symbolTable?: SymbolTable,
  ): Promise<ApexSymbol | null> {
    return resolvePreferredTypeOp(
      this as unknown as SymbolManagerOps,
      rawTypeName,
      fileUri,
      symbolTable,
    );
  }

  /**
   * Determine if a reference is static based on its context
   * @param typeRef The type reference
   * @returns True if the reference is static
   */
  private async isStaticReference(typeRef: SymbolReference): Promise<boolean> {
    return isStaticRefOp(this as unknown as SymbolManagerOps, typeRef);
  }

  /**
   * Compute whether a reference is static (Effect-based with caching)
   * @param typeRef The type reference
   * @returns Effect that resolves to true if the reference is static
   */
  private isStaticReferenceEffect(
    typeRef: SymbolReference,
  ): Effect.Effect<boolean, never, never> {
    const self = this;
    return Effect.gen(function* () {
      // Check cache first
      const cached = self.isStaticCache.get(typeRef);
      if (cached !== undefined) {
        return cached;
      }

      // Compute result
      const result = yield* self.computeIsStaticReferenceEffect(typeRef);

      // Store in cache
      self.isStaticCache.set(typeRef, result);
      return result;
    });
  }

  /**
   * Compute whether a reference is static (internal implementation)
   * @param typeRef The type reference
   * @returns True if the reference is static
   */
  private async computeIsStaticReference(
    typeRef: SymbolReference,
  ): Promise<boolean> {
    return computeIsStaticRefOp(this as unknown as SymbolManagerOps, typeRef);
  }

  /**
   * Compute whether a reference is static (Effect-based internal implementation)
   * @param typeRef The type reference
   * @returns Effect that resolves to true if the reference is static
   */
  private computeIsStaticReferenceEffect(
    typeRef: SymbolReference,
  ): Effect.Effect<boolean, never, never> {
    const self = this;
    return Effect.gen(function* () {
      // If isStatic was already determined during enrichment, use it
      if (typeRef.isStatic !== undefined) {
        return typeRef.isStatic;
      }

      // Check if this is a qualified reference (which is typically static)
      const qualifierInfo = self.extractQualifierFromChain(typeRef);
      if (qualifierInfo && qualifierInfo.isQualified) {
        // For qualified references like "System.debug", check if the qualifier is a class or interface
        const qualifierSymbols = yield* Effect.promise(() =>
          self.findSymbolByName(qualifierInfo.qualifier),
        );
        if (qualifierSymbols.length > 0) {
          const qualifierSymbol = qualifierSymbols[0];
          return (
            qualifierSymbol.kind === SymbolKind.Class ||
            qualifierSymbol.kind === SymbolKind.Interface
          );
        }

        // Also check if it's a built-in type (which are typically static)
        // Extract qualifier node from chain if available
        let qualifierRef: SymbolReference;
        if (
          isChainedSymbolReference(typeRef) &&
          typeRef.chainNodes.length >= 2
        ) {
          // Use the qualifier node from the chain
          qualifierRef = typeRef.chainNodes[0];
        } else {
          // Create a minimal SymbolReference for the qualifier string
          qualifierRef = {
            name: qualifierInfo.qualifier,
            context: ReferenceContext.NAMESPACE,
            location: typeRef.location,
            resolvedSymbolId: undefined,
          };
        }
        const builtInQualifier = yield* Effect.tryPromise({
          try: () => self.resolveStandardLibraryType(qualifierRef),
          catch: (error) => error as Error,
        }).pipe(Effect.catchAll(() => Effect.succeed(null)));
        if (builtInQualifier) {
          return true;
        }
      }

      return false;
    });
  }

  /**
   * Get all SymbolReference data for a file
   * @param fileUri The file path to get references for
   * @returns Array of all SymbolReference objects in the file
   */
  async getAllReferencesInFile(fileUri: string): Promise<SymbolReference[]> {
    try {
      const symbolTable = this.symbolRefManager.getSymbolTableForFile(fileUri);

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
    return resolveUnqualRefByScopeOp(
      this as unknown as SymbolManagerOps,
      typeReference,
      sourceFile,
      position,
    );
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
    return resolveSymRefToSymOp(
      this as unknown as SymbolManagerOps,
      typeReference,
      sourceFile,
      position,
    );
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
    return isSymAccessibleOp(symbol, sourceFile);
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
    return selectMostSpecificOp(candidates, sourceFile);
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
    return isValidSymRefNameOp(name);
  }

  private async resolveStandardLibraryType(
    typeRef: SymbolReference,
  ): Promise<ApexSymbol | null> {
    return resolveStdLibTypeOp(this as unknown as SymbolManagerOps, typeRef);
  }

  /**
   * Check if a name represents a valid namespace
   * @param name The name to check
   * @returns True if the name represents a valid namespace
   */
  private async isValidNamespace(name: string): Promise<boolean> {
    return isValidNsOp(this as unknown as SymbolManagerOps, name);
  }

  /**
   * Resolve a namespace by name
   * @param name The name of the namespace to resolve
   * @returns The resolved namespace symbol or null if not found
   */
  private async resolveNamespace(name: string): Promise<ApexSymbol | null> {
    try {
      // Check if this is a standard Apex namespace (System, Database, Schema, etc.)
      if (this.isStandardApexClass(name)) {
        return null; // Namespace identified but no symbol to return
      }

      // Check if this is a user-defined namespace
      const namespaceSymbols = await this.findSymbolsInNamespace(name);
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
    return evolveCtxAfterResOp(
      this as unknown as SymbolManagerOps,
      step,
      newContext,
      resolutionStrategy,
    );
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
    return selectBestMemberOp(
      this as unknown as SymbolManagerOps,
      candidates,
      context,
    );
  }

  /**
   * Ensure class symbols are loaded for standard Apex classes
   * @param classSymbol The class symbol to ensure is loaded
   */
  private async ensureClassSymbolsLoaded(
    classSymbol: ApexSymbol,
  ): Promise<void> {
    return ensureClassSymsOp(this as unknown as SymbolManagerOps, classSymbol);
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
    return selectBestQualOp(
      this as unknown as SymbolManagerOps,
      candidates,
      sourceFile,
    );
  }

  async getScopesInFile(fileUri: string): Promise<string[]> {
    const symbols = await this.findSymbolsInFile(fileUri);
    const scopes = new Set<string>();

    symbols.forEach((symbol) => {
      if (symbol.key && symbol.key.path) {
        scopes.add(symbol.key.path.join('.'));
      }
    });

    return Array.from(scopes);
  }

  async findSymbolsInScope(
    scopeName: string,
    fileUri: string,
  ): Promise<ApexSymbol[]> {
    const symbols = await this.findSymbolsInFile(fileUri);
    return symbols.filter((symbol) => {
      if (symbol.key && symbol.key.path) {
        return symbol.key.path.join('.').includes(scopeName);
      }
      return false;
    });
  }

  async refresh(symbolTable: any): Promise<void> {
    // Clear existing data and reload from symbol table
    await this.clear();
    await Effect.runPromise(this.addSymbolTable(symbolTable, 'refreshed'));
  }

  // Performance Monitoring
  resetPerformanceMetrics(): void {
    this.unifiedCache.clear();
    this.memoryStats.lastCleanup = Date.now();
  }

  // Estimate usage including symbols and cache entries
  getMemoryUsage(): MemoryUsageStats {
    const cacheStats = this.unifiedCache.getStats();
    const estimatedMemoryUsage =
      this.memoryStats.totalSymbols * 1024 + cacheStats.totalEntries * 256;
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
        totalReferences: this.symbolRefManager.getStats().totalReferences,
        activeReferences: this.symbolRefManager.getStats().totalReferences,
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
  private async determineLifecycleStage(
    symbol: ApexSymbol,
  ): Promise<'active' | 'deprecated' | 'legacy' | 'experimental'> {
    // Simplified implementation - return 'legacy' for symbols with no references
    const references = await this.findReferencesTo(symbol);
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
  private async computeCouplingScore(symbol: ApexSymbol): Promise<number> {
    const dependencies = await this.analyzeDependencies(symbol);
    return dependencies.dependencies.length + dependencies.dependents.length;
  }

  // TODO: replace with accurate change impact radius computation
  private async computeChangeImpactRadius(symbol: ApexSymbol): Promise<number> {
    const impact = await this.getImpactAnalysis(symbol);
    return impact.directImpact.length + impact.indirectImpact.length;
  }

  // TODO: replace with accurate refactoring risk computation
  private async computeRefactoringRisk(symbol: ApexSymbol): Promise<number> {
    const impact = await this.getImpactAnalysis(symbol);
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
  public async createChainResolutionContext(
    documentText: string,
    position: Position,
    fileUri: string,
  ): Promise<SymbolResolutionContext> {
    // Get symbol table for the file to extract context information
    const symbolsInFile = await this.findSymbolsInFile(fileUri);

    // Find the symbol at the current position to determine context
    const symbolAtPosition = await this.findSymbolAtPositionSync(
      fileUri,
      position,
    );

    // If no symbols are loaded, fall back to text-based context extraction
    if (symbolsInFile.length === 0) {
      return this.createFallbackChainResolutionContext(
        documentText,
        position,
        fileUri,
      );
    }

    // Extract namespace context from file path or symbol information
    const namespaceContext = await this.extractNamespaceFromFile(fileUri);

    // Determine current scope based on containing symbol
    const currentScope = this.determineScopeFromSymbol(symbolAtPosition);

    // Build scope chain from the containing symbol hierarchy
    const scopeChain = await this.buildScopeChainFromSymbol(symbolAtPosition);

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

  private createFallbackChainResolutionContext(
    documentText: string,
    position: Position,
    fileUri: string,
  ): SymbolResolutionContext {
    return fallbackChainResCtx(documentText, position, fileUri);
  }

  private extractNamespaceFromText(line: string): string {
    return nsFromTextLine(line);
  }

  private determineScopeFromText(line: string): string {
    return scopeFromTextLine(line);
  }

  private extractAccessModifierFromText(
    line: string,
  ): 'public' | 'private' | 'protected' | 'global' {
    return accessModFromTextLine(line);
  }

  private extractIsStaticFromText(line: string): boolean {
    return isStaticFromTextLine(line);
  }

  /**
   * Find symbol at position synchronously (for context extraction)
   */
  private async findSymbolAtPositionSync(
    fileUri: string,
    position: Position,
  ): Promise<ApexSymbol | null> {
    const symbolsInFile = await this.findSymbolsInFile(fileUri);

    // Find the most specific symbol that contains this position
    for (const symbol of symbolsInFile) {
      if (this.isPositionWithinSymbol(symbol, position)) {
        return symbol;
      }
    }

    return null;
  }

  private isPositionWithinSymbol(
    symbol: ApexSymbol,
    position: Position,
  ): boolean {
    return posIsWithinSymbol(symbol, position);
  }

  /**
   * Extract namespace from SymbolTable and symbols in the file
   */
  private async extractNamespaceFromFile(fileUri: string): Promise<string> {
    // Get the SymbolTable for this file
    const symbolTable = this.symbolRefManager.getSymbolTableForFile(fileUri);
    if (!symbolTable) {
      return '';
    }

    // Get all symbols in the file to find namespace information
    const symbolsInFile = await this.findSymbolsInFile(fileUri);

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

  private determineScopeFromSymbol(symbol: ApexSymbol | null): string {
    return scopeFromSymbol(symbol);
  }

  /**
   * Build scope chain from symbol hierarchy
   */
  private async buildScopeChainFromSymbol(
    symbol: ApexSymbol | null,
  ): Promise<string[]> {
    if (!symbol) return ['global'];

    const scopeChain: string[] = [];
    let currentSymbol: ApexSymbol | null = symbol;

    // Walk up the symbol hierarchy
    while (currentSymbol) {
      const scope = this.determineScopeFromSymbol(currentSymbol);
      scopeChain.unshift(scope);

      // Get parent symbol
      currentSymbol = await this.getContainingType(currentSymbol);
    }

    // Always end with global scope
    if (scopeChain[scopeChain.length - 1] !== 'global') {
      scopeChain.push('global');
    }

    return scopeChain;
  }

  private extractInheritanceFromSymbols(symbols: ApexSymbol[]): string[] {
    return inheritanceFromSymbols(symbols);
  }

  private extractInterfaceImplementationsFromSymbols(
    symbols: ApexSymbol[],
  ): string[] {
    return interfacesFromSymbols(symbols);
  }

  private extractAccessModifierFromSymbol(
    symbol: ApexSymbol | null,
  ): 'public' | 'private' | 'protected' | 'global' {
    return accessModFromSymbol(symbol);
  }

  private extractIsStaticFromSymbol(symbol: ApexSymbol | null): boolean {
    return isStaticFromSymbol(symbol);
  }

  /**
   * Construct fully qualified name for a symbol using hierarchical relationships
   * @param symbol The symbol to construct FQN for
   * @param options Options for FQN generation
   * @returns The fully qualified name
   */
  public async constructFQN(
    symbol: ApexSymbol,
    options?: FQNOptions,
  ): Promise<string> {
    return calculateFQN(symbol, options, (parentId) =>
      this.symbolRefManager.getSymbol(parentId),
    );
  }

  /**
   * Get the immediate containing type (class, interface, enum) for a symbol
   * @param symbol The symbol to find the containing type for
   * @returns The containing type symbol or null if not found
   */
  public async getContainingType(
    symbol: ApexSymbol,
  ): Promise<ApexSymbol | null> {
    // Find the immediate parent that is a type (class, interface, enum)
    let current = this.symbolRefManager.getParent(symbol);
    while (current) {
      if (
        current.kind === SymbolKind.Class ||
        current.kind === SymbolKind.Interface ||
        current.kind === SymbolKind.Enum
      ) {
        return current;
      }
      current = this.symbolRefManager.getParent(current);
    }
    return null;
  }

  /**
   * Get the full chain of ancestor types for a symbol
   * @param symbol The symbol to get ancestors for
   * @returns Array of ancestor symbols from top-level to closest parent
   */
  public async getAncestorChain(symbol: ApexSymbol): Promise<ApexSymbol[]> {
    return getAncestorChain(symbol);
  }

  // SymbolProvider implementation methods
  async find(
    referencingType: ApexSymbol,
    fullName: string,
  ): Promise<ApexSymbol | null> {
    // Try to find by FQN first
    const symbol = await this.findSymbolByFQN(fullName);
    if (symbol) return symbol;

    // Namespace-aware fallback: resolve "Namespace.Type" by type name + namespace.
    if (fullName.includes('.')) {
      const [namespace, typeName] = fullName.split('.', 2);
      const byName = await this.findSymbolByName(typeName);
      const namespaceCandidates = byName.filter((candidate) => {
        const candidateNamespace =
          typeof candidate.namespace === 'string'
            ? candidate.namespace
            : (candidate.namespace?.toString?.() ?? '');
        return candidateNamespace.toLowerCase() === namespace.toLowerCase();
      });
      const namespaceTypeMatch = namespaceCandidates.find(
        (candidate) =>
          candidate.kind === SymbolKind.Class ||
          candidate.kind === SymbolKind.Interface ||
          candidate.kind === SymbolKind.Enum ||
          candidate.kind === SymbolKind.Trigger,
      );
      if (namespaceTypeMatch) {
        return namespaceTypeMatch;
      }
      if (namespaceCandidates.length > 0) {
        return namespaceCandidates[0];
      }

      // Last fallback: hydrate from stdlib provider.
      if (this.stdlibProvider.isStdApexNamespace(namespace)) {
        const stdlibTable = await this.stdlibProvider.getSymbolTable(
          `${namespace}/${typeName}.cls`,
        );
        const classSymbol = stdlibTable
          ?.getAllSymbols()
          .find(
            (candidate) =>
              candidate.kind === SymbolKind.Class &&
              candidate.name.toLowerCase() === typeName.toLowerCase(),
          );
        if (classSymbol) {
          return classSymbol;
        }
      }
    }

    // Try to find by name
    const symbols = await this.findSymbolByName(fullName);
    return symbols.length > 0 ? symbols[0] : null;
  }

  async findScalarKeywordType(name: string): Promise<ApexSymbol | null> {
    return this.builtInTypeTables.findType(name.toLowerCase());
  }

  async findSObjectType(name: string): Promise<ApexSymbol | null> {
    const symbols = await this.findSymbolByName(name);
    return (
      symbols.find((s) => s.kind === 'class' && s.namespace === 'SObject') ||
      null
    );
  }

  async findExternalType(
    name: string,
    packageName: string,
  ): Promise<ApexSymbol | null> {
    const symbols = await this.findSymbolByName(name);
    return symbols.find((s) => s.namespace === packageName) || null;
  }

  async findInDefaultNamespaceOrder(
    name: string,
    referencingType: ApexSymbol,
  ): Promise<ApexSymbol | null> {
    const namespaces = ['System', 'Schema'];
    for (const namespaceName of namespaces) {
      const symbol = await this.findInExplicitNamespace(
        namespaceName,
        name,
        referencingType,
      );
      if (symbol) return symbol;
    }
    return null;
  }

  async findInImplicitFileNamespaceSlot(
    name: string,
    slot: number,
    referencingType: ApexSymbol,
  ): Promise<ApexSymbol | null> {
    const namespaces = ['System', 'Schema'];
    const namespaceName = namespaces[slot];
    if (!namespaceName) return null;
    return await this.findInExplicitNamespace(
      namespaceName,
      name,
      referencingType,
    );
  }

  async findInExplicitNamespace(
    namespaceName: string,
    typeName: string,
    referencingType: ApexSymbol,
  ): Promise<ApexSymbol | null> {
    const normalizedNamespace = namespaceName.toLowerCase();
    const fqn = `${normalizedNamespace}.${typeName}`;
    return (
      (await this.find(referencingType, fqn)) ??
      (await this.findScalarKeywordType(fqn)) ??
      null
    );
  }

  async isBuiltInNamespace(namespaceName: string): Promise<boolean> {
    if (!namespaceName) return false;
    if (this.stdlibProvider.isStdApexNamespace(namespaceName)) return true;
    const normalized = namespaceName.toLowerCase();
    return normalized === 'system' || normalized === 'schema';
  }

  async isSObjectContainerNamespace(namespaceName: string): Promise<boolean> {
    return namespaceName.toLowerCase() === 'schema';
  }

  /**
   * Find type in standard namespaces, excluding policy-prioritized implicit namespaces.
   * Used by BuiltInMethodNamespace after implicit namespace attempts.
   */
  async findInAnyStandardNamespace(
    name: string,
    referencingType: ApexSymbol,
  ): Promise<ApexSymbol | null> {
    const namespaces = this.stdlibProvider.findNamespaceForClass(name);
    if (!namespaces || namespaces.size === 0) return null;
    const namespaceOrder: string[] = [];
    const seen = new Set<string>();
    const push = (ns: string): void => {
      const key = ns.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      namespaceOrder.push(ns);
    };

    for (const policyNs of getImplicitNamespaceOrder()) {
      for (const candidate of namespaces) {
        if (candidate.toLowerCase() === policyNs.toLowerCase()) {
          push(candidate);
        }
      }
    }

    for (const ns of namespaces) {
      if (!isPrimaryImplicitNamespace(ns)) {
        push(ns);
      }
    }

    for (const ns of namespaceOrder) {
      const symbol = await this.find(referencingType, `${ns}.${name}`);
      if (symbol) {
        return symbol;
      }
    }
    return null;
  }

  /**
   * Check if a class name represents a standard Apex class
   * @param name The class name to check (e.g., 'System.Assert', 'Database.Batchable', 'Assert')
   * @returns true if it's a standard Apex class, false otherwise
   */
  public isStandardApexClass(name: string): boolean {
    return isStandardApexClassOp(this as unknown as SymbolManagerOps, name);
  }

  /**
   * Check if a type name represents a standard library type
   * This is useful for filtering out types that don't need artifact loading
   * @param name The type name to check (e.g., 'String', 'System', 'System.Assert', 'Foo')
   * @returns true if it's a standard library type, false otherwise
   */
  public async isStandardLibraryType(name: string): Promise<boolean> {
    // Check if it's a built-in type (String, Integer, etc.)
    const builtInType = await this.findScalarKeywordType(name);
    if (builtInType) {
      return true;
    }

    // Check if it's a standard Apex class (System, Database, System.Assert, etc.)
    return this.isStandardApexClass(name);
  }

  /**
   * Get all available standard Apex class namespaces
   * @returns Array of standard Apex class namespaces
   */
  public getAvailableStandardClasses(): string[] {
    const namespaceStructure = this.stdlibProvider.getStandardNamespaces();
    const availableClasses: string[] = [];

    for (const [namespace, classes] of namespaceStructure.entries()) {
      if (this.stdlibProvider.isStdApexNamespace(namespace)) {
        availableClasses.push(namespace);
        for (const className of classes ?? []) {
          const cleanClassName = className.replace(/\.cls$/, '');
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
  public async findFQNForStandardClass(
    className: string,
  ): Promise<string | null> {
    try {
      return await this.stdlibProvider.resolveClassFqn(className);
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
    return resolveStdApexClassOp(this as unknown as SymbolManagerOps, name);
  }

  private async loadAndRegisterStdlibSymbolTable(
    fileUri: string,
    classPath: string,
  ): Promise<SymbolTable | null> {
    return loadAndRegStdlibSTOp(
      this as unknown as SymbolManagerOps,
      fileUri,
      classPath,
    );
  }

  /**
   * Find the symbol that contains the given reference (the scope)
   * Used for: Reference relationship tracking, Find References From/To
   * @param typeRef The type reference
   * @param fileUri The file path
   * @returns The containing symbol or null if not found
   */
  private async findContainingSymbolForReference(
    typeRef: SymbolReference,
    fileUri: string,
  ): Promise<ApexSymbol | null> {
    // Normalize URI to match how symbols are stored in the graph
    // This ensures consistency with addSymbolTable which uses normalized URIs
    const properUri = createFileUri(fileUri);
    const normalizedUri = extractFilePathFromUri(properUri);

    // Invalidate cache to ensure we get fresh symbols (they were just added)
    this.unifiedCache.invalidatePattern(`file_symbols_${normalizedUri}`);

    // Find symbols in the file and determine which one contains this reference
    const symbolsInFile = await this.findSymbolsInFile(normalizedUri);

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
      const topLevelSymbol = symbolsInFile.find(inTypeSymbolGroup);
      if (topLevelSymbol) {
        return topLevelSymbol;
      }
    }

    return bestMatch;
  }

  private isPositionContainedInSymbol(
    position: Range,
    symbolLocation: SymbolLocation,
  ): boolean {
    return posContainedInSymbol(position, symbolLocation);
  }

  private isPositionInIdentifierRange(
    position: { line: number; character: number },
    identifierRange: {
      startLine: number;
      startColumn: number;
      endLine: number;
      endColumn: number;
    },
  ): boolean {
    return posInIdRange(position, identifierRange);
  }

  private isSymbolContainedWithin(
    innerSymbol: ApexSymbol,
    outerSymbol: ApexSymbol,
  ): boolean {
    return symContainedWithin(innerSymbol, outerSymbol);
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
      // Fast path: Check symbols directly by identifierRange first (for declarations only)
      // This eliminates the need for VARIABLE_DECLARATION references
      // Only match if position is exactly on a declaration identifier (not method calls or chained expressions)
      const symbolsInFile = await this.findSymbolsInFile(fileUri);
      for (const symbol of symbolsInFile) {
        if (
          symbol.location?.identifierRange &&
          this.isPositionInIdentifierRange(
            position,
            symbol.location.identifierRange,
          )
        ) {
          // Check if there are references at this position
          const refsAtPosition = await this.getReferencesAtPosition(
            fileUri,
            position,
          );

          if (refsAtPosition.length === 0) {
            // No references means this is a declaration - return the symbol directly
            return symbol;
          }

          // If there are references, check if any are METHOD_CALL references
          // METHOD_CALL references should be prioritized over variable declarations
          const methodCallRefs = refsAtPosition.filter(
            (ref) => ref.context === ReferenceContext.METHOD_CALL,
          );

          if (methodCallRefs.length > 0) {
            // METHOD_CALL references exist - prioritize resolving them
            // Skip the fast path fallback and continue to main reference resolution logic
            // which handles METHOD_CALL prioritization properly
            break;
          }

          // If there are references but no METHOD_CALL references, try to resolve the first one
          // But if it doesn't resolve to a symbol, fall back to the declaration
          // This handles cases where references exist but don't resolve (e.g., invalid references)
          // and ensures declarations are still accessible via hover (e.g., method names in declarations)
          const resolvedFromRef = await this.resolveSymbolReferenceToSymbol(
            refsAtPosition[0],
            fileUri,
            position,
          );

          if (resolvedFromRef) {
            // Reference resolved to a symbol - use that (for method calls, chained expressions, etc.)
            return resolvedFromRef;
          }

          // References exist but didn't resolve - this is likely a declaration
          // Return the declaration symbol so hover works on method/field names in declarations
          return symbol;
        }
      }

      // Step 1: Try to find SymbolReferences at the exact position
      // (for method calls, chained expressions, type references, etc.)
      const typeReferences = await this.getReferencesAtPosition(
        fileUri,
        position,
      );

      if (typeReferences.length > 0) {
        // Step 2: Prioritize GENERIC_PARAMETER_TYPE and CLASS_REFERENCE references first
        // These should be resolved as classes/types, not variables or methods
        const genericParamRefs = typeReferences.filter(
          (ref) => ref.context === ReferenceContext.GENERIC_PARAMETER_TYPE,
        );
        const classRefs = typeReferences.filter(
          (ref) => ref.context === ReferenceContext.CLASS_REFERENCE,
        );

        // Prefer GENERIC_PARAMETER_TYPE or CLASS_REFERENCE if available and position matches
        let referenceToResolve = typeReferences[0];
        if (genericParamRefs.length > 0 || classRefs.length > 0) {
          const typeRefs = [...genericParamRefs, ...classRefs];
          // Find the type reference that matches the position
          for (const typeRef of typeRefs) {
            const typeLoc = typeRef.location.identifierRange;
            const isWithinIdentifierRange =
              position.line >= typeLoc.startLine &&
              position.line <= typeLoc.endLine &&
              position.character >= typeLoc.startColumn &&
              position.character <= typeLoc.endColumn;
            if (isWithinIdentifierRange) {
              referenceToResolve = typeRef;
              break;
            }
          }
          // If no exact match, use the first type reference as fallback
          if (referenceToResolve === typeReferences[0] && typeRefs.length > 0) {
            referenceToResolve = typeRefs[0];
          }
        }

        // Step 2b: Check for METHOD_CALL references first (before chained reference selection)
        // This ensures method calls are prioritized over chained references that might resolve to variables
        const methodCallRefsEarly = typeReferences.filter(
          (ref) => ref.context === ReferenceContext.METHOD_CALL,
        );
        if (methodCallRefsEarly.length > 0) {
          // Check if any METHOD_CALL reference matches the position exactly
          for (const methodRef of methodCallRefsEarly) {
            const methodLoc = methodRef.location.identifierRange;
            const isExactMatch =
              position.line >= methodLoc.startLine &&
              position.line <= methodLoc.endLine &&
              position.character >= methodLoc.startColumn &&
              position.character <= methodLoc.endColumn;
            if (isExactMatch) {
              // METHOD_CALL matches position - prioritize it (unless we have a type reference)
              if (
                referenceToResolve.context !==
                  ReferenceContext.GENERIC_PARAMETER_TYPE &&
                referenceToResolve.context !== ReferenceContext.CLASS_REFERENCE
              ) {
                referenceToResolve = methodRef;
                // Break early - METHOD_CALL takes precedence
                break;
              }
            }
          }
        }

        // Step 2c: For chained references, find the most specific reference for this position
        // If position is on a specific chain member, prefer references that match that member
        // BUT: Don't override METHOD_CALL, GENERIC_PARAMETER_TYPE or CLASS_REFERENCE if we've already selected one
        const isTypeOrMethodReferenceSelected =
          referenceToResolve.context === ReferenceContext.METHOD_CALL ||
          referenceToResolve.context ===
            ReferenceContext.GENERIC_PARAMETER_TYPE ||
          referenceToResolve.context === ReferenceContext.CLASS_REFERENCE;

        // Prioritize chained references when position matches a chain member
        // This ensures we resolve the correct part of the chain (e.g., "System" in "System.Url")
        const chainedRefs = typeReferences.filter(
          (ref) => isChainedSymbolReference(ref) && ref.chainNodes?.length > 0,
        );

        // Always prefer chained references over non-chained references when available
        // BUT: Don't override METHOD_CALL, GENERIC_PARAMETER_TYPE, or CLASS_REFERENCE if already selected
        if (chainedRefs.length > 0 && !isTypeOrMethodReferenceSelected) {
          // Check each chained reference to find the one that matches the position
          for (const ref of chainedRefs) {
            const chainNodes = (ref as ChainedSymbolReference).chainNodes;
            // Get first node location for CLASS_REFERENCE checking
            const firstNode = chainNodes[0];
            const firstNodeStart = firstNode.location.identifierRange;

            // Check if position is at the start of the chained reference
            const chainedRefStart = ref.location.identifierRange;
            const isAtStartOfChainedRef =
              position.line === chainedRefStart.startLine &&
              position.character === chainedRefStart.startColumn;

            if (isAtStartOfChainedRef) {
              // Position is exactly at the start of the chained reference
              // This means we're on the first node - check if there's a CLASS_REFERENCE
              // that matches this position (prefer it over the chained reference)
              // Check for CLASS_REFERENCE or VARIABLE_USAGE contexts
              // (VARIABLE_USAGE is sometimes incorrectly used for class qualifiers)
              const classRefs = typeReferences.filter(
                (r) =>
                  r.context === ReferenceContext.CLASS_REFERENCE ||
                  r.context === ReferenceContext.VARIABLE_USAGE,
              );
              let foundClassRef = false;
              for (const classRef of classRefs) {
                const classLoc = classRef.location.identifierRange;
                // Check if CLASS_REFERENCE matches the first node's location
                const matchesFirstNode =
                  classLoc.startLine === firstNodeStart.startLine &&
                  classLoc.startColumn === firstNodeStart.startColumn &&
                  classLoc.endColumn === firstNodeStart.endColumn;
                const matchesPosition =
                  position.line >= classLoc.startLine &&
                  position.line <= classLoc.endLine &&
                  position.character >= classLoc.startColumn &&
                  position.character <= classLoc.endColumn;
                if (matchesFirstNode && matchesPosition) {
                  // Mark this reference as needing class resolution even if it's VARIABLE_USAGE
                  // We'll handle this in resolveSymbolReferenceToSymbol
                  referenceToResolve = classRef;
                  foundClassRef = true;
                  break;
                }
              }
              if (!foundClassRef) {
                referenceToResolve = ref;
              }
              break;
            }

            // First check if position matches a specific chain member
            const chainMember = this.findChainMemberAtPosition(
              ref as ChainedSymbolReference,
              position,
            );
            if (chainMember) {
              // Found a chained reference with a specific member at this position
              // BUT: If the chain member is a METHOD_CALL and we have a synthetic METHOD_CALL reference,
              // prefer the synthetic reference as it's more specific
              if (chainMember.member.context === ReferenceContext.METHOD_CALL) {
                const syntheticMethodRef = typeReferences.find(
                  (r) =>
                    r.context === ReferenceContext.METHOD_CALL &&
                    r.name === chainMember.member.name &&
                    (r as any)._originalChainedRef === ref,
                );
                if (syntheticMethodRef) {
                  // Prefer synthetic METHOD_CALL reference over chained reference
                  referenceToResolve = syntheticMethodRef;
                  break;
                }
              }
              // Otherwise, prefer chained reference over standalone references when position matches
              // This ensures 'this.method().anotherMethod()' chains are resolved correctly
              referenceToResolve = ref;
              break;
            }

            // If position is within the first node's range (but not at the start)
            // Note: firstNode and firstNodeStart are already defined above
            // Check if position is within the first node's range
            const isWithinFirstNode =
              position.line >= firstNodeStart.startLine &&
              position.line <= firstNodeStart.endLine &&
              position.character >= firstNodeStart.startColumn &&
              position.character <= firstNodeStart.endColumn;

            if (isWithinFirstNode) {
              // Position is within the first node - check if there's a standalone CLASS_REFERENCE
              // that matches this position (prefer it over the chained reference for qualifier resolution)
              const classRefs = typeReferences.filter(
                (r) => r.context === ReferenceContext.CLASS_REFERENCE,
              );
              // Find any CLASS_REFERENCE that matches the position (more lenient matching)
              let foundMatchingClassRef = false;
              for (const classRef of classRefs) {
                const classLoc = classRef.location.identifierRange;
                const matchesPosition =
                  position.line >= classLoc.startLine &&
                  position.line <= classLoc.endLine &&
                  position.character >= classLoc.startColumn &&
                  position.character <= classLoc.endColumn;
                // Check if position is within the CLASS_REFERENCE range
                if (matchesPosition) {
                  // Found a CLASS_REFERENCE that matches the position - prefer it over the chained reference
                  referenceToResolve = classRef;
                  foundMatchingClassRef = true;
                  break;
                }
              }
              // If no matching CLASS_REFERENCE found, use the chained reference
              if (!foundMatchingClassRef) {
                referenceToResolve = ref;
              }
              // Always break after handling this chained reference
              break;
            }
          }
          // If we found a chained reference, use it even if we didn't find a specific member
          // This ensures chained references are prioritized over non-chained references
          // BUT only if we haven't already selected a CLASS_REFERENCE
          if (
            chainedRefs.length > 0 &&
            referenceToResolve === typeReferences[0] &&
            !isChainedSymbolReference(referenceToResolve) &&
            referenceToResolve.context !== ReferenceContext.CLASS_REFERENCE
          ) {
            // Prefer chained references that have resolved parts (better context)
            const chainedWithResolvedParts = chainedRefs.filter((ref) => {
              const chainNodes = (ref as ChainedSymbolReference).chainNodes;
              return chainNodes?.some(
                (node) => node.resolvedSymbolId !== undefined,
              );
            });
            // If we have chained references with resolved parts, prefer those
            if (chainedWithResolvedParts.length > 0) {
              referenceToResolve = chainedWithResolvedParts[0];
            } else {
              referenceToResolve = chainedRefs[0];
            }
          }
        }

        // Step 3: Prioritize METHOD_CALL references (including synthetic ones from chains)
        // This ensures method calls are resolved over variables or other references
        // Do this BEFORE chained reference selection to ensure METHOD_CALL takes precedence
        const methodCallRefs = typeReferences.filter(
          (ref) => ref.context === ReferenceContext.METHOD_CALL,
        );
        if (methodCallRefs.length > 0) {
          // Find the METHOD_CALL reference that best matches the position
          // Prefer synthetic references (from chain nodes) as they're more specific
          let bestMethodCallRef = methodCallRefs[0];
          for (const methodRef of methodCallRefs) {
            const methodLoc = methodRef.location.identifierRange;
            const isWithinMethodRange =
              position.line >= methodLoc.startLine &&
              position.line <= methodLoc.endLine &&
              position.character >= methodLoc.startColumn &&
              position.character <= methodLoc.endColumn;
            if (isWithinMethodRange) {
              bestMethodCallRef = methodRef;
              break;
            }
          }
          // Prioritize METHOD_CALL over everything except type references
          // This ensures method calls resolve correctly even when chained references exist
          if (
            referenceToResolve.context !==
              ReferenceContext.GENERIC_PARAMETER_TYPE &&
            referenceToResolve.context !== ReferenceContext.CLASS_REFERENCE
          ) {
            // If we have a METHOD_CALL that matches the position, use it
            // This handles synthetic references from chains correctly
            referenceToResolve = bestMethodCallRef;
          }
        }

        // Additional check: If we have both a chained reference with resolved parts and a standalone METHOD_CALL
        // at the same position, prefer the chained reference when position matches a chain member
        if (
          !isChainedSymbolReference(referenceToResolve) &&
          referenceToResolve.context === ReferenceContext.METHOD_CALL
        ) {
          const chainedRefs = typeReferences.filter((ref) =>
            isChainedSymbolReference(ref),
          );
          const chainedWithResolvedParts = chainedRefs.filter((ref) => {
            const chainNodes = (ref as ChainedSymbolReference).chainNodes;
            return chainNodes?.some(
              (node) => node.resolvedSymbolId !== undefined,
            );
          });

          // If we have a chained reference with resolved parts, check if position matches a chain member
          if (chainedWithResolvedParts.length > 0) {
            for (const chainedRef of chainedWithResolvedParts) {
              const chainMember = this.findChainMemberAtPosition(
                chainedRef as ChainedSymbolReference,
                position,
              );
              if (chainMember) {
                // Position matches a chain member in a chained reference with resolved parts
                // Prefer this over the standalone METHOD_CALL
                referenceToResolve = chainedRef;
                break;
              }
            }
          }
        }

        // If no chained reference was selected, prioritize CLASS_REFERENCE and GENERIC_PARAMETER_TYPE
        // over METHOD_CALL when position matches (for class references and generic type parameters)
        if (!isChainedSymbolReference(referenceToResolve)) {
          const classRefs = typeReferences.filter(
            (ref) => ref.context === ReferenceContext.CLASS_REFERENCE,
          );
          const genericParamRefs = typeReferences.filter(
            (ref) => ref.context === ReferenceContext.GENERIC_PARAMETER_TYPE,
          );
          const methodRefs = typeReferences.filter(
            (ref) => ref.context === ReferenceContext.METHOD_CALL,
          );

          // Combine class and generic parameter references (both resolve to classes)
          const typeRefs = [...classRefs, ...genericParamRefs];

          // If we have both type references (CLASS_REFERENCE/GENERIC_PARAMETER_TYPE) and METHOD_CALL,
          // check if position matches type reference
          if (typeRefs.length > 0 && methodRefs.length > 0) {
            // Check if any type reference matches the exact position
            for (const typeRef of typeRefs) {
              const typeLoc = typeRef.location.identifierRange;
              // Check if position is within the identifier range
              const isWithinIdentifierRange =
                position.line >= typeLoc.startLine &&
                position.line <= typeLoc.endLine &&
                position.character >= typeLoc.startColumn &&
                position.character <= typeLoc.endColumn;

              // Also check the symbol range as fallback
              const symbolRange = typeRef.location.symbolRange;
              const isWithinSymbolRange =
                position.line >= symbolRange.startLine &&
                position.line <= symbolRange.endLine &&
                position.character >= symbolRange.startColumn &&
                position.character <= symbolRange.endColumn;

              if (isWithinIdentifierRange || isWithinSymbolRange) {
                // Position matches type reference - prefer it over METHOD_CALL
                referenceToResolve = typeRef;
                break;
              }
            }
          } else if (typeRefs.length > 0) {
            // Only type references available - use it if position matches
            for (const typeRef of typeRefs) {
              const typeLoc = typeRef.location.identifierRange;
              const symbolRange = typeRef.location.symbolRange;
              const isWithinIdentifierRange =
                position.line >= typeLoc.startLine &&
                position.line <= typeLoc.endLine &&
                position.character >= typeLoc.startColumn &&
                position.character <= typeLoc.endColumn;
              const isWithinSymbolRange =
                position.line >= symbolRange.startLine &&
                position.line <= symbolRange.endLine &&
                position.character >= symbolRange.startColumn &&
                position.character <= symbolRange.endColumn;

              if (isWithinIdentifierRange || isWithinSymbolRange) {
                referenceToResolve = typeRef;
                break;
              }
            }
            // If no match found, use the first one as fallback
            if (
              referenceToResolve === typeReferences[0] &&
              typeRefs.length > 0
            ) {
              referenceToResolve = typeRefs[0];
            }
          }
        }

        // Step 3: Try to resolve the most specific reference
        // Keyword check happens inside resolveSymbolReferenceToSymbol
        // after built-in type resolution (some keywords are built-in types)
        let resolvedSymbol = await this.resolveSymbolReferenceToSymbol(
          referenceToResolve,
          fileUri,
          position,
        );
        if (resolvedSymbol) {
          return resolvedSymbol;
        }

        // Step 3b: If resolution failed and we have CLASS_REFERENCE references,
        // try resolving them as a fallback (for cases where CLASS_REFERENCE wasn't prioritized)
        if (
          !resolvedSymbol &&
          referenceToResolve.context !== ReferenceContext.CLASS_REFERENCE
        ) {
          const classRefs = typeReferences.filter(
            (ref) => ref.context === ReferenceContext.CLASS_REFERENCE,
          );
          for (const classRef of classRefs) {
            const classLoc = classRef.location.identifierRange;
            const symbolRange = classRef.location.symbolRange;
            // Check if position matches this CLASS_REFERENCE (check both identifier and symbol ranges)
            const isWithinIdentifierRange =
              position.line >= classLoc.startLine &&
              position.line <= classLoc.endLine &&
              position.character >= classLoc.startColumn &&
              position.character <= classLoc.endColumn;
            const isWithinSymbolRange =
              position.line >= symbolRange.startLine &&
              position.line <= symbolRange.endLine &&
              position.character >= symbolRange.startColumn &&
              position.character <= symbolRange.endColumn;

            if (isWithinIdentifierRange || isWithinSymbolRange) {
              resolvedSymbol = await this.resolveSymbolReferenceToSymbol(
                classRef,
                fileUri,
                position,
              );
              if (resolvedSymbol) {
                return resolvedSymbol;
              }
            }
          }

          // Step 3c: For METHOD_CALL references, if resolution failed and we have a CLASS_REFERENCE
          // on the same line (likely a qualified call like FileUtilities.createFile),
          // try resolving as a qualified reference
          if (
            !resolvedSymbol &&
            referenceToResolve.context === ReferenceContext.METHOD_CALL &&
            classRefs.length > 0
          ) {
            // Find the CLASS_REFERENCE that's on the same line and before the METHOD_CALL
            const methodLoc = referenceToResolve.location.identifierRange;
            for (const classRef of classRefs) {
              const classLoc = classRef.location.identifierRange;
              // Check if CLASS_REFERENCE is on the same line and before the method call
              if (
                classLoc.startLine === methodLoc.startLine &&
                classLoc.endColumn < methodLoc.startColumn
              ) {
                // Try to resolve as qualified reference: qualifier.member
                const qualifiedSymbol =
                  await this.resolveQualifiedReferenceFromChain(
                    classRef.name,
                    referenceToResolve.name,
                    ReferenceContext.METHOD_CALL,
                    fileUri,
                    undefined,
                    referenceToResolve,
                  );
                if (qualifiedSymbol) {
                  return qualifiedSymbol;
                }
              }
            }
          }
        }

        // If we have a chained reference but resolution failed, don't fall back to direct symbol lookup
        // Chained references should be resolved through the chain, not through direct symbol matching
        // However, only skip fallback if we actually tried to resolve a chained reference
        const wasChainedRef = isChainedSymbolReference(referenceToResolve);
        if (wasChainedRef) {
          this.logger.debug(
            () =>
              `Chained reference "${referenceToResolve.name}" found at ` +
              `${fileUri}:${position.line}:${position.character} ` +
              'but resolution returned null - not falling back to direct symbol lookup',
          );
          return null;
        }

        // Step 3d: If resolution failed and we have CLASS_REFERENCE references that weren't matched,
        // try to find them by searching all references in the file (fallback for position matching issues)
        if (!resolvedSymbol && typeReferences.length > 0) {
          const allClassRefs = typeReferences.filter(
            (ref) => ref.context === ReferenceContext.CLASS_REFERENCE,
          );
          // If we have CLASS_REFERENCE references but didn't match any by position,
          // check if any are on the same line (they might have slightly different column ranges)
          if (allClassRefs.length > 0) {
            for (const classRef of allClassRefs) {
              const classLoc = classRef.location.identifierRange;
              // Check if it's on the same line (more lenient matching)
              if (classLoc.startLine === position.line) {
                const resolvedClassSymbol =
                  await this.resolveSymbolReferenceToSymbol(
                    classRef,
                    fileUri,
                    position,
                  );
                if (resolvedClassSymbol) {
                  return resolvedClassSymbol;
                }
              }
            }
          }
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

        // Step 1b: Fallback - if no references found at exact position, try to find CLASS_REFERENCE
        // on the same line (for cases where position matching is slightly off)
        const symbolTable =
          this.symbolRefManager.getSymbolTableForFile(fileUri);
        if (symbolTable) {
          const allReferences = symbolTable.getAllReferences();
          const sameLineClassRefs = allReferences.filter(
            (ref) =>
              ref.context === ReferenceContext.CLASS_REFERENCE &&
              ref.location.identifierRange.startLine === position.line,
          );

          // Check if any CLASS_REFERENCE on the same line matches the position
          for (const classRef of sameLineClassRefs) {
            const classLoc = classRef.location.identifierRange;
            if (
              position.character >= classLoc.startColumn &&
              position.character <= classLoc.endColumn
            ) {
              const resolvedClassSymbol =
                await this.resolveSymbolReferenceToSymbol(
                  classRef,
                  fileUri,
                  position,
                );
              if (resolvedClassSymbol) {
                return resolvedClassSymbol;
              }
            }
          }
        }
      }

      // Step 2: Look for symbols that start exactly at this position
      // Only do this if we don't have a chained reference (chained references should be resolved through the chain)
      // Check if we had any chained references at this position - if so, skip fallback
      const hadChainedRefs =
        typeReferences.length > 0 &&
        typeReferences.some((ref) => isChainedSymbolReference(ref));

      if (hadChainedRefs) {
        // We had chained references but resolution failed - don't fall back to direct symbol lookup
        return null;
      }

      const symbols = await this.findSymbolsInFile(fileUri);

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
        // When METHOD_CALL reference exists at position, only return method/constructor symbols.
        // Resolution is deterministic for same-file refs; if it failed, return null rather than a variable.
        const methodCallAtPos = typeReferences.some(
          (ref) =>
            ref.context === ReferenceContext.METHOD_CALL &&
            position.line >= ref.location.identifierRange.startLine &&
            position.line <= ref.location.identifierRange.endLine &&
            position.character >= ref.location.identifierRange.startColumn &&
            position.character <= ref.location.identifierRange.endColumn,
        );
        const symbolsToConsider = methodCallAtPos
          ? exactMatchSymbols.filter(
              (s) =>
                s.kind === SymbolKind.Method ||
                s.kind === SymbolKind.Constructor,
            )
          : exactMatchSymbols;
        if (symbolsToConsider.length === 0) {
          return null;
        }

        // Return the smallest (most specific) symbol if multiple matches
        const mostSpecific =
          symbolsToConsider.length === 1
            ? symbolsToConsider[0]
            : symbolsToConsider.reduce((prev, current) => {
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
  public async createChainResolutionContextWithRequestType(
    documentText: string,
    position: Position,
    sourceFile: string,
    requestType?: string,
  ): Promise<
    SymbolResolutionContext & {
      requestType?: string;
      position?: Position;
    }
  > {
    const baseContext = await this.createChainResolutionContext(
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
   * Resolve an entire chain of nodes and return an array of resolved contexts
   * @param chainNodes Array of SymbolReference nodes representing the chain
   * @returns Array of ChainResolutionContext objects, or null if resolution fails
   */
  private async resolveEntireChain(
    chainNodes: SymbolReference[],
    fileUri?: string,
  ): Promise<ChainResolutionContext[] | null> {
    return resolveEntireChainOp(
      this as unknown as SymbolManagerOps,
      chainNodes,
      fileUri,
    );
  }

  private async findAllPossibleResolutionPaths(
    chainNodes: SymbolReference[],
    fileUri?: string,
  ): Promise<ChainResolutionContext[][]> {
    return findAllResPathsOp(
      this as unknown as SymbolManagerOps,
      chainNodes,
      fileUri,
    );
  }

  private async exploreResolutionPaths(
    chainNodes: SymbolReference[],
    stepIndex: number,
    currentContext: ChainResolutionContext,
    pathStack: Stack<ChainResolutionContext>,
    allPaths: ChainResolutionContext[][],
    fileUri?: string,
  ): Promise<void> {
    return exploreResPathsOp(
      this as unknown as SymbolManagerOps,
      chainNodes,
      stepIndex,
      currentContext,
      pathStack,
      allPaths,
      fileUri,
    );
  }

  private async getAllPossibleResolutions(
    step: SymbolReference,
    currentContext: ChainResolutionContext,
    nextStep?: SymbolReference,
    fileUri?: string,
  ): Promise<ChainResolutionContext[]> {
    return getAllPossibleResOp(
      this as unknown as SymbolManagerOps,
      step,
      currentContext,
      nextStep,
      fileUri,
    );
  }

  private canResolveAsNamespace(
    step: SymbolReference,
    currentContext: ChainResolutionContext,
  ): boolean {
    return canResolveAsNsOp(step, currentContext);
  }

  private async tryResolveAsClass(
    stepName: string,
    currentContext: ChainResolutionContext,
    stepContext?: ReferenceContext,
  ): Promise<ApexSymbol | null> {
    return tryResolveClassOp(
      this as unknown as SymbolManagerOps,
      stepName,
      currentContext,
      stepContext,
    );
  }

  private async tryResolveAsMember(
    step: SymbolReference,
    currentContext: ChainResolutionContext,
    nextStep?: SymbolReference,
  ): Promise<ApexSymbol | null> {
    return tryResolveMemberOp(
      this as unknown as SymbolManagerOps,
      step,
      currentContext,
      nextStep,
    );
  }

  private disambiguateResolutionPaths(
    paths: ChainResolutionContext[][],
    chainNodes: SymbolReference[],
  ): ChainResolutionContext[] {
    return disambiguateResPathsOp(
      this as unknown as SymbolManagerOps,
      paths,
      chainNodes,
    );
  }

  private selectBestNamespacePath(
    namespacePaths: ChainResolutionContext[][],
    chainNodes: SymbolReference[],
  ): ChainResolutionContext[] {
    return selectBestNsPathOp(namespacePaths, chainNodes);
  }

  private getFirstNamespaceIndex(path: ChainResolutionContext[]): number {
    return getFirstNsIndexOp(path);
  }

  private getPathSpecificity(path: ChainResolutionContext[]): number {
    return getPathSpecificityOp(path);
  }

  private choosePathBasedOnNextStep(
    paths: ChainResolutionContext[][],
    nextStep: SymbolReference,
  ): ChainResolutionContext[] | null {
    return choosePathByNextStepOp(paths, nextStep);
  }

  private isMethodSymbol(symbol: ApexSymbol): boolean {
    return isMethodSymOp(symbol);
  }

  private isClassSymbol(symbol: ApexSymbol): boolean {
    return isClassSymOp(symbol);
  }

  private isInstanceSymbol(symbol: ApexSymbol): boolean {
    return isInstanceSymOp(symbol);
  }

  /**
   * Resolve a chained expression reference to its final symbol
   */
  public async resolveChainedSymbolReference(
    typeReference: SymbolReference,
    position?: { line: number; character: number },
    fileUri?: string,
  ): Promise<ApexSymbol | null> {
    return resolveChainedSymRefOp(
      this as unknown as SymbolManagerOps,
      typeReference,
      position,
      fileUri,
    );
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
    return resolveFirstNodeOp(
      this as unknown as SymbolManagerOps,
      firstNodeName,
      includeRetry,
    );
  }

  private findChainMemberAtPosition(
    chainedRef: ChainedSymbolReference,
    position: { line: number; character: number },
  ): { member: any; index: number } | null {
    return findChainMember(chainedRef, position);
  }

  private isPositionWithinLocation(
    location: any,
    position: { line: number; character: number },
  ): boolean {
    return posWithinLocation(location, position);
  }

  private isPositionAtStartOfChainedRef(
    typeReference: ChainedSymbolReference,
    position: { line: number; character: number },
  ): boolean {
    return posAtStartOfChain(typeReference, position);
  }

  private isPositionOnFirstNode(
    typeReference: ChainedSymbolReference,
    firstNode: SymbolReference,
    position: { line: number; character: number },
  ): boolean {
    return posOnFirstNode(typeReference, firstNode, position);
  }

  /**
   * Try to resolve a step as an instance (variable)
   */
  private async tryResolveAsInstance(
    stepName: string,
    currentContext: ChainResolutionContext | undefined,
  ): Promise<ApexSymbol | null> {
    return tryResolveInstanceOp(
      this as unknown as SymbolManagerOps,
      stepName,
      currentContext,
    );
  }

  /**
   * Find all symbols in a given namespace
   */
  private async findSymbolsInNamespace(
    namespaceName: string,
  ): Promise<ApexSymbol[]> {
    return findSymsInNsOp(this as unknown as SymbolManagerOps, namespaceName);
  }
  /**
   * Resolve a member (property, method, etc.) in the context of a given symbol
   */
  private async resolveMemberInContext(
    context: ChainResolutionContext,
    memberName: string,
    memberType: 'property' | 'method' | 'class',
    typeSubstitutions: GenericTypeSubstitutionMap | null = null,
  ): Promise<ApexSymbol | null> {
    return resolveMemberInCtxOp(
      this as unknown as SymbolManagerOps,
      context,
      memberName,
      memberType,
      typeSubstitutions,
    );
  }

  /**
   * Resolve the superclass symbol for a given TypeSymbol.
   * Handles loading the superclass symbol table if needed.
   *
   * @param typeSymbol The TypeSymbol to resolve superclass for
   * @returns The superclass TypeSymbol or null if not found or no superclass
   */
  private async resolveSuperclassSymbol(
    typeSymbol: TypeSymbol,
  ): Promise<TypeSymbol | null> {
    return resolveSuperclassSymOp(
      this as unknown as SymbolManagerOps,
      typeSymbol,
    );
  }

  /**
   * Resolve the Object class symbol.
   * Object is always the root of the inheritance hierarchy in Apex.
   *
   * @returns The Object TypeSymbol or null if not found
   */
  private async resolveObjectClass(): Promise<TypeSymbol | null> {
    return resolveObjectClassOp(this as unknown as SymbolManagerOps);
  }

  /**
   * Get a symbol by its ID
   */
  private getSymbolById(symbolId: string): ApexSymbol | null {
    return getSymbolByIdOp(this as unknown as SymbolManagerOps, symbolId);
  }

  /**
   * Get graph data as JSON-serializable data
   * Delegates to ApexSymbolRefManager
   */
  async getGraphData(): Promise<import('../types/graph').GraphData> {
    return this.symbolRefManager.getGraphData();
  }

  /**
   * Get graph data filtered by file as JSON-serializable data
   * Delegates to ApexSymbolRefManager
   */
  async getGraphDataForFile(
    fileUri: string,
  ): Promise<import('../types/graph').FileGraphData> {
    return this.symbolRefManager.getGraphDataForFile(fileUri);
  }

  /**
   * Get graph data filtered by symbol type as JSON-serializable data
   * Delegates to ApexSymbolRefManager
   */
  async getGraphDataByType(
    symbolType: string,
  ): Promise<import('../types/graph').TypeGraphData> {
    return this.symbolRefManager.getGraphDataByType(symbolType);
  }

  /**
   * Get graph data as a JSON string (for direct wire transmission)
   * Delegates to ApexSymbolRefManager
   */
  getGraphDataAsJSON(): string {
    return this.symbolRefManager.getGraphDataAsJSON();
  }

  /**
   * Get graph data for a file as a JSON string
   * Delegates to ApexSymbolRefManager
   */
  getGraphDataForFileAsJSON(fileUri: string): string {
    return this.symbolRefManager.getGraphDataForFileAsJSON(fileUri);
  }

  /**
   * Get graph data by type as a JSON string
   * Delegates to ApexSymbolRefManager
   */
  getGraphDataByTypeAsJSON(symbolType: string): string {
    return this.symbolRefManager.getGraphDataByTypeAsJSON(symbolType);
  }

  /**
   * Get the current detail level for a file
   * @param fileUri The file URI to check
   * @returns The current detail level, or null if file not indexed
   */
  async getDetailLevelForFile(fileUri: string): Promise<DetailLevel | null> {
    const normalizedUri = extractFilePathFromUri(fileUri);
    return this.fileDetailLevels.get(normalizedUri) ?? null;
  }

  /**
   * Set the detail level for a file (internal use)
   */
  private setDetailLevelForFile(fileUri: string, level: DetailLevel): void {
    const normalizedUri = extractFilePathFromUri(fileUri);
    this.fileDetailLevels.set(normalizedUri, level);
  }

  /**
   * Get the layer order for enrichment
   */
  private getLayerOrder(): DetailLevel[] {
    return ['public-api', 'protected', 'private', 'full'];
  }

  /**
   * Get the numeric order of a detail level (for comparison)
   */
  private getLayerOrderIndex(level: DetailLevel): number {
    const order: Record<DetailLevel, number> = {
      'public-api': 0,
      protected: 1,
      private: 2,
      full: 3,
    };
    return order[level] ?? -1;
  }

  /**
   * Get layers that need to be applied to reach target level from current level
   */
  private getLayersToApply(
    currentLevel: DetailLevel | null,
    targetLevel: DetailLevel,
  ): DetailLevel[] {
    const layers = this.getLayerOrder();
    const currentIndex = currentLevel
      ? this.getLayerOrderIndex(currentLevel)
      : -1;
    const targetIndex = this.getLayerOrderIndex(targetLevel);

    if (targetIndex <= currentIndex) {
      return [];
    }

    // Return layers from current+1 to target (inclusive)
    return layers.slice(currentIndex + 1, targetIndex + 1);
  }

  /**
   * Enrich a file to a target detail level
   * Applies layers incrementally: public-api -> protected -> private -> full
   */
  enrichToLevel(
    fileUri: string,
    targetLevel: DetailLevel,
    documentText: string,
  ): Effect.Effect<void, never, never> {
    const self = this;
    return Effect.gen(function* () {
      const normalizedUri = extractFilePathFromUri(fileUri);
      const currentLevel = yield* Effect.promise(() =>
        self.getDetailLevelForFile(normalizedUri),
      );

      // Check if already at or above target level
      if (
        currentLevel &&
        self.getLayerOrderIndex(currentLevel) >=
          self.getLayerOrderIndex(targetLevel)
      ) {
        self.logger.debug(
          () =>
            `File ${fileUri} already at level ${currentLevel}, ` +
            `skipping enrichment to ${targetLevel}`,
        );
        return;
      }

      self.logger.debug(
        () =>
          `Enriching ${fileUri} from ${currentLevel ?? 'none'} to ${targetLevel}`,
      );

      // Use ApexSymbolCollectorListener with appropriate detail level
      // Re-use existing symbol table if available for enrichment
      const existingSymbolTable = yield* Effect.promise(() =>
        self.getSymbolTableForFile(fileUri),
      );
      const listener = new ApexSymbolCollectorListener(
        existingSymbolTable || undefined,
        targetLevel,
      );

      const result = self.compilerService.compile(
        documentText,
        fileUri,
        listener,
        {
          collectReferences: true,
          resolveReferences: true,
        },
      );

      if (result?.result) {
        yield* self.addSymbolTable(result.result, fileUri);
        self.setDetailLevelForFile(fileUri, targetLevel);
        self.logger.debug(
          () =>
            `Enriched ${fileUri} to ${targetLevel} level using ApexSymbolCollectorListener`,
        );
      }
    });
  }

  /**
   * Resolve a symbol with iterative enrichment
   * Tries resolution after each enrichment layer until found or all layers exhausted
   */
  resolveWithEnrichment<T>(
    fileUri: string,
    documentText: string,
    resolver: () => T | null,
  ): Effect.Effect<T | null, never, never> {
    const self = this;
    return Effect.gen(function* () {
      // Try at current level first
      const result = resolver();
      if (result !== null) {
        return result;
      }

      const currentLevel = yield* Effect.promise(() =>
        self.getDetailLevelForFile(fileUri),
      );
      const layers = self.getLayerOrder();
      const startIndex = currentLevel
        ? self.getLayerOrderIndex(currentLevel) + 1
        : 0;

      // Iterate through remaining layers
      for (let i = startIndex; i < layers.length; i++) {
        const layer = layers[i];
        self.logger.debug(
          () => `Enriching ${fileUri} to ${layer} for symbol resolution`,
        );

        yield* self.enrichToLevel(fileUri, layer, documentText);

        // Try resolution after enrichment
        const enrichedResult = resolver();
        if (enrichedResult !== null) {
          self.logger.debug(
            () => `Found symbol after enriching to ${layer} level`,
          );
          return enrichedResult;
        }
      }

      // Not found after all layers
      self.logger.debug(
        () => `Symbol not found after enriching ${fileUri} through all layers`,
      );
      return null;
    });
  }
}
