/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { CharStreams, CommonTokenStream, ParserRuleContext } from 'antlr4ts';
import {
  ApexLexer,
  ApexParser,
  CaseInsensitiveInputStream,
  CompilationUnitContext,
  TriggerUnitContext,
  BlockContext,
  ParseTreeWalker,
  ExpressionContext,
  EqualityExpressionContext,
  CmpExpressionContext,
  Arth1ExpressionContext,
  Arth2ExpressionContext,
  BitAndExpressionContext,
  BitOrExpressionContext,
  BitNotExpressionContext,
  BitExpressionContext,
  CondExpressionContext,
  LiteralPrimaryContext,
  SubExpressionContext,
  DotExpressionContext,
  ArrayExpressionContext,
  MethodCallExpressionContext,
  NewExpressionContext,
  CastExpressionContext,
  InstanceOfExpressionContext,
  LogAndExpressionContext,
  LogOrExpressionContext,
  CoalExpressionContext,
  AssignExpressionContext,
  PreOpExpressionContext,
  PostOpExpressionContext,
  NegExpressionContext,
  ForControlContext,
  EnhancedForControlContext,
  IfStatementContext,
  WhileStatementContext,
  DoWhileStatementContext,
} from '@apexdevtools/apex-parser';
import type {
  SymbolTable,
  SymbolLocation,
  VariableSymbol,
} from '../../../types/symbol';
import { SymbolKind } from '../../../types/symbol';
import type {
  ValidationResult,
  ValidationErrorInfo,
  ValidationWarningInfo,
} from '../ValidationResult';
import type { ValidationOptions } from '../ValidationTier';
import { ValidationTier } from '../ValidationTier';
import { ValidationError, type Validator } from '../ValidatorRegistry';
import { localizeTyped } from '../../../i18n/messageInstance';
import { ErrorCodes } from '../../../generated/ErrorCodes';
import { BaseApexParserListener } from '../../../parser/listeners/BaseApexParserListener';
import { ISymbolManager } from '../ArtifactLoadingHelper';
import type { ISymbolManager as ISymbolManagerInterface } from '../../../types/ISymbolManager';
import { ReferenceContext } from '../../../types/symbolReference';

/**
 * Expression type information stored in WeakMap during validation
 */
export interface ExpressionTypeInfo {
  resolvedType: string | null;
  source: 'literal' | 'variable' | 'computed' | 'unknown';
  operandTypes?: string[]; // For binary expressions
  operator?: string; // For operator expressions
}

/**
 * Helper function to create SymbolLocation from parse tree context
 */
function getLocationFromContext(ctx: ParserRuleContext): SymbolLocation {
  const start = ctx.start;
  const stop = ctx.stop || start;
  const textLength = stop.text?.length || 0;

  const symbolRange = {
    startLine: start.line,
    startColumn: start.charPositionInLine,
    endLine: stop.line,
    endColumn: stop.charPositionInLine + textLength,
  };

  return {
    symbolRange,
    identifierRange: symbolRange,
  };
}

/**
 * Helper function to find the containing ExpressionContext for a given context
 */
function findContainingExpression(
  ctx: ParserRuleContext,
): ExpressionContext | null {
  let current: ParserRuleContext | null = ctx;
  let depth = 0;
  while (current && depth < 50) {
    if (current instanceof ExpressionContext) {
      return current;
    }
    current = current.parent || null;
    depth++;
  }
  return null;
}

/**
 * Check if an expression is a literal and return its type
 * Uses the tracked literal types from the listener
 */
function getLiteralType(
  expr: ExpressionContext,
  literalTypes: Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  >,
): 'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null' | null {
  return literalTypes.get(expr) || null;
}

/**
 * Check if an expression is a numeric literal (integer, long, or decimal)
 */
function _isNumericLiteral(
  expr: ExpressionContext,
  literalTypes: Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  >,
): boolean {
  const literalType = getLiteralType(expr, literalTypes);
  return (
    literalType === 'integer' ||
    literalType === 'long' ||
    literalType === 'decimal'
  );
}

/**
 * Check if an expression is a string literal
 */
function _isStringLiteral(
  expr: ExpressionContext,
  literalTypes: Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  >,
): boolean {
  return getLiteralType(expr, literalTypes) === 'string';
}

/**
 * Check if an expression is a boolean literal
 */
function _isBooleanLiteral(
  expr: ExpressionContext,
  literalTypes: Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  >,
): boolean {
  return getLiteralType(expr, literalTypes) === 'boolean';
}

/**
 * Type guard functions for expression context types
 */
function isSubExpression(
  expr: ExpressionContext,
): expr is SubExpressionContext {
  return expr instanceof SubExpressionContext;
}

function _isDotExpression(
  expr: ExpressionContext,
): expr is DotExpressionContext {
  return expr instanceof DotExpressionContext;
}

function _isArrayExpression(
  expr: ExpressionContext,
): expr is ArrayExpressionContext {
  return expr instanceof ArrayExpressionContext;
}

function _isMethodCallExpression(
  expr: ExpressionContext,
): expr is MethodCallExpressionContext {
  return expr instanceof MethodCallExpressionContext;
}

function _isNewExpression(
  expr: ExpressionContext,
): expr is NewExpressionContext {
  return expr instanceof NewExpressionContext;
}

function isCastExpression(
  expr: ExpressionContext,
): expr is CastExpressionContext {
  return expr instanceof CastExpressionContext;
}

function isInstanceOfExpression(
  expr: ExpressionContext,
): expr is InstanceOfExpressionContext {
  return expr instanceof InstanceOfExpressionContext;
}

function _isLogAndExpression(
  expr: ExpressionContext,
): expr is LogAndExpressionContext {
  return expr instanceof LogAndExpressionContext;
}

function _isLogOrExpression(
  expr: ExpressionContext,
): expr is LogOrExpressionContext {
  return expr instanceof LogOrExpressionContext;
}

function _isCoalExpression(
  expr: ExpressionContext,
): expr is CoalExpressionContext {
  return expr instanceof CoalExpressionContext;
}

function _isAssignExpression(
  expr: ExpressionContext,
): expr is AssignExpressionContext {
  return expr instanceof AssignExpressionContext;
}

function isPreOpExpression(
  expr: ExpressionContext,
): expr is PreOpExpressionContext {
  return expr instanceof PreOpExpressionContext;
}

function isPostOpExpression(
  expr: ExpressionContext,
): expr is PostOpExpressionContext {
  return expr instanceof PostOpExpressionContext;
}

function isNegExpression(
  expr: ExpressionContext,
): expr is NegExpressionContext {
  return expr instanceof NegExpressionContext;
}

function isBinaryExpression(expr: ExpressionContext): boolean {
  return (
    expr instanceof EqualityExpressionContext ||
    expr instanceof CmpExpressionContext ||
    expr instanceof Arth1ExpressionContext ||
    expr instanceof Arth2ExpressionContext ||
    expr instanceof BitAndExpressionContext ||
    expr instanceof BitOrExpressionContext ||
    expr instanceof BitNotExpressionContext ||
    expr instanceof BitExpressionContext ||
    expr instanceof LogAndExpressionContext ||
    expr instanceof LogOrExpressionContext ||
    expr instanceof CoalExpressionContext
  );
}

/**
 * Listener to collect expression-related parse tree information
 */
class ExpressionListener extends BaseApexParserListener<void> {
  // Map of ExpressionContext to literal type
  private expressionLiteralTypes = new Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  >();
  private comparisonExpressions: Array<{
    ctx: ExpressionContext;
    leftExpr: ExpressionContext;
    rightExpr: ExpressionContext;
    leftText?: string;
    rightText?: string;
    operator?: string;
  }> = [];
  private arithmeticExpressions: Array<{
    ctx: ExpressionContext;
    leftExpr: ExpressionContext;
    rightExpr: ExpressionContext;
    leftText?: string;
    rightText?: string;
    operator?: string;
  }> = [];
  private bitwiseExpressions: Array<{
    ctx: ExpressionContext;
    leftExpr: ExpressionContext;
    rightExpr: ExpressionContext;
    leftText?: string;
    rightText?: string;
    operator?: string;
  }> = [];
  private ternaryExpressions: Array<{
    ctx: ExpressionContext;
    conditionExpr: ExpressionContext;
    trueExpr: ExpressionContext;
    falseExpr: ExpressionContext;
    conditionText?: string;
    trueExprText?: string;
    falseExprText?: string;
  }> = [];
  private forControlExpressions: Array<{
    ctx: ExpressionContext;
    location: SymbolLocation;
  }> = [];
  private enhancedForControlExpressions: Array<{
    ctx: ExpressionContext;
    location: SymbolLocation;
  }> = [];
  private booleanConditionExpressions: Array<{
    ctx: ExpressionContext;
    location: SymbolLocation;
    statementType: 'if' | 'while' | 'do-while';
  }> = [];
  private unaryExpressions: Array<{
    ctx: ExpressionContext;
    operandExpr: ExpressionContext;
    operator: string;
    operatorType: 'prefix' | 'postfix' | 'negation';
    location: SymbolLocation;
  }> = [];
  private castExpressions: Array<{
    ctx: CastExpressionContext;
    sourceExpr: ExpressionContext;
    targetType: string;
    location: SymbolLocation;
  }> = [];
  private enhancedForControls: Array<{
    ctx: EnhancedForControlContext;
    variableType: string | null;
    collectionExpr: ExpressionContext;
    location: SymbolLocation;
  }> = [];

  enterLiteralPrimary(ctx: LiteralPrimaryContext): void {
    const literal = ctx.literal();
    if (!literal) {
      return;
    }

    // Determine literal type
    let literalType:
      | 'integer'
      | 'long'
      | 'decimal'
      | 'string'
      | 'boolean'
      | 'null'
      | null = null;

    if (literal.IntegerLiteral()) {
      literalType = 'integer';
    } else if (literal.LongLiteral()) {
      literalType = 'long';
    } else if (literal.NumberLiteral()) {
      literalType = 'decimal';
    } else if (literal.StringLiteral()) {
      literalType = 'string';
    } else if (literal.BooleanLiteral()) {
      literalType = 'boolean';
    } else if (literal.NULL()) {
      literalType = 'null';
    }

    if (literalType) {
      // Find the containing ExpressionContext and mark it
      const containingExpr = findContainingExpression(ctx);
      if (containingExpr) {
        this.expressionLiteralTypes.set(containingExpr, literalType);
      }
    }
  }

  enterEqualityExpression(ctx: EqualityExpressionContext): void {
    const expressions = ctx.expression();
    if (expressions.length >= 2) {
      const leftExpr = expressions[0];
      const rightExpr = expressions[1];
      const leftText = leftExpr.text || '';
      const rightText = rightExpr.text || '';
      // Extract operator from tokens
      const operator =
        ctx.TRIPLEEQUAL()?.text ||
        ctx.TRIPLENOTEQUAL()?.text ||
        ctx.EQUAL()?.text ||
        ctx.NOTEQUAL()?.text ||
        ctx.LESSANDGREATER()?.text ||
        '==';
      this.comparisonExpressions.push({
        ctx: ctx as ExpressionContext,
        leftExpr,
        rightExpr,
        leftText,
        rightText,
        operator,
      });
    }
  }

