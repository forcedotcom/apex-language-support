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
import { NodeMessageBridge, type NodeConnectionConfig } from './NodeMessageBridge';

/**
 * Factory for creating Node.js-specific message bridges
 */
export class NodeMessageBridgeFactory implements IMessageBridgeFactory {
  /**
   * Creates a Node.js-specific message bridge
   */
  async createMessageBridge(
    config: MessageBridgeConfig & { nodeConfig?: NodeConnectionConfig },
  ): Promise<MessageConnection> {
    const nodeConfig: NodeConnectionConfig = config.nodeConfig || {
      mode: 'stdio',
      logger: config.logger,
    };

    return NodeMessageBridge.createConnection(nodeConfig);
  }
}

/**
 * Convenience function for creating Node.js message bridges
 */
export async function createNodeMessageBridge(
  config: MessageBridgeConfig & { nodeConfig?: NodeConnectionConfig } = {},
): Promise<MessageConnection> {
  const factory = new NodeMessageBridgeFactory();
  return factory.createMessageBridge(config);
}