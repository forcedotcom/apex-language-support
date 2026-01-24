/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ServerCapabilities } from 'vscode-languageserver-protocol';
import type {
  Connection,
  DidChangeConfigurationParams,
} from 'vscode-languageserver';

import { ApexCapabilitiesManager } from '../capabilities/ApexCapabilitiesManager';
import {
  ApexSettingsManager,
  SettingsChangeListener,
} from './ApexSettingsManager';
import {
  generateStartupSummary,
  generateChangeSummary,
} from './ConfigurationSummary';
import {
  mergeWithDefaults,
  validateApexSettings,
} from './ApexSettingsUtilities';
import { getLogger } from '../index';
import type {
  ApexLanguageServerSettings,
  ResourceLoadMode,
  RuntimePlatform,
  ServerMode,
} from '../server/ApexLanguageServerSettings';
import type { ExtendedServerCapabilities } from '../capabilities/ApexLanguageServerCapabilities';

// declare const self: any;

/**
 * Runtime dependencies that can be injected into the LSP server
 * These are system-level dependencies that services may need
 */
export interface LSPRuntimeDependencies {
  /** LSP connection for client communication */
  connection?: Connection;

  /** Additional runtime dependencies can be added here as needed */
}

/**
 * Configuration options for the LSP server
 */
export interface LSPConfigurationOptions {
  /** Custom capabilities to override defaults */
  customCapabilities?: Partial<ExtendedServerCapabilities>;

  /** Whether to auto-detect environment and mode */
  autoDetectEnvironment?: boolean;

  /** Runtime dependencies for services */
  runtime?: LSPRuntimeDependencies;
}

/**
 * Manages LSP configuration and capabilities for the Apex Language Server
 *
 * Provides a interface for configuring the language server
 * capabilities and settings based on server mode, environment, and custom overrides.
 * Integrates with both capabilities management and settings management systems.
 */
export class LSPConfigurationManager {
  private static instance: LSPConfigurationManager | null = null;

  private capabilitiesManager: ApexCapabilitiesManager;
  private settingsManager: ApexSettingsManager;
  private customCapabilities?: Partial<ExtendedServerCapabilities>;
  private runtimePlatform: RuntimePlatform;
  private autoDetectEnvironment: boolean;
  private settingsChangeListener?: () => void;
  private runtimeDependencies?: LSPRuntimeDependencies;
  private readonly logger = getLogger();

  constructor(options: LSPConfigurationOptions = {}) {
    this.capabilitiesManager = ApexCapabilitiesManager.getInstance();
    this.runtimePlatform = this.detectEnvironment();
    this.autoDetectEnvironment = options.autoDetectEnvironment ?? true;

    // Set platform on capabilities manager for platform-aware capability filtering
    this.capabilitiesManager.setPlatform(this.runtimePlatform);

    // Initialize settings manager
    this.settingsManager = ApexSettingsManager.getInstance(
      undefined,
      this.runtimePlatform === 'web' ? 'web' : 'desktop',
    );

    // Store runtime dependencies
    this.runtimeDependencies = options.runtime;

    // Auto-detect mode or use production default
    if (this.autoDetectEnvironment) {
      this.autoDetectMode();
    } else {
      this.capabilitiesManager.setMode('production');
    }

    // Store custom capabilities if provided
    if (options.customCapabilities) {
      this.customCapabilities = options.customCapabilities;
    }

    // Set up settings change listener
    this.setupSettingsChangeListener();

    // Store as singleton instance
    LSPConfigurationManager.instance = this;
  }

  /**
   * Get or create the singleton instance
   * @param options - Configuration options (only used if instance doesn't exist)
   * @returns The singleton instance
   */
  static getInstance(
    options?: LSPConfigurationOptions,
  ): LSPConfigurationManager {
    if (!LSPConfigurationManager.instance) {
      LSPConfigurationManager.instance = new LSPConfigurationManager(options);
    }
    return LSPConfigurationManager.instance;
  }

