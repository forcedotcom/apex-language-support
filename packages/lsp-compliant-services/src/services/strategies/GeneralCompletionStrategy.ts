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
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionContext } from '../CompletionProcessingService';
import { CompletionStrategy, CompletionCandidate } from './CompletionStrategy';

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
    // Handle when there is no trigger character (general typing)
    return context.triggerCharacter !== '.';
  }

  getCompletions(
    context: CompletionContext,
  ): Effect.Effect<CompletionCandidate[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const candidates: CompletionCandidate[] = [];
      const batchSize = 50;

      // Create resolution context for ApexSymbolManager
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

      // Get the word being typed
      const currentWord = self.getWordAtPosition(
        context.document,
        context.position,
      );

      const partialMatches = [currentWord, '*'];

      for (const partialMatch of partialMatches) {
        try {
          if (partialMatch === '*') {
            // Handle wildcard pattern - get all symbols for completion
            const allSymbols = yield* Effect.promise(() =>
              self.symbolManager.getAllSymbolsForCompletion(),
            );
            for (let i = 0; i < allSymbols.length; i++) {
              const symbol = allSymbols[i];
              candidates.push({
                symbol,
                relevance: 0.5,
                context: 'wildcard completion',
              });
              // Yield after every batchSize symbols
              if ((i + 1) % batchSize === 0 && i + 1 < allSymbols.length) {
                yield* Effect.yieldNow();
              }
            }
          } else {
            // Use ApexSymbolManager's context-aware resolution
            const result = yield* Effect.promise(() =>
              self.symbolManager.resolveSymbol(partialMatch, resolutionContext),
            );

            if (result.symbol) {
              candidates.push({
                symbol: result.symbol,
                relevance: result.confidence,
                context: result.resolutionContext || 'context-aware resolution',
              });
            }
          }
        } catch (error) {
          self.logger.debug(
            () => `Error resolving symbol ${partialMatch}: ${error}`,
          );
        }
      }

      return candidates;
    });
  }

  private getWordAtPosition(
    document: TextDocument,
    position: { line: number; character: number },
  ): string {
    // Simplified - would use proper word boundary detection
    const text = document.getText();
    const offset = document.offsetAt(position);
    let start = offset;
    let end = offset;

    while (start > 0 && /\w/.test(text[start - 1])) {
      start--;
    }
    while (end < text.length && /\w/.test(text[end])) {
      end++;
    }

    return text.substring(start, end);
  }
}
