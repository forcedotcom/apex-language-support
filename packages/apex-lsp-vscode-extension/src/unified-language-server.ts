/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import {
  UniversalExtensionClient,
  UniversalClientFactory,
} from '@salesforce/apex-ls';
import type { InitializeParams } from 'vscode-languageserver-protocol';
import { logToOutputChannel } from './logging';
import { setStartingFlag, resetServerStartRetries } from './commands';
import {
  updateApexServerStatusStarting,
  updateApexServerStatusReady,
  updateApexServerStatusError,
} from './status-bar';
import { getWorkspaceSettings } from './configuration';

/**
 * Global unified language client instance
 */
let unifiedClient: UniversalExtensionClient | undefined;

/**
 * Environment detection
 */
function detectEnvironment(): 'desktop' | 'web' {
  // Check if we're in a web environment
  if (
    typeof Worker !== 'undefined' &&
    vscode.env.uiKind === vscode.UIKind.Web
  ) {
    return 'web';
  }
  return 'desktop';
}

/**
 * Create initialization parameters
 */
function createInitializeParams(
  context: vscode.ExtensionContext,
): InitializeParams {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const settings = getWorkspaceSettings();

  return {
    processId: null, // Web environments don't have process IDs
    clientInfo: {
      name: 'Apex Language Server Extension',
      version: '1.0.0',
    },
    locale: vscode.env.language,
    rootPath: workspaceFolders?.[0]?.uri.fsPath || null,
    rootUri: workspaceFolders?.[0]?.uri.toString() || null,
    capabilities: {
      workspace: {
        applyEdit: true,
        workspaceEdit: {
          documentChanges: true,
          resourceOperations: ['create', 'rename', 'delete'],
          failureHandling: 'textOnlyTransactional',
        },
        didChangeConfiguration: {
          dynamicRegistration: true,
        },
        didChangeWatchedFiles: {
          dynamicRegistration: true,
        },
        symbol: {
          dynamicRegistration: true,
          symbolKind: {
            valueSet: [
              1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
              20, 21, 22, 23, 24, 25, 26,
            ],
          },
        },
        executeCommand: {
          dynamicRegistration: true,
        },
        configuration: true,
        workspaceFolders: true,
      },
      textDocument: {
        publishDiagnostics: {
          relatedInformation: true,
          versionSupport: false,
          tagSupport: {
            valueSet: [1, 2],
          },
        },
        synchronization: {
          dynamicRegistration: true,
          willSave: true,
          willSaveWaitUntil: true,
          didSave: true,
        },
        completion: {
          dynamicRegistration: true,
          contextSupport: true,
          completionItem: {
            snippetSupport: true,
            commitCharactersSupport: true,
            documentationFormat: ['markdown', 'plaintext'],
            deprecatedSupport: true,
            preselectSupport: true,
          },
          completionItemKind: {
            valueSet: [
              1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
              20, 21, 22, 23, 24, 25,
            ],
          },
        },
        hover: {
          dynamicRegistration: true,
          contentFormat: ['markdown', 'plaintext'],
        },
        signatureHelp: {
          dynamicRegistration: true,
          signatureInformation: {
            documentationFormat: ['markdown', 'plaintext'],
          },
        },
        definition: {
          dynamicRegistration: true,
        },
        references: {
          dynamicRegistration: true,
        },
        documentHighlight: {
          dynamicRegistration: true,
        },
        documentSymbol: {
          dynamicRegistration: true,
          symbolKind: {
            valueSet: [
              1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
              20, 21, 22, 23, 24, 25, 26,
            ],
          },
          hierarchicalDocumentSymbolSupport: true,
        },
        codeAction: {
          dynamicRegistration: true,
          codeActionLiteralSupport: {
            codeActionKind: {
              valueSet: [
                '',
                'quickfix',
                'refactor',
                'refactor.extract',
                'refactor.inline',
                'refactor.rewrite',
                'source',
                'source.organizeImports',
              ],
            },
          },
        },
        codeLens: {
          dynamicRegistration: true,
        },
        formatting: {
          dynamicRegistration: true,
        },
        rangeFormatting: {
          dynamicRegistration: true,
        },
        onTypeFormatting: {
          dynamicRegistration: true,
        },
        rename: {
          dynamicRegistration: true,
        },
        documentLink: {
          dynamicRegistration: true,
        },
        typeDefinition: {
          dynamicRegistration: true,
        },
        implementation: {
          dynamicRegistration: true,
        },
        colorProvider: {
          dynamicRegistration: true,
        },
        foldingRange: {
          dynamicRegistration: true,
          rangeLimit: 5000,
          lineFoldingOnly: true,
        },
      },
      window: {
        workDoneProgress: true,
      },
      general: {
        regularExpressions: {
          engine: 'ECMAScript',
          version: 'ES2020',
        },
        markdown: {
          parser: 'marked',
          version: '1.1.0',
        },
      },
    },
    initializationOptions: {
      logLevel: settings.apex.logLevel,
      extensionMode:
        vscode.env.machineId === 'someValue' ? 'development' : 'production',
      enableDocumentSymbols: true,
      environment: detectEnvironment(),
      custom: settings.apex.custom,
    },
    workspaceFolders:
      workspaceFolders?.map((folder) => ({
        uri: folder.uri.toString(),
        name: folder.name,
      })) || null,
  };
}

