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
      `Client capabilities - configuration: ${this.hasConfigurationCapability}, ` +
        `workspace: ${this.hasWorkspaceConfiguration}`,
    );

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
    }

    // Extract workspace folder information for environment detection
    if (params.workspaceFolders && params.workspaceFolders.length > 0) {
      this.logger.debug(
        `Workspace folders: ${params.workspaceFolders.map((f) => f.uri).join(', ')}`,
      );
    }
  }

  /**
   * Handle workspace configuration changes
   */
  public async handleConfigurationChange(
    params: DidChangeConfigurationParams,
  ): Promise<void> {
    this.logger.debug('Handling configuration change notification');

    if (this.hasConfigurationCapability) {
      // Request the latest configuration from the client
      await this.requestConfiguration();
    } else {
      // Fallback: use the settings from the notification
      if (params.settings) {
        this.logger.debug(
          () =>
            `Using settings from notification: ${JSON.stringify(params.settings, null, 2)}`,
        );

        const success = this.settingsManager.updateFromLSPConfiguration(
          params.settings,
        );

        if (success) {
          this.logger.debug('Successfully updated settings from notification');
        } else {
          this.logger.warn('Failed to update settings from notification');
        }
      }
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
      this.logger.error('Error requesting configuration from client:', error);
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

    if (this.hasWorkspaceConfiguration) {
      // Register for dynamic configuration changes
      this.connection.client.register(
        DidChangeConfigurationNotification.type,
        undefined,
      );
      this.logger.debug(
        'Registered for dynamic configuration change notifications',
      );
    } else {
      this.logger.debug(
        'Client does not support dynamic configuration registration',
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
          },
        },
      },
    };
  }

  private setupConfigurationHandlers(): void {
    if (!this.connection) {
      return;
    }

    // Handle configuration change notifications
    this.connection.onDidChangeConfiguration(
      async (params: DidChangeConfigurationParams) => {
        await this.handleConfigurationChange(params);
      },
    );

    this.logger.debug('LSP configuration handlers set up');
  }
}
