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

/**
 * WebContainer language client that runs the language server in a WebContainer
 * This provides full Node.js API access while running in a web environment
 * and uses direct LSP communication without vscode-languageclient
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
      updateApexServerStatusStarting();

      // Import WebContainer API
      let WebContainer: any;
      try {
        const webcontainerModule = await import('@webcontainer/api');
        WebContainer = webcontainerModule.WebContainer;
      } catch (error) {
        logToOutputChannel(`WebContainer API not available: ${error}`, 'error');
        throw new Error('WebContainer API not available in this environment');
      }

      // Initialize WebContainer
      this.webcontainer = await WebContainer.boot();
      logToOutputChannel('WebContainer initialized successfully', 'info');

      // Set up global WebContainer instance for polyfills
      if (typeof globalThis !== 'undefined') {
        (globalThis as any).WebContainer = WebContainer;
        (globalThis as any).webcontainer = this.webcontainer;
      }

      // Set up the filesystem with our language server
      await this.setupLanguageServerFilesystem();

      // Start the language server process
      await this.startLanguageServerProcess();

      // Set up LSP communication and document providers
      await this.setupLSPCommunication();

      this.isRunning = true;
      logToOutputChannel(
        'WebContainer language client started successfully',
        'info',
      );
      updateApexServerStatusReady();
    } catch (error) {
      logToOutputChannel(
        `Failed to start WebContainer language client: ${error}`,
        'error',
      );
      updateApexServerStatusError();
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

      // Clean up WebContainer
      if (this.webcontainer) {
        this.webcontainer.teardown();
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
      },
      scripts: {
        start: 'node server.js',
      },
    };

    // Create the language server entry point
    const serverJs = `
import { startMinimalWebServer } from '@salesforce/apex-ls/web';

// Start the minimal web server
const connection = startMinimalWebServer();

// Handle process messages for LSP communication
process.on('message', async (message) => {
  try {
    // Process LSP message and send response
    if (message.method) {
      // Handle LSP request
      const result = await connection.handleRequest(message.method, message.params);
      process.send({ id: message.id, result });
    } else if (message.notification) {
      // Handle LSP notification
      await connection.handleNotification(message.notification, message.params);
    }
  } catch (error) {
    process.send({ id: message.id, error: { message: error.message } });
  }
});

// Send ready signal
process.send({ type: 'ready' });
`;

    // Write files to WebContainer filesystem
    await this.webcontainer.fs.writeFile(
      '/package.json',
      JSON.stringify(packageJson, null, 2),
    );
    await this.webcontainer.fs.writeFile('/server.js', serverJs);

    logToOutputChannel('Language server filesystem setup complete', 'info');
  }

  private async startLanguageServerProcess(): Promise<void> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized');
    }

    logToOutputChannel('Starting language server process...', 'info');

    // Install dependencies
    const installProcess = await this.webcontainer.spawn('npm', ['install']);
    await installProcess.exit;

    // Start the language server
    this.languageServerProcess = await this.webcontainer.spawn('npm', [
      'start',
    ]);

    // Wait for the server to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Language server startup timeout'));
      }, 30000);

      this.languageServerProcess.output.pipeTo(
        new WritableStream({
          write(chunk) {
            if (chunk.includes('Language server ready')) {
              clearTimeout(timeout);
              resolve();
            }
          },
        }),
      );
    });

    logToOutputChannel('Language server process started successfully', 'info');
  }

  private async setupLSPCommunication(): Promise<void> {
    if (!this.languageServerProcess) {
      throw new Error('Language server process not started');
    }

    logToOutputChannel('Setting up LSP communication...', 'info');

    // Register document symbol provider
    const documentSymbolProvider =
      vscode.languages.registerDocumentSymbolProvider(
        [
          { scheme: 'file', language: 'apex' },
          { scheme: 'untitled', language: 'apex' },
        ],
        {
          provideDocumentSymbols: async (
            document: vscode.TextDocument,
          ): Promise<vscode.DocumentSymbol[]> =>
            this.requestDocumentSymbols(document),
        },
      );
    this.disposables.push(documentSymbolProvider);

    // Register folding range provider
    const foldingRangeProvider = vscode.languages.registerFoldingRangeProvider(
      [
        { scheme: 'file', language: 'apex' },
        { scheme: 'untitled', language: 'apex' },
      ],
      {
        provideFoldingRanges: async (
          document: vscode.TextDocument,
        ): Promise<vscode.FoldingRange[]> =>
          this.requestFoldingRanges(document),
      },
    );
    this.disposables.push(foldingRangeProvider);

    // Set up document change handlers
    const documentChangeListener = vscode.workspace.onDidChangeTextDocument(
      async (event: vscode.TextDocumentChangeEvent) => {
        if (event.document.languageId === 'apex') {
          await this.sendDocumentDidChange(event);
        }
      },
    );
    this.disposables.push(documentChangeListener);

    logToOutputChannel('LSP communication setup complete', 'info');
  }

  private async requestDocumentSymbols(
    document: vscode.TextDocument,
  ): Promise<vscode.DocumentSymbol[]> {
    if (!this.languageServerProcess || !this.isRunning) {
      return [];
    }

    try {
      // Send LSP request to the language server
      const request = {
        jsonrpc: '2.0',
        id: Math.random().toString(36).substring(2),
        method: 'textDocument/documentSymbol',
        params: {
          textDocument: {
            uri: document.uri.toString(),
          },
        },
      };

      // Send request to language server via stdin
      const writer = this.languageServerProcess.input.getWriter();
      await writer.write(JSON.stringify(request) + '\n');
      writer.releaseLock();

      // For now, return basic symbols based on regex parsing
      // In a full implementation, you'd parse the response from the server
      return this.parseBasicSymbols(document);
    } catch (error) {
      logToOutputChannel(
        `Error requesting document symbols: ${error}`,
        'error',
      );
      return [];
    }
  }

  private async requestFoldingRanges(
    document: vscode.TextDocument,
  ): Promise<vscode.FoldingRange[]> {
    if (!this.languageServerProcess || !this.isRunning) {
      return [];
    }

    try {
      // Send LSP request to the language server
      const request = {
        jsonrpc: '2.0',
        id: Math.random().toString(36).substring(2),
        method: 'textDocument/foldingRange',
        params: {
          textDocument: {
            uri: document.uri.toString(),
          },
        },
      };

      // Send request to language server via stdin
      const writer = this.languageServerProcess.input.getWriter();
      await writer.write(JSON.stringify(request) + '\n');
      writer.releaseLock();

      // For now, return basic folding ranges based on brace counting
      return this.parseBasicFoldingRanges(document);
    } catch (error) {
      logToOutputChannel(`Error requesting folding ranges: ${error}`, 'error');
      return [];
    }
  }

  private async sendDocumentDidChange(
    event: vscode.TextDocumentChangeEvent,
  ): Promise<void> {
    if (!this.languageServerProcess || !this.isRunning) {
      return;
    }

    try {
      const notification = {
        jsonrpc: '2.0',
        method: 'textDocument/didChange',
        params: {
          textDocument: {
            uri: event.document.uri.toString(),
            version: event.document.version,
          },
          contentChanges: event.contentChanges.map((change) => ({
            text: change.text,
          })),
        },
      };

      const writer = this.languageServerProcess.input.getWriter();
      await writer.write(JSON.stringify(notification) + '\n');
      writer.releaseLock();
    } catch (error) {
      logToOutputChannel(`Error sending document change: ${error}`, 'error');
    }
  }

  private parseBasicSymbols(
    document: vscode.TextDocument,
  ): vscode.DocumentSymbol[] {
    const symbols: vscode.DocumentSymbol[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Look for class definitions
      if (line.match(/^(public\s+)?class\s+(\w+)/)) {
        const match = line.match(/^(public\s+)?class\s+(\w+)/);
        if (match) {
          symbols.push(
            new vscode.DocumentSymbol(
              match[2],
              'Class',
              vscode.SymbolKind.Class,
              new vscode.Range(i, 0, i, line.length),
              new vscode.Range(i, 0, i, line.length),
            ),
          );
        }
      }

      // Look for method definitions
      else if (
        line.match(
          /^(public|private|protected)?\s*(static\s+)?(\w+)\s+(\w+)\s*\(/,
        )
      ) {
        const match = line.match(
          /^(public|private|protected)?\s*(static\s+)?(\w+)\s+(\w+)\s*\(/,
        );
        if (match) {
          symbols.push(
            new vscode.DocumentSymbol(
              match[4],
              'Method',
              vscode.SymbolKind.Method,
              new vscode.Range(i, 0, i, line.length),
              new vscode.Range(i, 0, i, line.length),
            ),
          );
        }
      }

      // Look for property definitions
      else if (
        line.match(
          /^(public|private|protected)?\s*(static\s+)?(\w+)\s+(\w+)\s*;/,
        )
      ) {
        const match = line.match(
          /^(public|private|protected)?\s*(static\s+)?(\w+)\s+(\w+)\s*;/,
        );
        if (match) {
          symbols.push(
            new vscode.DocumentSymbol(
              match[4],
              'Property',
              vscode.SymbolKind.Property,
              new vscode.Range(i, 0, i, line.length),
              new vscode.Range(i, 0, i, line.length),
            ),
          );
        }
      }
    }

    return symbols;
  }

  private parseBasicFoldingRanges(
    document: vscode.TextDocument,
  ): vscode.FoldingRange[] {
    const ranges: vscode.FoldingRange[] = [];
    const text = document.getText();
    const lines = text.split('\n');

    let braceCount = 0;
    let startLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;

      if (openBraces > 0 && startLine === -1) {
        startLine = i;
      }

      braceCount += openBraces - closeBraces;

      if (braceCount === 0 && startLine !== -1 && i > startLine) {
        ranges.push(
          new vscode.FoldingRange(startLine, i, vscode.FoldingRangeKind.Region),
        );
        startLine = -1;
      }
    }

    return ranges;
  }

  isClientRunning(): boolean {
    return this.isRunning;
  }
}

// Global instance
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
    updateApexServerStatusError();
    vscode.window.showErrorMessage(
      `Failed to start Apex WebContainer Language Server: ${error}`,
    );
    setStartingFlag(false);
  }
};

export const restartWebContainerLanguageServer = async (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> => {
  logToOutputChannel(
    '=== restartWebContainerLanguageServer called ===',
    'info',
  );

  try {
    resetServerStartRetries();
    await stopWebContainerLanguageServer();
    await startWebContainerLanguageServer(context, restartHandler);
  } catch (error) {
    logToOutputChannel(
      `Error in restartWebContainerLanguageServer: ${error}`,
      'error',
    );
    throw error;
  }
};

export const stopWebContainerLanguageServer = async (): Promise<void> => {
  logToOutputChannel('=== stopWebContainerLanguageServer called ===', 'info');

  try {
    if (webContainerClient) {
      await webContainerClient.stop();
      webContainerClient = undefined;
    }
    setStartingFlag(false);
    logToOutputChannel('WebContainer language server stopped', 'info');
  } catch (error) {
    logToOutputChannel(
      `Error in stopWebContainerLanguageServer: ${error}`,
      'error',
    );
  }
};
