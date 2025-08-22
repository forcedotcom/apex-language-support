/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type {
  CreatePlatformMessageBridge,
  IMessageBridgeFactory,
} from './interfaces';
import type { NodeMessageBridgeConfig } from './interfaces.node';
import { NodeMessageBridge } from './NodePlatformBridge';
import { isNodeEnvironment } from '../utils/EnvironmentDetector.node';

/**
 * Creates a platform-appropriate message bridge factory
 */
export class NodeMessageBridgeFactory implements IMessageBridgeFactory {
  async createMessageBridge(
    config: NodeMessageBridgeConfig,
  ): Promise<MessageConnection> {
    if (!isNodeEnvironment()) {
      throw new Error(
        'Node message bridge can only be created in a Node.js environment',
      );
    }
    return NodeMessageBridge.createConnection({
      mode: 'stdio',
      logger: config.logger,
    });
  }
}

export const createPlatformMessageBridge: CreatePlatformMessageBridge = async (
  config = {},
): Promise<MessageConnection> => {
  const nodeConfig: NodeMessageBridgeConfig = {
    mode: 'stdio',
    ...config,
  };
  // Determine environment
  const environment =
    config.environment || (isNodeEnvironment() ? 'node' : 'unknown');

  // Create message bridge based on environment
  switch (environment) {
    case 'node':
      return NodeMessageBridge.createConnection(nodeConfig);

    case 'browser':
    case 'webworker':
      throw new Error(
        `${environment} implementation not available in Node.js build`,
      );

    default:
      throw new Error(`Unsupported environment: ${environment}`);
  }
};
