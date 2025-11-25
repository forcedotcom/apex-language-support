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

import { IDocumentSaveProcessor } from '../services/DocumentSaveProcessingService';

/**
 * Handler for document save events
 */
export class DidSaveDocumentHandler {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly documentSaveProcessor: IDocumentSaveProcessor,
  ) {}

  /**
   * Handle document save event (LSP notification - fire-and-forget)
   * @param event The document save event
   */
  public handleDocumentSave(
    event: TextDocumentChangeEvent<TextDocument>,
  ): void {
    this.logger.debug(
      () =>
        `Processing document save: ${event.document.uri} (version: ${event.document.version})`,
    );

    // Call processor with error handling (fire-and-forget)
    try {
      this.documentSaveProcessor.processDocumentSave(event);
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing document save for ${event.document.uri}: ${error}`,
      );
    }
  }
}
