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

import { DocumentProcessingService } from './DocumentProcessingService';

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
 * Service for processing document save events.
 *
 * Delegates to the same shared tier-1 pipeline used by didOpen and didChange
 * (parse with VisibilitySymbolListener, setDocument, addSymbolTable with version, cache merge).
 *
 * This ensures didSave performs the same tasks as didOpen and didChange
 * and avoids divergent compile/symbol logic.
 */
export class DocumentSaveProcessingService implements IDocumentSaveProcessor {
  private readonly logger: LoggerInterface;
  private readonly documentProcessingService: DocumentProcessingService;

  constructor(
    logger: LoggerInterface,
    documentProcessingService?: DocumentProcessingService,
  ) {
    this.logger = logger;
    this.documentProcessingService =
      documentProcessingService ?? new DocumentProcessingService(logger);
  }

  /**
   * Process a document save event (LSP notification - fire-and-forget)
   * Delegates to the shared tier-1 pipeline (same as didOpen/didChange):
   * parse → setDocument → addSymbolTable(version) → cache merge
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

    // Delegate to the shared tier-1 pipeline used by didOpen/didChange.
    // processDocumentOpenInternal handles: cache check, storage update,
    // compile with VisibilitySymbolListener, addSymbolTable(version), cache merge.
    this.documentProcessingService
      .processDocumentOpenInternal(event)
      .then(() => {
        this.logger.debug(
          () =>
            `Document save processed: ${event.document.uri} (version: ${event.document.version})`,
        );
      })
      .catch((error) => {
        this.logger.error(
          () =>
            `Error processing document save for ${event.document.uri}: ${error}`,
        );
      });
  }
}