/**
 * Creates and starts the unified language client
 */
export const createAndStartUnifiedClient = async (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> => {
  try {
    setStartingFlag(true);
    updateApexServerStatusStarting();

    const environment = detectEnvironment();
    logToOutputChannel(
      `🚀 Starting unified language server in ${environment} mode`,
      'info',
    );

    // Create logger for the universal client
    const logger = {
      ...console,
      info: (message: string) => logToOutputChannel(message, 'info'),
      error: (message: string, error?: Error) => {
        logToOutputChannel(`${message}${error ? `: ${error}` : ''}`, 'error');
      },
      debug: (message: string) => logToOutputChannel(message, 'debug'),
      success: (message: string) => logToOutputChannel(`✅ ${message}`, 'info'),
    };

    // Create unified client based on environment
    if (environment === 'web') {
      // Use web worker mode
      unifiedClient = await UniversalClientFactory.createWebWorkerClient({
        context,
        logger,
        workerFileName: 'worker.mjs',
      });
      logToOutputChannel('✅ Created web worker client', 'info');
    } else {
      // For desktop, we could still use web worker mode for consistency,
      // or implement Node.js mode when it's available in UniversalClientFactory
      // For now, let's use web worker mode which works in both environments
      unifiedClient = await UniversalClientFactory.createWebWorkerClient({
        context,
        logger,
        workerFileName: 'worker.mjs',
      });
      logToOutputChannel(
        '✅ Created desktop client (using web worker architecture)',
        'info',
      );
    }

    // Initialize the client
    const initParams = createInitializeParams(context);
    await unifiedClient.initialize(initParams);

    logToOutputChannel(
      '✅ Unified language server initialized successfully',
      'info',
    );

    // Set up client state monitoring
    // Note: UniversalExtensionClient doesn't have the same state change events as LanguageClient
    // So we'll mark as ready immediately after successful initialization
    updateApexServerStatusReady();
    resetServerStartRetries();
    setStartingFlag(false);

    // Register configuration change listener
    // We'll adapt this to work with the unified client
    if (unifiedClient) {
      registerUnifiedConfigurationChangeListener(unifiedClient, context);
    }

    logToOutputChannel('🎉 Unified Apex Language Server is ready!', 'info');
  } catch (error) {
    logToOutputChannel(
      `❌ Failed to start unified language server: ${error}`,
      'error',
    );
    setStartingFlag(false);
    updateApexServerStatusError();
    throw error;
  }
};

/**
 * Register configuration change listener for unified client
 */
function registerUnifiedConfigurationChangeListener(
  client: UniversalExtensionClient,
  context: vscode.ExtensionContext,
): void {
  const configWatcher = vscode.workspace.onDidChangeConfiguration(
    async (event) => {
      if (event.affectsConfiguration('apex-ls-ts')) {
        logToOutputChannel(
          '⚙️ Configuration changed, notifying language server',
          'debug',
        );

        try {
          // Send configuration change notification to the server
          const settings = getWorkspaceSettings();
          client.sendNotification('workspace/didChangeConfiguration', {
            settings,
          });
        } catch (error) {
          logToOutputChannel(
            `Failed to send configuration change: ${error}`,
            'error',
          );
        }
      }
    },
  );

  context.subscriptions.push(configWatcher);
}

/**
 * Starts the unified language server
 */
export async function startUnifiedLanguageServer(
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> {
  logToOutputChannel('🚀 Starting Unified Apex Language Server...', 'info');

  try {
    await createAndStartUnifiedClient(context, restartHandler);
  } catch (error) {
    logToOutputChannel(`❌ Failed to start language server: ${error}`, 'error');
    throw error;
  }
}

/**
 * Restarts the unified language server
 */
export async function restartUnifiedLanguageServer(
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> {
  logToOutputChannel('🔄 Restarting Unified Apex Language Server...', 'info');

  try {
    await stopUnifiedLanguageServer();
    await startUnifiedLanguageServer(context, restartHandler);
  } catch (error) {
    logToOutputChannel(
      `❌ Failed to restart language server: ${error}`,
      'error',
    );
    throw error;
  }
}

/**
 * Stops the unified language server
 */
export async function stopUnifiedLanguageServer(): Promise<void> {
  logToOutputChannel('🛑 Stopping Unified Apex Language Server...', 'info');

  if (unifiedClient) {
    try {
      unifiedClient.dispose();
      unifiedClient = undefined;
      logToOutputChannel('✅ Unified language server stopped', 'info');
    } catch (error) {
      logToOutputChannel(
        `⚠️ Error stopping language server: ${error}`,
        'warning',
      );
    }
  }

  updateApexServerStatusError();
}

/**
 * Gets the current unified client instance
 */
export function getUnifiedClient(): UniversalExtensionClient | undefined {
  return unifiedClient;
}
