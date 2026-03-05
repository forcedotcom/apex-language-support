/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  LoggerInterface,
  Priority,
  getLogger,
} from '@salesforce/apex-lsp-shared';
import type {
  FindMissingArtifactParams,
  FindMissingArtifactResult,
} from '@salesforce/apex-lsp-shared';
import type { BlockingResult } from '../services/MissingArtifactResolutionService';
import { LSPQueueManager } from '../queue';

/**
 * Interface for LSP connection to communicate with client
 */
export interface LSPConnection {
  sendRequest<T>(method: string, params: any, token?: any): Promise<T>;
}

/**
 * Handler for apex/findMissingArtifact custom requests
 * Integrates with the LSP queue system for priority-based processing
 * and communicates with the client via LSP connection
 */
export class MissingArtifactHandler {
  private readonly queueManager: LSPQueueManager;

  constructor(
    private readonly logger: LoggerInterface,
    private readonly connection?: LSPConnection,
  ) {
    this.queueManager = LSPQueueManager.getInstance();
  }

  /**
   * Handle apex/findMissingArtifact custom request
   * @param params The missing artifact parameters
   * @returns Missing artifact result
   */
  public async handleFindMissingArtifact(
    params: FindMissingArtifactParams,
  ): Promise<FindMissingArtifactResult> {
    const names = params.identifiers.map((s) => s.name).join(', ');
    this.logger.debug(
      () => `Processing apex/findMissingArtifact request for: ${names}`,
    );

    try {
      if (params.mode === 'blocking') {
        this.logger.debug(() => `Processing blocking resolution for: ${names}`);
        return await this.processBlockingRequest(params);
      }

      if (params.mode === 'background') {
        this.logger.debug(() => `Queueing background resolution for: ${names}`);
        return await this.processBackgroundRequest(params);
      }

      this.logger.warn(() => `Unknown mode '${params.mode}' for: ${names}`);
      return { notFound: true };
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing apex/findMissingArtifact for ${names}: ${error}`,
      );

      return { notFound: true };
    }
  }

  /**
   * Process blocking request using the queue system with HIGH priority
   * and communicating with the client
   */
  private async processBlockingRequest(
    params: FindMissingArtifactParams,
  ): Promise<FindMissingArtifactResult> {
    try {
      // If we have a connection, send the request directly to the client
      const names = params.identifiers.map((s) => s.name).join(', ');
      if (this.connection) {
        this.logger.debug(
          () => `Sending blocking request to client for: ${names}`,
        );

        const result =
          await this.connection.sendRequest<FindMissingArtifactResult>(
            'apex/findMissingArtifact',
            params,
          );

        this.logger.debug(() => `Client response received for: ${names}`);

        return result;
      }

      this.logger.debug(
        () => `No connection available, using queue fallback for: ${names}`,
      );

      const result = await this.queueManager.submitRequest(
        'findMissingArtifact',
        params,
        {
          priority: Priority.High,
          timeout: params.timeoutMsHint || 2000,
        },
      );

      this.logger.debug(
        () => `Queue-based blocking resolution completed for: ${names}`,
      );

      return this.mapBlockingResultToResponse(result as BlockingResult, params);
    } catch (error) {
      const names = params.identifiers.map((s) => s.name).join(', ');
      this.logger.error(
        () => `Blocking resolution failed for ${names}: ${error}`,
      );

      // Fallback to direct processing if both connection and queue fail
      return await this.fallbackBlockingProcessing(params);
    }
  }

  /**
   * Process background request by queueing it for later processing
   */
  private async processBackgroundRequest(
    params: FindMissingArtifactParams,
  ): Promise<FindMissingArtifactResult> {
    const names = params.identifiers.map((s) => s.name).join(', ');
    try {
      await this.queueManager.submitRequest('findMissingArtifact', params, {
        priority: Priority.Low,
        timeout: 30000,
      });
      this.logger.debug(() => `Background resolution queued for: ${names}`);

      return { accepted: true };
    } catch (error) {
      this.logger.error(
        () => `Failed to queue background resolution for ${names}: ${error}`,
      );

      // Return not found if queueing fails
      return { notFound: true };
    }
  }

  /**
   * Fallback processing when both connection and queue fail
   */
  private async fallbackBlockingProcessing(
    params: FindMissingArtifactParams,
  ): Promise<FindMissingArtifactResult> {
    const names = params.identifiers.map((s) => s.name).join(', ');
    this.logger.warn(() => `Using fallback processing for: ${names}`);

    return { notFound: true };
  }

  /**
   * Map blocking result to response format
   */
  private mapBlockingResultToResponse(
    result: BlockingResult,
    params: FindMissingArtifactParams,
  ): FindMissingArtifactResult {
    const names = params.identifiers.map((s) => s.name).join(', ');
    switch (result) {
      case 'resolved':
        return {
          opened: params.identifiers.map((s) => `${s.name}.cls`),
        };
      case 'not-found':
        return { notFound: true };
      case 'timeout':
        this.logger.warn(() => `Resolution timed out for: ${names}`);
        return { notFound: true };
      case 'cancelled':
        this.logger.debug(() => `Resolution cancelled for: ${names}`);
        return { notFound: true };
      case 'unsupported':
        this.logger.debug(() => `Resolution not supported for: ${names}`);
        return { notFound: true };
      default:
        this.logger.warn(() => `Unknown result type '${result}' for: ${names}`);
        return { notFound: true };
    }
  }

  /**
   * Get queue statistics for monitoring
   */
  public async getQueueStats() {
    return await this.queueManager.getStats();
  }
}

/**
 * Factory function to create a missing artifact handler
 */
export function createMissingArtifactHandler(
  logger: LoggerInterface,
  connection?: LSPConnection,
): MissingArtifactHandler {
  return new MissingArtifactHandler(logger, connection);
}

/**
 * Process apex/findMissingArtifact request (standalone function for direct use)
 */
export async function processApexFindMissingArtifact(
  params: FindMissingArtifactParams,
): Promise<FindMissingArtifactResult> {
  const handler = createMissingArtifactHandler(getLogger());
  return handler.handleFindMissingArtifact(params);
}
