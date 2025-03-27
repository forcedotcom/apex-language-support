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
} from 'vscode-languageserver/node';

// Create a connection for the server. The connection uses Node's IPC as a transport.
const connection = createConnection(ProposedFeatures.all);

// Initialize server capabilities and properties
connection.onInitialize(
  (params: InitializeParams): InitializeResult => ({
    capabilities: {
      textDocumentSync: 1, // Full synchronization
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['.'],
      },
      hoverProvider: true,
    },
  }),
);

// Handle client connection
connection.onInitialized(() => {
  console.log('Language server initialized and connected to client.');
});

// Listen on the connection
connection.listen();
