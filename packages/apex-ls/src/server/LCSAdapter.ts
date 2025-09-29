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

import { ApexSymbolProcessingManager } from '@salesforce/apex-lsp-parser-ast';

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

    // Initialize ApexSymbolProcessingManager for web environment
    // The web worker needs proper symbol processing to maintain symbol persistence
    try {
      // console.log(
      //   '🔧 [LCSAdapter] Initializing ApexSymbolProcessingManager for web environment',
      // );

      const symbolProcessingManager = ApexSymbolProcessingManager.getInstance();
      symbolProcessingManager.initialize();

      const symbolManager = symbolProcessingManager.getSymbolManager();
      const _stats = symbolManager.getStats();

      // console.log(
      //   '✅ [LCSAdapter] ApexSymbolProcessingManager initialized with ' +
      //     `${stats.totalFiles} files, ${stats.totalSymbols} symbols`,
      // );
    } catch (error) {
      // console.log('❌ [LCSAdapter] Error in symbol processing setup:', error);
      this.logger.error('❌ Error in symbol processing setup:', error);

      // Fallback: log the error but continue with sync processing
      // console.log(
      //   '🔄 [LCSAdapter] Continuing with synchronous symbol processing fallback',
      // );
    }

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

    // Set up LSP protocol handlers
    this.setupProtocolHandlers();

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
        // console.log(`📄 [LCSAdapter] Document opened: ${open.document.uri}`);
        this.logger.debug(`Document opened: ${open.document.uri}`);
        // Trigger processing for document open; diagnostics are provided via pull API
        // console.log('🔄 [LCSAdapter] Calling dispatchProcessOnOpenDocument...');
        await dispatchProcessOnOpenDocument(open);
        // console.log('✅ [LCSAdapter] dispatchProcessOnOpenDocument completed');

        // Debug: Check if symbols were added to symbol manager after processing
        try {
          const manager = ApexSymbolProcessingManager.getInstance();
          // console.log(
          //   '🔧 [LCSAdapter] Symbol processing manager initialized after doc processing: ' +
          //     `${(manager as any).isInitialized}`,
          // );
          const symbolManager = manager.getSymbolManager();
          const _stats = symbolManager.getStats();
          // console.log(
          //   '📊 [LCSAdapter] After processing - Symbol manager has' +
          //     ` ${stats.totalFiles} files, ${stats.totalSymbols} symbols`,
          // );
        } catch (_debugError) {
          // console.log(
          //   '❌ [LCSAdapter] Error checking post-processing stats:',
          //   debugError,
          // );
        }
      } catch (error) {
        // console.log(
        //   `❌ [LCSAdapter] Error processing document open: ${error instanceof Error ? error.message : String(error)}`,
        // );
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
   * Note: When used with LazyLSPServer, most handlers are delegated via public methods
   * rather than direct connection handlers to avoid conflicts. Only diagnostic handlers
   * are set up directly since LazyLSPServer doesn't handle them yet.
   */
  private setupProtocolHandlers(): void {
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

    // Note: Document symbols, hover, completion, and definition are handled
    // via delegation from LazyLSPServer to avoid conflicts
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
   * Public methods for delegation from LazyLSPServer
   */

  /**
   * Handle hover requests
   */
  public async onHover(params: HoverParams): Promise<Hover | null> {
    // console.log(
    //   `🔍 [LCSAdapter] onHover called: ${params.textDocument.uri}` +
    //     ` at ${params.position.line}:${params.position.character}`,
    // );
    try {
      this.logger.info(
        `🔍 Hover request received: ${params.textDocument.uri} at ${params.position.line}:${params.position.character}`,
      );

      // Test if the basic dispatch function exists
      // console.log('🧪 [LCSAdapter] Testing dispatchProcessOnHover function...');
      if (typeof dispatchProcessOnHover !== 'function') {
        // console.log('❌ [LCSAdapter] dispatchProcessOnHover is not a function');
        this.logger.error('❌ dispatchProcessOnHover is not a function');
        return null;
      }
      // console.log('✅ [LCSAdapter] dispatchProcessOnHover function exists');

      // Test if core dependencies are available
      // console.log('🧪 [LCSAdapter] Testing core dependencies...');
      this.logger.info('🧪 Testing core dependencies...');
      try {
        const { ApexSymbolProcessingManager } = await import(
          '@salesforce/apex-lsp-parser-ast'
        );
        // console.log(
        //   '✅ [LCSAdapter] ApexSymbolProcessingManager import successful',
        // );
        this.logger.info('✅ ApexSymbolProcessingManager import successful');

        const manager = ApexSymbolProcessingManager.getInstance();
        // console.log(
        //   `✅ [LCSAdapter] Symbol manager instance created: ${manager ? 'yes' : 'no'}`,
        // );
        this.logger.info(
          `✅ Symbol manager instance created: ${manager ? 'yes' : 'no'}`,
        );

        const symbolManager = manager.getSymbolManager();
        // console.log(
        //   `✅ [LCSAdapter] Symbol manager obtained: ${symbolManager ? 'yes' : 'no'}`,
        // );
        this.logger.info(
          `✅ Symbol manager obtained: ${symbolManager ? 'yes' : 'no'}`,
        );
      } catch (error) {
        // console.log(`❌ [LCSAdapter] Core dependency test failed: ${error}`);
        this.logger.error(`❌ Core dependency test failed: ${error}`);
        return null;
      }

      // console.log('🚀 [LCSAdapter] Calling dispatchProcessOnHover...');
      this.logger.info('🚀 Calling dispatchProcessOnHover...');

      // Debug: Check if the document is in the symbol manager
      try {
        const manager = ApexSymbolProcessingManager.getInstance();

        // Check if the symbol processing manager is initialized
        // console.log(
        //   `🔧 [LCSAdapter] Symbol processing manager initialized: ${(manager as any).isInitialized}`,
        // );

        const symbolManager = manager.getSymbolManager();
        const _docSymbols = symbolManager.findSymbolsInFile(
          params.textDocument.uri,
        );
        // console.log(
        //   `🔍 [LCSAdapter] Document symbols for ${params.textDocument.uri}: ` +
        //     `${docSymbols.length} symbols`,
        // );

        // Check if the symbol manager has any documents at all
        const _stats = symbolManager.getStats();
        // console.log(
        //   `🔍 [LCSAdapter] Symbol manager has ${stats.totalFiles} total files`,
        // );
        // console.log(
        //   `🔍 [LCSAdapter] Symbol manager has ${stats.totalSymbols} total symbols`,
        // );
      } catch (_debugError) {
        // console.log(
        //   '🔍 [LCSAdapter] Debug error checking symbol manager:',
        //   debugError,
        // );
      }

      const result = await dispatchProcessOnHover(params);
      // console.log(
      //   `✅ [LCSAdapter] Hover processed: ${result ? 'has content' : 'no content'}`,
      // );
      this.logger.info(
        `✅ Hover processed successfully: ${result ? 'has content' : 'no content'}`,
      );
      return result;
    } catch (error) {
      // console.log(
      //   `❌ [LCSAdapter] Error processing hover: ${error instanceof Error ? error.message : String(error)}`,
      // );
      // console.log('❌ [LCSAdapter] Error stack:', error);
      this.logger.error(
        `❌ Error processing hover for ${params.textDocument.uri} at ${
          params.position.line
        }:${params.position.character}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      this.logger.error('Hover error stack:', error);
      return null;
    }
  }

  /**
   * Handle completion requests
   */
  public async onCompletion(
    params: CompletionParams,
  ): Promise<CompletionItem[]> {
    try {
      this.logger.debug(`Completion request: ${params.textDocument.uri}`);
      const result = await this.completionProcessor.processCompletion(params);
      this.logger.debug('Completion processed');
      return result || [];
    } catch (error) {
      this.logger.error(
        `Error processing completion for ${params.textDocument.uri} at ${
          params.position.line
        }:${params.position.character}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      this.logger.debug('Completion error details:', error);
      return [];
    }
  }

  /**
   * Handle definition requests
   */
  public async onDefinition(params: any): Promise<any> {
    try {
      this.logger.debug(`Definition request: ${params.textDocument.uri}`);
      // TODO: Implement definition provider using LCS when it's properly exported
      this.logger.debug('Definition processed (not yet implemented)');
      return null;
    } catch (error) {
      this.logger.error(
        `Error processing definition for ${params.textDocument.uri} at ${
          params.position.line
        }:${params.position.character}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      this.logger.debug('Definition error details:', error);
      return null;
    }
  }

  /**
   * Handle document symbol requests
   */
  public async onDocumentSymbol(params: DocumentSymbolParams): Promise<any[]> {
    try {
      this.logger.info(
        `📋 Document symbols request: ${params.textDocument.uri}`,
      );

      // Test if the basic dispatch function exists
      if (typeof dispatchProcessOnDocumentSymbol !== 'function') {
        this.logger.error(
          '❌ dispatchProcessOnDocumentSymbol is not a function',
        );
        return [];
      }

      this.logger.info('🚀 Calling dispatchProcessOnDocumentSymbol...');
      const result = await dispatchProcessOnDocumentSymbol(params);
      this.logger.info(
        `✅ Document symbols processed: ${result ? result.length : 0} symbols found`,
      );
      return result || [];
    } catch (error) {
      this.logger.error(
        `❌ Error processing document symbols for ${params.textDocument.uri}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      this.logger.error('Document symbols error stack:', error);
      return [];
    }
  }

  /**
   * Document event handlers for delegation mode
   * These methods are called by LazyLSPServer to forward document events
   * when LCS adapter is loaded and delegation mode is enabled
   */

  /**
   * Handle document open events
   */
  public async handleDocumentOpen(params: any): Promise<void> {
    try {
      // console.log(
      //   `📂 [LCSAdapter] handleDocumentOpen: ${params.textDocument.uri}`,
      // );
      this.logger.info(`📂 Document open event: ${params.textDocument.uri}`);

      // Create a synthetic document change event for LCS processing
      let document = this.documents.get(params.textDocument.uri);
      if (!document) {
        // If document not in our TextDocuments manager, create one from params
        document = TextDocument.create(
          params.textDocument.uri,
          params.textDocument.languageId,
          params.textDocument.version,
          params.textDocument.text,
        );

        // CRITICAL FIX: Manually add document to TextDocuments manager
        // TextDocuments doesn't have a public way to add documents, so we'll skip this
        // and rely on the document being passed directly to LCS processing
      }

      // Process through LCS dispatch
      if (typeof dispatchProcessOnOpenDocument === 'function') {
        const event = { document };
        await dispatchProcessOnOpenDocument(event);
        // console.log(
        //   `✅ [LCSAdapter] Document open processed: ${params.textDocument.uri}`,
        // );
      } else {
        // console.log(
        //   '❌ [LCSAdapter] dispatchProcessOnOpenDocument not available',
        // );
      }
    } catch (error) {
      // console.log(`❌ [LCSAdapter] Error in handleDocumentOpen: ${error}`);
      this.logger.error(`Error handling document open: ${error}`);
    }
  }

  /**
   * Handle document change events
   */
  public async handleDocumentChange(params: any): Promise<void> {
    try {
      // console.log(
      //   `📝 [LCSAdapter] handleDocumentChange: ${params.textDocument.uri}`,
      // );
      this.logger.info(`📝 Document change event: ${params.textDocument.uri}`);

      // Get the updated document
      const document = this.documents.get(params.textDocument.uri);
      if (document && typeof dispatchProcessOnChangeDocument === 'function') {
        const event = { document };
        await dispatchProcessOnChangeDocument(event);
        // console.log(
        //   `✅ [LCSAdapter] Document change processed: ${params.textDocument.uri}`,
        // );
      } else {
        // console.log(
        //   '❌ [LCSAdapter] Document not found or dispatch not available',
        // );
      }
    } catch (error) {
      // console.log(`❌ [LCSAdapter] Error in handleDocumentChange: ${error}`);
      this.logger.error(`Error handling document change: ${error}`);
    }
  }

  /**
   * Handle document save events
   */
  public async handleDocumentSave(params: any): Promise<void> {
    try {
      // console.log(
      //   `💾 [LCSAdapter] handleDocumentSave: ${params.textDocument.uri}`,
      // );
      this.logger.info(`💾 Document save event: ${params.textDocument.uri}`);

      // Get the saved document
      const document = this.documents.get(params.textDocument.uri);
      if (document && typeof dispatchProcessOnSaveDocument === 'function') {
        const event = { document };
        await dispatchProcessOnSaveDocument(event);
        // console.log(
        //   `✅ [LCSAdapter] Document save processed: ${params.textDocument.uri}`,
        // );
      } else {
        // console.log(
        //   '❌ [LCSAdapter] Document not found or dispatch not available',
        // );
      }
    } catch (error) {
      // console.log(`❌ [LCSAdapter] Error in handleDocumentSave: ${error}`);
      this.logger.error(`Error handling document save: ${error}`);
    }
  }

  /**
   * Handle document close events
   */
  public async handleDocumentClose(params: any): Promise<void> {
    try {
      // console.log(
      //   `📄 [LCSAdapter] handleDocumentClose: ${params.textDocument.uri}`,
      // );
      this.logger.info(`📄 Document close event: ${params.textDocument.uri}`);

      // Get the document before it's closed
      const document = this.documents.get(params.textDocument.uri);
      if (document && typeof dispatchProcessOnCloseDocument === 'function') {
        const event = { document };
        await dispatchProcessOnCloseDocument(event);
        // console.log(
        //   `✅ [LCSAdapter] Document close processed: ${params.textDocument.uri}`,
        // );
      } else {
        // console.log(
        //   '❌ [LCSAdapter] Document not found or dispatch not available',
        // );
      }
    } catch (error) {
      // console.log(`❌ [LCSAdapter] Error in handleDocumentClose: ${error}`);
      this.logger.error(`Error handling document close: ${error}`);
    }
  }
}
