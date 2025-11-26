/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  LoggerInterface,
  LSPConfigurationManager,
  ApexSettingsManager,
  Priority,
} from '@salesforce/apex-lsp-shared';
import type { FindMissingArtifactParams } from '@salesforce/apex-lsp-shared';
import { LSPQueueManager } from '../queue';
import type { Connection } from 'vscode-languageserver';

/**
 * Result types for blocking resolution
 */
export type BlockingResult =
  | 'resolved'
  | 'not-found'
  | 'timeout'
  | 'cancelled'
  | 'unsupported';

/**
 * Configuration for missing artifact resolution
 */
export interface MissingArtifactConfig {
  readonly blockingWaitTimeoutMs: number;
  readonly indexingBarrierPollMs?: number;
}

/**
 * Service interface for missing artifact resolution
 */
export interface MissingArtifactResolutionService {
  readonly resolveBlocking: (
    params: FindMissingArtifactParams,
  ) => Promise<BlockingResult>;
  readonly resolveInBackground: (
    params: FindMissingArtifactParams,
  ) => Promise<void>;
}

/**
 * Enhanced implementation of MissingArtifactResolutionService
 * Integrates with the LSP queue system and communicates with the client
 */
export class EnhancedMissingArtifactResolutionService
  implements MissingArtifactResolutionService
{
  private queueManager: LSPQueueManager | null = null;

  constructor(
    private readonly logger: LoggerInterface,
    private readonly config: MissingArtifactConfig,
  ) {
    // Don't initialize queueManager in constructor to avoid circular dependency
    // It will be lazily initialized when first needed
  }

  /**
   * Get queue manager with lazy initialization to avoid circular dependency
   */
  private getQueueManager(): LSPQueueManager {
    if (!this.queueManager) {
      this.queueManager = LSPQueueManager.getInstance();
    }
    return this.queueManager;
  }

  /**
   * Resolve missing artifact in blocking mode
   * Uses the queue system with HIGH priority for fast response
   */
  async resolveBlocking(
    params: FindMissingArtifactParams,
  ): Promise<BlockingResult> {
    this.logger.debug(
      () => `Starting blocking resolution for identifier: ${params.identifier}`,
    );

    // Check if missing artifact resolution is enabled in settings
    const settings = ApexSettingsManager.getInstance().getSettings();
    if (!settings.apex.findMissingArtifact.enabled) {
      this.logger.debug(
        () => 'Missing artifact resolution is disabled in settings',
      );
      return 'unsupported';
    }

    try {
      // Use the queue system for blocking resolution with HIGH priority
      const result = await this.getQueueManager().submitRequest(
        'findMissingArtifact',
        params,
        {
          priority: Priority.High,
          timeout: params.timeoutMsHint || this.config.blockingWaitTimeoutMs,
        },
      );

      this.logger.debug(
        () => `Blocking resolution completed for: ${params.identifier}`,
      );

      // Map the result to BlockingResult
      return this.mapResultToBlockingResult(result);
    } catch (error) {
      this.logger.error(
        () => `Blocking resolution failed for ${params.identifier}: ${error}`,
      );

      // Return timeout if the request timed out
      if (error instanceof Error && error.message.includes('timeout')) {
        return 'timeout';
      }

      return 'not-found';
    }
  }

  /**
   * Resolve missing artifact in background mode
   * Sends request directly to client for background processing
   */
  async resolveInBackground(params: FindMissingArtifactParams): Promise<void> {
    this.logger.debug(
      () =>
        `Starting background resolution for identifier: ${params.identifier}`,
    );

    // Check if missing artifact resolution is enabled in settings
    const settings = ApexSettingsManager.getInstance().getSettings();
    if (!settings.apex.findMissingArtifact.enabled) {
      this.logger.debug(
        () => 'Missing artifact resolution is disabled in settings',
      );
      return;
    }

    try {
      // Get LSP connection to send request to client
      const connection = this.getConnection();
      if (!connection) {
        this.logger.warn(
          () =>
            `No LSP connection available for background resolution of: ${params.identifier}`,
        );
        return;
      }

      // Send request directly to client (fire-and-forget for background mode)
      connection
        .sendRequest('apex/findMissingArtifact', params)
        .catch((error) => {
          this.logger.debug(
            () =>
              `Background resolution request failed for ${params.identifier}: ${error}`,
          );
          // Don't throw - background resolution failures shouldn't block the main flow
        });

      this.logger.debug(
        () => `Background resolution request sent for: ${params.identifier}`,
      );
    } catch (error) {
      this.logger.error(
        () =>
          `Failed to send background resolution request for ${params.identifier}: ${error}`,
      );
      // Don't throw - background resolution failures shouldn't block the main flow
    }
  }

  /**
   * Map the queue result to BlockingResult
   */
  private mapResultToBlockingResult(result: any): BlockingResult {
    if (!result) {
      return 'not-found';
    }

    // Check if the result indicates success
    if (
      result.opened &&
      Array.isArray(result.opened) &&
      result.opened.length > 0
    ) {
      return 'resolved';
    }

    if (result.accepted) {
      return 'resolved'; // Background resolution accepted
    }

    if (result.notFound) {
      return 'not-found';
    }

    // Default to not found
    return 'not-found';
  }

  /**
   * Get LSP connection for client communication from configuration manager
   */
  private getConnection(): Connection | undefined {
    try {
      // Get connection from the configuration manager's runtime dependencies
      const configManager = LSPConfigurationManager.getInstance();
      const connection = configManager.getConnection();

      if (!connection) {
        this.logger.debug(
          () => 'LSP connection not available in configuration manager',
        );
      }

      return connection;
    } catch (error) {
      this.logger.error(
        () =>
          `Failed to get LSP connection from configuration manager: ${error}`,
      );
      return undefined;
    }
  }

  /**
   * Get queue statistics for monitoring
   */
  async getQueueStats() {
    return await this.getQueueManager().getStats();
  }
}

/**
 * Default configuration
 */
export const DEFAULT_MISSING_ARTIFACT_CONFIG: MissingArtifactConfig = {
  blockingWaitTimeoutMs: 2000,
  indexingBarrierPollMs: 100,
};

/**
 * Factory function to create a missing artifact resolution service
 */
export function createMissingArtifactResolutionService(
  logger: LoggerInterface,
  config: MissingArtifactConfig = DEFAULT_MISSING_ARTIFACT_CONFIG,
): MissingArtifactResolutionService {
  return new EnhancedMissingArtifactResolutionService(logger, config);
}
