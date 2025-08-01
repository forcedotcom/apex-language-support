/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { unzipSync } from 'fflate';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { Volume } from 'memfs';

import { zipData } from '../generated/apexSrcLoader';
import { CaseInsensitivePathMap } from './CaseInsensitiveMap';
import { CompilerService, CompilationOptions } from '../parser/compilerService';
import { ApexSymbolCollectorListener } from '../parser/listeners/ApexSymbolCollectorListener';
import type { CompilationResultWithAssociations } from '../parser/compilerService';
import type { SymbolTable } from '../types/symbol';

export interface ResourceLoaderOptions {
  loadMode?: 'lazy' | 'full';
  preloadStdClasses?: boolean;
}

interface DirectoryEntry {
  path: string;
  size: number;
  isDirectory: boolean;
  namespace?: string;
  originalPath: string;
}

interface DirectoryStructure {
  entries: Map<string, DirectoryEntry>;
  namespaces: Map<string, string[]>;
  statistics: {
    totalFiles: number;
    totalSize: number;
    namespaces: string[];
  };
}

interface LazyFileContent {
  path: string;
  content?: string;
  compiled?: CompiledArtifact;
  lastAccessed: number;
  accessCount: number;
  isLoaded: boolean;
  isCompiled: boolean;
}

interface CompiledArtifact {
  path: string;
  compilationResult: CompilationResultWithAssociations<SymbolTable>;
}

/**
 * Enhanced ResourceLoader class for loading and compiling standard Apex classes from embedded zip data.
 * Uses memfs for efficient in-memory file storage and management.
 *
 * Core Responsibilities:
 * - Immediately discover directory structure without loading content
 * - Provide true lazy loading of file contents using memfs
 * - Track file references with associated source
 * - Compile source code on-demand
 * - Provide access to source for goto definition
 *
 * @example
 * ```typescript
 * const loader = ResourceLoader.getInstance({
 *   loadMode: 'lazy',
 *   preloadCommonClasses: true
 * });
 *
 * // Structure is immediately available
 * const availableClasses = loader.getAvailableClasses();
 *
 * // Content loaded on-demand via memfs
 * const source = await loader.getFile('System/System.cls');
 * ```
 */
export class ResourceLoader {
  private static instance: ResourceLoader;
  private directoryStructure: DirectoryStructure;
  private lazyFileMap: CaseInsensitivePathMap<LazyFileContent> =
    new CaseInsensitivePathMap();
  // Store compiled artifacts for backward compatibility
  private compiledArtifacts: CaseInsensitivePathMap<CompiledArtifact> =
    new CaseInsensitivePathMap();
  private initialized = false;
  private compilationPromise: Promise<void> | null = null;
  private loadMode: 'lazy' | 'full' = 'full';
  private preloadStdClasses: boolean = false;
  private readonly logger = getLogger();
  private compilerService: CompilerService;
  private memfsVolume: Volume;

  private constructor(options?: ResourceLoaderOptions) {
    if (options?.loadMode) {
      this.loadMode = options.loadMode;
    }
    if (options?.preloadStdClasses) {
      this.preloadStdClasses = options.preloadStdClasses;
    }

    this.compilerService = new CompilerService();
    this.compiledArtifacts = new CaseInsensitivePathMap();
    this.memfsVolume = new Volume();

    // Immediately build directory structure
    this.directoryStructure = this.buildDirectoryStructure();

    // Set initialized to true before starting compilation
    this.initialized = true;

    // Start compilation immediately if loadMode is 'full'
    if (this.loadMode === 'full') {
      this.compilationPromise = this.compileAllArtifacts();
    }
  }

