/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { TextDocumentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LogMessageType } from '@salesforce/apex-lsp-logging';

import { Logger } from '../utils/Logger';
import { dispatch } from '../utils/handlerUtil';

// Visible for testing
export const processOnSaveDocument = async (
  event: TextDocumentChangeEvent<TextDocument>,
): Promise<void> => {
  // Client opened a document
  // TODO: Server will parse the document and populate the corresponding local maps
  const logger = Logger.getInstance();
  logger.log(
    LogMessageType.Debug,
    `Common Apex Language Server save document handler invoked with: ${event}`,
  );

  // TODO: Implement the logic to process the document save
  // This might involve updating the AST, type information, or other data structures
  // based on the changes in the document
  // You can access the document content using params.contentChanges
};

export const dispatchProcessOnSaveDocument = (
  event: TextDocumentChangeEvent<TextDocument>,
) => dispatch(processOnSaveDocument(event), 'Error processing document save');
