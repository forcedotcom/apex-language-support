/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import type {
  InitializeParams,
  InitializeResult,
  TextDocumentChangeEvent,
  Connection,
  EnvironmentType,
  ApexServerInitializationOptions,
} from '../types';
import { UnifiedStorageFactory } from '../storage/UnifiedStorageFactory';
import { TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  dispatchProcessOnChangeDocument,
  dispatchProcessOnCloseDocument,
  dispatchProcessOnOpenDocument,
  dispatchProcessOnSaveDocument,
  dispatchProcessOnDocumentSymbol,
  dispatchProcessOnFoldingRange,
  dispatchProcessOnDiagnostic,
  dispatchProcessOnResolve,
  ApexStorageManager,
  LSPConfigurationManager,
} from '@salesforce/apex-lsp-compliant-services';
import {
  setLogNotificationHandler,
  getLogger,
  setLoggerFactory,
  setLogLevel,
} from '@salesforce/apex-lsp-shared';

import { UnifiedLogNotificationHandler } from '../utils/BrowserLogNotificationHandler';
import { UnifiedLoggerFactory } from '../utils/BrowserLoggerFactory';

/**
 * Configuration options for the unified Apex language server
 */
export interface UnifiedServerConfig {
  environment: EnvironmentType;
  connection: Connection;
  enableNodeFeatures?: boolean;
  storageOptions?: Record<string, unknown>;
}

/**
 * Unified Apex Language Server that works across all environments
 *
 * This server consolidates functionality from:
 * - Unified language server for Node.js, browser, and web worker environments
 *
 * It provides a single implementation that works with web workers,
 * browser environments, and Node.js environments.
 */
export class UnifiedApexLanguageServer {
  private connection: Connection;
  private environment: EnvironmentType;
  private enableNodeFeatures: boolean;
  private documents: TextDocuments<TextDocument>;
  private storageManager: ApexStorageManager | null = null;
  private configurationManager: LSPConfigurationManager;
  private logger: ReturnType<typeof getLogger>;
  private isShutdown = false;

  constructor(config: UnifiedServerConfig) {
    this.connection = config.connection;
    this.environment = config.environment;
    this.enableNodeFeatures = config.enableNodeFeatures ?? false;

    // Initialize logging based on environment
    this.initializeLogging();
    this.logger = getLogger();

    // Initialize configuration manager
    this.configurationManager = new LSPConfigurationManager();

    // Initialize documents manager
    this.documents = new TextDocuments(TextDocument);

    // Initialize storage (will be done async in initialize())
  }

  /**
   * Initialize logging based on environment
   */
  private initializeLogging(): void {
    // Set appropriate logger factory and notification handler for environment
    switch (this.environment) {
      case 'webworker':
        setLoggerFactory(UnifiedLoggerFactory.getWorkerInstance());
        setLogNotificationHandler(
          UnifiedLogNotificationHandler.getWorkerInstance(this.connection),
        );
        break;

      case 'browser':
        setLoggerFactory(UnifiedLoggerFactory.getBrowserInstance());
        setLogNotificationHandler(
          UnifiedLogNotificationHandler.getBrowserInstance(this.connection),
        );
        break;

      case 'node':
      default:
        // For Node.js, we can use the unified system but mark it as non-worker
        setLoggerFactory(UnifiedLoggerFactory.getBrowserInstance());
        setLogNotificationHandler(
          UnifiedLogNotificationHandler.getBrowserInstance(this.connection),
        );
        break;
    }
  }

  /**
   * Initialize the language server
   */
  async initialize(): Promise<void> {
    // Initialize storage based on environment
    const storage = await UnifiedStorageFactory.createStorage({
      environment: this.environment,
      useMemoryStorage: this.environment === 'webworker',
    });

    this.storageManager = ApexStorageManager.getInstance({
      storageFactory: () => storage,
      storageOptions: {},
    });
    await this.storageManager.initialize();

    // Set up connection handlers
    this.setupConnectionHandlers();
    this.setupDocumentHandlers();

    // Start listening
    this.documents.listen(this.connection);
    this.connection.listen();

    this.logger.info(
      `Unified Apex Language Server initialized for ${this.environment} environment`,
    );
  }

