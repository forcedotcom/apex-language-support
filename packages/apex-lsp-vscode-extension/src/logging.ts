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
import { EXTENSION_CONSTANTS } from './constants';

/**
 * Global output channel for extension logging
 */
let outputChannel: vscode.OutputChannel;

/**
 * Initializes the logging system
 * @param context The extension context
 */
export const initializeLogging = (context: vscode.ExtensionContext): void => {
  outputChannel = vscode.window.createOutputChannel(
    EXTENSION_CONSTANTS.OUTPUT_CHANNEL_NAME,
  );
  context.subscriptions.push(outputChannel);

  // Set initial log level from workspace settings
  const config = vscode.workspace.getConfiguration('apex-ls-ts');
  const logLevel = config.get<string>('logLevel', 'error');
  setLogLevel(logLevel);
};

/**
 * Logs a message to the extension output channel
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
  const formattedMessage = `[${timestamp}] [${typeString}] ${message}`;

  outputChannel.appendLine(formattedMessage);
};

/**
 * Updates the log level based on workspace configuration
 * @param logLevel The new log level
 */
export const updateLogLevel = (logLevel: string): void => {
  setLogLevel(logLevel);
};

/**
 * Gets the extension output channel instance
 * @returns The extension output channel
 */
export const getOutputChannel = (): vscode.OutputChannel => outputChannel;
