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
import { LSPConfigurationManager } from '../settings/LSPConfigurationManager';

/**
 * Service for processing missing artifact requests in the queue system
 * This service handles the request directly without creating circular dependencies
 */
export class MissingArtifactProcessingService {
  constructor(private readonly logger: LoggerInterface) {}

  /**
   * Process missing artifact request directly via LSP connection
   * This is the queue processing endpoint that avoids circular calls
   * @param params Missing artifact parameters
   * @returns Missing artifact result
   */
  async processFindMissingArtifact(
    params: FindMissingArtifactParams,
  ): Promise<FindMissingArtifactResult> {
    this.logger.debug(
      () =>
        `MissingArtifactProcessingService processing queued request for: ${params.identifier}`,
    );

    try {
      // Get LSP connection from configuration manager
      const configManager = LSPConfigurationManager.getInstance();
      const connection = configManager.getConnection();

      if (!connection) {
        this.logger.warn(
          () => `No LSP connection available for: ${params.identifier}`,
        );
        return { notFound: true };
      }

      // Send request directly to client via LSP connection
      // This avoids the circular dependency of queuing another request
      const result = await connection.sendRequest<FindMissingArtifactResult>(
        'apex/findMissingArtifact',
        params,
      );

      this.logger.debug(
        () =>
          `MissingArtifactProcessingService completed request for: ${params.identifier}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        () =>
          `MissingArtifactProcessingService failed for ${params.identifier}: ${error}`,
      );

      // Return a "not found" result on error
      return { notFound: true };
    }
  }
}
