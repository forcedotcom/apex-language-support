/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { ApexLspClient } from './client';

// Create an output channel for logs
let outputChannel: vscode.OutputChannel;
let apexLspClient: ApexLspClient | undefined;

/**
 * Activate the extension
 * @param context The extension context
 */
export function activate(context: vscode.ExtensionContext) {
  // Create output channel immediately and show it
  outputChannel = vscode.window.createOutputChannel(
    'Apex Language Server (Enhanced Web)',
  );
  context.subscriptions.push(outputChannel);
  outputChannel.show(); // Show the output channel so we can see logs

  // Log detailed activation info
  outputChannel.appendLine('═══════════════════════════════════════════════');
  outputChannel.appendLine('🚀 ENHANCED APEX LANGUAGE SERVER - ACTIVATION');
  outputChannel.appendLine('═══════════════════════════════════════════════');
  outputChannel.appendLine(`📅 Timestamp: ${new Date().toISOString()}`);
  outputChannel.appendLine(
    `📁 Extension URI: ${context.extensionUri.toString()}`,
  );
  outputChannel.appendLine(`🌐 Extension Mode: ${context.extensionMode}`);
  outputChannel.appendLine(
    `🔧 Environment: ${typeof globalThis.Worker !== 'undefined' ? 'Web Workers Supported' : 'No Web Worker Support'}`,
  );

  // Log workspace info
  if (vscode.workspace.workspaceFolders) {
    outputChannel.appendLine(
      `📂 Workspace Folders: ${vscode.workspace.workspaceFolders.length}`,
    );
    vscode.workspace.workspaceFolders.forEach((folder, index) => {
      outputChannel.appendLine(
        `   ${index + 1}. ${folder.name}: ${folder.uri.toString()}`,
      );
    });
  } else {
    outputChannel.appendLine('📂 No workspace folders found');
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

  // Start the enhanced language server with extensive error handling
  outputChannel.appendLine(
    '🔄 Starting Enhanced Language Server initialization...',
  );
  startEnhancedLanguageServer(context, statusBarItem)
    .then(() => {
      outputChannel.appendLine(
        '✅ SUCCESS: Enhanced Apex Language Server started successfully!',
      );
      statusBarItem.text = '$(check) Apex Support Active (Web)';
      statusBarItem.tooltip =
        'Enhanced Apex Language Server is active with web worker architecture';
      vscode.window.showInformationMessage(
        'Enhanced Apex LS: Language server started successfully!',
      );
    })
    .catch((error) => {
      outputChannel.appendLine('❌ FAILURE: Language server failed to start');
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack =
        error instanceof Error ? error.stack : 'No stack trace available';
      outputChannel.appendLine(`   Error: ${errorMessage}`);
      outputChannel.appendLine(
        `   Stack: ${errorStack || 'No stack trace available'}`,
      );
      statusBarItem.text = '$(error) Apex LS Error';
      statusBarItem.tooltip = `Language Server failed to start: ${errorMessage}`;
      vscode.window
        .showErrorMessage(
          `Enhanced Apex LS failed to start: ${errorMessage}`,
          'Show Output',
        )
        .then((selection) => {
          if (selection === 'Show Output') {
            outputChannel.show();
          }
        });
    });

  // Register the restart command
  registerRestartCommand(context, statusBarItem);

  // Final activation log
  outputChannel.appendLine('✅ Extension activation completed');
  outputChannel.appendLine('═══════════════════════════════════════════════');
}

/**
 * Starts the enhanced Apex Language Server using web worker architecture
 */
async function startEnhancedLanguageServer(
  context: vscode.ExtensionContext,
  statusBarItem: vscode.StatusBarItem,
): Promise<void> {
  try {
    outputChannel.appendLine('─────────────────────────────────────────────');
    outputChannel.appendLine('🔄 LANGUAGE SERVER STARTUP PROCESS');
    outputChannel.appendLine('─────────────────────────────────────────────');

    // Step 1: Check Worker support
    outputChannel.appendLine('1️⃣ Checking Web Worker support...');
    if (typeof Worker === 'undefined') {
      throw new Error('Web Workers are not supported in this environment');
    }
    outputChannel.appendLine('   ✅ Web Workers are supported');

    // Step 2: Build worker URI and check paths
    outputChannel.appendLine('2️⃣ Building worker path...');
    const workerUri = vscode.Uri.joinPath(context.extensionUri, 'worker.js');
    outputChannel.appendLine(`   📍 Worker URI: ${workerUri.toString()}`);
    outputChannel.appendLine(
      `   📁 Extension URI: ${context.extensionUri.toString()}`,
    );

    // Step 3: Create web worker
    outputChannel.appendLine('3️⃣ Creating web worker...');
    let worker: Worker;
    try {
      worker = new Worker(workerUri.toString());
      outputChannel.appendLine('   ✅ Web worker created successfully');
    } catch (workerError) {
      outputChannel.appendLine(`   ❌ Worker creation failed: ${workerError}`);
      throw new Error(`Failed to create worker: ${workerError}`);
    }

    // Step 4: Set up worker error handling
    outputChannel.appendLine('4️⃣ Setting up worker error handling...');
    worker.onerror = (errorEvent) => {
      const errorMessage = errorEvent.message || String(errorEvent);
      outputChannel.appendLine(`🚨 Worker Error: ${errorMessage}`);
    };

    worker.onmessageerror = (error) => {
      outputChannel.appendLine(`🚨 Worker Message Error: ${error}`);
    };

    // Step 5: Set up basic worker monitoring
    outputChannel.appendLine('5️⃣ Setting up worker monitoring...');
    worker.onmessage = (event) => {
      // Log first message to confirm worker is working
      if (event.data && typeof event.data === 'object' && event.data.method) {
        outputChannel.appendLine(
          `   📨 LSP ${event.data.method} request received`,
        );
      }
    };

    outputChannel.appendLine('   ✅ Worker monitoring set up');

    // Step 6: Create LSP client
    outputChannel.appendLine('6️⃣ Creating LSP client...');
    try {
      apexLspClient = new ApexLspClient(worker, {
        error: (message) => outputChannel.appendLine(`[LSP-ERROR] ${message}`),
        warn: (message) => outputChannel.appendLine(`[LSP-WARN] ${message}`),
        info: (message) => outputChannel.appendLine(`[LSP-INFO] ${message}`),
        log: (message) => outputChannel.appendLine(`[LSP-LOG] ${message}`),
      });
      outputChannel.appendLine('   ✅ LSP client created successfully');
    } catch (clientError) {
      outputChannel.appendLine(
        `   ❌ LSP client creation failed: ${clientError}`,
      );
      throw new Error(`Failed to create LSP client: ${clientError}`);
    }

    // Step 7: Initialize the language server
    outputChannel.appendLine('7️⃣ Initializing language server...');
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
      outputChannel.appendLine(
        '   ✅ Language server initialized successfully',
      );
    } catch (initError) {
      outputChannel.appendLine(
        `   ❌ Language server initialization failed: ${initError}`,
      );
      throw initError;
    }

    // Step 8: Set up disposal
    outputChannel.appendLine('8️⃣ Setting up cleanup handlers...');
    context.subscriptions.push({
      dispose: () => {
        outputChannel.appendLine(
          '🧹 Disposing Enhanced Apex Language Server...',
        );
        apexLspClient?.dispose();
        apexLspClient = undefined;
      },
    });

    outputChannel.appendLine('─────────────────────────────────────────────');
    outputChannel.appendLine('✅ LANGUAGE SERVER STARTUP COMPLETED');
    outputChannel.appendLine('─────────────────────────────────────────────');
  } catch (error) {
    outputChannel.appendLine('─────────────────────────────────────────────');
    outputChannel.appendLine('❌ LANGUAGE SERVER STARTUP FAILED');
    outputChannel.appendLine('─────────────────────────────────────────────');
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : 'No stack trace';
    outputChannel.appendLine(`Error: ${errorMessage}`);
    outputChannel.appendLine(`Stack: ${errorStack || 'No stack trace'}`);
    outputChannel.appendLine('─────────────────────────────────────────────');
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
      outputChannel.appendLine(
        '🔄 Restarting Enhanced Apex Language Server...',
      );
      statusBarItem.text = '$(sync~spin) Apex LS Restarting...';

      try {
        // Dispose existing client
        if (apexLspClient) {
          apexLspClient.dispose();
          apexLspClient = undefined;
        }

        // Start a new one
        await startEnhancedLanguageServer(context, statusBarItem);

        outputChannel.appendLine(
          '✅ Enhanced Apex Language Server restarted successfully!',
        );
        vscode.window.showInformationMessage(
          'Enhanced Apex Language Server restarted successfully!',
        );
        statusBarItem.text = '$(check) Apex Support Active (Web)';
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        outputChannel.appendLine(
          `❌ Failed to restart Enhanced Apex Language Server: ${errorMessage}`,
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
  outputChannel.appendLine(
    '🧹 Deactivating Enhanced Apex Language Support extension...',
  );

  if (apexLspClient) {
    apexLspClient.dispose();
    apexLspClient = undefined;
  }

  outputChannel.appendLine(
    '✅ Enhanced Apex Language Support extension deactivated',
  );
}
