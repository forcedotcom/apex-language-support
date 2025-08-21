/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection, Logger } from 'vscode-jsonrpc';
import type { EnvironmentType } from '../types';

/**
 * Configuration for creating message bridges
 */
export interface MessageBridgeConfig {
  environment?: EnvironmentType;
  logger?: Logger;
  worker?: Worker; // For browser contexts communicating with workers
}

/**
 * Interface for environment-specific message bridge factories
 */
export interface IMessageBridgeFactory {
  /**
   * Creates a message bridge for the specific environment
   */
  createMessageBridge(config: MessageBridgeConfig): Promise<MessageConnection>;
}

/**
 * Convenience function type for creating platform-appropriate message bridges
 */
export type CreatePlatformMessageBridge = (
  config?: MessageBridgeConfig,
) => Promise<MessageConnection>;
