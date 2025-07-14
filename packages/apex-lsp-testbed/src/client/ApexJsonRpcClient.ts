/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import * as cp from 'child_process';
import { EventEmitter } from 'events';

import {
  createMessageConnection,
  MessageConnection,
  Logger as VscodeLogger,
  ResponseError,
} from 'vscode-jsonrpc';
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';

import { ServerType } from '../utils/serverUtils';

/**
 * Options for configuring the JSON-RPC client
 */
export interface JsonRpcClientOptions {
  /**
   * Path to Node executable
   */
  nodePath?: string;

  /**
   * Path to server script
   */
  serverPath: string;

  /**
   * Arguments to pass to Node
   */
  nodeArgs?: string[];

  /**
   * Arguments to pass to the server
   */
  serverArgs?: string[];

  /**
   * Environment variables to set
   */
  env?: NodeJS.ProcessEnv;

  /**
   * Timeout for requests in milliseconds (default: 10000)
   */
  requestTimeout?: number;

  /**
   * Initialization options to pass to the language server during initialization
   * These are passed as the 'initializeParams?: any;' field in the initialize request
   */
  initializeParams?: any;

  /**
   * The type of server to use (e.g., 'demo' or 'jorje')
   */
  serverType: ServerType;
}

/**
 * Logger interface for JSON-RPC client
 */
export interface Logger extends VscodeLogger {
  /**
   * Log an info message
   * @param message - Message to log
   */
  info(message: string, ...args: any[]): void;

  /**
   * Log an error message
   * @param message - Message to log
   */
  error(message: string, ...args: any[]): void;

  /**
   * Log a debug message
   * @param message - Message to log
   */
  debug(message: string, ...args: any[]): void;

  /**
   * Log a warning message
   * @param message - Message to log
   */
  warn(message: string, ...args: any[]): void;

  /**
   * Log a message
   * @param message - Message to log
   */
  log(message: string, ...args: any[]): void;
}

/**
 * Default logger that logs to console
 */
export class ConsoleLogger implements Logger {
  constructor(private prefix: string = 'ApexJsonRpcClient') {}

  /**
   * Log an info message
   * @param message - Message to log
   */
  info(message: string, ...args: any[]): void {
    console.log(`[${this.prefix}] INFO: ${message}`, ...args);
  }

  /**
   * Log an error message
   * @param message - Message to log
   */
  error(message: string, ...args: any[]): void {
    console.error(`[${this.prefix}] ERROR: ${message}`, ...args);
  }

  /**
   * Log a debug message
   * @param message - Message to log
   */
  debug(message: string, ...args: any[]): void {
    console.debug(`[${this.prefix}] DEBUG: ${message}`, ...args);
  }

  /**
   * Log a warning message
   * @param message - Message to log
   */
  warn(message: string, ...args: any[]): void {
    console.warn(`[${this.prefix}] WARN: ${message}`, ...args);
  }

  /**
   * Log a message
   * @param message - Message to log
   */
  log(message: string, ...args: any[]): void {
    console.log(`[${this.prefix}] LOG: ${message}`, ...args);
  }
}

/**
 * A lightweight client for communicating with the Apex Language Server
 * using JSON-RPC protocol
 */
export class ApexJsonRpcClient {
  private childProcess: cp.ChildProcess | null = null;
  private isInitialized: boolean = false;
  private options: JsonRpcClientOptions;
  private logger: Logger;
  private serverCapabilities: any = null;
  private eventEmitter = new EventEmitter();
  private serverType: ServerType;
  private connection: MessageConnection | null = null;

  /**
   * Create a new JSON-RPC client for Apex Language Server
   * @param options - Client configuration options
   * @param logger - Logger for client output
   */
  constructor(options: JsonRpcClientOptions, logger?: Logger) {
    this.options = {
      nodePath: 'node',
      nodeArgs: [],
      serverArgs: [],
      requestTimeout: 10_000,
      ...options,
    };
    this.serverType = options.serverType;
    this.logger = logger || new ConsoleLogger();
  }

