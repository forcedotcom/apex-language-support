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
  WireIdentifierSpecSchema,
} from '@salesforce/apex-lsp-shared';
import type { FindMissingArtifactParams } from '@salesforce/apex-lsp-shared';
import { Schema } from 'effect';
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
export class EnhancedMissingArtifactResolutionService implements MissingArtifactResolutionService {
  private queueManager: LSPQueueManager | null = null;
  private static inFlightBlockingRequests = new Map<
    string,
    Promise<BlockingResult>
  >();
  private static recentBlockingTimeouts = new Map<string, number>();
  private static readonly BLOCKING_TIMEOUT_COOLDOWN_MS = 3000;

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
    const names = params.identifiers.map((s) => s.name).join(', ');
    const normalizedNames = Array.from(
      new Set(
        params.identifiers
          .map((s) => s.name.trim().toLowerCase())
          .filter((name) => name.length > 0),
      ),
    )
      .sort()
      .join(',');
    const key = `${params.origin?.requestKind ?? 'unknown'}|${
      params.origin?.uri ?? 'unknown'
    }|${normalizedNames || names.toLowerCase()}`;
    const now = Date.now();
    const existing =
      EnhancedMissingArtifactResolutionService.inFlightBlockingRequests.get(
        key,
      );
    const recentTimeout =
      EnhancedMissingArtifactResolutionService.recentBlockingTimeouts.get(
        key,
      ) ?? 0;

    if (existing) {
      return existing;
    }

    if (
      recentTimeout > 0 &&
      now - recentTimeout <
        EnhancedMissingArtifactResolutionService.BLOCKING_TIMEOUT_COOLDOWN_MS
    ) {
      return 'timeout';
    }
    this.logger.debug(
      () => `Starting blocking resolution for identifiers: ${names}`,
    );

    // Check if missing artifact resolution is enabled in settings
    const settings = ApexSettingsManager.getInstance().getSettings();
    if (!settings.apex.findMissingArtifact.enabled) {
      this.logger.debug(
        () => 'Missing artifact resolution is disabled in settings',
      );
      return 'unsupported';
    }

    const requestPromise = (async (): Promise<BlockingResult> => {
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

        this.logger.debug(() => `Blocking resolution completed for: ${names}`);

        // Map the result to BlockingResult
        const mapped = this.mapResultToBlockingResult(result);
        if (mapped !== 'timeout') {
          EnhancedMissingArtifactResolutionService.recentBlockingTimeouts.delete(
            key,
          );
        }
        return mapped;
      } catch (error) {
        this.logger.error(
          () => `Blocking resolution failed for ${names}: ${error}`,
        );

        // Return timeout if the request timed out
        if (error instanceof Error && error.message.includes('timeout')) {
          EnhancedMissingArtifactResolutionService.recentBlockingTimeouts.set(
            key,
            Date.now(),
          );
          return 'timeout';
        }

        return 'not-found';
      } finally {
        EnhancedMissingArtifactResolutionService.inFlightBlockingRequests.delete(
          key,
        );
      }
    })();

    EnhancedMissingArtifactResolutionService.inFlightBlockingRequests.set(
      key,
      requestPromise,
    );
    return requestPromise;
  }

  /**
   * Resolve missing artifact in background mode
   * Sends request directly to client for background processing
   */
  async resolveInBackground(params: FindMissingArtifactParams): Promise<void> {
    const names = params.identifiers.map((s) => s.name).join(', ');
    this.logger.debug(
      () => `Starting background resolution for identifiers: ${names}`,
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
            `No LSP connection available for background resolution of: ${names}`,
        );
        return;
      }

      // Sanitize params before sending via postMessage (structured clone).
      // Symbol manager class instances (typeReference, parentContext.*) are not
      // cloneable. Schema.decodeUnknownSync creates a new plain object containing
      // only the declared wire-schema fields, stripping all class extras.
      const decodeIdentifier = Schema.decodeUnknownSync(
        WireIdentifierSpecSchema,
      );
      const safeParams = {
        ...params,
        identifiers: params.identifiers.map((id) => {
          try {
            return decodeIdentifier(id);
          } catch {
            // Fallback: name-only if the identifier deviates from the wire schema
            return { name: id.name };
          }
        }),
      };

      // Send request directly to client (fire-and-forget for background mode)
      connection
        .sendRequest('apex/findMissingArtifact', safeParams)
        .catch((error) => {
          this.logger.debug(
            () => `Background resolution request failed for ${names}: ${error}`,
          );
          // Don't throw - background resolution failures shouldn't block the main flow
        });

      this.logger.debug(
        () => `Background resolution request sent for: ${names}`,
      );
    } catch (error) {
      this.logger.error(
        () =>
          `Failed to send background resolution request for ${names}: ${error}`,
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
