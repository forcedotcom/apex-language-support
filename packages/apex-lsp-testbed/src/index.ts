/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import {
  BaseLanguageClient as LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind as VSCodeTransportKind, // Corrected import
  MessageTransports,
} from 'vscode-languageclient/node';

import { createJavaServerOptions } from './servers/jorje/javaServerLauncher.js';

// Export JSON-RPC client
export * from './client/ApexJsonRpcClient.js';

// Define enum since it's not directly exported
export enum TransportKind {
  stdio = 0,
  ipc = 1,
  pipe = 2,
  socket = 3,
}

/**
 * Enum representing the type of language server to use
 */
export enum ServerType {
  /**
   * Use a JavaScript/Node.js-based server
   */
  Node = 'node',

  /**
   * Use the Java-based Apex Language Server (apex-jorje-lsp.jar)
   */
  Java = 'java',
}

/**
 * Configuration options for the Apex Language Server VSCode client
 */
export interface ApexLspClientOptions {
  /**
   * Path to the Apex Language Server module (for Node-based server)
   * This should be a JavaScript file that starts the language server
   */
  serverModule?: string;

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

  /**
   * The type of server to use
   * @default ServerType.Node
   */
  serverType?: ServerType;
}

// Type guard for disposable objects
function isDisposable(obj: any): obj is vscode.Disposable {
  return obj && typeof obj.dispose === 'function';
}

/**
 * Main class for the Apex Language Server VSCode client
 */
export class ApexLspVscodeClient {
  private client!: LanguageClient; // Using the definite assignment assertion
  private extensionContext: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;

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
    };

    // Merge default client options with provided options
    const clientOptions: LanguageClientOptions = {
      ...defaultClientOptions,
      ...(options.clientOptions || {}),
    };

    // Initialize the client synchronously for constructor
    this.initializeClient(context, options, clientOptions);
  }

  /**
   * Initialize the language client based on the server type
   */
  private initializeClient(
    context: vscode.ExtensionContext,
    options: ApexLspClientOptions,
    clientOptions: LanguageClientOptions,
  ): void {
    try {
      // Determine the server type
      const serverType = options.serverType || ServerType.Node;

      // Configure server options based on the server type
      let serverOptions: ServerOptions;

      if (serverType === ServerType.Java) {
        // Create Java-based server options - this is a placeholder that will be properly set later
        this.outputChannel.appendLine(
          'Initializing Java-based Apex Language Server...',
        );

        // Using a function-based server options with type assertion to ensure it fits ServerOptions
        serverOptions = (async () => {
          // Get the workspace folders
          const workspaceFolders = vscode.workspace.workspaceFolders;
          const workspacePath =
            workspaceFolders && workspaceFolders.length > 0
              ? workspaceFolders[0].uri.fsPath
              : undefined;

          const execInfo = await createJavaServerOptions(
            {
              // Add any specific configuration for VS Code here
              javaHome: vscode.workspace
                .getConfiguration('java')
                .get<string>('home'),
              javaMemory: vscode.workspace
                .getConfiguration('salesforcedx-vscode-apex')
                .get<number>('java.memory', 4096),
              enableSemanticErrors: vscode.workspace
                .getConfiguration('salesforcedx-vscode-apex')
                .get<boolean>('enable-semantic-errors', false),
              enableCompletionStatistics: vscode.workspace
                .getConfiguration('salesforcedx-vscode-apex')
                .get<boolean>('completion-statistics', false),
              // Set the workspace path if available
              workspacePath: workspacePath,
            },
            context.asAbsolutePath('resources/apex-jorje-lsp.jar'),
          );
          // Return as a MessageTransports type to satisfy type requirements
          return {
            command: execInfo.command,
            args: execInfo.args || [],
            options: execInfo.options || {},
          } as unknown as MessageTransports;
        }) as unknown as ServerOptions;
      } else {
        // Create Node.js-based server options
        this.outputChannel.appendLine(
          'Initializing Node.js-based Apex Language Server...',
        );

        if (!options.serverModule) {
          throw new Error(
            'serverModule must be provided for Node-based server',
          );
        }

        // Define server debug options
        const debugOptions = options.debugOptions || [
          '--nolazy',
          '--inspect=6009',
        ];

        // Define server run options
        const runOptions = options.runOptions || [];

        serverOptions = {
          run: {
            module: options.serverModule,
            transport: VSCodeTransportKind.ipc,
            options: {
              execArgv: runOptions,
            },
          },
          debug: {
            module: options.serverModule,
            transport: VSCodeTransportKind.ipc,
            options: {
              execArgv: debugOptions,
            },
          },
        };
      }

      // Create the language client with explicit type assertion to avoid abstract class error
      this.client = new (LanguageClient as any)(
        options.extensionName,
        options.extensionName,
        serverOptions,
        clientOptions,
      );

      this.outputChannel.appendLine('Language client created successfully.');
    } catch (error) {
      this.outputChannel.appendLine(
        `Error initializing language client: ${error instanceof Error ? error.message : String(error)}`,
      );
      void vscode.window.showErrorMessage(
        `Failed to initialize Apex Language Server: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Starts the language client
   *
   * @returns A disposable that will stop the client when disposed
   */
  start(): vscode.Disposable {
    const result = this.client.start();

    // Create a proper disposable if the result isn't already one
    const disposable = isDisposable(result)
      ? result
      : {
          dispose: async () => {
            try {
              if (result instanceof Promise) {
                await result;
              }
            } catch (err) {
              console.error('Error disposing client:', err);
            }
          },
        };

    // Add to subscriptions to ensure proper cleanup
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
    if (this.client) {
      await this.client.stop();
    }
  }
}

// Export specific types from vscode-languageclient using 'export type'
export type {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
} from 'vscode-languageclient/node';
