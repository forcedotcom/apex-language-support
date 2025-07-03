/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { shouldLog, setLogLevel } from '@salesforce/apex-lsp-logging';
import type { LogMessageType } from '@salesforce/apex-lsp-logging';
/**
 * Global output channel for logging
 */
let outputChannel: vscode.OutputChannel;

/**
 * Initializes the logging system
 * @param context The extension context
 */
export const initializeLogging = (context: vscode.ExtensionContext): void => {
  outputChannel = vscode.window.createOutputChannel(
    'Apex Language Server (Typescript)',
  );
  context.subscriptions.push(outputChannel);

  // Set initial log level from workspace settings
  const config = vscode.workspace.getConfiguration('apex');
  const logLevel = config.get<string>('ls.logLevel', 'error');
  setLogLevel(logLevel);
};

/**
 * Logs a message to the output channel
 * @param message The message to log
 * @param messageType The type of log message
 */
export const logToOutputChannel = (
  message: string,
  messageType: LogMessageType = 'info',
): void => {
  if (!shouldLog(messageType)) return;

  const timestamp = new Date().toISOString();
  const typeString = messageType.toUpperCase();
  outputChannel.appendLine(`[${timestamp}] [${typeString}] ${message}`);
};

/**
 * Updates the log level based on workspace configuration
 * @param logLevel The new log level
 */
export const updateLogLevel = (logLevel: string): void => {
  setLogLevel(logLevel);
};

/**
 * Gets the output channel instance
 * @returns The output channel
 */
export const getOutputChannel = (): vscode.OutputChannel => outputChannel;
