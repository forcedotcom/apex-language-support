/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Web Worker for Apex Language Server
 * This worker runs the language server in a web worker context
 * and communicates with the main extension using standard LSP protocol
 */

// Web worker global scope
declare const self: {
  postMessage(message: any): void;
  addEventListener(type: string, listener: (event: any) => void): void;
  onmessage: ((ev: any) => any) | null;
  onerror: ((ev: any) => any) | null;
  onunhandledrejection: ((ev: any) => any) | null;
  close(): void;
  data?: any;
};

// Import the unified language server from apex-ls package
let startServer: any = null;
let startServerInWebContainer: any = null;
let connection: any = null;

async function loadLanguageServer() {
  try {
    // Loading web-compatible apex-ls

    // Import the web-specific apex-ls module
    const apexLsModule = await import('@salesforce/apex-ls/web');

    startServer =
      apexLsModule.startServerSafe || apexLsModule.startMinimalWebServer;
    startServerInWebContainer = apexLsModule.startMinimalWebServer; // Use minimal web server for WebContainer too

    // Successfully imported apex-ls
    return true;
  } catch (error) {
    console.error('Failed to load apex-ls:', error);
    return false;
  }
}

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

    // Check if we're in a WebContainer environment and use appropriate server
    if (
      startServerInWebContainer &&
      typeof (globalThis as any).WebContainer !== 'undefined'
    ) {
      console.log('Starting language server in WebContainer mode...');
      connection = await startServerInWebContainer();
    } else {
      // Start the language server (this will start the full language server)
      console.log('Starting language server in standard mode...');
      connection = await startServer();
    }

    console.log('Language server connection initialized:', !!connection);
    console.log('Language server connection type:', typeof connection);

    // Send LSP notification that server is ready
    // Note: This is handled by the language server's onInitialized callback
    // which sends a window/showMessage notification
  } catch (error: any) {
    console.error('Failed to initialize Apex Language Server:', error);
    // Send LSP error notification
    self.postMessage({
      jsonrpc: '2.0',
      method: 'window/showMessage',
      params: {
        type: 1, // Error
        message: `Failed to initialize Apex Language Server: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      },
    });
  }
}

/**
 * Handle extension messages (non-LSP communication)
 * This is only used for initialization and setup
 */
function handleExtensionMessage(event: any) {
  const message = event.data;

  console.log('Worker handleExtensionMessage called with:', message);

  if (message && message.type === 'initialize') {
    console.log('Worker received custom message:', message);
    console.log('Initializing language server from extension message');
    initializeLanguageServer();
  }
}

// Set up message handling for extension communication
self.addEventListener('message', handleExtensionMessage);

// Document symbols are now handled entirely through standard LSP protocol
// The WebConnection handles all LSP messages automatically
// No custom message handling needed for document symbols
