/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import { isWorkerEnvironment } from '../utils/EnvironmentDetector';
import type { ServerConfig } from './ApexLanguageServer';
import { ConnectionFactory } from './ConnectionFactory';

/**
 * Creates a language server instance for worker environment
 */
export async function createLanguageServer(
  connection?: MessageConnection,
): Promise<void> {
  // Use provided connection or create one using ConnectionFactory
  const serverConnection = connection || (await createEnvironmentConnection());

  // Initialize server
  const { ApexLanguageServer } = await import('./ApexLanguageServer');
  const config: ServerConfig = {
    environment: 'webworker',
    connection: serverConnection,
  };
  const server = new ApexLanguageServer(config);
  await server.initialize();
}

/**
 * Creates a connection appropriate for the worker environment
 */
async function createEnvironmentConnection(): Promise<MessageConnection> {
  if (!isWorkerEnvironment()) {
    throw new Error('Worker server can only run in worker environment');
  }

  // Worker environment - create connection using worker factory
  return ConnectionFactory.createWorkerConnection();
}
