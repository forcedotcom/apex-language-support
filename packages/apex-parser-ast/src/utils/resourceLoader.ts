/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { unzipSync } from 'fflate';
import { getLogger } from '@salesforce/apex-lsp-shared';
import {
  StandardLibraryCacheLoader,
  isProtobufCacheAvailable,
} from '../cache/stdlib-cache-loader';
import type { DeserializationResult } from '../cache/stdlib-deserializer';
import {
  getEmbeddedStandardLibraryZip,
  clearEmbeddedZipCache,
} from './embeddedStandardLibrary';

import { CaseInsensitivePathMap } from './CaseInsensitiveMap';
import { CaseInsensitiveString as CIS } from './CaseInsensitiveString';
import { normalizeApexPath } from './PathUtils';
import { SymbolTable } from '../types/symbol';
import { NamespaceDependencyAnalyzer } from './NamespaceDependencyAnalyzer';
import { Effect } from 'effect';
import {
  GlobalTypeRegistry,
  GlobalTypeRegistryLive,
} from '../services/GlobalTypeRegistryService';
import { loadTypeRegistryFromGzip } from '../cache/type-registry-loader';

// ResourceLoaderOptions interface removed - ResourceLoader now always uses
// embedded archives with disk fallback. Namespace preloading is handled by
// SymbolGraphSettings.preloadNamespaces in server settings.

/**
 * ResourceLoader class for loading standard Apex class symbol tables and serving ephemeral docs.
 *
 * Core Responsibilities:
 * - Load symbol tables from protobuf cache (apex-stdlib.pb.gz)
 * - Initialize global type registry from gz file (apex-type-registry.pb.gz)
 * - Serve ephemeral docs (source code) from ZIP for goto definition
 *
 * Resource Loading Strategy:
 * - Symbol tables are loaded from protobuf cache at initialization
 * - Global type registry is loaded from gz file at initialization
 * - ZIP buffer is used only for ephemeral docs (source code viewing)
 * - Works uniformly across all environments (web and desktop)
 *
 * @example
 * ```typescript
 * const loader = ResourceLoader.getInstance();
 *
 * // Initialize loads protobuf cache and global registry
 * await loader.initialize();
 *
 * // Get symbol table directly from cache
 * const symbolTable = await loader.getSymbolTable('System/String.cls');
 *
 * // Get source code from ZIP for ephemeral docs
 * const source = await loader.getFile('System/String.cls');
 * ```
 */
export class ResourceLoader {
  private static instance: ResourceLoader;
  private initialized = false;
  private readonly logger = getLogger();
  private namespaces: Map<string, CIS[]> = new Map(); // Key is original case namespace
  private fileIndex: CaseInsensitivePathMap<boolean> =
    new CaseInsensitivePathMap(); // Lightweight existence index with case-insensitive keys
  private originalPaths: CaseInsensitivePathMap<string> =
    new CaseInsensitivePathMap(); // Maps case-insensitive paths to original case paths
  private normalizedToZipPath: CaseInsensitivePathMap<string> =
    new CaseInsensitivePathMap(); // Maps normalized paths to ZIP file paths for O(1) lookup
  private decodedContentCache: CaseInsensitivePathMap<string> =
    new CaseInsensitivePathMap(); // Cache for decoded file contents
  private namespaceIndex: CaseInsensitivePathMap<string> =
    new CaseInsensitivePathMap(); // Case-insensitive namespace index for O(1) lookups
  private classNameToNamespace: CaseInsensitivePathMap<Set<string>> =
    new CaseInsensitivePathMap(); // Reverse index: className -> Set<namespace>
  private totalSize: number = 0; // Total size of all files
  private accessCount: number = 0; // Simple access counter for statistics
  private zipBuffer?: Uint8Array; // Will be initialized via setZipBuffer
  private zipFiles: CaseInsensitivePathMap<Uint8Array> | null = null; // Will be initialized in extractZipFiles
  private standardLibrarySymbolDataLoaded = false; // Track if standard library symbol data was loaded
  private standardLibrarySymbolData: DeserializationResult | null = null; // Cached standard library symbol data
  private namespaceDependencyOrder: string[] | null = null; // Cached dependency-sorted namespace order

  private constructor() {
    this.logger.debug(() => '🚀 ResourceLoader constructor called');

    // Initialize empty structure initially
    this.initializeEmptyStructure();
    this.initialized = true;
  }

  /**
   * Initialize empty structure
   * @private
   */
  private initializeEmptyStructure(): void {
    this.zipFiles = new CaseInsensitivePathMap<Uint8Array>();
    this.fileIndex = new CaseInsensitivePathMap<boolean>();
    this.originalPaths = new CaseInsensitivePathMap<string>();
    this.normalizedToZipPath = new CaseInsensitivePathMap<string>();
    this.decodedContentCache = new CaseInsensitivePathMap<string>();
    this.namespaceIndex = new CaseInsensitivePathMap<string>();
    this.classNameToNamespace = new CaseInsensitivePathMap<Set<string>>();
    this.namespaces = new Map<string, CIS[]>();
    this.totalSize = 0;
  }