  enterCmpExpression(ctx: CmpExpressionContext): void {
    const expressions = ctx.expression();
    if (expressions.length >= 2) {
      const leftExpr = expressions[0];
      const rightExpr = expressions[1];
      const leftText = leftExpr.text || '';
      const rightText = rightExpr.text || '';
      // Extract operator from tokens
      let operator = '<';
      if (ctx.GT()) {
        operator = ctx.ASSIGN() ? '>=' : '>';
      } else if (ctx.LT()) {
        operator = ctx.ASSIGN() ? '<=' : '<';
      }
      this.comparisonExpressions.push({
        ctx: ctx as ExpressionContext,
        leftExpr,
        rightExpr,
        leftText,
        rightText,
        operator,
      });
    }
  }

  enterArth1Expression(ctx: Arth1ExpressionContext): void {
    const expressions = ctx.expression();
    if (expressions.length >= 2) {
      const leftExpr = expressions[0];
      const rightExpr = expressions[1];
      const leftText = leftExpr.text || '';
      const rightText = rightExpr.text || '';
      // Extract operator from tokens
      const operator = ctx.MUL() ? '*' : ctx.DIV() ? '/' : '*';
      this.arithmeticExpressions.push({
        ctx: ctx as ExpressionContext,
        leftExpr,
        rightExpr,
        leftText,
        rightText,
        operator,
      });
    }
  }

  enterArth2Expression(ctx: Arth2ExpressionContext): void {
    const expressions = ctx.expression();
    if (expressions.length >= 2) {
      const leftExpr = expressions[0];
      const rightExpr = expressions[1];
      const leftText = leftExpr.text || '';
      const rightText = rightExpr.text || '';
      // Extract operator from tokens
      const operator = ctx.ADD() ? '+' : ctx.SUB() ? '-' : '+';
      this.arithmeticExpressions.push({
        ctx: ctx as ExpressionContext,
        leftExpr,
        rightExpr,
        leftText,
        rightText,
        operator,
      });
    }
  }

  enterBitAndExpression(ctx: BitAndExpressionContext): void {
    const expressions = ctx.expression();
    if (expressions.length >= 2) {
      const leftExpr = expressions[0];
      const rightExpr = expressions[1];
      const leftText = leftExpr.text || '';
      const rightText = rightExpr.text || '';
      this.bitwiseExpressions.push({
        ctx: ctx as ExpressionContext,
        leftExpr,
        rightExpr,
        leftText,
        rightText,
        operator: '&',
      });
    }
  }

  enterBitOrExpression(ctx: BitOrExpressionContext): void {
    const expressions = ctx.expression();
    if (expressions.length >= 2) {
      const leftExpr = expressions[0];
      const rightExpr = expressions[1];
      const leftText = leftExpr.text || '';
      const rightText = rightExpr.text || '';
      this.bitwiseExpressions.push({
        ctx: ctx as ExpressionContext,
        leftExpr,
        rightExpr,
        leftText,
        rightText,
        operator: '|',
      });
    }
  }

  enterBitNotExpression(ctx: BitNotExpressionContext): void {
    const expressions = ctx.expression();
    if (expressions.length >= 2) {
      const leftExpr = expressions[0];
      const rightExpr = expressions[1];
      const leftText = leftExpr.text || '';
      const rightText = rightExpr.text || '';
      this.bitwiseExpressions.push({
        ctx: ctx as ExpressionContext,
        leftExpr,
        rightExpr,
        leftText,
        rightText,
        operator: '^',
      });
    }
  }

  enterBitExpression(ctx: BitExpressionContext): void {
    const expressions = ctx.expression();
    if (expressions.length >= 2) {
      const leftExpr = expressions[0];
      const rightExpr = expressions[1];
      const leftText = leftExpr.text || '';
      const rightText = rightExpr.text || '';
      // Extract operator from tokens
      // Grammar: expression (LT LT | GT GT GT | GT GT) expression
      let operator = '<<';
      const ltTokens = ctx.LT();
      const gtTokens = ctx.GT();
      if (ltTokens && ltTokens.length >= 2) {
        operator = '<<';
      } else if (gtTokens && gtTokens.length >= 3) {
        operator = '>>>';
      } else if (gtTokens && gtTokens.length >= 2) {
        operator = '>>';
      }
      this.bitwiseExpressions.push({
        ctx: ctx as ExpressionContext,
        leftExpr,
        rightExpr,
        leftText,
        rightText,
        operator,
      });
    }
  }

  enterCondExpression(ctx: CondExpressionContext): void {
    const expressions = ctx.expression();
    if (expressions.length >= 3) {
      const conditionExpr = expressions[0];
      const trueExpr = expressions[1];
      const falseExpr = expressions[2];
      const conditionText = conditionExpr.text || '';
      const trueExprText = trueExpr.text || '';
      const falseExprText = falseExpr.text || '';
      this.ternaryExpressions.push({
        ctx: ctx as ExpressionContext,
        conditionExpr,
        trueExpr,
        falseExpr,
        conditionText,
        trueExprText,
        falseExprText,
      });
    }
  }

  enterSubExpression(ctx: SubExpressionContext): void {
    // SubExpression is just parentheses around an expression
    // We'll handle it in the recursive resolver
  }

  enterLogAndExpression(ctx: LogAndExpressionContext): void {
    const expressions = ctx.expression();
    if (expressions.length >= 2) {
      const leftExpr = expressions[0];
      const rightExpr = expressions[1];
      const leftText = leftExpr.text || '';
      const rightText = rightExpr.text || '';
      this.comparisonExpressions.push({
        ctx: ctx as ExpressionContext,
        leftExpr,
        rightExpr,
        leftText,
        rightText,
        operator: '&&',
      });
    }
  }

  enterLogOrExpression(ctx: LogOrExpressionContext): void {
    const expressions = ctx.expression();
    if (expressions.length >= 2) {
      const leftExpr = expressions[0];
      const rightExpr = expressions[1];
      const leftText = leftExpr.text || '';
      const rightText = rightExpr.text || '';
      this.comparisonExpressions.push({
        ctx: ctx as ExpressionContext,
        leftExpr,
        rightExpr,
        leftText,
        rightText,
        operator: '||',
      });
    }
  }

  enterCoalExpression(ctx: CoalExpressionContext): void {
    const expressions = ctx.expression();
    if (expressions.length >= 2) {
      const leftExpr = expressions[0];
      const rightExpr = expressions[1];
      const leftText = leftExpr.text || '';
      const rightText = rightExpr.text || '';
      this.comparisonExpressions.push({
        ctx: ctx as ExpressionContext,
        leftExpr,
        rightExpr,
        leftText,
        rightText,
        operator: '??',
      });
    }
  }

  enterAssignExpression(ctx: AssignExpressionContext): void {
    const expressions = ctx.expression();
    if (expressions.length >= 2) {
      const leftExpr = expressions[0];
      const rightExpr = expressions[1];
      const leftText = leftExpr.text || '';
      const rightText = rightExpr.text || '';
      // Extract operator from tokens
      let operator = '=';
      if (ctx.ADD_ASSIGN()) operator = '+=';
      else if (ctx.SUB_ASSIGN()) operator = '-=';
      else if (ctx.MUL_ASSIGN()) operator = '*=';
      else if (ctx.DIV_ASSIGN()) operator = '/=';
      else if (ctx.AND_ASSIGN()) operator = '&=';
      else if (ctx.OR_ASSIGN()) operator = '|=';
      else if (ctx.XOR_ASSIGN()) operator = '^=';
      else if (ctx.RSHIFT_ASSIGN()) operator = '>>=';
      else if (ctx.URSHIFT_ASSIGN()) operator = '>>>=';
      else if (ctx.LSHIFT_ASSIGN()) operator = '<<=';
      this.comparisonExpressions.push({
        ctx: ctx as ExpressionContext,
        leftExpr,
        rightExpr,
        leftText,
        rightText,
        operator,
      });
    }
  }

  enterPreOpExpression(ctx: PreOpExpressionContext): void {
    // PreOpExpression: (INC | DEC) expression
    const operandExpr = ctx.expression();
    if (operandExpr) {
      const operator = ctx.INC() ? '++' : ctx.DEC() ? '--' : '';
      if (operator) {
        const location = getLocationFromContext(ctx);
        this.unaryExpressions.push({
          ctx: ctx as ExpressionContext,
          operandExpr,
          operator,
          operatorType: 'prefix',
          location,
        });
      }
    }
  }

  enterPostOpExpression(ctx: PostOpExpressionContext): void {
    // PostOpExpression: expression (INC | DEC)
    const operandExpr = ctx.expression();
    if (operandExpr) {
      const operator = ctx.INC() ? '++' : ctx.DEC() ? '--' : '';
      if (operator) {
        const location = getLocationFromContext(ctx);
        this.unaryExpressions.push({
          ctx: ctx as ExpressionContext,
          operandExpr,
          operator,
          operatorType: 'postfix',
          location,
        });
      }
    }
  }

  enterNegExpression(ctx: NegExpressionContext): void {
    // NegExpression: BANG expression (for ! operator) or TILDE expression (for ~ operator)
    // Note: Unary - is handled by PreOpExpressionContext, not NegExpressionContext
    const operandExpr = ctx.expression();
    if (operandExpr) {
      if (ctx.BANG()) {
        const location = getLocationFromContext(ctx);
        this.unaryExpressions.push({
          ctx: ctx as ExpressionContext,
          operandExpr,
          operator: '!',
          operatorType: 'negation',
          location,
        });
      } else if (ctx.TILDE()) {
        const location = getLocationFromContext(ctx);
        this.unaryExpressions.push({
          ctx: ctx as ExpressionContext,
          operandExpr,
          operator: '~',
          operatorType: 'negation', // Bitwise negate uses negation type
          location,
        });
      }
    }
  }

  enterDotExpression(ctx: DotExpressionContext): void {
    // Dot expressions - handled in recursive resolver
  }

  enterArrayExpression(ctx: ArrayExpressionContext): void {
    // Array expressions - handled in recursive resolver
  }

  enterMethodCallExpression(ctx: MethodCallExpressionContext): void {
    // Method call expressions - handled in recursive resolver
  }

  enterNewExpression(ctx: NewExpressionContext): void {
    // New expressions - handled in recursive resolver
  }

  enterCastExpression(ctx: CastExpressionContext): void {
    // CastExpression: LPAREN typeRef RPAREN expression
    const sourceExpr = ctx.expression();
    const typeRef = ctx.typeRef();
    if (sourceExpr && typeRef) {
      const targetType = typeRef.text || '';
      const location = getLocationFromContext(ctx);
      this.castExpressions.push({
        ctx,
        sourceExpr,
        targetType,
        location,
      });
    }
  }

