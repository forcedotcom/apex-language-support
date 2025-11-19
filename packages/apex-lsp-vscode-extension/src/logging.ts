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
    'apex',
  );

  context.subscriptions.push(clientOutputChannel, workerServerOutputChannel);

  // Set initial log level from workspace settings
  // Use the full config path 'apex.logLevel' to match package.json definition
  const config = vscode.workspace.getConfiguration();
  const logLevel = config.get<string>('apex.logLevel') ?? 'info';
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

  const formattedMessage = formatLogMessageWithTimestamp(message, messageType);
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
export const getWorkerServerOutputChannel = ():
  | vscode.OutputChannel
  | undefined => workerServerOutputChannel;

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

  const formattedMessage = formatLogMessageWithTimestamp(message, messageType);
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

  const formattedMessage = formatLogMessageWithTimestamp(message, messageType);
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

  const formattedMessage = formatLogMessageWithTimestamp(message, messageType);
  workerServerOutputChannel.appendLine(formattedMessage);
};

/**
 * Formats a timestamp in ISO format (local timezone)
 * @returns Formatted timestamp string in format YYYY-MM-DDTHH:mm:ss.SSS
 */
const formatTimestampISO = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const milliseconds = String(now.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}`;
};

/**
 * Maps log message type to display string
 * @param messageType The log message type
 * @returns Uppercase log level string
 */
const getLogLevelString = (messageType: LogMessageType): string => {
  switch (messageType) {
    case 'error':
      return 'ERROR';
    case 'warning':
      return 'WARNING';
    case 'info':
      return 'INFO';
    case 'log':
      // 'log' is used as a proxy for 'debug' in LSP (since LSP doesn't support 'debug' type)
      // Display it as DEBUG to match the original intent
      return 'DEBUG';
    case 'debug':
      return 'DEBUG';
    default:
      return 'INFO';
  }
};

/**
 * Formats a log message with timestamp and log level prefix
 * Format: [<ISO timestamp>][<log level>] <message>
 * @param message The message to format
 * @param messageType The log message type
 * @returns Formatted message string
 */
export const formatLogMessageWithTimestamp = (
  message: string,
  messageType: LogMessageType,
): string => {
  const timestamp = formatTimestampISO();
  const logLevel = getLogLevelString(messageType);
  return `[${timestamp}][${logLevel}] ${message}`;
};

/**
 * Cleans a message by removing [NODE] or [BROWSER] prefixes
 * Also removes old-format timestamps like [5:56:44 AM] [INFO] [SERVER]
 * @param message The message to clean
 * @returns Cleaned message without environment prefix and old format timestamps
 */
const cleanMessagePrefix = (message: string): string => {
  // Remove [NODE] or [BROWSER] prefix
  if (message.startsWith('[NODE] ')) {
    message = message.substring(7); // Remove '[NODE] '
  } else if (message.startsWith('[BROWSER] ')) {
    message = message.substring(10); // Remove '[BROWSER] '
  }

  // Remove old format timestamps like [5:56:44 AM] [INFO] [SERVER] or [5:56:44 AM] [INFO]
  // Pattern: [HH:MM:SS AM/PM] [LEVEL] [SERVER/WORKER]? <actual message>
  const oldFormatPattern =
    /^\[\d{1,2}:\d{2}:\d{2}\s(AM|PM)\]\s\[(ERROR|WARNING|INFO|DEBUG|TRACE)\]\s(\[SERVER\]|\[WORKER\])?\s*/i;
  message = message.replace(oldFormatPattern, '');

  return message;
};

/**
 * Detects log level from a message line
 * Attempts to infer log level from common patterns
 * @param message The message to analyze
 * @returns Detected log level or 'info' as default
 */
const detectLogLevelFromMessage = (message: string): LogMessageType => {
  const upperMessage = message.toUpperCase();
  if (upperMessage.includes('ERROR') || upperMessage.includes('❌')) {
    return 'error';
  }
  if (
    upperMessage.includes('WARNING') ||
    upperMessage.includes('WARN') ||
    upperMessage.includes('⚠️')
  ) {
    return 'warning';
  }
  if (upperMessage.includes('DEBUG') || upperMessage.includes('🔍')) {
    return 'debug';
  }
  return 'info';
};

/**
 * Creates a formatted output channel wrapper that intercepts messages
 * and formats them with timestamps
 * @param baseChannel The base output channel to wrap
 * @returns A new OutputChannel that formats messages
 */
export const createFormattedOutputChannel = (
  baseChannel: vscode.OutputChannel,
): vscode.OutputChannel => ({
  name: baseChannel.name,
  append: (value: string) => {
    // For append, we don't format individual chunks
    // Only format on appendLine
    baseChannel.append(value);
  },
  appendLine: (value: string) => {
    // Clean message of [NODE] or [BROWSER] prefix
    const cleanMessage = cleanMessagePrefix(value);
    // Detect log level from message content
    const logLevel = detectLogLevelFromMessage(cleanMessage);
    // Check if message should be logged based on current log level
    if (!shouldLog(logLevel)) {
      return; // Don't log if below current log level
    }
    // Format with timestamp
    const formatted = formatLogMessageWithTimestamp(cleanMessage, logLevel);
    baseChannel.appendLine(formatted);
  },
  replace: (value: string) => baseChannel.replace(value),
  clear: () => baseChannel.clear(),
  show: (
    columnOrPreserveFocus?: vscode.ViewColumn | boolean,
    preserveFocus?: boolean,
  ) => {
    // Handle both overloads: show(preserveFocus?) and show(column?, preserveFocus?)
    if (typeof columnOrPreserveFocus === 'boolean') {
      baseChannel.show(columnOrPreserveFocus);
    } else {
      baseChannel.show(columnOrPreserveFocus, preserveFocus);
    }
  },
  hide: () => baseChannel.hide(),
  dispose: () => baseChannel.dispose(),
});
