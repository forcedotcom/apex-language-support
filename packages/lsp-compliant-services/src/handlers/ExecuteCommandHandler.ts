/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ExecuteCommandParams } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { dispatch } from '../utils/handlerUtil';
import { IExecuteCommandProcessor } from '../services/ExecuteCommandProcessingService';

/**
 * Handler for execute command requests
 */
export class ExecuteCommandHandler {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly executeCommandProcessor: IExecuteCommandProcessor,
  ) {}

  /**
   * Handle execute command request
   * @param params The execute command parameters
   * @returns The result of the command execution
   */
  public async handleExecuteCommand(
    params: ExecuteCommandParams,
  ): Promise<any> {
    this.logger.debug(
      () => `Processing execute command request: ${params.command}`,
    );

    try {
      return await dispatch(
        this.executeCommandProcessor.processExecuteCommand(params),
        'Error processing execute command request',
      );
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing execute command request for ${params.command}: ${error}`,
      );
      throw error;
    }
  }
}
