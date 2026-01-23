/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Connection, ProgressToken } from 'vscode-languageserver';
import {
  LoggerInterface,
  ProgressToken as SharedProgressToken,
  WorkDoneProgressBegin,
  WorkDoneProgressReport,
  WorkDoneProgressEnd,
} from '@salesforce/apex-lsp-shared';
import {
  ISymbolManager,
  CompilerService,
  DetailLevel,
} from '@salesforce/apex-lsp-parser-ast';
import { Effect } from 'effect';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import { getDocumentStateCache } from './DocumentStateCache';

/**
 * File selection strategy for layer enrichment
 */
export type FileSelectionStrategy =
  | 'same-file' // Only enrich the file being edited
  | 'same-namespace' // Enrich files in the same namespace
  | 'dependency-graph' // Enrich files that depend on or are depended upon
  | 'workspace-wide'; // Enrich all files

/**
 * Context for determining required detail level
 */
export interface RequestContext {
  fileUri?: string;
  requestType?: string;
  query?: string;
  includePrivate?: boolean;
  includeProtected?: boolean;
}

/**
 * Service for enriching files with additional symbol layers on-demand
 */
export class LayerEnrichmentService {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;
  private readonly compilerService: CompilerService;
  private connection: Connection | null = null;

  constructor(
    logger: LoggerInterface,
    symbolManager: ISymbolManager,
    compilerService?: CompilerService,
  ) {
    this.logger = logger;
    this.symbolManager = symbolManager;
    this.compilerService = compilerService || new CompilerService();
  }

  /**
   * Set the connection for progress reporting
   */
  setConnection(connection: Connection): void {
    this.connection = connection;
  }

  /**
   * Determine the required detail level for a given request type and context
   */
  determineRequiredLevel(
    requestType: string,
    context: RequestContext,
  ): DetailLevel {
    switch (requestType) {
      case 'documentOpen':
        // Editor open needs full semantics
        return 'full';
      case 'completion':
        // Completion needs private symbols in current file
        return 'private';
      case 'documentSymbol':
        // Document symbols need full hierarchy
        return 'full';
      case 'workspaceSymbol':
        // Workspace symbol search depends on query filters
        if (context.includePrivate || context.query?.includes('private')) {
          return 'private';
        }
        if (context.includeProtected || context.query?.includes('protected')) {
          return 'protected';
        }
        return 'public-api';
      case 'references':
        // References might need protected/private depending on symbol visibility
        return 'protected';
      default:
        return 'public-api';
    }
  }

  /**
   * Select files to enrich based on strategy and context
   */
  selectFilesToEnrich(
    context: RequestContext,
    strategy: FileSelectionStrategy,
  ): string[] {
    const files: string[] = [];

    switch (strategy) {
      case 'same-file':
        if (context.fileUri) {
          files.push(context.fileUri);
        }
        break;

      case 'same-namespace':
        if (context.fileUri) {
          // Find files in the same namespace
          const currentFileSymbols = this.symbolManager.findSymbolsInFile(
            context.fileUri,
          );
          if (currentFileSymbols.length > 0) {
            const namespace = currentFileSymbols[0].namespace;
            if (namespace) {
              // Get all files and filter by namespace
              const allFiles = this.getAllWorkspaceFiles();
              for (const fileUri of allFiles) {
                const fileSymbols =
                  this.symbolManager.findSymbolsInFile(fileUri);
                if (
                  fileSymbols.length > 0 &&
                  fileSymbols[0].namespace === namespace
                ) {
                  files.push(fileUri);
                }
              }
            }
          }
        }
        break;

      case 'dependency-graph':
        if (context.fileUri) {
          // Find files that reference or are referenced by this file
          const currentFileSymbols = this.symbolManager.findSymbolsInFile(
            context.fileUri,
          );
          const relatedFiles = new Set<string>();

          for (const symbol of currentFileSymbols) {
            // Find references to this symbol (files that reference it)
            try {
              const referencesTo = this.symbolManager.findReferencesTo(symbol);
              for (const ref of referencesTo) {
                if (ref.fileUri && ref.fileUri !== context.fileUri) {
                  relatedFiles.add(ref.fileUri);
                }
              }
            } catch (_error) {
              // Ignore errors finding references
            }

            // Find references from this symbol (files it references)
            try {
              const referencesFrom =
                this.symbolManager.findReferencesFrom(symbol);
              for (const ref of referencesFrom) {
                if (ref.fileUri && ref.fileUri !== context.fileUri) {
                  relatedFiles.add(ref.fileUri);
                }
              }
            } catch (_error) {
              // Ignore errors finding references
            }
          }

          files.push(...Array.from(relatedFiles));
        }
        break;

      case 'workspace-wide':
        files.push(...this.getAllWorkspaceFiles());
        break;
    }

    return files;
  }

