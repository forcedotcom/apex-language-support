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

/**
 * Configuration options for the LSP server
 */
export interface LSPConfigurationOptions {
  /** The server mode to use */
  mode?: ServerMode;

  /** Custom capabilities to override defaults */
  customCapabilities?: Partial<ServerCapabilities>;
}

/**
 * Manages LSP configuration and capabilities for the Apex Language Server
 *
 * Provides a unified interface for configuring the language server
 * capabilities based on server mode and custom overrides.
 */
export class LSPConfigurationManager {
  private capabilitiesManager: ApexCapabilitiesManager;
  private customCapabilities?: Partial<ServerCapabilities>;

  constructor(options: LSPConfigurationOptions = {}) {
    this.capabilitiesManager = ApexCapabilitiesManager.getInstance();

    // Set the mode if provided
    if (options.mode) {
      this.capabilitiesManager.setMode(options.mode);
    }

    // Store custom capabilities if provided
    if (options.customCapabilities) {
      this.customCapabilities = options.customCapabilities;
    }
  }

  /**
   * Get the current server capabilities
   * @returns The current server capabilities with any custom overrides applied
   */
  public getCapabilities(): ServerCapabilities {
    const baseCapabilities = this.capabilitiesManager.getCapabilities();

    // Apply custom overrides if any
    if (this.customCapabilities) {
      return this.mergeCapabilities(baseCapabilities, this.customCapabilities);
    }

    return baseCapabilities;
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
    capabilities: Partial<ServerCapabilities>,
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
  public getCapabilitiesForMode(mode: ServerMode): ServerCapabilities {
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
  public isCapabilityEnabled(capability: keyof ServerCapabilities): boolean {
    const capabilities = this.getCapabilities();
    return capability in capabilities && capabilities[capability] !== false;
  }

  /**
   * Merge base capabilities with custom overrides
   * @param base - The base capabilities
   * @param overrides - The custom overrides to apply
   * @returns The merged capabilities
   */
  private mergeCapabilities(
    base: ServerCapabilities,
    overrides: Partial<ServerCapabilities>,
  ): ServerCapabilities {
    return { ...base, ...overrides };
  }
}
