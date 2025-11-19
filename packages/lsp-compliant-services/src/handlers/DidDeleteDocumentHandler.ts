/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { DeleteFilesParams } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { dispatch } from '../utils/handlerUtil';
import { IDocumentDeleteProcessor } from '../services/DocumentDeleteProcessingService';

/**
 * Handler for file delete events
 */
export class DidDeleteDocumentHandler {
  constructor(
    private readonly logger: LoggerInterface,
    private readonly documentDeleteProcessor: IDocumentDeleteProcessor,
  ) {}

  /**
   * Handle file delete event
   * @param event The file delete event
   * @returns Promise resolving to void
   */
  public async handleDocumentDelete(
    event: DeleteFilesParams,
  ): Promise<void> {
    this.logger.debug(
      () =>
        `Processing file delete: ${event.files.map((f: { uri: string }) => f.uri).join(', ')}`,
    );

    try {
      return await dispatch(
        this.documentDeleteProcessor.processDocumentDelete(event),
        'Error processing file delete',
      );
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing file delete for ${event.files.map((f: { uri: string }) => f.uri).join(', ')}: ${error}`,
      );
      throw error;
    }
  }
}

