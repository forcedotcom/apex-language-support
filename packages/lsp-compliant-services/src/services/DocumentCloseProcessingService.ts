/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { ApexStorageManager } from '../storage/ApexStorageManager';
import { DocumentProcessingService } from './DocumentProcessingService';

/**
 * Interface for document close processing functionality
 */
export interface IDocumentCloseProcessor {
  /**
   * Process a document close event (LSP notification - fire-and-forget)
   * @param event The document close event
   */
  processDocumentClose(event: TextDocumentChangeEvent<TextDocument>): void;
}

/**
 * Service for processing document close events
 * NOTE: This only handles document sync housekeeping (removing from storage).
 * Symbols are NOT removed here - only didDelete operations should remove symbols.
 */
export class DocumentCloseProcessingService implements IDocumentCloseProcessor {
  private readonly logger: LoggerInterface;

  constructor(logger: LoggerInterface) {
    this.logger = logger;
  }

  /**
   * Process a document close event (LSP notification - fire-and-forget)
   * @param event The document close event
   */
  public processDocumentClose(
    event: TextDocumentChangeEvent<TextDocument>,
  ): void {
    this.logger.debug(
      () =>
        `Processing document close for: ${event.document.uri} (version: ${event.document.version})`,
    );

    // Start async processing but don't return a promise
    (async () => {
      // Cancel any pending lazy analysis
      try {
        const processingService = DocumentProcessingService.getInstance(
          this.logger,
        );
        processingService.handleDocumentClose(event.document.uri);
      } catch (error) {
        this.logger.debug(
          () => `Could not notify DocumentProcessingService of close: ${error}`,
        );
      }

      // Get the storage manager instance
      let storage;
      try {
        const storageManager = ApexStorageManager.getInstance();
        storage = storageManager.getStorage();
      } catch (error) {
        this.logger.error(
          () =>
            `Error getting storage manager for ${event.document.uri}: ${error}`,
        );
        storage = null;
      }

      // Remove the document from storage (housekeeping only for doc sync)
      // NOTE: Symbols are NOT removed here - only didDelete should remove symbols
      if (storage) {
        try {
          await storage.deleteDocument(event.document.uri);
        } catch (error) {
          this.logger.error(
            () =>
              `Error deleting document ${event.document.uri} from storage: ${error}`,
          );
        }
      }

      this.logger.debug(
        () =>
          `Document close processed: ${event.document.uri} (version: ${event.document.version})`,
      );
    })();
  }
}
