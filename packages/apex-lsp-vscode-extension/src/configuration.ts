/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { WorkspaceSettings, DebugConfig } from './types';
import { updateLogLevel } from './logging';
import { EXTENSION_CONSTANTS } from './constants';

/**
 * Gets the current workspace settings for the Apex Language Server
 * @returns The workspace settings object
 */
export const getWorkspaceSettings = (): WorkspaceSettings => {
  const config = vscode.workspace.getConfiguration(
    EXTENSION_CONSTANTS.CONFIG_SECTION,
  );
  const logLevel = config.get<string>('logLevel') ?? 'info';

  // Update the log level for the extension's logging system
  updateLogLevel(logLevel);

  // Map apex-ls-ts configuration to the apex format expected by the language server
  return {
    apex: {
      commentCollection: {
        enableCommentCollection: config.get<boolean>(
          'commentCollection.enableCommentCollection',
          true,
        ),
        includeSingleLineComments: config.get<boolean>(
          'commentCollection.includeSingleLineComments',
          false,
        ),
        associateCommentsWithSymbols: config.get<boolean>(
          'commentCollection.associateCommentsWithSymbols',
          false,
        ),
        enableForDocumentChanges: config.get<boolean>(
          'commentCollection.enableForDocumentChanges',
          true,
        ),
        enableForDocumentOpen: config.get<boolean>(
          'commentCollection.enableForDocumentOpen',
          true,
        ),
        enableForDocumentSymbols: config.get<boolean>(
          'commentCollection.enableForDocumentSymbols',
          false,
        ),
        enableForFoldingRanges: config.get<boolean>(
          'commentCollection.enableForFoldingRanges',
          false,
        ),
      },
      performance: {
        commentCollectionMaxFileSize: config.get<number>(
          'performance.commentCollectionMaxFileSize',
          102400,
        ),
        useAsyncCommentProcessing: config.get<boolean>(
          'performance.useAsyncCommentProcessing',
          true,
        ),
        documentChangeDebounceMs: config.get<number>(
          'performance.documentChangeDebounceMs',
          300,
        ),
      },
      environment: {
        enablePerformanceLogging: config.get<boolean>(
          'environment.enablePerformanceLogging',
          false,
        ),
      },
      resources: {
        loadMode: config.get<string>('resources.loadMode', 'lazy') as
          | 'lazy'
          | 'full',
      },
      logLevel,
    },
  };
};

/**
 * Gets debug configuration from workspace settings
 * @returns The debug configuration
 */
export const getDebugConfig = (): DebugConfig => {
  const config = vscode.workspace.getConfiguration(
    EXTENSION_CONSTANTS.CONFIG_SECTION,
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
 * @returns The trace server setting
 */
export const getTraceServerConfig = (): string => {
  const config = vscode.workspace.getConfiguration(
    EXTENSION_CONSTANTS.CONFIG_SECTION,
  );
  return config.get<string>('trace.server', 'off');
};

/**
 * Registers a listener for configuration changes and notifies the server
 * @param client The language client
 * @param context The extension context
 */
export const registerConfigurationChangeListener = (
  client: LanguageClient,
  context: vscode.ExtensionContext,
): void => {
  // Listen for configuration changes
  const configListener = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration(EXTENSION_CONSTANTS.CONFIG_SECTION)) {
      // Get updated settings
      const settings = getWorkspaceSettings();

      // Notify the server of the configuration change
      client.sendNotification('workspace/didChangeConfiguration', {
        settings,
      });
    }
  });

  // Store the listener in the context so it gets disposed properly
  context.subscriptions.push(configListener);
};
