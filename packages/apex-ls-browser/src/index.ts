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
  InitializeParams,
  InitializeResult,
  TextDocumentPositionParams,
  CompletionItem,
  Hover,
  BrowserMessageReader,
  BrowserMessageWriter,
  InitializedNotification,
  MessageType,
  DidOpenTextDocumentParams,
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidSaveTextDocumentParams,
} from 'vscode-languageserver/browser';
import {
  dispatchProcessOnChangeDocument,
  dispatchProcessOnCloseDocument,
  dispatchProcessOnOpenDocument,
  dispatchProcessOnSaveDocument,
} from '@salesforce/apex-lsp-compliant-services';

// Create a connection for the server using BrowserMessageReader and BrowserMessageWriter
const connection = createConnection(
  new BrowserMessageReader(self),
  new BrowserMessageWriter(self),
);

// Server state
let isShutdown = false;

// Initialize server capabilities
connection.onInitialize((params: InitializeParams): InitializeResult => {
  connection.console.info('Apex Language Server initializing...');
  // TODO: Add startup tasks here if needed
  return {
    capabilities: {
      textDocumentSync: 1, // Full text document sync
      completionProvider: {
        resolveProvider: true,
      },
      hoverProvider: true,
    },
  };
});

// Handle initialized notification
connection.onInitialized(() => {
  connection.console.info('Apex Language Server initialized');
  // Send notification to client that server is ready
  connection.sendNotification(InitializedNotification.type, {
    type: MessageType.Info,
    message: 'Apex Language Server is now running in the browser',
  });
});

// Handle completion requests
connection.onCompletion(
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
  (_textDocumentPosition: TextDocumentPositionParams): Hover => ({
    contents: {
      kind: 'markdown',
      value: 'This is an example hover text.',
    },
  }),
);

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
  // In a browser environment, there's not much we can do to actually exit,
  // but we can clean up resources
  // If we were running in Node.js, we would call process.exit() here
  connection.console.info('Apex Language Server exited');
});

// Notifications
connection.onDidOpenTextDocument((params: DidOpenTextDocumentParams) => {
  // Client opened a document
  // Server will parse the document and populate the corresponding local maps
  connection.console.info(
    `Web Apex Language Server opened and processed document: ${params}`,
  );

  dispatchProcessOnOpenDocument(params);
});

connection.onDidChangeTextDocument((params: DidChangeTextDocumentParams) => {
  // Client changed a open document
  // Server will parse the document and populate the corresponding local maps
  connection.console.info(
    `Web Apex Language Server changed and processed document: ${params}`,
  );

  dispatchProcessOnChangeDocument(params);
});

connection.onDidCloseTextDocument((params: DidCloseTextDocumentParams) => {
  // Client closed a open document
  // Server will update the corresponding local maps
  connection.console.info(
    `Web Apex Language Server closed document: ${params}`,
  );

  dispatchProcessOnCloseDocument(params);
});

connection.onDidSaveTextDocument((params: DidSaveTextDocumentParams) => {
  // Client saved a document
  // Server will parse the document and update storage as needed
  connection.console.info(`Web Apex Language Server saved document: ${params}`);

  dispatchProcessOnSaveDocument(params);
});

// Start listening for requests
connection.listen();

// Export the storage implementation for browsers
const BrowserStorage = require('./storage/BrowserIndexedDBApexStorage');
module.exports = { ...BrowserStorage };
