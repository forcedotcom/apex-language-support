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
  ClassDeclarationContext,
  ExpressionContext,
  LiteralPrimaryContext,
  NegExpressionContext,
  PreOpExpressionContext,
  PrimaryExpressionContext,
  StatementContext,
} from '@apexdevtools/apex-parser';

/**
 * One level of member indentation for generated declarations. The Extract
 * family emits two-space indent units (matching the Extract Variable path); do
 * not introduce tabs here.
 */
const INDENT_UNIT = '  ';

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
 * Result of {@link findConstantExtraction}: everything the LS layer needs to
 * insert an extracted constant at class-body level, expressed in NEUTRAL terms
 * (no ANTLR types cross the package boundary).
 */
export interface ConstantExtraction {
  /**
   * 0-based character offset (into the source) where the new class-body member
   * line should be inserted — immediately after the enclosing class body's
   * opening `{`.
   */
  insertOffset: number;
  /**
   * Physical indentation for the new member: the actual leading whitespace of
   * the enclosing class declaration's line plus exactly one indent unit. Read
   * from the char stream (never derived from a token column) so it survives
   * visibility/sharing modifiers preceding the `class` keyword.
   */
  indent: string;
  /**
   * True when the target is an inner (nested) class. Apex/Jorje disallows
   * `static` on inner members, so callers emit `private final` rather than
   * `private static final`.
   */
  isInner: boolean;
  /**
   * True when the selected expression is a literal (or prefix-of-literal, e.g.
   * `-5`) — the Extract Constant eligibility rule.
   */
  isLiteral: boolean;
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
 * Compute the PHYSICAL leading whitespace (spaces/tabs) of the source line that
 * contains `offset`, using the shared source `CharStream`. Returns `''` when the
 * line is not indented or the offsets/stream are unavailable.
 *
 * Unlike a token's `.column`, this reflects the true line indentation even when
 * the token at `offset` is preceded on its line by other tokens — e.g. the
 * `class` keyword in `public with sharing class`, whose column is ~18 but whose
 * line indentation is 0. It walks back to the start of the line, then measures
 * the run of leading whitespace from there.
 */
const physicalLineIndentAt = (
  ctx: ParserRuleContext,
  offset: number,
): string => {
  const stream = ctx.start.getInputStream();
  if (!stream || offset <= 0) {
    return '';
  }

  // Walk back to the first character of the line (just past the newline).
  let lineStart = offset;
  while (lineStart > 0) {
    const char = stream.getText(lineStart - 1, lineStart - 1);
    if (char === '\n' || char === '\r') {
      break;
    }
    lineStart--;
  }

  // Measure the run of leading whitespace from the line start.
  let index = lineStart;
  while (index < offset) {
    const char = stream.getText(index, index);
    if (char === ' ' || char === '\t') {
      index++;
    } else {
      break;
    }
  }

  if (index <= lineStart) {
    return '';
  }
  return stream.getText(lineStart, index - 1);
};

/**
 * Extract the leading whitespace (spaces/tabs) that precedes `statement` on its
 * own line, using the shared source `CharStream`. Returns `''` when the
 * statement is not indented or the offsets are unavailable.
 */
const leadingIndentOf = (statement: StatementContext): string =>
  physicalLineIndentAt(statement, statement.start.start);

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

/**
 * Determine whether `expression` is a literal or a prefix-of-literal (a unary
 * `+`/`-`/`~`/`!` applied to a literal, e.g. `-5`). Only such expressions are
 * eligible for Extract Constant, matching Jorje's rule.
 *
 * The `instanceof` checks are safe here (unlike a cross-package check): the CST
 * nodes and these context classes both come from this package's bundled
 * `@apexdevtools/apex-parser`.
 */
const isLiteralExpression = (expression: ExpressionContext): boolean => {
  // Bare literal: `primary -> literal`.
  if (
    expression instanceof PrimaryExpressionContext &&
    expression.primary() instanceof LiteralPrimaryContext
  ) {
    return true;
  }

  // Prefix-of-literal: unary operator applied to a (possibly nested) literal,
  // e.g. `-5`, `+3`, `!true`, `~0`.
  if (
    expression instanceof PreOpExpressionContext ||
    expression instanceof NegExpressionContext
  ) {
    const inner = expression.expression();
    return inner ? isLiteralExpression(inner) : false;
  }

  return false;
};

/** Walk up from `ctx` to the nearest enclosing `ClassDeclarationContext`, or null. */
const findEnclosingClass = (
  ctx: ParserRuleContext,
): ClassDeclarationContext | null => {
  let current: ParserRuleContext | undefined = ctx.parentCtx;
  while (current) {
    if (current instanceof ClassDeclarationContext) {
      return current;
    }
    current = current.parentCtx;
  }
  return null;
};

/** True when `classDecl` is nested inside another class declaration. */
const isInnerClass = (classDecl: ClassDeclarationContext): boolean =>
  findEnclosingClass(classDecl) !== null;

/**
 * Given an expression (from {@link findExpressionAtRange}), compute the neutral
 * insertion descriptor for extracting it to a class-body constant: the offset
 * just after the enclosing class body's opening `{`, the physical member
 * indentation (class-line indent + one unit), whether the class is inner, and
 * whether the expression is literal-eligible.
 *
 * Returns `null` (never throws) when there is no enclosing class or its body
 * brace / offsets are unavailable. Keeping this alongside
 * {@link findExpressionAtRange} means the LS layer never touches ANTLR types.
 *
 * @param expression The minimal enclosing expression to extract.
 */
export const findConstantExtraction = (
  expression: ExpressionContext | null | undefined,
): ConstantExtraction | null => {
  try {
    if (!expression) {
      return null;
    }

    const classDecl = findEnclosingClass(expression);
    if (!classDecl) {
      return null;
    }

    const classBody = classDecl.classBody();
    const openBrace = classBody?.LBRACE();
    if (!classBody || !openBrace) {
      return null;
    }

    // Insert immediately after the class body's opening brace.
    const insertOffset = openBrace.symbol.stop + 1;

    // Physical indent of the class declaration's line + one member level.
    // `classDecl.start` points at the `class` keyword (modifiers live in a
    // parent context), so we measure the line's actual indentation from the
    // char stream rather than the keyword's column — the latter shifts with
    // visibility/sharing modifiers (e.g. `public with sharing class`).
    const indent =
      physicalLineIndentAt(classDecl, classDecl.start.start) + INDENT_UNIT;

    return {
      insertOffset,
      indent,
      isInner: isInnerClass(classDecl),
      isLiteral: isLiteralExpression(expression),
    };
  } catch {
    // Syntax-error resilient: degrade to null, never throw.
    return null;
  }
};
