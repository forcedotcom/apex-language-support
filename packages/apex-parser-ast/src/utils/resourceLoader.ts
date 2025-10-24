/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { unzipSync } from 'fflate';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { CaseInsensitivePathMap } from './CaseInsensitiveMap';
import { CaseInsensitiveString as CIS } from './CaseInsensitiveString';
import { normalizeApexPath } from './PathUtils';
import { CompilerService, CompilationOptions } from '../parser/compilerService';
import { ApexSymbolCollectorListener } from '../parser/listeners/ApexSymbolCollectorListener';
import type { CompilationResultWithAssociations } from '../parser/compilerService';
import { SymbolTable } from '../types/symbol';
import { UriUtils } from './ResourceUtils';

export interface ResourceLoaderOptions {
  loadMode?: 'lazy' | 'full';
  preloadStdClasses?: boolean;
  zipBuffer?: Uint8Array; // Direct ZIP buffer to use
}

interface CompiledArtifact {
  path: string;
  compilationResult: CompilationResultWithAssociations<SymbolTable>;
}

/**
 * ResourceLoader class for loading and compiling standard Apex classes from ZIP resources.
 *
 * Core Responsibilities:
 * - Receive ZIP buffer via setZipBuffer() method
 * - Extract and index files using fflate for efficient in-memory storage
 * - Provide lazy loading of file contents on-demand
 * - Compile source code using CompilerService when needed
 *
 * Resource Loading Strategy:
 * - ZIP buffer is provided directly via setZipBuffer() method
 * - Typically called by the language server after receiving data from client
 * - Works uniformly across all environments (web and desktop)
 *
 * @example
 * ```typescript
 * const loader = ResourceLoader.getInstance({ loadMode: 'lazy' });
 *
 * // Set ZIP buffer (typically from language server)
 * const zipData = new Uint8Array([...]); // ZIP file bytes
 * loader.setZipBuffer(zipData);
 *
 * // Content loaded on-demand from ZIP
 * const source = await loader.getFile('System/System.cls');
 * ```
 */
export class ResourceLoader {
  private static instance: ResourceLoader;
  // Store compiled artifacts for backward compatibility
  private compiledArtifacts: CaseInsensitivePathMap<CompiledArtifact> =
    new CaseInsensitivePathMap();
  private initialized = false;
  private compilationPromise: Promise<void> | null = null;
  private loadMode: 'lazy' | 'full' = 'full';
  private preloadStdClasses: boolean = false;
  private readonly logger = getLogger();
  private compilerService: CompilerService;
  private namespaces: Map<string, CIS[]> = new Map(); // Key is original case namespace
  private fileIndex: CaseInsensitivePathMap<boolean> =
    new CaseInsensitivePathMap(); // Lightweight existence index with case-insensitive keys
  private originalPaths: CaseInsensitivePathMap<string> =
    new CaseInsensitivePathMap(); // Maps case-insensitive paths to original case paths
  private totalSize: number = 0; // Total size of all files
  private accessCount: number = 0; // Simple access counter for statistics
  private zipBuffer?: Uint8Array; // Will be initialized via setZipBuffer
  private zipFiles!: CaseInsensitivePathMap<Uint8Array>; // Will be initialized in extractZipFiles

  private constructor(options?: ResourceLoaderOptions) {
    if (options?.loadMode) {
      this.loadMode = options.loadMode;
    }
    if (options?.preloadStdClasses) {
      this.preloadStdClasses = options.preloadStdClasses;
    }

    this.compilerService = new CompilerService();

    // Initialize empty structure initially
    this.initializeEmptyStructure();

    // If a ZIP buffer is provided directly, use it immediately
    if (options?.zipBuffer) {
      this.logger.debug(() => '📦 Using provided ZIP buffer directly');
      this.zipBuffer = options.zipBuffer;
      this.extractZipFiles();
      this.initialized = true;
    } else {
      // Wait for setZipBuffer() to be called
      this.logger.debug(
        () => '📦 Waiting for ZIP buffer to be provided via setZipBuffer()',
      );
      this.initialized = true;
    }
  }

