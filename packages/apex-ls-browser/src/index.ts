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
  BrowserMessageReader,
  BrowserMessageWriter,
  CompletionItem,
  DidChangeTextDocumentParams,
  DidCloseTextDocumentParams,
  DidOpenTextDocumentParams,
  DidSaveTextDocumentParams,
  Hover,
  InitializedNotification,
  InitializeParams,
  InitializeResult,
  MessageType,
  TextDocumentPositionParams,
  TextDocuments,
  WillSaveTextDocumentParams,
  TextEdit,
} from 'vscode-languageserver/browser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  ApexStorageManager,
  dispatchProcessOnChangeDocument,
  dispatchProcessOnCloseDocument,
  dispatchProcessOnOpenDocument,
  dispatchProcessOnSaveDocument,
} from '@salesforce/apex-lsp-compliant-services';
import { ApexStorage } from '@salesforce/apex-lsp-compliant-services/src/storage/ApexStorage';

/* browser specific setup code */

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

// Server state
let isShutdown = false;

// Initialize server capabilities
connection.onInitialize((params: InitializeParams): InitializeResult => {
  connection.console.info('Apex Language Server initializing...');
  // TODO: Add startup tasks here if needed
  return {
    capabilities: {
      textDocumentSync: {
        openClose: true,
        change: 1, // Full text document sync
        save: true,
        willSave: true, // Enable willSave support
        willSaveWaitUntil: true, // Enable willSaveWaitUntil support
      },
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

// Track open, change and close text document events
const documents = new TextDocuments(TextDocument);
documents.listen(connection);

// Initialize storage
const storageManager = ApexStorageManager.getInstance({
  storageFactory: (options) => ApexStorage.getInstance(),
  storageOptions: {
    /* your options */
  },
});
storageManager.initialize();

// Notifications
connection.onDidOpenTextDocument((params: DidOpenTextDocumentParams) => {
  // Client opened a document
  // Server will parse the document and populate the corresponding local maps
  connection.console.info(
    `Web Apex Language Server opened and processed document: ${params}`,
  );

  dispatchProcessOnOpenDocument(params, documents);
});

connection.onDidChangeTextDocument((params: DidChangeTextDocumentParams) => {
  // Client changed a open document
  // Server will parse the document and populate the corresponding local maps
  connection.console.info(
    `Web Apex Language Server changed and processed document: ${params}`,
  );

  dispatchProcessOnChangeDocument(params, documents);
});

connection.onDidCloseTextDocument((params: DidCloseTextDocumentParams) => {
  // Client closed a open document
  // Server will update the corresponding local maps
  connection.console.info(
    `Web Apex Language Server closed document: ${params}`,
  );

  dispatchProcessOnCloseDocument(params);
});

// Handle will save notification
connection.onWillSaveTextDocument((params: WillSaveTextDocumentParams) => {
  // Client is about to save a document
  // Server can perform any necessary pre-save operations
  connection.console.info(
    `Web Apex Language Server will save document: ${params}`,
  );
});

// Handle will save wait until request
connection.onWillSaveTextDocumentWaitUntil(
  async (params: WillSaveTextDocumentParams): Promise<TextEdit[]> => {
    // Client is about to save a document and waiting for any edits
    // Server can return edits that will be applied before saving
    connection.console.info(
      `Web Apex Language Server will save wait until document: ${params}`,
    );

    // Example: Return an empty array of edits
    // In a real implementation, you might want to:
    // 1. Format the document
    // 2. Fix common issues
    // 3. Apply any necessary transformations
    return [];
  },
);

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
