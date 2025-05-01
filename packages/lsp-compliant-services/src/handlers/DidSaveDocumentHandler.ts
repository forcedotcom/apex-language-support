/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
import { Connection, DidSaveTextDocumentParams } from 'vscode-languageserver';

export const processOnSaveDocument = (
  params: DidSaveTextDocumentParams,
  connection: Connection,
) => {
  // Client opened a document
  // TODO: Server will parse the document and populate the corresponding local maps
  connection.console.info(
    `Common Apex Language Server save document handler invoked with: ${params}`,
  );
};
