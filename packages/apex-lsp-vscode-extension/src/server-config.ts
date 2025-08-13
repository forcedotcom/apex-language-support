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
  ServerOptions,
  TransportKind,
  CloseAction,
  ErrorAction,
} from 'vscode-languageclient/node';
import { getDebugConfig, getWorkspaceSettings } from './configuration';
import { logToOutputChannel } from './logging';
import { DEBUG_CONFIG } from './constants';

/**
 * Determines debug options based on VS Code configuration
 * @returns Debug options array or undefined if debug is disabled
 */
export const getDebugOptions = (): string[] | undefined => {
  const debugConfig = getDebugConfig();

  if (debugConfig.mode === 'off') {
    return undefined;
  }

  // Determine debug flags based on mode
  let debugFlags: string[];
  if (debugConfig.mode === DEBUG_CONFIG.INSPECT_BRK_MODE) {
    logToOutputChannel(
      `Enabling debug mode with break on port ${debugConfig.port}`,
      'info',
    );
    debugFlags = [
      DEBUG_CONFIG.NOLAZY_FLAG,
      `--inspect-brk=${debugConfig.port}`,
    ];
  } else {
    // Default to 'inspect' mode
    logToOutputChannel(
      `Enabling debug mode on port ${debugConfig.port}`,
      'info',
    );
    debugFlags = [DEBUG_CONFIG.NOLAZY_FLAG, `--inspect=${debugConfig.port}`];
  }

  return debugFlags;
};

/**
 * Creates server options for the language server
 * @param context The extension context
 * @returns Server options configuration
 */
export const createServerOptions = (
  context: vscode.ExtensionContext,
): ServerOptions => {
  // Check if we're running in development mode (from project) or production (installed)
  const isDevelopment =
    context.extensionMode === vscode.ExtensionMode.Development;

  // The server is bundled into 'server.js' within the VSIX.
  // In development mode, it's in the 'out' directory (compiled)
  // In production mode, it's in the extension root (bundled)
  const serverModule = isDevelopment
    ? context.asAbsolutePath('out/server.js')
    : context.asAbsolutePath('server.js');

  logToOutputChannel(`Server module path: ${serverModule}`, 'debug');
  logToOutputChannel(
    `Running in ${isDevelopment ? 'development' : 'production'} mode`,
    'debug',
  );

  // Get debug options
  const debugOptions = getDebugOptions();

  // Determine server mode based on extension mode
  // Note: Environment variables are not available in web workers, so we use extension mode
  const serverMode =
    context.extensionMode === vscode.ExtensionMode.Development ||
    context.extensionMode === vscode.ExtensionMode.Test
      ? 'development'
      : 'production';

  logToOutputChannel(
    `Using server mode from extension mode: ${serverMode}`,
    'debug',
  );

  return {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        env: {
          NODE_OPTIONS: '--enable-source-maps',
          APEX_LS_MODE: serverMode,
        },
      },
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        env: {
          NODE_OPTIONS: '--enable-source-maps',
          APEX_LS_MODE: serverMode,
        },
        ...(debugOptions && {
          execArgv: debugOptions,
        }),
      },
    },
  };
};

/**
 * Creates client options for the language server
 * @param context The extension context
 * @returns Client options configuration
 */
export const createClientOptions = (
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
    documentSelector: [{ scheme: 'file', language: 'apex' }],
    synchronize: {
      fileEvents:
        vscode.workspace.createFileSystemWatcher('**/*.{cls,trigger}'),
      configurationSection: 'apex',
    },
    // Add error handling with proper retry logic
    errorHandler: {
      error: handleClientError,
      closed: () => handleClientClosed(),
    },
    // Include workspace settings and extension mode in initialization options
    initializationOptions: {
      enableDocumentSymbols: true,
      extensionMode: serverMode, // Pass extension mode to server
      ...settings,
    },
    // Explicitly enable workspace configuration capabilities
    workspaceFolder: vscode.workspace.workspaceFolders?.[0],
  };
};

/**
 * Handles errors from the language client
 * @param error The error object
 * @param message The error message
 * @param _count The error count
 * @returns Error action to take
 */
const handleClientError = (
  error: Error,
  message: any,
  _count: number | undefined,
): { action: ErrorAction } => {
  logToOutputChannel(
    `LSP Error: ${message?.toString() || 'Unknown error'}`,
    'error',
  );
  if (error) {
    logToOutputChannel(`Error details: ${error}`, 'debug');
  }
  // Always continue on errors, we handle retries separately
  return { action: ErrorAction.Continue };
};

/**
 * Handles the client closed event
 * @returns Close action to take
 */
const handleClientClosed = (): { action: CloseAction } => {
  logToOutputChannel(
    `Connection to server closed - ${new Date().toISOString()}`,
    'info',
  );

  // Always return DoNotRestart since we handle restart logic separately
  return { action: CloseAction.DoNotRestart };
};