  /**
   * Enrich files with additional symbol layers
   * @param fileUris Files to enrich
   * @param targetLevel Target detail level to reach
   * @param strategy File selection strategy (for logging)
   * @param workDoneToken Optional progress token for reporting
   */
  async enrichFiles(
    fileUris: string[],
    targetLevel: DetailLevel,
    strategy: FileSelectionStrategy,
    workDoneToken?: ProgressToken | SharedProgressToken,
  ): Promise<void> {
    if (fileUris.length === 0) {
      return;
    }

    const cache = getDocumentStateCache();
    const storageManager = ApexStorageManager.getInstance();
    const storage = storageManager.getStorage();

    // Filter files that need enrichment
    const filesToEnrich: Array<{
      uri: string;
      currentLevel: DetailLevel | null;
      version: number;
    }> = [];

    for (const fileUri of fileUris) {
      try {
        const document = await storage.getDocument(fileUri);
        if (!document) {
          this.logger.debug(() => `File not found in storage: ${fileUri}`);
          continue;
        }

        const currentLevel = cache.getDetailLevel(fileUri, document.version);
        if (!cache.hasDetailLevel(fileUri, document.version, targetLevel)) {
          filesToEnrich.push({
            uri: fileUri,
            currentLevel: currentLevel || 'public-api',
            version: document.version,
          });
        }
      } catch (error) {
        this.logger.debug(() => `Error checking file ${fileUri}: ${error}`);
      }
    }

    if (filesToEnrich.length === 0) {
      this.logger.debug(
        () =>
          `All ${fileUris.length} files already have detail level ${targetLevel}`,
      );
      return;
    }

    this.logger.debug(
      () =>
        `Enriching ${filesToEnrich.length} files to ${targetLevel} level (strategy: ${strategy})`,
    );

    // Report progress start
    if (workDoneToken && this.connection) {
      try {
        this.connection.sendNotification('$/progress', {
          token: workDoneToken,
          value: {
            kind: 'begin',
            title: 'Enriching symbol layers',
            message: `Enriching ${filesToEnrich.length} files to ${targetLevel} level`,
            percentage: 0,
          } as WorkDoneProgressBegin,
        });
      } catch (error) {
        this.logger.debug(() => `Error sending progress begin: ${error}`);
      }
    }

    // Enrich files with progress reporting
    await Effect.runPromise(
      this.enrichFilesEffect(filesToEnrich, targetLevel, workDoneToken),
    );

    // Report progress end
    if (workDoneToken && this.connection) {
      try {
        this.connection.sendNotification('$/progress', {
          token: workDoneToken,
          value: {
            kind: 'end',
            message: `Successfully enriched ${filesToEnrich.length} files`,
          } as WorkDoneProgressEnd,
        });
      } catch (error) {
        this.logger.debug(() => `Error sending progress end: ${error}`);
      }
    }
  }

