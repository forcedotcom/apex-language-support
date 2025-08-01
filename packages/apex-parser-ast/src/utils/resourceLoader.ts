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
import { MultiVolumeFileSystem } from './MultiVolumeFileSystem';
import { RESOURCE_URIS } from './ResourceUtils';

export interface ResourceLoaderOptions {
  loadMode?: 'lazy' | 'full';
  preloadStdClasses?: boolean;
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
 * - Store all files in memfs during initialization
 * - Provide access to file contents via memfs
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
 * // Files are immediately available via memfs
 * const availableClasses = loader.getAvailableClasses();
 *
 * // Content loaded on-demand via memfs
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
  private multiVolumeFS: MultiVolumeFileSystem;
  private filePaths: string[] = []; // Cache of available file paths
  private namespaces: Map<string, string[]> = new Map();
  private totalSize: number = 0; // Total size of all files
  private accessCount: number = 0; // Simple access counter for statistics

  private constructor(options?: ResourceLoaderOptions) {
    if (options?.loadMode) {
      this.loadMode = options.loadMode;
    }
    if (options?.preloadStdClasses) {
      this.preloadStdClasses = options.preloadStdClasses;
    }

    this.compilerService = new CompilerService();
    this.multiVolumeFS = new MultiVolumeFileSystem();

    // Register the apex-resources volume
    this.multiVolumeFS.registerVolume('apex-resources', {
      protocol: 'apex-resources',
      rootPath: '/apex-resources',
      readOnly: false,
    });

    // Build memfs structure immediately
    this.buildMemfsStructure();

    // Note: initialization and preloading will be handled by initialize() method
    // This ensures the constructor only handles basic structure setup
  }

  /**
   * Build memfs structure immediately
   * @private
   */
  private buildMemfsStructure(): void {
    this.logger.debug(() => 'Building memfs structure...');

    // Extract zip data to get file paths and metadata
    const files = unzipSync(zipData);

    let totalSize = 0;
    for (const [path, data] of Object.entries(files)) {
      // Strip the src/resources/StandardApexLibrary/ prefix to get the relative path
      const relativePath = path.replace(
        /^src\/resources\/StandardApexLibrary\//,
        '',
      );
      const pathParts = relativePath.split(/[\/\\]/);
      const namespace = pathParts.length > 1 ? pathParts[0] : undefined;
      const fileName = pathParts[pathParts.length - 1];

      if (namespace) {
        if (!this.namespaces.has(namespace)) {
          this.namespaces.set(namespace, []);
        }
        this.namespaces.get(namespace)!.push(fileName);
      }

      this.filePaths.push(relativePath);
      totalSize += data.length;

      // Store file data in MultiVolumeFileSystem using apex-resources URI
      const uriPath = `${RESOURCE_URIS.STANDARD_APEX_LIBRARY_URI}/${relativePath}`;
      this.multiVolumeFS.writeFile(uriPath, Buffer.from(data));
    }

    this.totalSize = totalSize;

    this.logger.debug(
      () =>
        `MultiVolumeFileSystem structure built: ${this.filePaths.length} files, ${this.namespaces.size} namespaces`,
    );
  }

  /**
   * Check if file exists using MultiVolumeFileSystem
   * @private
   */
  private memfsExists(path: string): boolean {
    const normalizedPath = this.normalizePath(path);

    try {
      // Use MultiVolumeFileSystem for efficient file existence check
      const uriPath = `${RESOURCE_URIS.STANDARD_APEX_LIBRARY_URI}/${normalizedPath}`;
      return this.multiVolumeFS.exists(uriPath);
    } catch {
      // If MultiVolumeFileSystem throws an error, fall back to case-insensitive lookup
      for (const filePath of this.filePaths) {
        if (
          this.normalizePath(filePath).toLowerCase() ===
          normalizedPath.toLowerCase()
        ) {
          return true;
        }
      }
      return false;
    }
  }

