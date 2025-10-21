/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { formattedError } from '../utils/ErrorUtils';
import { getLogger, setLogLevel } from '../index';
import type {
  ApexLanguageServerSettings,
  ResourceLoadMode,
  RuntimePlatform,
  ServerMode,
} from '../server/ApexLanguageServerSettings';
// Local type definition to avoid dependency on parser-ast package
export interface CompilationOptions {
  [key: string]: any;
}

import {
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
    runtimePlatform: RuntimePlatform = 'desktop',
  ) {
    this.currentSettings = mergeWithDefaults(
      initialSettings || {},
      runtimePlatform,
    );
    this.logger.debug(
      () =>
        `ApexSettingsManager initialized for ${runtimePlatform} environment`,
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
    runtimePlatform: RuntimePlatform = 'desktop',
  ): ApexSettingsManager {
    if (!ApexSettingsManager.instance) {
      ApexSettingsManager.instance = new ApexSettingsManager(
        initialSettings,
        runtimePlatform,
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
   * Get the current server mode
   * @returns The current server mode (production or development)
   */
  public getServerMode(): ServerMode {
    return this.currentSettings.apex.environment.serverMode ?? 'production';
  }

  /**
   * Set the server mode
   * @param mode - The server mode to set
   * @returns True if the value changed
   */
  public setServerMode(mode: ServerMode): boolean {
    const currentMode = this.getServerMode();
    if (currentMode !== mode) {
      this.currentSettings.apex.environment.serverMode = mode;
      this.logger.debug(`Server mode changed from ${currentMode} to ${mode}`);
      this.notifyListeners(this.currentSettings);
      return true;
    }
    return false;
  }

  /**
   * Get the runtime platform
   * @returns The current runtime platform
   */
  public getRuntimePlatform(): RuntimePlatform {
    return this.currentSettings.apex.environment.runtimePlatform;
  }

  /**
   * Set the runtime platform
   * @param platform - The runtime platform to set
   * @returns True if the value changed
   */
  public setRuntimePlatform(platform: RuntimePlatform): boolean {
    const currentPlatform = this.getRuntimePlatform();
    if (currentPlatform !== platform) {
      this.currentSettings.apex.environment.runtimePlatform = platform;
      this.logger.debug(
        `Runtime platform changed from ${currentPlatform} to ${platform}`,
      );
      this.notifyListeners(this.currentSettings);
      return true;
    }
    return false;
  }

  /**
   * Get the standard Apex library path
   * @returns The current standard Apex library path
   */
  public getStandardApexLibraryPath(): string | undefined {
    return this.currentSettings.apex.resources.standardApexLibraryPath;
  }

  /**
   * Set the standard Apex library path
   * @param path - The standard Apex library path to set
   * @returns True if the value changed
   */
  public setStandardApexLibraryPath(path: string | undefined): boolean {
    const currentPath = this.getStandardApexLibraryPath();
    if (currentPath !== path) {
      this.currentSettings.apex.resources.standardApexLibraryPath = path;
      this.logger.debug(
        `Standard Apex library path changed from ${currentPath} to ${path}`,
      );
      this.notifyListeners(this.currentSettings);
      return true;
    }
    return false;
  }

  /**
   * Get the log level
   * @returns The current log level
   */
  public getLogLevel(): string | undefined {
    return this.currentSettings.apex.logLevel;
  }

  /**
   * Set the log level
   * @param level - The log level to set
   * @returns True if the value changed
   */
  public setLogLevel(level: string | undefined): boolean {
    const currentLevel = this.getLogLevel();
    if (currentLevel !== level) {
      this.currentSettings.apex.logLevel = level;
      if (level) {
        setLogLevel(level);
      }
      this.logger.debug(`Log level changed from ${currentLevel} to ${level}`);
      this.notifyListeners(this.currentSettings);
      return true;
    }
    return false;
  }

  /**
   * Get the worker log level
   * @returns The current worker log level
   */
  public getWorkerLogLevel(): string | undefined {
    return this.currentSettings.apex.worker.logLevel;
  }

  /**
   * Set the worker log level
   * @param level - The worker log level to set
   * @returns True if the value changed
   */
  public setWorkerLogLevel(level: string | undefined): boolean {
    const currentLevel = this.getWorkerLogLevel();
    if (currentLevel !== level) {
      this.currentSettings.apex.worker.logLevel = level;
      this.logger.debug(
        `Worker log level changed from ${currentLevel} to ${level}`,
      );
      this.notifyListeners(this.currentSettings);
      return true;
    }
    return false;
  }

  /**
   * Get the version
   * @returns The current version
   */
  public getVersion(): string | undefined {
    return this.currentSettings.apex.version;
  }

  /**
   * Set the version
   * @param version - The version to set
   * @returns True if the value changed
   */
  public setVersion(version: string | undefined): boolean {
    const currentVersion = this.getVersion();
    if (currentVersion !== version) {
      this.currentSettings.apex.version = version;
      this.logger.debug(`Version changed from ${currentVersion} to ${version}`);
      this.notifyListeners(this.currentSettings);
      return true;
    }
    return false;
  }

  /**
   * Get enable performance logging setting
   * @returns The current enable performance logging setting
   */
  public getEnablePerformanceLogging(): boolean {
    return this.currentSettings.apex.environment.enablePerformanceLogging;
  }

  /**
   * Set enable performance logging setting
   * @param enabled - The enable performance logging setting to set
   * @returns True if the value changed
   */
  public setEnablePerformanceLogging(enabled: boolean): boolean {
    const currentEnabled = this.getEnablePerformanceLogging();
    if (currentEnabled !== enabled) {
      this.currentSettings.apex.environment.enablePerformanceLogging = enabled;
      this.logger.debug(
        `Enable performance logging changed from ${currentEnabled} to ${enabled}`,
      );
      this.notifyListeners(this.currentSettings);
      return true;
    }
    return false;
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
    if (newSettings?.apex?.logLevel) {
      const logLevel = newSettings.apex.logLevel;
      this.logger.debug(() => `Log level set to: ${logLevel ?? ''}`);
      setLogLevel(logLevel);
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
      this.logger.debug('Received LSP configuration');

      // Extract apex-specific settings from the configuration
      const apexConfig =
        config.settings?.apex || config.apexLanguageServer || config;

      // Check if apexConfig is valid
      if (!apexConfig || typeof apexConfig !== 'object') {
        this.logger.debug(
          'Invalid apex configuration extracted, using defaults',
        );
        return false;
      }

      // Log the extracted apex configuration
      this.logger.debug('Extracted apex configuration');

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
      this.logger.error(
        () =>
          `Error processing LSP configuration: ${formattedError(error, {
            includeStack: true,
            includeProperties: true,
            maxStackLines: 10,
            context: 'LSPConfigurationManager',
          })}`,
      );
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
    const { commentCollection, performance } = settings.apex;

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
    environment: RuntimePlatform = 'desktop',
  ): ApexLanguageServerSettings {
    return environment === 'web'
      ? BROWSER_DEFAULT_APEX_SETTINGS
      : DEFAULT_APEX_SETTINGS;
  }

  /**
   * Check if performance logging is enabled
   */
  public isPerformanceLoggingEnabled(): boolean {
    return this.currentSettings.apex.environment.enablePerformanceLogging;
  }

  /**
   * Get the debounce delay for document changes
   */
  public getDocumentChangeDebounceMs(): number {
    return this.currentSettings.apex.performance.documentChangeDebounceMs;
  }

  /**
   * Check if async comment processing should be used
   */
  public shouldUseAsyncCommentProcessing(): boolean {
    return this.currentSettings.apex.performance.useAsyncCommentProcessing;
  }

  /**
   * Get the resource loading mode
   */
  public getResourceLoadMode(): ResourceLoadMode {
    return this.currentSettings.apex.resources.loadMode ?? 'lazy';
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

  /**
   * Check if findMissingArtifact settings changed
   */
  public hasFindMissingArtifactChanged(
    previous: ApexLanguageServerSettings,
    current: ApexLanguageServerSettings,
  ): boolean {
    return (
      previous.apex.findMissingArtifact.enabled !==
        current.apex.findMissingArtifact.enabled ||
      previous.apex.findMissingArtifact.maxCandidatesToOpen !==
        current.apex.findMissingArtifact.maxCandidatesToOpen ||
      previous.apex.findMissingArtifact.timeoutMsHint !==
        current.apex.findMissingArtifact.timeoutMsHint
    );
  }

  private logSettingsChanges(
    previous: ApexLanguageServerSettings,
    current: ApexLanguageServerSettings,
  ): void {
    const changes: string[] = [];

    // Check comment collection changes
    const prevComment = previous.apex.commentCollection;
    const currComment = current.apex.commentCollection;

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
        `comment association: ${prevComment.associateCommentsWithSymbols} → ` +
          `${currComment.associateCommentsWithSymbols}`,
      );
    }

    // Check performance changes
    const prevPerf = previous.apex.performance;
    const currPerf = current.apex.performance;

    if (
      prevPerf.commentCollectionMaxFileSize !==
      currPerf.commentCollectionMaxFileSize
    ) {
      changes.push(
        `max file size: ${prevPerf.commentCollectionMaxFileSize} → ${currPerf.commentCollectionMaxFileSize}`,
      );
    }

    // Check resource changes
    const prevResources = previous.apex.resources;
    const currResources = current.apex.resources;

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