  /**
   * Extract ZIP files using fflate and build lightweight file index.
   * Creates case-insensitive path mappings and namespace structure for efficient lookups.
   *
   * @private
   */
  private extractZipFiles(): void {
    if (!this.zipBuffer) {
      throw new Error('ZIP buffer not set. Call setZipBuffer() first.');
    }

    let extractedFiles;
    try {
      extractedFiles = unzipSync(this.zipBuffer);
    } catch (error) {
      throw new Error(
        `Failed to extract StandardApexLibrary.zip: ${error instanceof Error ? error.message : String(error)}. ` +
          "The ZIP file may be corrupted. Please rebuild the extension with 'npm run build'.",
      );
    }
    this.zipFiles = new CaseInsensitivePathMap<Uint8Array>();

    // Convert to CaseInsensitivePathMap and preserve original paths
    for (const [originalPath, data] of Object.entries(extractedFiles)) {
      this.zipFiles.set(originalPath, data);

      // Also preserve the relative path mapping for later use
      // Handle StandardApexLibrary paths
      let relativePath = originalPath.replace(/\\/g, '/');
      if (relativePath.startsWith('src/resources/StandardApexLibrary/')) {
        relativePath = relativePath.replace(
          /^src\/resources\/StandardApexLibrary\//,
          '',
        );
      }
      this.originalPaths.set(relativePath, relativePath);

      // Build normalized path to ZIP path mapping for O(1) lookups
      const normalizedPath = this.normalizePath(relativePath);
      this.normalizedToZipPath.set(normalizedPath, originalPath);
    }

    // Build lightweight file index from extracted files
    this.buildFileIndex();
  }

  /**
   * Build a lightweight file index from extracted ZIP files.
   * Creates case-insensitive file existence index and namespace structure for efficient lookups.
   *
   * @private
   */
  private buildFileIndex(): void {
    this.logger.debug(() => 'Building lightweight file index...');

    let processedCount = 0;
    let totalSize = 0;

    // Build namespace structure and file index from already-processed originalPaths
    // Process in batches with yielding for large file sets
    const originalPathsEntries = Array.from(this.originalPaths.entries());
    const batchSize = 100;

    for (let i = 0; i < originalPathsEntries.length; i++) {
      const [_key, originalPath] = originalPathsEntries[i];
      if (!originalPath) continue;

      const pathParts = originalPath.split('/');
      const namespace = pathParts.length > 1 ? pathParts[0] : undefined;
      const fileName = pathParts[pathParts.length - 1];

      if (namespace) {
        // Find existing namespace with case-insensitive lookup, but preserve original case
        let existingNamespaceKey = namespace;
        const namespaceLower = namespace.toLowerCase();

        // Use namespaceIndex for O(1) lookup instead of iteration
        if (this.namespaceIndex.has(namespaceLower)) {
          existingNamespaceKey = this.namespaceIndex.get(namespaceLower)!;
        } else {
          // First time seeing this namespace (case-insensitively)
          this.namespaceIndex.set(namespaceLower, namespace);
        }

        if (!this.namespaces.has(existingNamespaceKey)) {
          this.namespaces.set(existingNamespaceKey, []);
        }
        this.namespaces.get(existingNamespaceKey)!.push(CIS.from(fileName));

        // Build reverse index: className -> Set<namespace> for O(1) lookup
        const normalizedClassName = this.normalizePath(originalPath);
        const existingNamespaces =
          this.classNameToNamespace.get(normalizedClassName);
        if (existingNamespaces) {
          // Add to Set (automatically handles uniqueness)
          existingNamespaces.add(existingNamespaceKey);
        } else {
          // Create new Set with namespace
          this.classNameToNamespace.set(
            normalizedClassName,
            new Set([existingNamespaceKey]),
          );
        }

        // Also map just the class name (without path) to Set<namespace>
        const classNameOnly = fileName.replace(/\.cls$/i, '');
        if (classNameOnly) {
          const existingNamespacesForClass =
            this.classNameToNamespace.get(classNameOnly);
          if (existingNamespacesForClass) {
            // Add to Set (automatically handles uniqueness)
            existingNamespacesForClass.add(existingNamespaceKey);
          } else {
            // Create new Set with namespace
            this.classNameToNamespace.set(
              classNameOnly,
              new Set([existingNamespaceKey]),
            );
          }
        }
      }

      // Store in lightweight index for existence checks
      this.fileIndex.set(originalPath, true);
      processedCount++;

      // Yield every batchSize files to allow other tasks to run
      // Note: This is a synchronous function, so yielding is best-effort
      // For better yielding, consider converting to async or Effect-based
      if ((i + 1) % batchSize === 0 && i + 1 < originalPathsEntries.length) {
        // Use setImmediate for yielding (best-effort in sync context)
        if (typeof setImmediate !== 'undefined') {
          // This doesn't actually yield in sync context, but documents intent
          // Consider converting to async/Effect for real yielding
        }
      }
    }

    // Calculate total size from zipFiles directly
    for (const [_zipPath, data] of this.zipFiles!.entries()) {
      totalSize += data?.length || 0;
    }

    this.totalSize = totalSize;

    this.logger.debug(
      () =>
        `File index built: ${this.namespaces.size} namespaces, ` +
        `${processedCount} files indexed, total size: ${totalSize} bytes`,
    );
  }

  /**
   * Check if file exists using the lightweight index
   * @private
   */
  private fileExists(path: string): boolean {
    const normalizedPath = this.normalizePath(path);

    // Quick existence check using our lightweight index (case-insensitive)
    return this.fileIndex.has(normalizedPath);
  }

