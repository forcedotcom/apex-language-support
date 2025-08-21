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
 * Factory for creating browser-specific connections
 */
export class BrowserConnectionFactory implements IConnectionFactory {
  /**
   * Creates a browser-specific connection
   */
  async createConnection(
    config?: ConnectionConfig,
  ): Promise<MessageConnection> {
    if (!config?.worker) {
      throw new Error('Browser connection requires a worker instance');
    }

    const { createBrowserMessageBridge } = await import(
      '../communication/BrowserMessageBridgeFactory'
    );
    return createBrowserMessageBridge({ worker: config.worker });
  }
}

/**
 * Convenience function for creating browser connections
 */
export async function createBrowserConnection(
  config?: ConnectionConfig,
): Promise<MessageConnection> {
  const factory = new BrowserConnectionFactory();
  return factory.createConnection(config);
}
