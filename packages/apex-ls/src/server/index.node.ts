/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import { isNodeEnvironment } from '../utils/EnvironmentDetector.node';
import type { ServerConfig } from './ApexLanguageServer.node';
import type { NodeConnectionConfig } from './ConnectionFactoryInterface.node';

/**
 * Creates a language server instance for Node.js environment
 */
export async function createLanguageServer(
  connection?: MessageConnection,
  nodeConfig?: NodeConnectionConfig,
): Promise<void> {
  if (!isNodeEnvironment()) {
    throw new Error('Node.js server can only run in Node.js environment');
  }

  // Use provided connection or create one using NodeConnectionFactory
  const serverConnection =
    connection || (await createEnvironmentConnection(nodeConfig));

  // Initialize server
  const { ApexLanguageServer } = await import('./ApexLanguageServer.node');
  const config: ServerConfig = {
    environment: 'node',
    connection: serverConnection,
  };
  const server = new ApexLanguageServer(config);
  await server.initialize();
}

/**
 * Creates a connection appropriate for the Node.js environment
 */
async function createEnvironmentConnection(
  nodeConfig?: NodeConnectionConfig,
): Promise<MessageConnection> {
  const { createNodeConnection } = await import('./NodeConnectionFactory');

  return createNodeConnection(nodeConfig);
}

/**
 * Main entry point for Node.js language server
 * Automatically detects connection mode and starts the server
 */
export async function main(): Promise<void> {
  try {
    // Default to stdio for command-line usage
    await createLanguageServer();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to start Apex Language Server: ${errorMessage}`);
    process.exit(1);
  }
}

// Auto-start if this file is run directly
if (require.main === module) {
  main().catch((error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Fatal error: ${errorMessage}`);
    process.exit(1);
  });
}
