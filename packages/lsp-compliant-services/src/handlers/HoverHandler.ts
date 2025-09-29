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
import { LSPQueueManager } from '../queue/LSPQueueManager';

/**
 * Handler for hover requests using the LSP queue system
 */
export class HoverHandler {
  private readonly queueManager: LSPQueueManager;

  constructor(
    private readonly logger: LoggerInterface,
    private readonly hoverProcessor: IHoverProcessor,
  ) {
    this.queueManager = LSPQueueManager.getInstance();
  }

  /**
   * Handle hover request using the LSP queue system
   * @param params The hover parameters
   * @returns Hover information for the requested position
   */
  public async handleHover(params: HoverParams): Promise<Hover | null> {
    // console.log(`🔧 [HoverHandler] handleHover called for ${params.textDocument.uri} at ${params.position.line}:${params.position.character}`);
    this.logger.debug(
      () => `Processing hover request: ${params.textDocument.uri}`,
    );

    // CRITICAL FIX: Bypass LSP queue system and use direct processing
    // The queue system might be using a different symbol manager instance
    this.logger.debug(
      () => 'Using direct hover processing to fix symbol manager issue',
    );

    // console.log(`🔧 [HoverHandler] About to call hoverProcessor.processHover`);
    const result = await dispatch(
      this.hoverProcessor.processHover(params),
      'Error processing hover request',
    );
    // console.log(`🔧 [HoverHandler] processHover result: ${result ? 'has content' : 'null/empty'}`);
    return result;

    /*
    try {
      // Use the LSP queue system for immediate processing
      return await this.queueManager.submitHoverRequest(params);
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing hover request for ${params.textDocument.uri}: ${error}`,
      );

      // Fallback to direct processing if queue fails
      this.logger.debug(() => 'Falling back to direct hover processing');
      return await dispatch(
        this.hoverProcessor.processHover(params),
        'Error processing hover request',
      );
    }
    */
  }

  /**
   * Get queue statistics for monitoring
   */
  public getQueueStats() {
    return this.queueManager.getStats();
  }
}
