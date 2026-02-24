/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  createConnection,
  ProposedFeatures,
} from 'vscode-languageserver/lib/node/main';

import {
  setLoggerFactory,
  UniversalLoggerFactory,
  LoggerInterface,
  initializeTracing,
} from '@salesforce/apex-lsp-shared';
import { NodeSdkLayerFor } from '@salesforce/apex-lsp-shared/observability/spansNode';

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
  const logger: LoggerInterface = loggerFactory.createLogger(connection);

  // Initial lifecycle logs
  logger.info('🚀 Node.js server starting...');
  logger.info('🔧 Starting LCS integration...');

  // Initialize Node.js tracing if any exporter is configured
  try {
    const appInsightsConnectionString =
      process?.env?.APEX_LSP_APP_INSIGHTS_CONNECTION_STRING;
    const localTracingEnabled = process?.env?.APEX_LSP_LOCAL_TRACING === 'true';
    const consoleTracingEnabled =
      process?.env?.APEX_LSP_CONSOLE_TRACING === 'true';

    if (
      appInsightsConnectionString ||
      localTracingEnabled ||
      consoleTracingEnabled
    ) {
      const layer = NodeSdkLayerFor({
        extensionName: 'apex-language-server',
        extensionVersion: '1.0.0',
        appInsightsConnectionString,
        localTracingEnabled,
        consoleTracingEnabled,
      });
      initializeTracing(layer);
      logger.info('✅ Node.js telemetry initialized');
    }
  } catch (error) {
    logger.error(`Failed to initialize telemetry: ${error}`);
  }

  // Create and initialize LCS adapter in one step
  await LCSAdapter.create({
    connection,
    logger,
  });

  connection.listen();
  logger.info('✅ Apex Language Server (Node.js) ready!');
}
