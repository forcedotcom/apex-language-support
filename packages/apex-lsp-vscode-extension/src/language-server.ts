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
  LogMessageType,
} from '@salesforce/apex-lsp-shared';
import {
  getClientCapabilitiesForMode,
  getDocumentSelectorsFromSettings,
} from '@salesforce/apex-lsp-shared';
import type { InitializeParams } from 'vscode-languageserver-protocol';
import type { BaseLanguageClient } from 'vscode-languageclient';
import {
  logToOutputChannel,
  getWorkerServerOutputChannel,
  formatLogMessageWithTimestamp,
} from './logging';
import { setStartingFlag, resetServerStartRetries } from './commands';
import { handleFindMissingArtifact } from './missing-artifact-handler';
import {
  handleLoadWorkspace,
  startWorkspaceLoad,
  WorkspaceLoaderServiceLive,
  WorkspaceStateLive,
} from './workspace-load-handler';
import { Effect, Layer } from 'effect';
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
 * Raw LanguageClient instance (for extension API export)
 * Note: This can be either browser or node LanguageClient, both extend BaseLanguageClient
 */
let LanguageClientInstance: BaseLanguageClient | undefined;

/**
 * Shared workspace load layer - created once and reused across all requests
 * to ensure state is shared between query-only and load requests
 */
