/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
  State,
  CloseAction,
  ErrorAction,
} from 'vscode-languageclient/node';
import { LogMessageType, shouldLog } from '@salesforce/apex-lsp-logging';

import { RequestResponseInspector } from './middleware/requestResponseInspector';

// The client instance
export let client: LanguageClient | undefined;
let outputChannel: vscode.OutputChannel;
let serverStartRetries = 0;
const MAX_RETRIES = 3;
let lastRestartTime = 0;
const COOLDOWN_PERIOD_MS = 30000; // 30 seconds cooldown between retry cycles
let isStarting = false; // Flag to prevent multiple start attempts at once
// Request/response inspector instance
let inspector: RequestResponseInspector | undefined;
let statusBarItem: vscode.StatusBarItem;

/**
 * Handle global context storage for restarting the server
 */
let globalContext: vscode.ExtensionContext;

export function activate(context: vscode.ExtensionContext) {
  // Store context for global access
  globalContext = context;

  // Create output channel
  outputChannel = vscode.window.createOutputChannel(
    'Apex Language Server (Typescript)',
  );
  context.subscriptions.push(outputChannel);

  logToOutputChannel(
    'Apex Language Server extension is now active!',
    LogMessageType.Info,
  );

  // Register command to restart the server
  registerRestartCommand(context);

  // Create and initialize status bar item
  statusBarItem = createStatusBarItem(context);

  serverStartRetries = 0;
  startLanguageServer(context);
}

/**
 * Creates and initializes the status bar item for the Apex Language Server
 */
function createStatusBarItem(
  context: vscode.ExtensionContext,
): vscode.StatusBarItem {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  statusBarItem.text = '$(sync~spin) Starting Apex Server';
  statusBarItem.tooltip = 'Apex Language Server is starting';
  statusBarItem.command = 'apex.restart.server';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  return statusBarItem;
}

/**
 * Registers the command to restart the Apex Language Server
 */
function registerRestartCommand(context: vscode.ExtensionContext): void {
  const restartCommand = vscode.commands.registerCommand(
    'apex.restart.server',
    async () => {
      // Only allow manual restart if we're not already starting and we're outside cooldown period
      const now = Date.now();
      if (!isStarting && now - lastRestartTime > COOLDOWN_PERIOD_MS) {
        lastRestartTime = now;
        serverStartRetries = 0; // Reset retry counter on manual restart
        if (client) {
          await restartLanguageServer(context);
        } else {
          await startLanguageServer(context);
        }
      } else {
        logToOutputChannel(
          'Restart blocked: Server is already starting or in cooldown period',
          LogMessageType.Info,
        );
        vscode.window.showInformationMessage(
          'Server restart was requested too soon after previous attempt. Please wait a moment before trying again.',
        );
      }
    },
  );

  context.subscriptions.push(restartCommand);
}

/**
 * Creates server options for the language server
 */
function createServerOptions(context: vscode.ExtensionContext): ServerOptions {
  // Check if we're running in development mode (from project) or production (installed)
  const isDevelopment =
    context.extensionMode === vscode.ExtensionMode.Development;

  // The server is bundled into 'server.js' within the VSIX.
  // In development mode, it's in the 'out' directory (compiled)
  // In production mode, it's in the extension root (bundled)
  const serverModule = isDevelopment
    ? context.asAbsolutePath('out/server.js')
    : context.asAbsolutePath('server.js');

  logToOutputChannel(
    `Server module path: ${serverModule}`,
    LogMessageType.Debug,
  );
  logToOutputChannel(
    `Running in ${isDevelopment ? 'development' : 'production'} mode`,
    LogMessageType.Debug,
  );

  return {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      ...(isDevelopment && {
        options: { execArgv: ['--nolazy', '--inspect=6009'] },
      }),
    },
  };
}

/**
 * Initializes the request/response inspector middleware
 */
function initializeInspector(context: vscode.ExtensionContext) {
  if (!inspector) {
    // Default to disabled unless specifically enabled in settings
    const inspectorEnabled = vscode.workspace
      .getConfiguration('apex')
      .get('inspector.enabled', false);
    inspector = new RequestResponseInspector(inspectorEnabled, outputChannel);

    // Register command to toggle inspector
    context.subscriptions.push(
      vscode.commands.registerCommand('apex.inspector.toggle', () => {
        if (inspector) {
          inspector.setEnabled(!inspector.isEnabled());
          logToOutputChannel(
            `Apex LSP Inspector ${inspector.isEnabled() ? 'enabled' : 'disabled'}`,
            LogMessageType.Info,
          );
        }
      }),
    );
  }
}

