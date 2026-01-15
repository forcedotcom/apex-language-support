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
  VisibilitySymbolListener,
  SymbolTable,
  type CompilationResult,
  ApexSymbolManager,
} from '@salesforce/apex-lsp-parser-ast';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import { getDocumentStateCache } from './DocumentStateCache';
import type { ApexStorageInterface } from '../storage/ApexStorageInterface';
import type { DocumentStateCache } from './DocumentStateCache';
import {
  makeDocumentOpenBatcher,
  type DocumentOpenBatcherService,
  DEFAULT_BATCH_CONFIG,
  type DocumentOpenBatchConfig,
} from './DocumentOpenBatcher';
import { getDiagnosticsFromErrors } from '../utils/handlerUtil';
import { LayerEnrichmentService } from './LayerEnrichmentService';

/**
 * Yield to the Node.js event loop using setImmediate for immediate yielding
 * This is more effective than Effect.sleep(0) which may use setTimeout
 */
const yieldToEventLoop = Effect.async<void>((resume) => {
  setImmediate(() => resume(Effect.void));
});

/**
 * Service for processing document open events
 */
export class DocumentProcessingService {
  private readonly logger: LoggerInterface;
  private readonly storageManager: ApexStorageManager;
  private batcher: DocumentOpenBatcherService | null = null;
  private batcherShutdown: Effect.Effect<void, never> | null = null;
  private layerEnrichmentService: LayerEnrichmentService | null = null;

  constructor(logger: LoggerInterface) {
    this.logger = logger;
    this.storageManager = ApexStorageManager.getInstance();
  }

