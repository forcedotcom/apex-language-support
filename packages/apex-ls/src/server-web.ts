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

  // Validate that the web worker environment is properly configured
  const hasProcess = typeof globalThis.process !== 'undefined';
  const hasBuffer = typeof globalThis.Buffer !== 'undefined';

  if (!hasProcess || !hasBuffer) {
    console.error('[APEX-WORKER] Environment validation failed:', {
      process: hasProcess,
      Buffer: hasBuffer,
    });
    throw new Error('Web worker environment validation failed');
  }

  console.log('[APEX-WORKER] Environment validation successful');
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
  } catch (_error) {
    console.error('❌ Failed to start web worker:', _error);
    throw _error;
  }
}

// Start the web worker
startWebWorker().catch((_error) => {
  console.error('❌ Critical error starting web worker:', _error);
});
