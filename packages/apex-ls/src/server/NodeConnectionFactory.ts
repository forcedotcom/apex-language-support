/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type { EnvironmentType } from '../types';
import type { ConnectionConfig } from './ConnectionFactory';
import { BaseConnectionFactory } from './ConnectionFactory';
import { NodeMessageBridge } from '../communication/NodeBridge';

/**
 * Node.js-specific connection factory
 */
export class NodeConnectionFactory extends BaseConnectionFactory {
  supports(environment: EnvironmentType): boolean {
    return environment === 'node';
  }

  async createConnection(
    config?: ConnectionConfig,
  ): Promise<MessageConnection> {
    this.validateConfig(config);

    try {
      return NodeMessageBridge.createConnection({
        mode: config?.mode ?? 'stdio',
        logger: config?.logger,
        port: config?.port,
        host: config?.host,
      });
    } catch (error) {
      this.handleError(error as Error, 'NodeConnectionFactory');
    }
  }

  /**
   * Node.js specific configuration validation
   */
  protected validateConfig(config?: ConnectionConfig): void {
    super.validateConfig(config);

    if (config?.mode === 'socket') {
      if (!config.port) {
        throw new Error('Port is required for socket mode');
      }
      if (config.port < 1 || config.port > 65535) {
        throw new Error('Port must be between 1 and 65535');
      }
    }
  }
}
