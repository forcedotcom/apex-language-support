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
  TextDocumentSyncKind,
  CompletionParams,
  CompletionItem,
  HoverParams,
  Hover,
  DocumentDiagnosticParams,
  DocumentDiagnosticReport,
  DocumentDiagnosticReportKind,
} from 'vscode-languageserver/browser';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { UniversalLoggerFactory, Logger } from '@salesforce/apex-lsp-shared';

// LCS services and handlers
import {
  dispatchProcessOnOpenDocument,
  dispatchProcessOnChangeDocument,
  dispatchProcessOnSaveDocument,
  dispatchProcessOnCloseDocument,
  dispatchProcessOnDocumentSymbol,
  dispatchProcessOnHover,
  CompletionProcessingService,
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
  logger?: Logger;
  delegationMode?: boolean; // When true, don't set up connection listeners
}

/**
 * Adapter layer between webworker environment and LSP-Compliant-Services
 * Handles the integration challenges and provides a clean interface
 */
export class LCSAdapter {
  private readonly connection: Connection;
  private readonly logger: Logger;
  private readonly documents: TextDocuments<TextDocument>;
  private hasConfigurationCapability = false;
  private hasWorkspaceFolderCapability = false;
  private hasDiagnosticRelatedInformationCapability = false;
  private initialized = false;
  private completionProcessor: CompletionProcessingService;
  private diagnosticProcessor: DiagnosticProcessingService;
  private delegationMode: boolean;

  constructor(config: LCSAdapterConfig) {
    this.connection = config.connection;
    this.logger = config.logger || this.createDefaultLogger();
    this.documents = new TextDocuments(TextDocument);
    this.delegationMode = config.delegationMode || false;

    // Initialize LCS services
    this.completionProcessor = new CompletionProcessingService(this.logger);
    this.diagnosticProcessor = new DiagnosticProcessingService(this.logger);

    this.setupEventHandlers();
  }

  /**
   * Initialize the LCS adapter
   */
  async initialize(): Promise<void> {
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
      this.logger.error('❌ Failed to initialize ApexStorageManager:', error);
    }

    // Set up document event handlers
    this.setupDocumentHandlers();

    // Only set up protocol handlers if NOT in delegation mode
    // In delegation mode, LazyLSPServer handles the protocol and forwards to our public methods
    if (!this.delegationMode) {
      this.setupProtocolHandlers();
    }

    // Start listening for documents
    this.documents.listen(this.connection);

    // Only start listening on connection if not in delegation mode
    if (!this.delegationMode) {
      this.connection.listen();
    }

    this.initialized = true;
    this.logger.info('✅ LCS Adapter initialized successfully');
  }

  /**
   * Create default logger if none provided
   */
  private createDefaultLogger(): Logger {
    const loggerFactory = UniversalLoggerFactory.getInstance();
    return loggerFactory.createLogger(this.connection) as Logger;
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
        this.logger.debug('Document open error details:', error);
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
        this.logger.debug('Document change error details:', error);
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
        this.logger.debug('Document save error details:', error);
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
        this.logger.debug('Document close error details:', error);
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
        this.logger.debug('Document symbols error details:', error);
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
          this.logger.debug('Hover error details:', error);
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
          this.logger.debug('Diagnostics error details:', error);
          return {
            kind: DocumentDiagnosticReportKind.Full,
            items: [],
          };
        }
      },
    );

    // Advanced completion support using LCS
    this.connection.onCompletion(
      async (params: CompletionParams): Promise<CompletionItem[]> => {
        this.logger.debug('Processing completion request with LCS');
        const result = await this.completionProcessor.processCompletion(params);
        return result || [];
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
    this.hasDiagnosticRelatedInformationCapability = !!(
      capabilities.textDocument &&
      capabilities.textDocument.publishDiagnostics &&
      capabilities.textDocument.publishDiagnostics.relatedInformation
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
  private handleConfigurationChange(change: any): void {
    LSPConfigurationManager.getInstance().updateFromLSPConfiguration(change);
    // Revalidate all open text documents (basic implementation for now)
    this.documents.all().forEach(async (document) => {
      try {
        // Basic revalidation - can be enhanced with LCS later
        this.connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
      } catch (error) {
        this.logger.error('Error revalidating document:', error);
      }
    });
  }

  /**
   * Check if adapter is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
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
  public getLogger(): Logger {
    return this.logger;
  }

  /**
   * Public delegation methods for LazyLSPServer integration.
   * These methods allow LazyLSPServer to forward events when in delegation mode.
   */

  /**
   * Handle document open event (delegation mode).
   * @param params - Document open parameters
   */
  public async handleDocumentOpen(params: any): Promise<void> {
    const document = this.documents.get(params.textDocument.uri);
    if (document) {
      await dispatchProcessOnOpenDocument({ document });
    }
  }

  /**
   * Handle document change event (delegation mode).
   * @param params - Document change parameters
   */
  public async handleDocumentChange(params: any): Promise<void> {
    const document = this.documents.get(params.textDocument.uri);
    if (document) {
      await dispatchProcessOnChangeDocument({ document });
    }
  }

  /**
   * Handle document save event (delegation mode).
   * @param params - Document save parameters
   */
  public async handleDocumentSave(params: any): Promise<void> {
    const document = this.documents.get(params.textDocument.uri);
    if (document) {
      await dispatchProcessOnSaveDocument({ document });
    }
  }

  /**
   * Handle document close event (delegation mode).
   * @param params - Document close parameters
   */
  public async handleDocumentClose(params: any): Promise<void> {
    const document = this.documents.get(params.textDocument.uri);
    if (document) {
      await dispatchProcessOnCloseDocument({ document });
    }
  }

  /**
   * Handle hover request (delegation mode).
   * @param params - Hover parameters
   * @returns Hover information or null
   */
  public async onHover(params: HoverParams): Promise<Hover | null> {
    try {
      return await dispatchProcessOnHover(params);
    } catch (error) {
      this.logger.error(`Error processing hover: ${error}`);
      return null;
    }
  }

  /**
   * Handle document symbol request (delegation mode).
   * @param params - Document symbol parameters
   * @returns Array of document symbols or null
   */
  public async onDocumentSymbol(params: DocumentSymbolParams): Promise<any> {
    try {
      const result = await dispatchProcessOnDocumentSymbol(params);
      return result || [];
    } catch (error) {
      this.logger.error(`Error processing document symbols: ${error}`);
      return [];
    }
  }

  /**
   * Handle completion request (delegation mode).
   * @param params - Completion parameters
   * @returns Array of completion items
   */
  public async onCompletion(
    params: CompletionParams,
  ): Promise<CompletionItem[]> {
    try {
      return await this.completionProcessor.processCompletion(params);
    } catch (error) {
      this.logger.error(`Error processing completion: ${error}`);
      return [];
    }
  }
}
