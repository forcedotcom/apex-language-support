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
  DidChangeConfigurationParams,
} from 'vscode-languageserver';
import { getLogger } from '@salesforce/apex-lsp-logging';
import { ResourceLoader } from '@salesforce/apex-lsp-parser-ast';

import { ApexSettingsManager } from './ApexSettingsManager';

/**
 * Manages LSP configuration lifecycle and integration with ApexSettingsManager
 */
export class LSPConfigurationManager {
  private readonly logger = getLogger();
  private connection: Connection | null = null;
  private settingsManager: ApexSettingsManager;
  private hasConfigurationCapability = false;
  private hasWorkspaceConfiguration = false;
  private configurationHandlerRegistered = false;
  private configurationRegistrationDisposable: any = null;
  private resourceLoader: ResourceLoader | null = null;

  constructor(settingsManager: ApexSettingsManager, connection?: Connection) {
    this.settingsManager = settingsManager;
    if (connection) {
      this.setConnection(connection);
    }
  }

  /**
   * Set the LSP connection for configuration management
   */
  public setConnection(connection: Connection): void {
    this.connection = connection;
    this.setupConfigurationHandlers();

    // Note: Resource loader initialization moved to processInitializeParams()
    // to ensure it happens after initialization options are processed
  }

  /**
   * Process initialize parameters and extract initial settings
   */
  public processInitializeParams(params: InitializeParams): void {
    this.logger.debug('Processing LSP initialize parameters');

    // Extract initial settings from initialization options
    if (params.initializationOptions) {
      this.logger.debug(
        () =>
          `Processing initialization options: ${JSON.stringify(params.initializationOptions, null, 2)}`,
      );

      const success = this.settingsManager.updateFromLSPConfiguration(
        params.initializationOptions,
      );

      if (success) {
        this.logger.debug('Successfully applied initialization settings');
      } else {
        this.logger.warn('Failed to apply initialization settings');
      }
    } else {
      this.logger.debug('No initialization options provided, using defaults');
    }

    // Initialize resource loader AFTER settings are processed
    if (this.connection) {
      this.initializeResourceLoader().catch((error) => {
        this.logger.error(
          () =>
            `Failed to initialize resource loader during initialization: ${error}`,
        );
      });
    }

    // Extract workspace folder information for environment detection
    if (params.workspaceFolders && params.workspaceFolders.length > 0) {
      this.logger.debug(
        `Workspace folders: ${params.workspaceFolders.map((f) => f.uri).join(', ')}`,
      );
    }
  }

  /**
   * Initialize resource loader based on current settings
   */
  private async initializeResourceLoader(): Promise<void> {
    try {
      const loadMode = this.settingsManager.getResourceLoadMode();
      const currentSettings = this.settingsManager.getSettings();

      this.logger.debug(
        () => `Initializing resource loader with mode: ${loadMode}`,
      );
      this.logger.debug(
        () =>
          `Current settings at resource loader init: ${JSON.stringify(currentSettings, null, 2)}`,
      );

      // Get or create ResourceLoader instance with current settings
      this.resourceLoader = ResourceLoader.getInstance({ loadMode });
      await this.resourceLoader.initialize();

      this.logger.debug('Resource loader initialized successfully');
    } catch (error) {
      this.logger.error(() => `Failed to initialize resource loader: ${error}`);
      throw error;
    }
  }

  /**
   * Reconfigure resource loader when settings change
   */
  private async reconfigureResourceLoader(
    newLoadMode: 'lazy' | 'full',
  ): Promise<void> {
    try {
      const currentResourceLoader = this.resourceLoader;

      // Check if load mode actually changed
      if (currentResourceLoader) {
        // Since ResourceLoader doesn't expose current loadMode, we'll need to track it
        // For now, we'll assume it needs reconfiguration if settings changed
        this.logger.debug(
          () => `Reconfiguring resource loader to mode: ${newLoadMode}`,
        );
      } else {
        this.logger.debug(
          () => `Initializing resource loader with mode: ${newLoadMode}`,
        );
      }

      // Reset the ResourceLoader singleton to allow reconfiguration
      // Note: This is a workaround since ResourceLoader doesn't support reconfiguration
      (ResourceLoader as any).instance = undefined;

      // Create new instance with updated settings
      this.resourceLoader = ResourceLoader.getInstance({
        loadMode: newLoadMode,
      });
      await this.resourceLoader.initialize();

      this.logger.debug(() => {
        const action = currentResourceLoader ? 'reconfigured' : 'initialized';
        return `Resource loader ${action} successfully with mode: ${newLoadMode}`;
      });
    } catch (error) {
      this.logger.error(
        () => `Failed to reconfigure resource loader: ${error}`,
      );
      // Don't throw here - we want configuration changes to continue even if resource loader fails
    }
  }

