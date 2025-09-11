/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DefinitionParams, Location } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { dispatch } from '../utils/handlerUtil';
import { IDefinitionProcessor } from '../services/DefinitionProcessingService';

/**
 * Handler for definition requests
 */
export class DefinitionHandler {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly definitionProcessor: IDefinitionProcessor,
  ) {}

  /**
   * Handle definition request
   * @param params The definition parameters
   * @returns Definition locations for the requested symbol
   */
  public async handleDefinition(params: DefinitionParams): Promise<Location[]> {
    this.logger.debug(
      () => `Processing definition request: ${params.textDocument.uri}`,
    );

    try {
      const result = await dispatch(
        this.definitionProcessor.processDefinition(params),
        'Error processing definition request',
      );

      // Normalize the result to always return Location[]
      if (!result) {
        return [];
      } else if (Array.isArray(result)) {
        // Handle both Location[] and LocationLink[]
        if (result.length > 0 && 'uri' in result[0] && 'range' in result[0]) {
          // This is Location[]
          return result as Location[];
        } else {
          // This is LocationLink[], convert to Location[]
          return (result as any[]).map((link) => ({
            uri: link.targetUri,
            range: link.targetRange,
          }));
        }
      } else {
        // Single Location result
        return [result];
      }
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing definition request for ${params.textDocument.uri}: ${error}`,
      );
      throw error;
    }
  }
}
