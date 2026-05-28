/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import {
  CompletionParams,
  CompletionItem,
  CompletionList,
} from 'vscode-languageserver';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';

import { dispatch } from '../utils/handlerUtil';
import { ICompletionProcessor } from '../services/CompletionProcessingService';

/**
 * Default timeout for completion requests in milliseconds.
 * If completion processing exceeds this time, partial results are returned.
 */
export const COMPLETION_TIMEOUT_MS = 2000;

/**
 * Trigger characters that activate Apex completion.
 * - '.' triggers member access completion (e.g., obj.method)
 * - '@' triggers annotation completion (e.g., @IsTest)
 */
export const COMPLETION_TRIGGER_CHARACTERS: string[] = ['.', '@'];

/**
 * Handler for completion requests.
 * Enforces a timeout to prevent completions from hanging the editor.
 * Supports progressive refinement via the LSP CompletionList `isIncomplete` flag.
 */
export class CompletionHandler {
  private readonly timeoutMs: number;

  constructor(
    private readonly logger: LoggerInterface,
    private readonly completionProcessor: ICompletionProcessor,
    timeoutMs: number = COMPLETION_TIMEOUT_MS,
  ) {
    this.timeoutMs = timeoutMs;
  }

  /**
   * Handle completion request with timeout enforcement and isIncomplete support.
   * Uses the readiness-aware path when available to support progressive refinement.
   * If the timeout fires, returns partial results with isIncomplete: true.
   *
   * @param params The completion parameters
   * @returns CompletionList with items and isIncomplete flag, or null on error
   */
  public async handleCompletion(
    params: CompletionParams,
  ): Promise<CompletionList | CompletionItem[] | null> {
    this.logger.debug(
      () => `Processing completion request: ${params.textDocument.uri}`,
    );

    try {
      if (this.completionProcessor.processCompletionWithReadiness) {
        const result = await this.withTimeoutResult(
          this.completionProcessor.processCompletionWithReadiness(params),
          this.timeoutMs,
        );
        return CompletionList.create(result.items, result.isIncomplete);
      }

      const items = await this.withTimeout(
        dispatch(
          this.completionProcessor.processCompletion(params),
          'Error processing completion request',
        ),
        this.timeoutMs,
      );
      return items;
    } catch (error) {
      this.logger.error(
        () =>
          `Error processing completion request for ${params.textDocument.uri}: ${error}`,
      );
      return null;
    }
  }

  private withTimeout(
    promise: Promise<CompletionItem[]>,
    timeoutMs: number,
  ): Promise<CompletionItem[]> {
    return new Promise<CompletionItem[]>((resolve, reject) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.logger.warn(
            () =>
              `Completion request timed out after ${timeoutMs}ms, returning partial results`,
          );
          resolve([]);
        }
      }, timeoutMs);

      promise
        .then((result) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(result);
          }
        })
        .catch((error) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(error);
          }
        });
    });
  }

  private withTimeoutResult(
    promise: Promise<{ items: CompletionItem[]; isIncomplete: boolean }>,
    timeoutMs: number,
  ): Promise<{ items: CompletionItem[]; isIncomplete: boolean }> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.logger.warn(
            () =>
              `Completion request timed out after ${timeoutMs}ms, returning partial results`,
          );
          resolve({ items: [], isIncomplete: true });
        }
      }, timeoutMs);

      promise
        .then((result) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(result);
          }
        })
        .catch((error) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(error);
          }
        });
    });
  }
}