const sharedWorkspaceLoadLayer = Layer.mergeAll(
  WorkspaceLoaderServiceLive,
  WorkspaceStateLive,
);

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

  // Get standard Apex library path
  const standardApexLibraryPath =
    getStdApexClassesPathFromContext(context)?.toString();

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
        standardApexLibraryPath,
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
  logToOutputChannel('createAndStartClient called!', 'info');

  // Check if a client is already running
  if (Client) {
    logToOutputChannel('Client already exists, skipping creation', 'warning');
    return;
  }

  try {
    setStartingFlag(true);
    updateApexServerStatusStarting();

    const environment = detectEnvironment();
    logToOutputChannel(
      `Environment detected: ${environment} mode (UIKind: ${vscode.env.uiKind})`,
      'info',
    );
    logToOutputChannel(
      `Starting language server in ${environment} mode`,
      'info',
    );

    if (environment === 'web') {
      // Web environment - use worker-based approach
      logToOutputChannel('Creating WEB language client', 'debug');
      await createWebLanguageClient(context, environment);
      logToOutputChannel('WEB language client created successfully', 'debug');
    } else {
      // Desktop environment - use Node.js server-based approach with proper server config
      logToOutputChannel('Creating DESKTOP language client', 'debug');
      await createDesktopLanguageClient(context, environment);
      logToOutputChannel(
        'DESKTOP language client created successfully',
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
  logToOutputChannel('Initialization options created', 'debug');

  let languageClient: any;
  try {
    // Get document selectors from settings (using 'all' capability to get all schemes)
    const documentSelector = getDocumentSelectorsFromSettings(
      'all',
      initOptions,
    );

    languageClient = new LanguageClient(
      'apex-language-server',
      'Apex Language Server Extension (Worker/Server)',
      {
        documentSelector,
        synchronize: {
          configurationSection: EXTENSION_CONSTANTS.APEX_LS_CONFIG_SECTION,
        },
        initializationOptions: initOptions,
        // Don't pass outputChannel to web worker as it may contain non-serializable objects
        // Web worker logging is handled via window/logMessage notifications
      },
      worker,
    );
    logToOutputChannel('Language Client created successfully', 'debug');

    // Workspace state is now managed via Effect Context/Layer
  } catch (error) {
    logToOutputChannel(`Failed to create Language Client: ${error}`, 'error');
    try {
      logToOutputChannel(
        `Init options: ${JSON.stringify(initOptions, null, 2)}`,
        'error',
      );
    } catch (_jsonError) {
      logToOutputChannel(
        'Init options: [unable to serialize init options]',
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
    const { message, type } = params;

    // Format message with timestamp and log level prefix
    // Remove [NODE] or [BROWSER] prefix if present, then format
    let cleanMessage = message;
    if (cleanMessage.startsWith('[NODE] ')) {
      cleanMessage = cleanMessage.substring(7); // Remove '[NODE] '
    } else if (cleanMessage.startsWith('[BROWSER] ')) {
      cleanMessage = cleanMessage.substring(10); // Remove '[BROWSER] '
    }

    // Convert LSP MessageType (number enum) to LogMessageType (string)
    // LSP MessageType: Error=1, Warning=2, Info=3, Log=4
    // Our LogMessageType: 'error' | 'warning' | 'info' | 'log' | 'debug'
    let logMessageType: LogMessageType = 'info';
    if (typeof type === 'number') {
      switch (type) {
        case 1: // MessageType.Error
          logMessageType = 'error';
          break;
        case 2: // MessageType.Warning
          logMessageType = 'warning';
          break;
        case 3: // MessageType.Info
          logMessageType = 'info';
          break;
        case 4: // MessageType.Log
          logMessageType = 'log';
          break;
        default:
          logMessageType = 'info';
      }
    } else if (typeof type === 'string') {
      // Already a string, use it directly (should be one of our LogMessageType values)
      logMessageType = (type as LogMessageType) || 'info';
    }

    // Format with timestamp and log level
    const formattedMessage = formatLogMessageWithTimestamp(
      cleanMessage,
      logMessageType,
    );

    const channel = getWorkerServerOutputChannel();
    if (channel) {
      channel.appendLine(formattedMessage);
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
    const { message, type } = params;

    // Format message with timestamp and log level prefix
    // Remove [NODE] or [BROWSER] prefix if present, then format
    let cleanMessage = message;
    if (cleanMessage.startsWith('[NODE] ')) {
      cleanMessage = cleanMessage.substring(7); // Remove '[NODE] '
    } else if (cleanMessage.startsWith('[BROWSER] ')) {
      cleanMessage = cleanMessage.substring(10); // Remove '[BROWSER] '
    }

    // Format with timestamp and log level
    const formattedMessage = formatLogMessageWithTimestamp(
      cleanMessage,
      type || 'info',
    );

    const channel = getWorkerServerOutputChannel();
    if (channel) {
      channel.appendLine(formattedMessage);
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

  // Store raw LanguageClient instance for extension API
  LanguageClientInstance = languageClient;

  // Store client for disposal with ClientInterface wrapper
  logToOutputChannel('Setting global Client to web client', 'debug');
  Client = {
    languageClient,
    initialize: async (params: InitializeParams) => {
      logToOutputChannel('🚀 Starting language client...', 'info');
      try {
        await languageClient.start();
        logToOutputChannel('✅ Language client started successfully', 'info');

        // If configured, trigger workspace load on startup via service (web)
        try {
          const settings = getWorkspaceSettings();
          logToOutputChannel(
            `Workspace load settings (web): ${JSON.stringify(settings?.apex?.loadWorkspace)}`,
            'debug',
          );
          if (settings?.apex?.loadWorkspace?.enabled && Client) {
            logToOutputChannel(
              '🚀 Triggering workspace load on startup (web)...',
              'info',
            );
            await Effect.runPromise(
              Effect.provide(
                startWorkspaceLoad(Client),
                sharedWorkspaceLoadLayer,
              ),
            );
            logToOutputChannel(
              '✅ Workspace load on startup completed (web)',
              'info',
            );
          } else {
            logToOutputChannel(
              '⚠️ Workspace load on startup skipped (web) (disabled or no client)',
              'debug',
            );
          }
        } catch (err) {
          logToOutputChannel(
            `⚠️ Workspace load on startup failed or skipped (web): ${String(
              err,
            )}`,
            'warning',
          );
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
    sendRequest: async (method: string, params?: any) => {
      try {
        logToOutputChannel(`Sending request: ${method}`, 'debug');
        const result = await languageClient.sendRequest(method, params);
        logToOutputChannel(`Successfully sent request: ${method}`, 'debug');
        return result;
      } catch (error) {
        logToOutputChannel(
          `Failed to send request ${method}: ${error}`,
          'error',
        );
        try {
          logToOutputChannel(
            `Request params: ${JSON.stringify(params, null, 2)}`,
            'error',
          );
        } catch (_jsonError) {
          logToOutputChannel('Failed to stringify request params', 'error');
        }
        throw error;
      }
    },
    sendNotification: (method: string, params?: any) => {
      try {
        logToOutputChannel(`Sending notification: ${method}`, 'debug');
        try {
          logToOutputChannel(
            `Notification params: ${JSON.stringify(params, null, 2)}`,
            'debug',
          );
        } catch (_error) {
          logToOutputChannel(
            'Notification params: [unable to serialize]',
            'debug',
          );
        }
        logToOutputChannel(`Sending notification: ${method}`, 'debug');

        // Ensure params are serializable before sending
        let cleanParams = params;
        if (params) {
          try {
            cleanParams = JSON.parse(JSON.stringify(params));
          } catch (error) {
            logToOutputChannel(
              `Failed to clean params for notification: ${error}`,
              'error',
            );
            cleanParams = {};
          }
        }

        languageClient.sendNotification(method, cleanParams);
        logToOutputChannel(
          `Successfully sent notification: ${method}`,
          'debug',
        );
      } catch (error) {
        logToOutputChannel(
          `Failed to send notification ${method}: ${error}`,
          'error',
        );
        try {
          logToOutputChannel(
            `Notification params: ${JSON.stringify(params, null, 2)}`,
            'error',
          );
        } catch (_jsonError) {
          logToOutputChannel(
            'Failed to stringify notification params',
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

  // Initialize ApexLib for standard library support
  try {
    const { createApexLibManager } = await import(
      '@salesforce/apex-lsp-compliant-services'
    );
    const { VSCodeLanguageClientAdapter, VSCodeEditorContextAdapter } =
      await import('./apexlib/vscode-adapters');

    // Create adapters
    const languageClientAdapter = new VSCodeLanguageClientAdapter(Client);
    const editorContextAdapter = new VSCodeEditorContextAdapter(context);

    // Create and initialize ApexLib manager
    const apexLibManager = createApexLibManager(
      languageClientAdapter,
      'apex', // languageId
      'apexlib', // customScheme for standard library URIs
      'cls', // fileExtension
    );

    // Register protocol handler with VS Code
    await apexLibManager.initialize(editorContextAdapter);
    logToOutputChannel(
      '✅ ApexLib protocol handler registered for standard library support',
      'info',
    );
  } catch (error) {
    logToOutputChannel(
      `⚠️ Failed to initialize ApexLib: ${error}. Standard library navigation may not work.`,
      'warning',
    );
  }

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

  // Register handler for server-to-client apex/provideStandardLibrary requests
  Client.onRequest('apex/provideStandardLibrary', async (params: any) => {
    logToOutputChannel(
      '📦 Received apex/provideStandardLibrary request from server',
      'info',
    );

    try {
      // Use utility function to get ZIP URI from virtual file system
      const zipUri = getStdApexClassesPathFromContext(context);

      // Read file using virtual file system API
      const zipBuffer = await vscode.workspace.fs.readFile(zipUri);

      // Convert to base64 for transmission
      const base64Data = Buffer.from(zipBuffer).toString('base64');

      logToOutputChannel(
        `✅ Standard library ZIP loaded: ${zipBuffer.length} bytes`,
        'info',
      );

      return {
        zipData: base64Data,
        size: zipBuffer.length,
      };
    } catch (error) {
      logToOutputChannel(
        `❌ Failed to provide standard library: ${error}`,
        'error',
      );
      throw error;
    }
  });

  // Register handler for server-to-client apex/loadWorkspace requests
  Client.onRequest('apex/loadWorkspace', async (params: any) => {
    logToOutputChannel(
      '📨 Received apex/loadWorkspace request from server',
      'debug',
    );

    try {
      const result = await Effect.runPromise(
        Effect.provide(
          handleLoadWorkspace(params, Client!),
          sharedWorkspaceLoadLayer,
        ),
      );
      logToOutputChannel(
        `✅ Load workspace acknowledged: ${JSON.stringify(result)}`,
        'debug',
      );
      return result;
    } catch (error) {
      logToOutputChannel(
        `❌ Failed to handle loadWorkspace request: ${error}`,
        'error',
      );
      return { error: `Failed to handle loadWorkspace request: ${error}` };
    }
  });

  // Initialize the language server
  logToOutputChannel('🔧 Creating initialization parameters...', 'debug');

  let initParams: InitializeParams;
  try {
    initParams = createInitializeParams(context, environment);
    logToOutputChannel(
      'Initialization parameters created successfully',
      'debug',
    );
  } catch (error) {
    logToOutputChannel(
      `Failed to create initialization parameters: ${error}`,
      'error',
    );
    throw error;
  }

  // Initialize params are already serializable (plain objects with primitive values)

  logToOutputChannel('🚀 Initializing web client...', 'info');
  try {
    await Client.initialize(initParams);
    logToOutputChannel('Web client initialized successfully', 'debug');
  } catch (error) {
    logToOutputChannel(`Failed to initialize web client: ${error}`, 'error');
    logToOutputChannel(
      `Init params: ${JSON.stringify(initParams, null, 2)}`,
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
  const serverConfig = await import('./server-config');
  const clientModule = await import('vscode-languageclient/lib/node/main');

  const { createServerOptions, createClientOptions } = serverConfig;
  const { LanguageClient } = clientModule;

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

  // Workspace state is now managed via Effect Context/Layer

  logToOutputChannel('🚀 Starting Node.js language client...', 'info');

  // Start the client and language server
  await nodeClient.start();

  // Store raw LanguageClient instance for extension API
  LanguageClientInstance = nodeClient;

  // Wrap in ClientInterface to match our global Client type
  logToOutputChannel('Setting global Client to desktop client', 'debug');
  Client = {
    languageClient: nodeClient,
    initialize: async (params: InitializeParams) => {
      // Node.js client handles initialization automatically during start()
      logToOutputChannel('📋 Node.js client initialization completed', 'debug');
      return { capabilities: {} }; // Return proper InitializeResult
    },
    sendNotification: (method: string, params?: any) => {
      try {
        logToOutputChannel(`Sending desktop notification: ${method}`, 'debug');
        nodeClient.sendNotification(method, params);
        logToOutputChannel(
          `Successfully sent desktop notification: ${method}`,
          'debug',
        );
      } catch (error) {
        logToOutputChannel(
          `Failed to send desktop notification ${method}: ${error}`,
          'error',
        );
        try {
          logToOutputChannel(
            `Desktop notification params: ${JSON.stringify(params, null, 2)}`,
            'error',
          );
        } catch (_jsonError) {
          logToOutputChannel(
            'Failed to stringify desktop notification params',
            'error',
          );
        }
        throw error;
      }
    },
    sendRequest: (method: string, params?: any) => {
      try {
        logToOutputChannel(`Sending desktop request: ${method}`, 'debug');
        const result = nodeClient.sendRequest(method, params);
        logToOutputChannel(
          `Successfully sent desktop request: ${method}`,
          'debug',
        );
        return result;
      } catch (error) {
        logToOutputChannel(
          `Failed to send desktop request ${method}: ${error}`,
          'error',
        );
        try {
          logToOutputChannel(
            `Desktop request params: ${JSON.stringify(params, null, 2)}`,
            'error',
          );
        } catch (_jsonError) {
          logToOutputChannel(
            'Failed to stringify desktop request params',
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

  // Initialize ApexLib for standard library support
  try {
    const { createApexLibManager } = await import(
      '@salesforce/apex-lsp-compliant-services'
    );
    const { VSCodeLanguageClientAdapter, VSCodeEditorContextAdapter } =
      await import('./apexlib/vscode-adapters');

    // Create adapters
    const languageClientAdapter = new VSCodeLanguageClientAdapter(Client);
    const editorContextAdapter = new VSCodeEditorContextAdapter(context);

    // Create and initialize ApexLib manager
    const apexLibManager = createApexLibManager(
      languageClientAdapter,
      'apex', // languageId
      'apexlib', // customScheme for standard library URIs
      'cls', // fileExtension
    );

    // Register protocol handler with VS Code
    await apexLibManager.initialize(editorContextAdapter);
    logToOutputChannel(
      '✅ ApexLib protocol handler registered for standard library support',
      'info',
    );
  } catch (error) {
    logToOutputChannel(
      `⚠️ Failed to initialize ApexLib: ${error}. Standard library navigation may not work.`,
      'warning',
    );
  }

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

  // Register handler for server-to-client apex/provideStandardLibrary requests
  Client.onRequest('apex/provideStandardLibrary', async (params: any) => {
    logToOutputChannel(
      '📦 Received apex/provideStandardLibrary request from server',
      'info',
    );

    try {
      // Use utility function to get ZIP URI from virtual file system
      const zipUri = getStdApexClassesPathFromContext(context);

      // Read file using virtual file system API
      const zipBuffer = await vscode.workspace.fs.readFile(zipUri);

      // Convert to base64 for transmission
      const base64Data = Buffer.from(zipBuffer).toString('base64');

      logToOutputChannel(
        `✅ Standard library ZIP loaded: ${zipBuffer.length} bytes`,
        'info',
      );

      return {
        zipData: base64Data,
        size: zipBuffer.length,
      };
    } catch (error) {
      logToOutputChannel(
        `❌ Failed to provide standard library: ${error}`,
        'error',
      );
      throw error;
    }
  });

  // Register handler for server-to-client apex/loadWorkspace requests
  Client.onRequest('apex/loadWorkspace', async (params: any) => {
    logToOutputChannel(
      '📨 Received apex/loadWorkspace request from server',
      'debug',
    );

    try {
      const result = await Effect.runPromise(
        Effect.provide(
          handleLoadWorkspace(params, Client!),
          sharedWorkspaceLoadLayer,
        ),
      );
      logToOutputChannel(
        `✅ Load workspace acknowledged: ${JSON.stringify(result)}`,
        'debug',
      );
      return result;
    } catch (error) {
      logToOutputChannel(
        `❌ Failed to handle loadWorkspace request: ${error}`,
        'error',
      );
      return { error: `Failed to handle loadWorkspace request: ${error}` };
    }
  });

  logToOutputChannel('✅ Node.js language client started successfully', 'info');

  // If configured, trigger workspace load on startup via service
  try {
    const settings = getWorkspaceSettings();
    logToOutputChannel(
      `Workspace load settings: ${JSON.stringify(settings?.apex?.loadWorkspace)}`,
      'debug',
    );
    if (settings?.apex?.loadWorkspace?.enabled && Client) {
      logToOutputChannel('🚀 Triggering workspace load on startup...', 'info');
      await Effect.runPromise(
        Effect.provide(startWorkspaceLoad(Client), sharedWorkspaceLoadLayer),
      );
      logToOutputChannel('✅ Workspace load on startup completed', 'info');
    } else {
      logToOutputChannel(
        '⚠️ Workspace load on startup skipped (disabled or no client)',
        'debug',
      );
    }
  } catch (err) {
    logToOutputChannel(
      `⚠️ Workspace load on startup failed or skipped: ${String(err)}`,
      'warning',
    );
  }
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
    logToOutputChannel(`Failed to restart language server: ${error}`, 'error');
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
      LanguageClientInstance = undefined;
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

/**
 * Gets the raw LanguageClient instance for extension API export
 */
export function getLanguageClient(): BaseLanguageClient | undefined {
  return LanguageClientInstance;
}
