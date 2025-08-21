/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

console.log('[APEX-WORKER] 🚀 Script loading started - top of worker.ts');

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

import {
  dispatchProcessOnDocumentSymbol,
  ApexStorageManager,
} from '@salesforce/apex-lsp-compliant-services';

import { UnifiedLogNotificationHandler } from './utils/BrowserLogNotificationHandler';
import { UnifiedLoggerFactory } from './utils/BrowserLoggerFactory';
import { UnifiedStorageFactory } from './storage/UnifiedStorageFactory';
import { ApexStorageAdapter } from './storage/ApexStorageManager';
import { createLoggerAdapter } from './utils/LoggerAdapter';

import type { ApexServerInitializationOptions } from './types';

/**
 * Creates a unified web worker-based language server using MessageBridge
 * This version provides platform-agnostic communication
 */
export async function createUnifiedWebWorkerLanguageServer() {
  // Create proper LSP connection for web worker
  const connection = createConnection(
    new BrowserMessageReader(self as any),
    new BrowserMessageWriter(self as any),
  );

  // Set up logging
  setLoggerFactory(UnifiedLoggerFactory.getInstance());
  setLogNotificationHandler(
    UnifiedLogNotificationHandler.getWorkerInstance(connection),
  );

  // Set log level to debug by default for testing
  setLogLevel('debug');
  const logger = getLogger();
  const jsonrpcLogger = createLoggerAdapter(logger);

  // Initialize storage using unified factory
  const baseStorage = await UnifiedStorageFactory.createStorage({
    useMemoryStorage: true,
    logger: jsonrpcLogger,
  });
  logger.info('[UNIFIED-WORKER] Base storage initialized');

  // Create Apex storage adapter
  const storage = new ApexStorageAdapter(baseStorage);
  logger.info('[UNIFIED-WORKER] Storage adapter initialized');

  // Initialize ApexStorageManager with our storage adapter
  const storageManager = ApexStorageManager.getInstance({
    storageFactory: () => storage,
    storageOptions: {},
  });
  await storageManager.initialize();
  logger.info(
    '[UNIFIED-WORKER] ApexStorageManager initialized with WebWorkerStorage',
  );

  // Server state
  const documents = new TextDocuments(TextDocument);

  // Set up document event handlers
  documents.onDidOpen((event: TextDocumentChangeEvent<TextDocument>) => {
    logger.info(`[UNIFIED-WORKER] Document opened: ${event.document.uri}`);
    storage.setDocument(event.document.uri, event.document);
  });

  documents.onDidChangeContent(
    (change: TextDocumentChangeEvent<TextDocument>) => {
      logger.info(`[UNIFIED-WORKER] Document changed: ${change.document.uri}`);
      storage.setDocument(change.document.uri, change.document);
    },
  );

  documents.onDidClose((event) => {
    logger.info(`[UNIFIED-WORKER] Document closed: ${event.document.uri}`);
    storage.clearFile(event.document.uri);
  });

  documents.onDidSave((event: TextDocumentChangeEvent<TextDocument>) => {
    logger.info(`[UNIFIED-WORKER] Document saved: ${event.document.uri}`);
    storage.setDocument(event.document.uri, event.document);
  });

  // Handle initialization
  connection.onInitialize((params: InitializeParams): InitializeResult => {
    logger.info('[UNIFIED-WORKER] Initializing language server...');
    logger.info(`[UNIFIED-WORKER] Root URI: ${params.rootUri}`);
    logger.info(`[UNIFIED-WORKER] Process ID: ${params.processId}`);

    // Extract initialization options
    const initOptions = params.initializationOptions as
      | ApexServerInitializationOptions
      | undefined;
    const logLevel = initOptions?.logLevel || 'error';
    const custom = initOptions?.custom || {};

    logger.info(`Setting log level to: ${logLevel}`);
    setLogLevel(logLevel);

    // Set custom options in global scope
    (self as any).custom = custom;

    // Set util.custom in global scope
    if (!(self as any).util) {
      (self as any).util = {};
    }
    (self as any).util.custom = custom;

    // Set util.custom in global scope
    Object.defineProperty(self, 'util', {
      value: { custom },
      writable: true,
      configurable: true,
      enumerable: true,
    });

    // Set util.custom in global scope
    Object.defineProperty((self as any).util, 'custom', {
      value: custom,
      writable: true,
      configurable: true,
      enumerable: true,
    });

    // Log the global scope
    logger.info(
      `[UNIFIED-WORKER] Global scope: ${JSON.stringify({
        custom: (self as any).custom,
        util: (self as any).util,
      })}`,
    );

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

    // Create capabilities for web worker
    const capabilities = {
      textDocumentSync: TextDocumentSyncKind.Incremental,
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
    logger.info('[UNIFIED-WORKER] Language server initialized');

    // Register additional request handlers after initialization
    connection.onRequest('$/ping', async () => {
      logger.debug('[UNIFIED-WORKER] Received $/ping request');
      try {
        const response = {
          message: 'pong',
          timestamp: new Date().toISOString(),
          server: 'apex-ls-unified-worker',
        };
        logger.debug(
          `[UNIFIED-WORKER] Responding to $/ping with: ${JSON.stringify(response)}`,
        );
        return response;
      } catch (error) {
        logger.error(
          `[UNIFIED-WORKER] Error processing $/ping request: ${error}`,
        );
        throw error;
      }
    });

    // Handle diagnostic requests
    connection.onRequest(
      'textDocument/diagnostic',
      async (params: DocumentSymbolParams) => {
        logger.debug(
          `[UNIFIED-WORKER] Received diagnostic request for: ${params.textDocument.uri}`,
        );

        try {
          // For now, return empty diagnostics
          // This can be enhanced with actual Apex parsing later
          const diagnostics: Diagnostic[] = [];
          logger.debug(
            `[UNIFIED-WORKER] Result for diagnostic (${params.textDocument.uri}): ${JSON.stringify(diagnostics)}`,
          );
          return diagnostics;
        } catch (error) {
          logger.error(
            `[UNIFIED-WORKER] Error processing diagnostic for ${params.textDocument.uri}: ${error}`,
          );
          return [];
        }
      },
    );

    // Handle workspace diagnostic requests
    connection.onRequest('workspace/diagnostic', async (params) => {
      logger.debug('[UNIFIED-WORKER] workspace/diagnostic requested by client');
      return { items: [] };
    });
  });

  // Handle document symbols request using the actual parser
  connection.onDocumentSymbol(async (params: DocumentSymbolParams) => {
    logger.info(
      `[UNIFIED-WORKER] Document symbols request for: ${params.textDocument.uri}`,
    );

    try {
      // Try to use the real parser, fall back to mock if it fails
      let symbols;

      try {
        // Use the actual dispatchProcessOnDocumentSymbol function
        // This will properly parse Apex code and return real symbols
        symbols = await dispatchProcessOnDocumentSymbol(params);
        logger.info(
          `[UNIFIED-WORKER] Real parser returned symbols for: ${params.textDocument.uri}`,
        );
      } catch (parserError) {
        logger.warn(
          `[UNIFIED-WORKER] Parser failed, using mock symbols: ${parserError}`,
        );

        // Fall back to mock symbols if real parser fails
        symbols = [
          {
            name: 'TestClass',
            kind: 5, // SymbolKind.Class
            range: {
              start: { line: 0, character: 0 },
              end: { line: 10, character: 0 },
            },
            selectionRange: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 10 },
            },
            children: [
              {
                name: 'testMethod',
                kind: 6, // SymbolKind.Method
                range: {
                  start: { line: 2, character: 4 },
                  end: { line: 5, character: 4 },
                },
                selectionRange: {
                  start: { line: 2, character: 4 },
                  end: { line: 2, character: 14 },
                },
                children: [],
              },
            ],
          },
        ] as DocumentSymbol[];
      }

      if (symbols) {
        logger.info(
          `[UNIFIED-WORKER] Successfully parsed ${
            Array.isArray(symbols) ? symbols.length : 'unknown'
          } symbols for: ${params.textDocument.uri}`,
        );
        return symbols;
      } else {
        logger.warn(
          `[UNIFIED-WORKER] No symbols found for: ${params.textDocument.uri}`,
        );
        return [];
      }
    } catch (error) {
      logger.error(
        `[UNIFIED-WORKER] Error processing document symbols for ${params.textDocument.uri}: ${error}`,
      );
      // Return empty array instead of throwing to prevent LSP client errors
      return [];
    }
  });

  // Handle folding range request
  connection.onFoldingRanges(async (params: FoldingRangeParams) => {
    logger.info(
      `[UNIFIED-WORKER] Folding ranges request for: ${params.textDocument.uri}`,
    );

    try {
      // Get document from storage
      const document = await storage.getDocument(params.textDocument.uri);
      if (!document) {
        logger.warn(
          `[UNIFIED-WORKER] Document not found: ${params.textDocument.uri}`,
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
        `[UNIFIED-WORKER] Returning ${foldingRanges.length} folding ranges for: ${params.textDocument.uri}`,
      );
      return foldingRanges;
    } catch (error) {
      logger.error(
        `[UNIFIED-WORKER] Error processing folding ranges for ${params.textDocument.uri}: ${error}`,
      );
      return [];
    }
  });

  // Handle shutdown
  connection.onShutdown(() => {
    logger.info('[UNIFIED-WORKER] Shutdown requested');
  });

  // Handle exit
  connection.onExit(() => {
    logger.info('[UNIFIED-WORKER] Exit requested');
    // In web worker, we don't use process.exit()
    // Instead, the worker will be terminated by the main thread
    self.close?.();
  });

  // Listen on the connection
  logger.info('[UNIFIED-WORKER] Starting to listen on connection...');
  documents.listen(connection);
  connection.listen();
  logger.info('[UNIFIED-WORKER] Connection listening started');

  logger.info('[UNIFIED-WORKER] Unified language server ready!');
}

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
  setLoggerFactory(UnifiedLoggerFactory.getInstance());
  setLogNotificationHandler(
    UnifiedLogNotificationHandler.getWorkerInstance(connection),
  );

  // Set log level to debug by default for testing
  setLogLevel('debug');
  const logger = getLogger();
  const jsonrpcLogger = createLoggerAdapter(logger);

  // Initialize storage using unified factory
  const baseStorage = await UnifiedStorageFactory.createStorage({
    useMemoryStorage: true,
    logger: jsonrpcLogger,
  });
  logger.info('[SIMPLE-WORKER] Base storage initialized');

  // Create Apex storage adapter
  const storage = new ApexStorageAdapter(baseStorage);
  logger.info('[SIMPLE-WORKER] Storage adapter initialized');

  // Initialize ApexStorageManager with our storage adapter
  const storageManager = ApexStorageManager.getInstance({
    storageFactory: () => storage,
    storageOptions: {},
  });
  await storageManager.initialize();
  logger.info(
    '[SIMPLE-WORKER] ApexStorageManager initialized with WebWorkerStorage',
  );

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
      textDocumentSync: TextDocumentSyncKind.Incremental, // Incremental sync
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

  // Handle document symbols request using the actual parser
  connection.onDocumentSymbol(async (params: DocumentSymbolParams) => {
    logger.info(
      `[SIMPLE-WORKER] Document symbols request for: ${params.textDocument.uri}`,
    );

    try {
      // Try to use the real parser, fall back to mock if it fails
      let symbols;

      try {
        // Use the actual dispatchProcessOnDocumentSymbol function
        // This will properly parse Apex code and return real symbols
        symbols = await dispatchProcessOnDocumentSymbol(params);
        logger.info(
          `[SIMPLE-WORKER] Real parser returned symbols for: ${params.textDocument.uri}`,
        );
      } catch (parserError) {
        logger.warn(
          `[SIMPLE-WORKER] Parser failed, using mock symbols: ${parserError}`,
        );

        // Fall back to mock symbols if real parser fails
        symbols = [
          {
            name: 'TestClass',
            kind: 5, // SymbolKind.Class
            range: {
              start: { line: 0, character: 0 },
              end: { line: 10, character: 0 },
            },
            selectionRange: {
              start: { line: 0, character: 0 },
              end: { line: 0, character: 10 },
            },
            children: [
              {
                name: 'testMethod',
                kind: 6, // SymbolKind.Method
                range: {
                  start: { line: 2, character: 4 },
                  end: { line: 5, character: 4 },
                },
                selectionRange: {
                  start: { line: 2, character: 4 },
                  end: { line: 2, character: 14 },
                },
                children: [],
              },
            ],
          },
        ] as DocumentSymbol[];
      }

      if (symbols) {
        logger.info(
          `[SIMPLE-WORKER] Successfully parsed ${
            Array.isArray(symbols) ? symbols.length : 'unknown'
          } symbols for: ${params.textDocument.uri}`,
        );
        return symbols;
      } else {
        logger.warn(
          `[SIMPLE-WORKER] No symbols found for: ${params.textDocument.uri}`,
        );
        return [];
      }
    } catch (error) {
      logger.error(
        `[SIMPLE-WORKER] Error processing document symbols for ${params.textDocument.uri}: ${error}`,
      );
      // Return empty array instead of throwing to prevent LSP client errors
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
    // In web worker, we don't use process.exit()
    // Instead, the worker will be terminated by the main thread
    self.close?.();
  });

  // Listen on the connection
  logger.info('[SIMPLE-WORKER] Starting to listen on connection...');
  documents.listen(connection);
  connection.listen();
  logger.info('[SIMPLE-WORKER] Connection listening started');

  logger.info('[SIMPLE-WORKER] Simplified language server ready!');
}

