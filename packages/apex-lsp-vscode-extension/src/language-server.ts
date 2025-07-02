/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { LanguageClient, State } from 'vscode-languageclient/node';
import { createServerOptions, createClientOptions } from './server-config';
import { logToOutputChannel } from './logging';
import { LogMessageType } from '@salesforce/apex-lsp-logging';
import {
  updateStatusBarStarting,
  updateStatusBarReady,
  updateStatusBarError,
} from './status-bar';
import {
  setStartingFlag,
  getStartingFlag,
  resetServerStartRetries,
} from './commands';
import { registerConfigurationChangeListener } from './configuration';

/**
 * Global language client instance
 */
let client: LanguageClient | undefined;

/**
 * Creates and starts the language client
 * @param serverOptions The server options
 * @param clientOptions The client options
 * @param context The extension context
 * @param restartHandler The function to handle server restart
 */
export const createAndStartClient = (
  serverOptions: any,
  clientOptions: any,
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): void => {
  try {
    // Create the language client
    client = new LanguageClient(
      'apexLanguageServer',
      'Apex Language Server',
      serverOptions,
      clientOptions,
    );

    // Update status
    updateStatusBarStarting();

    // Track client state changes
    client.onDidChangeState((event) => {
      logToOutputChannel(
        `Client state changed: ${State[event.oldState]} -> ${State[event.newState]}`,
        LogMessageType.Debug,
      );

      if (event.newState === State.Running) {
        updateStatusBarReady();
        // Reset retry counter on successful start
        resetServerStartRetries();
        setStartingFlag(false);

        // Register configuration change listener when client is ready
        registerConfigurationChangeListener(client!, context);
      } else if (event.newState === State.Starting) {
        updateStatusBarStarting();
      } else {
        updateStatusBarError();
        setStartingFlag(false);
      }
    });

    // Start the client
    logToOutputChannel(
      'Starting Apex Language Server client...',
      LogMessageType.Info,
    );
    client.start().catch((error) => {
      logToOutputChannel(
        `Failed to start client: ${error}`,
        LogMessageType.Error,
      );
      setStartingFlag(false);
      updateStatusBarError();
    });
  } catch (e) {
    logToOutputChannel(`Error creating client: ${e}`, LogMessageType.Error);
    setStartingFlag(false);
  }
};

/**
 * Starts the language server
 * @param context The extension context
 * @param restartHandler The function to handle server restart
 */
export const startLanguageServer = async (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> => {
  // Guard against multiple simultaneous start attempts
  if (getStartingFlag()) {
    logToOutputChannel('Blocked duplicate start attempt', LogMessageType.Info);
    return;
  }

  try {
    setStartingFlag(true);
    logToOutputChannel('Starting language server...', LogMessageType.Info);

    // Clean up previous client if it exists
    if (client) {
      await client.stop();
      client = undefined;
    }

    // Set up server and client components
    const serverOptions = createServerOptions(context);
    const clientOptions = createClientOptions();

    createAndStartClient(serverOptions, clientOptions, context, restartHandler);
  } catch (error) {
    logToOutputChannel(
      `Error in startLanguageServer: ${error}`,
      LogMessageType.Error,
    );
    vscode.window.showErrorMessage(
      `Failed to start Apex Language Server: ${error}`,
    );
    setStartingFlag(false);
    updateStatusBarError();
  }
};

/**
 * Restarts the language server
 * @param context The extension context
 * @param restartHandler The function to handle server restart
 */
export const restartLanguageServer = async (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> => {
  logToOutputChannel(
    `Restarting Apex Language Server at ${new Date().toISOString()}...`,
    LogMessageType.Info,
  );
  await startLanguageServer(context, restartHandler);
};

/**
 * Stops the language server
 */
export const stopLanguageServer = async (): Promise<void> => {
  if (client) {
    await client.stop();
    client = undefined;
  }
};

/**
 * Gets the current language client
 * @returns The language client or undefined
 */
export const getLanguageClient = (): LanguageClient | undefined => client;
