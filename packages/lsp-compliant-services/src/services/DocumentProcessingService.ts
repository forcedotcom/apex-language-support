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
  isStandardApexUri,
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
  private static instance: DocumentProcessingService | null = null;
  private readonly logger: LoggerInterface;
  private readonly storageManager: ApexStorageManager;
  private batcher: DocumentOpenBatcherService | null = null;
  private batcherShutdown: Effect.Effect<void, never> | null = null;

  // Lazy analysis state
  private readonly debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly pendingAnalyses = new Map<
    string,
    Promise<Diagnostic[] | undefined>
  >();
  private readonly ANALYSIS_DEBOUNCE_MS = 5000;

  private isDisposed = false;

  private constructor(logger: LoggerInterface) {
    this.logger = logger;
    this.storageManager = ApexStorageManager.getInstance();
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(
    logger?: LoggerInterface,
  ): DocumentProcessingService {
    if (!DocumentProcessingService.instance) {
      if (!logger) {
        throw new Error(
          'Logger must be provided when creating DocumentProcessingService instance',
        );
      }
      DocumentProcessingService.instance = new DocumentProcessingService(
        logger,
      );
    }
    return DocumentProcessingService.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   * This disposes the current instance and clears the singleton
   */
  public static reset(): void {
    if (DocumentProcessingService.instance) {
      DocumentProcessingService.instance.dispose();
      DocumentProcessingService.instance = null;
    }
  }

  /**
   * Dispose of all resources held by this service
   * Cancels all pending timers and clears state
   */
  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.isDisposed = true;
    this.logger.debug(() => 'Disposing DocumentProcessingService');

    // Cancel all debounce timers
    for (const [uri, timer] of this.debounceTimers) {
      clearTimeout(timer);
      this.logger.debug(() => `Cancelled debounce timer for ${uri}`);
    }
    this.debounceTimers.clear();

    // Note: We can't cancel pending analyses, but we can clear the map
    // The promises will complete but results won't be used
    this.pendingAnalyses.clear();

    // Shutdown batcher if running
    if (this.batcherShutdown) {
      Effect.runPromise(this.batcherShutdown).catch((error) => {
        this.logger.error(() => `Error shutting down batcher: ${error}`);
      });
      this.batcher = null;
      this.batcherShutdown = null;
    }
  }

  /**
   * Check if the service has been disposed
   */
  public get disposed(): boolean {
    return this.isDisposed;
  }

  /**
   * Process a single document open event (public API - LSP notification, fire-and-forget)
   * Routes through the batcher for batching support
   * Diagnostics are computed internally but not returned (LSP notifications don't return values)
   */
  public processDocumentOpen(
    event: TextDocumentChangeEvent<TextDocument>,
  ): void {
    if (this.isDisposed) {
      this.logger.warn(() => 'processDocumentOpen called on disposed service');
      return;
    }

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
   * Process multiple document open events in a batch (Minimal overhead)
   */
  public async processDocumentOpenBatch(
    events: TextDocumentChangeEvent<TextDocument>[],
  ): Promise<(Diagnostic[] | undefined)[]> {
    if (events.length === 0) {
      return [];
    }

    this.logger.debug(
      () =>
        `Processing batch of ${events.length} document opens (minimal/lazy)`,
    );

    const storage = this.storageManager.getStorage();
    const cache = getDocumentStateCache();

    const results: (Diagnostic[] | undefined)[] = [];

    for (const event of events) {
      // Skip standard library classes - they are managed by ResourceLoader
      if (isStandardApexUri(event.document.uri)) {
        this.logger.debug(
          () =>
            `Skipping minimal open for standard library class: ${event.document.uri}`,
        );
        results.push([]);
        continue;
      }

      // 1. Store the document (lightweight)
      await storage.setDocument(event.document.uri, event.document);

      // 2. Initialize cache entry (lightweight)
      const existing = cache.get(event.document.uri, event.document.version);
      if (!existing) {
        cache.merge(event.document.uri, {
          documentVersion: event.document.version,
          documentLength: event.document.getText().length,
          symbolsIndexed: false,
          fullAnalysisCompleted: false,
          diagnostics: [], // No diagnostics initially
        });
      }

      // 3. Schedule lazy full analysis
      this.scheduleLazyAnalysis(event.document.uri, event.document.version);

      results.push([]); // Return empty diagnostics initially
    }

    return results;
  }

  /**
   * Schedule full analysis after a debounce period
   */
  private scheduleLazyAnalysis(uri: string, version: number): void {
    const cache = getDocumentStateCache();
    const cached = cache.get(uri, version);

    // If already analyzed for this version, don't schedule again
    if (cached?.fullAnalysisCompleted) {
      return;
    }

    // Clear existing timer if any
    const existingTimer = this.debounceTimers.get(uri);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer - use a longer debounce for background analysis
    const timer = setTimeout(async () => {
      this.debounceTimers.delete(uri);
      try {
        await this.ensureFullAnalysis(uri, version, {
          priority: Priority.Low,
          reason: 'debounce',
        });
      } catch (error) {
        this.logger.error(
          () => `Error in lazy analysis for ${uri} (v${version}): ${error}`,
        );
      }
    }, this.ANALYSIS_DEBOUNCE_MS);

    this.debounceTimers.set(uri, timer);
  }

  /**
   * Ensure full analysis has been performed for a document version
   */
  public async ensureFullAnalysis(
    uri: string,
    version: number,
    options: {
      priority: Priority;
      reason: string;
      force?: boolean;
    },
  ): Promise<Diagnostic[] | undefined> {
    if (this.isDisposed) {
      this.logger.warn(() => 'ensureFullAnalysis called on disposed service');
      return [];
    }

    // Skip standard library classes
    if (isStandardApexUri(uri)) {
      return [];
    }

    const cache = getDocumentStateCache();
    const cached = cache.get(uri, version);

    if (
      !options.force &&
      cached?.fullAnalysisCompleted &&
      cached.diagnostics !== undefined
    ) {
      this.logger.debug(
        () =>
          `Full analysis already completed for ${uri} (v${version}) [Reason: ${options.reason}]`,
      );
      return cached.diagnostics;
    }

    const analysisKey = `${uri}@${version}`;

    // SYNCHRONOUS CHECK-AND-SET: Get or create the promise atomically
    let analysisPromise = this.pendingAnalyses.get(analysisKey);

    if (analysisPromise) {
      // Someone else is already analyzing this exact version
      this.logger.debug(
        () =>
          `Full analysis already in progress for ${uri} (v${version}) [Reason: ${options.reason}]`,
      );
      return analysisPromise;
    }

    // No pending analysis - we'll start one
    this.logger.debug(
      () =>
        `Performing full analysis for ${uri} (v${version}) [Reason: ${options.reason}]`,
    );

    // Cancel any pending debounce timer since we're doing it now
    const timer = this.debounceTimers.get(uri);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(uri);
    }

    // CREATE PROMISE AND SET IT IMMEDIATELY (synchronously)
    // This is the critical fix - no await between check and set
    analysisPromise = this.performFullAnalysisWithCleanup(
      analysisKey,
      uri,
      version,
      options.priority,
    );
    this.pendingAnalyses.set(analysisKey, analysisPromise);

    return analysisPromise;
  }

  /**
   * Wrapper that ensures cleanup happens after analysis
   * @private
   */
  private async performFullAnalysisWithCleanup(
    analysisKey: string,
    uri: string,
    version: number,
    priority: Priority,
  ): Promise<Diagnostic[] | undefined> {
    try {
      return await this.performFullAnalysis(uri, version, priority);
    } finally {
      // Clean up pending analysis regardless of success/failure
      this.pendingAnalyses.delete(analysisKey);
    }
  }

  /**
   * Perform the expensive full analysis (parsing, symbols, diagnostics)
   */
  private async performFullAnalysis(
    uri: string,
    version: number,
    priority: Priority,
  ): Promise<Diagnostic[] | undefined> {
    const storage = this.storageManager.getStorage();
    const cache = getDocumentStateCache();
    const compilerService = new CompilerService();
    const backgroundManager = ApexSymbolProcessingManager.getInstance();

    const document = await storage.getDocument(uri);
    if (!document || document.version !== version) {
      this.logger.warn(
        () =>
          `Cannot perform full analysis for ${uri}: document not found or version mismatch ` +
          `(expected v${version}, found ${document ? 'v' + document.version : 'none'})`,
      );
      return undefined;
    }

    try {
      // Compile - create listener
      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);

      const compileResult = compilerService.compile(
        document.getText(),
        uri,
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

        this.logger.debug(
          () =>
            `Full analysis completed for ${uri}: symbolTable extracted: ${symbolTable ? 'yes' : 'no'}`,
        );

        // Cache diagnostics and symbol table, mark as completed
        cache.merge(uri, {
          symbolTable,
          diagnostics,
          documentVersion: version,
          documentLength: document.getText().length,
          symbolsIndexed: false,
          fullAnalysisCompleted: true,
        });

        // Add symbols synchronously so they're immediately available
        if (symbolTable) {
          const symbolManager = backgroundManager.getSymbolManager();
          await symbolManager.addSymbolTable(symbolTable, uri);

          // Queue additional background processing for cross-file resolution and references
          backgroundManager.processSymbolTable(
            symbolTable,
            uri,
            {
              priority,
              enableCrossFileResolution: true,
              enableReferenceProcessing: true,
            },
            version,
          );
        }

        return diagnostics;
      } else {
        // Even if compilation failed to return a result, mark as completed for this version
        // so we don't keep retrying the same version in a loop
        cache.merge(uri, {
          documentVersion: version,
          fullAnalysisCompleted: true,
          diagnostics: [],
        });
      }

      return [];
    } catch (error) {
      this.logger.error(
        () => `Error during full analysis for ${uri}: ${error}`,
      );
      // Mark as completed on error to prevent infinite retry loop
      cache.merge(uri, {
        documentVersion: version,
        fullAnalysisCompleted: true,
        diagnostics: [],
      });
      return [];
    }
  }

  /**
   * Handle document close - cancel any pending analysis
   */
  public handleDocumentClose(uri: string): void {
    if (this.isDisposed) {
      return;
    }

    const timer = this.debounceTimers.get(uri);
    if (timer) {
      this.logger.debug(
        () => `Cancelling pending lazy analysis for ${uri} (document closed)`,
      );
      clearTimeout(timer);
      this.debounceTimers.delete(uri);
    }
  }

  /**
   * Process a single document open event internally (used by batcher)
   */
  public async processDocumentOpenInternal(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<Diagnostic[] | undefined> {
    return await this.processDocumentOpenBatch([event]).then((r) => r[0]);
  }
}

// Re-export types and config from DocumentOpenBatcher for convenience
export type { DocumentOpenBatchConfig };
export { DEFAULT_BATCH_CONFIG };
