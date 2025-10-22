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
  DefinitionParams,
  Location,
  DocumentDiagnosticParams,
  DocumentDiagnosticReport,
  DocumentDiagnosticReportKind,
  FoldingRangeParams,
  ClientCapabilities,
  Registration,
  ServerCapabilities,
} from 'vscode-languageserver/browser';
import { TextDocument } from 'vscode-languageserver-textdocument';

import {
  UniversalLoggerFactory,
  LoggerInterface,
  InitializeResult,
  LSPConfigurationManager,
  FindMissingArtifactParams,
  FindMissingArtifactResult,
} from '@salesforce/apex-lsp-shared';

import {
  dispatchProcessOnOpenDocument,
  dispatchProcessOnChangeDocument,
  dispatchProcessOnSaveDocument,
  dispatchProcessOnCloseDocument,
  dispatchProcessOnDocumentSymbol,
  dispatchProcessOnHover,
  dispatchProcessOnDefinition,
  dispatchProcessOnFoldingRange,
  dispatchProcessOnFindMissingArtifact,
  DiagnosticProcessingService,
  ApexStorageManager,
  ApexStorage,
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
  private clientCapabilities?: ClientCapabilities;

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
        this.logger.debug(
          `🔍 Document symbol request for URI: ${params.textDocument.uri}`,
        );
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

    // Only register definition handler if the capability is enabled
    if (capabilities.definitionProvider) {
      this.connection.onDefinition(
        async (params: DefinitionParams): Promise<Location[] | null> => {
          this.logger.debug(
            `🔍 Definition request for URI: ${params.textDocument.uri} ` +
              `at ${params.position.line}:${params.position.character}`,
          );
          try {
            return await dispatchProcessOnDefinition(params);
          } catch (error) {
            this.logger.error(`Error processing definition: ${error}`);
            return null;
          }
        },
      );
      this.logger.debug('✅ Definition handler registered');
    } else {
      this.logger.debug(
        '⚠️ Definition handler not registered (capability disabled)',
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
          this.logger.debug(
            `🔍 Folding range request for URI: ${params.textDocument.uri}`,
          );
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

    // Register custom apex/findMissingArtifact handler
    this.connection.onRequest(
      'apex/findMissingArtifact',
      async (
        params: FindMissingArtifactParams,
      ): Promise<FindMissingArtifactResult> => {
        this.logger.debug(
          `🔍 apex/findMissingArtifact request received for: ${params.identifier}`,
        );
        try {
          return await dispatchProcessOnFindMissingArtifact(params);
        } catch (error) {
          this.logger.error(`Error processing findMissingArtifact: ${error}`);
          return { notFound: true };
        }
      },
    );
    this.logger.debug('✅ apex/findMissingArtifact handler registered');
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

    // Store client capabilities for later dynamic registration
    this.clientCapabilities = params.capabilities;

    this.hasConfigurationCapability =
      !!params.capabilities.workspace?.configuration;
    this.hasWorkspaceFolderCapability =
      !!params.capabilities.workspace?.workspaceFolders;

    const configManager = LSPConfigurationManager.getInstance();
    configManager.setInitialSettings(params.initializationOptions);

    // Set the LSP connection for missing artifact resolution
    configManager.setConnection(this.connection);

    // Sync capabilities with settings before returning
    configManager.syncCapabilitiesWithSettings();

    // Get all capabilities from manager based on mode
    const allCapabilities = configManager.getCapabilities();

    // Build static capabilities: baseline + non-dynamic capabilities
    const staticCapabilities: ServerCapabilities = {
      // Always return baseline capabilities statically
      textDocumentSync: allCapabilities.textDocumentSync,
      workspace: allCapabilities.workspace,
      // Include experimental capabilities
      experimental: allCapabilities.experimental,
    };

    // Add capabilities that client doesn't support dynamic registration for
    if (
      allCapabilities.documentSymbolProvider &&
      !params.capabilities.textDocument?.documentSymbol?.dynamicRegistration
    ) {
      staticCapabilities.documentSymbolProvider =
        allCapabilities.documentSymbolProvider;
    }

    if (
      allCapabilities.hoverProvider &&
      !params.capabilities.textDocument?.hover?.dynamicRegistration
    ) {
      staticCapabilities.hoverProvider = allCapabilities.hoverProvider;
    }

    if (
      allCapabilities.foldingRangeProvider &&
      !params.capabilities.textDocument?.foldingRange?.dynamicRegistration
    ) {
      staticCapabilities.foldingRangeProvider =
        allCapabilities.foldingRangeProvider;
    }

    if (
      allCapabilities.diagnosticProvider &&
      !params.capabilities.textDocument?.diagnostic?.dynamicRegistration
    ) {
      staticCapabilities.diagnosticProvider =
        allCapabilities.diagnosticProvider;
    }

    if (
      allCapabilities.completionProvider &&
      !params.capabilities.textDocument?.completion?.dynamicRegistration
    ) {
      staticCapabilities.completionProvider =
        allCapabilities.completionProvider;
    }

    console.debug(
      `Server capabilities returned: ${JSON.stringify(staticCapabilities, null, 2)}`,
    );

    return {
      capabilities: staticCapabilities,
    };
  }

  /**
   * Check if client supports dynamic registration for a specific capability
   */
  private supportsDynamicRegistration(capability: string): boolean {
    if (!this.clientCapabilities) {
      return false;
    }

    switch (capability) {
      case 'documentSymbol':
        return !!this.clientCapabilities.textDocument?.documentSymbol
          ?.dynamicRegistration;
      case 'hover':
        return !!this.clientCapabilities.textDocument?.hover
          ?.dynamicRegistration;
      case 'foldingRange':
        return !!this.clientCapabilities.textDocument?.foldingRange
          ?.dynamicRegistration;
      case 'diagnostic':
        return !!this.clientCapabilities.textDocument?.diagnostic
          ?.dynamicRegistration;
      case 'completion':
        return !!this.clientCapabilities.textDocument?.completion
          ?.dynamicRegistration;
      case 'definition':
        return !!this.clientCapabilities.textDocument?.definition
          ?.dynamicRegistration;
      default:
        return false;
    }
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
    }

    // NEW: Dynamically register feature capabilities
    await this.registerDynamicCapabilities();

    // Setup protocol handlers after registration
    this.setupProtocolHandlers();

    if (this.hasConfigurationCapability) {
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

    const configManager = LSPConfigurationManager.getInstance();
    const previousCapabilities = configManager.getCapabilities();

    const success = configManager.updateFromLSPConfiguration(change);
    this.logger.debug(
      `Configuration update ${success ? 'succeeded' : 'failed'}`,
    );

    if (success) {
      const newCapabilities = configManager.getCapabilities();

      // Check if findMissingArtifact capability changed
      const previousEnabled =
        previousCapabilities.experimental?.findMissingArtifactProvider?.enabled;
      const newEnabled =
        newCapabilities.experimental?.findMissingArtifactProvider?.enabled;

      if (previousEnabled !== newEnabled) {
        this.logger.info(
          `Missing artifact capability changed: ${previousEnabled} → ${newEnabled}`,
        );
        // Could send custom notification to client here if needed
      }
    }

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
   * Dynamically register feature capabilities
   */
  private async registerDynamicCapabilities(): Promise<void> {
    const capabilities =
      LSPConfigurationManager.getInstance().getCapabilities();
    const registrations: Registration[] = [];

    this.logger.debug('🔧 Starting dynamic capability registration...');
    this.logger.debug(
      `Client capabilities: ${JSON.stringify(this.clientCapabilities, null, 2)}`,
    );

    // Only register if capability is enabled AND client supports dynamic registration

    if (
      capabilities.documentSymbolProvider &&
      this.supportsDynamicRegistration('documentSymbol')
    ) {
      registrations.push({
        id: 'apex-document-symbol',
        method: 'textDocument/documentSymbol',
        registerOptions: {
          documentSelector: [
            { scheme: 'file', language: 'apex' },
            { scheme: 'vscode-test-web', language: 'apex' },
          ],
        },
      });
    }

    if (
      capabilities.hoverProvider &&
      this.supportsDynamicRegistration('hover')
    ) {
      registrations.push({
        id: 'apex-hover',
        method: 'textDocument/hover',
        registerOptions: {
          documentSelector: [
            { scheme: 'file', language: 'apex' },
            { scheme: 'vscode-test-web', language: 'apex' },
          ],
        },
      });
    }

    if (
      capabilities.foldingRangeProvider &&
      this.supportsDynamicRegistration('foldingRange')
    ) {
      registrations.push({
        id: 'apex-folding-range',
        method: 'textDocument/foldingRange',
        registerOptions: {
          documentSelector: [
            { scheme: 'file', language: 'apex' },
            { scheme: 'vscode-test-web', language: 'apex' },
          ],
        },
      });
    }

    if (
      capabilities.diagnosticProvider &&
      this.supportsDynamicRegistration('diagnostic')
    ) {
      registrations.push({
        id: 'apex-diagnostic',
        method: 'textDocument/diagnostic',
        registerOptions: {
          documentSelector: [
            { scheme: 'file', language: 'apex' },
            { scheme: 'vscode-test-web', language: 'apex' },
          ],
          identifier: 'apex-ls-ts',
          interFileDependencies:
            capabilities.diagnosticProvider.interFileDependencies,
          workspaceDiagnostics:
            capabilities.diagnosticProvider.workspaceDiagnostics,
        },
      });
    }

    if (
      capabilities.completionProvider &&
      this.supportsDynamicRegistration('completion')
    ) {
      registrations.push({
        id: 'apex-completion',
        method: 'textDocument/completion',
        registerOptions: {
          documentSelector: [
            { scheme: 'file', language: 'apex' },
            { scheme: 'vscode-test-web', language: 'apex' },
          ],
          triggerCharacters: capabilities.completionProvider.triggerCharacters,
          resolveProvider: capabilities.completionProvider.resolveProvider,
        },
      });
    }

    if (
      capabilities.definitionProvider &&
      this.supportsDynamicRegistration('definition')
    ) {
      registrations.push({
        id: 'apex-definition',
        method: 'textDocument/definition',
        registerOptions: {
          documentSelector: [
            { scheme: 'file', language: 'apex' },
            { scheme: 'vscode-test-web', language: 'apex' },
          ],
        },
      });
    }

    if (registrations.length > 0) {
      this.logger.debug(
        `📝 Preparing to register ${registrations.length}` +
          ` capabilities: ${registrations.map((r) => r.method).join(', ')}`,
      );
      try {
        await this.connection.sendRequest('client/registerCapability', {
          registrations,
        });
        this.logger.info(
          `✅ Dynamically registered ${registrations.length}` +
            ` capabilities: ${registrations.map((r) => r.method).join(', ')}`,
        );
      } catch (error) {
        this.logger.error(`❌ Failed to register capabilities: ${error}`);
      }
    } else {
      this.logger.debug(
        'No capabilities to dynamically register (all returned statically or disabled)',
      );
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
