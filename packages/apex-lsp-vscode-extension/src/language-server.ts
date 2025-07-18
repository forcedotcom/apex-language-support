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
import {
  setStartingFlag,
  getStartingFlag,
  resetServerStartRetries,
} from './commands';
import { registerConfigurationChangeListener } from './configuration';
import {
  updateApexServerStatusStarting,
  updateApexServerStatusReady,
  updateApexServerStatusError,
} from './status-bar';

/**
 * Global language client instance
 */
let client: LanguageClient | undefined;

/**
 * Track the last output channel created by the LanguageClient
 */
let lastServerOutputChannel: vscode.OutputChannel | undefined;

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
    // Dispose previous output channel if it exists
    if (lastServerOutputChannel) {
      lastServerOutputChannel.dispose();
      lastServerOutputChannel = undefined;
    }

    // Create the language client
    client = new LanguageClient(
      'apex-ls-ts',
      'Apex Language Server (Typescript)',
      serverOptions,
      clientOptions,
    );

    // Track the new output channel
    lastServerOutputChannel = client.outputChannel;

    // Track client state changes
    client.onDidChangeState((event) => {
      logToOutputChannel(
        `Client state changed: ${State[event.oldState]} -> ${State[event.newState]}`,
        'debug',
      );

      if (event.newState === State.Running) {
        updateApexServerStatusReady();
        // Reset retry counter on successful start
        resetServerStartRetries();
        setStartingFlag(false);

        // Register configuration change listener when client is ready
        registerConfigurationChangeListener(client!, context);
      } else if (event.newState === State.Starting) {
        updateApexServerStatusStarting();
      } else {
        updateApexServerStatusError();
        setStartingFlag(false);
      }
    });

    // Start the client
    logToOutputChannel('Starting Apex Language Server client...', 'info');
    client.start().catch((error) => {
      logToOutputChannel(`Failed to start client: ${error}`, 'error');
      setStartingFlag(false);
      updateApexServerStatusError();
    });
  } catch (e) {
    logToOutputChannel(`Error creating client: ${e}`, 'error');
    setStartingFlag(false);
    updateApexServerStatusError();
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
    logToOutputChannel('Blocked duplicate start attempt', 'info');
    return;
  }

  try {
    setStartingFlag(true);
    logToOutputChannel('Starting language server...', 'info');

    // Clean up previous client if it exists
    if (client) {
      await client.stop();
      client = undefined;
    }

    // Set up server and client components
    const serverOptions = createServerOptions(context);
    const clientOptions = createClientOptions(context);

    createAndStartClient(serverOptions, clientOptions, context, restartHandler);
  } catch (error) {
    logToOutputChannel(`Error in startLanguageServer: ${error}`, 'error');
    vscode.window.showErrorMessage(
      `Failed to start Apex Language Server: ${error}`,
    );
    setStartingFlag(false);
    updateApexServerStatusError();
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
    'info',
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
  // Dispose the last output channel if it exists
  if (lastServerOutputChannel) {
    lastServerOutputChannel.dispose();
    lastServerOutputChannel = undefined;
  }
};

/**
 * Gets the current language client
 * @returns The language client or undefined
 */
export const getLanguageClient = (): LanguageClient | undefined => client;