  /**
   * Extract a single file from the already extracted ZIP files using case-insensitive lookup.
   * Converts Uint8Array to string using TextDecoder for efficient content retrieval.
   * Uses cached content when available to avoid repeated decoding.
   *
   * @param path The file path to extract
   * @returns Promise that resolves to the file content or undefined if not found
   * @private
   */
  private async extractFileFromZip(path: string): Promise<string | undefined> {
    const normalizedPath = this.normalizePath(path);

    // Quick existence check using our lightweight index
    if (!this.fileIndex.has(normalizedPath)) {
      return undefined;
    }

    // Check cache first to avoid repeated decoding
    if (this.decodedContentCache.has(normalizedPath)) {
      this.accessCount++;
      return this.decodedContentCache.get(normalizedPath);
    }

    // Use normalizedToZipPath map for O(1) lookup instead of iteration
    const zipPath = this.normalizedToZipPath.get(normalizedPath);
    if (!zipPath || !this.zipFiles) {
      return undefined;
    }

    const data = this.zipFiles.get(zipPath);
    if (!data) {
      return undefined;
    }

    // Convert Uint8Array to string
    const content = new TextDecoder('utf-8').decode(data);

    // Cache the decoded content for future access
    this.decodedContentCache.set(normalizedPath, content);

    // Update access statistics
    this.accessCount++;

    return content;
  }

  public static getInstance(): ResourceLoader {
    if (!ResourceLoader.instance) {
      ResourceLoader.instance = new ResourceLoader();
    }
    return ResourceLoader.instance;
  }

  /**
   * Reset the singleton instance (for testing purposes only)
   * This allows tests to create fresh instances without singleton reuse
   */
  public static resetInstance(): void {
    ResourceLoader.instance = null as any;
    // Clear embedded ZIP cache to prevent stale buffer reuse
    clearEmbeddedZipCache();
    // Clear protobuf cache as well
    StandardLibraryCacheLoader.clearCache();
  }

  /**
   * Set the ZIP buffer directly and extract files.
   * Called internally by loadEmbeddedZipBuffer().
   *
   * @param buffer The ZIP file as a Uint8Array buffer
   * @private
   */
  private setZipBuffer(buffer: Uint8Array): void {
    this.logger.debug(
      () => `📦 Setting ZIP buffer directly (${buffer.length} bytes)`,
    );
    this.zipBuffer = buffer;
    this.extractZipFiles();
    this.logger.debug(
      () =>
        `✅ ZIP buffer loaded: ${this.fileIndex.size} classes, ${this.namespaces.size} namespaces`,
    );
  }

  /**
   * Get file content with lazy loading from ZIP resources.
   * Uses case-insensitive path lookup and efficient Uint8Array to string conversion.
   *
   * @param path The file path (case-insensitive)
   * @returns Promise that resolves to the file content or undefined if not found
   */
  public async getFile(path: string): Promise<string | undefined> {
    if (!this.initialized) {
      throw new Error(
        'ResourceLoader not initialized. Call initialize() first.',
      );
    }

    // Extract file on-demand from ZIP
    return this.extractFileFromZip(path);
  }

  /**
   * Normalize path for consistent lookup
   * @private
   */
  private normalizePath(path: string): string {
    return normalizeApexPath(path);
  }

  /**
   * Check if a class exists without loading content using lightweight file index.
   * Uses case-insensitive path lookup for efficient existence checking.
   *
   * @param className The class name to check (case-insensitive)
   * @returns true if the class exists
   */
  public hasClass(className: string): boolean {
    // This method works without initialization since it only checks existence
    return this.fileExists(className);
  }

  /**
   * Get available class names without loading content using lightweight file index.
   * Returns all files that were indexed during ZIP extraction.
   *
   * @returns Array of available class names (case-preserved)
   */
  public getAvailableClasses(): string[] {
    // This method works without initialization since it only returns the file list
    return [...this.originalPaths.values()];
  }

  /**
   * Get namespace structure built from ZIP file organization.
   * Returns a map of namespace names to their associated class files.
   *
   * @returns Map of namespaces to their class files (case-preserved)
   */
  public getStandardNamespaces(): Map<string, CIS[]> {
    // Return the namespaces map directly since it's already a regular Map
    return this.namespaces;
  }

  /**
   * Get namespaces in dependency order (dependencies first)
   * Cached after first call. Uses topological sort of namespace dependency graph.
   *
   * @returns Array of namespace names in optimal load order
   */
  public getNamespaceDependencyOrder(): string[] {
    if (this.namespaceDependencyOrder) {
      this.logger.debug(
        `Using cached dependency order: ${this.namespaceDependencyOrder.slice(0, 5).join(', ')}...`,
      );
      return this.namespaceDependencyOrder;
    }

    // Build from standard library symbol tables if available
    if (!this.standardLibrarySymbolData) {
      // Fallback: return alphabetical order if standard library symbol data not available
      this.logger.warn(
        '⚠️  Standard library symbol data not available, using alphabetical namespace order (FALLBACK)',
      );
      const fallback = [...this.getStandardNamespaces().keys()];
      this.logger.warn(
        `Alphabetical order: ${fallback.slice(0, 10).join(', ')}...`,
      );
      return fallback;
    }

    this.logger.debug(
      'Computing namespace dependency order from standard library symbol data...',
    );
    const deps = NamespaceDependencyAnalyzer.analyzeFromProtobuf(
      this.standardLibrarySymbolData.symbolTables,
    );

    this.logger.debug(`Analyzed ${deps.size} namespaces for dependencies`);

    this.namespaceDependencyOrder =
      NamespaceDependencyAnalyzer.topologicalSort(deps);

    const first10 = this.namespaceDependencyOrder.slice(0, 10).join(', ');
    const total = this.namespaceDependencyOrder.length;
    this.logger.debug(
      `✓ Namespace dependency order computed: ${first10}... (${total} total)`,
    );

    return this.namespaceDependencyOrder;
  }