  /**
   * Simplified configuration change handler that only uses client-provided settings
   */
  private async handleConfigurationChange(
    params: DidChangeConfigurationParams,
  ): Promise<void> {
    this.logger.debug('Handling configuration change notification');

    try {
      if (!params || !params.settings) {
        this.logger.debug(
          'No settings provided in configuration change notification',
        );
        return;
      }

      this.logger.debug(
        () =>
          `Processing settings from client: ${JSON.stringify(params.settings, null, 2)}`,
      );

      // Track previous settings for comparison
      const previousSettings = this.settingsManager.getSettings();
      const previousLoadMode = previousSettings.resources.loadMode;

      // Update settings with what the client provided
      const success = this.settingsManager.updateFromLSPConfiguration(
        params.settings,
      );

      if (success) {
        this.logger.debug('Successfully updated settings from client');

        // Check if resource loading mode changed and reconfigure if needed
        const newSettings = this.settingsManager.getSettings();
        const newLoadMode = newSettings.resources.loadMode;

        if (previousLoadMode !== newLoadMode) {
          this.logger.debug(
            () =>
              `Resource load mode changed from ${previousLoadMode} to ${newLoadMode}`,
          );
          await this.reconfigureResourceLoader(newLoadMode);
        }

        // Validate the updated configuration
        await this.validateAppliedConfiguration();
      } else {
        this.logger.warn('Failed to process settings from client');
      }
    } catch (error) {
      this.logger.error(
        () => `Error in configuration change handler: ${error}`,
      );
    }
  }

  /**
   * Register for configuration change notifications
   */
  public registerForConfigurationChanges(): void {
    if (!this.connection) {
      this.logger.warn(
        'Cannot register for configuration changes: no connection available',
      );
      return;
    }

    // Prevent duplicate registration
    if (this.configurationHandlerRegistered) {
      this.logger.debug('Configuration change handler already registered');
      return;
    }

    try {
      // Register the simplified configuration change handler
      this.connection.onDidChangeConfiguration(
        async (params: DidChangeConfigurationParams) => {
          await this.handleConfigurationChange(params);
        },
      );

      this.configurationHandlerRegistered = true;
      this.logger.debug('Configuration change handler successfully registered');
    } catch (error) {
      this.logger.error(
        () => `Failed to register configuration change handler: ${error}`,
      );
      throw new Error(`Configuration handler registration failed: ${error}`);
    }
  }

  /**
   * Request current configuration from the client (not used in passive mode)
   */
  public async requestConfiguration(): Promise<void> {
    this.logger.debug(
      'requestConfiguration called - language server operates in passive mode, using client-provided settings only',
    );
    // No action needed - configuration is provided via initializationOptions and didChangeConfiguration
  }

  /**
   * Handle configuration update failures with recovery
   */
  private async handleConfigurationFailure(
    previousSettings: any,
  ): Promise<void> {
    this.logger.warn('Attempting to recover from configuration failure');

    try {
      // Try to restore previous settings
      if (previousSettings) {
        const restored =
          this.settingsManager.updateFromLSPConfiguration(previousSettings);
        if (restored) {
          this.logger.debug('Successfully restored previous configuration');
        } else {
          this.logger.error('Failed to restore previous configuration');
        }
      }
    } catch (error) {
      this.logger.error(() => `Error during configuration recovery: ${error}`);
    }
  }

  /**
   * Validate the currently applied configuration
   */
  private async validateAppliedConfiguration(): Promise<void> {
    try {
      const currentSettings = this.settingsManager.getSettings();

      // Basic validation checks
      if (!currentSettings) {
        this.logger.warn('No current settings available for validation');
        return;
      }

      // Log configuration summary for debugging
      this.logger.debug(() => {
        const settingsKeys = Object.keys(currentSettings);
        return `Current configuration sections: ${settingsKeys.join(', ')}`;
      });

      this.logger.debug('Configuration validation completed');
    } catch (error) {
      this.logger.error(
        () => `Error during configuration validation: ${error}`,
      );
    }
  }

  /**
   * Recover from configuration errors (simplified for passive mode)
   */
  private async recoverFromConfigurationError(): Promise<void> {
    this.logger.debug(
      'Configuration error recovery - language server operates in passive mode',
    );
    // No recovery action needed - client will send new configuration if needed
  }

