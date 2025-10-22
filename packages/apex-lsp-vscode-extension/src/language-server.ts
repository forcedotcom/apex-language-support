/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import type {
  ApexLanguageServerSettings,
  ClientInterface,
  RuntimePlatform,
} from '@salesforce/apex-lsp-shared';
import { getClientCapabilitiesForMode } from '@salesforce/apex-lsp-shared';
import type { InitializeParams } from 'vscode-languageserver-protocol';
import { logToOutputChannel, getWorkerServerOutputChannel } from './logging';
import { setStartingFlag, resetServerStartRetries } from './commands';
import { handleFindMissingArtifact } from './missing-artifact-handler';
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
import {
  determineServerMode,
  getStdApexClassesPathFromContext,
} from './utils/serverUtils';

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
 * @param runtimePlatform - The detected environment (desktop or web)
 * @returns Enhanced initialization options
 */
const createEnhancedInitializationOptions = (
  context: vscode.ExtensionContext,
  runtimePlatform: RuntimePlatform,
): ApexLanguageServerSettings => {
  const settings = getWorkspaceSettings();
  const serverMode = determineServerMode(context);
  const standardApexLibraryPath = getStdApexClassesPathFromContext(context);

  // Use settings directly without deep cloning to avoid serialization issues
  const safeSettings = settings || {};

  const enhancedOptions: ApexLanguageServerSettings = {
    apex: {
      ...safeSettings.apex,
      environment: {
        ...safeSettings.apex?.environment,
        runtimePlatform,
        serverMode,
      },
      resources: {
        ...safeSettings.apex?.resources,
        standardApexLibraryPath: standardApexLibraryPath?.toString(),
      },
      performance: {
        ...safeSettings.apex?.performance,
      },
      commentCollection: {
        ...safeSettings.apex?.commentCollection,
      },
    },
  };

  return enhancedOptions;
};

/**
 * Create initialization parameters.
 * @param context - VS Code extension context
 * @param environment - The detected environment (desktop or web)
 * @returns LSP initialization parameters
 */
