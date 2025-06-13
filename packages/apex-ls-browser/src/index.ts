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
  CompletionItem,
  Hover,
  InitializedNotification,
  InitializeParams,
  InitializeResult,
  MessageType,
  TextDocumentPositionParams,
  TextDocuments,
  TextDocumentChangeEvent,
  Diagnostic,
  DocumentSymbolParams,
  FoldingRangeParams,
  FoldingRange,
} from 'vscode-languageserver/browser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  ApexStorageManager,
  dispatchProcessOnChangeDocument,
  dispatchProcessOnCloseDocument,
  dispatchProcessOnOpenDocument,
  dispatchProcessOnSaveDocument,
  dispatchProcessOnDocumentSymbol,
  dispatchProcessOnFoldingRange,
  ApexStorage,
} from '@salesforce/apex-lsp-compliant-services';
import {
  setLogNotificationHandler,
  getLogger,
} from '@salesforce/apex-lsp-logging';

import { BrowserLogNotificationHandler } from './utils/BrowserLogNotificationHandler';

/* browser specific setup code */

const messageReader = new BrowserMessageReader(self);
const messageWriter = new BrowserMessageWriter(self);

const connection = createConnection(messageReader, messageWriter);

// Set up logging
const logger = getLogger();
setLogNotificationHandler(
  BrowserLogNotificationHandler.getInstance(connection),
);

// Server state
let isShutdown = false;
// Track open, change and close text document events
const documents = new TextDocuments(TextDocument);

// Initialize server capabilities
connection.onInitialize((params: InitializeParams): InitializeResult => {
  logger.info('Apex Language Server initializing...');
  // TODO: Add startup tasks here if needed
  return {
    capabilities: {
      textDocumentSync: {
        openClose: true,
        change: 1, // Full text document sync
        save: true,
        willSave: false, // Enable willSave support
        willSaveWaitUntil: false, // Enable willSaveWaitUntil support
      },
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['.'],
      },
      hoverProvider: false,
      documentSymbolProvider: true,
      foldingRangeProvider: true, // Enable folding range support
    },
  };
});

// Handle initialized notification
connection.onInitialized(() => {
  logger.info('Apex Language Server initialized');
  // Send notification to client that server is ready
  connection.sendNotification(InitializedNotification.type, {
    type: MessageType.Info,
    message: 'Apex Language Server is now running in the browser',
  });
});

// Handle document symbol requests
connection.onDocumentSymbol(async (params: DocumentSymbolParams) => {
  logger.info(
    `[SERVER] Received documentSymbol request for: ${params.textDocument.uri}`,
  );
  logger.info(`[SERVER] DocumentSymbolParams: ${JSON.stringify(params)}`);

  try {
    const result = await dispatchProcessOnDocumentSymbol(params);
    logger.info(
      `[SERVER] Result for documentSymbol (${params.textDocument.uri}): ${JSON.stringify(
        result,
      )}`,
    );
    return result;
  } catch (error) {
    logger.error(
      `[SERVER] Error processing documentSymbol for ${params.textDocument.uri}: ${error}`,
    );
    // Return null or an empty array in case of error, as per LSP spec for graceful failure
    return null;
  }
});

// Add a handler for folding ranges
connection.onFoldingRanges(
  async (params: FoldingRangeParams): Promise<FoldingRange[] | null> => {
    logger.debug(
      () =>
        `[SERVER] Received foldingRange request for: ${params.textDocument.uri}`,
    );

    try {
      const result = await dispatchProcessOnFoldingRange(
        params,
        storageManager.getStorage(),
      );
      logger.debug(
        () =>
          `[SERVER] Result for foldingRanges (${params.textDocument.uri}): ${JSON.stringify(
            result,
          )}`,
      );
      return result;
    } catch (error) {
      logger.error(
        () =>
          `[SERVER] Error processing foldingRanges for ${params.textDocument.uri}: ${error}`,
      );
      // Return null or an empty array in case of error, as per LSP spec for graceful failure
      return null;
    }
  },
);

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
  // In a browser environment, there's not much we can do to actually exit,
  // but we can clean up resources
  // If we were running in Node.js, we would call process.exit() here
  logger.info('Apex Language Server exited');
});

// Initialize storage
const storageManager = ApexStorageManager.getInstance({
  storageFactory: (options) => ApexStorage.getInstance(),
  storageOptions: {
    /* your options */
  },
});
storageManager.initialize();

// Helper function to handle diagnostics
const handleDiagnostics = (
  uri: string,
  diagnostics: Diagnostic[] | undefined,
) => {
  // Always send diagnostics to the client, even if empty array
  // This ensures diagnostics are cleared when there are no errors
  connection.sendDiagnostics({
    uri,
    diagnostics: diagnostics || [],
  });
};

// Notifications
documents.onDidOpen((event: TextDocumentChangeEvent<TextDocument>) => {
  // Client opened a document
  // Server will parse the document and populate the corresponding local maps
  logger.info(
    `Web Apex Language Server opened and processed document: ${JSON.stringify(event)}`,
  );

  dispatchProcessOnOpenDocument(event).then((diagnostics) =>
    handleDiagnostics(event.document.uri, diagnostics),
  );
});

documents.onDidChangeContent((event: TextDocumentChangeEvent<TextDocument>) => {
  // Client changed a open document
  // Server will parse the document and populate the corresponding local maps
  logger.info(
    `Web Apex Language Server changed and processed document: ${JSON.stringify(event)}`,
  );

  dispatchProcessOnChangeDocument(event).then((diagnostics) =>
    handleDiagnostics(event.document.uri, diagnostics),
  );
});

documents.onDidClose((event: TextDocumentChangeEvent<TextDocument>) => {
  // Client closed a open document
  // Server will update the corresponding local maps
  logger.info(
    `Web Apex Language Server closed document: ${JSON.stringify(event)}`,
  );

  dispatchProcessOnCloseDocument(event);

  // Clear diagnostics for the closed document
  handleDiagnostics(event.document.uri, []);
});

documents.onDidSave((event: TextDocumentChangeEvent<TextDocument>) => {
  // Client saved a document
  // Server will parse the document and update storage as needed
  logger.info(
    `Web Apex Language Server saved document: ${JSON.stringify(event)}`,
  );

  dispatchProcessOnSaveDocument(event);
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

// Export the storage implementation for browsers
const BrowserStorage = require('./storage/BrowserIndexedDBApexStorage');
module.exports = { ...BrowserStorage };
