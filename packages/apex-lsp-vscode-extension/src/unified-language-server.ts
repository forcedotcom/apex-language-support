/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import type { UnifiedClientInterface } from '@salesforce/apex-ls';
import { LanguageClient } from 'vscode-languageclient/browser';
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
let unifiedClient: UnifiedClientInterface | undefined;

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
 * Safely clone an object for worker serialization, removing non-serializable properties
 */
function safeCloneForWorker(obj: any): any {
  try {
    // Test if the object can be serialized
    const testStr = JSON.stringify(obj);
    return JSON.parse(testStr);
  } catch {
    // If serialization fails, create a safe version
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    const safe: any = {};
    for (const key in obj) {
      try {
        const value = obj[key];
        if (typeof value === 'function') continue;
        if (typeof value === 'symbol') continue;
        if (value instanceof Node) continue; // DOM nodes

        // Recursively handle nested objects
        safe[key] = safeCloneForWorker(value);
      } catch {
        // Skip any properties that can't be safely cloned
        continue;
      }
    }
    return safe;
  }
}

/**
 * Create initialization parameters
 */
function createInitializeParams(
  context: vscode.ExtensionContext,
): InitializeParams {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const settings = getWorkspaceSettings();

  const baseParams = {
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
      custom: safeCloneForWorker(settings.apex.custom),
    },
    workspaceFolders:
      workspaceFolders?.map((folder) => ({
        uri: folder.uri.toString(),
        name: folder.name,
      })) || null,
  };

  // Return safely cloned parameters for worker serialization
  return safeCloneForWorker(baseParams);
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

    // Debug extension URI resolution
    logToOutputChannel(
      `🔍 Extension URI: ${context.extensionUri.toString()}`,
      'debug',
    );
    logToOutputChannel(`🔍 Extension path: ${context.extensionPath}`, 'debug');
    
    // Use vscode.Uri.joinPath for proper URI construction in web environments
    const workerUri = vscode.Uri.joinPath(context.extensionUri, 'dist', 'worker.js');
    logToOutputChannel(`🔍 Worker URI: ${workerUri.toString()}`, 'debug');

    // Create worker
    const worker = new Worker(workerUri.toString(), { type: 'classic' });

    // Add debug message listener
    worker.addEventListener('message', (event) => {
      if (event.data?.type === 'apex-worker-debug') {
        logToOutputChannel(
          `🔍 Worker Debug: ${event.data.message}`,
          'debug',
        );
      }
    });

    // Create VS Code Language Client for web extension
    const languageClient = new LanguageClient(
      'apex-language-server',
      'Apex Language Server',
      {
        documentSelector: [
          { scheme: 'file', language: 'apex' },
          { scheme: 'vscode-test-web', language: 'apex' },
        ],
        synchronize: {
          fileEvents: vscode.workspace.createFileSystemWatcher(
            '**/*.{cls,trigger,apex}',
          ),
        },
      },
      worker,
    );

    // Store client for disposal with UnifiedClientInterface wrapper
    unifiedClient = {
      languageClient,
      initialize: async (params: InitializeParams) => {
        await languageClient.start();
        return { capabilities: {} }; // Return basic capabilities
      },
      sendRequest: async (method: string, params?: any) =>
        languageClient.sendRequest(method, params),
      sendNotification: (method: string, params?: any) => {
        languageClient.sendNotification(method, params);
      },
      onRequest: (method: string, handler: (params: any) => any) => {
        languageClient.onRequest(method, handler);
      },
      onNotification: (method: string, handler: (params: any) => void) => {
        languageClient.onNotification(method, handler);
      },
      isDisposed: () => !languageClient.isRunning(),
      dispose: () => {
        languageClient.stop();
      },
    } as UnifiedClientInterface;

    // Initialize the language server
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
  client: UnifiedClientInterface,
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
export function getUnifiedClient(): UnifiedClientInterface | undefined {
  return unifiedClient;
}
