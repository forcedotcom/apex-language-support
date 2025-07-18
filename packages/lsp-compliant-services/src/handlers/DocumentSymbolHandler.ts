/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { DocumentSymbolParams, SymbolInformation, DocumentSymbol } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-logging';

import { dispatch } from '../utils/handlerUtil';
import { IDocumentSymbolProcessor } from '../services/DocumentSymbolProcessingService';

/**
 * Handler for document symbol requests
 */
export class DocumentSymbolHandler {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly documentSymbolProcessor: IDocumentSymbolProcessor,
  ) {}

  /**
   * Handle document symbol request
   * @param params The document symbol parameters
   * @returns Document symbols for the requested document
   */
  public async handleDocumentSymbol(
    params: DocumentSymbolParams,
  ): Promise<SymbolInformation[] | DocumentSymbol[] | null> {
    this.logger.debug(() => `Processing document symbol request: ${params.textDocument.uri}`);

    try {
      return await dispatch(
        this.documentSymbolProcessor.processDocumentSymbol(params),
        'Error processing document symbol request',
      );
    } catch (error) {
      this.logger.error(() => `Error processing document symbol request for ${params.textDocument.uri}: ${error}`);
      throw error;
    }
  }
}