  /**
   * Build directory structure immediately without loading file contents
   * @private
   */
  private buildDirectoryStructure(): DirectoryStructure {
    this.logger.debug(() => 'Building directory structure...');

    // Extract zip data to get file paths and metadata
    const files = unzipSync(zipData);

    const entries = new Map<string, DirectoryEntry>();
    const namespaces = new Map<string, string[]>();
    let totalFiles = 0;
    let totalSize = 0;
    const namespaceSet = new Set<string>();

    // Process only .cls files for structure
    Object.entries(files)
      .filter(([path]) => path.endsWith('.cls'))
      .forEach(([path, data]) => {
        // Strip the src/resources/StandardApexLibrary/ prefix to get the relative path
        const relativePath = path.replace(
          /^src\/resources\/StandardApexLibrary\//,
          '',
        );
        const pathParts = relativePath.split(/[\/\\]/);
        const namespace = pathParts.length > 1 ? pathParts[0] : undefined;
        const fileName = pathParts[pathParts.length - 1];

        if (namespace) {
          namespaceSet.add(namespace);
          if (!namespaces.has(namespace)) {
            namespaces.set(namespace, []);
          }
          namespaces.get(namespace)!.push(fileName);
        }

        const entry: DirectoryEntry = {
          path: relativePath,
          size: data.length,
          isDirectory: false,
          namespace,
          originalPath: path,
        };

        entries.set(relativePath, entry);
        totalFiles++;
        totalSize += data.length;

        // Initialize lazy file content
        this.lazyFileMap.set(relativePath, {
          path: relativePath,
          lastAccessed: 0,
          accessCount: 0,
          isLoaded: false,
          isCompiled: false,
        });

        // Create directory structure if needed
        const dirPath = relativePath.substring(
          0,
          relativePath.lastIndexOf('/'),
        );
        if (dirPath && !this.memfsVolume.existsSync(dirPath)) {
          this.memfsVolume.mkdirSync(dirPath, { recursive: true });
        }

        // Store file data in memfs for lazy loading using the relative path
        this.memfsVolume.writeFileSync(relativePath, data);
      });

    this.logger.debug(
      () =>
        `Directory structure built: ${totalFiles} files, ${namespaceSet.size} namespaces`,
    );

    return {
      entries,
      namespaces,
      statistics: {
        totalFiles,
        totalSize,
        namespaces: Array.from(namespaceSet),
      },
    };
  }

  /**
   * Check if file exists using memfs
   * @private
   */
  private memfsExists(path: string): boolean {
    const normalizedPath = this.normalizePath(path);

    try {
      // Use memfs existsSync for efficient file existence check
      return this.memfsVolume.existsSync(normalizedPath);
    } catch {
      // If memfs throws an error, fall back to case-insensitive lookup
      for (const [entryPath] of this.directoryStructure.entries) {
        if (
          this.normalizePath(entryPath).toLowerCase() ===
          normalizedPath.toLowerCase()
        ) {
          return true;
        }
      }
      return false;
    }
  }

  /**
   * Get file content using memfs
   * @private
   */
  private async memfsReadFile(path: string): Promise<string | undefined> {
    const normalizedPath = this.normalizePath(path);

    try {
      // Try to read directly from memfs first
      const content = this.memfsVolume.readFileSync(
        normalizedPath,
        'utf8',
      ) as string;

      // Update access statistics
      const lazyContent = this.lazyFileMap.get(normalizedPath);
      if (lazyContent) {
        lazyContent.lastAccessed = Date.now();
        lazyContent.accessCount++;
        lazyContent.isLoaded = true;
        lazyContent.content = content;
      }

      return content;
    } catch (_error) {
      // If direct read fails, try case-insensitive lookup
      for (const [entryPath] of this.directoryStructure.entries) {
        if (
          this.normalizePath(entryPath).toLowerCase() ===
          normalizedPath.toLowerCase()
        ) {
          try {
            const content = this.memfsVolume.readFileSync(
              entryPath,
              'utf8',
            ) as string;

            // Update access statistics
            const lazyContent = this.lazyFileMap.get(entryPath);
            if (lazyContent) {
              lazyContent.lastAccessed = Date.now();
              lazyContent.accessCount++;
              lazyContent.isLoaded = true;
              lazyContent.content = content;
            }

            return content;
          } catch (_innerError) {
            // Continue to next entry
          }
        }
      }
      return undefined;
    }
  }

  public static getInstance(options?: ResourceLoaderOptions): ResourceLoader {
    if (!ResourceLoader.instance) {
      ResourceLoader.instance = new ResourceLoader(options);
    }
    return ResourceLoader.instance;
  }

