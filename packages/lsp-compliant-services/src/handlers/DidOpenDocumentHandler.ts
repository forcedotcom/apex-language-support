/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Diagnostic, TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger, LoggerInterface } from '@salesforce/apex-lsp-shared';
import { dispatch } from '../utils/handlerUtil';
import { DocumentProcessingService } from '../services/DocumentProcessingService';

/**
 * Handler for document open events
 */
export class DidOpenDocumentHandler {
  private readonly logger: LoggerInterface;
  private readonly documentProcessingService: DocumentProcessingService;

  /**
   * Handle document open event
   * @param event The document open event
   * @returns Diagnostics for the opened document
   */
  constructor(
    logger?: LoggerInterface,
    documentProcessingService?: DocumentProcessingService,
  ) {
    this.logger = logger || getLogger();
    this.documentProcessingService =
      documentProcessingService || new DocumentProcessingService(this.logger);
  }

  public async handleDocumentOpen(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<Diagnostic[] | undefined> {
    this.logger.debug(() => `Processing document open: ${event.document.uri}`);

    try {
      return await dispatch(
        this.documentProcessingService.processDocumentOpen(event),
        'Error processing document open',
      );
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing document open for ${event.document.uri}: ${error}`,
      );
      throw error;
    }
  }
}
