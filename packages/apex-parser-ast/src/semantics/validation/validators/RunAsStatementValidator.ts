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
  RunAsStatementContext,
  ExpressionContext,
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
import type { ParserRuleContext } from 'antlr4';
import { ISymbolManager } from '../ArtifactLoadingHelper';
import { isStandardTypeAlias } from '../utils/standardTypeIdentity';
import { callArgumentSemantic } from '../../../utils/contextTypeGuards';

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
 * Listener to collect runAs statement information
 */
class RunAsStatementListener extends BaseApexParserListener<void> {
  private runAsStatements: Array<{
    ctx: RunAsStatementContext;
    expressionCount: number;
    expression?: ExpressionContext;
  }> = [];

  enterRunAsStatement(ctx: RunAsStatementContext): void {
    const expressionList = ctx.expressionList();
    const expressions = expressionList?.expression_list() || [];
    const expression = expressions.length === 1 ? expressions[0] : undefined;

    this.runAsStatements.push({
      ctx,
      expressionCount: expressions.length,
      expression,
    });
  }

  getRunAsStatements(): Array<{
    ctx: RunAsStatementContext;
    expressionCount: number;
    expression?: ExpressionContext;
  }> {
    return this.runAsStatements;
  }

  getResult(): void {
    return undefined as void;
  }
}

/** Resolve the parser-classified runAs argument at its lexical source position. */
function resolveRunAsArgumentType(
  expression: ExpressionContext,
  symbolTable: SymbolTable,
): string | undefined {
  const semantic = callArgumentSemantic(expression);
  if (semantic.kind === 'literal') {
    return semantic.literalType;
  }
  if (semantic.kind !== 'identifier') {
    // Complex expressions require expression/xref resolution. Preserve that
    // uncertainty instead of interpreting the rendered source text.
    return undefined;
  }

  const symbol = symbolTable.resolveVariableAtPosition(
    semantic.name,
    expression.start.line,
    expression.start.column,
  );
  if (
    symbol &&
    (symbol.kind === SymbolKind.Variable ||
      symbol.kind === SymbolKind.Parameter ||
      symbol.kind === SymbolKind.Field ||
      symbol.kind === SymbolKind.Property)
  ) {
    const variable = symbol as VariableSymbol;
    return variable.type?.originalTypeString ?? variable.type?.name;
  }
  return undefined;
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
      const errors: ValidationErrorInfo[] = [];
      const warnings: ValidationWarningInfo[] = [];

      // Raw document text is only parser transport. Cached parser state is
      // sufficient when sourceContent is unavailable.
      if (!options.parseTree && !options.sourceContent) {
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
          CompilationUnitContext | TriggerUnitContext | BlockContext;
        if (options.parseTree) {
          // Use cached parse tree from DocumentStateCache
          parseTree = options.parseTree;
        } else {
          // Fallback to parsing source content
          const isTrigger = fileUri.endsWith('.trigger');
          const isAnonymous = fileUri.endsWith('.apex');
          const contentToParse = isAnonymous
            ? `{${sourceContent ?? ''}}`
            : (sourceContent ?? '');

          const lexer = ApexParserFactory.createLexer(contentToParse);
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

        ApexParseTreeWalker.DEFAULT.walk(listener, parseTree);

        // Validate each runAs statement
        const runAsStatements = listener.getRunAsStatements();
        for (const runAsStmt of runAsStatements) {
          const { ctx, expressionCount, expression } = runAsStmt;
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

          // Validate only a type established by parser-owned argument facts and
          // lexical symbols. Unresolved complex expressions remain uncertain.
          if (expression) {
            const expressionType = resolveRunAsArgumentType(
              expression,
              symbolTable,
            );
            if (expressionType) {
              const typeLower = expressionType.toLowerCase();
              const isValidType =
                typeLower === 'user' ||
                isStandardTypeAlias(typeLower, 'version');

              if (!isValidType) {
                const location = getLocationFromContext(ctx);
                errors.push({
                  message: localizeTyped(ErrorCodes.INVALID_RUNAS),
                  location,
                  code: ErrorCodes.INVALID_RUNAS,
                });
              }
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
