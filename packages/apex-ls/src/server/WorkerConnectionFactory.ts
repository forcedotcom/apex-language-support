/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection, Logger } from 'vscode-jsonrpc';
import { WorkerMessageBridge } from '../communication/PlatformBridges.worker';

/**
 * Configuration for worker connection factory
 */
export interface WorkerConnectionConfig {
  logger?: Logger;
}

/**
 * Factory for creating worker-side message connections
 */
export class ConnectionFactory {
  /**
   * Instance method - creates a message connection for worker environment
   */
  async createConnection(config?: WorkerConnectionConfig): Promise<MessageConnection> {
    return WorkerMessageBridge.forWorkerServer(undefined, config?.logger);
  }

  /**
   * Instance method - creates a message connection for worker server
   */
  forWorkerServer(logger?: Logger): MessageConnection {
    return WorkerMessageBridge.forWorkerServer(undefined, logger);
  }

  /**
   * Static method - creates a message connection for worker environment
   */
  static async createConnection(config?: WorkerConnectionConfig): Promise<MessageConnection> {
    return WorkerMessageBridge.forWorkerServer(undefined, config?.logger);
  }

  /**
   * Static method - creates a message connection for worker server
   */
  static forWorkerServer(logger?: Logger): MessageConnection {
    return WorkerMessageBridge.forWorkerServer(undefined, logger);
  }
}

// Export alias for the test that expects WorkerConnectionFactory
export { ConnectionFactory as WorkerConnectionFactory };