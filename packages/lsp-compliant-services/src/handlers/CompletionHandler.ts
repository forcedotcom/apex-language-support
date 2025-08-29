/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompletionParams, CompletionItem } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { dispatch } from '../utils/handlerUtil';
import { ICompletionProcessor } from '../services/CompletionProcessingService';

/**
 * Handler for completion requests
 */
export class CompletionHandler {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly completionProcessor: ICompletionProcessor,
  ) {}

  /**
   * Handle completion request
   * @param params The completion parameters
   * @returns Completion items for the requested position
   */
  public async handleCompletion(
    params: CompletionParams,
  ): Promise<CompletionItem[] | null> {
    this.logger.debug(
      () => `Processing completion request: ${params.textDocument.uri}`,
    );

    try {
      return await dispatch(
        this.completionProcessor.processCompletion(params),
        'Error processing completion request',
      );
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing completion request for ${params.textDocument.uri}: ${error}`,
      );
      return null;
    }
  }
}
