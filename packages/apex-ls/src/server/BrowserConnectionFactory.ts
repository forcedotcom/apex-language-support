/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection, Logger } from 'vscode-jsonrpc';
import { BrowserMessageBridge } from '../communication/PlatformBridges.browser';
import type { ConnectionConfig } from './ConnectionFactoryInterface';

/**
 * Configuration for browser connection factory
 */
export interface BrowserConnectionConfig {
  worker: Worker;
  logger?: Logger;
}

/**
 * Factory for creating browser-side message connections
 */
export class BrowserConnectionFactory {
  /**
   * Creates a message connection from browser to worker
   */
  async createConnection(config: ConnectionConfig): Promise<MessageConnection> {
    if (!config.worker) {
      throw new Error('Browser connection requires a worker instance');
    }
    if (config.logger) {
      return BrowserMessageBridge.forWorkerClient(config.worker, config.logger);
    } else {
      return BrowserMessageBridge.forWorkerClient(config.worker);
    }
  }

  /**
   * Creates a message connection with worker instance
   */
  forWorker(worker: Worker, logger?: Logger): MessageConnection {
    return BrowserMessageBridge.forWorkerClient(worker, logger);
  }

  /**
   * Static version for backward compatibility
   */
  static async createConnection(config: ConnectionConfig): Promise<MessageConnection> {
    if (!config.worker) {
      throw new Error('Browser connection requires a worker instance');
    }
    if (config.logger) {
      return BrowserMessageBridge.forWorkerClient(config.worker, config.logger);
    } else {
      return BrowserMessageBridge.forWorkerClient(config.worker);
    }
  }

  /**
   * Static version for backward compatibility
   */
  static forWorker(worker: Worker, logger?: Logger): MessageConnection {
    return BrowserMessageBridge.forWorkerClient(worker, logger);
  }
}