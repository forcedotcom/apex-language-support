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
  TextDocuments,
  DocumentSymbolParams,
  DidChangeConfigurationNotification,
  DidChangeConfigurationParams,
  HoverParams,
  Hover,
  DocumentDiagnosticParams,
  DocumentDiagnosticReport,
  DocumentDiagnosticReportKind,
  FoldingRangeParams,
} from 'vscode-languageserver/browser';
import { TextDocument } from 'vscode-languageserver-textdocument';

import {
  UniversalLoggerFactory,
  LoggerInterface,
  InitializeResult,
} from '@salesforce/apex-lsp-shared';

import {
  dispatchProcessOnOpenDocument,
  dispatchProcessOnChangeDocument,
  dispatchProcessOnSaveDocument,
  dispatchProcessOnCloseDocument,
  dispatchProcessOnDocumentSymbol,
  dispatchProcessOnHover,
  dispatchProcessOnFoldingRange,
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
 */
export class LCSAdapter {
  private readonly connection: Connection;
  private readonly logger: LoggerInterface;
  private readonly documents: TextDocuments<TextDocument>;
  private hasConfigurationCapability = false;
  private hasWorkspaceFolderCapability = false;
  private readonly diagnosticProcessor: DiagnosticProcessingService;
  private hoverHandlerRegistered = false;

  private constructor(config: LCSAdapterConfig) {
    this.connection = config.connection;
    this.logger = config.logger ?? this.createDefaultLogger();
    this.documents = new TextDocuments(TextDocument);

    this.diagnosticProcessor = new DiagnosticProcessingService(this.logger);

    // Detect development mode early and set server mode accordingly
    this.detectAndSetDevelopmentMode();

    this.setupEventHandlers();
  }

  /**
   * Create and initialize a new LCS adapter instance.
   */
  static async create(config: LCSAdapterConfig): Promise<LCSAdapter> {
    const adapter = new LCSAdapter(config);
    await adapter.initialize();
    return adapter;
  }

  /**
   * Internal initialization (register handlers, prepare services)
   */
  private async initialize(): Promise<void> {
    this.logger.info('🚀 LCS Adapter initializing...');

    try {
      const storageManager = ApexStorageManager.getInstance({
        storageFactory: () => ApexStorage.getInstance(),
        autoPersistIntervalMs: 30000,
      });
      await storageManager.initialize();
      this.logger.debug('✅ ApexStorageManager initialized successfully');
    } catch (error) {
      this.logger.error(`❌ Failed to initialize ApexStorageManager: ${error}`);
    }

    this.setupDocumentHandlers();

    // Document listener — safe now
    this.documents.listen(this.connection);

    this.logger.info(
      '✅ LCS Adapter setup complete (awaiting client initialize...)',
    );
  }

  private createDefaultLogger(): LoggerInterface {
    const factory = UniversalLoggerFactory.getInstance();
    return factory.createLogger(this.connection);
  }

  /**
   * Basic event handlers (initialize, initialized, config changes)
   */
  private setupEventHandlers(): void {
    this.connection.onInitialize(this.handleInitialize.bind(this));
    this.connection.onInitialized(this.handleInitialized.bind(this));
    this.connection.onDidChangeConfiguration(
      this.handleConfigurationChange.bind(this),
    );
  }

  /**
   * Document lifecycle handlers
   */
  private setupDocumentHandlers(): void {
    this.documents.onDidOpen(async (open) => {
      try {
        this.logger.debug(`Document opened: ${open.document.uri}`);
        await dispatchProcessOnOpenDocument(open);
      } catch (error) {
        this.logger.error(`Error processing open: ${error}`);
      }
    });

    this.documents.onDidChangeContent(async (change) => {
      try {
        this.logger.debug(`Document changed: ${change.document.uri}`);
        await dispatchProcessOnChangeDocument(change);
      } catch (error) {
        this.logger.error(`Error processing change: ${error}`);
      }
    });

    this.documents.onDidSave(async (save) => {
      try {
        await dispatchProcessOnSaveDocument(save);
      } catch (error) {
        this.logger.error(`Error processing save: ${error}`);
      }
    });

    this.documents.onDidClose(async (close) => {
      try {
        await dispatchProcessOnCloseDocument(close);
      } catch (error) {
        this.logger.error(`Error processing close: ${error}`);
      }
    });
  }

  /**
   * LSP protocol handlers (hover, diagnostics, etc.)
   */
  private setupProtocolHandlers(): void {
    const capabilities =
      LSPConfigurationManager.getInstance().getCapabilities();

    // Only register document symbol handler if the capability is enabled
    if (capabilities.documentSymbolProvider) {
      this.connection.onDocumentSymbol(async (params: DocumentSymbolParams) => {
        try {
          return await dispatchProcessOnDocumentSymbol(params);
        } catch (error) {
          this.logger.error(`Error processing document symbols: ${error}`);
          return [];
        }
      });
      this.logger.debug('✅ Document symbol handler registered');
    } else {
      this.logger.debug(
        '⚠️ Document symbol handler not registered (capability disabled)',
      );
    }

    // Note: onHover will be registered after client configuration is received
    // to ensure server mode is properly set before enabling hover support

    // Only register diagnostics handler if the capability is enabled
    if (capabilities.diagnosticProvider) {
      this.connection.languages.diagnostics.on(
        async (
          params: DocumentDiagnosticParams,
        ): Promise<DocumentDiagnosticReport> => {
          try {
            const diagnostics =
              await this.diagnosticProcessor.processDiagnostic(params);
            return {
              kind: DocumentDiagnosticReportKind.Full,
              items: diagnostics,
            };
          } catch (error) {
            this.logger.error(`Error processing diagnostics: ${error}`);
            return { kind: DocumentDiagnosticReportKind.Full, items: [] };
          }
        },
      );
      this.logger.debug('✅ Diagnostics handler registered');
    } else {
      this.logger.debug(
        '⚠️ Diagnostics handler not registered (capability disabled)',
      );
    }

    // Only register folding range handler if the capability is enabled
    if (capabilities.foldingRangeProvider) {
      this.connection.languages.foldingRange.on(
        async (params: FoldingRangeParams) => {
          try {
            const storage = ApexStorageManager.getInstance().getStorage();
            return await dispatchProcessOnFoldingRange(params, storage);
          } catch (error) {
            this.logger.error(`Error processing folding ranges: ${error}`);
            return [];
          }
        },
      );
      this.logger.debug('✅ Folding range handler registered');
    } else {
      this.logger.debug(
        '⚠️ Folding range handler not registered (capability disabled)',
      );
    }

    if (capabilities.hoverProvider) {
      this.registerHoverHandler();
      this.logger.debug('✅ Hover handler registered');
    } else {
      this.logger.debug(
        '⚠️ Hover handler not registered (capability disabled)',
      );
    }
  }

  /**
   * Handle client `initialize` request
   */
  private handleInitialize(params: InitializeParams): InitializeResult {
    console.debug(
      `🔧 Initialize request received. Params: ${JSON.stringify(params, null, 2)}`,
    );
    this.logger.info(
      () =>
        `🔧 Initialize request received. Params: ${JSON.stringify(params, null, 2)}`,
    );

    this.hasConfigurationCapability =
      !!params.capabilities.workspace?.configuration;
    this.hasWorkspaceFolderCapability =
      !!params.capabilities.workspace?.workspaceFolders;

    const configManager = LSPConfigurationManager.getInstance();

    configManager.setInitialSettings(params.initializationOptions);
    // Get current capabilities (will be production by default)
    const capabilities = configManager.getCapabilities();

    console.debug(
      `Server capabilities returned: ${JSON.stringify(capabilities, null, 2)}`,
    );

    return {
      capabilities,
    };
  }

  /**
   * Handle client `initialized` notification
   */
  private async handleInitialized(): Promise<void> {
    this.logger.info('🎉 Server initialized');

    if (this.hasConfigurationCapability) {
      this.logger.debug('Registering didChangeConfiguration notification');
      await this.connection.client.register(
        DidChangeConfigurationNotification.type,
      );

      this.setupProtocolHandlers();

      this.logger.debug('✅ Initial workspace configuration loaded');
    }

    if (this.hasWorkspaceFolderCapability) {
      this.connection.workspace.onDidChangeWorkspaceFolders((_event) => {
        this.logger.info('Workspace folder change event received.');
      });
    }
  }

  /**
   * Handle client configuration changes
   */
  private async handleConfigurationChange(
    change: DidChangeConfigurationParams,
  ): Promise<void> {
    this.logger.debug('📋 Configuration change received');

    // Only log the settings part to avoid serialization issues
    if (change?.settings) {
      this.logger.debug(
        `Configuration settings: ${JSON.stringify(change.settings, null, 2)}`,
      );
    } else {
      this.logger.debug('Configuration change has no settings');
    }

    // Handle null or invalid configuration changes
    if (!change || change.settings === null || change.settings === undefined) {
      this.logger.warn(
        '⚠️ Received null/undefined configuration change, skipping update',
      );
      return;
    }

    const success =
      LSPConfigurationManager.getInstance().updateFromLSPConfiguration(change);
    this.logger.debug(
      `Configuration update ${success ? 'succeeded' : 'failed'}`,
    );

    // Check if we need to update server mode based on client configuration
    this.updateServerModeIfNeeded(change);

    const revalidationPromises = this.documents.all().map(async (document) => {
      try {
        this.connection.sendDiagnostics({ uri: document.uri, diagnostics: [] });
      } catch (error) {
        this.logger.error(`Error revalidating ${document.uri}: ${error}`);
      }
    });
    await Promise.all(revalidationPromises);
  }

  public getConnection(): Connection {
    return this.connection;
  }

  public getLogger(): LoggerInterface {
    return this.logger;
  }

  /**
   * Update server mode if needed based on client configuration
   */
  private updateServerModeIfNeeded(change: DidChangeConfigurationParams): void {
    try {
      const settings = change.settings?.apex;
      if (!settings) {
        return;
      }

      this.updateServerModeFromSettings(settings);
    } catch (error) {
      this.logger.error(`Error updating server mode: ${error}`);
    }
  }

  /**
   * Update server mode from settings
   */
  private updateServerModeFromSettings(settings: any): void {
    try {
      // Get the server mode from the client settings
      const clientServerMode = settings.environment?.serverMode;
      if (!clientServerMode) {
        return;
      }

      const configManager = LSPConfigurationManager.getInstance();
      const currentMode = configManager.getCapabilitiesManager().getMode();

      // Update server mode if it differs from the client's setting
      if (currentMode !== clientServerMode) {
        this.logger.info(
          `🔄 Client server mode is '${clientServerMode}',` +
            ` updating server from '${currentMode}' to '${clientServerMode}'`,
        );
        configManager.updateServerMode(clientServerMode);

        // Register hover handler if we're now in development mode
        if (clientServerMode === 'development') {
          this.registerHoverHandler();
        }
      }
    } catch (error) {
      this.logger.error(`Error updating server mode from settings: ${error}`);
    }
  }

  /**
   * Detect development mode early and set server mode accordingly
   */
  private detectAndSetDevelopmentMode(): void {
    try {
      // Check for development mode indicators
      const apexLsMode = process?.env?.APEX_LS_MODE;
      const nodeEnv = process?.env?.NODE_ENV;

      this.logger.debug(
        `🔍 Environment variables: APEX_LS_MODE=${apexLsMode}, NODE_ENV=${nodeEnv}`,
      );

      const isDevelopment =
        apexLsMode === 'development' || nodeEnv === 'development';

      if (isDevelopment) {
        this.logger.info(
          '🔧 Development mode detected via environment variables, initializing server in development mode',
        );

        // Initialize LSPConfigurationManager (will auto-detect development mode)
        const configManager = LSPConfigurationManager.getInstance();

        // Verify the mode was set correctly
        const currentMode = configManager.getCapabilitiesManager().getMode();
        this.logger.debug(`✅ Server mode set to: ${currentMode}`);

        // Register hover handler immediately for development mode
        this.registerHoverHandler();
      } else {
        this.logger.debug(
          '🔧 Production mode detected, server will use production capabilities',
        );
      }
    } catch (error) {
      this.logger.error(`Error detecting development mode: ${error}`);
    }
  }

  /**
   * Register the hover handler (only when capability is enabled)
   */
  private registerHoverHandler(): void {
    console.debug('Registering hover handler');

    // Check if hover handler is already registered
    if (this.hoverHandlerRegistered) {
      return;
    }

    // Check if hover capability is enabled
    const capabilities =
      LSPConfigurationManager.getInstance().getCapabilities();
    if (!capabilities.hoverProvider) {
      this.logger.debug(
        '⚠️ Hover handler not registered (hoverProvider capability disabled)',
      );
      return;
    }

    this.connection.onHover(
      async (params: HoverParams): Promise<Hover | null> => {
        this.logger.debug(
          `🔍 [LCSAdapter] Hover request received for ${params.textDocument.uri}` +
            ` at ${params.position.line}:${params.position.character}`,
        );
        try {
          const result = await dispatchProcessOnHover(params);
          this.logger.debug(
            `✅ [LCSAdapter] Hover request completed for ${params.textDocument.uri}: ${result ? 'success' : 'null'}`,
          );
          return result;
        } catch (error) {
          this.logger.error(`Error processing hover: ${error}`);
          return null;
        }
      },
    );

    this.hoverHandlerRegistered = true;
    this.logger.info(
      '✅ Hover handler registered (hoverProvider capability enabled)',
    );
  }
}
