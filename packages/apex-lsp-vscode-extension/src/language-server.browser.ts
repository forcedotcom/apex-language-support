/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { LanguageClient, State } from 'vscode-languageclient/browser';
import {
  createWebServerOptions,
  createWebClientOptions,
} from './server-config.browser';
import { logServerMessage } from './logging';
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
 * Global language client instance for web
 */
let webClient: LanguageClient | undefined;

/**
 * Creates and starts the web language client
 * @param worker The web worker for the language server
 * @param clientOptions The client options
 * @param context The extension context
 * @param restartHandler The function to handle server restart
 */
export const createAndStartWebClient = (
  worker: Worker,
  clientOptions: any,
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): void => {
  try {
    // Create the web language client
    webClient = new LanguageClient(
      'apex-ls-web',
      'Apex Language Server Extension (Web)',
      clientOptions,
      worker,
    );

    // Track client state changes
    webClient.onDidChangeState((event) => {
      logServerMessage(
        `Web client state changed: ${State[event.oldState]} -> ${State[event.newState]}`,
        'debug',
      );

      if (event.newState === State.Running) {
        updateApexServerStatusReady();
        // Reset retry counter on successful start
        resetServerStartRetries();
        setStartingFlag(false);

        // Register configuration change listener when client is ready
        registerConfigurationChangeListener(webClient!, context);
      } else if (event.newState === State.Starting) {
        updateApexServerStatusStarting();
      } else {
        updateApexServerStatusError();
        setStartingFlag(false);
      }
    });

    // Start the client
    logServerMessage('Starting Apex Web Language Server client...', 'info');
    webClient.start().catch((error) => {
      logServerMessage(`Failed to start web client: ${error}`, 'error');
      setStartingFlag(false);
      updateApexServerStatusError();
    });
  } catch (e) {
    logServerMessage(`Error creating web client: ${e}`, 'error');
    setStartingFlag(false);
    updateApexServerStatusError();
  }
};

/**
 * Starts the web language server
 * @param context The extension context
 * @param restartHandler The function to handle server restart
 */
export const startWebLanguageServer = async (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> => {
  // Guard against multiple simultaneous start attempts
  if (getStartingFlag()) {
    logServerMessage('Blocked duplicate web start attempt', 'info');
    return;
  }

  try {
    setStartingFlag(true);
    logServerMessage('Starting web language server...', 'info');

    // Clean up previous client if it exists
    if (webClient) {
      await webClient.stop();
      webClient = undefined;
    }

    // Set up server and client components
    const worker = createWebServerOptions(context);
    const clientOptions = createWebClientOptions(context);

    createAndStartWebClient(worker, clientOptions, context, restartHandler);
  } catch (error) {
    logServerMessage(`Error in startWebLanguageServer: ${error}`, 'error');
    vscode.window.showErrorMessage(
      `Failed to start Apex Language Server: ${error}`,
    );
    setStartingFlag(false);
    updateApexServerStatusError();
  }
};

/**
 * Restarts the web language server
 * @param context The extension context
 * @param restartHandler The function to handle server restart
 */
export const restartWebLanguageServer = async (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> => {
  logServerMessage(
    `Restarting Apex Web Language Server at ${new Date().toISOString()}...`,
    'info',
  );
  await startWebLanguageServer(context, restartHandler);
};

/**
 * Stops the web language server
 */
export const stopWebLanguageServer = async (): Promise<void> => {
  if (webClient) {
    await webClient.stop();
    webClient = undefined;
  }
};

/**
 * Gets the current web language client
 * @returns The language client or undefined
 */
export const getWebLanguageClient = (): LanguageClient | undefined => webClient;
