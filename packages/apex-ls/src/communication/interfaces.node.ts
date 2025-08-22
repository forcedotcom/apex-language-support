/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Logger } from 'vscode-jsonrpc';
import type { MessageBridgeConfig as BaseMessageBridgeConfig } from './interfaces';

/**
 * Node.js-specific message bridge configuration
 */
export interface NodeMessageBridgeConfig extends BaseMessageBridgeConfig {
  mode: 'stdio' | 'socket' | 'ipc';
  port?: number; // For socket mode
  host?: string; // For socket mode
}

/**
 * Node.js-specific client configuration
 */
export interface NodeClientConfig {
  logger?: Logger;
  mode: 'stdio' | 'socket' | 'ipc';
  port?: number;
  host?: string;
}
