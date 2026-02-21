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
  ReturnStatementContext,
  MethodDeclarationContext,
  ConstructorDeclarationContext,
  ParseTreeWalker,
  ExpressionContext,
  LiteralPrimaryContext,
} from '@apexdevtools/apex-parser';
import type {
  SymbolTable,
  SymbolLocation,
  MethodSymbol,
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
import {
  resolveExpressionTypeRecursive,
  areTypesCompatible,
  type ExpressionTypeInfo,
} from './ExpressionValidator';
import { ISymbolManager } from '../ArtifactLoadingHelper';
import type { ISymbolManager as ISymbolManagerInterface } from '../../../types/ISymbolManager';

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
 * Helper to check if a return type is void
 */
function isVoidReturnType(method: MethodSymbol): boolean {
  const returnTypeName =
    method.returnType?.name?.toLowerCase() ||
    method.returnType?.originalTypeString?.toLowerCase() ||
    '';
  return returnTypeName === 'void';
}

/**
 * Listener to collect return statement information
 */
class ReturnStatementListener extends BaseApexParserListener<void> {
  private errors: Array<{
    ctx: ReturnStatementContext;
    code: string;
    returnType?: string;
    expressionType?: string;
  }> = [];
  private returnStatements: Array<{
    ctx: ReturnStatementContext;
    expression: ExpressionContext;
    methodReturnType?: string;
  }> = [];
  private methodStack: Array<{
    isVoid: boolean;
    isTrigger: boolean;
    returnType?: string;
  }> = [];
  private isInTrigger = false;
  private voidMethodNames: Set<string>;
  private methodReturnTypes: Map<string, string>; // method name -> return type
  private literalTypes: Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  > = new Map();
  private symbolTable: SymbolTable;
  private symbolManager?: ISymbolManagerInterface;
  private tier?: ValidationTier;

  constructor(
    voidMethodNames: Set<string>,
    methodReturnTypes: Map<string, string>,
    symbolTable: SymbolTable,
    symbolManager?: ISymbolManagerInterface,
    tier?: ValidationTier,
  ) {
    super();
    this.voidMethodNames = voidMethodNames;
    this.methodReturnTypes = methodReturnTypes;
    this.symbolTable = symbolTable;
    this.symbolManager = symbolManager;
    this.tier = tier;
  }

  enterMethodDeclaration(ctx: MethodDeclarationContext): void {
    // Extract method name - use same approach as ApexSymbolCollectorListener
    const idNode = ctx.id();
    let methodName = idNode?.text ?? 'unknownMethod';

    // If the ID node is empty, try to extract from formal parameters
    if (!methodName || methodName.trim() === '') {
      const formalParams = ctx.formalParameters();
      if (formalParams) {
        // The method name is typically the first part before the parentheses
        const paramsText = formalParams.text;
        const match = paramsText.match(/^([^(]+)\(/);
        if (match) {
          methodName = match[1].trim();
        }
      }
    }

    // Use lowercase for case-insensitive matching (Apex is case-insensitive)
    const methodNameLower = methodName.toLowerCase();
    const isVoid = this.voidMethodNames.has(methodNameLower);
    const returnType = this.methodReturnTypes.get(methodNameLower);
    this.methodStack.push({
      isVoid,
      isTrigger: false,
      returnType,
    });
  }

  exitMethodDeclaration(ctx: MethodDeclarationContext): void {
    this.methodStack.pop();
  }

  enterConstructorDeclaration(ctx: ConstructorDeclarationContext): void {
    // Constructors are not void methods - they can't return values
    // But we don't need to track them here since ConstructorValidator handles that
    this.methodStack.push({ isVoid: false, isTrigger: false });
  }

  exitConstructorDeclaration(ctx: ConstructorDeclarationContext): void {
    this.methodStack.pop();
  }

  // Track trigger context (for trigger files)
  enterTriggerUnit(ctx: any): void {
    this.isInTrigger = true;
  }

  enterLiteralPrimary(ctx: LiteralPrimaryContext): void {
    // Collect literal types for expression resolution
    const literal = ctx.literal();
    if (!literal) {
      return;
    }

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
      let parent = ctx.parent;
      let depth = 0;
      while (parent && !(parent instanceof ExpressionContext) && depth < 50) {
        parent = parent.parent;
        depth++;
      }
      if (parent instanceof ExpressionContext) {
        this.literalTypes.set(parent, literalType);
      }
    }
  }

  enterReturnStatement(ctx: ReturnStatementContext): void {
    // According to grammar: returnStatement: RETURN expression? SEMI
    // expression() returns the expression context if present, null/undefined if absent
    const expression = ctx.expression();
    const hasValue = expression !== null && expression !== undefined;

    if (!hasValue) {
      // Return without value (just "return;") - this is valid for void methods and triggers
      return;
    }

    // Return with value - check context
    const currentContext = this.methodStack[this.methodStack.length - 1];

    if (this.isInTrigger && !currentContext) {
      // Return statement in trigger body (not in a method)
      this.errors.push({
        ctx,
        code: ErrorCodes.INVALID_TRIGGER_RETURN,
      });
    } else if (currentContext && currentContext.isVoid) {
      // Return statement with value in void method
      this.errors.push({
        ctx,
        code: ErrorCodes.INVALID_RETURN_VOID,
      });
    } else if (currentContext && currentContext.returnType && expression) {
      // Non-void method - store for type compatibility validation after expression resolution
      this.returnStatements.push({
        ctx,
        expression,
        methodReturnType: currentContext.returnType,
      });
    }
  }

  getResult(): void {
    return undefined as void;
  }

  getReturnStatements(): Array<{
    ctx: ReturnStatementContext;
    expression: ExpressionContext;
    methodReturnType?: string;
  }> {
    return this.returnStatements;
  }

  getLiteralTypes(): Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  > {
    return this.literalTypes;
  }

  getErrors(): Array<{
    ctx: ReturnStatementContext;
    code: string;
    returnType?: string;
    expressionType?: string;
  }> {
    return this.errors;
  }
}

/**
 * Validates return statements in void methods and triggers.
 *
 * In Apex:
 * - Void methods must not return a value
 * - Trigger bodies must not return a value
 *
 * This validator:
 * - Gets void methods and triggers from the symbol table
 * - Parses the source content to build a parse tree
 * - Walks the parse tree tracking method/trigger context
 * - Checks if return statements with values are in void methods or triggers
 * - Reports errors for invalid return statements
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * Errors:
 * - "Void method must not return a value" (INVALID_RETURN_VOID)
 * - "Trigger bodies must not return a value" (INVALID_TRIGGER_RETURN)
 *
 * @see APEX_SEMANTIC_VALIDATION_IMPLEMENTATION_PLAN.md Phase 2.1, Phase 4.1
 */
export const ReturnStatementValidator: Validator = {
  id: 'return-statement',
  name: 'Return Statement Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 4, // Run after ControlFlowValidator
  prerequisites: {
    requiredDetailLevel: 'private', // Needs ALL method signatures (including private) to identify void methods
    // We re-parse source content to find return statements in method bodies
    // (symbol table doesn't store return statements, only method signatures)
    requiresReferences: false,
    requiresCrossFileResolution: false,
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
          'ReturnStatementValidator: sourceContent not provided, skipping validation',
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
        };
      }

      const sourceContent = options.sourceContent;
      const fileUri = symbolTable.getFileUri() || 'unknown.cls';
      const isTriggerFile = fileUri.endsWith('.trigger');

      try {
        // Get all methods from symbol table to identify void methods
        const allSymbols = symbolTable.getAllSymbols();
        const methods = allSymbols.filter(
          (symbol): symbol is MethodSymbol =>
            symbol.kind === SymbolKind.Method && 'returnType' in symbol,
        );

        // Build a set of void method names and map of method return types
        // We match methods by name (case-insensitive as Apex is case-insensitive)
        const voidMethods = new Set<string>();
        const methodReturnTypes = new Map<string, string>(); // method name -> return type
        for (const method of methods) {
          // Check if method is void
          // hasBody can be true, false, or undefined
          // - true: method has a body
          // - false: method doesn't have a body (abstract/interface method)
          // - undefined: not set (assume it has a body for validation purposes)
          const hasBody = method.hasBody !== false; // true or undefined both mean "has body"
          const methodNameLower = method.name.toLowerCase();
          if (hasBody) {
            if (isVoidReturnType(method)) {
              // Store method identifier for matching (use lowercase for case-insensitive matching)
              voidMethods.add(methodNameLower);
            } else if (method.returnType?.name) {
              // Store return type for non-void methods
              methodReturnTypes.set(
                methodNameLower,
                method.returnType.name.toLowerCase(),
              );
            }
          }
        }

        yield* Effect.logDebug(
          `ReturnStatementValidator: found ${methods.length} total methods, ` +
            `${voidMethods.size} void methods: ${Array.from(voidMethods).join(', ')}`,
        );

        // Check if this is a trigger file
        const triggers = allSymbols.filter(
          (symbol) => symbol.kind === SymbolKind.Trigger,
        );
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const hasTrigger = triggers.length > 0 || isTriggerFile;

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

          if (isTriggerFile) {
            parseTree = parser.triggerUnit();
          } else if (isAnonymous) {
            parseTree = parser.block();
          } else {
            parseTree = parser.compilationUnit();
          }
        }

        // Walk the parse tree to collect return statement information
        const listener = new ReturnStatementListener(
          voidMethods,
          methodReturnTypes,
          symbolTable,
          symbolManager,
          options.tier,
        );
        const walker = new ParseTreeWalker();
        walker.walk(listener, parseTree);

        // Report immediate return statement errors (void/trigger checks)
        const returnErrors = listener.getErrors();
        for (const { ctx, code } of returnErrors) {
          const location = getLocationFromContext(ctx);
          errors.push({
            message: localizeTyped(code as any),
            location,
            code: code as any,
          });
        }

        // Validate return type compatibility for non-void methods
        const returnStatements = listener.getReturnStatements();
        const literalTypes = listener.getLiteralTypes();
        const resolvedExpressionTypes = new WeakMap<
          ExpressionContext,
          ExpressionTypeInfo
        >();

        // Resolve expression types for return statements
        for (const { ctx, expression, methodReturnType } of returnStatements) {
          const typeInfo = yield* resolveExpressionTypeRecursive(
            expression,
            resolvedExpressionTypes,
            literalTypes,
            symbolTable,
            symbolManager,
            options.tier,
          );

          const expressionType = typeInfo?.resolvedType || null;
          const returnTypeLower = methodReturnType?.toLowerCase() || '';

          if (expressionType && returnTypeLower && returnTypeLower !== 'void') {
            // Check type compatibility
            if (!areTypesCompatible(returnTypeLower, expressionType)) {
              const location = getLocationFromContext(ctx);
              errors.push({
                message: localizeTyped(
                  ErrorCodes.METHOD_DOES_NOT_SUPPORT_RETURN_TYPE,
                  returnTypeLower,
                  expressionType,
                ),
                location,
                code: ErrorCodes.METHOD_DOES_NOT_SUPPORT_RETURN_TYPE,
              });
            }
          }
        }

        yield* Effect.logDebug(
          `ReturnStatementValidator: checked return statements, found ${errors.length} violations`,
        );

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      } catch (error) {
        yield* Effect.logWarning(
          `ReturnStatementValidator: Error during validation: ${error}`,
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
        };
      }
    }),
};