  enterInstanceOfExpression(ctx: InstanceOfExpressionContext): void {
    const expr = ctx.expression();
    if (expr) {
      const exprText = expr.text || '';
      // InstanceOf always returns Boolean
      this.comparisonExpressions.push({
        ctx: ctx as ExpressionContext,
        leftExpr: expr,
        rightExpr: expr, // Dummy - not used for instanceof
        leftText: exprText,
        rightText: '',
        operator: 'instanceof',
      });
    }
  }

  enterForControl(ctx: ForControlContext): void {
    // ForControl: forInit? SEMI expression? SEMI forUpdate?
    // The expression? is the condition - should be boolean
    const conditionExpr = ctx.expression();
    if (conditionExpr) {
      const location = getLocationFromContext(conditionExpr);
      this.forControlExpressions.push({
        ctx: conditionExpr,
        location,
      });
    }
  }

  enterEnhancedForControl(ctx: EnhancedForControlContext): void {
    // EnhancedForControl: typeRef id COLON expression
    // The expression is the iterable - should be List, Set, Array, or Iterable
    const iterableExpr = ctx.expression();
    const typeRef = ctx.typeRef();
    if (iterableExpr) {
      const location = getLocationFromContext(ctx);
      const variableType = typeRef ? typeRef.text || null : null;
      this.enhancedForControlExpressions.push({
        ctx: iterableExpr,
        location,
      });
      // Also store for loop variable type validation
      this.enhancedForControls.push({
        ctx,
        variableType,
        collectionExpr: iterableExpr,
        location,
      });
    }
  }

  enterIfStatement(ctx: IfStatementContext): void {
    // IfStatement: IF parExpression statement (ELSE statement)?
    // Extract condition from parExpression
    const parExpr = ctx.parExpression();
    if (parExpr) {
      const condition = parExpr.expression();
      if (condition) {
        const location = getLocationFromContext(condition);
        this.booleanConditionExpressions.push({
          ctx: condition,
          location,
          statementType: 'if',
        });
      }
    }
  }

  enterWhileStatement(ctx: WhileStatementContext): void {
    // WhileStatement: WHILE parExpression (statement | SEMI)
    // Extract condition from parExpression
    const parExpr = ctx.parExpression();
    if (parExpr) {
      const condition = parExpr.expression();
      if (condition) {
        const location = getLocationFromContext(condition);
        this.booleanConditionExpressions.push({
          ctx: condition,
          location,
          statementType: 'while',
        });
      }
    }
  }

  enterDoWhileStatement(ctx: DoWhileStatementContext): void {
    // DoWhileStatement: DO block WHILE parExpression SEMI
    // Extract condition from parExpression
    const parExpr = ctx.parExpression();
    if (parExpr) {
      const condition = parExpr.expression();
      if (condition) {
        const location = getLocationFromContext(condition);
        this.booleanConditionExpressions.push({
          ctx: condition,
          location,
          statementType: 'do-while',
        });
      }
    }
  }

  getResult(): void {
    return undefined as void;
  }

  getComparisonExpressions(): Array<{
    ctx: ExpressionContext;
    leftExpr: ExpressionContext;
    rightExpr: ExpressionContext;
    leftText?: string;
    rightText?: string;
    operator?: string;
  }> {
    return this.comparisonExpressions;
  }

  getArithmeticExpressions(): Array<{
    ctx: ExpressionContext;
    leftExpr: ExpressionContext;
    rightExpr: ExpressionContext;
    leftText?: string;
    rightText?: string;
    operator?: string;
  }> {
    return this.arithmeticExpressions;
  }

  getBitwiseExpressions(): Array<{
    ctx: ExpressionContext;
    leftExpr: ExpressionContext;
    rightExpr: ExpressionContext;
    leftText?: string;
    rightText?: string;
    operator?: string;
  }> {
    return this.bitwiseExpressions;
  }

  getTernaryExpressions(): Array<{
    ctx: ExpressionContext;
    conditionExpr: ExpressionContext;
    trueExpr: ExpressionContext;
    falseExpr: ExpressionContext;
    conditionText?: string;
    trueExprText?: string;
    falseExprText?: string;
  }> {
    return this.ternaryExpressions;
  }

  getExpressionLiteralTypes(): Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  > {
    return this.expressionLiteralTypes;
  }

  getForControlExpressions(): Array<{
    ctx: ExpressionContext;
    location: SymbolLocation;
  }> {
    return this.forControlExpressions;
  }

  getEnhancedForControlExpressions(): Array<{
    ctx: ExpressionContext;
    location: SymbolLocation;
  }> {
    return this.enhancedForControlExpressions;
  }

  getBooleanConditionExpressions(): Array<{
    ctx: ExpressionContext;
    location: SymbolLocation;
    statementType: 'if' | 'while' | 'do-while';
  }> {
    return this.booleanConditionExpressions;
  }

  getUnaryExpressions(): Array<{
    ctx: ExpressionContext;
    operandExpr: ExpressionContext;
    operator: string;
    operatorType: 'prefix' | 'postfix' | 'negation';
    location: SymbolLocation;
  }> {
    return this.unaryExpressions;
  }

  getCastExpressions(): Array<{
    ctx: CastExpressionContext;
    sourceExpr: ExpressionContext;
    targetType: string;
    location: SymbolLocation;
  }> {
    return this.castExpressions;
  }

  getEnhancedForControls(): Array<{
    ctx: EnhancedForControlContext;
    variableType: string | null;
    collectionExpr: ExpressionContext;
    location: SymbolLocation;
  }> {
    return this.enhancedForControls;
  }
}

/**
 * Validates expressions (comparison, arithmetic, bitwise, ternary, for loops, etc.).
 *
 * Rules:
 * - Comparison types must be compatible
 * - Arithmetic expressions must use numeric arguments
 * - Bitwise operators must use Boolean or Integer/Long expressions
 * - Ternary expressions must have compatible true/false branch types
 * - For loop conditions must be boolean (or convertible to boolean)
 * - Enhanced for loop iterables must be List, Set, Array, or Iterable
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 * Note: Full type checking requires TIER 2 (cross-file type resolution).
 *
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Phase 5.2
 */