  /**
   * Start the language server and establish connection
   * @returns Promise that resolves when server is initialized
   */
  public async start(): Promise<void> {
    if (this.connection) {
      return;
    }

    this.logger.info('Starting server process...');
    this.childProcess = this.startServerProcess();

    if (!this.childProcess.stdout || !this.childProcess.stdin) {
      throw new Error('Server process failed to start with proper pipes');
    }

    // Create message reader and writer
    const reader = new StreamMessageReader(this.childProcess.stdout);
    const writer = new StreamMessageWriter(this.childProcess.stdin);

    // Create the message connection
    this.connection = createMessageConnection(reader, writer, this.logger);

    // Set up notification handler
    this.connection.onNotification((method, params) => {
      this.eventEmitter.emit(`notification:${method}`, params);
    });

    // Listen for errors
    this.connection.onError((error) => {
      if (error instanceof ResponseError) {
        this.logger.error(
          `Connection error: ${error.message} (code: ${error.code})`,
        );
      } else if (Array.isArray(error) && error[0] instanceof Error) {
        this.logger.error(`Connection error: ${error[0].message}`);
      } else {
        this.logger.error('Connection error: Unknown error occurred');
      }
    });

    // Listen for close
    this.connection.onClose(() => {
      this.logger.info('Connection closed');
      this.cleanup();
    });

    // Start listening
    this.connection.listen();

    this.childProcess.stderr?.on('data', (data) => {
      this.logger.error(`Server stderr: ${data.toString()}`);
    });

    this.childProcess.on('exit', (code) => {
      this.logger.info(`Server process exited with code ${code}`);
      this.cleanup();
      this.eventEmitter.emit('exit', code);
    });

    this.childProcess.on('error', (error) => {
      this.logger.error(`Server process error: ${error.message}`);
      this.cleanup();
      this.eventEmitter.emit('error', error);
    });

    // Initialize the server
    await this.initialize();
    this.logger.info('Server started and initialized successfully');
  }

  private cleanup(): void {
    if (this.connection) {
      this.connection.dispose();
      this.connection = null;
    }

    if (this.childProcess) {
      if (!this.childProcess.killed) {
        this.childProcess.kill();
      }
      this.childProcess = null;
    }

    this.isInitialized = false;
    this.serverCapabilities = null;
  }

  /**
   * Stop the language server
   * @returns Promise that resolves when server is stopped
   */
  public async stop(): Promise<void> {
    try {
      if (this.connection && this.isInitialized) {
        await this.connection.sendRequest('shutdown', undefined);
        this.connection.sendNotification('exit', undefined);
      }
    } catch (error) {
      this.logger.error(`Error during shutdown: ${error}`);
    } finally {
      this.cleanup();
    }
  }

  /**
   * Register a listener for server notifications
   * @param method - Notification method to listen for
   * @param callback - Callback function
   * @returns Disposable to unregister the listener
   */
  public onNotification(
    method: string,
    callback: (params: unknown) => void,
  ): Disposable {
    this.eventEmitter.on(`notification:${method}`, callback);
    const disposable: any = {
      dispose: () => {
        this.eventEmitter.removeListener(`notification:${method}`, callback);
      },
    };
    if (typeof Symbol !== 'undefined' && Symbol.dispose) {
      disposable[Symbol.dispose] = disposable.dispose;
    }
    return disposable;
  }

  /**
   * Check if the server process is still alive
   * @returns True if the process is alive and not killed
   */
  private isProcessAlive(): boolean {
    return (
      this.childProcess !== null &&
      !this.childProcess.killed &&
      this.childProcess.exitCode === null
    );
  }

  /**
   * Send a request to the language server
   * @param method - Request method
   * @param params - Request parameters
   * @returns Promise that resolves with the response
   */
  public async sendRequest<T>(method: string, params: any): Promise<T> {
    if (!this.connection || !this.isInitialized || !this.isProcessAlive()) {
      throw new Error('Client not initialized or process exited');
    }
    this.logger.debug(`Sending request: ${method}`);
    try {
      return this.connection.sendRequest(method, params) as Promise<T>;
    } catch (error) {
      if (error instanceof Error && error.message.includes('EPIPE')) {
        this.logger.error(
          `Sending request failed: Process pipe broken (${method})`,
        );
        throw new Error(
          `Sending request failed: Process pipe broken (${method})`,
        );
      }
      throw error;
    }
  }

