/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Full LCS web worker for VS Code web environments
// This version runs complete LCS integration with proper polyfills

// ESM imports - grouped by source
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

import { setupWebWorkerPolyfills } from './utils/webWorkerPolyfills';

// Initialize polyfills early in the worker lifecycle
setupWebWorkerPolyfills();

/**
 * Full LCS web worker entry point for VS Code web
 * Runs complete LCS integration with optimized bundle
 */
async function startWebWorker(): Promise<void> {
  try {
    // Create a connection for the server using type-safe worker context
    const { getWorkerSelf } = require('./utils/EnvironmentUtils');
    const workerSelf = getWorkerSelf();
    if (!workerSelf) {
      throw new Error('Worker context not available');
    }

    const connection = createConnection(
      new BrowserMessageReader(workerSelf),
      new BrowserMessageWriter(workerSelf),
    );

    // Set up logging with connection
    setLogLevel('info');
    const loggerFactory = UniversalLoggerFactory.getInstance();
    const logger = loggerFactory.createLogger(connection);
    setLoggerFactory(loggerFactory);

    // Send initial log messages
    logger.info('🚀 Full LCS Web Worker loading...');
    logger.info('✅ Connection created');

    // Load the full LCS adapter
    logger.info('🔧 Loading full LCS integration...');
    const { LCSAdapter } = await import('./server/LCSAdapter');

    const lcsAdapter = new LCSAdapter({
      connection,
      logger: logger as any,
    } as any);

    await lcsAdapter.initialize();
    logger.info('✅ Full LCS Adapter loaded successfully');

    logger.info('✅ Apex Language Server Web Worker ready!');
  } catch (_error) {
    console.error('❌ Failed to start web worker:', _error);
    throw _error;
  }
}

// Start the web worker
startWebWorker().catch((_error) => {
  console.error('❌ Critical error starting web worker:', _error);
});