  /**
   * Set the layer enrichment service (for editor-opened files)
   */
  setLayerEnrichmentService(service: LayerEnrichmentService): void {
    this.layerEnrichmentService = service;
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

        // Check if symbols exist in symbol manager (they should if cache hit)
        // If not, we need to recompile to get them
        const symbolManager = backgroundManager.getSymbolManager();
        const existingSymbols = symbolManager.findSymbolsInFile(
          event.document.uri,
        );
        if (existingSymbols.length === 0) {
          // Cache hit but no symbols in manager - need to recompile
          this.logger.debug(
            () =>
              `Batch: Cached file ${event.document.uri} has no symbols in manager, will recompile`,
          );
          uncachedEvents.push(event);
        }
      } else {
        uncachedEvents.push(event);
      }
    }

    // Process uncached documents in batch
    const results: (Diagnostic[] | undefined)[] = [...cachedResults];

    if (uncachedEvents.length > 0) {
      const batchStartTime = Date.now();
      let compileDuration = 0;
      this.logger.debug(
        () =>
          `[WORKSPACE-LOAD] Starting batch processing: ${uncachedEvents.length} files, ` +
          `${cachedResults.length} cached, ${events.length} total`,
      );
      try {
        // Create listeners for each file
        // Store listeners and symbol tables so we can access them later
        // Use VisibilitySymbolListener for document open (only need public API for cross-file refs)
        const listeners: VisibilitySymbolListener[] = [];
        const compileConfigs = uncachedEvents.map((event) => {
          const table = new SymbolTable();
          const listener = new VisibilitySymbolListener('public-api', table);
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

        const compileStartTime = Date.now();
        this.logger.debug(
          () =>
            `[WORKSPACE-LOAD] Starting compilation: ${compileConfigs.length} files`,
        );
        const compileResults = await Effect.runPromise(
          compilerService.compileMultipleWithConfigs(compileConfigs),
        );
        compileDuration = Date.now() - compileStartTime;
        this.logger.debug(
          () =>
            `[WORKSPACE-LOAD] Compilation completed in ${compileDuration}ms: ` +
            `${compileResults.length} results`,
        );

        // Process results using Effect-based processing with yields between files
        const symbolManager = backgroundManager.getSymbolManager();
        const postCompilationStartTime = Date.now();
        this.logger.debug(
          () =>
            `[WORKSPACE-LOAD] Starting post-compilation processing: ${uncachedEvents.length} files`,
        );
        const postCompilationResults = await Effect.runPromise(
          this.processPostCompilationResultsEffect(
            compileResults,
            uncachedEvents,
            listeners,
            storage,
            cache,
            symbolManager,
          ),
        );
        const postCompilationDuration = Date.now() - postCompilationStartTime;
        this.logger.debug(
          () =>
            `[WORKSPACE-LOAD] Post-compilation processing completed in ${postCompilationDuration}ms`,
        );
        results.push(...postCompilationResults);

        const batchDuration = Date.now() - batchStartTime;
        this.logger.debug(
          () =>
            `[WORKSPACE-LOAD] Batch processing completed in ${batchDuration}ms ` +
            `(compile: ${compileDuration}ms, post-compile: ${postCompilationDuration}ms)`,
        );
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
   * Process post-compilation results using Effect-TS with yields between files
   * This prevents event loop blocking during batch processing
   */
  private processPostCompilationResultsEffect(
    compileResults: (CompilationResult<SymbolTable> | undefined)[],
    events: TextDocumentChangeEvent<TextDocument>[],
    listeners: VisibilitySymbolListener[],
    storage: ApexStorageInterface,
    cache: DocumentStateCache,
    symbolManager: ApexSymbolManager,
  ): Effect.Effect<(Diagnostic[] | undefined)[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const results: (Diagnostic[] | undefined)[] = [];
      const fileProcessingStartTime = Date.now();
      let filesProcessed = 0;
      let yieldsPerformed = 0;
      // Yield every 10 files instead of every file to reduce overhead
      // setImmediate has more overhead than Effect.sleep(0), so we yield less frequently
      const YIELD_INTERVAL = 10;

      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const compileResult = compileResults[i];
        const listener = listeners[i];

        // Update storage wrapped in Effect with error handling
        yield* Effect.promise(() =>
          storage.setDocument(event.document.uri, event.document),
        ).pipe(Effect.catchAll(() => Effect.void));

        if (compileResult) {
          // Extract diagnostics - handle both CompilationResult and CompilationResultWithComments
          const diagnostics = getDiagnosticsFromErrors(compileResult.errors);

          // Get symbol table from result or listener
          // compileResult.result should be the SymbolTable, but fallback to listener.getResult()
          let symbolTable: SymbolTable | undefined;
          if (compileResult.result instanceof SymbolTable) {
            symbolTable = compileResult.result;
          } else if (listener instanceof VisibilitySymbolListener) {
            symbolTable = listener.getResult();
          }

          self.logger.debug(
            () =>
              `Batch processing ${event.document.uri}: symbolTable extracted: ` +
              `${symbolTable ? 'yes' : 'no'}, from result: ${compileResult.result instanceof SymbolTable}, ` +
              `from listener: ${listener instanceof VisibilitySymbolListener}`,
          );

          // Cache diagnostics wrapped in Effect (synchronous operation)
          // Workspace batch processing uses public-api only (fast initial load)
          yield* Effect.sync(() =>
            cache.merge(event.document.uri, {
              diagnostics,
              documentVersion: event.document.version,
              documentLength: event.document.getText().length,
              symbolsIndexed: false,
              detailLevel: 'public-api', // Workspace load is public API only
            }),
          );

          // Add symbols so they're immediately available for hover/goto definition
          // Cross-file references will be resolved on-demand when needed (hover, goto definition, diagnostics)
          if (symbolTable) {
            const symbolAddStartTime = Date.now();
            // Add symbols immediately using Effect-based method
            // This avoids queue pressure during workspace loading
            yield* symbolManager.addSymbolTable(
              symbolTable,
              event.document.uri,
            );
            const symbolAddDuration = Date.now() - symbolAddStartTime;
            filesProcessed++;
            if (symbolAddDuration > 50) {
              self.logger.debug(
                () =>
                  `[WORKSPACE-LOAD] Added symbols for ${event.document.uri} in ${symbolAddDuration}ms`,
              );
            }
          } else {
            self.logger.warn(
              () =>
                `No symbol table extracted for ${event.document.uri} in batch processing`,
            );
          }

          results.push(diagnostics);
        } else {
          results.push(undefined);
        }

        // Yield every YIELD_INTERVAL files (except last) to allow event loop to process other tasks
        // Reduced frequency to minimize setImmediate overhead
        if ((i + 1) % YIELD_INTERVAL === 0 && i + 1 < events.length) {
          yieldsPerformed++;
          yield* yieldToEventLoop; // Yield to event loop using setImmediate
        }
      }

      const totalDuration = Date.now() - fileProcessingStartTime;
      if (totalDuration > 100 || yieldsPerformed > 0) {
        self.logger.debug(
          () =>
            `[WORKSPACE-LOAD] Processed ${filesProcessed} files with ${yieldsPerformed} yields ` +
            `in ${totalDuration}ms ` +
            `(avg: ${filesProcessed > 0 ? (totalDuration / filesProcessed).toFixed(1) : 0}ms/file) ` +
            `(yields: ${yieldsPerformed})`,
        );
      }

      return results;
    }) as Effect.Effect<(Diagnostic[] | undefined)[], never, never>;
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

      // Check if symbols exist in symbol manager (they should if cache hit)
      // If not, we need to recompile to get them
      const symbolManager = backgroundManager.getSymbolManager();
      const existingSymbols = symbolManager.findSymbolsInFile(
        event.document.uri,
      );
      if (existingSymbols.length === 0) {
        // Cache hit but no symbols in manager - need to recompile
        this.logger.debug(
          () =>
            `Cached file ${event.document.uri} has no symbols in manager, will recompile`,
        );
        // Fall through to recompilation
      } else {
        // Cache hit and symbols exist - return cached diagnostics
        return cached.diagnostics;
      }
    }

    try {
      // Update storage
      await storage.setDocument(event.document.uri, event.document);

      // Compile - create listener
      // Use VisibilitySymbolListener for document open (only need public API for cross-file refs)
      const table = new SymbolTable();
      const listener = new VisibilitySymbolListener('public-api', table);

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

        // Cache diagnostics (SymbolTable is stored in ApexSymbolManager)
        // Editor open starts with public-api, will be enriched to full
        cache.merge(event.document.uri, {
          diagnostics,
          documentVersion: event.document.version,
          documentLength: event.document.getText().length,
          symbolsIndexed: false,
          detailLevel: 'public-api', // Initial level, will be enriched
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
          await Effect.runPromise(
            symbolManager.addSymbolTable(symbolTable, event.document.uri),
          );
          this.logger.debug(
            () =>
              `Successfully added symbols synchronously for ${event.document.uri}`,
          );

          // Enrich to full detail level for editor-opened files (not workspace batch)
          // This ensures documentSymbol, completion, hover, and diagnostics have full semantics
          if (this.layerEnrichmentService) {
            try {
              this.logger.debug(
                () =>
                  `Enriching editor-opened file ${event.document.uri} to full detail level`,
              );
              // Enrich asynchronously (don't block diagnostics return)
              this.layerEnrichmentService
                .enrichFiles([event.document.uri], 'full', 'same-file')
                .then(() => {
                  this.logger.debug(
                    () =>
                      `Successfully enriched ${event.document.uri} to full detail level`,
                  );
                })
                .catch((error) => {
                  this.logger.debug(
                    () => `Error enriching ${event.document.uri}: ${error}`,
                  );
                });
            } catch (error) {
              this.logger.debug(
                () =>
                  `Error initiating enrichment for ${event.document.uri}: ${error}`,
              );
            }
          }
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
