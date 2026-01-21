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
 * Logs a message to the worker/server output channel
 * @param message The message to log
 * @param messageType The type of log message (for filtering only)
 */
export const logWorkerMessage = (
  message: string,
  messageType: LogMessageType = 'info',
): void => {
  if (!shouldLog(messageType)) return;

  // Write raw message - no formatting (consistent with server LSP logs)
  workerServerOutputChannel.appendLine(message);
};

/**
 * Logs a message to the worker/server output channel
 * @param message The message to log
 * @param messageType The type of log message (for filtering only)
 */
export const logServerMessage = (
  message: string,
  messageType: LogMessageType = 'info',
): void => {
  if (!shouldLog(messageType)) return;

  // Write raw message - no formatting (consistent with server LSP logs)
  workerServerOutputChannel.appendLine(message);
};

/**
 * Formats a timestamp using locale-aware formatting based on VS Code's UI locale
 * Combines discoverable data points: VS Code locale, system timezone, and locale preferences
 * @returns Formatted timestamp string respecting locale conventions while maintaining parseability
 */
const formatTimestampVSCodeStyle = (): string => {
  const now = new Date();

  // Get VS Code's UI locale (e.g., "en", "es", "fr", "zh-cn")
  const locale = vscode.env.language || 'en';

  // Detect system timezone and other locale preferences
  const resolvedOptions = Intl.DateTimeFormat().resolvedOptions();
  const timeZone = resolvedOptions.timeZone;

  try {
    // Use Intl.DateTimeFormat with locale-aware options
    // Extract individual parts to maintain control over formatting
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false, // Use 24-hour format for consistency in logs
      timeZone,
    });

    // Get formatted parts
    const parts = dateFormatter.formatToParts(now);

    // Extract date/time components (respecting locale for values, but using standard structure)
    const year =
      parts.find((p) => p.type === 'year')?.value || String(now.getFullYear());
    const month =
      parts.find((p) => p.type === 'month')?.value.padStart(2, '0') ||
      String(now.getMonth() + 1).padStart(2, '0');
    const day =
      parts.find((p) => p.type === 'day')?.value.padStart(2, '0') ||
      String(now.getDate()).padStart(2, '0');
    const hour =
      parts.find((p) => p.type === 'hour')?.value.padStart(2, '0') ||
      String(now.getHours()).padStart(2, '0');
    const minute =
      parts.find((p) => p.type === 'minute')?.value.padStart(2, '0') ||
      String(now.getMinutes()).padStart(2, '0');
    const second =
      parts.find((p) => p.type === 'second')?.value.padStart(2, '0') ||
      String(now.getSeconds()).padStart(2, '0');

    // Milliseconds are not part of Intl.DateTimeFormat standard options,
    // so we get them directly from the Date object
    // The timezone conversion is already handled by Intl.DateTimeFormat above
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

    // Construct timestamp: YYYY-MM-DD HH:mm:ss.SSS
    // Uses locale-aware date/time values but maintains consistent structure for log parsing
    return `${year}-${month}-${day} ${hour}:${minute}:${second}.${milliseconds}`;
  } catch (_error) {
    // Fallback to default format if locale formatting fails
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  }
};

/**
 * Maps log message type to display string matching VS Code's LogOutputChannel format
 * @param messageType The log message type
 * @returns Lowercase log level string (matches LogOutputChannel)
 */
const getLogLevelString = (messageType: LogMessageType): string => {
  switch (messageType) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    case 'log':
      // 'log' is used as a proxy for 'debug' in LSP (since LSP doesn't support 'debug' type)
      // Display it as debug to match the original intent
      return 'debug';
    case 'debug':
      return 'debug';
    default:
      return 'info';
  }
};

/**
 * Formats a log message with timestamp and log level prefix to match VS Code's LogOutputChannel
 * Format: YYYY-MM-DD HH:mm:ss.SSS [level] message
 * @param message The message to format
 * @param messageType The log message type
 * @returns Formatted message string matching LogOutputChannel format
 */
export const formatLogMessageWithTimestamp = (
  message: string,
  messageType: LogMessageType,
): string => {
  const timestamp = formatTimestampVSCodeStyle();
  const logLevel = getLogLevelString(messageType);
  return `${timestamp} [${logLevel}] ${message}`;
};
