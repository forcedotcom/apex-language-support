/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4';
import {
  AssignExpressionContext,
  DotExpressionContext,
  ExpressionContext,
  ExpressionStatementContext,
  LiteralPrimaryContext,
  LocalVariableDeclarationContext,
  MethodCallExpressionContext,
  MethodDeclarationContext,
  NewExpressionContext,
  PrimaryExpressionContext,
  ReturnStatementContext,
  VariableDeclaratorContext,
} from '@apexdevtools/apex-parser';

import { findExpressionAtRange, LspRange } from './expressionRangeFinder';

/**
 * How a method call's result is consumed. This determines whether the call is
 * used in a value (non-void) position, which the Declare-Missing-Method quick
 * fix requires before offering to generate a stub.
 */
export type CallReturnContext =
  /** `foo.bar();` as a bare statement — the result is discarded (void). */
  | 'void'
  /** `Type x = foo.bar();` — result initializes a local variable. */
  | 'variable-initializer'
  /** `return foo.bar();` — result is returned from the enclosing method. */
  | 'return'
  /** `x = foo.bar();` — result is assigned to an existing target. */
  | 'assignment'
  /** Nested in another expression (argument, condition, operand, ...). */
  | 'expression';

/**
 * A single call argument, with an inferred Apex type when the argument is a
 * simple literal or `new` expression. `inferredType` is `undefined` when the
 * type cannot be determined syntactically (callers fall back to `Object`).
 */
export interface MethodCallArgument {
  /** Source text of the argument expression (whitespace-normalized). */
  text: string;
  /** Apex type inferred from a literal / constructor, or `undefined`. */
  inferredType?: string;
}

/**
 * Structured description of a method call located at a range. This lets the
 * language-server layer reason about a call site (name, receiver, arguments,
 * how the result is used) without depending on the ANTLR parse-tree types.
 */
export interface MethodCallAtRange {
  /** The simple method name being invoked. */
  methodName: string;
  /**
   * The receiver expression text (e.g. `acct`, `MyClass`) for a qualified
   * call `receiver.method(...)`, or `undefined` for an unqualified /
   * implicit-`this` call `method(...)`.
   */
  receiverText?: string;
  /** Arguments in call order. */
  arguments: MethodCallArgument[];
  /** How the call result is used (drives the non-void requirement). */
  returnContext: CallReturnContext;
  /**
   * For `variable-initializer` and `return` contexts, the declared / method
   * return type text that the call result flows into; `undefined` otherwise.
   */
  returnTypeText?: string;
}

/**
 * Infer an Apex type from an argument expression when it is a simple literal
 * or a `new` expression. Returns `undefined` for anything else so the caller
 * can fall back to `Object` (full expression type inference is out of scope —
 * tracked by story 01.1).
 */
const inferArgumentType = (
  expression: ExpressionContext,
): string | undefined => {
  if (expression instanceof NewExpressionContext) {
    return expression.creator()?.createdName()?.getText();
  }

  if (expression instanceof PrimaryExpressionContext) {
    const primary = expression.primary();
    if (primary instanceof LiteralPrimaryContext) {
      const literal = primary.literal();
      if (literal.StringLiteral() || literal.MultilineStringLiteral()) {
        return 'String';
      }
      if (literal.IntegerLiteral()) {
        return 'Integer';
      }
      if (literal.LongLiteral()) {
        return 'Long';
      }
      if (literal.NumberLiteral()) {
        return 'Decimal';
      }
      if (literal.BooleanLiteral()) {
        return 'Boolean';
      }
      // NULL literal carries no type information -> undefined.
    }
  }

  return undefined;
};

/** Collect and describe the arguments of an expression list, in order. */
const describeArguments = (
  expressionList: { expression_list(): ExpressionContext[] } | undefined,
): MethodCallArgument[] => {
  if (!expressionList) {
    return [];
  }
  return expressionList.expression_list().map((expression) => ({
    text: expression.getText(),
    inferredType: inferArgumentType(expression),
  }));
};

