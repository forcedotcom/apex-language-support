/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import processPolyfill from 'process';
import { Buffer } from 'buffer';

import {
  createConnection,
  BrowserMessageReader,
  BrowserMessageWriter,
} from 'vscode-languageserver/browser';

import {
  setLoggerFactory,
  UniversalLoggerFactory,
} from '@salesforce/apex-lsp-shared';

import { getWorkerSelf } from '../utils/EnvironmentUtils';

/**
 * Shared web worker initialization for Apex Language Server.
 *
 * This function handles the common setup logic for both standard and web-specific
 * worker environments, including polyfill setup, environment validation,
 * connection creation, and LCS adapter initialization.
 */
export async function startApexWebWorker(): Promise<void> {
  console.log('🔧 DEBUG WORKER: startApexWebWorker() called');

  // Set up Node.js polyfills as globals immediately
  console.log('🔧 DEBUG WORKER: Setting up polyfills');
  (globalThis as any).process = processPolyfill;
  (globalThis as any).Buffer = Buffer;
  (globalThis as any).global = globalThis;
  console.log('🔧 DEBUG WORKER: Polyfills set up successfully');

  // Create a connection for the server using type-safe worker context
  console.log('🔧 DEBUG WORKER: Getting worker self');
  const workerSelf = getWorkerSelf();
  if (!workerSelf) {
    console.error('🔧 DEBUG WORKER: Worker context not available!');
    throw new Error('Worker context not available');
  }
  console.log('🔧 DEBUG WORKER: Worker self obtained:', typeof workerSelf);

  console.log('🔧 DEBUG WORKER: Creating connection');
  const connection = createConnection(
    new BrowserMessageReader(workerSelf),
    new BrowserMessageWriter(workerSelf),
  );
  console.log('🔧 DEBUG WORKER: Connection created successfully');

  // Check if our message handler was overridden
  console.log(
    '🔧 DEBUG WORKER: Checking if message handler is still our test handler',
  );
  console.log(
    '🔧 DEBUG WORKER: Current onmessage handler:',
    typeof workerSelf.onmessage,
  );

  // Set up logging with connection
  console.log('🔧 DEBUG WORKER: Setting up logging');
  const loggerFactory = UniversalLoggerFactory.getInstance();
  setLoggerFactory(loggerFactory); // Set factory BEFORE creating logger
  const logger = loggerFactory.createLogger(connection);
  console.log('🔧 DEBUG WORKER: Logger created');

  // Initial lifecycle logs
  logger.info('🚀 Worker script loading...');
  logger.info('🔧 Starting Lazy LSP Server...');
  console.log('🔧 DEBUG WORKER: Initial logs sent');

  // Use lazy loading server for faster startup and proper connection management
  console.log('🔧 DEBUG WORKER: Importing LazyLSPServer');
  const { LazyLSPServer } = await import('./LazyLSPServer');
  console.log('🔧 DEBUG WORKER: LazyLSPServer imported successfully');

  // Create lazy LSP server (starts immediately with basic capabilities)
  // This architecture prevents connection conflicts with desktop debugging
  console.log('🔧 DEBUG WORKER: Creating LazyLSPServer instance');
  new LazyLSPServer(connection, logger as any);
  console.log('🔧 DEBUG WORKER: LazyLSPServer instance created');

  logger.info(
    '✅ Apex Language Server Worker ready! (Advanced features loading in background)',
  );
  console.log('🔧 DEBUG WORKER: Worker initialization completed successfully');
}
