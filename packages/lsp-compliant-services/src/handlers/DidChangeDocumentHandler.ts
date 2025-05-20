/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import {
  DidChangeTextDocumentParams,
  TextDocuments,
} from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { Logger } from '../utils/Logger';
import { dispatch } from '../utils/handlerUtil';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import { DefaultApexDefinitionUpserter } from '../definition/ApexDefinitionUpserter';
import { DefaultApexReferencesUpserter } from '../references/ApexReferencesUpserter';

// Visible for testing
export const processOnChangeDocument = async (
  params: DidChangeTextDocumentParams,
  documents: TextDocuments<TextDocument>,
): Promise<void> => {
  // Client opened a document
  // TODO: Server will parse the document and populate the corresponding local maps
  const logger = Logger.getInstance();
  logger.info(
    `Common Apex Language Server change document handler invoked with: ${params}`,
  );

  // TODO: Implement the logic to process the document change
  // This might involve updating the AST, type information, or other data structures
  // based on the changes in the document
  // You can access the document content using params.contentChanges

  // Get the storage manager instance
  const storageManager = ApexStorageManager.getInstance();
  const storage = storageManager.getStorage();

  // Create the definition provider
  const definitionUpserter = new DefaultApexDefinitionUpserter(storage);
  const referencesUpserter = new DefaultApexReferencesUpserter(storage);

  // Upsert the definitions
  await definitionUpserter.upsertDefinition(params, documents);
  // Upsert the references
  await referencesUpserter.upsertReferences(params, documents);
};

export const dispatchProcessOnChangeDocument = (
  params: DidChangeTextDocumentParams,
  documents: TextDocuments<TextDocument>,
) =>
  dispatch(
    processOnChangeDocument(params, documents),
    'Error processing document change',
  );
