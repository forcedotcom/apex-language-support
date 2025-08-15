/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import {
  initializeExtensionLogging,
  logToOutputChannel,
  updateLogLevel,
} from './logging';
import {
  createApexLanguageStatusActions,
  updateLogLevelStatusItems,
  createApexServerStatusItem,
} from './status-bar';
import {
  initializeCommandState,
  registerRestartCommand,
  setRestartHandler,
} from './commands';
import { getWorkspaceSettings } from './configuration';
import {
  startWebLanguageServer,
  stopWebLanguageServer,
} from './language-server-web-native';

// Conditional import for language server (only in non-web environments)
let startLanguageServer: any;
let restartLanguageServer: any;
let stopLanguageServer: any;

// WebContainer language server functions
let startWebContainerLanguageServer: any;
let restartWebContainerLanguageServer: any;
let stopWebContainerLanguageServer: any;

// Dynamically import language server functionality for desktop only
async function importLanguageServerFunctions() {
  try {
    // Only import if we're in a Node.js environment
    if (
      typeof process !== 'undefined' &&
      process.versions &&
      process.versions.node
    ) {
      // Use string-based import to prevent bundler from including Node.js dependencies
      const moduleName = './extension-node';
      const module = await import(moduleName);
      startLanguageServer = module.startLanguageServer;
      restartLanguageServer = module.restartLanguageServer;
      stopLanguageServer = module.stopLanguageServer;
    }
  } catch (error) {
    console.log(
      'Language server functions not available in web environment:',
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}

// Import WebContainer language server functionality
async function importWebContainerLanguageServerFunctions() {
  try {
    // WebContainer functionality is now handled by the server-worker
    // The server-worker will automatically detect WebContainer environment and use appropriate mode
    console.log('WebContainer functionality available through server-worker');

    // Create WebContainer-specific language server functions that use the server-worker
    startWebContainerLanguageServer = async (
      context: vscode.ExtensionContext,
    ) => {
      logToOutputChannel(
        'Starting WebContainer language server via web-native approach',
        'info',
      );

      // Use the web-native language server which handles WebContainer environments
      // Pass a dummy restart handler since we handle restart separately
      return await startWebLanguageServer(context, async () => {});
    };

    restartWebContainerLanguageServer = async (
      context: vscode.ExtensionContext,
      restartHandler: any,
    ) => {
      logToOutputChannel('Restarting WebContainer language server', 'info');

      // Stop the current client if it exists
      await stopWebLanguageServer();

      // Start a new client
      return await startWebLanguageServer(context, restartHandler);
    };

    stopWebContainerLanguageServer = async () => {
      logToOutputChannel('Stopping WebContainer language server', 'info');
      await stopWebLanguageServer();
    };

    console.log('WebContainer language server functions configured');
  } catch (error) {
    console.log(
      'WebContainer language server functions not available:',
      error instanceof Error ? error.message : 'Unknown error',
    );
    // Set functions to undefined to indicate they're not available
    startWebContainerLanguageServer = undefined;
    restartWebContainerLanguageServer = undefined;
    stopWebContainerLanguageServer = undefined;
  }
}

/**
 * This method is called when your extension is activated.
 * Your extension is activated the very first time the command is executed.
 */
export async function activate(context: vscode.ExtensionContext) {
  logToOutputChannel(
    '=== Apex Language Server Extension Activating ===',
    'info',
  );

  try {
    // Initialize extension logging
    initializeExtensionLogging(context);

    // Initialize command state
    initializeCommandState(context);

    // Create status bar items
    createApexServerStatusItem(context);
    updateLogLevelStatusItems(getWorkspaceSettings().apex.logLevel);
    createApexLanguageStatusActions(
      context,
      () => getWorkspaceSettings().apex.logLevel,
      async (level: string) => {
        const config = vscode.workspace.getConfiguration('apex-ls-ts');
        await config.update(
          'logLevel',
          level,
          vscode.ConfigurationTarget.Workspace,
        );
        updateLogLevel(level);
        updateLogLevelStatusItems(level);
      },
      async () => {
        // Restart handler will be set later
      },
    );

    // Import language server functions based on environment
    await importLanguageServerFunctions();
    await importWebContainerLanguageServerFunctions();

    // Register configuration change listener (will be called after client is created)
    // registerConfigurationChangeListener(context);

    // Set up restart handler
    const restartHandler = async (ctx: vscode.ExtensionContext) => {
      logToOutputChannel('Restart handler called', 'info');

      // Determine which language server to restart based on environment
      if (
        typeof (globalThis as any).window !== 'undefined' &&
        typeof (globalThis as any).process === 'undefined'
      ) {
        // Web environment - use WebContainer
        if (restartWebContainerLanguageServer) {
          await restartWebContainerLanguageServer(ctx, restartHandler);
        } else {
          logToOutputChannel(
            'WebContainer language server not available',
            'error',
          );
        }
      } else {
        // Desktop environment - use Node.js
        if (restartLanguageServer) {
          await restartLanguageServer(ctx, restartHandler);
        } else {
          logToOutputChannel('Node.js language server not available', 'error');
        }
      }
    };

    setRestartHandler(restartHandler);

    // Register restart command
    registerRestartCommand(context);

    // Start the appropriate language server based on environment
    if (
      typeof (globalThis as any).window !== 'undefined' &&
      typeof (globalThis as any).process === 'undefined'
    ) {
      // Pure Web environment (e.g., browser web worker) - use WebContainer
      logToOutputChannel(
        'Detected web environment, starting WebContainer language server',
        'info',
      );
      if (startWebContainerLanguageServer) {
        await startWebContainerLanguageServer(context, restartHandler);
      } else {
        logToOutputChannel(
          'WebContainer language server not available',
          'error',
        );
        vscode.window.showErrorMessage(
          'Apex Language Server: WebContainer support not available',
        );
      }
    } else if (
      typeof (globalThis as any).window !== 'undefined' &&
      typeof (globalThis as any).process !== 'undefined'
    ) {
      // VSCode web environment (has both window and process) - use WebContainer
      logToOutputChannel(
        'Detected VSCode web environment, starting WebContainer language server',
        'info',
      );
      logToOutputChannel(
        `startWebContainerLanguageServer available: ${!!startWebContainerLanguageServer}`,
        'info',
      );
      if (startWebContainerLanguageServer) {
        await startWebContainerLanguageServer(context, restartHandler);
      } else {
        logToOutputChannel(
          'WebContainer language server not available',
          'error',
        );
        vscode.window.showErrorMessage(
          'Apex Language Server: WebContainer support not available',
        );
      }
    } else if (
      typeof (globalThis as any).window === 'undefined' &&
      typeof (globalThis as any).process === 'undefined'
    ) {
      // VSCode web environment in extension host context (both undefined) - use WebContainer
      logToOutputChannel(
        'Detected VSCode web extension host environment, starting WebContainer language server',
        'info',
      );
      logToOutputChannel(
        `startWebContainerLanguageServer available: ${!!startWebContainerLanguageServer}`,
        'info',
      );
      if (startWebContainerLanguageServer) {
        await startWebContainerLanguageServer(context, restartHandler);
      } else {
        logToOutputChannel(
          'WebContainer language server not available',
          'error',
        );
        vscode.window.showErrorMessage(
          'Apex Language Server: WebContainer support not available',
        );
      }
    } else {
      // Desktop environment - use Node.js
      logToOutputChannel(
        'Detected desktop environment, starting Node.js language server',
        'info',
      );
      logToOutputChannel(
        `Environment check - window: ${typeof (globalThis as any).window}, ` +
          `process: ${typeof (globalThis as any).process}`,
        'info',
      );
      if (startLanguageServer) {
        await startLanguageServer(context, restartHandler);
      } else {
        logToOutputChannel('Node.js language server not available', 'error');
        vscode.window.showErrorMessage(
          'Apex Language Server: Node.js support not available',
        );
      }
    }

    logToOutputChannel(
      '=== Apex Language Server Extension Activated ===',
      'info',
    );
  } catch (error) {
    logToOutputChannel(
      `Error activating Apex Language Server Extension: ${error}`,
      'error',
    );
    vscode.window.showErrorMessage(
      `Failed to activate Apex Language Server Extension: ${error}`,
    );
  }
}

/**
 * This method is called when your extension is deactivated.
 */
export async function deactivate() {
  logToOutputChannel(
    '=== Apex Language Server Extension Deactivating ===',
    'info',
  );

  try {
    // Stop the appropriate language server based on environment
    if (
      typeof (globalThis as any).window !== 'undefined' &&
      typeof (globalThis as any).process === 'undefined'
    ) {
      // Web environment - stop WebContainer
      if (stopWebContainerLanguageServer) {
        await stopWebContainerLanguageServer();
      }
    } else if (
      typeof (globalThis as any).window !== 'undefined' &&
      typeof (globalThis as any).process !== 'undefined'
    ) {
      // VSCode web environment - stop WebContainer
      if (stopWebContainerLanguageServer) {
        await stopWebContainerLanguageServer();
      }
    } else {
      // Desktop environment - stop Node.js
      if (stopLanguageServer) {
        await stopLanguageServer();
      }
    }

    logToOutputChannel(
      '=== Apex Language Server Extension Deactivated ===',
      'info',
    );
  } catch (error) {
    logToOutputChannel(
      `Error deactivating Apex Language Server Extension: ${error}`,
      'error',
    );
  }
}