  /**
   * Initialize empty structure
   * @private
   */
  private initializeEmptyStructure(): void {
    this.zipFiles = new CaseInsensitivePathMap<Uint8Array>();
    this.fileIndex = new CaseInsensitivePathMap<boolean>();
    this.originalPaths = new CaseInsensitivePathMap<string>();
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

    const extractedFiles = unzipSync(this.zipBuffer);
    this.zipFiles = new CaseInsensitivePathMap<Uint8Array>();

    // Convert to CaseInsensitivePathMap and preserve original paths
    for (const [originalPath, data] of Object.entries(extractedFiles)) {
      this.zipFiles.set(originalPath, data);

      // Also preserve the relative path mapping for later use
      const relativePath = originalPath
        .replace(/^src\/resources\/StandardApexLibrary\//, '')
        .replace(/\\/g, '/');
      this.originalPaths.set(relativePath, relativePath);
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
    for (const [_key, originalPath] of this.originalPaths.entries()) {
      if (!originalPath) continue;

      const pathParts = originalPath.split('/');
      const namespace = pathParts.length > 1 ? pathParts[0] : undefined;
      const fileName = pathParts[pathParts.length - 1];

      if (namespace) {
        // Find existing namespace with case-insensitive lookup, but preserve original case
        let existingNamespaceKey = namespace;
        for (const existingKey of this.namespaces.keys()) {
          if (existingKey.toLowerCase() === namespace.toLowerCase()) {
            existingNamespaceKey = existingKey;
            break;
          }
        }

        if (!this.namespaces.has(existingNamespaceKey)) {
          this.namespaces.set(existingNamespaceKey, []);
        }
        this.namespaces.get(existingNamespaceKey)!.push(CIS.from(fileName));
      }

      // Store in lightweight index for existence checks
      this.fileIndex.set(originalPath, true);
      processedCount++;
    }

    // Calculate total size from zipFiles directly
    for (const [_zipPath, data] of this.zipFiles.entries()) {
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

    // Use CaseInsensitivePathMap to find the file directly
    // We need to find the original zip path that corresponds to our normalized path
    for (const [zipPath, data] of this.zipFiles.entries()) {
      const relativePath = zipPath
        .replace(/^src\/resources\/StandardApexLibrary\//, '')
        .replace(/\\/g, '/');

      if (relativePath.toLowerCase() === normalizedPath.toLowerCase()) {
        // Convert Uint8Array to string
        const content = new TextDecoder('utf-8').decode(data);

        // Update access statistics
        this.accessCount++;

        return content;
      }
    }

    return undefined;
  }

  public static getInstance(options?: ResourceLoaderOptions): ResourceLoader {
    if (!ResourceLoader.instance) {
      ResourceLoader.instance = new ResourceLoader(options);
    }
    return ResourceLoader.instance;
  }

  /**
   * Set the ZIP buffer directly and extract files.
   * This is the preferred method for providing the standard library ZIP data.
   *
   * @param buffer The ZIP file as a Uint8Array buffer
   */
  public setZipBuffer(buffer: Uint8Array): void {
    this.logger.info(
      () => `📦 Setting ZIP buffer directly (${buffer.length} bytes)`,
    );
    this.zipBuffer = buffer;
    this.extractZipFiles();
    this.logger.info(
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
   * Check if a namespace is a standard Apex namespace using case-insensitive lookup.
   *
   * @param namespace The namespace to check (string or CaseInsensitiveString)
   * @returns true if the namespace exists in the standard library
   */
  public isStdApexNamespace(namespace: string | CIS): boolean {
    // Check if any namespace matches case-insensitively
    const searchNamespace =
      typeof namespace === 'string' ? namespace : namespace.value;

    for (const existingNamespace of this.namespaces.keys()) {
      if (existingNamespace.toLowerCase() === searchNamespace.toLowerCase()) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get all files with lazy loading from ZIP resources.
   * Loads all files in parallel using efficient ZIP extraction.
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

    // Load all files in parallel using streaming ZIP extraction
    const loadPromises = [...this.originalPaths.values()].map(async (path) => {
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
   * Note: ResourceLoader is automatically initialized during construction.
   */
  public async initialize(): Promise<void> {
    if (!this.initialized) {
      this.logger.warn(
        () =>
          'Initialize called but ResourceLoader should already be initialized',
      );
    }
  }

  /**
   * Compile all artifacts and store results
   * @private
   */
  private async compileAllArtifacts(): Promise<void> {
    this.logger.debug(
      () =>
        'Starting parallel compilation of all artifacts using CompilerService...',
    );

    const startTime = Date.now();

    // Prepare files for compilation with their namespaces
    const filesToCompile: Array<{
      content: string;
      fileName: string;
      listener: ApexSymbolCollectorListener;
      options: CompilationOptions;
    }> = [];

    // Get all files for compilation
    const allFiles = await this.getAllFiles();

    for (const [path, content] of allFiles.entries()) {
      if (content) {
        // Extract namespace from parent folder path
        const pathParts = path.split(/[\/\\]/);
        const namespace = pathParts.length > 1 ? pathParts[0] : undefined;

        filesToCompile.push({
          content,
          fileName: path.toString(),
          listener: new ApexSymbolCollectorListener(),
          options: {
            projectNamespace: namespace,
            includeComments: true,
            includeSingleLineComments: false,
            associateComments: true,
          },
        });
      }
    }

    this.logger.debug(() => `Found ${filesToCompile.length} files to compile`);

    if (filesToCompile.length === 0) {
      this.logger.debug(() => 'No files to compile');
      return;
    }

    try {
      this.logger.debug(
        () => 'Calling compileMultipleWithConfigs with parallel processing',
      );

      const results =
        await this.compilerService.compileMultipleWithConfigs(filesToCompile);

      this.logger.debug(
        () => `CompileMultipleWithConfigs returned ${results.length} results`,
      );

      // Process and store results
      let compiledCount = 0;
      let errorCount = 0;

      results.forEach((result) => {
        if (result.result) {
          const compilationResult =
            result as CompilationResultWithAssociations<SymbolTable>;

          // Convert dot notation back to path notation for consistency
          const originalPath = this.normalizePath(result.fileName);

          // Store in compiledArtifacts for backward compatibility
          this.compiledArtifacts.set(originalPath, {
            path: originalPath,
            compilationResult,
          });
          compiledCount++;

          if (result.errors.length > 0) {
            errorCount++;
          }
        } else {
          errorCount++;
          this.logger.debug(() => `Compilation failed for ${result.fileName}:`);
        }
      });

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      this.logger.debug(
        () =>
          `Parallel compilation completed in ${duration.toFixed(2)}s: ` +
          `${compiledCount} files compiled, ${errorCount} files with errors`,
      );
    } catch (error) {
      this.logger.error(() => 'Failed to compile artifacts:');
      throw error;
    }
  }

  /**
   * Get all compiled artifacts
   * @returns Map of all compiled artifacts
   */
  public getAllCompiledArtifacts(): CaseInsensitivePathMap<CompiledArtifact> {
    if (!this.initialized) {
      throw new Error(
        'ResourceLoader not initialized. Call initialize() first.',
      );
    }

    return this.compiledArtifacts;
  }

  /**
   * Wait for compilation to complete (only applicable when loadMode is 'full')
   * @returns Promise that resolves when compilation is complete
   */
  public async waitForCompilation(): Promise<void> {
    if (this.compilationPromise) {
      await this.compilationPromise;
    }
  }

  /**
   * Check if compilation is in progress
   * @returns true if compilation is currently running
   */
  public isCompiling(): boolean {
    return this.compilationPromise !== null;
  }

  /**
   * Get enhanced statistics about loaded and compiled resources
   * @returns Statistics object
   */
  public getStatistics(): {
    totalFiles: number;
    loadedFiles: number;
    compiledFiles: number;
    loadMode: string;
    directoryStructure: {
      totalFiles: number;
      totalSize: number;
      namespaces: string[];
    };
    lazyFileStats: {
      totalEntries: number;
      loadedEntries: number;
      compiledEntries: number;
      averageAccessCount: number;
    };
    memfsStats: {
      totalFiles: number;
      totalSize: number;
    };
  } {
    const totalFiles = this.fileIndex.size;
    let compiledFiles = 0;

    // Count compiled files
    for (const [_path, artifact] of this.compiledArtifacts.entries()) {
      if (artifact) {
        compiledFiles++;
      }
    }

    return {
      totalFiles,
      loadedFiles: this.accessCount, // Use access count as loaded files
      compiledFiles,
      loadMode: this.loadMode,
      directoryStructure: {
        totalFiles,
        totalSize: this.totalSize,
        namespaces: [...this.namespaces.keys()],
      },
      lazyFileStats: {
        totalEntries: totalFiles,
        loadedEntries: this.accessCount, // Use access count
        compiledEntries: compiledFiles,
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
    this.namespaces.clear();
    this.compiledArtifacts.clear();
    this.initialized = false;
    this.compilationPromise = null;

    // Re-extract ZIP and rebuild file index if buffer is available
    if (this.zipBuffer) {
      const buffer = this.zipBuffer; // Local variable for type narrowing
      const extractedFiles = unzipSync(buffer);
      this.zipFiles = new CaseInsensitivePathMap<Uint8Array>();

      // Convert to CaseInsensitivePathMap and preserve original paths
      for (const [originalPath, data] of Object.entries(extractedFiles)) {
        this.zipFiles.set(originalPath, data);

        // Also preserve the relative path mapping for later use
        const relativePath = originalPath
          .replace(/^src\/resources\/StandardApexLibrary\//, '')
          .replace(/\\/g, '/');
        this.originalPaths.set(relativePath, relativePath);
      }

      this.buildFileIndex();
    }

    this.initialized = true;
  }

  /**
   * Dynamically load and compile a single standard Apex class from ZIP resources.
   * Enables lazy loading using efficient ZIP extraction.
   *
   * @param className The class name to load and compile
   * @returns Promise that resolves to the compiled artifact or null if not found
   */
  public async loadAndCompileClass(
    className: string,
  ): Promise<CompiledArtifact | null> {
    // Check if class exists in our known structure
    if (!this.hasClass(className)) {
      this.logger.debug(
        () => `Class ${className} not found in standard library`,
      );
      return null;
    }

    try {
      // Load the file content from ZIP using our private method (this works without initialization)
      const content = await this.extractFileFromZip(className);

      if (!content) {
        this.logger.warn(() => `Failed to load content for ${className}`);
        return null;
      }

      // Compile the single class
      const symbolTable = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(symbolTable);

      // Convert className to proper URI scheme for standard Apex library classes
      const fileUri = UriUtils.createResourceUri(className);

      const result = this.compilerService.compile(
        content,
        fileUri, // Use proper URI scheme for standard Apex library classes
        listener,
        {
          includeComments: false,
          includeSingleLineComments: false,
          associateComments: false,
        }, // Minimal compilation for performance
      );

      if (result.errors.length > 0) {
        this.logger.debug(
          () =>
            `Compilation errors for ${className} (expected for stubs): ${result.errors.length} errors`,
        );
        // Continue processing despite errors - stubs are expected to have compilation issues
      }

      // Create compiled artifact - handle different result types
      let artifact: CompiledArtifact;

      if ('commentAssociations' in result && 'comments' in result) {
        // This is a CompilationResultWithAssociations
        artifact = {
          path: className,
          compilationResult:
            result as CompilationResultWithAssociations<SymbolTable>,
        };
      } else {
        // This is a regular CompilationResult - we need to convert it
        // For now, we'll create a minimal artifact
        artifact = {
          path: className,
          compilationResult: {
            ...result,
            commentAssociations: [],
            comments: [],
          } as CompilationResultWithAssociations<SymbolTable>,
        };
      }

      // Store in compiled artifacts map
      this.compiledArtifacts.set(className, artifact);

      this.logger.debug(() => `Successfully loaded and compiled ${className}`);
      return artifact;
    } catch (error) {
      this.logger.error(() => `Error loading/compiling ${className}: ${error}`);
      return null;
    }
  }

  /**
   * Check if a class is available and optionally load it from ZIP resources.
   * This is the main entry point for lazy loading of standard Apex classes.
   *
   * @param className The class name to ensure is loaded
   * @returns Promise that resolves to true if the class was loaded successfully
   */
  public async ensureClassLoaded(className: string): Promise<boolean> {
    // If already compiled, return true
    if (this.compiledArtifacts.has(className)) {
      return true;
    }

    // Try to load and compile
    const artifact = await this.loadAndCompileClass(className);
    return artifact !== null;
  }

  /**
   * Get compiled artifact for a class, loading it from ZIP resources if necessary.
   * Uses lazy loading to compile classes on-demand.
   *
   * @param className The class name to get the compiled artifact for
   * @returns Promise that resolves to the compiled artifact or null if not found
   */
  public async getCompiledArtifact(
    className: string,
  ): Promise<CompiledArtifact | null> {
    // If not compiled, try to load it
    if (!this.compiledArtifacts.has(className)) {
      await this.ensureClassLoaded(className);
    }

    return this.compiledArtifacts.get(className) || null;
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
      return (
        this.namespaces.has(parts[0]) ||
        [...this.originalPaths.values()].some((path) =>
          path.endsWith(`/${parts[0]}.cls`),
        )
      );
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
   * Check if a class is already compiled and available in memory.
   *
   * @param className The class name to check
   * @returns true if the class is already compiled
   */
  public isClassCompiled(className: string): boolean {
    return this.compiledArtifacts.has(className);
  }

  /**
   * Get all compiled class names currently in memory.
   *
   * @returns Array of compiled class names
   */
  public getCompiledClassNames(): string[] {
    return [...this.compiledArtifacts.keys()].map((key) => key.toString());
  }

  /**
   * Find the namespace that contains a specific class using case-insensitive lookup.
   * Searches through the namespace structure built from ZIP resources.
   *
   * @param className The class name to search for (case-insensitive)
   * @returns The namespace containing the class, or null if not found
   */
  public findNamespaceForClass(className: string): string | null {
    const target = className.toLowerCase();

    for (const [namespaceName, classes] of this.namespaces) {
      for (const classFile of classes) {
        const cleanClassName = classFile.value.replace(/\.cls$/, '');
        if (cleanClassName.toLowerCase() === target) {
          return namespaceName;
        }
      }
    }

    return null;
  }
}
