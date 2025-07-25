/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  WorkspaceSymbolParams,
  SymbolInformation,
} from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { dispatch } from '../utils/handlerUtil';
import { IWorkspaceSymbolProcessor } from '../services/WorkspaceSymbolProcessingService';

/**
 * Handler for workspace symbol requests
 */
export class WorkspaceSymbolHandler {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly workspaceSymbolProcessor: IWorkspaceSymbolProcessor,
  ) {}

  /**
   * Handle workspace symbol request
   * @param params The workspace symbol parameters
   * @returns Symbol information for the requested query
   */
  public async handleWorkspaceSymbol(
    params: WorkspaceSymbolParams,
  ): Promise<SymbolInformation[]> {
    this.logger.debug(
      () => `Processing workspace symbol request: ${params.query}`,
    );

    try {
      return await dispatch(
        this.workspaceSymbolProcessor.processWorkspaceSymbol(params),
        'Error processing workspace symbol request',
      );
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing workspace symbol request for ${params.query}: ${error}`,
      );
      throw error;
    }
  }
}
