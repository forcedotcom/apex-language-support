/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { CommonTokenStream } from 'antlr4';
import {
  ApexParser,
  ApexParserFactory,
  ApexParseTreeWalker,
  CompilationUnitContext,
  TriggerUnitContext,
  BlockContext,
  StatementContext,
  AssignExpressionContext,
  ExpressionContext,
  PrimaryExpressionContext,
  MethodCallExpressionContext,
  DotExpressionContext,
  ArrayExpressionContext,
  IdPrimaryContext,
  PreOpExpressionContext,
  PostOpExpressionContext,
  MethodDeclarationContext,
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
import type { ErrorCodeKey } from '../../../generated/messages_en_US';
import { BaseApexParserListener } from '../../../parser/listeners/BaseApexParserListener';
import type { ParserRuleContext } from 'antlr4';
import {
  isContextType,
  parserContextContainsToken,
} from '../../../utils/contextTypeGuards';
import { isPropertySymbol } from '../../../utils/symbolNarrowing';

/**
 * Helper function to create SymbolLocation from parse tree context
 */
function getLocationFromContext(ctx: ParserRuleContext): SymbolLocation {
  const start = ctx.start;
  const stop = ctx.stop || start;
  const textLength = stop.text?.length || 0;

  const symbolRange = {
    startLine: start.line,
    startColumn: start.column,
    endLine: stop.line,
    endColumn: stop.column + textLength,
  };

  return {
    symbolRange,
    identifierRange: symbolRange,
  };
}

/**
 * Check if a type name represents void
 */
function isVoidType(typeName: string | undefined | null): boolean {
  if (!typeName) {
    return false;
  }
  return typeName.toLowerCase() === 'void';
}

/**
 * Check if an expression is a valid assignment target
 * Valid targets: variables, field access, array access, property access
 */
function isValidAssignmentTarget(expr: ExpressionContext): boolean {
  if (isContextType(expr, PrimaryExpressionContext)) {
    return isContextType(expr.primary(), IdPrimaryContext);
  }
  if (isContextType(expr, DotExpressionContext)) {
    return expr.dotMethodCall() === undefined;
  }
  if (isContextType(expr, ArrayExpressionContext)) {
    return true;
  }
  return false;
}

/**
 * Error information with optional context (local to this file)
 */
interface ExpressionValidationError {
  ctx?: ParserRuleContext;
  code: ErrorCodeKey;
  symbolLocation?: SymbolLocation;
}

/**
 * Listener to validate expression types
 */
class ExpressionTypeListener extends BaseApexParserListener<void> {
  private errors: ExpressionValidationError[] = [];

  constructor(private symbolTable: SymbolTable) {
    super();
  }

  /**
   * Check void types in variables, parameters, and properties from symbol table
   * Returns errors with symbol locations
   */
  checkVoidTypes(): ExpressionValidationError[] {
    const voidErrors: ExpressionValidationError[] = [];
    const allSymbols = this.symbolTable.getAllSymbols();

    // Check variables
    for (const symbol of allSymbols) {
      if (symbol.kind === SymbolKind.Variable) {
        const variable = symbol as VariableSymbol;
        // Debug: log type info
        if (variable.type) {
          const typeName = variable.type.name || '';
          if (isVoidType(typeName)) {
            voidErrors.push({
              code: ErrorCodes.INVALID_VOID_VARIABLE,
              symbolLocation: variable.location,
            });
          }
        }
      }

      // Check parameters
      if (symbol.kind === SymbolKind.Parameter) {
        const parameter = symbol as VariableSymbol;
        if (parameter.type && isVoidType(parameter.type.name)) {
          voidErrors.push({
            code: ErrorCodes.INVALID_VOID_PARAMETER,
            symbolLocation: parameter.location,
          });
        }
      }

      // Check properties
      if (isPropertySymbol(symbol)) {
        if (symbol.type) {
          const typeName = symbol.type.name || '';
          if (isVoidType(typeName)) {
            voidErrors.push({
              code: ErrorCodes.INVALID_VOID_PROPERTY,
              symbolLocation: symbol.location,
            });
          }
        }
      }
    }

    return voidErrors;
  }

  /**
   * Check expression statements (expressions used as statements)
   * Valid expression statements:
   * - Method calls
   * - Assignment expressions
   * - Post-increment/decrement (x++, x--)
   * - Pre-increment/decrement (++x, --x)
   * Invalid: arithmetic operations, comparisons, etc.
   */
  enterStatement(ctx: StatementContext): void {
    // Check if this is an expression statement
    const exprStmt = ctx.expressionStatement();
    if (exprStmt) {
      const expr = exprStmt.expression();
      if (expr) {
        // Check if it's a valid expression statement type
        const isMethodCall = isContextType(expr, MethodCallExpressionContext);
        const isAssignment = isContextType(expr, AssignExpressionContext);

        // Qualified method calls (e.g., System.debug) are DotExpressionContext with dotMethodCall
        const isQualifiedMethodCall =
          isContextType(expr, DotExpressionContext) &&
          (expr as DotExpressionContext).dotMethodCall?.() !== undefined;

        const hasIncrementDecrement =
          isContextType(expr, PreOpExpressionContext) ||
          isContextType(expr, PostOpExpressionContext);

        // Valid expression statements: method calls, assignments, qualified method calls, increment/decrement
        if (
          !isMethodCall &&
          !isAssignment &&
          !isQualifiedMethodCall &&
          !hasIncrementDecrement
        ) {
          this.errors.push({
            ctx: expr,
            code: ErrorCodes.INVALID_EXPRESSION_STATEMENT,
          });
        }
      }
    }
  }

  /**
   * Check assignment expressions for invalid targets
   */
  enterAssignExpression(ctx: AssignExpressionContext): void {
    const target = ctx.expression(0); // First expression is the target
    if (target && !isValidAssignmentTarget(target)) {
      this.errors.push({
        ctx: target,
        code: ErrorCodes.INVALID_EXPRESSION_ASSIGNMENT,
      });
    }
  }

  getResult(): void {
    return undefined as void;
  }

  getErrors(): ExpressionValidationError[] {
    return this.errors;
  }

  /**
   * The grammar recovers `void name;` and `void name { get; set; }` as method
   * declarations with a synthetic, empty formal-parameter context. Preserve
   * that parser-owned recovery shape so the intended invalid declaration can
   * still receive its specific diagnostic.
   */
  enterMethodDeclaration(ctx: MethodDeclarationContext): void {
    const formalParameters = ctx.formalParameters();
    if (
      formalParameters?.LPAREN() &&
      parserContextContainsToken(formalParameters, ApexParser.VOID)
    ) {
      this.errors.push({
        ctx: formalParameters,
        code: ErrorCodes.INVALID_VOID_PARAMETER,
      });
    }

    if (!ctx.VOID() || formalParameters?.LPAREN()) {
      return;
    }

    if (ctx.SEMI()) {
      this.errors.push({
        ctx,
        code: ErrorCodes.INVALID_VOID_VARIABLE,
      });
      return;
    }

    const block = ctx.block();
    const hasAccessorStatement = block?.statement_list().some((statement) => {
      const expression = statement.expressionStatement()?.expression();
      if (!expression || !isContextType(expression, PrimaryExpressionContext)) {
        return false;
      }
      const primary = expression.primary();
      if (!isContextType(primary, IdPrimaryContext)) {
        return false;
      }
      const identifier = primary.id();
      return Boolean(identifier?.GET() || identifier?.SET());
    });
    if (hasAccessorStatement) {
      this.errors.push({
        ctx,
        code: ErrorCodes.INVALID_VOID_PROPERTY,
      });
    }
  }
}

/**
 * Validates expression types and usage.
 *
 * Rules:
 * - Variables, parameters, and properties cannot be of type void
 * - Expressions cannot be used as statements (except method calls and assignments)
 * - Assignment targets must be valid (variables, fields, array access, etc.)
 *
 * Note: Boolean condition validation (if/while/do-while) has been moved to ExpressionValidator
 * which uses comprehensive expression type resolution.
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * @see prioritize-missing-validations.md Phase 2.1
 */
export const ExpressionTypeValidator: Validator = {
  id: 'expression-type',
  name: 'Expression Type Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 8, // Run after AuraEnabledValidator
  prerequisites: {
    requiredDetailLevel: 'public-api',
    requiresReferences: false,
    requiresCrossFileResolution: false,
  },

  validate: (
    symbolTable: SymbolTable,
    options: ValidationOptions,
  ): Effect.Effect<ValidationResult, ValidationError> =>
    Effect.gen(function* () {
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      // Source content is required for this validator
      if (!options.sourceContent) {
        yield* Effect.logDebug(
          'ExpressionTypeValidator: sourceContent not provided, skipping validation',
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
        };
      }

      const sourceContent = options.sourceContent;
      const fileUri = symbolTable.getFileUri() || 'unknown.cls';

      try {
        // Use cached parse tree if available, otherwise parse source content
        let parseTree:
          CompilationUnitContext | TriggerUnitContext | BlockContext;
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

          const lexer = ApexParserFactory.createLexer(contentToParse);
          const tokenStream = new CommonTokenStream(lexer);
          const parser = new ApexParser(tokenStream);

          if (isTrigger) {
            parseTree = parser.triggerUnit();
          } else if (isAnonymous) {
            parseTree = parser.block();
          } else {
            parseTree = parser.compilationUnit();
          }
        }

        // Walk the parse tree to validate expression types
        const listener = new ExpressionTypeListener(symbolTable);

        ApexParseTreeWalker.DEFAULT.walk(listener, parseTree);

        // Check void types from symbol table
        const voidErrors = listener.checkVoidTypes();

        // Report errors from parse tree traversal
        const validationErrors = listener.getErrors();
        for (const errorInfo of validationErrors) {
          let location: SymbolLocation;
          if (errorInfo.ctx) {
            location = getLocationFromContext(errorInfo.ctx);
          } else if (errorInfo.symbolLocation) {
            location = errorInfo.symbolLocation;
          } else {
            // Fallback location (should not happen)
            location = {
              symbolRange: {
                startLine: 1,
                startColumn: 0,
                endLine: 1,
                endColumn: 0,
              },
              identifierRange: {
                startLine: 1,
                startColumn: 0,
                endLine: 1,
                endColumn: 0,
              },
            };
          }

          errors.push({
            message: localizeTyped(errorInfo.code),
            location,
            code: errorInfo.code,
          });
        }

        // Report void type errors
        for (const errorInfo of voidErrors) {
          const location = errorInfo.symbolLocation || {
            symbolRange: {
              startLine: 1,
              startColumn: 0,
              endLine: 1,
              endColumn: 0,
            },
            identifierRange: {
              startLine: 1,
              startColumn: 0,
              endLine: 1,
              endColumn: 0,
            },
          };

          errors.push({
            message: localizeTyped(errorInfo.code),
            location,
            code: errorInfo.code,
          });
        }

        yield* Effect.logDebug(
          `ExpressionTypeValidator: found ${errors.length} expression type violations`,
        );
      } catch (error) {
        // If parsing fails, skip validation (syntax errors will be caught elsewhere)
        yield* Effect.logDebug(
          `ExpressionTypeValidator: parse failed, skipping: ${error}`,
        );
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    }),
};
