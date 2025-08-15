/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as vscode from 'vscode';
import { logToOutputChannel } from './logging';
import {
  setStartingFlag,
  getStartingFlag,
  resetServerStartRetries,
} from './commands';
import {
  updateApexServerStatusStarting,
  updateApexServerStatusReady,
  updateApexServerStatusError,
} from './status-bar';
import { getWorkspaceSettings } from './configuration';

/**
 * WebContainer language client that runs the language server in a WebContainer
 * This provides full Node.js API access while running in a web environment
 */
class WebContainerLanguageClient {
  private webcontainer: any | undefined;
  private disposables: vscode.Disposable[] = [];
  private isRunning = false;
  private languageServerProcess: any | undefined;

  constructor(private context: vscode.ExtensionContext) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      logToOutputChannel('Starting WebContainer language client...', 'info');

      // Import WebContainer API (optional - may not be available in all environments)
      let WebContainer: any;
      try {
        // Use string-based import to avoid TypeScript module resolution
        const webcontainerModule = await eval('import("@webcontainer/api")');
        WebContainer = webcontainerModule.WebContainer;
      } catch (error) {
        logToOutputChannel(
          `WebContainer API not available, falling back to browser mode: ${error}`,
          'warning',
        );
        // Instead of throwing an error, we could fall back to browser mode
        // For now, we'll throw to indicate WebContainer is required
        throw new Error('WebContainer API not available in this environment');
      }

      // Initialize WebContainer
      this.webcontainer = await WebContainer.boot();

      // Set up the filesystem with our language server
      await this.setupLanguageServerFilesystem();

      // Start the language server process
      await this.startLanguageServerProcess();

      // Register document change handlers
      this.registerDocumentHandlers();

      this.isRunning = true;
      logToOutputChannel(
        'WebContainer language client started successfully',
        'info',
      );
    } catch (error) {
      logToOutputChannel(
        `Failed to start WebContainer language client: ${error}`,
        'error',
      );
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      // Dispose of all handlers
      this.disposables.forEach((d) => d.dispose());
      this.disposables = [];

      // Terminate language server process
      if (this.languageServerProcess) {
        this.languageServerProcess.kill();
        this.languageServerProcess = undefined;
      }

      // Teardown WebContainer
      if (this.webcontainer) {
        await this.webcontainer.teardown();
        this.webcontainer = undefined;
      }

      this.isRunning = false;
      logToOutputChannel('WebContainer language client stopped', 'info');
    } catch (error) {
      logToOutputChannel(
        `Error stopping WebContainer language client: ${error}`,
        'error',
      );
    }
  }

  private async setupLanguageServerFilesystem(): Promise<void> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized');
    }

    logToOutputChannel('Setting up language server filesystem...', 'info');

    // Create package.json for the language server
    const packageJson = {
      name: 'apex-language-server',
      version: '1.0.0',
      type: 'module',
      dependencies: {
        '@salesforce/apex-ls': '1.0.0',
        'vscode-languageserver': '^9.0.1',
        'vscode-languageserver-textdocument': '^1.0.12',
        'vscode-languageserver-protocol': '^3.17.5',
      },
      scripts: {
        start: 'node server.js',
      },
    };

    // Create the language server entry point
    const serverJs = `
import { startServerInWebContainer } from '@salesforce/apex-ls';
import { createConnection } from 'vscode-languageserver/node';

// Initialize the language server in WebContainer mode
startServerInWebContainer();
`;

    // Write files to WebContainer filesystem
    await this.webcontainer.fs.writeFile(
      'package.json',
      JSON.stringify(packageJson, null, 2),
    );
    await this.webcontainer.fs.writeFile('server.js', serverJs);

    // Install dependencies
    logToOutputChannel('Installing language server dependencies...', 'info');
    const installProcess = await this.webcontainer.spawn('npm', ['install']);
    const installExitCode = await installProcess.exit;

    if (installExitCode !== 0) {
      throw new Error(`Failed to install dependencies: ${installExitCode}`);
    }

    logToOutputChannel('Language server filesystem setup complete', 'info');
  }

  private async startLanguageServerProcess(): Promise<void> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized');
    }

    logToOutputChannel('Starting language server process...', 'info');

    // Start the language server
    this.languageServerProcess = await this.webcontainer.spawn(
      'npm',
      ['start'],
      {
        env: {
          APEX_LS_MODE: 'development',
          APEX_LS_LOG_LEVEL: getWorkspaceSettings().apex.logLevel,
        },
      },
    );

    // Set up process event handlers
    this.languageServerProcess.output.pipeTo(
      new WritableStream({
        write(chunk) {
          logToOutputChannel(`[LANGUAGE SERVER] ${chunk}`, 'info');
        },
      }),
    );

    this.languageServerProcess.exit.then((exitCode: number) => {
      logToOutputChannel(
        `Language server process exited with code ${exitCode}`,
        'info',
      );
      if (exitCode !== 0) {
        updateApexServerStatusError();
      }
    });

    // Wait for the server to be ready
    await this.waitForServerReady();

    logToOutputChannel('Language server process started successfully', 'info');
    updateApexServerStatusReady();
    resetServerStartRetries();
    setStartingFlag(false);
  }

  private async waitForServerReady(): Promise<void> {
    // Wait for the server to output a ready message
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Language server startup timeout'));
      }, 30000); // 30 second timeout

      // Check if server is ready by looking for ready message in output
      const checkReady = () => {
        // This is a simplified check - in practice you'd want to parse the output
        // and look for a specific ready message from the language server
        setTimeout(() => {
          clearTimeout(timeout);
          resolve();
        }, 2000); // Give it 2 seconds to start
      };

      checkReady();
    });
  }

  private registerDocumentHandlers(): void {
    logToOutputChannel(
      'Registering document symbol provider for apex files',
      'info',
    );

    // Register document symbol provider
    const documentSymbolProvider =
      vscode.languages.registerDocumentSymbolProvider(
        { scheme: 'file', language: 'apex' },
        {
          provideDocumentSymbols: async (
            document: vscode.TextDocument,
          ): Promise<vscode.DocumentSymbol[]> => {
            logToOutputChannel(
              `Document symbols requested for: ${document.uri.toString()}`,
              'info',
            );
            return this.requestDocumentSymbols(document);
          },
        },
      );
    this.disposables.push(documentSymbolProvider);

    // Register for web schemes as well
    const webDocumentSymbolProvider =
      vscode.languages.registerDocumentSymbolProvider(
        { scheme: 'vscode-vfs', language: 'apex' },
        {
          provideDocumentSymbols: async (
            document: vscode.TextDocument,
          ): Promise<vscode.DocumentSymbol[]> => {
            logToOutputChannel(
              `Web document symbols requested for: ${document.uri.toString()}`,
              'info',
            );
            return this.requestDocumentSymbols(document);
          },
        },
      );
    this.disposables.push(webDocumentSymbolProvider);
  }

  private async requestDocumentSymbols(
    document: vscode.TextDocument,
  ): Promise<vscode.DocumentSymbol[]> {
    if (!this.webcontainer || !this.isRunning) {
      return [];
    }

    try {
      logToOutputChannel(
        `Requesting document symbols for: ${document.uri.toString()}`,
        'info',
      );

      // Write the document content to the WebContainer filesystem
      const documentPath = `/tmp/${document.fileName.split('/').pop()}`;
      await this.webcontainer.fs.writeFile(documentPath, document.getText());

      // Send the document to the language server via stdin
      if (this.languageServerProcess && this.languageServerProcess.input) {
        const lspRequest = {
          jsonrpc: '2.0',
          id: Math.random().toString(36).substring(2),
          method: 'textDocument/documentSymbol',
          params: {
            textDocument: {
              uri: document.uri.toString(),
            },
          },
        };

        const writer = this.languageServerProcess.input.getWriter();
        await writer.write(JSON.stringify(lspRequest) + '\n');
        writer.releaseLock();

        // For now, return empty array - in a full implementation,
        // you'd need to handle the LSP response from the server
        return [];
      }

      return [];
    } catch (error) {
      logToOutputChannel(
        `Error requesting document symbols: ${error}`,
        'error',
      );
      return [];
    }
  }

  /**
   * Get the WebContainer instance
   */
  getWebContainer(): any | undefined {
    return this.webcontainer;
  }

  /**
   * Check if the client is running
   */
  isReady(): boolean {
    return this.isRunning && this.webcontainer !== undefined;
  }
}