/**
 * Creates client options for the language server
 */
function createClientOptions(): LanguageClientOptions {
  return {
    documentSelector: [{ scheme: 'file', language: 'apex' }],
    synchronize: {
      fileEvents:
        vscode.workspace.createFileSystemWatcher('**/*.{cls,trigger}'),
      configurationSection: 'apex',
    },
    outputChannel: outputChannel,
    middleware: inspector || {},
    // Add error handling with proper retry logic
    errorHandler: {
      error: handleClientError,
      closed: () => handleClientClosed(),
    },
    // Include workspace settings in initialization options
    initializationOptions: {
      enableDocumentSymbols: true,
      ...getWorkspaceSettings(),
    },
    // Explicitly enable workspace configuration capabilities
    workspaceFolder: vscode.workspace.workspaceFolders?.[0],
  };
}

/**
 * Handles errors from the language client
 */
function handleClientError(
  error: Error,
  message: any,
  _count: number | undefined,
): { action: ErrorAction } {
  logToOutputChannel(
    `LSP Error: ${message?.toString() || 'Unknown error'}`,
    LogMessageType.Error,
  );
  if (error) {
    logToOutputChannel(`Error details: ${error}`, LogMessageType.Debug);
  }
  // Always continue on errors, we handle retries separately
  return { action: ErrorAction.Continue };
}

/**
 * Handles the client closed event
 */
function handleClientClosed(): {
  action: CloseAction;
} {
  logToOutputChannel(
    `Connection to server closed - ${new Date().toISOString()}`,
    LogMessageType.Info,
  );
  isStarting = false;

  if (statusBarItem) {
    statusBarItem.text = '$(error) Apex Server Stopped';
    statusBarItem.tooltip = 'Click to restart the Apex Language Server';
  }

  // Only attempt auto-restart if within retry limit and cooldown period
  const now = Date.now();
  if (serverStartRetries < MAX_RETRIES && now - lastRestartTime > 5000) {
    return handleAutoRestart();
  } else {
    if (serverStartRetries >= MAX_RETRIES) {
      handleMaxRetriesExceeded();
    }
    return { action: CloseAction.DoNotRestart }; // Don't restart
  }
}

/**
 * Handles auto-restart logic with exponential backoff
 */
function handleAutoRestart(): {
  action: CloseAction;
} {
  serverStartRetries++;
  lastRestartTime = Date.now();

  // Exponential backoff between retries
  const delay = Math.min(2000 * Math.pow(2, serverStartRetries - 1), 10000);
  logToOutputChannel(
    `Will retry server start (${serverStartRetries}/${MAX_RETRIES}) after ${delay}ms delay...`,
    LogMessageType.Info,
  );

  setTimeout(() => {
    // Use stored global context
    startLanguageServer(globalContext);
  }, delay);

  return { action: CloseAction.DoNotRestart }; // Don't restart immediately
}

/**
 * Handles the case when max retries are exceeded
 */
function handleMaxRetriesExceeded(): void {
  logToOutputChannel(
    `Max retries (${MAX_RETRIES}) exceeded. Auto-restart disabled.`,
    LogMessageType.Info,
  );
  vscode.window
    .showErrorMessage(
      'The Apex Language Server failed to start after multiple attempts. Click the status bar icon to try again.',
      'Restart Now',
    )
    .then((selection) => {
      if (selection === 'Restart Now') {
        serverStartRetries = 0;
        lastRestartTime = Date.now();
        // Use stored global context
        startLanguageServer(globalContext);
      }
    });
}

/**
 * Gets the current workspace settings for the Apex Language Server
 */
function getWorkspaceSettings(): object {
  const config = vscode.workspace.getConfiguration('apex');
  const logLevel = config.get<string>('ls.logLevel', 'error');

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
      ls: {
        logLevel,
      },
    },
  };
}

/**
 * Registers a listener for configuration changes and notifies the server
 */
function registerConfigurationChangeListener(): void {
  if (!client) {
    return;
  }

  // Listen for configuration changes
  const configListener = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('apex')) {
      logToOutputChannel(
        'Apex configuration changed, notifying server...',
        LogMessageType.Info,
      );

      // Get updated settings
      const settings = getWorkspaceSettings();

      // Notify the server of the configuration change
      client?.sendNotification('workspace/didChangeConfiguration', {
        settings,
      });

      logToOutputChannel(
        'Configuration update sent to server',
        LogMessageType.Info,
      );
    }
  });

  // Store the listener in the global context so it gets disposed properly
  if (globalContext) {
    globalContext.subscriptions.push(configListener);
  }
}

