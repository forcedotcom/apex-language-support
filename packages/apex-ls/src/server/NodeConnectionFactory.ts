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
import type { NodeConnectionConfig as NodeBridgeConfig } from '../communication/NodeMessageBridge';

/**
 * Extended connection config for Node.js
 */
export interface NodeConnectionConfig extends ConnectionConfig {
  nodeConfig?: NodeBridgeConfig;
}

/**
 * Factory for creating Node.js-specific connections
 */
export class NodeConnectionFactory implements IConnectionFactory {
  /**
   * Creates a Node.js-specific connection
   */
  async createConnection(
    config?: NodeConnectionConfig,
  ): Promise<MessageConnection> {
    const { createNodeMessageBridge } = await import(
      '../communication/NodeMessageBridgeFactory'
    );
    
    return createNodeMessageBridge({
      logger: config?.logger,
      nodeConfig: config?.nodeConfig || { mode: 'stdio' },
    });
  }
}

/**
 * Convenience function for creating Node.js connections
 */
export async function createNodeConnection(
  config?: NodeConnectionConfig,
): Promise<MessageConnection> {
  const factory = new NodeConnectionFactory();
  return factory.createConnection(config);
}