/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Import web-compatible protocol types (no Node.js dependencies)
import {
  InitializeParams,
  InitializeResult,
  MessageType,
  DocumentSymbolParams,
  Diagnostic,
  FoldingRangeParams,
  FoldingRange,
  Connection,
  TextDocumentChangeEvent,
} from './protocol/lsp-types';

// Import web-compatible connection and document management
import { createWebConnection } from './protocol/web-connection';
import { WebTextDocuments } from './protocol/web-text-documents';

// Import Node.js API polyfills for WebContainer support
import { initializeNodeApiPolyfills } from './utils/NodeApiPolyfills';

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
  dispatchProcessOnResolve,
} from '@salesforce/apex-lsp-compliant-services';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { getLogger, setLogLevel } from '@salesforce/apex-lsp-shared';

import { PlatformAdapter } from './utils/PlatformAdapter';

/**
 * Interface for server initialization options
 */
interface ApexServerInitializationOptions {
  logLevel?: string;
  enableDocumentSymbols?: boolean;
  trace?: string;
  extensionMode?: 'production' | 'development';
  [key: string]: any;
}

/**
 * Detects the current runtime environment
 */
function detectEnvironment(): 'node' | 'webcontainer' | 'browser' {
  // Check if we're in a WebContainer environment
  if (typeof globalThis !== 'undefined' && (globalThis as any).WebContainer) {
    return 'webcontainer';
  }

  // Check if we're in a browser environment
  if (typeof window !== 'undefined' || typeof self !== 'undefined') {
    return 'browser';
  }

  // Check if we're in Node.js
  if (
    typeof process !== 'undefined' &&
    process.versions &&
    process.versions.node
  ) {
    return 'node';
  }

  // Default to browser for web workers
  return 'browser';
}

/**
 * Creates a connection based on the environment and arguments
 * Now supports Node.js, WebContainer, and browser environments
 */
function createLanguageServerConnection(
  environment: 'node' | 'webcontainer' | 'browser',
): Connection {
  if (environment === 'webcontainer') {
    // WebContainer environment - use our web-compatible connection with Node.js API support
    // Initialize Node.js API polyfills for WebContainer
    initializeNodeApiPolyfills();
    return createWebConnection();
  } else if (environment === 'browser') {
    // Browser/Web Worker environment - use our web-compatible connection
    return createWebConnection();
  } else if (environment === 'node') {
    // Node.js environment - use standard Node.js connection
    // Import Node.js specific connection
    const { createConnection } = require('vscode-languageserver/node');
    return createConnection();
  } else {
    throw new Error(`Unsupported environment: ${environment}`);
  }
}

/**
 * Main function to start the unified language server
 */
export function startServer(injectedPlatformAdapter?: PlatformAdapter) {
  // Detect environment
  const environment = detectEnvironment();

  // Create platform adapter and initialize logging
  const platformAdapter =
    injectedPlatformAdapter || new PlatformAdapter(environment);
  platformAdapter.initializeLogging();

  // Create connection
  const connection = createLanguageServerConnection(environment);

  // Set up logging with platform-specific handler
  platformAdapter.setupLogging(connection);
  const logger = getLogger();

  logger.info(`Starting Apex Language Server in ${environment} environment`);

  // Initialize settings and configuration managers
  const configurationManager = new LSPConfigurationManager();

  // Server state
  let isShutdown = false;
  const documents = new WebTextDocuments(TextDocument);

  // Initialize storage
  const storageManager = ApexStorageManager.getInstance({
    storageFactory: (options) => ApexStorage.getInstance(),
    storageOptions: {},
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
    setLogLevel(logLevel);

    // Get capabilities based on environment and mode
    const extensionMode = initOptions?.extensionMode as
      | 'production'
      | 'development'
      | undefined;

    let mode: 'production' | 'development';

    if (environment === 'webcontainer') {
      // For WebContainer, use development mode by default to enable all features
      mode = extensionMode || 'development';
      logger.info(`Using ${mode} mode for WebContainer environment`);
    } else if (environment === 'browser') {
      // For browser, use production mode by default
      mode = extensionMode || 'production';
      logger.info(`Using ${mode} mode for browser environment`);
    } else {
      // Node.js environment - use development mode by default
      mode = extensionMode || 'development';
      logger.info(`Using ${mode} mode for Node.js environment`);
    }

    // Set the mode and get capabilities
    configurationManager.setMode(mode);
    const capabilities = configurationManager.getCapabilities() as any;

    logger.info(
      `Using ${mode} mode capabilities for ${environment} environment`,
    );

    return { capabilities };
  });

  // Handle client connection
  connection.onInitialized(() => {
    logger.info('Language server initialized and connected to client.');

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
          server: 'apex-ls-unified',
          environment,
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
    connection.sendNotification('window/showMessage', {
      type: MessageType.Info,
      message: `Apex Language Server is now running in ${environment}`,
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
        return [];
      }
    },
  );

  // Handle workspace diagnostic requests (no-op for now)
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
    isShutdown = true;
    logger.info('Apex Language Server shutdown complete');
  });

  // Handle exit notification
  connection.onExit(() => {
    logger.info('Apex Language Server exiting...');
    if (!isShutdown) {
      logger.warn('Apex Language Server exiting without proper shutdown');
    }
    logger.info('Apex Language Server exited');
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
      `Extension Apex Language Server opened and processed document: ${JSON.stringify(event)}`,
    );

    dispatchProcessOnOpenDocument(event).then((diagnostics) =>
      handleDiagnostics(event.document.uri, diagnostics),
    );
  });

  documents.onDidChangeContent(
    (event: TextDocumentChangeEvent<TextDocument>) => {
      logger.debug(
        `Extension Apex Language Server changed and processed document: ${JSON.stringify(event)}`,
      );

      dispatchProcessOnChangeDocument(event).then((diagnostics) =>
        handleDiagnostics(event.document.uri, diagnostics),
      );
    },
  );

  documents.onDidClose((event: TextDocumentChangeEvent<TextDocument>) => {
    logger.debug(
      `Extension Apex Language Server closed document: ${JSON.stringify(event)}`,
    );

    dispatchProcessOnCloseDocument(event);
    handleDiagnostics(event.document.uri, []);
  });

  documents.onDidSave((event: TextDocumentChangeEvent<TextDocument>) => {
    logger.debug(
      `Extension Apex Language Server saved document: ${JSON.stringify(event)}`,
    );

    dispatchProcessOnSaveDocument(event);
  });

  // Make the text document manager listen on the connection
  documents.listen(connection);

  // Listen on the connection
  connection.listen();
}

// Export PlatformAdapter for use in web workers and WebContainers
export { PlatformAdapter } from './utils/PlatformAdapter';

/**
 * WebContainer safe startServer function that creates PlatformAdapter from exports
 */
export function startServerSafe() {
  const environment = detectEnvironment();
  const platformAdapter = new PlatformAdapter(environment);
  return startServer(platformAdapter);
}

/**
 * WebContainer-specific startServer function
 */
export function startServerInWebContainer() {
  const environment = 'webcontainer';
  const platformAdapter = new PlatformAdapter(environment);
  return startServer(platformAdapter);
}

// Export for use in web workers, WebContainers, and other environments
export default startServer;