/**
 * Creates and starts the language client
 */
function createAndStartClient(
  serverOptions: ServerOptions,
  clientOptions: LanguageClientOptions,
): void {
  try {
    // Create the language client
    client = new LanguageClient(
      'apexLanguageServer',
      'Apex Language Server',
      serverOptions,
      clientOptions,
    );

    // Update status
    if (statusBarItem) {
      statusBarItem.text = '$(sync~spin) Starting Apex Server';
      statusBarItem.tooltip = 'Apex Language Server is starting';
    }

    // Track client state changes
    client.onDidChangeState((event) => {
      logToOutputChannel(
        `Client state changed: ${State[event.oldState]} -> ${State[event.newState]}`,
        LogMessageType.Debug,
      );

      if (statusBarItem) {
        if (event.newState === State.Running) {
          statusBarItem.text = '$(check) Apex Server Ready';
          statusBarItem.tooltip = 'Apex Language Server is running';
          // Reset retry counter on successful start
          serverStartRetries = 0;
          isStarting = false;

          // Register configuration change listener when client is ready
          registerConfigurationChangeListener();
        } else if (event.newState === State.Starting) {
          statusBarItem.text = '$(sync~spin) Starting Apex Server';
          statusBarItem.tooltip = 'Apex Language Server is starting';
        } else {
          statusBarItem.text = '$(warning) Apex Server Stopped';
          statusBarItem.tooltip = 'Click to restart the Apex Language Server';
          isStarting = false;
        }
      }
    });

    // Start the client
    logToOutputChannel(
      'Starting Apex Language Server client...',
      LogMessageType.Info,
    );
    client.start().catch((error) => {
      logToOutputChannel(
        `Failed to start client: ${error}`,
        LogMessageType.Error,
      );
      isStarting = false;
      if (statusBarItem) {
        statusBarItem.text = '$(error) Apex Server Error';
        statusBarItem.tooltip = 'Click to restart the Apex Language Server';
      }
    });
  } catch (e) {
    logToOutputChannel(`Error creating client: ${e}`, LogMessageType.Error);
    isStarting = false;
  }
}

/**
 * Starts the language server
 */
async function startLanguageServer(context: vscode.ExtensionContext) {
  // Guard against multiple simultaneous start attempts
  if (isStarting) {
    logToOutputChannel('Blocked duplicate start attempt', LogMessageType.Info);
    return;
  }

  try {
    isStarting = true;
    logToOutputChannel(
      `Starting language server (attempt ${serverStartRetries + 1})`,
      LogMessageType.Info,
    );

    // Clean up previous client if it exists
    if (client) {
      await client.stop();
      client = undefined;
    }

    // Set up server and client components
    const serverOptions = createServerOptions(context);
    initializeInspector(context);
    const clientOptions = createClientOptions();

    createAndStartClient(serverOptions, clientOptions);
  } catch (error) {
    logToOutputChannel(
      `Error in startLanguageServer: ${error}`,
      LogMessageType.Error,
    );
    vscode.window.showErrorMessage(
      `Failed to start Apex Language Server: ${error}`,
    );
    isStarting = false;

    if (statusBarItem) {
      statusBarItem.text = '$(error) Apex Server Error';
      statusBarItem.tooltip = 'Click to restart the Apex Language Server';
    }
  }
}

/**
 * Restarts the language server
 */
async function restartLanguageServer(context: vscode.ExtensionContext) {
  logToOutputChannel(
    `Restarting Apex Language Server at ${new Date().toISOString()}...`,
    LogMessageType.Info,
  );
  await startLanguageServer(context);
}

export async function deactivate(): Promise<void> {
  logToOutputChannel(
    'Deactivating Apex Language Server extension',
    LogMessageType.Info,
  );
  isStarting = false;
  if (client) {
    await client.stop();
  }
}

function logToOutputChannel(
  message: string,
  messageType: LogMessageType = LogMessageType.Info,
) {
  if (!shouldLog(messageType)) return;
  const timestamp = new Date().toISOString();
  const typeString = LogMessageType[messageType] || 'LOG';
  outputChannel.appendLine(`[${timestamp}] [${typeString}] ${message}`);
}