export const ExpressionValidator: Validator = {
  id: 'expression',
  name: 'Expression Validator',
  tier: ValidationTier.IMMEDIATE, // Supports both IMMEDIATE (TIER 1) and THOROUGH (TIER 2)
  priority: 6,
  prerequisites: {
    requiredDetailLevel: 'public-api',
    requiresReferences: false,
    requiresCrossFileResolution: false, // TIER 2 validation may require cross-file resolution
  },

  validate: (
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError, ISymbolManager> =>
    Effect.gen(function* () {
      const symbolManager = yield* ISymbolManager;
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      // Source content is required for this validator
      if (!options.sourceContent) {
        yield* Effect.logDebug(
          'ExpressionValidator: sourceContent not provided, skipping validation',
        );
        return {
          isValid: true,
          errors,
          warnings,
        };
      }

      const sourceContent = options.sourceContent;
      const fileUri = symbolTable.getFileUri() || 'unknown.cls';

      try {
        // Use cached parse tree if available, otherwise parse source content
        let parseTree:
          | CompilationUnitContext
          | TriggerUnitContext
          | BlockContext;
        if (options.parseTree) {
          // Use cached parse tree from DocumentStateCache
          parseTree = options.parseTree;
        } else {
          // Fallback to parsing source content
          const isTrigger = fileUri.endsWith('.trigger');
          const isAnonymous = fileUri.endsWith('.apex');
          const contentToParse = isAnonymous
            ? `{${sourceContent}}`
            : sourceContent;

          const inputStream = CharStreams.fromString(contentToParse);
          const lexer = new ApexLexer(
            new CaseInsensitiveInputStream(inputStream),
          );
          const tokenStream = new CommonTokenStream(lexer);
          const parser = new ApexParser(tokenStream);

          // Suppress error listeners to avoid console noise
          // Parse errors don't prevent tree building, but they clutter logs
          parser.removeErrorListeners();
          lexer.removeErrorListeners();

          if (isTrigger) {
            parseTree = parser.triggerUnit();
          } else if (isAnonymous) {
            parseTree = parser.block();
          } else {
            parseTree = parser.compilationUnit();
          }
        }

        // Walk the parse tree to collect expression information
        const listener = new ExpressionListener();
        const walker = new ParseTreeWalker();
        walker.walk(listener, parseTree);

        const comparisonExpressions = listener.getComparisonExpressions();
        const arithmeticExpressions = listener.getArithmeticExpressions();
        const bitwiseExpressions = listener.getBitwiseExpressions();
        const ternaryExpressions = listener.getTernaryExpressions();
        const literalTypes = listener.getExpressionLiteralTypes();
        const forControlExpressions = listener.getForControlExpressions();
        const enhancedForControlExpressions =
          listener.getEnhancedForControlExpressions();
        const booleanConditionExpressions =
          listener.getBooleanConditionExpressions();
        const unaryExpressions = listener.getUnaryExpressions();
        const castExpressions = listener.getCastExpressions();
        const enhancedForControls = listener.getEnhancedForControls();

        // Use WeakMap for expression type storage (in-memory only)
        const resolvedExpressionTypes = new WeakMap<
          ExpressionContext,
          ExpressionTypeInfo
        >();

        // Collect all expressions that need resolution
        const allExpressions: ExpressionContext[] = [];
        for (const expr of comparisonExpressions) {
          allExpressions.push(expr.ctx);
          if (expr.leftExpr) allExpressions.push(expr.leftExpr);
          if (expr.rightExpr) allExpressions.push(expr.rightExpr);
        }
        for (const expr of arithmeticExpressions) {
          allExpressions.push(expr.ctx);
          if (expr.leftExpr) allExpressions.push(expr.leftExpr);
          if (expr.rightExpr) allExpressions.push(expr.rightExpr);
        }
        for (const expr of bitwiseExpressions) {
          allExpressions.push(expr.ctx);
          if (expr.leftExpr) allExpressions.push(expr.leftExpr);
          if (expr.rightExpr) allExpressions.push(expr.rightExpr);
        }
        for (const expr of ternaryExpressions) {
          allExpressions.push(expr.ctx);
          if (expr.conditionExpr) allExpressions.push(expr.conditionExpr);
          if (expr.trueExpr) allExpressions.push(expr.trueExpr);
          if (expr.falseExpr) allExpressions.push(expr.falseExpr);
        }
        for (const expr of forControlExpressions) {
          allExpressions.push(expr.ctx);
        }
        for (const expr of enhancedForControlExpressions) {
          allExpressions.push(expr.ctx);
        }
        for (const expr of booleanConditionExpressions) {
          allExpressions.push(expr.ctx);
        }
        for (const expr of unaryExpressions) {
          allExpressions.push(expr.ctx);
          allExpressions.push(expr.operandExpr);
        }
        for (const expr of castExpressions) {
          allExpressions.push(expr.ctx as ExpressionContext);
          allExpressions.push(expr.sourceExpr);
        }
        for (const expr of enhancedForControls) {
          allExpressions.push(expr.collectionExpr);
        }

        // Resolve all expressions recursively (bottom-up)
        for (const expr of allExpressions) {
          yield* resolveExpressionTypeRecursive(
            expr,
            resolvedExpressionTypes,
            literalTypes,
            symbolTable,
            symbolManager,
            options.tier,
          );
        }

        yield* Effect.logDebug(
          `[ExpressionValidator] Found ${comparisonExpressions.length} comparison expressions, ` +
            `${arithmeticExpressions.length} arithmetic, ` +
            `${bitwiseExpressions.length} bitwise, ` +
            `${ternaryExpressions.length} ternary. Tier: ${options.tier}`,
        );

        // 1. Validate comparison expressions
        for (const expr of comparisonExpressions) {
          const { ctx, leftExpr, rightExpr, leftText, rightText } = expr;
          const location = getLocationFromContext(ctx);

          if (leftExpr && rightExpr) {
            // Get resolved types from WeakMap
            const leftTypeInfo = resolvedExpressionTypes.get(leftExpr);
            const rightTypeInfo = resolvedExpressionTypes.get(rightExpr);
            const leftType = leftTypeInfo?.resolvedType || null;
            const rightType = rightTypeInfo?.resolvedType || null;

            // Fallback to literal type detection if not resolved
            const leftLiteralType = getLiteralType(leftExpr, literalTypes);
            const rightLiteralType = getLiteralType(rightExpr, literalTypes);
            const effectiveLeftType = leftType || leftLiteralType || null;
            const effectiveRightType = rightType || rightLiteralType || null;

            // Flag incompatible comparisons
            const isIncompatible =
              effectiveLeftType &&
              effectiveRightType &&
              !areTypesCompatible(effectiveLeftType, effectiveRightType);

            if (isIncompatible) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_COMPARISON_TYPES,
                  leftText || '',
                  rightText || '',
                ),
                location,
                code: ErrorCodes.INVALID_COMPARISON_TYPES,
              });
            }
          }
        }

        // 2. Validate arithmetic expressions
        for (const expr of arithmeticExpressions) {
          const { ctx, leftExpr, rightExpr, operator } = expr;
          const location = getLocationFromContext(ctx);

          if (leftExpr && rightExpr) {
            // Get resolved types from WeakMap
            const leftTypeInfo = resolvedExpressionTypes.get(leftExpr);
            const rightTypeInfo = resolvedExpressionTypes.get(rightExpr);
            const leftType = leftTypeInfo?.resolvedType || null;
            const rightType = rightTypeInfo?.resolvedType || null;

            // Fallback to literal type detection if not resolved
            const leftLiteralType = getLiteralType(leftExpr, literalTypes);
            const rightLiteralType = getLiteralType(rightExpr, literalTypes);
            const effectiveLeftType = leftType || leftLiteralType || null;
            const effectiveRightType = rightType || rightLiteralType || null;

            // For + operator: allow string concatenation (String + anything or anything + String)
            if (operator === '+') {
              const leftIsString =
                effectiveLeftType === 'string' || leftLiteralType === 'string';
              const rightIsString =
                effectiveRightType === 'string' ||
                rightLiteralType === 'string';
              if (leftIsString || rightIsString) {
                // String concatenation is valid - skip validation
                continue;
              }
            }

            // Date/Time/DateTime operand validation (only + and - allowed; operand type rules)
            const leftLower = effectiveLeftType?.toLowerCase() ?? '';
            if (
              leftLower === 'date' ||
              leftLower === 'time' ||
              leftLower === 'datetime'
            ) {
              if (operator !== '+' && operator !== '-') {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INVALID_NUMERIC_ARGUMENTS_EXPRESSION,
                  ),
                  location,
                  code: ErrorCodes.INVALID_NUMERIC_ARGUMENTS_EXPRESSION,
                });
              } else {
                const rightLower = effectiveRightType?.toLowerCase() ?? '';
                const rightIsIntegerOrLong =
                  rightLower === 'integer' ||
                  rightLower === 'long' ||
                  rightLiteralType === 'integer' ||
                  rightLiteralType === 'long';
                const rightIsNumeric =
                  rightIsIntegerOrLong ||
                  isNumericType(effectiveRightType ?? '') ||
                  rightLiteralType === 'decimal';

                if (leftLower === 'time' || leftLower === 'date') {
                  if (!rightIsIntegerOrLong) {
                    errors.push({
                      message: localizeTyped(
                        leftLower === 'time'
                          ? ErrorCodes.INVALID_TIME_OPERAND_EXPRESSION
                          : ErrorCodes.INVALID_DATE_OPERAND_EXPRESSION,
                      ),
                      location,
                      code:
                        leftLower === 'time'
                          ? ErrorCodes.INVALID_TIME_OPERAND_EXPRESSION
                          : ErrorCodes.INVALID_DATE_OPERAND_EXPRESSION,
                    });
                  }
                } else {
                  // datetime
                  if (!rightIsNumeric) {
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.INVALID_DATETIME_OPERAND_EXPRESSION,
                      ),
                      location,
                      code: ErrorCodes.INVALID_DATETIME_OPERAND_EXPRESSION,
                    });
                  }
                }
              }
              continue;
            }

            // For -, *, /, % operators: both operands must be numeric
            const leftIsNumeric =
              effectiveLeftType &&
              (isNumericType(effectiveLeftType) ||
                leftLiteralType === 'integer' ||
                leftLiteralType === 'long' ||
                leftLiteralType === 'decimal');
            const rightIsNumeric =
              effectiveRightType &&
              (isNumericType(effectiveRightType) ||
                rightLiteralType === 'integer' ||
                rightLiteralType === 'long' ||
                rightLiteralType === 'decimal');

            if (!leftIsNumeric || !rightIsNumeric) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_NUMERIC_ARGUMENTS_EXPRESSION,
                ),
                location,
                code: ErrorCodes.INVALID_NUMERIC_ARGUMENTS_EXPRESSION,
              });
            }
          }
        }

        // 3. Validate bitwise expressions
        for (const expr of bitwiseExpressions) {
          const { ctx, leftExpr, rightExpr, operator } = expr;
          const location = getLocationFromContext(ctx);

          if (leftExpr && rightExpr) {
            // Get resolved types from WeakMap
            const leftTypeInfo = resolvedExpressionTypes.get(leftExpr);
            const rightTypeInfo = resolvedExpressionTypes.get(rightExpr);
            const leftType = leftTypeInfo?.resolvedType || null;
            const rightType = rightTypeInfo?.resolvedType || null;

            // Fallback to literal type detection if not resolved
            const leftLiteralType = getLiteralType(leftExpr, literalTypes);
            const rightLiteralType = getLiteralType(rightExpr, literalTypes);
            const effectiveLeftType = leftType || leftLiteralType || null;
            const effectiveRightType = rightType || rightLiteralType || null;

            // Bitwise operators require Boolean or Integer/Long
            const isValidBitwiseType = (type: string | null): boolean => {
              if (!type) return false;
              const t = type.toLowerCase();
              return (
                t === 'boolean' ||
                t === 'integer' ||
                t === 'long' ||
                t === 'true' ||
                t === 'false'
              );
            };

            const leftIsValid = isValidBitwiseType(effectiveLeftType);
            const rightIsValid = isValidBitwiseType(effectiveRightType);

            if (!leftIsValid || !rightIsValid) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_BITWISE_OPERATOR_ARGUMENTS,
                  operator || 'bitwise',
                ),
                location,
                code: ErrorCodes.INVALID_BITWISE_OPERATOR_ARGUMENTS,
              });
            }
          }
        }

        // 4. Validate ternary expressions
        for (const expr of ternaryExpressions) {
          const { ctx, trueExpr, falseExpr, trueExprText, falseExprText } =
            expr;
          const location = getLocationFromContext(ctx);

          if (trueExpr && falseExpr) {
            // Get resolved types from WeakMap
            const trueTypeInfo = resolvedExpressionTypes.get(trueExpr);
            const falseTypeInfo = resolvedExpressionTypes.get(falseExpr);
            const trueType = trueTypeInfo?.resolvedType || null;
            const falseType = falseTypeInfo?.resolvedType || null;

            // Fallback to literal type detection if not resolved
            const trueLiteralType = getLiteralType(trueExpr, literalTypes);
            const falseLiteralType = getLiteralType(falseExpr, literalTypes);
            const effectiveTrueType = trueType || trueLiteralType || null;
            const effectiveFalseType = falseType || falseLiteralType || null;

            // Flag incompatible ternary types
            const isIncompatible =
              effectiveTrueType &&
              effectiveFalseType &&
              !areTypesCompatible(effectiveTrueType, effectiveFalseType);

            if (isIncompatible) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INCOMPATIBLE_TERNARY_EXPRESSION_TYPES,
                  trueExprText || '',
                  falseExprText || '',
                ),
                location,
                code: ErrorCodes.INCOMPATIBLE_TERNARY_EXPRESSION_TYPES,
              });
            }
          }
        }

        // 5. Validate for loop condition expressions
        for (const expr of forControlExpressions) {
          const { ctx, location } = expr;
          const typeInfo = resolvedExpressionTypes.get(ctx);
          const resolvedType = typeInfo?.resolvedType || null;

          // Fallback to literal type detection if not resolved
          const literalType = getLiteralType(ctx, literalTypes);
          const effectiveType = resolvedType || literalType || null;

          // For loop condition must be boolean in Apex
          // Note: Numeric types are NOT valid in boolean conditions (unlike C/C++)
          if (effectiveType && effectiveType.toLowerCase() !== 'boolean') {
            // Allow null (null is falsy and can be used in conditions)
            const isNull = effectiveType.toLowerCase() === 'null';

            // Flag all non-boolean, non-null types as invalid
            if (!isNull) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_CONDITION_TYPE,
                  effectiveType,
                ),
                location,
                code: ErrorCodes.INVALID_CONDITION_TYPE,
              });
            }
          }
        }

        // 6. Validate enhanced for loop iterable expressions
        for (const expr of enhancedForControlExpressions) {
          const { ctx, location } = expr;
          const typeInfo = resolvedExpressionTypes.get(ctx);
          const resolvedType = typeInfo?.resolvedType || null;

          // Fallback to literal type detection if not resolved
          const literalType = getLiteralType(ctx, literalTypes);
          const effectiveType = resolvedType || literalType || null;

          // Enhanced for loop iterable must be List, Set, Array, or Iterable
          // SOQL [SELECT ...] and Database.getQueryLocator are also valid
          const exprText = (ctx.text || '').trim();
          const isSoqlOrQueryLocator =
            (exprText.includes('[') && /SELECT[\s\S]*FROM/i.test(exprText)) ||
            exprText.includes('getQueryLocator');

          if (effectiveType || isSoqlOrQueryLocator) {
            if (!effectiveType && isSoqlOrQueryLocator) {
              // SOQL/QueryLocator - allow, no LOOP_MUST_ITERATE_OVER_COLLECTION
            } else if (effectiveType) {
              const typeLower = effectiveType.toLowerCase();
              const isIterable =
                typeLower === 'list' ||
                typeLower.includes('list<') ||
                typeLower === 'set' ||
                typeLower.includes('set<') ||
                typeLower.includes('array') ||
                typeLower === 'iterable' ||
                typeLower.startsWith('iterable<');

              if (!isIterable) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.LOOP_MUST_ITERATE_OVER_COLLECTION,
                    effectiveType,
                  ),
                  location,
                  code: ErrorCodes.LOOP_MUST_ITERATE_OVER_COLLECTION,
                });
              }
            }
          }
        }

        // 7. Validate boolean condition expressions (if/while/do-while)
        for (const expr of booleanConditionExpressions) {
          const { ctx, location } = expr;
          const typeInfo = resolvedExpressionTypes.get(ctx);
          const resolvedType = typeInfo?.resolvedType || null;

          // Fallback to literal type detection if not resolved
          const literalType = getLiteralType(ctx, literalTypes);
          const effectiveType = resolvedType || literalType || null;

          // Condition expressions must be boolean in Apex
          // Note: Numeric types are NOT valid in boolean conditions (unlike C/C++)
          if (effectiveType && effectiveType.toLowerCase() !== 'boolean') {
            // Allow null (null is falsy and can be used in conditions)
            const isNull = effectiveType.toLowerCase() === 'null';

            // Flag all non-boolean, non-null types as invalid
            if (!isNull) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_CONDITION_TYPE,
                  effectiveType,
                ),
                location,
                code: ErrorCodes.INVALID_CONDITION_TYPE,
              });
            }
          }
        }

        // 8. Validate unary expressions
        for (const expr of unaryExpressions) {
          const { operandExpr, operator, operatorType, location } = expr;
          const typeInfo = resolvedExpressionTypes.get(operandExpr);
          const resolvedType = typeInfo?.resolvedType || null;
          const literalType = getLiteralType(operandExpr, literalTypes);
          const effectiveType = resolvedType || literalType || null;

          if (effectiveType) {
            const typeLower = effectiveType.toLowerCase();

            if (operator === '!') {
              // Boolean prefix operator
              if (typeLower !== 'boolean') {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INVALID_BOOLEAN_PREFIX_OPERAND,
                  ),
                  location,
                  code: ErrorCodes.INVALID_BOOLEAN_PREFIX_OPERAND,
                });
              }
            } else if (operator === '~') {
              // Bitwise negate operator - only valid for Integer or Long
              if (typeLower !== 'integer' && typeLower !== 'long') {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INVALID_TYPE_BITWISE_NEGATE,
                    effectiveType,
                  ),
                  location,
                  code: ErrorCodes.INVALID_TYPE_BITWISE_NEGATE,
                });
              }
            } else if (operator === '-') {
              // Unary negation
              if (
                !isNumericType(effectiveType) &&
                literalType !== 'integer' &&
                literalType !== 'long' &&
                literalType !== 'decimal'
              ) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INVALID_NEGATE_PREFIX_OPERAND,
                  ),
                  location,
                  code: ErrorCodes.INVALID_NEGATE_PREFIX_OPERAND,
                });
              }
            } else if (operator === '++' || operator === '--') {
              // Prefix/postfix increment/decrement
              if (operatorType === 'postfix') {
                if (
                  !isNumericType(effectiveType) &&
                  literalType !== 'integer' &&
                  literalType !== 'long' &&
                  literalType !== 'decimal'
                ) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.INVALID_NUMERIC_POSTFIX_OPERAND,
                    ),
                    location,
                    code: ErrorCodes.INVALID_NUMERIC_POSTFIX_OPERAND,
                  });
                }
              } else if (operatorType === 'prefix') {
                if (operator === '--') {
                  if (
                    !isNumericType(effectiveType) &&
                    literalType !== 'integer' &&
                    literalType !== 'long' &&
                    literalType !== 'decimal'
                  ) {
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.INVALID_NUMERIC_PREFIX_DECREMENT,
                      ),
                      location,
                      code: ErrorCodes.INVALID_NUMERIC_PREFIX_DECREMENT,
                    });
                  }
                } else if (operator === '++') {
                  if (
                    !isNumericType(effectiveType) &&
                    literalType !== 'integer' &&
                    literalType !== 'long' &&
                    literalType !== 'decimal'
                  ) {
                    errors.push({
                      message: localizeTyped(
                        ErrorCodes.INVALID_NUMERIC_PREFIX_INCREMENT,
                      ),
                      location,
                      code: ErrorCodes.INVALID_NUMERIC_PREFIX_INCREMENT,
                    });
                  }
                }
              }
            }
          }
        }

        // 9. Validate shift operators (must be Integer or Long)
        for (const expr of bitwiseExpressions) {
          const { ctx, leftExpr, rightExpr, operator } = expr;
          const location = getLocationFromContext(ctx);
          if (operator === '<<' || operator === '>>' || operator === '>>>') {
            if (leftExpr && rightExpr) {
              const leftTypeInfo = resolvedExpressionTypes.get(leftExpr);
              const rightTypeInfo = resolvedExpressionTypes.get(rightExpr);
              const leftType = leftTypeInfo?.resolvedType || null;
              const rightType = rightTypeInfo?.resolvedType || null;
              const leftLiteralType = getLiteralType(leftExpr, literalTypes);
              const rightLiteralType = getLiteralType(rightExpr, literalTypes);
              const effectiveLeftType = leftType || leftLiteralType || null;
              const effectiveRightType = rightType || rightLiteralType || null;

              if (effectiveLeftType) {
                const leftLower = effectiveLeftType.toLowerCase();
                if (leftLower !== 'integer' && leftLower !== 'long') {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.INVALID_SHIFT_OPERATOR_ARGUMENTS,
                    ),
                    location,
                    code: ErrorCodes.INVALID_SHIFT_OPERATOR_ARGUMENTS,
                  });
                }
              }
              if (effectiveRightType) {
                const rightLower = effectiveRightType.toLowerCase();
                if (rightLower !== 'integer' && rightLower !== 'long') {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.INVALID_SHIFT_OPERATOR_ARGUMENTS,
                    ),
                    location,
                    code: ErrorCodes.INVALID_SHIFT_OPERATOR_ARGUMENTS,
                  });
                }
              }
            }
          }
        }

        // 10. Validate logical operators (&&, ||) - operands must be boolean
        for (const expr of comparisonExpressions) {
          const { ctx, leftExpr, rightExpr, operator } = expr;
          const location = getLocationFromContext(ctx);
          if (operator === '&&' || operator === '||') {
            if (leftExpr && rightExpr) {
              const leftTypeInfo = resolvedExpressionTypes.get(leftExpr);
              const rightTypeInfo = resolvedExpressionTypes.get(rightExpr);
              const leftType = leftTypeInfo?.resolvedType || null;
              const rightType = rightTypeInfo?.resolvedType || null;
              const leftLiteralType = getLiteralType(leftExpr, literalTypes);
              const rightLiteralType = getLiteralType(rightExpr, literalTypes);
              const effectiveLeftType = leftType || leftLiteralType || null;
              const effectiveRightType = rightType || rightLiteralType || null;

              if (
                effectiveLeftType &&
                effectiveLeftType.toLowerCase() !== 'boolean'
              ) {
                errors.push({
                  message: localizeTyped(ErrorCodes.INVALID_LOGICAL_TYPE),
                  location,
                  code: ErrorCodes.INVALID_LOGICAL_TYPE,
                });
              }
              if (
                effectiveRightType &&
                effectiveRightType.toLowerCase() !== 'boolean'
              ) {
                errors.push({
                  message: localizeTyped(ErrorCodes.INVALID_LOGICAL_TYPE),
                  location,
                  code: ErrorCodes.INVALID_LOGICAL_TYPE,
                });
              }
            }
          }
        }

        // 11. Validate exact equality operators (===, !==) - only allowed for reference types
        for (const expr of comparisonExpressions) {
          const { ctx, leftExpr, rightExpr, operator } = expr;
          const location = getLocationFromContext(ctx);
          if (operator === '===' || operator === '!==') {
            if (leftExpr && rightExpr) {
              const leftTypeInfo = resolvedExpressionTypes.get(leftExpr);
              const rightTypeInfo = resolvedExpressionTypes.get(rightExpr);
              const leftType = leftTypeInfo?.resolvedType || null;
              const rightType = rightTypeInfo?.resolvedType || null;
              const leftLiteralType = getLiteralType(leftExpr, literalTypes);
              const rightLiteralType = getLiteralType(rightExpr, literalTypes);
              const effectiveLeftType = leftType || leftLiteralType || null;
              const effectiveRightType = rightType || rightLiteralType || null;

              // Exact equality only allowed for reference types (not primitives)
              const primitiveTypes = [
                'integer',
                'long',
                'double',
                'decimal',
                'boolean',
                'string',
              ];
              if (
                effectiveLeftType &&
                primitiveTypes.includes(effectiveLeftType.toLowerCase())
              ) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INVALID_EXACT_EQUALITY_TYPE,
                    effectiveLeftType,
                  ),
                  location,
                  code: ErrorCodes.INVALID_EXACT_EQUALITY_TYPE,
                });
              }
              if (
                effectiveRightType &&
                primitiveTypes.includes(effectiveRightType.toLowerCase())
              ) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INVALID_EXACT_EQUALITY_TYPE,
                    effectiveRightType,
                  ),
                  location,
                  code: ErrorCodes.INVALID_EXACT_EQUALITY_TYPE,
                });
              }
            }
          }
        }

        // 12. Validate inequality operators (<, >, <=, >=) - not allowed on certain types
        for (const expr of comparisonExpressions) {
          const { ctx, leftExpr, rightExpr, operator } = expr;
          const location = getLocationFromContext(ctx);
          if (
            operator === '<' ||
            operator === '>' ||
            operator === '<=' ||
            operator === '>='
          ) {
            if (leftExpr && rightExpr) {
              const leftTypeInfo = resolvedExpressionTypes.get(leftExpr);
              const rightTypeInfo = resolvedExpressionTypes.get(rightExpr);
              const leftType = leftTypeInfo?.resolvedType || null;
              const rightType = rightTypeInfo?.resolvedType || null;
              const leftLiteralType = getLiteralType(leftExpr, literalTypes);
              const rightLiteralType = getLiteralType(rightExpr, literalTypes);
              const effectiveLeftType = leftType || leftLiteralType || null;
              const effectiveRightType = rightType || rightLiteralType || null;

              // Inequality operators not allowed on Boolean
              if (
                effectiveLeftType &&
                effectiveLeftType.toLowerCase() === 'boolean'
              ) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INVALID_INEQUALITY_TYPE,
                    effectiveLeftType,
                  ),
                  location,
                  code: ErrorCodes.INVALID_INEQUALITY_TYPE,
                });
              }
              if (
                effectiveRightType &&
                effectiveRightType.toLowerCase() === 'boolean'
              ) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INVALID_INEQUALITY_TYPE,
                    effectiveRightType,
                  ),
                  location,
                  code: ErrorCodes.INVALID_INEQUALITY_TYPE,
                });
              }
            }
          }
        }

        // 13. Validate null coalescing operator (??) - types must be compatible
        for (const expr of comparisonExpressions) {
          const { ctx, leftExpr, rightExpr, operator } = expr;
          const location = getLocationFromContext(ctx);
          if (operator === '??') {
            if (leftExpr && rightExpr) {
              const leftTypeInfo = resolvedExpressionTypes.get(leftExpr);
              const rightTypeInfo = resolvedExpressionTypes.get(rightExpr);
              const leftType = leftTypeInfo?.resolvedType || null;
              const rightType = rightTypeInfo?.resolvedType || null;
              const leftLiteralType = getLiteralType(leftExpr, literalTypes);
              const rightLiteralType = getLiteralType(rightExpr, literalTypes);
              const effectiveLeftType = leftType || leftLiteralType || null;
              const effectiveRightType = rightType || rightLiteralType || null;

              // Null coalescing requires compatible types
              if (
                effectiveLeftType &&
                effectiveRightType &&
                effectiveLeftType.toLowerCase() !== 'null' &&
                effectiveRightType.toLowerCase() !== 'null'
              ) {
                if (
                  !areTypesCompatible(effectiveLeftType, effectiveRightType)
                ) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.INCOMPATIBLE_NULLCOALESCING_EXPRESSION_TYPES,
                      effectiveLeftType,
                      effectiveRightType,
                    ),
                    location,
                    code: ErrorCodes.INCOMPATIBLE_NULLCOALESCING_EXPRESSION_TYPES,
                  });
                }
              }
            }
          }
        }

        // 14. Validate cast expressions
        for (const expr of castExpressions) {
          const { sourceExpr, targetType, location } = expr;
          const typeInfo = resolvedExpressionTypes.get(sourceExpr);
          const resolvedType = typeInfo?.resolvedType || null;
          const literalType = getLiteralType(sourceExpr, literalTypes);
          const effectiveSourceType = resolvedType || literalType || null;

          if (effectiveSourceType) {
            const sourceTypeLower = effectiveSourceType.toLowerCase();
            const targetTypeLower = targetType.toLowerCase();

            // Check if cast is allowed (not on void)
            if (sourceTypeLower === 'void') {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.INVALID_CAST_TYPE,
                  sourceTypeLower,
                ),
                location,
                code: ErrorCodes.INVALID_CAST_TYPE,
              });
            } else {
              // Check type compatibility
              // Basic compatibility check - full validation requires TIER 2
              if (
                !areTypesCompatible(effectiveSourceType, targetTypeLower) &&
                sourceTypeLower !== 'null'
              ) {
                errors.push({
                  message: localizeTyped(
                    ErrorCodes.INCOMPATIBLE_CAST_TYPES,
                    effectiveSourceType,
                    targetTypeLower,
                  ),
                  location,
                  code: ErrorCodes.INCOMPATIBLE_CAST_TYPES,
                });
              }
            }
          }
        }

        // 15. Validate enhanced for loop variable type matches collection element type
        for (const expr of enhancedForControls) {
          const { variableType, collectionExpr, location } = expr;
          const collectionText = (collectionExpr.text || '').trim();

          // SOQL or Database.getQueryLocator: variable must be SObject-compatible
          const isSoql =
            collectionText.includes('[') &&
            /SELECT[\s\S]*FROM/i.test(collectionText);
          const isQueryLocator =
            collectionText.includes('getQueryLocator') ||
            /Database\.getQueryLocator\s*\(/i.test(collectionText);

          if (variableType && (isSoql || isQueryLocator)) {
            const variableTypeLower = variableType.toLowerCase().trim();
            const primitives = new Set([
              'integer',
              'long',
              'double',
              'decimal',
              'string',
              'boolean',
              'date',
              'datetime',
              'time',
              'id',
              'blob',
              'object',
            ]);

            const listMatch = variableTypeLower.match(
              /^(list|set)\s*<\s*([^>]+)\s*>$/,
            );
            const elementType = listMatch
              ? listMatch[2].trim()
              : variableTypeLower;

            const isSObjectCompatible =
              variableTypeLower === 'sobject' ||
              (listMatch &&
                (elementType === 'sobject' || !primitives.has(elementType))) ||
              (!primitives.has(variableTypeLower) &&
                (variableTypeLower.endsWith('__c') ||
                  variableTypeLower.endsWith('__kav') ||
                  variableTypeLower.endsWith('__ka') ||
                  variableTypeLower.endsWith('__x') ||
                  /^(account|contact|lead|opportunity|case|user|task|event)$/i.test(
                    variableTypeLower,
                  )));

            if (!isSObjectCompatible) {
              errors.push({
                message: localizeTyped(
                  ErrorCodes.LOOP_VARIABLE_MISMATCH_SOBJECT_TYPE,
                ),
                location,
                code: ErrorCodes.LOOP_VARIABLE_MISMATCH_SOBJECT_TYPE,
              });
            } else if (isSoql) {
              // Extract SObject type from FROM clause for concrete type check
              const fromMatch = collectionText.match(
                /FROM\s+([a-zA-Z_][a-zA-Z0-9_]*)/i,
              );
              const querySObjectType = fromMatch
                ? fromMatch[1].trim().toLowerCase()
                : null;

              if (querySObjectType) {
                const varBaseType = variableTypeLower
                  .replace(/^list\s*<\s*([^>]+)\s*>$/, '$1')
                  .trim();
                const matches =
                  varBaseType === 'sobject' || varBaseType === querySObjectType;

                if (!matches) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.LOOP_VARIABLE_MISMATCH_CONCRETE_SOBJECT_TYPE,
                      querySObjectType,
                    ),
                    location,
                    code: ErrorCodes.LOOP_VARIABLE_MISMATCH_CONCRETE_SOBJECT_TYPE,
                  });
                }
              }
            }
          } else if (variableType) {
            const collectionTypeInfo =
              resolvedExpressionTypes.get(collectionExpr);
            const resolvedCollectionType =
              collectionTypeInfo?.resolvedType || null;
            const literalCollectionType = getLiteralType(
              collectionExpr,
              literalTypes,
            );
            const effectiveCollectionType =
              resolvedCollectionType || literalCollectionType || null;

            if (effectiveCollectionType) {
              const collectionTypeLower = effectiveCollectionType.toLowerCase();
              const variableTypeLower = variableType.toLowerCase();

              // Extract element type from collection type (e.g., "List<String>" -> "String")
              let elementType: string | null = null;
              if (collectionTypeLower.includes('list<')) {
                const match = collectionTypeLower.match(/list<([^>]+)>/);
                if (match) {
                  elementType = match[1].trim();
                }
              } else if (collectionTypeLower.includes('set<')) {
                const match = collectionTypeLower.match(/set<([^>]+)>/);
                if (match) {
                  elementType = match[1].trim();
                }
              } else if (collectionTypeLower.includes('iterable<')) {
                const match = collectionTypeLower.match(/iterable<([^>]+)>/);
                if (match) {
                  elementType = match[1].trim();
                }
              }

              // If we extracted an element type, validate it matches the variable type
              if (elementType && elementType !== variableTypeLower) {
                // Allow some flexibility for numeric types
                if (!areTypesCompatible(elementType, variableTypeLower)) {
                  errors.push({
                    message: localizeTyped(
                      ErrorCodes.INVALID_LOOP_TYPE,
                      variableTypeLower,
                      elementType,
                    ),
                    location,
                    code: ErrorCodes.INVALID_LOOP_TYPE,
                  });
                }
              }
            }
          }
        }

        yield* Effect.logDebug(
          `ExpressionValidator: checked ${comparisonExpressions.length} comparisons, ` +
            `${arithmeticExpressions.length} arithmetic, ` +
            `${bitwiseExpressions.length} bitwise, ` +
            `${ternaryExpressions.length} ternary expressions, ` +
            `${forControlExpressions.length} for loop conditions, ` +
            `${enhancedForControlExpressions.length} enhanced for loop iterables, ` +
            `${booleanConditionExpressions.length} boolean conditions, ` +
            `${unaryExpressions.length} unary expressions, ` +
            `${castExpressions.length} cast expressions, ` +
            `${enhancedForControls.length} enhanced for controls, ` +
            `found ${errors.length} violations`,
        );

        // Convert WeakMap to serializable format for enrichment
        // Map SymbolLocation JSON string → ExpressionTypeInfo
        const serializableResolvedTypes = new Map<string, ExpressionTypeInfo>();
        // We need to track expressions as we process them
        // For now, we'll convert from the allExpressions array we collected
        for (const expr of allExpressions) {
          const typeInfo = resolvedExpressionTypes.get(expr);
          if (typeInfo) {
            const location = getLocationFromContext(expr);
            const locationKey = JSON.stringify(location);
            serializableResolvedTypes.set(locationKey, typeInfo);
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
          enrichmentData: {
            expressionLiteralTypes: literalTypes,
            resolvedExpressionTypes:
              serializableResolvedTypes.size > 0
                ? serializableResolvedTypes
                : undefined,
          },
        };
      } catch (error) {
        yield* Effect.logWarning(
          `ExpressionValidator: Error during validation: ${error}`,
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
        };
      }
    }),
};

