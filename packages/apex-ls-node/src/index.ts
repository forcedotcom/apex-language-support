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
  dispatchProcessOnHover,
  ApexStorageManager,
  LSPConfigurationManager,
  dispatchProcessOnResolve,
  LSPQueueManager,
  BackgroundProcessingInitializationService,
} from '@salesforce/apex-lsp-compliant-services';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  setLogNotificationHandler,
  getLogger,
  setLoggerFactory,
  setLogLevel,
} from '@salesforce/apex-lsp-shared';

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
  const configurationManager = new LSPConfigurationManager();

  // Server state
  let isShutdown = false;
  const documents = new TextDocuments(TextDocument);

  // Initialize storage manager (but defer actual storage initialization)
  const storageManager = ApexStorageManager.getInstance({
    storageFactory: (options) => new NodeFileSystemApexStorage(),
    storageOptions: {
      /* your options */
    },
  });

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

    // Initialize ApexLib
    // const { client } = createNodeApexLibAdapter(connection, documents);
    // TODO: Use apexLibManager for future work
    // const apexLibManager = createApexLibManager('apex', 'apex', 'cls', client);

    // Get capabilities based on environment and mode
    // Priority order: APEX_LS_MODE env var > extension mode in init options > NODE_ENV
    const extensionMode = initOptions?.extensionMode as
      | 'production'
      | 'development'
      | undefined;

    let mode: 'production' | 'development';

    // First check for APEX_LS_MODE environment variable
    if (
      process.env.APEX_LS_MODE === 'production' ||
      process.env.APEX_LS_MODE === 'development'
    ) {
      mode = process.env.APEX_LS_MODE;
      logger.info(
        `Using server mode from APEX_LS_MODE environment variable: ${mode}`,
      );
    }
    // Then check for extension mode in initialization options
    else if (extensionMode) {
      mode = extensionMode;
      logger.info(
        `Using server mode from extension initialization options: ${mode}`,
      );
    }
    // Finally fall back to NODE_ENV
    else {
      mode = (
        process.env.NODE_ENV === 'development' ? 'development' : 'production'
      ) as 'production' | 'development';
      logger.info(`Using server mode from NODE_ENV: ${mode}`);
    }

    // Set the mode and get capabilities
    configurationManager.setMode(mode);
    const capabilities = configurationManager.getCapabilities();

    logger.info(`Using ${mode} mode capabilities for Node.js environment`);

    return { capabilities };
  });

  // Handle client connection
  connection.onInitialized(async () => {
    logger.info('Language server initialized and connected to client.');

    // Initialize storage after connection is established
    try {
      await storageManager.initialize();
      logger.info('Storage manager initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize storage manager: ${error}`);
      // Continue without storage if initialization fails
    }

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
        const queueStats = queueManager.getStats();
        const response = {
          message: 'pong',
          timestamp: new Date().toISOString(),
          server: 'apex-ls-node',
          queueStats: {
            activeWorkers: queueStats.activeWorkers,
            totalProcessed: queueStats.totalProcessed,
            averageProcessingTime: queueStats.averageProcessingTime,
            queueSizes: {
              immediate: queueStats.immediateQueueSize,
              high: queueStats.highPriorityQueueSize,
              normal: queueStats.normalPriorityQueueSize,
              low: queueStats.lowPriorityQueueSize,
            },
          },
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

  // Handle workspace diagnostic requests (no-op for now)
  connection.onRequest('workspace/diagnostic', async (params) => {
    logger.debug('workspace/diagnostic requested by client');
    return { items: [] };
  });

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
  connection.onHover(async (textDocumentPosition: any) => {
    try {
      return await dispatchProcessOnHover(textDocumentPosition);
    } catch (error) {
      logger.error(() => `Error handling hover request: ${error}`);
      return null;
    }
  });

  // Handle shutdown request
  connection.onShutdown(async () => {
    logger.info('Apex Language Server shutting down...');

    // Shutdown storage manager
    try {
      await storageManager.shutdown();
      logger.info('Storage manager shutdown complete');
    } catch (error) {
      logger.error(`Error shutting down storage manager: ${error}`);
    }

    // Shutdown LSP queue manager
    try {
      queueManager.shutdown();
      logger.info('LSP queue manager shutdown complete');
    } catch (error) {
      logger.error(`Error shutting down LSP queue manager: ${error}`);
    }

    // Shutdown background processing
    try {
      backgroundProcessingService.shutdown();
      logger.info('Background processing shutdown complete');
    } catch (error) {
      logger.error(`Error shutting down background processing: ${error}`);
    }

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

      // Still try to shutdown background processing even if shutdown wasn't called
      try {
        backgroundProcessingService.shutdown();
        logger.info('Background processing shutdown complete (exit handler)');
      } catch (error) {
        logger.error(
          `Error shutting down background processing in exit handler: ${error}`,
        );
      }
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
    // Check if publishDiagnostics is enabled in capabilities
    const capabilities = configurationManager.getExtendedServerCapabilities();
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

  // Initialize LSP queue manager
  const queueManager = LSPQueueManager.getInstance();

  // Initialize background processing
  const backgroundProcessingService =
    BackgroundProcessingInitializationService.getInstance();
  backgroundProcessingService.initialize();

  // Notifications
  documents.onDidOpen((event: TextDocumentChangeEvent<TextDocument>) => {
    // Client opened a document
    // Server will parse the document and populate the corresponding local maps
    logger.debug(
      () =>
        `Extension Apex Language Server opened and processed document: ${JSON.stringify(event)}`,
    );

    // Use queue-based processing for document open
    const fileSize = event.document.getText().length;
    const isLargeFile = fileSize > 10000; // 10KB threshold

    if (isLargeFile) {
      // Queue large files for background processing
      logger.debug(
        () =>
          `Queuing large document open: ${event.document.uri} (${fileSize} chars)`,
      );

      queueManager
        .submitDocumentOpenRequest(event)
        .then((diagnostics) =>
          handleDiagnostics(event.document.uri, diagnostics),
        )
        .catch((error) => {
          logger.error(() => `Queued document open failed: ${error}`);
          // Fallback to immediate processing
          dispatchProcessOnOpenDocument(event).then((diagnostics) =>
            handleDiagnostics(event.document.uri, diagnostics),
          );
        });
    } else {
      // Process small files immediately
      logger.debug(
        () => `Processing small document immediately: ${event.document.uri}`,
      );

      dispatchProcessOnOpenDocument(event).then((diagnostics) =>
        handleDiagnostics(event.document.uri, diagnostics),
      );
    }
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
      () =>
        `Extension Apex Language Server closed document: ${JSON.stringify(event)}`,
    );

    // Use queue-based processing for document close
    queueManager.submitDocumentCloseRequest(event).catch((error) => {
      logger.error(() => `Queued document close failed: ${error}`);
      // Fallback to immediate processing
      dispatchProcessOnCloseDocument(event);
    });

    // Clear diagnostics for the closed document
    handleDiagnostics(event.document.uri, []);
  });

  documents.onDidSave((event: TextDocumentChangeEvent<TextDocument>) => {
    // Client saved a document
    // Server will parse the document and update storage as needed
    logger.debug(
      () =>
        `Extension Apex Language Server saved document: ${JSON.stringify(event)}`,
    );

    // Use queue-based processing for document save
    queueManager.submitDocumentSaveRequest(event).catch((error) => {
      logger.error(() => `Queued document save failed: ${error}`);
      // Fallback to immediate processing
      dispatchProcessOnSaveDocument(event);
    });
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
