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

import { getWorkerSelf } from '../../utils/EnvironmentUtils';

/**
 * Shared web worker initialization for Apex Language Server.
 *
 * This function handles the common setup logic for both standard and web-specific
 * worker environments, including polyfill setup, environment validation,
 * connection creation, and LCS adapter initialization.
 */
export async function startApexWebWorker(): Promise<void> {
  try {
    // Set up Node.js polyfills as globals immediately
    (globalThis as any).process = processPolyfill;
    (globalThis as any).Buffer = Buffer;
    (globalThis as any).global = globalThis;

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
    setLogLevel('debug'); // Enable debug logging for the worker
    const loggerFactory = UniversalLoggerFactory.getInstance();
    loggerFactory.setConnection(connection); // Set connection on factory so all loggers have it
    setLoggerFactory(loggerFactory); // Set factory BEFORE creating logger
    const logger = loggerFactory.createLogger(connection);

    // Initial lifecycle logs
    logger.info('🚀 Worker script loading...');
    logger.info('🔧 Starting Lazy LSP Server...');

    // Use lazy loading server for faster startup
    const { LazyLSPServer } = await import('../../server/LazyLSPServer');

    // Create lazy LSP server (starts immediately with basic capabilities)
    const _lazyServer = new LazyLSPServer(connection, logger as any);

    logger.info(
      '✅ Apex Language Server Worker ready! (Advanced features loading in background)',
    );
  } catch (error) {
    console.error('❌ [WORKER] Error during startup:', error);
    throw error;
  }
}
