/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type { ConnectionConfig } from './ConnectionFactoryInterface';
import { createPlatformMessageBridge } from '../communication/MessageBridgeFactory.worker';

/**
 * Creates a worker-specific connection
 */
export async function createWorkerConnection(
  config?: ConnectionConfig,
): Promise<MessageConnection> {
  return createPlatformMessageBridge({
    environment: 'webworker',
    logger: config?.logger,
  });
}