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
  dispatchProcessOnDiagnostic,
  ApexStorageManager,
  ApexSettingsManager,
  LSPConfigurationManager,
  dispatchProcessOnResolve,
} from '@salesforce/apex-lsp-compliant-services';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  setLogNotificationHandler,
  getLogger,
  setLoggerFactory,
  setLogLevel,
} from '@salesforce/apex-lsp-logging';

import { NodeLogNotificationHandler } from './utils/NodeLogNotificationHandler';
import { LSPLoggerFactory } from './utils/LSPLoggerFactory';
import { NodeFileSystemApexStorage } from './storage/NodeFileSystemApexStorage';

/**
 * Interface for server initialization options
 */
interface ApexServerInitializationOptions {
  logLevel?: string;
  enableDocumentSymbols?: boolean;
  trace?: string;
  [key: string]: any;
}

export function startServer() {
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

  // Set up logging BEFORE anything else to ensure all loggers get proper configuration
  setLoggerFactory(new LSPLoggerFactory());
  setLogNotificationHandler(NodeLogNotificationHandler.getInstance(connection));
  const logger = getLogger();

  // Initialize settings and configuration managers
  const settingsManager = ApexSettingsManager.getInstance({}, 'node');
  const configurationManager = new LSPConfigurationManager(settingsManager);

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

    // Extract and set log level from initialization options
    const initOptions = params.initializationOptions as
      | ApexServerInitializationOptions
      | undefined;
    const logLevel = initOptions?.logLevel || 'error';

    logger.info(`Setting log level to: ${logLevel}`);

    // Set the log level in the logging system
    setLogLevel(logLevel);

    // Process initialization parameters and settings
    configurationManager.processInitializeParams(params);

    // Initialize ApexLib
    // const { client } = createNodeApexLibAdapter(connection, documents);
    // TODO: Use apexLibManager for future work
    // const apexLibManager = createApexLibManager('apex', 'apex', 'cls', client);

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
        diagnosticProvider: {
          interFileDependencies: false,
          workspaceDiagnostics: false,
        },
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

    // Register the apexlib/resolve request handler
    connection.onRequest('apexlib/resolve', async (params) => {
      logger.debug(
        `[SERVER] Received apexlib/resolve request for: ${params.uri}`,
      );
      try {
        const result = await dispatchProcessOnResolve(params);
        logger.debug(
          `[SERVER] Successfully resolved content for: ${params.uri}`,
        );
        return result;
      } catch (error) {
        logger.error(
          `[SERVER] Error resolving content for ${params.uri}: ${error}`,
        );
        throw error;
      }
    });

    // Register the $/ping request handler
    connection.onRequest('$/ping', async () => {
      logger.debug('[SERVER] Received $/ping request');
      try {
        const response = {
          message: 'pong',
          timestamp: new Date().toISOString(),
          server: 'apex-ls-node',
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
      message: 'Apex Language Server is now running in Node.js',
    });
  });

  // Handle document symbol requests
  connection.onDocumentSymbol(async (params: DocumentSymbolParams) => {
    logger.debug(
      `[SERVER] Received documentSymbol request for: ${params.textDocument.uri}`,
    );
    logger.debug(`[SERVER] DocumentSymbolParams: ${JSON.stringify(params)}`);

    try {
      const result = await dispatchProcessOnDocumentSymbol(params);
      logger.debug(
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
  connection.onRequest(
    'textDocument/diagnostic',
    async (params: DocumentSymbolParams) => {
      logger.debug(
        `[SERVER] Received diagnostic request for: ${params.textDocument.uri}`,
      );
      logger.debug(`[SERVER] DiagnosticParams: ${JSON.stringify(params)}`);

      try {
        const result = await dispatchProcessOnDiagnostic(params);
        logger.debug(
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

  // Configuration change handling is now managed by the LSPConfigurationManager
  // through its enhanced registration system in registerForConfigurationChanges()

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
    logger.debug(
      `Extension Apex Language Server opened and processed document: ${JSON.stringify(event)}`,
    );

    dispatchProcessOnOpenDocument(event).then((diagnostics) =>
      handleDiagnostics(event.document.uri, diagnostics),
    );
  });

  documents.onDidChangeContent(
    (event: TextDocumentChangeEvent<TextDocument>) => {
      // Client changed a open document
      // Server will parse the document and populate the corresponding local maps
      logger.debug(
        `Extension Apex Language Server changed and processed document: ${JSON.stringify(event)}`,
      );

      dispatchProcessOnChangeDocument(event).then((diagnostics) =>
        handleDiagnostics(event.document.uri, diagnostics),
      );
    },
  );

  documents.onDidClose((event: TextDocumentChangeEvent<TextDocument>) => {
    // Client closed a open document
    // Server will update the corresponding local maps
    logger.debug(
      `Extension Apex Language Server closed document: ${JSON.stringify(event)}`,
    );

    dispatchProcessOnCloseDocument(event);

    // Clear diagnostics for the closed document
    handleDiagnostics(event.document.uri, []);
  });

  documents.onDidSave((event: TextDocumentChangeEvent<TextDocument>) => {
    // Client saved a document
    // Server will parse the document and update storage as needed
    logger.debug(
      `Extension Apex Language Server saved document: ${JSON.stringify(event)}`,
    );

    dispatchProcessOnSaveDocument(event);
  });

  // Make the text document manager listen on the connection
  // for open, change and close text document events
  documents.listen(connection);

  // Listen on the connection
  connection.listen();
}

// Start the server when this module is executed directly
if (require.main === module) {
  startServer();
}
