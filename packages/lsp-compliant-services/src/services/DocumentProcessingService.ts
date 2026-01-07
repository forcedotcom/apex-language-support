/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Diagnostic, TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';
import {
  CompilerService,
  ApexSymbolProcessingManager,
  PublicAPISymbolListener,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import { getDocumentStateCache } from './DocumentStateCache';
import {
  makeDocumentOpenBatcher,
  type DocumentOpenBatcherService,
  DEFAULT_BATCH_CONFIG,
  type DocumentOpenBatchConfig,
} from './DocumentOpenBatcher';
import { getDiagnosticsFromErrors } from '../utils/handlerUtil';

/**
 * Service for processing document open events
 */
export class DocumentProcessingService {
  private readonly logger: LoggerInterface;
  private readonly storageManager: ApexStorageManager;
  private batcher: DocumentOpenBatcherService | null = null;
  private batcherShutdown: Effect.Effect<void, never> | null = null;

  constructor(logger: LoggerInterface) {
    this.logger = logger;
    this.storageManager = ApexStorageManager.getInstance();
  }

  /**
   * Process a single document open event (public API - LSP notification, fire-and-forget)
   * Routes through the batcher for batching support
   * Diagnostics are computed internally but not returned (LSP notifications don't return values)
   */
  public processDocumentOpen(
    event: TextDocumentChangeEvent<TextDocument>,
  ): void {
    this.logger.debug(
      () =>
        'Common Apex Language Server open document handler invoked ' +
        `for: ${event.document.uri} (version: ${event.document.version})`,
    );

    // Start async processing but don't return a promise
    (async () => {
      try {
        // Initialize batcher if needed
        if (!this.batcher) {
          const { service, shutdown } = await Effect.runPromise(
            makeDocumentOpenBatcher(this.logger, this),
          );
          this.batcher = service;
          this.batcherShutdown = shutdown;
        }

        // Route through batcher (diagnostics computed internally, not returned)
        await Effect.runPromise(this.batcher.addDocumentOpen(event));
      } catch (error) {
        this.logger.error(
          () =>
            `Error processing document open for ${event.document.uri}: ${error}`,
        );
      }
    })();
  }

  /**
   * Process a single document open event internally (used by batcher)
   */
  public async processDocumentOpenInternal(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<Diagnostic[] | undefined> {
    return await this.processDocumentOpenSingle(event);
  }

  /**
   * Process multiple document open events in a batch
   */
  public async processDocumentOpenBatch(
    events: TextDocumentChangeEvent<TextDocument>[],
  ): Promise<(Diagnostic[] | undefined)[]> {
    if (events.length === 0) {
      return [];
    }

    this.logger.debug(
      () => `Processing batch of ${events.length} document opens`,
    );

    const storage = this.storageManager.getStorage();
    const cache = getDocumentStateCache();
    const compilerService = new CompilerService();
    const backgroundManager = ApexSymbolProcessingManager.getInstance();

    // Separate cached and uncached documents
    const uncachedEvents: TextDocumentChangeEvent<TextDocument>[] = [];
    const cachedResults: (Diagnostic[] | undefined)[] = [];

    for (const event of events) {
      const cached = cache.getSymbolResult(
        event.document.uri,
        event.document.version,
      );
      if (cached) {
        cachedResults.push(cached.diagnostics);
        // Still update storage
        await storage.setDocument(event.document.uri, event.document);

        // Even if cached, ensure symbols are added to the symbol manager
        // (they might have been cached from a diagnostic request that didn't add symbols)
        if (cached.symbolTable) {
          const symbolManager = backgroundManager.getSymbolManager();
          const existingSymbols = symbolManager.findSymbolsInFile(
            event.document.uri,
          );
          if (existingSymbols.length === 0) {
            this.logger.debug(
              () =>
                `Batch: Cached file ${event.document.uri} has no symbols in manager, adding them now`,
            );
            await symbolManager.addSymbolTable(
              cached.symbolTable,
              event.document.uri,
            );
            this.logger.debug(
              () =>
                `Batch: Successfully added cached symbols synchronously for ${event.document.uri}`,
            );
          }
        }
      } else {
        uncachedEvents.push(event);
      }
    }

    // Process uncached documents in batch
    const results: (Diagnostic[] | undefined)[] = [...cachedResults];

    if (uncachedEvents.length > 0) {
      try {
        // Create listeners for each file
        // Store listeners and symbol tables so we can access them later
        // Use PublicAPISymbolListener for document open (only need public API for cross-file refs)
        const listeners: PublicAPISymbolListener[] = [];
        const compileConfigs = uncachedEvents.map((event) => {
          const table = new SymbolTable();
          const listener = new PublicAPISymbolListener(table);
          listeners.push(listener);
          return {
            content: event.document.getText(),
            fileName: event.document.uri,
            listener,
            options: {
              collectReferences: true,
              resolveReferences: true,
            },
          };
        });

        const compileResults = await Effect.runPromise(
          compilerService.compileMultipleWithConfigs(compileConfigs),
        );

        // Process each result
        for (let i = 0; i < uncachedEvents.length; i++) {
          const event = uncachedEvents[i];
          const compileResult = compileResults[i];
          const listener = listeners[i];

          // Update storage
          await storage.setDocument(event.document.uri, event.document);

          if (compileResult) {
            // Extract diagnostics - handle both CompilationResult and CompilationResultWithComments
            const diagnostics = getDiagnosticsFromErrors(compileResult.errors);

            // Get symbol table from result or listener
            // compileResult.result should be the SymbolTable, but fallback to listener.getResult()
            let symbolTable: SymbolTable | undefined;
            if (compileResult.result instanceof SymbolTable) {
              symbolTable = compileResult.result;
            } else if (listener instanceof PublicAPISymbolListener) {
              symbolTable = listener.getResult();
            }

            this.logger.debug(
              () =>
                `Batch processing ${event.document.uri}: symbolTable extracted: ` +
                `${symbolTable ? 'yes' : 'no'}, from result: ${compileResult.result instanceof SymbolTable}, ` +
                `from listener: ${listener instanceof PublicAPISymbolListener}`,
            );

            // Cache diagnostics and symbol table
            cache.merge(event.document.uri, {
              symbolTable,
              diagnostics,
              documentVersion: event.document.version,
              documentLength: event.document.getText().length,
              symbolsIndexed: false,
            });

            // Add symbols synchronously so they're immediately available for hover/goto definition
            // Cross-file references will be resolved on-demand when needed (hover, goto definition, diagnostics)
            if (symbolTable) {
              const symbolManager = backgroundManager.getSymbolManager();
              this.logger.debug(
                () =>
                  `Adding symbols synchronously for ${event.document.uri} (batch processing)`,
              );
              // Add symbols immediately (synchronous) without processing references
              // This avoids queue pressure during workspace loading
              await symbolManager.addSymbolTable(
                symbolTable,
                event.document.uri,
              );
              this.logger.debug(
                () =>
                  `Successfully added symbols synchronously for ${event.document.uri}`,
              );
            } else {
              this.logger.warn(
                () =>
                  `No symbol table extracted for ${event.document.uri} in batch processing`,
              );
            }

            results.push(diagnostics);
          } else {
            results.push(undefined);
          }
        }
      } catch (error) {
        this.logger.error(
          () =>
            `Error processing batch: ${error instanceof Error ? error.message : String(error)}`,
        );
        // Return empty diagnostics for failed items
        for (let i = 0; i < uncachedEvents.length; i++) {
          results.push([]);
        }
      }
    }

    return results;
  }

  /**
   * Process a single document open event
   */
  private async processDocumentOpenSingle(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<Diagnostic[] | undefined> {
    const storage = this.storageManager.getStorage();
    const cache = getDocumentStateCache();
    const compilerService = new CompilerService();
    const backgroundManager = ApexSymbolProcessingManager.getInstance();

    // Check cache first
    const cached = cache.getSymbolResult(
      event.document.uri,
      event.document.version,
    );
    if (cached) {
      await storage.setDocument(event.document.uri, event.document);

      // Even if cached, we need to ensure symbols are added to the symbol manager
      // (they might have been cached from a diagnostic request that didn't add symbols)
      if (cached.symbolTable) {
        const symbolManager = backgroundManager.getSymbolManager();
        // Check if symbols already exist for this file
        const existingSymbols = symbolManager.findSymbolsInFile(
          event.document.uri,
        );
        if (existingSymbols.length === 0) {
          this.logger.debug(
            () =>
              `Cached file ${event.document.uri} has no symbols in manager, adding them now`,
          );
          await symbolManager.addSymbolTable(
            cached.symbolTable,
            event.document.uri,
          );
          this.logger.debug(
            () =>
              `Successfully added cached symbols synchronously for ${event.document.uri}`,
          );
        }
      }

      return cached.diagnostics;
    }

    try {
      // Update storage
      await storage.setDocument(event.document.uri, event.document);

      // Compile - create listener
      // Use PublicAPISymbolListener for document open (only need public API for cross-file refs)
      const table = new SymbolTable();
      const listener = new PublicAPISymbolListener(table);

      const compileResult = compilerService.compile(
        event.document.getText(),
        event.document.uri,
        listener,
        {
          collectReferences: true,
          resolveReferences: true,
        },
      );

      if (compileResult) {
        // Extract diagnostics
        const diagnostics = getDiagnosticsFromErrors(compileResult.errors);

        // Get symbol table from result
        const symbolTable =
          compileResult.result instanceof SymbolTable
            ? compileResult.result
            : undefined;

        this.logger.debug(
          () =>
            `Single processing ${event.document.uri}: symbolTable extracted: ${symbolTable ? 'yes' : 'no'}, ` +
            `type: ${typeof compileResult.result}, instanceof: ${compileResult.result instanceof SymbolTable}`,
        );

        // Cache diagnostics and symbol table
        cache.merge(event.document.uri, {
          symbolTable,
          diagnostics,
          documentVersion: event.document.version,
          documentLength: event.document.getText().length,
          symbolsIndexed: false,
        });

        // Add symbols synchronously so they're immediately available for hover/goto definition
        // Cross-file references will be resolved on-demand when needed (hover, goto definition, diagnostics)
        if (symbolTable) {
          const symbolManager = backgroundManager.getSymbolManager();
          this.logger.debug(
            () =>
              `Adding symbols synchronously for ${event.document.uri} (single processing)`,
          );
          // Add symbols immediately (synchronous) without processing cross-file references
          // Same-file references are processed immediately, cross-file references are deferred
          // This avoids queue pressure during workspace loading
          await symbolManager.addSymbolTable(symbolTable, event.document.uri);
          this.logger.debug(
            () =>
              `Successfully added symbols synchronously for ${event.document.uri}`,
          );
        } else {
          this.logger.warn(
            () =>
              `No symbol table extracted for ${event.document.uri} in single processing`,
          );
        }

        return diagnostics;
      }

      return [];
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing document open for ${event.document.uri}: ${error}`,
      );
      return [];
    }
  }
}

// Re-export types and config from DocumentOpenBatcher for convenience
export type { DocumentOpenBatchConfig };
export { DEFAULT_BATCH_CONFIG };
