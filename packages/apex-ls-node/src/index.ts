/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  createConnection,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidOpenTextDocumentParams,
  DidSaveTextDocumentParams,
  DocumentSymbolParams,
} from 'vscode-languageserver/node';
import {
  dispatchProcessOnChangeDocument,
  dispatchProcessOnCloseDocument,
  dispatchProcessOnOpenDocument,
  dispatchProcessOnSaveDocument,
  dispatchProcessOnDocumentSymbol,
} from '@salesforce/apex-lsp-compliant-services';

// Create a connection for the server. The connection uses Node's IPC as a transport.
const connection = createConnection(ProposedFeatures.all);

// Initialize server capabilities and properties
connection.onInitialize(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (params: InitializeParams): InitializeResult => ({
    capabilities: {
      textDocumentSync: 1, // Full synchronization
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['.'],
      },
      hoverProvider: true,
      documentSymbolProvider: true,
    },
  }),
);

// Handle client connection
connection.onInitialized(() => {
  console.log('Language server initialized and connected to client.');
});

// Handle document symbol requests
connection.onDocumentSymbol(async (params: DocumentSymbolParams) => {
  connection.console.info(
    `Extension Apex Language Server processing document symbols: ${params}`,
  );
  return dispatchProcessOnDocumentSymbol(params);
});

// Listen on the connection
connection.listen();

// Notifications
connection.onDidOpenTextDocument((params: DidOpenTextDocumentParams) => {
  // Client opened a document
  // Server will parse the document and populate the corresponding local maps
  connection.console.info(
    `Extension Apex Language Server opened and processed document: ${params}`,
  );

  dispatchProcessOnOpenDocument(params);
});

connection.onDidChangeTextDocument((params: DidChangeTextDocumentParams) => {
  // Client changed a open document
  // Server will parse the document and populate the corresponding local maps
  connection.console.info(
    `Extension Apex Language Server changed and processed document: ${params}`,
  );

  dispatchProcessOnChangeDocument(params);
});

connection.onDidCloseTextDocument((params: DidCloseTextDocumentParams) => {
  // Client closed a open document
  // Server will update the corresponding local maps
  connection.console.info(
    `Extension Apex Language Server closed document: ${params}`,
  );

  dispatchProcessOnCloseDocument(params);
});

connection.onDidSaveTextDocument((params: DidSaveTextDocumentParams) => {
  // Client saved a document
  // Server will parse the document and update storage as needed
  connection.console.info(
    `Extension Apex Language Server saved document: ${params}`,
  );

  dispatchProcessOnSaveDocument(params);
});

// Export the storage implementation for Node.js
export * from './storage/NodeFileSystemApexStorage';