/**
 * Resolve expression type (TIER 1)
 * Attempts to resolve the type of an expression by checking same-file symbols only
 * Does not perform cross-file resolution - leaves that for TIER 2
 */
function resolveExpressionTypeTier1(
  exprText: string,
  symbolTable: SymbolTable,
): string | null {
  const trimmed = exprText.trim();

  // Skip if it's a literal (already handled by literal type detection)
  if (
    trimmed.startsWith('"') ||
    trimmed.startsWith("'") ||
    trimmed === 'true' ||
    trimmed === 'false' ||
    /^-?\d+\.?\d*$/.test(trimmed) ||
    trimmed === 'null'
  ) {
    return null;
  }

  // Try to resolve as a simple variable name (no method calls, no operators)
  if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
    // First try scope-based lookup (searches through scopes - same-file only)
    let variable = symbolTable.lookup(trimmed, null);

    // If not found, try case-insensitive lookup in all symbols (same-file only)
    if (!variable) {
      const allSymbols = symbolTable.getAllSymbols();
      variable = allSymbols.find(
        (s) =>
          s.name?.toLowerCase() === trimmed.toLowerCase() &&
          (s.kind === SymbolKind.Variable ||
            s.kind === SymbolKind.Parameter ||
            s.kind === SymbolKind.Field),
      );
    }

    if (
      variable &&
      (variable.kind === SymbolKind.Variable ||
        variable.kind === SymbolKind.Parameter ||
        variable.kind === SymbolKind.Field)
    ) {
      const varSymbol = variable as VariableSymbol;
      if (varSymbol.type?.name) {
        return varSymbol.type.name.toLowerCase();
      }
    }
  }

  // Return null if not found in same-file (leave for TIER 2 cross-file resolution)
  return null;
}

