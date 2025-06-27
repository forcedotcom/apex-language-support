/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Diagnostic, TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  SymbolTable,
  CompilerService,
  ApexSymbolCollectorListener,
} from '@salesforce/apex-lsp-parser-ast';
import { getLogger, LogMessageType } from '@salesforce/apex-lsp-logging';

import { dispatch, getDiagnosticsFromErrors } from '../utils/handlerUtil';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import { DefaultApexDefinitionUpserter } from '../definition/ApexDefinitionUpserter';
import { DefaultApexReferencesUpserter } from '../references/ApexReferencesUpserter';
import { ApexSettingsManager } from '../settings/ApexSettingsManager';

// Visible for testing
export const processOnChangeDocument = async (
  event: TextDocumentChangeEvent<TextDocument>,
): Promise<Diagnostic[] | undefined> => {
  // Client opened a document
  const logger = getLogger();
  logger.log(
    LogMessageType.Debug,
    `Common Apex Language Server change document handler invoked with: ${event}`,
  );

  // Get the storage manager instance
  const storageManager = ApexStorageManager.getInstance();
  const storage = storageManager.getStorage();
  const document = event.document;
  if (!document) {
    logger.log(
      LogMessageType.Error,
      () => `Document not found for URI: ${event.document.uri}`,
    );
  }

  // Store the document in storage for later retrieval by other handlers
  await storage.setDocument(document.uri, document);

  // Create a symbol collector listener
  const table = new SymbolTable();
  const listener = new ApexSymbolCollectorListener(table);
  const compilerService = new CompilerService();

  // Parse the document
  const settingsManager = ApexSettingsManager.getInstance();
  const fileSize = document.getText().length;
  const options = settingsManager.getCompilationOptions(
    'documentChange',
    fileSize,
  );

  const result = compilerService.compile(
    document.getText(),
    document.uri,
    listener,
    options,
  );

  if (result.errors.length > 0) {
    logger.log(
      LogMessageType.Error,
      `Errors parsing document: ${result.errors}`,
    );
    const diagnostics = getDiagnosticsFromErrors(result.errors);
    return diagnostics;
  }

  // Get the symbol table from the listener
  const symbolTable = listener.getResult();

  // Get all symbols from the global scope
  const globalSymbols = symbolTable.getCurrentScope().getAllSymbols();

  // Create the definition provider
  const definitionUpserter = new DefaultApexDefinitionUpserter(
    storage,
    globalSymbols,
  );

  // Create the references provider
  const referencesUpserter = new DefaultApexReferencesUpserter(
    storage,
    globalSymbols,
  );

  // Upsert the definitions
  dispatch(
    definitionUpserter.upsertDefinition(event),
    'Error upserting definitions',
  );
  // Upsert the references
  dispatch(
    referencesUpserter.upsertReferences(event),
    'Error upserting references',
  );
};

export const dispatchProcessOnChangeDocument = (
  event: TextDocumentChangeEvent<TextDocument>,
) =>
  dispatch(processOnChangeDocument(event), 'Error processing document change');

/**
 * Handler for document change events
 */
export class DidChangeDocumentHandler {
  private readonly logger = getLogger();

  /**
   * Handle document change event
   * @param event The document change event
   * @returns Diagnostics for the changed document
   */
  public async handleDocumentChange(
    event: TextDocumentChangeEvent<TextDocument>,
  ): Promise<Diagnostic[] | undefined> {
    this.logger.log(
      LogMessageType.Info,
      `Processing document change: ${event.document.uri}`,
    );

    try {
      return await dispatchProcessOnChangeDocument(event);
    } catch (error) {
      this.logger.log(
        LogMessageType.Error,
        () =>
          `Error processing document change for ${event.document.uri}: ${error}`,
      );
      throw error;
    }
  }
}
