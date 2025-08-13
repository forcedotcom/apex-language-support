/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Web worker entry point for the Apex language server
// This file will be executed in a web worker context

// Web worker script starting

// Import the unified language server from apex-ls package
let startServer: any = null;
let PlatformAdapter: any = null;
let connection: any = null;

async function loadLanguageServer() {
  try {
    // Loading web-compatible apex-ls

    // Import the full apex-ls module instead of the minimal web version
    const apexLsModule = await import('@salesforce/apex-ls');

    startServer = apexLsModule.startServerSafe || apexLsModule.startServer;
    PlatformAdapter = apexLsModule.PlatformAdapter;

    // Successfully imported apex-ls

    return true;
  } catch (error) {
    console.error('Failed to load apex-ls:', error);
    return false;
  }
}

// Web worker global scope
declare const self: {
  postMessage(message: any): void;
  onmessage: ((ev: any) => any) | null;
  onerror: ((ev: any) => any) | null;
  onunhandledrejection: ((ev: any) => any) | null;
  close(): void;
  data?: any;
};

/**
 * Initialize the language server in web worker context
 */
async function initializeLanguageServer() {
  try {
    // Initialize language server

    const loaded = await loadLanguageServer();

    if (!loaded || !startServer) {
      throw new Error('Failed to load language server');
    }

    // Clear any existing onmessage handler to let WebConnection take over
    console.log('Clearing self.onmessage to let WebConnection take over');
    self.onmessage = null;

    // Start the language server (this will start the full language server)
    console.log('Starting language server...');
    connection = await startServer();

    console.log('Language server connection initialized:', !!connection);
    console.log('Language server connection type:', typeof connection);

    // Send ready signal to the extension
    self.postMessage({
      type: 'ready',
      message: 'Language server is ready to accept requests',
    });
  } catch (error: any) {
    console.error('Failed to initialize Apex Language Server:', error);
    // Notify the main thread about the error
    self.postMessage({
      type: 'error',
      error:
        error instanceof Error
          ? error.message
          : 'Unknown error during initialization',
    });
  }
}

// Document symbols are now handled by the full language server via proper LSP communication

// The WebConnection handles LSP messages automatically.
// We just need to avoid interfering with the message flow.

/**
 * Handle direct document symbol request bypassing LSP
 */
async function handleDirectDocumentSymbol(data: any, requestId: string) {
  console.log('handleDirectDocumentSymbol called with:', data);

  try {
    if (!data || !data.content) {
      throw new Error('No document content provided');
    }

    // Import the necessary components for document symbol processing
    const { DefaultApexDocumentSymbolProvider, ApexStorage } = await import(
      '@salesforce/apex-lsp-compliant-services'
    );

    const { TextDocument } = await import('vscode-languageserver-textdocument');

    console.log('Successfully imported required modules');

    // Create a TextDocument from the content
    const textDocument = TextDocument.create(
      data.uri,
      data.languageId || 'apex',
      1,
      data.content,
    );

    // Get storage instance and add the document
    const storage = ApexStorage.getInstance();
    await storage.setDocument(data.uri, textDocument);

    console.log('Created TextDocument and added to storage');

    // Create the document symbol provider
    const symbolProvider = new DefaultApexDocumentSymbolProvider(storage);

    // Create the params object expected by the provider
    const params = {
      textDocument: {
        uri: data.uri,
      },
    };

    console.log('Calling document symbol provider with params:', params);

    // Call the document symbol provider directly
    const result = await symbolProvider.provideDocumentSymbols(params);

    console.log('Document symbol provider returned:', result);

    // Send the result back to the extension
    self.postMessage({
      type: 'directDocumentSymbolResponse',
      id: requestId,
      symbols: result,
    });

    console.log('Sent response back to extension');
  } catch (error) {
    console.error('Error in handleDirectDocumentSymbol:', error);
    self.postMessage({
      type: 'directDocumentSymbolResponse',
      id: requestId,
      error: error instanceof Error ? error.message : String(error),
      symbols: [],
    });
  }
}

// Handle messages from the main thread
// We only handle extension-specific messages, not LSP messages
let workerInitialized = false;

function handleExtensionMessage(event: any) {
  const message = event.data;

  console.log(
    'Worker handleExtensionMessage called with:',
    JSON.stringify(message, null, 2),
  );

  // Only handle non-LSP messages
  if (message.jsonrpc === '2.0' || message.method) {
    // This is an LSP message - don't interfere
    console.log('Worker: Detected LSP message, ignoring in extension handler');
    return;
  }

  // Handle custom extension messages
  console.log('Worker received custom message:', message);
  const { type, data } = message;

  switch (type) {
    case 'initialize':
      if (workerInitialized) {
        console.log('Worker already initialized, skipping');
        return;
      }

      console.log('Initializing language server from extension message');
      workerInitialized = true;

      // Set up environment variables from the received data
      if (data && data.serverMode) {
        (globalThis as any).APEX_LS_MODE = data.serverMode;
      }

      if (data && data.logLevel) {
        (globalThis as any).APEX_LS_LOG_LEVEL = data.logLevel;
      }

      // Initialize the language server
      setTimeout(async () => {
        await initializeLanguageServer();
      }, 100); // Small delay to ensure message handling is complete
      break;
    case 'directDocumentSymbol':
      // Handle direct document symbol request
      handleDirectDocumentSymbol(data, message.id);
      break;
    case 'shutdown':
      // Handle shutdown requests
      self.close();
      break;
    default:
      // Other messages ignored
      console.log(`Unknown message type: ${type}`);
      break;
  }
}

// Use onmessage instead of addEventListener to avoid conflicts
self.onmessage = handleExtensionMessage;

// Handle worker errors
self.onerror = (error: any) => {
  console.error('Web worker error:', error);
  self.postMessage({
    type: 'error',
    error: error.message || 'Unknown web worker error',
  });
};

self.onunhandledrejection = (event: any) => {
  console.error('Unhandled promise rejection in web worker:', event.reason);
  self.postMessage({
    type: 'error',
    error: event.reason?.message || 'Unhandled promise rejection',
  });
};

// Pre-load language server module (don't start the server yet)
loadLanguageServer().catch((error) => {
  console.error('Failed to pre-load language server:', error);
});

// Notify extension that worker is ready to receive initialization
self.postMessage({
  type: 'ready',
  message: 'Web worker is ready for initialization',
});

// Language server will be initialized when we receive the initialize message from the extension
