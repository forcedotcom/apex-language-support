/*
 * Copyright (c) 2026, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the
 * repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import { Effect } from 'effect';
import { CharStreams, CommonTokenStream } from 'antlr4ts';
import {
  ApexLexer,
  ApexParser,
  CaseInsensitiveInputStream,
  CompilationUnitContext,
  TriggerUnitContext,
  BlockContext,
  StatementContext,
  AssignExpressionContext,
  ParseTreeWalker,
  ExpressionContext,
  PrimaryExpressionContext,
  MethodCallExpressionContext,
  DotExpressionContext,
  NewExpressionContext,
  IdPrimaryContext,
  FormalParameterContext,
  FieldDeclarationContext,
  PropertyDeclarationContext,
  LocalVariableDeclarationContext,
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
import type { ParserRuleContext } from 'antlr4ts';
import { isContextType } from '../../../utils/contextTypeGuards';

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
function isValidAssignmentTarget(
  expr: ExpressionContext,
  symbolTable: SymbolTable,
): boolean {
  // Primary expressions can be assignment targets if they're variables or field access
  if (isContextType(expr, PrimaryExpressionContext)) {
    return true; // Variables, field access, etc. are valid
  }

  // Method calls are NOT valid assignment targets
  if (isContextType(expr, MethodCallExpressionContext)) {
    return false;
  }

  // New expressions are NOT valid assignment targets
  if (isContextType(expr, NewExpressionContext)) {
    return false;
  }

  // Literals are NOT valid assignment targets
  const exprText = expr.text || '';
  if (
    /^\d+$/.test(exprText) || // Numeric literals
    exprText === 'true' ||
    exprText === 'false' ||
    (exprText.startsWith('"') && exprText.endsWith('"')) ||
    (exprText.startsWith("'") && exprText.endsWith("'"))
  ) {
    return false;
  }

  // For other expression types, check recursively
  // This is a simplified check - in practice, we'd need to check the structure
  return true;
}

/**
 * Error information with optional context (local to this file)
 */
interface ExpressionValidationError {
  ctx?: ParserRuleContext;
  code: string;
  symbolLocation?: SymbolLocation;
}

/**
 * Listener to validate expression types
 */
class ExpressionTypeListener extends BaseApexParserListener<void> {
  private errors: ExpressionValidationError[] = [];

  constructor(
    private symbolTable: SymbolTable,
    private sourceContent?: string,
  ) {
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
      if (symbol.kind === SymbolKind.Property) {
        const property = symbol as VariableSymbol;
        if (property.type) {
          const typeName = property.type.name || '';
          if (isVoidType(typeName)) {
            voidErrors.push({
              code: ErrorCodes.INVALID_VOID_PROPERTY,
              symbolLocation: property.location,
            });
          }
        }
      }
    }

