/*
 * Copyright (c) 2025, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { ParserRuleContext } from 'antlr4';
import {
  FormalParameterContext,
  MethodDeclarationContext,
  InterfaceMethodDeclarationContext,
  LocalVariableDeclarationContext,
  NewExpressionContext,
  CastExpressionContext,
  InstanceOfExpressionContext,
  EnhancedForControlContext,
  TypeRefPrimaryContext,
  FieldDeclarationContext,
  PropertyDeclarationContext,
  ClassDeclarationContext,
  InterfaceDeclarationContext,
  DotExpressionContext,
  DotMethodCallContext,
  TypeRefContext,
  TypeNameContext,
  VariableDeclaratorContext,
  InsertStatementContext,
  UpdateStatementContext,
  DeleteStatementContext,
  UndeleteStatementContext,
  UpsertStatementContext,
  ExpressionListContext,
  MethodCallContext,
  CreatedNameContext,
  ExpressionContext,
  PrimaryExpressionContext,
  LiteralPrimaryContext,
  IdPrimaryContext,
  PreOpExpressionContext,
  ModifierContext,
  AssignExpressionContext,
  ArrayExpressionContext,
} from '@apexdevtools/apex-parser';
import type {
  CallArgumentSemantic,
  IndexedAccessSemanticContext,
  InvocationSemanticContext,
  SemanticTypeShape,
} from '../types/symbolReference';
import type { Range } from '../types/symbol';
import type { TypeInfo } from '../types/typeInfo';
import { createTypeInfoFromTypeRef } from '../parser/utils/createTypeInfoFromTypeRef';

/** Return the grammar-selected modifier without interpreting composite text. */
export function modifierKeywordFromContext(
  ctx: ModifierContext,
): string | null {
  if (ctx.GLOBAL()) return 'global';
  if (ctx.PUBLIC()) return 'public';
  if (ctx.PROTECTED()) return 'protected';
  if (ctx.PRIVATE()) return 'private';
  if (ctx.TRANSIENT()) return 'transient';
  if (ctx.STATIC()) return 'static';
  if (ctx.ABSTRACT()) return 'abstract';
  if (ctx.FINAL()) return 'final';
  if (ctx.WEBSERVICE()) return 'webservice';
  if (ctx.OVERRIDE()) return 'override';
  if (ctx.VIRTUAL()) return 'virtual';
  if (ctx.TESTMETHOD()) return 'testmethod';
  if (ctx.WITH() && ctx.SHARING()) return 'with sharing';
  if (ctx.WITHOUT() && ctx.SHARING()) return 'without sharing';
  if (ctx.INHERITED() && ctx.SHARING()) return 'inherited sharing';
  return null;
}

/** Test lexer token identity within a parser subtree, including error nodes. */
export function parserContextContainsToken(
  ctx: ParserRuleContext,
  tokenType: number,
): boolean {
  for (const child of ctx.children ?? []) {
    const symbol = (child as { symbol?: { type?: number } }).symbol;
    if (symbol?.type === tokenType) return true;
    if (
      child instanceof ParserRuleContext &&
      parserContextContainsToken(child, tokenType)
    ) {
      return true;
    }
  }
  return false;
}

const parserRuleRange = (ctx: ParserRuleContext): Range => {
  const start = ctx.start;
  const stop = ctx.stop ?? start;
  return {
    startLine: start?.line ?? 1,
    startColumn: start?.column ?? 0,
    endLine: stop?.line ?? start?.line ?? 1,
    endColumn: (stop?.column ?? start?.column ?? 0) + (stop?.text?.length ?? 0),
  };
};

const terminalRange = (terminal: {
  symbol?: { line?: number; column?: number; text?: string };
}): Range => {
  const token = terminal.symbol;
  return {
    startLine: token?.line ?? 1,
    startColumn: token?.column ?? 0,
    endLine: token?.line ?? 1,
    endColumn: (token?.column ?? 0) + (token?.text?.length ?? 0),
  };
};

/**
 * Describe an indexed expression from its grammar nodes. Consumers can use this
 * fact to resolve `items[index].member` against the collection element type.
 */
