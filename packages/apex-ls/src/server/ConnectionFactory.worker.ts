/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type { ConnectionConfig } from './ConnectionFactoryInterface';
import {
  isWorkerEnvironment,
} from '../utils/EnvironmentDetector.worker';
import { createPlatformMessageBridge } from '../communication/MessageBridgeFactory.worker';

/**
 * Factory for creating appropriate connections based on environment
 */
export class ConnectionFactory {
  /**
   * Creates a connection appropriate for the current environment
   */
  static async createConnection(
    config?: ConnectionConfig,
  ): Promise<MessageConnection> {
    if (isWorkerEnvironment()) {
      return createPlatformMessageBridge({
        environment: 'webworker',
        logger: config?.logger,
      });
    }

    throw new Error('Unsupported environment');
  }
}