  /**
   * Effect-based enrichment with yielding for progress
   */
  private enrichFilesEffect(
    filesToEnrich: Array<{
      uri: string;
      currentLevel: DetailLevel | null;
      version: number;
    }>,
    targetLevel: DetailLevel,
    workDoneToken?: ProgressToken | SharedProgressToken,
  ): Effect.Effect<void, never, never> {
    const self = this;
    return Effect.gen(function* () {
      const cache = getDocumentStateCache();
      const storageManager = ApexStorageManager.getInstance();
      const storage = storageManager.getStorage();

      for (let i = 0; i < filesToEnrich.length; i++) {
        const { uri, currentLevel, version } = filesToEnrich[i];

        try {
          const document = yield* Effect.promise(() =>
            storage.getDocument(uri),
          );
          if (!document) {
            continue;
          }

          // Determine which layers to apply
          const layersToApply = self.getLayersToApply(
            currentLevel || 'public-api',
            targetLevel,
          );

          if (layersToApply.length === 0) {
            continue;
          }

          // Get existing symbol table
          const existingSymbolTable =
            self.symbolManager.getSymbolTableForFile(uri);

          // Compile with additional layers
          const result = self.compilerService.compileLayered(
            document.getText(),
            uri,
            layersToApply,
            existingSymbolTable || undefined,
            {
              collectReferences: true,
              resolveReferences: true,
            },
          );

          if (result?.result) {
            // Update symbol table in manager
            yield* self.symbolManager.addSymbolTable(result.result!, uri);

            // Update cache with new detail level
            const currentCache = cache.get(uri, version);
            if (currentCache) {
              cache.merge(uri, {
                ...currentCache,
                detailLevel: targetLevel,
              });
            }

            self.logger.debug(
              () =>
                `Enriched ${uri} to ${targetLevel} level (applied layers: ${layersToApply.join(', ')})`,
            );
          }

          // Report progress
          if (workDoneToken && self.connection) {
            const percentage = Math.floor(
              ((i + 1) / filesToEnrich.length) * 100,
            );
            try {
              self.connection.sendNotification('$/progress', {
                token: workDoneToken,
                value: {
                  kind: 'report',
                  message: `Enriched ${i + 1}/${filesToEnrich.length}: ${uri.split('/').pop()} (${targetLevel})`,
                  percentage,
                } as WorkDoneProgressReport,
              });
            } catch (_error) {
              // Ignore progress errors
            }
          }

          // Yield periodically for responsiveness
          if ((i + 1) % 10 === 0) {
            yield* Effect.yieldNow();
          }
        } catch (error) {
          self.logger.error(() => `Error enriching file ${uri}: ${error}`);
        }
      }
    });
  }

  /**
   * Determine which layers need to be applied to reach target level
   */
  private getLayersToApply(
    currentLevel: DetailLevel,
    targetLevel: DetailLevel,
  ): DetailLevel[] {
    const levelOrder: Record<DetailLevel, number> = {
      'public-api': 1,
      protected: 2,
      private: 3,
      full: 4,
    };

    const currentOrder = levelOrder[currentLevel] || 0;
    const targetOrder = levelOrder[targetLevel] || 0;

    if (targetOrder <= currentOrder) {
      return [];
    }

    const layersToApply: DetailLevel[] = [];

    if (currentOrder < 2 && targetOrder >= 2) {
      layersToApply.push('protected');
    }
    if (currentOrder < 3 && targetOrder >= 3) {
      layersToApply.push('private');
    }
    // 'full' is equivalent to all layers, so if target is 'full' and we've added protected/private, we're done

    return layersToApply;
  }

  /**
   * Get all workspace files (helper for workspace-wide strategy)
   */
  private getAllWorkspaceFiles(): string[] {
    // This is a simplified implementation
    // In practice, you might want to query ApexSymbolManager for all known files
    const files: string[] = [];
    try {
      // Get all symbols and extract unique file URIs
      // Use getAllSymbolsForCompletion which exists on ISymbolManager
      const allSymbols = this.symbolManager.getAllSymbolsForCompletion();
      const fileSet = new Set<string>();
      for (const symbol of allSymbols) {
        if (symbol.fileUri) {
          fileSet.add(symbol.fileUri);
        }
      }
      files.push(...Array.from(fileSet));
    } catch (error) {
      this.logger.debug(() => `Error getting workspace files: ${error}`);
    }
    return files;
  }
}
