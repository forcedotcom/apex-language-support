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
 * Service for processing document change events.
 *
 * Delegates to the same shared tier-1 pipeline used by didOpen
 * (parse with VisibilitySymbolListener, setDocument, addSymbolTable, cache merge).
 *
 * The DocumentChangeBatcher debounces rapid edits per-URI before calling this
 * service, so each invocation processes the latest document version.
 */
export class DocumentChangeProcessingService implements IDocumentChangeProcessor {
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
   * Process a document change event (LSP notification - fire-and-forget)
   * Delegates to the shared tier-1 pipeline (same as didOpen):
   * parse → setDocument → addSymbolTable(version) → cache merge
   * @param event The document change event
   */
  public processDocumentChange(
    event: TextDocumentChangeEvent<TextDocument>,
  ): void {
    this.logger.debug(
      () =>
        `Processing document change for: ${event.document.uri} (version: ${event.document.version})`,
    );

    // Delegate to the shared tier-1 pipeline used by didOpen.
    // processDocumentOpenInternal handles: storage update, compile with
    // VisibilitySymbolListener, addSymbolTable(version), cache merge.
    this.documentProcessingService
      .processDocumentOpenInternal(event)
      .then(() => {
        this.logger.debug(
          () =>
            `Document change processed: ${event.document.uri} (version: ${event.document.version})`,
        );
      })
      .catch((error) => {
        this.logger.error(
          () =>
            `Error processing document change for ${event.document.uri}: ${error}`,
        );
      });
  }
}
