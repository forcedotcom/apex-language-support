/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';

/**
 * Node.js connection configuration options
 */
export interface NodeConnectionConfig {
  /**
   * Connection type: stdio, socket, or ipc
   */
  type?: 'stdio' | 'socket' | 'ipc';
  
  /**
   * For socket connections: port number
   */
  port?: number;
  
  /**
   * For socket connections: host address (defaults to localhost)
   */
  host?: string;
}

/**
 * Interface for connection factory implementations
 */
export interface IConnectionFactory {
  /**
   * Creates a message connection based on the environment and configuration
   */
  createConnection(config?: NodeConnectionConfig): Promise<MessageConnection>;
}