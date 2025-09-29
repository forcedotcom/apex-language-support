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
  TextDocumentSyncKind,
  ServerCapabilities,
} from 'vscode-languageserver/browser';

/**
 * Lightweight LSP server that starts immediately with basic capabilities
 * and lazy-loads advanced features on demand.
 */
export class LazyLSPServer {
  private connection: Connection;
  private logger: any;
  private lcsAdapter: any = null;
  private isLCSLoaded = false;

  constructor(connection: Connection, logger: any) {
    this.connection = connection;
    this.logger = logger;
    this.setupBasicHandlers();
  }

  /**
   * Set up basic LSP handlers that work without heavy dependencies
   */
  private setupBasicHandlers(): void {
    // Handle initialization with basic capabilities
    this.connection.onInitialize(
      (params: InitializeParams): InitializeResult => {
        this.logger.info('🔧 Initializing Lazy LSP Server...');

        const result = {
          capabilities: this.getBasicCapabilities(),
          serverInfo: {
            name: 'Apex Language Server (Lazy Loading)',
            version: '1.0.0',
          },
        };

        this.logger.info('📤 Sending server capabilities');
        return result;
      },
    );

    // Handle initialized notification
    this.connection.onInitialized(async () => {
      this.logger.info(
        '✅ Lazy LSP Server initialized - starting background loading...',
      );

      // Start loading heavy dependencies in the background
      this.preloadAdvancedFeatures();
    });

    // Handle text document sync (forward to LCS adapter when loaded)
    this.connection.onDidOpenTextDocument(async (params) => {
      this.logger.info(`📄 Document opened: ${params.textDocument.uri}`);

      // Load LCS adapter if not already loaded
      if (!this.isLCSLoaded) {
        this.logger.info('🔄 Loading LCS adapter for document open...');
        try {
          await this.loadLCSAdapter();
        } catch (error) {
          this.logger.error(
            `❌ Failed to load LCS adapter for document: ${error}`,
          );
          return;
        }
      }

      // Forward to LCS adapter for proper document processing
      if (this.isLCSLoaded && this.lcsAdapter) {
        await this.forwardDocumentEvent('open', params);
      }
    });

    this.connection.onDidChangeTextDocument(async (params) => {
      this.logger.info(`📝 Document changed: ${params.textDocument.uri}`);
      // Forward to LCS adapter for proper document processing
      if (this.isLCSLoaded && this.lcsAdapter) {
        await this.forwardDocumentEvent('change', params);
      }
    });

    this.connection.onDidSaveTextDocument(async (params) => {
      this.logger.info(`💾 Document saved: ${params.textDocument.uri}`);

      // Load LCS adapter if not already loaded for save processing
      if (!this.isLCSLoaded) {
        try {
          await this.loadLCSAdapter();
        } catch (error) {
          this.logger.error(`❌ Failed to load LCS adapter for save: ${error}`);
          return;
        }
      }

      // Forward to LCS adapter for proper document processing
      if (this.isLCSLoaded && this.lcsAdapter) {
        await this.forwardDocumentEvent('save', params);
      }
    });

    this.connection.onDidCloseTextDocument(async (params) => {
      this.logger.info(`📄 Document closed: ${params.textDocument.uri}`);
      // Forward to LCS adapter for proper document processing
      if (this.isLCSLoaded && this.lcsAdapter) {
        await this.forwardDocumentEvent('close', params);
      }
    });

    // Handle advanced requests by lazy-loading when needed
    this.connection.onHover(async (params) => {
      // console.log(
      //   `🔍 [LazyLSPServer] HOVER REQUEST: ${params.textDocument.uri} at ${params.position.line}:${params.position.character}`,
      // );
      this.logger.info(
        `🔍 HOVER REQUEST RECEIVED in LazyLSPServer: ${params.textDocument.uri} at ${params.position.line}:${params.position.character}`,
      );
      return this.withAdvancedFeatures('hover', params);
    });

    this.connection.onCompletion(async (params) => {
      this.logger.info(
        `💡 COMPLETION REQUEST RECEIVED: ${params.textDocument.uri} at ${params.position.line}:${params.position.character}`,
      );
      return this.withAdvancedFeatures('completion', params);
    });

    this.connection.onDefinition(async (params) => {
      this.logger.info(
        `🎯 DEFINITION REQUEST RECEIVED: ${params.textDocument.uri} at ${params.position.line}:${params.position.character}`,
      );
      return this.withAdvancedFeatures('definition', params);
    });

    this.connection.onDocumentSymbol(async (params) => {
      this.logger.info(
        `📋 DOCUMENT SYMBOL REQUEST RECEIVED: ${params.textDocument.uri}`,
      );
      return this.withAdvancedFeatures('documentSymbol', params);
    });

    // Start listening
    this.connection.listen();
  }

