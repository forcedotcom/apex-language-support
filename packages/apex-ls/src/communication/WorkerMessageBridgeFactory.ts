/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type {
  IMessageBridgeFactory,
  MessageBridgeConfig,
} from './MessageBridgeInterface';
import { WorkerMessageBridge } from './WorkerMessageBridge';

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
    const workerScope = this.getWorkerGlobalScope();
    if (!workerScope) {
      throw new Error('Worker global scope not available');
    }
    
    return WorkerMessageBridge.forWorkerServer(
      workerScope,
      config.logger,
    );
  }

  private getWorkerGlobalScope(): DedicatedWorkerGlobalScope | null {
    try {
      if (typeof self !== 'undefined' && typeof window === 'undefined') {
        return self as DedicatedWorkerGlobalScope;
      }
    } catch {
      // Self is not available
    }
    return null;
  }
}

/**
 * Convenience function for creating worker message bridges
 */
export async function createWorkerMessageBridge(
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
  return WorkerMessageBridge.forWorkerServer(
    workerScope,
    config.logger,
  );
}