export function indexedAccessSemantic(
  ctx: ParserRuleContext | undefined,
): IndexedAccessSemanticContext | undefined {
  if (!(ctx instanceof ArrayExpressionContext)) return undefined;

  const receiver = ctx.expression(0);
  const index = ctx.expression(1);
  if (!receiver || !index) return undefined;

  return {
    kind: 'indexed-access',
    receiverRange: parserRuleRange(receiver),
    indexRange: parserRuleRange(index),
    accessRange: parserRuleRange(ctx),
  };
}

/**
 * Generic type guard function for ParserRuleContext subclasses
 *
 * This utility provides a type-safe way to check if a parser context
 * is an instance of a specific context class, replacing the fragile
 * pattern of checking constructor names with instanceof.
 *
 * @param ctx The parser context to check
 * @param ContextClass The constructor of the context class to check against
 * @returns True if ctx is an instance of ContextClass
 *
 * @example
 * ```typescript
 * import { DotExpressionContext, MethodCallContext } from '@apexdevtools/apex-parser';
 *
 * if (isContextType(parent, DotExpressionContext)) {
 *   // TypeScript now knows parent is DotExpressionContext
 *   const dotContext = parent; // Fully typed
 * }
 *
 * if (isContextType(parent, MethodCallContext)) {
 *   // TypeScript now knows parent is MethodCallContext
 *   const methodContext = parent; // Fully typed
 * }
 * ```
 */
export function isContextType<T extends ParserRuleContext>(
  ctx: ParserRuleContext | undefined,
  ContextClass: new (...args: any[]) => T,
): ctx is T {
  return ctx instanceof ContextClass;
}

/**
 * Alternative type guard with Constructor type for better type safety
 *
 * @param ctx The parser context to check
 * @param ContextClass The constructor of the context class to check against
 * @returns True if ctx is an instance of ContextClass
 */
export function isContextTypeWithConstructor<T extends ParserRuleContext>(
  ctx: ParserRuleContext | undefined,
  ContextClass: Constructor<T>,
): ctx is T {
  return ctx instanceof ContextClass;
}

/**
 * Type alias for constructor functions
 */
export type Constructor<T> = new (...args: any[]) => T;

/**
 * Check if context is a method-related context
 * These contexts indicate that we're within a method-related scope where
 * method name resolution should be used.
 */
export function isMethodRelatedContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return (
    ctx instanceof FormalParameterContext ||
    ctx instanceof MethodDeclarationContext ||
    ctx instanceof InterfaceMethodDeclarationContext ||
    ctx instanceof LocalVariableDeclarationContext ||
    ctx instanceof NewExpressionContext ||
    ctx instanceof CastExpressionContext ||
    ctx instanceof InstanceOfExpressionContext ||
    ctx instanceof EnhancedForControlContext ||
    ctx instanceof TypeRefPrimaryContext
  );
}

/**
 * Check if context is a field or property declaration context
 */
export function isFieldOrPropertyContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return (
    ctx instanceof FieldDeclarationContext ||
    ctx instanceof PropertyDeclarationContext
  );
}

/**
 * Check if context is a type declaration context (class or interface)
 */
export function isTypeDeclarationContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return (
    ctx instanceof ClassDeclarationContext ||
    ctx instanceof InterfaceDeclarationContext
  );
}

/**
 * Check if context is a dot expression context (dot expression or dot method call)
 */
export function isDotExpressionContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return (
    ctx instanceof DotExpressionContext || ctx instanceof DotMethodCallContext
  );
}

/**
 * Check if context is a type reference context (type reference or type name)
 */
export function isTypeReferenceContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return ctx instanceof TypeRefContext || ctx instanceof TypeNameContext;
}

/**
 * Check if context is a variable or field declaration context
 * This includes field declarations, property declarations, local variable declarations,
 * and variable declarators.
 */
export function isVariableOrFieldDeclarationContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return (
    ctx instanceof FieldDeclarationContext ||
    ctx instanceof PropertyDeclarationContext ||
    ctx instanceof LocalVariableDeclarationContext ||
    ctx instanceof VariableDeclaratorContext
  );
}

/**
 * Check if context is a DML statement context
 * This includes insert, update, delete, undelete, and upsert statements.
 */
export function isDmlStatementContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return (
    ctx instanceof InsertStatementContext ||
    ctx instanceof UpdateStatementContext ||
    ctx instanceof DeleteStatementContext ||
    ctx instanceof UndeleteStatementContext ||
    ctx instanceof UpsertStatementContext
  );
}

