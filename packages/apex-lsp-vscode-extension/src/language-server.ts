/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import type { ClientInterface } from '@salesforce/apex-lsp-shared';
import type { InitializeParams } from 'vscode-languageserver-protocol';
import { logToOutputChannel, getWorkerServerOutputChannel } from './logging';
import { setStartingFlag, resetServerStartRetries } from './commands';
import {
  updateApexServerStatusStarting,
  updateApexServerStatusReady,
  updateApexServerStatusError,
} from './status-bar';
import { getWorkspaceSettings } from './configuration';
// Import getDebugOptions conditionally for Node.js environments
// In web environments, this will be undefined since server-config has Node.js-specific imports

/**
 * Browser-compatible debug options getter
 * Returns undefined in web environments since debug options don't apply
 */
function getBrowserCompatibleDebugOptions(): any {
  // In web environments, debug options are not applicable
  if (detectEnvironment() === 'web') {
    return undefined;
  }

  // For Node.js environments, try to get debug options but handle import errors gracefully
  try {
    // Dynamic import to avoid issues in web environments
    const { getDebugOptions } = require('./server-config');
    return getDebugOptions();
  } catch (_error) {
    // If server-config can't be loaded (e.g., in web environment), return undefined
    return undefined;
  }
}

/**
 * Global language client instance
 */
let Client: ClientInterface | undefined;

/**
 * Environment detection
 */
