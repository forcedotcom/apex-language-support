/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { PlatformAdapter } from './utils/PlatformAdapter';
import { createWebConnection } from './protocol/web-connection';
import {
  InitializeParams,
  InitializeResult,
  DocumentSymbolParams,
  SymbolInformation,
  SymbolKind,
  FoldingRangeParams,
  FoldingRange,
  MessageType,
} from './protocol/lsp-types';

/**
 * Minimal web-compatible Apex Language Server
 * This version has no Node.js dependencies and focuses on basic functionality
 */
export function startMinimalWebServer() {
  // Create web-compatible connection
  const connection = createWebConnection();

  // Set up basic initialization
  connection.onInitialize((params: InitializeParams): InitializeResult => {
    return {
      capabilities: {
        documentSymbolProvider: true,
        foldingRangeProvider: true,
        textDocumentSync: 1, // Full sync
      },
    };
  });

  connection.onInitialized(() => {
    connection.sendNotification('window/showMessage', {
      type: MessageType.Info,
      message: 'Apex Language Server is ready',
    });
  });

  // Handle document symbols with mock data
  connection.onDocumentSymbol((params: DocumentSymbolParams) => {
    // Return mock symbols for testing
    const symbols: SymbolInformation[] = [
      {
        name: 'TestClass',
        kind: SymbolKind.Class,
        location: {
          uri: params.textDocument.uri,
          range: {
            start: { line: 0, character: 0 },
            end: { line: 10, character: 0 },
          },
        },
      },
      {
        name: 'testMethod',
        kind: SymbolKind.Method,
        location: {
          uri: params.textDocument.uri,
          range: {
            start: { line: 2, character: 4 },
            end: { line: 8, character: 4 },
          },
        },
        containerName: 'TestClass',
      },
    ];

    return symbols;
  });

  // Handle folding ranges with mock data
  connection.onFoldingRanges((params: FoldingRangeParams) => {
    // Return mock folding ranges
    const ranges: FoldingRange[] = [
      {
        startLine: 0,
        endLine: 10,
        kind: 'region',
      },
      {
        startLine: 2,
        endLine: 8,
        kind: 'region',
      },
    ];

    return ranges;
  });

  // Handle basic requests
  connection.onRequest('apexlib/resolve', async (params) => {
    return { content: '// Mock resolved content', uri: params.uri };
  });

  connection.onRequest('$/ping', async () => {
    return {
      message: 'pong',
      timestamp: new Date().toISOString(),
      server: 'apex-ls-minimal-web',
      environment: 'browser',
    };
  });

  // Handle shutdown
  connection.onShutdown(() => {
    // Clean shutdown
  });

  connection.onExit(() => {
    // Clean exit
  });

  // Start listening
  connection.listen();

  return connection;
}

/**
 * Export PlatformAdapter for compatibility
 */
export { PlatformAdapter };

/**
 * Safe start function that creates PlatformAdapter internally
 */
export function startServerSafe() {
  const environment = 'browser';
  const platformAdapter = new PlatformAdapter(environment);
  platformAdapter.initializeLogging();

  return startMinimalWebServer();
}

export default startMinimalWebServer;
