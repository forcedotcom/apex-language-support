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
import { Effect } from 'effect';
import { DocumentProcessingService } from '../services/DocumentProcessingService';
import {
  type DocumentOpenBatcherService,
  makeDocumentOpenBatcher,
} from '../services/DocumentOpenBatcher';

/**
 * Handler for document open events
 */
export class DidOpenDocumentHandler {
  private readonly logger: LoggerInterface;
  private readonly documentProcessingService: DocumentProcessingService;
  private batcher: DocumentOpenBatcherService | null = null;

  /**
   * Handle document open event
   * @param event The document open event
   * @returns Diagnostics for the opened document
   */
  constructor(
    logger?: LoggerInterface,
    documentProcessingService?: DocumentProcessingService,
    batcher?: DocumentOpenBatcherService,
  ) {
    this.logger = logger || getLogger();
    this.documentProcessingService =
      documentProcessingService || new DocumentProcessingService(this.logger);
    this.batcher = batcher || null;
  }

  public async handleDocumentOpen(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<Diagnostic[] | undefined> {
    this.logger.debug(
      () =>
        `Processing document open: ${event.document.uri} (version: ${event.document.version})`,
    );

    try {
      // Initialize batcher if needed
      if (!this.batcher) {
        const { service } = await Effect.runPromise(
          makeDocumentOpenBatcher(this.logger, this.documentProcessingService),
        );
        this.batcher = service;
      }

      // Route through batcher
      return await Effect.runPromise(this.batcher.addDocumentOpen(event));
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing document open for ${event.document.uri}: ${error}`,
      );
      throw error;
    }
  }
}
