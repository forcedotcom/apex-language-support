/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocumentChangeEvent, Diagnostic } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { ApexStorageManager } from '../storage/ApexStorageManager';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';

/**
 * Interface for document change processing functionality
 */
export interface IDocumentChangeProcessor {
  /**
   * Process a document change event
   * @param event The document change event
   * @returns Diagnostics for the changed document
   */
  processDocumentChange(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<Diagnostic[] | undefined>;
}

/**
 * Service for processing document change events
 */
export class DocumentChangeProcessingService
  implements IDocumentChangeProcessor
{
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
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
      () => `Processing document change for: ${event.document.uri}`,
    );

    try {
      // Get the storage manager instance
      const storageManager = ApexStorageManager.getInstance();
      const storage = storageManager.getStorage();

      // Update the document in storage
      const stored = await storage.setDocument(
        event.document.uri,
        event.document,
      );
      console.log('[DOC-CHANGE] Document stored:', {
        uri: event.document.uri,
        success: stored,
      });

      // For now, return empty diagnostics
      // In a full implementation, this would re-parse the document
      // and return any parsing errors as diagnostics
      this.logger.debug(
        () => `Document change processed: ${event.document.uri}`,
      );

      return [];
    } catch (error) {
      this.logger.error(() => `Error processing document change: ${error}`);
      return [];
    }
  }
}
