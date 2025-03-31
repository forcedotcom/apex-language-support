/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as path from 'path';

import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient;

export function activate(context: vscode.ExtensionContext) {
  console.log('Apex Language Server extension is now active!');

  // Register command to restart the server
  const restartCommand = vscode.commands.registerCommand(
    'apex.restart.server',
    () => {
      if (client) {
        client.stop().then(() => {
          startLanguageServer(context);
        });
      }
    },
  );

  context.subscriptions.push(restartCommand);

  // Start the language server
  startLanguageServer(context);
}

function startLanguageServer(context: vscode.ExtensionContext) {
  // The server is implemented in Node
  const serverModule = context.asAbsolutePath(
    path.join(
      'node_modules',
      '@salesforce',
      'apex-language-server',
      'dist',
      'server.js',
    ),
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
        execArgv: ['--nolazy', '--inspect=6009'],
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
  };

  // Create and start the client
  client = new LanguageClient(
    'apexLanguageServer',
    'Apex Language Server',
    serverOptions,
    clientOptions,
  );

  // Start the client. This will also launch the server
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
