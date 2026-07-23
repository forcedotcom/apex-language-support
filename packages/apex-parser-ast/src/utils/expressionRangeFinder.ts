/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4';
import {
  BlockContext,
  ExpressionContext,
  StatementContext,
} from '@apexdevtools/apex-parser';

/**
 * Minimal LSP-style position (0-based line, 0-based character).
 *
 * Declared locally so `apex-parser-ast` need not depend on
 * `vscode-languageserver-*`. It is structurally compatible with the vscode
 * `Position`, so callers can pass an LSP `Range` directly.
 */
export interface LspPosition {
  line: number;
  character: number;
}

/**
 * Minimal LSP-style range (structurally compatible with vscode `Range`).
 */
export interface LspRange {
  start: LspPosition;
  end: LspPosition;
}

/**
 * Result of {@link findExpressionAtRange}: the minimal expression that encloses
 * a selection, plus the anchor needed to insert a statement above it.
 */
export interface ExpressionAtRange {
  /** The minimal `ExpressionContext` whose span encloses the selection. */
  expression: ExpressionContext;
  /**
   * 0-based character offset (into the source) of the first character of the
   * enclosing statement. This is the insertion point for an extracted local.
   */
  statementStart: number;
  /** Leading whitespace (spaces/tabs) preceding the enclosing statement. */
  indent: string;
}

/**
 * Convert an ANTLR start token to an LSP position.
 * ANTLR lines are 1-based; LSP lines are 0-based. Columns are 0-based in both.
 */
const startPositionOf = (ctx: ParserRuleContext): LspPosition => ({
  line: ctx.start.line - 1,
  character: ctx.start.column,
});

/**
 * Convert an ANTLR stop token to an LSP end position (exclusive of the token's
 * own width, i.e. pointing just past the last character).
 */
const endPositionOf = (ctx: ParserRuleContext): LspPosition => {
  const stop = ctx.stop ?? ctx.start;
  return {
    line: stop.line - 1,
    character: stop.column + (stop.text?.length ?? 0),
  };
};

/** Order two LSP positions: negative if a < b, 0 if equal, positive if a > b. */
const comparePositions = (a: LspPosition, b: LspPosition): number =>
  a.line !== b.line ? a.line - b.line : a.character - b.character;

/**
 * True when `ctx`'s source span fully encloses `range` (start at or before the
 * selection start, stop at or after the selection end).
 */
const enclosesRange = (ctx: ParserRuleContext, range: LspRange): boolean => {
  if (!ctx.start || !ctx.stop) {
    return false;
  }
  return (
    comparePositions(startPositionOf(ctx), range.start) <= 0 &&
    comparePositions(endPositionOf(ctx), range.end) >= 0
  );
};

/**
 * True when `inner`'s span is contained within (or equal to) `outer`'s span.
 * Used to pick the tightest enclosing expression.
 */
const isTighterThan = (
  inner: ParserRuleContext,
  outer: ParserRuleContext,
): boolean =>
  comparePositions(startPositionOf(inner), startPositionOf(outer)) >= 0 &&
  comparePositions(endPositionOf(inner), endPositionOf(outer)) <= 0;

/**
 * Structural guard for a rule-context node.
 *
 * The parse-tree nodes carry their own `ParserRuleContext` class identity from
 * the parser package's bundled `antlr4`, which is not the same class object as
 * the top-level `antlr4` import — so a runtime `instanceof ParserRuleContext`
 * check is unreliable across that boundary. `instanceof ExpressionContext`
 * (etc.) is reliable because those come from the same package as the tree.
 * We use this structural test only to decide whether a child is worth
 * recursing into.
 */
const isRuleContext = (node: unknown): node is ParserRuleContext =>
  typeof node === 'object' &&
  node !== null &&
  typeof (node as ParserRuleContext).getChildCount === 'function' &&
  typeof (node as ParserRuleContext).getChild === 'function';

