/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { DebugConfig } from './types';
import { EXTENSION_CONSTANTS } from './constants';
import { logToOutputChannel } from './logging';
import { ApexLanguageServerSettings } from 'packages/apex-lsp-shared/src/server/ApexLanguageServerSettings';

/**
 * Creates a clean, serializable notification object for workspace/didChangeConfiguration
 * @param settings The settings object to send
 * @returns A clean, serializable notification object
 */
const createSerializableNotification = (
  settings: ApexLanguageServerSettings,
) => {
  try {
    // Create a deep clone to ensure serializability
    const cleanSettings = JSON.parse(JSON.stringify(settings));
    return { settings: cleanSettings };
  } catch (error) {
    console.error('Failed to create serializable notification:', error);
    // Return a minimal safe object
    return { settings: {} };
  }
};

/**
 * Gets the current workspace settings for the Apex Language Server
 * @returns The workspace settings object
 */
export const getWorkspaceSettings = (): ApexLanguageServerSettings => {
  const rawSettings =
    vscode.workspace
      .getConfiguration()
      .get(EXTENSION_CONSTANTS.APEX_LS_CONFIG_SECTION) ?? {};

  // Create a deep clone to ensure serializability
  let settings: any = {};
  try {
    settings = JSON.parse(JSON.stringify(rawSettings));
  } catch (error) {
    console.error('Failed to clone settings, using defaults:', error);
    settings = {};
  }

  const apexSettings = { apex: settings };

  // Return default settings if no settings are configured
  return Object.keys(settings).length === 0
    ? {
        apex: {
          commentCollection: {
            enableCommentCollection: true,
            includeSingleLineComments: false,
            associateCommentsWithSymbols: false,
            enableForDocumentChanges: true,
            enableForDocumentOpen: true,
            enableForDocumentSymbols: false,
            enableForFoldingRanges: false,
          },
          performance: {
            commentCollectionMaxFileSize: 102400,
            useAsyncCommentProcessing: true,
            documentChangeDebounceMs: 300,
          },
          environment: {
            runtimePlatform: 'desktop',
            serverMode: 'production',
            enablePerformanceLogging: false,
            commentCollectionLogLevel: 'info',
          },
          resources: {
            loadMode: 'lazy',
            standardApexLibraryPath: undefined,
          },
          findMissingArtifact: {
            enabled: false,
            blockingWaitTimeoutMs: 2000,
            indexingBarrierPollMs: 100,
            maxCandidatesToOpen: 3,
            timeoutMsHint: 1500,
            enablePerfMarks: false,
          },
          worker: {
            logLevel: 'info',
          },
          version: undefined,
          logLevel: 'info',
        },
      }
    : (apexSettings as ApexLanguageServerSettings);
};

/**
 * Gets debug configuration from workspace settings
 * @returns The debug configuration
 */
export const getDebugConfig = (): DebugConfig => {
  const config = vscode.workspace.getConfiguration(
    EXTENSION_CONSTANTS.APEX_LS_EXTENSION_CONFIG_SECTION,
  );

  return {
    mode: config.get<string>('debug', 'off') as
      | 'off'
      | 'inspect'
      | 'inspect-brk',
    port: config.get<number>('debugPort', 6009),
  };
};

/**
 * Gets trace server configuration
 * @returns The trace server setting as a string value
 */
export const getTraceServerConfig = (): string => {
  const config = vscode.workspace.getConfiguration(
    EXTENSION_CONSTANTS.APEX_LS_CONFIG_SECTION,
  );
  const traceValue = config.get<string>('trace.server', 'off');

  // Return string values directly for client compatibility
  switch (traceValue.toLowerCase()) {
    case 'verbose':
      return 'verbose';
    case 'messages':
      return 'messages';
    case 'off':
    default:
      return 'off';
  }
};

/**
 * Registers a listener for configuration changes and notifies the server
 * @param client The client (any client with sendNotification method)
 * @param context The extension context
 */
export const registerConfigurationChangeListener = (
  client: { sendNotification: (method: string, params?: any) => void },
  context: vscode.ExtensionContext,
): void => {
  // Listen for configuration changes
  const configListener = vscode.workspace.onDidChangeConfiguration((event) => {
    if (
      event.affectsConfiguration(
        EXTENSION_CONSTANTS.APEX_LS_EXTENSION_CONFIG_SECTION,
      )
    ) {
      // Get updated settings
      const settings = getWorkspaceSettings();
      try {
        logToOutputChannel(
          `🔍 Configuration changed: ${JSON.stringify(settings, null, 2)}`,
          'debug',
        );
      } catch (_error) {
        logToOutputChannel(
          '🔍 Configuration changed: [unable to serialize settings]',
          'debug',
        );
      }
      // Notify the server of the configuration change
      try {
        logToOutputChannel(
          '🔍 [DEBUG] Sending configuration change notification',
          'debug',
        );
        client.sendNotification(
          'workspace/didChangeConfiguration',
          createSerializableNotification(settings),
        );
        logToOutputChannel(
          '✅ [DEBUG] Successfully sent configuration change notification',
          'debug',
        );
      } catch (_error) {
        logToOutputChannel(
          `❌ [ERROR] Failed to send configuration change notification: ${_error}`,
          'error',
        );
        try {
          logToOutputChannel(
            `❌ [ERROR] Configuration settings: ${JSON.stringify(settings, null, 2)}`,
            'error',
          );
        } catch (_jsonError) {
          logToOutputChannel(
            '❌ [ERROR] Configuration settings: [unable to serialize settings]',
            'error',
          );
        }
        throw _error;
      }
    }
  });

  // Store the listener in the context so it gets disposed properly
  context.subscriptions.push(configListener);
};

/**
 * Sends initial configuration to the language server
 * This should be called when the language server starts up
 * @param client The client (any client with sendNotification method)
 */
export const sendInitialConfiguration = (client: {
  sendNotification: (method: string, params?: any) => void;
}): void => {
  const settings = getWorkspaceSettings();
  logToOutputChannel(
    '🚀 Sending initial configuration to language server',
    'debug',
  );
  try {
    logToOutputChannel(
      `🔍 Initial settings: ${JSON.stringify(settings, null, 2)}`,
      'debug',
    );
  } catch (_error) {
    logToOutputChannel(
      '🔍 Initial settings: [unable to serialize settings]',
      'debug',
    );
  }

  // Send initial configuration to the server
  try {
    logToOutputChannel(
      '🔍 [DEBUG] Sending initial configuration notification',
      'debug',
    );
    client.sendNotification(
      'workspace/didChangeConfiguration',
      createSerializableNotification(settings),
    );
    logToOutputChannel(
      '✅ [DEBUG] Successfully sent initial configuration notification',
      'debug',
    );
  } catch (_error) {
    logToOutputChannel(
      `❌ [ERROR] Failed to send initial configuration notification: ${_error}`,
      'error',
    );
    try {
      logToOutputChannel(
        `❌ [ERROR] Initial configuration settings: ${JSON.stringify(settings, null, 2)}`,
        'error',
      );
    } catch (_jsonError) {
      logToOutputChannel(
        '❌ [ERROR] Initial configuration settings: [unable to serialize settings]',
        'error',
      );
    }
    throw _error;
  }
};
