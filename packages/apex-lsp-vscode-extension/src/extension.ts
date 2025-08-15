/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import {
  logToOutputChannel,
  initializeExtensionLogging,
  updateLogLevel,
} from './logging';
import {
  initializeCommandState,
  setStartingFlag,
  getStartingFlag,
  setRestartHandler,
  registerRestartCommand,
} from './commands';
import {
  createApexServerStatusItem,
  updateLogLevelStatusItems,
  createApexLanguageStatusActions,
} from './status-bar';
import { getWorkspaceSettings } from './configuration';
import { getApexLanguageClient, cleanupApexLanguageClient } from './client';
import { cleanupWebContainerManager } from './webcontainer-setup';

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 */
export async function activate(context: vscode.ExtensionContext) {
  logToOutputChannel(
    '=== Apex Language Server Extension Activating ===',
    'info',
  );

  try {
    // Initialize extension logging
    initializeExtensionLogging(context);

    // Initialize command state
    initializeCommandState(context);

    // Create status bar items
    createApexServerStatusItem(context);
    updateLogLevelStatusItems(getWorkspaceSettings().apex.logLevel);
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
        // Restart handler will be set later
      },
    );

    // Set up restart handler
    const restartHandler = async (ctx: vscode.ExtensionContext) => {
      logToOutputChannel('Restart handler called', 'info');

      if (getStartingFlag()) {
        logToOutputChannel('Server restart already in progress', 'info');
        return;
      }

      try {
        setStartingFlag(true);
        const client = getApexLanguageClient();
        await client.restart(ctx);
      } catch (error) {
        logToOutputChannel(`Error during restart: ${error}`, 'error');
      } finally {
        setStartingFlag(false);
      }
    };

    setRestartHandler(restartHandler);

    // Register restart command
    registerRestartCommand(context);

    // Start the language server
    logToOutputChannel('Starting Apex Language Server...', 'info');

    if (getStartingFlag()) {
      logToOutputChannel('Server start already in progress', 'info');
      return;
    }

    try {
      setStartingFlag(true);
      const client = getApexLanguageClient();
      await client.start(context);
    } catch (error) {
      logToOutputChannel(
        `Failed to start Apex Language Server: ${error}`,
        'error',
      );
      vscode.window.showErrorMessage(
        `Failed to start Apex Language Server: ${error}`,
      );
    } finally {
      setStartingFlag(false);
    }

    logToOutputChannel(
      '=== Apex Language Server Extension Activated ===',
      'info',
    );
  } catch (error) {
    logToOutputChannel(
      `Error activating Apex Language Server Extension: ${error}`,
      'error',
    );
    vscode.window.showErrorMessage(
      `Failed to activate Apex Language Server Extension: ${error}`,
    );
  }
}

/**
 * This method is called when your extension is deactivated.
 */
export async function deactivate() {
  logToOutputChannel(
    '=== Apex Language Server Extension Deactivating ===',
    'info',
  );

  try {
    // Clean up language client
    await cleanupApexLanguageClient();

    // Clean up WebContainer manager
    await cleanupWebContainerManager();

    logToOutputChannel(
      '=== Apex Language Server Extension Deactivated ===',
      'info',
    );
  } catch (error) {
    logToOutputChannel(`Error during deactivation: ${error}`, 'error');
  }
}