  /**
   * Get basic capabilities that don't require heavy dependencies
   */
  private getBasicCapabilities(): ServerCapabilities {
    return {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Advanced capabilities will be added dynamically
      hoverProvider: true,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['.', '('],
      },
      definitionProvider: true,
      documentSymbolProvider: true,
    };
  }

  /**
   * Handle requests that require advanced features by lazy-loading them
   */
  private async withAdvancedFeatures(
    operation: string,
    params: any,
  ): Promise<any> {
    // console.log(
    //   `🎯 [LazyLSPServer] withAdvancedFeatures called for ${operation}`,
    // );
    this.logger.info(`🎯 LazyLSPServer received ${operation} request`);

    try {
      // Load LCS adapter if not already loaded
      if (!this.isLCSLoaded) {
        // console.log(
        //   `🔄 [LazyLSPServer] Loading LCS adapter for ${operation}...`,
        // );
        this.logger.info(`🔄 Loading LCS adapter for ${operation}...`);
        await this.loadLCSAdapter();
      }

      // Delegate to the full LCS adapter
      if (this.lcsAdapter) {
        // console.log(
        //   `➡️ [LazyLSPServer] Delegating ${operation} to LCS adapter`,
        // );
        this.logger.info(`➡️ Delegating ${operation} to LCS adapter`);
        return await this.delegateToLCS(operation, params);
      }

      // Fallback for when advanced features aren't available
      // console.log(
      //   `⚠️ [LazyLSPServer] LCS adapter not available for ${operation}, using basic response`,
      // );
      this.logger.warn(
        `⚠️ LCS adapter not available for ${operation}, using basic response`,
      );
      return this.getBasicResponse(operation);
    } catch (error) {
      // console.log(
      //   `❌ [LazyLSPServer] Advanced feature ${operation} failed:`,
      //   error,
      // );
      this.logger.error(`❌ Advanced feature ${operation} failed:`, error);
      return this.getBasicResponse(operation);
    }
  }

  /**
   * Load the LCS adapter with all heavy dependencies
   */
  private async loadLCSAdapter(): Promise<void> {
    if (this.isLCSLoaded) return;

    // console.log('🔄 [LazyLSPServer] Loading advanced LSP features...');
    this.logger.info('🔄 Loading advanced LSP features...');

    try {
      // Load the LCS adapter dynamically
      // console.log('📦 [LazyLSPServer] Importing LCSAdapter...');
      const { LCSAdapter } = await import('./LCSAdapter');
      // console.log('✅ [LazyLSPServer] LCSAdapter imported successfully');

      // console.log('🔧 [LazyLSPServer] Creating LCSAdapter instance...');
      this.lcsAdapter = new LCSAdapter({
        connection: this.connection,
        logger: this.logger,
        delegationMode: true, // Don't set up connection listeners
      });
      // console.log('✅ [LazyLSPServer] LCSAdapter instance created');

      // console.log('🚀 [LazyLSPServer] Initializing LCSAdapter...');
      await this.lcsAdapter.initialize();
      this.isLCSLoaded = true;
      // console.log('✅ [LazyLSPServer] LCSAdapter initialized successfully');

      this.logger.info('✅ Advanced LSP features loaded successfully!');
    } catch (error) {
      // console.log(
      //   '❌ [LazyLSPServer] Failed to load advanced features:',
      //   error,
      // );
      this.logger.error('❌ Failed to load advanced features:', error);
      throw error;
    }
  }

  /**
   * Delegate operation to the full LCS adapter
   */
  private async delegateToLCS(operation: string, params: any): Promise<any> {
    // Map operation to LCS adapter method
    const methodMap: { [key: string]: string } = {
      hover: 'onHover',
      completion: 'onCompletion',
      definition: 'onDefinition',
      documentSymbol: 'onDocumentSymbol',
    };

    const method = methodMap[operation];
    // console.log(`🔄 [LazyLSPServer] Mapping ${operation} to method ${method}`);

    if (method && typeof this.lcsAdapter[method] === 'function') {
      // console.log(`✅ [LazyLSPServer] Calling ${method} on LCSAdapter`);
      const result = await this.lcsAdapter[method](params);
      // console.log(
      //   `✅ [LazyLSPServer] ${method} returned:`,
      //   result ? 'has result' : 'null/empty',
      // );
      return result;
    }

    // console.log(
    //   `❌ [LazyLSPServer] No method ${method} found, using basic response`,
    // );
    return this.getBasicResponse(operation);
  }

  /**
   * Get basic response when advanced features aren't available
   */
  private getBasicResponse(operation: string): any {
    switch (operation) {
      case 'hover':
        return null; // No hover info available
      case 'completion':
        return []; // No completions available
      case 'definition':
        return null; // No definition available
      case 'documentSymbol':
        return []; // No symbols available
      default:
        return null;
    }
  }

  /**
   * Forward document events to the LCS adapter
   */
  private async forwardDocumentEvent(
    eventType: string,
    params: any,
  ): Promise<void> {
    try {
      this.logger.debug(`Forwarding ${eventType} event to LCS adapter`);

      // CRITICAL FIX: Actually forward document events to LCS adapter
      // The assumption that TextDocuments will handle events automatically is incorrect
      // when in delegation mode - we need to explicitly call the LCS adapter methods
      if (this.lcsAdapter) {
        switch (eventType) {
          case 'open':
            // console.log(
            //   `🔄 [LazyLSPServer] Forwarding document open: ${params.textDocument.uri}`,
            // );
            await this.lcsAdapter.handleDocumentOpen?.(params);
            break;
          case 'change':
            // console.log(
            //   `🔄 [LazyLSPServer] Forwarding document change: ${params.textDocument.uri}`,
            // );
            await this.lcsAdapter.handleDocumentChange?.(params);
            break;
          case 'save':
            // console.log(
            //   `🔄 [LazyLSPServer] Forwarding document save: ${params.textDocument.uri}`,
            // );
            await this.lcsAdapter.handleDocumentSave?.(params);
            break;
          case 'close':
            // console.log(
            //   `🔄 [LazyLSPServer] Forwarding document close: ${params.textDocument.uri}`,
            // );
            await this.lcsAdapter.handleDocumentClose?.(params);
            break;
          default:
            this.logger.warn(`Unknown document event type: ${eventType}`);
        }
      } else {
        this.logger.warn(
          `Cannot forward ${eventType} event - LCS adapter not available`,
        );
      }
    } catch (error) {
      this.logger.error(`Error forwarding ${eventType} event:`, error);
    }
  }

  /**
   * Preload advanced features in the background
   */
  private async preloadAdvancedFeatures(): Promise<void> {
    // Don't block the main thread - load in background
    setTimeout(async () => {
      try {
        this.logger.info('🔄 Preloading advanced features...');
        await this.loadLCSAdapter();
        this.logger.info('✅ Preloading complete!');
      } catch (error) {
        this.logger.warn(
          '⚠️ Preloading failed - features will load on-demand:',
          error,
        );
      }
    }, 1000); // Start after 1 second delay
  }
}
