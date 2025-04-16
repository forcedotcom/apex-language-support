/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';
import * as fs from 'fs';

import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
  State,
} from 'vscode-languageclient/node';

let client: LanguageClient;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Apex Language Server');
  outputChannel.appendLine('Apex Language Server extension is now active!');

  // Register command to restart the server
  const restartCommand = vscode.commands.registerCommand(
    'apex.restart.server',
    () => {
      if (client) {
        outputChannel.appendLine('Restarting Apex Language Server...');
        client.stop().then(() => {
          startLanguageServer(context);
        });
      }
    },
  );

  context.subscriptions.push(restartCommand);
  context.subscriptions.push(outputChannel);

  // Start the language server
  startLanguageServer(context);
}

function startLanguageServer(context: vscode.ExtensionContext) {
  try {
    // The server is implemented in Node
    // For local development in monorepo, use the local path to extension-apex-ls-ts
    const serverModule = context.asAbsolutePath(
      path.join('..', 'extension-apex-ls-ts', 'dist', 'index.js'),
    );

    // Check if server module exists
    if (!fs.existsSync(serverModule)) {
      outputChannel.appendLine(
        `ERROR: Server module not found at: ${serverModule}`,
      );
      vscode.window.showErrorMessage(
        `Apex Language Server module not found at: ${serverModule}`,
      );
      return;
    }

    outputChannel.appendLine(`Server module path: ${serverModule}`);

    // Determine if we should run in debug mode
    const isDebugMode = vscode.workspace
      .getConfiguration('apex')
      .get<boolean>('debug', false);
    const debugPort = vscode.workspace
      .getConfiguration('apex')
      .get<number>('debugPort', 6100 + Math.floor(Math.random() * 900));

    outputChannel.appendLine(
      `Debug mode: ${isDebugMode}, Debug port: ${debugPort}`,
    );

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
      run: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: { execArgv: [] },
      },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: {
          execArgv: isDebugMode ? ['--nolazy', `--inspect=${debugPort}`] : [],
        },
      },
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
      // Register for Apex documents
      documentSelector: [{ scheme: 'file', language: 'apex' }],
      synchronize: {
        // Notify the server about file changes to files contained in the workspace
        fileEvents:
          vscode.workspace.createFileSystemWatcher('**/*.{cls,trigger}'),
      },
      outputChannel: outputChannel,
      // Add error handling
      errorHandler: {
        error: (error, message, count) => {
          outputChannel.appendLine(`Error: ${error.toString()}`);
          outputChannel.appendLine(`Message: ${message}`);
          outputChannel.appendLine(`Count: ${count || 0}`);
          return { action: (count || 0) < 5 ? 2 : 1 }; // Continue if less than 5 errors, shutdown if more
        },
        closed: () => {
          outputChannel.appendLine('Connection to server closed');
          return { action: 1 }; // Always restart on close
        },
      },
    };

    // Create and start the client
    client = new LanguageClient(
      'apexLanguageServer',
      'Apex Language Server',
      serverOptions,
      clientOptions,
    );

    // Add client state change listener
    client.onDidChangeState((event) => {
      outputChannel.appendLine(
        `Client state changed: ${State[event.oldState]} -> ${State[event.newState]}`,
      );
    });

    // Start the client. This will also launch the server
    outputChannel.appendLine('Starting Apex Language Server client...');
    client.start();
  } catch (error) {
    outputChannel.appendLine(`Error starting language server: ${error}`);
    vscode.window.showErrorMessage(
      `Failed to start Apex Language Server: ${error}`,
    );
  }
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
