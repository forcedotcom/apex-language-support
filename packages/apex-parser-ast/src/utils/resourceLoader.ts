/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { unzipSync } from 'fflate';
import { getLogger } from '@salesforce/apex-lsp-shared';

import { zipData } from '../generated/apexSrcLoader';
import { CaseInsensitivePathMap } from './CaseInsensitiveMap';
import { CompilerService, CompilationOptions } from '../parser/compilerService';
import { ApexSymbolCollectorListener } from '../parser/listeners/ApexSymbolCollectorListener';
import type { CompilationResultWithAssociations } from '../parser/compilerService';
import type { SymbolTable } from '../types/symbol';

export interface ResourceLoaderOptions {
  loadMode?: 'lazy' | 'full';
  preloadCommonClasses?: boolean;
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

interface FileContent {
  decoded: boolean;
  contents: string | Uint8Array;
  originalPath: string;
}

interface CompiledArtifact {
  path: string;
  compilationResult: CompilationResultWithAssociations<SymbolTable>;
}

function isDecodedContent(contents: string | Uint8Array): contents is string {
  return typeof contents === 'string';
}

/**
 * Enhanced ResourceLoader class for loading and compiling standard Apex classes from embedded zip data.
 *
 * Core Responsibilities:
 * - Immediately discover directory structure without loading content
 * - Provide true lazy loading of file contents
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
 * // Content loaded on-demand
 * const source = await loader.getFile('System/System.cls');
 * ```
 */
export class ResourceLoader {
  private static instance: ResourceLoader;
  private directoryStructure: DirectoryStructure;
  private lazyFileMap: CaseInsensitivePathMap<LazyFileContent> =
    new CaseInsensitivePathMap();
  private contentLoaded: CaseInsensitivePathMap<FileContent> =
    new CaseInsensitivePathMap();
  // Store compiled artifacts for backward compatibility
  private compiledArtifacts: CaseInsensitivePathMap<CompiledArtifact> =
    new CaseInsensitivePathMap();
  private initialized = false;
  private compilationPromise: Promise<void> | null = null;
  private loadMode: 'lazy' | 'full' = 'full';
  private preloadCommonClasses: boolean = false;
  private readonly logger = getLogger();
  private compilerService: CompilerService;
  private rawZipData: Record<string, Uint8Array> | null = null;

  private constructor(options?: ResourceLoaderOptions) {
    if (options?.loadMode) {
      this.loadMode = options.loadMode;
    }
    if (options?.preloadCommonClasses) {
      this.preloadCommonClasses = options.preloadCommonClasses;
    }

    this.compilerService = new CompilerService();
    this.compiledArtifacts = new CaseInsensitivePathMap();

    // Immediately build directory structure
    this.directoryStructure = this.buildDirectoryStructure();
    this.initialized = true;
  }

