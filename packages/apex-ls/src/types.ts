/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Re-export shared types from the shared package
export type {
  EnvironmentType,
  LogLevel,
  ExtensionMode,
  Logger,
  WebWorkerLanguageServerOptions,
  ApexServerInitializationOptions,
} from '@salesforce/apex-lsp-shared';

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
