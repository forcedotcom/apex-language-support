/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  createConnection,
  ProposedFeatures,
  InitializeParams,
  InitializeResult,
  InitializedNotification,
  MessageType,
  Connection,
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidOpenTextDocumentParams,
  DidSaveTextDocumentParams,
  createServerSocketTransport,
} from 'vscode-languageserver/node';
import {
  dispatchProcessOnChangeDocument,
  dispatchProcessOnCloseDocument,
  dispatchProcessOnOpenDocument,
  dispatchProcessOnSaveDocument,
} from '@salesforce/apex-lsp-compliant-services';
import {
  setLogNotificationHandler,
  getLogger,
} from '@salesforce/apex-lsp-logging';

import { NodeLogNotificationHandler } from './utils/NodeLogNotificationHandler';

// Create a connection for the server based on command line arguments
let connection: Connection;
if (process.argv.includes('--stdio')) {
  connection = createConnection(process.stdin, process.stdout);
} else if (process.argv.includes('--node-ipc')) {
  connection = createConnection(ProposedFeatures.all);
} else if (process.argv.includes('--socket')) {
  const socketIndex = process.argv.indexOf('--socket');
  const port = parseInt(process.argv[socketIndex + 1], 10);
  // Create a socket connection using the proper transport
  const [reader, writer] = createServerSocketTransport(port);
  connection = createConnection(reader, writer);
} else {
  throw new Error(
    'Connection type not specified. Use --stdio, --node-ipc, or --socket={number}',
  );
}

// Set up logging
const logger = getLogger();
setLogNotificationHandler(NodeLogNotificationHandler.getInstance(connection));

// Server state
let isShutdown = false;

// Initialize server capabilities and properties
connection.onInitialize((params: InitializeParams): InitializeResult => {
  logger.info('Apex Language Server initializing...');
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
});

// Handle client connection
connection.onInitialized(() => {
  logger.info('Language server initialized and connected to client.');
  // Send notification to client that server is ready
  connection.sendNotification(InitializedNotification.type, {
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
  logger.info('Apex Language Server shutting down...');
  // Perform cleanup tasks, for now we'll just set a flag
  isShutdown = true;
  logger.info('Apex Language Server shutdown complete');
});

// Handle exit notification
connection.onExit(() => {
  logger.info('Apex Language Server exiting...');
  if (!isShutdown) {
    // If exit is called without prior shutdown, log a warning
    logger.warn('Apex Language Server exiting without proper shutdown');
  }
  // In a Node.js environment, we could call process.exit() here,
  // but we'll let the connection handle the exit
  logger.info('Apex Language Server exited');
});

// Listen on the connection
connection.listen();

// Notifications
connection.onDidOpenTextDocument((params: DidOpenTextDocumentParams) => {
  // Client opened a document
  // Server will parse the document and populate the corresponding local maps
  logger.info(
    `Extension Apex Language Server opened and processed document: ${JSON.stringify(params)}`,
  );

  dispatchProcessOnOpenDocument(params);
});

connection.onDidChangeTextDocument((params: DidChangeTextDocumentParams) => {
  // Client changed a open document
  // Server will parse the document and populate the corresponding local maps
  logger.info(
    `Extension Apex Language Server changed and processed document: ${JSON.stringify(params)}`,
  );

  dispatchProcessOnChangeDocument(params);
});

connection.onDidCloseTextDocument((params: DidCloseTextDocumentParams) => {
  // Client closed a open document
  // Server will update the corresponding local maps
  logger.info(
    `Extension Apex Language Server closed document: ${JSON.stringify(params)}`,
  );

  dispatchProcessOnCloseDocument(params);
});

connection.onDidSaveTextDocument((params: DidSaveTextDocumentParams) => {
  // Client saved a document
  // Server will parse the document and update storage as needed
  logger.info(
    `Extension Apex Language Server saved document: ${JSON.stringify(params)}`,
  );

  dispatchProcessOnSaveDocument(params);
});

// Export the storage implementation for Node.js
const NodeFileSystemStorage = require('./storage/NodeFileSystemApexStorage');
module.exports = { ...NodeFileSystemStorage };
