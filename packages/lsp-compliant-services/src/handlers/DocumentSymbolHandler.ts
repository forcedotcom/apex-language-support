/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {
  DocumentSymbolParams,
  SymbolInformation,
  DocumentSymbol,
} from 'vscode-languageserver';
import { getLogger, LogMessageType } from '@salesforce/apex-lsp-logging';

import { dispatch } from '../utils/handlerUtil';
import { DefaultApexDocumentSymbolProvider } from '../documentSymbol/ApexDocumentSymbolProvider';
import { ApexStorageManager } from '../storage/ApexStorageManager';

// Visible for testing
export const processOnDocumentSymbol = async (
  params: DocumentSymbolParams,
): Promise<SymbolInformation[] | DocumentSymbol[] | null> => {
  const logger = getLogger();
  logger.log(
    LogMessageType.Debug,
    `Common Apex Language Server document symbol handler invoked with: ${params}`,
  );

  try {
    // Get the storage manager instance
    const storageManager = ApexStorageManager.getInstance();
    const storage = storageManager.getStorage();

    // Create the document symbol provider
    const provider = new DefaultApexDocumentSymbolProvider(storage);

    // Get document symbols
    return await provider.provideDocumentSymbols(params);
  } catch (error) {
    logger.log(
      LogMessageType.Error,
      `Error processing document symbols: ${error}`,
    );
    return null;
  }
};

export const dispatchProcessOnDocumentSymbol = (
  params: DocumentSymbolParams,
): Promise<SymbolInformation[] | DocumentSymbol[] | null> =>
  dispatch(
    processOnDocumentSymbol(params),
    'Error processing document symbols',
  );

/**
 * Handler for document symbol requests
 */
export class DocumentSymbolHandler {
  private readonly logger = getLogger();

  /**
   * Handle document symbol request
   * @param params The document symbol parameters
   * @returns Document symbols for the requested document
   */
  public async handleDocumentSymbol(
    params: DocumentSymbolParams,
  ): Promise<SymbolInformation[] | DocumentSymbol[] | null> {
    this.logger.log(
      LogMessageType.Info,
      `Processing document symbol request: ${params.textDocument.uri}`,
    );

    try {
      return await dispatchProcessOnDocumentSymbol(params);
    } catch (error) {
      this.logger.log(
        LogMessageType.Error,
        () =>
          `Error processing document symbol request for ${params.textDocument.uri}: ${error}`,
      );
      throw error;
    }
  }
}
