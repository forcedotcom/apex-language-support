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
import { WorkerMessageBridge } from './PlatformBridges.worker';
import { isWorkerEnvironment } from '../utils/EnvironmentDetector.worker';

/**
 * Factory for creating worker-specific message bridges
 */
export class WorkerMessageBridgeFactory implements IMessageBridgeFactory {
  /**
   * Creates a worker-specific message bridge
   */
  async createMessageBridge(
    config: MessageBridgeConfig,
  ): Promise<MessageConnection> {
    // Safely get the worker global scope
    const workerScope = self as unknown as DedicatedWorkerGlobalScope;
    return WorkerMessageBridge.forWorkerServer(workerScope, config.logger);
  }
}

/**
 * Creates a platform-appropriate message bridge factory
 */
export const createPlatformMessageBridge: CreatePlatformMessageBridge = async (
  config: MessageBridgeConfig = {},
): Promise<MessageConnection> => {
  // Determine environment
  const environment =
    config.environment || (isWorkerEnvironment() ? 'webworker' : 'unknown');

  // Handle unknown environment
  if (environment === 'unknown') {
    throw new Error('Unable to determine environment for message bridge');
  }

  switch (environment) {
    case 'webworker': {
      const factory = new WorkerMessageBridgeFactory();
      return factory.createMessageBridge(config);
    }

    case 'browser':
    case 'node':
      throw new Error(
        `${environment} implementation not available in worker build`,
      );

    default:
      throw new Error(
        `Message bridge not supported for environment: ${environment}`,
      );
  }
};
