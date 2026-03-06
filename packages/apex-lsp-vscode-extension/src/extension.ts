/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

// Import polyfills first for web compatibility
import './polyfills';

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
  createProfilingToggleItem,
  registerProfilingToggleCommand,
  hideProfilingToggleItem,
  updateProfilingToggleItem,
} from './status-bar';
import {
  initializeCommandState,
  registerLogLevelCommands,
  registerRestartCommand,
  registerGraphCommand,
  registerQueueStateCommand,
  registerPerformanceSettingsCommand,
  registerProfilingCommands,
  setRestartHandler,
} from './commands';
import { registerPerformanceSettingsSerializer } from './settings/showPerformanceSettings';
import { registerQueueStateSerializer } from './queue/showQueueState';
import { registerGraphSerializer } from './graph/showGraph';
import {
  startLanguageServer,
  restartLanguageServer,
  stopLanguageServer,
} from './language-server';
import { getWorkspaceSettings } from './configuration';
import { formattedError } from '@salesforce/apex-lsp-shared';
import {
  initializeExtensionTracing,
  shutdownExtensionTracing,
} from './observability/extensionTracing';

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
 * Main extension activation function
 * @param context The extension context
 */
export function activate(context: vscode.ExtensionContext): void {
  // Initialize simple extension logging
  initializeExtensionLogging(context);

  // Set up OTEL tracing in the extension-host process via dx-services.
  // Fire-and-forget; tracing failure must not block extension activation.
  initializeExtensionTracing(context).catch((error) => {
    logToOutputChannel(
      `Extension tracing init error: ${formattedError(error)}`,
      'warning',
    );
  });
  const extensionMode =
    context.extensionMode === vscode.ExtensionMode.Development
      ? 'Development'
      : 'Production';
  logToOutputChannel(`📍 Extension context: ${extensionMode} mode`, 'info');
  logToOutputChannel(`📂 Extension path: ${context.extensionPath}`, 'debug');

  // Initialize command state
  initializeCommandState(context);
  logToOutputChannel('⚙️ Command state initialized', 'debug');

  // Create persistent server status LanguageStatusItem
  createApexServerStatusItem(context);
  logToOutputChannel('📊 Server status item created', 'debug');

  // Set the restart handler
  setRestartHandler(handleRestart);
  logToOutputChannel('🔄 Restart handler configured', 'debug');

  // Register restart command
  registerRestartCommand(context);
  logToOutputChannel('📝 Restart command registered', 'debug');

  registerLogLevelCommands(context);
  logToOutputChannel('📝 Log level commands registered', 'debug');

  // Register graph command
  registerGraphCommand(context);
  logToOutputChannel('📝 Graph command registered', 'debug');

  // Register queue state command
  registerQueueStateCommand(context);
  registerPerformanceSettingsCommand(context);
  logToOutputChannel('📝 Queue state command registered', 'debug');

  // Register webview panel serializers for proper restoration/disposal
  registerPerformanceSettingsSerializer(context);
  registerQueueStateSerializer(context);
  registerGraphSerializer(context);
  logToOutputChannel('📝 Webview serializers registered', 'debug');

  // Register profiling commands (only in desktop environment)
  if (vscode.env.uiKind !== vscode.UIKind.Web) {
    registerProfilingCommands(context);
    logToOutputChannel('📝 Profiling commands registered', 'debug');

    // Register profiling toggle command
    registerProfilingToggleCommand(context);
    logToOutputChannel('📝 Profiling toggle command registered', 'debug');

    // Create profiling toggle item if interactive profiling is enabled
    createProfilingToggleItem(context);
    logToOutputChannel('📊 Profiling toggle item checked', 'debug');

    // Listen for configuration changes to show/hide profiling toggle item
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('apex.environment.profilingMode')) {
          const newConfig =
            vscode.workspace.getConfiguration('apex.environment');
          const newProfilingMode = newConfig.get<
            'none' | 'full' | 'interactive'
          >('profilingMode', 'none');
          if (newProfilingMode === 'interactive') {
            // Create/show the toggle item
            createProfilingToggleItem(context);
          } else {
            // Hide/dispose the toggle item
            hideProfilingToggleItem();
          }
        }
        // Update toggle item when profilingType changes
        if (event.affectsConfiguration('apex.environment.profilingType')) {
          updateProfilingToggleItem().catch((error) => {
            console.error(
              'Error updating profiling toggle item after setting change:',
              error,
            );
          });
        }
      }),
    );
  }

  // Create language status actions for log levels and restart
  createApexLanguageStatusActions(
    context,
    () => getWorkspaceSettings().apex.logLevel ?? 'error',
    async (level: string) => {
      updateLogLevel(level);
      updateLogLevelStatusItems(level);
    },
    async () => {
      await handleRestart(context);
    },
  );
  logToOutputChannel('🎛️ Language status actions created', 'debug');

  // Log activation
  logToOutputChannel(
    '✅ Extension setup completed, starting language server...',
    'info',
  );

  // Check if client already exists before starting
  const { getClient } = require('./language-server');
  const existingClient = getClient();
  if (existingClient) {
    console.log('⚠️ Client already exists, skipping start');
    logToOutputChannel('Client already exists, skipping start', 'warning');
    return;
  }

  // Start the language server
  console.log('🔧 About to start language server...');
  logToOutputChannel('🔧 About to start language server...', 'debug');
  handleStart(context)
    .then(async () => {
      logToOutputChannel('✅ Language server started successfully', 'info');
    })
    .catch((error) => {
      logToOutputChannel(
        `❌ Failed to start language server: ${formattedError(error, {
          includeStack: true,
        })}`,
        'error',
      );
    });
}

/**
 * Main extension deactivation function
 */
export async function deactivate(): Promise<void> {
  logToOutputChannel('Deactivating Apex Language Server extension', 'info');
  await stopLanguageServer();
  await shutdownExtensionTracing();
}