  /**
   * Reset the singleton instance (mainly for testing)
   */
  static resetInstance(): void {
    LSPConfigurationManager.instance = null;
  }

  /**
   * Get the current server capabilities
   * @returns The current server capabilities with any custom overrides applied
   */
  public getCapabilities(): ServerCapabilities {
    const baseCapabilities: Partial<ServerCapabilities> = Object.entries(
      this.capabilitiesManager.getCapabilities(),
    ).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    // Apply custom overrides if any
    if (this.customCapabilities) {
      return this.mergeCapabilities(baseCapabilities, this.customCapabilities);
    }

    return baseCapabilities;
  }

  /**
   * Get the current extended server capabilities
   * @returns The current extended server capabilities with any custom overrides applied
   */
  public getExtendedServerCapabilities(): ExtendedServerCapabilities {
    return this.capabilitiesManager.getCapabilities();
  }

  /**
   * Set the server mode
   * @param mode - The server mode to set
   */
  public setMode(mode: ServerMode): void {
    this.capabilitiesManager.setMode(mode);
  }

  /**
   * Get the current server mode
   * @returns The current server mode
   */
  public getMode(): ServerMode {
    return this.capabilitiesManager.getMode();
  }

  /**
   * Update server mode dynamically
   * @param mode - The new server mode to set
   */
  public updateServerMode(mode: ServerMode): void {
    this.capabilitiesManager.setMode(mode);
    this.logger.debug(`Server mode updated to: ${mode}`);
  }

  /**
   * Set custom capabilities to override defaults
   * @param capabilities - The custom capabilities to apply
   */
  public setCustomCapabilities(
    capabilities: Partial<ExtendedServerCapabilities>,
  ): void {
    this.customCapabilities = capabilities;
  }

  /**
   * Clear custom capabilities and use defaults
   */
  public clearCustomCapabilities(): void {
    this.customCapabilities = undefined;
  }

  /**
   * Get capabilities for a specific mode
   * @param mode - The server mode to get capabilities for
   * @returns The capabilities for the specified mode with any custom overrides applied
   */
  public getCapabilitiesForMode(mode: ServerMode): ExtendedServerCapabilities {
    const baseCapabilities =
      this.capabilitiesManager.getCapabilitiesForMode(mode);

    // Apply custom overrides if any
    if (this.customCapabilities) {
      return this.mergeCapabilities(baseCapabilities, this.customCapabilities);
    }

    return baseCapabilities;
  }

  /**
   * Check if a specific capability is enabled
   * @param capability - The capability to check
   * @returns True if the capability is enabled
   */
  public isCapabilityEnabled<T extends ServerCapabilities>(
    capability: keyof T,
  ): boolean {
    const capabilities = this.getCapabilities();
    return (
      capability in capabilities &&
      capabilities[capability as keyof ServerCapabilities] !== false
    );
  }

  /**
   * Get current settings (immutable copy)
   * @returns The current language server settings
   */
  public getSettings(): ApexLanguageServerSettings {
    return JSON.parse(JSON.stringify(this.settingsManager.getSettings()));
  }

  /**
   * Get capabilities manager (read-only access)
   * @returns The capabilities manager instance
   */
  public getCapabilitiesManager() {
    return this.capabilitiesManager;
  }

  /**
   * Get settings manager (read-only access)
   * @returns The settings manager instance
   */
  public getSettingsManager() {
    return this.settingsManager;
  }

  /**
   * Get runtime platform
   * @returns The current runtime platform
   */
  public getRuntimePlatform(): RuntimePlatform {
    return this.runtimePlatform;
  }

  /**
   * Check if auto-detect environment is enabled
   * @returns True if auto-detect is enabled
   */
  public isAutoDetectEnabled(): boolean {
    return this.autoDetectEnvironment;
  }

