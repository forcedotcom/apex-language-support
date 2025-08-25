/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection, Logger } from 'vscode-jsonrpc';
import type { EnvironmentType } from '@salesforce/apex-lsp-shared';
import type { InitializeParams, InitializeResult } from '@salesforce/apex-lsp-shared';

// Re-export from shared package
export type { 
  EnvironmentType, 
  InitializeParams, 
  InitializeResult,
  MessageTransport,
  Disposable,
  BaseConfig,
  ClientInterface
} from '@salesforce/apex-lsp-shared';

// Platform-specific configuration interfaces
import type { BaseConfig } from '@salesforce/apex-lsp-shared';

/**
 * Browser-specific configuration
 */
export interface BrowserConfig extends BaseConfig {
  worker: Worker; // Required for browser contexts
}

/**
 * Node.js-specific configuration
 */
export interface NodeConfig extends BaseConfig {
  mode: 'stdio' | 'socket' | 'ipc';
  port?: number; // For socket mode
  host?: string; // For socket mode
}

/**
 * Worker-specific configuration
 */
export interface WorkerConfig extends BaseConfig {
  // Worker configuration is minimal - just needs logger
}

/**
 * Unified client configuration for cross-platform use
 */
export interface ClientConfig extends BaseConfig {
  environment: EnvironmentType;
  worker?: Worker; // Required for browser environment
}

// ClientInterface is now exported from @salesforce/apex-lsp-shared

// =============================================================================
// FACTORY INTERFACES
// =============================================================================

/**
 * Interface for message bridge factories
 */
export interface IMessageBridgeFactory {
  createMessageBridge(config: BaseConfig): Promise<MessageConnection>;
}
