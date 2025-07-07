/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import {
  initializeLogging,
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
  // Initialize simple extension logging
  initializeLogging(context);

  // Initialize command state
  initializeCommandState(context);

  // Create persistent server status LanguageStatusItem
  createApexServerStatusItem(context);

  // Set the restart handler
  setRestartHandler(handleRestart);

  // Register restart command
  registerRestartCommand(context);

  // Register log level commands for each log level
  const logLevels = ['error', 'warning', 'info', 'debug'];
  logLevels.forEach((level) => {
    const commandId = `apex.setLogLevel.${level}`;
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

  // Create language status actions for log levels and restart
  createApexLanguageStatusActions(
    context,
    () => getWorkspaceSettings().apex.ls.logLevel,
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

  // Log activation
  logToOutputChannel('Apex Language Server extension is now active!', 'info');

  // Start the language server
  handleStart(context);
}

/**
 * Main extension deactivation function
 */
export async function deactivate(): Promise<void> {
  logToOutputChannel('Deactivating Apex Language Server extension', 'info');

  await stopLanguageServer();
}
