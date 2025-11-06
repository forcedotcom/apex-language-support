/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { EXTENSION_CONSTANTS } from './constants';
import { logToOutputChannel, updateLogLevel } from './logging';
import {
  updateLogLevelStatusItems,
  refreshApexServerStatusLogLevel,
  updateProfilingStatus,
} from './status-bar';

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
export const registerLogLevelCommands = (
  context: vscode.ExtensionContext,
): void => {
  // Order from lowest to highest priority (most verbose to least verbose): Debug → Info → Warning → Error
  const logLevelCommands = [
    {
      commandId: EXTENSION_CONSTANTS.LOG_LEVEL_COMMANDS.DEBUG,
      logLevel: 'debug',
      title: 'Set Log Level: Debug',
    },
    {
      commandId: EXTENSION_CONSTANTS.LOG_LEVEL_COMMANDS.INFO,
      logLevel: 'info',
      title: 'Set Log Level: Info',
    },
    {
      commandId: EXTENSION_CONSTANTS.LOG_LEVEL_COMMANDS.WARNING,
      logLevel: 'warning',
      title: 'Set Log Level: Warning',
    },
    {
      commandId: EXTENSION_CONSTANTS.LOG_LEVEL_COMMANDS.ERROR,
      logLevel: 'error',
      title: 'Set Log Level: Error',
    },
  ];

  logLevelCommands.forEach(({ commandId, logLevel, title }) => {
    const command = vscode.commands.registerCommand(commandId, async () => {
      try {
        // Update the workspace configuration
        // Use the full config path 'apex.logLevel' to match package.json definition
        const config = vscode.workspace.getConfiguration();
        await config.update(
          'apex.logLevel',
          logLevel,
          vscode.ConfigurationTarget.Workspace,
        );

        // Update the log level immediately
        updateLogLevel(logLevel);

        // Update status bar items to reflect the new log level
        updateLogLevelStatusItems(logLevel);

        // Update server status item to show current log level
        refreshApexServerStatusLogLevel();

        logToOutputChannel(`Log level set to: ${logLevel}`, 'info');
        vscode.window.showInformationMessage(
          `Apex log level set to: ${logLevel}`,
        );
      } catch (error) {
        logToOutputChannel(
          `Failed to set log level to ${logLevel}: ${error}`,
          'error',
        );
        vscode.window.showErrorMessage(
          `Failed to set log level to ${logLevel}`,
        );
      }
    });

    context.subscriptions.push(command);
  });
};

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

/**
 * Registers profiling commands (start/stop/status)
 * Only registers if running in desktop environment
 * @param context The extension context
 */
export const registerProfilingCommands = (
  context: vscode.ExtensionContext,
): void => {
  // Only register in desktop environment
  if (vscode.env.uiKind === vscode.UIKind.Web) {
    logToOutputChannel(
      'Profiling commands not registered (web environment)',
      'debug',
    );
    return;
  }

  // Get client from language-server module
  const getClient = () => {
    try {
      const { getClient } = require('./language-server');
      return getClient();
    } catch (error) {
      return undefined;
    }
  };

  // Register apex.profiling.start
  const startCommand = vscode.commands.registerCommand(
    'apex.profiling.start',
    async (params?: { type?: 'cpu' | 'heap' | 'both' }) => {
      try {
        const client = getClient();
        if (!client) {
          vscode.window.showErrorMessage(
            'Language server is not available. Please wait for it to start.',
          );
          return;
        }

        // Get profiling type from params or settings
        const config = vscode.workspace.getConfiguration('apex.environment');
        const profilingType =
          params?.type ??
          config.get<'cpu' | 'heap' | 'both'>('profilingType', 'cpu');

        logToOutputChannel(
          `Starting profiling (type: ${profilingType})...`,
          'info',
        );

        const result = await client.languageClient.sendRequest(
          'apex/profiling/start',
          { type: profilingType },
        );

        if (result.success) {
          vscode.window.showInformationMessage(
            `Profiling started: ${result.message}`,
          );
          logToOutputChannel(`Profiling started: ${result.message}`, 'info');
          // Update profiling status item
          await updateProfilingStatus();
        } else {
          vscode.window.showErrorMessage(
            `Failed to start profiling: ${result.message}`,
          );
          logToOutputChannel(
            `Failed to start profiling: ${result.message}`,
            'error',
          );
        }
      } catch (error) {
        const errorMessage = `Error starting profiling: ${error}`;
        vscode.window.showErrorMessage(errorMessage);
        logToOutputChannel(errorMessage, 'error');
      }
    },
  );

  // Register apex.profiling.stop
  const stopCommand = vscode.commands.registerCommand(
    'apex.profiling.stop',
    async () => {
      try {
        const client = getClient();
        if (!client) {
          vscode.window.showErrorMessage(
            'Language server is not available. Please wait for it to start.',
          );
          return;
        }

        logToOutputChannel('Stopping profiling...', 'info');

        const result = await client.languageClient.sendRequest(
          'apex/profiling/stop',
          {},
        );

        if (result.success) {
          const filesMessage = result.files
            ? `\nFiles saved:\n${result.files.join('\n')}`
            : '';
          vscode.window.showInformationMessage(
            `Profiling stopped: ${result.message}${filesMessage}`,
          );
          logToOutputChannel(
            `Profiling stopped: ${result.message}${filesMessage}`,
            'info',
          );
          // Update profiling status item
          await updateProfilingStatus();
        } else {
          vscode.window.showErrorMessage(
            `Failed to stop profiling: ${result.message}`,
          );
          logToOutputChannel(
            `Failed to stop profiling: ${result.message}`,
            'error',
          );
        }
      } catch (error) {
        const errorMessage = `Error stopping profiling: ${error}`;
        vscode.window.showErrorMessage(errorMessage);
        logToOutputChannel(errorMessage, 'error');
      }
    },
  );

  // Register apex.profiling.status
  const statusCommand = vscode.commands.registerCommand(
    'apex.profiling.status',
    async () => {
      try {
        const client = getClient();
        if (!client) {
          vscode.window.showErrorMessage(
            'Language server is not available. Please wait for it to start.',
          );
          return;
        }

        const status = await client.languageClient.sendRequest(
          'apex/profiling/status',
          {},
        );

        const statusMessage = status.isProfiling
          ? `Profiling is active (type: ${status.type})`
          : 'Profiling is not active';
        const availableMessage = status.available
          ? 'Profiling is available'
          : 'Profiling is not available in this environment';

        vscode.window.showInformationMessage(
          `${statusMessage}. ${availableMessage}.`,
        );
        logToOutputChannel(
          `Profiling status: ${statusMessage}. ${availableMessage}.`,
          'info',
        );
      } catch (error) {
        const errorMessage = `Error getting profiling status: ${error}`;
        vscode.window.showErrorMessage(errorMessage);
        logToOutputChannel(errorMessage, 'error');
      }
    },
  );

  context.subscriptions.push(startCommand, stopCommand, statusCommand);
  logToOutputChannel('Profiling commands registered', 'debug');
};
