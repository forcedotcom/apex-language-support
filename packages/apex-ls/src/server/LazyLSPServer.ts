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
  DidOpenTextDocumentParams,
  DidChangeTextDocumentParams,
  DidSaveTextDocumentParams,
  DidCloseTextDocumentParams,
} from 'vscode-languageserver/browser';
import { Effect } from 'effect';

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
  constructor(connection: Connection, logger: Logger) {
    this.connection = connection;
    this.logger = logger;
    this.setupBasicHandlers();

    // CRITICAL: Start listening for LSP messages from the client
    this.connection.listen();
    this.logger.info(
      '🎧 LazyLSPServer connection started - listening for LSP messages',
    );
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
      this.logger.info(
        `📄 Document language: ${params.textDocument.languageId}`,
      );
      this.logger.info(`📄 Document version: ${params.textDocument.version}`);
      this.logger.info(
        `📄 Document content length: ${params.textDocument.text.length}`,
      );

      // Load LCS adapter if not already loaded
      if (!this.isLCSLoaded) {
        this.logger.info('🔄 Loading LCS adapter for document open...');
        try {
          await this.ensureLcsAdapterLoaded();
          this.logger.info(
            '✅ LCS adapter loaded successfully for document open',
          );
        } catch (error) {
          this.logger.error(
            `❌ Failed to load LCS adapter for document: ${error}`,
          );
          return;
        }
      }

      // Forward to LCS adapter for proper document processing
      if (this.isLCSLoaded && this.lcsAdapter) {
        this.logger.info('📤 Forwarding document open to LCS adapter...');
        await this.forwardDocumentEvent('open', params);
        this.logger.info('✅ Document open forwarded successfully');
      } else {
        this.logger.warn('⚠️ LCS adapter not available for document open');
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
          await this.ensureLcsAdapterLoaded();
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

    // Handle workspace/configuration requests
    this.connection.onRequest('workspace/configuration', async (params) => {
      this.logger.info('⚙️ Configuration requested');

      // Return empty configuration for now - this prevents the "Unhandled method" error
      // The LCS adapter can provide more sophisticated configuration handling when loaded
      return params.items.map(() => ({}));
    });

    // Handle document symbol requests (outline)
    this.connection.onDocumentSymbol(async (params) => {
      this.logger.info(
        `🔍 Document symbols requested for: ${params.textDocument.uri}`,
      );
      this.logger.info(`🔍 Document symbols params: ${JSON.stringify(params)}`);

      // Load LCS adapter if not already loaded
      if (!this.isLCSLoaded) {
        this.logger.info('🔄 Loading LCS adapter for document symbols...');
        try {
          await this.ensureLcsAdapterLoaded();
          this.logger.info(
            '✅ LCS adapter loaded successfully for document symbols',
          );
        } catch (error) {
          this.logger.error(
            `❌ Failed to load LCS adapter for symbols: ${error}`,
          );
          return [];
        }
      }

      // Forward to LCS dispatch function for proper symbol processing
      if (this.isLCSLoaded) {
        this.logger.info('📤 Forwarding document symbol request to LCS...');
        const result = await this.forwardLspRequest('documentSymbol', params);
        this.logger.info(
          `📥 LCS returned ${Array.isArray(result) ? result.length : 'null'} symbols`,
        );
        this.logger.info(`📥 Symbol result: ${JSON.stringify(result)}`);
        return result;
      }

      // Return empty symbols array if LCS adapter not available
      this.logger.warn('⚠️ LCS adapter not available, returning empty symbols');
      return [];
    });

    // Handle hover requests
    this.connection.onHover(async (params) => {
      this.logger.info(`🔍 Hover requested for: ${params.textDocument.uri}`);

      // Load LCS adapter if not already loaded
      if (!this.isLCSLoaded) {
        this.logger.info('🔄 Loading LCS adapter for hover...');
        try {
          await this.ensureLcsAdapterLoaded();
        } catch (error) {
          this.logger.error(
            `❌ Failed to load LCS adapter for hover: ${error}`,
          );
          return null;
        }
      }

      // Forward to LCS dispatch function for proper hover processing
      if (this.isLCSLoaded) {
        return await this.forwardLspRequest('hover', params);
      }

      // Return null if LCS adapter not available
      return null;
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
      textDocumentSync: TextDocumentSyncKind.Full,
      hoverProvider: true,
      documentSymbolProvider: true,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['.', ' '],
      },
    };
  }

  /**
   * Preload advanced features in the background using Effect.fork.
   * This method is called after the server is initialized to load
   * the full LCSAdapter without blocking the initial response.
   */
  private preloadAdvancedFeatures(): void {
    const self = this;

    // Fork the preloading operation to run in the background
    Effect.runFork(
      Effect.gen(function* (_) {
        self.logger.info('🔄 Preloading advanced LSP features...');

        // Fork the LCS adapter loading to run concurrently
        yield* _(
          Effect.fork(Effect.promise(() => self.ensureLcsAdapterLoaded())),
        );

        self.logger.info('✅ Advanced LSP features preloaded successfully!');
      }).pipe(
        Effect.catchAll((error) =>
          Effect.sync(() => {
            self.logger.error(
              `❌ Failed to preload advanced features: ${error}`,
            );
          }),
        ),
      ),
    );

    this.logger.info(
      '🚀 Background preloading of advanced LSP features started...',
    );
  }

  /**
   * Ensure the LCS adapter is loaded, loading it if not already loaded.
   * This method is idempotent - it will only load the adapter once and
   * subsequent calls will return immediately if already loaded.
   *
   * Uses Effect-TS patterns internally while maintaining Promise interface
   * for backward compatibility. In delegation mode, the adapter does not
   * set up its own protocol handlers because this LazyLSPServer handles
   * the protocol and forwards requests.
   *
   * @throws Error if adapter fails to load
   */
  private async ensureLcsAdapterLoaded(): Promise<void> {
    if (this.isLCSLoaded) {
      this.logger.info('✅ LCS adapter already loaded, skipping...');
      return;
    }

    const self = this;

    this.logger.info('🚀 Starting LCS adapter loading process...');

    // Use Effect-TS patterns internally while maintaining Promise interface
    const loadEffect = Effect.gen(function* (_) {
      self.logger.info('📦 Loading LCS Adapter...');

      // Dynamic import using Effect.promise
      self.logger.info('📥 Importing LCSAdapter module...');
      const { LCSAdapter } = yield* _(
        Effect.promise(() => import('./LCSAdapter')),
      );
      self.logger.info('✅ LCSAdapter module imported successfully');

      // Create and initialize LCS adapter instance using factory method
      self.logger.info('🏗️ Creating LCS adapter instance...');
      const lcsAdapter = yield* _(
        Effect.promise(() =>
          LCSAdapter.create({
            connection: self.connection,
            logger: self.logger,
            delegationMode: true, // Don't set up connection listeners
          }),
        ),
      );
      self.logger.info('✅ LCS adapter instance created successfully');

      // Update state
      self.lcsAdapter = lcsAdapter;
      self.isLCSLoaded = true;

      self.logger.info('✅ LCS Adapter loaded successfully!');
    }).pipe(
      Effect.catchAll((error) =>
        Effect.gen(function* (_) {
          self.logger.error(`❌ Failed to load LCS Adapter: ${error}`);
          self.logger.error(
            `❌ Error stack: ${(error as Error)?.stack || 'No stack trace'}`,
          );
          return yield* _(Effect.fail(error));
        }),
      ),
    );

    // Convert Effect to Promise for backward compatibility
    await Effect.runPromise(loadEffect);
    this.logger.info('🎉 LCS adapter loading process completed successfully');
  }

  /**
   * Forward document events to LCS adapter
   * @param eventType - Type of document event (open, change, save, close)
   * @param params - Event parameters
   */
  private async forwardDocumentEvent(
    eventType: 'open',
    params: DidOpenTextDocumentParams,
  ): Promise<void>;
  private async forwardDocumentEvent(
    eventType: 'change',
    params: DidChangeTextDocumentParams,
  ): Promise<void>;
  private async forwardDocumentEvent(
    eventType: 'save',
    params: DidSaveTextDocumentParams,
  ): Promise<void>;
  private async forwardDocumentEvent(
    eventType: 'close',
    params: DidCloseTextDocumentParams,
  ): Promise<void>;
  private async forwardDocumentEvent(
    eventType: 'open' | 'change' | 'save' | 'close',
    params:
      | DidOpenTextDocumentParams
      | DidChangeTextDocumentParams
      | DidSaveTextDocumentParams
      | DidCloseTextDocumentParams,
  ): Promise<void> {
    if (!this.lcsAdapter) {
      return;
    }

    try {
      switch (eventType) {
        case 'open':
          if (this.lcsAdapter.handleDocumentOpen) {
            await this.lcsAdapter.handleDocumentOpen(
              params as DidOpenTextDocumentParams,
            );
          }
          break;
        case 'change':
          if (this.lcsAdapter.handleDocumentChange) {
            await this.lcsAdapter.handleDocumentChange(
              params as DidChangeTextDocumentParams,
            );
          }
          break;
        case 'save':
          if (this.lcsAdapter.handleDocumentSave) {
            await this.lcsAdapter.handleDocumentSave(
              params as DidSaveTextDocumentParams,
            );
          }
          break;
        case 'close':
          if (this.lcsAdapter.handleDocumentClose) {
            await this.lcsAdapter.handleDocumentClose(
              params as DidCloseTextDocumentParams,
            );
          }
          break;
      }
    } catch (error) {
      this.logger.error(`❌ Error forwarding ${eventType} event: ${error}`);
    }
  }

  /**
   * Forward LSP requests to the LCS dispatch functions for processing
   * @param requestType - Type of LSP request (documentSymbol, hover, etc.)
   * @param params - Request parameters
   * @returns The result from the LCS dispatch function
   */
  private async forwardLspRequest(
    requestType: string,
    params: any,
  ): Promise<any> {
    this.logger.info(`🔀 forwardLspRequest called with type: ${requestType}`);
    try {
      // Import LCS dispatch functions dynamically
      this.logger.info('📦 Importing LCS dispatch functions...');
      const { dispatchProcessOnDocumentSymbol, dispatchProcessOnHover } =
        await import('@salesforce/apex-lsp-compliant-services');
      this.logger.info('✅ LCS dispatch functions imported successfully');

      switch (requestType) {
        case 'documentSymbol':
          this.logger.info('📋 Calling dispatchProcessOnDocumentSymbol...');
          const symbolResult = await dispatchProcessOnDocumentSymbol(params);
          this.logger.info(
            `📋 dispatchProcessOnDocumentSymbol returned: ${Array.isArray(symbolResult) ? symbolResult.length : 'null'} symbols`,
          );
          return symbolResult;
        case 'hover':
          this.logger.info('🔍 Calling dispatchProcessOnHover...');
          const hoverResult = await dispatchProcessOnHover(params);
          this.logger.info(
            `🔍 dispatchProcessOnHover returned: ${hoverResult ? 'result' : 'null'}`,
          );
          return hoverResult;
        default:
          this.logger.warn(`Unknown LSP request type: ${requestType}`);
          return null;
      }
    } catch (error) {
      this.logger.error(`❌ Error forwarding ${requestType} request: ${error}`);
      this.logger.error(
        `❌ Error stack: ${(error as Error)?.stack || 'No stack trace'}`,
      );
      return requestType === 'documentSymbol' ? [] : null;
    }
  }
}
