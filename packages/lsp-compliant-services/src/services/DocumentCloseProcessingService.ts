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
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';

/**
 * Interface for document close processing functionality
 */
export interface IDocumentCloseProcessor {
  /**
   * Process a document close event
   * @param event The document close event
   * @returns Promise resolving to void
   */
  processDocumentClose(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<void>;
}

/**
 * Service for processing document close events
 */
export class DocumentCloseProcessingService implements IDocumentCloseProcessor {
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
  }

  /**
   * Process a document close event
   * @param event The document close event
   * @returns Promise resolving to void
   */
  public async processDocumentClose(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<void> {
    this.logger.debug(
      () =>
        `Processing document close for: ${event.document.uri} (version: ${event.document.version})`,
    );

    // Get the storage manager instance
    let storage;
    try {
      const storageManager = ApexStorageManager.getInstance();
      storage = storageManager.getStorage();
    } catch (error) {
      this.logger.error(() => `Error getting storage manager: ${error}`);
      storage = null;
    }

    // Remove the document from storage
    if (storage) {
      try {
        await storage.deleteDocument(event.document.uri);
      } catch (error) {
        this.logger.error(
          () => `Error deleting document from storage: ${error}`,
        );
      }
    }

    // Remove symbols for this file from the symbol manager
    try {
      this.symbolManager.removeFile(event.document.uri);
    } catch (error) {
      this.logger.error(
        () => `Error removing file from symbol manager: ${error}`,
      );
    }

    this.logger.debug(
      () =>
        `Document close processed: ${event.document.uri} (version: ${event.document.version})`,
    );
  }
}
