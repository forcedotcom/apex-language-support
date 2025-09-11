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

/**
 * Global state for restart management
 */
let globalContext: vscode.ExtensionContext;
let serverStartRetries = 0;
let lastRestartTime = 0;
let isStarting = false;
let restartHandler:
  | ((context: vscode.ExtensionContext) => Promise<void>)
  | undefined;

/**
 * Initialize command state
 * @param context The extension context
 */
export const initializeCommandState = (
  context: vscode.ExtensionContext,
): void => {
  globalContext = context;
  serverStartRetries = 0;
  lastRestartTime = 0;
  isStarting = false;
};

/**
 * Sets the restart handler function
 * @param handler The restart handler function
 */
export const setRestartHandler = (
  handler: (context: vscode.ExtensionContext) => Promise<void>,
): void => {
  restartHandler = handler;
};

/**
 * Registers the command to restart the Apex Language Server
 * @param context The extension context
 */
export const registerRestartCommand = (
  context: vscode.ExtensionContext,
): void => {
  const restartLogic = async () => {
    // Only allow manual restart if we're not already starting and we're outside cooldown period
    const now = Date.now();
    if (
      !isStarting &&
      now - lastRestartTime > EXTENSION_CONSTANTS.COOLDOWN_PERIOD_MS
    ) {
      lastRestartTime = now;
      serverStartRetries = 0; // Reset retry counter on manual restart

      if (restartHandler) {
        await restartHandler(context);
      } else {
        logToOutputChannel('Restart handler not set', 'error');
      }
    } else {
      logToOutputChannel(
        'Restart blocked: Server is already starting or in cooldown period',
        'info',
      );
      vscode.window.showInformationMessage(
        'Server restart was requested too soon after previous attempt. Please wait a moment before trying again.',
      );
    }
  };

  // Register both restart commands for compatibility
  const restartCommand1 = vscode.commands.registerCommand(
    EXTENSION_CONSTANTS.RESTART_COMMAND_ID,
    restartLogic,
  );

  const restartCommand2 = vscode.commands.registerCommand(
    EXTENSION_CONSTANTS.WEB_RESTART_COMMAND_ID,
    restartLogic,
  );

  context.subscriptions.push(restartCommand1, restartCommand2);
};

/**
 * Registers commands for setting log levels
 * @param context The extension context
 */

/**
 * Sets the starting flag
 * @param starting Whether the server is starting
 */
export const setStartingFlag = (starting: boolean): void => {
  isStarting = starting;
};

/**
 * Gets the starting flag
 * @returns Whether the server is starting
 */
export const getStartingFlag = (): boolean => isStarting;

/**
 * Gets the server start retries count
 * @returns The number of retries
 */
export const getServerStartRetries = (): number => serverStartRetries;

/**
 * Increments the server start retries count
 */
export const incrementServerStartRetries = (): void => {
  serverStartRetries++;
};

/**
 * Resets the server start retries count
 */
export const resetServerStartRetries = (): void => {
  serverStartRetries = 0;
};

/**
 * Gets the last restart time
 * @returns The last restart timestamp
 */
export const getLastRestartTime = (): number => lastRestartTime;

/**
 * Sets the last restart time
 * @param time The restart timestamp
 */
export const setLastRestartTime = (time: number): void => {
  lastRestartTime = time;
};

/**
 * Gets the global context
 * @returns The extension context
 */
export const getGlobalContext = (): vscode.ExtensionContext => globalContext;
