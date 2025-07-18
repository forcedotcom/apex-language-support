/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ServerCapabilities } from 'vscode-languageserver-protocol';

import {
  ApexCapabilitiesManager,
  ServerMode,
} from '../capabilities/ApexCapabilitiesManager';
import { ExtendedServerCapabilities } from '../capabilities/ApexLanguageServerCapabilities';
import {
  ApexSettingsManager,
  SettingsChangeListener,
} from './ApexSettingsManager';
import {
  ApexLanguageServerSettings,
  mergeWithDefaults,
  validateApexSettings,
} from './ApexLanguageServerSettings';

/**
 * Configuration options for the LSP server
 */
export interface LSPConfigurationOptions {
  /** The server mode to use */
  mode?: ServerMode;

  /** Custom capabilities to override defaults */
  customCapabilities?: Partial<ExtendedServerCapabilities>;

  /** Initial settings for the language server */
  initialSettings?: Partial<ApexLanguageServerSettings>;

  /** Environment detection (node, browser, web-worker) */
  environment?: 'node' | 'browser' | 'web-worker';

  /** Whether to auto-detect environment and mode */
  autoDetectEnvironment?: boolean;
}

/**
 * Manages LSP configuration and capabilities for the Apex Language Server
 *
 * Provides a unified interface for configuring the language server
 * capabilities and settings based on server mode, environment, and custom overrides.
 * Integrates with both capabilities management and settings management systems.
 */
export class LSPConfigurationManager {
  private capabilitiesManager: ApexCapabilitiesManager;
  private settingsManager: ApexSettingsManager;
  private customCapabilities?: Partial<ExtendedServerCapabilities>;
  private environment: 'node' | 'browser' | 'web-worker';
  private autoDetectEnvironment: boolean;
  private settingsChangeListener?: () => void;

  constructor(options: LSPConfigurationOptions = {}) {
    this.capabilitiesManager = ApexCapabilitiesManager.getInstance();
    this.environment = options.environment || this.detectEnvironment();
    this.autoDetectEnvironment = options.autoDetectEnvironment ?? true;

    // Initialize settings manager
    this.settingsManager = ApexSettingsManager.getInstance(
      options.initialSettings,
      this.environment === 'browser' ? 'browser' : 'node',
    );

    // Set the mode if provided, otherwise auto-detect
    if (options.mode) {
      this.capabilitiesManager.setMode(options.mode);
    } else if (this.autoDetectEnvironment) {
      this.autoDetectMode();
    }

    // Store custom capabilities if provided
    if (options.customCapabilities) {
      this.customCapabilities = options.customCapabilities;
    }

    // Set up settings change listener
    this.setupSettingsChangeListener();
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
   * Get current settings
   * @returns The current language server settings
   */
  public getSettings(): ApexLanguageServerSettings {
    return this.settingsManager.getSettings();
  }

  /**
   * Update settings from LSP configuration
   * @param config - The LSP configuration object
   * @returns True if the configuration was successfully applied
   */
  public updateFromLSPConfiguration(config: any): boolean {
    return this.settingsManager.updateFromLSPConfiguration(config);
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
   * Register a listener for settings changes
   * @param listener - The listener function to call when settings change
   * @returns A function to unsubscribe the listener
   */
  public onSettingsChange(listener: SettingsChangeListener): () => void {
    return this.settingsManager.onSettingsChange(listener);
  }

  /**
   * Get the current environment
   * @returns The current environment
   */
  public getEnvironment(): 'node' | 'browser' | 'web-worker' {
    return this.environment;
  }

  /**
   * Set the environment and update related configurations
   * @param environment - The environment to set
   */
  public setEnvironment(environment: 'node' | 'browser' | 'web-worker'): void {
    this.environment = environment;

    // Update settings manager with new environment
    const currentSettings = this.settingsManager.getSettings();
    const newSettings = mergeWithDefaults(
      currentSettings,
      environment === 'browser' ? 'browser' : 'node',
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
   * Check if performance logging is enabled
   * @returns True if performance logging is enabled
   */
  public isPerformanceLoggingEnabled(): boolean {
    return this.settingsManager.isPerformanceLoggingEnabled();
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
  public getResourceLoadMode(): 'lazy' | 'full' {
    return this.settingsManager.getResourceLoadMode();
  }

  /**
   * Validate configuration object
   * @param config - The configuration object to validate
   * @returns Validation result
   */
  public validateConfiguration(config: any) {
    return validateApexSettings(config);
  }

  /**
   * Get default settings for the current environment
   * @returns Default settings for the current environment
   */
  public getDefaultSettings(): ApexLanguageServerSettings {
    return ApexSettingsManager.getDefaultSettings(
      this.environment === 'browser' ? 'browser' : 'node',
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
  private detectEnvironment(): 'node' | 'browser' | 'web-worker' {
    // Check for browser environment
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      return 'browser';
    }
    // Check for web worker environment
    if (
      typeof globalThis !== 'undefined' &&
      'self' in globalThis &&
      'importScripts' in globalThis
    ) {
      return 'web-worker';
    }
    // Default to node environment
    return 'node';
  }

  /**
   * Auto-detect the appropriate server mode based on environment and settings
   */
  private autoDetectMode(): void {
    const settings = this.settingsManager.getSettings();

    // Use development mode if performance logging is enabled
    if (settings.environment.enablePerformanceLogging) {
      this.capabilitiesManager.setMode('development');
      return;
    }

    // Use production mode for browser environments by default
    if (this.environment === 'browser') {
      this.capabilitiesManager.setMode('production');
      return;
    }

    // Use development mode for node environments in development
    if (this.environment === 'node' && process.env.NODE_ENV === 'development') {
      this.capabilitiesManager.setMode('development');
      return;
    }

    // Default to production mode
    this.capabilitiesManager.setMode('production');
  }

  /**
   * Set up settings change listener to handle configuration updates
   */
  private setupSettingsChangeListener(): void {
    this.settingsChangeListener = this.settingsManager.onSettingsChange(
      (newSettings) => {
        // Handle settings changes that might affect capabilities
        if (
          newSettings.environment.enablePerformanceLogging &&
          this.capabilitiesManager.getMode() === 'production'
        ) {
          // Switch to development mode if performance logging is enabled
          this.capabilitiesManager.setMode('development');
        }
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
}
