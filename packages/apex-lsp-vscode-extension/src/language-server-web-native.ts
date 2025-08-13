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
import { registerConfigurationChangeListener } from './configuration';
import {
  updateApexServerStatusStarting,
  updateApexServerStatusReady,
  updateApexServerStatusError,
} from './status-bar';
import { getWorkspaceSettings } from './configuration';

/**
 * Web-native language client that communicates directly with a web worker
 * This bypasses the problematic vscode-languageclient/browser dependencies
 */
class WebNativeLanguageClient {
  private worker: any | undefined; // Use any to avoid Worker type issues during compilation
  private disposables: vscode.Disposable[] = [];
  private isRunning = false;

  constructor(private context: vscode.ExtensionContext) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      logToOutputChannel('Creating web worker for language server...', 'info');

      // Create the web worker
      const isDevelopment =
        this.context.extensionMode === vscode.ExtensionMode.Development;

      // For web environments, we need to construct the worker URL differently
      const serverWorkerPath = this.context.asAbsolutePath('server-worker.js');

      logToOutputChannel(`Web worker path (raw): ${serverWorkerPath}`, 'info');
      logToOutputChannel(
        `Extension URI: ${this.context.extensionUri.toString()}`,
        'info',
      );

      // Use the extension URI to create a proper web worker URL
      const workerUri = vscode.Uri.joinPath(
        this.context.extensionUri,
        'server-worker.js',
      );
      const finalWorkerPath = workerUri.toString();

      logToOutputChannel(`Final web worker URL: ${finalWorkerPath}`, 'info');

      // Use globalThis to access Worker constructor safely
      const WorkerConstructor = (globalThis as any).Worker;
      this.worker = new WorkerConstructor(finalWorkerPath);

      // Set up message handling
      this.worker.onmessage = this.handleWorkerMessage.bind(this);
      this.worker.onerror = this.handleWorkerError.bind(this);

      // Send initialization message to the worker first
      const serverMode = isDevelopment ? 'development' : 'production';
      this.worker.postMessage({
        type: 'initialize',
        data: {
          serverMode,
          logLevel: getWorkspaceSettings().apex.logLevel,
        },
      });

      // LSP initialize will be sent when we receive the 'ready' message from the worker

      // Register document change handlers
      this.registerDocumentHandlers();

