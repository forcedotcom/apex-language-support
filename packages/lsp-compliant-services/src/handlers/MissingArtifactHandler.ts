/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import type {
  FindMissingArtifactParams,
  FindMissingArtifactResult,
} from '@salesforce/apex-lsp-shared';
import type { BlockingResult } from '../services/MissingArtifactResolutionService';
import { LSPQueueManager } from '@salesforce/apex-lsp-parser-ast';

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
    this.logger.debug(
      () =>
        `Processing apex/findMissingArtifact request for: ${params.identifier}`,
    );

    try {
      // For blocking mode, use immediate processing via queue with HIGH priority
      if (params.mode === 'blocking') {
        this.logger.debug(
          () => `Processing blocking resolution for: ${params.identifier}`,
        );
        return await this.processBlockingRequest(params);
      }

      // For background mode, queue the request for background processing
      if (params.mode === 'background') {
        this.logger.debug(
          () => `Queueing background resolution for: ${params.identifier}`,
        );
        return await this.processBackgroundRequest(params);
      }

      this.logger.warn(
        () => `Unknown mode '${params.mode}' for: ${params.identifier}`,
      );
      return { notFound: true };
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing apex/findMissingArtifact for ${params.identifier}: ${error}`,
      );

      // Return not found on error
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
      if (this.connection) {
        this.logger.debug(
          () => `Sending blocking request to client for: ${params.identifier}`,
        );

        const result =
          await this.connection.sendRequest<FindMissingArtifactResult>(
            'apex/findMissingArtifact',
            params,
          );

        this.logger.debug(
          () => `Client response received for: ${params.identifier}`,
        );

        return result;
      }

      // Fallback to queue-based processing if no connection
      this.logger.debug(
        () =>
          `No connection available, using queue fallback for: ${params.identifier}`,
      );

      const result = await this.queueManager.submitRequest(
        'findMissingArtifact',
        params,
        {
          priority: 'HIGH',
          timeout: params.timeoutMsHint || 2000, // Use client hint or default
        },
      );

      this.logger.debug(
        () =>
          `Queue-based blocking resolution completed for: ${params.identifier}`,
      );

      return this.mapBlockingResultToResponse(result as BlockingResult, params);
    } catch (error) {
      this.logger.error(
        () => `Blocking resolution failed for ${params.identifier}: ${error}`,
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
    try {
      // Queue the request for background processing
      await this.queueManager.submitRequest('findMissingArtifact', params, {
        priority: 'LOW',
        timeout: 30000, // Longer timeout for background processing
      });

      this.logger.debug(
        () => `Background resolution queued for: ${params.identifier}`,
      );

      // Return accepted immediately for background requests
      return { accepted: true };
    } catch (error) {
      this.logger.error(
        () =>
          `Failed to queue background resolution for ${params.identifier}: ${error}`,
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
    this.logger.warn(
      () => `Using fallback processing for: ${params.identifier}`,
    );

    // Simple fallback - just return not found
    // In a real implementation, this might try other resolution strategies
    return { notFound: true };
  }

  /**
   * Map blocking result to response format
   */
  private mapBlockingResultToResponse(
    result: BlockingResult,
    params: FindMissingArtifactParams,
  ): FindMissingArtifactResult {
    switch (result) {
      case 'resolved':
        // Return a placeholder response - in practice this would come from the client
        return { opened: [`${params.identifier}.cls`] };
      case 'not-found':
        return { notFound: true };
      case 'timeout':
        this.logger.warn(
          () => `Resolution timed out for: ${params.identifier}`,
        );
        return { notFound: true };
      case 'cancelled':
        this.logger.debug(
          () => `Resolution cancelled for: ${params.identifier}`,
        );
        return { notFound: true };
      case 'unsupported':
        this.logger.debug(
          () => `Resolution not supported for: ${params.identifier}`,
        );
        return { notFound: true };
      default:
        this.logger.warn(
          () => `Unknown result type '${result}' for: ${params.identifier}`,
        );
        return { notFound: true };
    }
  }

  /**
   * Get queue statistics for monitoring
   */
  public getQueueStats() {
    return this.queueManager.getStats();
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
  const handler = createMissingArtifactHandler(
    // Use a simple console logger for now
    {
      debug: (message: string | (() => string)) => {
        const msg = typeof message === 'function' ? message() : message;
        console.debug(`[MissingArtifact] ${msg}`);
      },
      info: (message: string | (() => string)) => {
        const msg = typeof message === 'function' ? message() : message;
        console.info(`[MissingArtifact] ${msg}`);
      },
      warn: (message: string | (() => string)) => {
        const msg = typeof message === 'function' ? message() : message;
        console.warn(`[MissingArtifact] ${msg}`);
      },
      error: (message: string | (() => string)) => {
        const msg = typeof message === 'function' ? message() : message;
        console.error(`[MissingArtifact] ${msg}`);
      },
      log: (messageType: any, message: string | (() => string)) => {
        const msg = typeof message === 'function' ? message() : message;
        console.log(`[MissingArtifact] ${messageType}: ${msg}`);
      },
    },
  );

  return handler.handleFindMissingArtifact(params);
}
