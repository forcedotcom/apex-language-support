/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionContext } from '../CompletionProcessingService';
import { CompletionStrategy, CompletionCandidate } from './CompletionStrategy';

/**
 * Static description of a single trigger context variable. Backs the synthetic
 * symbol-like objects returned to the completion pipeline since these
 * variables aren't part of the user's symbol table.
 */
interface TriggerVariableDescriptor {
  name: string;
  typeName: string;
}

/**
 * Trigger context variables exposed via `Trigger.<name>` inside a `.trigger`
 * file. Order and naming mirror Jorje's `TriggerKeywordCompletionStrategy`.
 */
const TRIGGER_VARIABLES: readonly TriggerVariableDescriptor[] = [
  { name: 'isExecuting', typeName: 'Boolean' },
  { name: 'isInsert', typeName: 'Boolean' },
  { name: 'isUpdate', typeName: 'Boolean' },
  { name: 'isDelete', typeName: 'Boolean' },
  { name: 'isBefore', typeName: 'Boolean' },
  { name: 'isAfter', typeName: 'Boolean' },
  { name: 'isUndelete', typeName: 'Boolean' },
  { name: 'new', typeName: 'List<SObject>' },
  { name: 'newMap', typeName: 'Map<Id,SObject>' },
  { name: 'old', typeName: 'List<SObject>' },
  { name: 'oldMap', typeName: 'Map<Id,SObject>' },
  { name: 'size', typeName: 'Integer' },
];

/**
 * Strategy for trigger-related completions. Combines the responsibilities of
 * Jorje's `TriggerKeywordCompletionStrategy` (the `trigger` keyword at the top
 * level of a `.trigger` file) and `TriggerContextVariablesCompletionStrategy`
 * (suggestions after `Trigger.`).
 */
export class TriggerCompletionStrategy implements CompletionStrategy {
  readonly name = 'TriggerCompletion';

  canHandle(context: CompletionContext): boolean {
    if (!this.isTriggerFile(context.document.uri)) {
      return false;
    }

    const lineText = context.document.getText({
      start: { line: context.position.line, character: 0 },
      end: context.position,
    });

    // After `Trigger.<prefix>` — context variables.
    if (this.isAfterTriggerDot(lineText)) {
      return true;
    }

    // Top-level: only when not inside a member expression.
    return !lineText.trimEnd().endsWith('.');
  }

  getCompletions(
    context: CompletionContext,
  ): Effect.Effect<CompletionCandidate[], never, never> {
    const self = this;
    return Effect.gen(function* () {
      const candidates: CompletionCandidate[] = [];
      const lineText = context.document.getText({
        start: { line: context.position.line, character: 0 },
        end: context.position,
      });

      if (self.isAfterTriggerDot(lineText)) {
        for (const variable of TRIGGER_VARIABLES) {
          candidates.push({
            symbol: self.makeTriggerVariableSymbol(variable),
            relevance: 0.95,
            context: 'trigger context variable',
          });
        }
        yield* Effect.yieldNow();
        return candidates;
      }

      // Top-level: suggest the `trigger` keyword when the prefix matches.
      const word = self
        .getWordAtPosition(context.document, context.position)
        .toLowerCase();
      if (self.shouldSuggestTriggerKeyword(lineText, word)) {
        candidates.push({
          symbol: self.makeTriggerKeywordSymbol(),
          relevance: 0.9,
          context: 'trigger keyword',
        });
      }

      return candidates;
    });
  }

  /**
   * True if the URI looks like an Apex trigger file (`.trigger` extension).
   */
  private isTriggerFile(uri: string): boolean {
    return /\.trigger(\?|#|$)/i.test(uri);
  }

  /**
   * Match the same pattern Jorje uses: `(?i)trigger\.[a-z]*` immediately
   * before the cursor on the current line. We anchor to the end of the line
   * text up to the cursor.
   */
  private isAfterTriggerDot(lineText: string): boolean {
    return /(?:^|[^A-Za-z0-9_$])trigger\.[A-Za-z]*$/i.test(lineText);
  }

  /**
   * Decide whether the cursor is at a top-level position where the `trigger`
   * keyword would be valid. Conservative: only at the start of the file's
   * non-whitespace content, optionally with a partial prefix matching `trigger`.
   */
  private shouldSuggestTriggerKeyword(lineText: string, word: string): boolean {
    const beforeWord =
      word.length > 0
        ? lineText.slice(0, lineText.length - word.length)
        : lineText;
    if (beforeWord.trim().length !== 0) {
      return false;
    }
    if (word.length === 0) return true;
    return 'trigger'.startsWith(word);
  }

  /**
   * Build a synthetic symbol-like object for a trigger context variable.
   */
  private makeTriggerVariableSymbol(variable: TriggerVariableDescriptor): any {
    return {
      id: `trigger-variable:${variable.name}`,
      name: variable.name,
      kind: 'variable',
      type: { name: variable.typeName },
      modifiers: { isStatic: false, isBuiltIn: true, visibility: 'public' },
      location: {
        symbolRange: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
        identifierRange: {
          startLine: 0,
          startColumn: 0,
          endLine: 0,
          endColumn: 0,
        },
      },
    };
  }

  /**
   * Build a synthetic symbol-like object for the `trigger` keyword itself.
   */
  private makeTriggerKeywordSymbol(): any {
    return {
      id: 'trigger-keyword',
      name: 'trigger',
      kind: 'variable',
      modifiers: { isStatic: false, isBuiltIn: true, visibility: 'public' },
      location: {
        symbolRange: { startLine: 0, startColumn: 0, endLine: 0, endColumn: 0 },
        identifierRange: {
          startLine: 0,
          startColumn: 0,
          endLine: 0,
          endColumn: 0,
        },
      },
    };
  }

  private getWordAtPosition(
    document: TextDocument,
    position: { line: number; character: number },
  ): string {
    const text = document.getText();
    const offset = document.offsetAt(position);
    let start = offset;
    while (start > 0 && /\w/.test(text[start - 1])) {
      start--;
    }
    return text.substring(start, offset);
  }
}
