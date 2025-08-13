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
// Conditional import for language server (only in non-web environments)
let startLanguageServer: any;
let restartLanguageServer: any;
let stopLanguageServer: any;

// Web language server functions
let startWebLanguageServer: any;
let restartWebLanguageServer: any;
let stopWebLanguageServer: any;

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

// Import web language server functionality (web-native implementation)
async function importWebLanguageServerFunctions() {
  const module = await import('./language-server-web-native');
  startWebLanguageServer = module.startWebLanguageServer;
  restartWebLanguageServer = module.restartWebLanguageServer;
  stopWebLanguageServer = module.stopWebLanguageServer;
}
import { getWorkspaceSettings } from './configuration';

/**
 * Wrapper function for restart that matches the expected signature
 * @param context The extension context
 */
const handleRestart = async (
  context: vscode.ExtensionContext,
): Promise<void> => {
  await restartLanguageServer(context, handleRestart);
};

/**
 * Wrapper function for start that matches the expected signature
 * @param context The extension context
 */
const handleStart = async (context: vscode.ExtensionContext): Promise<void> => {
  await startLanguageServer(context, handleRestart);
};

/**
 * Wrapper function for web restart that matches the expected signature
 * @param context The extension context
 */
const handleWebRestart = async (
  context: vscode.ExtensionContext,
): Promise<void> => {
  await startWebLanguageServer(context, handleWebRestart);
};

/**
 * Wrapper function for web start that matches the expected signature
 * @param context The extension context
 */
const handleWebStart = async (
  context: vscode.ExtensionContext,
): Promise<void> => {
  await startWebLanguageServer(context, handleWebRestart);
};

/**
 * Detects if we're running in a web environment (vscode.dev)
 */
function isWebEnvironment(): boolean {
  try {
    // Check multiple indicators for web environment
    const hasWindow = typeof (globalThis as any).window !== 'undefined';
    const noProcess = typeof (globalThis as any).process === 'undefined';

    // Safely check process.versions.node
    let noNodeVersions = false;
    let processVersionsNode = 'undefined';
    try {
      const proc = (globalThis as any).process;
      noNodeVersions = !proc?.versions?.node;
      processVersionsNode = proc?.versions?.node || 'undefined';
    } catch {
      noNodeVersions = true;
    }

    const isVSCodeWeb = (globalThis as any).VSCODE_WEB === true;

    // VSCode web extension context detection
    const nav = (globalThis as any).navigator;
    const isVSCodeWebContext =
      typeof nav !== 'undefined' &&
      nav.userAgent &&
      !nav.userAgent.includes('Electron');

    const isWeb =
      hasWindow ||
      noProcess ||
      noNodeVersions ||
      isVSCodeWeb ||
      isVSCodeWebContext;

    // Log detection details for debugging
    console.log('Web environment detection:', {
      hasWindow,
      noProcess,
      noNodeVersions,
      isVSCodeWeb,
      isVSCodeWebContext,
      userAgent: typeof nav !== 'undefined' ? nav.userAgent : 'undefined',
      processVersionsNode,
      result: isWeb,
    });

    return isWeb;
  } catch (error) {
    // If any error occurs, assume we're in a web environment
    console.log('Error in web environment detection, assuming web:', error);
    return true;
  }
}

/**
 * Common extension setup (shared between web and desktop)
 * @param context The extension context
 * @param restartHandler The restart handler function
 */
function setupCommonExtension(
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): void {
  // Initialize command state
  initializeCommandState(context);

  // Create persistent server status LanguageStatusItem
  createApexServerStatusItem(context);

  // Set the restart handler
  setRestartHandler(restartHandler);

  // Register restart command
  registerRestartCommand(context);

  // Register log level commands
  const logLevels = ['error', 'warning', 'info', 'debug'];
  logLevels.forEach((level) => {
    const commandId = `apex-ls-ts.setLogLevel.${level}`;
    const disposable = vscode.commands.registerCommand(commandId, async () => {
      const config = vscode.workspace.getConfiguration('apex-ls-ts');
      await config.update(
        'logLevel',
        level,
        vscode.ConfigurationTarget.Workspace,
      );
      updateLogLevel(level);
      updateLogLevelStatusItems(level);
    });
    context.subscriptions.push(disposable);
  });

  // Create language status actions for log levels and restart
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
      await restartHandler(context);
    },
  );
}

/**
 * Main extension activation function
 * @param context The extension context
 */
export function activate(context: vscode.ExtensionContext): void {
  // Log to console immediately (before any other setup)
  console.log('=== APEX EXTENSION ACTIVATE CALLED ===');

  const isWeb = isWebEnvironment();

  // Log to console before VSCode output channel setup
  console.log(`Extension detected environment: ${isWeb ? 'WEB' : 'DESKTOP'}`);

  // Initialize simple extension logging
  initializeExtensionLogging(context);

  // Log environment detection
  logToOutputChannel(
    `Activating in ${isWeb ? 'web' : 'desktop'} environment`,
    'info',
  );

  if (isWeb) {
    // Web environment activation (with language server)
    console.log('About to call activateWebExtension...');
    activateWebExtension(context).catch((error) => {
      console.error('Error activating web extension:', error);
      logToOutputChannel(`Error activating web extension: ${error}`, 'error');
    });
  } else {
    // Desktop environment activation (full language server)
    activateDesktopExtension(context).catch((error) => {
      logToOutputChannel(
        `Error activating desktop extension: ${error}`,
        'error',
      );
    });
  }
}

/**
 * Activate extension in web environment
 */
async function activateWebExtension(
  context: vscode.ExtensionContext,
): Promise<void> {
  logToOutputChannel('=== activateWebExtension called ===', 'info');

  // Import web language server functions
  logToOutputChannel('Importing web language server functions...', 'info');
  await importWebLanguageServerFunctions();

  // Setup common extension functionality
  setupCommonExtension(context, handleWebRestart);

  logToOutputChannel(
    'Apex Language Server extension is now active in web environment!',
    'info',
  );

  // Start the web worker language server
  logToOutputChannel('Calling handleWebStart...', 'info');
  await handleWebStart(context);
  logToOutputChannel('Web extension activation complete', 'info');
}

/**
 * Activate extension in desktop environment
 */
async function activateDesktopExtension(
  context: vscode.ExtensionContext,
): Promise<void> {
  // Import language server functions
  await importLanguageServerFunctions();

  // Setup common extension functionality
  setupCommonExtension(context, handleRestart);

  // Log activation
  logToOutputChannel('Apex Language Server extension is now active!', 'info');

  // Start the language server
  await handleStart(context);
}

/**
 * Main extension deactivation function
 */
export async function deactivate(): Promise<void> {
  logToOutputChannel('Deactivating Apex Language Server extension', 'info');

  // Stop desktop language server if running
  if (stopLanguageServer) {
    await stopLanguageServer();
  }

  // Stop web language server if running
  if (stopWebLanguageServer) {
    await stopWebLanguageServer();
  }
}
