/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';

// Create an output channel for logs
let outputChannel: vscode.OutputChannel;

/**
 * Activate the extension
 * @param context The extension context
 */
export function activate(context: vscode.ExtensionContext) {
  // Create output channel
  outputChannel = vscode.window.createOutputChannel('Apex Language Server (Typescript)');
  context.subscriptions.push(outputChannel);

  outputChannel.appendLine('Apex Language Support extension is now active!');

  // Create and initialize status bar item
  const statusBarItem = createStatusBarItem(context);
  statusBarItem.text = '$(check) Apex Support Active';
  statusBarItem.tooltip = 'Apex Language Support is active';
  statusBarItem.show();

  // Register the restart command for future use
  registerRestartCommand(context, statusBarItem);

  // Log activation success
  outputChannel.appendLine(`Extension activated at ${new Date().toISOString()}`);
}

/**
 * Creates and initializes the status bar item
 */
function createStatusBarItem(context: vscode.ExtensionContext): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  context.subscriptions.push(statusBarItem);
  return statusBarItem;
}

/**
 * Registers the command to restart the extension functionality
 * This is kept as a placeholder for future language server integration
 */
function registerRestartCommand(context: vscode.ExtensionContext, statusBarItem: vscode.StatusBarItem): void {
  const restartCommand = vscode.commands.registerCommand('apex.restart.server', () => {
    outputChannel.appendLine('Restart command triggered - currently a no-op');
    vscode.window.showInformationMessage('Apex Language Support restarted');
    statusBarItem.text = '$(check) Apex Support Active';
  });

  context.subscriptions.push(restartCommand);
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
  outputChannel.appendLine('Deactivating Apex Language Support extension');
}
