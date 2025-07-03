/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { initializeLogging, logToOutputChannel } from './logging';
import { createStatusBarItem } from './status-bar';
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
  // Initialize logging system
  initializeLogging(context);

  // Initialize command state
  initializeCommandState(context);

  // Create and initialize status bar item
  createStatusBarItem(context);

  // Set the restart handler
  setRestartHandler(handleRestart);

  // Register restart command
  registerRestartCommand(context);

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
