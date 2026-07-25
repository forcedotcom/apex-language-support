/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService, RawParseTree } from '../parser/compilerService';
import { ApexFoldingRangeListener } from '../parser/listeners/ApexFoldingRangeListener';
import {
  ConstantExtraction,
  ExpressionAtRange,
  findConstantExtraction,
  findExpressionAtRange,
  LspRange,
} from './expressionRangeFinder';
import { findMethodCallAtRange, MethodCallAtRange } from './methodCallAtRange';

/**
 * Opaque, parsed-once handle for the code-action finders.
 *
 * Produced by {@link parseForCodeActions} and passed back into the range-based
 * accessors ({@link findExpressionForCodeAction}, etc.). The parse tree is held
 * privately so the language-server layer never sees an ANTLR type nor decides
 * which listener / compile options to use — that orchestration lives here, next
 * to the finders that consume it.
 */
export interface CodeActionParseContext {
  /** @internal Cached CST; not for consumption outside this module's accessors. */
  readonly parseTree: RawParseTree | undefined;
}

/**
 * Parse `text` (Apex source for `uri`) into the CST the code-action finders
 * need, exactly once. Owns the {@link CompilerService} construction, the
 * throwaway {@link ApexFoldingRangeListener} (used purely to obtain
 * `CompilationResult.parseTree`), and the compile options — knowledge that used
 * to leak into the LS layer.
 *
 * Returns `null` (never throws) on parse failure so callers simply degrade to
 * "no code actions offered". The returned handle is opaque: pass it to the
 * range-based accessors below rather than reading its fields.
 *
 * `text`/`uri` are plain strings (not a `TextDocument`) so this package need not
 * depend on `vscode-languageserver-*`.
 */
export const parseForCodeActions = (
  text: string,
  uri: string,
): CodeActionParseContext | null => {
  try {
    const result = new CompilerService().compile(
      text,
      uri,
      new ApexFoldingRangeListener(),
      { includeComments: false },
    );
    return { parseTree: result.parseTree };
  } catch {
    // Resilient: a broken parse yields no code actions, never an exception.
    return null;
  }
};

/**
 * Locate the minimal expression enclosing `range` in a previously parsed
 * context. Thin wrapper over {@link findExpressionAtRange} that keeps the ANTLR
 * parse tree private to this package. Returns `null` when no such expression
 * exists (or the context is missing).
 */
export const findExpressionForCodeAction = (
  context: CodeActionParseContext | null | undefined,
  range: LspRange,
): ExpressionAtRange | null =>
  context ? findExpressionAtRange(context.parseTree, range) : null;

/**
 * Compute the class-body constant-extraction descriptor for the expression
 * enclosing `range` in a previously parsed context. Resolves the expression
 * internally (reusing the single parse — no reparse) so the caller never holds
 * an ANTLR `ExpressionContext`. Returns `null` when there is no eligible
 * enclosing class.
 */
export const findConstantExtractionForCodeAction = (
  context: CodeActionParseContext | null | undefined,
  range: LspRange,
): ConstantExtraction | null => {
  const found = findExpressionForCodeAction(context, range);
  return found ? findConstantExtraction(found.expression) : null;
};

/**
 * Locate and describe the method call at (or overlapping) `range` in a
 * previously parsed context. Thin wrapper over {@link findMethodCallAtRange}
 * that keeps the ANTLR parse tree private to this package. Returns `null` when
 * the range is not on a method call.
 */
export const findMethodCallForCodeAction = (
  context: CodeActionParseContext | null | undefined,
  range: LspRange,
): MethodCallAtRange | null =>
  context ? findMethodCallAtRange(context.parseTree, range) : null;
