/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { DidOpenTextDocumentParams } from 'vscode-languageserver';

import { Logger } from '../utils/Logger';
import { dispatch } from '../utils/handlerUtil';

// Visible for testing
export const processOnOpenDocument = async (
  params: DidOpenTextDocumentParams,
): Promise<void> => {
  // Client opened a document
  // TODO: Server will parse the document and populate the corresponding local maps
  const logger = Logger.getInstance();
  logger.info(
    `Common Apex Language Server open document handler invoked with: ${params}`,
  );
};

export const dispatchProcessOnOpenDocument = (
  params: DidOpenTextDocumentParams,
) => dispatch(processOnOpenDocument(params), 'Error processing document open');
