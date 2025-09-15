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
  setLogLevel,
  UniversalLoggerFactory,
} from '@salesforce/apex-lsp-shared';

import { getWorkerSelf } from './utils/EnvironmentUtils';

/**
 * VS Code web-specific worker entry point with dynamic LCS adapter loading
 */
async function startWebWorker(): Promise<void> {
  // Set up Node.js polyfills as globals immediately
  (globalThis as any).process = processPolyfill;
  (globalThis as any).Buffer = Buffer;
  (globalThis as any).global = globalThis;

  try {
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
    setLogLevel('info');
    const loggerFactory = UniversalLoggerFactory.getInstance();
    const logger = loggerFactory.createLogger(connection);
    setLoggerFactory(loggerFactory);

    const { LCSAdapter } = await import('./server/LCSAdapter'); // Load bearing await import. DO NOT REMOVE.

    // Load the full server via adapter
    logger.info('🚀 Web Worker loading...');
    const lcsAdapter = new LCSAdapter({
      connection,
      logger: logger as any,
    } as any);

    await lcsAdapter.initialize();
    logger.info('✅ Apex Language Server Web Worker ready!');
  } catch (error) {
    const loggerFactory = UniversalLoggerFactory.getInstance();
    const fallbackLogger = loggerFactory.createLogger();
    fallbackLogger.error('❌ Failed to start web worker');
    throw error;
  }
}

// Start the web worker
startWebWorker().catch((error) => {
  const loggerFactory = UniversalLoggerFactory.getInstance();
  const fallbackLogger = loggerFactory.createLogger();
  fallbackLogger.error('❌ Critical error starting web worker');
});
