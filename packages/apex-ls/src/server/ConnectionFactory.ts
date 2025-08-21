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
  isBrowserEnvironment,
} from '../utils/EnvironmentDetector';

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
      const { createWorkerConnection } = await import(
        './WorkerConnectionFactory'
      );
      return createWorkerConnection(config);
    }

    if (isBrowserEnvironment()) {
      throw new Error('Browser implementation not available in worker build');
    }

    throw new Error('Unsupported environment');
  }

  /**
   * Creates a worker-specific connection
   */
  static async createWorkerConnection(
    config?: ConnectionConfig,
  ): Promise<MessageConnection> {
    const { createWorkerConnection } = await import(
      './WorkerConnectionFactory'
    );
    return createWorkerConnection(config);
  }
}
