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

    this.logger.debug(
      () => `Capability detection breakdown:
       - workspace exists: ${!!capabilities.workspace}
       - didChangeConfiguration exists: ${!!(capabilities.workspace && capabilities.workspace.didChangeConfiguration)}
       - dynamicRegistration value: ${capabilities.workspace?.didChangeConfiguration?.dynamicRegistration}
       - final hasWorkspaceConfiguration: ${this.hasWorkspaceConfiguration}`,
    );

    this.logger.debug(
      () =>
        `Client capabilities received: ${JSON.stringify(capabilities, null, 2)}`,
    );
    this.logger.debug(
      `Client capabilities - configuration: ${this.hasConfigurationCapability}, ` +
        `workspace: ${this.hasWorkspaceConfiguration}`,
    );

    // Log specific workspace capabilities for debugging
    if (capabilities.workspace) {
      this.logger.debug(
        () =>
          `Workspace capabilities: ${JSON.stringify(capabilities.workspace, null, 2)}`,
      );
    } else {
      this.logger.warn('No workspace capabilities found in client');
    }

    // Extract initial settings from initialization options FIRST
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
   * Enhanced configuration change handler with validation and error recovery
   */
  private async handleConfigurationChangeEnhanced(
    params: DidChangeConfigurationParams,
  ): Promise<void> {
    this.logger.debug('Handling enhanced configuration change notification');

    try {
      // Validate the configuration change params
      if (!params) {
        this.logger.warn('Received empty configuration change parameters');
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
          this.logger.debug(
            () =>
              `Processing settings from notification: ${JSON.stringify(params.settings, null, 2)}`,
          );

          const success = this.settingsManager.updateFromLSPConfiguration(
            params.settings,
          );

          if (success) {
            this.logger.debug(
              'Successfully updated settings from notification',
            );

            // Notify about successful configuration change
            await this.notifyConfigurationApplied(params.settings);
          } else {
            this.logger.error('Failed to update settings from notification');

            // Attempt to restore previous settings on failure
            await this.handleConfigurationFailure(previousSettings);
            return;
          }
        } else {
          this.logger.warn(
            'No settings provided in configuration change notification',
          );
          return;
        }
      }

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
    } catch (error) {
      this.logger.error(
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
        this.logger.debug(
          'Successfully registered for dynamic configuration change notifications',
        );
      } else {
        this.logger.debug(
          'Client does not support dynamic configuration registration, using static handler',
        );
      }

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
   * Request current configuration from the client
   */
  public async requestConfiguration(): Promise<void> {
    if (!this.connection) {
      this.logger.warn('Cannot request configuration: no connection available');
      return;
    }

    if (!this.hasConfigurationCapability) {
      this.logger.warn(
        'Cannot request configuration: client does not support workspace.configuration',
      );
      return;
    }

    try {
      this.logger.debug('Requesting configuration from client');

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

      this.logger.debug(
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
            this.logger.debug(
              () =>
                `Successfully updated configuration from section: ${configSections[i]}`,
            );
            foundValidConfig = true;
          }
        }
      }

      if (!foundValidConfig) {
        this.logger.warn(
          'No valid configuration found in any of the requested sections',
        );
      }
    } catch (error) {
      this.logger.error(
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
   * Recover from configuration errors by requesting fresh config
   */
  private async recoverFromConfigurationError(): Promise<void> {
    this.logger.debug('Attempting configuration error recovery');

    try {
      if (this.hasConfigurationCapability) {
        await this.requestConfiguration();
        this.logger.debug('Successfully recovered configuration from client');
      } else {
        this.logger.warn(
          'Cannot recover configuration: client lacks configuration capability',
        );
      }
    } catch (error) {
      this.logger.error(() => `Configuration recovery failed: ${error}`);
    }
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
