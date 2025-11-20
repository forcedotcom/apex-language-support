/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Diagnostic, TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LoggerInterface, Priority } from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';
import {
  CompilerService,
  ApexSymbolProcessingManager,
  ApexSymbolCollectorListener,
  SymbolTable,
  offer,
  createQueuedItem,
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
   * Process a single document open event (public API)
   * Routes through the batcher for batching support
   */
  public async processDocumentOpen(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<Diagnostic[] | undefined> {
    this.logger.debug(
      () =>
        'Common Apex Language Server open document handler invoked ' +
        `for: ${event.document.uri} (version: ${event.document.version})`,
    );

    // Initialize batcher if needed
    if (!this.batcher) {
      const { service, shutdown } = await Effect.runPromise(
        makeDocumentOpenBatcher(this.logger, this),
      );
      this.batcher = service;
      this.batcherShutdown = shutdown;
    }

    // Route through batcher
    return await Effect.runPromise(this.batcher.addDocumentOpen(event));
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
    const symbolManager =
      ApexSymbolProcessingManager.getInstance().getSymbolManager();

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
      } else {
        uncachedEvents.push(event);
      }
    }

    // Process uncached documents in batch
    const results: (Diagnostic[] | undefined)[] = [...cachedResults];

    if (uncachedEvents.length > 0) {
      try {
        // Create listeners for each file
        const compileConfigs = uncachedEvents.map((event) => {
          const table = new SymbolTable();
          const listener = new ApexSymbolCollectorListener(table);
          return {
            content: event.document.getText(),
            fileName: event.document.uri,
            listener,
            options: {},
          };
        });

        const compileResults = await Effect.runPromise(
          compilerService.compileMultipleWithConfigs(compileConfigs),
        );

        // Process each result
        for (let i = 0; i < uncachedEvents.length; i++) {
          const event = uncachedEvents[i];
          const compileResult = compileResults[i];

          // Update storage
          await storage.setDocument(event.document.uri, event.document);

          if (compileResult) {
            // Extract diagnostics - handle both CompilationResult and CompilationResultWithComments
            const diagnostics = getDiagnosticsFromErrors(compileResult.errors);

            // Get symbol table from result
            const symbolTable =
              compileResult.result instanceof SymbolTable
                ? compileResult.result
                : undefined;

            // Cache diagnostics and symbol table
            cache.merge(event.document.uri, {
              symbolTable,
              diagnostics,
              documentVersion: event.document.version,
              documentLength: event.document.getText().length,
              symbolsIndexed: false,
            });

            // Queue symbol processing
            if (symbolTable) {
              const queuedItem = await Effect.runPromise(
                createQueuedItem(
                  Effect.sync(() => {
                    symbolManager.addSymbolTable(
                      symbolTable,
                      event.document.uri,
                    );
                  }),
                ),
              );
              await Effect.runPromise(
                offer(Priority.Normal, queuedItem).pipe(
                  Effect.tap(() => Effect.void),
                ),
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
    const symbolManager =
      ApexSymbolProcessingManager.getInstance().getSymbolManager();

    // Check cache first
    const cached = cache.getSymbolResult(
      event.document.uri,
      event.document.version,
    );
    if (cached) {
      await storage.setDocument(event.document.uri, event.document);
      return cached.diagnostics;
    }

    try {
      // Update storage
      await storage.setDocument(event.document.uri, event.document);

      // Compile - create listener
      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);

      const compileResult = compilerService.compile(
        event.document.getText(),
        event.document.uri,
        listener,
        {},
      );

      if (compileResult) {
        // Extract diagnostics
        const diagnostics = getDiagnosticsFromErrors(compileResult.errors);

        // Get symbol table from result
        const symbolTable =
          compileResult.result instanceof SymbolTable
            ? compileResult.result
            : undefined;

        // Cache diagnostics and symbol table
        cache.merge(event.document.uri, {
          symbolTable,
          diagnostics,
          documentVersion: event.document.version,
          documentLength: event.document.getText().length,
          symbolsIndexed: false,
        });

        // Queue symbol processing
        if (symbolTable) {
          const queuedItem = await Effect.runPromise(
            createQueuedItem(
              Effect.sync(() => {
                symbolManager.addSymbolTable(symbolTable, event.document.uri);
              }),
            ),
          );
          await Effect.runPromise(
            offer(Priority.Normal, queuedItem).pipe(
              Effect.tap(() => Effect.void),
            ),
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