/**
 * Walk the CST rooted at `node`, returning the tightest `ExpressionContext`
 * whose span encloses `range`. Because expressions nest, the tightest enclosing
 * expression is well defined; a selection that straddles two sibling
 * expressions (or spans statements) has no single enclosing expression.
 */
const findMinimalEnclosingExpression = (
  node: ParserRuleContext,
  range: LspRange,
): ExpressionContext | null => {
  let best: ExpressionContext | null = null;

  const visit = (current: ParserRuleContext): void => {
    if (
      current instanceof ExpressionContext &&
      enclosesRange(current, range) &&
      (best === null || isTighterThan(current, best))
    ) {
      best = current;
    }

    const childCount = current.getChildCount();
    for (let i = 0; i < childCount; i++) {
      const child = current.getChild(i);
      if (isRuleContext(child)) {
        visit(child);
      }
    }
  };

  visit(node);
  return best;
};

/** Walk up from `ctx` to the nearest enclosing `StatementContext`, or null. */
const findEnclosingStatement = (
  ctx: ParserRuleContext,
): StatementContext | null => {
  let current: ParserRuleContext | undefined = ctx.parentCtx;
  while (current) {
    if (current instanceof StatementContext) {
      return current;
    }
    current = current.parentCtx;
  }
  return null;
};

/** True when `ctx` has a `BlockContext` ancestor (i.e. sits in a method/block body). */
const hasEnclosingBlock = (ctx: ParserRuleContext): boolean => {
  let current: ParserRuleContext | undefined = ctx.parentCtx;
  while (current) {
    if (current instanceof BlockContext) {
      return true;
    }
    current = current.parentCtx;
  }
  return false;
};

/**
 * Extract the leading whitespace (spaces/tabs) that precedes `statement` on its
 * own line, using the shared source `CharStream`. Returns `''` when the
 * statement is not indented or the offsets are unavailable.
 */
const leadingIndentOf = (statement: StatementContext): string => {
  const startOffset = statement.start.start;
  const stream = statement.start.getInputStream();
  if (!stream || startOffset <= 0) {
    return '';
  }

  let index = startOffset - 1;
  while (index >= 0) {
    const char = stream.getText(index, index);
    if (char === ' ' || char === '\t') {
      index--;
    } else {
      break;
    }
  }

  const indentStart = index + 1;
  if (indentStart > startOffset - 1) {
    return '';
  }
  return stream.getText(indentStart, startOffset - 1);
};

/**
 * Given a parse tree and an LSP selection range, find the minimal expression the
 * selection encloses, its enclosing statement's start offset, and that
 * statement's leading indentation.
 *
 * This is the reusable CST-walk foundation for the Extract family of code
 * actions (Extract Variable, Extract Constant, Declare Missing Method). It does
 * no type inference — that is a separate concern.
 *
 * Returns `null` (never throws) when:
 * - the parse tree is missing,
 * - the selection is not a single expression (spans multiple statements, or
 *   straddles sibling expressions),
 * - the expression is not inside a method/block body (e.g. a field initializer),
 * - the input is syntactically broken enough that offsets are unavailable.
 *
 * @param parseTree Cached CST from `CompilationResult.parseTree` (compilation
 *   unit, trigger unit, or block), or any `ParserRuleContext` subtree.
 * @param range LSP selection range (0-based line/character). Structurally
 *   compatible with the vscode `Range`.
 */
export const findExpressionAtRange = (
  parseTree: ParserRuleContext | null | undefined,
  range: LspRange,
): ExpressionAtRange | null => {
  try {
    if (!parseTree || !range || !range.start || !range.end) {
      return null;
    }

    const expression = findMinimalEnclosingExpression(parseTree, range);
    if (!expression) {
      return null;
    }

    const statement = findEnclosingStatement(expression);
    if (!statement || !statement.start || !hasEnclosingBlock(statement)) {
      return null;
    }

    return {
      expression,
      statementStart: statement.start.start,
      indent: leadingIndentOf(statement),
    };
  } catch {
    // Syntax-error resilient: degrade to null, never throw.
    return null;
  }
};