/**
 * Resolve expression type (TIER 2)
 * Attempts to resolve the type of an expression by checking if it's a variable
 * Includes cross-file resolution
 */
function resolveExpressionType(
  exprText: string,
  symbolTable: SymbolTable,
  symbolManager: ISymbolManagerInterface,
): Effect.Effect<string | null, never, never> {
  return Effect.gen(function* () {
    const trimmed = exprText.trim();

    // Skip if it's a literal (already handled by TIER 1)
    if (
      trimmed.startsWith('"') ||
      trimmed.startsWith("'") ||
      trimmed === 'true' ||
      trimmed === 'false' ||
      /^-?\d+\.?\d*$/.test(trimmed) ||
      trimmed === 'null'
    ) {
      return null;
    }

    // Try to resolve as a simple variable name (no method calls, no operators)
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      yield* Effect.logDebug(
        `[ExpressionValidator] resolveExpressionType: "${trimmed}" matches variable pattern`,
      );
      // First try scope-based lookup (searches through scopes)
      let variable = symbolTable.lookup(trimmed, null);
      yield* Effect.logDebug(
        `[ExpressionValidator] resolveExpressionType: scope lookup for "${trimmed}": ${
          variable ? `found (${variable.kind})` : 'not found'
        }`,
      );

      // If not found, try case-insensitive lookup in all symbols
      if (!variable) {
        const allSymbols = symbolTable.getAllSymbols();
        yield* Effect.logDebug(
          `[ExpressionValidator] resolveExpressionType: searching ${allSymbols.length} total symbols for "${trimmed}"`,
        );
        variable = allSymbols.find(
          (s) =>
            s.name?.toLowerCase() === trimmed.toLowerCase() &&
            (s.kind === SymbolKind.Variable ||
              s.kind === SymbolKind.Parameter ||
              s.kind === SymbolKind.Field),
        );
        yield* Effect.logDebug(
          `[ExpressionValidator] resolveExpressionType: all-symbols search for "${trimmed}": ${
            variable ? `found (${variable.kind})` : 'not found'
          }`,
        );
      }

      if (
        variable &&
        (variable.kind === SymbolKind.Variable ||
          variable.kind === SymbolKind.Parameter ||
          variable.kind === SymbolKind.Field)
      ) {
        const varSymbol = variable as VariableSymbol;
        if (varSymbol.type?.name) {
          const typeName = varSymbol.type.name.toLowerCase();
          yield* Effect.logDebug(
            `[ExpressionValidator] resolveExpressionType: resolved "${trimmed}" to type "${typeName}"`,
          );
          return typeName;
        } else {
          yield* Effect.logDebug(
            `[ExpressionValidator] resolveExpressionType: variable "${trimmed}" found but has no type`,
          );
        }
      }

      // Also check if there's a reference to this variable that has been resolved
      // Search all references (case-insensitive)
      const allReferences = symbolTable.getAllReferences();
      const variableRef = allReferences.find(
        (ref) =>
          ref.name?.toLowerCase() === trimmed.toLowerCase() &&
          ref.context === ReferenceContext.VARIABLE_USAGE &&
          ref.resolvedSymbolId,
      );

      if (variableRef?.resolvedSymbolId) {
        const resolvedSymbol = symbolManager.getSymbol(
          variableRef.resolvedSymbolId,
        );
        if (
          resolvedSymbol &&
          (resolvedSymbol.kind === SymbolKind.Variable ||
            resolvedSymbol.kind === SymbolKind.Parameter ||
            resolvedSymbol.kind === SymbolKind.Field)
        ) {
          const varSymbol = resolvedSymbol as VariableSymbol;
          if (varSymbol.type?.name) {
            return varSymbol.type.name.toLowerCase();
          }
        }
      }

      // Final fallback: use symbolManager.findSymbolByName (searches across all files)
      // Prefer same-file matches, but allow cross-file resolution
      const symbolsByName = symbolManager.findSymbolByName(trimmed);
      const currentFileUri = symbolTable.getFileUri();
      // First try same-file match
      let foundVariable = symbolsByName.find(
        (s) =>
          (s.kind === SymbolKind.Variable ||
            s.kind === SymbolKind.Parameter ||
            s.kind === SymbolKind.Field) &&
          s.fileUri === currentFileUri,
      );
      // If not found in same file, try cross-file
      if (!foundVariable) {
        foundVariable = symbolsByName.find(
          (s) =>
            s.kind === SymbolKind.Variable ||
            s.kind === SymbolKind.Parameter ||
            s.kind === SymbolKind.Field,
        );
      }
      if (foundVariable) {
        const varSymbol = foundVariable as VariableSymbol;
        if (varSymbol.type?.name) {
          return varSymbol.type.name.toLowerCase();
        }
      }
    }

    return null;
  });
}

