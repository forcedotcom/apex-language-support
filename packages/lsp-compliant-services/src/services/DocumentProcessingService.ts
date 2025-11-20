/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Diagnostic, TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  SymbolTable,
  CompilerService,
  ApexSymbolCollectorListener,
  ApexSymbolProcessingManager,
  createQueuedItem,
  offer,
  SchedulerInitializationService,
  type CompilationResult,
  type CompilationResultWithComments,
  type CompilationResultWithAssociations,
} from '@salesforce/apex-lsp-parser-ast';
import {
  LoggerInterface,
  ApexSettingsManager,
  Priority,
} from '@salesforce/apex-lsp-shared';
import { Effect, Fiber } from 'effect';

import {
  getDiagnosticsFromErrors,
  shouldSuppressDiagnostics,
} from '../utils/handlerUtil';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import { DefaultApexDefinitionUpserter } from '../definition/ApexDefinitionUpserter';
import { DefaultApexReferencesUpserter } from '../references/ApexReferencesUpserter';
import { IDocumentChangeProcessor } from './DocumentChangeProcessingService';
import { getDocumentStateCache } from './DocumentStateCache';

/**
 * Service for processing document changes
 */
export class DocumentProcessingService implements IDocumentChangeProcessor {
  constructor(private readonly logger: LoggerInterface) {}

  private static hasCommentAssociationsLocally(result: any): boolean {
    return (
      !!result &&
      typeof result === 'object' &&
      'comments' in (result as any) &&
      'commentAssociations' in (result as any)
    );
  }

  /**
   * Compile document (pure Effect, can be queued)
   * Wraps compilerService.compile() in Effect for non-blocking operation
   */
  private compileDocument(
    document: TextDocument,
    listener: ApexSymbolCollectorListener,
    options: any,
  ): Effect.Effect<
    | CompilationResult<SymbolTable>
    | CompilationResultWithComments<SymbolTable>
    | CompilationResultWithAssociations<SymbolTable>,
    never,
    never
  > {
    const logger = this.logger;
    return Effect.gen(function* () {
      // Yield control before starting compilation
      yield* Effect.yieldNow();

      const compilerService = new CompilerService();
      let result:
        | CompilationResult<SymbolTable>
        | CompilationResultWithComments<SymbolTable>
        | CompilationResultWithAssociations<SymbolTable>;

      try {
        result = yield* Effect.sync(() =>
          compilerService.compile(
            document.getText(),
            document.uri,
            listener,
            options,
          ),
        );
      } catch (error: unknown) {
        logger.error(
          () => `Failed to compile document ${document.uri}: ${error}`,
        );
        // Return error result
        result = {
          fileName: document.uri,
          result: null,
          errors: [
            {
              type: 'semantic' as any,
              severity: 'error' as any,
              message: error instanceof Error ? error.message : String(error),
              line: 0,
              column: 0,
              fileUri: document.uri,
            },
          ],
          warnings: [],
        } as CompilationResult<SymbolTable>;
      }

      logger.debug(
        () =>
          `Compilation completed for ${document.uri}: ${result.errors.length} errors, ` +
          `${result.warnings.length} warnings`,
      );

      return result;
    });
  }

