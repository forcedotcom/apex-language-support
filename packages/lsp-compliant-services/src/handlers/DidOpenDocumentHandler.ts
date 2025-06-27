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
  CompilerService,
  SymbolTable,
  ApexSymbolCollectorListener,
} from '@salesforce/apex-lsp-parser-ast';
import { LogMessageType } from '@salesforce/apex-lsp-logging';

import { Logger } from '../utils/Logger';
import { dispatch, getDiagnosticsFromErrors } from '../utils/handlerUtil';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import { DefaultApexDefinitionUpserter } from '../definition/ApexDefinitionUpserter';
import { DefaultApexReferencesUpserter } from '../references/ApexReferencesUpserter';
import { ApexSettingsManager } from '../settings/ApexSettingsManager';

// Visible for testing
export const processOnOpenDocument = async (
  event: TextDocumentChangeEvent<TextDocument>,
): Promise<Diagnostic[] | undefined> => {
  // Client opened a document
  const logger = Logger.getInstance();
  logger.log(
    LogMessageType.Debug,
    `Common Apex Language Server open document handler invoked with: ${event}`,
  );

  // Get the storage manager instance
  const storageManager = ApexStorageManager.getInstance();
  const storage = storageManager.getStorage();

  const document = event.document;

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
    'documentOpen',
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
      `Errors parsing document: ${JSON.stringify(result.errors)}`,
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
  const defPromise = dispatch(
    definitionUpserter.upsertDefinition(event),
    'Error upserting definitions',
  );
  // Upsert the references
  const refPromise = dispatch(
    referencesUpserter.upsertReferences(event),
    'Error upserting references',
  );
  // Wait for both to complete (or fail)
  await Promise.all([defPromise, refPromise]);
};

export const dispatchProcessOnOpenDocument = async (
  event: TextDocumentChangeEvent<TextDocument>,
) => processOnOpenDocument(event);
