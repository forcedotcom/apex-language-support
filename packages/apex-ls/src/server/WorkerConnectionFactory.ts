/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type {
  IConnectionFactory,
  ConnectionConfig,
} from './ConnectionFactoryInterface';

/**
 * Factory for creating worker-specific connections
 */
export class WorkerConnectionFactory implements IConnectionFactory {
  /**
   * Creates a worker-specific connection
   */
  async createConnection(
    config?: ConnectionConfig,
  ): Promise<MessageConnection> {
    if (config?.workerScope) {
      // Use provided worker scope (typically for tests)
      const { createWorkerMessageBridgeWithScope } = await import(
        '../communication/WorkerMessageBridgeFactory'
      );
      return createWorkerMessageBridgeWithScope(config.workerScope, { logger: config?.logger });
    } else {
      // Use standard worker message bridge
      const { createWorkerMessageBridge } = await import(
        '../communication/WorkerMessageBridgeFactory'
      );
      return createWorkerMessageBridge({ logger: config?.logger });
    }
  }
}

/**
 * Convenience function for creating worker connections
 */
export async function createWorkerConnection(
  config?: ConnectionConfig,
): Promise<MessageConnection> {
  const factory = new WorkerConnectionFactory();
  return factory.createConnection(config);
}
