/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Diagnostic, TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LoggerInterface } from '@salesforce/apex-lsp-logging';

import { dispatch } from '../utils/handlerUtil';

/**
 * Interface for document processing functionality to make handlers more testable
 */
export interface IDocumentProcessor {
  /**
   * Process a document change event
   * @param event The document change event
   * @returns Diagnostics for the changed document
   */
  processDocumentChange(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<Diagnostic[] | undefined>;
}

/**
 * Handler for document change events
 */
export class DidChangeDocumentHandler {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly documentProcessor: IDocumentProcessor,
  ) {}

  /**
   * Handle document change event
   * @param event The document change event
   * @returns Diagnostics for the changed document
   */
  public async handleDocumentChange(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<Diagnostic[] | undefined> {
    this.logger.debug(
      () => `Processing document change: ${event.document.uri}`,
    );

    try {
      return await dispatch(
        this.documentProcessor.processDocumentChange(event),
        'Error processing document change',
      );
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing document change for ${event.document.uri}: ${error}`,
      );
      throw error;
    }
  }
}