  /**
   * Check if a namespace is a standard Apex namespace using case-insensitive lookup.
   * Uses namespaceIndex for O(1) lookup instead of iteration.
   *
   * @param namespace The namespace to check (string or CaseInsensitiveString)
   * @returns true if the namespace exists in the standard library
   */
  public isStdApexNamespace(namespace: string | CIS): boolean {
    // Check if any namespace matches case-insensitively using O(1) lookup
    const searchNamespace =
      typeof namespace === 'string' ? namespace : namespace.value;

    return this.namespaceIndex.has(searchNamespace.toLowerCase());
  }

  /**
   * Get all files with lazy loading from ZIP resources.
   * Loads all files in parallel using efficient ZIP extraction.
   * Uses cached content when available to avoid redundant decoding.
   *
   * @returns Promise that resolves to all file contents as CaseInsensitivePathMap
   */
  public async getAllFiles(): Promise<CaseInsensitivePathMap<string>> {
    if (!this.initialized) {
      throw new Error(
        'ResourceLoader not initialized. Call initialize() first.',
      );
    }

    const result = new CaseInsensitivePathMap<string>();

    // Load all files in parallel, using cached content when available
    const loadPromises = [...this.originalPaths.values()].map(async (path) => {
      // getFile() will use cached content if available
      const content = await this.getFile(path);
      if (content) {
        result.set(path, content);
      }
    });

    await Promise.all(loadPromises);
    return result;
  }

  /**
   * Initialize method for compatibility.
   * Loads from standard library symbol data cache unless a ZIP buffer was explicitly provided.
   */
  public async initialize(): Promise<void> {
    if (!this.initialized) {
      this.logger.warn(
        () =>
          'Initialize called but ResourceLoader should already be initialized',
      );
    }

    // Load standard library symbol data first (fast path for symbols)
    // Always try to load protobuf cache for symbol tables, regardless of zipBuffer
    if (!this.standardLibrarySymbolDataLoaded) {
      await this.tryLoadFromStandardLibrarySymbolData();
    }

    // Load ZIP buffer for source code (unless explicitly provided via setZipBuffer)
    // This check prevents double-loading in tests that inject ZIP buffers
    if (!this.zipBuffer) {
      await this.loadEmbeddedZipBuffer();
    }

    // Log statistics after both artifacts loaded
    this.logLoadingStatistics();
  }

