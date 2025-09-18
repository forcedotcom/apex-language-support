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
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { DefaultApexDocumentSymbolProvider } from '../documentSymbol/ApexDocumentSymbolProvider';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import {
  ApexSymbolProcessingManager,
  ISymbolManager,
} from '@salesforce/apex-lsp-parser-ast';

/**
 * Interface for document symbol processing functionality
 */
export interface IDocumentSymbolProcessor {
  /**
   * Process a document symbol request
   * @param params The document symbol parameters
   * @returns Document symbols for the requested document
   */
  processDocumentSymbol(
    params: DocumentSymbolParams,
  ): Promise<SymbolInformation[] | DocumentSymbol[] | null>;
}

/**
 * Service for processing document symbol requests using ApexSymbolManager
 */
export class DocumentSymbolProcessingService
  implements IDocumentSymbolProcessor
{
  private readonly logger: LoggerInterface;
  private readonly symbolManager: ISymbolManager;

  constructor(logger: LoggerInterface, symbolManager?: ISymbolManager) {
    this.logger = logger;
    this.symbolManager =
      symbolManager ||
      ApexSymbolProcessingManager.getInstance().getSymbolManager();
  }

  /**
   * Process a document symbol request
   * @param params The document symbol parameters
   * @returns Document symbols for the requested document
   */
  public async processDocumentSymbol(
    params: DocumentSymbolParams,
  ): Promise<SymbolInformation[] | DocumentSymbol[] | null> {
    this.logger.debug(
      () =>
        `Common Apex Language Server document symbol handler invoked with: ${params}`,
    );

    try {
      // Get the storage manager instance
      const storageManager = ApexStorageManager.getInstance();
      const storage = storageManager.getStorage();

      // Create the document symbol provider
      const provider = new DefaultApexDocumentSymbolProvider(storage);

      // Get document symbols using the provider
      const symbols = await provider.provideDocumentSymbols(params);

      // TODO: Enhance symbols with graph-based information using ApexSymbolManager
      // For now, return the original symbols to avoid type issues
      // The enhancement will be implemented in a future update

      return symbols;
    } catch (error) {
      this.logger.error(() => `Error processing document symbols: ${error}`);
      return null;
    }
  }
}
