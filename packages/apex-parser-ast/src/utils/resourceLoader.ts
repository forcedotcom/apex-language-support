/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { unzipSync } from 'fflate';
import { getLogger } from '@salesforce/apex-lsp-logging';

import { zipData } from '../generated/apexSrcLoader';
import { CaseInsensitivePathMap } from './CaseInsensitiveMap';
import { CompilerService, CompilationOptions } from '../parser/compilerService';
import { ApexSymbolCollectorListener } from '../parser/listeners/ApexSymbolCollectorListener';
import type { CompilationResultWithAssociations } from '../parser/compilerService';
import type { SymbolTable } from '../types/symbol';

export interface ResourceLoaderOptions {
  loadMode?: 'lazy' | 'full';
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
 * ResourceLoader class for loading and compiling Apex files from embedded zip data.
 *
 * Performance Improvements:
 * - Delegates to CompilerService.compileMultiple() for compilation
 * - Configurable concurrency limits via CompilerService
 * - Progress reporting and timing metrics
 * - Cleaner separation of concerns: ResourceLoader handles file management, CompilerService handles compilation
 *
 * @example
 * ```typescript
 * const loader = ResourceLoader.getInstance({
 *   loadMode: 'full',
 *   compilationOptions: {
 *     maxConcurrent: 8
 *   }
 * });
 *
 * // Configure compilation after initialization
 * loader.configureCompilation({
 *   maxConcurrent: 6
 * });
 *
 * await loader.initialize();
 *
 * // Check compilation progress
 * const stats = loader.getCompilationStats();
 * console.log(`Compiled ${stats.compiledFiles}/${stats.totalFiles} files`);
 * ```
 */
export class ResourceLoader {
  private static instance: ResourceLoader;
  private fileMap: CaseInsensitivePathMap<FileContent> =
    new CaseInsensitivePathMap();
  private compiledArtifacts: CaseInsensitivePathMap<CompiledArtifact> =
    new CaseInsensitivePathMap();
  private initialized = false;
  private compilationPromise: Promise<void> | null = null;
  private loadMode: 'lazy' | 'full' = 'full';
  private readonly logger = getLogger();
  private compilerService: CompilerService;

  private constructor(options?: ResourceLoaderOptions) {
    if (options?.loadMode) {
      this.loadMode = options.loadMode;
    }
    this.compilerService = new CompilerService();
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Unzip the contents
      const files = unzipSync(zipData);

      this.logger.debug(() => `Raw zip entries: ${Object.keys(files).length}`);

      // Convert each file to string and store in map
      let processedFiles = 0;
      Object.entries(files)
        .filter(([path]) => path.endsWith('.cls'))
        .forEach(([path, data]) => {
          if (this.loadMode === 'full') {
            this.fileMap.set(path, {
              decoded: true,
              contents: new TextDecoder().decode(data),
              originalPath: path,
            });
          } else {
            this.fileMap.set(path, {
              decoded: false,
              contents: data,
              originalPath: path,
            });
          }
          processedFiles++;
        });

      this.logger.debug(() => `Processed files: ${processedFiles}`);

      // Calculate and log statistics
      const dirStats = new Map<string, number>();
      let totalFiles = 0;

      for (const [_normalizedPath, content] of this.fileMap.entries()) {
        if (!content) continue;
        // Use the original path for directory statistics to maintain compatibility
        const dir =
          content.originalPath
            .split(/[\/\\]/)
            .slice(0, -1)
            .join('/') || '(root)';
        dirStats.set(dir, (dirStats.get(dir) || 0) + 1);
        totalFiles++;
      }

      this.logger.debug(
        () => '\nResource Loading Statistics:\n---------------------------',
      );
      this.logger.debug(() => `Total files loaded: ${totalFiles}`);
      this.logger.debug(() => `Loading mode: ${this.loadMode}`);
      this.logger.debug(() => '\nFiles per directory:');
      for (const [dir, count] of dirStats.entries()) {
        this.logger.debug(() => `  ${dir}: ${count} files`);
      }
      this.logger.debug(() => '---------------------------\n');

      // Start compilation when loadMode is 'full'
      if (this.loadMode === 'full') {
        // Create and start the compilation promise
        this.compilationPromise = (async () => {
          try {
            this.logger.debug(() => 'Starting async compilation...');
            await this.compileAllArtifacts();
            this.logger.debug(() => 'Async compilation completed successfully');
          } catch (error) {
            this.logger.debug(() => `Compilation failed: ${error}`);
            throw error;
          } finally {
            this.compilationPromise = null; // Reset promise after completion
          }
        })();

        // Wait for compilation to start before marking as initialized
        await new Promise<void>((resolve) => {
          const checkCompilation = () => {
            if (this.compilationPromise) {
              resolve();
            } else {
              setTimeout(checkCompilation, 10);
            }
          };
          checkCompilation();
        });
      }

      this.initialized = true;
    } catch (error) {
      this.logger.error(() => `Failed to initialize resource loader: ${error}`);
      throw error;
    }
  }

  public static getInstance(options?: ResourceLoaderOptions): ResourceLoader {
    if (!ResourceLoader.instance) {
      ResourceLoader.instance = new ResourceLoader(options);
    }
    return ResourceLoader.instance;
  }

  public getFile(path: string): string | undefined {
    if (!this.initialized) {
      throw new Error(
        'ResourceLoader not initialized. Call initialize() first.',
      );
    }
    const fileContent = this.fileMap.get(path);
    if (!fileContent) {
      return undefined;
    }

    if (isDecodedContent(fileContent.contents)) {
      return fileContent.contents;
    } else {
      // Decode on demand
      const decoded = new TextDecoder().decode(fileContent.contents);
      this.fileMap.set(path, {
        ...fileContent,
        decoded: true,
        contents: decoded,
      });
      return decoded;
    }
  }

  public getAllFiles(): CaseInsensitivePathMap<string> {
    if (!this.initialized) {
      throw new Error(
        'ResourceLoader not initialized. Call initialize() first.',
      );
    }
    const result = new CaseInsensitivePathMap<string>();
    for (const [_normalizedPath, content] of this.fileMap.entries()) {
      if (!content) continue;
      // Always return the original path format
      if (isDecodedContent(content.contents)) {
        result.set(content.originalPath, content.contents);
      } else {
        result.set(
          content.originalPath,
          new TextDecoder().decode(content.contents),
        );
      }
    }
    return result;
  }

  /**
   * Compile all loaded artifacts by delegating to CompilerService.compileMultiple
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

    for (const [_normalizedPath, content] of this.fileMap.entries()) {
      if (content && isDecodedContent(content.contents)) {
        // Extract namespace from parent folder path
        const pathParts = content.originalPath.split(/[\/\\]/);
        const namespace = pathParts.length > 1 ? pathParts[0] : undefined;

        filesToCompile.push({
          content: content.contents,
          fileName: content.originalPath,
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
          this.compiledArtifacts.set(result.fileName, {
            path: result.fileName,
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
    return this.compiledArtifacts.get(path);
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
}
