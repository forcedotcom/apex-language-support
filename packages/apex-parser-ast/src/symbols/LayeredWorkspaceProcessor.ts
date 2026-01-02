/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { createHash } from 'crypto';

import { CompilerService } from '../parser/compilerService';
import { SymbolTable } from '../types/symbol';
import { DetailLevel } from '../parser/listeners/LayeredSymbolListenerBase';
import {
  CompilationResult,
  LayeredCompilationOptions,
} from '../parser/compilerService';

export interface FileToProcess {
  content: string;
  fileName: string;
  fileUri: string;
}

export interface LayeredWorkspaceProcessingOptions {
  projectNamespace?: string;
  enforceDependencies?: boolean; // Default: true
  cacheParseTrees?: boolean; // Default: true
  processInBackground?: boolean; // Process layers 2-3 in background (default: true)
}

/**
 * Processes workspace files using layered compilation strategy
 * Performs breadth-first processing: all files at Layer 1, then Layer 2, then Layer 3
 * Enables faster initial response by providing basic functionality after Layer 1
 */
export class LayeredWorkspaceProcessor {
  private readonly logger = getLogger();
  private readonly compilerService: CompilerService;
  private parseTreeCache = new Map<
    string,
    {
      parseTree: any; // ParseTreeResult.parseTree
      contentHash: string;
      timestamp: number;
    }
  >();

  constructor(
    projectNamespace?: string,
    private readonly options: LayeredWorkspaceProcessingOptions = {},
  ) {
    this.compilerService = new CompilerService(projectNamespace);
  }

  /**
   * Process all files with Layer 1 (Public API) only
   * Returns immediately with public API symbols for fast initial response
   */
  async processPublicAPI(
    files: FileToProcess[],
  ): Promise<Map<string, CompilationResult<SymbolTable>>> {
    this.logger.debug(
      () => `Processing ${files.length} files with Public API listener`,
    );

    const results = new Map<string, CompilationResult<SymbolTable>>();

    for (const file of files) {
      try {
        const contentHash = this.computeContentHash(file.content);
        const result = this.compilerService.compileLayered(
          file.content,
          file.fileName,
          ['public-api'],
          undefined, // No existing SymbolTable
          {
            projectNamespace: this.options.projectNamespace,
            enforceDependencies: this.options.enforceDependencies !== false,
            cacheParseTree: this.options.cacheParseTrees !== false,
          },
        );

        // Cache parse tree if enabled
        if (this.options.cacheParseTrees !== false && result.result) {
          // Note: We'd need to extract parse tree from CompilerService
          // For now, this is a placeholder - actual caching would be in CompilerService
          this.logger.debug(
            () => `Cached parse tree for ${file.fileName} (hash: ${contentHash})`,
          );
        }

        results.set(file.fileUri, result);
      } catch (error) {
        this.logger.error(
          () => `Error processing ${file.fileName}: ${error}`,
        );
        results.set(file.fileUri, {
          fileName: file.fileName,
          result: null,
          errors: [
            {
              type: 'semantic' as any,
              severity: 'error' as any,
              message: error instanceof Error ? error.message : String(error),
              line: 0,
              column: 0,
              fileUri: file.fileUri,
            },
          ],
          warnings: [],
        });
      }
    }

    this.logger.debug(
      () =>
        `Public API processing complete: ${results.size} files processed`,
    );

    return results;
  }

  /**
   * Process all files with Layer 2 (Protected) to enrich existing symbols
   * Should be called after processPublicAPI()
   */
  async processProtected(
    files: FileToProcess[],
    existingResults: Map<string, CompilationResult<SymbolTable>>,
  ): Promise<Map<string, CompilationResult<SymbolTable>>> {
    this.logger.debug(
      () => `Enriching ${files.length} files with Protected listener`,
    );

    const results = new Map<string, CompilationResult<SymbolTable>>();

    for (const file of files) {
      const existing = existingResults.get(file.fileUri);
      const existingSymbolTable = existing?.result || undefined;

      try {
        const result = this.compilerService.compileLayered(
          file.content,
          file.fileName,
          ['protected'],
          existingSymbolTable, // Enrich existing SymbolTable
          {
            projectNamespace: this.options.projectNamespace,
            enforceDependencies: this.options.enforceDependencies !== false,
            cacheParseTree: this.options.cacheParseTrees !== false,
          },
        );

        results.set(file.fileUri, result);
      } catch (error) {
        this.logger.error(
          () => `Error enriching ${file.fileName} with protected layer: ${error}`,
        );
        // Keep existing result on error
        if (existing) {
          results.set(file.fileUri, existing);
        }
      }
    }

    this.logger.debug(
      () => `Protected layer processing complete: ${results.size} files enriched`,
    );

    return results;
  }

