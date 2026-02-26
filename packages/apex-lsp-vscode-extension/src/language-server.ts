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
  RequestWorkspaceLoadParams,
} from '@salesforce/apex-lsp-shared';
import {
  getClientCapabilitiesForMode,
  getDocumentSelectorsFromSettings,
} from '@salesforce/apex-lsp-shared';
import type { InitializeParams } from 'vscode-languageserver-protocol';
import type { BaseLanguageClient } from 'vscode-languageclient';
import { Trace } from 'vscode-languageclient';
import { logToOutputChannel, getWorkerServerOutputChannel } from './logging';
import { setStartingFlag, resetServerStartRetries } from './commands';
import { handleFindMissingArtifact } from './missing-artifact-handler';
import {
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
  getTraceServerConfig,
} from './configuration';
import { EXTENSION_CONSTANTS } from './constants';
import {
  determineServerMode,
  getStdApexClassesPathFromContext,
  ServerMode,
} from './utils/serverUtils';
import {
  createTelemetrySink,
  type TelemetrySink,
  type TelemetryEvent,
} from './telemetrySink';

/**
 * Enriches telemetry events with client-side metadata (extension version,
 * VS Code version, workspace file counts) that the server cannot provide.
 */
async function enrichTelemetryEvent(
  event: TelemetryEvent,
  context: vscode.ExtensionContext,
): Promise<TelemetryEvent> {
  const enriched = { ...event };

  enriched.extensionVersion =
    (context.extension.packageJSON?.version as string) ?? '';
  enriched.vscodeVersion = vscode.version;

  if (event.type === 'startup_snapshot') {
    const [allFiles, apexFiles] = await Promise.all([
      vscode.workspace.findFiles('**/*', '**/node_modules/**'),
      vscode.workspace.findFiles('**/*.{cls,trigger}', '**/node_modules/**'),
    ]);
    enriched.workspaceFileCount = allFiles.length;
    enriched.apexFileCount = apexFiles.length;
  }

  return enriched;
}

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
 * Telemetry sink for dispatching LSP telemetry/event notifications
 */
let telemetrySink: TelemetrySink | undefined;

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
 * @param serverMode - The server mode (already determined to avoid duplicate logging)
 * @returns Enhanced initialization options
 */
