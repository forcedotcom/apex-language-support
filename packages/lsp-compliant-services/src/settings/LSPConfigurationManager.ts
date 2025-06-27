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
  DidChangeConfigurationNotification,
  DidChangeConfigurationParams,
} from 'vscode-languageserver';
import { getLogger, LogMessageType } from '@salesforce/apex-lsp-logging';
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
    this.logger.log(
      LogMessageType.Debug,
      'Processing LSP initialize parameters',
    );

    // Check client capabilities
    const capabilities = params.capabilities;
    this.hasConfigurationCapability = !!(
      capabilities.workspace && !!capabilities.workspace.configuration
    );
    this.hasWorkspaceConfiguration = !!(
      capabilities.workspace &&
      !!capabilities.workspace.didChangeConfiguration &&
      !!capabilities.workspace.didChangeConfiguration.dynamicRegistration
    );

    // Debug the specific capability detection
    this.logger.log(
      LogMessageType.Info,
      () => `Capability detection breakdown:
       - workspace exists: ${!!capabilities.workspace}
       - didChangeConfiguration exists: ${!!(capabilities.workspace && capabilities.workspace.didChangeConfiguration)}
       - dynamicRegistration value: ${capabilities.workspace?.didChangeConfiguration?.dynamicRegistration}
       - final hasWorkspaceConfiguration: ${this.hasWorkspaceConfiguration}`,
    );

    // Enhanced debugging for capability detection
    this.logger.log(
      LogMessageType.Info,
      () =>
        `Client capabilities received: ${JSON.stringify(capabilities, null, 2)}`,
    );
    this.logger.log(
      LogMessageType.Info,
      `Client capabilities - configuration: ${this.hasConfigurationCapability}, ` +
        `workspace: ${this.hasWorkspaceConfiguration}`,
    );

    // Log specific workspace capabilities for debugging
    if (capabilities.workspace) {
      this.logger.log(
        LogMessageType.Info,
        () =>
          `Workspace capabilities: ${JSON.stringify(capabilities.workspace, null, 2)}`,
      );
    } else {
      this.logger.log(
        LogMessageType.Warning,
        'No workspace capabilities found in client',
      );
    }

    // Extract initial settings from initialization options FIRST
    if (params.initializationOptions) {
      this.logger.log(
        LogMessageType.Debug,
        () =>
          `Processing initialization options: ${JSON.stringify(params.initializationOptions, null, 2)}`,
      );

      const success = this.settingsManager.updateFromLSPConfiguration(
        params.initializationOptions,
      );

      if (success) {
        this.logger.log(
          LogMessageType.Debug,
          'Successfully applied initialization settings',
        );
      } else {
        this.logger.log(
          LogMessageType.Warning,
          'Failed to apply initialization settings',
        );
      }
    }

    // Initialize resource loader AFTER settings are processed
    if (this.connection) {
      this.initializeResourceLoader().catch((error) => {
        this.logger.log(
          LogMessageType.Error,
          () =>
            `Failed to initialize resource loader during initialization: ${error}`,
        );
      });
    }

    // Extract workspace folder information for environment detection
    if (params.workspaceFolders && params.workspaceFolders.length > 0) {
      this.logger.log(
        LogMessageType.Debug,
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

      this.logger.log(
        LogMessageType.Info,
        () => `Initializing resource loader with mode: ${loadMode}`,
      );
      this.logger.log(
        LogMessageType.Debug,
        () =>
          `Current settings at resource loader init: ${JSON.stringify(currentSettings, null, 2)}`,
      );

      // Get or create ResourceLoader instance with current settings
      this.resourceLoader = ResourceLoader.getInstance({ loadMode });
      await this.resourceLoader.initialize();

      this.logger.log(
        LogMessageType.Info,
        'Resource loader initialized successfully',
      );
    } catch (error) {
      this.logger.log(
        LogMessageType.Error,
        () => `Failed to initialize resource loader: ${error}`,
      );
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
        this.logger.log(
          LogMessageType.Info,
          () => `Reconfiguring resource loader to mode: ${newLoadMode}`,
        );
      } else {
        this.logger.log(
          LogMessageType.Info,
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

      this.logger.log(LogMessageType.Info, () => {
        const action = currentResourceLoader ? 'reconfigured' : 'initialized';
        return `Resource loader ${action} successfully with mode: ${newLoadMode}`;
      });
    } catch (error) {
      this.logger.log(
        LogMessageType.Error,
        () => `Failed to reconfigure resource loader: ${error}`,
      );
      // Don't throw here - we want configuration changes to continue even if resource loader fails
    }
  }

  /**
   * Enhanced configuration change handler with validation and error recovery
   */
  private async handleConfigurationChangeEnhanced(
    params: DidChangeConfigurationParams,
  ): Promise<void> {
    this.logger.log(
      LogMessageType.Debug,
      'Handling enhanced configuration change notification',
    );

    try {
      // Validate the configuration change params
      if (!params) {
        this.logger.log(
          LogMessageType.Warning,
          'Received empty configuration change parameters',
        );
        return;
      }

      // Track previous settings for rollback if needed
      const previousSettings = this.settingsManager.getSettings();
      const previousLoadMode = previousSettings.resources.loadMode;

      if (this.hasConfigurationCapability) {
        // Request the latest configuration from the client
        await this.requestConfiguration();
      } else {
        // Fallback: use the settings from the notification
        if (params.settings) {
          this.logger.log(
            LogMessageType.Debug,
            () =>
              `Processing settings from notification: ${JSON.stringify(params.settings, null, 2)}`,
          );

          const success = this.settingsManager.updateFromLSPConfiguration(
            params.settings,
          );

          if (success) {
            this.logger.log(
              LogMessageType.Info,
              'Successfully updated settings from notification',
            );

            // Notify about successful configuration change
            await this.notifyConfigurationApplied(params.settings);
          } else {
            this.logger.log(
              LogMessageType.Error,
              'Failed to update settings from notification',
            );

            // Attempt to restore previous settings on failure
            await this.handleConfigurationFailure(previousSettings);
            return;
          }
        } else {
          this.logger.log(
            LogMessageType.Warning,
            'No settings provided in configuration change notification',
          );
          return;
        }
      }

      // Check if resource loading mode changed and reconfigure if needed
      const newSettings = this.settingsManager.getSettings();
      const newLoadMode = newSettings.resources.loadMode;

      if (previousLoadMode !== newLoadMode) {
        this.logger.log(
          LogMessageType.Info,
          () =>
            `Resource load mode changed from ${previousLoadMode} to ${newLoadMode}`,
        );
        await this.reconfigureResourceLoader(newLoadMode);
      }

      // Validate the updated configuration
      await this.validateAppliedConfiguration();
    } catch (error) {
      this.logger.log(
        LogMessageType.Error,
        () => `Error in enhanced configuration change handler: ${error}`,
      );

      // Attempt recovery by requesting fresh configuration
      await this.recoverFromConfigurationError();
    }
  }

  /**
   * Register for configuration change notifications
   */
  public registerForConfigurationChanges(): void {
    if (!this.connection) {
      this.logger.log(
        LogMessageType.Warning,
        'Cannot register for configuration changes: no connection available',
      );
      return;
    }

    // Prevent duplicate registration
    if (this.configurationHandlerRegistered) {
      this.logger.log(
        LogMessageType.Debug,
        'Configuration change handler already registered',
      );
      return;
    }

    try {
      // Register the enhanced configuration change handler
      this.connection.onDidChangeConfiguration(
        async (params: DidChangeConfigurationParams) => {
          await this.handleConfigurationChangeEnhanced(params);
        },
      );

      if (this.hasWorkspaceConfiguration) {
        // Register for dynamic configuration changes
        this.configurationRegistrationDisposable =
          this.connection.client.register(
            DidChangeConfigurationNotification.type,
            undefined,
          );
        this.logger.log(
          LogMessageType.Info,
          'Successfully registered for dynamic configuration change notifications',
        );
      } else {
        this.logger.log(
          LogMessageType.Debug,
          'Client does not support dynamic configuration registration, using static handler',
        );
      }

      this.configurationHandlerRegistered = true;
      this.logger.log(
        LogMessageType.Info,
        'Configuration change handler successfully registered',
      );
    } catch (error) {
      this.logger.log(
        LogMessageType.Error,
        () => `Failed to register configuration change handler: ${error}`,
      );
      throw new Error(`Configuration handler registration failed: ${error}`);
    }
  }

  /**
   * Request current configuration from the client
   */
  public async requestConfiguration(): Promise<void> {
    if (!this.connection) {
      this.logger.log(
        LogMessageType.Warning,
        'Cannot request configuration: no connection available',
      );
      return;
    }

    if (!this.hasConfigurationCapability) {
      this.logger.log(
        LogMessageType.Warning,
        'Cannot request configuration: client does not support workspace.configuration',
      );
      return;
    }

    try {
      this.logger.log(
        LogMessageType.Debug,
        'Requesting configuration from client',
      );

      // Request configuration for multiple possible setting keys
      const configSections = [
        'apex',
        'apexLanguageServer',
        'apex.languageServer',
        'salesforce.apex',
      ];

      const configs = await this.connection.workspace.getConfiguration(
        configSections.map((section) => ({ section })),
      );

      this.logger.log(
        LogMessageType.Debug,
        () => `Received configurations: ${JSON.stringify(configs, null, 2)}`,
      );

      // Try to find a valid configuration from the responses
      let foundValidConfig = false;
      for (let i = 0; i < configs.length && !foundValidConfig; i++) {
        const config = configs[i];
        if (config && typeof config === 'object') {
          const success =
            this.settingsManager.updateFromLSPConfiguration(config);
          if (success) {
            this.logger.log(
              LogMessageType.Debug,
              () =>
                `Successfully updated configuration from section: ${configSections[i]}`,
            );
            foundValidConfig = true;
          }
        }
      }

      if (!foundValidConfig) {
        this.logger.log(
          LogMessageType.Warning,
          'No valid configuration found in any of the requested sections',
        );
      }
    } catch (error) {
      this.logger.log(
        LogMessageType.Error,
        () => `Error requesting configuration from client: ${error}`,
      );
    }
  }

  /**
   * Handle configuration update failures with recovery
   */
  private async handleConfigurationFailure(
    previousSettings: any,
  ): Promise<void> {
    this.logger.log(
      LogMessageType.Warning,
      'Attempting to recover from configuration failure',
    );

    try {
      // Try to restore previous settings
      if (previousSettings) {
        const restored =
          this.settingsManager.updateFromLSPConfiguration(previousSettings);
        if (restored) {
          this.logger.log(
            LogMessageType.Info,
            'Successfully restored previous configuration',
          );
        } else {
          this.logger.log(
            LogMessageType.Error,
            'Failed to restore previous configuration',
          );
        }
      }
    } catch (error) {
      this.logger.log(
        LogMessageType.Error,
        () => `Error during configuration recovery: ${error}`,
      );
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
        this.logger.log(
          LogMessageType.Warning,
          'No current settings available for validation',
        );
        return;
      }

      // Log configuration summary for debugging
      this.logger.log(LogMessageType.Debug, () => {
        const settingsKeys = Object.keys(currentSettings);
        return `Current configuration sections: ${settingsKeys.join(', ')}`;
      });

      this.logger.log(
        LogMessageType.Debug,
        'Configuration validation completed',
      );
    } catch (error) {
      this.logger.log(
        LogMessageType.Error,
        () => `Error during configuration validation: ${error}`,
      );
    }
  }

  /**
   * Recover from configuration errors by requesting fresh config
   */
  private async recoverFromConfigurationError(): Promise<void> {
    this.logger.log(
      LogMessageType.Info,
      'Attempting configuration error recovery',
    );

    try {
      if (this.hasConfigurationCapability) {
        await this.requestConfiguration();
        this.logger.log(
          LogMessageType.Info,
          'Successfully recovered configuration from client',
        );
      } else {
        this.logger.log(
          LogMessageType.Warning,
          'Cannot recover configuration: client lacks configuration capability',
        );
      }
    } catch (error) {
      this.logger.log(
        LogMessageType.Error,
        () => `Configuration recovery failed: ${error}`,
      );
    }
  }

  /**
   * Notify about successful configuration application
   */
  private async notifyConfigurationApplied(settings: any): Promise<void> {
    try {
      // This could be extended to notify other components about config changes
      this.logger.log(
        LogMessageType.Info,
        'Configuration successfully applied and validated',
      );

      // Could emit events here for other components to react to config changes
      // this.eventEmitter?.emit('configurationChanged', settings);
    } catch (error) {
      this.logger.log(
        LogMessageType.Error,
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
      this.logger.log(
        LogMessageType.Debug,
        'Configuration change handlers unregistered',
      );
    } catch (error) {
      this.logger.log(
        LogMessageType.Error,
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

    this.logger.log(
      LogMessageType.Debug,
      'LSP configuration handlers set up with enhanced handling',
    );
  }
}
