/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Logger interface that extends Console with additional methods
 */
export interface Logger extends Console {
  success(message: string): void;
}

/**
 * Environment types supported by the unified language server
 */
export type EnvironmentType = 'browser' | 'webworker' | 'node';

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
 * Interface for server initialization options
 */
export interface ApexServerInitializationOptions {
  logLevel?: LogLevel;
  enableDocumentSymbols?: boolean;
  trace?: string;
  extensionMode?: ExtensionMode;
  custom?: Record<string, any>;
  [key: string]: any;
}

// Re-export the actual LSP types from vscode-languageserver
export type {
  InitializeParams,
  InitializeResult,
  ClientCapabilities,
  ServerCapabilities,
  WorkspaceFolder,
  TextDocumentChangeEvent,
  TextDocumentContentChangeEvent,
  Connection,
  TextDocuments,
} from 'vscode-languageserver';