function detectEnvironment(): 'desktop' | 'web' {
  // Check if we're in a web environment (VSCode for web)
  if (vscode.env.uiKind === vscode.UIKind.Web) {
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
 * Creates enhanced initialization options that incorporate benefits from server-config.ts
 */
function createEnhancedInitializationOptions(
  context: vscode.ExtensionContext,
): any {
  const settings = getWorkspaceSettings();

  // Determine server mode with environment variable override (from server-config.ts logic)
  let serverMode: 'production' | 'development';

  // Check for environment variables only if process is available (Node.js environment)
  const processEnv = typeof process !== 'undefined' ? process.env : {};

  if (
    processEnv.APEX_LS_MODE === 'production' ||
    processEnv.APEX_LS_MODE === 'development'
  ) {
    serverMode = processEnv.APEX_LS_MODE;
    logToOutputChannel(
      `Using server mode from environment variable: ${serverMode}`,
      'info',
    );
  } else {
    // Default to extension mode
    serverMode =
      context.extensionMode === vscode.ExtensionMode.Development ||
      context.extensionMode === vscode.ExtensionMode.Test
        ? 'development'
        : 'production';
    logToOutputChannel(
      `Using server mode from extension mode: ${serverMode}`,
      'debug',
    );
  }

  // Enhanced initialization options with server-config benefits
  return {
    enableDocumentSymbols: true,
    extensionMode: serverMode, // Pass extension mode to server (from server-config.ts)
    environment: detectEnvironment(),
    ...settings,
    // Add debug information if available
    ...(getBrowserCompatibleDebugOptions() && {
      debugOptions: getBrowserCompatibleDebugOptions(),
    }),
  };
}

/**
 * Create initialization parameters
 */
function createInitializeParams(
  context: vscode.ExtensionContext,
): InitializeParams {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const settings = getWorkspaceSettings();

  // Determine extension mode for logging and debugging
  const extensionMode =
    context.extensionMode === vscode.ExtensionMode.Development ||
    context.extensionMode === vscode.ExtensionMode.Test
      ? 'development'
      : 'production';

  // Log the extension mode for debugging
  logToOutputChannel(
    `🔧 Extension mode detected: ${extensionMode} (context.extensionMode: ${context.extensionMode})`,
    'info',
  );

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
      extensionMode: extensionMode,
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
 * Creates and starts the language client
 */
export const createAndStartClient = async (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> => {
  logToOutputChannel('🔥 createAndStartClient called!', 'info');
  try {
    setStartingFlag(true);
    updateApexServerStatusStarting();

    const environment = detectEnvironment();
    logToOutputChannel(
      `🌍 Environment detected: ${environment} mode (UIKind: ${vscode.env.uiKind})`,
      'info',
    );
    logToOutputChannel(
      `🚀 Starting language server in ${environment} mode`,
      'info',
    );

    if (environment === 'web') {
      // Web environment - use worker-based approach
      await createWebLanguageClient(context);
    } else {
      // Desktop environment - use Node.js server-based approach with proper server config
      await createDesktopLanguageClient(context);
    }

    logToOutputChannel('✅ Client initialized successfully', 'info');

    // Set up client state monitoring
    logToOutputChannel('📊 Updating server status to ready...', 'debug');
    updateApexServerStatusReady();
    logToOutputChannel('🔄 Resetting retry counters...', 'debug');
    resetServerStartRetries();
    setStartingFlag(false);

    // Register configuration change listener
    if (Client) {
      logToOutputChannel(
        '⚙️ Registering configuration change listener...',
        'debug',
      );
      registerConfigurationChangeListener(Client, context);
      logToOutputChannel('✅ Configuration listener registered', 'debug');
    }

    logToOutputChannel('🎉 Apex Language Server is ready!', 'info');
  } catch (error) {
    logToOutputChannel(`❌ Failed to start language server: ${error}`, 'error');
    setStartingFlag(false);
    updateApexServerStatusError();
    throw error;
  }
};

/**
 * Creates a web-based language client using a worker
 */
async function createWebLanguageClient(
  context: vscode.ExtensionContext,
): Promise<void> {
  // Import web-worker package and browser language client dynamically
  const { default: Worker } = await import('web-worker');
  const { LanguageClient } = await import('vscode-languageclient/browser');

  logToOutputChannel('🔧 Creating web-based language client...', 'info');

  // Debug extension URI resolution
  logToOutputChannel(
    `🔍 Extension URI: ${context.extensionUri.toString()}`,
    'debug',
  );
  logToOutputChannel(`🔍 Extension path: ${context.extensionPath}`, 'debug');

  const workerFile = 'worker.js';

  // Use the worker file copied to the extension's dist directory by the build process
  const workerUri = vscode.Uri.joinPath(
    context.extensionUri,
    'dist',
    workerFile,
  );
  logToOutputChannel(`🔍 Worker file: ${workerFile}`, 'debug');
  logToOutputChannel(`🔍 Worker URI: ${workerUri.toString()}`, 'debug');

  // Check if worker file exists/is accessible
  try {
    logToOutputChannel('🔍 Checking worker file accessibility...', 'debug');
    const response = await fetch(workerUri.toString());
    logToOutputChannel(
      `🔍 Worker file fetch status: ${response.status}`,
      'debug',
    );
    if (!response.ok) {
      logToOutputChannel(
        `❌ Worker file not accessible: ${response.statusText}`,
        'error',
      );
    }
  } catch (error) {
    logToOutputChannel(`❌ Error checking worker file: ${error}`, 'error');
  }

  // Create worker
  logToOutputChannel('⚡ Creating web worker...', 'info');
  const worker = new Worker(workerUri.toString(), {
    type: 'classic',
  });
  logToOutputChannel('✅ Web worker created successfully', 'info');

  // Create VS Code Language Client for web extension with enhanced configuration
  logToOutputChannel('🔗 Creating Language Client for web...', 'info');
  const languageClient = new LanguageClient(
    'apex-language-server',
    'Apex Language Server Extension (Worker/Server)',
    {
      documentSelector: [
        { scheme: 'file', language: 'apex' },
        { scheme: 'vscode-test-web', language: 'apex' },
      ],
      synchronize: {
        fileEvents: vscode.workspace.createFileSystemWatcher(
          '**/*.{cls,trigger,apex}',
        ),
        configurationSection: 'apex',
      },
      initializationOptions: createEnhancedInitializationOptions(context),
      ...(getWorkerServerOutputChannel()
        ? {
            outputChannel: getWorkerServerOutputChannel(),
            traceOutputChannel: getWorkerServerOutputChannel(),
          }
        : {}),
    },
    worker,
  );
  // Set up window/logMessage handler for worker/server logs
  languageClient.onNotification('window/logMessage', (params) => {
    const { message } = params;

    // All messages from the worker/server go directly to the worker/server channel without additional formatting
    const channel = getWorkerServerOutputChannel();
    if (channel) {
      channel.appendLine(message);
    }
  });

  // Store client for disposal with ClientInterface wrapper
  Client = {
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
  } as ClientInterface;

  // Initialize the language server
  logToOutputChannel('🔧 Creating initialization parameters...', 'debug');
  const initParams = createInitializeParams(context);
  logToOutputChannel('🚀 Initializing web client...', 'info');
  await Client.initialize(initParams);
}

/**
 * Creates a desktop-based language client using integrated approach
 * For desktop environments, we'll use the same integrated approach as web but with Node.js optimizations
 */
async function createDesktopLanguageClient(
  context: vscode.ExtensionContext,
): Promise<void> {
  logToOutputChannel(
    '🔧 Creating desktop-based language client using integrated approach...',
    'info',
  );

  // For now, we'll use the web approach for desktop as well since this project uses an integrated architecture
  // This ensures we get the proper server config benefits while maintaining compatibility
  logToOutputChannel(
    '🔄 Using integrated approach for desktop environment (no separate server process)',
    'info',
  );

  // Use the web implementation for desktop too - this project doesn't use separate server processes
  await createWebLanguageClient(context);
}

/**
 * Register configuration change listener for client
 */
function registerConfigurationChangeListener(
  client: ClientInterface,
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
            settings: {
              'apex-ls-ts': settings,
            },
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
 * Starts the language server
 */
export async function startLanguageServer(
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> {
  logToOutputChannel('🚀 Starting Apex Language Server...', 'info');

  try {
    await createAndStartClient(context, restartHandler);
  } catch (error) {
    logToOutputChannel(`❌ Failed to start language server: ${error}`, 'error');
    throw error;
  }
}

/**
 * Restarts the language server
 */
export async function restartLanguageServer(
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> {
  logToOutputChannel('🔄 Restarting Apex Language Server...', 'info');

  try {
    await stopLanguageServer();
    await startLanguageServer(context, restartHandler);
  } catch (error) {
    logToOutputChannel(
      `❌ Failed to restart language server: ${error}`,
      'error',
    );
    throw error;
  }
}

/**
 * Stops the language server
 */
export async function stopLanguageServer(): Promise<void> {
  logToOutputChannel('🛑 Stopping Apex Language Server...', 'info');

  if (Client) {
    try {
      Client.dispose();
      Client = undefined;
      logToOutputChannel('✅ Language server stopped', 'info');
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
 * Gets the current client instance
 */
export function getClient(): ClientInterface | undefined {
  return Client;
}
