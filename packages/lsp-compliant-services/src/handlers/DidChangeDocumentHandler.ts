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

import { IDocumentChangeProcessor } from '../services/DocumentChangeProcessingService';

/**
 * Handler for document change events
 */
export class DidChangeDocumentHandler {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly documentChangeProcessor: IDocumentChangeProcessor,
  ) {}

  /**
   * Handle document change event (LSP notification - fire-and-forget)
   * @param event The document change event
   */
  public handleDocumentChange(
    event: TextDocumentChangeEvent<TextDocument>,
  ): void {
    this.logger.debug(
      () =>
        `Processing document change: ${event.document.uri} (version: ${event.document.version})`,
    );

    // Call processor with error handling (fire-and-forget)
    try {
      this.documentChangeProcessor.processDocumentChange(event);
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing document change for ${event.document.uri}: ${error}`,
      );
    }
  }
}
