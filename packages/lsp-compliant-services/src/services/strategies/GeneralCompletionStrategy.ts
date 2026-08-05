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
import { getIdentifierCompletionQuery } from './IdentifierCompletionQuery';

/**
 * Strategy for general completions (no specific trigger character)
 *
 * Provides completions based on context-aware symbol resolution and
 * wildcard matching for all visible symbols in scope.
 */
export class GeneralCompletionStrategy implements CompletionStrategy {
  readonly name = 'GeneralCompletion';

  constructor(
    private readonly logger: LoggerInterface,
    private readonly symbolManager: ISymbolManager,
  ) {}

  canHandle(context: CompletionContext): boolean {
    return context.document.uri.length > 0;
  }

  getCompletions(
    context: CompletionContext,
  ): Effect.Effect<CompletionCandidate[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const candidates: CompletionCandidate[] = [];
      const batchSize = 50;

      const completionQuery = getIdentifierCompletionQuery(
        context.document,
        context.position,
      );
      if (
        completionQuery.kind === 'non-code' ||
        completionQuery.kind === 'member-access'
      ) {
        return candidates;
      }
      const currentWord =
        completionQuery.kind === 'identifier' ? completionQuery.prefix : '';

      // Empty-prefix path: surface all symbols once (wildcard). Skipped when
      // the user has typed at least one character to avoid drowning prefix
      // matches in unrelated symbols.
      if (currentWord.length === 0) {
        try {
          const allSymbols = yield* Effect.promise(() =>
            self.symbolManager.getAllSymbolsForCompletion(),
          );
          for (let i = 0; i < allSymbols.length; i++) {
            candidates.push({
              symbol: allSymbols[i],
              relevance: 0.5,
              context: 'wildcard completion',
            });
            if ((i + 1) % batchSize === 0 && i + 1 < allSymbols.length) {
              yield* Effect.yieldNow();
            }
          }
        } catch (error) {
          self.logger.debug(() => `Error loading wildcard symbols: ${error}`);
        }
        return candidates;
      }

      // Prefix path: context-aware resolution for the typed word.
      const resolutionContext = {
        sourceFile: context.document.uri,
        importStatements: context.importStatements,
        namespaceContext: context.namespaceContext,
        currentScope: context.currentScope,
        scopeChain: [context.currentScope],
        expectedType: context.expectedType,
        parameterTypes: [],
        accessModifier: context.accessModifier,
        isStatic: context.isStatic,
        inheritanceChain: [],
        interfaceImplementations: [],
      };

      try {
        const visibleSymbols = yield* Effect.promise(() =>
          self.symbolManager.getVisibleSymbolsAtPosition(
            context.document.uri,
            context.position,
          ),
        );
        for (const symbol of visibleSymbols) {
          if (
            !symbol.name.toLowerCase().startsWith(currentWord.toLowerCase())
          ) {
            continue;
          }
          candidates.push({
            symbol,
            relevance: 1,
            context: 'visible symbol',
          });
        }

        const result = yield* Effect.promise(() =>
          self.symbolManager.resolveSymbol(currentWord, resolutionContext),
        );

        if (
          result.symbol &&
          !candidates.some(
            (candidate) => candidate.symbol.id === result.symbol?.id,
          )
        ) {
          candidates.push({
            symbol: result.symbol,
            relevance: result.confidence,
            context: result.resolutionContext || 'context-aware resolution',
          });
        }
      } catch (error) {
        self.logger.debug(
          () => `Error resolving symbol ${currentWord}: ${error}`,
        );
      }

      return candidates;
    });
  }
}
