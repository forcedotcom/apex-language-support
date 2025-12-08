/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  ServerMode,
  RuntimePlatform,
} from '../server/ApexLanguageServerSettings';
import {
  CapabilitiesConfiguration,
  ExtendedServerCapabilities,
  CAPABILITIES_CONFIGURATION,
  WEB_DISABLED_CAPABILITIES,
  DESKTOP_DISABLED_CAPABILITIES,
} from './ApexLanguageServerCapabilities';
import { getLogger } from '../index';

/**
 * Capabilities manager for the Apex Language Server
 *
 * Provides platform-aware capabilities based on server mode and runtime platform.
 * The manager is implemented as a singleton to ensure consistent
 * capabilities across the application.
 *
 * Capabilities are filtered by platform using predefined disabled sets:
 * - WEB_DISABLED_CAPABILITIES - capabilities not available in web environments
 * - DESKTOP_DISABLED_CAPABILITIES - capabilities not available in desktop environments
 */
export class ApexCapabilitiesManager {
  private static instance: ApexCapabilitiesManager;
  private currentMode: ServerMode = 'production';
  private currentPlatform: RuntimePlatform = 'desktop';
  private capabilities: CapabilitiesConfiguration;
  private readonly logger = getLogger();

  private constructor() {
    // Deep copy the capabilities configuration to avoid mutating the exported constants
    this.capabilities = structuredClone(CAPABILITIES_CONFIGURATION);
  }

  /**
   * Get the singleton instance of the capabilities manager
   */
  public static getInstance(): ApexCapabilitiesManager {
    if (!ApexCapabilitiesManager.instance) {
      ApexCapabilitiesManager.instance = new ApexCapabilitiesManager();
    }
    return ApexCapabilitiesManager.instance;
  }

  /**
   * Set the current server mode
   * @param mode - The server mode to set
   */
  public setMode(mode: ServerMode): void {
    this.currentMode = mode;
  }

  /**
   * Get the current server mode
   */
  public getMode(): ServerMode {
    return this.currentMode;
  }

  /**
   * Set the current runtime platform
   * @param platform - The runtime platform to set ('web' or 'desktop')
   */
  public setPlatform(platform: RuntimePlatform): void {
    this.currentPlatform = platform;
  }

  /**
   * Get the current runtime platform
   */
  public getPlatform(): RuntimePlatform {
    return this.currentPlatform;
  }

  /**
   * Get capabilities for the current mode, filtered by platform constraints.
   * Capabilities with disabledForWeb/disabledForDesktop flags are removed
   * or set to undefined based on the current platform.
   */
  public getCapabilities(): ExtendedServerCapabilities {
    const result = this.getCapabilitiesForModeAndPlatform(
      this.currentMode,
      this.currentPlatform,
    );
    return result;
  }

  /**
   * Get raw capabilities for the current mode without platform filtering.
   * Useful for inspecting the full capability configuration.
   */
  public getRawCapabilities(): ExtendedServerCapabilities {
    return this.capabilities[this.currentMode];
  }

  /**
   * Get capabilities for a specific mode, filtered by current platform constraints.
   * @param mode - The server mode to get capabilities for
   */
  public getCapabilitiesForMode(mode: ServerMode): ExtendedServerCapabilities {
    return this.getCapabilitiesForModeAndPlatform(mode, this.currentPlatform);
  }

  /**
   * Get capabilities for a specific mode and platform combination.
   * @param mode - The server mode to get capabilities for
   * @param platform - The runtime platform to filter by
   */
  public getCapabilitiesForModeAndPlatform(
    mode: ServerMode,
    platform: RuntimePlatform,
  ): ExtendedServerCapabilities {
    return this.filterByPlatform(this.capabilities[mode], platform);
  }

  /**
   * Get raw capabilities for a specific mode without platform filtering.
   * Useful for inspecting the full capability configuration.
   * @param mode - The server mode to get capabilities for
   */
  public getRawCapabilitiesForMode(
    mode: ServerMode,
  ): ExtendedServerCapabilities {
    return this.capabilities[mode];
  }

