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
    // Client opened a document
    // TODO: Server will parse the document and populate the corresponding local maps
    this.logger.debug(
      () =>
        `Common Apex Language Server save document handler invoked with: ${event}`,
    );

    // TODO: Implement the logic to process the document save
    // This might involve updating the AST, type information, or other data structures
    // based on the changes in the document
    // You can access the document content using params.contentChanges
  }
}
