/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ApexSymbol } from '@salesforce/apex-lsp-parser-ast';
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger } from '@salesforce/apex-lsp-shared';

import {
  ApexStorageInterface,
  ApexReference,
} from '../storage/ApexStorageInterface';
/**
 * Interface for Apex references upserters
 */
export interface ApexReferencesUpserter {
  /**
   * Upserts the references for the given document
   * @param params DidOpenTextDocumentParams
   */
  upsertReferences(event: TextDocumentChangeEvent<TextDocument>): Promise<void>;
}

/**
 * Implementation of Apex references upserter
 */
export class DefaultApexReferencesUpserter implements ApexReferencesUpserter {
  private readonly logger = getLogger();
  private readonly storage: ApexStorageInterface;
  private readonly globalSymbols: ApexSymbol[];

  constructor(storage: ApexStorageInterface, globalSymbols: ApexSymbol[]) {
    this.storage = storage;
    this.globalSymbols = globalSymbols;
  }

  /**
   * Upserts the references for the given document
   * @param params DidOpenTextDocumentParams
   */
  async upsertReferences(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<void> {
    try {
      const documentUri = event.document.uri;

      // Process each global symbol
      for (const symbol of this.globalSymbols) {
        const reference: ApexReference = {
          sourceFile: documentUri,
          targetSymbol: symbol.name,
          line: symbol.location.startLine,
          column: symbol.location.startColumn,
          referenceType: 'type-reference',
        };
        const references: ApexReference[] = await this.storage.getReferences(
          symbol.name,
        );
        references.push(reference);
        await this.storage.setReferences(symbol.name, references);
      }
    } catch (error) {
      this.logger.error(() => `Error populating definitions: ${error}`);
    }
  }
}
