/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { LoggerInterface } from '@salesforce/apex-lsp-shared';
import { ISymbolManager } from '@salesforce/apex-lsp-parser-ast';
import { CompletionContext } from '../CompletionProcessingService';
import { CompletionStrategy, CompletionCandidate } from './CompletionStrategy';

/**
 * Strategy for relationship-based completion suggestions.
 *
 * Analyzes symbols in the current file and suggests related symbols
 * based on method-call relationships. Skipped after a `.` trigger so it
 * does not pollute member-access completion results.
 */
export class RelationshipCompletionStrategy implements CompletionStrategy {
  readonly name = 'RelationshipCompletion';

  /** Cap on how many file symbols we expand into related symbols per request. */
  private static readonly MAX_SOURCE_SYMBOLS = 25;

  /** Cap on the total number of relationship candidates produced per request. */
  private static readonly MAX_CANDIDATES = 100;

  constructor(
    private readonly logger: LoggerInterface,
    private readonly symbolManager: ISymbolManager,
  ) {}

  canHandle(context: CompletionContext): boolean {
    // Don't compete with MemberAccessCompletionStrategy after a dot trigger.
    if (context.triggerCharacter === '.') {
      return false;
    }
    // Also skip when the line up to the cursor ends with `.` even without an
    // explicit trigger character (e.g. paste of `obj.`).
    const lineText = context.document.getText({
      start: { line: context.position.line, character: 0 },
      end: context.position,
    });
    if (lineText.trimEnd().endsWith('.')) {
      return false;
    }
    return true;
  }

  getCompletions(
    context: CompletionContext,
  ): Effect.Effect<CompletionCandidate[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const suggestions: CompletionCandidate[] = [];
      const batchSize = 50;

      try {
        // Get symbols in the current file, capped to keep async fanout bounded.
        const fileSymbols = yield* Effect.promise(() =>
          self.symbolManager.findSymbolsInFile(context.document.uri),
        );
        const sourceSymbols = fileSymbols.slice(
          0,
          RelationshipCompletionStrategy.MAX_SOURCE_SYMBOLS,
        );

        outer: for (let i = 0; i < sourceSymbols.length; i++) {
          const symbol = sourceSymbols[i];
          const relatedSymbols = yield* Effect.promise(() =>
            self.symbolManager.findRelatedSymbols(symbol, 'method-call'),
          );

          for (let j = 0; j < relatedSymbols.length; j++) {
            if (
              suggestions.length >=
              RelationshipCompletionStrategy.MAX_CANDIDATES
            ) {
              break outer;
            }
            suggestions.push({
              symbol: relatedSymbols[j],
              relevance: 0.7,
              context: `related to ${symbol.name}`,
            });
            if ((j + 1) % batchSize === 0 && j + 1 < relatedSymbols.length) {
              yield* Effect.yieldNow();
            }
          }

          if ((i + 1) % batchSize === 0 && i + 1 < sourceSymbols.length) {
            yield* Effect.yieldNow();
          }
        }
      } catch (error) {
        self.logger.debug(
          () => `Error getting relationship suggestions: ${error}`,
        );
      }

      return suggestions;
    });
  }
}
