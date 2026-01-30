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

// Web worker options interface
interface WorkerOptions {
  name?: string;
  credentials?: string;
  type?: string;
}

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

  /**
   * Web worker options (used when serverType is 'nodeServer' in browser environment)
   */
  webWorkerOptions?: {
    /**
     * URL to the worker script
     */
    workerUrl?: string;

    /**
     * Worker options (name, credentials, etc.)
     */
    workerOptions?: WorkerOptions;
  };
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
 * Silent logger that discards all log messages
 * Useful for tests and non-verbose modes
 */
export class SilentLogger implements Logger {
  info(_message: string, ..._args: any[]): void {
    // Silent - no logging
  }

  error(_message: string, ..._args: any[]): void {
    // Silent - no logging
  }

  debug(_message: string, ..._args: any[]): void {
    // Silent - no logging
  }

  warn(_message: string, ..._args: any[]): void {
    // Silent - no logging
  }

  log(_message: string, ..._args: any[]): void {
    // Silent - no logging
  }
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
  private webWorker: any = null; // Will be Worker from web-worker package
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

    // Check if we should use web worker
    if (
      this.serverType === 'webWorker' ||
      (this.serverType === 'nodeServer' && this.options.webWorkerOptions)
    ) {
      await this.startWebWorker();
    } else {
      await this.startChildProcess();
    }
  }

  /**
   * Start the server using a web worker
   * @private
   */
  private async startWebWorker(): Promise<void> {
    this.logger.info('Starting server in web worker...');

    try {
      // Dynamically import web-worker package
      const { default: Worker } = await import('web-worker');

      // Create the web worker
      const workerUrl =
        this.options.webWorkerOptions?.workerUrl || this.options.serverPath;
      const workerOptions = this.options.webWorkerOptions?.workerOptions || {};

      this.webWorker = new Worker(workerUrl, workerOptions);

      // Set up worker event handlers
      this.webWorker.onerror = (error: any) => {
        this.logger.error(`Web worker error: ${error.message}`);
        this.cleanup();
        this.eventEmitter.emit('error', error);
      };

      this.webWorker.onmessage = (event: any) => {
        // Handle messages from the worker
        this.logger.debug(
          `Received message from worker: ${JSON.stringify(event.data)}`,
        );
      };

      // Create message reader and writer for web worker
      const reader = this.createWebWorkerMessageReader();
      const writer = this.createWebWorkerMessageWriter();

      // Create the message connection
      this.connection = createMessageConnection(reader, writer, this.logger);

      // Set up connection handlers
      this.setupConnectionHandlers();

      // Start listening
      this.connection.listen();

      // Initialize the server
      await this.initializeWithRetry();
      this.logger.debug(
        'Web worker server started and initialized successfully',
      );
    } catch (error) {
      this.logger.error(`Failed to start web worker: ${error}`);
      throw error;
    }
  }

  /**
   * Start the server using a child process
   * @private
   */
  private async startChildProcess(): Promise<void> {
    this.logger.debug('Starting server process...');
    this.childProcess = this.startServerProcess();

    if (!this.childProcess.stdout || !this.childProcess.stdin) {
      throw new Error('Server process failed to start with proper pipes');
    }

    // Store references to stdout/stdin before they can become null via cleanup()
    const stdout = this.childProcess.stdout;
    const stdin = this.childProcess.stdin;

    // Capture stderr early to see any startup errors
    let stderrBuffer = '';
    this.childProcess.stderr?.on('data', (data) => {
      stderrBuffer += data.toString();
      this.logger.error(`Server stderr: ${data.toString()}`);
    });

    // Set up process error handling first
    this.childProcess.on('error', (error) => {
      this.logger.error(`Server process error: ${error.message}`);
      if (stderrBuffer) {
        this.logger.error(`Server stderr output before error: ${stderrBuffer}`);
      }
      this.cleanup();
      this.eventEmitter.emit('error', error);
    });

    this.childProcess.on('exit', (code, signal) => {
      if (code !== null && code !== 0) {
        this.logger.error(
          `Server process exited with code ${code}, signal ${signal}`,
        );
        if (stderrBuffer) {
          this.logger.error(`Server stderr output: ${stderrBuffer}`);
        }
      } else {
        this.logger.debug(
          `Server process exited with code ${code}, signal ${signal}`,
        );
        if (stderrBuffer && code === 0) {
          // Exit code 0 but had stderr - might indicate an issue
          this.logger.warn(
            `Server exited with code 0 but had stderr: ${stderrBuffer}`,
          );
        }
      }
      this.cleanup();
      this.eventEmitter.emit('exit', code);
    });

    // Wait for process to be ready
    await this.waitForProcessReady();

    // Verify process is still alive before proceeding
    if (!this.isProcessAlive() || !stdout || !stdin) {
      throw new Error(
        'Server process exited before message connection could be established',
      );
    }

    // Create message reader and writer using stored references
    const reader = new StreamMessageReader(stdout);
    const writer = new StreamMessageWriter(stdin);

    // Create the message connection
    this.connection = createMessageConnection(reader, writer, this.logger);

    // Set up connection handlers
    this.setupConnectionHandlers();

    // Start listening
    this.connection.listen();

    this.childProcess.stderr?.on('data', (data) => {
      this.logger.error(`Server stderr: ${data.toString()}`);
    });

    // Initialize the server with retry logic
    await this.initializeWithRetry();
    this.logger.debug('Server started and initialized successfully');
  }

  /**
   * Set up connection event handlers
   * @private
   */
  private setupConnectionHandlers(): void {
    // Set up notification handler
    this.connection!.onNotification((method, params) => {
      this.eventEmitter.emit(`notification:${method}`, params);
    });

    // Listen for errors
    this.connection!.onError((error) => {
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
    this.connection!.onClose(() => {
      this.logger.debug('Connection closed');
      this.cleanup();
    });
  }

  /**
   * Create a message reader for web worker communication
   * @private
   */
  private createWebWorkerMessageReader() {
    const eventEmitter = new EventEmitter();
    let isDisposed = false;

    // Set up message listener on the web worker
    this.webWorker.onmessage = (event: any) => {
      if (isDisposed) return;

      try {
        const message = JSON.parse(event.data);
        eventEmitter.emit('data', JSON.stringify(message) + '\n');
      } catch (error) {
        this.logger.error(`Failed to parse worker message: ${error}`);
        eventEmitter.emit('error', error);
      }
    };

    return {
      listen: (callback: (data: any) => void) => {
        if (isDisposed) return { dispose: () => {} };
        eventEmitter.on('data', callback);
        return {
          dispose: () => eventEmitter.removeListener('data', callback),
        };
      },
      onError: (callback: (error: any) => void) => {
        if (isDisposed) return { dispose: () => {} };
        eventEmitter.on('error', callback);
        return {
          dispose: () => eventEmitter.removeListener('error', callback),
        };
      },
      onClose: (callback: () => void) => {
        if (isDisposed) return { dispose: () => {} };
        eventEmitter.on('close', callback);
        return {
          dispose: () => eventEmitter.removeListener('close', callback),
        };
      },
      onPartialMessage: (callback: (message: any) => void) => {
        if (isDisposed) return { dispose: () => {} };
        eventEmitter.on('partialMessage', callback);
        return {
          dispose: () =>
            eventEmitter.removeListener('partialMessage', callback),
        };
      },
      dispose: () => {
        isDisposed = true;
        eventEmitter.removeAllListeners();
      },
    };
  }

  /**
   * Create a message writer for web worker communication
   * @private
   */
  private createWebWorkerMessageWriter() {
    let isDisposed = false;
    const eventEmitter = new EventEmitter();

    return {
      write: async (data: any) => {
        if (isDisposed) return;

        try {
          this.webWorker.postMessage(data);
        } catch (error) {
          this.logger.error(`Failed to send message to worker: ${error}`);
          eventEmitter.emit('error', error);
          throw error;
        }
      },
      onError: (callback: (error: any) => void) => {
        if (isDisposed) return { dispose: () => {} };
        eventEmitter.on('error', callback);
        return {
          dispose: () => eventEmitter.removeListener('error', callback),
        };
      },
      onClose: (callback: () => void) => {
        if (isDisposed) return { dispose: () => {} };
        eventEmitter.on('close', callback);
        return {
          dispose: () => eventEmitter.removeListener('close', callback),
        };
      },
      end: () => {
        if (isDisposed) return;
        eventEmitter.emit('close');
      },
      dispose: () => {
        isDisposed = true;
        eventEmitter.removeAllListeners();
      },
    };
  }

  /**
   * Wait for the server process to be ready to accept connections
   * @private
   */
  private async waitForProcessReady(): Promise<void> {
    const maxWaitTime = 30000; // 30 seconds
    const checkInterval = 100; // 100ms
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      // Check if process is still alive
      if (!this.isProcessAlive()) {
        throw new Error('Server process died during startup');
      }

      // Check if we have valid stdout/stdin
      if (this.childProcess?.stdout && this.childProcess?.stdin) {
        // Give a small delay to ensure pipes are established
        await new Promise((resolve) => setTimeout(resolve, 500));
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    throw new Error('Server process failed to become ready within timeout');
  }

  /**
   * Initialize the server with retry logic
   * @private
   */
  private async initializeWithRetry(): Promise<void> {
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.initialize();
        return; // Success
      } catch (error) {
        this.logger.error(
          `Initialization attempt ${attempt}/${maxRetries} failed: ${error}`,
        );

        if (attempt === maxRetries) {
          throw error;
        }

        // Check if process is still alive before retrying
        if (!this.isProcessAlive()) {
          throw new Error('Server process died during initialization');
        }

        // Wait before retrying
        this.logger.info(`Retrying initialization in ${retryDelay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
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

    if (this.webWorker) {
      this.webWorker.terminate();
      this.webWorker = null;
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
    if (this.webWorker) {
      // For web workers, we assume they're alive if they exist
      // Web workers don't have a direct "alive" check like processes
      return this.webWorker !== null;
    }

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
    this.validateConnectionState(method);
    this.logger.debug(`Sending request: ${method}`);

    try {
      return this.connection!.sendRequest(method, params) as Promise<T>;
    } catch (error) {
      this.handleSendError(error, method, 'request');
      throw error;
    }
  }

  /**
   * Send a notification to the language server
   * @param method - Notification method
   * @param params - Notification parameters
   */
  public sendNotification(method: string, params: any): void {
    this.validateConnectionState(method);
    this.logger.debug(`Sending notification: ${method}`);

    try {
      this.connection!.sendNotification(method, params);
    } catch (error) {
      this.handleSendError(error, method, 'notification');
      throw error;
    }
  }

  /**
   * Validate that the connection is in a valid state for sending messages
   * @private
   */
  private validateConnectionState(method: string): void {
    if (!this.connection) {
      throw new Error(`Cannot send ${method}: No connection established`);
    }

    if (!this.isInitialized) {
      throw new Error(`Cannot send ${method}: Server not initialized`);
    }

    if (!this.isProcessAlive()) {
      throw new Error(`Cannot send ${method}: Server process is not running`);
    }
  }

  /**
   * Handle errors that occur during send operations
   * @private
   */
  private handleSendError(
    error: any,
    method: string,
    operationType: 'request' | 'notification',
  ): void {
    if (error instanceof Error) {
      if (error.message.includes('EPIPE')) {
        this.logger.error(
          `Sending ${operationType} failed: Process pipe broken (${method})`,
        );
        // Mark as not initialized since pipe is broken
        this.isInitialized = false;
        throw new Error(
          `Sending ${operationType} failed: Process pipe broken (${method})`,
        );
      } else if (error.message.includes('ECONNRESET')) {
        this.logger.error(
          `Sending ${operationType} failed: Connection reset (${method})`,
        );
        this.isInitialized = false;
        throw new Error(
          `Sending ${operationType} failed: Connection reset (${method})`,
        );
      }
    }

    this.logger.error(`Sending ${operationType} failed: ${error}`);
    throw error;
  }

  /**
   * Get the server capabilities
   * @returns Server capabilities
   */
  public getServerCapabilities(): any {
    return this.serverCapabilities;
  }

  /**
   * Check if the server is healthy and responding
   * @returns Promise that resolves to true if server is healthy
   */
  public async isHealthy(): Promise<boolean> {
    if (!this.connection || !this.isInitialized || !this.isProcessAlive()) {
      return false;
    }
    try {
      // Use $/ping for nodeServer and webServer, capabilities check for others
      if (this.serverType === 'nodeServer' || this.serverType === 'webServer') {
        // Send $/ping request to check if server is responsive
        await this.ping();
        return true;
      } else {
        // For demo and jorje servers, check that we have capabilities
        const capabilities = this.getServerCapabilities();
        return !!capabilities;
      }
    } catch (error) {
      this.logger.debug(`Health check failed: ${error}`);
      return false;
    }
  }

  /**
   * Wait for the server to be healthy and responsive
   * @param timeout - Maximum time to wait in milliseconds (default: 30000)
   * @returns Promise that resolves when server is healthy
   */
  public async waitForHealthy(timeout: number = 30000): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 1000; // 1 second

    while (Date.now() - startTime < timeout) {
      if (await this.isHealthy()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    throw new Error(`Server did not become healthy within ${timeout}ms`);
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
   * Send a ping request to the server to check if it's responsive
   * @returns Promise that resolves when ping is successful
   */
  public async ping(): Promise<void> {
    return this.sendRequest('$/ping', undefined);
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

    // Verify server file exists for nodeServer and webServer types
    if (
      (this.serverType === 'nodeServer' || this.serverType === 'webServer') &&
      serverPath !== 'demo-mode'
    ) {
      const fs = require('fs');
      if (!fs.existsSync(serverPath)) {
        throw new Error(
          `Server file does not exist: ${serverPath}. Make sure to compile apex-ls first.`,
        );
      }
    }

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
      case 'nodeServer': {
        // Filter out inspect flags from NODE_OPTIONS to prevent debugger from attaching
        // This is critical because Jest/VS Code may run with --inspect, which gets inherited
        const filteredEnv: NodeJS.ProcessEnv = { ...process.env };

        // Helper function to clean NODE_OPTIONS
        const cleanNodeOptions = (
          options: string | undefined,
        ): string | undefined => {
          if (!options) return undefined;
          const cleaned = options
            .replace(/--inspect(?:-brk)?(?:=[\w:.-]+)?/g, '')
            .trim();
          return cleaned || undefined;
        };

        // Remove inspect flags from process.env NODE_OPTIONS
        if (filteredEnv.NODE_OPTIONS) {
          const originalOptions = filteredEnv.NODE_OPTIONS;
          const cleaned = cleanNodeOptions(originalOptions);
          if (cleaned !== originalOptions) {
            if (cleaned) {
              filteredEnv.NODE_OPTIONS = cleaned;
            } else {
              delete filteredEnv.NODE_OPTIONS;
            }
            this.logger.debug(
              `Filtered NODE_OPTIONS from process.env: "${originalOptions}" -> "${cleaned || '(removed)'}"`,
            );
          }
        }

        // Merge with provided env, but also filter NODE_OPTIONS from env if present
        if (env) {
          const cleanedEnv = { ...env };
          if (cleanedEnv.NODE_OPTIONS) {
            const originalEnvOptions = cleanedEnv.NODE_OPTIONS;
            const cleaned = cleanNodeOptions(originalEnvOptions);
            if (cleaned !== originalEnvOptions) {
              if (cleaned) {
                cleanedEnv.NODE_OPTIONS = cleaned;
              } else {
                delete cleanedEnv.NODE_OPTIONS;
              }
              this.logger.debug(
                `Filtered NODE_OPTIONS from provided env: "${originalEnvOptions}" -> "${cleaned || '(removed)'}"`,
              );
            }
          }
          Object.assign(filteredEnv, cleanedEnv);
        }

        // Also filter inspect flags from nodeArgs
        const filteredNodeArgs = (nodeArgs || []).filter(
          (arg) => !arg.match(/^--inspect(?:-brk)?(?:=[\w:.-]+)?$/),
        );

        if (filteredNodeArgs.length !== (nodeArgs || []).length) {
          this.logger.debug(
            `Filtered inspect flags from nodeArgs: ${JSON.stringify(nodeArgs)} -> ${JSON.stringify(filteredNodeArgs)}`,
          );
        }

        return cp.spawn(
          nodePath as string,
          [...filteredNodeArgs, serverPath, ...(serverArgs || [])],
          {
            env: filteredEnv,
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: workspacePath, // Set the current working directory
          },
        );
      }
      case 'webServer': {
        // Filter out inspect flags from NODE_OPTIONS to prevent debugger from attaching
        const filteredEnv: NodeJS.ProcessEnv = { ...process.env };

        // Helper function to clean NODE_OPTIONS
        const cleanNodeOptions = (
          options: string | undefined,
        ): string | undefined => {
          if (!options) return undefined;
          const cleaned = options
            .replace(/--inspect(?:-brk)?(?:=[\w:.-]+)?/g, '')
            .trim();
          return cleaned || undefined;
        };

        // Remove inspect flags from process.env NODE_OPTIONS
        if (filteredEnv.NODE_OPTIONS) {
          const originalOptions = filteredEnv.NODE_OPTIONS;
          const cleaned = cleanNodeOptions(originalOptions);
          if (cleaned !== originalOptions) {
            if (cleaned) {
              filteredEnv.NODE_OPTIONS = cleaned;
            } else {
              delete filteredEnv.NODE_OPTIONS;
            }
            this.logger.debug(
              `Filtered NODE_OPTIONS from process.env: "${originalOptions}" -> "${cleaned || '(removed)'}"`,
            );
          }
        }

        // Merge with provided env, but also filter NODE_OPTIONS from env if present
        if (env) {
          const cleanedEnv = { ...env };
          if (cleanedEnv.NODE_OPTIONS) {
            const originalEnvOptions = cleanedEnv.NODE_OPTIONS;
            const cleaned = cleanNodeOptions(originalEnvOptions);
            if (cleaned !== originalEnvOptions) {
              if (cleaned) {
                cleanedEnv.NODE_OPTIONS = cleaned;
              } else {
                delete cleanedEnv.NODE_OPTIONS;
              }
              this.logger.debug(
                `Filtered NODE_OPTIONS from provided env: "${originalEnvOptions}" -> "${cleaned || '(removed)'}"`,
              );
            }
          }
          Object.assign(filteredEnv, cleanedEnv);
        }

        // Also filter inspect flags from nodeArgs
        const filteredNodeArgs = (nodeArgs || []).filter(
          (arg) => !arg.match(/^--inspect(?:-brk)?(?:=[\w:.-]+)?$/),
        );

        if (filteredNodeArgs.length !== (nodeArgs || []).length) {
          this.logger.debug(
            `Filtered inspect flags from nodeArgs: ${JSON.stringify(nodeArgs)} -> ${JSON.stringify(filteredNodeArgs)}`,
          );
        }

        return cp.spawn(
          nodePath as string,
          [...filteredNodeArgs, serverPath, ...(serverArgs || [])],
          {
            env: filteredEnv,
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: workspacePath, // Set the current working directory
          },
        );
      }
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
            diagnostic: {
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