/** Walk up to the nearest enclosing method declaration, or `null`. */
const findEnclosingMethod = (
  ctx: ParserRuleContext,
): MethodDeclarationContext | null => {
  let current: ParserRuleContext | undefined = ctx.parentCtx;
  while (current) {
    if (current instanceof MethodDeclarationContext) {
      return current;
    }
    current = current.parentCtx;
  }
  return null;
};

/**
 * Determine how the call result is consumed and, where possible, the type it
 * flows into. The parent of the call expression tells us the usage position.
 */
const classifyReturnContext = (
  callExpression: ExpressionContext,
): { returnContext: CallReturnContext; returnTypeText?: string } => {
  const parent = callExpression.parentCtx;

  // `Type x = call();` — the call initializes a declared local.
  if (parent instanceof VariableDeclaratorContext) {
    // VariableDeclarator -> VariableDeclarators -> LocalVariableDeclaration.
    const declaration = parent.parentCtx?.parentCtx;
    const returnTypeText =
      declaration instanceof LocalVariableDeclarationContext
        ? declaration.typeRef()?.getText()
        : undefined;
    return { returnContext: 'variable-initializer', returnTypeText };
  }

  // `return call();` — result flows into the enclosing method's return type.
  if (parent instanceof ReturnStatementContext) {
    const method = findEnclosingMethod(callExpression);
    // typeRef() is absent for `void` methods -> leave undefined.
    const returnTypeText = method?.typeRef()?.getText();
    return { returnContext: 'return', returnTypeText };
  }

  // `x = call();` — assigned to an existing target (LHS type not resolved here).
  if (parent instanceof AssignExpressionContext) {
    return { returnContext: 'assignment' };
  }

  // `call();` — bare statement, result discarded.
  if (parent instanceof ExpressionStatementContext) {
    return { returnContext: 'void' };
  }

  // Nested inside another expression (argument, condition, operand, ...).
  return { returnContext: 'expression' };
};

/**
 * Locate a method-call expression at an LSP range and describe it structurally.
 *
 * Built on {@link findExpressionAtRange}: the tightest expression enclosing the
 * range at a call's method-name identifier is the call expression itself. This
 * powers the Declare-Missing-Method quick fix without exposing ANTLR types to
 * the language-server layer.
 *
 * Returns `null` (never throws) when the range is not on a method call, the
 * call is not inside a method/block body, or the input is too broken to parse.
 *
 * @param parseTree Cached CST from `CompilationResult.parseTree`.
 * @param range LSP range (0-based) pointing at (or within) the call.
 */
export const findMethodCallAtRange = (
  parseTree: ParserRuleContext | null | undefined,
  range: LspRange,
): MethodCallAtRange | null => {
  try {
    const found = findExpressionAtRange(parseTree, range);
    if (!found) {
      return null;
    }

    const { expression } = found;

    // Unqualified call: `method(args)`.
    if (expression instanceof MethodCallExpressionContext) {
      const methodCall = expression.methodCall();
      const methodName = methodCall.id()?.getText();
      if (!methodName) {
        return null;
      }
      return {
        methodName,
        arguments: describeArguments(methodCall.expressionList()),
        ...classifyReturnContext(expression),
      };
    }

    // Qualified call: `receiver.method(args)`.
    if (expression instanceof DotExpressionContext) {
      const dotMethodCall = expression.dotMethodCall();
      if (!dotMethodCall) {
        // A `receiver.field` access, not a method call.
        return null;
      }
      const methodName = dotMethodCall.anyId()?.getText();
      if (!methodName) {
        return null;
      }
      return {
        methodName,
        receiverText: expression.expression()?.getText(),
        arguments: describeArguments(dotMethodCall.expressionList()),
        ...classifyReturnContext(expression),
      };
    }

    return null;
  } catch {
    // Syntax-error resilient: degrade to null, never throw.
    return null;
  }
};
