/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { CompilerService, RawParseTree } from '../parser/compilerService';
import { ApexSymbolCollectorListener } from '../parser/listeners/ApexSymbolCollectorListener';
import { SymbolTable } from '../types/symbol';
import {
  ConstantExtraction,
  ExpressionAtRange,
  findConstantExtraction,
  findExpressionAtRange,
  LspRange,
} from './expressionRangeFinder';
import {
  inferExpressionType,
  InferExpressionTypeOptions,
} from './expressionTypeInference';
import { findMethodCallAtRange, MethodCallAtRange } from './methodCallAtRange';

/**
 * Opaque, parsed-once handle for the code-action finders.
 *
 * Produced by {@link parseForCodeActions} and passed back into the range-based
 * accessors ({@link findExpressionForCodeAction}, etc.). The parse tree and
 * symbol table are held privately so the language-server layer never sees an
 * ANTLR type nor decides which listener / compile options to use — that
 * orchestration lives here, next to the finders that consume it.
 */
export interface CodeActionParseContext {
  /** @internal Cached CST; not for consumption outside this module's accessors. */
  readonly parseTree: RawParseTree | undefined;
  /**
   * @internal Same-file symbol table from the single parse; consumed by
   * {@link inferTypeForCodeAction} for expression type inference. Not for
   * consumption outside this module's accessors.
   */
  readonly symbolTable: SymbolTable | undefined;
}

/**
 * Parse `text` (Apex source for `uri`) into the CST and same-file symbol table
 * the code-action finders need, exactly once. Owns the {@link CompilerService}
 * construction, the {@link ApexSymbolCollectorListener} (which yields both the
 * `parseTree` and a `SymbolTable` in one walk), and the compile options —
 * knowledge that used to leak into the LS layer.
 *
 * The symbol table powers expression type inference (story 01.1); same-file
 * references are resolved so variable/parameter/field declarations carry their
 * declared types.
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
      new ApexSymbolCollectorListener(),
      {
        includeComments: false,
        collectReferences: true,
        resolveReferences: true,
      },
    );
    const symbolTable =
      result.result instanceof SymbolTable ? result.result : undefined;
    return { parseTree: result.parseTree, symbolTable };
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
 * Compute the class-body constant-extraction descriptor from an
 * {@link ExpressionAtRange} already obtained via
 * {@link findExpressionForCodeAction}. Prefer this when the caller has already
 * located the expression (the Extract path does): it reuses that result instead
 * of walking the tree again. The `ExpressionAtRange` handle stays opaque to the
 * caller — only this module reads its private `expression`. Returns `null` when
 * `found` is null or has no eligible enclosing class.
 */
export const findConstantExtractionFromExpression = (
  found: ExpressionAtRange | null | undefined,
): ConstantExtraction | null =>
  found ? findConstantExtraction(found.expression) : null;

/**
 * Compute the class-body constant-extraction descriptor for the expression
 * enclosing `range` in a previously parsed context. Resolves the expression
 * internally (reusing the single parse — no reparse) so the caller never holds
 * an ANTLR `ExpressionContext`. Returns `null` when there is no eligible
 * enclosing class.
 *
 * When the caller has already called {@link findExpressionForCodeAction} for the
 * same range, prefer {@link findConstantExtractionFromExpression} to avoid a
 * redundant tree walk.
 */
export const findConstantExtractionForCodeAction = (
  context: CodeActionParseContext | null | undefined,
  range: LspRange,
): ConstantExtraction | null =>
  findConstantExtractionFromExpression(
    findExpressionForCodeAction(context, range),
  );

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
  context
    ? findMethodCallAtRange(context.parseTree, range, context.symbolTable)
    : null;

/**
 * Infer the Apex type of an expression already located via
 * {@link findExpressionForCodeAction}, using the single parse's same-file symbol
 * table. Returns the correctly-cased type name (e.g. `Integer`, `String`,
 * `Account`) for the Extract Variable / Extract Constant declaration, or `null`
 * when the type cannot be resolved (the caller falls back to `Object`).
 *
 * The `ExpressionAtRange` handle stays opaque to the caller — only this module
 * reads its private `expression`. Cross-file resolution enters through the
 * optional {@link InferExpressionTypeOptions.lookupCrossFileType} seam; when
 * omitted, resolution is same-file only.
 */
export const inferTypeForCodeAction = (
  context: CodeActionParseContext | null | undefined,
  found: ExpressionAtRange | null | undefined,
  options: InferExpressionTypeOptions = {},
): string | null =>
  context && found
    ? inferExpressionType(found.expression, context.symbolTable, options)
    : null;

/**
 * Choose an extraction name from declarations in the parser-owned symbol
 * table. Apex identifiers are case-insensitive, so collision checks are too.
 * Returns `null` when the current parse has no semantic table rather than
 * scanning document text for identifier-shaped words.
 */
export const nextExtractNameForCodeAction = (
  context: CodeActionParseContext | null | undefined,
): string | null => {
  if (!context?.symbolTable) {
    return null;
  }

  const names = new Set(
    context.symbolTable
      .getAllSymbols()
      .map((symbol) => symbol.name.toLowerCase()),
  );
  for (let index = 1; index < 1000; index++) {
    const candidate = `v${index}`;
    if (!names.has(candidate)) {
      return candidate;
    }
  }
  return null;
};
