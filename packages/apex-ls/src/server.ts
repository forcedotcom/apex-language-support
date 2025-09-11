/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// VS Code web extension worker following the standard pattern
import {
  createConnection,
  BrowserMessageReader,
  BrowserMessageWriter,
} from 'vscode-languageserver/browser';

import {
  setLoggerFactory,
  setLogLevel,
  UniversalLoggerFactory,
} from '@salesforce/apex-lsp-shared';

import { LCSAdapter } from './server/LCSAdapter';
import { setupWebWorkerPolyfills } from './utils/webWorkerPolyfills';
import { getWorkerSelf } from './utils/EnvironmentUtils';

/**
 * Main worker entry point with LCS integration
 */
async function startServer(): Promise<void> {
  // Initialize polyfills early in the worker lifecycle
  await setupWebWorkerPolyfills();
  // Create a connection for the server using type-safe worker context
  const workerSelf = getWorkerSelf();
  if (!workerSelf) {
    throw new Error('Worker context not available');
  }

  const connection = createConnection(
    new BrowserMessageReader(workerSelf),
    new BrowserMessageWriter(workerSelf),
  );

  // Set up logging with connection
  setLogLevel('info'); // Enable info level logs to see worker messages
  const loggerFactory = UniversalLoggerFactory.getInstance();
  const logger = loggerFactory.createLogger(connection);
  setLoggerFactory(loggerFactory);

  // Send initial log messages
  logger.info('🚀 Worker script loading...');
  logger.info('✅ Connection created');
  logger.info('🔧 Starting LCS integration...');

  // Create and initialize LCS adapter
  const lcsAdapter = new LCSAdapter({
    connection,
    logger: logger as any,
  });

  // Initialize the adapter (this will set up all handlers and start listening)
  await lcsAdapter.initialize();

  logger.info('🎧 Connection listening started');
  logger.info('✅ Apex Language Server Worker with LCS ready!');
}

// Start the server
startServer().catch((_error) => {
  console.error('❌ Critical error starting server:', _error);
  // Exit with error code to indicate failure
  process.exit(1);
});