  /**
   * Send a notification to the language server
   * @param method - Notification method
   * @param params - Notification parameters
   */
  public sendNotification(method: string, params: any): void {
    if (!this.connection || !this.isInitialized || !this.isProcessAlive()) {
      throw new Error('Client not initialized or process exited');
    }
    this.logger.debug(`Sending notification: ${method}`);
    try {
      this.connection.sendNotification(method, params);
    } catch (error) {
      if (error instanceof Error && error.message.includes('EPIPE')) {
        this.logger.error(
          `Sending notification failed: Process pipe broken (${method})`,
        );
        throw new Error(
          `Sending notification failed: Process pipe broken (${method})`,
        );
      }
      throw error;
    }
  }

  /**
   * Get the server capabilities
   * @returns Server capabilities
   */
  public getServerCapabilities(): any {
    return this.serverCapabilities;
  }

  /**
   * Open a text document in the language server
   * @param uri - Document URI
   * @param text - Document content
   * @param languageId - Language identifier (default: 'apex')
   */
  public async openTextDocument(
    uri: string,
    text: string,
    languageId: string = 'apex',
  ): Promise<void> {
    try {
      this.sendNotification('textDocument/didOpen', {
        textDocument: {
          uri,
          languageId,
          version: 1,
          text,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to open text document: ${error}`);
      throw error;
    }
  }

  /**
   * Update a text document in the language server
   * @param uri - Document URI
   * @param text - New document content
   * @param version - Document version
   */
  public async updateTextDocument(
    uri: string,
    text: string,
    version: number,
  ): Promise<void> {
    try {
      this.sendNotification('textDocument/didChange', {
        textDocument: {
          uri,
          version,
        },
        contentChanges: [{ text }],
      });
    } catch (error) {
      this.logger.error(`Failed to update text document: ${error}`);
      throw error;
    }
  }

  /**
   * Close a text document in the language server
   * @param uri - Document URI
   */
  public async closeTextDocument(uri: string): Promise<void> {
    try {
      this.sendNotification('textDocument/didClose', {
        textDocument: { uri },
      });
    } catch (error) {
      this.logger.error(`Failed to close text document: ${error}`);
      throw error;
    }
  }

  /**
   * Request completion items at a position
   * @param uri - Document URI
   * @param line - Zero-based line position
   * @param character - Zero-based character position
   * @returns Promise that resolves with completion items
   */
  public async completion(
    uri: string,
    line: number,
    character: number,
  ): Promise<any> {
    return this.sendRequest('textDocument/completion', {
      textDocument: { uri },
      position: { line, character },
    });
  }

  /**
   * Request hover information at a position
   * @param uri - Document URI
   * @param line - Zero-based line position
   * @param character - Zero-based character position
   * @returns Promise that resolves with hover information
   */
  public async hover(
    uri: string,
    line: number,
    character: number,
  ): Promise<any> {
    return this.sendRequest('textDocument/hover', {
      textDocument: { uri },
      position: { line, character },
    });
  }

  /**
   * Request document symbols
   * @param uri - Document URI
   * @returns Promise that resolves with document symbols
   */
  public async documentSymbol(uri: string): Promise<any> {
    return this.sendRequest('textDocument/documentSymbol', {
      textDocument: { uri },
    });
  }

  /**
   * Request document formatting
   * @param uri - Document URI
   * @param options - Formatting options
   * @returns Promise that resolves with text edits
   */
  public async formatting(
    uri: string,
    options: any = { tabSize: 4, insertSpaces: true },
  ): Promise<any> {
    return this.sendRequest('textDocument/formatting', {
      textDocument: { uri },
      options,
    });
  }

  /**
   * Start the server process
   * @returns Child process
   * @private
   */
  private startServerProcess(): cp.ChildProcess {
    const {
      nodePath,
      serverPath,
      nodeArgs,
      serverArgs,
      env,
      initializeParams,
    } = this.options;

    this.logger.debug(
      `Starting server process: ${nodePath} ${nodeArgs?.join(' ') || ''} ${serverPath} ${serverArgs?.join(' ') || ''}`,
    );

    // Determine the cwd from workspace info if available
    const workspacePath = initializeParams?.rootPath || process.cwd();

    // Log the working directory being used
    this.logger.debug(`Using working directory: ${workspacePath}`);

    switch (this.serverType) {
      case 'demo':
        return cp.spawn(
          nodePath as string,
          [...(nodeArgs || []), serverPath, ...(serverArgs || [])],
          {
            env: { ...process.env, ...env },
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: workspacePath, // Set the current working directory
          },
        );
      case 'jorje':
        return cp.spawn(serverPath, serverArgs || [], {
          env: { ...process.env, ...env },
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: workspacePath, // Set the current working directory
        });
      case 'nodeServer':
        return cp.spawn(
          nodePath as string,
          [...(nodeArgs || []), serverPath, ...(serverArgs || [])],
          {
            env: { ...process.env, ...env },
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: workspacePath, // Set the current working directory
          },
        );
      case 'webServer':
        return cp.spawn(
          nodePath as string,
          [...(nodeArgs || []), serverPath, ...(serverArgs || [])],
          {
            env: { ...process.env, ...env },
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: workspacePath, // Set the current working directory
          },
        );
      case 'nodeServer':
        return cp.spawn(
          nodePath as string,
          [...(nodeArgs || []), serverPath, ...(serverArgs || [])],
          {
            env: { ...process.env, ...env },
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: workspacePath, // Set the current working directory
          },
        );
      default:
        throw new Error(`unknown serverType: ${this.serverType}`);
    }
  }

  /**
   * Initialize the language server
   * @private
   */
  private async initialize(): Promise<void> {
    if (!this.connection) {
      throw new Error('Client not established');
    }
    try {
      const initializeParams = {
        processId: process.pid,
        clientInfo: {
          name: 'Apex JSON-RPC Client',
          version: '1.0.0',
        },
        capabilities: {
          textDocument: {
            synchronization: {
              dynamicRegistration: true,
              willSave: true,
              willSaveWaitUntil: true,
              didSave: true,
            },
            completion: {
              dynamicRegistration: true,
              completionItem: {
                snippetSupport: true,
                commitCharactersSupport: true,
                documentationFormat: ['markdown', 'plaintext'],
                deprecatedSupport: true,
                preselectSupport: true,
              },
              contextSupport: true,
            },
            hover: {
              dynamicRegistration: true,
              contentFormat: ['markdown', 'plaintext'],
            },
            signatureHelp: {
              dynamicRegistration: true,
              signatureInformation: {
                documentationFormat: ['markdown', 'plaintext'],
              },
            },
            references: {
              dynamicRegistration: true,
            },
            documentHighlight: {
              dynamicRegistration: true,
            },
            documentSymbol: {
              dynamicRegistration: true,
              hierarchicalDocumentSymbolSupport: true,
            },
            formatting: {
              dynamicRegistration: true,
            },
            rangeFormatting: {
              dynamicRegistration: true,
            },
            definition: {
              dynamicRegistration: true,
            },
            typeDefinition: {
              dynamicRegistration: true,
            },
            implementation: {
              dynamicRegistration: true,
            },
            codeAction: {
              dynamicRegistration: true,
            },
            codeLens: {
              dynamicRegistration: true,
            },
            rename: {
              dynamicRegistration: true,
            },
          },
          workspace: {
            applyEdit: true,
            workspaceEdit: {
              documentChanges: true,
            },
            didChangeConfiguration: {
              dynamicRegistration: true,
            },
            didChangeWatchedFiles: {
              dynamicRegistration: true,
            },
            symbol: {
              dynamicRegistration: true,
            },
            executeCommand: {
              dynamicRegistration: true,
            },
          },
        },
        ...(this.options.initializeParams ? this.options.initializeParams : {}),
        rootUri:
          this.options.initializeParams?.rootUri || `file://${process.cwd()}`,
      };

      this.logger.debug('Initializing server...');
      this.logger.debug(
        'Initialize params: ' + JSON.stringify(initializeParams, null, 2),
      );
      const result = (await this.connection.sendRequest(
        'initialize',
        initializeParams,
      )) as { capabilities: any };
      this.serverCapabilities = result.capabilities;

      // Send initialized notification
      this.connection.sendNotification('initialized', {});

      this.isInitialized = true;
      this.logger.debug(
        'Server initialized with capabilities: ' +
          JSON.stringify(this.serverCapabilities, null, 2),
      );
    } catch (error) {
      this.logger.error(`Failed to initialize server: ${error}`);
      throw error;
    }
  }
}