  /**
   * Build directory structure immediately without loading file contents
   * @private
   */
  private buildDirectoryStructure(): DirectoryStructure {
    this.logger.debug(() => 'Building directory structure...');

    // Extract zip data to get file paths and metadata
    const files = unzipSync(zipData);
    this.rawZipData = files;

    const entries = new Map<string, DirectoryEntry>();
    const namespaces = new Map<string, string[]>();
    let totalFiles = 0;
    let totalSize = 0;
    const namespaceSet = new Set<string>();

    // Process only .cls files for structure
    Object.entries(files)
      .filter(([path]) => path.endsWith('.cls'))
      .forEach(([path, data]) => {
        const pathParts = path.split(/[\/\\]/);
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
          path,
          size: data.length,
          isDirectory: false,
          namespace,
          originalPath: path,
        };

        entries.set(path, entry);
        totalFiles++;
        totalSize += data.length;

        // Initialize lazy file content
        this.lazyFileMap.set(path, {
          path,
          lastAccessed: 0,
          accessCount: 0,
          isLoaded: false,
          isCompiled: false,
        });
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

  public static getInstance(options?: ResourceLoaderOptions): ResourceLoader {
    if (!ResourceLoader.instance) {
      ResourceLoader.instance = new ResourceLoader(options);
    }
    return ResourceLoader.instance;
  }

  /**
   * Get file content with true lazy loading
   * @param path The file path
   * @returns Promise that resolves to the file content
   */
  public async getFile(path: string): Promise<string | undefined> {
    if (!this.initialized) {
      throw new Error(
        'ResourceLoader not initialized. Call initialize() first.',
      );
    }

    // Normalize path for lookup
    const normalizedPath = this.normalizePath(path);

    // Find the actual entry using case-insensitive lookup
    let actualPath = normalizedPath;
    for (const [entryPath] of this.directoryStructure.entries) {
      if (entryPath.toLowerCase() === normalizedPath.toLowerCase()) {
        actualPath = entryPath;
        break;
      }
    }

    const entry = this.directoryStructure.entries.get(actualPath);
    if (!entry) {
      return undefined;
    }

    // Check if already loaded
    let fileContent = this.contentLoaded.get(actualPath);
    if (!fileContent) {
      // Load content on-demand
      await this.loadFileContent(actualPath);
      fileContent = this.contentLoaded.get(actualPath);
    }

    if (!fileContent) {
      return undefined;
    }

    // Update access statistics
    const lazyContent = this.lazyFileMap.get(actualPath);
    if (lazyContent) {
      lazyContent.lastAccessed = Date.now();
      lazyContent.accessCount++;
    }

    if (isDecodedContent(fileContent.contents)) {
      return fileContent.contents;
    } else {
      // Decode on demand
      const decoded = new TextDecoder().decode(fileContent.contents);
      this.contentLoaded.set(actualPath, {
        ...fileContent,
        decoded: true,
        contents: decoded,
      });
      return decoded;
    }
  }

  /**
   * Load file content from zip data
   * @private
   */
  private async loadFileContent(path: string): Promise<void> {
    if (!this.rawZipData) {
      throw new Error('Raw zip data not available');
    }

    const data = this.rawZipData[path];
    if (!data) {
      return;
    }

    const fileContent: FileContent = {
      decoded: false,
      contents: data,
      originalPath: path,
    };

    this.contentLoaded.set(path, fileContent);

    // Update lazy file map
    const lazyContent = this.lazyFileMap.get(path);
    if (lazyContent) {
      lazyContent.isLoaded = true;
    }

    this.logger.debug(() => `Loaded file content: ${path}`);
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
      const parts = normalized.split('.');
      if (parts.length >= 2) {
        // Remove .cls extension if present
        const lastPart = parts[parts.length - 1].replace(/\.cls$/i, '');
        parts[parts.length - 1] = lastPart;

        // Reconstruct as path
        normalized = parts.join('/');
      }
    }

    // Remove .cls extension if present
    normalized = normalized.replace(/\.cls$/i, '');

    // Add .cls extension back
    if (!normalized.endsWith('.cls')) {
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
    const normalizedPath = this.normalizePath(className);

    // Check using case-insensitive lookup
    for (const [entryPath] of this.directoryStructure.entries) {
      if (entryPath.toLowerCase() === normalizedPath.toLowerCase()) {
        return true;
      }
    }

    return false;
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
   * Get all files with lazy loading
   * @returns Promise that resolves to all file contents
   */
  public async getAllFiles(): Promise<CaseInsensitivePathMap<string>> {
    if (!this.initialized) {
      throw new Error(
        'ResourceLoader not initialized. Call initialize() first.',
      );
    }

    const result = new CaseInsensitivePathMap<string>();

    // Load all files in parallel
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
    if (this.preloadCommonClasses) {
      await this.preloadCommonClasses();
    }

    // Start compilation when loadMode is 'full'
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

          // Store in compiledArtifacts for backward compatibility
          this.compiledArtifacts.set(result.fileName, {
            path: result.fileName,
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
    };
  }

  /**
   * Get directory structure statistics
   * @returns Directory structure statistics
   */
  public getDirectoryStatistics(): DirectoryStructure['statistics'] {
    return this.directoryStructure.statistics;
  }
}
