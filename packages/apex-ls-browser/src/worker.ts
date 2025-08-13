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
  LSPConfigurationManager,
  dispatchProcessOnResolve,
} from '@salesforce/apex-lsp-compliant-services';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  setLogNotificationHandler,
  getLogger,
  setLoggerFactory,
  setLogLevel,
} from '@salesforce/apex-lsp-shared';

import { UnifiedLogNotificationHandler } from './utils/BrowserLogNotificationHandler';
import { UnifiedLoggerFactory } from './utils/BrowserLoggerFactory';
import { WebWorkerStorage } from './storage/WebWorkerStorage';
import type { ApexServerInitializationOptions } from './types';

/**
 * Creates a web worker-based language server
 *
 * This function sets up the language server to run in a web worker context,
 * handling communication between the main thread and the worker.
 */
export function createWebWorkerLanguageServer() {
  // Create message reader and writer for web worker communication
  const messageReader = new BrowserMessageReader(
    self as DedicatedWorkerGlobalScope,
  );
  const messageWriter = new BrowserMessageWriter(
    self as DedicatedWorkerGlobalScope,
  );

  // Create the LSP connection
  const connection = createConnection(messageReader, messageWriter);

  // Set up logging
  setLoggerFactory(UnifiedLoggerFactory.getWorkerInstance());
  setLogNotificationHandler(
    UnifiedLogNotificationHandler.getWorkerInstance(connection),
  );
  const logger = getLogger();

  // Initialize configuration manager
  const configurationManager = new LSPConfigurationManager();

  // Server state
  let isShutdown = false;
  const documents = new TextDocuments(TextDocument);

  // Initialize storage with web worker storage
  const storageManager = ApexStorageManager.getInstance({
    storageFactory: (options) => WebWorkerStorage.getInstance(),
    storageOptions: {
      /* web worker specific options */
    },
  });
  storageManager.initialize();

  // Initialize server capabilities
  connection.onInitialize((params: InitializeParams): InitializeResult => {
    logger.info('Web Worker Apex Language Server initializing...');

    // Extract initialization options
    const initOptions = params.initializationOptions as
      | ApexServerInitializationOptions
      | undefined;
    const logLevel = initOptions?.logLevel || 'error';

    logger.info(`Setting log level to: ${logLevel}`);
    setLogLevel(logLevel);

    // Determine server mode
    const extensionMode = initOptions?.extensionMode as
      | 'production'
      | 'development'
      | undefined;

    let mode: 'production' | 'development';

    // Check for APEX_LS_MODE environment variable (if available in worker)
    if (
      (typeof self !== 'undefined' &&
        'APEX_LS_MODE' in self &&
        (self as any).APEX_LS_MODE === 'production') ||
      (self as any).APEX_LS_MODE === 'development'
    ) {
      mode = (self as any).APEX_LS_MODE;
      logger.info(
        `Using server mode from APEX_LS_MODE environment variable: ${mode}`,
      );
    }
    // Check for extension mode in initialization options
    else if (extensionMode) {
      mode = extensionMode;
      logger.info(
        `Using server mode from extension initialization options: ${mode}`,
      );
    }
    // Default to production mode for web workers
    else {
      mode = 'production';
      logger.info('Using default production mode for web worker environment');
    }

    // Set the mode and get capabilities
    configurationManager.setMode(mode);
    const capabilities = configurationManager.getCapabilities();

    logger.info(`Using ${mode} mode capabilities for web worker environment`);

    return { capabilities };
  });

  // Handle client connection
  connection.onInitialized(() => {
    logger.info(
      'Web Worker Language Server initialized and connected to client.',
    );

    // Register the apexlib/resolve request handler
    connection.onRequest('apexlib/resolve', async (params) => {
      logger.debug(
        `[WORKER] Received apexlib/resolve request for: ${params.uri}`,
      );
      try {
        const result = await dispatchProcessOnResolve(params);
        logger.debug(
          `[WORKER] Successfully resolved content for: ${params.uri}`,
        );
        return result;
      } catch (error) {
        logger.error(
          `[WORKER] Error resolving content for ${params.uri}: ${error}`,
        );
        throw error;
      }
    });

    // Register the $/ping request handler
    connection.onRequest('$/ping', async () => {
      logger.debug('[WORKER] Received $/ping request');
      try {
        const response = {
          message: 'pong',
          timestamp: new Date().toISOString(),
          server: 'apex-ls-webworker',
        };
        logger.debug(
          `[WORKER] Responding to $/ping with: ${JSON.stringify(response)}`,
        );
        return response;
      } catch (error) {
        logger.error(`[WORKER] Error processing $/ping request: ${error}`);
        throw error;
      }
    });

    // Send notification to client that server is ready
    connection.sendNotification(InitializedNotification.type, {
      type: MessageType.Info,
      message: 'Apex Language Server is now running in web worker',
    });
  });

  // Handle document symbol requests
  connection.onDocumentSymbol(async (params: DocumentSymbolParams) => {
    logger.debug(
      `[WORKER] Received documentSymbol request for: ${params.textDocument.uri}`,
    );

    try {
      const result = await dispatchProcessOnDocumentSymbol(params);
      logger.debug(
        `[WORKER] Result for documentSymbol (${params.textDocument.uri}): ${JSON.stringify(result)}`,
      );
      return result;
    } catch (error) {
      logger.error(
        `[WORKER] Error processing documentSymbol for ${params.textDocument.uri}: ${error}`,
      );
      return null;
    }
  });

  // Handle diagnostic requests
  connection.onRequest(
    'textDocument/diagnostic',
    async (params: DocumentSymbolParams) => {
      logger.debug(
        `[WORKER] Received diagnostic request for: ${params.textDocument.uri}`,
      );

      try {
        const result = await dispatchProcessOnDiagnostic(params);
        logger.debug(
          `[WORKER] Result for diagnostic (${params.textDocument.uri}): ${JSON.stringify(result)}`,
        );
        return result;
      } catch (error) {
        logger.error(
          `[WORKER] Error processing diagnostic for ${params.textDocument.uri}: ${error}`,
        );
        return [];
      }
    },
  );

  // Handle workspace diagnostic requests
  connection.onRequest('workspace/diagnostic', async (params) => {
    logger.debug('workspace/diagnostic requested by client');
    return { items: [] };
  });

  // Handle folding ranges
  connection.onFoldingRanges(
    async (params: FoldingRangeParams): Promise<FoldingRange[] | null> => {
      logger.debug(
        () =>
          `[WORKER] Received foldingRange request for: ${params.textDocument.uri}`,
      );

      try {
        const result = await dispatchProcessOnFoldingRange(
          params,
          storageManager.getStorage(),
        );
        logger.debug(
          () =>
            `[WORKER] Result for foldingRanges (${params.textDocument.uri}): ${JSON.stringify(result)}`,
        );
        return result;
      } catch (error) {
        logger.error(
          () =>
            `[WORKER] Error processing foldingRanges for ${params.textDocument.uri}: ${error}`,
        );
        return null;
      }
    },
  );

  // Handle completion requests
  connection.onCompletion(
    (_textDocumentPosition: TextDocumentPositionParams) => [
      {
        label: 'ExampleCompletion',
        kind: 1, // Text completion
        data: 1,
      },
    ],
  );

  // Handle hover requests
  connection.onHover((_textDocumentPosition: TextDocumentPositionParams) => ({
    contents: {
      kind: 'markdown',
      value: 'This is an example hover text.',
    },
  }));

  // Handle shutdown request
  connection.onShutdown(() => {
    logger.info('Web Worker Apex Language Server shutting down...');
    isShutdown = true;
    logger.info('Web Worker Apex Language Server shutdown complete');
  });

  // Handle exit notification
  connection.onExit(() => {
    logger.info('Web Worker Apex Language Server exiting...');
    if (!isShutdown) {
      logger.warn(
        'Web Worker Apex Language Server exiting without proper shutdown',
      );
    }
    logger.info('Web Worker Apex Language Server exited');
  });

  // Helper function to handle diagnostics
  const handleDiagnostics = (
    uri: string,
    diagnostics: Diagnostic[] | undefined,
  ) => {
    const capabilities = configurationManager.getExtendedServerCapabilities();
    if (!capabilities.publishDiagnostics) {
      logger.debug(
        () =>
          `Publish diagnostics disabled, skipping diagnostic send for: ${uri}`,
      );
      return;
    }

    connection.sendDiagnostics({
      uri,
      diagnostics: diagnostics || [],
    });
  };

  // Document event handlers
  documents.onDidOpen((event: TextDocumentChangeEvent<TextDocument>) => {
    logger.debug(
      `Web Worker Apex Language Server opened and processed document: ${JSON.stringify(event)}`,
    );

    dispatchProcessOnOpenDocument(event).then((diagnostics) =>
      handleDiagnostics(event.document.uri, diagnostics),
    );
  });

  documents.onDidChangeContent(
    (event: TextDocumentChangeEvent<TextDocument>) => {
      logger.debug(
        `Web Worker Apex Language Server changed and processed document: ${JSON.stringify(event)}`,
      );

      dispatchProcessOnChangeDocument(event).then((diagnostics) =>
        handleDiagnostics(event.document.uri, diagnostics),
      );
    },
  );

  documents.onDidClose((event: TextDocumentChangeEvent<TextDocument>) => {
    logger.debug(
      `Web Worker Apex Language Server closed document: ${JSON.stringify(event)}`,
    );

    dispatchProcessOnCloseDocument(event);
    handleDiagnostics(event.document.uri, []);
  });

  documents.onDidSave((event: TextDocumentChangeEvent<TextDocument>) => {
    logger.debug(
      `Web Worker Apex Language Server saved document: ${JSON.stringify(event)}`,
    );

    dispatchProcessOnSaveDocument(event);
  });

  // Make the text document manager listen on the connection
  documents.listen(connection);

  // Listen on the connection
  connection.listen();

  return connection;
}

// Auto-start the server when this module is loaded in a web worker
if (typeof self !== 'undefined' && 'DedicatedWorkerGlobalScope' in self) {
  createWebWorkerLanguageServer();
}