/**
 * Check if context is a method declaration context
 * This includes both regular method declarations and interface method declarations.
 */
export function isMethodDeclarationContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return (
    ctx instanceof MethodDeclarationContext ||
    ctx instanceof InterfaceMethodDeclarationContext
  );
}

/**
 * Check if context is a method call context
 * This includes expression lists (method parameters), method calls, and dot method calls.
 */
export function isMethodCallContext(
  ctx: ParserRuleContext | undefined,
): boolean {
  if (!ctx) return false;
  return (
    ctx instanceof ExpressionListContext ||
    ctx instanceof MethodCallContext ||
    ctx instanceof DotMethodCallContext
  );
}

/**
 * Build a dot-separated type name from a CreatedNameContext.
 *
 * Grammar: createdName : idCreatedNamePair (DOT idCreatedNamePair)*
 *
 * Returns `null` when no idCreatedNamePair children exist.
 */
export function getTypeNameFromCreatedName(
  createdName: CreatedNameContext,
): string | null {
  const pairs = createdName.idCreatedNamePair_list();
  if (!pairs || pairs.length === 0) {
    return null;
  }
  return pairs.map((pair) => pair.anyId().getText()).join('.');
}

/**
 * Count the call-site arguments of a method-call context.
 *
 * Grammar: both `methodCall` (`id LPAREN expressionList? RPAREN`) and
 * `dotMethodCall` (`anyId LPAREN expressionList? RPAREN`) carry an optional
 * `expressionList`, whose `expression_list()` is the positional argument array.
 * A bare call (`f()`) has no `expressionList`, so this returns `0`.
 *
 * This is the call-site *arity* — statically available at parse time without
 * type resolution — used as the overload discriminator on METHOD_CALL
 * references (see {@link SymbolReference.argumentCount}, F11-2).
 */
export function countCallArguments(
  ctx: MethodCallContext | DotMethodCallContext,
): number {
  return ctx.expressionList()?.expression_list()?.length ?? 0;
}

const literalArgumentSemantic = (
  literal: LiteralPrimaryContext,
): CallArgumentSemantic => {
  const value = literal.literal();
  if (value.IntegerLiteral())
    return { kind: 'literal', literalType: 'Integer' };
  if (value.LongLiteral()) return { kind: 'literal', literalType: 'Long' };
  if (value.NumberLiteral()) return { kind: 'literal', literalType: 'Decimal' };
  if (value.StringLiteral() || value.MultilineStringLiteral()) {
    return { kind: 'literal', literalType: 'String' };
  }
  if (value.BooleanLiteral())
    return { kind: 'literal', literalType: 'Boolean' };
  if (value.NULL()) return { kind: 'literal', literalType: 'Null' };
  return { kind: 'unresolved' };
};

/** Classify an argument from parser contexts without interpreting source text. */
export function callArgumentSemantic(
  expression: ExpressionContext,
): CallArgumentSemantic {
  if (expression instanceof PrimaryExpressionContext) {
    const primary = expression.primary();
    if (primary instanceof LiteralPrimaryContext) {
      return literalArgumentSemantic(primary);
    }
    if (primary instanceof IdPrimaryContext) {
      return { kind: 'identifier', name: primary.id().getText() };
    }
  }

  // A unary +/- does not change the primitive numeric literal type.
  if (expression instanceof PreOpExpressionContext) {
    const operand = callArgumentSemantic(expression.expression());
    if (
      operand.kind === 'literal' &&
      (operand.literalType === 'Integer' ||
        operand.literalType === 'Long' ||
        operand.literalType === 'Decimal')
    ) {
      return operand;
    }
  }

  return { kind: 'unresolved' };
}

/** Parser-owned positional argument facts for a method call. */
export function callArgumentSemantics(
  ctx: MethodCallContext | DotMethodCallContext,
): CallArgumentSemantic[] {
  return (ctx.expressionList()?.expression_list() ?? []).map(
    callArgumentSemantic,
  );
}