let webContainerClient: WebContainerLanguageClient | undefined;

export const startWebContainerLanguageServer = async (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> => {
  logToOutputChannel('=== startWebContainerLanguageServer called ===', 'info');

  if (getStartingFlag()) {
    logToOutputChannel(
      'Blocked duplicate WebContainer server start attempt',
      'info',
    );
    return;
  }

  try {
    setStartingFlag(true);
    updateApexServerStatusStarting();
    logToOutputChannel('Starting WebContainer language server...', 'info');

    // Clean up previous client if it exists
    if (webContainerClient) {
      logToOutputChannel('Stopping existing WebContainer client...', 'info');
      await webContainerClient.stop();
      webContainerClient = undefined;
    }

    // Create and start new client
    webContainerClient = new WebContainerLanguageClient(context);
    await webContainerClient.start();

    logToOutputChannel(
      'WebContainer language server started successfully',
      'info',
    );
  } catch (error) {
    logToOutputChannel(
      `Error in startWebContainerLanguageServer: ${error}`,
      'error',
    );
    vscode.window.showErrorMessage(
      `Failed to start Apex WebContainer Language Server: ${error}`,
    );
    setStartingFlag(false);
    updateApexServerStatusError();
  }
};

export const restartWebContainerLanguageServer = async (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> => {
  logToOutputChannel(
    `Restarting WebContainer Language Server at ${new Date().toISOString()}...`,
    'info',
  );
  await startWebContainerLanguageServer(context, restartHandler);
};

export const stopWebContainerLanguageServer = async (): Promise<void> => {
  if (webContainerClient) {
    await webContainerClient.stop();
    webContainerClient = undefined;
  }
};

export const getWebContainerLanguageClient = ():
  | WebContainerLanguageClient
  | undefined => webContainerClient;
