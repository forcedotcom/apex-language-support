/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { HoverParams, Hover } from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { IHoverProcessor } from '../services/HoverProcessingService';
import { LSPQueueManager } from '../queue';

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
    // #region agent log
    fetch('http://127.0.0.1:7417/ingest/9fe9dff8-a20a-43b0-898c-ed89ba87e085', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Session-Id': '0aca23',
      },
      body: JSON.stringify({
        sessionId: '0aca23',
        runId: 'hover-regression',
        hypothesisId: 'H1',
        location: 'HoverHandler.ts:34',
        message: 'hover handler entry',
        data: {
          uri: params.textDocument.uri,
          line: params.position.line,
          char: params.position.character,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    this.logger.debug(
      () => `Processing hover request: ${params.textDocument.uri}`,
    );
    try {
      // Use the LSP queue system for hover; diagnostics instrumentation will
      // identify why fiber handoff can stall under load.
      return await this.queueManager.submitHoverRequest(params);
    } catch (error) {
      const errorText = String(error);
      const isTimeout =
        errorText.includes('TimeoutException') ||
        errorText.includes('timed out');
      this.logger.error(
        () =>
          `Error processing hover request for ${params.textDocument.uri}: ${error}`,
      );

      // When the queued hover times out, avoid re-running hover directly.
      // A direct fallback can trigger a second heavy resolution pass and exceed UX budgets.
      if (isTimeout) {
        // #region agent log
        fetch(
          'http://127.0.0.1:7417/ingest/9fe9dff8-a20a-43b0-898c-ed89ba87e085',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Debug-Session-Id': '0aca23',
            },
            body: JSON.stringify({
              sessionId: '0aca23',
              runId: 'hover-regression',
              hypothesisId: 'H2',
              location: 'HoverHandler.ts:56',
              message: 'hover queue timeout branch',
              data: { uri: params.textDocument.uri, error: errorText },
              timestamp: Date.now(),
            }),
          },
        ).catch(() => {});
        // #endregion
        void this.hoverProcessor
          .scheduleTimeoutFollowup(params)
          .catch((followupError) => {
            this.logger.debug(
              () =>
                `Failed to schedule hover timeout follow-up for ${params.textDocument.uri}: ${followupError}`,
            );
          });
        this.logger.debug(
          () =>
            `Skipping direct hover fallback after timeout for ${params.textDocument.uri}`,
        );
        return null;
      }

      return null;
    }
  }

  /**
   * Get queue statistics for monitoring
   */
  public async getQueueStats() {
    return await this.queueManager.getStats();
  }
}
