/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ServerMode } from '../server/ApexLanguageServerSettings';
import {
  CapabilitiesConfiguration,
  ExtendedServerCapabilities,
  CAPABILITIES_CONFIGURATION,
} from './ApexLanguageServerCapabilities';

/**
 * Capabilities manager for the Apex Language Server
 *
 * Provides platform-agnostic capabilities based on server mode.
 * The manager is implemented as a singleton to ensure consistent
 * capabilities across the application.
 */
export class ApexCapabilitiesManager {
  private static instance: ApexCapabilitiesManager;
  private currentMode: ServerMode = 'production';
  private capabilities: CapabilitiesConfiguration;

  private constructor() {
    this.capabilities = CAPABILITIES_CONFIGURATION;
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
   * Get capabilities for the current mode
   */
  public getCapabilities(): ExtendedServerCapabilities {
    return this.capabilities[this.currentMode];
  }

  /**
   * Get capabilities for a specific mode
   * @param mode - The server mode to get capabilities for
   */
  public getCapabilitiesForMode(mode: ServerMode): ExtendedServerCapabilities {
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
}