  /**
   * Set initial settings for the language server
   * @param settings - Partial ApexLanguageServerSettings to initialize with
   * @returns True if the settings were set successfully
   */
  public setInitialSettings(
    settings: Partial<ApexLanguageServerSettings>,
  ): boolean {
    try {
      if (!settings || !settings.apex) {
        this.logger.debug('No apex settings provided, u');
        return true;
      }

      const apexSettings = settings.apex;
      let hasChanges = false;

      // Check and set environment settings
      if (apexSettings.environment) {
        const envSettings = apexSettings.environment;

        // Server mode
        if (envSettings.serverMode !== undefined) {
          const changed = this.settingsManager.setServerMode(
            envSettings.serverMode,
          );
          if (changed) {
            this.capabilitiesManager.setMode(envSettings.serverMode);
            hasChanges = true;
          }
        }

        // Runtime platform
        if (envSettings.runtimePlatform !== undefined) {
          const changed = this.settingsManager.setRuntimePlatform(
            envSettings.runtimePlatform,
          );
          if (changed) {
            this.runtimePlatform = envSettings.runtimePlatform;
            hasChanges = true;
          }
        }

        // Set profiling mode
        if (envSettings.profilingMode !== undefined) {
          const changed = this.settingsManager.setProfilingMode(
            envSettings.profilingMode,
          );
          if (changed) {
            hasChanges = true;
          }
        }

        // Profiling type
        if (envSettings.profilingType !== undefined) {
          const changed = this.settingsManager.setProfilingType(
            envSettings.profilingType,
          );
          if (changed) {
            hasChanges = true;
          }
        }

        // Comment collection log level
        if (envSettings.commentCollectionLogLevel !== undefined) {
          const currentLevel =
            this.settingsManager.getSettings().apex.environment
              .commentCollectionLogLevel;
          if (currentLevel !== envSettings.commentCollectionLogLevel) {
            this.settingsManager.updateSettings({
              apex: {
                environment: {
                  commentCollectionLogLevel:
                    envSettings.commentCollectionLogLevel,
                },
              },
            } as Partial<ApexLanguageServerSettings>);
            hasChanges = true;
          }
        }
      }

      // Check and set resource settings
      if (apexSettings.resources) {
        const resourceSettings = apexSettings.resources;

        // Standard Apex library path
        if (resourceSettings.standardApexLibraryPath !== undefined) {
          const changed = this.settingsManager.setStandardApexLibraryPath(
            resourceSettings.standardApexLibraryPath,
          );
          if (changed) {
            hasChanges = true;
          }
        }

        // Load mode
        if (resourceSettings.loadMode !== undefined) {
          const currentMode =
            this.settingsManager.getSettings().apex.resources.loadMode;
          if (currentMode !== resourceSettings.loadMode) {
            this.settingsManager.updateSettings({
              apex: {
                resources: {
                  loadMode: resourceSettings.loadMode,
                },
              },
            } as Partial<ApexLanguageServerSettings>);
            hasChanges = true;
          }
        }
      }

      // Check and set log levels
      if (apexSettings.logLevel !== undefined) {
        const changed = this.settingsManager.setLogLevel(apexSettings.logLevel);
        if (changed) {
          hasChanges = true;
        }
      }

      if (apexSettings.worker?.logLevel !== undefined) {
        const changed = this.settingsManager.setWorkerLogLevel(
          apexSettings.worker.logLevel,
        );
        if (changed) {
          hasChanges = true;
        }
      }

      // Check and set version
      if (apexSettings.version !== undefined) {
        const changed = this.settingsManager.setVersion(apexSettings.version);
        if (changed) {
          hasChanges = true;
        }
      }

      // Check and set comment collection settings
      if (apexSettings.commentCollection) {
        const currentCommentCollection =
          this.settingsManager.getSettings().apex.commentCollection;
        const newCommentCollection = apexSettings.commentCollection;

        // Check each property individually
        const commentCollectionChanges: any = {};
        let hasCommentChanges = false;

        Object.keys(newCommentCollection).forEach((key) => {
          const typedKey = key as keyof typeof newCommentCollection;
          if (
            currentCommentCollection[typedKey] !==
            newCommentCollection[typedKey]
          ) {
            commentCollectionChanges[typedKey] = newCommentCollection[typedKey];
            hasCommentChanges = true;
          }
        });

        if (hasCommentChanges) {
          this.settingsManager.updateSettings({
            apex: {
              commentCollection: commentCollectionChanges,
            },
          } as Partial<ApexLanguageServerSettings>);
          hasChanges = true;
        }
      }

      // Check and set performance settings
      if (apexSettings.performance) {
        const currentPerformance =
          this.settingsManager.getSettings().apex.performance;
        const newPerformance = apexSettings.performance;

        const performanceChanges: any = {};
        let hasPerformanceChanges = false;

        Object.keys(newPerformance).forEach((key) => {
          const typedKey = key as keyof typeof newPerformance;
          if (currentPerformance[typedKey] !== newPerformance[typedKey]) {
            performanceChanges[typedKey] = newPerformance[typedKey];
            hasPerformanceChanges = true;
          }
        });

        if (hasPerformanceChanges) {
          this.settingsManager.updateSettings({
            apex: {
              performance: performanceChanges,
            },
          } as Partial<ApexLanguageServerSettings>);
          hasChanges = true;
        }
      }

      // Check and set missing artifact settings
      if (apexSettings.findMissingArtifact) {
        const currentMissingArtifact =
          this.settingsManager.getSettings().apex.findMissingArtifact;
        const newMissingArtifact = apexSettings.findMissingArtifact;

        const missingArtifactChanges: any = {};
        let hasMissingArtifactChanges = false;

        Object.keys(newMissingArtifact).forEach((key) => {
          const typedKey = key as keyof typeof newMissingArtifact;
          if (
            currentMissingArtifact[typedKey] !== newMissingArtifact[typedKey]
          ) {
            missingArtifactChanges[typedKey] = newMissingArtifact[typedKey];
            hasMissingArtifactChanges = true;
          }
        });

        if (hasMissingArtifactChanges) {
          this.settingsManager.updateSettings({
            apex: {
              findMissingArtifact: missingArtifactChanges,
            },
          } as Partial<ApexLanguageServerSettings>);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        this.logger.debug('Initial settings applied with changes detected');
      } else {
        this.logger.debug('Initial settings applied - no changes detected');
      }

      // Generate and log startup summary using alwaysLog
      const currentSettings = this.settingsManager.getSettings();
      const serverMode =
        currentSettings.apex.environment?.serverMode || 'production';
      const startupSummary = generateStartupSummary(
        currentSettings,
        serverMode,
      );
      getLogger().alwaysLog(startupSummary);

      return true;
    } catch (error) {
      this.logger.error(`Failed to set initial settings: ${error}`);
      return false;
    }
  }

  /**
   * Safely update a specific setting
   * @param path - The setting path (e.g., 'apex.environment.serverMode')
   * @param value - The new value
   * @returns True if the setting was updated successfully
   */
  public updateSetting(path: string, value: any): boolean {
    try {
      // Use the existing updateSettings method with a nested object
      const updateObj = this.createNestedObject(path, value);
      this.settingsManager.updateSettings(updateObj);
      return true;
    } catch (error) {
      this.logger.error(`Failed to update setting ${path}: ${error}`);
      return false;
    }
  }

  /**
   * Create a nested object from a dot-notation path
   * @param path - The dot-notation path (e.g., 'apex.environment.serverMode')
   * @param value - The value to set
   * @returns The nested object
   */
  private createNestedObject(path: string, value: any): any {
    const keys = path.split('.');
    const result: any = {};
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = {};
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    return result;
  }

  /**
   * Update settings from LSP configuration
   * @param config - The LSP configuration object
   * @returns True if the configuration was successfully applied
   */
  public updateFromLSPConfiguration(
    config: DidChangeConfigurationParams,
  ): boolean {
    // Handle null or undefined settings
    if (!config || config.settings === null || config.settings === undefined) {
      getLogger().warn('Received null or undefined settings, skipping update');
      return false;
    }

    // Capture previous settings for comparison
    const previousSettings = this.settingsManager.getSettings();

    const result = this.settingsManager.updateFromLSPConfiguration(
      config.settings,
    );

    if (result) {
      // Generate configuration change summary
      const currentSettings = this.settingsManager.getSettings();
      const changeSummary = generateChangeSummary(
        previousSettings,
        currentSettings,
      );
      getLogger().alwaysLog(changeSummary);

      this.syncCapabilitiesWithSettings();
    }

    return result;
  }

  /**
   * Update settings directly
   * @param newSettings - The new settings to apply
   */
  public updateSettings(
    newSettings: Partial<ApexLanguageServerSettings>,
  ): void {
    this.settingsManager.updateSettings(newSettings);
  }

  /**
   * Get runtime dependencies
   * @returns The runtime dependencies (connection, etc.)
   */
  public getRuntimeDependencies(): LSPRuntimeDependencies | undefined {
    return this.runtimeDependencies;
  }

  /**
   * Get LSP connection from runtime dependencies
   * @returns The LSP connection if available
   */
  public getConnection(): Connection | undefined {
    return this.runtimeDependencies?.connection;
  }

  /**
   * Set the LSP connection for client communication
   * @param connection - The LSP connection
   */
  public setConnection(connection: Connection): void {
    if (!this.runtimeDependencies) {
      this.runtimeDependencies = {};
    }
    this.runtimeDependencies.connection = connection;
    this.logger.debug('LSP connection set in configuration manager');
  }

  /**
   * Register a listener for settings changes
   * @param listener - The listener function to call when settings change
   * @returns A function to unsubscribe the listener
   */
  public onSettingsChange(listener: SettingsChangeListener): () => void {
    return this.settingsManager.onSettingsChange(listener);
  }

  /**
   * Set the environment and update related configurations
   * @param runtimePlatform - The environment to set
   */
  public setEnvironment(runtimePlatform: RuntimePlatform): void {
    this.runtimePlatform = runtimePlatform;

    // Update platform on capabilities manager for platform-aware capability filtering
    this.capabilitiesManager.setPlatform(runtimePlatform);

    // Update settings manager with new environment
    const currentSettings = this.settingsManager.getSettings();
    const newSettings = mergeWithDefaults(
      currentSettings,
      runtimePlatform === 'web' ? 'web' : 'desktop',
    );
    this.settingsManager.updateSettings(newSettings);

    // Auto-detect mode if enabled
    if (this.autoDetectEnvironment) {
      this.autoDetectMode();
    }
  }

  /**
   * Get compilation options for a specific operation
   * @param operationType - The type of operation
   * @param fileSize - Optional file size for performance considerations
   * @returns Compilation options for the operation
   */
  public getCompilationOptions(
    operationType:
      | 'documentChange'
      | 'documentOpen'
      | 'documentSymbols'
      | 'foldingRanges',
    fileSize?: number,
  ) {
    return this.settingsManager.getCompilationOptions(operationType, fileSize);
  }

  /**
   * Check if performance profiling is enabled
   * @returns True if performance profiling is enabled
   */
  public isPerformanceProfilingEnabled(): boolean {
    return this.settingsManager.isPerformanceProfilingEnabled();
  }

  /**
   * Get the debounce delay for document changes
   * @returns The debounce delay in milliseconds
   */
  public getDocumentChangeDebounceMs(): number {
    return this.settingsManager.getDocumentChangeDebounceMs();
  }

  /**
   * Check if async comment processing should be used
   * @returns True if async comment processing should be used
   */
  public shouldUseAsyncCommentProcessing(): boolean {
    return this.settingsManager.shouldUseAsyncCommentProcessing();
  }

  /**
   * Get the resource loading mode
   * @returns The resource loading mode
   */
  public getResourceLoadMode(): ResourceLoadMode {
    return this.settingsManager.getResourceLoadMode();
  }

  /**
   * Validate configuration object
   * @param config - The configuration object to validate
   * @returns Validation result
   */
  public validateConfiguration(config: ApexLanguageServerSettings) {
    return validateApexSettings(config);
  }

  /**
   * Get default settings for the current environment
   * @returns Default settings for the current environment
   */
  public getDefaultSettings(): ApexLanguageServerSettings {
    return ApexSettingsManager.getDefaultSettings(
      this.runtimePlatform === 'web' ? 'web' : 'desktop',
    );
  }

  /**
   * Reset configuration to defaults
   */
  public resetToDefaults(): void {
    const defaultSettings = this.getDefaultSettings();
    this.settingsManager.updateSettings(defaultSettings);
    this.clearCustomCapabilities();
  }

  /**
   * Clean up resources and listeners
   */
  public dispose(): void {
    if (this.settingsChangeListener) {
      this.settingsChangeListener();
      this.settingsChangeListener = undefined;
    }
  }

  /**
   * Auto-detect the current environment
   * @returns The detected environment
   */
  private detectEnvironment(): RuntimePlatform {
    // Check for browser main thread environment (has window object)
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      return 'web';
    }

    // Check for web worker environment (both classic and ES module workers)
    // Web workers are part of the web platform but don't have window
    if (
      typeof globalThis !== 'undefined' &&
      'self' in globalThis &&
      // Check for worker-specific properties that exist in both classic and ES module workers
      ('DedicatedWorkerGlobalScope' in globalThis ||
        'SharedWorkerGlobalScope' in globalThis ||
        'ServiceWorkerGlobalScope' in globalThis ||
        // For ES module workers, check if we're in a worker context
        (typeof self !== 'undefined' &&
          'postMessage' in self &&
          'importScripts' in self))
    ) {
      return 'web'; // Web workers are part of the web platform
    }

    // Default to Node.js/desktop environment
    return 'desktop';
  }

