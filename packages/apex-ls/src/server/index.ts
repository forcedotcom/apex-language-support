/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import { isWorkerEnvironment } from '../utils/EnvironmentDetector';
import type { UnifiedServerConfig } from './UnifiedApexLanguageServer';
import { ConnectionFactory } from './ConnectionFactory.browser';

/**
 * Creates a unified language server instance
 */
export async function createUnifiedLanguageServer(
  connection?: MessageConnection,
  worker?: Worker,
): Promise<void> {
  // Use provided connection or create one using ConnectionFactory
  const serverConnection = connection || (await createEnvironmentConnection(worker));

  // Initialize server
  const { UnifiedApexLanguageServer } = await import(
    './UnifiedApexLanguageServer'
  );
  const config: UnifiedServerConfig = {
    environment: isWorkerEnvironment() ? 'webworker' : 'browser',
    connection: serverConnection,
  };
  const server = new UnifiedApexLanguageServer(config);
  await server.initialize();
}

/**
 * Creates a connection appropriate for the current environment
 */
async function createEnvironmentConnection(worker?: Worker): Promise<MessageConnection> {
  if (isWorkerEnvironment()) {
    // Worker environment - will be handled by worker-specific build
    throw new Error('Worker implementation not available in browser build');
  }

  if (!worker) {
    throw new Error('Browser environment requires a worker instance');
  }

  // Browser environment - create connection to worker
  return ConnectionFactory.createBrowserConnection(worker);
}