/**
 * Check if two types are compatible for comparison
 */
export function areTypesCompatible(type1: string, type2: string): boolean {
  const t1 = type1.toLowerCase();
  const t2 = type2.toLowerCase();

  // Same type
  if (t1 === t2) {
    return true;
  }

  // Numeric types are compatible with each other
  const numericTypes = ['integer', 'long', 'double', 'decimal'];
  if (numericTypes.includes(t1) && numericTypes.includes(t2)) {
    return true;
  }

  // null is compatible with any object type
  if (t1 === 'null' || t2 === 'null') {
    return true;
  }

  // String types are compatible
  if (t1 === 'string' && t2 === 'string') {
    return true;
  }

  // Boolean types are compatible
  if (t1 === 'boolean' && t2 === 'boolean') {
    return true;
  }

  return false;
}

/**
 * Check if a type is numeric
 */
export function isNumericType(type: string): boolean {
  const t = type.toLowerCase();
  return (
    t === 'integer' ||
    t === 'long' ||
    t === 'double' ||
    t === 'decimal' ||
    /^\d+\.?\d*$/.test(t)
  );
}

/**
 * Check if a type is String
 */
export function isStringType(type: string): boolean {
  const t = type.toLowerCase();
  return t === 'string';
}

/**
 * Compute the result type of a binary expression based on operator and operand types
 */
export function computeExpressionResultType(
  leftType: string,
  rightType: string,
  operator: string,
): string | null {
  const leftLower = leftType.toLowerCase();
  const rightLower = rightType.toLowerCase();

  // Arithmetic operators
  if (operator === '+' || operator === '+=') {
    // String concatenation: String + anything = String
    if (leftLower === 'string' || rightLower === 'string') {
      return 'string';
    }
    // Numeric addition
    if (isNumericType(leftType) && isNumericType(rightType)) {
      // Type promotion: decimal > double > long > integer
      if (
        leftLower === 'decimal' ||
        rightLower === 'decimal' ||
        leftLower === 'double' ||
        rightLower === 'double'
      ) {
        return leftLower === 'decimal' || rightLower === 'decimal'
          ? 'decimal'
          : 'double';
      }
      if (leftLower === 'long' || rightLower === 'long') {
        return 'long';
      }
      return 'integer';
    }
    return null;
  }

  if (
    operator === '-' ||
    operator === '*=' ||
    operator === '/=' ||
    operator === '-='
  ) {
    // Numeric operations
    if (isNumericType(leftType) && isNumericType(rightType)) {
      if (
        leftLower === 'decimal' ||
        rightLower === 'decimal' ||
        leftLower === 'double' ||
        rightLower === 'double'
      ) {
        return leftLower === 'decimal' || rightLower === 'decimal'
          ? 'decimal'
          : 'double';
      }
      if (leftLower === 'long' || rightLower === 'long') {
        return 'long';
      }
      return 'integer';
    }
    return null;
  }

  if (operator === '*' || operator === '/' || operator === '%') {
    // Numeric operations
    if (isNumericType(leftType) && isNumericType(rightType)) {
      if (
        leftLower === 'decimal' ||
        rightLower === 'decimal' ||
        leftLower === 'double' ||
        rightLower === 'double'
      ) {
        return leftLower === 'decimal' || rightLower === 'decimal'
          ? 'decimal'
          : 'double';
      }
      if (leftLower === 'long' || rightLower === 'long') {
        return 'long';
      }
      return 'integer';
    }
    return null;
  }

  // Comparison operators always return Boolean
  if (
    operator === '==' ||
    operator === '!=' ||
    operator === '===' ||
    operator === '!==' ||
    operator === '<>' ||
    operator === '<' ||
    operator === '>' ||
    operator === '<=' ||
    operator === '>='
  ) {
    return 'boolean';
  }

  // Logical operators
  if (operator === '&&' || operator === '||') {
    if (leftLower === 'boolean' && rightLower === 'boolean') {
      return 'boolean';
    }
    return null;
  }

  // Coalescing operator (??)
  if (operator === '??') {
    // Returns non-null type
    if (leftLower !== 'null') {
      return leftType;
    }
    return rightType;
  }

  // Bitwise operators
  if (
    operator === '&' ||
    operator === '|' ||
    operator === '^' ||
    operator === '<<' ||
    operator === '>>' ||
    operator === '>>>'
  ) {
    // Boolean & Boolean = Boolean
    if (leftLower === 'boolean' && rightLower === 'boolean') {
      return 'boolean';
    }
    // Integer/Long bitwise operations
    if (
      (leftLower === 'integer' || leftLower === 'long') &&
      (rightLower === 'integer' || rightLower === 'long')
    ) {
      if (leftLower === 'long' || rightLower === 'long') {
        return 'long';
      }
      return 'integer';
    }
    return null;
  }

  // Assignment operators return assigned type
  if (
    operator === '=' ||
    operator === '+=' ||
    operator === '-=' ||
    operator === '*=' ||
    operator === '/=' ||
    operator === '&=' ||
    operator === '|=' ||
    operator === '^=' ||
    operator === '>>=' ||
    operator === '>>>=' ||
    operator === '<<='
  ) {
    return leftType;
  }

  // InstanceOf returns Boolean
  if (operator === 'instanceof') {
    return 'boolean';
  }

  return null;
}

/**
 * Recursively resolve expression type using WeakMap for efficient storage
 */
