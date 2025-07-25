/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CodeActionParams, CodeAction } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { dispatch } from '../utils/handlerUtil';
import { ICodeActionProcessor } from '../services/CodeActionProcessingService';

/**
 * Handler for code action requests
 */
export class CodeActionHandler {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly codeActionProcessor: ICodeActionProcessor,
  ) {}

  /**
   * Handle code action request
   * @param params The code action parameters
   * @returns Code actions for the requested context
   */
  public async handleCodeAction(
    params: CodeActionParams,
  ): Promise<CodeAction[]> {
    this.logger.debug(
      () => `Processing code action request: ${params.textDocument.uri}`,
    );

    try {
      return await dispatch(
        this.codeActionProcessor.processCodeAction(params),
        'Error processing code action request',
      );
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing code action request for ${params.textDocument.uri}: ${error}`,
      );
      throw error;
    }
  }
}
