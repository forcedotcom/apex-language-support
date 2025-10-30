/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CodeLensParams, CodeLens } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { dispatch } from '../utils/handlerUtil';
import { ICodeLensProcessor } from '../services/CodeLensProcessingService';

/**
 * Handler for code lens requests
 */
export class CodeLensHandler {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly codeLensProcessor: ICodeLensProcessor,
  ) {}

  /**
   * Handle code lens request
   * @param params The code lens parameters
   * @returns Array of code lenses for the document
   */
  public async handleCodeLens(params: CodeLensParams): Promise<CodeLens[]> {
    this.logger.debug(
      () => `Handling code lens request: ${params.textDocument.uri}`,
    );
    try {
      const result = await dispatch(
        this.codeLensProcessor.processCodeLens(params),
        'Error processing code lens request',
      );
      this.logger.debug(() => `Returning ${result.length} code lenses`);
      return result;
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing code lens request for ${params.textDocument.uri}: ${error}`,
      );
      // Return empty array on error instead of throwing
      return [];
    }
  }
}
