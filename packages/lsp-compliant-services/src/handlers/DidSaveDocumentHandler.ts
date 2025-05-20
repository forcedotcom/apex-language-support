/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { DidSaveTextDocumentParams } from 'vscode-languageserver';

import { Logger } from '../utils/Logger';
import { dispatch } from '../utils/handlerUtil';

// Visible for testing
export const processOnSaveDocument = async (
  params: DidSaveTextDocumentParams,
): Promise<void> => {
  // Client opened a document
  // TODO: Server will parse the document and populate the corresponding local maps
  const logger = Logger.getInstance();
  logger.info(
    `Common Apex Language Server save document handler invoked with: ${params}`,
  );

  // TODO: Implement the logic to process the document save
  // This might involve updating the AST, type information, or other data structures
  // based on the changes in the document
  // You can access the document content using params.contentChanges
};

export const dispatchProcessOnSaveDocument = (
  params: DidSaveTextDocumentParams,
) => dispatch(processOnSaveDocument(params), 'Error processing document save');
