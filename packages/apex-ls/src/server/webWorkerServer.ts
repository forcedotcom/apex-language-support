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
  // Set up some Node.js polyfills as globals immediately
  (globalThis as any).process = processPolyfill;
  (globalThis as any).Buffer = Buffer;
  (globalThis as any).global = globalThis;

  // Create a connection for the server using type-safe worker context
  const workerSelf = getWorkerSelf();
  if (!workerSelf) {
    console.error('🔧 DEBUG WORKER: Worker context not available!');
    throw new Error('Worker context not available');
  }

  const connection = createConnection(
    new BrowserMessageReader(workerSelf),
    new BrowserMessageWriter(workerSelf),
  );

  // Set up logging with connection
  const loggerFactory = UniversalLoggerFactory.getInstance();
  setLoggerFactory(loggerFactory); // Set factory BEFORE creating logger
  const logger = loggerFactory.createLogger(connection);

  // Initial lifecycle logs
  logger.info('🚀 Worker script loading...');
  logger.info('🔧 Starting LCS integration...');

  // Create and initialize LCS adapter
  const { LCSAdapter } = await import('./LCSAdapter');

  await LCSAdapter.create({
    connection,
    logger,
  });

  connection.listen();

  logger.info('✅ Apex Language Server Worker ready!');
}
