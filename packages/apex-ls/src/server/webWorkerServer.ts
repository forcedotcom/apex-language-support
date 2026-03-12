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
    throw new Error('Worker context not available');
  }

  // Sanitize LSP messages to strip non-cloneable values (functions, etc.).
  // postMessage uses structured clone which fails on functions; LSP is JSON-based.
  const origPostMessage = workerSelf.postMessage.bind(workerSelf);
  workerSelf.postMessage = function (msg: unknown, transfer?: Transferable[]) {
    let sanitized = msg;
    if (msg && typeof msg === 'object') {
      try {
        sanitized = JSON.parse(JSON.stringify(msg));
      } catch {
        // Fallback to original if sanitization fails
      }
    }
    origPostMessage(sanitized, transfer);
  };

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
    onExit: () => self.close(),
    getHeapUsedBytes: async () => {
      try {
        if (
          typeof performance !== 'undefined' &&
          'measureUserAgentSpecificMemory' in performance
        ) {
          const result = await (
            performance as unknown as {
              measureUserAgentSpecificMemory: () => Promise<{ bytes: number }>;
            }
          ).measureUserAgentSpecificMemory();
          return result.bytes;
        }
      } catch {
        // API unavailable or failed
      }
      return null;
    },
  });

  connection.listen();

  logger.info('✅ Apex Language Server Worker ready!');
}
