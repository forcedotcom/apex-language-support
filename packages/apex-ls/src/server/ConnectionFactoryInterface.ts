/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection, Logger } from 'vscode-jsonrpc';

/**
 * Configuration for creating connections
 */
export interface ConnectionConfig {
  worker?: Worker;
  workerScope?: DedicatedWorkerGlobalScope;
  logger?: Logger;
}

/**
 * Interface for environment-specific connection factories
 */
export interface IConnectionFactory {
  /**
   * Creates a connection appropriate for the environment
   */
  createConnection(config?: ConnectionConfig): Promise<MessageConnection>;
}

/**
 * Convenience function type for creating platform-appropriate connections
 */
export type CreatePlatformConnection = (
  config?: ConnectionConfig,
) => Promise<MessageConnection>;