  /**
   * Process a document change event
   * @param event The document change event
   * @returns Diagnostics for the changed document
   */
  public async processDocumentChange(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<Diagnostic[] | undefined> {
    this.logger.debug(
      () =>
        'Common Apex Language Server change document handler invoked ' +
        `for: ${event.document.uri} (version: ${event.document.version})`,
    );

    // Check parse result cache first
    const parseCache = getDocumentStateCache();
    const cached = parseCache.getSymbolResult(
      event.document.uri,
      event.document.version,
    );

    if (cached) {
      this.logger.debug(
        () =>
          `Using cached parse result for ${event.document.uri} (version ${event.document.version})`,
      );
      return cached.diagnostics;
    }

    // Suppress diagnostics for standard Apex library classes
    if (shouldSuppressDiagnostics(event.document.uri)) {
      this.logger.debug(
        () =>
          `Suppressing diagnostics for standard Apex library: ${event.document.uri}`,
      );
      return [];
    }

    // Get the storage manager instance
    const storageManager = ApexStorageManager.getInstance();
    const storage = storageManager.getStorage();
    const document = event.document;
    if (!document) {
      this.logger.error(
        () => `Document not found for URI: ${event.document.uri}`,
      );
    }

    // Store the document in storage for later retrieval by other handlers
    await storage.setDocument(document.uri, document);

    // Create a symbol collector listener
    const table = new SymbolTable();
    const listener = new ApexSymbolCollectorListener(table);

    // Parse the document using Effect-based compilation (with yielding)
    const settingsManager = ApexSettingsManager.getInstance();
    const fileSize = document.getText().length;
    const options = settingsManager.getCompilationOptions(
      'documentChange',
      fileSize,
    );

    const result = await Effect.runPromise(
      this.compileDocument(document, listener, options),
    );

    if (result.errors.length > 0) {
      this.logger.debug(
        () => `Errors parsing document ${event.document.uri}: ${result.errors}`,
      );
      const diagnostics = getDiagnosticsFromErrors(result.errors);
      return diagnostics;
    }

    // Get the symbol table from the listener
    const symbolTable = listener.getResult();

    // Get all symbols from the global scope
    const globalSymbols = symbolTable.getCurrentScope().getAllSymbols();

    // If comments were associated, schedule persistence via background manager
    if (DocumentProcessingService.hasCommentAssociationsLocally(result)) {
      try {
        const backgroundManager = ApexSymbolProcessingManager.getInstance();
        backgroundManager.scheduleCommentAssociations(
          document.uri,
          (result as any).commentAssociations,
        );
      } catch (_e) {
        // best-effort; ignore failures
      }
    }

    // Queue symbol processing in the background for better performance
    const backgroundManager = ApexSymbolProcessingManager.getInstance();
    const taskId = backgroundManager.processSymbolTable(
      symbolTable,
      document.uri,
      {
        priority: Priority.Normal,
        enableCrossFileResolution: true,
        enableReferenceProcessing: true,
      },
      document.version,
    );

    this.logger.debug(
      () =>
        `Document change symbol processing queued: ${taskId} for ${document.uri}`,
    );

    // Monitor task completion and update cache
    this.monitorTaskCompletion(taskId, document.uri, document.version);

    // Create the definition provider
    const definitionUpserter = new DefaultApexDefinitionUpserter(
      storage,
      globalSymbols,
    );

    // Create the references provider
    const referencesUpserter = new DefaultApexReferencesUpserter(
      storage,
      globalSymbols,
    );

    // Upsert the definitions and references (these are fire-and-forget operations)
    // In a real implementation, you might want to handle these differently
    try {
      await definitionUpserter.upsertDefinition(event);
    } catch (error) {
      this.logger.error(
        () => `Error upserting definitions for ${document.uri}: ${error}`,
      );
    }

    try {
      await referencesUpserter.upsertReferences(event);
    } catch (error) {
      this.logger.error(
        () => `Error upserting references for ${document.uri}: ${error}`,
      );
    }

    // Cache the parse result for future requests with same version
    // symbolsIndexed defaults to false for new entries
    const diagnostics: Diagnostic[] = [];
    parseCache.merge(event.document.uri, {
      symbolTable,
      diagnostics,
      documentVersion: event.document.version,
      documentLength: document.getText().length,
      symbolsIndexed: false, // Will be set to true when indexing completes
    });

    return undefined; // No diagnostics to return
  }

  /**
   * Process a document open event
   * @param event The document open event
   * @returns Diagnostics for the opened document
   */
  public async processDocumentOpen(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<Diagnostic[] | undefined> {
    this.logger.debug(
      () =>
        'Common Apex Language Server open document handler invoked ' +
        `for: ${event.document.uri} (version: ${event.document.version})`,
    );

    // Check parse result cache first
    const parseCache = getDocumentStateCache();
    const cached = parseCache.getSymbolResult(
      event.document.uri,
      event.document.version,
    );

    if (cached) {
      this.logger.debug(
        () =>
          `Using cached parse result for ${event.document.uri} (version ${event.document.version})`,
      );
      // Store the document in storage (always needed, even with cache hit)
      const storageManager = ApexStorageManager.getInstance();
      const storage = storageManager.getStorage();
      await storage.setDocument(event.document.uri, event.document);

      // Check if symbols need to be indexed
      const fullCached = parseCache.get(
        event.document.uri,
        event.document.version,
      );
      if (fullCached && !fullCached.symbolsIndexed && cached.symbolTable) {
        // Queue symbol processing if not already queued/in-progress
        const backgroundManager = ApexSymbolProcessingManager.getInstance();
        const taskId = backgroundManager.processSymbolTable(
          cached.symbolTable,
          event.document.uri,
          {
            priority: Priority.High,
            enableCrossFileResolution: true,
            enableReferenceProcessing: true,
          },
          event.document.version,
        );

        if (taskId === 'deduplicated') {
          this.logger.debug(
            () =>
              `Symbol processing already queued for ${event.document.uri} (version ${event.document.version})`,
          );
        } else {
          this.logger.debug(
            () =>
              `Document open symbol processing queued from cache: ${taskId} ` +
              `for ${event.document.uri} (version ${event.document.version})`,
          );
          // Monitor task completion and update cache
          this.monitorTaskCompletion(
            taskId,
            event.document.uri,
            event.document.version,
          );
        }
      }

      return cached.diagnostics;
    }

    // Get the storage manager instance
    const storageManager = ApexStorageManager.getInstance();
    const storage = storageManager.getStorage();

    const document = event.document;

    // Store the document in storage for later retrieval by other handlers
    await storage.setDocument(document.uri, document);

    // Queue compilation task (non-blocking)
    try {
      // Ensure scheduler is initialized
      const schedulerService = SchedulerInitializationService.getInstance();
      await schedulerService.ensureInitialized();

      // Create a symbol collector listener
      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);

      // Get compilation options
      const settingsManager = ApexSettingsManager.getInstance();
      const fileSize = document.getText().length;
      const options = settingsManager.getCompilationOptions(
        'documentOpen',
        fileSize,
      );

      // Create compilation Effect
      const compileEffect = this.compileDocument(document, listener, options);

      // Queue compilation task
      const queuedItem = await Effect.runPromise(
        createQueuedItem(compileEffect, 'document-compilation'),
      );
      const scheduledTask = await Effect.runPromise(
        offer(Priority.High, queuedItem),
      );

      this.logger.debug(
        () =>
          `Document compilation queued for ${document.uri} (version ${document.version})`,
      );

      // Process compilation result in background (don't await - let it run async)
      this.processCompilationResult(
        scheduledTask,
        document,
        listener,
        event,
        storage,
        parseCache,
      );
    } catch (error) {
      this.logger.error(() => `Error queuing document compilation: ${error}`);
      // Return empty diagnostics on error
    }

    // Return immediately with empty diagnostics (will be updated when compilation completes)
    return [];
  }

  /**
   * Process compilation result when compilation task completes
   * Handles errors, queues symbol processing, updates cache
   */
  private async processCompilationResult(
    scheduledTask: {
      fiber: Effect.Effect<
        Fiber.RuntimeFiber<
          | CompilationResult<SymbolTable>
          | CompilationResultWithComments<SymbolTable>
          | CompilationResultWithAssociations<SymbolTable>,
          never
        >,
        never,
        never
      >;
    },
    document: TextDocument,
    listener: ApexSymbolCollectorListener,
    event: TextDocumentChangeEvent<TextDocument>,
    storage: any,
    parseCache: any,
  ): Promise<void> {
    try {
      // Wait for compilation task to complete
      const fiber = await Effect.runPromise(scheduledTask.fiber);
      const result = await Effect.runPromise(Fiber.await(fiber));

      if (result._tag === 'Failure') {
        this.logger.error(
          () => `Compilation failed for ${event.document.uri}: ${result.cause}`,
        );
        return;
      }

      const compilationResult = result.value as
        | CompilationResult<SymbolTable>
        | CompilationResultWithComments<SymbolTable>
        | CompilationResultWithAssociations<SymbolTable>;

      // Handle compilation errors
      if (compilationResult.errors.length > 0) {
        this.logger.debug(
          () =>
            `Errors parsing document ${document.uri}: ${JSON.stringify(compilationResult.errors)}`,
        );
        const diagnostics = getDiagnosticsFromErrors(compilationResult.errors);
        parseCache.merge(event.document.uri, {
          diagnostics,
          documentVersion: event.document.version,
        });
        return;
      }

      // If comments were associated, store them
      if (
        DocumentProcessingService.hasCommentAssociationsLocally(
          compilationResult,
        )
      ) {
        try {
          const backgroundManager = ApexSymbolProcessingManager.getInstance();
          backgroundManager.scheduleCommentAssociations(
            event.document.uri,
            (compilationResult as any).commentAssociations,
          );
        } catch (_e) {
          // best-effort; ignore failures
        }
      }

      // Get the symbol table from the listener
      const symbolTable = listener.getResult();

      // Get all symbols from the global scope
      const globalSymbols = symbolTable.getCurrentScope().getAllSymbols();

      // Queue symbol processing in the background
      const backgroundManager = ApexSymbolProcessingManager.getInstance();
      const taskId = backgroundManager.processSymbolTable(
        symbolTable,
        event.document.uri,
        {
          priority: Priority.High,
          enableCrossFileResolution: true,
          enableReferenceProcessing: true,
        },
        event.document.version,
      );

      this.logger.debug(
        () =>
          `Document open symbol processing queued: ${taskId} for ${event.document.uri}`,
      );

      // Monitor task completion and update cache
      this.monitorTaskCompletion(
        taskId,
        event.document.uri,
        event.document.version,
      );

      // Create the definition provider
      const definitionUpserter = new DefaultApexDefinitionUpserter(
        storage,
        globalSymbols,
      );

      // Create the references provider
      const referencesUpserter = new DefaultApexReferencesUpserter(
        storage,
        globalSymbols,
      );

      // Upsert the definitions and references in parallel
      try {
        await Promise.all([
          definitionUpserter.upsertDefinition(event),
          referencesUpserter.upsertReferences(event),
        ]);
      } catch (error) {
        // Log errors but don't throw
        this.logger.error(
          () =>
            `Error upserting definitions/references for ${event.document.uri}: ${error}`,
        );
      }

      // Cache the parse result
      const diagnostics: Diagnostic[] = [];
      parseCache.merge(event.document.uri, {
        symbolTable,
        diagnostics,
        documentVersion: event.document.version,
        documentLength: event.document.getText().length,
        symbolsIndexed: false, // Will be set to true when indexing completes
      });
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing compilation result for ${event.document.uri}: ${error}`,
      );
    }
  }

  /**
   * Monitor task completion and update cache when indexing completes
   * @param taskId The task ID to monitor
   * @param fileUri The file URI
   * @param documentVersion The document version
   */
  private monitorTaskCompletion(
    taskId: string,
    fileUri: string,
    documentVersion: number,
  ): void {
    // Skip monitoring for special task IDs
    if (taskId === 'sync_fallback' || taskId === 'deduplicated') {
      return;
    }

    // Check task status after a short delay and periodically
    const checkTask = async (): Promise<void> => {
      try {
        const backgroundManager = ApexSymbolProcessingManager.getInstance();
        const status = backgroundManager.getTaskStatus(taskId);

        if (status === 'COMPLETED') {
          // Update cache to mark symbols as indexed
          const parseCache = getDocumentStateCache();
          const cached = parseCache.get(fileUri, documentVersion);
          if (cached && cached.documentVersion === documentVersion) {
            parseCache.merge(fileUri, { symbolsIndexed: true });
            this.logger.debug(
              () =>
                `Marked symbols as indexed for ${fileUri} (version ${documentVersion}) after task ${taskId} completed`,
            );
          }
        } else if (status === 'PENDING' || status === 'RUNNING') {
          // Task still in progress, check again after a delay
          setTimeout(checkTask, 100);
        }
        // If status is FAILED or CANCELLED, don't update cache
      } catch (error) {
        // Best-effort; log but don't throw
        this.logger.debug(
          () =>
            `Error monitoring task ${taskId} completion for ${fileUri}: ${error}`,
        );
      }
    };

    // Start checking after a short delay
    setTimeout(checkTask, 100);
  }
}
