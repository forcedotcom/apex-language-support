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
} from 'vscode-languageclient/node.js';

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
  }

  /**
   * Starts the language client
   *
   * @returns A disposable that will stop the client when disposed
   */
  start(): vscode.Disposable {
    const disposable = this.client.start();
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

// Export types from vscode-languageclient for convenience
export * from 'vscode-languageclient/node.js';
