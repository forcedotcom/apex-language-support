/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Node.js-specific logger interface
 */
export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  log(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
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