  /**
   * Notify about successful configuration application
   */
  private async notifyConfigurationApplied(settings: any): Promise<void> {
    try {
      // This could be extended to notify other components about config changes
      this.logger.debug('Configuration successfully applied and validated');

      // Could emit events here for other components to react to config changes
      // this.eventEmitter?.emit('configurationChanged', settings);

      this.logger.info(
        () => `Configuration updated:\n${JSON.stringify(settings, null, 2)}`,
      );
    } catch (error) {
      this.logger.error(
        () => `Error notifying about configuration changes: ${error}`,
      );
    }
  }

  /**
   * Get the resource loader instance
   */
  public getResourceLoader(): ResourceLoader | null {
    return this.resourceLoader;
  }

  /**
   * Unregister configuration change handlers (useful for cleanup)
   */
  public unregisterConfigurationHandlers(): void {
    if (!this.connection || !this.configurationHandlerRegistered) {
      return;
    }

    try {
      if (this.configurationRegistrationDisposable) {
        // Dispose of the registration if it supports disposal
        if (
          typeof this.configurationRegistrationDisposable.dispose === 'function'
        ) {
          this.configurationRegistrationDisposable.dispose();
        }
        this.configurationRegistrationDisposable = null;
      }

      this.configurationHandlerRegistered = false;
      this.logger.debug('Configuration change handlers unregistered');
    } catch (error) {
      this.logger.error(
        () => `Error unregistering configuration handlers: ${error}`,
      );
    }
  }

  /**
   * Get a JSON schema for the settings (for client validation)
   */
  public getSettingsSchema(): object {
    return {
      type: 'object',
      title: 'Apex Language Server Configuration',
      properties: {
        apex: {
          type: 'object',
          description: 'Apex Language Server settings',
          properties: {
            commentCollection: {
              type: 'object',
              description: 'Comment collection settings',
              properties: {
                enableCommentCollection: {
                  type: 'boolean',
                  default: true,
                  description: 'Enable comment collection during parsing',
                },
                includeSingleLineComments: {
                  type: 'boolean',
                  default: false,
                  description: 'Include single-line comments',
                },
                associateCommentsWithSymbols: {
                  type: 'boolean',
                  default: false,
                  description: 'Associate comments with symbols',
                },
                enableForDocumentChanges: {
                  type: 'boolean',
                  default: true,
                  description: 'Enable for document change events',
                },
                enableForDocumentOpen: {
                  type: 'boolean',
                  default: true,
                  description: 'Enable for document open events',
                },
                enableForDocumentSymbols: {
                  type: 'boolean',
                  default: false,
                  description: 'Enable for document symbols',
                },
                enableForFoldingRanges: {
                  type: 'boolean',
                  default: false,
                  description: 'Enable for folding ranges',
                },
              },
            },
            performance: {
              type: 'object',
              description: 'Performance settings',
              properties: {
                commentCollectionMaxFileSize: {
                  type: 'number',
                  default: 102400,
                  description:
                    'Maximum file size for comment collection (bytes)',
                },
                useAsyncCommentProcessing: {
                  type: 'boolean',
                  default: true,
                  description: 'Use async comment processing',
                },
                documentChangeDebounceMs: {
                  type: 'number',
                  default: 300,
                  description: 'Debounce delay for document changes (ms)',
                },
              },
            },
            environment: {
              type: 'object',
              description: 'Environment settings',
              properties: {
                enablePerformanceLogging: {
                  type: 'boolean',
                  default: false,
                  description: 'Enable performance logging',
                },
                commentCollectionLogLevel: {
                  type: 'string',
                  enum: ['debug', 'info', 'warn', 'error'],
                  default: 'info',
                  description: 'Log level for comment collection',
                },
              },
            },
            resources: {
              type: 'object',
              description: 'Resource loading settings',
              properties: {
                loadMode: {
                  type: 'string',
                  enum: ['lazy', 'full'],
                  default: 'full',
                  description:
                    'Resource loading mode - lazy loads files on demand, full loads all files immediately',
                },
              },
            },
            diagnostics: {
              type: 'object',
              description: 'Diagnostic settings',
              properties: {
                enablePullDiagnostics: {
                  type: 'boolean',
                  default: true,
                  description:
                    'Enable pull-based diagnostics (textDocument/diagnostic)',
                },
                enablePushDiagnostics: {
                  type: 'boolean',
                  default: true,
                  description:
                    'Enable push-based diagnostics (textDocument/publishDiagnostics)',
                },
              },
            },
          },
        },
      },
    };
  }

  private setupConfigurationHandlers(): void {
    if (!this.connection) {
      return;
    }

    // Use the enhanced registration method
    this.registerForConfigurationChanges();

    this.logger.debug(
      'LSP configuration handlers set up with enhanced handling',
    );
  }
}
