/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { SignatureHelpParams, SignatureHelp } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { dispatch } from '../utils/handlerUtil';
import { ISignatureHelpProcessor } from '../services/SignatureHelpProcessingService';

/**
 * Handler for signature help requests
 */
export class SignatureHelpHandler {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly signatureHelpProcessor: ISignatureHelpProcessor,
  ) {}

  /**
   * Handle signature help request
   * @param params The signature help parameters
   * @returns Signature help information for the requested position
   */
  public async handleSignatureHelp(
    params: SignatureHelpParams,
  ): Promise<SignatureHelp | null> {
    this.logger.debug(
      () => `Processing signature help request: ${params.textDocument.uri}`,
    );

    try {
      return await dispatch(
        this.signatureHelpProcessor.processSignatureHelp(params),
        'Error processing signature help request',
      );
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing signature help request for ${params.textDocument.uri}: ${error}`,
      );
      throw error;
    }
  }
}
