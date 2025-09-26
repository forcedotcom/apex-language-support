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
    // First, try a direct JSON serialization test
    const testStr = JSON.stringify(obj);
    return JSON.parse(testStr);
  } catch (error) {
    logToOutputChannel(
      `⚠️ Object serialization failed, creating safe clone: ${error}`,
      'debug',
    );

    // If serialization fails, create a safe version
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => safeCloneForWorker(item));
    }

    const safe: any = {};
    for (const key in obj) {
      try {
        const value = obj[key];

        // Skip functions, symbols, and other non-serializable types
        if (typeof value === 'function') continue;
        if (typeof value === 'symbol') continue;
        if (typeof value === 'undefined') continue;
        if (value instanceof Node) continue; // DOM nodes
        if (value instanceof Error) continue; // Error objects

        // Skip VS Code objects that might not be serializable
        if (
          value &&
          typeof value === 'object' &&
          value.constructor &&
          value.constructor.name &&
          value.constructor.name.includes('Uri')
        ) {
          // Convert VS Code URI objects to strings
          if (typeof value.toString === 'function') {
            safe[key] = value.toString();
            continue;
          } else {
            continue;
          }
        }

        // Test if this specific value can be serialized
        try {
          JSON.stringify(value);
          // Recursively handle nested objects
          safe[key] = safeCloneForWorker(value);
        } catch {
          // If this value can't be serialized, skip it
          logToOutputChannel(
            `⚠️ Skipping non-serializable property: ${key}`,
            'debug',
          );
          continue;
        }
      } catch (err) {
        // Skip any properties that can't be safely cloned
        logToOutputChannel(`⚠️ Error cloning property ${key}: ${err}`, 'debug');
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
  // Safely extract only serializable settings
  const safeSettings = safeCloneForWorker(settings);
  const debugOptions = getBrowserCompatibleDebugOptions();

  const enhancedOptions = {
    enableDocumentSymbols: true,
    extensionMode: serverMode, // Pass extension mode to server (from server-config.ts)
    environment: detectEnvironment(),
    ...safeSettings,
    // Add debug information if available and serializable
    ...(debugOptions && {
      debugOptions: safeCloneForWorker(debugOptions),
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
}

/**
 * Create initialization parameters
 */
function createInitializeParams(
  context: vscode.ExtensionContext,
): InitializeParams {
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
    initializationOptions: createEnhancedInitializationOptions(context),
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

      // Send initial configuration to the language server
      // logToOutputChannel(
      //   '📤 Sending initial configuration to language server...',
      //   'debug',
      // );
      // sendInitialConfiguration(Client);
      // logToOutputChannel('✅ Initial configuration sent', 'debug');
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

  // The actual worker file is worker.global.js, not worker.js
  const workerFile = 'worker.global.js';

  // In development mode, worker file is always in dist/ (from apex-ls build)
  // In production mode, it's copied to extension's dist/ during bundle process
  const isDevelopment =
    context.extensionMode === vscode.ExtensionMode.Development;

  let workerUri: vscode.Uri;
  if (isDevelopment) {
    // In development, use the worker file from apex-ls dist directory
    workerUri = vscode.Uri.joinPath(
      context.extensionUri,
      '../apex-ls/dist',
      workerFile,
    );
  } else {
    // In production, use the worker file copied to extension's dist directory
    workerUri = vscode.Uri.joinPath(context.extensionUri, 'dist', workerFile);
  }
  logToOutputChannel(`🔍 Worker file: ${workerFile}`, 'debug');
  logToOutputChannel(`🔍 Worker URI: ${workerUri.toString()}`, 'debug');
  logToOutputChannel(
    `🔍 Extension mode: ${isDevelopment ? 'development' : 'production'}`,
    'debug',
  );

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
        configurationSection: EXTENSION_CONSTANTS.APEX_LS_CONFIG_SECTION,
      },
      initializationOptions: createEnhancedInitializationOptions(context),
    },
    worker,
  );

  // Note: Output channels are handled via the window/logMessage notification handler below
  // The LanguageClient's outputChannel property is read-only, so we can't set it directly

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

  // Debug: log the serialized params to verify they're safe
  try {
    const serializedParams = JSON.stringify(initParams);
    logToOutputChannel(
      `🔍 Initialization params size: ${serializedParams.length} chars`,
      'debug',
    );
  } catch (error) {
    logToOutputChannel(
      `❌ Initialization params are not serializable: ${error}`,
      'error',
    );
    throw new Error(`Cannot serialize initialization parameters: ${error}`);
  }

  logToOutputChannel('🚀 Initializing web client...', 'info');
  await Client.initialize(initParams);
}

/**
 * Creates a desktop-based language client using Node.js server
 * For desktop environments, we use the native Node.js server without polyfills
 */
async function createDesktopLanguageClient(
  context: vscode.ExtensionContext,
): Promise<void> {
  logToOutputChannel(
    '🖥️ Creating desktop language client with Node.js server...',
    'info',
  );

  // Import the server configuration
  const { createServerOptions, createClientOptions } = await import(
    './server-config'
  );

  // Create server and client options
  const serverOptions = createServerOptions(context);
  const clientOptions = createClientOptions(
    createEnhancedInitializationOptions(context),
  );

  logToOutputChannel(
    '⚙️ Using Node.js server (no polyfills needed)...',
    'debug',
  );

  // Create the language client using Node.js server
  const { LanguageClient } = await import('vscode-languageclient/node');

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
