/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { getLogger, setLogLevel } from '@salesforce/apex-lsp-logging';
import type { CompilationOptions } from '@salesforce/apex-lsp-parser-ast';

import {
  ApexLanguageServerSettings,
  DEFAULT_APEX_SETTINGS,
  BROWSER_DEFAULT_APEX_SETTINGS,
  mergeWithDefaults,
  mergeWithExisting,
  validateApexSettings,
} from './ApexLanguageServerSettings';

/**
 * Event listener for settings changes
 */
export type SettingsChangeListener = (
  settings: ApexLanguageServerSettings,
) => void;

/**
 * Settings manager for the Apex Language Server
 * Handles settings lifecycle, validation, and change notifications
 */
export class ApexSettingsManager {
  private static instance: ApexSettingsManager | null = null;
  private currentSettings: ApexLanguageServerSettings;
  private changeListeners: SettingsChangeListener[] = [];
  private readonly logger = getLogger();

  private constructor(
    initialSettings?: Partial<ApexLanguageServerSettings>,
    environment: 'node' | 'browser' = 'node',
  ) {
    this.currentSettings = mergeWithDefaults(
      initialSettings || {},
      environment,
    );
    this.logger.debug(
      () => `ApexSettingsManager initialized for ${environment} environment`,
    );
    this.logger.debug(
      () =>
        `Initial settings: ${JSON.stringify(this.currentSettings, null, 2)}`,
    );
  }

  /**
   * Get the singleton instance of ApexSettingsManager
   */
  public static getInstance(
    initialSettings?: Partial<ApexLanguageServerSettings>,
    environment: 'node' | 'browser' = 'node',
  ): ApexSettingsManager {
    if (!ApexSettingsManager.instance) {
      ApexSettingsManager.instance = new ApexSettingsManager(
        initialSettings,
        environment,
      );
    }
    return ApexSettingsManager.instance;
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    ApexSettingsManager.instance = null;
  }

  /**
   * Get current settings
   */
  public getSettings(): ApexLanguageServerSettings {
    return { ...this.currentSettings };
  }

  /**
   * Update settings (typically called from LSP didChangeConfiguration)
   */
  public updateSettings(
    newSettings: Partial<ApexLanguageServerSettings>,
  ): void {
    this.logger.debug('Updating Apex Language Server settings');
    this.logger.debug(
      () => `New settings: ${JSON.stringify(newSettings, null, 2)}`,
    );

    // Set log level if provided
    if (newSettings.logLevel) {
      setLogLevel(newSettings.logLevel);
      this.logger.debug(() => `Log level set to: ${newSettings.logLevel}`);
    }

    const previousSettings = { ...this.currentSettings };

    // Merge with existing settings to preserve user configuration that isn't being updated
    this.currentSettings = mergeWithExisting(this.currentSettings, newSettings);

    // Log significant changes
    this.logSettingsChanges(previousSettings, this.currentSettings);

    // Notify listeners of settings changes
    this.notifyListeners(this.currentSettings);
  }

  /**
   * Validate and update settings from LSP client
   */
  public updateFromLSPConfiguration(config: any): boolean {
    try {
      if (!config || typeof config !== 'object') {
        this.logger.debug('Invalid LSP configuration received, using defaults');
        return false;
      }

      // Log the received configuration for debugging
      this.logger.debug(
        () => `Received LSP configuration: ${JSON.stringify(config, null, 2)}`,
      );

      // Extract apex-specific settings from the configuration
      const apexConfig = config.apex || config.apexLanguageServer || config;

      // Log the extracted apex configuration
      this.logger.debug(
        () =>
          `Extracted apex configuration: ${JSON.stringify(apexConfig, null, 2)}`,
      );

      // Set log level if provided
      if (apexConfig.logLevel) {
        setLogLevel(apexConfig.logLevel);
        this.logger.debug(() => `Log level set to: ${apexConfig.logLevel}`);
      }

      // Perform validation on the provided configuration keys
      const validationResult = validateApexSettings(apexConfig);

      if (validationResult.isValid) {
        this.logger.debug('LSP configuration validation passed');
        this.updateSettings(apexConfig);
        return true;
      } else {
        // Log validation errors for invalid keys/types
        this.logger.warn(
          () =>
            `LSP configuration has invalid properties. Details: ${validationResult.details.join(', ')}`,
        );

        if (validationResult.invalidKeys.length > 0) {
          this.logger.warn(
            () =>
              `Invalid keys (wrong type): ${validationResult.invalidKeys.join(', ')}`,
          );
        }

        // Still merge the configuration, but warn about the issues
        this.logger.debug('Merging configuration despite validation issues');
        this.updateSettings(apexConfig as Partial<ApexLanguageServerSettings>);
        return true;
      }
    } catch (error) {
      this.logger.error(() => `Error processing LSP configuration: ${error}`);
      return false;
    }
  }

