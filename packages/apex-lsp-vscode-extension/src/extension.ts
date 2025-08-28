/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Import polyfills first for web compatibility
import './polyfills';

import * as vscode from 'vscode';
import {
  initializeExtensionLogging,
  logToOutputChannel,
  updateLogLevel,
} from './logging';
import {
  createApexLanguageStatusActions,
  updateLogLevelStatusItems,
  createApexServerStatusItem,
} from './status-bar';
import {
  initializeCommandState,
  registerRestartCommand,
  setRestartHandler,
} from './commands';
import {
  startLanguageServer,
  restartLanguageServer,
  stopLanguageServer,
} from './language-server';
import { getWorkspaceSettings } from './configuration';

/**
 * Wrapper function for restart that matches the expected signature
 * @param context The extension context
 */
const handleRestart = async (
  context: vscode.ExtensionContext,
): Promise<void> => {
  await restartLanguageServer(context, handleRestart);
};

/**
 * Wrapper function for start that matches the expected signature
 * @param context The extension context
 */
const handleStart = async (context: vscode.ExtensionContext): Promise<void> => {
  await startLanguageServer(context, handleRestart);
};

/**
 * Main extension activation function
 * @param context The extension context
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('🚀 [APEX-EXT] Extension activation started');

  // Initialize simple extension logging
  initializeExtensionLogging(context);

  logToOutputChannel('🔧 Extension logging system initialized', 'info');
  logToOutputChannel(
    `📍 Extension context: ${context.extensionMode === 1 ? 'Development' : 'Production'} mode`,
    'info',
  );
  logToOutputChannel(`📂 Extension path: ${context.extensionPath}`, 'debug');

  // Initialize command state
  initializeCommandState(context);
  logToOutputChannel('⚙️ Command state initialized', 'debug');

  // Create persistent server status LanguageStatusItem
  createApexServerStatusItem(context);
  logToOutputChannel('📊 Server status item created', 'debug');

  // Set the restart handler
  setRestartHandler(handleRestart);
  logToOutputChannel('🔄 Restart handler configured', 'debug');

  // Register restart command
  registerRestartCommand(context);
  logToOutputChannel('📝 Restart command registered', 'debug');

  // Register log level commands for each log level
  const logLevels = ['error', 'warning', 'info', 'debug'];
  logLevels.forEach((level) => {
    const commandId = `apex-ls-ts.setLogLevel.${level}`;
    const disposable = vscode.commands.registerCommand(commandId, async () => {
      const config = vscode.workspace.getConfiguration('apex-ls-ts');
      await config.update(
        'logLevel',
        level,
        vscode.ConfigurationTarget.Workspace,
      );
      updateLogLevel(level);
      updateLogLevelStatusItems(level);
    });
    context.subscriptions.push(disposable);
  });
  logToOutputChannel(
    `📋 Registered ${logLevels.length} log level commands`,
    'debug',
  );

  // Create language status actions for log levels and restart
  createApexLanguageStatusActions(
    context,
    () => getWorkspaceSettings().apex.logLevel,
    async (level: string) => {
      const config = vscode.workspace.getConfiguration('apex-ls-ts');
      await config.update(
        'logLevel',
        level,
        vscode.ConfigurationTarget.Workspace,
      );
      updateLogLevel(level);
      updateLogLevelStatusItems(level);
    },
    async () => {
      await handleRestart(context);
    },
  );
  logToOutputChannel('🎛️ Language status actions created', 'debug');

  // Log activation
  logToOutputChannel(
    '✅ Extension setup completed, starting language server...',
    'info',
  );

  // Start the language server
  handleStart(context).catch((error) => {
    logToOutputChannel(`❌ Failed to start language server: ${error}`, 'error');
    console.error('❌ [APEX-EXT] Failed to start language server:', error);
  });

  console.log('✅ [APEX-EXT] Extension activation completed');
}

/**
 * Main extension deactivation function
 */
export async function deactivate(): Promise<void> {
  logToOutputChannel('Deactivating Apex Language Server extension', 'info');

  await stopLanguageServer();
}
