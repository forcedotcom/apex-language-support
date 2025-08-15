/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type { MessageConnection, Logger } from 'vscode-jsonrpc';
import type {
  InitializeParams,
  InitializeResult,
} from 'vscode-languageserver-protocol';

/**
 * Environment types supported by the unified language server
 */
export type EnvironmentType = 'browser' | 'node' | 'webworker';

/**
 * Log level type for consistent typing across the application
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

/**
 * Extension mode type for consistent typing
 */
export type ExtensionMode = 'production' | 'development';

/**
 * Options for creating a web worker language server
 */
export interface WebWorkerLanguageServerOptions {
  /**
   * The environment type where the server will run
   */
  environment: EnvironmentType;

  /**
   * Log level for the language server
   */
  logLevel?: LogLevel;

  /**
   * Whether to enable document symbols
   */
  enableDocumentSymbols?: boolean;

  /**
   * Trace level for debugging
   */
  trace?: string;

  /**
   * Extension mode (production/development)
   */
  extensionMode?: ExtensionMode;

  /**
   * Custom initialization options
   */
  initializationOptions?: Record<string, any>;
}

/**
 * Options for creating an Apex LSP client
 */
export interface ApexLspClientOptions {
  /**
   * The Worker instance running the language server
   */
  worker: Worker;

  /**
   * Optional logger for the connection
   */
  logger?: Logger;

  /**
   * Whether to automatically listen on the connection
   */
  autoListen?: boolean;
}

/**
 * Interface for server initialization options
 */
export interface ApexServerInitializationOptions {
  logLevel?: LogLevel;
  enableDocumentSymbols?: boolean;
  trace?: string;
  extensionMode?: ExtensionMode;
  [key: string]: any;
}

/**
 * Result of language server initialization
 */
export interface LanguageServerInitResult {
  /**
   * The message connection to the language server
   */
  connection: MessageConnection;

  /**
   * The worker instance
   */
  worker: Worker;

  /**
   * Initialize the language server with the given parameters
   */
  initialize: (params: InitializeParams) => Promise<InitializeResult>;

  /**
   * Dispose of the language server and clean up resources
   */
  dispose(): void;
}