const invocationResultTarget = (
  ctx: MethodCallContext | DotMethodCallContext,
): InvocationSemanticContext['resultTarget'] => {
  let expression: ExpressionContext | undefined;
  let current: ParserRuleContext | undefined = ctx.parentCtx;
  while (current) {
    if (current instanceof ExpressionContext) {
      expression = current;
      break;
    }
    current = current.parentCtx;
  }
  if (!expression) return undefined;
  let resultExpression: ExpressionContext = expression;

  while (resultExpression.parentCtx instanceof ExpressionContext) {
    const parent: ExpressionContext = resultExpression.parentCtx;
    if (parent instanceof AssignExpressionContext) {
      const [target, value] = parent.expression_list();
      if (value !== resultExpression || !target) return undefined;
      const targetPrimary =
        target instanceof PrimaryExpressionContext
          ? target.primary()
          : undefined;
      const targetIdentifier =
        targetPrimary instanceof IdPrimaryContext
          ? targetPrimary.id().getText()
          : undefined;
      return {
        kind: 'assignment',
        targetRange: parserRuleRange(target),
        targetIdentifier,
      };
    }
    resultExpression = parent;
  }

  const declarator = resultExpression.parentCtx;
  if (!(declarator instanceof VariableDeclaratorContext)) return undefined;
  const declaration = declarator.parentCtx?.parentCtx;
  if (!(declaration instanceof LocalVariableDeclarationContext)) {
    return undefined;
  }
  const target = declarator.id();
  const typeRef = declaration.typeRef();
  if (!target || !typeRef) return undefined;
  const expectedTypeInfo = createTypeInfoFromTypeRef(typeRef);
  return {
    kind: 'declared-variable',
    targetRange: parserRuleRange(target),
    targetIdentifier: target.getText(),
    expectedType: expectedTypeInfo.originalTypeString,
    expectedTypeShape: semanticTypeShape(expectedTypeInfo),
  };
};

const semanticTypeShape = (type: TypeInfo): SemanticTypeShape => ({
  name: type.name,
  isArray: type.isArray,
  isCollection: type.isCollection,
  typeParameters: type.typeParameters?.map(semanticTypeShape),
  keyType: type.keyType ? semanticTypeShape(type.keyType) : undefined,
});

/** Parser-owned call and separator ranges used by cursor language features. */
export function callInvocationSemantic(
  ctx: MethodCallContext | DotMethodCallContext,
): InvocationSemanticContext {
  const list = ctx.expressionList();
  return {
    kind: 'invocation',
    callRange: parserRuleRange(ctx),
    argumentRanges: (list?.expression_list() ?? []).map(parserRuleRange),
    separatorRanges: (list?.COMMA_list() ?? []).map(terminalRange),
    resultTarget: invocationResultTarget(ctx),
  };
}

/**
 * Count the call-site arguments of a constructor call (`new Foo(a, b)`).
 *
 * Grammar: `newExpression` → `creator` → `classCreatorRest` →
 * `arguments` (`LPAREN expressionList? RPAREN`), whose `expression_list()` is
 * the positional argument array. A no-arg `new Foo()` still has a
 * `classCreatorRest` with an empty `arguments`, so this returns `0`; a creator
 * with no `classCreatorRest` (array/map/set creators) also returns `0`.
 *
 * This is the constructor call-site *arity* — the overload discriminator that
 * lets `findReferencesTo` separate `Foo()` from `Foo(String)` the same way
 * {@link countCallArguments} does for method overloads (F11-2). Without it,
 * constructor-call references carry no `argumentCount` and constructor
 * overloads collapse onto one another.
 */
export function countConstructorArguments(ctx: NewExpressionContext): number {
  const rest = ctx.creator()?.classCreatorRest?.();
  return rest?.arguments()?.expressionList()?.expression_list()?.length ?? 0;
}

/** Parser-owned positional argument facts for a constructor call. */
export function constructorArgumentSemantics(
  ctx: NewExpressionContext,
): CallArgumentSemantic[] {
  const rest = ctx.creator()?.classCreatorRest?.();
  return (rest?.arguments()?.expressionList()?.expression_list() ?? []).map(
    callArgumentSemantic,
  );
}

/** Parser-owned constructor invocation and argument ranges. */
export function constructorInvocationSemantic(
  ctx: NewExpressionContext,
): InvocationSemanticContext {
  const list = ctx
    .creator()
    ?.classCreatorRest?.()
    ?.arguments()
    ?.expressionList();
  return {
    kind: 'invocation',
    callRange: parserRuleRange(ctx),
    argumentRanges: (list?.expression_list() ?? []).map(parserRuleRange),
    separatorRanges: (list?.COMMA_list() ?? []).map(terminalRange),
  };
}