export const createInitializeParams = (
  context: vscode.ExtensionContext,
  environment: 'desktop' | 'web',
): InitializeParams => {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  // Determine server mode
  const serverMode = determineServerMode(context);

  // Get mode-appropriate client capabilities
  const clientCapabilities = getClientCapabilitiesForMode(serverMode);

  // Log the server mode for debugging
  logToOutputChannel(
    `🔧 Server mode detected: ${serverMode} (context.extensionMode: ${context.extensionMode})`,
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
    capabilities: clientCapabilities, // Use mode-aware capabilities
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
  console.log('🔥 createAndStartClient called!');
  logToOutputChannel('🔥 createAndStartClient called!', 'info');

  // Check if a client is already running
  if (Client) {
    console.log('⚠️ [WARNING] Client already exists, skipping creation');
    logToOutputChannel(
      '⚠️ [WARNING] Client already exists, skipping creation',
      'warning',
    );
    return;
  }

  try {
    setStartingFlag(true);
    updateApexServerStatusStarting();

    const environment = detectEnvironment();
    console.log(
      `🌍 Environment detected: ${environment} mode (UIKind: ${vscode.env.uiKind})`,
    );
    console.log(`🚀 Starting language server in ${environment} mode`);
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
      console.log('🌐 [DEBUG] Creating WEB language client');
      logToOutputChannel('🌐 [DEBUG] Creating WEB language client', 'debug');
      await createWebLanguageClient(context, environment);
      console.log('✅ [DEBUG] WEB language client created successfully');
      logToOutputChannel(
        '✅ [DEBUG] WEB language client created successfully',
        'debug',
      );
    } else {
      // Desktop environment - use Node.js server-based approach with proper server config
      console.log('🖥️ [DEBUG] Creating DESKTOP language client');
      logToOutputChannel(
        '🖥️ [DEBUG] Creating DESKTOP language client',
        'debug',
      );
      await createDesktopLanguageClient(context, environment);
      console.log('✅ [DEBUG] DESKTOP language client created successfully');
      logToOutputChannel(
        '✅ [DEBUG] DESKTOP language client created successfully',
        'debug',
      );
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

  // In web environment, since we're serving from the dist directory itself,
  // the worker file is directly in the extension root, not in a dist subdirectory
  const workerUri = vscode.Uri.joinPath(context.extensionUri, workerFile);
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
      `❌ Worker error details: ${error.message} (${error.filename}:${error.lineno}:${error.colno})`,
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

  // Create initialization options with debugging
  const initOptions = createEnhancedInitializationOptions(context, environment);
  logToOutputChannel('🔍 [DEBUG] Initialization options created', 'debug');

  let languageClient: any;
  try {
    languageClient = new LanguageClient(
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
        initializationOptions: initOptions,
        // Don't pass outputChannel to web worker as it may contain non-serializable objects
        // Web worker logging is handled via window/logMessage notifications
      },
      worker,
    );
    logToOutputChannel(
      '✅ [DEBUG] Language Client created successfully',
      'debug',
    );
  } catch (error) {
    logToOutputChannel(
      `❌ [ERROR] Failed to create Language Client: ${error}`,
      'error',
    );
    try {
      logToOutputChannel(
        `❌ [ERROR] Init options: ${JSON.stringify(initOptions, null, 2)}`,
        'error',
      );
    } catch (_jsonError) {
      logToOutputChannel(
        '❌ [ERROR] Init options: [unable to serialize init options]',
        'error',
      );
    }
    throw error;
  }

  // Note: Output channels are handled via the window/logMessage notification handler below
  // The LanguageClient's outputChannel property is read-only, so we can't set it directly

  // Set up window/logMessage handler for worker/server logs
  languageClient.onNotification('window/logMessage', (params: any) => {
    logToOutputChannel(
      `📨 Received window/logMessage: ${params.message || 'No message'}`,
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

  // Set up configuration change handler to manually trigger updates
  languageClient.onNotification(
    'workspace/didChangeConfiguration',
    (params: any) => {
      // Only log the settings part to avoid serialization issues
      if (params?.settings) {
        logToOutputChannel(
          `📋 Configuration change notification received: ${JSON.stringify(params.settings, null, 2)}`,
          'debug',
        );
      } else {
        logToOutputChannel(
          '📋 Configuration change notification received (no settings)',
          'debug',
        );
      }
    },
  );

  // Also listen for $/logMessage (alternative notification method)
  languageClient.onNotification('$/logMessage', (params: any) => {
    logToOutputChannel(
      `📨 Received $/logMessage: ${params.message || 'No message'}`,
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
  languageClient.onNotification('$/logTrace', (params: any) => {
    logToOutputChannel(
      `📨 Received $/logTrace: ${params.message || 'No trace message'}`,
      'debug',
    );
  });

  // Handle connection state changes
  languageClient.onDidChangeState((event: any) => {
    logToOutputChannel(
      `🔄 Language client state changed: ${event.oldState} -> ${event.newState}`,
      'info',
    );
  });

  // Store client for disposal with ClientInterface wrapper
  console.log('🔍 [DEBUG] Setting global Client to web client');
  logToOutputChannel('🔍 [DEBUG] Setting global Client to web client', 'debug');
  Client = {
    languageClient,
    initialize: async (params: InitializeParams) => {
      logToOutputChannel('🚀 Starting language client...', 'info');
      try {
        await languageClient.start();
        logToOutputChannel('✅ Language client started successfully', 'info');
        return { capabilities: {} }; // Return basic capabilities
      } catch (error) {
        logToOutputChannel(
          `❌ Failed to start language client: ${error}`,
          'error',
        );
        throw error;
      }
    },
    sendRequest: async (method: string, params?: any) => {
      try {
        logToOutputChannel(`🔍 [DEBUG] Sending request: ${method}`, 'debug');
        const result = await languageClient.sendRequest(method, params);
        logToOutputChannel(
          `✅ [DEBUG] Successfully sent request: ${method}`,
          'debug',
        );
        return result;
      } catch (error) {
        logToOutputChannel(
          `❌ [ERROR] Failed to send request ${method}: ${error}`,
          'error',
        );
        try {
          logToOutputChannel(
            `❌ [ERROR] Request params: ${JSON.stringify(params, null, 2)}`,
            'error',
          );
        } catch (_jsonError) {
          logToOutputChannel(
            '❌ [ERROR] Failed to stringify request params',
            'error',
          );
        }
        throw error;
      }
    },
    sendNotification: (method: string, params?: any) => {
      try {
        console.log(`🔍 [DEBUG] Sending notification: ${method}`);
        try {
          console.log(
            '🔍 [DEBUG] Notification params:',
            JSON.stringify(params, null, 2),
          );
        } catch (_error) {
          console.log('🔍 [DEBUG] Notification params: [unable to serialize]');
        }
        logToOutputChannel(
          `🔍 [DEBUG] Sending notification: ${method}`,
          'debug',
        );

        // Ensure params are serializable before sending
        let cleanParams = params;
        if (params) {
          try {
            cleanParams = JSON.parse(JSON.stringify(params));
          } catch (error) {
            console.error('Failed to clean params for notification:', error);
            cleanParams = {};
          }
        }

        languageClient.sendNotification(method, cleanParams);
        console.log(`✅ [DEBUG] Successfully sent notification: ${method}`);
        logToOutputChannel(
          `✅ [DEBUG] Successfully sent notification: ${method}`,
          'debug',
        );
      } catch (error) {
        console.log(`❌ [ERROR] Failed to send notification ${method}:`, error);
        logToOutputChannel(
          `❌ [ERROR] Failed to send notification ${method}: ${error}`,
          'error',
        );
        try {
          logToOutputChannel(
            `❌ [ERROR] Notification params: ${JSON.stringify(params, null, 2)}`,
            'error',
          );
        } catch (_jsonError) {
          console.log('❌ [ERROR] Failed to stringify params:', _jsonError);
          logToOutputChannel(
            '❌ [ERROR] Failed to stringify notification params',
            'error',
          );
        }
        throw error;
      }
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

  // Register handler for server-to-client apex/findMissingArtifact requests
  Client.onRequest('apex/findMissingArtifact', async (params: any) => {
    logToOutputChannel(
      `📨 Received apex/findMissingArtifact request for: ${params.identifier}`,
      'debug',
    );

    try {
      const result = await handleFindMissingArtifact(params, context);
      logToOutputChannel(
        `✅ Resolved missing artifact: ${params.identifier}`,
        'debug',
      );
      return result;
    } catch (error) {
      logToOutputChannel(
        `❌ Failed to resolve missing artifact ${params.identifier}: ${error}`,
        'error',
      );
      return { notFound: true };
    }
  });

  // Initialize the language server
  logToOutputChannel('🔧 Creating initialization parameters...', 'debug');

  let initParams: InitializeParams;
  try {
    initParams = createInitializeParams(context, environment);
    logToOutputChannel(
      '✅ [DEBUG] Initialization parameters created successfully',
      'debug',
    );
  } catch (error) {
    logToOutputChannel(
      `❌ [ERROR] Failed to create initialization parameters: ${error}`,
      'error',
    );
    throw error;
  }

  // Initialize params are already serializable (plain objects with primitive values)

  logToOutputChannel('🚀 Initializing web client...', 'info');
  try {
    await Client.initialize(initParams);
    logToOutputChannel(
      '✅ [DEBUG] Web client initialized successfully',
      'debug',
    );
  } catch (error) {
    logToOutputChannel(
      `❌ [ERROR] Failed to initialize web client: ${error}`,
      'error',
    );
    logToOutputChannel(
      `❌ [ERROR] Init params: ${JSON.stringify(initParams, null, 2)}`,
      'error',
    );
    throw error;
  }
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
  console.log('🔍 [DEBUG] Setting global Client to desktop client');
  logToOutputChannel(
    '🔍 [DEBUG] Setting global Client to desktop client',
    'debug',
  );
  Client = {
    languageClient: nodeClient,
    initialize: async (params: InitializeParams) => {
      // Node.js client handles initialization automatically during start()
      logToOutputChannel('📋 Node.js client initialization completed', 'debug');
      return { capabilities: {} }; // Return proper InitializeResult
    },
    sendNotification: (method: string, params?: any) => {
      try {
        logToOutputChannel(
          `🔍 [DEBUG] Sending desktop notification: ${method}`,
          'debug',
        );
        nodeClient.sendNotification(method, params);
        logToOutputChannel(
          `✅ [DEBUG] Successfully sent desktop notification: ${method}`,
          'debug',
        );
      } catch (error) {
        logToOutputChannel(
          `❌ [ERROR] Failed to send desktop notification ${method}: ${error}`,
          'error',
        );
        try {
          logToOutputChannel(
            `❌ [ERROR] Desktop notification params: ${JSON.stringify(params, null, 2)}`,
            'error',
          );
        } catch (_jsonError) {
          logToOutputChannel(
            '❌ [ERROR] Failed to stringify desktop notification params',
            'error',
          );
        }
        throw error;
      }
    },
    sendRequest: (method: string, params?: any) => {
      try {
        logToOutputChannel(
          `🔍 [DEBUG] Sending desktop request: ${method}`,
          'debug',
        );
        const result = nodeClient.sendRequest(method, params);
        logToOutputChannel(
          `✅ [DEBUG] Successfully sent desktop request: ${method}`,
          'debug',
        );
        return result;
      } catch (error) {
        logToOutputChannel(
          `❌ [ERROR] Failed to send desktop request ${method}: ${error}`,
          'error',
        );
        try {
          logToOutputChannel(
            `❌ [ERROR] Desktop request params: ${JSON.stringify(params, null, 2)}`,
            'error',
          );
        } catch (_jsonError) {
          logToOutputChannel(
            '❌ [ERROR] Failed to stringify desktop request params',
            'error',
          );
        }
        throw error;
      }
    },
    onNotification: (method: string, handler: (...args: any[]) => void) =>
      nodeClient.onNotification(method, handler),
    onRequest: (method: string, handler: (...args: any[]) => any) =>
      nodeClient.onRequest(method, handler),
    isDisposed: () => !nodeClient.isRunning(),
    dispose: () => nodeClient.stop(),
  } as ClientInterface;

  // Register handler for server-to-client apex/findMissingArtifact requests
  Client.onRequest('apex/findMissingArtifact', async (params: any) => {
    logToOutputChannel(
      `📨 Received apex/findMissingArtifact request for: ${params.identifier}`,
      'debug',
    );

    try {
      const result = await handleFindMissingArtifact(params, context);
      logToOutputChannel(
        `✅ Resolved missing artifact: ${params.identifier}`,
        'debug',
      );
      return result;
    } catch (error) {
      logToOutputChannel(
        `❌ Failed to resolve missing artifact ${params.identifier}: ${error}`,
        'error',
      );
      return { notFound: true };
    }
  });

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