  /**
   * Get file content with true lazy loading using memfs
   * @param path The file path
   * @returns Promise that resolves to the file content
   */
  public async getFile(path: string): Promise<string | undefined> {
    if (!this.initialized) {
      throw new Error(
        'ResourceLoader not initialized. Call initialize() first.',
      );
    }

    // Use memfs for simple file access
    return this.memfsReadFile(path);
  }

  /**
   * Get file content synchronously using memfs
   * @param path The file path
   * @returns The file content or undefined if not found
   */
  public getFileSync(path: string): string | undefined {
    if (!this.initialized) {
      throw new Error(
        'ResourceLoader not initialized. Call initialize() first.',
      );
    }

    const normalizedPath = this.normalizePath(path);

    try {
      // Try to read directly from memfs first
      const content = this.memfsVolume.readFileSync(
        normalizedPath,
        'utf8',
      ) as string;

      // Update access statistics
      const lazyContent = this.lazyFileMap.get(normalizedPath);
      if (lazyContent) {
        lazyContent.lastAccessed = Date.now();
        lazyContent.accessCount++;
        lazyContent.isLoaded = true;
        lazyContent.content = content;
      }

      return content;
    } catch (_error) {
      // If direct read fails, try case-insensitive lookup
      for (const [entryPath] of this.directoryStructure.entries) {
        if (
          this.normalizePath(entryPath).toLowerCase() ===
          normalizedPath.toLowerCase()
        ) {
          try {
            const content = this.memfsVolume.readFileSync(
              entryPath,
              'utf8',
            ) as string;

            // Update access statistics
            const lazyContent = this.lazyFileMap.get(entryPath);
            if (lazyContent) {
              lazyContent.lastAccessed = Date.now();
              lazyContent.accessCount++;
              lazyContent.isLoaded = true;
              lazyContent.content = content;
            }

            return content;
          } catch (_innerError) {
            // Continue to next entry
          }
        }
      }
      return undefined;
    }
  }

  /**
   * Preload common classes for better performance
   * @private
   */
  private async preloadCommonClasses(): Promise<void> {
    const commonClasses = [
      'System/System.cls',
      'Database/Database.cls',
      'String/String.cls',
      'Integer/Integer.cls',
      'Boolean/Boolean.cls',
    ];

    this.logger.debug(() => 'Preloading common classes...');

    for (const className of commonClasses) {
      if (this.hasClass(className)) {
        await this.getFile(className);
      }
    }

    this.logger.debug(() => 'Common classes preloaded');
  }

  /**
   * Normalize path for consistent lookup
   * @private
   */
  private normalizePath(path: string): string {
    // Convert backslashes to forward slashes
    let normalized = path.replace(/\\/g, '/');

    // Handle dot notation (System.System.cls -> System/System.cls)
    if (normalized.includes('.') && !normalized.includes('/')) {
      // Check if the entire string ends with .cls
      if (normalized.endsWith('.cls')) {
        // Remove .cls from the end
        normalized = normalized.replace(/\.cls$/i, '');
        // Split by dots and join with /
        const parts = normalized.split('.');
        normalized = parts.join('/') + '.cls';
      } else {
        // No .cls extension, just split by dots and join with /
        const parts = normalized.split('.');
        normalized = parts.join('/') + '.cls';
      }
    } else {
      // Handle regular paths
      // Remove .cls extension if present
      normalized = normalized.replace(/\.cls$/i, '');
      // Add .cls extension back
      normalized += '.cls';
    }

    return normalized;
  }

  /**
   * Check if a class exists without loading content
   * @param className The class name to check
   * @returns true if the class exists
   */
  public hasClass(className: string): boolean {
    return this.memfsExists(className);
  }

  /**
   * Get available class names without loading content
   * @returns Array of available class names
   */
  public getAvailableClasses(): string[] {
    return Array.from(this.directoryStructure.entries.keys());
  }

  /**
   * Get namespace structure
   * @returns Map of namespaces to their class files
   */
  public getNamespaceStructure(): Map<string, string[]> {
    return this.directoryStructure.namespaces;
  }

