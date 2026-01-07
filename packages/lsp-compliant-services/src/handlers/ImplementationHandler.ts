/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ImplementationParams, Location } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { dispatch } from '../utils/handlerUtil';
import { IImplementationProcessor } from '../services/ImplementationProcessingService';

/**
 * Handler for implementation requests
 */
export class ImplementationHandler {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly implementationProcessor: IImplementationProcessor,
  ) {}

  /**
   * Handle implementation request
   * @param params The implementation parameters
   * @returns Implementation locations for the requested symbol
   */
  public async handleImplementation(
    params: ImplementationParams,
  ): Promise<Location[]> {
    this.logger.debug(
      () => `Processing implementation request: ${params.textDocument.uri}`,
    );

    try {
      const result = await dispatch(
        this.implementationProcessor.processImplementation(params),
        'Error processing implementation request',
      );

      // Normalize the result to always return Location[]
      if (!result) {
        return [];
      } else if (Array.isArray(result)) {
        return result as Location[];
      } else {
        // Single Location result
        return [result];
      }
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing implementation request for ${params.textDocument.uri}: ${error}`,
      );
      throw error;
    }
  }
}
