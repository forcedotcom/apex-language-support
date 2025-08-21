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
      throw new Error('Worker implementation not available in browser build');
    }

    if (isBrowserEnvironment()) {
      if (!config?.worker) {
        throw new Error(
          'Browser environment requires a worker instance. Use createBrowserConnection instead.',
        );
      }
      const { createBrowserConnection } = await import(
        './BrowserConnectionFactory'
      );
      return createBrowserConnection(config);
    }

    throw new Error('Unsupported environment');
  }

  /**
   * Creates a browser-specific connection with a worker
   */
  static async createBrowserConnection(
    worker: Worker,
  ): Promise<MessageConnection> {
    const { createBrowserConnection } = await import(
      './BrowserConnectionFactory'
    );
    return createBrowserConnection({ worker });
  }
}
