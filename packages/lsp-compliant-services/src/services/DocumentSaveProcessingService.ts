/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  CompilerService,
  SymbolTable,
  VisibilitySymbolListener,
  ApexSymbolProcessingManager,
  type CompilationResult,
  type CompilationResultWithComments,
  type CompilationResultWithAssociations,
} from '@salesforce/apex-lsp-parser-ast';
import {
  LoggerInterface,
  ApexSettingsManager,
  Priority,
} from '@salesforce/apex-lsp-shared';
import { Effect } from 'effect';

import { ApexStorageManager } from '../storage/ApexStorageManager';
import { getDocumentStateCache } from './DocumentStateCache';

/**
 * Interface for document save processing functionality
 */
export interface IDocumentSaveProcessor {
  /**
   * Process a document save event (LSP notification - fire-and-forget)
   * @param event The document save event
   */
  processDocumentSave(event: TextDocumentChangeEvent<TextDocument>): void;
}

/**
 * Service for processing document save events
 */
export class DocumentSaveProcessingService implements IDocumentSaveProcessor {
  constructor(private readonly logger: LoggerInterface) {}

  /**
   * Compile document (pure Effect, can be queued)
   * Wraps compilerService.compile() in Effect for non-blocking operation
   */
  private compileDocument(
    document: TextDocument,
    listener: VisibilitySymbolListener,
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
   * Process a document save event (LSP notification - fire-and-forget)
   * @param event The document save event
   */
  public processDocumentSave(
    event: TextDocumentChangeEvent<TextDocument>,
  ): void {
    this.logger.debug(
      () =>
        'Common Apex Language Server save document handler invoked ' +
        `for: ${event.document.uri} (version: ${event.document.version})`,
    );

    // Start async processing but don't return a promise
    (async () => {
      try {
        // Check parse result cache first
        const parseCache = getDocumentStateCache();
        const cached = parseCache.getSymbolResult(
          event.document.uri,
          event.document.version,
        );

        if (cached) {
          this.logger.debug(
            () =>
              `Using cached parse result for save ${event.document.uri} (version ${event.document.version})`,
          );
          // Still need to update storage and process symbols
          const storageManager = ApexStorageManager.getInstance();
          const storage = storageManager.getStorage();
          const document = event.document;
          await storage.setDocument(document.uri, document);

          const backgroundManager = ApexSymbolProcessingManager.getInstance();
          const symbolManager = backgroundManager.getSymbolManager();

          // Get SymbolTable from manager (not cache)
          const symbolTable = symbolManager.getSymbolTableForFile(document.uri);

          if (symbolTable) {
            // Remove old symbols before adding new ones (didSave should refresh symbols)
            symbolManager.removeFile(document.uri);
            const taskId = backgroundManager.processSymbolTable(
              symbolTable,
              document.uri,
              {
                priority: Priority.High,
                enableCrossFileResolution: true,
                enableReferenceProcessing: true,
              },
              document.version,
            );
            this.logger.debug(
              () =>
                'Document save symbol processing queued (cached): ' +
                `${taskId} for ${document.uri} (version: ${document.version})`,
            );
            // Monitor task completion and update cache
            this.monitorTaskCompletion(taskId, document.uri, document.version);
          } else {
            this.logger.debug(
              () =>
                `Cached diagnostics but no SymbolTable in manager for ${document.uri}, will recompile`,
            );
            // Fall through to recompilation
          }

          if (symbolTable) {
            return;
          }
        }

        // Get the storage manager instance
        const storageManager = ApexStorageManager.getInstance();
        const storage = storageManager.getStorage();

        const document = event.document;

        // Store the updated document in storage
        await storage.setDocument(document.uri, document);

        // Create a symbol collector listener
        // Use VisibilitySymbolListener for document save (only need public API for cross-file refs)
        const table = new SymbolTable();
        const listener = new VisibilitySymbolListener('public-api', table);

        // Parse the document using Effect-based compilation (with yielding)
        const settingsManager = ApexSettingsManager.getInstance();
        const fileSize = document.getText().length;
        const baseOptions = settingsManager.getCompilationOptions(
          'documentChange',
          fileSize,
        );
        // Ensure reference collection/resolution is enabled
        const options = {
          ...baseOptions,
          collectReferences: true,
          resolveReferences: true,
        };

        const result = await Effect.runPromise(
          this.compileDocument(document, listener, options),
        );

        if (result.errors.length > 0) {
          this.logger.debug(
            () =>
              `Errors parsing saved document: ${JSON.stringify(result.errors)}`,
          );
          // Continue processing even with errors
        }

        // Get the symbol table from the listener
        const symbolTable = listener.getResult();

        // Queue symbol processing in the background for better performance
        const backgroundManager = ApexSymbolProcessingManager.getInstance();

        // Remove old symbols for this file first (synchronous operation)
        // didSave should refresh symbols by removing old and adding new
        const symbolManager = backgroundManager.getSymbolManager();
        symbolManager.removeFile(document.uri);

        // Add symbols immediately without processing cross-file references
        // Same-file references are processed immediately, cross-file references are deferred
        // Cross-file references will be resolved on-demand when needed
        await Effect.runPromise(
          symbolManager.addSymbolTable(symbolTable, document.uri),
        );

        this.logger.debug(
          () =>
            `Document save symbols added for ${document.uri} (version: ${document.version})`,
        );

        // Cache diagnostics (SymbolTable is stored in ApexSymbolManager)
        // symbolsIndexed defaults to false for new entries
        parseCache.merge(document.uri, {
          diagnostics: [],
          documentVersion: document.version,
          documentLength: document.getText().length,
          symbolsIndexed: false, // Will be set to true when indexing completes
        });
      } catch (error) {
        this.logger.error(
          () =>
            `Error processing document save for ${event.document.uri}: ${error}`,
        );
      }
    })();
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
          () => `Error monitoring task ${taskId} completion: ${error}`,
        );
      }
    };

    // Start checking after a short delay
    setTimeout(checkTask, 100);
  }
}
