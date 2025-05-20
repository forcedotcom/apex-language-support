/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {
  DidOpenTextDocumentParams,
  TextDocuments,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { Logger } from '../utils/Logger';
import { dispatch } from '../utils/handlerUtil';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import { DefaultApexDefinitionUpserter } from '../definition/ApexDefinitionUpserter';
import { DefaultApexReferencesUpserter } from '../references/ApexReferencesUpserter';

// Visible for testing
export const processOnOpenDocument = async (
  params: DidOpenTextDocumentParams,
  documents: TextDocuments<TextDocument>,
): Promise<void> => {
  // Client opened a document
  const logger = Logger.getInstance();
  logger.info(
    `Common Apex Language Server open document handler invoked with: ${params}`,
  );

  // Get the storage manager instance
  const storageManager = ApexStorageManager.getInstance();
  const storage = storageManager.getStorage();

  const document = documents.get(params.textDocument.uri);
  // Set the document in the storage
  // Document is currently being used by DocumentSymbolProvider
  if (!document) {
    logger.error(`Document not found for URI: ${params.textDocument.uri}`);
  } else {
    await storage.setDocument(params.textDocument.uri, document);
  }

  // Create the definition provider
  const definitionUpserter = new DefaultApexDefinitionUpserter(storage);
  const referencesUpserter = new DefaultApexReferencesUpserter(storage);

  // Upsert the definitions
  await definitionUpserter.upsertDefinition(params, documents);
  // Upsert the references
  await referencesUpserter.upsertReferences(params, documents);
};

export const dispatchProcessOnOpenDocument = (
  params: DidOpenTextDocumentParams,
  documents: TextDocuments<TextDocument>,
) =>
  dispatch(
    processOnOpenDocument(params, documents),
    'Error processing document open',
  );
