/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection } from 'vscode-jsonrpc';
import type { ConnectionConfig } from './ConnectionFactoryInterface';
import { createPlatformMessageBridge } from '../communication/MessageBridgeFactory.browser';

/**
 * Creates a browser-specific connection with a worker
 */
export async function createBrowserConnection(
  config: ConnectionConfig,
): Promise<MessageConnection> {
  if (!config.worker) {
    throw new Error('Browser connection requires a worker instance');
  }

  return createPlatformMessageBridge({
    environment: 'browser',
    worker: config.worker,
    logger: config.logger,
  });
}
