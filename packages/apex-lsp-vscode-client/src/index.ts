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
} from 'vscode-languageclient/node';

// Define enum since it's not directly exported
export enum TransportKind {
  stdio = 0,
  ipc = 1,
  pipe = 2,
  socket = 3,
}

/**
 * Configuration options for the Apex Language Server VSCode client
 */
export interface ApexLspClientOptions {
  /**
   * Path to the Apex Language Server module
   * This should be a JavaScript file that starts the language server
   */
  serverModule: string;

  /**
   * The name of the extension (used for logging and error reporting)
   */
  extensionName: string;

  /**
   * Debug options for the server
   */
  debugOptions?: string[];

  /**
   * Run options for the server
   */
  runOptions?: string[];

  /**
   * Additional client options to pass to the language client
   */
  clientOptions?: Partial<LanguageClientOptions>;

  /**
   * Output channel to use for the language client
   */
  outputChannel?: vscode.OutputChannel;
}

/**
 * Main class for the Apex Language Server VSCode client
 */
export class ApexLspVscodeClient {
  private client: LanguageClient;
  private extensionContext: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private isInitialized: boolean = false;
  private isShuttingDown: boolean = false;

  /**
   * Creates a new Apex LSP VSCode client
   *
   * @param context The VSCode extension context
   * @param options The client options
   */
  constructor(context: vscode.ExtensionContext, options: ApexLspClientOptions) {
    this.extensionContext = context;
    this.outputChannel =
      options.outputChannel ||
      vscode.window.createOutputChannel(options.extensionName);

    // Define server debug options
    const debugOptions = options.debugOptions || ['--nolazy', '--inspect=6009'];

    // Define server run options
    const runOptions = options.runOptions || [];

    // Define server options
    const serverOptions: ServerOptions = {
      run: {
        module: options.serverModule,
        transport: TransportKind.ipc,
        options: {
          execArgv: runOptions,
        },
      },
      debug: {
        module: options.serverModule,
        transport: TransportKind.ipc,
        options: {
          execArgv: debugOptions,
        },
      },
    };

    // Default client options
    const defaultClientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: 'file', language: 'apex' },
        { scheme: 'file', language: 'apex-anon' },
      ],
      synchronize: {
        fileEvents: vscode.workspace.createFileSystemWatcher(
          '**/*.{cls,trigger,soql}',
        ),
      },
      outputChannel: this.outputChannel,
      initializationOptions: {
        // Configuration options to pass to the server during initialization
        workspaceSettings: this.getWorkspaceSettings(),
      },
    };

    // Merge default client options with provided options
    const clientOptions: LanguageClientOptions = {
      ...defaultClientOptions,
      ...(options.clientOptions || {}),
    };

    // Create the language client
    this.client = new LanguageClient(
      options.extensionName,
      options.extensionName,
      serverOptions,
      clientOptions,
    );

    // We'll register handlers after the client is started
  }

  /**
   * Register handlers for various LSP lifecycle events
   */
  private registerLifecycleHandlers(): void {
    // Register initialized notification handler
    this.client.onNotification('initialized', () => {
      this.handleInitialized();
    });

    // Register shutdown request handler
    this.client.onRequest('shutdown', async () => this.handleShutdown());

    // Register exit notification handler
    this.client.onNotification('exit', () => {
      this.handleExit();
    });
  }

  /**
   * Gets workspace settings to pass to the server during initialization
   */
  private getWorkspaceSettings(): object {
    const config = vscode.workspace.getConfiguration('apex');
    return {
      enableCompletions: config.get<boolean>('enableCompletions', true),
      enableDiagnostics: config.get<boolean>('enableDiagnostics', true),
      enableHover: config.get<boolean>('enableHover', true),
      enableFormatting: config.get<boolean>('enableFormatting', true),
      // Add any other settings needed by the server
    };
  }

  /**
   * Logs a message to the output channel
   */
  private logMessage(message: string): void {
    this.outputChannel.appendLine(`[Apex Language Server] ${message}`);
  }

  /**
   * Starts the language client
   *
   * @returns A disposable that will stop the client when disposed
   */
  start(): vscode.Disposable {
    this.logMessage('Starting Apex Language Server...');
    const clientDisposable = this.client.start();

    // Register handlers for LSP lifecycle events
    this.registerLifecycleHandlers();

    // Manually trigger initialize to log and set up
    this.handleInitialize().catch((err) => {
      this.logMessage(`Error during initialization: ${err.message}`);
    });

    // Create a proper Disposable that wraps the Promise returned by client.start()
    const disposable = {
      dispose: async () => {
        await clientDisposable;
        await this.stop();
      },
    };

    this.extensionContext.subscriptions.push(disposable);
    return disposable;
  }

  /**
   * Gets the underlying language client
   *
   * @returns The language client
   */
  getClient(): LanguageClient {
    return this.client;
  }

  /**
   * Stops the language client
   *
   * @returns A promise that resolves when the client has stopped
   */
  async stop(): Promise<void> {
    if (this.client && !this.isShuttingDown) {
      this.logMessage('Stopping Apex Language Server...');
      this.isShuttingDown = true;
      await this.client.stop();
    }
  }

  /**
   * Handles the initialize request from the client to the server
   *
   * @returns Promise resolving to the initialize result
   */
  async handleInitialize(): Promise<InitializeResult> {
    this.logMessage('Server initialized');

    // Server capabilities that will be returned in the InitializeResult
    return {
      capabilities: {
        textDocumentSync: 2, // Incremental
        completionProvider: {
          resolveProvider: true,
          triggerCharacters: ['.'],
        },
        hoverProvider: true,
        definitionProvider: true,
        documentSymbolProvider: true,
        workspaceSymbolProvider: true,
        referencesProvider: true,
        documentFormattingProvider: true,
        codeActionProvider: true,
        signatureHelpProvider: {
          triggerCharacters: ['(', ','],
        },
        executeCommandProvider: {
          commands: [
            'apex.execute.anonymous',
            'apex.execute.selection',
            'apex.show.documentation',
          ],
        },
      },
    };
  }

  /**
   * Handles the initialized notification from the client to the server
   */
  handleInitialized(): void {
    this.isInitialized = true;
    this.logMessage('Server ready to accept requests');

    // Register configuration change listener to notify server of changes
    const configListener = vscode.workspace.onDidChangeConfiguration(
      (event) => {
        if (event.affectsConfiguration('apex')) {
          // Notify server of configuration changes
          this.client.sendNotification('workspace/didChangeConfiguration', {
            settings: this.getWorkspaceSettings(),
          });
        }
      },
    );

    // Add the config listener to extension subscriptions
    this.extensionContext.subscriptions.push(configListener);
  }

  /**
   * Handles the shutdown request from the client to the server
   *
   * @returns Promise that resolves when shutdown is complete
   */
  async handleShutdown(): Promise<void> {
    this.isInitialized = false;
    this.isShuttingDown = true;
    this.logMessage('Server shutting down');

    // Clean up resources
    // This could include closing file watchers, releasing database connections, etc.

    return Promise.resolve();
  }

  /**
   * Handles the exit notification from the client to the server
   */
  handleExit(): void {
    this.logMessage('Server exiting');
    // The server should exit immediately after receiving this notification
    // No further requests or notifications should be processed
  }
}

// Export types from vscode-languageclient for convenience
export * from 'vscode-languageclient/node';