  /**
   * Get all available capabilities configurations
   */
  public getAllCapabilities(): CapabilitiesConfiguration {
    return this.capabilities;
  }

  /**
   * Check if a specific capability is enabled for the current mode
   * @param capability - The capability to check
   */
  public isCapabilityEnabled(
    capability: keyof ExtendedServerCapabilities,
  ): boolean {
    const currentCapabilities = this.getCapabilities();
    return (
      capability in currentCapabilities &&
      currentCapabilities[capability] !== false &&
      currentCapabilities[capability] !== undefined
    );
  }

  /**
   * Check if a specific capability is enabled for a given mode
   * @param mode - The server mode to check
   * @param capability - The capability to check
   */
  public isCapabilityEnabledForMode(
    mode: ServerMode,
    capability: keyof ExtendedServerCapabilities,
  ): boolean {
    const modeCapabilities = this.getCapabilitiesForMode(mode);
    return (
      capability in modeCapabilities &&
      modeCapabilities[capability] !== false &&
      modeCapabilities[capability] !== undefined
    );
  }

  /**
   * Update experimental capabilities based on settings
   */
  public updateExperimentalCapabilities(
    settingsManager: any, // ApexSettingsManager - avoiding circular import
  ): void {
    const settings = settingsManager.getSettings();
    const currentCapabilities = this.getRawCapabilities();

    if (!currentCapabilities.experimental) {
      currentCapabilities.experimental = {};
    }

    // Update findMissingArtifact capability based on settings
    currentCapabilities.experimental.findMissingArtifactProvider = {
      enabled: settings.apex.findMissingArtifact.enabled,
      supportedModes: ['blocking', 'background'],
      maxCandidatesToOpen:
        settings.apex.findMissingArtifact.maxCandidatesToOpen,
      timeoutMsHint: settings.apex.findMissingArtifact.timeoutMsHint,
    };

    this.capabilities[this.currentMode] = currentCapabilities;
  }

  /**
   * Filter capabilities based on platform using predefined disabled capability sets.
   * Capabilities are filtered by checking against WEB_DISABLED_CAPABILITIES or
   * DESKTOP_DISABLED_CAPABILITIES depending on the current platform.
   *
   * @param capabilities - The capabilities object to filter
   * @param platform - The runtime platform to filter by
   * @param pathPrefix - Internal parameter for tracking nested capability paths
   * @returns Filtered capabilities with disabled capabilities removed
   */
  private filterByPlatform<T extends object>(
    capabilities: T,
    platform: RuntimePlatform,
    pathPrefix = '',
  ): T {
    const result: Record<string, unknown> = {};

    // Select the appropriate disabled set based on platform
    const disabledSet =
      platform === 'web'
        ? WEB_DISABLED_CAPABILITIES
        : DESKTOP_DISABLED_CAPABILITIES;

    for (const [key, capability] of Object.entries(capabilities)) {
      // Construct the full capability path (e.g., 'experimental.profilingProvider')
      const capabilityPath = pathPrefix ? `${pathPrefix}.${key}` : key;

      // Check if this capability is disabled for the current platform
      if (disabledSet.has(capabilityPath as any)) {
        result[key] = undefined; // Disabled for this platform
        continue;
      }

      if (capability === undefined || capability === null) {
        result[key] = capability;
        continue;
      }

      // Recursively filter nested objects (e.g., experimental, workspace)
      if (
        typeof capability === 'object' &&
        !Array.isArray(capability) &&
        Object.keys(capability).length > 0
      ) {
        result[key] = this.filterByPlatform(
          capability as Record<string, unknown>,
          platform,
          capabilityPath,
        );
      } else {
        // Plain value (boolean, string, number, array), pass through
        result[key] = capability;
      }
    }

    // Safe cast: we're preserving the shape of T, just filtering values
    return result as unknown as T;
  }
}
