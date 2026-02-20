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
} from '@salesforce/apex-lsp-shared';
import type {
  FindMissingArtifactParams,
  FindMissingArtifactResult,
} from '@salesforce/apex-lsp-shared';

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
    const names = params.identifiers.map((s) => s.name).join(', ');
    this.logger.debug(
      () =>
        `MissingArtifactProcessingService processing queued request for: ${names}`,
    );

    try {
      const configManager = LSPConfigurationManager.getInstance();
      const connection = configManager.getConnection();

      if (!connection) {
        this.logger.warn(() => `No LSP connection available for: ${names}`);
        return { notFound: true };
      }

      const result = await connection.sendRequest<FindMissingArtifactResult>(
        'apex/findMissingArtifact',
        params,
      );

      this.logger.debug(
        () =>
          `MissingArtifactProcessingService completed request for: ${names}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        () => `MissingArtifactProcessingService failed for ${names}: ${error}`,
      );

      return { notFound: true };
    }
  }
}