      this.isRunning = true;
      logToOutputChannel(
        'Web-native language client started successfully',
        'info',
      );
    } catch (error) {
      logToOutputChannel(
        `Failed to start web-native language client: ${error}`,
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

      // Terminate worker
      if (this.worker) {
        this.worker.postMessage({ type: 'shutdown' });
        this.worker.terminate();
        this.worker = undefined;
      }

      this.isRunning = false;
      logToOutputChannel('Web-native language client stopped', 'info');
    } catch (error) {
      logToOutputChannel(
        `Error stopping web-native language client: ${error}`,
        'error',
      );
    }
  }

  private handleWorkerMessage(event: any): void {
    try {
      const message = event.data;

      // Log all messages for debugging
      logToOutputChannel(
        `[WEB WORKER] Received message: ${JSON.stringify(message, null, 2)}`,
        'debug',
      );

      // Handle LSP responses (JSON-RPC 2.0 format)
      if (message.jsonrpc === '2.0') {
        logToOutputChannel(
          `[WEB WORKER] LSP Response - method: ${message.method}, id: ${message.id}`,
          'info',
        );
        // LSP responses are handled by the promise-based request methods
        // No additional handling needed here
        return;
      }

      // Handle custom extension messages
      const { type, data } = message || {};

      switch (type) {
        case 'debug':
          logToOutputChannel(
            `[WEB WORKER] ${data?.message || 'No message'}`,
            'info',
          );
          break;
        case 'error':
          logToOutputChannel(
            `[WEB WORKER ERROR] ${data?.error || 'Unknown error'}`,
            'error',
          );
          updateApexServerStatusError();
          break;
        case 'ready':
          logToOutputChannel('[WEB WORKER] Language server is ready', 'info');
          updateApexServerStatusReady();
          resetServerStartRetries();
          setStartingFlag(false);

          // Send LSP initialize once the worker is ready
          setTimeout(() => {
            this.sendLSPInitialize();
          }, 100);
          break;
        default:
          logToOutputChannel(
            `[WEB WORKER] Unknown message type: ${type}`,
            'debug',
          );
          break;
      }
    } catch (error) {
      logToOutputChannel(
        `[WEB WORKER] Error handling message: ${error}`,
        'error',
      );
    }
  }

  private handleWorkerError(error: any): void {
    logToOutputChannel(`[WEB WORKER ERROR] ${error.message}`, 'error');
    updateApexServerStatusError();
    setStartingFlag(false);
  }

  /**
   * Send LSP initialize request to the language server
   */
  private async sendLSPInitialize(): Promise<void> {
    if (!this.worker || !this.isRunning) {
      return;
    }

    try {
      logToOutputChannel('Sending LSP initialize request', 'info');

      const initializeRequest = {
        jsonrpc: '2.0',
        id: 'initialize',
        method: 'initialize',
        params: {
          processId: null,
          clientInfo: {
            name: 'vscode',
            version: '1.0.0',
          },
          rootUri: null,
          capabilities: {
            textDocument: {
              documentSymbol: {
                dynamicRegistration: false,
                symbolKind: {
                  valueSet: [
                    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
                    18, 19, 20, 21, 22, 23, 24, 25, 26,
                  ],
                },
                hierarchicalDocumentSymbolSupport: true,
              },
            },
          },
          trace: 'verbose',
        },
      };

      // Send initialize request
      this.worker.postMessage(initializeRequest);

      // Wait a bit then send initialized notification
      setTimeout(() => {
        const initializedNotification = {
          jsonrpc: '2.0',
          method: 'initialized',
          params: {},
        };
        this.worker.postMessage(initializedNotification);
        logToOutputChannel('Sent LSP initialized notification', 'info');
      }, 500);
    } catch (error) {
      logToOutputChannel(`Error sending LSP initialize: ${error}`, 'error');
    }
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
    if (!this.worker || !this.isRunning) {
      return [];
    }

    try {
      logToOutputChannel(
        `Requesting document symbols for: ${document.uri.toString()}`,
        'info',
      );

      // For now, let's try a more direct approach by asking the worker to process the document
      const requestId = Math.random().toString(36).substring(2);
      const directRequest = {
        type: 'directDocumentSymbol',
        id: requestId,
        data: {
          uri: document.uri.toString(),
          content: document.getText(),
          languageId: document.languageId,
        },
      };

      // Create a promise to wait for the response
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          logToOutputChannel('Document symbols request timed out', 'error');
          reject(new Error('Document symbols request timed out'));
        }, 10000); // 10 second timeout

        // Set up one-time message listener for this request
        const responseHandler = (event: any) => {
          const message = event.data;
          if (
            message.type === 'directDocumentSymbolResponse' &&
            message.id === requestId
          ) {
            clearTimeout(timeout);
            this.worker.removeEventListener('message', responseHandler);

            if (message.error) {
              logToOutputChannel(
                `Document symbols request failed: ${message.error}`,
                'error',
              );
              resolve([]);
            } else {
              logToOutputChannel(
                `Received direct response with ${(message.symbols || []).length} symbols`,
                'info',
              );
              const symbols = this.convertLSPSymbolsToVSCodeSymbols(
                message.symbols || [],
              );
              resolve(symbols);
            }
          }
        };

        this.worker.addEventListener('message', responseHandler);
        this.worker.postMessage(directRequest);

        logToOutputChannel(
          `Sent direct document symbol request for: ${document.uri.toString()}`,
          'info',
        );
      });
    } catch (error) {
      logToOutputChannel(
        `Error requesting document symbols: ${error}`,
        'error',
      );
      return [];
    }
  }

  /**
   * Send textDocument/didOpen notification to the language server
   */
  private async sendDocumentDidOpen(
    document: vscode.TextDocument,
  ): Promise<void> {
    if (!this.worker || !this.isRunning) {
      return;
    }

    try {
      const didOpenNotification = {
        jsonrpc: '2.0',
        method: 'textDocument/didOpen',
        params: {
          textDocument: {
            uri: document.uri.toString(),
            languageId: document.languageId,
            version: document.version,
            text: document.getText(),
          },
        },
      };

      this.worker.postMessage(didOpenNotification);
      logToOutputChannel(
        `Sent textDocument/didOpen for: ${document.uri.toString()}`,
        'debug',
      );
    } catch (error) {
      logToOutputChannel(
        `Error sending textDocument/didOpen: ${error}`,
        'error',
      );
    }
  }

  /**
   * Converts LSP DocumentSymbol[] or SymbolInformation[] to VS Code DocumentSymbol[]
   */
  private convertLSPSymbolsToVSCodeSymbols(
    lspSymbols: any[],
  ): vscode.DocumentSymbol[] {
    if (!Array.isArray(lspSymbols)) {
      return [];
    }

    return lspSymbols.map((symbol) => {
      // Handle DocumentSymbol format (hierarchical)
      if (symbol.range && symbol.selectionRange) {
        const vscodeSymbol = new vscode.DocumentSymbol(
          symbol.name,
          symbol.detail || '',
          symbol.kind,
          new vscode.Range(
            symbol.range.start.line,
            symbol.range.start.character,
            symbol.range.end.line,
            symbol.range.end.character,
          ),
          new vscode.Range(
            symbol.selectionRange.start.line,
            symbol.selectionRange.start.character,
            symbol.selectionRange.end.line,
            symbol.selectionRange.end.character,
          ),
        );

        // Recursively convert children
        if (symbol.children && Array.isArray(symbol.children)) {
          vscodeSymbol.children = this.convertLSPSymbolsToVSCodeSymbols(
            symbol.children,
          );
        }

        return vscodeSymbol;
      }

      // Handle SymbolInformation format (flat) - convert to DocumentSymbol
      if (symbol.location && symbol.location.range) {
        const range = new vscode.Range(
          symbol.location.range.start.line,
          symbol.location.range.start.character,
          symbol.location.range.end.line,
          symbol.location.range.end.character,
        );

        return new vscode.DocumentSymbol(
          symbol.name,
          symbol.containerName || '',
          symbol.kind,
          range,
          range, // Use same range for selection range
        );
      }

      // Fallback for unexpected format
      logToOutputChannel(
        `Unexpected symbol format: ${JSON.stringify(symbol)}`,
        'error',
      );
      return new vscode.DocumentSymbol(
        symbol.name || 'Unknown',
        '',
        vscode.SymbolKind.Variable,
        new vscode.Range(0, 0, 0, 0),
        new vscode.Range(0, 0, 0, 0),
      );
    });
  }
}

