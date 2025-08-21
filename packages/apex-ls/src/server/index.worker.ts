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
import { ConnectionFactory } from './ConnectionFactory';

/**
 * Creates a unified language server instance for worker environment
 */
export async function createUnifiedLanguageServer(
  connection?: MessageConnection,
): Promise<void> {
  // Use provided connection or create one using ConnectionFactory
  const serverConnection = connection || (await createEnvironmentConnection());

  // Initialize server
  const { UnifiedApexLanguageServer } = await import(
    './UnifiedApexLanguageServer'
  );
  const config: UnifiedServerConfig = {
    environment: 'webworker',
    connection: serverConnection,
  };
  const server = new UnifiedApexLanguageServer(config);
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