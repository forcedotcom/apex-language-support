/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';

import {
  setLoggerFactory,
  UniversalLoggerFactory,
} from '@salesforce/apex-lsp-shared';

import { LCSAdapter } from './LCSAdapter';

/**
 * Node.js-specific Apex Language Server initialization.
 *
 * This function handles the setup logic for Node.js server environments,
 * without requiring polyfills since it runs in native Node.js.
 */
export async function startApexNodeServer(): Promise<void> {
  // Create a connection for the server using Node.js IPC
  const connection = createConnection(ProposedFeatures.all);

  // Set up logging with connection
  const loggerFactory = UniversalLoggerFactory.getInstance();
  setLoggerFactory(loggerFactory);
  const logger = loggerFactory.createLogger(connection);

  // Initial lifecycle logs
  logger.info('🚀 Node.js server starting...');
  logger.info('🔧 Starting LCS integration...');

  // Create and initialize LCS adapter
  const lcsAdapter = new LCSAdapter({
    connection,
    logger: logger as any,
  });

  // Initialize the adapter (this will set up all handlers including initialization)
  await lcsAdapter.initialize();

  logger.info('✅ Apex Language Server (Node.js) ready!');
}
