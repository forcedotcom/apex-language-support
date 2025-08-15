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
  DocumentSymbolParams,
  TextDocuments,
  TextDocumentChangeEvent,
  FoldingRangeParams,
  BrowserMessageReader,
  BrowserMessageWriter,
  DocumentSymbol,
  Diagnostic,
} from 'vscode-languageserver/browser';
import { TextDocument } from 'vscode-languageserver-textdocument';

// Add back logging imports - TESTING STEP 1
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
 * Creates a simplified web worker-based language server
 * This version avoids problematic dependencies that cause importScripts issues
 */
export async function createSimpleWebWorkerLanguageServer() {
  // Create message reader and writer for web worker communication
  const messageReader = new BrowserMessageReader(
    self as DedicatedWorkerGlobalScope,
  );
  const messageWriter = new BrowserMessageWriter(
    self as DedicatedWorkerGlobalScope,
  );

  // Create the LSP connection
  const connection = createConnection(messageReader, messageWriter);

  // Set up logging - TESTING STEP 1
  setLoggerFactory(UnifiedLoggerFactory.getWorkerInstance());
  setLogNotificationHandler(
    UnifiedLogNotificationHandler.getWorkerInstance(connection),
  );

  // Set log level to debug by default for testing
  setLogLevel('debug');
  const logger = getLogger();

  // Initialize storage with web worker storage
  const storage = WebWorkerStorage.getInstance();
  await storage.initialize();
  logger.info('[SIMPLE-WORKER] Storage initialized');

  // Server state
  const documents = new TextDocuments(TextDocument);

  // Set up document event handlers
  documents.onDidOpen((event: TextDocumentChangeEvent<TextDocument>) => {
    logger.info(`[SIMPLE-WORKER] Document opened: ${event.document.uri}`);
    // Store document in storage
    storage.setDocument(event.document.uri, event.document);
  });

  documents.onDidChangeContent(
    (change: TextDocumentChangeEvent<TextDocument>) => {
      logger.info(`[SIMPLE-WORKER] Document changed: ${change.document.uri}`);
      // Update document in storage
      storage.setDocument(change.document.uri, change.document);
    },
  );

  documents.onDidClose((event) => {
    logger.info(`[SIMPLE-WORKER] Document closed: ${event.document.uri}`);
    // Clear document from storage
    storage.clearFile(event.document.uri);
  });

  documents.onDidSave((event: TextDocumentChangeEvent<TextDocument>) => {
    logger.info(`[SIMPLE-WORKER] Document saved: ${event.document.uri}`);
    // Update document in storage
    storage.setDocument(event.document.uri, event.document);
  });

  // Handle initialization
  connection.onInitialize((params: InitializeParams): InitializeResult => {
    logger.info('[SIMPLE-WORKER] Initializing language server...');
    logger.info(`[SIMPLE-WORKER] Root URI: ${params.rootUri}`);
    logger.info(`[SIMPLE-WORKER] Process ID: ${params.processId}`);

    // Extract initialization options - TESTING STEP 2
    const initOptions = params.initializationOptions as
      | ApexServerInitializationOptions
      | undefined;
    const logLevel = initOptions?.logLevel || 'error';

    logger.info(`Setting log level to: ${logLevel}`);
    setLogLevel(logLevel);

    // Determine server mode - TESTING STEP 2
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

    // Create simple capabilities for web worker - TESTING STEP 2
    const capabilities = {
      textDocumentSync: 2, // Incremental sync
      documentSymbolProvider: true,
      foldingRangeProvider: true,
      workspace: {
        workspaceFolders: {
          supported: true,
        },
      },
    };

    logger.info(`Using ${mode} mode capabilities for web worker environment`);

    return { capabilities } as InitializeResult;
  });

  connection.onInitialized(() => {
    logger.info('[SIMPLE-WORKER] Language server initialized');

    // Register additional request handlers after initialization
    connection.onRequest('$/ping', async () => {
      logger.debug('[SIMPLE-WORKER] Received $/ping request');
      try {
        const response = {
          message: 'pong',
          timestamp: new Date().toISOString(),
          server: 'apex-ls-webworker',
        };
        logger.debug(
          `[SIMPLE-WORKER] Responding to $/ping with: ${JSON.stringify(response)}`,
        );
        return response;
      } catch (error) {
        logger.error(
          `[SIMPLE-WORKER] Error processing $/ping request: ${error}`,
        );
        throw error;
      }
    });

    // Handle diagnostic requests
    connection.onRequest(
      'textDocument/diagnostic',
      async (params: DocumentSymbolParams) => {
        logger.debug(
          `[SIMPLE-WORKER] Received diagnostic request for: ${params.textDocument.uri}`,
        );

        try {
          // For now, return empty diagnostics
          // This can be enhanced with actual Apex parsing later
          const diagnostics: Diagnostic[] = [];
          logger.debug(
            `[SIMPLE-WORKER] Result for diagnostic (${params.textDocument.uri}): ${JSON.stringify(diagnostics)}`,
          );
          return diagnostics;
        } catch (error) {
          logger.error(
            `[SIMPLE-WORKER] Error processing diagnostic for ${params.textDocument.uri}: ${error}`,
          );
          return [];
        }
      },
    );

    // Handle workspace diagnostic requests
    connection.onRequest('workspace/diagnostic', async (params) => {
      logger.debug('[SIMPLE-WORKER] workspace/diagnostic requested by client');
      return { items: [] };
    });
  });

  // Handle document symbols request
  connection.onDocumentSymbol(async (params: DocumentSymbolParams) => {
    logger.info(
      `[SIMPLE-WORKER] Document symbols request for: ${params.textDocument.uri}`,
    );

    try {
      // Get document from storage
      const document = await storage.getDocument(params.textDocument.uri);
      if (!document) {
        logger.warn(
          `[SIMPLE-WORKER] Document not found: ${params.textDocument.uri}`,
        );
        return [];
      }

      // For now, return a simple symbol structure
      // This can be enhanced with actual Apex parsing once the parser-ast package is web-worker compatible
      const symbols: DocumentSymbol[] = [
        {
          name: 'TestClass',
          kind: 5, // Class
          range: {
            start: { line: 0, character: 0 },
            end: { line: 10, character: 0 },
          },
          selectionRange: {
            start: { line: 0, character: 6 },
            end: { line: 0, character: 15 },
          },
          children: [
            {
              name: 'testMethod',
              kind: 6, // Method
              range: {
                start: { line: 2, character: 4 },
                end: { line: 4, character: 4 },
              },
              selectionRange: {
                start: { line: 2, character: 12 },
                end: { line: 2, character: 22 },
              },
            },
          ],
        },
      ];

      logger.info(
        `[SIMPLE-WORKER] Returning ${symbols.length} symbols for: ${params.textDocument.uri}`,
      );
      return symbols;
    } catch (error) {
      logger.error(
        `[SIMPLE-WORKER] Error processing document symbols for ${params.textDocument.uri}: ${error}`,
      );
      return [];
    }
  });

  // Handle folding range request
  connection.onFoldingRanges(async (params: FoldingRangeParams) => {
    logger.info(
      `[SIMPLE-WORKER] Folding ranges request for: ${params.textDocument.uri}`,
    );

    try {
      // Get document from storage
      const document = await storage.getDocument(params.textDocument.uri);
      if (!document) {
        logger.warn(
          `[SIMPLE-WORKER] Document not found: ${params.textDocument.uri}`,
        );
        return [];
      }

      // For now, return simple folding ranges
      // This can be enhanced with actual Apex parsing later
      const foldingRanges = [
        {
          startLine: 0,
          endLine: 10,
          kind: 'region',
        },
        {
          startLine: 2,
          endLine: 4,
          kind: 'comment',
        },
      ];

      logger.info(
        `[SIMPLE-WORKER] Returning ${foldingRanges.length} folding ranges for: ${params.textDocument.uri}`,
      );
      return foldingRanges;
    } catch (error) {
      logger.error(
        `[SIMPLE-WORKER] Error processing folding ranges for ${params.textDocument.uri}: ${error}`,
      );
      return [];
    }
  });

  // Handle shutdown
  connection.onShutdown(() => {
    logger.info('[SIMPLE-WORKER] Shutdown requested');
  });

  // Handle exit
  connection.onExit(() => {
    logger.info('[SIMPLE-WORKER] Exit requested');
    process.exit(0);
  });

  // Listen on the connection
  logger.info('[SIMPLE-WORKER] Starting to listen on connection...');
  documents.listen(connection);
  connection.listen();
  logger.info('[SIMPLE-WORKER] Connection listening started');

  logger.info('[SIMPLE-WORKER] Simplified language server ready!');
}

// Auto-start if in worker environment
if (typeof self !== 'undefined' && 'DedicatedWorkerGlobalScope' in self) {
  console.log('[SIMPLE-WORKER] Starting Apex Language Server...');
  createSimpleWebWorkerLanguageServer().catch((error) => {
    console.error('[SIMPLE-WORKER] Failed to start language server:', error);
  });
} else {
  console.log('[SIMPLE-WORKER] Not in worker environment, skipping auto-start');
}
