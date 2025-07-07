/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { EXTENSION_CONSTANTS } from './constants';
import { logToOutputChannel } from './logging';
import {
  getServerStartRetries,
  incrementServerStartRetries,
  resetServerStartRetries,
  getLastRestartTime,
  setLastRestartTime,
  setStartingFlag,
  getGlobalContext,
} from './commands';
import {
  updateApexServerStatusStopped,
  updateApexServerStatusError,
} from './status-bar';

/**
 * Handles auto-restart logic with exponential backoff
 * @param restartHandler The function to handle server restart
 * @returns Whether auto-restart was initiated
 */
export const handleAutoRestart = async (
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<boolean> => {
  const now = Date.now();

  // Only attempt auto-restart if within retry limit and cooldown period
  if (
    getServerStartRetries() < EXTENSION_CONSTANTS.MAX_RETRIES &&
    now - getLastRestartTime() > EXTENSION_CONSTANTS.MIN_RESTART_DELAY_MS
  ) {
    incrementServerStartRetries();
    setLastRestartTime(now);

    // Exponential backoff between retries
    const delay = Math.min(
      2000 * Math.pow(2, getServerStartRetries() - 1),
      10000,
    );
    logToOutputChannel(
      // eslint-disable-next-line max-len
      `Will retry server start (${getServerStartRetries()}/${EXTENSION_CONSTANTS.MAX_RETRIES}) after ${delay}ms delay...`,
      'info',
    );

    setTimeout(() => {
      // Use stored global context
      restartHandler(getGlobalContext());
    }, delay);

    return true;
  } else {
    if (getServerStartRetries() >= EXTENSION_CONSTANTS.MAX_RETRIES) {
      handleMaxRetriesExceeded(restartHandler);
    }
    return false;
  }
};

/**
 * Handles the case when max retries are exceeded
 * @param restartHandler The function to handle server restart
 */
export const handleMaxRetriesExceeded = (
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): void => {
  logToOutputChannel(
    `Max retries (${EXTENSION_CONSTANTS.MAX_RETRIES}) exceeded. Auto-restart disabled.`,
    'info',
  );

  // Update status to show error state
  updateApexServerStatusError();

  vscode.window
    .showErrorMessage(
      'The Apex Language Server failed to start after multiple attempts. Click the status bar icon to try again.',
      'Restart Now',
    )
    .then((selection) => {
      if (selection === 'Restart Now') {
        resetServerStartRetries();
        setLastRestartTime(Date.now());
        // Use stored global context
        restartHandler(getGlobalContext());
      }
    });
};

/**
 * Handles client closed event with proper state management
 * @param restartHandler The function to handle server restart
 */
export const handleClientClosed = async (
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> => {
  logToOutputChannel(
    `Connection to server closed - ${new Date().toISOString()}`,
    'info',
  );

  setStartingFlag(false);
  updateApexServerStatusStopped();

  // Attempt auto-restart
  await handleAutoRestart(restartHandler);
};

/**
 * Handles client error with proper logging
 * @param error The error object
 * @param message The error message
 */
export const handleClientError = (error: Error, message: any): void => {
  logToOutputChannel(
    `LSP Error: ${message?.toString() || 'Unknown error'}`,
    'error',
  );
  if (error) {
    logToOutputChannel(`Error details: ${error}`, 'debug');
  }
  updateApexServerStatusError();
};
