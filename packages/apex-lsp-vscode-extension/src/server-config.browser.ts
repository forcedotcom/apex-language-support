/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import {
  LanguageClientOptions,
  CloseAction,
  ErrorAction,
} from 'vscode-languageclient/browser';
import { getWorkspaceSettings } from './configuration';
import { logServerMessage, getWorkerServerOutputChannel } from './logging';

/**
 * Creates server options for the web language server (worker-based)
 * @param context The extension context
 * @returns Server options configuration for web worker
 */
export const createWebServerOptions = (context: vscode.ExtensionContext) => {
  // In web environments, we use a web worker for the language server
  const workerUri = vscode.Uri.joinPath(
    context.extensionUri,
    'dist',
    'worker.global.js',
  );

  logServerMessage(`Web worker URI: ${workerUri.toString()}`, 'debug');

  // Create the web worker
  const worker = new Worker(workerUri.toString(), { type: 'classic' });

  return worker;
};

/**
 * Creates client options for the web language server
 * @param context The extension context
 * @returns Client options configuration for web
 */
export const createWebClientOptions = (
  context: vscode.ExtensionContext,
): LanguageClientOptions => {
  const settings = getWorkspaceSettings();

  // Map VS Code extension mode to server mode
  const extensionMode = context.extensionMode;
  const serverMode =
    extensionMode === vscode.ExtensionMode.Development ||
    extensionMode === vscode.ExtensionMode.Test
      ? 'development'
      : 'production';

  return {
    documentSelector: [
      { scheme: 'file', language: 'apex' },
      { scheme: 'vscode-test-web', language: 'apex' },
    ],
    synchronize: {
      // Note: In web environments, file watchers have limitations
      configurationSection: 'apex',
    },
    // Use our consolidated worker/server output channel if available
    ...(getWorkerServerOutputChannel()
      ? { outputChannel: getWorkerServerOutputChannel() }
      : {}),
    // Add error handling with proper retry logic
    errorHandler: {
      error: handleWebClientError,
      closed: () => handleWebClientClosed(),
    },
    // Include workspace settings and extension mode in initialization options
    initializationOptions: {
      enableDocumentSymbols: true,
      extensionMode: serverMode, // Pass extension mode to server
      ...settings,
    },
    // Web-specific options
    markdown: {
      isTrusted: true,
    },
  };
};

/**
 * Handles errors from the web language client
 * @param error The error object
 * @param message The error message
 * @param _count The error count
 * @returns Error action to take
 */
const handleWebClientError = (
  error: Error,
  message: any,
  _count: number | undefined,
): { action: ErrorAction } => {
  logServerMessage(
    `Web LSP Error: ${message?.toString() || 'Unknown error'}`,
    'error',
  );
  if (error) {
    logServerMessage(`Error details: ${error}`, 'debug');
  }
  // Always continue on errors, we handle retries separately
  return { action: ErrorAction.Continue };
};

/**
 * Handles the web client closed event
 * @returns Close action to take
 */
const handleWebClientClosed = (): { action: CloseAction } => {
  logServerMessage(
    `Web client connection to worker closed - ${new Date().toISOString()}`,
    'info',
  );

  // Always return DoNotRestart since we handle restart logic separately
  return { action: CloseAction.DoNotRestart };
};
