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
  runEffectRestartLanguageServer,
  runSimulatedErrorRestart,
} from './observability';

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
  const restartCommand = vscode.commands.registerCommand(
    EXTENSION_CONSTANTS.RESTART_COMMAND_ID,
    async () => {
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
    },
  );

  context.subscriptions.push(restartCommand);
};

/**
 * Registers the DEMO command to restart the Apex Language Server using Effect.ts instrumentation
 * @param context The extension context
 */
export const registerDemoRestartCommand = (
  context: vscode.ExtensionContext,
): void => {
  const demoRestartCommand = vscode.commands.registerCommand(
    EXTENSION_CONSTANTS.DEMO_RESTART_COMMAND_ID,
    async () => {
      // Only allow manual restart if we're not already starting and we're outside cooldown period
      const now = Date.now();
      if (
        !isStarting &&
        now - lastRestartTime > EXTENSION_CONSTANTS.COOLDOWN_PERIOD_MS
      ) {
        lastRestartTime = now;
        serverStartRetries = 0; // Reset retry counter on manual restart

        if (restartHandler) {
          logToOutputChannel(
            'DEMO: Starting Effect.ts instrumented restart...',
            'info',
          );
          await runEffectRestartLanguageServer(context, restartHandler);
        } else {
          logToOutputChannel('DEMO: Restart handler not set', 'error');
        }
      } else {
        logToOutputChannel(
          'DEMO: Restart blocked: Server is already starting or in cooldown period',
          'info',
        );
        vscode.window.showInformationMessage(
          'DEMO: Server restart was requested too soon after previous attempt. Please wait a moment before trying again.',
        );
      }
    },
  );

  context.subscriptions.push(demoRestartCommand);
};

/**
 * Registers the DEMO command to simulate an error restart using Effect.ts instrumentation
 * @param context The extension context
 */
export const registerDemoErrorRestartCommand = (
  context: vscode.ExtensionContext,
): void => {
  const demoErrorRestartCommand = vscode.commands.registerCommand(
    EXTENSION_CONSTANTS.DEMO_ERROR_RESTART_COMMAND_ID,
    async () => {
      // Only allow manual restart if we're not already starting and we're outside cooldown period
      const now = Date.now();
      if (
        !isStarting &&
        now - lastRestartTime > EXTENSION_CONSTANTS.COOLDOWN_PERIOD_MS
      ) {
        lastRestartTime = now;
        serverStartRetries = 0; // Reset retry counter on manual restart

        if (restartHandler) {
          logToOutputChannel(
            'DEMO: Starting simulated error restart...',
            'warning',
          );

          try {
            await runSimulatedErrorRestart(context, restartHandler);
            vscode.window.showInformationMessage(
              'DEMO: Unexpected - Error simulation completed without error',
            );
          } catch (error) {
            logToOutputChannel(
              `DEMO: Expected error from simulation: ${error}`,
              'info',
            );
            vscode.window.showWarningMessage(
              `DEMO: Simulated error restart completed as expected. Error: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        } else {
          logToOutputChannel('DEMO: Restart handler not set', 'error');
        }
      } else {
        logToOutputChannel(
          'DEMO: Error restart blocked: Server is already starting or in cooldown period',
          'info',
        );
        vscode.window.showInformationMessage(
          'DEMO: Error restart was requested too soon after previous attempt. Please wait a moment before trying again.',
        );
      }
    },
  );

  context.subscriptions.push(demoErrorRestartCommand);
};

/**
 * Registers commands for setting log levels
 * @param context The extension context
 */
export const registerLogLevelCommands = (
  context: vscode.ExtensionContext,
): void => {
  const logLevelCommands = [
    {
      commandId: EXTENSION_CONSTANTS.LOG_LEVEL_COMMANDS.ERROR,
      logLevel: 'error',
      title: 'Set Log Level: Error',
    },
    {
      commandId: EXTENSION_CONSTANTS.LOG_LEVEL_COMMANDS.WARNING,
      logLevel: 'warning',
      title: 'Set Log Level: Warning',
    },
    {
      commandId: EXTENSION_CONSTANTS.LOG_LEVEL_COMMANDS.INFO,
      logLevel: 'info',
      title: 'Set Log Level: Info',
    },
    {
      commandId: EXTENSION_CONSTANTS.LOG_LEVEL_COMMANDS.DEBUG,
      logLevel: 'debug',
      title: 'Set Log Level: Debug',
    },
  ];

  logLevelCommands.forEach(({ commandId, logLevel, title }) => {
    const command = vscode.commands.registerCommand(commandId, async () => {
      try {
        // Update the workspace configuration
        const config = vscode.workspace.getConfiguration(
          EXTENSION_CONSTANTS.CONFIG_SECTION,
        );
        await config.update(
          'ls.logLevel',
          logLevel,
          vscode.ConfigurationTarget.Workspace,
        );

        // Update the log level immediately
        updateLogLevel(logLevel);

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