  /**
   * Get CompilationOptions for a specific operation type
   */
  public getCompilationOptions(
    operationType:
      | 'documentChange'
      | 'documentOpen'
      | 'documentSymbols'
      | 'foldingRanges',
    fileSize?: number,
  ): CompilationOptions {
    const settings = this.currentSettings;
    const { commentCollection, performance } = settings;

    // Check if comment collection is globally disabled
    if (!commentCollection.enableCommentCollection) {
      return {
        includeComments: false,
        includeSingleLineComments: false,
        associateComments: false,
      };
    }

    // Check file size limits
    if (fileSize && fileSize > performance.commentCollectionMaxFileSize) {
      this.logger.debug(
        () =>
          `File size ${fileSize} exceeds limit ${performance.commentCollectionMaxFileSize}, disabling comments`,
      );
      return {
        includeComments: false,
        includeSingleLineComments: false,
        associateComments: false,
      };
    }

    // Determine if comments should be included for this operation type
    let includeComments = false;
    switch (operationType) {
      case 'documentChange':
        includeComments = commentCollection.enableForDocumentChanges;
        break;
      case 'documentOpen':
        includeComments = commentCollection.enableForDocumentOpen;
        break;
      case 'documentSymbols':
        includeComments = commentCollection.enableForDocumentSymbols;
        break;
      case 'foldingRanges':
        includeComments = commentCollection.enableForFoldingRanges;
        break;
    }

    const compilationOptions = {
      includeComments,
      includeSingleLineComments:
        includeComments && commentCollection.includeSingleLineComments,
      associateComments:
        includeComments && commentCollection.associateCommentsWithSymbols,
    };

    this.logger.debug(
      () =>
        `Final CompilationOptions for ${operationType}: ${JSON.stringify(compilationOptions, null, 2)}`,
    );

    return compilationOptions;
  }

  /**
   * Register a listener for settings changes
   */
  public onSettingsChange(listener: SettingsChangeListener): () => void {
    this.changeListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.changeListeners.indexOf(listener);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get environment-specific default settings
   */
  public static getDefaultSettings(
    environment: 'node' | 'browser' = 'node',
  ): ApexLanguageServerSettings {
    return environment === 'browser'
      ? BROWSER_DEFAULT_APEX_SETTINGS
      : DEFAULT_APEX_SETTINGS;
  }

  /**
   * Check if performance logging is enabled
   */
  public isPerformanceLoggingEnabled(): boolean {
    return this.currentSettings.environment.enablePerformanceLogging;
  }

  /**
   * Get the debounce delay for document changes
   */
  public getDocumentChangeDebounceMs(): number {
    return this.currentSettings.performance.documentChangeDebounceMs;
  }

  /**
   * Check if async comment processing should be used
   */
  public shouldUseAsyncCommentProcessing(): boolean {
    return this.currentSettings.performance.useAsyncCommentProcessing;
  }

  /**
   * Get the resource loading mode
   */
  public getResourceLoadMode(): 'lazy' | 'full' {
    return this.currentSettings.resources.loadMode;
  }

  private notifyListeners(settings: ApexLanguageServerSettings): void {
    this.changeListeners.forEach((listener) => {
      try {
        listener(settings);
      } catch (error) {
        this.logger.error(
          () => `Error notifying settings change listener: ${error}`,
        );
      }
    });
  }

  private logSettingsChanges(
    previous: ApexLanguageServerSettings,
    current: ApexLanguageServerSettings,
  ): void {
    const changes: string[] = [];

    // Check comment collection changes
    const prevComment = previous.commentCollection;
    const currComment = current.commentCollection;

    if (
      prevComment.enableCommentCollection !==
      currComment.enableCommentCollection
    ) {
      changes.push(
        `comment collection: ${prevComment.enableCommentCollection} → ${currComment.enableCommentCollection}`,
      );
    }

    if (
      prevComment.associateCommentsWithSymbols !==
      currComment.associateCommentsWithSymbols
    ) {
      changes.push(
        // eslint-disable-next-line max-len
        `comment association: ${prevComment.associateCommentsWithSymbols} → ${currComment.associateCommentsWithSymbols}`,
      );
    }

    // Check performance changes
    const prevPerf = previous.performance;
    const currPerf = current.performance;

    if (
      prevPerf.commentCollectionMaxFileSize !==
      currPerf.commentCollectionMaxFileSize
    ) {
      changes.push(
        `max file size: ${prevPerf.commentCollectionMaxFileSize} → ${currPerf.commentCollectionMaxFileSize}`,
      );
    }

    // Check resource changes
    const prevResources = previous.resources;
    const currResources = current.resources;

    if (prevResources.loadMode !== currResources.loadMode) {
      changes.push(
        `resource load mode: ${prevResources.loadMode} → ${currResources.loadMode}`,
      );
    }

    if (changes.length > 0) {
      this.logger.debug(() => `Settings changed: ${changes.join(', ')}`);
    }
  }
}