export function resolveExpressionTypeRecursive(
  expr: ExpressionContext,
  resolvedTypes: WeakMap<ExpressionContext, ExpressionTypeInfo>,
  literalTypes: Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  >,
  symbolTable: SymbolTable,
  symbolManager?: ISymbolManagerInterface,
  tier?: ValidationTier,
): Effect.Effect<ExpressionTypeInfo | null, never, never> {
  return Effect.gen(function* () {
    // Check if already resolved
    if (resolvedTypes.has(expr)) {
      return resolvedTypes.get(expr) || null;
    }

    // Handle subExpression: unwrap parentheses
    if (isSubExpression(expr)) {
      const subExpr = expr as SubExpressionContext;
      const innerExpr = subExpr.expression();
      if (innerExpr) {
        const innerType = yield* resolveExpressionTypeRecursive(
          innerExpr,
          resolvedTypes,
          literalTypes,
          symbolTable,
          symbolManager,
          tier,
        );
        if (innerType) {
          // Parentheses don't change type
          resolvedTypes.set(expr, innerType);
          return innerType;
        }
      }
    }

    // Handle literal types (from literalTypes map)
    if (literalTypes.has(expr)) {
      const literalType = literalTypes.get(expr)!;
      const info: ExpressionTypeInfo = {
        resolvedType: literalType,
        source: 'literal',
      };
      resolvedTypes.set(expr, info);
      return info;
    }

    // Handle binary expressions
    if (isBinaryExpression(expr)) {
      let leftExpr: ExpressionContext | null = null;
      let rightExpr: ExpressionContext | null = null;
      let operator = '';

      if (expr instanceof EqualityExpressionContext) {
        const expressions = expr.expression();
        if (expressions.length >= 2) {
          leftExpr = expressions[0];
          rightExpr = expressions[1];
          operator =
            expr.TRIPLEEQUAL()?.text ||
            expr.TRIPLENOTEQUAL()?.text ||
            expr.EQUAL()?.text ||
            expr.NOTEQUAL()?.text ||
            expr.LESSANDGREATER()?.text ||
            '==';
        }
      } else if (expr instanceof CmpExpressionContext) {
        const expressions = expr.expression();
        if (expressions.length >= 2) {
          leftExpr = expressions[0];
          rightExpr = expressions[1];
          operator = expr.GT()
            ? expr.ASSIGN()
              ? '>='
              : '>'
            : expr.LT()
              ? expr.ASSIGN()
                ? '<='
                : '<'
              : '<';
        }
      } else if (expr instanceof Arth1ExpressionContext) {
        const expressions = expr.expression();
        if (expressions.length >= 2) {
          leftExpr = expressions[0];
          rightExpr = expressions[1];
          operator = expr.MUL() ? '*' : expr.DIV() ? '/' : '*';
        }
      } else if (expr instanceof Arth2ExpressionContext) {
        const expressions = expr.expression();
        if (expressions.length >= 2) {
          leftExpr = expressions[0];
          rightExpr = expressions[1];
          operator = expr.ADD() ? '+' : expr.SUB() ? '-' : '+';
        }
      } else if (expr instanceof BitAndExpressionContext) {
        const expressions = expr.expression();
        if (expressions.length >= 2) {
          leftExpr = expressions[0];
          rightExpr = expressions[1];
          operator = '&';
        }
      } else if (expr instanceof BitOrExpressionContext) {
        const expressions = expr.expression();
        if (expressions.length >= 2) {
          leftExpr = expressions[0];
          rightExpr = expressions[1];
          operator = '|';
        }
      } else if (expr instanceof BitNotExpressionContext) {
        const expressions = expr.expression();
        if (expressions.length >= 2) {
          leftExpr = expressions[0];
          rightExpr = expressions[1];
          operator = '^';
        }
      } else if (expr instanceof BitExpressionContext) {
        const expressions = expr.expression();
        if (expressions.length >= 2) {
          leftExpr = expressions[0];
          rightExpr = expressions[1];
          const ltTokens = expr.LT();
          const gtTokens = expr.GT();
          if (ltTokens && ltTokens.length >= 2) {
            operator = '<<';
          } else if (gtTokens && gtTokens.length >= 3) {
            operator = '>>>';
          } else if (gtTokens && gtTokens.length >= 2) {
            operator = '>>';
          } else {
            operator = '<<';
          }
        }
      } else if (expr instanceof LogAndExpressionContext) {
        const expressions = expr.expression();
        if (expressions.length >= 2) {
          leftExpr = expressions[0];
          rightExpr = expressions[1];
          operator = '&&';
        }
      } else if (expr instanceof LogOrExpressionContext) {
        const expressions = expr.expression();
        if (expressions.length >= 2) {
          leftExpr = expressions[0];
          rightExpr = expressions[1];
          operator = '||';
        }
      } else if (expr instanceof CoalExpressionContext) {
        const expressions = expr.expression();
        if (expressions.length >= 2) {
          leftExpr = expressions[0];
          rightExpr = expressions[1];
          operator = '??';
        }
      }

      if (leftExpr && rightExpr) {
        const leftType = yield* resolveExpressionTypeRecursive(
          leftExpr,
          resolvedTypes,
          literalTypes,
          symbolTable,
          symbolManager,
          tier,
        );
        const rightType = yield* resolveExpressionTypeRecursive(
          rightExpr,
          resolvedTypes,
          literalTypes,
          symbolTable,
          symbolManager,
          tier,
        );

        if (leftType?.resolvedType && rightType?.resolvedType) {
          const resultType = computeExpressionResultType(
            leftType.resolvedType,
            rightType.resolvedType,
            operator,
          );
          if (resultType) {
            const info: ExpressionTypeInfo = {
              resolvedType: resultType,
              source: 'computed',
              operandTypes: [leftType.resolvedType, rightType.resolvedType],
              operator,
            };
            resolvedTypes.set(expr, info);
            return info;
          }
        }
      }
    }

    // Handle ternary expression
    if (expr instanceof CondExpressionContext) {
      const expressions = expr.expression();
      if (expressions.length >= 3) {
        const trueExpr = expressions[1];
        const falseExpr = expressions[2];

        const trueType = yield* resolveExpressionTypeRecursive(
          trueExpr,
          resolvedTypes,
          literalTypes,
          symbolTable,
          symbolManager,
          tier,
        );
        const falseType = yield* resolveExpressionTypeRecursive(
          falseExpr,
          resolvedTypes,
          literalTypes,
          symbolTable,
          symbolManager,
          tier,
        );

        if (trueType?.resolvedType && falseType?.resolvedType) {
          // Ternary returns common type or first type if compatible
          const resultType =
            trueType.resolvedType === falseType.resolvedType
              ? trueType.resolvedType
              : areTypesCompatible(
                    trueType.resolvedType,
                    falseType.resolvedType,
                  )
                ? trueType.resolvedType
                : null;
          if (resultType) {
            const info: ExpressionTypeInfo = {
              resolvedType: resultType,
              source: 'computed',
              operandTypes: [trueType.resolvedType, falseType.resolvedType],
              operator: '?:',
            };
            resolvedTypes.set(expr, info);
            return info;
          }
        }
      }
    }

    // Handle unary expressions
    if (isPreOpExpression(expr) || isPostOpExpression(expr)) {
      const preOp = expr as PreOpExpressionContext;
      const postOp = expr as PostOpExpressionContext;
      const innerExpr = preOp.expression?.() || postOp.expression?.() || null;
      if (innerExpr) {
        const innerType = yield* resolveExpressionTypeRecursive(
          innerExpr,
          resolvedTypes,
          literalTypes,
          symbolTable,
          symbolManager,
          tier,
        );
        if (innerType?.resolvedType && isNumericType(innerType.resolvedType)) {
          // Unary operators preserve numeric type
          const info: ExpressionTypeInfo = {
            resolvedType: innerType.resolvedType,
            source: 'computed',
            operandTypes: [innerType.resolvedType],
            operator: preOp.INC()
              ? '++'
              : preOp.DEC()
                ? '--'
                : postOp.INC()
                  ? '++'
                  : postOp.DEC()
                    ? '--'
                    : '',
          };
          resolvedTypes.set(expr, info);
          return info;
        }
      }
    }

    if (isNegExpression(expr)) {
      const negExpr = expr as NegExpressionContext;
      const innerExpr = negExpr.expression();
      if (innerExpr) {
        const innerType = yield* resolveExpressionTypeRecursive(
          innerExpr,
          resolvedTypes,
          literalTypes,
          symbolTable,
          symbolManager,
          tier,
        );
        if (innerType?.resolvedType) {
          // ! returns Boolean, ~ preserves numeric type
          const resultType = negExpr.BANG()
            ? 'boolean'
            : innerType.resolvedType;
          const info: ExpressionTypeInfo = {
            resolvedType: resultType,
            source: 'computed',
            operandTypes: [innerType.resolvedType],
            operator: negExpr.BANG() ? '!' : '~',
          };
          resolvedTypes.set(expr, info);
          return info;
        }
      }
    }

    // Handle cast expression
    if (isCastExpression(expr)) {
      const castExpr = expr as CastExpressionContext;
      const typeRef = castExpr.typeRef();
      if (typeRef) {
        const typeName = typeRef.text || '';
        const info: ExpressionTypeInfo = {
          resolvedType: typeName.toLowerCase(),
          source: 'computed',
          operator: 'cast',
        };
        resolvedTypes.set(expr, info);
        return info;
      }
    }

    // Handle instanceof expression
    if (isInstanceOfExpression(expr)) {
      const info: ExpressionTypeInfo = {
        resolvedType: 'boolean',
        source: 'computed',
        operator: 'instanceof',
      };
      resolvedTypes.set(expr, info);
      return info;
    }

    // Handle primary expressions (variables) - try text-based resolution
    const exprText = expr.text || '';
    const trimmed = exprText.trim();

    // Skip if it's a literal (already handled above)
    if (
      trimmed.startsWith('"') ||
      trimmed.startsWith("'") ||
      trimmed === 'true' ||
      trimmed === 'false' ||
      /^-?\d+\.?\d*$/.test(trimmed) ||
      trimmed === 'null'
    ) {
      return null;
    }

    // Try to resolve as a variable (TIER 1: same-file only)
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(trimmed)) {
      const resolvedType = resolveExpressionTypeTier1(trimmed, symbolTable);
      if (resolvedType) {
        const info: ExpressionTypeInfo = {
          resolvedType,
          source: 'variable',
        };
        resolvedTypes.set(expr, info);
        return info;
      }

      // TIER 2: Cross-file resolution
      if (tier === ValidationTier.THOROUGH && symbolManager) {
        const crossFileType = yield* resolveExpressionType(
          trimmed,
          symbolTable,
          symbolManager,
        );
        if (crossFileType) {
          const info: ExpressionTypeInfo = {
            resolvedType: crossFileType,
            source: 'variable',
          };
          resolvedTypes.set(expr, info);
          return info;
        }
      }
    }

    return null;
  });
}

/**
 * Check if a type is valid for bitwise operations (Boolean or Integer/Long)
 */
function _isValidBitwiseType(type: string): boolean {
  const t = type.toLowerCase();
  return (
    t === 'boolean' ||
    t === 'integer' ||
    t === 'long' ||
    t === 'true' ||
    t === 'false' ||
    /^\d+$/.test(t)
  );
}