  /**
   * Set up LSP connection handlers
   */
  private setupConnectionHandlers(): void {
    // Handle initialization
    this.connection.onInitialize(
      (params: InitializeParams): InitializeResult => {
        this.logger.info('Unified Apex Language Server initializing...');
        this.logger.info(`Root URI: ${params.rootUri}`);
        this.logger.info(`Process ID: ${params.processId}`);

        // Extract initialization options
        const initOptions = params.initializationOptions as
          | ApexServerInitializationOptions
          | undefined;
        const logLevel = initOptions?.logLevel || 'error';

        this.logger.info(`Setting log level to: ${logLevel}`);
        setLogLevel(logLevel);

        // Determine server mode
        const mode = this.determineServerMode(initOptions);
        this.configurationManager.setMode(mode);
        const capabilities = this.configurationManager.getCapabilities();

        this.logger.info(
          `Using ${mode} mode capabilities for ${this.environment} environment`,
        );

        return { capabilities };
      },
    );

    // Handle initialized notification
    this.connection.onInitialized(() => {
      this.logger.info('Unified Apex Language Server initialized');

      // Register Node.js specific handlers if enabled
      if (this.enableNodeFeatures) {
        this.registerNodeFeatures();
      }

      // Register common handlers
      this.registerCommonHandlers();
    });

    // Handle shutdown
    this.connection.onShutdown(() => {
      this.logger.info('Unified Apex Language Server shutting down...');
      this.isShutdown = true;
      this.logger.info('Unified Apex Language Server shutdown complete');
    });

    // Handle exit
    this.connection.onExit(() => {
      this.logger.info('Unified Apex Language Server exiting...');
      if (!this.isShutdown) {
        this.logger.warn(
          'Unified Apex Language Server exiting without proper shutdown',
        );
      }
      this.logger.info('Unified Apex Language Server exited');
    });
  }

  /**
   * Register Node.js specific features
   */
  private registerNodeFeatures(): void {
    // Register the apexlib/resolve request handler (Node.js specific)
    this.connection.onRequest('apexlib/resolve', async (params) => {
      this.logger.debug(
        `[SERVER] Received apexlib/resolve request for: ${params.uri}`,
      );
      try {
        const result = await dispatchProcessOnResolve(params);
        this.logger.debug(
          `[SERVER] Successfully resolved content for: ${params.uri}`,
        );
        return result;
      } catch (error) {
        this.logger.error(
          `[SERVER] Error resolving content for ${params.uri}: ${error}`,
        );
        throw error;
      }
    });

    this.logger.info('Node.js specific features registered');
  }

  /**
   * Register common handlers available in all environments
   */
  private registerCommonHandlers(): void {
    // Register the $/ping request handler
    this.connection.onRequest('$/ping', async () => {
      this.logger.debug('[SERVER] Received $/ping request');
      try {
        const response = {
          message: 'pong',
          timestamp: new Date().toISOString(),
          server: `apex-ls-unified-${this.environment}`,
          environment: this.environment,
        };
        this.logger.debug(
          `[SERVER] Responding to $/ping with: ${JSON.stringify(response)}`,
        );
        return response;
      } catch (error) {
        this.logger.error(`[SERVER] Error processing $/ping request: ${error}`);
        throw error;
      }
    });

    // Handle document symbol requests
    this.connection.onDocumentSymbol(async (params) => {
      this.logger.debug(
        `[SERVER] Received documentSymbol request for: ${params.textDocument.uri}`,
      );

      try {
        const result = await dispatchProcessOnDocumentSymbol(params);
        this.logger.debug(
          `[SERVER] Result for documentSymbol (${params.textDocument.uri}): ${JSON.stringify(result)}`,
        );
        return result;
      } catch (error) {
        this.logger.error(
          `[SERVER] Error processing documentSymbol for ${params.textDocument.uri}: ${error}`,
        );
        return null;
      }
    });

    // Handle diagnostic requests
    this.connection.onRequest('textDocument/diagnostic', async (params) => {
      this.logger.debug(
        `[SERVER] Received diagnostic request for: ${params.textDocument.uri}`,
      );

      try {
        const result = await dispatchProcessOnDiagnostic(params);
        this.logger.debug(
          `[SERVER] Result for diagnostic (${params.textDocument.uri}): ${JSON.stringify(result)}`,
        );
        return result;
      } catch (error) {
        this.logger.error(
          `[SERVER] Error processing diagnostic for ${params.textDocument.uri}: ${error}`,
        );
        return [];
      }
    });

    // Handle workspace diagnostic requests
    this.connection.onRequest('workspace/diagnostic', async (params) => {
      this.logger.debug('workspace/diagnostic requested by client');
      return { items: [] };
    });

    // Handle folding range requests
    this.connection.onFoldingRanges(async (params) => {
      this.logger.debug(
        `[SERVER] Received foldingRange request for: ${params.textDocument.uri}`,
      );

      try {
        const result = await dispatchProcessOnFoldingRange(
          params,
          this.storageManager!.getStorage(),
        );
        this.logger.debug(
          `[SERVER] Result for foldingRanges (${params.textDocument.uri}): ${JSON.stringify(result)}`,
        );
        return result;
      } catch (error) {
        this.logger.error(
          `[SERVER] Error processing foldingRanges for ${params.textDocument.uri}: ${error}`,
        );
        return null;
      }
    });

    // Handle completion requests
    this.connection.onCompletion((_textDocumentPosition: any) => [
      {
        label: 'ExampleCompletion',
        kind: 1, // Text completion
        data: 1,
      },
    ]);

    // Handle hover requests
    this.connection.onHover((_textDocumentPosition: any) => ({
      contents: {
        kind: 'markdown',
        value: 'This is an example hover text.',
      },
    }));
  }

