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
  NodeConnectionConfig,
} from './interfaces';
import { BrowserMessageBridge, WorkerMessageBridge } from './PlatformBridges';
import {
  isWorkerEnvironment,
  isBrowserEnvironment,
  isNodeEnvironment,
} from '../utils/EnvironmentDetector';

// =============================================================================
// PLATFORM-SPECIFIC FACTORIES
// =============================================================================

/**
 * Factory for creating browser-specific message bridges
 */
export class BrowserMessageBridgeFactory implements IMessageBridgeFactory {
  /**
   * Creates a browser-specific message bridge
   */
  async createMessageBridge(
    config: MessageBridgeConfig,
  ): Promise<MessageConnection> {
    if (!config.worker) {
      throw new Error('Browser message bridge requires a worker instance');
    }

    return BrowserMessageBridge.forWorkerClient(config.worker, config.logger);
  }
}

/**
 * Factory for creating Node.js-specific message bridges
 */
export class NodeMessageBridgeFactory implements IMessageBridgeFactory {
  /**
   * Creates a Node.js-specific message bridge
   */
  async createMessageBridge(
    config: MessageBridgeConfig & { nodeConfig?: NodeConnectionConfig },
  ): Promise<MessageConnection> {
    const nodeConfig: NodeConnectionConfig = config.nodeConfig || {
      mode: 'stdio',
      logger: config.logger,
    };

    // Dynamically import Node.js specific implementation
    const { NodeMessageBridge } = await import('./NodePlatformBridge');
    return NodeMessageBridge.createConnection(nodeConfig);
  }
}

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
    const workerScope = await this.getWorkerGlobalScope();
    if (!workerScope) {
      throw new Error('Worker global scope not available');
    }

    return WorkerMessageBridge.forWorkerServer(workerScope, config.logger);
  }

  private async getWorkerGlobalScope(): Promise<DedicatedWorkerGlobalScope | null> {
    // Import dynamically to avoid loading browser code in Node.js
    const { getWorkerGlobalScope } = await import('../utils/BrowserUtils');
    return getWorkerGlobalScope();
  }
}

// =============================================================================
// CONVENIENCE FACTORY FUNCTIONS
// =============================================================================

/**
 * Convenience function for creating browser message bridges
 */
export async function createBrowserMessageBridgeFactory(
  config: MessageBridgeConfig = {},
): Promise<MessageConnection> {
  const factory = new BrowserMessageBridgeFactory();
  return factory.createMessageBridge(config);
}

/**
 * Convenience function for creating Node.js message bridges
 */
export async function createNodeMessageBridgeFactory(
  config: MessageBridgeConfig & { nodeConfig?: NodeConnectionConfig } = {},
): Promise<MessageConnection> {
  // Dynamically import Node.js specific implementation
  const { createNodeMessageBridge } = await import('./NodePlatformBridge');
  const nodeConfig: NodeConnectionConfig = config.nodeConfig || {
    mode: 'stdio',
    logger: config.logger,
  };
  return createNodeMessageBridge(nodeConfig);
}

/**
 * Convenience function for creating worker message bridges
 */
export async function createWorkerMessageBridgeFactory(
  config: MessageBridgeConfig = {},
): Promise<MessageConnection> {
  const factory = new WorkerMessageBridgeFactory();
  return factory.createMessageBridge(config);
}

/**
 * Test-friendly function for creating worker message bridges with custom scope
 */
export async function createWorkerMessageBridgeWithScope(
  workerScope: DedicatedWorkerGlobalScope,
  config: MessageBridgeConfig = {},
): Promise<MessageConnection> {
  return WorkerMessageBridge.forWorkerServer(workerScope, config.logger);
}

// =============================================================================
// MAIN PLATFORM FACTORY
// =============================================================================

/**
 * Creates a platform-appropriate message bridge factory
 */
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
        : isNodeEnvironment()
          ? 'node'
          : 'unknown');

  // Handle unknown environment
  if (environment === 'unknown') {
    throw new Error('Unable to determine environment for message bridge');
  }

  switch (environment) {
    case 'browser': {
      try {
        return await createBrowserMessageBridgeFactory(config);
      } catch (_error) {
        throw new Error(
          'Browser environment detected but browser implementation is not available in this build',
        );
      }
    }

    case 'webworker': {
      try {
        return await createWorkerMessageBridgeFactory(config);
      } catch (_error) {
        throw new Error(
          'Worker environment detected but worker implementation is not available in this build',
        );
      }
    }

    case 'node': {
      try {
        return await createNodeMessageBridgeFactory(
          config as MessageBridgeConfig & { nodeConfig?: NodeConnectionConfig },
        );
      } catch (_error) {
        throw new Error(
          'Node environment detected but Node.js implementation is not available in this build',
        );
      }
    }

    default:
      throw new Error(
        `Message bridge not supported for environment: ${environment}`,
      );
  }
};