  /**
   * Get file content using MultiVolumeFileSystem
   * @private
   */
  private async memfsReadFile(path: string): Promise<string | undefined> {
    const normalizedPath = this.normalizePath(path);

    try {
      // Try to read directly from MultiVolumeFileSystem first
      const uriPath = `${RESOURCE_URIS.STANDARD_APEX_LIBRARY_URI}/${normalizedPath}`;
      const content = this.multiVolumeFS.readFile(uriPath, 'utf8') as string;

      // Update access statistics
      this.accessCount++;

      return content;
    } catch (_error) {
      // If direct read fails, try case-insensitive lookup using filePaths
      for (const filePath of this.filePaths) {
        if (
          this.normalizePath(filePath).toLowerCase() ===
          normalizedPath.toLowerCase()
        ) {
          try {
            const uriPath = `${RESOURCE_URIS.STANDARD_APEX_LIBRARY_URI}/${filePath}`;
            const content = this.multiVolumeFS.readFile(
              uriPath,
              'utf8',
            ) as string;

            // Update access statistics
            this.accessCount++;

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
   * Get file content synchronously using MultiVolumeFileSystem
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
      // Try to read directly from MultiVolumeFileSystem first
      const uriPath = `${RESOURCE_URIS.STANDARD_APEX_LIBRARY_URI}/${normalizedPath}`;
      const content = this.multiVolumeFS.readFile(uriPath, 'utf8') as string;

      // Update access statistics
      this.accessCount++;

      return content;
    } catch (_error) {
      // If direct read fails, try case-insensitive lookup using filePaths
      for (const filePath of this.filePaths) {
        if (
          this.normalizePath(filePath).toLowerCase() ===
          normalizedPath.toLowerCase()
        ) {
          try {
            const uriPath = `${RESOURCE_URIS.STANDARD_APEX_LIBRARY_URI}/${filePath}`;
            const content = this.multiVolumeFS.readFile(
              uriPath,
              'utf8',
            ) as string;

            // Update access statistics
            this.accessCount++;

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
      'System/ApexPages.cls',
      'System/Assert.cls',
      'System/Callable.cls',
      'Database/Batchable.cls',
      'Database/Error.cls',
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
    // This method works without initialization since it only checks existence
    return this.memfsExists(className);
  }

  /**
   * Get available class names without loading content
   * @returns Array of available class names
   */
  public getAvailableClasses(): string[] {
    // This method works without initialization since it only returns the file list
    return this.filePaths;
  }

  /**
   * Get namespace structure
   * @returns Map of namespaces to their class files
   */
  public getNamespaceStructure(): Map<string, string[]> {
    // This method works without initialization since it only returns the namespace structure
    return this.namespaces;
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
    const loadPromises = this.filePaths.map(async (path) => {
      const content = await this.getFile(path);
      if (content) {
        result.set(path, content);
      }
    });

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
    for (const path of this.filePaths) {
      const content = this.getFileSync(path);
      if (content) {
        result.set(path, content);
      }
    }

    return result;
  }

  /**
   * Initialize with optional preloading and compilation
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Mark as initialized
    this.initialized = true;

    // Preload common classes if requested
    if (this.preloadStdClasses) {
      await this.preloadCommonClasses();
    }

    // Start compilation if in full mode
    if (this.loadMode === 'full') {
      this.compilationPromise = this.compileAllArtifacts();
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
          // This part is removed as per the new_code, as the lazyFileMap is removed.
          // The memfsVolume is now directly used for file existence and content.

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
    let compiledFiles = 0;

    // Count compiled files
    for (const [_path, artifact] of this.compiledArtifacts.entries()) {
      if (artifact) {
        compiledFiles++;
      }
    }

    return {
      totalFiles: this.filePaths.length,
      loadedFiles: this.accessCount, // Use access count as loaded files
      compiledFiles,
      loadMode: this.loadMode,
      directoryStructure: {
        totalFiles: this.filePaths.length,
        totalSize: this.totalSize,
        namespaces: Array.from(this.namespaces.keys()),
      },
      lazyFileStats: {
        totalEntries: this.filePaths.length,
        loadedEntries: this.accessCount, // Use access count
        compiledEntries: compiledFiles,
        averageAccessCount:
          this.accessCount > 0 ? this.accessCount / this.filePaths.length : 0,
      },
      memfsStats: {
        totalFiles: this.filePaths.length,
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
      totalFiles: this.filePaths.length,
      totalSize: this.totalSize,
      namespaces: Array.from(this.namespaces.keys()),
    };
  }

  /**
   * Get the MultiVolumeFileSystem for advanced operations
   * @returns The MultiVolumeFileSystem instance
   */
  public getMultiVolumeFileSystem(): MultiVolumeFileSystem {
    return this.multiVolumeFS;
  }

  /**
   * Get the memfs volume for advanced operations (backward compatibility)
   * @returns The memfs Volume instance from the apex-resources volume
   * @deprecated Use getMultiVolumeFileSystem() instead
   */
  public getMemfsVolume(): Volume {
    return this.multiVolumeFS.getVolume('apex-resources');
  }

  /**
   * Export the current file system state as JSON
   * @returns JSON representation of the file system
   */
  public exportToJSON(): Record<string, string | null> {
    return this.multiVolumeFS.exportToJSON('apex-resources')['apex-resources'];
  }

  /**
   * Reset the MultiVolumeFileSystem and clear all data
   */
  public reset(): void {
    this.multiVolumeFS.reset('apex-resources');
    this.compiledArtifacts.clear();
    this.initialized = false;
    this.compilationPromise = null;

    // Rebuild directory structure
    this.buildMemfsStructure();
    this.initialized = true;
  }
}