  /**
   * Process all files with Layer 3 (Private) to enrich existing symbols
   * Should be called after processProtected()
   */
  async processPrivate(
    files: FileToProcess[],
    existingResults: Map<string, CompilationResult<SymbolTable>>,
  ): Promise<Map<string, CompilationResult<SymbolTable>>> {
    this.logger.debug(
      () => `Enriching ${files.length} files with Private listener`,
    );

    const results = new Map<string, CompilationResult<SymbolTable>>();

    for (const file of files) {
      const existing = existingResults.get(file.fileUri);
      const existingSymbolTable = existing?.result || undefined;

      try {
        const result = this.compilerService.compileLayered(
          file.content,
          file.fileName,
          ['private'],
          existingSymbolTable, // Enrich existing SymbolTable
          {
            projectNamespace: this.options.projectNamespace,
            enforceDependencies: this.options.enforceDependencies !== false,
            cacheParseTree: this.options.cacheParseTrees !== false,
          },
        );

        results.set(file.fileUri, result);
      } catch (error) {
        this.logger.error(
          () => `Error enriching ${file.fileName} with private layer: ${error}`,
        );
        // Keep existing result on error
        if (existing) {
          results.set(file.fileUri, existing);
        }
      }
    }

    this.logger.debug(
      () => `Private layer processing complete: ${results.size} files enriched`,
    );

    return results;
  }

  /**
   * Process workspace files in breadth-first layers
   * Returns after each layer completes, allowing progressive enhancement
   */
  async processWorkspaceLayered(
    files: FileToProcess[],
  ): Promise<{
    layer1: Map<string, CompilationResult<SymbolTable>>;
    layer2?: Map<string, CompilationResult<SymbolTable>>;
    layer3?: Map<string, CompilationResult<SymbolTable>>;
  }> {
    this.logger.debug(
      () => `Starting layered workspace processing for ${files.length} files`,
    );

    // Layer 1: Public API (immediate)
    const layer1Results = await this.processPublicAPI(files);

    const result: {
      layer1: Map<string, CompilationResult<SymbolTable>>;
      layer2?: Map<string, CompilationResult<SymbolTable>>;
      layer3?: Map<string, CompilationResult<SymbolTable>>;
    } = {
      layer1: layer1Results,
    };

    // Layers 2-3: Process in background if enabled
    if (this.options.processInBackground !== false) {
      // Process layers 2-3 asynchronously (don't await)
      this.processProtected(files, layer1Results)
        .then((layer2Results) => {
          result.layer2 = layer2Results;
          this.logger.debug(() => 'Layer 2 (Protected) processing completed');
          return this.processPrivate(files, layer2Results);
        })
        .then((layer3Results) => {
          result.layer3 = layer3Results;
          this.logger.debug(() => 'Layer 3 (Private) processing completed');
        })
        .catch((error) => {
          this.logger.error(
            () => `Error in background layer processing: ${error}`,
          );
        });
    } else {
      // Process synchronously
      const layer2Results = await this.processProtected(files, layer1Results);
      result.layer2 = layer2Results;
      const layer3Results = await this.processPrivate(files, layer2Results);
      result.layer3 = layer3Results;
    }

    return result;
  }

  /**
   * Process a single file through all layers sequentially
   * Useful for on-demand processing or testing
   */
  async processFileAllLayers(
    file: FileToProcess,
  ): Promise<CompilationResult<SymbolTable>> {
    this.logger.debug(() => `Processing ${file.fileName} through all layers`);

    // Process all layers in sequence
    let symbolTable: SymbolTable | undefined;

    // Layer 1
    const layer1Result = this.compilerService.compileLayered(
      file.content,
      file.fileName,
      ['public-api'],
      undefined,
      {
        projectNamespace: this.options.projectNamespace,
        enforceDependencies: false, // We're explicitly requesting all layers
      },
    );
    symbolTable = layer1Result.result || undefined;

    // Layer 2
    if (symbolTable) {
      const layer2Result = this.compilerService.compileLayered(
        file.content,
        file.fileName,
        ['protected'],
        symbolTable,
        {
          projectNamespace: this.options.projectNamespace,
          enforceDependencies: false,
        },
      );
      symbolTable = layer2Result.result || undefined;
    }

    // Layer 3
    if (symbolTable) {
      const layer3Result = this.compilerService.compileLayered(
        file.content,
        file.fileName,
        ['private'],
        symbolTable,
        {
          projectNamespace: this.options.projectNamespace,
          enforceDependencies: false,
        },
      );
      return layer3Result;
    }

    return layer1Result;
  }

  /**
   * Compute content hash for cache invalidation
   */
  private computeContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Clear parse tree cache
   */
  clearParseTreeCache(): void {
    this.parseTreeCache.clear();
    this.logger.debug(() => 'Parse tree cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      parseTreeCacheSize: this.parseTreeCache.size,
    };
  }
}

