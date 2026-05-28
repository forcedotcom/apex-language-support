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
 * based on method-call relationships and other symbol connections.
 * Always contributes to completions as supplementary suggestions.
 */
export class RelationshipCompletionStrategy implements CompletionStrategy {
  readonly name = 'RelationshipCompletion';

  constructor(
    private readonly logger: LoggerInterface,
    private readonly symbolManager: ISymbolManager,
  ) {}

  canHandle(_context: CompletionContext): boolean {
    // Relationship suggestions are always applicable as supplementary completions
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
        // Get symbols in the current file
        const fileSymbols = yield* Effect.promise(() =>
          self.symbolManager.findSymbolsInFile(context.document.uri),
        );

        for (let i = 0; i < fileSymbols.length; i++) {
          const symbol = fileSymbols[i];
          // Get related symbols based on relationships
          const relatedSymbols = yield* Effect.promise(() =>
            self.symbolManager.findRelatedSymbols(
              symbol,
              'method-call', // Focus on method calls for completion
            ),
          );

          for (let j = 0; j < relatedSymbols.length; j++) {
            const related = relatedSymbols[j];
            suggestions.push({
              symbol: related,
              relevance: 0.7, // Medium relevance for relationship-based suggestions
              context: `related to ${symbol.name}`,
            });
            // Yield after every batchSize related symbols
            if ((j + 1) % batchSize === 0 && j + 1 < relatedSymbols.length) {
              yield* Effect.yieldNow();
            }
          }

          // Yield after every batchSize file symbols
          if ((i + 1) % batchSize === 0 && i + 1 < fileSymbols.length) {
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