let webNativeClient: WebNativeLanguageClient | undefined;

export const startWebLanguageServer = async (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> => {
  logToOutputChannel('=== startWebLanguageServer (Native) called ===', 'info');

  if (getStartingFlag()) {
    logToOutputChannel('Blocked duplicate web server start attempt', 'info');
    return;
  }

  try {
    setStartingFlag(true);
    updateApexServerStatusStarting();
    logToOutputChannel('Starting web-native language server...', 'info');

    // Clean up previous client if it exists
    if (webNativeClient) {
      logToOutputChannel('Stopping existing web-native client...', 'info');
      await webNativeClient.stop();
      webNativeClient = undefined;
    }

    // Create and start new client
    webNativeClient = new WebNativeLanguageClient(context);
    await webNativeClient.start();

    logToOutputChannel(
      'Web-native language server started successfully',
      'info',
    );
  } catch (error) {
    logToOutputChannel(
      `Error in startWebLanguageServer (Native): ${error}`,
      'error',
    );
    vscode.window.showErrorMessage(
      `Failed to start Apex Web Language Server: ${error}`,
    );
    setStartingFlag(false);
    updateApexServerStatusError();
  }
};

export const restartWebLanguageServer = async (
  context: vscode.ExtensionContext,
  restartHandler: (context: vscode.ExtensionContext) => Promise<void>,
): Promise<void> => {
  logToOutputChannel(
    `Restarting Web-Native Language Server at ${new Date().toISOString()}...`,
    'info',
  );
  await startWebLanguageServer(context, restartHandler);
};

export const stopWebLanguageServer = async (): Promise<void> => {
  if (webNativeClient) {
    await webNativeClient.stop();
    webNativeClient = undefined;
  }
};

export const getWebLanguageClient = (): WebNativeLanguageClient | undefined =>
  webNativeClient;
