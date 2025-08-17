/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { ApexLspClient } from './client';
import { ExtensionLogger } from './utils/logger';
import { WorkerFactory } from './utils/worker-factory';

// Global state
let logger: ExtensionLogger;
let apexLspClient: ApexLspClient | undefined;

/**
 * Activate the extension
 * @param context The extension context
 */
export function activate(context: vscode.ExtensionContext) {
  // Initialize logger
  logger = new ExtensionLogger('Apex Language Server (Enhanced Web)', true);
  context.subscriptions.push(logger.getOutputChannel());
  logger.show();

  // Log activation
  logger.section('ENHANCED APEX LANGUAGE SERVER - ACTIVATION');
  logger.info(`Timestamp: ${new Date().toISOString()}`);
  logger.info(`Extension URI: ${context.extensionUri.toString()}`);
  logger.info(`Extension Mode: ${context.extensionMode}`);
  logger.info(
    `Environment: ${
      typeof globalThis.Worker !== 'undefined'
        ? 'Web Workers Supported'
        : 'No Web Worker Support'
    }`,
  );

  // Log workspace info
  if (vscode.workspace.workspaceFolders) {
    logger.info(
      `Workspace Folders: ${vscode.workspace.workspaceFolders.length}`,
    );
    vscode.workspace.workspaceFolders.forEach((folder, index) => {
      logger.debug(`${index + 1}. ${folder.name}: ${folder.uri.toString()}`);
    });
  } else {
    logger.info('No workspace folders found');
  }

  // Create and initialize status bar item
  const statusBarItem = createStatusBarItem(context);
  statusBarItem.text = '$(sync~spin) Apex LS Debug Mode';
  statusBarItem.tooltip =
    'Enhanced Apex Language Server - Debugging activation';
  statusBarItem.show();

  // Show activation message
  vscode.window.showInformationMessage(
    'Enhanced Apex LS: Extension activated - Check Output panel',
  );

  // Start the enhanced language server
  logger.info('Starting Enhanced Language Server initialization...');

  startEnhancedLanguageServer(context, statusBarItem)
    .then(() => {
      logger.success('Enhanced Apex Language Server started successfully!');
      statusBarItem.text = '$(check) Apex Support Active (Web)';
      statusBarItem.tooltip =
        'Enhanced Apex Language Server is active with web worker architecture';

      vscode.window.showInformationMessage(
        'Enhanced Apex LS: Language server started successfully!',
      );
    })
    .catch((error) => {
      logger.error(
        'Language server failed to start',
        error instanceof Error ? error : undefined,
      );
      statusBarItem.text = '$(error) Apex LS Error';
      statusBarItem.tooltip = `Language Server failed to start: ${
        error instanceof Error ? error.message : String(error)
      }`;

      vscode.window
        .showErrorMessage(
          `Enhanced Apex LS failed to start: ${
            error instanceof Error ? error.message : String(error)
          }`,
          'Show Output',
        )
        .then((selection) => {
          if (selection === 'Show Output') {
            logger.show();
          }
        });
    });

  // Register the restart command
  registerRestartCommand(context, statusBarItem);

  logger.success('Extension activation completed');
}

/**
 * Starts the enhanced Apex Language Server using web worker architecture
 */
async function startEnhancedLanguageServer(
  context: vscode.ExtensionContext,
  statusBarItem: vscode.StatusBarItem,
): Promise<void> {
  try {
    logger.subsection('LANGUAGE SERVER STARTUP PROCESS');

    // Step 1: Create web worker
    logger.step(1, 'Creating web worker...');
    const worker = WorkerFactory.createWorker({ context, logger });

    // Step 2: Create LSP client
    logger.step(2, 'Creating LSP client...');
    try {
      apexLspClient = new ApexLspClient(worker, {
        error: (message) => logger.lsp('error', message),
        warn: (message) => logger.lsp('warn', message),
        info: (message) => logger.lsp('info', message),
        log: (message) => logger.lsp('log', message),
      });
      logger.success('LSP client created successfully');
    } catch (clientError) {
      logger.error(
        'LSP client creation failed',
        clientError instanceof Error ? clientError : undefined,
      );
      throw new Error(`Failed to create LSP client: ${clientError}`);
    }

    // Step 3: Initialize the language server
    logger.step(3, 'Initializing language server...');
    const initParams = {
      processId: null,
      rootUri: vscode.workspace.workspaceFolders?.[0]?.uri.toString() || null,
      capabilities: {
        textDocument: {
          documentSymbol: {},
          foldingRange: {},
          publishDiagnostics: {},
        },
        workspace: {
          workspaceFolders: true,
        },
      },
      initializationOptions: {
        logLevel: 'debug',
        extensionMode: 'development',
        enableDocumentSymbols: true,
      },
      workspaceFolders:
        vscode.workspace.workspaceFolders?.map((folder) => ({
          uri: folder.uri.toString(),
          name: folder.name,
        })) || [],
    };

    try {
      await apexLspClient.initialize(initParams);
      logger.success('Language server initialized successfully');
    } catch (initError) {
      logger.error(
        'Language server initialization failed',
        initError instanceof Error ? initError : undefined,
      );
      throw initError;
    }

    // Step 4: Set up disposal
    logger.step(4, 'Setting up cleanup handlers...');
    context.subscriptions.push({
      dispose: () => {
        logger.info('Disposing Enhanced Apex Language Server...');
        apexLspClient?.dispose();
        apexLspClient = undefined;
      },
    });

    logger.success('LANGUAGE SERVER STARTUP COMPLETED');
  } catch (error) {
    logger.error(
      'LANGUAGE SERVER STARTUP FAILED',
      error instanceof Error ? error : undefined,
    );
    throw error;
  }
}

/**
 * Creates and initializes the status bar item
 */
function createStatusBarItem(
  context: vscode.ExtensionContext,
): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  context.subscriptions.push(statusBarItem);
  return statusBarItem;
}

/**
 * Registers the command to restart the enhanced language server
 */
function registerRestartCommand(
  context: vscode.ExtensionContext,
  statusBarItem: vscode.StatusBarItem,
): void {
  const restartCommand = vscode.commands.registerCommand(
    'apex.restart.server',
    async () => {
      logger.info('Restarting Enhanced Apex Language Server...');
      statusBarItem.text = '$(sync~spin) Apex LS Restarting...';

      try {
        // Dispose existing client
        if (apexLspClient) {
          apexLspClient.dispose();
          apexLspClient = undefined;
        }

        // Start a new one
        await startEnhancedLanguageServer(context, statusBarItem);

        logger.success('Enhanced Apex Language Server restarted successfully!');
        vscode.window.showInformationMessage(
          'Enhanced Apex Language Server restarted successfully!',
        );
        statusBarItem.text = '$(check) Apex Support Active (Web)';
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(
          `Failed to restart Enhanced Apex Language Server: ${errorMessage}`,
          error instanceof Error ? error : undefined,
        );
        vscode.window.showErrorMessage(
          `Failed to restart Apex Language Server: ${errorMessage}`,
        );
        statusBarItem.text = '$(error) Apex LS Error';
      }
    },
  );

  context.subscriptions.push(restartCommand);
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
  logger.info('Deactivating Enhanced Apex Language Support extension...');

  if (apexLspClient) {
    apexLspClient.dispose();
    apexLspClient = undefined;
  }

  logger.success('Enhanced Apex Language Support extension deactivated');
}
