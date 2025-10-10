/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  Connection,
  InitializeParams,
  InitializeResult,
  TextDocuments,
  DocumentSymbolParams,
  DidChangeConfigurationNotification,
  DidChangeConfigurationParams,
  TextDocumentSyncKind,
  HoverParams,
  Hover,
  DocumentDiagnosticParams,
  DocumentDiagnosticReport,
  DocumentDiagnosticReportKind,
} from 'vscode-languageserver/browser';

import { TextDocument } from 'vscode-languageserver-textdocument';

import {
  UniversalLoggerFactory,
  LoggerInterface,
} from '@salesforce/apex-lsp-shared';

// LCS services and handlers
import {
  dispatchProcessOnOpenDocument,
  dispatchProcessOnChangeDocument,
  dispatchProcessOnSaveDocument,
  dispatchProcessOnCloseDocument,
  dispatchProcessOnDocumentSymbol,
  dispatchProcessOnHover,
  DiagnosticProcessingService,
  ApexStorageManager,
  ApexStorage,
  LSPConfigurationManager,
} from '@salesforce/apex-lsp-compliant-services';

/**
 * Configuration for the LCS Adapter
 */
export interface LCSAdapterConfig {
  connection: Connection;
  logger?: LoggerInterface;
}

/**
 * Adapter layer between webworker environment and LSP-Compliant-Services
 * Handles the integration challenges and provides a clean interface
 */
export class LCSAdapter {
  private readonly connection: Connection;
  private readonly logger: LoggerInterface;
  private readonly documents: TextDocuments<TextDocument>;
  private hasConfigurationCapability = false;
  private hasWorkspaceFolderCapability = false;
  private readonly diagnosticProcessor: DiagnosticProcessingService;

  /**
   * Private constructor - use LCSAdapter.create() instead
   */
  private constructor(config: LCSAdapterConfig) {
    this.connection = config.connection;
    this.logger = config.logger ?? this.createDefaultLogger();
    this.documents = new TextDocuments(TextDocument);

    // Initialize LCS services
    this.diagnosticProcessor = new DiagnosticProcessingService(this.logger);

    this.setupEventHandlers();
  }

  /**
   * Create and initialize a new LCS adapter instance.
   * This is the single entry point for creating LCS adapters.
   *
   * @param config Configuration for the LCS adapter
   * @returns Promise that resolves to a fully initialized LCSAdapter instance
   */
  static async create(config: LCSAdapterConfig): Promise<LCSAdapter> {
    const adapter = new LCSAdapter(config);
    await adapter.initialize();
    return adapter;
  }

  /**
   * Initialize the LCS adapter - called internally by create()
   */
  private async initialize(): Promise<void> {
    this.logger.info('🚀 LCS Adapter initializing...');

    // Initialize ApexStorageManager singleton with storage factory
    try {
      const storageManager = ApexStorageManager.getInstance({
        storageFactory: () => ApexStorage.getInstance(),
        autoPersistIntervalMs: 30000, // Auto-persist every 30 seconds
      });

      await storageManager.initialize();
      this.logger.debug('✅ ApexStorageManager initialized successfully');
    } catch (error) {
      this.logger.error(`❌ Failed to initialize ApexStorageManager: ${error}`);
    }

    // Set up document event handlers
    this.setupDocumentHandlers();

    // Set up protocol handlers for LSP requests
    this.setupProtocolHandlers();

    // Start listening for documents
    this.documents.listen(this.connection);

    // Start listening on connection for LSP protocol messages
    this.connection.listen();

    this.logger.info('✅ LCS Adapter initialized successfully');
  }

  /**
   * Create default logger if none provided
   */
  private createDefaultLogger(): LoggerInterface {
    const loggerFactory = UniversalLoggerFactory.getInstance();
    return loggerFactory.createLogger(this.connection);
  }

  /**
   * Set up basic event handlers
   */
  private setupEventHandlers(): void {
    this.connection.onInitialize(this.handleInitialize.bind(this));
    this.connection.onInitialized(this.handleInitialized.bind(this));
    this.connection.onDidChangeConfiguration(
      this.handleConfigurationChange.bind(this),
    );
  }

