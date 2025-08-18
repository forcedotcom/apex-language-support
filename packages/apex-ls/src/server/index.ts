/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ConnectionFactory } from './ConnectionFactory';
import { UnifiedApexLanguageServer } from './UnifiedApexLanguageServer';
import type { EnvironmentType } from '../types';

/**
 * Options for starting the language server
 */
export interface ServerStartOptions {
  environment?: EnvironmentType;
  commandLineArgs?: string[];
  enableNodeFeatures?: boolean;
}

/**
 * Starts the unified Apex Language Server
 *
 * This function can be called from:
 * - Node.js environments (CLI, VSCode extension)
 * - Web Worker environments (Browser extension)
 * - Test environments
 */
export async function startUnifiedServer(
  options: ServerStartOptions = {},
): Promise<UnifiedApexLanguageServer> {
  const {
    environment: providedEnvironment,
    commandLineArgs = typeof process !== 'undefined' ? process.argv : [],
    enableNodeFeatures,
  } = options;

  // Auto-detect environment if not provided
  const { connection, environment } = providedEnvironment
    ? {
        connection: await ConnectionFactory.createConnection({
          environment: providedEnvironment,
          commandLineArgs,
        }),
        environment: providedEnvironment,
      }
    : await ConnectionFactory.createAutoConnection(commandLineArgs);

  // Determine if Node.js features should be enabled
  const shouldEnableNodeFeatures = enableNodeFeatures ?? environment === 'node';

  // Create and initialize the unified server
  const server = new UnifiedApexLanguageServer({
    environment,
    connection,
    enableNodeFeatures: shouldEnableNodeFeatures,
  });

  await server.initialize();

  return server;
}

/**
 * Legacy function for Node.js compatibility
 *
 * This provides the unified server functionality
 */
export function startServer(): Promise<UnifiedApexLanguageServer> {
  return startUnifiedServer({
    environment: 'node',
    commandLineArgs: process.argv,
    enableNodeFeatures: true,
  });
}

/**
 * Web Worker entry point
 *
 * This replaces the createSimpleWebWorkerLanguageServer() function
 */
export function createUnifiedWebWorkerLanguageServer(): Promise<UnifiedApexLanguageServer> {
  return startUnifiedServer({
    environment: 'webworker',
    enableNodeFeatures: false,
  });
}

// Export server classes for advanced usage
export { UnifiedApexLanguageServer } from './UnifiedApexLanguageServer';
export { ConnectionFactory } from './ConnectionFactory';

// Auto-start in appropriate environments (disabled during Jest tests)
const isTestEnv =
  typeof process !== 'undefined' && !!process.env.JEST_WORKER_ID;

if (!isTestEnv && typeof require !== 'undefined' && require.main === module) {
  // Node.js CLI execution
  startServer().catch((error) => {
    console.error('Failed to start Apex Language Server:', error);
    process.exit(1);
  });
} else if (
  !isTestEnv &&
  typeof self !== 'undefined' &&
  typeof window === 'undefined'
) {
  // Web Worker execution
  createUnifiedWebWorkerLanguageServer()
    .then(() => {
      console.log('Unified Apex Language Server started in web worker');

      // Send ready signal to parent
      if (typeof self.postMessage === 'function') {
        self.postMessage({
          type: 'apex-worker-ready',
          timestamp: new Date().toISOString(),
          server: 'apex-ls-unified',
          capabilities: ['documentSymbols', 'foldingRanges', 'diagnostics'],
        });
      }
    })
    .catch((error) => {
      console.error(
        'Failed to start Apex Language Server in web worker:',
        error,
      );

      // Send error signal to parent
      if (typeof self.postMessage === 'function') {
        self.postMessage({
          type: 'apex-worker-error',
          error: error.message,
          timestamp: new Date().toISOString(),
          server: 'apex-ls-unified',
        });
      }
    });
}
