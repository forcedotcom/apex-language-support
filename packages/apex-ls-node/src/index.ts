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
  InitializedNotification,
  MessageType,
  Connection,
  DocumentSymbolParams,
  createServerSocketTransport,
  TextDocuments,
  TextDocumentChangeEvent,
  Diagnostic,
  DidChangeConfigurationParams,
  FoldingRangeParams,
  FoldingRange,
} from 'vscode-languageserver/node';
import {
  dispatchProcessOnChangeDocument,
  dispatchProcessOnCloseDocument,
  dispatchProcessOnOpenDocument,
  dispatchProcessOnSaveDocument,
  dispatchProcessOnDocumentSymbol,
  dispatchProcessOnFoldingRange,
  ApexStorageManager,
  ApexSettingsManager,
  LSPConfigurationManager,
} from '@salesforce/apex-lsp-compliant-services';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  setLogNotificationHandler,
  getLogger,
  setLoggerFactory,
} from '@salesforce/apex-lsp-logging';

import { NodeLogNotificationHandler } from './utils/NodeLogNotificationHandler';
import { ActiveLoggerFactory } from './utils/ActiveLoggerFactory';
import { NodeFileSystemApexStorage } from './storage/NodeFileSystemApexStorage';

// Set the logger factory early
setLoggerFactory(new ActiveLoggerFactory());

// Initialize settings and configuration managers
const settingsManager = ApexSettingsManager.getInstance({}, 'node');
const configurationManager = new LSPConfigurationManager(settingsManager);

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

// Set up configuration management
configurationManager.setConnection(connection);

// Server state
let isShutdown = false;
const documents = new TextDocuments(TextDocument);

// Initialize storage
const storageManager = ApexStorageManager.getInstance({
  storageFactory: (options) => new NodeFileSystemApexStorage(),
  storageOptions: {
    /* your options */
  },
});
storageManager.initialize();

// Initialize server capabilities and properties
connection.onInitialize((params: InitializeParams): InitializeResult => {
  logger.info('Apex Language Server initializing...');

  // Process initialization parameters and settings
  configurationManager.processInitializeParams(params);

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
      workspace: {
        workspaceFolders: {
          supported: true,
          changeNotifications: true,
        },
      },
    },
  };
});

// Handle client connection
connection.onInitialized(() => {
  logger.info('Language server initialized and connected to client.');

  // Register for configuration changes
  configurationManager.registerForConfigurationChanges();

  // Request initial configuration from client
  configurationManager.requestConfiguration();

  // Send notification to client that server is ready
  connection.sendNotification(InitializedNotification.type, {
    type: MessageType.Info,
    message: 'Apex Language Server is now running in Node.js',
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

// Handle configuration change notifications
connection.onDidChangeConfiguration(
  async (params: DidChangeConfigurationParams) => {
    logger.info('Received configuration change notification');
    await configurationManager.handleConfigurationChange(params);
  },
);

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
    `Extension Apex Language Server opened and processed document: ${JSON.stringify(event)}`,
  );

  dispatchProcessOnOpenDocument(event).then((diagnostics) =>
    handleDiagnostics(event.document.uri, diagnostics),
  );
});

documents.onDidChangeContent((event: TextDocumentChangeEvent<TextDocument>) => {
  // Client changed a open document
  // Server will parse the document and populate the corresponding local maps
  logger.info(
    `Extension Apex Language Server changed and processed document: ${JSON.stringify(event)}`,
  );

  dispatchProcessOnChangeDocument(event).then((diagnostics) =>
    handleDiagnostics(event.document.uri, diagnostics),
  );
});

documents.onDidClose((event: TextDocumentChangeEvent<TextDocument>) => {
  // Client closed a open document
  // Server will update the corresponding local maps
  logger.info(
    `Extension Apex Language Server closed document: ${JSON.stringify(event)}`,
  );

  dispatchProcessOnCloseDocument(event);

  // Clear diagnostics for the closed document
  handleDiagnostics(event.document.uri, []);
});

documents.onDidSave((event: TextDocumentChangeEvent<TextDocument>) => {
  // Client saved a document
  // Server will parse the document and update storage as needed
  logger.info(
    `Extension Apex Language Server saved document: ${JSON.stringify(event)}`,
  );

  dispatchProcessOnSaveDocument(event);
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

// Export the storage implementation for Node.js
const NodeFileSystemStorage = require('./storage/NodeFileSystemApexStorage');
module.exports = { ...NodeFileSystemStorage };