  /**
   * Auto-detect the appropriate server mode based on environment and settings
   */
  private autoDetectMode(): void {
    const serverMode = this.settingsManager.getServerMode();

    // Use development mode if any profiling is enabled
    if (this.settingsManager.getProfilingMode() !== 'none') {
      this.capabilitiesManager.setMode('development');
      return;
    }

    // Default to server mode from settings
    this.capabilitiesManager.setMode(serverMode);
  }

  /**
   * Set up settings change listener to handle configuration updates
   */
  private setupSettingsChangeListener(): void {
    this.settingsChangeListener = this.settingsManager.onSettingsChange(
      (newSettings) => {
        // Handle settings changes that might affect capabilities
        if (this.settingsManager.getProfilingMode() !== 'none') {
          // Switch to development mode if any profiling is enabled
          this.capabilitiesManager.setMode('development');
        }
        // Note: The settings are already updated when this listener is triggered
        // We only need to react to the changes, not update the settings again
      },
    );
  }

  /**
   * Merge base capabilities with custom overrides
   * @param base - The base capabilities
   * @param overrides - The custom overrides to apply
   * @returns The merged capabilities
   */
  private mergeCapabilities<T extends ServerCapabilities>(
    base: T,
    overrides: Partial<T>,
  ): T {
    return { ...base, ...overrides };
  }

  /**
   * Synchronize server capabilities with current settings
   */
  public syncCapabilitiesWithSettings(): void {
    this.capabilitiesManager.updateExperimentalCapabilities(
      this.settingsManager,
    );
    this.logger.debug(
      `Synchronized server capabilities with settings: ${JSON.stringify(this.getExtendedServerCapabilities())}`,
    );
  }
}
