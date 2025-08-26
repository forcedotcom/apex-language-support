/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection, Logger } from 'vscode-jsonrpc';

/**
 * Configuration for connection factories
 */
export interface ConnectionConfig {
  worker?: Worker;
  logger?: Logger;
}

/**
 * Interface for connection factories
 */
export interface IConnectionFactory {
  createConnection(config: ConnectionConfig): MessageConnection;
}