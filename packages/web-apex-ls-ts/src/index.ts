/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  createConnection,
  BrowserMessageReader,
  BrowserMessageWriter,
  InitializeParams,
  InitializeResult,
  TextDocumentPositionParams,
  CompletionItem,
  Hover,
} from 'vscode-languageserver/browser';

// Create a connection for the server using BrowserMessageReader and BrowserMessageWriter
const connection = createConnection(
  new BrowserMessageReader(self),
  new BrowserMessageWriter(self),
);

// Initialize server capabilities
connection.onInitialize(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (params: InitializeParams): InitializeResult => ({
    capabilities: {
      textDocumentSync: 1, // Full text document sync
      completionProvider: {
        resolveProvider: true,
      },
      hoverProvider: true,
    },
  }),
);

// Handle completion requests
connection.onCompletion(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => [
    {
      label: 'ExampleCompletion',
      kind: 1, // Text completion
      data: 1,
    },
  ],
);

// Handle hover requests
connection.onHover(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (_textDocumentPosition: TextDocumentPositionParams): Hover => ({
    contents: {
      kind: 'markdown',
      value: 'This is an example hover text.',
    },
  }),
);

// Start listening for requests
connection.listen();
