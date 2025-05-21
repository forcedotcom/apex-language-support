/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

import { Logger } from '../utils/Logger';
import { dispatch } from '../utils/handlerUtil';
import { ApexStorageManager } from '../storage/ApexStorageManager';
import { DefaultApexDefinitionUpserter } from '../definition/ApexDefinitionUpserter';
import { DefaultApexReferencesUpserter } from '../references/ApexReferencesUpserter';

// Visible for testing
export const processOnOpenDocument = async (
  event: TextDocumentChangeEvent<TextDocument>,
): Promise<void> => {
  // Client opened a document
  const logger = Logger.getInstance();
  logger.info(
    `Common Apex Language Server open document handler invoked with: ${event}`,
  );

  // Get the storage manager instance
  const storageManager = ApexStorageManager.getInstance();
  const storage = storageManager.getStorage();

  const document = event.document;
  // Set the document in the storage
  // Document is currently being used by DocumentSymbolProvider
  if (!document) {
    logger.error(`Document not found for URI: ${event.document.uri}`);
  } else {
    await storage.setDocument(event.document.uri, document);
  }

  // Create the definition provider
  const definitionUpserter = new DefaultApexDefinitionUpserter(storage);
  const referencesUpserter = new DefaultApexReferencesUpserter(storage);

  // Upsert the definitions
  await definitionUpserter.upsertDefinition(event);
  // Upsert the references
  await referencesUpserter.upsertReferences(event);
};

export const dispatchProcessOnOpenDocument = (
  event: TextDocumentChangeEvent<TextDocument>,
) => dispatch(processOnOpenDocument(event), 'Error processing document open');
