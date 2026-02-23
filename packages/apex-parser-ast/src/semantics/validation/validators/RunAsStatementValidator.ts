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
  ParseTreeWalker,
  RunAsStatementContext,
  ExpressionContext,
  LiteralPrimaryContext,
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
import { ISymbolManager } from '../ArtifactLoadingHelper';
import {
  resolveExpressionTypeRecursive,
  type ExpressionTypeInfo,
} from './ExpressionValidator';

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
 * Listener to collect runAs statement information
 */
class RunAsStatementListener extends BaseApexParserListener<void> {
  private runAsStatements: Array<{
    ctx: RunAsStatementContext;
    expressionCount: number;
    expression?: ExpressionContext;
    expressionText?: string;
  }> = [];
  private literalTypes: Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  > = new Map();

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
      // Find the containing ExpressionContext
      let parent = ctx.parent;
      while (parent && !(parent instanceof ExpressionContext)) {
        parent = parent.parent;
      }
      if (parent instanceof ExpressionContext) {
        this.literalTypes.set(parent, literalType);
      }
    }
  }

  enterRunAsStatement(ctx: RunAsStatementContext): void {
    const expressionList = ctx.expressionList();
    const expressions = expressionList?.expression() || [];
    const expression = expressions.length === 1 ? expressions[0] : undefined;
    const expressionText =
      expressions.length === 1 ? expressions[0].text || undefined : undefined;

    this.runAsStatements.push({
      ctx,
      expressionCount: expressions.length,
      expression,
      expressionText,
    });
  }

  getRunAsStatements(): Array<{
    ctx: RunAsStatementContext;
    expressionCount: number;
    expression?: ExpressionContext;
    expressionText?: string;
  }> {
    return this.runAsStatements;
  }

  getLiteralTypes(): Map<
    ExpressionContext,
    'integer' | 'long' | 'decimal' | 'string' | 'boolean' | 'null'
  > {
    return this.literalTypes;
  }

  getResult(): void {
    return undefined as void;
  }
}

/**
 * Check if expression text represents a User or Version type
 * Uses text-based heuristics and symbol table lookup for TIER 1 validation
 */
function isUserOrVersionType(
  expressionText: string,
  symbolTable?: SymbolTable,
): boolean {
  if (!expressionText) {
    return false;
  }

  const normalized = expressionText.trim();

  // Check for direct User type
  if (normalized === 'User' || normalized.toLowerCase() === 'user') {
    return true;
  }

  // Check for Version types: Version, System.Version, Package.Version
  if (
    normalized === 'Version' ||
    normalized === 'System.Version' ||
    normalized === 'Package.Version' ||
    normalized.toLowerCase() === 'version' ||
    normalized.toLowerCase() === 'system.version' ||
    normalized.toLowerCase() === 'package.version'
  ) {
    return true;
  }

  // Try to look up variable in symbol table (for simple identifier expressions)
  if (symbolTable && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(normalized)) {
    // Try case-sensitive lookup first
    let variableSymbol = symbolTable.lookup(normalized, null);

    // If not found, try case-insensitive lookup
    if (!variableSymbol) {
      const allSymbols = symbolTable.getAllSymbols();
      variableSymbol = allSymbols.find(
        (s) =>
          (s.kind === SymbolKind.Variable ||
            s.kind === SymbolKind.Parameter ||
            s.kind === SymbolKind.Field) &&
          s.name.toLowerCase() === normalized.toLowerCase(),
      );
    }

    if (
      variableSymbol &&
      (variableSymbol.kind === SymbolKind.Variable ||
        variableSymbol.kind === SymbolKind.Parameter ||
        variableSymbol.kind === SymbolKind.Field)
    ) {
      const varSymbol = variableSymbol as VariableSymbol;
      if (varSymbol.type) {
        const typeName = varSymbol.type.name || '';
        const normalizedTypeName = typeName.toLowerCase();

        // Check if variable type is User
        if (normalizedTypeName === 'user') {
          return true;
        }

        // Check if variable type is Version (System.Version, Package.Version, or just Version)
        if (
          normalizedTypeName === 'version' ||
          normalizedTypeName === 'system.version' ||
          normalizedTypeName === 'package.version'
        ) {
          return true;
        }
      }
    }
  }

  // Everything else (method calls, complex expressions, unknown variables) - allow it
  // We can't determine type without TIER 2 resolution
  return true;
}

/**
 * Validates runAs statements according to Apex semantic rules.
 *
 * Rules:
 * - runAs requires exactly one argument
 * - The argument must be of type 'User' or 'Version' (System.Version or Package.Version)
 *
 * This is a TIER 1 (IMMEDIATE) validation - fast, same-file only.
 *
 * @see prioritize-missing-validations.md Phase 7.3
 */
export const RunAsStatementValidator: Validator = {
  id: 'runas-statement',
  name: 'RunAs Statement Validator',
  tier: ValidationTier.IMMEDIATE,
  priority: 10, // Run after DmlStatementValidator
  prerequisites: {
    requiredDetailLevel: 'private', // Need private to access variable types
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
          'RunAsStatementValidator: sourceContent not provided, skipping validation',
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

          // Suppress error listeners to avoid console noise
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

        // Walk the parse tree to collect runAs statement information
        const listener = new RunAsStatementListener();
        const walker = new ParseTreeWalker();
        walker.walk(listener, parseTree);

        // Validate each runAs statement
        const runAsStatements = listener.getRunAsStatements();
        const literalTypes = listener.getLiteralTypes();
        for (const runAsStmt of runAsStatements) {
          const { ctx, expressionCount, expression, expressionText } =
            runAsStmt;
          // Check for exactly one argument
          if (expressionCount !== 1) {
            const location = getLocationFromContext(ctx);
            errors.push({
              message: localizeTyped(ErrorCodes.INVALID_RUNAS),
              location,
              code: ErrorCodes.INVALID_RUNAS,
            });
            continue;
          }

          // Check if expression type is User or Version using comprehensive type resolution
          if (expression) {
            const resolvedExpressionTypes = new WeakMap<
              ExpressionContext,
              ExpressionTypeInfo
            >();
            const typeInfo = yield* resolveExpressionTypeRecursive(
              expression,
              resolvedExpressionTypes,
              literalTypes,
              symbolTable,
              symbolManager,
              options.tier,
            );

            const expressionType = typeInfo?.resolvedType || null;
            if (expressionType) {
              const typeLower = expressionType.toLowerCase();
              const isValidType =
                typeLower === 'user' ||
                typeLower === 'version' ||
                typeLower === 'system.version' ||
                typeLower === 'package.version';

              if (!isValidType) {
                const location = getLocationFromContext(ctx);
                errors.push({
                  message: localizeTyped(ErrorCodes.INVALID_RUNAS),
                  location,
                  code: ErrorCodes.INVALID_RUNAS,
                });
              }
            }
          } else if (expressionText) {
            // Fallback to text-based validation
            if (!isUserOrVersionType(expressionText, symbolTable)) {
              const location = getLocationFromContext(ctx);
              errors.push({
                message: localizeTyped(ErrorCodes.INVALID_RUNAS),
                location,
                code: ErrorCodes.INVALID_RUNAS,
              });
            }
          }
        }

        yield* Effect.logDebug(
          `RunAsStatementValidator: checked ${runAsStatements.length} runAs statements, ` +
            `found ${errors.length} violations`,
        );

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      } catch (error) {
        yield* Effect.logWarning(
          `RunAsStatementValidator: Error during validation: ${error}`,
        );
        return {
          isValid: true,
          errors: [],
          warnings: [],
        };
      }
    }),
};
