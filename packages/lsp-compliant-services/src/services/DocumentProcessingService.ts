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
} from '@salesforce/apex-lsp-parser-ast';
import {
  LoggerInterface,
  ApexSettingsManager,
} from '@salesforce/apex-lsp-shared';

import {
  getDiagnosticsFromErrors,
  shouldSuppressDiagnostics,
} from '../utils/handlerUtil';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import { DefaultApexDefinitionUpserter } from '../definition/ApexDefinitionUpserter';
import { DefaultApexReferencesUpserter } from '../references/ApexReferencesUpserter';
import { IDocumentChangeProcessor } from './DocumentChangeProcessingService';
import { getParseResultCache } from './ParseResultCache';

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
   * Process a document change event
   * @param event The document change event
   * @returns Diagnostics for the changed document
   */
  public async processDocumentChange(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<Diagnostic[] | undefined> {
    this.logger.debug(
      () =>
        `Common Apex Language Server change document handler invoked for: ${event.document.uri} (version: ${event.document.version})`,
    );

    // Check parse result cache first
    const parseCache = getParseResultCache();
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
    const compilerService = new CompilerService();

    // Parse the document
    const settingsManager = ApexSettingsManager.getInstance();
    const fileSize = document.getText().length;
    const options = settingsManager.getCompilationOptions(
      'documentChange',
      fileSize,
    );

    const result = compilerService.compile(
      document.getText(),
      document.uri,
      listener,
      options,
    );

    if (result.errors.length > 0) {
      this.logger.debug(() => `Errors parsing document: ${result.errors}`);
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
        priority: 'NORMAL', // Document changes are normal priority
        enableCrossFileResolution: true,
        enableReferenceProcessing: true,
      },
    );

    this.logger.debug(
      () => `Document change symbol processing queued: ${taskId}`,
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

    // Upsert the definitions and references (these are fire-and-forget operations)
    // In a real implementation, you might want to handle these differently
    try {
      await definitionUpserter.upsertDefinition(event);
    } catch (error) {
      this.logger.error(() => `Error upserting definitions: ${error}`);
    }

    try {
      await referencesUpserter.upsertReferences(event);
    } catch (error) {
      this.logger.error(() => `Error upserting references: ${error}`);
    }

    // Cache the parse result for future requests with same version
    const diagnostics: Diagnostic[] = [];
    parseCache.merge(event.document.uri, {
      symbolTable,
      diagnostics,
      documentVersion: event.document.version,
      documentLength: document.getText().length,
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
        `Common Apex Language Server open document handler invoked for: ${event.document.uri} (version: ${event.document.version})`,
    );

    // Check parse result cache first
    const parseCache = getParseResultCache();
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
      return cached.diagnostics;
    }

    // Get the storage manager instance
    const storageManager = ApexStorageManager.getInstance();
    const storage = storageManager.getStorage();

    const document = event.document;

    // Store the document in storage for later retrieval by other handlers
    await storage.setDocument(document.uri, document);

    // Create a symbol collector listener
    const table = new SymbolTable();
    const listener = new ApexSymbolCollectorListener(table);
    const compilerService = new CompilerService();

    // Parse the document
    const settingsManager = ApexSettingsManager.getInstance();
    const fileSize = document.getText().length;
    const options = settingsManager.getCompilationOptions(
      'documentOpen',
      fileSize,
    );

    const result = compilerService.compile(
      document.getText(),
      document.uri,
      listener,
      options,
    );

    if (result.errors.length > 0) {
      this.logger.debug(
        () => `Errors parsing document: ${JSON.stringify(result.errors)}`,
      );
      const diagnostics = getDiagnosticsFromErrors(result.errors);
      return diagnostics;
    }

    // If comments were associated, store them with the symbol manager for later retrieval (e.g., hover)
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

    // Get the symbol table from the listener
    const symbolTable = listener.getResult();

    // Get all symbols from the global scope
    const globalSymbols = symbolTable.getCurrentScope().getAllSymbols();

    // Queue symbol processing in the background for better performance
    const backgroundManager = ApexSymbolProcessingManager.getInstance();
    const taskId = backgroundManager.processSymbolTable(
      symbolTable,
      document.uri,
      {
        priority: 'HIGH', // Document open is high priority
        enableCrossFileResolution: true,
        enableReferenceProcessing: true,
      },
    );

    this.logger.debug(
      () => `Document open symbol processing queued: ${taskId}`,
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
      // Log errors but don't throw - document processing should continue
      this.logger.error(
        () => `Error upserting definitions/references: ${error}`,
      );
    }

    // Cache the parse result for future requests with same version
    const diagnostics: Diagnostic[] = [];
    parseCache.merge(event.document.uri, {
      symbolTable,
      diagnostics,
      documentVersion: event.document.version,
      documentLength: document.getText().length,
    });

    return undefined;
  }
}
