/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { Logger } from 'vscode-jsonrpc';
import type { MessageBridgeConfig } from './interfaces';

/**
 * Browser-specific message bridge configuration
 */
export interface BrowserMessageBridgeConfig extends MessageBridgeConfig {
  worker: Worker; // Required for browser contexts communicating with workers
}

/**
 * Browser-specific client configuration
 */
export interface BrowserClientConfig {
  logger?: Logger;
  worker: Worker;
}

/**
 * Configuration for creating a web worker client
 */
export interface WebWorkerClientConfig {
  context: any;
  logger?: Logger;
  workerFileName: string;
}
