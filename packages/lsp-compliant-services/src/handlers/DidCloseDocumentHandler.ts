/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger, LogMessageType } from '@salesforce/apex-lsp-logging';

import { dispatch } from '../utils/handlerUtil';

// Visible for testing
export const processOnCloseDocument = async (
  event: TextDocumentChangeEvent<TextDocument>,
): Promise<void> => {
  const logger = getLogger();
  logger.log(
    LogMessageType.Debug,
    `Common Apex Language Server close document handler invoked with: ${event}`,
  );

  // Note: We intentionally do NOT remove documents from storage when they're closed
  // in the UI, as the storage system is designed to persist for the entire session
  // to support cross-file references and other language features.
};

export const dispatchProcessOnCloseDocument = (
  event: TextDocumentChangeEvent<TextDocument>,
) => dispatch(processOnCloseDocument(event), 'Error processing document close');

/**
 * Handler for document close events
 */
export class DidCloseDocumentHandler {
  private readonly logger = getLogger();

  /**
   * Handle document close event
   * @param event The document close event
   */
  public handleDocumentClose(
    event: TextDocumentChangeEvent<TextDocument>,
  ): void {
    this.logger.log(
      LogMessageType.Info,
      `Processing document close: ${event.document.uri}`,
    );

    try {
      dispatchProcessOnCloseDocument(event);
    } catch (error) {
      this.logger.log(
        LogMessageType.Error,
        () =>
          `Error processing document close for ${event.document.uri}: ${error}`,
      );
      throw error;
    }
  }
}