  /**
   * Load standard library symbol data from cache.
   * Returns true if successful.
   */
  private async tryLoadFromStandardLibrarySymbolData(): Promise<boolean> {
    // Check if protobuf cache is available
    if (!isProtobufCacheAvailable()) {
      this.logger.error('Standard library symbol data cache not available');
      return false;
    }

    try {
      const loader = StandardLibraryCacheLoader.getInstance();
      const result = await loader.load();

      if (result.success && result.loadMethod === 'protobuf' && result.data) {
        this.standardLibrarySymbolDataLoaded = true;
        this.standardLibrarySymbolData = result.data;

        // Populate namespace index from standard library symbol data (await to ensure registry is loaded)
        await this.populateFromStandardLibrarySymbolData(result.data);

        // Note: Detailed loading stats already logged by StandardLibraryCacheLoader
        return true;
      }

      this.logger.error(
        () =>
          `Standard library symbol data load failed: ${result.error || 'unknown error'}`,
      );
      return false;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        () => `Standard library symbol data load failed: ${errorMsg}`,
      );
      return false;
    }
  }

  /**
   * Load embedded ZIP buffer for source code access
   * Handles errors gracefully - ZIP loading failure should not prevent symbol usage
   */
  private async loadEmbeddedZipBuffer(): Promise<void> {
    try {
      this.logger.debug('📦 Loading embedded Standard Apex Library ZIP...');

      const embeddedZip = getEmbeddedStandardLibraryZip();
      if (embeddedZip) {
        this.logger.debug(
          () => `📦 Embedded ZIP available (${embeddedZip.length} bytes)`,
        );
        this.setZipBuffer(embeddedZip);
      } else {
        this.logger.warn(
          '⚠️ Embedded Standard Apex Library ZIP not available. ' +
            'Goto definition for standard library classes may not work.',
        );
      }
    } catch (zipError) {
      // ZIP loading failure should not prevent symbols from being available
      this.logger.warn(
        `⚠️ Failed to load ZIP for source content: ${zipError}. ` +
          'Symbols are still available from standard library symbol data cache.',
      );
    }
  }

  /**
   * Log statistics about loaded resources
   */
  private logLoadingStatistics(): void {
    try {
      const stats = this.getDirectoryStatistics();
      this.logger.debug(
        () =>
          '✅ Standard library resources loaded successfully: ' +
          `${stats.totalFiles} files across ${stats.namespaces.length} namespaces`,
      );

      // Log which artifacts are available
      const artifacts: string[] = [];
      if (this.standardLibrarySymbolDataLoaded)
        artifacts.push('standard library symbol data');
      if (this.zipBuffer) artifacts.push('ZIP buffer');

      this.logger.debug(
        () => `📦 Available artifacts: ${artifacts.join(', ') || 'none'}`,
      );
    } catch (error) {
      this.logger.debug(
        () =>
          `Could not log statistics: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Populate ResourceLoader data structures from standard library symbol data.
   * This sets up namespace indexes and file mappings from the cached data.
   */
  private async populateFromStandardLibrarySymbolData(
    data: DeserializationResult,
  ): Promise<void> {
    // Populate namespace index from cached data
    for (const [fileUri, _symbolTable] of data.symbolTables) {
      // Extract namespace from file URI (format: apexlib://resources/StandardApexLibrary/{namespace}/{className}.cls)
      const match = fileUri.match(
        /apexlib:\/\/resources\/StandardApexLibrary\/([^/]+)\/([^/]+)\.cls$/,
      );
      if (match) {
        const namespace = match[1];
        const className = match[2];

        // Add to namespace index
        const namespaceLower = namespace.toLowerCase();
        if (!this.namespaceIndex.has(namespaceLower)) {
          this.namespaceIndex.set(namespaceLower, namespace);
        }

        // Add to namespaces map
        if (!this.namespaces.has(namespace)) {
          this.namespaces.set(namespace, []);
        }
        this.namespaces.get(namespace)!.push(CIS.from(`${className}.cls`));

        // Add to file index
        const filePath = `${namespace}/${className}.cls`;
        this.fileIndex.set(filePath, true);
        this.originalPaths.set(filePath, filePath);

        // Add to classNameToNamespace
        const existingNamespaces = this.classNameToNamespace.get(className);
        if (existingNamespaces) {
          existingNamespaces.add(namespace);
        } else {
          this.classNameToNamespace.set(className, new Set([namespace]));
        }
      }
    }

    this.logger.debug(
      () =>
        `Populated from standard library symbol data: ${this.namespaces.size} namespaces, ` +
        `${this.fileIndex.size} files indexed`,
    );

    // Initialize the GlobalTypeRegistry from pre-built cache (await completion)
    await this.initializeTypeRegistry();
  }

  /**
   * Initialize GlobalTypeRegistry from pre-built cache file.
   * Loads apex-type-registry.pb.gz and populates the Effect service.
   *
   * @private
   */
  private async initializeTypeRegistry(): Promise<void> {
    const { validateMD5Checksum } = await import('./checksum-validator');

    const registryResult = await this.loadRegistryCacheFile();
    if (!registryResult) {
      throw new Error(
        'Type registry cache file not found (apex-type-registry.pb.gz). ' +
          "This is a required build artifact. Please rebuild the extension with 'npm run build'.",
      );
    }

    // Validate checksum (skip for embedded builds where checksumContent is empty)
    if (registryResult.checksumContent) {
      validateMD5Checksum(
        'apex-type-registry.pb.gz',
        registryResult.data,
        registryResult.checksumContent,
      );
    }

    const entries = loadTypeRegistryFromGzip(registryResult.data);

    if (entries.length === 0) {
      throw new Error(
        'Type registry is empty. The apex-type-registry.pb.gz file may be corrupted. ' +
          "Please rebuild the extension with 'npm run build'.",
      );
    }

    const program = Effect.gen(function* () {
      const registry = yield* GlobalTypeRegistry;

      // Register all entries
      for (const entry of entries) {
        yield* registry.registerType(entry);
      }

      const stats = yield* registry.getStats();
      return stats;
    });

    const stats = await Effect.runPromise(
      program.pipe(Effect.provide(GlobalTypeRegistryLive)),
    );

    this.logger.alwaysLog(
      () =>
        `Loaded type registry from cache in <1ms (${stats.totalTypes} types)`,
    );
  }

  /**
   * Load the type registry cache file
   * Tries embedded data URL first, then falls back to disk
   *
   * @private
   */
  private async loadRegistryCacheFile(): Promise<{
    data: Uint8Array;
    checksumContent: string;
  } | null> {
    // Import checksum validator
    const { ChecksumFileMissingError, ChecksumValidationError } = await import(
      './checksum-validator'
    );

    // Try embedded data URL first (production builds)
    // Note: For embedded builds, checksums should be validated at build time
    // TODO: Embed checksum in data URL or separate module for production validation
    try {
      const { getEmbeddedStandardLibraryTypeRegistryDataUrl } = await import(
        '../cache/stdlib-type-registry-data'
      );
      const dataUrl = getEmbeddedStandardLibraryTypeRegistryDataUrl();
      if (dataUrl) {
        // Parse data URL and return binary
        const base64 = dataUrl.split(',')[1];
        const data = Buffer.from(base64, 'base64');
        // For embedded builds, we skip checksum validation as files are bundled
        // The build process should ensure integrity
        return {
          data: new Uint8Array(data),
          checksumContent: '', // Empty string for embedded builds (skip validation)
        };
      }
    } catch {
      // Module not found or data URL not available
    }

    // Fallback to disk (development)
    try {
      if (typeof require === 'undefined') {
        return null;
      }

      const fs = require('fs');
      const path = require('path');

      const possiblePaths = [
        // From out/utils/ -> ../../resources/
        path.resolve(__dirname, '../../resources/apex-type-registry.pb.gz'),
        // From src/utils/ -> ../../resources/
        path.resolve(__dirname, '../../resources/apex-type-registry.pb.gz'),
        // From dist/ -> resources/
        path.resolve(__dirname, '../resources/apex-type-registry.pb.gz'),
        // Absolute path based on process.cwd()
        path.resolve(process.cwd(), 'resources/apex-type-registry.pb.gz'),
      ];

      for (const registryPath of possiblePaths) {
        try {
          if (fs.existsSync(registryPath)) {
            const md5Path = `${registryPath}.md5`;
            if (!fs.existsSync(md5Path)) {
              throw new ChecksumFileMissingError('apex-type-registry.pb.gz');
            }
            const buffer = fs.readFileSync(registryPath);
            const checksumContent = fs.readFileSync(md5Path, 'utf8');
            return {
              data: new Uint8Array(buffer),
              checksumContent,
            };
          }
        } catch (error) {
          // Re-throw checksum errors
          if (
            error instanceof ChecksumFileMissingError ||
            error instanceof ChecksumValidationError
          ) {
            throw error;
          }
          // Try next path for other errors
        }
      }
    } catch (error) {
      // Re-throw checksum errors
      const {
        ChecksumFileMissingError: ChecksumMissingErr,
        ChecksumValidationError: ChecksumValidErr,
      } = await import('./checksum-validator');
      if (
        error instanceof ChecksumMissingErr ||
        error instanceof ChecksumValidErr
      ) {
        throw error;
      }
      // File system access failed
    }

    return null;
  }

  /**
   * Check if the standard library symbol data was loaded
   */
  public isStandardLibrarySymbolDataLoaded(): boolean {
    return this.standardLibrarySymbolDataLoaded;
  }

  /**
   * Get the standard library symbol data if loaded
   */
  public getStandardLibrarySymbolData(): DeserializationResult | null {
    return this.standardLibrarySymbolData;
  }

  /**
   * Get a symbol table from the standard library symbol data cache.
   * Handles various path formats and namespace resolution.
   *
   * @private
   */
  private getSymbolTableFromCache(className: string): SymbolTable | null {
    if (!this.standardLibrarySymbolData) {
      this.logger.debug(
        () =>
          '[DIAGNOSTIC] getSymbolTableFromCache: no standardLibrarySymbolData',
      );
      return null;
    }

    // Try to find the symbol table for this class
    // Handle various path formats:
    // - "System/String.cls" -> "apexlib://resources/StandardApexLibrary/System/String.cls"
    // - "String" -> "apexlib://resources/StandardApexLibrary/System/String.cls"

    // Normalize the class name
    let searchUri: string | null = null;
    const normalizedClassName = className.replace(/\.cls$/i, '');

    this.logger.debug(
      () =>
        `[DIAGNOSTIC] getSymbolTableFromCache: className="${className}", ` +
        `normalizedClassName="${normalizedClassName}"`,
    );

    // Check if it includes a namespace
    const pathParts = normalizedClassName.split(/[\/\\]/);
    if (pathParts.length >= 2) {
      const namespace = pathParts[0];
      const classNameOnly = pathParts[pathParts.length - 1];
      searchUri = `apexlib://resources/StandardApexLibrary/${namespace}/${classNameOnly}.cls`;
      this.logger.debug(
        () =>
          `[DIAGNOSTIC] Path has namespace: '${namespace}', ` +
          `className: '${classNameOnly}', searchUri: '${searchUri}'`,
      );
    } else {
      // Try to find by class name only - check all namespaces
      const tableCount = this.standardLibrarySymbolData!.symbolTables.size;
      this.logger.debug(
        () =>
          '[DIAGNOSTIC] No namespace in path, searching by class name ' +
          `only in ${tableCount} symbol tables`,
      );
      for (const [uri, _symbolTable] of this.standardLibrarySymbolData
        .symbolTables) {
        if (uri.endsWith(`/${normalizedClassName}`)) {
          searchUri = uri;
          this.logger.debug(
            () => `[DIAGNOSTIC] Found matching URI by suffix: '${searchUri}'`,
          );
          break;
        }
      }
    }

    if (!searchUri) {
      this.logger.debug(
        () =>
          `[DIAGNOSTIC] Could not determine searchUri for className="${className}"`,
      );
      return null;
    }

    const symbolTable =
      this.standardLibrarySymbolData!.symbolTables.get(searchUri);
    if (!symbolTable) {
      // Debug: List some example URIs from the cache to help diagnose
      const sampleUris = Array.from(
        this.standardLibrarySymbolData!.symbolTables.keys(),
      ).slice(0, 10);
      this.logger.debug(
        () =>
          `[DIAGNOSTIC] No symbol table found for searchUri='${searchUri}' in standard library symbol data cache. ` +
          `Cache has ${this.standardLibrarySymbolData!.symbolTables.size} entries. ` +
          `Sample URIs: ${sampleUris.join(', ')}`,
      );
      return null;
    }

    this.logger.debug(
      () =>
        '[DIAGNOSTIC] Found symbol table for ' +
        `searchUri='${searchUri}' in standard library symbol data cache`,
    );

    return symbolTable;
  }

  /**
   * Get all symbol tables from the standard library symbol data cache.
   * @returns Map of all symbol tables (fileUri -> SymbolTable)
   */
  public getAllSymbolTables(): Map<string, SymbolTable> {
    if (!this.initialized) {
      throw new Error(
        'ResourceLoader not initialized. Call initialize() first.',
      );
    }

    if (!this.standardLibrarySymbolData) {
      return new Map();
    }

    return this.standardLibrarySymbolData.symbolTables;
  }

  /**
   * Get enhanced statistics about loaded resources
   * @returns Statistics object
   */
  public getStatistics(): {
    totalFiles: number;
    loadedFiles: number;
    symbolTablesLoaded: number;
    directoryStructure: {
      totalFiles: number;
      totalSize: number;
      namespaces: string[];
    };
    lazyFileStats: {
      totalEntries: number;
      loadedEntries: number;
      averageAccessCount: number;
    };
    memfsStats: {
      totalFiles: number;
      totalSize: number;
    };
  } {
    const totalFiles = this.fileIndex.size;
    const symbolTablesLoaded = this.standardLibrarySymbolData
      ? this.standardLibrarySymbolData.symbolTables.size
      : 0;

    return {
      totalFiles,
      loadedFiles: this.accessCount, // Use access count as loaded files
      symbolTablesLoaded,
      directoryStructure: {
        totalFiles,
        totalSize: this.totalSize,
        namespaces: [...this.namespaces.keys()],
      },
      lazyFileStats: {
        totalEntries: totalFiles,
        loadedEntries: this.accessCount, // Use access count
        averageAccessCount:
          this.accessCount > 0 && totalFiles > 0
            ? this.accessCount / totalFiles
            : 0,
      },
      memfsStats: {
        totalFiles,
        totalSize: this.totalSize,
      },
    };
  }

  /**
   * Get directory structure statistics
   * @returns Directory structure statistics
   */
  public getDirectoryStatistics(): {
    totalFiles: number;
    totalSize: number;
    namespaces: string[];
  } {
    // This method works without initialization since it only returns directory stats
    return {
      totalFiles: this.fileIndex.size,
      totalSize: this.totalSize,
      namespaces: [...this.namespaces.keys()],
    };
  }

  /**
   * Get the MultiVolumeFileSystem for advanced operations (deprecated)
   * @returns The MultiVolumeFileSystem instance
   * @deprecated MultiVolumeFileSystem is no longer used. Use direct file access methods instead.
   */
  public getMultiVolumeFileSystem(): never {
    throw new Error(
      'MultiVolumeFileSystem is no longer available. Use direct file access methods instead.',
    );
  }

  /**
   * Get the memfs volume for advanced operations (deprecated)
   * @returns The memfs Volume instance from the apexlib volume
   * @deprecated Use direct file access methods instead
   */
  public getMemfsVolume(): never {
    throw new Error(
      'memfs volume is no longer available. Use direct file access methods instead.',
    );
  }

  /**
   * Export the current file system state as JSON (deprecated)
   * @returns JSON representation of the file system
   * @deprecated File system export is no longer supported in streaming mode
   */
  public exportToJSON(): Record<string, string | null> {
    throw new Error(
      'File system export is no longer supported in streaming mode.',
    );
  }

  /**
   * Reset the ResourceLoader and clear all data
   */
  public reset(): void {
    this.fileIndex.clear();
    this.originalPaths.clear();
    this.normalizedToZipPath.clear();
    this.decodedContentCache.clear();
    this.namespaceIndex.clear();
    this.classNameToNamespace.clear();
    this.namespaces.clear();
    this.initialized = false;

    // Re-extract ZIP and rebuild file index if buffer is available
    if (this.zipBuffer) {
      const buffer = this.zipBuffer; // Local variable for type narrowing
      let extractedFiles;
      try {
        extractedFiles = unzipSync(buffer);
      } catch (error) {
        throw new Error(
          'Failed to extract StandardApexLibrary.zip during reset: ' +
            `${error instanceof Error ? error.message : String(error)}. ` +
            "The ZIP file may be corrupted. Please rebuild the extension with 'npm run build'.",
        );
      }
      this.zipFiles = new CaseInsensitivePathMap<Uint8Array>();

      // Convert to CaseInsensitivePathMap and preserve original paths
      for (const [originalPath, data] of Object.entries(extractedFiles)) {
        this.zipFiles.set(originalPath, data);

        // Also preserve the relative path mapping for later use
        // Handle StandardApexLibrary paths
        let relativePath = originalPath.replace(/\\/g, '/');
        if (relativePath.startsWith('src/resources/StandardApexLibrary/')) {
          relativePath = relativePath.replace(
            /^src\/resources\/StandardApexLibrary\//,
            '',
          );
        }
        this.originalPaths.set(relativePath, relativePath);

        // Rebuild normalized path to ZIP path mapping
        const normalizedPath = this.normalizePath(relativePath);
        this.normalizedToZipPath.set(normalizedPath, originalPath);
      }

      this.buildFileIndex();
    }

    this.initialized = true;
  }

  /**
   * Get a symbol table for a standard Apex class from the protobuf cache.
   * The standard library symbol data cache has 100% coverage of all standard library classes,
   * validated at build time.
   *
   * @param className The class name to load (e.g., "System/String.cls" or "String")
   * @returns Promise that resolves to the symbol table or null if not found in cache
   */
  public async getSymbolTable(className: string): Promise<SymbolTable | null> {
    // DIAGNOSTIC: Check standard library symbol data cache
    this.logger.debug(
      () =>
        `[DIAGNOSTIC] getSymbolTable("${className}") - ` +
        `standardLibrarySymbolDataLoaded: ${this.standardLibrarySymbolDataLoaded}, ` +
        `hasData: ${this.standardLibrarySymbolData !== null}`,
    );

    if (
      this.standardLibrarySymbolDataLoaded &&
      this.standardLibrarySymbolData
    ) {
      const symbolTable = this.getSymbolTableFromCache(className);
      this.logger.debug(
        () =>
          `[DIAGNOSTIC] getSymbolTableFromCache("${className}") ` +
          `returned: ${symbolTable ? 'FOUND' : 'NULL'}`,
      );
      if (symbolTable) {
        this.logger.debug(
          () =>
            '[DIAGNOSTIC] Returning symbol table from cache ' +
            `for ${className}`,
        );
        return symbolTable;
      }
    }

    // Class not found in standard library symbol data cache - this should not happen
    // Build validation ensures 100% cache coverage
    this.logger.debug(
      () =>
        `Class ${className} not found in standard library symbol data cache. ` +
        'This indicates missing or corrupted cache file. ' +
        'Standard library symbol data cache should have 100% coverage of all ' +
        'standard library classes.',
    );
    return null;
  }

  /**
   * Get symbol table for a class from the standard library symbol data cache.
   * This is an alias for getSymbolTable() for backward compatibility.
   *
   * @param className The class name to get the symbol table for
   * @returns Promise that resolves to the symbol table or null if not found in cache
   */
  public async getCompiledArtifact(
    className: string,
  ): Promise<SymbolTable | null> {
    return this.getSymbolTable(className);
  }

  /**
   * Check if a symbol name could potentially be resolved from standard library.
   * This helps the symbol manager decide whether to attempt lazy loading from ZIP resources.
   *
   * @param symbolName The symbol name to check
   * @returns true if the symbol could potentially be resolved from standard library
   */
  public couldResolveSymbol(symbolName: string): boolean {
    // Check if this looks like a standard Apex class reference
    const parts = symbolName.split('.');

    if (parts.length === 1) {
      // Single name - check if it's a namespace or class
      // Use classNameToNamespace map for O(1) class lookup
      const classNamespaces = this.findNamespaceForClass(parts[0]);
      return this.namespaces.has(parts[0]) || classNamespaces.size > 0;
    }

    if (parts.length === 2) {
      // Namespace.Class format
      const namespace = parts[0];
      const className = parts[1];
      const namespaceFiles = this.namespaces.get(namespace);
      return (
        this.namespaces.has(namespace) &&
        namespaceFiles !== undefined &&
        [...namespaceFiles].some((file) =>
          file.includes(CIS.from(`${className}.cls`)),
        )
      );
    }

    return false;
  }

  /**
   * Get potential standard library matches for a symbol name from ZIP resources.
   * This helps with fuzzy matching and suggestions using case-insensitive lookup.
   *
   * @param symbolName The symbol name to find matches for
   * @returns Array of potential matches (limited to 10 results)
   */
  public getPotentialMatches(symbolName: string): string[] {
    const matches: string[] = [];
    const normalizedName = symbolName.toLowerCase();

    for (const originalPath of this.originalPaths.values()) {
      if (originalPath.toLowerCase().includes(normalizedName)) {
        matches.push(originalPath);
      }
    }

    return matches.slice(0, 10); // Limit results
  }

  /**
   * Check if a symbol table is available in the standard library symbol data cache (synchronous).
   *
   * @param className The class name to check
   * @returns true if the symbol table is available in cache
   */
  public hasSymbolTable(className: string): boolean {
    if (!this.standardLibrarySymbolData) {
      return false;
    }
    const symbolTable = this.getSymbolTableFromCache(className);
    return symbolTable !== null;
  }

  /**
   * Clear the decoded content cache to free memory.
   * Useful when memory pressure is a concern.
   */
  public clearCache(): void {
    this.decodedContentCache.clear();
    this.logger.debug(() => 'Decoded content cache cleared');
  }

  /**
   * Get all class names available in the standard library symbol data cache.
   *
   * @returns Array of class names (file URIs from cache)
   */
  public getCompiledClassNames(): string[] {
    if (!this.standardLibrarySymbolData) {
      return [];
    }
    return Array.from(this.standardLibrarySymbolData.symbolTables.keys());
  }

  /**
   * Find all namespaces that contain a specific class using case-insensitive lookup.
   * Uses classNameToNamespace reverse index for O(1) lookup instead of nested iteration.
   *
   * @param className The class name to search for (case-insensitive)
   * @returns Set of namespaces containing the class, or empty Set if not found
   */
  public findNamespaceForClass(className: string): Set<string> {
    // Use reverse index for O(1) lookup
    const normalizedClassName = className.replace(/\.cls$/i, '');
    const namespaces = this.classNameToNamespace.get(normalizedClassName);

    if (namespaces && namespaces.size > 0) {
      return namespaces;
    }

    // Fallback: try with normalized path if it looks like a path
    const normalizedPath = this.normalizePath(className);
    const namespacesFromPath = this.classNameToNamespace.get(normalizedPath);
    return namespacesFromPath && namespacesFromPath.size > 0
      ? namespacesFromPath
      : new Set<string>();
  }
}