  /**
   * Set up document event handlers
   */
  private setupDocumentHandlers(): void {
    // Helper function to handle diagnostics
    const handleDiagnostics = (
      uri: string,
      diagnostics: any[] | undefined, // Changed from Diagnostic[] to any[]
    ) => {
      // Check if publishDiagnostics is enabled in capabilities
      const capabilities =
        this.configurationManager.getExtendedServerCapabilities();
      if (!capabilities.publishDiagnostics) {
        this.logger.debug(
          `Publish diagnostics disabled, skipping diagnostic send for: ${uri}`,
        );
        return;
      }

      // Always send diagnostics to the client, even if empty array
      this.connection.sendDiagnostics({
        uri,
        diagnostics: diagnostics || [],
      });
    };

    // Document opened
    this.documents.onDidOpen((event: TextDocumentChangeEvent<TextDocument>) => {
      this.logger.debug(
        `Unified Apex Language Server opened document: ${event.document.uri}`,
      );

      dispatchProcessOnOpenDocument(event).then((diagnostics) =>
        handleDiagnostics(event.document.uri, diagnostics),
      );
    });

    // Document content changed
    this.documents.onDidChangeContent(
      (event: TextDocumentChangeEvent<TextDocument>) => {
        this.logger.debug(
          `Unified Apex Language Server changed document: ${event.document.uri}`,
        );

        dispatchProcessOnChangeDocument(event).then((diagnostics) =>
          handleDiagnostics(event.document.uri, diagnostics),
        );
      },
    );

    // Document closed
    this.documents.onDidClose(
      (event: TextDocumentChangeEvent<TextDocument>) => {
        this.logger.debug(
          `Unified Apex Language Server closed document: ${event.document.uri}`,
        );

        dispatchProcessOnCloseDocument(event);
        handleDiagnostics(event.document.uri, []);
      },
    );

    // Document saved
    this.documents.onDidSave((event: TextDocumentChangeEvent<TextDocument>) => {
      this.logger.debug(
        `Unified Apex Language Server saved document: ${event.document.uri}`,
      );

      dispatchProcessOnSaveDocument(event);
    });
  }

  /**
   * Determine server mode based on initialization options and environment
   */
  private determineServerMode(
    initOptions?: ApexServerInitializationOptions,
  ): 'production' | 'development' {
    const extensionMode = initOptions?.extensionMode as
      | 'production'
      | 'development'
      | undefined;

    let mode: 'production' | 'development';

    // For Node.js environment, check environment variables
    if (this.environment === 'node') {
      // First check for APEX_LS_MODE environment variable
      if (
        process.env.APEX_LS_MODE === 'production' ||
        process.env.APEX_LS_MODE === 'development'
      ) {
        mode = process.env.APEX_LS_MODE;
        this.logger.info(
          `Using server mode from APEX_LS_MODE environment variable: ${mode}`,
        );
      }
      // Then check for extension mode in initialization options
      else if (extensionMode) {
        mode = extensionMode;
        this.logger.info(
          `Using server mode from extension initialization options: ${mode}`,
        );
      }
      // Finally fall back to NODE_ENV
      else {
        mode = (
          process.env.NODE_ENV === 'development' ? 'development' : 'production'
        ) as 'production' | 'development';
        this.logger.info(`Using server mode from NODE_ENV: ${mode}`);
      }
    } else {
      // For web worker/browser, check for environment variables if available
      if (
        (typeof self !== 'undefined' &&
          'APEX_LS_MODE' in self &&
          (self as any).APEX_LS_MODE === 'production') ||
        (self as any).APEX_LS_MODE === 'development'
      ) {
        mode = (self as any).APEX_LS_MODE;
        this.logger.info(
          `Using server mode from APEX_LS_MODE environment variable: ${mode}`,
        );
      }
      // Check for extension mode in initialization options
      else if (extensionMode) {
        mode = extensionMode;
        this.logger.info(
          `Using server mode from extension initialization options: ${mode}`,
        );
      }
      // Default to production for web environments
      else {
        mode = 'production';
        this.logger.info(
          `Using default production mode for ${this.environment} environment`,
        );
      }
    }

    return mode;
  }

  /**
   * Dispose the server
   */
  dispose(): void {
    this.connection.dispose();
    this.isShutdown = true;
  }
}
