/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  createConnection,
  InitializeParams,
  InitializeResult,
  InitializedNotification,
  MessageType,
  DocumentSymbolParams,
  TextDocuments,
  TextDocumentChangeEvent,
  Diagnostic,
  FoldingRangeParams,
  FoldingRange,
  TextDocumentPositionParams,
  CompletionItem,
  Hover,
  BrowserMessageReader,
  BrowserMessageWriter,
} from 'vscode-languageserver/browser';
import {
  dispatchProcessOnChangeDocument,
  dispatchProcessOnCloseDocument,
  dispatchProcessOnOpenDocument,
  dispatchProcessOnSaveDocument,
  dispatchProcessOnDocumentSymbol,
  dispatchProcessOnFoldingRange,
  dispatchProcessOnDiagnostic,
  ApexStorageManager,
  ApexStorage,
  LSPConfigurationManager,
} from '@salesforce/apex-lsp-compliant-services';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  setLogNotificationHandler,
  getLogger,
  setLoggerFactory,
} from '@salesforce/apex-lsp-logging';

import { BrowserLogNotificationHandler } from './utils/BrowserLogNotificationHandler';
import { BrowserLoggerFactory } from './utils/BrowserLoggerFactory';

/* browser specific setup code */

const messageReader = new BrowserMessageReader(
  self as DedicatedWorkerGlobalScope,
);
const messageWriter = new BrowserMessageWriter(
  self as DedicatedWorkerGlobalScope,
);

const connection = createConnection(messageReader, messageWriter);

// Set the logger factory early
setLoggerFactory(new BrowserLoggerFactory());

// Set up logging
const logger = getLogger();
setLogNotificationHandler(
  BrowserLogNotificationHandler.getInstance(connection),
);

// Initialize capabilities manager
const capabilitiesManager = new LSPConfigurationManager();

// Server state
let isShutdown = false;
// Track open, change and close text document events
const documents = new TextDocuments(TextDocument);

// Initialize server capabilities
connection.onInitialize((params: InitializeParams): InitializeResult => {
  logger.info('Apex Language Server initializing...');

  // For browser server, we'll use production mode by default
  // This can be overridden via settings or environment detection
  const mode = 'production' as 'production' | 'development';
  const capabilities = capabilitiesManager.getCapabilitiesForMode(mode);

  logger.info(`Using ${mode} mode capabilities for browser environment`);

  return { capabilities };
});

// Handle initialized notification
connection.onInitialized(() => {
  logger.info('Apex Language Server initialized');

  // Register the $/ping request handler
  connection.onRequest('$/ping', async () => {
    logger.debug('[SERVER] Received $/ping request');
    try {
      const response = {
        message: 'pong',
        timestamp: new Date().toISOString(),
        server: 'apex-ls-browser',
      };
      logger.debug(
        `[SERVER] Responding to $/ping with: ${JSON.stringify(response)}`,
      );
      return response;
    } catch (error) {
      logger.error(`[SERVER] Error processing $/ping request: ${error}`);
      throw error;
    }
  });

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
      `[SERVER] Result for documentSymbol (${params.textDocument.uri}): ${JSON.stringify(result)}`,
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

// Handle diagnostic requests
// enabling pull diagnostics enables both 'textDocument/diagnostic' and 'workspace/diagnostic' requests
// only one of them is implemented, the other one is a no-op for now
connection.onRequest(
  'textDocument/diagnostic',
  async (params: DocumentSymbolParams) => {
    logger.info(
      `[SERVER] Received diagnostic request for: ${params.textDocument.uri}`,
    );
    logger.info(`[SERVER] DiagnosticParams: ${JSON.stringify(params)}`);

    try {
      const result = await dispatchProcessOnDiagnostic(params);
      logger.info(
        `[SERVER] Result for diagnostic (${params.textDocument.uri}): ${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      logger.error(
        `[SERVER] Error processing diagnostic for ${params.textDocument.uri}: ${error}`,
      );
      // Return empty array in case of error, as per LSP spec for graceful failure
      return [];
    }
  },
);

connection.onRequest('workspace/diagnostic', async (params) => {
  logger.debug('workspace/diagnostic requested by client');
  return { items: [] };
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
          `[SERVER] Result for foldingRanges (${params.textDocument.uri}): ${JSON.stringify(result)}`,
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
  // Check if publishDiagnostics is enabled in capabilities
  const capabilities = capabilitiesManager.getExtendedServerCapabilities();
  if (!capabilities.publishDiagnostics) {
    // Don't send diagnostics if publishDiagnostics is disabled
    logger.debug(
      () =>
        `Publish diagnostics disabled, skipping diagnostic send for: ${uri}`,
    );
    return;
  }

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
