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
import {
  getWorkspaceSettings,
  registerConfigurationChangeListener,
} from './configuration';
import { EXTENSION_CONSTANTS } from './constants';
import { determineServerMode, type ServerMode } from './utils/server-mode';
import type { WorkspaceSettings } from './types';

/**
 * Enhanced initialization options interface
 */
interface EnhancedInitializationOptions extends WorkspaceSettings {
  enableDocumentSymbols: boolean;
  extensionMode: ServerMode;
  environment: 'desktop' | 'web';
  debugOptions?: Record<string, unknown>;
  logLevel?: string;
}

/**
 * Browser-compatible debug options getter.
 * Returns undefined in web environments since debug options don't apply.
 * @param environment - The detected environment (desktop or web)
 * @returns Debug options object or undefined for web environments
 */
const getBrowserCompatibleDebugOptions = (
  environment: 'desktop' | 'web',
): Record<string, unknown> | undefined =>
  // Debug options are only applicable in desktop environments
  environment === 'web' ? undefined : {};

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
 * Creates enhanced initialization options that incorporate benefits from server-config.ts.
 * @param context - VS Code extension context
 * @param environment - The detected environment (desktop or web)
 * @returns Enhanced initialization options
 */
const createEnhancedInitializationOptions = (
  context: vscode.ExtensionContext,
  environment: 'desktop' | 'web',
): EnhancedInitializationOptions => {
  const settings = getWorkspaceSettings();

  // Determine server mode using shared utility
  const serverMode = determineServerMode(context);

  // Enhanced initialization options with server-config benefits
  // Deep clone settings to ensure no reference issues
  const safeSettings = JSON.parse(JSON.stringify(settings));
  const debugOptions = getBrowserCompatibleDebugOptions(environment);

  const enhancedOptions: EnhancedInitializationOptions = {
    enableDocumentSymbols: true,
    extensionMode: serverMode, // Pass extension mode to server (from server-config.ts)
    environment,
    ...safeSettings,
    // Add debug information if available and serializable
    ...(debugOptions && {
      debugOptions: JSON.parse(JSON.stringify(debugOptions)),
    }),
  };

  // In development mode, ensure debug-level logging is enabled
  if (serverMode === 'development') {
    enhancedOptions.logLevel = 'debug';
    logToOutputChannel(
      '🔧 Development mode: enabling debug-level logging',
      'debug',
    );
  }

  return enhancedOptions;
};

/**
 * Create initialization parameters.
 * @param context - VS Code extension context
 * @param environment - The detected environment (desktop or web)
 * @returns LSP initialization parameters
 */