    return voidErrors;
  }

  /**
   * Check for void in formal parameters by examining parse tree text
   * This handles cases where the parser skips invalid syntax
   */
  enterFormalParameter(ctx: FormalParameterContext): void {
    const paramText = ctx.text?.toLowerCase().trim() || '';
    // Check if parameter text starts with "void " (handles cases where parser rejects void as invalid syntax)
    if (paramText.startsWith('void ')) {
      const typeRef = ctx.typeRef();
      // Only report if typeRef is null or doesn't properly represent void
      if (!typeRef || !isVoidType(typeRef.text?.toLowerCase().trim())) {
        const location = getLocationFromContext(ctx);
        this.errors.push({
          ctx,
          code: ErrorCodes.INVALID_VOID_PARAMETER,
          symbolLocation: location,
        });
      }
    }
  }

  /**
   * Check for void in field declarations by examining parse tree text
   */
  enterFieldDeclaration(ctx: FieldDeclarationContext): void {
    const fieldText = ctx.text?.toLowerCase().trim() || '';
    // Check if field text starts with "void " (handles cases where parser rejects void as invalid syntax)
    if (fieldText.startsWith('void ')) {
      const typeRef = ctx.typeRef();
      // Only report if typeRef is null or doesn't properly represent void
      if (!typeRef || !isVoidType(typeRef.text?.toLowerCase().trim())) {
        const location = getLocationFromContext(ctx);
        this.errors.push({
          ctx,
          code: ErrorCodes.INVALID_VOID_VARIABLE,
          symbolLocation: location,
        });
      }
    }
  }

  /**
   * Check for void in property declarations by examining parse tree text
   */
  enterPropertyDeclaration(ctx: PropertyDeclarationContext): void {
    const propText = ctx.text?.toLowerCase().trim() || '';
    // Check if property text contains "void " before the property name
    // (handles cases where parser rejects void as invalid syntax)
    if (propText.includes('void ') && !propText.includes('void method')) {
      const typeRef = ctx.typeRef();
      // Only report if typeRef is null or doesn't properly represent void
      if (!typeRef || !isVoidType(typeRef.text?.toLowerCase().trim())) {
        const location = getLocationFromContext(ctx);
        this.errors.push({
          ctx,
          code: ErrorCodes.INVALID_VOID_PROPERTY,
          symbolLocation: location,
        });
      }
    }
  }

  /**
   * Check for void in local variable declarations by examining parse tree text
   */
  enterLocalVariableDeclaration(ctx: LocalVariableDeclarationContext): void {
    const varText = ctx.text?.toLowerCase().trim() || '';
    // Check if variable text starts with "void " (handles cases where parser rejects void as invalid syntax)
    if (varText.startsWith('void ')) {
      const typeRef = ctx.typeRef();
      // Only report if typeRef is null or doesn't properly represent void
      if (!typeRef || !isVoidType(typeRef.text?.toLowerCase().trim())) {
        const location = getLocationFromContext(ctx);
        this.errors.push({
          ctx,
          code: ErrorCodes.INVALID_VOID_VARIABLE,
          symbolLocation: location,
        });
      }
    }
  }

  /**
   * Check source content directly for void in invalid positions
   * This handles cases where the parser skips invalid syntax entirely
   */
  checkVoidInSource(sourceContent: string): ExpressionValidationError[] {
    const voidErrors: ExpressionValidationError[] = [];
    const lines = sourceContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for void parameter: "void param" inside parentheses (method parameters)
      // Pattern: void followed by identifier inside parentheses
      // Example: "public void method(void param) {"
      const openParenIndex = line.indexOf('(');
      const closeParenIndex = line.indexOf(')', openParenIndex);
      if (openParenIndex >= 0 && closeParenIndex > openParenIndex) {
        // Extract content inside parentheses
        const paramContent = line.substring(
          openParenIndex + 1,
          closeParenIndex,
        );
        // Look for "void identifier" pattern inside parentheses
        const voidParamMatch = paramContent.match(
          /\bvoid\s+([a-zA-Z_][a-zA-Z0-9_]*)/,
        );
        if (voidParamMatch) {
          // Calculate the actual column position of void in the line
          const voidIndexInParams = paramContent.indexOf('void');
          const column = openParenIndex + 1 + voidIndexInParams;
          voidErrors.push({
            code: ErrorCodes.INVALID_VOID_PARAMETER,
            symbolLocation: {
              symbolRange: {
                startLine: lineNum,
                startColumn: column,
                endLine: lineNum,
                endColumn: column + 4,
              },
              identifierRange: {
                startLine: lineNum,
                startColumn: column,
                endLine: lineNum,
                endColumn: column + 4,
              },
            },
          });
        }
      }

      // Check for void field/variable: "void x;" (not in method signature)
      const voidVarMatch = line.match(
        /^\s*(?:public|private|protected|global|static|transient|final)?\s*void\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*;/,
      );
      if (voidVarMatch && !line.includes('{') && !line.includes('(')) {
        const column = line.indexOf('void');
        voidErrors.push({
          code: ErrorCodes.INVALID_VOID_VARIABLE,
          symbolLocation: {
            symbolRange: {
              startLine: lineNum,
              startColumn: column,
              endLine: lineNum,
              endColumn: column + 4,
            },
            identifierRange: {
              startLine: lineNum,
              startColumn: column,
              endLine: lineNum,
              endColumn: column + 4,
            },
          },
        });
      }

      // Check for void property: "void prop { get; set; }"
      const voidPropMatch = line.match(/void\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/);
      if (voidPropMatch && line.includes('get') && line.includes('set')) {
        const column = line.indexOf('void');
        voidErrors.push({
          code: ErrorCodes.INVALID_VOID_PROPERTY,
          symbolLocation: {
            symbolRange: {
              startLine: lineNum,
              startColumn: column,
              endLine: lineNum,
              endColumn: column + 4,
            },
            identifierRange: {
              startLine: lineNum,
              startColumn: column,
              endLine: lineNum,
              endColumn: column + 4,
            },
          },
        });
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

        // Check for increment/decrement operators (++ or --)
        const exprText = expr.text || '';
        const hasIncrementDecrement =
          exprText.includes('++') || exprText.includes('--');

        // Valid expression statements: method calls, assignments, qualified method calls, increment/decrement
        if (
          !isMethodCall &&
          !isAssignment &&
          !isQualifiedMethodCall &&
          !hasIncrementDecrement
        ) {
          // Check if it's a primary expression (could be a method call)
          if (isContextType(expr, PrimaryExpressionContext)) {
            const primary = expr as PrimaryExpressionContext;
            // Check if primary contains a method call
            const primaryCtx = primary.primary();
            // Check if primary context has a method call
            // PrimaryContext doesn't have methodCall() directly, so we check the structure
            const hasMethodCall =
              primaryCtx &&
              (isContextType(primaryCtx, IdPrimaryContext) ||
                (primaryCtx as any).methodCall !== undefined);
            if (!hasMethodCall) {
              // Primary expression without method call is invalid as statement
              // (unless it's increment/decrement which we already checked)
              this.errors.push({
                ctx: expr,
                code: ErrorCodes.INVALID_EXPRESSION_STATEMENT,
              });
            }
          } else {
            // Other expression types (arithmetic, comparisons, etc.) are invalid as statements
            this.errors.push({
              ctx: expr,
              code: ErrorCodes.INVALID_EXPRESSION_STATEMENT,
            });
          }
        }
      }
    }
  }

  /**
   * Check assignment expressions for invalid targets
   */
  enterAssignExpression(ctx: AssignExpressionContext): void {
    const target = ctx.expression(0); // First expression is the target
    if (target && !isValidAssignmentTarget(target, this.symbolTable)) {
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

          if (isTrigger) {
            parseTree = parser.triggerUnit();
          } else if (isAnonymous) {
            parseTree = parser.block();
          } else {
            parseTree = parser.compilationUnit();
          }
        }

        // Walk the parse tree to validate expression types
        const listener = new ExpressionTypeListener(symbolTable, sourceContent);
        const walker = new ParseTreeWalker();
        walker.walk(listener, parseTree);

        // Check void types from symbol table
        const voidErrors = listener.checkVoidTypes();

        // Also check source content directly for void in invalid positions
        // This handles cases where the parser skips invalid syntax entirely
        const sourceVoidErrors = listener.checkVoidInSource(sourceContent);
        voidErrors.push(...sourceVoidErrors);

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
            message: localizeTyped(errorInfo.code as any),
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
            message: localizeTyped(errorInfo.code as any),
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
