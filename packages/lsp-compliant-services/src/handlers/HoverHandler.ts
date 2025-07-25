/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HoverParams, Hover } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { dispatch } from '../utils/handlerUtil';
import { IHoverProcessor } from '../services/HoverProcessingService';

/**
 * Handler for hover requests
 */
export class HoverHandler {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly hoverProcessor: IHoverProcessor,
  ) {}

  /**
   * Handle hover request
   * @param params The hover parameters
   * @returns Hover information for the requested position
   */
  public async handleHover(params: HoverParams): Promise<Hover | null> {
    this.logger.debug(
      () => `Processing hover request: ${params.textDocument.uri}`,
    );

    try {
      return await dispatch(
        this.hoverProcessor.processHover(params),
        'Error processing hover request',
      );
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing hover request for ${params.textDocument.uri}: ${error}`,
      );
      throw error;
    }
  }
}