const createInitializeParams = (
  context: vscode.ExtensionContext,
  environment: 'desktop' | 'web',
): InitializeParams => {
  const workspaceFolders = vscode.workspace.workspaceFolders;

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
    rootPath:
      environment === 'web'
        ? null
        : (workspaceFolders?.[0]?.uri.fsPath ?? null),
    rootUri: workspaceFolders?.[0]?.uri.toString() ?? null,
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
    initializationOptions: createEnhancedInitializationOptions(
      context,
      environment,
    ),
    workspaceFolders:
      workspaceFolders?.map((folder: vscode.WorkspaceFolder) => ({
        uri: folder.uri.toString(),
        name: folder.name,
      })) ?? null,
  };

  // Parameters are already built with safe values, return as-is
  // The initializationOptions are already safely cloned in createEnhancedInitializationOptions
  return baseParams as InitializeParams;
};

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
      await createWebLanguageClient(context, environment);
    } else {
      // Desktop environment - use Node.js server-based approach with proper server config
      await createDesktopLanguageClient(context, environment);
    }

    logToOutputChannel('✅ Client initialized successfully', 'info');

    // Set up client state monitoring
    updateApexServerStatusReady();
    resetServerStartRetries();
    setStartingFlag(false);

    // Register configuration change listener
    if (Client) {
      logToOutputChannel(
        '⚙️ Registering configuration change listener...',
        'debug',
      );
      registerConfigurationChangeListener(Client, context);
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
  environment: 'desktop' | 'web',
): Promise<void> {
  // Import web-worker package and browser language client dynamically in parallel
  const [{ default: Worker }, { LanguageClient }] = await Promise.all([
    import('web-worker'),
    import('vscode-languageclient/browser'),
  ]);

  logToOutputChannel('🔧 Creating web-based language client...', 'info');

  // Debug extension URI resolution
  logToOutputChannel(
    `🔍 Extension URI: ${context.extensionUri.toString()}`,
    'debug',
  );

  // The actual worker file is worker.global.js, not worker.js
  const workerFile = 'worker.global.js';

  // In web environment, worker file is always copied to extension's dist/ during bundle process
  // This ensures consistent path resolution across development and production modes
  const workerUri = vscode.Uri.joinPath(
    context.extensionUri,
    'dist',
    workerFile,
  );
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

  // Add worker error handling for debugging
  worker.onerror = (error) => {
    logToOutputChannel(`❌ Worker error: ${error.message}`, 'error');
    logToOutputChannel(
      `❌ Worker error details: ${JSON.stringify(error)}`,
      'debug',
    );
  };

  worker.onmessageerror = (error) => {
    logToOutputChannel(`❌ Worker message error: ${error}`, 'error');
  };

  // Remove custom message handling - let LSP handle all communication
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
        configurationSection: EXTENSION_CONSTANTS.APEX_LS_CONFIG_SECTION,
      },
      initializationOptions: createEnhancedInitializationOptions(
        context,
        environment,
      ),
      // Use our existing worker/server output channel to prevent duplication
      outputChannel: getWorkerServerOutputChannel(),
    },
    worker,
  );

  // Note: Output channels are handled via the window/logMessage notification handler below
  // The LanguageClient's outputChannel property is read-only, so we can't set it directly

  // Set up window/logMessage handler for worker/server logs
  languageClient.onNotification('window/logMessage', (params) => {
    logToOutputChannel(
      `📨 Received window/logMessage: ${JSON.stringify(params)}`,
      'debug',
    );
    const { message } = params;

    // All messages from the worker/server go directly to the worker/server channel without additional formatting
    const channel = getWorkerServerOutputChannel();
    if (channel) {
      channel.appendLine(message);
    } else {
      logToOutputChannel(
        `❌ No worker/server output channel available for message: ${message}`,
        'error',
      );
    }
  });

  // Also listen for $/logMessage (alternative notification method)
  languageClient.onNotification('$/logMessage', (params) => {
    logToOutputChannel(
      `📨 Received $/logMessage: ${JSON.stringify(params)}`,
      'debug',
    );
    const { message } = params;

    const channel = getWorkerServerOutputChannel();
    if (channel) {
      channel.appendLine(message);
    } else {
      logToOutputChannel(
        `❌ No worker/server output channel available for $/logMessage: ${message}`,
        'error',
      );
    }
  });

  // Add more notification handlers for debugging
  languageClient.onNotification('$/logTrace', (params) => {
    logToOutputChannel(
      `📨 Received $/logTrace: ${JSON.stringify(params)}`,
      'debug',
    );
  });

  // Handle connection state changes
  languageClient.onDidChangeState((event) => {
    logToOutputChannel(
      `🔄 Language client state changed: ${event.oldState} -> ${event.newState}`,
      'info',
    );
  });

  // Store client for disposal with ClientInterface wrapper
  Client = {
    languageClient,
    initialize: async (params: InitializeParams) => {
      logToOutputChannel('🚀 Starting language client...', 'info');
      try {
        await languageClient.start();
        logToOutputChannel('✅ Language client started successfully', 'info');

        // Test if the server is responding by sending a test request
        try {
          logToOutputChannel('🧪 Testing server responsiveness...', 'debug');

          // Try a simple capabilities request first
          const capabilities = languageClient.initializeResult;
          logToOutputChannel(
            `📋 Server capabilities: ${JSON.stringify(capabilities, null, 2)}`,
            'debug',
          );

          // Try sending a workspace/configuration request
          try {
            const configResult = await languageClient.sendRequest(
              'workspace/configuration',
              {
                items: [{ section: 'apex-ls-ts' }],
              },
            );
            console.log(
              '⚙️ DEBUG: Configuration request result:',
              configResult,
            );
            logToOutputChannel(
              `⚙️ Configuration request result: ${JSON.stringify(configResult)}`,
              'debug',
            );
          } catch (configError) {
            logToOutputChannel(
              `⚠️ Configuration request failed: ${configError}`,
              'debug',
            );
          }
        } catch (testError) {
          logToOutputChannel(`⚠️ Server test failed: ${testError}`, 'warning');
        }

        return { capabilities: {} }; // Return basic capabilities
      } catch (error) {
        logToOutputChannel(
          `❌ Failed to start language client: ${error}`,
          'error',
        );
        throw error;
      }
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
  const initParams = createInitializeParams(context, environment);

  logToOutputChannel('🚀 Initializing web client...', 'info');
  await Client.initialize(initParams);
}

/**
 * Creates a desktop-based language client using Node.js server
 * For desktop environments, we use the native Node.js server without polyfills
 */
async function createDesktopLanguageClient(
  context: vscode.ExtensionContext,
  environment: 'desktop' | 'web',
): Promise<void> {
  logToOutputChannel(
    '🖥️ Creating desktop language client with Node.js server...',
    'info',
  );

  // Import server configuration and language client in parallel
  const [{ createServerOptions, createClientOptions }, { LanguageClient }] =
    await Promise.all([
      import('./server-config'),
      import('vscode-languageclient/node'),
    ]);

  // Create server and client options
  const serverOptions = createServerOptions(context);
  const clientOptions = createClientOptions(
    createEnhancedInitializationOptions(context, environment),
  );

  logToOutputChannel(
    '⚙️ Using Node.js server (no polyfills needed)...',
    'debug',
  );

  // Create the language client using Node.js server
  const nodeClient = new LanguageClient(
    'apexLanguageServer',
    'Apex Language Server Extension (Node.js)',
    serverOptions,
    clientOptions,
  );

  logToOutputChannel('🚀 Starting Node.js language client...', 'info');

  // Start the client and language server
  await nodeClient.start();

  // Wrap in ClientInterface to match our global Client type
  Client = {
    languageClient: nodeClient,
    initialize: async (params: InitializeParams) => {
      // Node.js client handles initialization automatically during start()
      logToOutputChannel('📋 Node.js client initialization completed', 'debug');
      return { capabilities: {} }; // Return proper InitializeResult
    },
    sendNotification: (method: string, params?: any) =>
      nodeClient.sendNotification(method, params),
    sendRequest: (method: string, params?: any) =>
      nodeClient.sendRequest(method, params),
    onNotification: (method: string, handler: (...args: any[]) => void) =>
      nodeClient.onNotification(method, handler),
    onRequest: (method: string, handler: (...args: any[]) => any) =>
      nodeClient.onRequest(method, handler),
    isDisposed: () => !nodeClient.isRunning(),
    dispose: () => nodeClient.stop(),
  } as ClientInterface;

  logToOutputChannel('✅ Node.js language client started successfully', 'info');
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
