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

/**
 * Interface for document close processing functionality
 */
export interface IDocumentCloseProcessor {
  /**
   * Process a document close event
   * @param event The document close event
   */
  processDocumentClose(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<void>;
}

/**
 * Service for processing document close events
 */
export class DocumentCloseProcessingService implements IDocumentCloseProcessor {
  constructor(private readonly logger: LoggerInterface) {}

  /**
   * Process a document close event
   * @param event The document close event
   */
  public async processDocumentClose(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<void> {
    this.logger.debug(
      () =>
        `Common Apex Language Server close document handler invoked with: ${event}`,
    );

    // Note: We intentionally do NOT remove documents from storage when they're closed
    // in the UI, as the storage system is designed to persist for the entire session
    // to support cross-file references and other language features.
  }
}
