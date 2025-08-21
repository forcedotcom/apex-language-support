/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type { EnvironmentType } from '../types';
import type {
  MessageBridgeConfig,
  CreatePlatformMessageBridge,
} from './MessageBridgeInterface';
import {
  isWorkerEnvironment,
  isBrowserEnvironment,
} from '../utils/EnvironmentDetector';

/**
 * Creates a platform-appropriate message bridge factory
 */
export const createPlatformMessageBridge: CreatePlatformMessageBridge = async (
  config: MessageBridgeConfig = {},
): Promise<MessageConnection> => {
  const environment =
    config.environment ||
    (isWorkerEnvironment()
      ? 'webworker'
      : isBrowserEnvironment()
        ? 'browser'
        : 'node');

  switch (environment) {
    case 'browser': {
      throw new Error('Browser implementation not available in worker build');
    }

    case 'webworker': {
      try {
        const { createWorkerMessageBridge } = await import(
          './WorkerMessageBridgeFactory'
        );
        return createWorkerMessageBridge(config);
      } catch (error) {
        throw new Error(
          'Worker environment detected but worker implementation is not available in this build',
        );
      }
    }

    case 'node':
    default:
      throw new Error(
        `Message bridge not supported for environment: ${environment}`,
      );
  }
};
