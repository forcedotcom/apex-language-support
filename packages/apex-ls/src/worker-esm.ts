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
  TextDocumentSyncKind,
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
 * Creates a simplified web worker-based language server for ES modules
 * This version is designed specifically for ES module workers and doesn't auto-start
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
  logger.info('[SIMPLE-WORKER-ESM] Storage initialized');

  // Server state
  const documents = new TextDocuments(TextDocument);

  // Set up document event handlers
  documents.onDidOpen((event: TextDocumentChangeEvent<TextDocument>) => {
    logger.info(`[SIMPLE-WORKER-ESM] Document opened: ${event.document.uri}`);
    // Store document in storage
    storage.setDocument(event.document.uri, event.document);
  });

  documents.onDidChangeContent(
    (change: TextDocumentChangeEvent<TextDocument>) => {
      logger.info(
        `[SIMPLE-WORKER-ESM] Document changed: ${change.document.uri}`,
      );
      // Update document in storage
      storage.setDocument(change.document.uri, change.document);
    },
  );

  documents.onDidClose((event) => {
    logger.info(`[SIMPLE-WORKER-ESM] Document closed: ${event.document.uri}`);
    // Clear document from storage
    storage.clearFile(event.document.uri);
  });

  documents.onDidSave((event: TextDocumentChangeEvent<TextDocument>) => {
    logger.info(`[SIMPLE-WORKER-ESM] Document saved: ${event.document.uri}`);
    // Update document in storage
    storage.setDocument(event.document.uri, event.document);
  });

  // Handle initialization
  connection.onInitialize((params: InitializeParams): InitializeResult => {
    logger.info('[SIMPLE-WORKER-ESM] Initializing language server...');
    logger.info(`[SIMPLE-WORKER-ESM] Root URI: ${params.rootUri}`);
    logger.info(`[SIMPLE-WORKER-ESM] Process ID: ${params.processId}`);

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
    const capabilities: any = {
      textDocumentSync: TextDocumentSyncKind.Incremental, // Incremental
      documentSymbolProvider: true,
      foldingRangeProvider: true,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['.'],
      },
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      diagnosticProvider: {
        interFileDependencies: false,
        workspaceDiagnostics: false,
      },
    };

    logger.info('[SIMPLE-WORKER-ESM] Language server initialized successfully');
    return { capabilities };
  });

  // Handle initialized notification
  connection.onInitialized(() => {
    logger.info('[SIMPLE-WORKER-ESM] Language server initialized');
  });

  // Handle document symbol request
  connection.onDocumentSymbol(async (params: DocumentSymbolParams) => {
    logger.info(
      `[SIMPLE-WORKER-ESM] Document symbols request for: ${params.textDocument.uri}`,
    );

    try {
      // Get document from storage
      const document = await storage.getDocument(params.textDocument.uri);
      if (!document) {
        logger.warn(
          `[SIMPLE-WORKER-ESM] Document not found: ${params.textDocument.uri}`,
        );
        return [];
      }

      // For now, return simple document symbols
      // This can be enhanced with actual Apex parsing later
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
        `[SIMPLE-WORKER-ESM] Returning ${symbols.length} symbols for: ${params.textDocument.uri}`,
      );
      return symbols;
    } catch (error) {
      logger.error(
        `[SIMPLE-WORKER-ESM] Error processing document symbols for ${params.textDocument.uri}: ${error}`,
      );
      return [];
    }
  });

  // Handle folding range request
  connection.onFoldingRanges(async (params: FoldingRangeParams) => {
    logger.info(
      `[SIMPLE-WORKER-ESM] Folding ranges request for: ${params.textDocument.uri}`,
    );

    try {
      // Get document from storage
      const document = await storage.getDocument(params.textDocument.uri);
      if (!document) {
        logger.warn(
          `[SIMPLE-WORKER-ESM] Document not found: ${params.textDocument.uri}`,
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
        `[SIMPLE-WORKER-ESM] Returning ${foldingRanges.length} folding ranges for: ${params.textDocument.uri}`,
      );
      return foldingRanges;
    } catch (error) {
      logger.error(
        `[SIMPLE-WORKER-ESM] Error processing folding ranges for ${params.textDocument.uri}: ${error}`,
      );
      return [];
    }
  });

  // Handle shutdown
  connection.onShutdown(() => {
    logger.info('[SIMPLE-WORKER-ESM] Shutdown requested');
  });

  // Handle exit
  connection.onExit(() => {
    logger.info('[SIMPLE-WORKER-ESM] Exit requested');
    process.exit(0);
  });

  // Listen on the connection
  logger.info('[SIMPLE-WORKER-ESM] Starting to listen on connection...');
  documents.listen(connection);
  connection.listen();
  logger.info('[SIMPLE-WORKER-ESM] Connection listening started');

  logger.info('[SIMPLE-WORKER-ESM] Simplified language server ready!');
}

// Initialize the worker synchronously
console.log('[SIMPLE-WORKER-ESM] ES module worker initializing...');

// Listen for messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'ready_check') {
    // Send ready message back to main thread
    self.postMessage('ready');
  } else if (event.data && event.data.type === 'start') {
    console.log(
      '[SIMPLE-WORKER-ESM] Starting Apex Language Server (ES module)...',
    );
    createSimpleWebWorkerLanguageServer().catch((error) => {
      console.error(
        '[SIMPLE-WORKER-ESM] Failed to start language server:',
        error,
      );
    });
  }
});

console.log(
  '[SIMPLE-WORKER-ESM] Worker initialized, waiting for start message...',
);
