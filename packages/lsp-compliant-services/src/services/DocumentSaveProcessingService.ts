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
  ApexSymbolCollectorListener,
  ApexSymbolProcessingManager,
} from '@salesforce/apex-lsp-parser-ast';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { ApexStorageManager } from '../storage/ApexStorageManager';
import { ApexSettingsManager } from '@salesforce/apex-lsp-shared';

/**
 * Interface for document save processing functionality
 */
export interface IDocumentSaveProcessor {
  /**
   * Process a document save event
   * @param event The document save event
   */
  processDocumentSave(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<void>;
}

/**
 * Service for processing document save events
 */
export class DocumentSaveProcessingService implements IDocumentSaveProcessor {
  constructor(private readonly logger: LoggerInterface) {}

  /**
   * Process a document save event
   * @param event The document save event
   */
  public async processDocumentSave(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<void> {
    this.logger.debug(
      () =>
        `Common Apex Language Server save document handler invoked with: ${event}`,
    );

    try {
      // Get the storage manager instance
      const storageManager = ApexStorageManager.getInstance();
      const storage = storageManager.getStorage();

      const document = event.document;

      // Store the updated document in storage
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
      const symbolManager = backgroundManager.getSymbolManager();
      symbolManager.removeFile(document.uri);

      // Queue the updated symbol processing
      const taskId = backgroundManager.processSymbolTable(
        symbolTable,
        document.uri,
        {
          priority: 'HIGH', // Document save is high priority
          enableCrossFileResolution: true,
          enableReferenceProcessing: true,
        },
      );

      this.logger.debug(
        () =>
          `Document save symbol processing queued: ${taskId} for ${document.uri}`,
      );
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing document save for ${event.document.uri}: ${error}`,
      );
    }
  }
}
