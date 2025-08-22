/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { shouldLog, setLogLevel } from '@salesforce/apex-lsp-shared';
import type { LogMessageType } from '@salesforce/apex-lsp-shared';
import { EXTENSION_CONSTANTS } from './constants';

/**
 * Global output channels for logging
 */
let clientOutputChannel: vscode.OutputChannel;
let workerServerOutputChannel: vscode.OutputChannel;

/**
 * Initializes the logging system
 * @param context The extension context
 */
export const initializeExtensionLogging = (
  context: vscode.ExtensionContext,
): void => {
  clientOutputChannel = vscode.window.createOutputChannel(
    EXTENSION_CONSTANTS.CLIENT_OUTPUT_CHANNEL_NAME,
  );
  workerServerOutputChannel = vscode.window.createOutputChannel(
    EXTENSION_CONSTANTS.WORKER_SERVER_OUTPUT_CHANNEL_NAME,
  );

  context.subscriptions.push(
    clientOutputChannel,
    workerServerOutputChannel,
  );

  // Set initial log level from workspace settings
  const config = vscode.workspace.getConfiguration('apex-ls-ts');
  const logLevel = config.get<string>('logLevel') ?? 'info';
  setLogLevel(logLevel);
};

/**
 * Logs a message to the client output channel (for extension activation and client logs)
 * @param message The message to log
 * @param messageType The type of log message
 */
export const logToOutputChannel = (
  message: string,
  messageType: LogMessageType = 'info',
): void => {
  if (!shouldLog(messageType)) return;

  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: true });
  const typeString = messageType.toUpperCase();
  const formattedMessage = `[${timestamp}] [${typeString}] ${message}`;

  clientOutputChannel.appendLine(formattedMessage);
};

/**
 * Updates the log level based on workspace configuration
 * @param logLevel The new log level
 */
export const updateLogLevel = (logLevel: string): void => {
  setLogLevel(logLevel);
};

/**
 * Gets the client output channel instance
 * @returns The client output channel or undefined if not initialized
 */
export const getClientOutputChannel = (): vscode.OutputChannel | undefined =>
  clientOutputChannel;

/**
 * Gets the worker/server output channel instance
 * @returns The worker/server output channel or undefined if not initialized
 */
export const getWorkerServerOutputChannel = (): vscode.OutputChannel | undefined =>
  workerServerOutputChannel;

/**
 * Logs a message to the worker/server output channel (for worker and server logs)
 * @param message The message to log
 * @param messageType The type of log message
 */
export const logToWorkerServerOutputChannel = (
  message: string,
  messageType: LogMessageType = 'info',
): void => {
  if (!shouldLog(messageType)) return;

  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: true });
  const typeString = messageType.toUpperCase();
  const formattedMessage = `[${timestamp}] [${typeString}] ${message}`;

  workerServerOutputChannel.appendLine(formattedMessage);
};

/**
 * Logs a message to the worker/server output channel with [WORKER] prefix
 * @param message The message to log
 * @param messageType The type of log message
 */
export const logWorkerMessage = (
  message: string,
  messageType: LogMessageType = 'info',
): void => {
  if (!shouldLog(messageType)) return;

  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: true });
  const typeString = messageType.toUpperCase();
  const formattedMessage = `[${timestamp}] [${typeString}] [WORKER] ${message}`;

  workerServerOutputChannel.appendLine(formattedMessage);
};

/**
 * Logs a message to the worker/server output channel with [SERVER] prefix
 * @param message The message to log
 * @param messageType The type of log message
 */
export const logServerMessage = (
  message: string,
  messageType: LogMessageType = 'info',
): void => {
  if (!shouldLog(messageType)) return;

  const timestamp = new Date().toLocaleTimeString('en-US', { hour12: true });
  const typeString = messageType.toUpperCase();
  const formattedMessage = `[${timestamp}] [${typeString}] [SERVER] ${message}`;

  workerServerOutputChannel.appendLine(formattedMessage);
};
