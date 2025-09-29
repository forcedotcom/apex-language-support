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
  try {
    // console.log('🔧 [WORKER] Starting web worker initialization...');

    // Set up Node.js polyfills as globals immediately
    (globalThis as any).process = processPolyfill;
    (globalThis as any).Buffer = Buffer;
    (globalThis as any).global = globalThis;
    // console.log('✅ [WORKER] Polyfills set up');

    // Create a connection for the server using type-safe worker context
    const workerSelf = getWorkerSelf();
    if (!workerSelf) {
      throw new Error('Worker context not available');
    }
    // console.log('✅ [WORKER] Worker context obtained');

    const connection = createConnection(
      new BrowserMessageReader(workerSelf),
      new BrowserMessageWriter(workerSelf),
    );
    // console.log('✅ [WORKER] Connection created');

    // Set up logging with connection
    const loggerFactory = UniversalLoggerFactory.getInstance();
    setLoggerFactory(loggerFactory); // Set factory BEFORE creating logger
    const logger = loggerFactory.createLogger(connection);
    // console.log('✅ [WORKER] Logger created');

    // Initial lifecycle logs
    logger.info('🚀 Worker script loading...');
    logger.info('🔧 Starting Lazy LSP Server...');
    // console.log('📞 [WORKER] Logger created and sending first messages...');

    // Use lazy loading server for faster startup
    // console.log('🔄 [WORKER] Importing LazyLSPServer...');
    const { LazyLSPServer } = await import('./LazyLSPServer');
    // console.log('✅ [WORKER] LazyLSPServer imported');

    // Create lazy LSP server (starts immediately with basic capabilities)
    // console.log('🚀 [WORKER] Creating LazyLSPServer instance...');
    const _lazyServer = new LazyLSPServer(connection, logger as any);
    // console.log('✅ [WORKER] LazyLSPServer created');

    logger.info(
      '✅ Apex Language Server Worker ready! (Advanced features loading in background)',
    );
    // console.log('🎉 [WORKER] Web worker startup completed successfully');
  } catch (error) {
    console.error('❌ [WORKER] Error during startup:', error);
    throw error;
  }
}
