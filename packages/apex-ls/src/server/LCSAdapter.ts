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
  ReferenceParams,
  Location,
  DocumentDiagnosticParams,
  DocumentDiagnosticReport,
  DocumentDiagnosticReportKind,
  FoldingRangeParams,
  CodeLensParams,
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
  LoadWorkspaceParams,
  LoadWorkspaceResult,
  PingResponse,
  formattedError,
} from '@salesforce/apex-lsp-shared';

import {
  dispatchProcessOnOpenDocument,
  dispatchProcessOnChangeDocument,
  dispatchProcessOnSaveDocument,
  dispatchProcessOnCloseDocument,
  dispatchProcessOnDocumentSymbol,
  dispatchProcessOnHover,
  dispatchProcessOnDefinition,
  dispatchProcessOnReferences,
  dispatchProcessOnFoldingRange,
  dispatchProcessOnFindMissingArtifact,
  dispatchProcessOnCodeLens,
  DiagnosticProcessingService,
  ApexStorageManager,
  ApexStorage,
  dispatchProcessOnResolve,
  BackgroundProcessingInitializationService,
} from '@salesforce/apex-lsp-compliant-services';

import { ResourceLoader } from '@salesforce/apex-lsp-parser-ast';

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
    this.setupUtilityHandlers();
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
    this.logger.info(
      'TextDocuments manager listening for notifications on connection',
    );
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
   * Initialize the ResourceLoader singleton with the standard library ZIP.
   *
   * Loading Strategy:
   * - Requests ZIP from client via apex/provideStandardLibrary
   * - Client reads from virtual file system using vscode.workspace.fs
   * - Works uniformly in both web and desktop environments
   * - Load mode determined from settings (apex.resources.loadMode)
   */
  private async initializeResourceLoader(): Promise<void> {
    try {
      this.logger.debug('📦 Initializing ResourceLoader singleton...');

      // Get load mode from settings
      const configManager = LSPConfigurationManager.getInstance();
      const settingsManager = configManager.getSettingsManager();
      const loadMode = settingsManager.getResourceLoadMode();

      this.logger.debug(
        () => `📦 Using ResourceLoader loadMode: ${loadMode} (from settings)`,
      );

      const resourceLoader = ResourceLoader.getInstance({
        loadMode,
        preloadStdClasses: true,
      });

      const zipBuffer = await this.requestStandardLibraryZip();
      resourceLoader.setZipBuffer(zipBuffer);

      const stats = resourceLoader.getDirectoryStatistics();
      this.logger.info(
        () =>
          '✅ Standard library resources loaded successfully: ' +
          `${stats.totalFiles} files across ${stats.namespaces.length} namespaces`,
      );

      await resourceLoader.initialize();
      this.logger.debug('✅ ResourceLoader initialization complete');
    } catch (error) {
      this.handleResourceLoaderError(error);
    }
  }

  /**
   * Request standard library ZIP from client
   */
  private async requestStandardLibraryZip(): Promise<Uint8Array> {
    this.logger.info(
      '📦 Requesting standard library ZIP from client via virtual file system...',
    );

    const result = (await this.connection.sendRequest(
      'apex/provideStandardLibrary',
      {},
    )) as { zipData: string; size: number } | undefined;

    if (!result || !result.zipData) {
      throw new Error('Client did not provide ZIP data');
    }

    this.logger.info(
      () => `📦 Received ZIP buffer from client (${result.size} bytes)`,
    );

    const binaryString = Buffer.from(result.zipData, 'base64');
    return new Uint8Array(binaryString);
  }

  /**
   * Handle ResourceLoader initialization errors
   */
  private handleResourceLoaderError(error: unknown): void {
    const errorMsg = error instanceof Error ? error.message : String(error);
    this.logger.warn(
      `⚠️ Could not initialize ResourceLoader (will load on-demand instead): ${errorMsg}`,
    );
    this.logger.debug(
      `Stack trace: ${error instanceof Error ? error.stack : 'N/A'}`,
    );
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

    // Register connection-level handler for textDocument/didOpen to log when notifications are received
    this.connection.onNotification('textDocument/didOpen', (params: any) => {
      try {
        const uri = params.textDocument?.uri;
        const languageId = params.textDocument?.languageId;
        const version = params.textDocument?.version;
        this.logger.info(
          `Received textDocument/didOpen notification for: ${uri} (language: ${languageId}, version: ${version})`,
        );
      } catch (error) {
        this.logger.error(
          `Error logging textDocument/didOpen notification: ${error}`,
        );
      }
    });
  }

  /**
   * Utility handlers (shutdown, exit)
   * These are registered early for proper lifecycle management
   */
  private setupUtilityHandlers(): void {
    // Register shutdown handler
    this.connection.onRequest('shutdown', (): null => {
      this.logger.info('Shutdown request received');
      return null;
    });

    // Register exit notification handler
    this.connection.onNotification('exit', (): void => {
      this.logger.info('Exit notification received');
      process.exit(0);
    });

    this.logger.debug('✅ Utility handlers (shutdown, exit) registered');
  }

  /**
   * Document lifecycle handlers
   */
  private setupDocumentHandlers(): void {
    this.documents.onDidOpen(async (open) => {
      try {
        this.logger.debug(
          () =>
            `Processing textDocument/didOpen for: ${open.document.uri} ` +
            `(version: ${open.document.version}, language: ${open.document.languageId})`,
        );
        await dispatchProcessOnOpenDocument(open);
      } catch (error) {
        this.logger.error(
          () => `Error processing open: ${formattedError(error)}`,
        );
      }
    });

    this.documents.onDidChangeContent(async (change) => {
      try {
        this.logger.debug(() => `Document changed: ${change.document.uri}`);
        await dispatchProcessOnChangeDocument(change);
      } catch (error) {
        this.logger.error(
          () => `Error processing change: ${formattedError(error)}`,
        );
      }
    });

    this.documents.onDidSave(async (save) => {
      try {
        await dispatchProcessOnSaveDocument(save);
      } catch (error) {
        this.logger.error(
          () => `Error processing save: ${formattedError(error)}`,
        );
      }
    });

    this.documents.onDidClose(async (close) => {
      try {
        await dispatchProcessOnCloseDocument(close);
      } catch (error) {
        this.logger.error(
          () => `Error processing close: ${formattedError(error)}`,
        );
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
          () =>
            `🔍 Document symbol request for URI: ${params.textDocument.uri}`,
        );
        try {
          return await dispatchProcessOnDocumentSymbol(params);
        } catch (error) {
          this.logger.error(
            () => `Error processing document symbols: ${formattedError(error)}`,
          );
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
            () =>
              `🔍 Definition request for URI: ${params.textDocument.uri} ` +
              `at ${params.position.line}:${params.position.character}`,
          );
          try {
            return await dispatchProcessOnDefinition(params);
          } catch (error) {
            this.logger.error(
              () => `Error processing definition: ${formattedError(error)}`,
            );
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

    // Only register references handler if the capability is enabled
    if (capabilities.referencesProvider) {
      this.connection.onReferences(
        async (params: ReferenceParams): Promise<Location[] | null> => {
          this.logger.debug(
            () =>
              `🔍 References request for URI: ${params.textDocument.uri} ` +
              `at ${params.position.line}:${params.position.character}`,
          );
          try {
            return await dispatchProcessOnReferences(params);
          } catch (error) {
            this.logger.error(
              () => `Error processing references: ${formattedError(error)}`,
            );
            return null;
          }
        },
      );
      this.logger.debug('✅ References handler registered');
    } else {
      this.logger.debug(
        '⚠️ References handler not registered (capability disabled)',
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
            this.logger.error(
              () => `Error processing diagnostics: ${formattedError(error)}`,
            );
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
            () =>
              `🔍 Folding range request for URI: ${params.textDocument.uri}`,
          );
          try {
            const storage = ApexStorageManager.getInstance().getStorage();
            return await dispatchProcessOnFoldingRange(params, storage);
          } catch (error) {
            this.logger.error(
              () => `Error processing folding ranges: ${formattedError(error)}`,
            );
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

    // Only register code lens handler if the capability is enabled
    if (capabilities.codeLensProvider) {
      this.connection.onCodeLens(async (params: CodeLensParams) => {
        this.logger.debug(
          () => `CodeLens request received for URI: ${params.textDocument.uri}`,
        );
        try {
          const result = await dispatchProcessOnCodeLens(params);
          this.logger.debug(
            `Returning ${result.length} code lenses for ${params.textDocument.uri}`,
          );
          return result;
        } catch (error) {
          this.logger.error(
            () => `Error processing code lens: ${formattedError(error)}`,
          );
          return [];
        }
      });
      this.logger.debug('CodeLens handler registered');
    } else {
      this.logger.debug(
        'CodeLens handler not registered (capability disabled)',
      );
    }

    // Register custom apex/findMissingArtifact handler
    this.connection.onRequest(
      'apex/findMissingArtifact',
      async (
        params: FindMissingArtifactParams,
      ): Promise<FindMissingArtifactResult> => {
        this.logger.debug(
          () =>
            `🔍 apex/findMissingArtifact request received for: ${params.identifier}`,
        );
        try {
          return await dispatchProcessOnFindMissingArtifact(params);
        } catch (error) {
          this.logger.error(
            () =>
              `Error processing findMissingArtifact: ${formattedError(error)}`,
          );
          return { notFound: true };
        }
      },
    );
    this.logger.debug('✅ apex/findMissingArtifact handler registered');

    // Register apexlib/resolve handler for standard library content resolution
    this.connection.onRequest(
      'apexlib/resolve',
      async (params: { uri: string }): Promise<{ content: string }> => {
        this.logger.debug(
          () => `🔍 apexlib/resolve request received for: ${params.uri}`,
        );
        try {
          return await dispatchProcessOnResolve(params);
        } catch (error) {
          this.logger.error(
            () => `Error processing apexlib/resolve: ${formattedError(error)}`,
          );
          throw error;
        }
      },
    );
    this.logger.debug('✅ apexlib/resolve handler registered');

    // Register custom apex/loadWorkspace handler
    this.connection.onRequest(
      'apex/loadWorkspace',
      async (params: LoadWorkspaceParams): Promise<LoadWorkspaceResult> => {
        this.logger.debug(
          () =>
            `🔍 apex/loadWorkspace request received for: ${JSON.stringify(params)}`,
        );
        try {
          // Forward the request to the client
          const result = await this.connection.sendRequest(
            'apex/loadWorkspace',
            params,
          );
          this.logger.debug(
            () =>
              `✅ apex/loadWorkspace client response: ${JSON.stringify(result)}`,
          );
          return result as LoadWorkspaceResult;
        } catch (error) {
          this.logger.error(
            () =>
              `Error forwarding loadWorkspace to client: ${formattedError(error)}`,
          );
          return {
            error: `Failed to forward loadWorkspace request to client: ${formattedError(error)}`,
          };
        }
      },
    );

    this.logger.debug('✅ apex/loadWorkspace handler registered');
    // Register profiling handlers (only in desktop/Node.js environment)
    this.registerProfilingHandlers();
  }

  /**
   * Register profiling request handlers (only in desktop environment)
   */
  private registerProfilingHandlers(): void {
    // Only register if runtime platform is desktop (Node.js)
    const runtimePlatform =
      LSPConfigurationManager.getInstance().getRuntimePlatform();
    if (runtimePlatform !== 'desktop') {
      this.logger.debug(
        '⚠️ Profiling handlers not registered (not in desktop environment)',
      );
      return;
    }

    // Only register if interactive profiling is enabled
    const settings = LSPConfigurationManager.getInstance().getSettings();
    if (settings.apex.environment.profilingMode !== 'interactive') {
      this.logger.debug(
        '⚠️ Profiling handlers not registered (interactive profiling not enabled)',
      );
      return;
    }

    // Lazy-load ProfilingService to avoid bundling issues
    let profilingService: any = null;
    const getProfilingService = async () => {
      if (!profilingService) {
        const { ProfilingService } = await import(
          '../profiling/ProfilingService'
        );
        profilingService = ProfilingService.getInstance();

        // Initialize with logger and output directory
        // Get workspace folder from initialization params or use current working directory
        let outputDir = process.cwd();
        try {
          // Try to get workspace folder from connection
          // Note: workspaceFolders may not be available at this point, so we use a fallback
          if (typeof process !== 'undefined' && process.cwd) {
            outputDir = process.cwd();
          }
        } catch (_error) {
          // Fallback to current working directory
          outputDir = process.cwd();
        }

        profilingService.initialize(this.logger, outputDir);
      }
      return profilingService;
    };

    // Register apex/profiling/start
    this.connection.onRequest(
      'apex/profiling/start',
      async (params: {
        type?: 'cpu' | 'heap' | 'both';
      }): Promise<{
        success: boolean;
        message: string;
        type?: 'cpu' | 'heap' | 'both';
      }> => {
        this.logger.debug(
          () =>
            `🔍 apex/profiling/start request received for: ${JSON.stringify(params)}`,
        );
        try {
          const service = await getProfilingService();

          if (!service.isAvailable()) {
            return {
              success: false,
              message:
                'Profiling is not available in this environment (Node.js required)',
            };
          }

          // Get profiling type from params or settings
          const settings = LSPConfigurationManager.getInstance().getSettings();
          const profilingType =
            params.type ?? settings.apex.environment.profilingType ?? 'cpu';

          const result = await service.startProfiling(profilingType);
          this.logger.info(() => `Profiling started: ${result.message}`);
          return result;
        } catch (error) {
          this.logger.error(
            () => `Error starting profiling: ${formattedError(error)}`,
          );
          return {
            success: false,
            message: `Failed to start profiling: ${formattedError(error, {
              includeStack: false,
            })}`,
          };
        }
      },
    );
    this.logger.debug('✅ apex/profiling/start handler registered');

    // Register apex/profiling/stop
    this.connection.onRequest(
      'apex/profiling/stop',
      async (params: {
        tag?: string;
      }): Promise<{
        success: boolean;
        message: string;
        files?: string[];
      }> => {
        this.logger.debug(
          () =>
            `🔍 apex/profiling/stop request received for: ${JSON.stringify(params)}`,
        );
        try {
          const service = await getProfilingService();

          if (!service.isAvailable()) {
            return {
              success: false,
              message: 'Profiling is not available in this environment',
            };
          }

          const result = await service.stopProfiling(params?.tag);
          if (result.success && result.files) {
            this.logger.info(
              () =>
                `Profiling stopped: ${result.message}, files: ${result.files.join(', ')}`,
            );
          } else {
            this.logger.info(() => `Profiling stop: ${result.message}`);
          }
          return result;
        } catch (error) {
          this.logger.error(
            () => `Error stopping profiling: ${formattedError(error)}`,
          );
          return {
            success: false,
            message: `Failed to stop profiling: ${formattedError(error, {
              includeStack: false,
            })}`,
          };
        }
      },
    );
    this.logger.debug('✅ apex/profiling/stop handler registered');

    // Register apex/profiling/status
    this.connection.onRequest(
      'apex/profiling/status',
      async (): Promise<{
        isProfiling: boolean;
        type: 'idle' | 'cpu' | 'heap' | 'both';
        available: boolean;
      }> => {
        this.logger.debug('🔍 apex/profiling/status request received');
        try {
          const service = await getProfilingService();
          const status = service.getStatus();
          return status;
        } catch (error) {
          this.logger.error(
            () => `Error getting profiling status: ${formattedError(error)}`,
          );
          return {
            isProfiling: false,
            type: 'idle',
            available: false,
          };
        }
      },
    );
    this.logger.debug('✅ apex/profiling/status handler registered');
  }

  /**
   * Auto-start interactive profiling if enabled
   * This ensures profiling captures server initialization
   */
  private async autoStartInteractiveProfiling(): Promise<void> {
    // Only start if runtime platform is desktop (Node.js)
    const runtimePlatform =
      LSPConfigurationManager.getInstance().getRuntimePlatform();
    if (runtimePlatform !== 'desktop') {
      return;
    }

    // Check if interactive profiling is enabled
    const settings = LSPConfigurationManager.getInstance().getSettings();
    if (settings.apex.environment.profilingMode !== 'interactive') {
      return;
    }

    try {
      // Lazy-load ProfilingService
      const { ProfilingService } = await import(
        '../profiling/ProfilingService'
      );
      const profilingService = ProfilingService.getInstance();

      // Initialize with logger and output directory
      let outputDir = process.cwd();
      try {
        if (typeof process !== 'undefined' && process.cwd) {
          outputDir = process.cwd();
        }
      } catch (_error) {
        // Fallback to current working directory
        outputDir = process.cwd();
      }

      profilingService.initialize(this.logger, outputDir);

      if (!profilingService.isAvailable()) {
        this.logger.warn(
          'Interactive profiling enabled but inspector API is not available',
        );
        return;
      }

      // Get profiling type from settings
      const profilingType = settings.apex.environment.profilingType ?? 'cpu';

      // Start profiling
      const result = await profilingService.startProfiling(profilingType);
      this.logger.info(
        `🚀 Auto-started interactive profiling: ${result.message}`,
      );
    } catch (error) {
      this.logger.error(`Failed to auto-start interactive profiling: ${error}`);
      // Don't throw - allow server to continue without profiling
    }
  }

  /**
   * Handle client `initialize` request
   */
  private handleInitialize(params: InitializeParams): InitializeResult {
    this.logger.debug(
      () =>
        `Initialize request received. Params: ${JSON.stringify(params, null, 2)}`,
    );
    this.logger.debug(
      () =>
        `Client supports CodeLens: ${!!params.capabilities.textDocument?.codeLens}`,
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

    // Log textDocumentSync capabilities being negotiated
    this.logger.info(
      () =>
        `Negotiating textDocumentSync capabilities: ${JSON.stringify(allCapabilities.textDocumentSync)}`,
    );

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

    // Always include referencesProvider in static capabilities for VS Code context menu
    // Even if dynamic registration is supported, VS Code needs it in initial response
    if (allCapabilities.referencesProvider) {
      staticCapabilities.referencesProvider =
        allCapabilities.referencesProvider;
    }

    // Always include definitionProvider in static capabilities for VS Code context menu
    if (allCapabilities.definitionProvider) {
      staticCapabilities.definitionProvider =
        allCapabilities.definitionProvider;
    }

    if (
      allCapabilities.codeLensProvider &&
      !params.capabilities.textDocument?.codeLens?.dynamicRegistration
    ) {
      staticCapabilities.codeLensProvider = allCapabilities.codeLensProvider;
      this.logger.debug(
        () =>
          `Adding CodeLens to static capabilities: ${JSON.stringify(allCapabilities.codeLensProvider)}`,
      );
    } else {
      this.logger.debug(() => {
        const clientSupports =
          !!params.capabilities.textDocument?.codeLens?.dynamicRegistration;
        const capabilityEnabled = !!allCapabilities.codeLensProvider;
        return (
          'CodeLens will be dynamically registered ' +
          `(client supports: ${clientSupports}, ` +
          `capability enabled: ${capabilityEnabled})`
        );
      });
    }

    this.logger.debug(
      () =>
        `Returning static capabilities: ${JSON.stringify(staticCapabilities, null, 2)}`,
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
      case 'references':
        return !!this.clientCapabilities.textDocument?.references
          ?.dynamicRegistration;
      case 'codeLens':
        return !!this.clientCapabilities.textDocument?.codeLens
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

    // Initialize symbol processing early, before protocol handlers
    try {
      this.logger.debug('🔧 Initializing background symbol processing...');
      BackgroundProcessingInitializationService.getInstance().initialize();
      this.logger.info('✅ Background symbol processing initialized');
    } catch (error) {
      this.logger.error(
        () =>
          `❌ Failed to initialize background symbol processing: ${formattedError(error)}`,
      );
      // Don't throw - allow server to continue without background processing
    }

    // Register $/ping handler for health checks (must be after initialization)
    this.connection.onRequest('$/ping', async (): Promise<PingResponse> => {
      this.logger.debug('[SERVER] Received $/ping request');
      const result: PingResponse = {
        message: 'pong',
        timestamp: new Date().toISOString(),
        server: 'apex-ls',
      };
      this.logger.debug(
        () => `[SERVER] Responding to $/ping with: ${JSON.stringify(result)}`,
      );
      return result;
    });
    this.logger.debug('✅ $/ping handler registered');

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

    // Auto-start interactive profiling if enabled
    await this.autoStartInteractiveProfiling();

    if (this.hasConfigurationCapability) {
      this.logger.debug('✅ Initial workspace configuration loaded');
    }

    if (this.hasWorkspaceFolderCapability) {
      this.connection.workspace.onDidChangeWorkspaceFolders((_event) => {
        this.logger.info('Workspace folder change event received.');
      });
    }

    // Initialize ResourceLoader with standard library
    // Requests ZIP from client via apex/provideStandardLibrary
    // Client uses vscode.workspace.fs to read from virtual file system
    this.initializeResourceLoader().catch((error) => {
      this.logger.error(
        () =>
          `❌ Background ResourceLoader initialization failed: ${formattedError(error)}`,
      );
    });
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
        () =>
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
      () => `Configuration update ${success ? 'succeeded' : 'failed'}`,
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
          () =>
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
        this.logger.error(
          () => `Error revalidating ${document.uri}: ${formattedError(error)}`,
        );
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
      this.logger.error(
        () => `Error updating server mode: ${formattedError(error)}`,
      );
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
          () =>
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
      this.logger.error(
        () =>
          `Error updating server mode from settings: ${formattedError(error)}`,
      );
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
      () =>
        `Client capabilities: ${JSON.stringify(
          this.clientCapabilities,
          null,
          2,
        )}`,
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
            { scheme: 'file', language: 'apex-anon' },
            { scheme: 'vscode-test-web', language: 'apex' },
            { scheme: 'apexlib', language: 'apex' },
            { scheme: 'vscode-test-web', language: 'apex-anon' },
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
            { scheme: 'file', language: 'apex-anon' },
            { scheme: 'vscode-test-web', language: 'apex' },
            { scheme: 'apexlib', language: 'apex' },
            { scheme: 'vscode-test-web', language: 'apex-anon' },
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
            { scheme: 'file', language: 'apex-anon' },
            { scheme: 'vscode-test-web', language: 'apex' },
            { scheme: 'apexlib', language: 'apex' },
            { scheme: 'vscode-test-web', language: 'apex-anon' },
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
            { scheme: 'file', language: 'apex-anon' },
            { scheme: 'vscode-test-web', language: 'apex' },
            { scheme: 'apexlib', language: 'apex' },
            { scheme: 'vscode-test-web', language: 'apex-anon' },
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
            { scheme: 'file', language: 'apex-anon' },
            { scheme: 'vscode-test-web', language: 'apex' },
            { scheme: 'apexlib', language: 'apex' },
            { scheme: 'vscode-test-web', language: 'apex-anon' },
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
            { scheme: 'file', language: 'apex-anon' },
            { scheme: 'vscode-test-web', language: 'apex' },
            { scheme: 'apexlib', language: 'apex' },
            { scheme: 'vscode-test-web', language: 'apex-anon' },
          ],
        },
      });
    }

    if (
      capabilities.codeLensProvider &&
      this.supportsDynamicRegistration('codeLens')
    ) {
      this.logger.debug(() => 'Registering CodeLens capability dynamically');
      registrations.push({
        id: 'apex-codeLens',
        method: 'textDocument/codeLens',
        registerOptions: {
          documentSelector: [
            { scheme: 'file', language: 'apex' },
            { scheme: 'file', language: 'apex-anon' },
            { scheme: 'vscode-test-web', language: 'apex' },
            { scheme: 'vscode-test-web', language: 'apex-anon' },
          ],
          resolveProvider: capabilities.codeLensProvider.resolveProvider,
        },
      });
    }

    if (registrations.length > 0) {
      this.logger.debug(
        () =>
          `📝 Preparing to register ${registrations.length}` +
          ` capabilities: ${registrations.map((r) => r.method).join(', ')}`,
      );
      try {
        await this.connection.sendRequest('client/registerCapability', {
          registrations,
        });
        this.logger.info(
          () =>
            `✅ Dynamically registered ${registrations.length}` +
            ` capabilities: ${registrations.map((r) => r.method).join(', ')}`,
        );
      } catch (error) {
        this.logger.error(
          () => `❌ Failed to register capabilities: ${formattedError(error)}`,
        );
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
        () =>
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
        this.logger.debug(() => `✅ Server mode set to: ${currentMode}`);

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
    this.logger.debug('Registering hover handler');

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
