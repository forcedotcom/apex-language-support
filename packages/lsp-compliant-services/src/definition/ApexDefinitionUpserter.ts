/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CompilerService,
  ApexSymbolCollectorListener,
  SymbolTable,
} from '@salesforce/apex-lsp-parser-ast';
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

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
  private compilerService: CompilerService;

  constructor(private readonly storage: ApexStorageInterface) {
    this.compilerService = new CompilerService();
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
      const document = event.document;

      if (!document) {
        console.error('Document not found:', documentUri);
        return;
      }
      // Create a symbol collector listener
      const table = new SymbolTable();
      const listener = new ApexSymbolCollectorListener(table);

      // Parse the document
      const result = this.compilerService.compile(
        document.getText(),
        documentUri,
        listener,
      );

      if (result.errors.length > 0) {
        console.error('Errors parsing document:', result.errors);
        return;
      }

      // Get the symbol table from the listener
      const symbolTable = listener.getResult();

      // Get all symbols from the global scope
      const globalSymbols = symbolTable.getCurrentScope().getAllSymbols();

      // Process each global symbol
      for (const symbol of globalSymbols) {
        const reference: ApexReference = {
          sourceFile: documentUri,
          targetSymbol: symbol.name,
          line: symbol.location.startLine,
          column: symbol.location.startColumn,
          referenceType: 'type-reference',
        };
        await this.storage.setDefinition(symbol.name, reference);
      }
    } catch (error) {
      console.error('Error populating definitions:', error);
    }
  }
}
