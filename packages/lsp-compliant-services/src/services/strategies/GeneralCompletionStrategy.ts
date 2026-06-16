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
    // Skip after a dot — member access is handled by MemberAccessCompletionStrategy.
    if (context.triggerCharacter === '.') {
      return false;
    }
    const lineText = context.document.getText({
      start: { line: context.position.line, character: 0 },
      end: context.position,
    });
    return !lineText.trimEnd().endsWith('.');
  }

  getCompletions(
    context: CompletionContext,
  ): Effect.Effect<CompletionCandidate[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const candidates: CompletionCandidate[] = [];
      const batchSize = 50;

      const currentWord = self.getWordAtPosition(
        context.document,
        context.position,
      );

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
        const result = yield* Effect.promise(() =>
          self.symbolManager.resolveSymbol(currentWord, resolutionContext),
        );

        if (result.symbol) {
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