const createEnhancedInitializationOptions = (
  context: vscode.ExtensionContext,
  runtimePlatform: RuntimePlatform,
  serverMode: ServerMode,
): ApexLanguageServerSettings => {
  const settings = getWorkspaceSettings();

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
 * @param serverMode - The server mode (already determined to avoid duplicate logging)
 * @returns LSP initialization parameters
 */
export const createInitializeParams = (
  context: vscode.ExtensionContext,
  environment: 'desktop' | 'web',
  serverMode: ServerMode,
): InitializeParams => {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  // Get mode-appropriate client capabilities
  const clientCapabilities = getClientCapabilitiesForMode(serverMode);

  // Log the server mode for debugging
  logToOutputChannel(
    `🔧 Server mode detected: ${serverMode} (context.extensionMode: ${context.extensionMode})`,
    'info',
  );

  const extensionVersion =
    (context.extension.packageJSON?.version as string) ?? '0.0.0';
  const baseParams = {
    processId: null, // Web environments don't have process IDs
    clientInfo: {
      name: 'Apex Language Server Extension',
      version: extensionVersion,
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
      serverMode,
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

    // Set up telemetry sink and register onTelemetry handler
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    telemetrySink = createTelemetrySink(workspaceRoot);
    if (LanguageClientInstance) {
      LanguageClientInstance.onTelemetry(async (event: unknown) => {
        try {
          if (telemetrySink) {
            const enriched = await enrichTelemetryEvent(
              event as TelemetryEvent,
              context,
            );
            telemetrySink.send(enriched);
          }
        } catch (error) {
          logToOutputChannel(
            `Failed to process telemetry event: ${error}`,
            'warning',
          );
        }
      });
    }

    context.subscriptions.push(
      vscode.env.onDidChangeTelemetryEnabled(() => {
        telemetrySink?.dispose();
        telemetrySink = createTelemetrySink(workspaceRoot);
      }),
    );

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
  // Determine server mode once to avoid duplicate logging
  const serverMode = determineServerMode(context);

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
  const initOptions = createEnhancedInitializationOptions(
    context,
    environment,
    serverMode,
  );
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
        // Use our consolidated worker/server output channel to prevent LanguageClient
        // from creating its own default output channel (which causes duplicate tabs)
        outputChannel: getWorkerServerOutputChannel() || undefined,
      },
      worker,
    );
    logToOutputChannel('Language Client created successfully', 'debug');

    // Wrap LanguageClient's sendRequest to intercept hover requests
    const originalSendRequest = languageClient.sendRequest.bind(languageClient);
    (languageClient as any).sendRequest = async (
      method: string,
      ...args: any[]
    ) => {
      const isHoverRequest = method === 'textDocument/hover';
      const requestStartTime = Date.now();

      if (isHoverRequest && args[0]) {
        const params = args[0];
        const uri = params.textDocument?.uri || 'unknown';
        const line = params.position?.line ?? '?';
        const character = params.position?.character ?? '?';
        logToOutputChannel(
          `🔍 [CLIENT] Hover request initiated: ${uri} at ${line}:${character} [time: ${requestStartTime}]`,
          'debug',
        );
      }

      try {
        const sendStartTime = Date.now();
        const result = await originalSendRequest(method, ...args);
        const sendTime = Date.now() - sendStartTime;
        const totalTime = Date.now() - requestStartTime;

        if (isHoverRequest) {
          const params = args[0];
          const uri = params?.textDocument?.uri || 'unknown';
          logToOutputChannel(
            `✅ [CLIENT] Hover request completed: ${uri} ` +
              `total=${totalTime}ms, send=${sendTime}ms, ` +
              `result=${result ? 'success' : 'null'}`,
            'debug',
          );
        }

        return result;
      } catch (error) {
        const totalTime = Date.now() - requestStartTime;

        if (isHoverRequest) {
          const params = args[0];
          const uri = params?.textDocument?.uri || 'unknown';
          logToOutputChannel(
            `❌ [CLIENT] Hover request failed after ${totalTime}ms: ${uri} - ${error}`,
            'error',
          );
        }

        throw error;
      }
    };

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

  // Server formats log messages with timestamps and log levels before sending
  // The built-in window/logMessage handler writes them to the outputChannel as-is
  // No custom notification handler needed

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

  // Note: Removed $/logMessage handler - all contexts now use standard window/logMessage

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

        // Set trace level based on configuration
        const traceConfig = getTraceServerConfig();
        const traceLevel =
          traceConfig === 'verbose'
            ? Trace.Verbose
            : traceConfig === 'messages'
              ? Trace.Messages
              : Trace.Off;
        await languageClient.setTrace(traceLevel);
        logToOutputChannel(`🔍 Trace level set to: ${traceConfig}`, 'debug');

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
      const isHoverRequest = method === 'textDocument/hover';
      const requestStartTime = Date.now();

      if (isHoverRequest && params) {
        const uri = params.textDocument?.uri || 'unknown';
        const line = params.position?.line ?? '?';
        const character = params.position?.character ?? '?';
        logToOutputChannel(
          `🔍 [CLIENT] Hover request initiated: ${uri} at ${line}:${character} [time: ${requestStartTime}]`,
          'debug',
        );
      } else {
        logToOutputChannel(`Sending request: ${method}`, 'debug');
      }

      try {
        const sendStartTime = Date.now();
        const result = await languageClient.sendRequest(method, params);
        const sendTime = Date.now() - sendStartTime;
        const totalTime = Date.now() - requestStartTime;

        if (isHoverRequest) {
          const uri = params?.textDocument?.uri || 'unknown';
          logToOutputChannel(
            `✅ [CLIENT] Hover request completed: ${uri} ` +
              `total=${totalTime}ms, send=${sendTime}ms, ` +
              `result=${result ? 'success' : 'null'}`,
            'debug',
          );
        } else {
          logToOutputChannel(`Successfully sent request: ${method}`, 'debug');
        }

        return result;
      } catch (error) {
        const totalTime = Date.now() - requestStartTime;

        if (isHoverRequest) {
          const uri = params?.textDocument?.uri || 'unknown';
          logToOutputChannel(
            `❌ [CLIENT] Hover request failed after ${totalTime}ms: ${uri} - ${error}`,
            'error',
          );
        } else {
          logToOutputChannel(
            `Failed to send request ${method}: ${error}`,
            'error',
          );
        }

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
        const isDidOpen = method === 'textDocument/didOpen';

        if (isDidOpen && params) {
          const uri = params.textDocument?.uri || 'unknown';
          const version = params.textDocument?.version ?? '?';
          const languageId = params.textDocument?.languageId || 'unknown';
          logToOutputChannel(
            `📤 [CLIENT] Sending textDocument/didOpen: ${uri} (version: ${version}, language: ${languageId})`,
            'debug',
          );
        } else {
          logToOutputChannel(`Sending notification: ${method}`, 'debug');
        }

        languageClient.sendNotification(method, params);

        if (isDidOpen) {
          const uri = params?.textDocument?.uri || 'unknown';
          logToOutputChannel(
            `✅ [CLIENT] Successfully sent textDocument/didOpen: ${uri}`,
            'debug',
          );
        } else {
          logToOutputChannel(
            `Successfully sent notification: ${method}`,
            'debug',
          );
        }
      } catch (error) {
        const uri = params?.textDocument?.uri || 'unknown';
        logToOutputChannel(
          `❌ [CLIENT] Failed to send textDocument/didOpen: ${uri} - ${error}`,
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
    onNotification: (
      method: string,
      handler: (params: any) => void,
    ): vscode.Disposable => {
      logToOutputChannel(
        `[Client] Registering notification handler for: ${method}`,
        'debug',
      );
      const disposable = languageClient.onNotification(
        method,
        (params: any) => {
          logToOutputChannel(
            `[Client] Notification received: ${method}`,
            'debug',
          );
          handler(params);
        },
      );
      return disposable;
    },
    isDisposed: () => !languageClient.isRunning(),
    dispose: () => languageClient.stop(),
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

  // Register handler for server-to-client apex/requestWorkspaceLoad notification
  Client.onNotification(
    'apex/requestWorkspaceLoad',
    async (params: RequestWorkspaceLoadParams) => {
      logToOutputChannel(
        '📨 Received apex/requestWorkspaceLoad notification from server',
        'debug',
      );

      try {
        await Effect.runPromise(
          Effect.provide(
            startWorkspaceLoad(Client!, params.workDoneToken),
            sharedWorkspaceLoadLayer,
          ),
        );
        logToOutputChannel(
          '✅ Workspace load initiated from server notification',
          'debug',
        );
      } catch (error) {
        logToOutputChannel(
          `❌ Failed to handle workspace load notification: ${error}`,
          'error',
        );
      }
    },
  );

  // Initialize the language server
  logToOutputChannel('🔧 Creating initialization parameters...', 'debug');

  let initParams: InitializeParams;
  try {
    initParams = createInitializeParams(context, environment, serverMode);
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
  // Determine server mode once to avoid duplicate logging
  const serverMode = determineServerMode(context);

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
  const serverOptions = createServerOptions(context, serverMode);
  const clientOptions = createClientOptions(
    createEnhancedInitializationOptions(context, environment, serverMode),
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

  // Wrap LanguageClient's sendRequest to intercept hover requests
  const originalSendRequest = nodeClient.sendRequest.bind(nodeClient);
  (nodeClient as any).sendRequest = async (method: string, ...args: any[]) => {
    const isHoverRequest = method === 'textDocument/hover';
    const requestStartTime = Date.now();

    if (isHoverRequest && args[0]) {
      const params = args[0];
      const uri = params.textDocument?.uri || 'unknown';
      const line = params.position?.line ?? '?';
      const character = params.position?.character ?? '?';
      logToOutputChannel(
        `🔍 [CLIENT] Hover request initiated: ${uri} at ${line}:${character} [time: ${requestStartTime}]`,
        'debug',
      );
    }

    try {
      const sendStartTime = Date.now();
      const result = await originalSendRequest(method, ...args);
      const sendTime = Date.now() - sendStartTime;
      const totalTime = Date.now() - requestStartTime;

      if (isHoverRequest) {
        const params = args[0];
        const uri = params?.textDocument?.uri || 'unknown';
        logToOutputChannel(
          `✅ [CLIENT] Hover request completed: ${uri} ` +
            `total=${totalTime}ms, send=${sendTime}ms, ` +
            `result=${result ? 'success' : 'null'}`,
          'debug',
        );
      }

      return result;
    } catch (error) {
      const totalTime = Date.now() - requestStartTime;

      if (isHoverRequest) {
        const params = args[0];
        const uri = params?.textDocument?.uri || 'unknown';
        logToOutputChannel(
          `❌ [CLIENT] Hover request failed after ${totalTime}ms: ${uri} - ${error}`,
          'error',
        );
      }

      throw error;
    }
  };

  // Start the client and language server
  await nodeClient.start();

  // Set trace level based on configuration
  const traceConfig = getTraceServerConfig();
  const traceLevel =
    traceConfig === 'verbose'
      ? Trace.Verbose
      : traceConfig === 'messages'
        ? Trace.Messages
        : Trace.Off;
  await nodeClient.setTrace(traceLevel);
  logToOutputChannel(`🔍 Trace level set to: ${traceConfig}`, 'debug');

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
        const isDidOpen = method === 'textDocument/didOpen';

        if (isDidOpen && params) {
          const uri = params.textDocument?.uri || 'unknown';
          const version = params.textDocument?.version ?? '?';
          const languageId = params.textDocument?.languageId || 'unknown';
          logToOutputChannel(
            `📤 [CLIENT] Sending textDocument/didOpen: ${uri} (version: ${version}, language: ${languageId})`,
            'debug',
          );
        } else {
          logToOutputChannel(
            `Sending desktop notification: ${method}`,
            'debug',
          );
        }

        nodeClient.sendNotification(method, params);

        if (isDidOpen) {
          const uri = params?.textDocument?.uri || 'unknown';
          logToOutputChannel(
            `✅ [CLIENT] Successfully sent textDocument/didOpen: ${uri}`,
            'debug',
          );
        } else {
          logToOutputChannel(
            `Successfully sent desktop notification: ${method}`,
            'debug',
          );
        }
      } catch (error) {
        const uri = params?.textDocument?.uri || 'unknown';
        logToOutputChannel(
          `❌ [CLIENT] Failed to send textDocument/didOpen: ${uri} - ${error}`,
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
    sendRequest: async (method: string, params?: any) => {
      const isHoverRequest = method === 'textDocument/hover';
      const requestStartTime = Date.now();

      if (isHoverRequest && params) {
        const uri = params.textDocument?.uri || 'unknown';
        const line = params.position?.line ?? '?';
        const character = params.position?.character ?? '?';
        logToOutputChannel(
          `🔍 [CLIENT] Hover request initiated: ${uri} at ${line}:${character} [time: ${requestStartTime}]`,
          'debug',
        );
      } else {
        logToOutputChannel(`Sending desktop request: ${method}`, 'debug');
      }

      try {
        const sendStartTime = Date.now();
        const result = await nodeClient.sendRequest(method, params);
        const sendTime = Date.now() - sendStartTime;
        const totalTime = Date.now() - requestStartTime;

        if (isHoverRequest) {
          const uri = params?.textDocument?.uri || 'unknown';
          logToOutputChannel(
            `✅ [CLIENT] Hover request completed: ${uri} ` +
              `total=${totalTime}ms, send=${sendTime}ms, ` +
              `result=${result ? 'success' : 'null'}`,
            'debug',
          );
        } else {
          logToOutputChannel(
            `Successfully sent desktop request: ${method}`,
            'debug',
          );
        }

        return result;
      } catch (error) {
        const totalTime = Date.now() - requestStartTime;

        if (isHoverRequest) {
          const uri = params?.textDocument?.uri || 'unknown';
          logToOutputChannel(
            `❌ [CLIENT] Hover request failed after ${totalTime}ms: ${uri} - ${error}`,
            'error',
          );
        } else {
          logToOutputChannel(
            `Failed to send desktop request ${method}: ${error}`,
            'error',
          );
        }

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
    onNotification: (method: string, handler: (...args: any[]) => void) => {
      logToOutputChannel(
        `[Client] Registering notification handler for: ${method}`,
        'debug',
      );
      const disposable = nodeClient.onNotification(method, (...args: any[]) => {
        logToOutputChannel(
          `[Client] Notification received: ${method}`,
          'debug',
        );
        handler(...args);
      });
      return disposable;
    },
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

  // Register handler for server-to-client apex/requestWorkspaceLoad notification
  Client.onNotification(
    'apex/requestWorkspaceLoad',
    async (params: RequestWorkspaceLoadParams) => {
      logToOutputChannel(
        '📨 Received apex/requestWorkspaceLoad notification from server',
        'debug',
      );

      try {
        await Effect.runPromise(
          Effect.provide(
            startWorkspaceLoad(Client!, params.workDoneToken),
            sharedWorkspaceLoadLayer,
          ),
        );
        logToOutputChannel(
          '✅ Workspace load initiated from server notification',
          'debug',
        );
      } catch (error) {
        logToOutputChannel(
          `❌ Failed to handle workspace load notification: ${error}`,
          'error',
        );
      }
    },
  );

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
      // Await stop so the server can send command_performance telemetry during shutdown.
      // The telemetry sink must remain active until after stop completes.
      const stopPromise = Client.dispose() as unknown as Promise<void>;
      if (stopPromise && typeof stopPromise.then === 'function') {
        await stopPromise;
      }
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

  // Allow in-flight telemetry (e.g. command_performance flush at shutdown) to arrive
  // before disposing the sink. 150ms is sufficient for a local IPC round-trip.
  const TELEMETRY_DRAIN_MS = 150;
  await new Promise((resolve) => setTimeout(resolve, TELEMETRY_DRAIN_MS));

  telemetrySink?.dispose();
  telemetrySink = undefined;
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
