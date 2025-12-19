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
import { getDocumentStateCache } from './DocumentStateCache';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';

/**
 * Interface for document change processing functionality
 */
export interface IDocumentChangeProcessor {
  /**
   * Process a document change event (LSP notification - fire-and-forget)
   * @param event The document change event
   */
  processDocumentChange(event: TextDocumentChangeEvent<TextDocument>): void;
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
   * Process a document change event (LSP notification - fire-and-forget)
   * @param event The document change event
   */
  public processDocumentChange(
    event: TextDocumentChangeEvent<TextDocument>,
  ): void {
    this.logger.debug(
      () =>
        `Processing document change for: ${event.document.uri} (version: ${event.document.version})`,
    );

    // Start async processing but don't return a promise
    (async () => {
      try {
        // Get the storage manager instance
        const storageManager = ApexStorageManager.getInstance();
        const storage = storageManager.getStorage();

        // Update the document in storage
        await storage.setDocument(event.document.uri, event.document);

        // Invalidate cache and schedule new lazy analysis
        const cache = getDocumentStateCache();
        cache.invalidate(event.document.uri);

        const processingService = DocumentProcessingService.getInstance(
          this.logger,
        );
        // This will schedule a new lazy analysis after debounce
        await processingService.processDocumentOpenInternal(event);

        this.logger.debug(
          () =>
            `Document change processed and lazy analysis scheduled: ${event.document.uri} (version: ${event.document.version})`,
        );
      } catch (error) {
        this.logger.error(
          () =>
            `Error processing document change for ${event.document.uri}: ${error}`,
        );
      }
    })();
  }
}
