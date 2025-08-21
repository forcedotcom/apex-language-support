/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger } from '@salesforce/apex-lsp-shared';
import { ApexSymbol } from '@salesforce/apex-lsp-parser-ast';

import {
  ApexStorageInterface,
  ApexReference,
} from '../storage/ApexStorageInterface';

/**
 * Interface for Apex definition upserter
 */
export interface ApexDefinitionUpserter {
  /**
   * Upserts the definitions for the given document
   * @param params DidOpenTextDocumentParams
   */
  upsertDefinition(event: TextDocumentChangeEvent<TextDocument>): Promise<void>;
}

/**
 * Implementation of Apex definition upserter
 */
export class DefaultApexDefinitionUpserter implements ApexDefinitionUpserter {
  private readonly logger = getLogger();
  private readonly storage: ApexStorageInterface;
  private readonly globalSymbols: ApexSymbol[];

  constructor(storage: ApexStorageInterface, globalSymbols: ApexSymbol[]) {
    this.storage = storage;
    this.globalSymbols = globalSymbols;
  }

  /**
   * Upserts the definitions for the given document
   * @param params DidOpenTextDocumentParams
   */
  async upsertDefinition(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<void> {
    try {
      const documentUri = event.document.uri;

      // Process each global symbol
      for (const symbol of this.globalSymbols) {
        const reference: ApexReference = {
          sourceFile: documentUri,
          targetSymbol: symbol.name,
          line: symbol.location.identifierRange.startLine,
          column: symbol.location.identifierRange.startColumn,
          referenceType: 'type-reference',
        };
        await this.storage.setDefinition(symbol.name, reference);
      }
    } catch (error) {
      this.logger.error(() => `Error populating definitions: ${error}`);
    }
  }
}
