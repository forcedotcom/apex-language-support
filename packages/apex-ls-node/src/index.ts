/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

const {
  createConnection,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  TextDocumentPositionParams,
  CompletionItem,
  Hover,
  LogMessageNotification,
  MessageType,
  Connection,
} = require('vscode-languageserver/node');

// Create a connection for the server based on command line arguments
let connection: typeof Connection;
if (process.argv.includes('--stdio')) {
  connection = createConnection(process.stdin, process.stdout);
} else if (process.argv.includes('--node-ipc')) {
  connection = createConnection(ProposedFeatures.all);
} else if (process.argv.includes('--socket')) {
  const socketIndex = process.argv.indexOf('--socket');
  const port = parseInt(process.argv[socketIndex + 1], 10);
  connection = createConnection(port);
} else {
  throw new Error(
    'Connection type not specified. Use --stdio, --node-ipc, or --socket={number}',
  );
}

// Server state
let isShutdown = false;

// Initialize server capabilities and properties
connection.onInitialize(
  (params: typeof InitializeParams): typeof InitializeResult => {
    connection.console.info('Apex Language Server initializing...');
    // TODO: Add startup tasks here if needed
    return {
      capabilities: {
        textDocumentSync: 1, // Full synchronization
        completionProvider: {
          resolveProvider: true,
          triggerCharacters: ['.'],
        },
        hoverProvider: true,
      },
    };
  },
);

// Handle client connection
connection.onInitialized(() => {
  connection.console.info(
    'Language server initialized and connected to client.',
  );
  // Send notification to client that server is ready
  connection.sendNotification(LogMessageNotification.type, {
    type: MessageType.Info,
    message: 'Apex Language Server is now running in Node.js',
  });
});

// Handle completion requests
connection.onCompletion((_textDocumentPosition: any) => [
  {
    label: 'ExampleCompletion',
    kind: 1, // Text completion
    data: 1,
  },
]);

// Handle hover requests
connection.onHover((_textDocumentPosition: any) => ({
  contents: {
    kind: 'markdown',
    value: 'This is an example hover text.',
  },
}));

// Handle shutdown request
connection.onShutdown(() => {
  connection.console.info('Apex Language Server shutting down...');
  // Perform cleanup tasks, for now we'll just set a flag
  isShutdown = true;
  connection.console.info('Apex Language Server shutdown complete');
});

// Handle exit notification
connection.onExit(() => {
  connection.console.info('Apex Language Server exiting...');
  if (!isShutdown) {
    // If exit is called without prior shutdown, log a warning
    connection.console.warn(
      'Apex Language Server exiting without proper shutdown',
    );
  }
  // In a Node.js environment, we could call process.exit() here,
  // but we'll let the connection handle the exit
  connection.console.info('Apex Language Server exited');
});

// Listen on the connection
connection.listen();

// Export the storage implementation for Node.js
const NodeFileSystemStorage = require('./storage/NodeFileSystemApexStorage');
module.exports = { ...NodeFileSystemStorage };