  /**
   * Get all files with lazy loading using memfs
   * @returns Promise that resolves to all file contents
   */
  public async getAllFiles(): Promise<CaseInsensitivePathMap<string>> {
    if (!this.initialized) {
      throw new Error(
        'ResourceLoader not initialized. Call initialize() first.',
      );
    }

    const result = new CaseInsensitivePathMap<string>();

    // Load all files in parallel using memfs
    const loadPromises = Array.from(this.directoryStructure.entries.keys()).map(
      async (path) => {
        const content = await this.getFile(path);
        if (content) {
          result.set(path, content);
        }
      },
    );

    await Promise.all(loadPromises);
    return result;
  }

  /**
   * Get all files synchronously using memfs
   * @returns Map of all file contents
   */
  public getAllFilesSync(): CaseInsensitivePathMap<string> {
    if (!this.initialized) {
      throw new Error(
        'ResourceLoader not initialized. Call initialize() first.',
      );
    }

    const result = new CaseInsensitivePathMap<string>();

    // Load all files synchronously using memfs
    for (const path of this.directoryStructure.entries.keys()) {
      const content = this.getFileSync(path);
      if (content) {
        result.set(path, content);
      }
    }

    return result;
  }

  /**
   * Initialize with optional preloading
   * @deprecated Use constructor instead - structure is now available immediately
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Structure is already built in constructor
    this.initialized = true;

    // Preload common classes if requested
    if (this.preloadStdClasses) {
      await this.preloadCommonClasses();
    }

    // Note: Compilation is now started in constructor for 'full' mode
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
          fileName: path,
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

          // Update lazy file map
          const lazyContent = this.lazyFileMap.get(result.fileName);
          if (lazyContent) {
            lazyContent.isCompiled = true;
            lazyContent.compiled = {
              path: result.fileName,
              compilationResult,
            };
          }

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
   * Get compiled artifact for a specific file path
   * @param path The file path
   * @returns The compiled artifact or undefined if not found or not compiled
   */
  public getCompiledArtifact(path: string): CompiledArtifact | undefined {
    if (!this.initialized) {
      throw new Error(
        'ResourceLoader not initialized. Call initialize() first.',
      );
    }

    const normalizedPath = this.normalizePath(path);
    return this.compiledArtifacts.get(normalizedPath);
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
    directoryStructure: DirectoryStructure['statistics'];
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
    let loadedFiles = 0;
    let compiledFiles = 0;
    let totalAccessCount = 0;

    // Count loaded and compiled files
    for (const [_normalizedPath, lazyContent] of this.lazyFileMap.entries()) {
      if (lazyContent?.isLoaded) loadedFiles++;
      if (lazyContent?.isCompiled) compiledFiles++;
      if (lazyContent?.accessCount) totalAccessCount += lazyContent.accessCount;
    }

    const averageAccessCount =
      this.lazyFileMap.size > 0 ? totalAccessCount / this.lazyFileMap.size : 0;

    // Get memfs statistics
    const memfsStats = {
      totalFiles: this.directoryStructure.statistics.totalFiles,
      totalSize: this.directoryStructure.statistics.totalSize,
    };

    return {
      totalFiles: this.directoryStructure.statistics.totalFiles,
      loadedFiles,
      compiledFiles,
      loadMode: this.loadMode,
      directoryStructure: this.directoryStructure.statistics,
      lazyFileStats: {
        totalEntries: this.lazyFileMap.size,
        loadedEntries: loadedFiles,
        compiledEntries: compiledFiles,
        averageAccessCount,
      },
      memfsStats,
    };
  }

  /**
   * Get directory structure statistics
   * @returns Directory structure statistics
   */
  public getDirectoryStatistics(): DirectoryStructure['statistics'] {
    return this.directoryStructure.statistics;
  }

  /**
   * Get the memfs volume for advanced operations
   * @returns The memfs Volume instance
   */
  public getMemfsVolume(): Volume {
    return this.memfsVolume;
  }

  /**
   * Export the current file system state as JSON
   * @returns JSON representation of the file system
   */
  public exportToJSON(): Record<string, string | null> {
    return this.memfsVolume.toJSON();
  }

  /**
   * Reset the memfs volume and clear all data
   */
  public reset(): void {
    this.memfsVolume.reset();
    this.lazyFileMap.clear();
    this.compiledArtifacts.clear();
    this.initialized = false;
    this.compilationPromise = null;

    // Rebuild directory structure
    this.directoryStructure = this.buildDirectoryStructure();
    this.initialized = true;
  }
}
