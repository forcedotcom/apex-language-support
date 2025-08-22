/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type {
  MessageBridgeConfig,
  CreatePlatformMessageBridge,
  IMessageBridgeFactory,
} from './interfaces';
import { BrowserMessageBridge } from './PlatformBridges.browser';
import {
  isWorkerEnvironment,
  isBrowserEnvironment,
} from '../utils/EnvironmentDetector.browser';

/**
 * Creates a platform-appropriate message bridge factory
 */
export class BrowserMessageBridgeFactory implements IMessageBridgeFactory {
  async createMessageBridge(
    config: MessageBridgeConfig,
  ): Promise<MessageConnection> {
    if (!config.worker) {
      throw new Error('Browser message bridge requires a worker instance');
    }
    return BrowserMessageBridge.forWorkerClient(config.worker, config.logger);
  }
}

export const createPlatformMessageBridge: CreatePlatformMessageBridge = async (
  config: MessageBridgeConfig = {},
): Promise<MessageConnection> => {
  // Determine environment
  const environment =
    config.environment ||
    (isWorkerEnvironment()
      ? 'webworker'
      : isBrowserEnvironment()
        ? 'browser'
        : 'unknown');

  // Handle unknown environment
  if (environment === 'unknown') {
    throw new Error('Unable to determine environment for message bridge');
  }

  switch (environment) {
    case 'browser': {
      if (!config.worker) {
        throw new Error('Browser message bridge requires a worker instance');
      }
      return BrowserMessageBridge.forWorkerClient(config.worker, config.logger);
    }

    case 'webworker': {
      throw new Error('Worker implementation not available in browser build');
    }

    case 'node': {
      throw new Error('Node.js implementation not available in browser build');
    }

    default:
      throw new Error(
        `Message bridge not supported for environment: ${environment}`,
      );
  }
};
