/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type {
  IMessageBridgeFactory,
  MessageBridgeConfig,
} from './MessageBridgeInterface';
import { BrowserMessageBridge } from './BrowserMessageBridge';

/**
 * Factory for creating browser-specific message bridges
 */
export class BrowserMessageBridgeFactory implements IMessageBridgeFactory {
  /**
   * Creates a browser-specific message bridge
   */
  async createMessageBridge(
    config: MessageBridgeConfig,
  ): Promise<MessageConnection> {
    if (!config.worker) {
      throw new Error('Browser message bridge requires a worker instance');
    }

    return BrowserMessageBridge.forWorkerClient(config.worker, config.logger);
  }
}

/**
 * Convenience function for creating browser message bridges
 */
export async function createBrowserMessageBridge(
  config: MessageBridgeConfig = {},
): Promise<MessageConnection> {
  const factory = new BrowserMessageBridgeFactory();
  return factory.createMessageBridge(config);
}
