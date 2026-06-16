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
import { Effect, Duration } from 'effect';

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
 * Uses Effect.timeout for structured timeout enforcement.
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

  public async handleCompletion(
    params: CompletionParams,
  ): Promise<CompletionList | CompletionItem[] | null> {
    this.logger.debug(
      () => `Processing completion request: ${params.textDocument.uri}`,
    );

    const processor = this.completionProcessor;
    const timeoutMs = this.timeoutMs;
    const logger = this.logger;

    const program = Effect.gen(function* () {
      if (processor.processCompletionWithReadiness) {
        const result = yield* Effect.tryPromise(() =>
          processor.processCompletionWithReadiness!(params),
        ).pipe(
          Effect.timeout(Duration.millis(timeoutMs)),
          Effect.map(
            (opt) =>
              opt ?? { items: [] as CompletionItem[], isIncomplete: true },
          ),
          Effect.tapError(() =>
            Effect.sync(() =>
              logger.warn(
                () =>
                  `Completion request timed out after ${timeoutMs}ms, returning partial results`,
              ),
            ),
          ),
          Effect.catchAll(() =>
            Effect.succeed({
              items: [] as CompletionItem[],
              isIncomplete: true,
            }),
          ),
        );
        return CompletionList.create(result.items, result.isIncomplete) as
          | CompletionList
          | CompletionItem[]
          | null;
      }

      const items = yield* Effect.tryPromise(() =>
        processor.processCompletion(params),
      ).pipe(
        Effect.timeout(Duration.millis(timeoutMs)),
        Effect.map((opt) => opt ?? ([] as CompletionItem[])),
        Effect.tapError(() =>
          Effect.sync(() =>
            logger.warn(
              () =>
                `Completion request timed out after ${timeoutMs}ms, returning partial results`,
            ),
          ),
        ),
        Effect.catchAll(() => Effect.succeed([] as CompletionItem[])),
      );
      return items as CompletionList | CompletionItem[] | null;
    }).pipe(
      Effect.catchAll((error) =>
        Effect.sync(() => {
          logger.error(
            () =>
              `Error processing completion request for ${params.textDocument.uri}: ${error}`,
          );
          return null;
        }),
      ),
    );

    return Effect.runPromise(program);
  }
}
