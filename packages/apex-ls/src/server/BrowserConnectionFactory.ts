/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection, Logger } from 'vscode-jsonrpc';
import { BrowserMessageBridge } from '../communication/PlatformBridges.browser';
import type { Worker } from '../communication/Interfaces';

/**
 * Configuration for browser connection factory
 */
export interface ConnectionConfig {
  worker?: Worker;
  logger?: Logger;
}

/**
 * Factory for creating browser-side message connections
 */
export class ConnectionFactory {
  /**
   * Creates a message connection from browser to worker
   */
  static async createConnection(
    config?: ConnectionConfig,
  ): Promise<MessageConnection> {
    // Check environment first
    const { isBrowserEnvironment } = await import(
      '@salesforce/apex-lsp-shared'
    );
    if (!isBrowserEnvironment()) {
      throw new Error('Unsupported environment');
    }

    if (!config || !config.worker) {
      throw new Error('Browser environment requires a worker instance');
    }

    return BrowserMessageBridge.forWorkerClient(config.worker, config.logger);
  }

  /**
   * Creates a message connection with worker instance
   */
  static forWorker(worker: Worker, logger?: Logger): MessageConnection {
    return BrowserMessageBridge.forWorkerClient(worker, logger);
  }

  /**
   * Convenience method for creating browser connections
   */
  static createBrowserConnection(
    worker: Worker,
    logger?: Logger,
  ): MessageConnection {
    return BrowserMessageBridge.forWorkerClient(worker, logger);
  }
}
