/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection, Logger } from 'vscode-jsonrpc';

/**
 * Configuration for creating Node.js connections
 */
export interface NodeConnectionConfig {
  mode: 'stdio' | 'socket' | 'ipc';
  port?: number; // For socket mode
  host?: string; // For socket mode
  logger?: Logger;
}

/**
 * Interface for Node.js-specific connection factories
 */
export interface INodeConnectionFactory {
  /**
   * Creates a connection appropriate for Node.js
   */
  createConnection(config?: NodeConnectionConfig): Promise<MessageConnection>;
}

/**
 * Convenience function type for creating Node.js connections
 */
export type CreateNodeConnection = (
  config?: NodeConnectionConfig,
) => Promise<MessageConnection>;