  /**
   * Set up document-related event handlers using LCS
   */
  private setupDocumentHandlers(): void {
    // Document open events - process documents when they are first opened
    this.documents.onDidOpen(async (open) => {
      try {
        this.logger.debug(`Document opened: ${open.document.uri}`);
        // Trigger processing for document open; diagnostics are provided via pull API
        await dispatchProcessOnOpenDocument(open);
      } catch (error) {
        this.logger.error(
          `Error processing document open for ${open.document.uri}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        this.logger.debug(`Document open error details: ${error}`);
      }
    });

    // Document change events with enhanced processing
    this.documents.onDidChangeContent(async (change) => {
      try {
        this.logger.debug(`Document changed: ${change.document.uri}`);
        // Trigger processing for document change; diagnostics are provided via pull API
        await dispatchProcessOnChangeDocument(change);
      } catch (error) {
        this.logger.error(
          `Error processing document change for ${change.document.uri}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        this.logger.debug(`Document change error details: ${error}`);
      }
    });

    // Document save events
    this.documents.onDidSave(async (save) => {
      try {
        await dispatchProcessOnSaveDocument(save);
      } catch (error) {
        this.logger.error(
          `Error processing document save for ${save.document.uri}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        this.logger.debug(`Document save error details: ${error}`);
      }
    });

    // Document close events
    this.documents.onDidClose(async (close) => {
      try {
        await dispatchProcessOnCloseDocument(close);
      } catch (error) {
        this.logger.error(
          `Error processing document close for ${close.document.uri}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        this.logger.debug(`Document close error details: ${error}`);
      }
    });
  }

  /**
   * Set up LSP protocol handlers using LCS
   */
  private setupProtocolHandlers(): void {
    // Document symbols
    this.connection.onDocumentSymbol(async (params: DocumentSymbolParams) => {
      try {
        return await dispatchProcessOnDocumentSymbol(params);
      } catch (error) {
        this.logger.error(
          `Error processing document symbols for ${params.textDocument.uri}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        this.logger.debug(`Document symbols error details: ${error}`);
        return [];
      }
    });

    // Hover support
    this.connection.onHover(
      async (params: HoverParams): Promise<Hover | null> => {
        try {
          this.logger.debug(`Hover request: ${params.textDocument.uri}`);
          const result = await dispatchProcessOnHover(params);
          this.logger.debug('Hover processed');
          return result;
        } catch (error) {
          this.logger.error(
            `Error processing hover for ${params.textDocument.uri} at ${
              params.position.line
            }:${params.position.character}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          this.logger.debug(`Hover error details: ${error}`);
          return null;
        }
      },
    );

    // Enhanced diagnostics using LCS
    this.connection.languages.diagnostics.on(
      async (
        params: DocumentDiagnosticParams,
      ): Promise<DocumentDiagnosticReport> => {
        try {
          this.logger.debug('Processing diagnostics request with LCS');
          const diagnostics =
            await this.diagnosticProcessor.processDiagnostic(params);
          return {
            kind: DocumentDiagnosticReportKind.Full,
            items: diagnostics,
          };
        } catch (error) {
          this.logger.error(
            `Error processing diagnostics for ${params.textDocument.uri}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          this.logger.debug(`Diagnostics error details: ${error}`);
          return {
            kind: DocumentDiagnosticReportKind.Full,
            items: [],
          };
        }
      },
    );
  }

  /**
   * Handle initialization request
   */
  private handleInitialize(params: InitializeParams): InitializeResult {
    this.logger.info('🔧 Initialize request received');

    const capabilities = params.capabilities;

    // Capability detection
    this.hasConfigurationCapability = !!(
      capabilities.workspace && !!capabilities.workspace.configuration
    );
    this.hasWorkspaceFolderCapability = !!(
      capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );

    const result: InitializeResult = {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        completionProvider: {
          resolveProvider: true,
        },
        diagnosticProvider: {
          interFileDependencies: false,
          workspaceDiagnostics: false,
        },
        documentSymbolProvider: true,
        hoverProvider: true,
      },
    };

    if (this.hasWorkspaceFolderCapability) {
      result.capabilities.workspace = {
        workspaceFolders: {
          supported: true,
        },
      };
    }

    this.logger.info('✅ Initialize completed with LCS capabilities');
    return result;
  }

  /**
   * Handle initialized notification
   */
  private handleInitialized(): void {
    this.logger.info('🎉 Server initialized');

    if (this.hasConfigurationCapability) {
      this.connection.client.register(
        DidChangeConfigurationNotification.type,
        undefined,
      );
    }

    if (this.hasWorkspaceFolderCapability) {
      this.connection.workspace.onDidChangeWorkspaceFolders((_event) => {
        this.logger.info('Workspace folder change event received.');
      });
    }
  }

  /**
   * Handle configuration changes
   */
  private async handleConfigurationChange(
    change: DidChangeConfigurationParams,
  ): Promise<void> {
    LSPConfigurationManager.getInstance().updateFromLSPConfiguration(change);
    // Revalidate all open text documents (basic implementation for now)
    const revalidationPromises = this.documents.all().map(async (document) => {
      try {
        // Basic revalidation - can be enhanced with LCS later
        this.connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
      } catch (error) {
        this.logger.error(`Error revalidating document: ${error}`);
      }
    });

    await Promise.all(revalidationPromises);
  }

  /**
   * Get connection instance
   */
  public getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get logger instance
   */
  public getLogger(): LoggerInterface {
    return this.logger;
  }
}