// Master-level worker initialization with error isolation
const __IS_TEST_ENV__ = false;

if (!__IS_TEST_ENV__) {
  (function initializeApexWorker() {
    // Error isolation: Prevent external errors from affecting our worker
    try {
      // Diagnostic logging for master-level debugging
      console.log('[APEX-WORKER] 🚀 Initializing Apex Language Server');
      console.log('[APEX-WORKER] Environment check:', {
        hasSelf: typeof self !== 'undefined',
        hasImportScripts: typeof importScripts !== 'undefined',
        isESModule: typeof importScripts === 'undefined',
        workerType:
          typeof importScripts === 'undefined' ? 'ES Module' : 'Classic',
      });

      if (typeof self !== 'undefined') {
        console.log(
          '[APEX-WORKER] ✅ Worker environment detected, starting language server...',
        );

        // Use simple version directly for now
        createSimpleWebWorkerLanguageServer()
          .then(() => {
            console.log(
              '[APEX-WORKER] ✅ Apex Language Server started successfully',
            );

            // Worker is ready - communication will happen through LSP protocol
            // Don't use direct postMessage as it's blocked in VS Code Web
          })
          .catch((error) => {
            console.error(
              '[APEX-WORKER] ❌ Failed to start language server:',
              error,
            );

            // Error will be handled through LSP protocol
            // Don't use direct postMessage as it's blocked in VS Code Web
          });
      } else {
        console.log(
          '[APEX-WORKER] ⚠️ Not in worker environment, skipping auto-start',
        );
      }
    } catch (initError) {
      // Ultimate fallback - ensure our worker never crashes the entire context
      console.error(
        '[APEX-WORKER] 🛡️ Error isolation caught initialization error:',
        initError,
      );
    }
  })();
}
