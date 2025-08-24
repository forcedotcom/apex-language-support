/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type { MessageBridgeConfig, BrowserConfig, WorkerConfig } from './types';
import { BrowserMessageBridge, WorkerMessageBridge } from './bridges';
import { detectEnvironment } from '../utils/EnvironmentDetector.browser';

// =============================================================================
// BROWSER-SPECIFIC MESSAGE BRIDGE FACTORY
// =============================================================================

/**
 * Factory for creating message bridges in browser environments
 */
export class MessageBridgeFactory {
  /**
   * Creates a message bridge automatically detecting the environment
   */
  static async createBridge(
    config: MessageBridgeConfig,
  ): Promise<MessageConnection> {
    const environment = config.environment || (await detectEnvironment());

    switch (environment) {
      case 'browser':
        return this.createBrowserBridge(config as BrowserConfig);
      case 'webworker':
        return this.createWorkerBridge(config as WorkerConfig);
      default:
        throw new Error(`Unsupported environment: ${environment}`);
    }
  }

  /**
   * Creates a browser-side message bridge
   */
  static createBrowserBridge(config: BrowserConfig): MessageConnection {
    const { worker, logger } = config;
    return BrowserMessageBridge.forWorkerClient(worker, logger);
  }

  /**
   * Creates a worker-side message bridge
   */
  static createWorkerBridge(config: WorkerConfig): MessageConnection {
    const { logger } = config;
    return WorkerMessageBridge.forWorkerServer(logger);
  }
}
