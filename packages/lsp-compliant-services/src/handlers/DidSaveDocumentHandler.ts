/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LogMessageType, LoggerInterface } from '@salesforce/apex-lsp-logging';

import { dispatch } from '../utils/handlerUtil';
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
   * Handle document save event
   * @param event The document save event
   */
  public async handleDocumentSave(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<void> {
    this.logger.log(
      LogMessageType.Info,
      `Processing document save: ${event.document.uri}`,
    );

    try {
      await dispatch(
        this.documentSaveProcessor.processDocumentSave(event),
        'Error processing document save',
      );
    } catch (error) {
      this.logger.log(
        LogMessageType.Error,
        () =>
          `Error processing document save for ${event.document.uri}: ${error}`,
      );
      throw error;
    }
  }
}
