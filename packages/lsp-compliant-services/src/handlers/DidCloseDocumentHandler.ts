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

import { dispatch } from '../utils/handlerUtil';
import { IDocumentCloseProcessor } from '../services/DocumentCloseProcessingService';

/**
 * Handler for document close events
 */
export class DidCloseDocumentHandler {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly documentCloseProcessor: IDocumentCloseProcessor,
  ) {}

  /**
   * Handle document close event
   * @param event The document close event
   * @returns Promise resolving to void
   */
  public async handleDocumentClose(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<void> {
    this.logger.debug(
      () =>
        `Processing document close: ${event.document.uri} (version: ${event.document.version})`,
    );

    try {
      return await dispatch(
        this.documentCloseProcessor.processDocumentClose(event),
        'Error processing document close',
      );
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing document close for ${event.document.uri}: ${error}`,
      );
      throw error;
    }
  }
}
