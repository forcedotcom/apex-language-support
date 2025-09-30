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

import type { Logger } from '@salesforce/apex-lsp-shared';
import type { LCSAdapter } from './LCSAdapter';

/**
 * Lightweight LSP server that starts immediately with basic capabilities
 * and lazy-loads advanced features on demand.
 *
 * This server architecture solves the debugging issue by separating
 * web worker connection management from desktop debugging capabilities.
 * It provides basic LSP handlers immediately and loads the full LCSAdapter
 * in the background after initialization.
 */
export class LazyLSPServer {
  private readonly connection: Connection;
  private readonly logger: Logger;
  private lcsAdapter: LCSAdapter | null = null;
  private isLCSLoaded = false;

  /**
   * Delay in milliseconds to allow basic initialization to complete before loading heavy dependencies.
   */
  private static readonly LCS_PRELOAD_DELAY_MS = 100;

  constructor(connection: Connection, logger: Logger) {
    this.connection = connection;
    this.logger = logger;
    this.setupBasicHandlers();
  }

  /**
   * Set up basic LSP handlers that work without heavy dependencies.
   * These handlers provide immediate response to LSP requests while the
   * full adapter is loading in the background.
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
      this.logger.info(
        `🔍 HOVER REQUEST: ${params.textDocument.uri} at ${params.position.line}:${params.position.character}`,
      );

      // Load LCS adapter if not already loaded
      if (!this.isLCSLoaded) {
        try {
          await this.loadLCSAdapter();
        } catch (error) {
          this.logger.error(`❌ Failed to load LCS for hover: ${error}`);
          return null;
        }
      }

      // Delegate to LCS adapter
      if (this.lcsAdapter && this.lcsAdapter.onHover) {
        return await this.lcsAdapter.onHover(params);
      }

      return null;
    });

    this.connection.onDocumentSymbol(async (params) => {
      this.logger.info(`📋 Document symbols: ${params.textDocument.uri}`);

      // Load LCS adapter if not already loaded
      if (!this.isLCSLoaded) {
        try {
          await this.loadLCSAdapter();
        } catch (error) {
          this.logger.error(`❌ Failed to load LCS for symbols: ${error}`);
          return [];
        }
      }

      // Delegate to LCS adapter
      if (this.lcsAdapter && this.lcsAdapter.onDocumentSymbol) {
        return await this.lcsAdapter.onDocumentSymbol(params);
      }

      return [];
    });

    this.connection.onCompletion(async (params) => {
      this.logger.info(`🔤 Completion: ${params.textDocument.uri}`);

      // Load LCS adapter if not already loaded
      if (!this.isLCSLoaded) {
        try {
          await this.loadLCSAdapter();
        } catch (error) {
          this.logger.error(`❌ Failed to load LCS for completion: ${error}`);
          return [];
        }
      }

      // Delegate to LCS adapter
      if (this.lcsAdapter && this.lcsAdapter.onCompletion) {
        return await this.lcsAdapter.onCompletion(params);
      }

      return [];
    });
  }

  /**
   * Get basic server capabilities that are available immediately.
   * These capabilities are advertised to the client before the full
   * adapter is loaded.
   * @returns Basic server capabilities
   */
  private getBasicCapabilities(): ServerCapabilities {
    return {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      hoverProvider: true,
      documentSymbolProvider: true,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['.', ' '],
      },
    };
  }

  /**
   * Preload advanced features in the background.
   * This method is called after the server is initialized to load
   * the full LCSAdapter without blocking the initial response.
   */
  private async preloadAdvancedFeatures(): Promise<void> {
    try {
      // Small delay to let basic initialization complete
      await new Promise((resolve) =>
        setTimeout(resolve, LazyLSPServer.LCS_PRELOAD_DELAY_MS),
      );

      this.logger.info('🔄 Preloading advanced LSP features...');
      await this.loadLCSAdapter();
    } catch (error) {
      this.logger.error(`❌ Failed to preload advanced features: ${error}`);
    }
  }

  /**
   * Load the LCS adapter with delegation mode.
   * In delegation mode, the adapter does not set up its own protocol handlers
   * because this LazyLSPServer handles the protocol and forwards requests.
   * @throws Error if adapter fails to load
   */
  private async loadLCSAdapter(): Promise<void> {
    if (this.isLCSLoaded) {
      return;
    }

    try {
      this.logger.info('📦 Loading LCS Adapter...');

      const { LCSAdapter } = await import('./LCSAdapter');

      this.lcsAdapter = new LCSAdapter({
        connection: this.connection,
        logger: this.logger,
        delegationMode: true, // Don't set up connection listeners
      });

      await this.lcsAdapter.initialize();
      this.isLCSLoaded = true;

      this.logger.info('✅ Advanced LSP features loaded successfully!');
    } catch (error) {
      this.logger.error(`❌ Failed to load LCS Adapter: ${error}`);
      throw error;
    }
  }

  /**
   * Forward document events to LCS adapter
   * @param eventType - Type of document event (open, change, save, close)
   * @param params - Event parameters
   */
  private async forwardDocumentEvent(
    eventType: string,
    params: any,
  ): Promise<void> {
    if (!this.lcsAdapter) {
      return;
    }

    try {
      switch (eventType) {
        case 'open':
          if (this.lcsAdapter.handleDocumentOpen) {
            await this.lcsAdapter.handleDocumentOpen(params);
          }
          break;
        case 'change':
          if (this.lcsAdapter.handleDocumentChange) {
            await this.lcsAdapter.handleDocumentChange(params);
          }
          break;
        case 'save':
          if (this.lcsAdapter.handleDocumentSave) {
            await this.lcsAdapter.handleDocumentSave(params);
          }
          break;
        case 'close':
          if (this.lcsAdapter.handleDocumentClose) {
            await this.lcsAdapter.handleDocumentClose(params);
          }
          break;
      }
    } catch (error) {
      this.logger.error(`❌ Error forwarding ${eventType} event: ${error}`);
    }
  }
}
