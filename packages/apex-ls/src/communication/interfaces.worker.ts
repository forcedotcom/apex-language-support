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
 * Worker-specific message bridge configuration
 */
export interface WorkerMessageBridgeConfig extends MessageBridgeConfig {
  workerScope?: DedicatedWorkerGlobalScope;
}

/**
 * Worker-specific client configuration
 */
export interface WorkerClientConfig {
  logger?: Logger;
  workerScope: DedicatedWorkerGlobalScope;
}
