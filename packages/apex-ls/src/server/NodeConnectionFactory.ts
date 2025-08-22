/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type { NodeConnectionConfig } from './ConnectionFactoryInterface.node';
import { createPlatformMessageBridge } from '../communication/MessageBridgeFactory.node';

/**
 * Factory for creating Node.js-specific connections
 */
export class NodeConnectionFactory {
  /**
   * Creates a Node.js-specific connection
   */
  static async createConnection(
    config?: NodeConnectionConfig,
  ): Promise<MessageConnection> {
    return createPlatformMessageBridge({
      logger: config?.logger,
      environment: 'node',
    });
  }
}

/**
 * Creates a Node.js-specific connection
 */
export async function createNodeConnection(
  config?: NodeConnectionConfig,
): Promise<MessageConnection> {
  return NodeConnectionFactory.createConnection(config);
}
